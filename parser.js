var srcTokens, token, match;
var labels = {};
var macros = {};


var next = () => token = (match = srcTokens.next()).done ? '\n' : macros[match.value[0]] || match.value[0];


function Register(text)
{
    this.high = false;
}

function Immediate(text, size = null)
{
    try
    {
        if((text.startsWith("'") || text.startsWith('"')) && text.endsWith(text[0]))
        {
            // Parse as character constant
            this.value = 0n;
            for(let i = 1; i < text.length - 1; i++)
            {
                this.value <<= 8n;
                this.value += BigInt(text.charCodeAt(i));
            }
        }
        else
        {
            this.value = BigInt(text);
        }
    

        if(size != null)
        {
            this.size = size;
        }
        else
        {
            // Figure out the size through the value
            this.size = 8;
            this.size *= (this.value >= 0x100n) + 1;
            this.size *= (this.value >= 0x10000n) + 1;
            this.size *= (this.value >= 0x100000000n) + 1;
        }

        this.value &= (1n << BigInt(this.size)) - 1n;

    }
    catch(e)
    {
        throw "Couldn't parse immediate";
    }
}

function Address()
{
    this.segment = null; // Segment register
    this.disp = 0; // Immediate
    this.base = null; // Register
    this.index = null; // Register
    this.factor = null; // Immediate
}



var srcTokens, rawToken, token;
var labels = {};

// Compile Assembly from source code into machine code
function compileAsm(source)
{
    resetMachineCode();
    srcTokens = source.matchAll(/(["'])[^]*?\1|[\w.]+|[\S\n]/g);

    let opcode;
    while(next(), !match.done)
    {
        try
        {
            if(token == '#') // "horrible gas comment" - tcc
            {
                while(next() != '\n');
            }
            else if(token[0] == '.') // Assembly directive
            {
                parseDirective();
            }
            else // Instruction, label or macro
            {
                opcode = token;
                switch(next())
                {
                    case ':': // Label definition
                        // new label with opcode
                        break;
                    
                    case '=': // Macro definition
                        macros[opcode] = "";
                        while(next() != '\n') macros[opcode] += token;
                        break;
                    
                    default: // Instruction
                        parseInstruction(opcode);
                }
            }
        }
        catch(e)
        {
            /* In case of an error, just skip the current instruction and go on.
            Remove this try/catch block if you want the entire code to compile */
            while(token != '\n' && token != ';')
                next();

        }
    }

    return machineCode;
}