var srcTokens, token, match;
var labels, macros;

var macroBuffer = [];

function lowerCase(str)
{
    if(str[0] == '"' || str[0] == "'")
        return str;
    return str.toLowerCase();
}

var next = defaultNext = () => 
    token = (match = srcTokens.next()).done ? '\n' :
    macros.has(match.value[0]) ?
        (macroBuffer = [...macros.get(match.value[0])], next = () =>
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
    next = defaultNext;
    labels = new Map();
    macros = new Map();

    srcTokens = source.matchAll(/(["'])[^]*?\1|[\w.-]+|[\S\n]/g);

    let opcode, currIndex = 0;
    let instructions = [], instruction;
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
                instruction = parseDirective();
                currIndex += instruction.length;
                instructions.push(instruction);
            }
            else // Instruction, label or macro
            {
                opcode = token;
                switch(next())
                {
                    case ':': // Label definition
                        labels.set(opcode, currIndex);
                        continue ASMLoop;
                    
                    case '=': // Macro definition
                        let macroTokens = [];
                        while(next() != '\n') macroTokens.push(token);
                        macros.set(opcode, macroTokens);
                        break;
                    
                    default: // Instruction
                        instruction = parseInstruction(opcode);
                        currIndex += instruction.length;
                        instructions.push(instruction);
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

    /* I guess this would be the "second pass", although we don't actually go
    through the source code again; we're just resolving all the label references. */

    // First, we'll filter out instructions that reference unknown labels
    instructions = instructions.filter(instr => 
        instr.requiredLabel === undefined || labels.has(instr.requiredLabel)
    );

    let labelIndex, resizeChange;
    labelResolveLoop:
    while(1)
    {
        currIndex = 0;
        for(let instr of instructions)
        {
            currIndex += instr.length;
            if(instr.requiredLabel !== undefined)
            {
                labelIndex = labels.get(instr.requiredLabel);
                resizeChange = instr.length;
                instr.labelResolve(labelIndex - currIndex);
                resizeChange -= instr.length;

                if(resizeChange != 0) // If the label resolve caused the instruction to resize
                {
                    // Correct all labels following this index
                    labels.forEach((index, label) => {
                        if(index >= currIndex)
                            labels[label] -= resizeChange;
                    })
                    // Redo the adjustments from the start
                    continue labelResolveLoop;
                }
            }
        }
        break;
    }

    let hexBytes = "", i;
    for(let instr of instructions)
    {
        for(i = 0; i < instr.length; i++)
            hexBytes += instr.bytes[i].toString(16).toUpperCase().padStart(2, '0') + ' ';
    }

    return hexBytes;
}