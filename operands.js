// Operand types
const OPT = Object.assign({}, ...[
"REG",
"MMX",
"SSE",
"ST",
"SEG",
"IP",
"IMM",
"MEM",
].map((x, i) => ({[x]: i})));



const registers = Object.assign({}, ...[
"al","cl","dl","bl","ah","ch","dh","bh",
"ax","cx","dx","bx","sp","bp","si","di",
"eax","ecx","edx","ebx","esp","ebp","esi","edi",
"rax","rcx","rdx","rbx","rsp","rbp","rsi","rdi",
"mm0","mm1","mm2","mm3","mm4","mm5","mm6","mm7",
"xmm0","xmm1","xmm2","xmm3","xmm4","xmm5","xmm6","xmm7",
"es","cs","ss","ds","fs","gs","st","rip",
"spl","bpl","sil","dil"
].map((x, i) => ({[x]: i})));

const suffixes = {"b": 8, "w": 16, "l": 32, "d": 32, "q": 64};

function parseRegister(expectedType = null)
{
    let reg = registers[next()];
    let size = 0, type = -1, prefixRequests = new Set();
    if(reg >= registers.al && reg <= registers.rdi)
    {
        type = OPT.REG;
        size = 8 << (reg >> 3);
        reg &= 7;
        if(size == 8 && reg >= registers.ah && reg <= registers.bh) prefixRequests.add("NO REX");
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
        size = 16;
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
                throw "Unknown register";
        }
    }
    else if(reg == registers.rip && expectedType == OPT.IP)
    {
        type = OPT.IP;
        reg = 0;
    }
    else if(reg >= registers.spl && reg <= registers.dil)
    {
        type = OPT.REG;
        size = 8;
        prefixRequests.add("REX");
        reg -= registers.spl - 4;
    }
    else if(token[0] == 'r')// Attempt to parse the register name as a numeric (e.g. r10)
    {
        reg = parseInt(token.slice(1));
        if(isNaN(reg) || reg <= 0 || reg >= 16)
            throw "Unknown register";

        size = suffixes[token[token.length - 1]] || 64;
    }
    else
        throw "Unknown register";
    
    if(expectedType != null && expectedType.indexOf(type) < 0) throw "Invalid register";
    
    next();
    return [reg, type, size, prefixRequests];
}

function parseImmediate()
{
    let value = 0n;
    next();
    
    try
    {
        if(token == '\n')
            throw "";
        if((token.startsWith("'") || token.startsWith('"')) && token.endsWith(token[0]))
        {
            // Parse as character constant
            for(let i = 1; i < token.length - 1; i++)
            {
                value <<= 8n;
                value += BigInt(token.charCodeAt(i));
            }
        }
        else
            value = BigInt(token);
    
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
    this.shift = -1;
    this.indir = false;
    this.type = null;
    this.prefixRequests = new Set();

    if(token == '*')
    {
        this.indir = true;
        next();
    }

    if(token == '%') // Register
    {
        [this.reg, this.type, this.size, this.prefixRequests] = parseRegister();
    }
    else if(token == '$') // Immediate
    {
        this.value = parseImmediate();
        this.type = OPT.IMM;
    }
    else // Address
    {
        this.type = OPT.MEM;
        if(token != '(')
        {
            ungetToken(token);
            this.value = parseImmediate();
        }

        if(token != '(')
        {
            throw "Invalid operand";
        }
        else
        {
            let tempSize;
            [this.reg, _, tempSize] = parseRegister([OPT.REG, OPT.IP]);
            if(tempSize == 32) this.prefixRequests.add(0x67);
            else if(tempSize != 64) throw "Invalid register size";

            if(token != ')')
            {
                [this.reg2, _, tempSize] = parseRegister([OPT.REG]);
                if(tempSize == 32) this.prefixRequests.add(0x67);
                else if(tempSize != 64) throw "Invalid register size";

                if(token != ')')
                {
                    this.shift = parseImmediate();
                    if([1, 2, 4, 8].indexOf(this.shift) < 0) throw "Scale must be 1, 2, 4, or 8";
                }
            }
            if(token != ')') next();
        }
    }
}