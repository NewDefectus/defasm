import { token, next, match, loadCode, currRange, currSyntax, setSyntax, defaultSyntax, prevRange, line, comment } from "./parser.js";
import { Directive, intelDirectives } from "./directives.js";
import { Instruction, Prefix, prefixes } from "./instructions.js";
import { Symbol, recompQueue, queueRecomp } from "./symbols.js";
import { ASMError, Comment, Range, Statement } from "./statement.js";

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
function addInstruction(instr, seekEnd = true)
{
    firstInstr = instr;
    setSyntax(instr.syntax);

    if(seekEnd)
    {
        if(token != '\n' && token != ';')
        {
            // Special case: this error should appear but not remove the instruction's bytes
            instr.error = new ASMError("Expected end of line");
            while(token != '\n' && token != ';')
                next();
        }
    }

    instr.range = new Range(instr.range.start, currRange.end - instr.range.start - (seekEnd ? 1 : 0));
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

        /** @type {Range} */
        this.compiledRange = new Range();

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
        let line = 1, nextLine = 0, instr = this.instructionHead.next;
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

    /** @param {Number} pos */
    find(pos)
    {
        return this.instructionHead.next.find(pos);
    }

    /* Compile Assembly from source code into machine code */
    compile(source, {
        haltOnError = false,
        range = new Range(),
        doSecondPass = true } = {})
    {
        this.source =
            /* If the given range is outside the current
            code's span, fill the in-between with newlines */
            this.source.slice(0, range.start).padEnd(range.start, '\n') +
            source +
            this.source.slice(range.end);
        
        symbols = this.symbols;

        firstInstr = this.instructionHead;
        let lastInstr = null, tailInstr = null;
        let instr = this.instructionHead.next;
        let changeOffset = source.length - range.length;

        /* Selecting the instruction range that is replaced by the edit.
        firstInstr: the last instruction before the edit
        lastInstr: the last instruction in the edit
        tailInstr: the first instruction after the edit */
        while(instr)
        {
            if(instr.range.end < range.start)
                firstInstr = instr;
            else
            {
                if(instr.range.start <= range.end)
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
                    lastInstr = instr;
                }
                else if(tailInstr === null)
                    tailInstr = instr;

                if(instr.range.start > range.start)
                {
                    instr.range.start += changeOffset;
                    if(instr.error)
                        instr.error.range.start += changeOffset;
                }
                else if(changeOffset > 0)
                    instr.range.length += changeOffset;
            }

            instr = instr.next;
        }

        // Expand the range a bit so as not to cut off the first and last instructions
        if(lastInstr)
            range = firstInstr.next.range.until(lastInstr.range);
        else if(tailInstr)
            range.length = tailInstr.range.start - range.start - 1;
        else
            range.length = source.length;
        
        firstInstr.next = null;
        setSyntax(firstInstr ? firstInstr.syntax : defaultSyntax);
        loadCode(this.source, range.start);
        
        while(match && currRange.end <= range.end)
        {
            let pos = currRange;
            try
            {
                if(token != '\n' && token != ';')
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
                    else if(prefixes.hasOwnProperty(lowerTok)) // Prefix
                        addInstruction(new Prefix(firstInstr, lowerTok, pos), false);
                    else // Instruction, label or symbol
                    {
                        let opcode = token;
                        next();

                        if(token == ':') // Label definition
                            addInstruction(new Symbol(firstInstr, opcode, pos, true), false);
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
            }
            catch(e)
            {
                while(token != '\n' && token != ';')
                    next();
                    
                if(haltOnError && !doSecondPass)
                    throw `Error on line ${line}: ${e.message}`;
                if(!e.range)
                    console.error(`Error on line ${line}:\n`, e);
                else
                    addInstruction(new Statement(firstInstr, 0, pos, e));
            }
            if(comment)
            {
                let start = currRange;
                while(next() != '\n');
                addInstruction(new Comment(firstInstr, start.until(currRange)));
            }
            next();
        }

        this.compiledRange = range.until(prevRange);

        // Link the last instruction to the next
        instr = tailInstr;
        while(instr && instr.range.start < prevRange.end)
            instr = instr.next;

        if(instr)
        {    
            firstInstr.next = instr;
            linkedInstrQueue.push(firstInstr);

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