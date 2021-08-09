import { Range } from "./statement.js";
/** @type {string} */          export var code;
/** @type {boolean} */         export var comment;
/** @type {Range} */           export var currRange;
/** @type {Number} */          export var line;
/** @type {RegExpExecArray} */ export var match;
/** @type {Range} */           export var prevRange;
/** @type {string} */          export var token;

export const defaultSyntax = { intel: false, prefix: true }
export var currSyntax = defaultSyntax;
export function setSyntax(syntax)
{
    currSyntax = syntax;
}

const tokenizer = /(["'])(\\(.|$)|[^\\])*?(\1|$)|>>|<<|\|\||&&|>=|<=|<>|==|!=|[\w.]+|[\S\n]/g;

/** @param {string} source */
export function loadCode(source, index = 0)
{
    tokenizer.lastIndex = index;
    code = source;

    line = (source.slice(0, index).match(/\n/g) || []).length + 1;

    next = defaultNext;
    prevRange = currRange = new Range(index, 0);
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
        currRange = new Range(match.index, token.length);
        if(token == (currSyntax.intel ? ';' : '#'))
        {
            comment = true;
            token = ';';
        }
    }
    else
    {
        token = '\n';
        currRange = new Range(code.length, 1);
    }

    if(token == '\n')
        line++;
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

export function setToken(tok)
{
    token = tok;
}