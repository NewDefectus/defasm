import { OPT } from "./operands.js";
import { ParserError } from "./parser.js";

const REG_MOD = -1, REG_OP = -2;
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


// To reduce memory use, operand catchers are cached and reused in the future
var opCatcherCache = {};
const sizeIds = {"b": 8, "w": 16, "l": 32, "q": 64, "t": 80, "x": 128, "y": 256, "z": 512};
const SIZETYPE_EXPLICITSUF = 1;
const SIZETYPE_IMPLICITENC = 2;

const EVEXPERM_MASK = 1;
const EVEXPERM_ZEROING = 2;
const EVEXPERM_BROADCAST_32 = 4;
const EVEXPERM_BROADCAST_64 = 8;
const EVEXPERM_BROADCAST = 12;
const EVEXPERM_SAE = 16;
const EVEXPERM_ROUNDING = 32;
const EVEXPERM_FORCEW = 64;
const EVEXPERM_FORCE = 128;

function parseEvexPermits(string)
{
    let permits = 0;
    for(let c of string)
    {
        switch(c)
        {
            case 'k': permits |= EVEXPERM_MASK; break;
            case 'z': permits |= EVEXPERM_ZEROING; break;
            case 'b': permits |= EVEXPERM_BROADCAST_32; break;
            case 'B': permits |= EVEXPERM_BROADCAST_64; break;
            case 's': permits |= EVEXPERM_SAE; break;
            case 'r': permits |= EVEXPERM_ROUNDING; break;
            case 'w': permits |= EVEXPERM_FORCEW; break;
            case 'f': permits |= EVEXPERM_FORCE; break
        }
    }
    return permits;
}

function getSizes(format, defaultCatcher = null)
{
    let sizes = [], size, defaultSize, sizeChar;
    for(let i = 0; i < format.length; i++)
    {
        defaultSize = false;
        size = 0;
        sizeChar = format[i];
        if(sizeChar === '~') // ~ prefix means this size must be explicitly chosen with a suffix
            size |= SIZETYPE_EXPLICITSUF, sizeChar = format[++i];
        if(sizeChar === '$') // $ prefix means this size should be encoded without a prefix
            size |= SIZETYPE_IMPLICITENC, sizeChar = format[++i];
        if(sizeChar === '#') // # prefix means this size should be defaulted to if the operand's size is ambiguous
            defaultSize = true, sizeChar = format[++i];

        if(sizeChar < 'a') // Capital letters are shorthand for the combination $# (default and without prefix)
            defaultSize = true, size |= sizeIds[sizeChar.toLowerCase()] | SIZETYPE_IMPLICITENC;
        else
            size |= sizeIds[sizeChar];
        
        if(defaultSize) defaultCatcher(size);    
        
        sizes.push(size);
    }
    return sizes;
}

/**  Operand catchers
 * @param {string} format 
 */
function OpCatcher(format)
{
    opCatcherCache[format] = this; // Cache this op catcher
    let i = 1;
    this.sizes = [];

    // First is the operand type
    this.forceRM = format[0] === '^';
    this.vexOpImm = format[0] === '<';
    this.vexOp = this.vexOpImm || format[0] === '>';
    if(this.forceRM || this.vexOp) format = format.slice(1);
    this.carrySizeInference = format[0] !== '*';
    if(!this.carrySizeInference) format = format.slice(1);
    let opType = format[0];
    this.acceptsMemory = "rvbkm".includes(opType);
    this.forceRM = this.forceRM || this.acceptsMemory || this.type === OPT.VMEM;
    this.unsigned = opType === 'i';
    this.type = OPC[opType.toLowerCase()];

    this.carrySizeInference = this.carrySizeInference && this.type !== OPT.IMM && this.type !== OPT.MEM;
    


    // Optional argument: value for implicit operands
    this.implicitValue = null;
    if(format[1] === '_')
    {
        this.implicitValue = parseInt(format[2]);
        i = 3;
    }

    // Next are the sizes
    this.defSize = -1;

    if(format[i] === '!')
    {
        this.sizes = 0;
        this.hasByteSize = false;
    }
    else if(format[i] === '/')
    {
        this.sizes = -2;
        this.hasByteSize = false;
    }
    else
    {
        this.sizes = getSizes(format.slice(i), size => this.defSize = size);
        this.hasByteSize = this.sizes.some(x => (x & 8) === 8);
    }

    if(this.sizes.length === 0)
    {
        if(this.type > OPT.MEM) this.sizes = 0; // Meaning, size doesn't matter
        else this.sizes = -1; // Meaning, use the previously parsed size to catch
    }
}

/** Attempt to "catch" a given operand.
 * @param {Operand} operand 
 * @param {number} prevSize 
 * @param {number} enforcedSize 
 * @returns {number|null} The operand's corrected size on success, null on failure
 */
OpCatcher.prototype.catch = function(operand, prevSize, enforcedSize)
{
    // Check that the types match
    if(operand.type !== this.type && !((operand.type === OPT.MEM || operand.type === OPT.REL) && this.acceptsMemory)) return null;

    // Check that the sizes match
    let opSize = this.type === OPT.REL ? operand.virtualSize : this.unsigned ? operand.unsignedSize : operand.size;
    let rawSize, size = 0, found = false;

    if(enforcedSize > 0 && operand.type >= OPT.IMM) opSize = enforcedSize;

    if(isNaN(opSize))
    {
        // For unknown-sized operands, if possible, choose the default size
        if(this.defSize > 0) return this.defSize;
        else if(this.sizes === -2)
        {
            opSize = (prevSize & ~7) >> 1;
            if(opSize < 128) opSize = 128;
        }
        else opSize = prevSize & ~7; // If a default size isn't available, use the previous size
    }
    else if(this.type === OPT.IMM) // Allow immediates to be downcast if necessary
    {
        if(this.defSize > 0 && this.defSize < opSize) return this.defSize;
    }

    // For unknown-sized operand catchers, compare against the previous size
    if(this.sizes === -1)
    {
        rawSize = prevSize & ~7;
        if(opSize === rawSize || (operand.type === OPT.IMM && opSize < rawSize)) return prevSize;
        return null;
    }

    if(this.sizes === -2)
    {
        rawSize = (prevSize & ~7) >> 1;
        if(rawSize < 128) rawSize = 128;
        if(opSize === rawSize) return prevSize;
        return null;
    }

    if(this.sizes !== 0)
    {
        for(size of this.sizes)
        {   
            rawSize = size & ~7;
            if(opSize === rawSize || ((this.type === OPT.IMM || this.type === OPT.REL) && opSize < rawSize)) // Allow immediates and relatives to be upcast
            {
                if(!(size & SIZETYPE_EXPLICITSUF) || enforcedSize === rawSize)
                {
                    found = true;
                    break;
                }
            }
        }
        
        if(!found) return null;
    }
    if(this.implicitValue !== null)
    {
        let opValue = (operand.type === OPT.IMM ? Number(operand.value) : operand.reg);
        if(this.implicitValue !== opValue) return null;
    }

    return size;
}

/** An operation (or "mnemonic variation") can be thought of as an overloaded instance of a mnemonic
 * @param {string[]} format
 */
export function Operation(format)
{
    this.vexBase = 0;
    this.maskSizing = 0;
    this.evexPermits = null;
    this.actuallyNotVex = false;

    // Interpreting the opcode
    this.vexOnly = format[0][0] === 'v';
    this.forceVex = format[0][0] === 'V';
    if(this.vexOnly || this.forceVex)
    {
        if(format[0].includes('w')) this.vexBase |= 0x8000;
        if(format[0].includes('l')) this.vexBase |= 0x400;
        if(format[0].includes('!'))
        {
            this.actuallyNotVex = true; // For non-VEX instructions starting with V
            this.vexOnly = this.forceVex = false;
        }
        format.shift();
    }
    let [opcode, extension] = format.shift().split('.');

    // Op difference (the value to add to the opcode if the size isn't 8)
    let adderSeparator = opcode.indexOf('+');
    if(adderSeparator < 0) adderSeparator = opcode.indexOf('-');
    if(adderSeparator >= 0)
    {
        this.opDiff = parseInt(opcode.slice(adderSeparator));
        opcode = opcode.slice(0, adderSeparator);
    }
    else this.opDiff = 1;

    if(opcode[2] === ')') // Prefix followed by ')'
    {
        this.code = parseInt(opcode.slice(3), 16);
        this.prefix = parseInt(opcode.slice(0, 2), 16);
        this.maskSizing = 4;
    }
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
        if(extension[0] === 'o') this.extension = REG_OP;
        else this.extension = parseInt(extension[0]);
        this.modExtension = extension[1] ? parseInt(extension[1]) : null;
    }

    // What follows is a list of operand specifiers
    this.opCatchers = [];
    if(format.length === 0) return;
    this.allowVex = !this.forceVex && format.some(op => op.includes('>'));
    this.vexOpCatchers = this.allowVex ? [] : null;
    this.checkableSizes = null;
    this.defaultCheckableSize = null;
    this.maxSize = 0;

    let opCatcher;

    if(format[0][0] === '-')
        this.checkableSizes = getSizes(format.shift().slice(1), s => this.defaultCheckableSize = s);
    
    this.allVectors = false;

    for(let operand of format)
    {
        if(operand === '>') // Empty VEX operands shouldn't be counted
            continue;
        if(operand[0] === '{') // EVEX permits
        {
            this.evexPermits = parseEvexPermits(operand.slice(1));
            continue;
        }
        opCatcher = opCatcherCache[operand] || new OpCatcher(operand);
        if(!opCatcher.vexOp || this.forceVex) this.opCatchers.push(opCatcher);
        if(opCatcher.type === OPT.MASK && opCatcher.carrySizeInference) this.maskSizing |= 1;
        if(opCatcher.type === OPT.REG) this.maskSizing |= 2;
        if(this.vexOpCatchers !== null) this.vexOpCatchers.push(opCatcher);

        if(Array.isArray(opCatcher.sizes))
        {
            let had64 = false;
            for(let size of opCatcher.sizes)
            {
                if(size > this.maxSize) this.maxSize = size & ~7;
                if((size & ~7) === 64) had64 = true;
                else if(had64 && (size & ~7) > 64) this.allVectors = true;
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
 * @typedef {Object} operationResults
 * @property {number} opcode The resulting opcode of the instruction
 * @property {number} size The size that should be encoded into the instruction
 * @property {number|null} prefix A prefix to add in the encoding before the REX prefix
 * @property {boolean} extendOp Special case: if the register is encoded into the opcode but doesn't fit (id > 7), this is true
 * @property {boolean} rexw The value of REX.w
 * @property {Operand} reg The register operand (goes into ModRM.reg)
 * @property {Operand} rm The register/memory operand (goes into ModRM.rm)
 * @property {number} vex The VEX prefix (partially generated)
 * @property {Operand[]} imms The immediate operands (should be appended to the instruction)
 */

/**
 * @typedef {Object} vexData
 * @property {boolean} needed True if the instruction should be encoded with VEX
 * @property {boolean} evex True if the instruction should be encoded with EVEX
 * @property {number} mask The id of the mask register used as the instruction writemask
 * @property {boolean} zeroing True if the instruction uses zero-masking, false for merge-masking
 * @property {number|null} round Used to identify one of 4 rounding modes, or 0 for SAE, or null for none specified
 * @property {number|null} broadcast Used to identify one of 2 broadcasting modes, or null for none specified
 * @returns 
 */

/** Attempt to fit the operand list into the operation
 * @param {Operand[]} operands The operand list to be fitted
 * @param {number} enforcedSize The size that was enforced, or 0 if no size was enforced
 * @param {vexData|null} vexInfo Additional info needed to encode the instruction with a VEX/EVEX prefix
 * @returns {operationResults|null} The information needed to encode the instruction
 */
Operation.prototype.fit = function(operands, enforcedSize, vexInfo)
{
    let needsRecompilation = false;
    if(vexInfo.needed)
    {
        if(this.actuallyNotVex) vexInfo.needed = false;
        else if(!this.allowVex) return null;
        if(vexInfo.evex)
        {
            if(this.actuallyNotVex) return null;
            if(this.evexPermits === null) return null;
            if(!(this.evexPermits & EVEXPERM_MASK) && vexInfo.mask > 0) return null;
            if(!(this.evexPermits & EVEXPERM_BROADCAST) && vexInfo.broadcast !== null) return null;
            if(!(this.evexPermits & EVEXPERM_ROUNDING) && vexInfo.round > 0) return null;
            if(!(this.evexPermits & EVEXPERM_SAE) && vexInfo.round === 0) return null;
            if(!(this.evexPermits & EVEXPERM_ZEROING) && vexInfo.zeroing) return null;
        }
        else if(this.evexPermits & EVEXPERM_FORCE) vexInfo.evex = true;
    }
    else if(this.vexOnly) return null;
    else if(this.evexPermits & EVEXPERM_FORCE) return null;

    let adjustByteOp = false, overallSize = 0, rexw = false;

    // Special case for the '-' implicit op catcher
    if(this.checkableSizes)
    {
        if(enforcedSize === 0)
        {
            if(this.defaultCheckableSize === null) return null;
            overallSize = this.defaultCheckableSize;
            if(this.checkableSizes.includes(8) && overallSize > 8) adjustByteOp = true;
        }
        else
        {
            let foundSize = false;
            for(let checkableSize of this.checkableSizes)
            {
                if(enforcedSize === (checkableSize & ~7))
                {
                    if(this.checkableSizes.includes(8) && enforcedSize > 8) adjustByteOp = true;
                    overallSize = checkableSize;
                    foundSize = true;
                    break;
                }
            }
            if(!foundSize) return null;
        }

        if(overallSize & SIZETYPE_IMPLICITENC) overallSize = 0;
        overallSize &= ~7;
        if(overallSize === 64) rexw = true;
        enforcedSize = 0;
    }

    let opCatchers = vexInfo.needed ? this.vexOpCatchers : this.opCatchers;
    if(operands.length !== opCatchers.length) return null; // Operand numbers must match
    let correctedSizes = new Array(operands.length), size = -1, prevSize = -1, i, catcher;

    for(i = 0; i < operands.length; i++)
    {
        catcher = opCatchers[i];
        if(size > 0 || Array.isArray(catcher.sizes))
        {
            size = catcher.catch(operands[i], size, enforcedSize);
            if(size === null) return null;
        }
        correctedSizes[i] = size;
        if(size === 64 && catcher.copySize !== undefined) size = catcher.copySize;
        if(!catcher.carrySizeInference) size = prevSize; // Size shouldn't be inferred from some operands
        prevSize = size;
    }

    // If the operand size specification wasn't in order,
    // we'll have to redo the catching for the skipped operands
    for(i = 0; i < operands.length; i++)
    {
        if(correctedSizes[i] < 0)
        {
            size = opCatchers[i].catch(operands[i], size, enforcedSize);
            if(size === null) return null;
            correctedSizes[i] = size;
        }
    }

    // If we've gotten this far, hurray! All operands fit, and the operation can be encoded.
    // Note that while the following operations can be merged into the previous loop, they may
    // be redundant as we wouldn't know if the operation is encodable at all.
    // In other words, this aids performance.

    let reg = null, rm = null, vex = this.vexBase, imms = [], correctedOpcode = this.code;
    let extendOp = false;

    let operand;

    for(i = 0; i < operands.length; i++)
    {
        catcher = opCatchers[i], operand = operands[i];
        size = correctedSizes[i];
        operand.size = size & ~7;

        if(operand.size === 64 && !(size & SIZETYPE_IMPLICITENC) && !this.allVectors) rexw = true;
        if(catcher.implicitValue === null)
        {
            if(operand.type === OPT.IMM) imms.unshift(operand);
            else if(catcher.type === OPT.REL)
            {
                imms.unshift({
                    value: operand.virtualValue,
                    size: size
                });
                needsRecompilation = true;
            }
            else if(catcher.forceRM) rm = operand;
            else if(catcher.vexOp)
            {
                if(catcher.vexOpImm) imms.unshift({value: BigInt(operand.reg << 4), size: 8});
                else vex = (vex & ~0x7800) | ((~operand.reg & 15) << 11);

                if(operand.reg >= 16) vex |= 0x80000; // EVEX.V'
            }
            else reg = operand;
            if(operand.type === OPT.VEC && operand.size === 64 && vexInfo.needed) throw new ParserError("Can't encode MMX with VEX prefix", operand.endPos);
        }

        // Overall size represents the highest non-implicitly encoded size
        if(overallSize < (size & ~7) && !(size & SIZETYPE_IMPLICITENC)) overallSize = size & ~7;

        if(size >= 16) adjustByteOp = adjustByteOp || catcher.hasByteSize;
    }

    if(this.extension === REG_OP)
    {
        correctedOpcode += reg.reg & 7;
        extendOp = reg.reg > 7;
        reg = null;
    }
    else if(this.extension !== REG_MOD)
    {
        if(rm === null)
        {
            if(this.modExtension === null) rm = reg;
            else rm = {type: OPT.MEM, reg: this.modExtension, value: null};
        }
        reg = {reg: this.extension};
    }

    vexInfo.needed = vexInfo.needed || this.forceVex;

    switch(this.maskSizing)
    {
        case 1:
            if(overallSize === 8 || overallSize === 32) vex |= 0x100; // 66 prefix for byte or doubleword masks
            if(overallSize > 16) overallSize = 64; // W flag for doubleword or quadword masks
            else overallSize = 0;
            adjustByteOp = false;
            break;

        case 3:
            if(overallSize === 8) vex |= 0x100; // 66 prefix for byte masks
            if(overallSize > 16) vex |= 0x300; // F2 prefix for doubleword or quadword masks
            adjustByteOp = false;
            break;

        case 5:
            adjustByteOp = overallSize > 16;
            if(overallSize === 16 || overallSize === 64) overallSize = 64; // W flag for word or quadword masks
            break;
    }

    if(vexInfo.needed)
    {
        if(this.allVectors) vex |= 0x100; // 66 prefix

        // Some additional EVEX data
        if(vexInfo.evex)
        {
            vex |= 0x400; // This reserved bit is always set to 1
            if(vexInfo.zeroing) vex |= 0x800000; // EVEX.z
            if(vexInfo.round !== null)
            {
                if(overallSize !== this.maxSize) throw new ParserError("Invalid vector size for embedded rounding", vexInfo.roundingPos);
                if(vexInfo.round > 0) vexInfo.round--;
                vex |= (vexInfo.round << 21) | 0x100000; // EVEX.RC
            }
            else
            {
                let sizeId = [128, 256, 512].indexOf(overallSize);
                vex |= sizeId << 21; // EVEX.L'L

                if(vexInfo.broadcast !== null)
                {
                    if(this.evexPermits & EVEXPERM_BROADCAST_32) sizeId++;
                    if(vexInfo.broadcast !== sizeId) throw new ParserError("Invalid broadcast", vexInfo.broadcastPos);
                    vex |= 0x100000; // EVEX.b
                }
            }
            vex |= vexInfo.mask << 16; // EVEX.aaa
            if(this.evexPermits & EVEXPERM_FORCEW) vex |= 0x8000;
            if(reg.reg >= 16) vex |= 0x10, reg.reg &= 15; // EVEX.R'
            if(rm.reg2 >= 16) vex |= 0x80000; // EVEX.V' sometimes serves as an extension to EVEX.X
        }
        else if(overallSize === 256) vex |= 0x400;
    }
    else if(overallSize > 128)
    {
        let reg;
        for(reg of operands) if(reg.size > 128 && reg.endPos) break;
        throw new ParserError("YMM/ZMM registers can't be encoded without VEX", reg.endPos);
    }

    if(adjustByteOp) correctedOpcode += this.opDiff;

    return {
        opcode: correctedOpcode,
        size: overallSize,
        rexw: rexw,
        prefix: vexInfo.needed ? null : (this.allVectors && overallSize > 64 ? 0x66 : this.prefix),
        extendOp: extendOp,
        reg: reg,
        rm: rm,
        vex: vexInfo.needed ? vex : null,
        imms: imms,
        needsRecompilation: needsRecompilation
    };
}