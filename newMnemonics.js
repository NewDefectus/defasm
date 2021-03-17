const REG_MOD = -1, REG_OP = -2, REG_NON = -3;
const OPC = {
    r: OPT.REG,
    n: OPT.MMX,
    x: OPT.XMM,
    y: OPT.YMM,
    z: OPT.ZMM,
    i: OPT.IMM,
    m: OPT.MEM,
    s: OPT.SEG,
    f: OPT.ST,
    b: OPT.BND,
    k: OPT.MASK
};

const prefixes = {
    lock: 0xF0n,
    repne: 0xF2n,
    repnz: 0xF2n,
    rep: 0xF3n,
    repe: 0xF3n,
    repz: 0xF3n
};

/** Mnemonic set
* @type {Object.<string,(string[]|Operation[])} */
var mnemonics = {};

let lines;
var mnemonicStrings = `

push
50 o RwQ
6A z-2 Ib~wl
FF 6 mwQ
0FA0 z s_4
0FA8 z s_5

pop
58 o RwQ
8F 0 mwQ
0FA1 z s_4
0FA9 z s_5

mov
88 r Rbwlq r
8A r rbwlq R
8C r s rWlq
8E r rWq s
C7 0 Il rq
B0 o8 i Rbwlq
C6 0 i rbwl`;
mnemonicStrings.split("\n\n").slice(1).forEach(x => { lines = x.split('\n'); mnemonics[lines.shift()] = lines; });

/**  Operand catchers
 * @param {string} format 
 */
function OpCatcher(format)
{
    let i = 1, sizeChar, size;
    this.sizes = [];

    // First is the operand type
    let opType = format[0];
    this.acceptsMemory = "rnxyzm".includes(opType);
    this.unsigned = opType === 'i';
    this.type = OPC[opType.toLowerCase()];
    


    // Optional argument: value for implicit operands
    this.implicitValue = null;
    if(format[1] === '_')
    {
        this.implicitValue = parseInt(format[2]);
        i = 3;
    }

    // Next are the sizes
    while(sizeChar = format[i++])
    {
        if(sizeChar === '~') // ~ prefix means don't choose this size unless it's explicit
            size = suffixes[format[i++]] | SUFFIX_UNINFERRABLE;
        else if(sizeChar < 'a') // Capital letters mean the size should be chosen by default and encoded without a prefix
            size = suffixes[sizeChar.toLowerCase()] | SUFFIX_DEFAULT;
        else
            size = suffixes[sizeChar];
        this.sizes.push(size);
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
 * @param {boolean} enforcedSize 
 * @returns {number|null} The operand's corrected size on success, null on failure
 */
OpCatcher.prototype.catch = function(operand, prevSize, enforcedSize)
{
    // Check that the types match
    if(operand.type != this.type && !(operand.type == OPT.MEM && this.acceptsMemory))
    {
        return null;
    }

    // Check that the sizes match
    let opSize = this.unsigned ? operand.unsignedSize : operand.size, rawSize, size = 0, found = false;

    // For unknown-sized operand catchers, compare against the previous size
    if(this.sizes === -1)
    {
        rawSize = prevSize & ~7;
        if(opSize === rawSize || (operand.type === OPT.IMM && opSize < rawSize)) return prevSize;
        return null;
    }
    
    if(Array.isArray(this.sizes))
    {
        for(size of this.sizes)
        {
            if(isNaN(opSize) && (size & SUFFIX_DEFAULT)) // For unknown-sized operands, choose the default size
            {
                found = true;
                break;
            }
            
            rawSize = size & ~7;
            if(opSize === rawSize || (operand.type === OPT.IMM && opSize < rawSize)) // Allow immediates to be upcast
            {
                if(!(size & SUFFIX_UNINFERRABLE) || enforcedSize)
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
    // Interpreting the opcode
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
    this.opCatchers = format.map(operand => new OpCatcher(operand));
}

/**
 * @typedef {Object} operationResults
 * @property {number} opcode The resulting opcode of the instruction
 * @property {number} size The size that should be encoded into the instruction
 * @property {number|null} prefix A prefix to add in the encoding before the REX prefix
 * @property {boolean} extendOp Special case: if the register is encoded into the opcode but doesn't fit (id > 7), this is true
 * @property {Operand} reg The register operand (goes into ModRM.reg)
 * @property {Operand} rm The register/memory operand (goes into ModRM.rm)
 * @property {Operand[]} imms The immediate operands (should be appended to the instruction)
 */

/** Attempt to fit the operand list into the operation
 * @param {Operand[]} operands The operand list to be fitted
 * @param {boolean} enforcedSize True if the value was enforced with a suffix
 * @returns {operationResults|null} The information needed to encode the instruction
 */
Operation.prototype.fit = function(operands, enforcedSize)
{
    if(operands.length !== this.opCatchers.length) return null; // Operand numbers must match
    let correctedSizes = new Array(operands.length), size = -1, i;

    for(i = 0; i < operands.length; i++)
    {
        if(size > 0 || this.opCatchers[i].sizes !== -1)
        {
            size = this.opCatchers[i].catch(operands[i], size, enforcedSize);
            if(size === null) return null;
        }
        correctedSizes[i] = size;
    }

    // If the operand size specification wasn't in order,
    // we'll have to redo the catching for the skipped operands
    for(i = 0; i < operands.length; i++)
    {
        if(correctedSizes[i] < 0)
        {
            size = this.opCatchers[i].catch(operands[i], size, enforcedSize);
            if(size === null) return null;
            correctedSizes[i] = size;
        }
    }

    // If we've gotten this far, hurray! All operands fit, and the operation can be encoded.
    // Note that while the following operations can be merged into the previous loop, they may
    // be redundant as we wouldn't know if the operation is encodable at all.
    // In other words, this aids performance.

    let reg = null, rm = null, imms = [], correctedOpcode = this.code;
    let adjustByteOp = true, extendOp = false, overallSize = 0;

    let catcher, operand;

    for(i = 0; i < operands.length; i++)
    {
        catcher = this.opCatchers[i], operand = operands[i];
        size = correctedSizes[i];
        operand.size = size & ~7;

        if(catcher.implicitValue === null)
        {
            if(catcher.acceptsMemory) rm = operand; // Memory-accepting catchers correspond to the "rm" argument
            else if(operand.type === OPT.IMM) imms.push(operand);
            else reg = operand; // Todo: Add VEX 'vvvvv' argument catching
        }

        // Only set to overall size if it's not the default size
        if(overallSize == 0 && !(size & SUFFIX_DEFAULT)) overallSize = size & ~7;

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
        if(rm === null) rm = reg; // Move reg to rm if needed (not sure if it ever is needed, may change later)
        reg = {reg: this.extension};
    }

    return {
        opcode: correctedOpcode,
        size: overallSize,
        prefix: this.prefix,
        extendOp: extendOp,
        reg: reg,
        rm: rm,
        imms: imms
    };
}