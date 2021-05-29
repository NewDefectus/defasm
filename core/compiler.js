import { token, next, match, loadCode, macros, ParserError, codePos } from "./parser.js";
import { Directive } from "./directives.js";
import { Instruction } from "./instructions.js";
import { Symbol, symbols, recompQueue } from "./symbols.js";

export const baseAddr = 0x400078;

var lastInstr, currLineArr, currAddr;
var errorsHalt = false;
var linkedInstrQueue = [];

function addInstruction(instr)
{
    if(lastInstr)
        lastInstr.next = instr;
    currLineArr.push(instr);
    lastInstr = instr;
    currAddr += instr.length;
}

function recompile(instr)
{
    instr.removed = false;
    try
    {
        instr.recompile();
        instr.wantsRecomp = false;
    }
    catch(e)
    {
        if(errorsHalt) throw `Error: ${e.message}`;
        if(e.pos == null || e.length == null)
            console.error("Error:\n", e);
        else
            instr.error = e;
        if(instr.name)
            for(let ref of symbols.get(instr.name).references)
            {
                ref.wantsRecomp = true;
                recompQueue.push(ref);
            }
    }
}

// Compile Assembly from source code into machine code
export function compileAsm(source, instructions, { haltOnError = false, line = 1, linesRemoved = 0, doSecondPass = true } = {})
{
    let opcode, pos;
    lastInstr = null; currLineArr = [];
    errorsHalt = haltOnError;

    // Reset the macro list and add only the macros that have been defined prior to this line
    macros.clear();
    for(let i = 1; i < line && i <= instructions.length; i++)
    {
        for(lastInstr of instructions[i - 1])
        {
            if(lastInstr.macroName) macros.set(lastInstr.macroName, lastInstr.macro);
        }
    }
    currAddr = lastInstr ? lastInstr.address + lastInstr.length : baseAddr;

    // Remove instructions that were replaced
    let removedInstrs = instructions.splice(line - 1, linesRemoved + 1, currLineArr);
    for(let removed of removedInstrs)
        for(let instr of removed)
        {
            if(instr.name)
            {
                let record = symbols.get(instr.name);
                if(record.references.length > 0)
                    record.symbol = null;
                else
                    symbols.delete(instr.name);
            }
            instr.removed = true;
        }

    loadCode(source);

    while(next(), !match.done)
    {
        try
        {
            pos = codePos;
            if(token !== '\n' && token !== ';')
            {
                if(token[0] === '.') // Assembly directive
                    addInstruction(new Directive(currAddr, token.slice(1)));
                else // Instruction, label or symbol
                {
                    opcode = token;
                    switch(next())
                    {
                        case ':': // Label definition
                            addInstruction(new Symbol(currAddr, opcode, true));
                            continue;
                        
                        case '=': // Symbol definition
                            addInstruction(new Symbol(currAddr, opcode));
                            break;
                        
                        default: // Instruction
                            addInstruction(new Instruction(currAddr, opcode.toLowerCase(), pos));
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
                addInstruction({length: 0, bytes: new Uint8Array(), error: e, address: currAddr });
            while(token !== '\n' && token !== ';') next();
            if(token === '\n' && !match.done) instructions.splice(line++, 0, currLineArr = []);
        }
    }

    while(line < instructions.length)
    {
        if(instructions[line].length > 0)
        {
            let instr = instructions[line][0];
            if(lastInstr)
            {
                lastInstr.next = instr;
                linkedInstrQueue.push(lastInstr);
            }
            else
            {
                if(instr.address !== baseAddr)
                    linkedInstrQueue.push(instr);
                instr.address = baseAddr;
            }
            break;
        }
        line++;
    }

    let bytes = 0;
    if(doSecondPass) bytes = secondPass(instructions, haltOnError);
    return { instructions, bytes };
}

// Run the second pass on the instruction list
export function secondPass(instructions)
{
    let currIndex = baseAddr, instr;

    symbols.forEach(record => {
        record.references = record.references.filter(instr => !instr.removed);
        if(record.symbol === null)
            for(let ref of record.references)
            {
                ref.wantsRecomp = true;
                recompQueue.push(ref);
            }
    });

    while(instr = linkedInstrQueue.shift() || recompQueue.shift())
    {
        currIndex = instr.address;
        do
        {
            instr.address = currIndex;
            if((instr.wantsRecomp || instr.ipRelative) && !instr.removed)
                recompile(instr);
            currIndex = instr.address + instr.length;
            instr = instr.next;
        } while(instr && instr.address != currIndex);
    }

    for(let instrLine of instructions)
        if(instrLine.length > 0)
            for(instr of instrLine);
    
    return instr ? instr.address + instr.length - baseAddr : 0;
}