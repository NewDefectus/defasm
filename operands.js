// Operand types
const OPT = {
REG:    1,  // General-purpose register (8/64-bit) - ax, bl, esi, r15, etc.
IMM:    2,  // Immediate value - e.g. $20
VEC:    3,  // Vector register (64/512-bit) - %mm0 / %mm7, %xmm0 / %xmm15, %ymm0 / %ymm15, %zmm0 / %zmm15
MEM:    4,  // Memory operand - e.g. (%rax)
ST:     5,  // Floating-point stack register (80-bit) - %st(0) / %st(7)
SEG:    6,  // Segment register (16-bit) - %cs, %ds, %es, %fs, %gs, %ss
IP:     7,  // Instruction pointer register (only used in memory) - %eip or %rip
BND:    8,  // Bound register (128-bit) - %bnd0 / %bnd3
MASK:   9,  // Mask register (64-bit) - %k0 / %k7
CTRL:   10, // Control register (64-bit) - %cr0, %cr2, %cr3, %cr4 and %cr8
DBG:    11, // Debug register (64-bit) - %dr0 / %dr7
XMEM:   12, // XMM vector memory - e.g. (%xmm0)
YMEM:   13  // YMM vector memory - e.g. (%ymm0)
};


var allowLabels = false; // Only allow labels on the "second pass"

const registers = Object.assign({}, ...[
"al","cl","dl","bl","ah","ch","dh","bh",
"ax","cx","dx","bx","sp","bp","si","di",
"eax","ecx","edx","ebx","esp","ebp","esi","edi",
"rax","rcx","rdx","rbx","rsp","rbp","rsi","rdi",
"es","cs","ss","ds","fs","gs",
"st","rip","eip","spl","bpl","sil","dil"
].map((x, i) => ({[x]: i})));

const suffixes = {"b": 8, "w": 16, "l": 32, "d": 32, "q": 64};

const   PREFIX_REX = 1,
        PREFIX_NOREX = 2,
        PREFIX_CLASHREX = 3,
        PREFIX_ADDRSIZE = 4,
        PREFIX_SEG = 8;

function parseRegister(expectedType = null)
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
        let max = 16;
        if(token.startsWith("bnd")) reg = token.slice(3), type = OPT.BND, max = 4;
        else if(token[0] == 'k') reg = token.slice(1), type = OPT.MASK, max = 8;
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

function parseImmediate()
{
    let value = 0n;
    next();
    
    try
    {
        if(token == '\n')
            throw "";
        if(token[0] === "'" && token[token.length - 1] === "'")
        {
            token = eval(token); // Decode escape sequences
            // Parse as character constant
            for(let i = 0; i < token.length; i++)
            {
                value <<= 8n;
                value += BigInt(token.charCodeAt(i));
            }
        }
        else if(isNaN(token)) // Maybe it's a label?
        {
            labelDependency = token;
            value = 1n; // Default to 1 on first pass
        }
        else value = BigInt(token);
    
        next();
        return value;
    }
    catch(e)
    {
        throw "Couldn't parse immediate: " + e;
    }
}


function Operand()
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
        if(typeof this.value !== "string")
        {
            this.size = inferImmSize(this.value);
            this.unsignedSize = inferUnsignedImmSize(this.value);
        }
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
        if(next() !== '%') // For addresses that look like (<number>)
        {
            ungetToken(token);
            this.value = parseImmediate();
        }
        else
        {
            [this.reg, tempType, tempSize] = parseRegister([OPT.REG, OPT.IP, OPT.VEC]);
            if(tempType === OPT.VEC)
            {
                if(tempSize === 128) this.type = OPT.XMEM;
                else if(tempSize === 256) this.type = OPT.YMEM;
                else throw "Invalid register size";
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
                        if(tempSize === 128) this.type = OPT.XMEM;
                        else if(tempSize === 256) this.type = OPT.YMEM;
                        else throw "Invalid register size";
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
            if((this.reg & 7) === 5) this.value ||= 0n; 
        }
        if(token != ')') throw "Expected ')'";
        next();
    }
    if(typeof this.value === "string") this.labelDependency = this.value;
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