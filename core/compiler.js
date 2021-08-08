import { token, next, match, loadCode, currRange, currSyntax, setSyntax, defaultSyntax } from "./parser.js";
import { Directive, intelDirectives } from "./directives.js";
import { Instruction } from "./instructions.js";
import { Symbol, recompQueue, queueRecomp } from "./symbols.js";
import { ASMError, Range, Statement } from "./statement.js";

var linkedInstrQueue = [];

/**
 * @typedef {Object} SymbolRecord
 * @property {?Symbol} symbol The symbol instruction this record belongs to, if it exists
 * @property {Statement[]} references List of instructions that reference this symbol
 */

/** @type {Map<string, SymbolRecord>} */
export var symbols = null;
export const baseAddr = 0x400078;

var firstInstr = null;

/** @param {Statement} instr */
function addInstruction(instr)
{
    firstInstr = instr;
    setSyntax(instr.syntax);
    instr.range = instr.range.until(currRange);
}

export class AssemblyState
{
    constructor()
    {
        /** @type {Map<string, SymbolRecord>} */
        this.symbols = new Map();

        /** @type {Statement} */
        this.instructionHead = new Statement();

        /** @type {string} */
        this.source = '';

        this.bytes = 0;
    }

    line(line)
    {
        if(line-- < 1)
            throw "Invalid line";
        let start = 0;
        while(line--)
            start = this.source.indexOf('\n', start) + 1 || start;
        let end = this.source.indexOf('\n', start) + 1 || start;
        return new Range(start, end - start);
    }

    /**
     * @callback instrCallback
     * @param {Statement} instr
     * @param {Number} line
    */
    /** @param {instrCallback} func */
    iterate(func)
    {
        let line = 1, nextLine = 0, instr = this.instructionHead;
        while(nextLine != Infinity)
        {
            nextLine = this.source.indexOf('\n', nextLine) + 1 || Infinity;
            while(instr && instr.range.end < nextLine)
            {
                func(instr, line);
                instr = instr.next;
            }
            line++;
        }
    }

    /**
     * @callback lineCallback
     * @param {Statement[]} instr
     * @param {Number} line
    */
    /** @param {lineCallback} func */
    iterateLines(func)
    {
        let line = 1, nextLine = 0, instr = this.instructionHead.next;
        while(nextLine != Infinity)
        {
            nextLine = this.source.indexOf('\n', nextLine) + 1 || Infinity;
            let instrs = [];
            while(instr && instr.range.end <= nextLine)
            {
                instrs.push(instr);
                instr = instr.next;
            }
            func(instrs, line);
            line++;
        }
    }

    /* Compile Assembly from source code into machine code */
    compile(source, {
        haltOnError = false,
        range = new Range(0, this.source.length),
        doSecondPass = true } = {})
    {
        this.source =
            /* If the given range is outside the current
            code's span, fill the in-between with newlines */
            this.source.slice(0, range.start).padEnd(range.start, '\n') +
            source +
            this.source.slice(range.end);
        
        symbols = this.symbols;

        firstInstr = null;
        let lastInstr = null, instr = this.instructionHead;
        let changeOffset = source.length - range.length;

        while(instr)
        {
            if(firstInstr === null)
            {
                if(instr.next && instr.next.range.end >= range.start)
                {
                    firstInstr = instr;
                    firstInstr.next.range.length += changeOffset;
                }
            }
            else
            {
                if(instr.next)
                {
                    instr.next.range.start += changeOffset;
                    if(instr.next.error)
                        instr.next.error.range.start += changeOffset;
                }
                
                if(lastInstr === null)
                {
                    // This instruction will be removed
                    if(instr.name && !instr.duplicate)
                    {
                        let record = symbols.get(instr.name);
                        if(record.references.length > 0)
                            record.symbol = null;
                        else
                            symbols.delete(instr.name);
                    }
                    instr.removed = true;

                    if(instr.range.includes(range.end))
                    {
                        lastInstr = instr;
                        break;
                    }
                }
            }

            instr = instr.next;
        }

        if(firstInstr === null)
            firstInstr = this.instructionHead;

        // Expand the range a bit so as not to cut off the first and last instructions
        let nextRange = firstInstr.next ? firstInstr.next.range : new Range(firstInstr.range.end, Infinity);
        if(lastInstr)
            range = nextRange.until(lastInstr.range);
        else
            range = new Range(nextRange.start, Infinity);
        
        firstInstr.next = null;
        console.log({source: this.source, slice: range.slice(this.source)});
        loadCode(range.slice(this.source), range.start);
        setSyntax(firstInstr ? firstInstr.syntax : defaultSyntax);
        
        let line = 1;

        while(!match.done)
        {
            let pos = currRange;
            try
            {
                if(token !== '\n' && token !== ';')
                {
                    let lowerTok = token.toLowerCase();
                    if(currSyntax.intel ?
                        intelDirectives.hasOwnProperty(lowerTok)
                        || token == '%' && (lowerTok = '%' + next().toLowerCase())
                        :
                        token[0] == '.') // Assembler directive
                    {
                        if(currSyntax.intel ?
                            lowerTok == '%assign'
                            :
                            lowerTok == '.equ' || lowerTok == '.set')
                        {
                            let opcode = next();
                            pos = currRange;
                            if(!currSyntax.intel && next() !== ',')
                                throw new ASMError("Expected ','");
                            addInstruction(new Symbol(firstInstr, opcode, pos));
                        }
                        else
                            addInstruction(new Directive(firstInstr, currSyntax.intel ? token : token.slice(1), pos));
                    }
                    else // Instruction, label or symbol
                    {
                        let opcode = token;
                        next();

                        if(token == ':') // Label definition
                        {
                            addInstruction(new Symbol(firstInstr, opcode, pos, true));
                            next();
                            continue;
                        }
                        else if(token == '=' || currSyntax.intel && token.toLowerCase() == 'equ') // Symbol definition
                            addInstruction(new Symbol(firstInstr, opcode, pos));
                        else if(currSyntax.intel && intelDirectives.hasOwnProperty(token.toLowerCase())) // "<label> <directive>"
                        {
                            addInstruction(new Symbol(firstInstr, opcode, pos, true));
                            addInstruction(new Directive(firstInstr, token, pos));
                        }
                        else // Instruction
                            addInstruction(new Instruction(firstInstr, opcode.toLowerCase(), pos));
                    }
                }

                if(token == '\n')
                    line++;
                else if(token != ';')
                    throw new ASMError("Expected end of line");
            }
            catch(e)
            {
                while(token != '\n' && token != ';')
                    next();
                    
                if(haltOnError && !doSecondPass)
                    throw `Error on line ${line}: ${e.message}`;
                if(!e.range)
                    console.error("Error on line " + line + ":\n", e);
                else
                    addInstruction(new Statement(firstInstr, 0, pos, e));
                
                if(token == '\n')
                    line++;
            }
            next();
        }

        // Link the last instruction to the next
        instr = lastInstr ? lastInstr.next : null;
        if(instr)
        {
            if(firstInstr)
            {
                firstInstr.next = instr;
                linkedInstrQueue.push(firstInstr);
            }
            else if(instr.address != baseAddr)
            {
                linkedInstrQueue.push(instr);
                instr.address = baseAddr;
            }

            if(currSyntax.prefix != instr.syntax.prefix || currSyntax.intel != instr.syntax.intel)
            {
                // Syntax has been changed, we have to recompile some of the source
                let nextSyntaxChange = instr.next;
                while(nextSyntaxChange.next && !nextSyntaxChange.next.switchSyntax)
                    nextSyntaxChange = nextSyntaxChange.next;
                
                this.compile(range.slice(this.source), {
                    haltOnError,
                    range: instr.range.until(nextSyntaxChange.range),
                    doSecondPass: false
                });
            }
        }

        if(doSecondPass)
            this.secondPass(haltOnError);
    }

    // Run the second pass on the instruction list
    secondPass(haltOnError = false)
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
                    queueRecomp(ref);
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
                        instr.wantsRecomp = false;
                        instr.recompile();
                    }
                    catch(e)
                    {
                        instr.error = e;

                        // When a symbol is invalidated, all references to it should be too
                        if(instr.name)
                            for(let ref of symbols.get(instr.name).references)
                                queueRecomp(ref);
                    }
                }
                currIndex = instr.address + instr.length;
                instr = instr.next;
            } while(instr && instr.address != currIndex);
        }

        // Error collection
        let haltingErrors = [], lastInstr = null;
        this.iterate((instr, line) => {
            lastInstr = instr;
            if(instr.outline && instr.outline.operands)
                for(let op of instr.outline.operands)
                    op.attemptedSizes = op.attemptedUnsignedSizes = 0;

            let e = instr.error;
            if(e)
            {
                if(haltOnError)
                    haltingErrors.push(`Error on line ${line}: ${e.message}`);

                /* Errors whose pos can't be determined should be logged,
                not marked (these are usually internal compiler errors) */
                if(!e.range)
                {
                    console.error(`Error on line ${line}:\n`, e);
                    instr.error = null;
                }
            }
        });

        if(haltingErrors.length > 0)
            throw haltingErrors.join('\n');
        
        this.bytes = lastInstr ? lastInstr.address + lastInstr.length - baseAddr : 0;
    }

    dump()
    {
        let output, i = 0;

        // Use the available byte array type
        try { output = Buffer.alloc(this.bytes); }
        catch(e) { output = new Uint8Array(this.bytes); }

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
}