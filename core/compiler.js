import { ASMError, token, next, match, loadCode, currRange, currSyntax, setSyntax, prevRange, line, comment, Range, startAbsRange } from "./parser.js";
import { Directive, isDirective } from "./directives.js";
import { Instruction, Prefix, prefixes } from "./instructions.js";
import { Symbol, recompQueue, queueRecomp, loadSymbols, symbols } from "./symbols.js";
import { Comment, Statement } from "./statement.js";

var linkedInstrQueue = [];

export const baseAddr = 0x400078;

var prevInstr = null;

/** @param {Statement} instr */
function addInstruction(instr, seekEnd = true)
{
    prevInstr = instr;
    setSyntax(instr.syntax);

    if(seekEnd && token != '\n' && token != ';')
    {
        // Special case: this error should appear but not remove the instruction's bytes
        instr.error = new ASMError("Expected end of line");
        while(token != '\n' && token != ';')
            next();
    }

    instr.range.length = currRange.end - instr.range.start - (seekEnd ? 1 : 0);
}

export class AssemblyState
{
    /**
     * @param {Object} config
     * @param {boolean} config.intel Set to true for Intel syntax, false for AT&T syntax. Defaults to false
     */
    constructor({
        intel = false
    } = {})
    {
        /** @type {Map<string, SymbolRecord>} */
        this.symbols = new Map();

        /** @type {Statement} */
        this.instructions = new Statement();
        this.instructions.syntax = {
            intel,
            prefix: !intel
        }

        /** @type {string} */
        this.source = '';

        /** @type {Range} */
        this.compiledRange = new Range();

        this.bytes = 0;
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
        
        loadSymbols(this.symbols);

        let headInstr = this.instructions, lastInstr = null, tailInstr = null;
        let instr = this.instructions.next;
        let changeOffset = source.length - range.length;

        /* Selecting the instruction range that is replaced by the edit.
        headInstr: the last instruction before the edit
        lastInstr: the last instruction in the edit
        tailInstr: the first instruction after the edit */
        while(instr)
        {
            if(instr.range.end < range.start) // Before the edit
                headInstr = instr;
            else if(instr.range.start <= range.end) // Inside the edit
            {
                lastInstr = instr;
                if(instr.range.end >= range.end)
                    instr.range.length += changeOffset;
                instr.remove();
            }
            else // After the edit
            {
                if(tailInstr === null)
                    tailInstr = instr;
                
                instr.range.start += changeOffset;
            }

            instr = instr.next;
        }

        // Expand the range a bit so as not to cut off the first and last instructions
        if(lastInstr)
        {
            if(range.start > headInstr.next.range.start)
                range.start = headInstr.next.range.start;
            range = range.until(lastInstr.range);
        }
        else if(tailInstr)
            range.length = tailInstr.range.start - range.start - 1;
        else
            range.length = source.length;
        
        headInstr.next = null;
        setSyntax(headInstr.syntax);
        loadCode(this.source, range.start);

        prevInstr = headInstr;
        
        while(match && currRange.end <= range.end)
        {
            let pos = startAbsRange();
            try
            {
                if(token != '\n' && token != ';')
                {
                    let lowerTok = token.toLowerCase();
                    let isDir = false;
                    if(currSyntax.intel)
                    {
                        if(token[0] == '%')
                        {
                            isDir = true;
                            lowerTok += next().toLowerCase();
                        }
                        else
                            isDir = isDirective(lowerTok, true);
                    }
                    else
                        isDir = token[0] == '.';
                    
                    if(isDir) // Assembler directive
                    {
                        if(currSyntax.intel ?
                            lowerTok == '%assign'
                            :
                            lowerTok == '.equ' || lowerTok == '.set')
                        {
                            let opcode = next();
                            let opcodePos = currRange;
                            if(!currSyntax.intel && next() !== ',')
                                throw new ASMError("Expected ','");
                            addInstruction(new Symbol(prevInstr, opcode, pos, opcodePos));
                        }
                        else
                            addInstruction(new Directive(prevInstr, currSyntax.intel ? token : token.slice(1), pos));
                    }
                    else if(prefixes.hasOwnProperty(lowerTok)) // Prefix
                        addInstruction(new Prefix(prevInstr, lowerTok, pos), false);
                    else // Instruction, label or symbol
                    {
                        let opcode = token;
                        next();

                        if(token == ':') // Label definition
                            addInstruction(new Symbol(prevInstr, opcode, pos, pos, true), false);
                        else if(token == '=' || currSyntax.intel && token.toLowerCase() == 'equ') // Symbol definition
                            addInstruction(new Symbol(prevInstr, opcode, pos, pos));
                        else if(currSyntax.intel && isDirective(token, true)) // "<label> <directive>"
                        {
                            addInstruction(new Symbol(prevInstr, opcode, pos, pos, true), false);
                            addInstruction(new Directive(prevInstr, token, pos));
                        }
                        else // Instruction
                            addInstruction(new Instruction(prevInstr, opcode.toLowerCase(), pos));
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
                    addInstruction(new Statement(prevInstr, 0, pos, e));
            }
            if(comment)
            {
                let start = currRange;
                while(next() != '\n');
                addInstruction(new Comment(prevInstr, start.until(currRange)));
            }
            next();
        }

        // Delete the replaced instructions
        instr = tailInstr;
        while(instr && instr.range.start < currRange.start)
        {
            instr.remove();
            instr = instr.next;
        }

        if(instr)
        {
            // Link the last instruction to the next
            prevInstr.next = instr;
            linkedInstrQueue.push(prevInstr);

            if(currSyntax.prefix != instr.syntax.prefix || currSyntax.intel != instr.syntax.intel)
            {
                // Syntax has been changed, we have to recompile some of the source
                let nextSyntaxChange = instr;
                while(nextSyntaxChange.next && !nextSyntaxChange.next.switchSyntax)
                    nextSyntaxChange = nextSyntaxChange.next;
                
                const recompRange = instr.range.until(nextSyntaxChange.range);
                
                this.compile(recompRange.slice(this.source), {
                    haltOnError,
                    range: recompRange,
                    doSecondPass: false
                });
            }
        }

        this.compiledRange = range.until(prevRange);

        if(doSecondPass)
            this.secondPass(haltOnError);
    }

    // Run the second pass on the instruction list
    secondPass(haltOnError = false)
    {
        let currIndex = baseAddr, instr;
        loadSymbols(this.symbols);

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
        let output, i = 0, instr = this.instructions;

        // Use the available byte array type
        try { output = Buffer.alloc(this.bytes); }
        catch(e) { output = new Uint8Array(this.bytes); }

        while(instr = instr.next)
            for(let j = 0; j < instr.length; j++)
                output[i++] = instr.bytes[j];

        return output;
    }

    line(line)
    {
        if(line-- < 1)
            throw "Invalid line";
        let start = 0;
        while(line)
        {
            start = this.source.indexOf('\n', start) + 1;
            if(start == 0)
                return new Range(this.source.length + line, 0);
            line--;
        }

        let end = this.source.indexOf('\n', start);
        if(end < 0)
            end = this.source.length;
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
        let line = 1, nextLine = 0, instr = this.instructions.next;
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
     * @param {Uint8Array[]} bytes
     * @param {Number} line
    */
    /** @param {lineCallback} func */
    bytesPerLine(func)
    {
        let lineQueue = [];
        let line = 1, nextLine = 0, instr = this.instructions.next;
        while(nextLine != Infinity)
        {
            let bytes = [];
            nextLine = this.source.indexOf('\n', nextLine) + 1 || Infinity;
            if(lineQueue.length > 0)
            {
                const line = lineQueue.shift();
                if(line.length > 0)
                    bytes.push(line);
            }

            while(instr && instr.range.start < nextLine)
            {
                if(instr.hasOwnProperty('lineEnds'))
                {
                    let prevEnd = 0;
                    for(const end of instr.lineEnds.lineEnds)
                    {
                        if(end <= instr.length)
                            lineQueue.push(instr.bytes.subarray(prevEnd, end));
                        prevEnd = end;
                    }
                    if(lineQueue.length > 0)
                    {
                        const line = lineQueue.shift();
                        if(line.length > 0)
                            bytes.push(line);
                    }
                }
                else if(instr.length > 0)
                    bytes.push(instr.bytes.subarray(0, instr.length));
                instr = instr.next;
            }
            func(bytes, line);
            line++;
        }
    }
}