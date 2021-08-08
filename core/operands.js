import { token, next, ungetToken, currRange, currSyntax } from "./parser.js";
import { Expression } from "./shuntingYard.js";
import { ASMError } from "./statement.js";

// Operand types
export const OPT = {
REG:    1,  // General-purpose register (8/64-bit) - ax, bl, esi, r15, etc.
VEC:    2,  // Vector register (64/512-bit) - %mm0 / %mm7, %xmm0 / %xmm15, %ymm0 / %ymm15, %zmm0 / %zmm15
VMEM:   3,  // Vector memory - e.g. (%xmm0)
IMM:    4,  // Immediate value - e.g. $20
MASK:   5,  // Mask register (64-bit) - %k0 / %k7
REL:    6,  // Relative address - memory that consists of only an address (may be converted to MEM)
MEM:    7,  // Memory operand - e.g. (%rax)
ST:     8,  // Floating-point stack register (80-bit) - %st(0) / %st(7)
SEG:    9,  // Segment register (16-bit) - %cs, %ds, %es, %fs, %gs, %ss
IP:     10, // Instruction pointer register (only used in memory) - %eip or %rip
BND:    11, // Bound register (128-bit) - %bnd0 / %bnd3
CTRL:   12, // Control register (64-bit) - %cr0, %cr2, %cr3, %cr4 and %cr8
DBG:    13  // Debug register (64-bit) - %dr0 / %dr7
};

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
export const sizeHints = {
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
};

export const    PREFIX_REX = 1,
                PREFIX_NOREX = 2,
                PREFIX_CLASHREX = 3,
                PREFIX_ADDRSIZE = 4,
                PREFIX_SEG = 8;

export var regParsePos;

export var regSuffixes = {
    b: 8,
    w: 16,
    d: 32
}

export function isRegister(reg)
{
    reg = reg.toLowerCase();
    if(registers.hasOwnProperty(reg))
        return true;
    if(reg[0] === 'r')
    {
        reg = reg.slice(1);
        if(parseInt(reg) >= 0 && parseInt(reg) < 16 && (!isNaN(reg) || regSuffixes[reg[reg.length - 1]]))
            return true;
    }
    else
    {
        let max = 32;
        if(reg.startsWith("mm") || reg.startsWith("dr")) reg = reg.slice(2), max = 8;
        else if(reg.startsWith("cr")) reg = reg.slice(2), max = 9;
        else if(reg.startsWith("xmm") || reg.startsWith("ymm") || reg.startsWith("zmm")) reg = reg.slice(3);
        else if(reg.startsWith("bnd")) reg = reg.slice(3), max = 4;
        else if(reg[0] == 'k') reg = reg.slice(1), max = 8;
        else return false;
        if(!isNaN(reg) && (reg = parseInt(reg), reg >= 0 && reg < max))
            return true;
    }
    return false;
}

export function parseRegister(expectedType = null)
{
    let regToken = (currSyntax.prefix ? next() : token).toLowerCase();
    let reg = registers[regToken];
    let size = 0, type = -1, prefs = 0;
    if(reg >= registers.al && reg <= registers.rdi)
    {
        type = OPT.REG;
        size = 8 << (reg >> 3);
        if(size == 8 && reg >= registers.ah && reg <= registers.bh)
            prefs |= PREFIX_NOREX;
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
        else ungetToken();
    }
    else if(reg == registers.rip || reg == registers.eip)
    {
        if(expectedType == null || !expectedType.includes(OPT.IP))
            throw new ASMError(`Can't use ${currSyntax.prefix ? '%' : ''}${reg == registers.eip ? 'e' : 'r'}ip here`);
        type = OPT.IP;
        size = reg == registers.eip ? 32 : 64;
        reg = 0;
    }
    else if(reg >= registers.spl && reg <= registers.dil)
    {
        type = OPT.REG;
        size = 8;
        prefs |= PREFIX_REX;
        reg -= registers.spl - 4;
    }
    else if(regToken[0] == 'r') // Attempt to parse the register name as a numeric (e.g. r10)
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
        else if(regToken.startsWith("cr")) reg = regToken.slice(2), type = OPT.CTRL, max = 9;
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


/** @param {Statement} instr */
export function Operand(instr, forceImmToRel = false)
{
    this.reg = this.reg2 = -1;
    this.shift = 0;
    this.value = null;
    this.type = null;
    this.size = NaN;
    this.prefs = 0;
    this.attemptedSizes = 0;
    this.attemptedUnsignedSizes = 0;

    this.startPos = currRange;
    let indirect = token == '*';
    if(indirect && !instr.syntax.intel)
        next();

    if(instr.syntax.prefix && isRegister(token))
        throw new ASMError("Registers must be prefixed with '%'");

    if(instr.syntax.prefix ? token == '%' : isRegister(token)) // Register
    {
        Object.assign(this, parseRegister());
        this.endPos = regParsePos;
    }
    else
    {
        if(instr.syntax.intel)
        {
            this.type = forceImmToRel ? OPT.REL : OPT.IMM;
            if(token != '[')
            {
                let mayBeRel = true;
                if(token.toLowerCase() == 'offset')
                {
                    next();
                    this.type = OPT.IMM;
                    mayBeRel = false;
                }
                this.expression = new Expression(instr);
                this.value = this.expression.evaluate(instr.address);

                if(mayBeRel && this.expression.hasSymbols)
                    this.type = OPT.REL;
            }

            // Intel syntax
            if(token == '[') // Memory
            {
                this.type = OPT.MEM;
                next();
                
                let secExpr = new Expression(instr, 0, true);
                if(this.expression) // Combining the first and second expressions
                    this.expression.add(secExpr);
                else
                    this.expression = secExpr;
                    
                this.value = this.expression.evaluate(instr.address);
                if(secExpr.regBase)
                    this.reg = secExpr.regBase.reg;
                if(secExpr.regIndex)
                    this.reg2 = secExpr.regIndex.reg;
                    
                this.prefs = secExpr.prefs;
                this.shift = secExpr.shift;

                if(secExpr.regBase && secExpr.regBase.type == OPT.IP)
                    this.ripRelative = true;
                
                if(secExpr.regIndex && secExpr.regIndex.type == OPT.VEC)
                {
                    this.type = OPT.VMEM;
                    this.size = secExpr.regIndex.size;
                }

                if((this.reg & 7) == 5)
                    this.value = this.value || 0n; 
                if(this.reg == 4 && this.reg2 < 0)
                    this.reg2 = 4;
                if(token != ']')
                    throw new ASMError("Expected ']'");
                next();
            }
        }
        else
        {
            // AT&T syntax
            if(token == '$') // Immediate
            {
                next();
                this.expression = new Expression(instr);
                this.value = this.expression.evaluate(instr.address);
                this.type = OPT.IMM;
            }
            else // Address
            {
                this.type = OPT.MEM;
                this.expression = new Expression(instr, 0, true);
                this.value = this.expression.evaluate(instr.address);
                if(token != '(')
                {
                    if(!indirect)
                    {
                        this.type = OPT.REL;
                        this.endPos = currRange;
                    }
                    return;
                }

                let tempReg;
                if(instr.syntax.prefix ? next() == '%' : isRegister(next()))
                {
                    tempReg = parseRegister([OPT.REG, OPT.IP, OPT.VEC]);
                    this.reg = tempReg.reg;
                }
                else if(token == ',')
                {
                    this.reg = -1;
                    tempReg = { type: -1, size: 64 };
                }
                else
                    throw new ASMError("Expected register");
                
                if(tempReg.type == OPT.VEC)
                {
                    this.type = OPT.VMEM; this.size = tempReg.size;
                    if(tempReg.size < 128)
                        throw new ASMError("Invalid register size", regParsePos);
                    this.reg2 = this.reg;
                    this.reg = -1;
                }
                else
                {
                    if(tempReg.size == 32)
                        this.prefs |= PREFIX_ADDRSIZE;
                    else if(tempReg.size != 64)
                        throw new ASMError("Invalid register size", regParsePos);
                    if(tempReg.type == OPT.IP)
                        this.ripRelative = true;
                    else if(token == ',')
                    {
                        if(instr.syntax.prefix ? next() != '%' : !isRegister(next()))
                            throw new ASMError("Expected register");
                        tempReg = parseRegister([OPT.REG, OPT.VEC]);
                        this.reg2 = tempReg.reg;
                        if(tempReg.type == OPT.VEC)
                        {
                            this.type = OPT.VMEM; this.size = tempReg.size;
                            if(tempReg.size < 128)
                                throw new ASMError("Invalid register size", regParsePos);
                        }
                        else
                        {
                            if(this.reg2 == 4)
                                throw new ASMError("Memory index cannot be RSP", regParsePos);
                            if(tempReg.size == 32)
                                this.prefs |= PREFIX_ADDRSIZE;
                            else if(tempReg.size != 64)
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
                    else if(this.reg == 4)
                        this.reg2 = 4;
                }
                if((this.reg & 7) == 5)
                    this.value = this.value || 0n; 
                if(token != ')')
                    throw new ASMError("Expected ')'");
                next();
            }
        }
    }
}

Operand.prototype.sizeAllowed = function(size, unsigned = false)
{
    return size >= (unsigned ? this.unsignedSize : this.size) || this.sizeAvailable(size, unsigned);
}
Operand.prototype.sizeAvailable = function(size, unsigned = false)
{
    return !((unsigned ? this.attemptedUnsignedSizes : this.attemptedSizes) & 1 << (size >> 4));
}
Operand.prototype.recordSizeUse = function(size, unsigned = false)
{
    if(unsigned)
        this.attemptedUnsignedSizes |= 1 << (size >> 4);
    else
        this.attemptedSizes |= 1 << (size >> 4);
}