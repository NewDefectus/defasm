import { token, next, match, loadCode, macros } from "./parser.js";
import { Directive } from "./directives.js";
import { Instruction } from "./instructions.js";
import { labels, Label } from "./labels.js";

// Compile Assembly from source code into machine code
export function compileAsm(source)
{
    let instrHead = { length: 0, newlines: 0 };
    let opcode, resizeChange, i, instr, instrTail = instrHead;

    labels.clear(); macros.clear();
    currIndex = 0;

    loadCode(source);

    while(next(), !match.done)
    {
        try
        {
            if(token !== '\n' && token !== ';')
            {
                if(token[0] === '.') // Assembly directive
                {
                    instr = new Directive(token.slice(1));
                    currIndex += instr.length;
                    instrTail.next = instrTail = instr;
                }
                else // Instruction, label or macro
                {
                    opcode = token;
                    switch(next())
                    {
                        case ':': // Label definition
                            instrTail.next = instrTail = new Label(opcode, currIndex);
                            continue;
                        
                        case '=': // Macro definition
                            let macroTokens = [];
                            while(next() !== '\n') macroTokens.push(token);
                            macros.set(opcode, macroTokens);
                            break;
                        
                        default: // Instruction
                            instr = new Instruction(opcode);
                            currIndex += instr.length;
                            instrTail.next = instrTail = instr;
                            break;
                    }
                }
            }

            if(token === '\n') instrTail.newlines++;
            else if(token !== ';') throw "Expected end of line";
        }
        catch(e)
        {
            /* In case of an error, just skip the current instruction and go on.
            Remove this try/catch block if you want the entire code to compile */
            console.warn(e);
            while(token !== '\n' && token !== ';') next();
            if(token === '\n') instrTail.newlines++;
        }
    }

    /* I guess this would be the "second pass", although we don't actually go through
    the source code again; we're just resolving all the label references. */
    currIndex = 0;
    instr = instrHead;
    while(instr = instr.next)
    {
        currIndex += instr.length;
        if(instr.outline && !instr.skip)
        {
            resizeChange = instr.resolveLabels(labels, currIndex);
            if(resizeChange === null) // Remove instructions that fail to recompile
            {
                instr.skip = true;
                i = -1; currIndex = 0;
            }
            else if(resizeChange !== 0) // If the label resolve caused the instruction to resize
            {
                // Correct all labels following this index
                labels.forEach((index, label) => {
                    if(index >= currIndex)
                        labels.set(label, labels.get(label) + resizeChange);
                });
                // Redo the adjustments from the start
                i = -1, currIndex = 0;
            }
        }
    }

    return instrHead;
}