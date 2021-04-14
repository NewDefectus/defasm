const MAX_INSTR_SIZE = 15; // Instructions are guaranteed to be at most 15 bytes

import { Operand, parseRegister, OPT, suffixes, PREFIX_REX, PREFIX_CLASHREX, PREFIX_ADDRSIZE, PREFIX_SEG, labelDependency, clearLabelDependency } from "./operands.js";
import { token, next, ungetToken, setToken } from "./parser.js";
import { mnemonics } from "./mnemonicList.js";
import { Operation } from "./mnemonics.js";

export const prefixes = {
    lock: 0xF0,
    repne: 0xF2,
    repnz: 0xF2,
    rep: 0xF3,
    repe: 0xF3,
    repz: 0xF3
};

export function Instruction(opcode)
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
    let opcode = this.opcode, operand = null, enforcedSize = 0, prefsToGen = 0;
    let vexInfo = {
        needed: opcode[0] === 'v',
        evex: false,
        mask: 0,
        zeroing: false,
        round: null,
        broadcast: null
    };

    let needsRecompilation = false, usesMemory = false;
    clearLabelDependency();

    // Prefix opcodes are interpreted as instructions that end with a semicolon
    if(prefixes.hasOwnProperty(opcode))
    {
        this.genByte(prefixes[opcode]);
        ungetToken(token);
        setToken(';');
        return;
    }

    // Finding the matching mnemonic for this opcode
    if(!mnemonics.hasOwnProperty(opcode))
    {
        if(vexInfo.needed && !mnemonics.hasOwnProperty(opcode.slice(0, -1))) // Make sure it's not a VEX instruction with a suffix
        {
            opcode = opcode.slice(1); // First try to chip off the 'v' prefix for VEX operations
        }
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
        vexInfo.evex = true;
        vexInfo.round = ["sae", "rn-sae", "rd-sae", "ru-sae", "rz-sae"].indexOf(next());
        if(vexInfo.round < 0) throw "Invalid rounding mode";
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
            clearLabelDependency();
        }

        operands.push(operand);
        prefsToGen |= operand.prefs;

        if(operand.reg >= 16 || operand.reg2 >= 16 || operand.size === 512) vexInfo.evex = true;
        if(operand.type === OPT.MEM) usesMemory = true;

        while(token === '{') // Decorator (mask or broadcast specifier)
        {
            vexInfo.evex = true;
            if(next() === '%') // Opmask
            {
                vexInfo.mask = parseRegister([OPT.MASK])[0];
                if((vexInfo.mask & 7) === 0) throw "Can't use %k0 as writemask";
            }
            else if(token === 'z') vexInfo.zeroing = true, next(); // Zeroing-masking
            else if(operand.type === OPT.MEM)
            {
                vexInfo.broadcast = ["1to2", "1to4", "1to8", "1to16"].indexOf(token);
                if(vexInfo.broadcast < 0) throw "Invalid broadcast mode";
                next();
            }
            else throw "Invalid decorator";
            
            if(token !== '}') throw "Expected '}'";
            next();
        }

        if(token !== ',') break;
        next();
    }

    if(usesMemory && vexInfo.round !== null) throw "Embedded rounding can only be used on reg-reg";

    this.outline = [operands, enforcedSize, variations, prefsToGen, vexInfo];
    this.compile();
    if(!needsRecompilation) this.outline = undefined;
}

Instruction.prototype.compile = function()
{
    let [operands, enforcedSize, variations, prefsToGen, vexInfo] = this.outline;
    this.length = 0;

    // Before we compile, we'll get the immediates' sizes
    for(let op of operands)
    {
        if(op.type === OPT.IMM && enforcedSize === 0)
        {
            op.size = inferImmSize(op.value);
            op.unsignedSize = inferUnsignedImmSize(op.value);
        }
    }

    // Now, we'll find the matching operation for this operand list
    let op, found = false, rexVal = 0x40;
    
    for(let variation of variations)
    {
        op = variation.fit(operands, enforcedSize, vexInfo);
        if(op !== null)
        {
            found = true;
            break;
        }
    }

    if(!found) throw "Invalid operands";

    if(op.rexw) rexVal |= 8, prefsToGen |= PREFIX_REX; // REX.W field
    
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
    let opcode = op.opcode;

    // Time to generate!
    if(prefsToGen >= PREFIX_SEG) this.genByte([0x26, 0x2E, 0x36, 0x3E, 0x64, 0x65][(prefsToGen >> 3) - 1]);
    if(prefsToGen & PREFIX_ADDRSIZE) this.genByte(0x67);
    if(op.size === 16) this.genByte(0x66);
    if(op.prefix !== null) this.genByte(op.prefix);
    if(op.vex !== null) makeVexPrefix(op.vex, rexVal, vexInfo.evex).map(x => this.genByte(x));
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
        rm.value = rm.value || 0n;
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
            else
            {
                rm.dispSize = 32;
                modrm |= 0x80; // mod=10
            }
        }
    }
    else // mod = 00
    {
        // These are the respective "none" type registers
        rm.reg = 5;
        if(rm.reg2 < 0) rm.reg2 = 4;
        rm.value = rm.value || 0n;
    }
    
    // Encoding the "rm" field
    rex |= rm.reg >> 3; // rex.B extension
    rm.reg &= 7;

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

// Generate the VEX/EVEX prefix
function makeVexPrefix(vex, rex, isEvex)
{
    if(isEvex)
    {
        vex ^= 0x80010; // Invert the V' and R' bits
    }
    let vex1 = vex & 255, vex2 = vex >> 8, vex3 = vex >> 16;
    // The first 3 fields are identical to the last 3 in rex (R, X, B), but inverted
    vex1 |= ((~rex & 7) << 5);
    vex2 |= (((rex & 8)) << 4); // VEX.w = REX.w

    if(isEvex)
    {
        return [0x62, vex1, vex2, vex3];
    }

    if((vex1 & 0x7F) == 0x61 && (vex2 & 0x80) == 0) // In certain cases, we can compress the prefix to 2 bytes
    {
        return [0xC5, vex2 | (vex1 & 0x80)];
    }
    return [0xC4, vex1, vex2];
}

// Resolve label dependencies
Instruction.prototype.resolveLabels = function(labels, currIndex)
{
    let initialLength = this.length;
    for(let op of this.outline[0])
    {
        if(op.labelDependency !== undefined)
        {
            if(!labels.has(op.labelDependency)) return null;
            op.value = BigInt(labels.get(op.labelDependency) - (op.absLabel ? 0 : currIndex));
        }
    }
    try { this.compile(); }
    catch(e) { return null; }
    
    return this.length - initialLength;
}



// Infer the size of an immediate from its value
function inferImmSize(value)
{
    if(value < 0n) // Correct for negative values
    {
        value = -value - 1n
    }

    return value < 0x80n ? 8 :
            value < 0x8000n ? 16 :
            value < 0x80000000n ? 32 : 64;
}

// Ditto, but for unsigned values
function inferUnsignedImmSize(value)
{
    if(value < 0n) // Technically this doesn't make sense, but we'll allow it
    {
        value = -2n * value - 1n
    }
    return value < 0x100n ? 8 :
            value < 0x10000n ? 16 :
            value < 0x100000000n ? 32 : 64;
}