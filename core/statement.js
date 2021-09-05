import { currSection } from "./compiler.js";
import { ASMError, currSyntax, Range } from "./parser.js";
import { RelocEntry, signed32 } from "./relocations.js";
import { pseudoSections, Section } from "./sections.js";

var totalStatements = 0;

/**
 * @typedef {Object} InstructionRange
 * @property {StatementNode} head The last instruction before the range
 * @property {StatementNode} prev The last compiled instruction
 * @property {StatementNode} tail The first instruction after the range
 */

export class StatementNode
{
    /** @param {Statement?} statement */
    constructor(statement = null)
    {
        this.statement = statement;
        /** @type {StatementNode?} */
        this.next = null;
    }

    /**
     * @param {Number} pos
     * @returns {StatementNode?} */
    find(pos)
    {
        if(this.statement && this.statement.range.includes(pos))
            return this;
        return this.next?.find(pos);
    }

    length()
    {
        let node = this, length = 0;
        while(node)
        {
            if(node.statement)
                length += node.statement.length;
            node = node.next;
        }
        return length;
    }

    dump()
    {
        let output, i = 0, node = this;

        // Use the available byte array type
        try { output = Buffer.alloc(this.length()); }
        catch(e) { output = new Uint8Array(this.length()); }

        while(node)
        {
            if(node.statement)
            {
                output.set(node.statement.bytes.subarray(0, node.statement.length), i);
                i += node.statement.length;
            }
            node = node.next;
        }

        return output;
    }

    /** Select the instruction range that is affected by a given range
     * @param {Range} range
     * @param {boolean} update
     * @param {Number} sourceLength
     * @returns {InstructionRange}
     */
    getAffectedArea(range, update = false, sourceLength = 0)
    {
        let node = this;
        let head = this, last = null, tail = null;
        let changeOffset = sourceLength - range.length;
        while(node)
        {
            let instr = node.statement;
            if(instr)
            {
                if(instr.range.end < range.start) // Before the range
                    head = node;
                else if(instr.range.start <= range.end) // Inside the range
                {
                    last = node;
                    if(update)
                    {
                        if(instr.range.end >= range.end)
                            instr.range.length += changeOffset;
                        instr.remove();
                    }
                }
                else // After the range
                {
                    if(tail === null)
                        tail = node;
                    
                    if(update)
                        instr.range.start += changeOffset;
                }
            }

            node = node.next;
        }

        if(update)
        {
            // Expand the range a bit so as not to cut off the first and last instructions
            if(last)
            {
                range.start = Math.min(range.start, head.next.statement.range.start);
                range.length = last.statement.range.end - range.start;
            }
            else if(tail)
                range.length = tail.statement.range.start - range.start - 1;
            else
                range.length = sourceLength;
        }
        
        return { head, prev: head, tail };
    }
}

export class Statement
{
    /**
     * @param {Object} config
     * @param {Number} config.addr
     * @param {Number} config.maxSize
     * @param {Range} config.range
     * @param {ASMError?} config.error
     * @param {Section} config.section */
    constructor({ addr = 0, maxSize = 0, range = new Range(), error = null, section = currSection, syntax = currSyntax } = {})
    {
        this.id = totalStatements++; // Each Statement gets a unique ID
        
        this.error = error;
        this.range = range;
        this.length = 0;
        this.bytes = new Uint8Array(maxSize);
        this.syntax = syntax;
        this.address = addr;
        this.section = section;

        this.sectionNode = new StatementNode(this);

        /** @type {RelocEntry[]}  */
        this.relocations = [];
    }

    clear()
    {
        this.length = 0;
        this.relocations = [];
    }

    /** @param {BigInt|Number} byte */
    genByte(byte)
    {
        this.bytes[this.length++] = Number(byte);
    }

    /**
     * @param {import("./shuntingYard.js").IdentifierValue} value
     * @param {Number} size
     * @param {boolean} signed
     * @param {boolean} sizeRelative
     * @param {boolean} functionAddr
     */
    genValue(value, size, signed = false, sizeRelative = false, functionAddr = false)
    {
        let sizeReduction = sizeRelative ? BigInt(this.length + size / 8) : 0n;
        let num = 0n;
        
        if(value.isRelocatable())
            this.relocations.push({
                offset: this.length,
                sizeReduction,
                value,
                size: (signed && !value.pcRelative) && size == 32 ? signed32 : size,
                pcRelative: value.pcRelative,
                functionAddr: functionAddr && value.section == pseudoSections.UND,
            });
        else
            num = value.addend - sizeReduction;

        do
        {
            this.genByte(num & 0xffn);
            num >>= 8n;
        } while(size -= 8);
    }

    remove()
    {
        this.removed = true;
    }
}