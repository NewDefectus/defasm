import { createBitfieldClass } from "./bitfield.js";
import { ASMError, token, next, ungetToken, currRange, currSyntax, prevRange, setToken } from "./parser.js";
import { Expression, CurrentIP } from "./shuntingYard.js";
import { currBitness } from "./compiler.js";

export class OperandType
{
    constructor(name, { hasSize = true, isMemory = false, isVector = false } = {})
    {
        this.name = name;
        this.hasSize = hasSize;
        this.isMemory = isMemory;
        this.isVector = isVector;
    }

    toString()
    {
        return this.name;
    }
}

// Operand types
export const OPT = Object.freeze({
REG:    new OperandType("General-purpose register"),  // 8/64-bit - ax, bl, esi, r15, etc.
VEC:    new OperandType("Vector register", { isVector: true }),  // 64/512-bit - %mm0 / %mm7, %xmm0 / %xmm15, %ymm0 / %ymm15, %zmm0 / %zmm15
VMEM:   new OperandType("Vector memory", { isMemory: true, isVector: true }),  // e.g. (%xmm0)
IMM:    new OperandType("Immediate value"),  // e.g. $20
MASK:   new OperandType("Mask register"),  // 64-bit - %k0 / %k7
REL:    new OperandType("Relative address", { isMemory: true }),  // memory that consists of only an address (may be converted to MEM)
MEM:    new OperandType("Memory operand", { isMemory: true }),  // e.g. (%rax)
ST:     new OperandType("Floating-point stack register", { hasSize: false }),  // 80-bit - %st(0) / %st(7)
SEG:    new OperandType("Segment register", { hasSize: false }),  // 16-bit - %cs, %ds, %es, %fs, %gs, %ss
IP:     new OperandType("Instruction pointer register", { hasSize: false }), // only used in memory - %eip or %rip
BND:    new OperandType("Bound register", { hasSize: false }), // 128-bit - %bnd0 / %bnd3
CTRL:   new OperandType("Control register", { hasSize: false }), // 64-bit - %cr0, %cr2, %cr3, %cr4 and %cr8
DBG:    new OperandType("Debug register", { hasSize: false })  // 64-bit - %dr0 / %dr7
});

export const registers = Object.assign({}, ...[
"al","cl","dl","bl","ah","ch","dh","bh",
"ax","cx","dx","bx","sp","bp","si","di",
"eax","ecx","edx","ebx","esp","ebp","esi","edi",
"rax","rcx","rdx","rbx","rsp","rbp","rsi","rdi",
"es","cs","ss","ds","fs","gs",
"st","rip","eip","spl","bpl","sil","dil"
].map((x, i) => ({[x]: i})));

export const suffixes  = {
    b: 8,
    w: 16,
    l: 32,
    q: 64,
    t: 80,
    x: 128,
    y: 256,
    z: 512
};
// FPU instructions have different suffixes
export const floatSuffixes = {
    s: 32,
    l: 64,
    t: 80
}
export const floatIntSuffixes = {
    s: 16,
    l: 32,
    q: 64
}
export const sizeHints = Object.freeze({
    byte: 8,
    word: 16,
    long: 32,
    dword: 32,
    far: 48,
    fword: 48,
    qword: 64,
    tbyte: 80,
    oword: 128,
    xmmword: 128,
    ymmword: 256,
    zmmword: 512
});

/** @param {string} sizeHint */
export function isSizeHint(sizeHint)
{
    return sizeHints.hasOwnProperty(sizeHint);
}

export function nameRegister(name, size, syntax)
{
    return `${syntax.prefix ? '%' : ''}${size == 32 ? 'e' : 'r'}` + name;
}

export const PrefixEnum = createBitfieldClass([
    "REX", "NOREX", "LOCK", "REPNE", "REPE", "DATASIZE", "ADDRSIZE",
    "SEG0", "SEG1", "SEG2", "SEG3", "SEG4", "SEG5", "EVEX"
]);

export var regParsePos;

export var regSuffixes = {
    b: 8,
    w: 16,
    d: 32
}

/** Check if a given string corresponds to a register name (ignoring the '%' prefix).
 * @param {string} reg
 */
export function isRegister(reg, bitness = currBitness)
{
    reg = reg.toLowerCase();
    if(registers.hasOwnProperty(reg))
    {
        if(bitness == 64)
            return true;

        // Filter out registers not available in 32-bit mode
        let regIndex = registers[reg];
        return (
            regIndex < registers.rax ||
            (regIndex >= registers.es && regIndex <= registers.st)
        );
    }
    if(bitness == 64 && reg[0] === 'r')
    {
        reg = reg.slice(1);
        if(parseInt(reg) >= 0 && parseInt(reg) < 16 && (!isNaN(reg) || regSuffixes[reg[reg.length - 1]]))
            return true;
    }
    else
    {
        let max = 32;
        if(reg.startsWith("mm") || reg.startsWith("dr")) reg = reg.slice(2), max = 8;
        else if(reg.startsWith("cr")) reg = reg.slice(2), max = bitness == 64 ? 9 : 8;
        else if(reg.startsWith("xmm") || reg.startsWith("ymm") || reg.startsWith("zmm")) reg = reg.slice(3);
        else if(reg.startsWith("bnd")) reg = reg.slice(3), max = 4;
        else if(reg[0] == 'k') reg = reg.slice(1), max = 8;
        else return false;
        if(!isNaN(reg) && (reg = parseInt(reg), reg >= 0 && reg < max))
            return true;
    }
    return false;
}

/**
 * @typedef {Object} Register
 * @property {Number} reg
 * @property {OperandType} type
 * @property {Number} size
 * @property {PrefixEnum} prefs
 */

/** @returns {Register} */
export function parseRegister(expectedType = null)
{
    let regToken = (currSyntax.prefix ? next() : token).toLowerCase();
    let reg = registers[regToken];
    let size = 0, type = -1, prefs = new PrefixEnum();
    if(reg >= registers.al && reg <= (currBitness == 64 ? registers.rdi : registers.edi))
    {
        type = OPT.REG;
        size = 8 << (reg >> 3);
        if(size == 8 && reg >= registers.ah && reg <= registers.bh)
            prefs.NOREX = true;
        reg &= 7;
    }
    else if(reg >= registers.es && reg <= registers.gs)
    {
        type = OPT.SEG;
        size = 32; // Dunno what the actual size of the seg registers is, but this'll prevent the word prefix
        reg -= registers.es;
    }
    else if(reg == registers.st)
    {
        type = OPT.ST;
        reg = 0;
        if(next() == '(')
        {
            reg = parseInt(next());
            if(isNaN(reg) || reg >= 8 || reg < 0 || next() != ')')
                throw new ASMError("Unknown register");
        }
        else
            ungetToken();
    }
    // RIP-relative addressing is only available in 64-bit mode
    else if(currBitness == 64 && (reg == registers.rip || reg == registers.eip))
    {
        if(expectedType === null || !expectedType.includes(OPT.IP))
            throw new ASMError(`Can't use ${nameRegister('ip', reg == registers.eip ? 32 : 64, currSyntax)} here`);
        type = OPT.IP;
        size = reg == registers.eip ? 32 : 64;
        reg = 0;
    }
    else if(currBitness == 64 && reg >= registers.spl && reg <= registers.dil)
    {
        type = OPT.REG;
        size = 8;
        prefs.REX = true;
        reg -= registers.spl - 4;
    }
    else if(currBitness == 64 && regToken[0] == 'r') // Attempt to parse the register name as a numeric (e.g. r10)
    {
        reg = parseInt(regToken.slice(1));
        if(isNaN(reg) || reg < 0 || reg >= 16)
            throw new ASMError("Unknown register");
        type = OPT.REG;

        let regLastChar = regToken[regToken.length - 1];
        if(isNaN(regLastChar))
        {
            size = regSuffixes[regLastChar];
            if(!size)
                throw new ASMError("Unknown register");
        }
        else
            size = 64;
    }
    else
    {
        let max = 32;
        if(token.startsWith("bnd")) reg = regToken.slice(3), type = OPT.BND, max = 4;
        else if(regToken[0] == 'k') reg = regToken.slice(1), type = OPT.MASK, max = 8, size = NaN;
        else if(regToken.startsWith("dr")) reg = regToken.slice(2), type = OPT.DBG, max = 8;
        else if(regToken.startsWith("cr")) reg = regToken.slice(2), type = OPT.CTRL, max = currBitness == 64 ? 9 : 8;
        else
        {
            type = OPT.VEC;
            if(regToken.startsWith("mm")) reg = regToken.slice(2), size = 64, max = 8;
            else if(regToken.startsWith("xmm")) reg = regToken.slice(3), size = 128;
            else if(regToken.startsWith("ymm")) reg = regToken.slice(3), size = 256;
            else if(regToken.startsWith("zmm")) reg = regToken.slice(3), size = 512;
            else
                throw new ASMError("Unknown register");
        }

        if(isNaN(reg) || !(reg = parseInt(reg), reg >= 0 && reg < max))
            throw new ASMError("Unknown register");
    }
    
    if(expectedType != null && expectedType.indexOf(type) < 0)
        throw new ASMError("Invalid register");
    
    regParsePos = currRange;
    next();
    return { reg, type, size, prefs };
}


export class Operand
{
    /** @param {Statement} instr */
    constructor(instr, expectRelative = false)
    {
        this.reg = this.reg2 = -1;
        this.shift = 0;
        this.value = null;
        this.type = null;
        this.size = NaN;
        this.prefs = new PrefixEnum();
        this.attemptedSizes = 0;
        this.attemptedUnsignedSizes = 0;

        this.startPos = currRange;
        let indirect = token == '*';
        if(indirect && !instr.syntax.intel)
            next();
        
        let forceMemory = false;

        if(instr.syntax.prefix && isRegister(token))
            throw new ASMError("Registers must be prefixed with '%'");

        if(instr.syntax.prefix ? token == '%' : isRegister(token)) // Register
        {
            const regData = parseRegister();
            this.endPos = regParsePos;
            if(regData.type === OPT.SEG && token == ':')
            {
                this.prefs[`SEG${regData.reg}`] = true;
                forceMemory = true;
                next();
            }
            else
            {
                Object.assign(this, regData);
                return;
            }
        }
        if(instr.syntax.intel)
        {
            this.type = expectRelative ? OPT.REL : OPT.IMM;
            if(token != '[' && !forceMemory)
            {
                let mayBeMem = !expectRelative;
                if(token.toLowerCase() == 'offset')
                {
                    next();
                    this.type = OPT.IMM;
                    mayBeMem = false;
                }
                this.expression = new Expression(instr);
                if(this.expression.hasSymbols && mayBeMem)
                    this.type = OPT.MEM;
            }

            const hasBracket = token == '[';

            // Intel syntax
            if(hasBracket || forceMemory) // Memory
            {
                this.type = OPT.MEM;
                if(hasBracket)
                    next();
                
                let secExpr = new Expression(instr, true);
                if(this.expression) // Combining the first and second expressions
                    this.expression.apply('+', secExpr);
                else
                    this.expression = secExpr;
                
                this.ripRelative = this.expression.ripRelative;
                if(this.expression.vecSize)
                {
                    this.size = this.expression.vecSize;
                    this.type = OPT.VMEM;
                }
                
                if(hasBracket)
                {
                    if(token != ']')
                        throw new ASMError("Expected ']'");
                    next();
                }
            }
        }
        else
        {
            // AT&T syntax
            if(token[0] == '$') // Immediate
            {
                if(token.length > 1)
                {
                    setToken(token.slice(1));
                    currRange.start++;
                }
                else
                    next();
                this.expression = new Expression(instr);
                this.type = OPT.IMM;
            }
            else // Address
            {
                this.type = OPT.MEM;
                this.expression = new Expression(instr, true);
                if(this.expression.vecSize)
                {
                    this.size = this.expression.vecSize;
                    this.type = OPT.VMEM;
                }
                if(token != '(')
                {
                    if(!indirect && expectRelative)
                        this.type = OPT.REL;
                }
                else
                {
                    let tempReg;
                    if(instr.syntax.prefix ? next() == '%' : isRegister(next()))
                    {
                        tempReg = parseRegister([OPT.REG, OPT.IP]);
                        this.reg = tempReg.reg;
                    }
                    else if(token == ',')
                    {
                        this.reg = -1;
                        tempReg = { type: -1, size: 64 };
                    }
                    else
                        throw new ASMError("Expected register");
                    
                    if(tempReg.size == 32 && currBitness == 64)
                        this.prefs.ADDRSIZE = true;
                    else if(tempReg.size != currBitness)
                        throw new ASMError("Invalid register size", regParsePos);
                    if(tempReg.type === OPT.IP)
                        this.ripRelative = true;
                    else if(token == ',')
                    {
                        if(instr.syntax.prefix ? next() != '%' : !isRegister(next()))
                            throw new ASMError("Expected register");
                        tempReg = parseRegister([OPT.REG, OPT.VEC]);
                        this.reg2 = tempReg.reg;
                        if(tempReg.type === OPT.VEC)
                        {
                            this.type = OPT.VMEM; this.size = tempReg.size;
                            if(tempReg.size < 128)
                                throw new ASMError("Invalid register size", regParsePos);
                        }
                        else
                        {
                            if(this.reg2 == 4)
                                throw new ASMError(`Memory index cannot be ${currBitness == 64 ? 'R' : 'E'}SP`, regParsePos);
                            if(tempReg.size == 32 && currBitness == 64)
                                this.prefs.ADDRSIZE = true;
                            else if(tempReg.size != currBitness)
                                throw new ASMError("Invalid register size", regParsePos);
                        }

                        if(token == ',')
                        {
                            this.shift = "1248".indexOf(next());
                            if(this.shift < 0)
                                throw new ASMError("Scale must be 1, 2, 4, or 8");
                            next();
                        }
                    }
                    else if((this.reg & 7) == 4)
                        this.reg2 = 4;
                    
                    if(token != ')')
                        throw new ASMError("Expected ')'");
                    next();
                }
            }
        }
        if(this.expression)
        {
            if(this.type === OPT.REL)
                this.expression.apply('-', new CurrentIP(instr));
            if(!this.expression.hasSymbols)
                this.evaluate(instr);
        }
        this.endPos = prevRange;
    }

    sizeAllowed(size, unsigned = false)
    {
        return size >= (unsigned ? this.unsignedSize : this.size) || this.sizeAvailable(size, unsigned);
    }

    sizeAvailable(size, unsigned = false)
    {
        return !((unsigned ? this.attemptedUnsignedSizes : this.attemptedSizes) & 1 << (size >> 4));
    }

    recordSizeUse(size, unsigned = false)
    {
        if(unsigned)
            this.attemptedUnsignedSizes |= 1 << (size >> 4);
        else
            this.attemptedSizes |= 1 << (size >> 4);
    }
    
    clearAttemptedSizes()
    {
        this.attemptedSizes = this.attemptedUnsignedSizes = 0;
    }

    evaluate(instr, intelMemory = false)
    {
        this.value = this.expression.evaluate(instr);
        if(intelMemory)
        {
            this.prefs.ADDRSIZE = false;
            let { regBase = null, regIndex = null, shift = 1 } = this.value.regData ?? {};
            if(regBase)
                this.reg = regBase.reg;
            if(regIndex)
                this.reg2 = regIndex.reg;
            if(currBitness == 64 && (regBase && regBase.size == 32 || regIndex && regIndex.size == 32))
                this.prefs.ADDRSIZE = true;
            this.shift = [1, 2, 4, 8].indexOf(shift);
            if(this.shift < 0)
                throw new ASMError("Scale must be 1, 2, 4, or 8", this.value.range);

            if(this.ripRelative && regIndex)
                throw new ASMError(`Can't use another register with ${nameRegister('ip', regBase.size, instr.syntax)}`, this.value.range);
        }

        if((this.reg & 7) == 5)
            this.value.addend = this.value.addend || 0n;
        if(this.reg == 4 && this.reg2 < 0)
            this.reg2 = 4;
    }
}