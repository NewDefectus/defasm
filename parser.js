var srcTokens, token, match;
var currIndex = 0;
var labels = new Map(), macros = new Map();
var tokenRecording = [], isRecording = false;

function lowerCase(str)
{
    if(str[0] == '"' || str[0] == "'")
        return str;
    return str.toLowerCase();
}

function putInToken(tok)
{
    token = tok;
    if(isRecording) tokenRecording.push(tok);
    return tok;
}

var next = defaultNext = () => 
    putInToken((match = srcTokens.next()).done ? '\n' :
    macros.has(match.value[0]) ?
        (replayTokenRecording(macros.get(match.value[0])), next())
    :  match.value[0][0] === '#' ? next() : lowerCase(match.value[0]));

/* "Token recordings" are strings of tokens that can be repeated after they are parsed */

// Start a token recording
function startTokenRecording()
{
    isRecording = true;
    tokenRecording = [token];
}

// Stop a token recording and return the tokens in the recording
function stopTokenRecording()
{
    isRecording = false;
    return tokenRecording;
}

// Add the tokens in a recording to the token stack
function replayTokenRecording(recording)
{
    let tokensCopy = [...recording];
    next = () => putInToken(tokensCopy.shift() || (next = defaultNext)());
    next(); // First token in the recording should already be in the token variable
}

// Highly unhygienic. You shouldn't put the token back on the stack after you touched it.
// I recommend washing your hands after you use this thing.
function ungetToken(t)
{
    let oldNext = next;
    if(isRecording) tokenRecording.pop();
    next = () => putInToken((next = oldNext, t));
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
    let opcode, resizeChange, instructions = [], instr, i, hexBytes = "";

    next = defaultNext;
    labels.clear(); macros.clear();
    currIndex = 0, allowLabels = false;

    srcTokens = source.matchAll(/(["'])[^]*?\1|[\w.-]+|#.*|[\S\n]/g);

    ASMLoop:
    while(next(), !match.done)
    {
        try
        {
            if(token == '\n' || token == ';')
            {
                if(token == '\n') instructions.push("");
                continue;
            }

            if(token[0] == '.') // Assembly directive
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
                        continue ASMLoop;
                    
                    case '=': // Macro definition
                        startTokenRecording();
                        while(next() != '\n');
                        macros.set(opcode, stopTokenRecording().slice(0, -1));
                        break;
                    
                    default: // Instruction
                        instr = parseInstruction(opcode);
                        currIndex += instr.length;
                        instructions.push(instr);
                        break;
                }
            }

            if(token != ';' && token != '\n') throw "Expected end of line";
            if(token == '\n') instructions.push("");
        }
        catch(e)
        {
            /* In case of an error, just skip the current instruction and go on.
            Remove this try/catch block if you want the entire code to compile */
            console.warn(e);
            while(token != '\n' && token != ';')
                next();
            if(token == '\n') instructions.push("");
        }
    }

    /* I guess this would be the "second pass", although we don't actually go through
    the entire source code again; we're just resolving all the label references. */
    allowLabels = true;
    currIndex = 0;
    for(i = 0; i < instructions.length; i++)
    {
        instr = instructions[i];
        currIndex += instr.length;
        if(instr.tokens)
        {
            try
            {
                resizeChange = instr.length;
                instr.parse();
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