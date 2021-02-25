const OPT = Object.assign({}, ...[
"REG8",
"REG16",
"REG32",
"REG64",
"MMX",
"SSE",
"CR",
"TR",
"DB",
"SEG",
"ST",
"REG8_LOW",
"IM8",
"IM8S",
"IM16",
"IM32",
"IM64",
"EAX",
"ST0",
"CL",
"DX",
"ADDR",
"INDIR",
"COMPOSITE_FIRST",
"IM",
"REG",
"REGW",
"IMW",
"MMXSSE",
"DISP",
"DISP8",
"EA" // = 0x80?
].map((x, i) => ({[x]: 1 << i})));

OPT.REG = OPT.REG8 | OPT.REG16 | OPT.REG32 | OPT.REG64;



const registers = Object.assign({}, ...[
"al","cl","dl","bl","ah","ch","dh","bh",
"ax","cx","dx","bx","sp","bp","si","di",
"eax","ecx","edx","ebx","esp","ebp","esi","edi",
"rax","rcx","rdx","rbx","rsp","rbp","rsi","rdi",
"mm0","mm1","mm2","mm3","mm4","mm5","mm6","mm7",
"xmm0","xmm1","xmm2","xmm3","xmm4","xmm5","xmm6","xmm7",
"cr0","cr1","cr2","cr3","cr4","cr5","cr6","cr7",
"tr0","tr1","tr2","tr3","tr4","tr5","tr6","tr7",
"db0","db1","db2","db3","db4","db5","db6","db7",
"dr0","dr1","dr2","dr3","dr4","dr5","dr6","dr7",
"es","cs","ss","ds","fs","gs","st","rip",
"spl","bpl","sil","dil"
].map((x, i) => ({[x]: i})));

const suffixes = {"b": OPT.REG8, "w": OPT.REG16, "l": OPT.REG32, "d": OPT.REG32, "q": OPT.REG64};

function getImmType(value)
{
    let type = OPT.IM32;
    if(value < 0n)
    {
        if(value >= -0x80n)
            type |= OPT.IM8S;
        else if(value < -0x80000000)
            type = OPT.IM64;
    }
    else
    {
        type |= (value < 0x80n) && OPT.IM8S;
        type |= (value < 0x100n) && OPT.IM8;
        type |= (value < 0x10000n) && OPT.IM16;
        if(value >= 0x100000000n) type = OPT.IM64;
    }

    return type;
}

function maxOfType(type)
{
    return type & (OPT.IM8 | OPT.IM8S) ? 8n :
        type & OPT.IM16 ? 16n :
        type & OPT.IM32 ? 32n : 64n;
}


function parseRegister()
{
    let reg = registers[next()];
    let type = 0;
    if(reg >= registers.al && reg <= registers.db7)
    {
        type |= 1 << (reg >> 3);
        reg &= 7;
        if((type & OPT.REG) && reg == 0)
            type |= OPT.EAX;
        else if(type == OPT.REG8 && reg == 1)
            type |= OPT.CL;
        else if(type == OPT.REG16 && reg == 2)
            type |= OPT.DX;
    }
    else if(reg >= registers.dr0 && reg <= registers.dr7)
    {
        type = OPT.DB;
        reg -= registers.dr0;
    }
    else if(reg >= registers.es && reg <= registers.gs)
    {
        type = OPT.SEG;
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
        if(reg == 0)
            type |= OPT.ST0;
    }
    else if(reg >= registers.spl && reg <= registers.dil)
    {
        type = OPT.REG8 | OPT.REG8_LOW;
        reg -= registers.spl - 4;
    }
    else if(token[0] == 'r')// Attempt to parse the register name as a numeric (e.g. r10)
    {
        reg = parseInt(token.slice(1));
        if(isNaN(reg) || reg <= 0 || reg >= 16)
            throw "Unknown register";

        type = suffixes[token[token.length - 1]] || OPT.REG64;
    }
    else
        throw "Unknown register";
    
    next();
    return [reg, type];
}


function parseImmediate(type = null)
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
    
        type ||= getImmType(value);
        value &= (1n << maxOfType(type)) - 1n; // Reduce value to fit in type
        next();

        return [value, type];
    }
    catch(e)
    {
        throw "Couldn't parse immediate: " + e;
    }
}


function parseOperand()
{
    let reg = 0, type = 0, value = 0, indir = 0, reg2 = 0, shift = 0;

    if(token == '*')
    {
        indir = OPT.INDIR;
        next();
    }

    if(token == '%') // Register
    {
        [reg, type] = parseRegister();
    }
    else if(token == '$') // Immediate
    {
        [value, type] = parseImmediate();
    }
    else // Address
    {
        let tempType = 0;
        reg2 = reg = -1;
        type = OPT.EA;
        if(token != '(')
        {
            ungetToken(token);
            [value, tempType] = parseImmediate();
            type |= tempType;
        }

        if(token != '(')
        {
            throw "Invalid operand";
        }
        else
        {
            [reg, tempType] = parseRegister();
            type |= tempType;

            if(token != ')')
            {
                [reg2, tempType] = parseRegister();
                type |= tempType;

                if(token != ')')
                {
                    [shift, tempType] = parseImmediate();
                    type |= tempType;
                }
            }
            if(type & OPT.REG32) type |= OPT.EA32;
            if(token != ')') next();
        }

        if(reg == -1 && reg2 == -1) type |= OPT.ADDR;
    }

    type |= indir;

    return { type: type, reg: reg, reg2: reg2, shift: shift, value: value };
}