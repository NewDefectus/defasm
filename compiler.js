import { token, next, match, loadCode, macros } from "./parser.js";
import { Directive } from "./directives.js";
import { Instruction } from "./instructions.js";

export var labels = new Map();

const baseAddr = 0x8048078;

// Compile Assembly from source code into machine code
export function compileAsm(source, haltOnError = false)
{
    let opcode, instr, currIndex = baseAddr, line = 1;
    let instrHead = { length: 0, newlines: 0, next: null, total: 0 }, instrTail = instrHead;

    labels.clear(); macros.clear();
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
                            instrTail.next = instrTail = instr;
                            break;
                    }
                }
            }

            if(token === '\n') instrTail.newlines++, line++;
            else if(token !== ';') throw "Expected end of line";
        }
        catch(e)
        {
            // In case of an error, just skip the current instruction and go on.
            e = `Error on line ${line}: ${e}`;
            if(haltOnError) throw e;
            console.warn(e);
            while(token !== '\n' && token !== ';') next();
            if(token === '\n') instrTail.newlines++, line++;
        }
    }

    secondPass(instrHead);
    return instrHead;
}

/* Run the second pass (label resolution) on the instruction list */
export function secondPass(instrHead)
{
    let instr = instrHead, currIndex = baseAddr, line = instrHead.newlines + 1, resizeChange;

    while(instr = instr.next)
    {
        currIndex += instr.length;
        if(instr.outline && !instr.skip)
        {
            resizeChange = instr.resolveLabels(labels, currIndex);
            if(resizeChange === null) // Remove instructions that fail to recompile
            {
                let e = `Error on line ${line}: Unknown label`;
                if(haltOnError) throw e;
                console.warn(e);
                instr.skip = true;
                currIndex = baseAddr; line = instrHead.newlines + 1; instr = instrHead;
            }
            else if(resizeChange !== 0) // If the label resolve caused the instruction to resize
            {
                // Correct all labels following this index
                labels.forEach((index, label) => {
                    if(index >= currIndex)
                        labels.set(label, labels.get(label) + resizeChange);
                });
                // Redo the adjustments from the start
                currIndex = baseAddr; line = instrHead.newlines + 1; instr = instrHead;
            }
        }
        line += instr.newlines;
    }
    instrHead.total = currIndex - baseAddr;
}