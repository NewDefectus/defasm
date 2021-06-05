import { token, next, match, loadCode, ParserError, codePos } from "./parser.js";
import { Directive } from "./directives.js";
import { Instruction } from "./instructions.js";
import { Symbol, recompQueue } from "./symbols.js";

var lastInstr, currLineArr, currAddr;
var linkedInstrQueue = [];

/**
 * @typedef {Object} SymbolRecord
 * @property {?Symbol} symbol The symbol instruction this record belongs to, if it exists
 * @property {Instruction[]} references List of instructions that reference this symbol
 */

/** @type {Map<string, SymbolRecord>} */
export var symbols = null;

export const baseAddr = 0x400078;

export function AssemblyState()
{
    /** @type {Map<string, SymbolRecord>} */
    this.symbols = new Map();

    /** @type {Instruction[][]} */
    this.instructions = [];

    this.bytes = 0;
}

function addInstruction(instr)
{
    if(lastInstr)
        lastInstr.next = instr;
    currLineArr.push(instr);
    lastInstr = instr;
    currAddr += instr.length;
}

// Compile Assembly from source code into machine code
AssemblyState.prototype.compile = function(source, { haltOnError = false, line = null, linesRemoved = 1, doSecondPass = true } = {})
{
    if(line === null)
        linesRemoved = Infinity;
    else if(line < 1)
        throw "Invalid line";
    
    if(linesRemoved < 1)
        throw "linesRemoved must be positive";
    
    let opcode, pos;
    lastInstr = null; currLineArr = [];
    symbols = this.symbols;

    for(let i = 1; i < line && i <= this.instructions.length; i++)
        for(lastInstr of this.instructions[i - 1]);

    currAddr = lastInstr ? lastInstr.address + lastInstr.length : baseAddr;


    // Make sure the instruction array reaches the given line
    for(let i = this.instructions.length; i < line - 1; i++)
        this.instructions[i] = [];

    // Remove instructions that were replaced
    let removedInstrs = this.instructions.splice(line - 1, linesRemoved, currLineArr);
    for(let removed of removedInstrs)
        for(let instr of removed)
        {
            if(instr.name && !instr.duplicate)
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
                            addInstruction(new Symbol(currAddr, opcode, pos, true));
                            continue;
                        
                        case '=': // Symbol definition
                            addInstruction(new Symbol(currAddr, opcode, pos));
                            break;
                        
                        default: // Instruction
                            addInstruction(new Instruction(currAddr, opcode.toLowerCase(), pos));
                            break;
                    }
                }
            }

            if(token === '\n')
            {
                if(!match.done) this.instructions.splice(line++, 0, currLineArr = []);
            }
            else if(token !== ';') throw new ParserError("Expected end of line");
        }
        catch(e)
        {
            if(haltOnError && !doSecondPass) throw `Error on line ${line}: ${e.message}`;
            if(e.pos == null || e.length == null)
                console.error("Error on line " + line + ":\n", e);
            else
                addInstruction({length: 0, bytes: new Uint8Array(), error: e, address: currAddr });
            while(token !== '\n' && token !== ';') next();
            if(token === '\n' && !match.done) this.instructions.splice(line++, 0, currLineArr = []);
        }
    }

    while(line < this.instructions.length)
    {
        if(this.instructions[line].length > 0)
        {
            let instr = this.instructions[line][0];
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

    if(doSecondPass)
        this.secondPass(haltOnError);
}

// Run the second pass on the instruction list
AssemblyState.prototype.secondPass = function(haltOnError = false)
{
    let currIndex = baseAddr, instr;
    symbols = this.symbols;

    symbols.forEach((record, name) => {
        record.references = record.references.filter(instr => !instr.removed);
        if(record.symbol === null || record.symbol.error)
        {
            if(record.references.length == 0)
                symbols.delete(name);
            else for(let ref of record.references)
            {
                ref.wantsRecomp = true;
                recompQueue.push(ref);
            }
        }
    });

    while(instr = linkedInstrQueue.shift() || recompQueue.shift())
    {
        currIndex = instr.address;
        do
        {
            instr.address = currIndex;
            if((instr.wantsRecomp || instr.ipRelative) && !instr.removed)
            {
                // Recompiling the instruction
                instr.removed = false;
                try
                {
                    instr.recompile();
                    instr.wantsRecomp = false;
                }
                catch(e)
                {
                    instr.error = e;

                    // When a symbol is invalidated, all references to it should be too
                    if(instr.name)
                        for(let ref of symbols.get(instr.name).references)
                        {
                            ref.wantsRecomp = true;
                            recompQueue.push(ref);
                        }
                }
            }
            currIndex = instr.address + instr.length;
            instr = instr.next;
        } while(instr && instr.address != currIndex);
    }

    // Error collection
    let haltingErrors = [];
    for(let i = 0; i < this.instructions.length; i++)
    {
        for(instr of this.instructions[i])
        {
            let e = instr.error;
            if(e)
            {
                if(haltOnError)
                    haltingErrors.push(`Error on line ${i + 1}: ${e.message}`);

                /* Errors whose pos can't be determined should be logged,
                not marked (these are usually internal compiler errors) */
                if(e.pos == null || e.length == null)
                {
                    console.error(`Error on line ${i + 1}:\n`, e);
                    instr.error = null;
                }
            }
        }
    }

    if(haltingErrors.length > 0)
        throw haltingErrors.join('\n');
    
    this.bytes = instr ? instr.address + instr.length - baseAddr : 0;
}

AssemblyState.prototype.dump = function()
{
    let output = Buffer.alloc(this.bytes), i = 0;
    for(let instrLine of this.instructions)
    {
        for(let instr of instrLine)
        {
            for(let j = 0; j < instr.length; j++)
                output[i++] = instr.bytes[j];
        }
    }
    return output;
}