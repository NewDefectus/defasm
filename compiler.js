import { token, next, match, loadCode, macros } from "./parser.js";
import { Directive } from "./directives.js";
import { Instruction } from "./instructions.js";

const baseAddr = 0x8048078;

export var labels = new Map();

// Compile Assembly from source code into machine code
export function compileAsm(source, instructions, haltOnError = false, line = 1, doSecondPass = true)
{
    let opcode, instr, currIndex = baseAddr, currLineArr;
    instructions[line - 1] = currLineArr = [];

    // Reset the macro list and add only the macros that have been defined prior to this line
    macros.clear();
    for(let i = 1; i < line && i <= instructions.length; i++)
    {
        for(let instr of instructions[i - 1])
        {
            if(instr.macroName) macros.set(instr.macroName, instr.macro);
        }
    }

    if(line <= instructions.length)
        for(let instr of instructions[line - 1])
        {
            if(instr.macroName) throw "Macro edited, must recompile";
        }

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
                    currLineArr.push(instr);
                }
                else // Instruction, label or macro
                {
                    opcode = token;
                    switch(next())
                    {
                        case ':': // Label definition
                            currLineArr.push({length: 0, bytes: new Uint8Array(), labelName: opcode})
                            continue;
                        
                        case '=': // Macro definition
                            let macroTokens = [];
                            while(next() !== '\n') macroTokens.push(token);
                            macros.set(opcode, macroTokens);
                            currLineArr.push({length: 0, bytes: new Uint8Array(), macroName: opcode, macro: macroTokens})
                            break;
                        
                        default: // Instruction
                            instr = new Instruction(opcode);
                            currIndex += instr.length;
                            currLineArr.push(instr);
                            break;
                    }
                }
            }

            if(token === '\n') instructions[line++] = currLineArr = [];
            else if(token !== ';') throw "Expected end of line";
        }
        catch(e)
        {
            // In case of an error, just skip the current instruction and go on.
            e = `Error on line ${line}: ${e}`;
            if(haltOnError) throw e;
            console.warn(e);
            while(token !== '\n' && token !== ';') next();
            if(token === '\n') instructions[line++] = currLineArr = [];
        }
    }

    let bytes = 0;
    if(doSecondPass) bytes = secondPass(instructions, haltOnError);
    return { instructions, bytes };
}

// Run the second pass (label resolution) on the instruction list
export function secondPass(instructions, haltOnError = false)
{
    let currIndex = baseAddr, resizeChange;
    labels.clear();

    for(let instrLine of instructions)
    {
        for(let instr of instrLine)
        {
            currIndex += instr.length;
            if(instr.labelName !== undefined) labels.set(instr.labelName, currIndex);
            instr.skip = false;
        }
    }

    currIndex = baseAddr;

    for(let i = 0; i < instructions.length; i++)
    {
        for(let instr of instructions[i])
        {
            currIndex += instr.length;
            if(instr.outline && !instr.skip)
            {
                resizeChange = instr.resolveLabels(labels, currIndex);
                if(resizeChange === null) // Remove instructions that fail to recompile
                {
                    let e = `Error on line ${i + 1}: Unknown label`;
                    if(haltOnError) throw e;
                    console.warn(e);
                    instr.skip = true;
                    currIndex = baseAddr; i = -1; break;
                }
                else if(resizeChange !== 0) // If the label resolve caused the instruction to resize
                {
                    // Correct all labels following this index
                    labels.forEach((index, label) => {
                        if(index >= currIndex)
                            labels.set(label, labels.get(label) + resizeChange);
                    });
                    // Redo the adjustments from the start
                    currIndex = baseAddr; i = -1; break;
                }
            }
        }
    }
    return currIndex - baseAddr;
}