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
    let opcode = this.opcode, operand = null, enforcedSize = 0,
    enforceVex = opcode[0] === 'v', prefsToGen = 0, maskMode = 0, roundMode = null, broadcast = null;
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
        if(enforceVex) opcode = opcode.slice(1); // First try to chip off the 'v' prefix for VEX operations
        if(!mnemonics.hasOwnProperty(opcode)) // If that doesn't work, try chipping off the opcode size suffix
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

    // An optional "pseudo-operand" for rounding semantics may appear at the start
    if(token === '{')
    {
        roundMode = ["sae", "rn-sae", "rd-sae", "ru-sae", "rz-sae"].indexOf(next());
        if(roundMode < 0) throw "Invalid rounding mode";
        if(next() !== '}') throw "Expected '}'";
        if(next() === ',') next(); // Comma after the round mode specifier is supported but not required
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

        if(labelDependency !== null)
        {
            needsRecompilation = true;
            operand.labelDependency = labelDependency;
            labelDependency = null;
        }

        operands.push(operand);
        prefsToGen |= operand.prefs;

        while(token === '{') // Decorator (mask or broadcast specifier)
        {
            if(next() === '%') // Opmask
            {
                maskMode = (maskMode & 8) | parseRegister([OPT.MASK])[0];
                if((maskMode & 7) === 0) throw "Can't use %k0 as writemask";
            }
            else if(token === 'z') maskMode |= 8, next(); // Zeroing-masking
            else if(operand.type === OPT.MEM)
            {
                if(token === '1to8') broadcast = 1;
                else if(token === '1to16') broadcast = 2;
                else throw "Invalid broadcast mode";
                next();
            }
            else throw "Invalid decorator";
            
            if(token !== '}') throw "Expected '}'";
            next();
        }

        if(token !== ',') break;
        next();
    }

    this.outline = [operands, enforcedSize, variations, prefsToGen, enforceVex, maskMode, roundMode, broadcast];
    this.compile();
    if(!needsRecompilation) this.outline = undefined;
}

Instruction.prototype.compile = function()
{
    let [operands, enforcedSize, variations, prefsToGen, enforceVex, maskMode, roundMode, broadcast] = this.outline;
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
    let modrm = 0, rex = 0;

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
        rm.value ||= 0n;
        // mod = 00, reg = (reg), rm = 101
        return [rex, modrm | 5, null];
    }

    // Encoding the "mod" (modifier) field
    if(rm.type !== OPT.MEM && rm.type !== OPT.VMEM) modrm |= 0xC0; // mod=11
    else if(rm.reg >= 0)
    {
        if(rm.value !== null)
        {
            if(inferImmSize(rm.value) === 8)
            {
                rm.dispSize = 8;
                modrm |= 0x40; // mod=01
            }
            else modrm |= 0x80; // mod=10
        }
    }
    else // mod = 00
    {
        // These are the respective "none" type registers
        rm.reg = 5;
        if(rm.reg2 < 0) rm.reg2 = 4;
        rm.value ||= 0n;
    }
    
    // Encoding the "rm" field
    if(rm.reg >= 8)
    {
        rex |= 1; // rex.B extension
        rm.reg &= 7;
    }

    // Encoding an SIB byte if necessary
    if(rm.reg2 >= 0)
    {
        if(rm.reg2 >= 8)
        {
            rex |= 2; // rex.X extension
            rm.reg2 &= 7;
        }
        
        // rm=100 signifies an SIB byte
        return [rex, modrm | 4, (rm.shift << 6) | (rm.reg2 << 3) | rm.reg];
    }
    return [rex, modrm | rm.reg, null];
}

// Generate the VEX prefix
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