import { Range } from "./statement.js";
/** @type {IterableIterator<RegExpMatchArray>} */   var srcTokens;
/** @type {IteratorResult<RegExpMatchArray>} */     export var match;
/** @type {string} */                               export var token;
/** @type {Range} */                                export var currRange;
/** @type {Range} */                                var prevRange;
var startIndex = 0;

export const defaultSyntax = { intel: false, prefix: true }
export var currSyntax = defaultSyntax;
export function setSyntax(syntax)
{
    currSyntax = syntax;
}

/** @param {string} code */
export function loadCode(code, index = 0)
{
    srcTokens = code.matchAll(/(["'])(\\(.|$)|[^\\])*?(\1|$)|>>|<<|\|\||&&|>=|<=|<>|==|!=|[\w.]+|[\S\n]/g);

    next = defaultNext;
    startIndex = index;
    prevRange = currRange = new Range();
    next();
}

var defaultNext = () => {
    match = srcTokens.next();
    prevRange = currRange;
    if(match.done)
        return token = '\n';
    
    token = match.value[0];
    if(token == (currSyntax.intel ? ';' : '#'))
    {
        while(!match.done && match.value[0] != '\n')
            match = srcTokens.next();
        token = '\n';
    }
    else
        currRange = new Range(startIndex + match.value.index, token.length);
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