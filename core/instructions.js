const MAX_INSTR_SIZE = 15; // Instructions are guaranteed to be at most 15 bytes

import { Operand, parseRegister, OPT, PREFIX_REX, PREFIX_CLASHREX, PREFIX_ADDRSIZE, PREFIX_SEG, regParsePos, sizeHints } from "./operands.js";
import { ASMError, token, next, ungetToken, setToken, currRange, Range, RelativeRange } from "./parser.js";
import { fetchMnemonic, Mnemonic } from "./mnemonicList.js";
import { queueRecomp } from "./symbols.js";
import { Statement } from "./statement.js";
import { pseudoSections } from "./sections.js";
import { IdentifierValue } from "./shuntingYard.js";

export const prefixes = Object.freeze({
    lock: 0xF0,
    repne: 0xF2,
    repnz: 0xF2,
    rep: 0xF3,
    repe: 0xF3,
    repz: 0xF3,
    data16: 0x66,
    addr32: 0x67
});

const SHORT_DISP = 1024;

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

/** Find the correct error to throw when no mnemonics fit the given operand list
 * @param {Mnemonic[]} mnemonics
 * @param {Operand[]} operands */
function explainNoMatch(mnemonics, operands, vexInfo)
{
    let minOperandCount = Infinity, maxOperandCount = 0;
    let firstOrderPossible = false, secondOrderPossible = false;
    let requiresMask = false;

    for(const mnemonic of mnemonics)
        for(const operation of mnemonic.operations)
        {
            let opCount = (mnemonic.vex ? operation.vexOpCatchers : operation.opCatchers).length;
            if(opCount > maxOperandCount)
                maxOperandCount = opCount;
            if(opCount < minOperandCount)
                minOperandCount = opCount;
            if(opCount == operands.length && operation.requireMask)
                requiresMask = true;

            vexInfo.needed = mnemonic.vex;
            firstOrderPossible = firstOrderPossible || operation.matchTypes(operands, vexInfo);
            operands.reverse();
            secondOrderPossible = secondOrderPossible || operation.matchTypes(operands, vexInfo);
            operands.reverse();
        }

    if(operands.length < minOperandCount)
        return "Not enough operands";
    
    if(operands.length > maxOperandCount)
        return "Too many operands";
    
    if(!firstOrderPossible && secondOrderPossible)
        return "Wrong operand order";
    
    if(vexInfo.mask == 0 && requiresMask)
        return "Must use a mask for this instruction";
    
    
    
    return "Wrong operand type" + (operands.length == 1 ? '' : 's');
}


export class Instruction extends Statement
{
    constructor({ name, ...config })
    {
        super({ ...config, maxSize: MAX_INSTR_SIZE });
        this.opcode = name.toLowerCase();
        this.opcodeRange = new RelativeRange(config.range, config.range.start, config.range.length);

        this.interpret();
    }

    // Generate Instruction.outline
    interpret()
    {
        let opcode = this.opcode, operand = null;
        let vexInfo = {
            needed: false,
            evex: false,
            mask: 0,
            zeroing: false,
            round: null,
            broadcast: null
        };

        /** @type {Operand?} */
        let memoryOperand = null;
        this.needsRecompilation = false;

        /** @type { Operand[] } */
        let operands = [];

        let mnemonics = fetchMnemonic(opcode, this.syntax.intel);
        if(mnemonics.length == 0)
            throw new ASMError("Unknown opcode", this.opcodeRange);
        
        mnemonics = mnemonics.filter(mnemonic => mnemonic.size !== null);
        if(mnemonics.length == 0)
            throw new ASMError("Invalid opcode suffix",
                new RelativeRange(this.range, this.opcodeRange.end - 1, 1)
            );
        
        const expectRelative = mnemonics.some(mnemonic => mnemonic.relative);

        if(!this.syntax.intel && token == '{')
        {
            parseRoundingMode(vexInfo);
            if(next() != ',')
                throw new ASMError("Expected ','");
            next();
        }

        // Collecting the operands
        while(token != ';' && token != '\n')
        {
            let sizePtrRange = currRange, enforcedSize = null;
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
                        sizePtrRange = sizePtrRange.until(currRange);
                        enforcedSize = sizeHints[sizePtr.toLowerCase()];
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
                            enforcedSize = sizeHints[sizePtr.toLowerCase()];
                    }
                }
            }
            operand = new Operand(this, expectRelative);

            if(operand.expression && operand.expression.hasSymbols)
                this.needsRecompilation = true;

            operands.push(operand);

            if(operand.reg >= 16 || operand.reg2 >= 16 || operand.size == 512)
                vexInfo.evex = true;
            if(operand.type == OPT.MEM || operand.type == OPT.VMEM || operand.type == OPT.REL)
            {
                memoryOperand = operand;
                if(enforcedSize)
                    operand.size = enforcedSize;
            }
            else if(enforcedSize)
                throw new ASMError("Size hints work only for memory operands", sizePtrRange);

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

        if(memoryOperand && vexInfo.round !== null)
            throw new ASMError("Embedded rounding can only be used on reg-reg", vexInfo.roundingPos);
        
        // Filter out operations whose types don't match
        /** @type {Mnemonic[]} */
        let matchingMnemonics = [];
        for(const mnemonic of mnemonics)
        {
            vexInfo.needed = mnemonic.vex;
            const matchingOps = mnemonic.operations.filter(operation => operation.matchTypes(operands, vexInfo));
            if(matchingOps.length > 0)
                matchingMnemonics.push({ ...mnemonic, operations: matchingOps })
        }

        if(matchingMnemonics.length == 0) // No operations match; find out why
            throw new ASMError(explainNoMatch(mnemonics, operands, vexInfo), this.operandStartPos.until(currRange));

        this.outline = { operands, memoryOperand, mnemonics: matchingMnemonics, vexInfo };
        this.endPos = currRange;

        this.removed = false; // Interpreting was successful, so don't mark as removed

        try
        {
            this.compile();
        }
        catch(e)
        {
            this.error = e;
            this.clear();
        }
        if(!this.needsRecompilation && !this.ipRelative)
            this.outline = undefined;
    }

    compile()
    {
        let { operands, memoryOperand, mnemonics, vexInfo } = this.outline;
        let prefsToGen = 0;
        this.clear();

        if(memoryOperand)
            memoryOperand.evaluate(this, this.syntax.intel);

        // Before we compile, we'll get the immediates' sizes
        for(let i = 0; i < operands.length; i++)
        {
            const op = operands[i];
            prefsToGen |= op.prefs;
            if(op.type == OPT.IMM)
            {
                if(op.expression.hasSymbols)
                    op.evaluate(this);
                if(op.value.isRelocatable())
                {
                    // Get the maximum possible value for this relocatable immediate
                    const firstMnem = mnemonics[0];
                    if(firstMnem.operations.length == 1)
                    {
                        let operation = firstMnem.operations[0];
                        op.size = Math.max(
                            ...(firstMnem.vex ? operation.vexOpCatchers : operation.opCatchers)[i].sizes
                        ) & ~7;
                    }
                    else
                    {
                        op.size = 8;
                        relocationSizeLoop:
                        for(const mnemonic of mnemonics) for(const operation of mnemonic.operations)
                        {
                            const sizes = (mnemonic.vex ? operation.vexOpCatchers : operation.opCatchers)[i].sizes
                            if(sizes.length != 1 || (sizes[0] & ~7) != 8)
                            {
                                op.size = operands.length > 2 ? operands[2].size : operands[1].size;
                                if(op.size > 32)
                                    op.size = 32;
                                break relocationSizeLoop;
                            }
                        }
                    }
                    op.unsignedSize = op.size;
                }
                else if(!op.expression.hasSymbols)
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
        let op, found = false, rexVal = 0x40, memOpSize = memoryOperand?.size;
        
        mnemonicLoop:
        for(const mnemonic of mnemonics)
        {
            if(memoryOperand)
                memoryOperand.size = mnemonic.size || memOpSize;

            vexInfo.needed = mnemonic.vex;
            for(const operation of mnemonic.operations)
            {
                op = operation.fit(operands, this, vexInfo);
                if(op !== null)
                {
                    found = true;
                    break mnemonicLoop;
                }
            }
        }

        if(!found)
        {
            if(memoryOperand && isNaN(memoryOperand.size))
                throw new ASMError("Ambiguous memory size", memoryOperand.startPos.until(memoryOperand.endPos));
            throw new ASMError(
                "Wrong operand size" + (operands.length == 1 ? '' : 's'),
                this.operandStartPos.until(this.endPos)
            );
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
            if(extraRex !== 0)
                rexVal |= extraRex, prefsToGen |= PREFIX_REX;
        }

        // To encode ah/ch/dh/bh a REX prefix must not be present (otherwise they'll read as spl/bpl/sil/dil)
        if((prefsToGen & PREFIX_CLASHREX) == PREFIX_CLASHREX)
            throw new ASMError("Can't encode high 8-bit register", operands[0].startPos.until(currRange));
        let opcode = op.opcode;

        // Time to generate!
        if(prefsToGen >= PREFIX_SEG)
            this.genByte([0x26, 0x2E, 0x36, 0x3E, 0x64, 0x65][(prefsToGen >> 3) - 1]);
        if(prefsToGen & PREFIX_ADDRSIZE)
            this.genByte(prefixes.addr32);
        if(op.size == 16)
            this.genByte(prefixes.data16);
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
        if(op.rm?.value?.addend != null)
        {
            let sizeRelative = false, value = op.rm.value;
            if(op.rm.ripRelative && op.rm.value.section != pseudoSections.ABS && !op.rm.value.pcRelative)
            {
                sizeRelative = true;
                value.apply(this, '-', new IdentifierValue({
                    addend: BigInt(this.address),
                    symbol: (this.section.head.statement ?? instr).symbol,
                    section: this.section,
                    range: value.range
                }));
                this.ipRelative = true;
            }
            this.genValue(value, op.rm.dispSize || 32, true, sizeRelative);
        }
        if(op.relImm !== null)
            this.genValue(op.relImm.value, op.relImm.size, false, true, true);
        else if(op.evexImm !== null)
            this.genByte(op.evexImm);
        else for(const imm of op.imms)
            this.genValue(imm.value, imm.size, !op.unsigned);
        
    }

    /** Generate the ModRM byte
     * @param {Operand} rm
     * @param {Operand} r */
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
            rm.value.addend = rm.value.addend || 0n;
            // mod = 00, reg = (reg), rm = 101
            return [rex, modrm | 5, null];
        }

        // Encoding the "mod" (modifier) field
        if(rm.type !== OPT.MEM && rm.type !== OPT.VMEM)
            modrm |= 0xC0; // mod=11
        else if(rmReg >= 0)
        {
            if(rm.value.addend != null)
            {
                if(!rm.value.isRelocatable() && inferImmSize(rm.value) == 8 && (rm.dispSize == 8 || rm.sizeAvailable(SHORT_DISP)))
                {
                    rm.dispSize = 8;
                    modrm |= 0x40; // mod=01
                    rm.recordSizeUse(SHORT_DISP);
                }
                else if(!rm.value.isRelocatable() && rm.expression && rm.expression.hasSymbols && rm.dispSize != 8 && rm.sizeAvailable(SHORT_DISP))
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
            rm.value.addend = rm.value.addend || 0n;
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

    recompile()
    {
        this.error = null;
        try
        {
            for(const op of this.outline.operands)
                if(op.expression && op.expression.hasSymbols)
                    op.value = op.expression.evaluate(this);

            this.compile();
        }
        catch(e)
        {
            this.clear();
            throw e;
        }
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

export class Prefix extends Statement
{
    constructor({ name, ...config })
    {
        super({ ...config, maxSize: 1 });
        this.bytes[0] = prefixes[name.toLowerCase()];
        this.length = 1;
    }
}



/** Infer the size of an immediate from its value
 * @param {import("./shuntingYard.js").IdentifierValue} value */
export function inferImmSize(value)
{
    let num = value.addend;
    if(num < 0n) // Correct for negative values
        num = ~num;

    return num < 0x80n ? 8 :
            num < 0x8000n ? 16 :
            num < 0x80000000n ? 32 : 64;
}

/** Ditto, but for unsigned values
 * @param {import("./shuntingYard.js").IdentifierValue} value */
function inferUnsignedImmSize(value)
{
    let num = value.addend;
    if(num < 0n) // Technically this doesn't make sense, but we'll allow it
        num = -2n * num - 1n;

    return num < 0x100n ? 8 :
            num < 0x10000n ? 16 :
            num < 0x100000000n ? 32 : 64;
}