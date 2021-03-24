const REG_MOD = -1, REG_OP = -2, REG_NON = -3;
const OPC = {
    r: OPT.REG,
    v: OPT.VEC,
    i: OPT.IMM,
    m: OPT.MEM,
    s: OPT.SEG,
    f: OPT.ST,
    b: OPT.BND,
    k: OPT.MASK,
    c: OPT.CTRL,
    d: OPT.DBG,
    g: OPT.VMEM
};

const prefixes = {
    lock: 0xF0n,
    repne: 0xF2n,
    repnz: 0xF2n,
    rep: 0xF3n,
    repe: 0xF3n,
    repz: 0xF3n
};

/** Mnemonic set (loaded in mnemonicList.js)
* @type {Object.<string,(string[]|Operation[])} */
var mnemonics = {};


// To reduce memory use, operand catchers are cached and reused in the future
var opCatcherCache = {};
const sizeIds = {"b": 8, "w": 16, "l": 32, "q": 64, "x": 128, "y": 256, "z": 512};
const SUFFIX_DEFAULT = 1;
const SUFFIX_EXPLICIT = 2;
const SUFFIX_SIGNED = 4;

function getSizes(format, defaultCatcher = null)
{
    let sizes = [], size;
    for(let i = 0; i < format.length; i++)
    {
        size = 0;
        sizeChar = format[i];
        if(sizeChar === '~') // ~ prefix means this size must be explicit
            size |= SUFFIX_EXPLICIT, sizeChar = format[++i];
        if(sizeChar < 'a') // Capital letters mean the size should be chosen by default and encoded without a prefix
        {
            size |= sizeIds[sizeChar.toLowerCase()] | SUFFIX_DEFAULT;
            if(defaultCatcher) defaultCatcher(size);
        }
        else if(sizeChar === 'o')
            size |= 64 | SUFFIX_SIGNED;
        else
            size |= sizeIds[sizeChar];
        
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
    let opType = format[0];
    this.acceptsMemory = "rvb".includes(opType);
    this.forceRM ||= this.acceptsMemory;
    this.unsigned = opType === 'i';
    this.type = OPC[opType.toLowerCase()];

    this.carrySizeInference = this.type !== OPT.IMM;
    if(this.type === OPT.VMEM || this.type === OPT.MEM)
    {
        this.forceRM = true;
        this.carrySizeInference = false;
    }
    


    // Optional argument: value for implicit operands
    this.implicitValue = null;
    if(format[1] === '_')
    {
        this.implicitValue = parseInt(format[2]);
        i = 3;
    }

    // Next are the sizes
    this.defSize = -1;
    this.sizes = getSizes(format.slice(i), size => this.defSize = size);

    if(this.sizes.length === 0)
    {
        if(this.type > OPT.MEM) this.sizes = 0; // Meaning, size doesn't matter
        else this.sizes = -1; // Meaning, use the previously parsed size to catch
    }
}

/** Attempt to "catch" a given operand.
 * @param {Operand} operand 
 * @param {number} prevSize 
 * @param {boolean} enforcedSize 
 * @returns {number|null} The operand's corrected size on success, null on failure
 */
OpCatcher.prototype.catch = function(operand, prevSize, enforcedSize)
{
    // Check that the types match
    if(operand.type !== this.type && !(operand.type === OPT.MEM && this.acceptsMemory))
    {
        return null;
    }

    // Check that the sizes match
    let opSize = this.unsigned ? operand.unsignedSize : operand.size;
    let rawSize, size = 0, found = false;

    if(isNaN(opSize))
    {
        // For unknown-sized operands, if possible, choose the default size
        if(this.defSize > 0) size = this.defSize;
        else opSize = prevSize & ~7; // If a default size isn't available, use the previous size
    }

    // For unknown-sized operand catchers, compare against the previous size
    if(this.sizes === -1)
    {
        if(prevSize & SUFFIX_SIGNED) opSize = operand.size, prevSize = 32;
        rawSize = prevSize & ~7;
        if(opSize === rawSize || (operand.type === OPT.IMM && opSize < rawSize)) return prevSize;
        return null;
    }

    if(size === 0 && Array.isArray(this.sizes))
    {
        for(size of this.sizes)
        {   
            rawSize = size & ~7;
            if(opSize === rawSize || (operand.type === OPT.IMM && opSize < rawSize)) // Allow immediates to be upcast
            {
                if(!(size & SUFFIX_EXPLICIT) || enforcedSize)
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
        let opValue = (operand.type === OPT.IMM ? operand.value : operand.reg);
        if(this.implicitValue !== opValue) return null;
    }

    return size;
}

/** An operation (or "mnemonic variation") can be thought of as an overloaded instance of a mnemonic
 * @param {string[]} format
 */
function Operation(format)
{
    this.vexBase = null;

    // Interpreting the opcode
    this.vexOnly = format[0][0] === 'v';
    if(this.vexOnly)
    {
        this.vexBase = 0;
        if(format[0].includes('w')) this.vexBase |= 0x80;
        if(format[0].includes('l')) this.vexBase |= 4;
        format.shift();
    }
    let opcode = format.shift();
    if(opcode[2] === ')') // Prefix followed by ')'
    {
        this.code = parseInt(opcode.slice(3), 16);
        this.prefix = parseInt(opcode.slice(0, 2), 16);
    }
    else
    {
        this.code = parseInt(opcode, 16);
        this.prefix = null;
    }

    // Interpreting the extension
    let extension = format.shift();
    if(extension === undefined) // Default values
    {
        this.extension = REG_NON;
        this.opDiff = 1;
        this.opCatchers = [];
    }
    else
    {
        switch(extension[0])
        {
            case 'r':
                this.extension = REG_MOD;
                break;
            case 'o':
                this.extension = REG_OP;
                break;
            case 'z':
                this.extension = REG_NON;
                break;
            default:
                this.extension = parseInt(extension[0]);
        }

        // Opcode difference might follow extension number (e.g. o8)
        this.opDiff = extension[1] ? parseInt(extension.slice(1)) : 1;

        // What follows is a list of operand specifiers
        this.opCatchers = [];
        this.vexOpCatchers = [];
        this.allowVex = format.some(op => op.includes('>'));
        this.checkableSizes = null;
        this.forceVex = false;

        let opCatcher;

        if(format[0][0] === '-')
            this.checkableSizes = getSizes(format[0].slice(1));
        else
        {
            for(let operand of format)
            {
                if(operand === '>') // Empty VEX operands shouldn't be counted
                    continue;
                opCatcher = opCatcherCache[operand] || new OpCatcher(operand);
                if(!opCatcher.vexOp) this.opCatchers.push(opCatcher);
                else if(opCatcher.type === OPT.REG)
                {
                    this.allowVex = false;
                    this.forceVex = true;
                    this.vexOpCatchers = [];
                    this.opCatchers.push(opCatcher);
                }

                if(this.allowVex) this.vexOpCatchers.push(opCatcher);
            }
        }

        // Generate the necessary vex info
        if(this.allowVex || this.forceVex)
        {
            if(this.vexBase === null) this.vexBase = 0;
            this.vexBase |= 120 |
                (([0x0F, 0x0F38, 0x0F3A].indexOf(this.code >> 8) + 1) << 8)
                | [null, 0x66, 0xF3, 0xF2].indexOf(this.prefix)
        }
    }
}

/**
 * @typedef {Object} operationResults
 * @property {number} opcode The resulting opcode of the instruction
 * @property {number} size The size that should be encoded into the instruction
 * @property {number|null} prefix A prefix to add in the encoding before the REX prefix
 * @property {boolean} extendOp Special case: if the register is encoded into the opcode but doesn't fit (id > 7), this is true
 * @property {Operand} reg The register operand (goes into ModRM.reg)
 * @property {Operand} rm The register/memory operand (goes into ModRM.rm)
 * @property {number} vex The VEX prefix (partially generated)
 * @property {Operand[]} imms The immediate operands (should be appended to the instruction)
 */

/** Attempt to fit the operand list into the operation
 * @param {Operand[]} operands The operand list to be fitted
 * @param {number} enforcedSize The size that was enforced, or -1 if no size was enforced
 * @param {boolean} enforceVex True if a VEX prefix is needed (i.e. the mnemonic starts with the letter 'v')
 * @returns {operationResults|null} The information needed to encode the instruction
 */
Operation.prototype.fit = function(operands, enforcedSize, enforceVex)
{
    if(enforceVex)
    {
        if(!this.allowVex) return null;
    } else if(this.vexOnly) return null;
    let opCatchers = enforceVex ? this.vexOpCatchers : this.opCatchers;
    if(operands.length !== opCatchers.length) return null; // Operand numbers must match
    let correctedSizes = new Array(operands.length), size = -1, i, catcher, isEnforced = enforcedSize > 0;

    for(i = 0; i < operands.length; i++)
    {
        catcher = opCatchers[i];
        if(size > 0 || Array.isArray(catcher.sizes))
        {
            size = catcher.catch(operands[i], size, isEnforced);
            if(size === null) return null;
        }
        correctedSizes[i] = size;
        if(size === 64 && catcher.copySize !== undefined) size = catcher.copySize;
        if(!catcher.carrySizeInference) size = correctedSizes[i - 1] || -1; // Size shouldn't be inferred from some operands
    }

    // If the operand size specification wasn't in order,
    // we'll have to redo the catching for the skipped operands
    for(i = 0; i < operands.length; i++)
    {
        if(correctedSizes[i] < 0)
        {
            size = opCatchers[i].catch(operands[i], size, isEnforced);
            if(size === null) return null;
            correctedSizes[i] = size;
        }
    }

    // If we've gotten this far, hurray! All operands fit, and the operation can be encoded.
    // Note that while the following operations can be merged into the previous loop, they may
    // be redundant as we wouldn't know if the operation is encodable at all.
    // In other words, this aids performance.

    let reg = null, rm = null, vex = this.vexBase, imms = [], correctedOpcode = this.code;
    let adjustByteOp = true, extendOp = false, overallSize = 0;

    let operand;

    // Special case for the '-' implicit op catcher
    
    if(this.checkableSizes)
    {
        let foundSize = false;
        for(let checkableSize of this.checkableSizes)
        {
            if(enforcedSize === (checkableSize & ~7) || (enforcedSize < 0 && (checkableSize & SUFFIX_DEFAULT)))
            {
                if(this.checkableSizes.includes(8) && enforcedSize > 8) correctedOpcode += this.opDiff;
                overallSize = (checkableSize & SUFFIX_DEFAULT) ? 0 : enforcedSize;
                foundSize = true;
                break;
            }
        }
        if(!foundSize) return null;
    }

    for(i = 0; i < operands.length; i++)
    {
        catcher = opCatchers[i], operand = operands[i];
        size = correctedSizes[i];
        operand.size = size & ~7;

        if(catcher.implicitValue === null)
        {
            if(operand.type === OPT.IMM) imms.unshift(operand);
            else if(catcher.forceRM/* || reg !== null*/) rm = operand;
            else if(catcher.vexOp)
            {
                if(catcher.vexOpImm) imms.unshift({value: BigInt(operand.reg << 4), size: 8});
                else vex = (vex & ~120) | ((~operand.reg & 15) << 3);
            }
            else reg = operand;
        }

        // Only set to overall size if it's not the default size
        if(overallSize < (size & ~7) && (!(size & SUFFIX_DEFAULT) || (size & SUFFIX_EXPLICIT))) overallSize = size & ~7;

        if(adjustByteOp && (size & ~7) != 8 && Array.isArray(catcher.sizes) && catcher.sizes.includes(8))
        {
            correctedOpcode += this.opDiff;
            adjustByteOp = false;
        }
    }

    if(this.extension === REG_OP)
    {
        correctedOpcode += reg.reg & 7;
        extendOp = reg.reg > 7;
        reg = null;
    }
    else if(this.extension === REG_NON) reg = null, rm = null; // Rarely needed, but should be done so the encoder can understand
    else if(this.extension !== REG_MOD)
    {
        if(rm === null) rm = reg;
        reg = {reg: this.extension};
    }

    enforceVex ||= this.forceVex;
    if(overallSize === 256)
    {
        if(enforceVex) vex |= 4;
        else return null; // ymm registers can't be encoded without VEX
    }

    return {
        opcode: correctedOpcode,
        size: overallSize,
        prefix: enforceVex ? null : this.prefix,
        extendOp: extendOp,
        reg: reg,
        rm: rm,
        vex: enforceVex ? vex : null,
        imms: imms
    };
}