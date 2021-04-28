import { registers } from "./operands.js";
import { codePos, next, ParserError, token } from "./parser.js";

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


export var unescapeString = string => string.slice(1, -1).replace("\\n", "\n").replace("\\0", "\0");


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
            for(let i = 0; i < string.length; i++)
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





export function parseExpression(minFloatPrec = 0)
{
    let output = [], stack = [], lastOp, lastWasNum = false, hasLabelDependency = false;
    next();
    while(token !== ',' && token !== '\n' && token !== ';')
    {
        if(!lastWasNum && unaries.hasOwnProperty(token)) // Unary operator
        {
            stack.push({pos: codePos, func: unaries[token], prec: -1});
            next();
        }
        else if(operators.hasOwnProperty(token)) // Operator
        {
            if(!lastWasNum) throw new ParserError("Missing left operand");
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
            if(lastWasNum) break;
            stack.push({pos: codePos, bracket: true });
            next();
        }
        else if(token === ')')
        {
            if(!lastWasNum)
                throw new ParserError("Missing right operand", stack[stack.length - 1].pos);
            while(lastOp = stack[stack.length - 1], lastOp && !lastOp.bracket)
                output.push(stack.pop());
            if(!lastOp || !lastOp.bracket) throw new ParserError("Mismatched parentheses");
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

    if(!lastWasNum)
        throw new ParserError("Missing right operand", stack[stack.length - 1].pos);

    while(stack[0])
    {
        if(stack[stack.length - 1].func === null)
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
                stack.splice(len - 2, 2, op.func(stack[len - 2], stack[len - 1]));
                len--;
            }
        }
        else
        {
            if(op.name) // Labels
            {
                if(labels === null) op = 1n;
                else if(!labels.has(op.name)) throw new ParserError(`Unknown label "${op.name}"`, op.pos);
                else op = labels.get(op.name) - currIndex;
            }
            stack[len++] = op;
        }
        
        if(expression.floatPrec === 0)
            stack[len - 1] = BigInt(stack[len - 1]);
    }
    if(stack.length > 1)
        throw new ParserError("Invalid expression");



    if(expression.floatPrec === 0) return stack[0];
    let floatVal = expression.floatPrec === 1 ? new Float32Array(1) : new Float64Array(1);
    floatVal[0] = Number(stack[0]);
    return new Uint8Array(floatVal.buffer).reduceRight((prev, val) => (prev << 8n) + BigInt(val), 0n);
}