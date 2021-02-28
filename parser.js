var srcTokens, token, match;
var labels = {};
var macros = {};

var macroBuffer = [];

function lowerCase(str)
{
    if(str[0] == '"' || str[0] == "'")
        return str;
    return str.toLowerCase();
}

var next = defaultNext = () => 
    token = (match = srcTokens.next()).done ? '\n' :
    macros[match.value[0]] ?
        (macroBuffer = [...macros[match.value[0]]], next = () =>
            (console.log(macroBuffer), token = macroBuffer.shift() || (next = defaultNext)())
        )()
    :  lowerCase(match.value[0]);

function ungetToken(t)
{
    let oldNext = next;
    next = () => token = (next = oldNext, t);
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
    ASMLoop:
    while(next(), !match.done)
    {
        try
        {
            if(token == '\n' || token == ';')
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
                        continue ASMLoop;
                    
                    case '=': // Macro definition
                        macros[opcode] = [];
                        while(next() != '\n') macros[opcode].push(token);
                        console.log(macros[opcode])
                        break;
                    
                    default: // Instruction
                        parseInstruction(opcode);
                        break;
                }
            }

            if(token != ';' && token != '\n')
                throw "Expected end of line";
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