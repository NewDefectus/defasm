var srcTokens;
export var match;
export var token;
export var macros = new Map();
export var codePos;
var startPos = 0;

var prevCodePos;

export function loadCode(code, pos = 0)
{
    srcTokens = code.matchAll(/(["'])(\\.|[^\\\n])*?\1|>>|<<|\|\||&&|[\w.]+|#.*|[\S\n]/g);
    next = defaultNext;
    startPos = pos;
    prevCodePos = codePos = {start: startPos, length: 0};
}

var defaultNext = () =>
    token = (match = srcTokens.next()).done ? '\n' :
    (prevCodePos = codePos,
    codePos = {start: match.value.index + startPos, length: match.value[0].length},
    macros.has(match.value[0])) ?
        (insertTokens(macros.get(match.value[0])), next())
    :  match.value[0][0] === '#' ? next() : match.value[0];

export var next = defaultNext;

function insertTokens(tokens)
{
    let tokensCopy = [...tokens];
    next = () => token = tokensCopy.shift() || (next = defaultNext)();
}

// Highly unhygienic. You shouldn't put the token back on the stack after you touched it.
// I recommend washing your hands after you use this thing.
export function ungetToken()
{
    let t = token, p = codePos, oldNext = next;
    codePos = prevCodePos;
    next = () => token = (next = oldNext, codePos = p, t);
}

// Just a wee peek at the next token
export function peekNext()
{
    let oldToken = token, oldPos = codePos, nextToken = next();
    ungetToken();
    token = oldToken;
    codePos = oldPos;
    return nextToken;
}

export function setToken(tok)
{
    token = tok;
}


export function ParserError(message, startPos = codePos, endPos = startPos)
{
    this.message = message;
    this.pos = startPos.start;
    this.length = endPos.start + endPos.length - startPos.start;
}