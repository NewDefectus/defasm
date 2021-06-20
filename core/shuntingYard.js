import { registers } from "./operands.js";
import { codePos, next, ParserError, setToken, token, ungetToken } from "./parser.js";
import { symbols } from "./compiler.js";

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
}


export var unescapeString = string => {
    if(string.length < 2 || string[string.length - 1] != string[0])
        throw new ParserError("Incomplete string");
    string = string.slice(1, -1)
    .replace(/\\(x[0-9a-f]{1,2}|[0-7]{1,3}|u[0-9a-f]{1,8}|.|$)/ig, x => {
        x = x.slice(1);
        if(x == '')
            throw new ParserError("Incomplete string");
        if(x.match(/x[0-9a-f]{1,2}/i))
            return String.fromCharCode(parseInt(x.slice(1), 16));
        if(x.match(/u[0-9a-f]{1,8}/i))
        {
            try {
                return String.fromCodePoint(parseInt(x.slice(1), 16));
            } catch(e) {
                return '';
            }
        }
        if(x.match(/[0-7]{1,3}/))
            return String.fromCharCode(parseInt(x, 8) & 255);
        return stringEscapeSeqs[x] || x;
    });
    return string;
}


function parseNumber(asFloat = false)
{
    let value = asFloat ? 0 : 0n, floatPrec = asFloat ? 1 : 0;
    
    try
    {
        if(token === '\n')
            throw new ParserError("Expected value, got none");
        if(token[0] === "'")
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
                value = token.includes('.') ? parseFloat(token) : parseInt(token);
                if(token.endsWith('d')) floatPrec = 2;
                else if(token.endsWith('f')) floatPrec = 1;
                else
                {
                    codePos.start += codePos.length - 1;
                    codePos.length = 1;
                    throw new ParserError("Invalid number suffix");
                }
            }
            else if(registers.hasOwnProperty(token)) throw new ParserError("Registers must be prefixed with %");
            else // Symbol
            {
                let symbol = { name: token, pos: codePos };
                next();
                return { value: symbol, floatPrec };
            }
        }
        else if(token.includes('.')) floatPrec = 1, value = parseFloat(token);
        else if(asFloat) floatPrec = 1, value = parseInt(token);
        else value = asFloat ? Number(token) : BigInt(token);

        if(next() === 'f') floatPrec = 1, next();
        else if(token === 'd') floatPrec = 2, next();

        return { value, floatPrec };
    }
    catch(e)
    {
        if(e.pos === undefined) throw new ParserError("Couldn't parse immediate: " + e);
        throw e;
    }
}


export function LabelExpression(instr)
{
    let result = Object.create(Expression.prototype);
    result.hasSymbols = true;
    result.stack = [{ name: '.', pos: null }];
    result.floatPrec = 0;
    instr.ipRelative = true;
    return result;
}


export function Expression(instr, minFloatPrec = 0, expectMemory = false)
{
    this.hasSymbols = false;
    this.stack = [];
    this.floatPrec = minFloatPrec;

    let opStack = [], lastOp, lastWasNum = false;
    if(!expectMemory) next();

    while(token !== ',' && token !== '\n' && token !== ';')
    {
        if(!lastWasNum && unaries.hasOwnProperty(token)) // Unary operator
        {
            opStack.push({pos: codePos, func: unaries[token], prec: -1});
            next();
        }
        else if(operators.hasOwnProperty(token)) // Operator
        {
            if(!lastWasNum)
            {
                // If expecting memory e.g. (%rax) the '%' goes in here
                if(expectMemory && opStack.length > 0 && opStack[opStack.length - 1].bracket) break;
                throw new ParserError("Missing left operand");
            }
            lastWasNum = false;

            let op = Object.assign({pos: codePos}, operators[token]);
            while(lastOp = opStack[opStack.length - 1], lastOp && lastOp.prec <= op.prec && !lastOp.bracket)
                this.stack.push(opStack.pop());
            opStack.push(op);
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
            opStack.push({pos: codePos, bracket: true });
            next();
        }
        else if(token === ')')
        {
            if(!lastWasNum)
                throw new ParserError("Missing right operand", opStack.length ? opStack[opStack.length - 1].pos : codePos);
            while(lastOp = opStack[opStack.length - 1], lastOp && !lastOp.bracket)
                this.stack.push(opStack.pop());
            if(!lastOp || !lastOp.bracket)
                throw new ParserError("Mismatched parentheses");
            opStack.pop();
            lastWasNum = true;
            next();
        }
        else // Number
        {
            if(lastWasNum)
                throw new ParserError("Unexpected value");
            lastWasNum = true;

            let imm = parseNumber(this.floatPrec !== 0);
            if(imm.floatPrec > this.floatPrec) this.floatPrec = imm.floatPrec;
            let value = imm.value;
            if(value.name)
            {
                if(value.name === '.')
                    instr.ipRelative = true;
                else if(symbols.has(value.name))
                    symbols.get(value.name).references.push(instr);
                else
                    symbols.set(value.name, {
                        symbol: null,
                        references: [instr]
                    });
                this.hasSymbols = true;
            }

            this.stack.push(value);
        }
    }

    if(this.stack.length === 0 && !expectMemory)
        throw new ParserError("Expected expression");

    if(expectMemory && opStack.length == 1 && opStack[0].bracket)
    {
        ungetToken();
        setToken('(');
        return null;
    }
    else if(!lastWasNum)
        throw new ParserError("Missing right operand", opStack.length ? opStack[opStack.length - 1].pos : codePos);

    while(opStack[0])
    {
        if(opStack[opStack.length - 1].bracket)
            throw new ParserError("Mismatched parentheses", opStack[opStack.length - 1].pos);
        this.stack.push(opStack.pop());
    }

    if(this.floatPrec !== 0)
        this.stack = this.stack.map(num => typeof num === "bigint" ? Number(num) : num);
}

Expression.prototype.evaluate = function(currIndex, requireSymbols = false)
{
    if(this.stack.length === 0)
        return null;
    
    let stack = [], len = 0;
    for(let op of this.stack)
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
            if(op.name) // Symbols
            {
                if(op.name === '.')
                    op = BigInt(currIndex);
                else
                {
                    let record = symbols.get(op.name);
                    if(record.symbol !== null && !record.symbol.error)
                        op = symbols.get(op.name).symbol.value;
                    else if(!requireSymbols)
                        op = 1n;
                    else
                        throw new ParserError(`Unknown symbol "${op.name}"`, op.pos);
                }
            }
            stack[len++] = op;
        }
        
        if(this.floatPrec === 0)
            stack[len - 1] = BigInt(stack[len - 1]);
        else
            stack[len - 1] = Number(stack[len - 1]);
    }
    if(stack.length > 1)
        throw new ParserError("Invalid expression");

    if(this.floatPrec === 0) return stack[0];
    let floatVal = this.floatPrec === 1 ? new Float32Array(1) : new Float64Array(1);
    floatVal[0] = Number(stack[0]);
    return new Uint8Array(floatVal.buffer).reduceRight((prev, val) => (prev << 8n) + BigInt(val), 0n);
}