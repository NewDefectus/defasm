import { baseAddr } from "./compiler.js";
import { currRange, defaultSyntax } from "./parser.js";

export class Range
{
    constructor(start = 0, length = 0)
    {
        if(start < 0 || length < 0)
            throw `Invalid range ${start} to ${start + length}`;
        this.start = start;
        this.length = length;
    }

    /** @param {Number} pos */
    includes(pos)
    {
        return this.end >= pos && pos >= this.start;
    }

    /** @param {Range} end */
    until(end)
    {
        return new Range(this.start, end.end - this.start);
    }

    /** @param {string} text */
    slice(text)
    {
        return text.slice(this.start, this.end);
    }

    get end()
    {
        return this.start + this.length;
    }
}

export class ASMError
{
    /**
     * @param {string} message The message this error holds
     * @param {Range} range The range of this error
     */
    constructor(message, range = currRange)
    {
        this.message = message;
        this.range = range;
    }
}

var totalStatements = 0;

export class Statement
{
    /**
     * @param {Statement} prev
     * @param {Number} maxSize 
     * @param {Range} range
     * @param {ASMError} error */
    constructor(prev = null, maxSize = 0, range = new Range(), error = null)
    {
        this.error = error;
        this.range = range;
        this.id = totalStatements++; // Each Statement gets a unique ID

        /** @type {Number} */
        this.length = 0;

        /** @type {Uint8Array} */
        this.bytes = new Uint8Array(maxSize);

        /** @type {Statement?} */
        this.next = null;

        if(prev)
        {
            prev.next = this;
            this.syntax = prev.syntax;

            /** @type {Number} */
            this.address = prev.address + prev.length;
        }
        else
        {
            this.syntax = defaultSyntax;
            this.address = baseAddr;
        }
    }

    /**
     * @param {Number} pos
     * @returns {Statement?} */
    find(pos)
    {
        if(this.range.includes(pos))
            return this;
        return this.next?.find(pos);
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