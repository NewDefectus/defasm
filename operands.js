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
OPT.RM = [OPT.REG, OPT.MEM].toString(); // JavaScript is dumb at comparisons so we need to do this

var allowLabels = false; // Only allow labels on the "second pass"

const registers = Object.assign({}, ...[
"al","cl","dl","bl","ah","ch","dh","bh",
"ax","cx","dx","bx","sp","bp","si","di",
"eax","ecx","edx","ebx","esp","ebp","esi","edi",
"rax","rcx","rdx","rbx","rsp","rbp","rsi","rdi",
"mm0","mm1","mm2","mm3","mm4","mm5","mm6","mm7",
"xmm0","xmm1","xmm2","xmm3","xmm4","xmm5","xmm6","xmm7",
"es","cs","ss","ds","fs","gs",
"st","rip","eip","spl","bpl","sil","dil"
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
                throw "Unknown register";
        }
    }
    else if(reg == registers.rip || reg == registers.eip)
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
        prefixRequests.add("REX");
        reg -= registers.spl - 4;
    }
    else if(token[0] == 'r') // Attempt to parse the register name as a numeric (e.g. r10)
    {
        reg = parseInt(token.slice(1));
        if(isNaN(reg) || reg <= 0 || reg >= 16)
            throw "Unknown register";
        type = OPT.REG;

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
        else if(isNaN(token)) // Maybe it's a label?
        {
            // Label references get initialized to 1 on the first pass
            if(!allowLabels) labelException = true, value = 1n;
            else value = BigInt(labels.get(token) - currIndex);
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
    this.indir = false;
    this.type = null;
    this.size = -1;
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
    else if(token == '$' || (isNaN(token) && token != '(' && peekNext() != '('))// Immediate
    {
        if(token != '$') ungetToken(token);
        this.value = parseImmediate();
        this.type = OPT.IMM;
        this.size = inferImmSize(this.value);
    }
    else // Address
    {
        this.type = OPT.MEM;
        if(token != '(')
        {
            ungetToken(token);
            this.value = parseImmediate();
        }

        if(token != '(') throw "Invalid operand";


        let tempSize, tempType;
        if(next() != '%') // For addresses that look like (<number>)
        {
            ungetToken(token);
            this.value = parseImmediate();
        }
        else
        {
            [this.reg, tempType, tempSize] = parseRegister([OPT.REG, OPT.IP]);
            if(tempSize == 32) this.prefixRequests.add(0x67);
            else if(tempSize != 64) throw "Invalid register size";
            if(tempType == OPT.IP)
            {
                this.ripRelative = true;
            }
            else if(token == ',')
            {
                if(next() != '%') throw "Expected register";
                [this.reg2, _, tempSize] = parseRegister([OPT.REG]);
                if(tempSize == 32) this.prefixRequests.add(0x67);
                else if(tempSize != 64) throw "Invalid register size";

                if(token == ',')
                {
                    this.shift = [1, 2, 4, 8].indexOf(Number(parseImmediate()));
                    if(this.shift < 0) throw "Scale must be 1, 2, 4, or 8";
                }
            }
        }
        if(token != ')') throw "Expected ')'";
        next();
    }
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