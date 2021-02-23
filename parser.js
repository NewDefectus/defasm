var srcTokens, token, match;
var labels = {};
var macros = {};

var macroBuffer = [];

var next = defaultNext = () => 
    token = (match = srcTokens.next()).done ? '\n' :
    macros[match.value[0]] ?
        (macroBuffer = [...macros[match.value[0]]], next = () =>
            token = macroBuffer.shift() || (next = defaultNext)()
        )()
    :  match.value[0];

function ungetToken(t)
{
    next = () => token = (next = defaultNext, t);
}


function Register(text)
{
    this.high = false;
}

function Address()
{
    this.segment = null; // Segment register
    this.disp = 0; // Immediate
    this.base = null; // Register
    this.index = null; // Register
    this.factor = null; // Immediate
}

// Compile Assembly from source code into machine code
function compileAsm(source)
{
    resetMachineCode();
    next = defaultNext;
    labels = {};
    macros = {};

    srcTokens = source.matchAll(/(["'])[^]*?\1|[\w.-]+|[\S\n]/g);

    let opcode;
    while(next(), !match.done)
    {
        try
        {
            if(token == '\n')
            {
                continue;
            }

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
                        macros[opcode] = [];
                        while(next() != '\n') macros[opcode].push(token);
                        break;
                    
                    default: // Instruction
                        parseInstruction(opcode);
                        break;
                }
            }
        }
        catch(e)
        {
            /* In case of an error, just skip the current instruction and go on.
            Remove this try/catch block if you want the entire code to compile */
            console.warn(e);
            while(token != '\n' && token != ';')
                next();

        }
    }

    return machineCode;
}