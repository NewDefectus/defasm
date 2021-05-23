import { registers } from "./operands.js";
import { codePos, next, ParserError, setToken, token, ungetToken } from "./parser.js";

export var unaries = {
    '+': a=>a,
    '-': a=>-a,
    '~': a=>~a,
    '!': a=>!a,
};

export var operators = [
    {
        '*': (a,b)=>a*b,
        '/': (a,b)=>a/b,
        '%': (a,b)=>a%b,
        '<<':(a,b)=>a<<b,
        '>>':(a,b)=>a>>b,
    },
    {
        '|': (a,b)=>a|b,
        '&': (a,b)=>a&b,
        '^': (a,b)=>a^b,
        '!': (a,b)=>a|~b,
    },
    {
        '+': (a,b)=>a+b,
        '-': (a,b)=>a-b,
    },
    {
        '==':(a,b)=>a==b?-1:0,
        '<>':(a,b)=>a!=b?-1:0,
        '!=':(a,b)=>a!=b?-1:0,
        '<': (a,b)=>a<b?-1:0,
        '>': (a,b)=>a>b?-1:0,
        '>=':(a,b)=>a>=b?-1:0,
        '<=':(a,b)=>a<=b?-1:0,
    },
    {   '&&':(a,b)=>a&&b?1:0 },
    {   '||':(a,b)=>a||b?1:0 },
];

for(let i = 0; i < operators.length; i++)
{
    for(let op of Object.keys(operators[i]))
    {
        operators[i][op] = { func: operators[i][op], prec: i};
    }
}
operators = Object.assign({}, ...operators);

const stringEscapeSeqs = {
    'a': '\x07',
    'b': '\x08',
    'e': '\x1B',
    'f': '\x0C',
    'n': '\x0A',
    'r': '\x0D',
    't': '\x09',
    'v': '\x0B',
    '\\':'\x5C',
    '\'':'\x27',
    '"': '\x22',
    '?': '\x3F'
}


export var unescapeString = string => string.slice(1, -1)
.replace(/\\x[0-9a-f]{1,2}/ig, x => 
    String.fromCharCode(parseInt(x.slice(2), 16))
)
.replace(/\\[0-7]{1,3}/g, x => 
    String.fromCharCode(parseInt(x.slice(1), 8) & 255)
)
.replace(/\\u[0-9a-f]{1,8}/ig, x => {
    try {
        return String.fromCodePoint(parseInt(x.slice(2), 16))
    } catch(e) {
        return '';
    }
})
.replace(/\\./g, x => 
    stringEscapeSeqs[x.slice(1)] || ''
);


function parseNumber(asFloat = false)
{
    let value = asFloat ? 0 : 0n, floatPrec = asFloat ? 1 : 0;
    
    try
    {
        if(token === '\n')
            throw new ParserError("Expected value, got none");
        if(token[0] === "'" && token[token.length - 1] === "'")
        {
            let string = unescapeString(token); // Decode escape sequences
            // Parse as character constant
            let i = string.length;
            while(i--)
            {
                value <<= asFloat ? 8 : 8n;
                value += asFloat ? string.charCodeAt(i) : BigInt(string.charCodeAt(i));
            }
        }
        else if(isNaN(token))
        {
            if(token.length > 1 && !isNaN(token.slice(0, -1)))
            {
                if(token.endsWith('d')) floatPrec = 2, value = parseFloat(token);
                else if(token.endsWith('f')) floatPrec = 1, value = parseFloat(token);
                else
                {
                    codePos.start += codePos.length - 1;
                    codePos.length = 1;
                    throw new ParserError("Invalid number suffix");
                }
            }
            else if(registers[token] !== undefined) throw new ParserError("Registers must be prefixed with %");
            else // Label
            {
                let labelDependency = {name: token, pos: codePos};
                next();
                return {value: labelDependency, floatPrec: floatPrec };
            }
        }
        else if(token.includes('.') || asFloat) floatPrec = 1, value = parseFloat(token);
        else value = asFloat ? Number(token) : BigInt(token);

        if(next() === 'f') floatPrec = 1, next();
        else if(token === 'd') floatPrec = 2, next();

        return {value: value, floatPrec: floatPrec};
    }
    catch(e)
    {
        if(e.pos === undefined) throw new ParserError("Couldn't parse immediate: " + e);
        throw e;
    }
}





export function parseExpression(minFloatPrec = 0, expectMemory = false)
{
    let output = [], stack = [], lastOp, lastWasNum = false, hasLabelDependency = false;
    if(!expectMemory) next();
    while(token !== ',' && token !== '\n' && token !== ';')
    {
        if(!lastWasNum && unaries.hasOwnProperty(token)) // Unary operator
        {
            stack.push({pos: codePos, func: unaries[token], prec: -1});
            next();
        }
        else if(operators.hasOwnProperty(token)) // Operator
        {
            if(!lastWasNum)
            {
                // If expecting memory e.g. (%rax) the '%' goes in here
                if(expectMemory && stack.length > 0 && stack[stack.length - 1].bracket) break;
                throw new ParserError("Missing left operand");
            }
            lastWasNum = false;

            let op = Object.assign({pos: codePos}, operators[token]);
            while(lastOp = stack[stack.length - 1], lastOp && lastOp.prec <= op.prec && !lastOp.bracket)
                output.push(stack.pop());
            stack.push(op);
            next();
        }
        else if(unaries.hasOwnProperty(token)) throw new ParserError("Unary operator can't be used here");
        else if(token === '(')
        {
            if(lastWasNum)
            {
                if(expectMemory) break;
                throw new ParserError("Unexpected parenthesis");
            }
            stack.push({pos: codePos, bracket: true });
            next();
        }
        else if(token === ')')
        {
            if(!lastWasNum)
                throw new ParserError("Missing right operand", stack.length ? stack[stack.length - 1].pos : codePos);
            while(lastOp = stack[stack.length - 1], lastOp && !lastOp.bracket)
                output.push(stack.pop());
            if(!lastOp || !lastOp.bracket)
                throw new ParserError("Mismatched parentheses");
            stack.pop();
            lastWasNum = true;
            next();
        }
        else // Number
        {
            lastWasNum = true;

            let imm = parseNumber(minFloatPrec !== 0);
            if(imm.floatPrec > minFloatPrec) minFloatPrec = imm.floatPrec;
            let value = imm.value;
            if(value.name)
                hasLabelDependency = true;

            output.push(value);
        }
    }

    if(expectMemory && stack.length == 1 && stack[0].bracket)
    {
        ungetToken();
        setToken('(');
        return null;
    }
    else if(!lastWasNum)
        throw new ParserError("Missing right operand", stack.length ? stack[stack.length - 1].pos : codePos);

    while(stack[0])
    {
        if(stack[stack.length - 1].bracket)
            throw new ParserError("Mismatched parentheses", stack[stack.length - 1].pos);
        output.push(stack.pop());
    }

    if(minFloatPrec !== 0)
        output = output.map(num => typeof num === "bigint" ? Number(num) : num);
    
    return { hasLabelDependency: hasLabelDependency, stack: output, floatPrec: minFloatPrec };
}

export function evaluate(expression, labels = null, currIndex = 0)
{
    let stack = [], len = 0;
    for(let op of expression.stack)
    {
        let func = op.func;
        if(func)
        {
            if(func.length === 1)
                stack[len - 1] = func(stack[len - 1]);
            else
            {
                stack.splice(len - 2, 2, func(stack[len - 2], stack[len - 1]));
                len--;
            }
        }
        else
        {
            if(op.name) // Labels
            {
                if(op.name === '.') op = BigInt(currIndex);
                else if(labels === null) op = 1n;
                else if(!labels.has(op.name)) throw new ParserError(`Unknown label "${op.name}"`, op.pos);
                else op = labels.get(op.name).address;
            }
            stack[len++] = op;
        }
        
        if(expression.floatPrec === 0)
            stack[len - 1] = BigInt(stack[len - 1]);
        else
            stack[len - 1] = Number(stack[len - 1]);
    }
    if(stack.length > 1)
        throw new ParserError("Invalid expression");



    if(expression.floatPrec === 0) return stack[0];
    let floatVal = expression.floatPrec === 1 ? new Float32Array(1) : new Float64Array(1);
    floatVal[0] = Number(stack[0]);
    return new Uint8Array(floatVal.buffer).reduceRight((prev, val) => (prev << 8n) + BigInt(val), 0n);
}