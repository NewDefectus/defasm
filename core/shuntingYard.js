import { isRegister } from "./operands.js";
import { codePos, currSyntax, next, ParserError, setToken, token, ungetToken } from "./parser.js";
import { symbols } from "./compiler.js";
import { Statement } from "./statement.js";

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
    'a': 0x07,
    'b': 0x08,
    'e': 0x1B,
    'f': 0x0C,
    'n': 0x0A,
    'r': 0x0D,
    't': 0x09,
    'v': 0x0B,
}


const encoder = new TextEncoder();
export var readString = string => {
    if(string.length < 2 || string[string.length - 1] != string[0])
        throw new ParserError("Incomplete string");
    let output = [];
    let matches = string.slice(1, -1).match(/(\\(?:x[0-9a-f]{1,2}|[0-7]{1,3}|u[0-9a-f]{1,8}|.?))|[^\\]+/ig);
    if(matches)
        matches.forEach(x => {
        if(x[0] == '\\')
        {
            x = x.slice(1);
            if(x == '')
                throw new ParserError("Incomplete string");

            if(x.match(/x[0-9a-f]{1,2}/i))
                output.push(parseInt(x.slice(1), 16));
            else if(x.match(/u[0-9a-f]{1,8}/i))
                output.push(...encoder.encode(String.fromCodePoint(parseInt(x.slice(1), 16))));
            else if(x.match(/[0-7]{1,3}/))
                output.push(parseInt(x, 8) & 255);
            else if(stringEscapeSeqs.hasOwnProperty(x))
                output.push(stringEscapeSeqs[x]);
            else
                output.push(...encoder.encode(x));
        }
        else
            output.push(...encoder.encode(x));
    });

    return new Uint8Array(output);
}

export const NUM_INVALID = null,
             NUM_PREC_SUFFIX = 1,
             NUM_H_SUFFIX = 2,
             NUM_E_EXPR = 4,
             NUM_SYMBOL = 8;

export function isNumber(number, intel)
{
    let match = null, type = 0;
    number = number.toLowerCase();

    if(number == (intel ? '$' : '.') || number[0].match(/[a-z_]/i))
        return NUM_SYMBOL;
    
    if(number[0].match(/[^0-9.]/))
        return NUM_INVALID;
    
    if(intel)
        match = number.match(/^[0-9][0-9a-f]*h(.)?$/);

    if(match)
        type = NUM_H_SUFFIX;
    else
    {
        match = number.match(/^(?:[0-9]*\.?[0-9]+|0x[0-9a-f]+|0o[0-7]+|0b[01]+)(.)?$/);   
        if(!match)
        {
            match = number.match(/^[0-9]*\.?[0-9]+e[0-9]+(.)?$/);
            if(match)
                type = NUM_E_EXPR;
            else
                return NUM_INVALID;
        }
    }
    
    return type | (match[1] ? NUM_PREC_SUFFIX : 0);
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
            let bytes = readString(token), i = bytes.length;
            
            while(i--)
            {
                value <<= asFloat ? 8 : 8n;
                value += asFloat ? bytes[i] : BigInt(bytes[i]);
            }
        }
        else
        {
            let numType = isNumber(token, currSyntax.intel);
            if(numType == NUM_SYMBOL) // Symbol
            {
                let symbol = { name: token, pos: codePos };
                next();
                return { value: symbol, floatPrec };
            }

            if(numType === NUM_INVALID)
                throw new ParserError("Invalid number");

            let mainToken = token;
            if(numType & NUM_H_SUFFIX)
                mainToken = '0x' + mainToken.replace(/h/i, '');

            if(numType & NUM_PREC_SUFFIX)
            {
                let suffix = mainToken[mainToken.length - 1].toLowerCase();

                if(suffix == 'd') floatPrec = 2;
                else if(suffix == 'f') floatPrec = 1;
                else
                {
                    codePos.start += codePos.length - 1;
                    codePos.length = 1;
                    throw new ParserError("Invalid number suffix");
                }

                value = Number(mainToken.slice(0, -1));
            }
            else if(asFloat) floatPrec = 1, value = Number(mainToken);
            else if(numType & NUM_E_EXPR)
            {
                let eIndex = token.indexOf('e');
                let base = token.slice(0, eIndex);
                let exponent = BigInt(token.slice(eIndex + 1));

                let dotIndex = base.indexOf('.'), divisor = 1n;

                if(dotIndex > 0)
                    divisor = 10n ** BigInt(base.length - dotIndex - 1);
                base = BigInt(base.replace('.', ''));

                value = base * 10n ** exponent / divisor;
            }
            else if(mainToken.includes('.'))
                floatPrec = 1, value = parseFloat(mainToken);
            else
                value = asFloat ? Number(mainToken) : BigInt(mainToken);
        }

        if(next() === 'f') floatPrec = 1, next();
        else if(token === 'd') floatPrec = 2, next();

        return { value, floatPrec };
    }
    catch(e)
    {
        if(e.pos === undefined) throw new ParserError(e);
        throw e;
    }
}


export function LabelExpression(instr)
{
    let result = Object.create(Expression.prototype);
    result.hasSymbols = true;
    result.stack = [{ isIP: true, pos: null }];
    result.floatPrec = 0;
    instr.ipRelative = true;
    return result;
}


/** @param {Statement} instr */
export function Expression(instr, minFloatPrec = 0, expectMemory = false)
{
    this.hasSymbols = false;
    this.stack = [];
    this.floatPrec = minFloatPrec;

    let opStack = [], lastOp, lastWasNum = false;

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
                if(!instr.syntax.intel && expectMemory && opStack.length > 0 && opStack[opStack.length - 1].bracket) break;
                throw new ParserError("Missing left operand");
            }
            let opToken = token;
            next();

            if(opToken == '+' && (currSyntax.prefix ? token == '%' : isRegister(token)))
                break;
            lastWasNum = false;

            let op = Object.assign({pos: codePos}, operators[opToken]);

            while(lastOp = opStack[opStack.length - 1], lastOp && lastOp.prec <= op.prec && !lastOp.bracket)
                this.stack.push(opStack.pop());
            opStack.push(op);
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
        else if(token === '[' || token === ']')
        {
            if(!lastWasNum)
                throw new ParserError("Missing right operand", opStack.length ? opStack[opStack.length - 1].pos : codePos);
            break;
        }
        else if(isRegister(token))
        {
            if(!lastWasNum && expectMemory && opStack.length > 0 && opStack[opStack.length - 1].bracket)
                break;
            throw new ParserError("Can't use registers in an expression");
        }
        else // Number
        {
            if(lastWasNum)
                throw new ParserError("Unexpected value");
            lastWasNum = true;

            let imm = parseNumber(this.floatPrec !== 0);
            if(imm.floatPrec > this.floatPrec) this.floatPrec = imm.floatPrec;
            let value = imm.value;
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

    for(let value of this.stack)
    {
        if(value.name)
        {
            if(value.name === (instr.syntax.intel ? '$' : '.'))
            {
                instr.ipRelative = true;
                value.isIP = true;
            }
            else if(symbols.has(value.name))
                symbols.get(value.name).references.push(instr);
            else
                symbols.set(value.name, {
                    symbol: null,
                    references: [instr]
                });
            this.hasSymbols = true;
        }
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
            if(op.isIP) // Current address symbol
                op = BigInt(currIndex);
            else if(op.name) // Symbols
            {
                let record = symbols.get(op.name);
                if(record.symbol !== null && !record.symbol.error)
                    op = symbols.get(op.name).symbol.value;
                else if(!requireSymbols)
                    op = 1n;
                else
                    throw new ParserError(`Unknown symbol "${op.name}"`, op.pos);
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