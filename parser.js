var srcTokens, token, match;
var currIndex = 0;
var labels = new Map(), macros = new Map();

var encoder = new TextEncoder();
var decoder = new TextDecoder();

function lowerCase(str)
{
    if(str[0] == '"' || str[0] == "'")
        return str;
    return str.toLowerCase();
}

var next = defaultNext = () => 
    token = (match = srcTokens.next()).done ? '\n' :
    macros.has(match.value[0]) ?
        (insertTokens(macros.get(match.value[0])), next())
    :  match.value[0][0] === '#' ? next() : lowerCase(match.value[0]);

function insertTokens(tokens)
{
    let tokensCopy = [...tokens];
    next = () => token = tokensCopy.shift() || (next = defaultNext)();
}

// Highly unhygienic. You shouldn't put the token back on the stack after you touched it.
// I recommend washing your hands after you use this thing.
function ungetToken(t)
{
    let oldNext = next;
    next = () => token = (next = oldNext, t);
}

// Just a wee peek at the next token
function peekNext()
{
    let oldToken = token, nextToken = next();
    ungetToken(nextToken);
    token = oldToken;
    return nextToken;
}

// Compile Assembly from source code into machine code
function compileAsm(source)
{
    /**
     * @type {Instruction[]}
     */
    let instructions = [];
    let opcode, resizeChange, instr, i;

    next = defaultNext;
    labels.clear(); macros.clear();
    currIndex = 0;

    srcTokens = source.matchAll(/(["'])(\\.|[^\\])*?\1|[\w.-]+|#.*|[\S\n]/g);

    while(next(), !match.done)
    {
        try
        {
            if(token !== '\n' && token !== ';')
            {
                if(token[0] === '.') // Assembly directive
                {
                    instr = parseDirective();
                    currIndex += instr.length;
                    instructions.push(instr);
                }
                else // Instruction, label or macro
                {
                    opcode = token;
                    switch(next())
                    {
                        case ':': // Label definition
                            labels.set(opcode, currIndex);
                            continue;
                        
                        case '=': // Macro definition
                            let macroTokens = [];
                            while(next() !== '\n') macroTokens.push(token);
                            macros.set(opcode, macroTokens);
                            break;
                        
                        default: // Instruction
                            instr = new Instruction(opcode);
                            currIndex += instr.length;
                            instructions.push(instr);
                            break;
                    }
                }
            }

            if(token === '\n') instructions.push("");
            else if(token !== ';') throw "Expected end of line";
        }
        catch(e)
        {
            /* In case of an error, just skip the current instruction and go on.
            Remove this try/catch block if you want the entire code to compile */
            console.warn(e);
            while(token !== '\n' && token !== ';') next();
            if(token === '\n') instructions.push("");
        }
    }

    /* I guess this would be the "second pass", although we don't actually go through
    the source code again; we're just resolving all the label references. */
    currIndex = 0;
    for(i = 0; i < instructions.length; i++)
    {
        instr = instructions[i];
        currIndex += instr.length;
        if(instr.outline)
        {
            try
            {
                for(let op of instr.outline[0]) // Resolve label dependencies
                {
                    if(op.labelDependency !== undefined)
                    {
                        op.value = BigInt(labels.get(op.labelDependency) - currIndex);
                        if(op.type === OPT.IMM && instr.outline[1] < 0) // For immediates, re-adjust the size
                        {
                            op.size = inferImmSize(op.value);
                            op.unsignedSize = inferUnsignedImmSize(op.value);
                        }
                    }
                }
                resizeChange = instr.length;
                instr.compile();
                resizeChange -= instr.length;

                if(resizeChange) // If the label resolve caused the instruction to resize
                {
                    // Correct all labels following this index
                    labels.forEach((index, label) => {
                        if(index >= currIndex)
                            labels.set(label, labels.get(label) - resizeChange);
                    })
                    // Redo the adjustments from the start
                    i = -1, currIndex = 0;
                }
            }
            catch(e) // Remove instructions that create exceptions
            {
                instructions.splice(i, 1);
                i = -1; currIndex = 0;
            }
        }
    }

    return instructions;
}