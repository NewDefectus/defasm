var srcTokens;
export var match;
export var token;
export var macros = new Map();

export function loadCode(code)
{
    srcTokens = code.matchAll(/(["'])(\\.|[^\\\n])*?\1|[\w.-]+|#.*|[\S\n]/g);
    next = defaultNext;
}

function lowerCase(str)
{
    if(str[0] == '"' || str[0] == "'")
        return str;
    return str.toLowerCase();
}

var defaultNext = () => 
    token = (match = srcTokens.next()).done ? '\n' :
    macros.has(match.value[0]) ?
        (insertTokens(macros.get(match.value[0])), next())
    :  match.value[0][0] === '#' ? next() : lowerCase(match.value[0]);

export var next = defaultNext;

function insertTokens(tokens)
{
    let tokensCopy = [...tokens];
    next = () => token = tokensCopy.shift() || (next = defaultNext)();
}

// Highly unhygienic. You shouldn't put the token back on the stack after you touched it.
// I recommend washing your hands after you use this thing.
export function ungetToken(t)
{
    let oldNext = next;
    next = () => token = (next = oldNext, t);
}

// Just a wee peek at the next token
export function peekNext()
{
    let oldToken = token, nextToken = next();
    ungetToken(nextToken);
    token = oldToken;
    return nextToken;
}

export function setToken(tok)
{
    token = tok;
}