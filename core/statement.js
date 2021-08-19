import { currSection } from "./compiler.js";
import { ASMError, currSyntax, Range } from "./parser.js";

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

    get length()
    {
        return (this.statement ? this.statement.length : 0) + (this.next ? this.next.length : 0);
    }

    dump()
    {
        let output, i = 0, node = this;

        // Use the available byte array type
        try { output = Buffer.alloc(this.length); }
        catch(e) { output = new Uint8Array(this.length); }

        while(node)
        {
            for(let j = 0; j < node.length; j++)
                output[i++] = node.bytes[j];
            node = node.next;
        }

        return output;
    }

    /** @returns {StatementNode} */
    last()
    {
        if(this.next)
            return this.next.last();
        return this;
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
     * @param {Number} addr
     * @param {Number} maxSize
     * @param {Range} range
     * @param {ASMError?} error */
    constructor(addr = 0, maxSize = 0, range = new Range(), error = null)
    {
        this.id = totalStatements++; // Each Statement gets a unique ID
        
        this.error = error;
        this.range = range;
        this.length = 0;
        this.bytes = new Uint8Array(maxSize);
        this.syntax = currSyntax;
        this.address = addr;
        this.section = currSection;

        this.sectionNode = new StatementNode(this);
    }

    remove()
    {
        this.removed = true;
    }
}

export class Comment extends Statement
{
    constructor(prev, range)
    {
        super(prev, 0, range);
    }
}