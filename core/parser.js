var srcTokens;
export var match;
export var token;
export var codePos;
var lastLineIndex = 0;

var prevCodePos;

export const defaultSyntax = { intel: false, prefix: true }
export var currSyntax = defaultSyntax;
export function setSyntax(syntax)
{
    currSyntax = syntax;
}

export function loadCode(code)
{
    srcTokens = code.matchAll(/(["'])(\\(.|$)|[^\\])*?(\1|$)|>>|<<|\|\||&&|>=|<=|<>|==|!=|[\w.]+|[\S\n]/g);

    next = defaultNext;
    lastLineIndex = 0;
    prevCodePos = codePos = {start: 0, length: 0};
    next();
}

var defaultNext = () => {
    match = srcTokens.next();
    if(match.done)
        return token = '\n';
    
    prevCodePos = codePos;
    token = match.value[0];
    if(token == '\n')
        lastLineIndex = match.value.index + 1;
    else if(token == (currSyntax.intel ? ';' : '#'))
    {
        while(!match.done && match.value[0] != '\n')
            match = srcTokens.next();
        if(!match.done)
            lastLineIndex = match.value.index + 1;
        token = '\n';
    }
    else
        codePos = { start: match.value.index - lastLineIndex, length: token.length };
    return token;
}

export var next = defaultNext;

// Highly unhygienic. You shouldn't put the token back on the stack after you touched it.
// I recommend washing your hands after you use this thing.
export function ungetToken()
{
    let t = token, p = codePos, oldNext = next;
    codePos = prevCodePos;
    next = () => token = (next = oldNext, codePos = p, t);
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