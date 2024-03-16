import { createBitfieldClass } from "./bitfield.js";
import { Instruction } from "./instructions.js";
import { Operand, OPT, suffixes } from "./operands.js";
import { ASMError } from "./parser.js";
import { queueRecomp } from "./symbols.js";

const REG_MOD = -1, REG_OP = -2;
/**
 * @type {Object.<string, OperandType>}
 */
const OPC = {
    r: OPT.REG,
    v: OPT.VEC,
    i: OPT.IMM,
    j: OPT.REL,
    m: OPT.MEM,
    s: OPT.SEG,
    f: OPT.ST,
    b: OPT.BND,
    k: OPT.MASK,
    c: OPT.CTRL,
    d: OPT.DBG,
    g: OPT.VMEM
};

const sizers = Object.assign({f: 48}, suffixes);


// To reduce memory use, operand catchers are cached and reused in the future
var opCatcherCache = {};
const SIZETYPE_IMPLICITENC = 1;

export const EvexPermits = createBitfieldClass([
    "MASK", "ZEROING", "BROADCAST_32", "BROADCAST_64", "SAE",
    "ROUNDING", "FORCEW", "FORCE", "FORCE_MASK"
]);

function parseEvexPermits(string)
{
    let permits = new EvexPermits();
    for(let c of string)
    {
        switch(c)
        {
            case 'k': permits.MASK = true; break;
            case 'K': permits.FORCE_MASK = permits.MASK = true; break;
            case 'z': permits.ZEROING = true; break;
            case 'b': permits.BROADCAST_32 = true; break;
            case 'B': permits.BROADCAST_64 = true; break;
            case 's': permits.SAE = true; break;
            case 'r': permits.ROUNDING = true; break;
            case 'w': permits.FORCEW = true; break;
            case 'f': permits.FORCE = true; break
        }
    }
    return permits;
}

function getSizes(format)
{
    let sizes = { list: [], def: undefined, defVex: undefined };
    for(let i = 0; i < format.length; i++)
    {
        let defaultSize = false, defaultVexSize = false, size = 0, sizeChar = format[i];
        if(sizeChar == '$') // $ prefix means this size should be encoded without a prefix
            size |= SIZETYPE_IMPLICITENC, sizeChar = format[++i];
        if(sizeChar == '#') // # prefix means this size should be defaulted to if the operand's size is ambiguous
            defaultSize = true, sizeChar = format[++i];
        if(sizeChar == '~') // ~ prefix means the same as # but for VEX mode only
            defaultVexSize = true, sizeChar = format[++i];

        if(sizeChar < 'a') // Capital letters are shorthand for the combination $# (default and without prefix)
            defaultSize = true, size |= sizers[sizeChar.toLowerCase()] | SIZETYPE_IMPLICITENC;
        else
            size |= sizers[sizeChar];
        
        sizes.list.push(size);
        if(defaultSize)
            sizes.def = size;
        if(defaultVexSize)
            sizes.defVex = size;
    }
    return sizes;
}

const sizeLen = x => x == 32 ? 4n : x == 16 ? 2n : 1n;
const absolute = x => x < 0n ? ~x : x;

/**
 * @typedef {Object} VexData
 * @property {boolean} needed
 * @property {boolean} evex
 * @property {number} mask
 * @property {boolean} zeroing
 * @property {number|null} round
 * @property {number|null} broadcast
 */

/** Operand catchers
 * @param {string} format 
 */
export class OpCatcher
{
    /**
     * Constructor
     * @param {string} format 
     */
    constructor(format)
    {
        opCatcherCache[format] = this; // Cache this op catcher
        let i = 1;
        this.sizes = [];

        // First is the operand type
        this.forceRM = format[0] == '^';
        this.vexOpImm = format[0] == '<';
        this.vexOp = this.vexOpImm || format[0] == '>';
        this.moffset = format[0] == '%'; // Only used once in the entire instruction set
        if(this.forceRM || this.vexOp || this.moffset)
            format = format.slice(1);
        this.carrySizeInference = format[0] != '*';
        if(!this.carrySizeInference)
            format = format.slice(1);
        let opType = format[0];
        this.acceptsMemory = "rvbkm".includes(opType);
        this.unsigned = opType == 'i';
        this.type = OPC[opType.toLowerCase()];
        this.forceRM = this.forceRM || this.acceptsMemory || this.type === OPT.VMEM;

        this.carrySizeInference = this.carrySizeInference && this.type !== OPT.IMM && this.type !== OPT.MEM;
        
        // Optional argument: value for implicit operands
        this.implicitValue = null;
        if(format[1] == '_')
        {
            this.implicitValue = parseInt(format[2]);
            i = 3;
        }

        // Next are the sizes
        this.defSize = this.defVexSize = -1;

        if(format[i] == '!')
        {
            this.sizes = 0;
            this.hasByteSize = false;
        }
        else if(format[i] == '/')
        {
            this.sizes = -2;
            this.hasByteSize = false;
        }
        else
        {
            let sizeData = getSizes(format.slice(i));
            this.sizes = sizeData.list;
            if(sizeData.def)
                this.defSize = this.defVexSize = sizeData.def;
            if(sizeData.defVex)
                this.defVexSize = sizeData.defVex;
            this.hasByteSize = this.sizes.some(x => (x & 8) === 8);
        }

        if(this.sizes.length == 0)
        {
            if(!this.type.hasSize)
                this.sizes = 0; // Meaning, size doesn't matter
            else
                this.sizes = -1; // Meaning, use the previously parsed size to catch
        }
    }

    /** Attempt to "catch" a given operand.
     * @param {Operand} operand
     * @param {number} prevSize
     * @param {boolean} isVex
     * @returns {number|null} The operand's corrected size on success, null on failure
     */
    catch(operand, prevSize, isVex)
    {
        // Check that the sizes match
        let opSize = this.moffset ? operand.dispSize : this.unsigned ? operand.unsignedSize : operand.size;
        let rawSize, size = 0, found = false;
        let defSize = isVex ? this.defVexSize : this.defSize;

        if(isNaN(opSize))
        {
            // For unknown-sized operands, if possible, choose the default size
            if(defSize > 0)
                return defSize;
            else if(this.moffset)
            {
                if(operand.value.inferSize() == 64)
                    opSize = 64;
                else
                    return null;
            }
            else if(this.sizes == -2)
            {
                opSize = (prevSize & ~7) >> 1;
                if(opSize < 128)
                    opSize = 128;
            }
            else // If a default size isn't available, use the previous size
                opSize = prevSize & ~7;
        }
        else if(this.type === OPT.IMM && defSize > 0 && defSize < opSize) // Allow immediates to be downcast if necessary
            return defSize;

        // For unknown-sized operand catchers, compare against the previous size
        if(this.sizes == -1)
        {
            rawSize = prevSize & ~7;
            if(opSize == rawSize || (operand.type === OPT.IMM && opSize < rawSize))
                return Math.max(0, prevSize);
            return null;
        }

        if(this.sizes == -2)
        {
            rawSize = (prevSize & ~7) >> 1;
            if(rawSize < 128)
                rawSize = 128;
            if(opSize == rawSize)
                return prevSize;
            return null;
        }

        if(this.sizes !== 0)
        {
            for(size of this.sizes)
            {
                rawSize = size & ~7;
                if(opSize == rawSize || ((this.type === OPT.IMM || this.type === OPT.REL) && opSize < rawSize)) // Allow immediates and relatives to be upcast
                {
                    found = true;
                    break;
                }
            }
            
            if(!found)
                return null;
        }

        return size;
    }
}

/**
 * An operation (or "mnemonic variation") can be thought of as an
 * overloaded instance of a mnemonic
 */
export class Operation
{
    /**
     * Constructor
     * @param {string[]} format 
     */
    constructor(format)
    {
        this.vexBase = 0;
        this.evexPermits = null;
        this.actuallyNotVex = false;
        this.vexOnly = false;
        this.requireMask = false;

        // Interpreting the opcode
        this.forceVex = format[0][0] == 'V';
        this.vexOnly = format[0][0] == 'v';
        if("vVwl!".includes(format[0][0]))
        {
            let specializers = format.shift();
            if(specializers.includes('w')) this.vexBase |= 0x8000;
            if(specializers.includes('l')) this.vexBase |= 0x400;
            if(specializers.includes('!'))
                this.actuallyNotVex = true; // For non-VEX instructions starting with V
        }
        let [opcode, extension] = format.shift().split('.');

        // Op difference (the value to add to the opcode if the size isn't 8)
        let adderSeparator = opcode.indexOf('+');
        if(adderSeparator < 0)
            adderSeparator = opcode.indexOf('-');
        if(adderSeparator >= 0)
        {
            this.opDiff = parseInt(opcode.slice(adderSeparator));
            opcode = opcode.slice(0, adderSeparator);
        }
        else
            this.opDiff = 1;

        if(opcode.includes(')'))
            [this.prefix, this.code] = opcode.split(')').map(x => parseInt(x, 16));
        else
        {
            this.code = parseInt(opcode, 16);
            this.prefix = null;
        }

        // Interpreting the extension
        if(extension === undefined) // Default values
        {
            this.extension = REG_MOD;
            this.modExtension = null;
        }
        else
        {
            if(extension[0] == 'o')
                this.extension = REG_OP;
            else
                this.extension = parseInt(extension[0]);
            this.modExtension = extension[1] ? parseInt(extension[1]) : null;
        }

        this.allVectors = false;
        this.relativeSizes = null;
        this.allowVex = this.forceVex || format.some(op => op.includes('>'));
        this.maxSize = 0;

        this.vexOpCatchers = this.allowVex ? [] : null;

        // What follows is a list of operand specifiers
        /** @type { OpCatcher[] } */
        this.opCatchers = [];
        if(format.length == 0)
            return;

        let opCatcher;

        for(let operand of format)
        {
            if(operand == '>') // Empty VEX operands shouldn't be counted
                continue;
            if(operand[0] == '{') // EVEX permits
            {
                this.evexPermits = parseEvexPermits(operand.slice(1));
                if(this.evexPermits.FORCE)
                    this.vexOnly = true;
                if(this.evexPermits.FORCE_MASK)
                    this.requireMask = true;
                continue;
            }
            opCatcher = opCatcherCache[operand] || new OpCatcher(operand);
            if(opCatcher.type === OPT.REL) this.relativeSizes = opCatcher.sizes;
            if(!opCatcher.vexOp || this.forceVex) this.opCatchers.push(opCatcher);
            if(this.vexOpCatchers !== null) this.vexOpCatchers.push(opCatcher);

            if(Array.isArray(opCatcher.sizes))
            {
                let had64 = false;
                for(let size of opCatcher.sizes)
                {
                    if(size > this.maxSize)
                        this.maxSize = size & ~7;
                    if((size & ~7) == 64)
                        had64 = true;
                    else if(had64 && (size & ~7) > 64)
                        this.allVectors = true;
                }
            }
        }

        // Generate the necessary vex info
        if(this.allowVex || this.forceVex)
        {
            this.vexBase |= 0x7800 |
                ([0x0F, 0x0F38, 0x0F3A].indexOf(this.code >> 8) + 1)
                | ([null, 0x66, 0xF3, 0xF2].indexOf(this.prefix) << 8);
        }
    }

    /**
     * Check if the given VEX data is appropriate for this operation
     * @param {VexData} vexInfo
     * @returns {boolean}
     */
    validateVEX(vexInfo)
    {
        if(vexInfo.needed)
        {
            if(this.actuallyNotVex || !this.allowVex)
                return false;
            if(vexInfo.evex)
            {
                if(
                    this.evexPermits === null ||
                    !this.evexPermits.MASK && vexInfo.mask > 0 ||
                    !(this.evexPermits.BROADCAST_32 || this.evexPermits.BROADCAST_64) && vexInfo.broadcast !== null ||
                    !this.evexPermits.ROUNDING && vexInfo.round > 0 ||
                    !this.evexPermits.SAE && vexInfo.round === 0 ||
                    !this.evexPermits.ZEROING && vexInfo.zeroing)
                    return false;
            }
            else if(this.evexPermits?.FORCE)
                vexInfo.evex = true;
        }
        else if(this.vexOnly || this.evexPermits?.FORCE)
            return false;
        
        if(this.evexPermits?.FORCE_MASK && vexInfo.mask == 0)
            return false;
        return true;
    }

    /**
     * Attempt to fit the operand list into the operation
     * @param {Operand[]} operands
     * @param {Instruction} instr
     * @param {VexData} vexInfo
     * @returns an object containing encoding data, or null if the operand
     * list didn't fit
     */
    fit(operands, instr, vexInfo)
    {
        if(!this.validateVEX(vexInfo))
            return null;

        let adjustByteOp = false, overallSize = 0, rexw = false;

        if(this.relativeSizes)
        {
            if(!(operands.length == 1 && operands[0].type === OPT.REL))
                return null;
            operands[0].size = this.getRelSize(operands[0], instr);
        }

        let opCatchers = vexInfo.needed ? this.vexOpCatchers : this.opCatchers;
        if(operands.length != opCatchers.length)
            return null; // Operand numbers must match
        let correctedSizes = new Array(operands.length), size = -1, prevSize = -1, i, catcher;

        for(i = 0; i < operands.length; i++)
        {
            catcher = opCatchers[i];
            if(size > 0 || Array.isArray(catcher.sizes))
            {
                size = catcher.catch(operands[i], size, vexInfo.needed, vexInfo.broadcast !== null);
                if(size === null)
                    return null;
            }
            correctedSizes[i] = size;
            if(size >= 512 && !vexInfo.evex) // Sometimes the 512 size is implicit
            {
                vexInfo.evex = true;
                if(!this.validateVEX(vexInfo))
                    return null;
            }

            if(!catcher.carrySizeInference)
                size = prevSize; // Size shouldn't be inferred from some operands
            prevSize = size;
        }

        // If the operand size specification wasn't in order,
        // we'll have to redo the catching for the skipped operands
        for(i = 0; i < operands.length; i++)
        {
            if(correctedSizes[i] < 0)
            {
                size = opCatchers[i].catch(operands[i], size, vexInfo.needed);
                if(size === null)
                    return null;
                correctedSizes[i] = size;
            }
        }

        // If we've gotten this far, hurray! All operands fit, and the operation can be encoded.
        // Note that while the following operations can be merged into the previous loop, they may
        // be redundant as we wouldn't know if the operation is encodable at all.
        // In other words, this aids performance.

        let reg = null, rm = null, vex = this.vexBase, imms = [], correctedOpcode = this.code, evexImm = null, relImm = null, moffs = null;
        let extendOp = false, unsigned = false;

        let operand;

        for(i = 0; i < operands.length; i++)
        {
            catcher = opCatchers[i], operand = operands[i];
            size = correctedSizes[i];
            if(catcher.moffset)
                operand.dispSize = size & ~7;
            else
            {
                operand.size = size & ~7;
                if(operand.size != 0)
                    operand.recordSizeUse(operand.size, catcher.unsigned);
            }
            if(catcher.unsigned)
                unsigned = true;

            if(operand.size == 64 && !(size & SIZETYPE_IMPLICITENC) && !this.allVectors)
                rexw = true;
            if(catcher.implicitValue === null)
            {
                if(operand.type === OPT.IMM)
                    imms.push(operand);
                else if(catcher.type === OPT.REL)
                {
                    relImm = operand;
                    instr.ipRelative = true;
                }
                else if(catcher.moffset)
                    moffs = operand;
                else if(catcher.forceRM)
                    rm = operand;
                else if(catcher.vexOp)
                {
                    if(catcher.vexOpImm)
                        evexImm = BigInt(operand.reg << 4);
                    else
                        vex = (vex & ~0x7800) | ((~operand.reg & 15) << 11);

                    if(operand.reg >= 16)
                        vex |= 0x80000; // EVEX.V'
                }
                else
                    reg = operand;
                if(operand.type === OPT.VEC && operand.size == 64 && vexInfo.needed)
                    throw new ASMError("Can't encode MMX with VEX prefix", operand.endPos);
            }

            // Overall size represents the highest non-implicitly encoded size
            if(!catcher.moffset && overallSize < (size & ~7) && !(size & SIZETYPE_IMPLICITENC))
                overallSize = size & ~7;

            if(size >= 16)
                adjustByteOp = adjustByteOp || catcher.hasByteSize;
        }

        if(this.extension == REG_OP)
        {
            correctedOpcode += reg.reg & 7;
            extendOp = reg.reg > 7;
            reg = null;
        }
        else if(this.extension != REG_MOD)
        {
            if(rm === null)
            {
                if(this.modExtension === null)
                    rm = reg;
                else
                    rm = { type: OPT.MEM, reg: this.modExtension, value: null };
            }
            reg = {reg: this.extension};
        }

        vexInfo.needed = vexInfo.needed || this.forceVex;

        if(vexInfo.needed)
        {
            if(this.allVectors)
                vex |= 0x100; // 66 prefix

            // Some additional EVEX data
            if(vexInfo.evex)
            {
                vex |= 0x400; // This reserved bit is always set to 1
                if(vexInfo.zeroing)
                    vex |= 0x800000; // EVEX.z
                if(vexInfo.round !== null)
                {
                    if(overallSize !== this.maxSize)
                        throw new ASMError("Invalid vector size for embedded rounding", vexInfo.roundingPos);
                    if(vexInfo.round > 0)
                        vexInfo.round--;
                    vex |= (vexInfo.round << 21) | 0x100000; // EVEX.RC
                }
                else
                {
                    let sizeId = [128, 256, 512].indexOf(overallSize);
                    vex |= sizeId << 21; // EVEX.L'L

                    if(vexInfo.broadcast !== null)
                    {
                        if(this.evexPermits.BROADCAST_32)
                            sizeId++;
                        if(vexInfo.broadcast !== sizeId)
                            throw new ASMError("Invalid broadcast", vexInfo.broadcastPos);
                        vex |= 0x100000; // EVEX.b
                    }
                }
                vex |= vexInfo.mask << 16; // EVEX.aaa
                if(this.evexPermits.FORCEW)
                    vex |= 0x8000;
                if(reg.reg >= 16)
                    vex |= 0x10, reg.reg &= 15; // EVEX.R'
                if(rm.reg2 >= 16)
                    vex |= 0x80000; // EVEX.V' sometimes serves as an extension to EVEX.X
            }
            else if(overallSize == 256)
                vex |= 0x400;
        }
        else
        {
            if(overallSize > 128)
            {
                for(let reg of operands)
                    if(reg.size > 128 && reg.endPos)
                        throw new ASMError("YMM/ZMM registers can't be encoded without VEX", reg.endPos);
            }
            for(let reg of operands)
                if(reg.type === OPT.VEC && reg.reg >= 16 && reg.endPos)
                    throw new ASMError("Registers with ID >= 16 can't be encoded without EVEX", reg.endPos);
        }

        if(adjustByteOp)
            correctedOpcode += this.opDiff;

        return {
            opcode: correctedOpcode,
            size: overallSize,
            rexw,
            prefix: vexInfo.needed ? null : (this.allVectors && overallSize > 64 ? 0x66 : this.prefix),
            extendOp,
            /** @type {Operand} */ reg,
            /** @type {Operand} */ rm,
            vex: vexInfo.needed ? vex : null,
            evexImm,
            relImm,
            imms,
            unsigned,
            moffs
        };
    }

    /**
     * Predict a fitting size for a given relative operand
     * @param {Operand} operand
     * @param {Instruction} instr
    */
    getRelSize(operand, instr)
    {
        if(operand.value.isRelocatable())
            return Math.max(...this.relativeSizes);
        const target = operand.value.addend - BigInt(((this.code > 0xFF ? 2 : 1) + (this.prefix !== null ? 1 : 0)));
        
        // In x86-64 there are always either 1 or 2 possible sizes for a relative
        if(this.relativeSizes.length == 1)
        {
            const size = this.relativeSizes[0];
            if(absolute(target - sizeLen(size)) >= 1n << BigInt(size - 1))
                throw new ASMError(`Can't fit offset in ${size >> 3} byte${size != 8 ? 's' : ''}`, operand.startPos.until(operand.endPos));
            return size;
        }
        
        // Now we have the second, more complicated case. There's a threshold between the two sizes we must find
        let [small, large] = this.relativeSizes;
        let smallLen = sizeLen(small), largeLen = sizeLen(large) + (this.opDiff > 256 ? 1n : 0n);

        if(absolute(target - smallLen) >= 1n << BigInt(small - 1) || !operand.sizeAllowed(small, false))
        {
            if(small != operand.size && operand.sizeAllowed(small, false))
            {
                queueRecomp(instr);
                return small;
            }
            if(absolute(target - largeLen) >= 1n << BigInt(large - 1))
                throw new ASMError(`Can't fit offset in ${large >> 3} bytes`, operand.startPos.until(operand.endPos));
            return large;
        }
        return small;
    }

    /**
     * Check if a list of operands has the right types for this operation
     * @param {Operand[]} operands 
     * @param {VexData} vexInfo 
     */
    matchTypes(operands, vexInfo)
    {
        if(vexInfo.mask == 0 && this.requireMask)
            return false;

        let opCatchers = vexInfo.needed ? this.vexOpCatchers : this.opCatchers;
        if(operands.length != opCatchers.length)
            return false;

        for(let i = 0; i < operands.length; i++)
        {
            const catcher = opCatchers[i], operand = operands[i];
            if(
                // Check that the types match
                operand.type != catcher.type &&
                !(operand.type === OPT.MEM && catcher.acceptsMemory)
                ||
                // In case of implicit operands, check that the values match
                catcher.implicitValue !== null &&
                catcher.implicitValue !== (operand.type === OPT.IMM ? Number(operand.value.addend) : operand.reg)
                ||
                // Super special case: if the operand is of type moffset,
                // make sure it is only an offset
                catcher.moffset && (operand.reg >= 0 || operand.reg2 >= 0)
            )
                return false;
        }
        
        return true;
    }
}