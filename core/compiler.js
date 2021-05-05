import { token, next, match, loadCode, macros, ParserError, codePos } from "./parser.js";
import { Directive } from "./directives.js";
import { Instruction } from "./instructions.js";

export const baseAddr = 0x8048078;

export var labels = new Map();

// Compile Assembly from source code into machine code
export function compileAsm(source, instructions, { haltOnError = false, line = 1, linesRemoved = 0, doSecondPass = true } = {})
{
    let opcode, currLineArr = [], pos;

    // Reset the macro list and add only the macros that have been defined prior to this line
    macros.clear();
    for(let i = 1; i < line && i <= instructions.length; i++)
    {
        for(let instr of instructions[i - 1])
        {
            if(instr.macroName) macros.set(instr.macroName, instr.macro);
        }
    }

    // Remove instructions that were replaced
    let removedInstrs = instructions.splice(line - 1, linesRemoved + 1, currLineArr);
    for(let removed of removedInstrs)
        for(let instr of removed)
            if(instr.macroName) throw "Macro edited, must recompile";

    loadCode(source);

    while(next(), !match.done)
    {
        try
        {
            pos = codePos;
            if(token !== '\n' && token !== ';')
            {
                if(token[0] === '.') // Assembly directive
                    currLineArr.push(new Directive(token.slice(1), pos));
                else // Instruction, label or macro
                {
                    opcode = token;
                    switch(next())
                    {
                        case ':': // Label definition
                            currLineArr.push({length: 0, bytes: new Uint8Array(), labelName: opcode, pos: pos})
                            continue;
                        
                        case '=': // Macro definition
                            let macroTokens = [];
                            while(next() !== '\n') macroTokens.push(token);
                            macros.set(opcode, macroTokens);
                            currLineArr.push({length: 0, bytes: new Uint8Array(), macroName: opcode, macro: macroTokens, pos: pos})
                            break;
                        
                        default: // Instruction
                            currLineArr.push(new Instruction(opcode.toLowerCase(), pos));
                            break;
                    }
                }
            }

            if(token === '\n')
            {
                if(!match.done) instructions.splice(line++, 0, currLineArr = []);
            }
            else if(token !== ';') throw new ParserError("Expected end of line");
        }
        catch(e)
        {
            // In case of an error, just skip the current instruction and go on.
            if(haltOnError) throw `Error on line ${line}: ${e.message}`;
            currLineArr.push({length: 0, bytes: new Uint8Array(), error: e});
            while(token !== '\n' && token !== ';') next();
            if(token === '\n' && !match.done) instructions.splice(line++, 0, currLineArr = []);
        }
    }

    let bytes = 0;
    if(doSecondPass) bytes = secondPass(instructions, haltOnError);
    return { instructions, bytes };
}

// Run the second pass (label resolution) on the instruction list
export function secondPass(instructions, haltOnError = false)
{
    let currIndex = baseAddr, resizeChange, instrLen;
    labels.clear();

    for(let instrLine of instructions)
    {
        for(let instr of instrLine)
        {
            currIndex += instr.length;
            if(instr.labelName !== undefined) labels.set(instr.labelName, currIndex);
            if(instr.skip)
            {
                instr.skip = false;
                instr.error = undefined;
            }
        }
    }

    currIndex = baseAddr;

    for(let i = 0; i < instructions.length; i++)
    {
        for(let instr of instructions[i])
        {
            if(instr.skip) continue;

            instrLen = instr.length;
            currIndex += instrLen;
            if(instr.outline)
            {
                resizeChange = instr.resolveLabels(labels, currIndex);
                if(!resizeChange.success) // Remove instructions that fail to recompile
                {
                    if(haltOnError) throw `Error on line ${i + 1}: Unknown label`;
                    instr.error = resizeChange.error;
                    instr.skip = true;
                    instr.length = 0;
                    resizeChange.length = -instrLen; // The entire instruction is removed
                }
                if(resizeChange.length !== 0) // If the label resolve caused the instruction to resize
                {
                    // Correct all labels following this index
                    labels.forEach((index, label) => {
                        if(index >= currIndex)
                            labels.set(label, labels.get(label) + resizeChange.length);
                    });
                    // Redo the adjustments from the start
                    currIndex = baseAddr; i = -1; break;
                }
            }
        }
    }
    return currIndex - baseAddr;
}