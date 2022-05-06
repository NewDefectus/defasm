import { ASMError, token, next, match, loadCode, currRange, currSyntax, setSyntax, prevRange, line, comment, Range, startAbsRange, RelativeRange, ungetToken } from "./parser.js";
import { isDirective, makeDirective } from "./directives.js";
import { Instruction, Prefix, prefixes } from "./instructions.js";
import { SymbolDefinition, recompQueue, queueRecomp, loadSymbols, symbols } from "./symbols.js";
import { Statement, StatementNode } from "./statement.js";
import { loadSections, Section, sectionFlags, sections } from "./sections.js";

/** @type {StatementNode} */ var prevNode = null;
/** @type {Section}       */ export var currSection = null;

var addr = 0;

/** @param {Section} section */
function setSection(section)
{
    currSection = section;
    const prevInstr = section.cursor.prev.statement;
    return prevInstr.address + prevInstr.length;
}

/** @param {Statement} instr */
function addInstruction(instr, seekEnd = true)
{
    if(instr.section !== currSection)
        instr.address = setSection(instr.section);
        
    prevNode                = prevNode.next                = new StatementNode(instr);
    currSection.cursor.prev = currSection.cursor.prev.next = instr.sectionNode;
    setSyntax(instr.syntax);

    if(seekEnd && token != '\n' && token != ';')
    {
        // Special case: this error should appear but not remove the instruction's bytes
        instr.error = new ASMError("Expected end of line");
        while(token != '\n' && token != ';')
            next();
    }

    addr = instr.address + instr.length;
    instr.range.length = (seekEnd ? currRange.start : currRange.end) - instr.range.start;
}

/**
 * @typedef {Object} AssemblyConfig
 * @property {import('@defasm/core/parser.js').Syntax} config.syntax The initial syntax to use
 * @property {boolean} config.writableText Whether the .text section should be writable
 */

export class AssemblyState
{ 
    /** @param {AssemblyConfig} */
    constructor({
        syntax = {
            intel: false,
            prefix: true
        },
        writableText = false
    } = {})
    {
        this.defaultSyntax = syntax;

        /** @type {Map<string, import("./symbols.js").Symbol>} */
        this.symbols = new Map();
        /** @type {string[]} */
        this.fileSymbols = [];

        setSyntax(syntax);
        loadSymbols(this.symbols, this.fileSymbols);

        /** @type {Section[]} */
        this.sections = [
            new Section('.text'),
            new Section('.data'),
            new Section('.bss')
        ];

        if(writableText)
            this.sections[0].flags |= sectionFlags.w;

        this.head = new StatementNode();

        /** @type {string} */
        this.source = '';

        /** @type {Range} */
        this.compiledRange = new Range();

        /** @type {ASMError[]} */
        this.errors = [];
    }

    /** Compile Assembly from source code into machine code 
     * @param {string} source
    */
    compile(source, {
        haltOnError = false,
        range: replacementRange = new Range(),
        doSecondPass = true } = {})
    {
        this.source =
            /* If the given range is outside the current
            code's span, fill the in-between with newlines */
            this.source.slice(0, replacementRange.start).padEnd(replacementRange.start, '\n') +
            source +
            this.source.slice(replacementRange.end);
        
        loadSymbols(this.symbols, this.fileSymbols);
        loadSections(this.sections, replacementRange);

        let { head, tail } = this.head.getAffectedArea(replacementRange, true, source.length);
        
        setSyntax(head.statement ? head.statement.syntax : this.defaultSyntax);
        addr = setSection(head.statement ? head.statement.section : this.sections[0]);
        loadCode(this.source, replacementRange.start);

        prevNode = head;
        
        while(match)
        {
            let range = startAbsRange();
            try
            {
                if(token != '\n' && token != ';')
                {
                    let name = token;
                    next();
                    if(token == ':') // Label definition
                        addInstruction(new SymbolDefinition({ addr, name, range, isLabel: true }), false);
                    else if(token == '=' || currSyntax.intel && token.toLowerCase() == 'equ') // Symbol definition
                        addInstruction(new SymbolDefinition({ addr, name, range }));
                    else
                    {
                        let isDir = false;
                        if(currSyntax.intel)
                        {
                            if(name[0] == '%')
                            {
                                isDir = true;
                                name += token.toLowerCase();
                                next();
                            }
                            else
                                isDir = isDirective(name, true);
                        }
                        else
                            isDir = name[0] == '.';
                        
                        if(isDir) // Assembler directive
                            addInstruction(makeDirective({ addr, range }, currSyntax.intel ? name : name.slice(1)));
                        else if(prefixes.hasOwnProperty(name.toLowerCase())) // Prefix
                        {
                            ungetToken();
                            addInstruction(new Prefix({ addr, range, name }), false);
                        }
                        else if(currSyntax.intel && isDirective(token, true)) // "<label> <directive>"
                        {
                            addInstruction(new SymbolDefinition({ addr, name, range, isLabel: true }), false);
                            name = token; range = startAbsRange();
                            next();
                            addInstruction(makeDirective({ addr, range }, name));
                        }
                        else // Instruction
                            addInstruction(new Instruction({ addr, name, range }));
                    }
                }
            }
            catch(error)
            {
                while(token != '\n' && token != ';')
                    next();
                    
                if(haltOnError && !(doSecondPass && error.range))
                    throw `Error on line ${line}: ${error.message}`;
                if(!error.range)
                    console.error(`Error on line ${line}:\n`, error);
                else
                    addInstruction(new Statement({ addr, range, error }), !comment);
            }
            if(comment)
                addInstruction(new Statement({ addr, range: startAbsRange() }), false);
            next();
            if(currRange.end > replacementRange.end)
                break;
        }


        // Correct the tails' positions, in case more instructions were parsed than initially thought
        for(const section of sections)
        {
            let node = section.cursor.tail;
            while(node && node.statement.range.start < currRange.start)
                node = node.next;
            section.cursor.tail = node;
        }

        while(tail && tail.statement.range.start < currRange.start)
        {
            tail.statement.remove();
            tail = tail.next;
        }

        // If a replacement causes a section's span to change, this will correct the cursors
        if(tail && currSection !== tail.statement.section && !tail.statement.switchSection)
        {
            let tailSection = tail.statement.section;
            let node = tailSection.cursor.tail;
            currSection.cursor.tail = node;
            while(node && !node.statement.switchSection)
            {
                node.statement.section = currSection;
                node = node.next;
            }
            tailSection.cursor.tail = node;
        }

        // Link the cursors' last nodes to their tail nodes
        for(const section of sections)
        {
            let prev = section.cursor.prev;
            prev.next = section.cursor.tail;

            /* To update the addresses following the insertion, add the last
            inserted statement to the recompilation queue.
            We don't call queueRecomp because that function also marks the
            statement as wanting recompilation, which it doesn't - it's only
            queued so it can update the addresses of the proceeding statements. */
            if(prev.next)
                recompQueue.push(prev);
        }
        
        prevNode.next = tail;

        if(tail)
        {
            let instr = tail.statement;

            if((currSyntax.prefix != instr.syntax.prefix || currSyntax.intel != instr.syntax.intel) && !instr.switchSyntax)
            {
                // Syntax has been changed, we have to recompile some of the source
                let nextSyntaxChange = tail;
                while(nextSyntaxChange.next && !nextSyntaxChange.next.switchSyntax)
                    nextSyntaxChange = nextSyntaxChange.next;
                
                const recompStart = prevNode.statement.range.end;
                const recompRange = new Range(recompStart, nextSyntaxChange.statement.range.end - recompStart);
                
                this.compile(recompRange.slice(this.source), {
                    haltOnError,
                    range: recompRange,
                    doSecondPass: false
                });
            }
        }

        this.compiledRange = replacementRange.until(prevRange);

        if(doSecondPass)
            this.secondPass(haltOnError);
    }

    // Run the second pass on the instruction list
    secondPass(haltOnError = false)
    {
        addr = 0;
        let node;
        loadSymbols(this.symbols);

        symbols.forEach((symbol, name) => {
            symbol.references = symbol.references.filter(instr => !instr.removed);
            symbol.definitions = symbol.definitions.filter(instr => !instr.removed);
            if((symbol.statement === null || symbol.statement.error) && symbol.references.length == 0 && symbol.definitions.length == 0)
                symbols.delete(name);
        });

        /* For efficiency (and also to fix certain edge cases), we'll make sure
        to recompile in order of statement address. */
        recompQueue.sort((a, b) => a.statement.address - b.statement.address);

        while(node = recompQueue.shift())
        {
            addr = node.statement.address;
            do
            {
                let instr = node.statement;
                if(instr)
                {
                    instr.address = addr;
                    if((instr.wantsRecomp || instr.ipRelative) && !instr.removed)
                    {
                        // Recompiling the instruction
                        try
                        {
                            instr.wantsRecomp = false;
                            instr.recompile();
                        }
                        catch(e)
                        {
                            instr.error = e;

                            // When a symbol is invalidated, all references to it should be too
                            if(instr.symbol)
                                for(const ref of instr.symbol.references)
                                    queueRecomp(ref);
                        }
                    }
                    addr = instr.address + instr.length;
                }
                node = node.next;
            } while(node && node.statement.address != addr);
        }

        // Error collection
        this.errors = [];
        const reportedErrors = []
        this.iterate((instr, line) => {
            if(instr.outline && instr.outline.operands)
                for(let op of instr.outline.operands)
                    op.clearAttemptedSizes();

            const error = instr.error;
            if(error)
            {
                this.errors.push(error);

                /* Errors whose pos can't be determined should be logged
                to the console (these are usually internal compiler errors) */
                if(!error.range)
                {
                    console.error(`Error on line ${line}:\n`, error);
                    error.range = new RelativeRange(instr.range, instr.range.start, instr.range.length);
                }
                reportedErrors.push({ line, error });
            }
        });

        if(haltOnError && reportedErrors.length > 0)
            throw reportedErrors.map(({ error, line }) => {
                const linePart = `Error on line ${line}: `;
                return linePart + (error.range.parent ?? error.range).slice(this.source) +
                '\n' + ' '.repeat(linePart.length + (error.range.parent ? error.range.start - error.range.parent.start : 0)) +
                '^ ' + error.message
            }).join('\n\n');
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
        let line = 1, nextLine = 0, node = this.head.next;
        while(nextLine != Infinity)
        {
            nextLine = this.source.indexOf('\n', nextLine) + 1 || Infinity;
            while(node && node.statement.range.end < nextLine)
            {
                func(node.statement, line);
                node = node.next;
            }
            line++;
        }
    }

    /**
     * @callback lineCallback
     * @param {{section: Section, bytes: Uint8Array}[]} buffers
     * @param {Number} line
    */
    /** @param {lineCallback} func */
    bytesPerLine(func)
    {
        let lineQueue = [];
        let line = 1, nextLine = 0, node = this.head.next;
        while(nextLine != Infinity)
        {
            let buffers = [];
            nextLine = this.source.indexOf('\n', nextLine) + 1 || Infinity;
            if(lineQueue.length > 0)
            {
                const line = lineQueue.shift();
                if(line.bytes.length > 0)
                    buffers.push(line);
            }

            while(node && node.statement.range.start < nextLine)
            {
                let instr = node.statement, prevEnd = 0;
                for(const end of [...instr.lineEnds, instr.length])
                {
                    if(end <= instr.length)
                        lineQueue.push({
                            section: instr.section,
                            bytes: instr.bytes.subarray(prevEnd, end)
                        });
                    prevEnd = end;
                }
                if(lineQueue.length > 0)
                {
                    const line = lineQueue.shift();
                    if(line.bytes.length > 0)
                        buffers.push(line);
                }
                node = node.next;
            }
            func(buffers, line);
            line++;
        }
    }
}