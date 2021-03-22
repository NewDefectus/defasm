const MAX_INSTR_SIZE = 15; // Instructions are guaranteed to be at most 15 bytes
var labelDependency = null;

function Instruction(opcode)
{
    this.opcode = opcode;
    this.bytes = new Uint8Array(MAX_INSTR_SIZE);
    this.length = 0;

    this.interpret();
}

// Generate a single byte
Instruction.prototype.genByte = function(byte)
{
    this.bytes[this.length++] = Number(byte);
}

// Generate an integer with a given size
Instruction.prototype.genInteger = function(byte, size)
{
    do
    {
        this.genByte(byte & 0xffn);
        byte >>= 8n;
    } while(size -= 8);
}

// Generate Instruction.outline
Instruction.prototype.interpret = function()
{
    let opcode = this.opcode, operand = null, enforcedSize = -1, enforceVex = opcode[0] === 'v', prefsToGen = 0;
    let needsRecompilation = false;
    labelDependency = null;

    // Prefix opcodes are interpreted as instructions that end with a semicolon
    if(prefixes.hasOwnProperty(opcode))
    {
        this.genByte(prefixes[opcode]);
        ungetToken(token);
        token = ';';
        return;
    }

    

    // Finding the matching mnemonic for this opcode
    if(!mnemonics.hasOwnProperty(opcode))
    {
        if(enforceVex && mnemonics.hasOwnProperty(opcode.slice(1))) opcode = opcode.slice(1);
        else
        {
            enforcedSize = suffixes[opcode[opcode.length - 1]];
            opcode = opcode.slice(0, -1);
            if(!mnemonics.hasOwnProperty(opcode)) throw "Unknown opcode";
            if(enforcedSize === undefined) throw "Invalid opcode suffix";
        }
    }

    let variations = mnemonics[opcode], operands = [];
    if(typeof variations[0] === "string") // If the mnemonic hasn't been decoded yet, decode it
    {
        if(variations[0][0] === '#') // References other variation
        {
            let otherOpcode = variations[0].slice(1);
            if(typeof mnemonics[otherOpcode][0] === "string")
            {
                mnemonics[otherOpcode] = mnemonics[otherOpcode].map(line => new Operation(line.split(' ')));
            }
            mnemonics[opcode] = variations = mnemonics[otherOpcode];
        }
        else mnemonics[opcode] = variations = variations.map(line => new Operation(line.split(' ')));
    }

    // Collecting the operands
    while(token !== ';' && token !== '\n')
    {
        operand = new Operand();
        if(token === ':') // Segment specification for addressing
        {
            if(operand.type !== OPT.SEG)
                throw "Incorrect prefix";
            prefsToGen |= (operand.reg + 1) << 3;
            next();
            operand = new Operand();
            if(operand.type !== OPT.MEM)
                throw "Segment prefix must be followed by memory reference";
        }

        if(enforcedSize > 0) operand.size = operand.unsignedSize = enforcedSize;
        if(labelDependency !== null)
        {
            needsRecompilation = true;
            operand.labelDependency = labelDependency;
            labelDependency = null;
        }

        operands.push(operand);
        prefsToGen |= operand.prefs;

        if(token != ',') break;
        next();
    }

    this.outline = [operands, enforcedSize, variations, prefsToGen, enforceVex];
    this.compile();
    if(!needsRecompilation) this.outline = undefined;
}

Instruction.prototype.compile = function()
{
    let [operands, enforcedSize, variations, prefsToGen, enforceVex] = this.outline;
    this.length = 0;

    // Now, we'll find the matching operation for this operand list
    let op, found = false, rexVal = 0x40;
    
    for(let variation of variations)
    {
        op = variation.fit(operands, enforcedSize, enforceVex);
        if(op !== null)
        {
            found = true;
            break;
        }
    }

    if(!found) throw "Invalid operands";

    if(op.size === 64) rexVal |= 8, prefsToGen |= PREFIX_REX; // REX.W field
    
    let modRM = null, sib = null;
    if(op.extendOp) rexVal |= 1, prefsToGen |= PREFIX_REX;
    else if(op.rm !== null)
    {
        let extraRex;
        [extraRex, modRM, sib] = makeModRM(op.rm, op.reg);
        if(extraRex !== 0) rexVal |= extraRex, prefsToGen |= PREFIX_REX;
    }

    // To encode ah/ch/dh/bh a REX prefix must not be present (otherwise they'll read as spl/bpl/sil/dil)
    if((prefsToGen & PREFIX_CLASHREX) == PREFIX_CLASHREX) throw "Can't encode high 8-bit register";
    opcode = op.opcode;

    // Time to generate!
    if(prefsToGen >= PREFIX_SEG) this.genByte([0x26, 0x2E, 0x36, 0x3E, 0x64, 0x65][(prefsToGen >> 3) - 1]);
    if(prefsToGen & PREFIX_ADDRSIZE) this.genByte(0x67);
    if(op.size === 16) this.genByte(0x66);
    if(op.prefix !== null) this.genByte(op.prefix);
    if(op.vex !== null) makeVexPrefix(op.vex, rexVal).map(x => this.genByte(x));
    else
    {
        if(prefsToGen & PREFIX_REX) this.genByte(rexVal);
        // Generate the upper bytes of the opcode if needed
        if(opcode > 0xffff) this.genByte(opcode >> 16);
        if(opcode > 0xff) this.genByte(opcode >> 8);
    }
    this.genByte(opcode);
    if(modRM !== null) this.genByte(modRM);
    if(sib !== null) this.genByte(sib);

    // Generating the displacement and immediate
    if(op.rm !== null && op.rm.value !== null) this.genInteger(op.rm.value, op.rm.dispSize || 32);
    for(let imm of op.imms) this.genInteger(imm.value, imm.size);
}

// Generate the ModRM byte
function makeModRM(rm, r)
{
    let modrm = 0, rex = 0, sib = null;

    // Encoding the "reg" field
    if(r.reg >= 8)
    {
        rex |= 4; // rex.R extension
        r.reg &= 7;
    }
    modrm |= r.reg << 3;

    // Special case for RIP-relative addressing
    if(rm.ripRelative)
    {
        modrm |= 5; // mod = 00, reg = (reg), rm = 101
        rm.value ||= 0n;
        return [rex, modrm, sib];
    }

    if(inferImmSize(rm.value) == 8) rm.dispSize = 8;

    // Encoding the "mod" (modifier) field
    if(rm.type !== OPT.MEM) modrm |= 0xC0; // mod=11
    else if(rm.dispSize !== 8 && rm.reg >= 0) modrm |= 0x80; // mod=10
    else if(rm.reg >= 0 && rm.value !== null) modrm |= 0x40; // mod=01
    // else mod=00
    
    // Encoding the "rm" field
    if(rm.reg >= 8)
    {
        rex |= 1; // rex.B extension
        rm.reg &= 7;
    }

    // Encoding an SIB byte if necessary
    if(rm.reg2 >= 0 // If there's also an index register
        || rm.reg < 0 // If both registers are missing (it's just a displacement)
        )
    {
        if(rm.reg < 0)
        {
            // These are the respective "none" type registers
            rm.reg = 5;
            rm.reg2 = 4;
            rm.dispSize = 32; // Displacements on their own have to be of size 32
        }
        else if(rm.reg === 5) // Special case when the base is EBP
        {
            if(rm.value === null) modrm |= 0x40, rm.value = 0n;
            else if(rm.dispSize === 8) modrm |= 0x40, rm.dispSize = 8;
            else modrm |= 0x80;
        }

        if(rm.reg2 >= 8)
        {
            rex |= 2; // rex.X extension
            rm.reg2 &= 7;
        }
        sib |= rm.shift << 6;
        sib |= rm.reg2 << 3;
        sib |= rm.reg;
        modrm |= 4; // reg=100 signifies an SIB byte
    }
    else
    {
        if(rm.type === OPT.MEM) // Simple memory access with one register, e.g. (%rax)
        {
            if(rm.reg === 5 && (modrm & 0xC0) === 0) // Special case for EBP register (so as not to confuse with disp32)
            {
                modrm |= 0x40; // Set to mod=01, so the modrm will be interpreted as EBP+disp8
                sib = 0; // Bit of a hack - 0 doesn't actually go into SIB, it's a displacement value of 0
            }
        }
        modrm |= rm.reg;
    }


    return [rex, modrm, sib];
}


function makeVexPrefix(vex, rex)
{
    let vex1 = vex >> 8, vex2 = vex & 255;
    // The first 3 fields are identical to the last 3 in rex (R, X, B), but inverted
    vex1 |= ((~rex & 7) << 5);
    vex2 |= (((rex & 8)) << 4); // VEX.w = REX.w

    if((vex1 & 0x7F) == 0x61 && (vex2 & 0x80) == 0) // In certain cases, we can compress the prefix to 2 bytes
    {
        return [0xC5, vex2 | (vex1 & 0x80)];
    }
    return [0xC4, vex1, vex2];
}