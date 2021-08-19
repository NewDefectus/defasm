import { ASMError, token, next, match, loadCode, currRange, currSyntax, setSyntax, prevRange, line, comment, Range, startAbsRange } from "./parser.js";
import { Directive, isDirective } from "./directives.js";
import { Instruction, Prefix, prefixes } from "./instructions.js";
import { Symbol, recompQueue, queueRecomp, loadSymbols, symbols } from "./symbols.js";
import { Comment, Statement, StatementNode } from "./statement.js";
import { loadSections, Section, sections } from "./section.js";

var linkedInstrQueue = [];

/** @type {StatementNode} */ var prevNode = null;
/** @type {Section}       */ export var currSection = null;

var currAddr = 0;

/** @param {Section} section */
function setSection(section)
{
    currSection = section;
    let prevSectionNode = section.cursor.prev;
    if(prevSectionNode.statement)
        return prevSectionNode.statement.address + prevSectionNode.statement.length;
    return 0;
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

    currAddr = instr.address + instr.length;
    instr.range.length = currRange.end - instr.range.start - (seekEnd ? 1 : 0);
}

/**
 * @typedef {Object} AssemblyConfig
 * @property {import('@defasm/core/parser.js').Syntax} config.syntax The initial syntax to use
 */

export class AssemblyState
{ 
    /** @param {AssemblyConfig} */
    constructor({
        syntax = {
            intel: false,
            prefix: true
        }
    } = {})
    {
        this.defaultSyntax = syntax;

        /** @type {Map<string, import("./symbols.js").SymbolRecord>} */
        this.symbols = new Map();

        this.sections = {
            '.text': new Section('.text'),
            '.data': new Section('.data'),
            '.bss':  new Section('.bss')
        }

        this.data = new StatementNode();

        /** @type {string} */
        this.source = '';

        /** @type {Range} */
        this.compiledRange = new Range();

        /** @type {ASMError[]} */
        this.errors = [];
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
        loadSections(this.sections, range);

        let { head, tail } = this.data.getAffectedArea(range, true, source.length);
        
        setSyntax(head.statement ? head.statement.syntax : this.defaultSyntax);
        currAddr = setSection(head.statement ? head.statement.section : this.sections['.text']);
        loadCode(this.source, range.start);

        prevNode = head;
        
        while(match)
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
                            addInstruction(new Symbol(currAddr, opcode, pos, opcodePos));
                        }
                        else
                            addInstruction(new Directive(currAddr, currSyntax.intel ? token : token.slice(1), pos));
                    }
                    else if(prefixes.hasOwnProperty(lowerTok)) // Prefix
                        addInstruction(new Prefix(currAddr, lowerTok, pos), false);
                    else // Instruction, label or symbol
                    {
                        let opcode = token;
                        next();

                        if(token == ':') // Label definition
                            addInstruction(new Symbol(currAddr, opcode, pos, pos, true), false);
                        else if(token == '=' || currSyntax.intel && token.toLowerCase() == 'equ') // Symbol definition
                            addInstruction(new Symbol(currAddr, opcode, pos, pos));
                        else if(currSyntax.intel && isDirective(token, true)) // "<label> <directive>"
                        {
                            addInstruction(new Symbol(currAddr, opcode, pos, pos, true), false);
                            addInstruction(new Directive(currAddr, token, startAbsRange()));
                        }
                        else // Instruction
                            addInstruction(new Instruction(currAddr, opcode.toLowerCase(), pos));
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
                    addInstruction(new Statement(currAddr, 0, pos, e));
            }
            if(comment)
            {
                let start = startAbsRange();
                while(next() != '\n');
                addInstruction(new Comment(currAddr, start.until(currRange)));
            }
            next();
            if(currRange.end > range.end)
                break;
        }


        // Correct the tails' positions, in case more instructions were parsed than initially thought
        for(const name of Object.keys(sections))
        {
            let node = sections[name].cursor.tail;
            while(node && node.statement.range.start < currRange.start)
                node = node.next;
            sections[name].cursor.tail = node;
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
        for(const name of Object.keys(sections))
        {
            let prev = sections[name].cursor.prev;
            prev.next = sections[name].cursor.tail;
            linkedInstrQueue.push(prev);
        }
        
        prevNode.next = tail;

        if(tail)
        {
            let instr = tail.statement;

            if(currSyntax.prefix != instr.syntax.prefix || currSyntax.intel != instr.syntax.intel)
            {
                // Syntax has been changed, we have to recompile some of the source
                let nextSyntaxChange = tail;
                while(nextSyntaxChange.next && !nextSyntaxChange.next.switchSyntax)
                    nextSyntaxChange = nextSyntaxChange.next;
                
                const recompRange = tail.statement.range.until(nextSyntaxChange.statement.range);
                
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
        currAddr = 0;
        let node;
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

        while(node = linkedInstrQueue.shift() || recompQueue.shift())
        {
            currAddr = node.statement ? node.statement.address : 0;
            do
            {
                let instr = node.statement;
                if(instr)
                {
                    instr.address = currAddr;
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
                    currAddr = instr.address + instr.length;
                }
                node = node.next;
            } while(node && node.statement.address != currAddr);
        }

        // Error collection
        let haltingErrors = [], lastInstr = null;
        this.errors = [];
        this.iterate((instr, line) => {
            lastInstr = instr;
            if(instr.outline && instr.outline.operands)
                for(let op of instr.outline.operands)
                    op.attemptedSizes = op.attemptedUnsignedSizes = 0;

            let e = instr.error;
            if(e)
            {
                this.errors.push(e);
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
        
        this.bytes = lastInstr ? lastInstr.address + lastInstr.length - this.data.address : 0;
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
        let line = 1, nextLine = 0, node = this.data.next;
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
        let line = 1, nextLine = 0, node = this.data.next;
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
                let instr = node.statement;
                if(instr.hasOwnProperty('lineEnds'))
                {
                    let prevEnd = 0;
                    for(const end of instr.lineEnds.lineEnds)
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
                }
                else if(instr.length > 0)
                    buffers.push({
                        section: instr.section,
                        bytes: instr.bytes.subarray(0, instr.length)
                    });
                node = node.next;
            }
            func(buffers, line);
            line++;
        }
    }
}