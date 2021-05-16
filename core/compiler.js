import { token, next, match, loadCode, macros, ParserError, codePos } from "./parser.js";
import { Directive } from "./directives.js";
import { Instruction } from "./instructions.js";

export const baseAddr = 0x8048078;

export var labels = new Map();

var lastInstr, currLineArr;

function addInstruction(instr)
{
    if(lastInstr)
        lastInstr.next = instr;
    currLineArr.push(instr);
    lastInstr = instr;
}

// Compile Assembly from source code into machine code
export function compileAsm(source, instructions, { haltOnError = false, line = 1, linesRemoved = 0, doSecondPass = true } = {})
{
    let opcode, pos, tailInstr = null;
    lastInstr = null; currLineArr = [];

    // Reset the macro list and add only the macros that have been defined prior to this line
    macros.clear();
    for(let i = 1; i < line && i <= instructions.length; i++)
    {
        for(lastInstr of instructions[i - 1])
        {
            if(lastInstr.macroName) macros.set(lastInstr.macroName, lastInstr.macro);
        }
    }

    if(lastInstr)
        tailInstr = lastInstr.next;

    // Remove instructions that were replaced
    let removedInstrs = instructions.splice(line - 1, linesRemoved + 1, currLineArr);
    for(let removed of removedInstrs)
        for(tailInstr of removed)
            if(tailInstr.macroName) throw "Macro edited, must recompile";

    loadCode(source);

    while(next(), !match.done)
    {
        try
        {
            pos = codePos;
            if(token !== '\n' && token !== ';')
            {
                if(token[0] === '.') // Assembly directive
                    addInstruction(new Directive(token.slice(1), pos));
                else // Instruction, label or macro
                {
                    opcode = token;
                    switch(next())
                    {
                        case ':': // Label definition
                            addInstruction({length: 0, bytes: new Uint8Array(), labelName: opcode, pos: pos});
                            continue;
                        
                        case '=': // Macro definition
                            let macroTokens = [];
                            while(next() !== '\n') macroTokens.push(token);
                            macros.set(opcode, macroTokens);
                            addInstruction({length: 0, bytes: new Uint8Array(), macroName: opcode, macro: macroTokens, pos: pos});
                            break;
                        
                        default: // Instruction
                            addInstruction(new Instruction(opcode.toLowerCase(), pos));
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
            if(e.pos == null || e.length == null)
                console.error("Error on line " + line + ":\n", e);
            else
                addInstruction({length: 0, bytes: new Uint8Array(), error: e});
            while(token !== '\n' && token !== ';') next();
            if(token === '\n' && !match.done) instructions.splice(line++, 0, currLineArr = []);
        }
    }

    if(lastInstr)
        lastInstr.next = tailInstr;

    let bytes = 0;
    if(doSecondPass) bytes = secondPass(instructions, haltOnError);
    return { instructions, bytes };
}

// Run the second pass (label resolution) on the instruction list
export function secondPass(instructions, haltOnError = false)
{
    let currIndex = baseAddr, resizeChange, instr, instrLen;
    labels.clear();

    for(let instrLine of instructions)
    {
        for(instr of instrLine)
        {
            currIndex += instr.length;
            instr.address = currIndex;
            if(instr.labelName !== undefined) labels.set(instr.labelName, instr);
            if(instr.skip)
            {
                instr.skip = false;
                instr.error = undefined;
            }
        }
    }

    for(let i = 0; i < instructions.length; i++)
    {
        for(instr of instructions[i])
        {
            if(instr.skip) continue;

            instrLen = instr.length;
            if(instr.outline)
            {
                resizeChange = instr.resolveLabels(labels);
                if(!resizeChange.success) // Skip instructions that fail to recompile
                {
                    let e = resizeChange.error;
                    if(haltOnError) throw `Error on line ${i + 1}: ${e}`;
                    if(e.pos == null || e.length == null)
                        console.error("Error on line " + (i + 1) + ":\n", e);
                    else
                        instr.error = e;
                    
                    instr.skip = true;
                    instr.length = 0;
                    resizeChange.length = -instrLen; // The entire instruction's length is removed
                }

                if(resizeChange.length)
                {
                    // Correct the addresses of all following instructions
                    while(instr)
                    {
                        instr.address += resizeChange.length;
                        instr = instr.next;
                    }

                    i = -1; break;
                }
            }
        }
    }
    return instr ? instr.address - baseAddr : 0;
}