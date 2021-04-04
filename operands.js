import { token, next, ungetToken, peekNext } from "./parser.js";

export var labelDependency = null;
export function clearLabelDependency() { labelDependency = null };

export var unescapeString = string => string.slice(1, -1).replace("\\n", "\n").replace("\\0", "\0");

// Operand types
export const OPT = {
REG:    1,  // General-purpose register (8/64-bit) - ax, bl, esi, r15, etc.
VEC:    2,  // Vector register (64/512-bit) - %mm0 / %mm7, %xmm0 / %xmm15, %ymm0 / %ymm15, %zmm0 / %zmm15
VMEM:   3,  // Vector memory - e.g. (%xmm0)
IMM:    4,  // Immediate value - e.g. $20
MASK:   5,  // Mask register (64-bit) - %k0 / %k7
MEM:    6,  // Memory operand - e.g. (%rax)
ST:     7,  // Floating-point stack register (80-bit) - %st(0) / %st(7)
SEG:    8,  // Segment register (16-bit) - %cs, %ds, %es, %fs, %gs, %ss
IP:     9,  // Instruction pointer register (only used in memory) - %eip or %rip
BND:    10, // Bound register (128-bit) - %bnd0 / %bnd3
CTRL:   11, // Control register (64-bit) - %cr0, %cr2, %cr3, %cr4 and %cr8
DBG:    12  // Debug register (64-bit) - %dr0 / %dr7
};

export const registers = Object.assign({}, ...[
"al","cl","dl","bl","ah","ch","dh","bh",
"ax","cx","dx","bx","sp","bp","si","di",
"eax","ecx","edx","ebx","esp","ebp","esi","edi",
"rax","rcx","rdx","rbx","rsp","rbp","rsi","rdi",
"es","cs","ss","ds","fs","gs",
"st","rip","eip","spl","bpl","sil","dil"
].map((x, i) => ({[x]: i})));

export const suffixes = {"b": 8, "w": 16, "l": 32, "d": 32, "q": 64, "t": 80};

export const    PREFIX_REX = 1,
                PREFIX_NOREX = 2,
                PREFIX_CLASHREX = 3,
                PREFIX_ADDRSIZE = 4,
                PREFIX_SEG = 8;

export function floatToInt(value, precision)
{
    if(precision === 0) return value;
    let floatVal = precision === 1 ? new Float32Array(1) : new Float64Array(1);
    floatVal[0] = Number(value);
    return new Uint8Array(floatVal.buffer).reduceRight((prev, val) => (prev << 8n) + BigInt(val), 0n);
}

export function parseRegister(expectedType = null)
{
    let reg = registers[next()];
    let size = 0, type = -1, prefs = 0;
    if(reg >= registers.al && reg <= registers.rdi)
    {
        type = OPT.REG;
        size = 8 << (reg >> 3);
        if(size == 8 && reg >= registers.ah && reg <= registers.bh)
            prefs |= PREFIX_NOREX;
        reg &= 7;
    }
    else if(reg >= registers.mm0 && reg <= registers.mm7)
    {
        type = OPT.MMX;
        size = 64;
        reg -= registers.mm0;
    }
    else if(reg >= registers.xmm0 && reg <= registers.xmm7)
    {
        type = OPT.SSE;
        size = 128;
        reg -= registers.xmm0;
    }
    else if(reg >= registers.es && reg <= registers.gs)
    {
        type = OPT.SEG;
        size = 32; // Dunno what the actual size of the seg registers is, but this'll prevent the word prefix
        reg -= registers.es;
    }
    else if(reg === registers.st)
    {
        type = OPT.ST;
        reg = 0;
        if(next() == '(')
        {
            reg = parseInt(next());
            if(isNaN(reg) || reg >= 8 || reg < 0 || next() != ')')
                throw "Unknown register";
        }
        else ungetToken(token);
    }
    else if(reg === registers.rip || reg === registers.eip)
    {
        if(expectedType == null || !expectedType.includes(OPT.IP)) throw "Can't use RIP here";
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
    else if(token[0] === 'r') // Attempt to parse the register name as a numeric (e.g. r10)
    {
        reg = parseInt(token.slice(1));
        if(isNaN(reg) || reg <= 0 || reg >= 16)
            throw "Unknown register";
        type = OPT.REG;

        size = suffixes[token[token.length - 1]] || 64;
    }
    else
    {
        let max = 32;
        if(token.startsWith("bnd")) reg = token.slice(3), type = OPT.BND, max = 4;
        else if(token[0] == 'k') reg = token.slice(1), type = OPT.MASK, max = 8, size = NaN;
        else if(token.startsWith("dr")) reg = token.slice(2), type = OPT.DBG, max = 8;
        else if(token.startsWith("cr")) reg = token.slice(2), type = OPT.CTRL, max = 9;
        else
        {
            type = OPT.VEC;
            if(token.startsWith("mm")) reg = token.slice(2), size = 64, max = 8;
            else if(token.startsWith("xmm")) reg = token.slice(3), size = 128;
            else if(token.startsWith("ymm")) reg = token.slice(3), size = 256;
            else if(token.startsWith("zmm")) reg = token.slice(3), size = 512;
            else throw "Unknown register";
        }

        if(isNaN(reg) || !(reg = parseInt(reg), reg >= 0 && reg < max)) throw "Unknown register";
    }
    
    if(expectedType !== null && expectedType.indexOf(type) < 0) throw "Invalid register";
    
    next();
    return [reg, type, size, prefs];
}

export function parseImmediate(floatPrec = 0)
{
    let value = 0n;
    next();
    
    try
    {
        if(token === '\n')
            throw "Expected value, got none";
        if(token[0] === "'" && token[token.length - 1] === "'")
        {
            let string = unescapeString(token); // Decode escape sequences
            // Parse as character constant
            for(let i = 0; i < string.length; i++)
            {
                value <<= 8n;
                value += BigInt(string.charCodeAt(i));
            }
        }
        else if(isNaN(token))
        {
            if(token.endsWith('d')) floatPrec = 2, value = parseFloat(token);
            else if(token.endsWith('f')) floatPrec = 1, value = parseFloat(token);
            else // Label
            {
                labelDependency = token;
                next();
                return 1n; // Default to 1 on first pass
            }
        }
        else if(token.includes('.') || floatPrec) floatPrec = floatPrec || 1, value = parseFloat(token);
        else value = BigInt(token);

        if(next() === 'f') floatPrec = 1;
        else if(token === 'd') floatPrec = 2;

        return floatToInt(value, floatPrec);
    }
    catch(e)
    {
        throw "Couldn't parse immediate: " + e;
    }
}


export function Operand()
{
    this.reg = this.reg2 = -1;
    this.shift = 0;
    this.value = null;
    this.type = null;
    this.size = NaN;
    this.prefs = 0;

    if(token === '%') // Register
    {
        [this.reg, this.type, this.size, this.prefs] = parseRegister();
    }
    else if(token === '$' || (isNaN(token) && token !== '(' && peekNext() !== '('))// Immediate
    {
        if(token !== '$') ungetToken(token);
        this.value = parseImmediate();
        this.type = OPT.IMM;
    }
    else // Address
    {
        this.type = OPT.MEM;
        if(token !== '(')
        {
            ungetToken(token);
            this.value = parseImmediate();
        }

        if(token !== '(') throw "Invalid operand";


        let tempSize, tempType;
        if(next() !== '%')
        {
            if(token !== ',') // For addresses that look like (<number>)
            {
                ungetToken(token);
                this.value = parseImmediate();
                if(token != ')') throw "Expected ')'";
                next();
                return;
            }
            else
            {
                this.reg = -1;
                tempType = -1;
                tempSize = 64;
            }
        }
        else [this.reg, tempType, tempSize] = parseRegister([OPT.REG, OPT.IP, OPT.VEC]);
        if(tempType === OPT.VEC)
        {
            this.type = OPT.VMEM; this.size = tempSize;
            if(tempSize < 128) throw "Invalid register size";
            this.reg2 = this.reg;
            this.reg = -1;
        }
        else
        {
            if(tempSize === 32) this.prefs |= PREFIX_ADDRSIZE;
            else if(tempSize !== 64) throw "Invalid register size";
            if(tempType === OPT.IP) this.ripRelative = true;
            else if(token === ',')
            {
                if(next() !== '%') throw "Expected register";
                [this.reg2, tempType, tempSize] = parseRegister([OPT.REG, OPT.VEC]);
                if(tempType === OPT.VEC)
                {
                    this.type = OPT.VMEM; this.size = tempSize;
                    if(tempSize < 128) throw "Invalid register size";
                }
                else
                {
                    if(this.reg2 === 4) throw "Memory index cannot be RSP";
                    if(tempSize === 32) this.prefs |= PREFIX_ADDRSIZE;
                    else if(tempSize !== 64) throw "Invalid register size";
                }

                if(token === ',')
                {
                    this.shift = [1, 2, 4, 8].indexOf(Number(parseImmediate()));
                    if(this.shift < 0) throw "Scale must be 1, 2, 4, or 8";
                }
            }
            else if(this.reg === 4) this.reg2 = 4;
        }
        if((this.reg & 7) === 5) this.value = this.value || 0n; 
        if(token != ')') throw "Expected ')'";
        next();
    }
}