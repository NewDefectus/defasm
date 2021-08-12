const MAX_INSTR_SIZE = 15; // Instructions are guaranteed to be at most 15 bytes

import { Operand, parseRegister, OPT, PREFIX_REX, PREFIX_CLASHREX, PREFIX_ADDRSIZE, PREFIX_SEG, regParsePos, sizeHints } from "./operands.js";
import { ASMError, token, next, ungetToken, setToken, currRange, Range } from "./parser.js";
import { fetchMnemonic, scanMnemonic } from "./mnemonicList.js";
import { queueRecomp } from "./symbols.js";
import { Statement } from "./statement.js";

export const prefixes = Object.freeze({
    lock: 0xF0,
    repne: 0xF2,
    repnz: 0xF2,
    rep: 0xF3,
    repe: 0xF3,
    repz: 0xF3
});

const SHORT_DISP = 128;

/* Parse an optional "pseudo-operand" for rounding semantics may appear
at the start or end of the operand list, depending on the syntax */
function parseRoundingMode(vexInfo)
{
    let roundingName = "", roundStart = currRange;
    vexInfo.evex = true;

    while(next() != '}')
    {
        if(token == '\n')
            throw new ASMError("Expected '}'")
        roundingName += token;
    }

    vexInfo.round = ["sae", "rn-sae", "rd-sae", "ru-sae", "rz-sae"].indexOf(roundingName);
    vexInfo.roundingPos = new Range(roundStart.start, currRange.end - roundStart.start);
    if(vexInfo.round < 0)
        throw new ASMError("Invalid rounding mode", vexInfo.roundingPos);
}

export class Instruction extends Statement
{
    constructor(prev, opcode, range)
    {
        super(prev, MAX_INSTR_SIZE, range);
        this.opcode = opcode;
        this.opcodeRange = new Range(range.start, range.length);

        this.interpret();
    }

    // Generate a single byte
    genByte(byte)
    {
        this.bytes[this.length++] = Number(byte);
    }

    // Generate an integer with a given size
    genInteger(byte, size)
    {
        do
        {
            this.genByte(byte & 0xffn);
            byte >>= 8n;
        } while(size -= 8);
    }

    // Generate Instruction.outline
    interpret()
    {
        let opcode = this.opcode, operand = null, prefsToGen = 0;
        let vexInfo = {
            needed: false,
            evex: false,
            mask: 0,
            zeroing: false,
            round: null,
            broadcast: null
        };

        let usesMemory = false;
        this.needsRecompilation = false;
        this.removed = true; // Unless we get to the end, assume this instruction is removed due to an error

        /** @type { Operand[] } */
        let operands = [];
        let operations = [];

        let opcodeInterps = scanMnemonic(opcode, this.syntax.intel);

        for(let interp of opcodeInterps)
        {
            if(interp.size === null)
            {
                if(operations.length == 0)
                    throw new ASMError("Invalid opcode suffix",
                        new Range(this.opcodeRange.start + this.opcodeRange.length - 1, 1)
                    );
            }
            else if(interp.size !== undefined)
                operations = [...operations, { size: interp.size }, ...fetchMnemonic(interp.raw, false)];
            else
                operations = [...operations, ...fetchMnemonic(interp.raw, this.syntax.intel)];
            
            if(interp.vex)
                vexInfo.needed = true;
        }
        
        if(operations.length == 0)
            throw new ASMError("Unknown opcode", this.opcodeRange);

        if(!this.syntax.intel && token == '{')
        {
            parseRoundingMode(vexInfo);
            if(next() != ',')
                throw new ASMError("Expected ','");
            next();
        }

        let forceImmToRel = this.syntax.intel && operations.some(x => x.relativeSizes !== null);

        // Collecting the operands
        while(token != ';' && token != '\n')
        {
            if(this.syntax.intel)
            {
                if(token == '{')
                {
                    parseRoundingMode(vexInfo);
                    next();
                    break;
                }
                let sizePtr = token;
                if(sizeHints.hasOwnProperty(sizePtr.toLowerCase()))
                {
                    let following = next();
                    if(following.toLowerCase() == 'ptr')
                    {
                        operations = [{size: sizeHints[sizePtr.toLowerCase()]}, ...operations];
                        if(",;\n{:".includes(next()))
                        {
                            ungetToken();
                            setToken(following);
                        }
                    }
                    else
                    {
                        if(",;\n{:".includes(following)) // It's just a symbol
                        {
                            ungetToken();
                            setToken(sizePtr);
                        }
                        else
                            operations = [{size: sizeHints[sizePtr.toLowerCase()]}, ...operations];
                    }
                }
            }
            operand = new Operand(this, forceImmToRel);
            if(token == ':') // Segment specification for addressing
            {
                if(operand.type != OPT.SEG)
                    throw new ASMError("Incorrect prefix");
                prefsToGen |= (operand.reg + 1) << 3;
                next();
                operand = new Operand(this, forceImmToRel);
                if(operand.type != OPT.MEM && operand.type != OPT.REL && operand.type != OPT.VMEM)
                    throw new ASMError("Segment prefix must be followed by memory reference");
            }

            if(operand.expression && operand.expression.hasSymbols)
                this.needsRecompilation = true;

            operands.push(operand);
            prefsToGen |= operand.prefs;

            if(operand.reg >= 16 || operand.reg2 >= 16 || operand.size == 512)
                vexInfo.evex = true;
            if(operand.type == OPT.MEM)
                usesMemory = true;

            while(token == '{') // Decorator (mask or broadcast specifier)
            {
                vexInfo.evex = true;
                if(this.syntax.prefix ? next() == '%' : next()[0] == 'k') // Opmask
                {
                    vexInfo.mask = parseRegister([OPT.MASK]).reg;
                    if((vexInfo.mask & 7) == 0)
                        throw new ASMError(`Can't use ${this.syntax.prefix ? '%' : ''}k0 as writemask`, regParsePos);
                }
                else if(token == 'z')
                    vexInfo.zeroing = true, next(); // Zeroing-masking
                else if(operand.type == OPT.MEM)
                {
                    vexInfo.broadcast = ["1to2", "1to4", "1to8", "1to16"].indexOf(token);
                    if(vexInfo.broadcast < 0)
                        throw new ASMError("Invalid broadcast mode");
                    vexInfo.broadcastPos = currRange;
                    next();
                }
                else
                    throw new ASMError("Invalid decorator");
                
                if(token != '}')
                    throw new ASMError("Expected '}'");
                next();
            }

            if(token != ',')
                break;
            next();
        }
        this.operandStartPos = operands.length > 0 ? operands[0].startPos : this.opcodeRange;
        if(this.syntax.intel && !(operands.length == 2 && operands[0].type == OPT.IMM && operands[1].type == OPT.IMM))
            operands.reverse();

        if(usesMemory && vexInfo.round !== null)
            throw new ASMError("Embedded rounding can only be used on reg-reg", vexInfo.roundingPos);

        this.outline = { operands, operations, prefsToGen, vexInfo };
        this.endPos = currRange;

        this.removed = false; // Interpreting was successful, so don't mark as removed

        if(this.needsRecompilation)
            queueRecomp(this);
        else
        {
            try
            {
                this.compile();
            }
            catch(e)
            {
                this.error = e;
                this.length = 0;
            }
            if(!this.needsRecompilation && !this.ipRelative)
                this.outline = undefined;
        }
    }

    compile()
    {
        let { operands, operations, prefsToGen, vexInfo } = this.outline;
        let enforcedSize = 0;
        this.length = 0;

        // Before we compile, we'll get the immediates' sizes
        for(let op of operands)
        {
            if(op.type == OPT.IMM)
            {
                if(!op.expression.hasSymbols)
                {
                    op.size = inferImmSize(op.value);
                    op.unsignedSize = inferUnsignedImmSize(op.value);
                }
                else
                {
                    let max = inferImmSize(op.value);
                    for(let size = 8; size <= max; size *= 2)
                    {
                        if((size != op.size || op.size == max) && op.sizeAllowed(size))
                        {
                            op.size = size;
                            op.recordSizeUse(size);

                            if(size < max)
                                queueRecomp(this);

                            break;
                        }
                    }

                    max = inferUnsignedImmSize(op.value);

                    for(let size = 8; size <= max; size *= 2)
                    {
                        if((size != op.unsignedSize || op.unsignedSize == max) && op.sizeAllowed(size, true))
                        {
                            op.unsignedSize = size;
                            op.recordSizeUse(size, true);
                            if(size < max)
                                queueRecomp(this);

                            break;
                        }
                    }
                }
            }
        }

        // Now, we'll find the matching operation for this operand list
        let op, found = false, rexVal = 0x40;
        
        for(let operation of operations)
        {
            if(operation.size !== undefined)
            {
                enforcedSize = operation.size;
                for(let operand of operands)
                    if(operand.type == OPT.MEM || operand.type == OPT.REL)
                        operand.size = enforcedSize;
                continue;
            }
            op = operation.fit(operands, this, vexInfo);
            if(op !== null)
            {
                found = true;
                break;
            }
        }

        if(!found)
        {
            // Try to find why the error occurred
            let minOperandCount = Infinity, maxOperandCount = 0;
            let firstOrderPossible = false, secondOrderPossible = false;

            for(let operation of operations)
            {
                if(operation.size !== undefined)
                    continue;
                if(vexInfo.needed && !operation.allowVex)
                    continue;

                let opCount = (vexInfo.needed ? operation.vexOpCatchers : operation.opCatchers).length;
                if(opCount > maxOperandCount)
                    maxOperandCount = opCount;
                if(opCount < minOperandCount)
                    minOperandCount = opCount;

                firstOrderPossible = firstOrderPossible || operation.matchTypes(operands, vexInfo);
                operands.reverse();
                secondOrderPossible = secondOrderPossible || operation.matchTypes(operands, vexInfo);
                operands.reverse();
            }

            if(operands.length < minOperandCount)
                throw new ASMError("Not enough operands", this.operandStartPos.until(this.endPos));
            
            if(operands.length > maxOperandCount)
                throw new ASMError("Too many operands", this.operandStartPos.until(this.endPos));
            
            if(!firstOrderPossible && secondOrderPossible)
                throw new ASMError("Wrong operand order", this.operandStartPos.until(this.endPos));
            
            throw new ASMError("Invalid operands", this.operandStartPos.until(this.endPos));
        }

        if(op.rexw)
            rexVal |= 8, prefsToGen |= PREFIX_REX; // REX.W field
        
        let modRM = null, sib = null;
        if(op.extendOp)
            rexVal |= 1, prefsToGen |= PREFIX_REX;
        else if(op.rm !== null)
        {
            let extraRex;
            [extraRex, modRM, sib] = this.makeModRM(op.rm, op.reg);
            if(extraRex !== 0) rexVal |= extraRex, prefsToGen |= PREFIX_REX;
        }

        // To encode ah/ch/dh/bh a REX prefix must not be present (otherwise they'll read as spl/bpl/sil/dil)
        if((prefsToGen & PREFIX_CLASHREX) == PREFIX_CLASHREX)
            throw new ASMError("Can't encode high 8-bit register", operands[0].startPos.until(currRange));
        let opcode = op.opcode;

        // Time to generate!
        if(prefsToGen >= PREFIX_SEG)
            this.genByte([0x26, 0x2E, 0x36, 0x3E, 0x64, 0x65][(prefsToGen >> 3) - 1]);
        if(prefsToGen & PREFIX_ADDRSIZE)
            this.genByte(0x67);
        if(op.size == 16)
            this.genByte(0x66);
        if(op.prefix !== null)
        {
            if(op.prefix > 0xff)
                this.genByte(op.prefix >> 8);
            this.genByte(op.prefix);
        }
        if(op.vex !== null)
            makeVexPrefix(op.vex, rexVal, vexInfo.evex).map(x => this.genByte(x));
        else
        {
            if(prefsToGen & PREFIX_REX)
                this.genByte(rexVal);
            // Generate the upper bytes of the opcode if needed
            if(opcode > 0xffff)
                this.genByte(opcode >> 16);
            if(opcode > 0xff)
                this.genByte(opcode >> 8);
        }
        this.genByte(opcode);
        if(modRM !== null)
            this.genByte(modRM);
        if(sib !== null)
            this.genByte(sib);

        // Generating the displacement and immediate
        if(op.rm !== null && op.rm.value !== null)
            this.genInteger(op.rm.value, op.rm.dispSize || 32);
        for(let imm of op.imms)
            this.genInteger(imm.value, imm.size);
    }

    // Generate the ModRM byte
    makeModRM(rm, r)
    {
        let modrm = 0, rex = 0;
        // rm's and r's values may be edited, however the objects themselves shouldn't be modified
        let rmReg = rm.reg, rmReg2 = rm.reg2, rReg = r.reg;

        // Encoding the "reg" field
        if(rReg >= 8)
        {
            rex |= 4; // rex.R extension
            rReg &= 7;
        }
        modrm |= rReg << 3;

        // Special case for RIP-relative addressing
        if(rm.ripRelative)
        {
            rm.value = rm.value || 0n;
            // mod = 00, reg = (reg), rm = 101
            return [rex, modrm | 5, null];
        }

        // Encoding the "mod" (modifier) field
        if(rm.type !== OPT.MEM && rm.type !== OPT.VMEM && rm.type !== OPT.REL) modrm |= 0xC0; // mod=11
        else if(rmReg >= 0)
        {
            if(rm.value !== null)
            {
                if(inferImmSize(rm.value) === 8 && (rm.dispSize == 8 || rm.sizeAvailable(SHORT_DISP)))
                {
                    rm.dispSize = 8;
                    modrm |= 0x40; // mod=01
                    rm.recordSizeUse(SHORT_DISP);
                }
                else if(rm.expression && rm.expression.hasSymbols && rm.dispSize != 8 && rm.sizeAvailable(SHORT_DISP))
                {
                    rm.dispSize = 8;
                    modrm |= 0x40; // mod=01
                    rm.recordSizeUse(SHORT_DISP);

                    queueRecomp(this);
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
            rmReg = 5;
            if(rmReg2 < 0)
                rmReg2 = 4;
            rm.value = rm.value || 0n;
        }
        
        // Encoding the "rm" field
        rex |= rmReg >> 3; // rex.B extension
        rmReg &= 7;

        // Encoding an SIB byte if necessary
        if(rmReg2 >= 0)
        {
            if(rmReg2 >= 8)
            {
                rex |= 2; // rex.X extension
                rmReg2 &= 7;
            }
            
            // rm=100 signifies an SIB byte
            return [rex, modrm | 4, (rm.shift << 6) | (rmReg2 << 3) | rmReg];
        }
        return [rex, modrm | rmReg, null];
    }
}

// Generate the VEX/EVEX prefix
function makeVexPrefix(vex, rex, isEvex)
{
    if(isEvex)
        vex ^= 0x80010; // Invert the V' and R' bits

    let vex1 = vex & 255, vex2 = vex >> 8, vex3 = vex >> 16;
    // The first 3 fields are identical to the last 3 in rex (R, X, B), but inverted
    vex1 |= ((~rex & 7) << 5);
    vex2 |= (((rex & 8)) << 4); // VEX.w = REX.w

    if(isEvex)
        return [0x62, vex1, vex2, vex3];

    if((vex1 & 0x7F) == 0x61 && (vex2 & 0x80) == 0) // In certain cases, we can compress the prefix to 2 bytes
        return [0xC5, vex2 | (vex1 & 0x80)];

    return [0xC4, vex1, vex2];
}

Instruction.prototype.recompile = function()
{
    this.error = null;
    try
    {
        for(let op of this.outline.operands)
        {
            if(op.expression && op.expression.hasSymbols)
                op.value = op.expression.evaluate(this.address, true);
        }
        this.compile();
    }
    catch(e)
    {
        this.length = 0;
        throw e;
    }
}

export class Prefix extends Statement
{
    constructor(prev, name, range)
    {
        super(prev, 1, range);
        this.bytes[0] = prefixes[name];
        this.length = 1;
    }
}



// Infer the size of an immediate from its value
export function inferImmSize(value)
{
    if(value < 0n) // Correct for negative values
        value = ~value;

    return value < 0x80n ? 8 :
            value < 0x8000n ? 16 :
            value < 0x80000000n ? 32 : 64;
}

// Ditto, but for unsigned values
function inferUnsignedImmSize(value)
{
    if(value < 0n) // Technically this doesn't make sense, but we'll allow it
        value = -2n * value - 1n;

    return value < 0x100n ? 8 :
            value < 0x10000n ? 16 :
            value < 0x100000000n ? 32 : 64;
}