import { Statement } from "./statement.js";
/** @type {string} */          export var code;
/** @type {boolean} */         export var comment;
/** @type {RelativeRange} */   export var currRange;
/** @type {Number} */          export var line;
/** @type {RegExpExecArray} */ export var match;
/** @type {RelativeRange} */   export var prevRange;
/** @type {string} */          export var token;

/** @type {Range?} */
var parentRange = null;

export const defaultSyntax = {
    intel: false,
    prefix: true,
    /** @type {Statement?} */ definer: null
}
export var currSyntax = defaultSyntax;
export function setSyntax(syntax)
{
    currSyntax = syntax;
}

export function startAbsRange()
{
    return parentRange = currRange.abs();
}

const tokenizer = /(["'])(\\(.|\n|$)|[^\\])*?(\1|$)|>>|<<|\|\||&&|>=|<=|<>|==|!=|[\w.]+|[\S\n]/g;

/** @param {string} source */
export function loadCode(source, index = 0)
{
    tokenizer.lastIndex = index;
    code = source;

    line = (source.slice(0, index).match(/\n/g) || []).length + 1;

    next = defaultNext;
    parentRange = currRange = new Range(index, 0);
    match = 1; next();
}

var defaultNext = () => {
    prevRange = currRange;
    if(!match) // Make sure not to loop around
        return null;
    
    comment = false;
    match = tokenizer.exec(code);
    if(match)
    {
        token = match[0];
        currRange = new RelativeRange(parentRange, match.index, token.length);
        if(token == (currSyntax.intel ? ';' : '#'))
        {
            comment = true;
            token = ';';
        }
    }
    else
    {
        token = '\n';
        currRange = new RelativeRange(parentRange, code.length, 1);
    }

    line += (token.match(/\n/g) || []).length;
    return token;
}

export var next = defaultNext;

// Highly unhygienic. You shouldn't put the token back on the stack after you touched it.
// I recommend washing your hands after you use this thing.
export function ungetToken()
{
    let t = token, p = currRange, oldNext = next;
    currRange = prevRange;
    next = () => token = (next = oldNext, currRange = p, t);
}

export function setToken(tok, range = currRange)
{
    token = tok;
    currRange = range;
}


export class Range
{
    constructor(start = 0, length = 0)
    {
        if(start < 0 || length < 0)
            throw `Invalid range ${start} to ${start + length}`;
        this._start = start;
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

    get start() { return this._start; }
    set start(val) { this._start = val; }

    get end() { return this.start + this.length; }
}

class RelativeRange extends Range
{
    constructor(parent, start, length)
    {
        super(start - parent.start, length);
        this.parent = parent;
    }

    get start() { return this.parent.start + this._start; }
    set start(val) { this._start = val - this.parent.start; }

    abs()
    {
        return new Range(this.start, this.length);
    }

    until(end)
    {
        return new RelativeRange(this.parent, this.start, end.end - this.start);
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