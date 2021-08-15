import { isRegister, OPT, parseRegister, PREFIX_ADDRSIZE, regParsePos } from "./operands.js";
import { ASMError, currRange, currSyntax, next, Range, setToken, token, ungetToken } from "./parser.js";
import { symbols } from "./symbols.js";
import { Statement } from "./statement.js";

export var unaries = {
    '+': a=>a,
    '-': a=>-a,
    '~': a=>~a,
    '!': a=>!a,
};

var operators = [
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

export function capLineEnds({ lineEnds, offset })
{
    // Cap line ends at the given offset
    for(let i = 0; i < lineEnds.length; i++)
        if(lineEnds[i] > offset)
            lineEnds[i] = offset;
}


const encoder = new TextEncoder();
export function readString(string, { offset = 0, lineEnds = [] } = {})
{
    if(string.length < 2 || string[string.length - 1] != string[0])
        throw new ASMError("Incomplete string");
    
    capLineEnds({ lineEnds, offset });

    let output = [];
    let matches = string.slice(1, -1).match(/(\\(?:x[0-9a-f]{1,2}|[0-7]{1,3}|u[0-9a-f]{1,8}|(.|\n)?))|\n|[^\\\n]+/ig);
    if(matches)
        for(let x of matches)
        {
            if(x[0] == '\\')
            {
                x = x.slice(1);
                if(x == '')
                    throw new ASMError("Incomplete string");

                if(x.match(/x[0-9a-f]{1,2}/i))
                    output.push(parseInt(x.slice(1), 16));
                else if(x.match(/u[0-9a-f]{1,8}/i))
                    output.push(...encoder.encode(String.fromCodePoint(parseInt(x.slice(1), 16))));
                else if(x.match(/[0-7]{1,3}/))
                    output.push(parseInt(x, 8) & 255);
                else if(stringEscapeSeqs.hasOwnProperty(x))
                    output.push(stringEscapeSeqs[x]);
                else if(x != '\n') // Line breaks preceded by a backslash should not be added
                    output.push(...encoder.encode(x));
            }
            else
                output.push(...encoder.encode(x));

            if(x == '\n')
                lineEnds.push(output.length + offset);
        }

    return new Uint8Array(output);
}

/** Get information about an identifier (returns null if the string isn't a valid identifier).
 * @param {string} id
 * @param {boolean} intel
 */
export function scanIdentifier(id, intel)
{
    id = id.toLowerCase();

    if(id == (intel ? '$' : '.') || id[0].match(/[a-z_]/i))
        return { type: 'symbol', precision: false };
    if(id[0].match(/[^0-9.]/))
        return null;

    /** @type {'symbol' | 'hSuffix' | 'eExpr'} */
    let type;
    let match = null;
    
    if(intel)
        match = id.match(/^[0-9][0-9a-f]*h(.)?$/);

    if(match)
        type = 'hSuffix';
    else
    {
        match = id.match(/^(?:[0-9]*\.?[0-9]+|0x[0-9a-f]+|0o[0-7]+|0b[01]+)(.)?$/);   
        if(!match)
        {
            match = id.match(/^[0-9]*\.?[0-9]+e[0-9]+(.)?$/);
            if(match)
                type = 'eExpr';
            else
                return null;
        }
    }
    
    return { type, precision: match[1] !== undefined };
}


function parseNumber(asFloat = false, lineEnds = {})
{
    let value = asFloat ? 0 : 0n, floatPrec = asFloat ? 1 : 0;
    
    try
    {
        if(token === '\n')
            throw new ASMError("Expected value, got none");
        if(token[0] === "'")
        {
            let bytes = readString(token, lineEnds), i = bytes.length;
            
            while(i--)
            {
                value <<= asFloat ? 8 : 8n;
                value += asFloat ? bytes[i] : BigInt(bytes[i]);
            }
        }
        else
        {
            let idType = scanIdentifier(token, currSyntax.intel);
            if(idType.type == 'symbol') // Symbol
            {
                let symbol = { name: token, pos: currRange };
                next();
                return { value: symbol, floatPrec };
            }

            if(idType === null)
                throw new ASMError("Invalid number");

            let mainToken = token;
            if(idType.type == 'hSuffix')
                mainToken = '0x' + mainToken.replace(/h/i, '');

            if(idType.precision)
            {
                let suffix = mainToken[mainToken.length - 1].toLowerCase();

                if(suffix == 'd') floatPrec = 2;
                else if(suffix == 'f') floatPrec = 1;
                else
                    throw new ASMError("Invalid number suffix", new Range(currRange.end - 1, 1));

                value = Number(mainToken.slice(0, -1));
            }
            else if(asFloat) floatPrec = 1, value = Number(mainToken);
            else if(idType.type == 'eExpr')
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
        if(e.pos === undefined)
            throw new ASMError(e);
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
export function Expression(instr, minFloatPrec = 0, expectMemory = false, uses = null)
{
    this.hasSymbols = false;
    this.stack = [];
    this.floatPrec = minFloatPrec;

    let opStack = [], lastOp, lastWasNum = false, inParentheses = 0;

    this.regBase = null;
    this.regIndex = null;
    this.shift = null;
    this.prefs = 0;

    Expression.prototype.recordIntelRegister = function()
    {
        let multiplier = null, multiplierPos = null;
        
        if(inParentheses)
            throw new ASMError("Can't use registers within parentheses");

        if(opStack.length > 0)
        {
            let prevOp = opStack[opStack.length - 1];
            if(prevOp.func == operators['*'].func)
            {
                multiplierPos = prevOp.pos;
                
                let prevVal = this.stack.pop();

                multiplier = "1248".indexOf(prevVal.toString());
                if(multiplier < 0)
                    throw new ASMError("Scale must be 1, 2, 4, or 8");
            }
            else if(prevOp.func != operators['+'].func)
                throw new ASMError("Invalid operation on register (expected '+' or '*')", prevOp.pos);
        }

        if(this.regBase && this.regBase.type == OPT.IP)
            throw new ASMError("Can't use RIP with other registers");

        let tempReg = parseRegister([OPT.REG, OPT.IP, OPT.VEC]);

        if(token == '*')
        {
            multiplierPos = currRange;
            if(multiplier !== null)
                throw new ASMError("Can't multiply a register more than once");
            multiplier = "1248".indexOf(next());
            if(multiplier < 0)
                throw new ASMError("Scale must be 1, 2, 4, or 8");
            next();
        }

        if(tempReg.type == OPT.VEC)
        {
            if(tempReg.size < 128)
                throw new ASMError("Invalid register size", regParsePos);
        }
        else
        {
            if(tempReg.size == 32)
                this.prefs |= PREFIX_ADDRSIZE;
            else if(tempReg.size != 64)
                throw new ASMError("Invalid register size", regParsePos);
            
            if(tempReg.type == OPT.IP && (this.regBase || this.regIndex))
                throw new ASMError("Can't use RIP with other registers", regParsePos);
        }
        
        if(this.regBase)
        {
            if(this.regIndex)
                throw new ASMError("Index register already set", regParsePos);
                
            this.regIndex = tempReg;
            if(tempReg.type != OPT.VEC && tempReg.reg == 4)
            {   
                if(this.regBase.reg != 4 && multiplier === null)
                    [this.regIndex, this.regBase] = [this.regBase, this.regIndex];
                else
                    throw new ASMError("Memory index cannot be RSP", regParsePos);
            }
        }
        else
        {
            this.regBase = tempReg;

            if(multiplier !== null || tempReg.type == OPT.VEC)
            {
                if(this.regIndex)
                {
                    if(multiplier !== null)
                        throw new ASMError("Can't scale multiple registers", multiplierPos);
                    throw new ASMError("Vector register must be the index", regParsePos);
                }
                this.regIndex = this.regBase;
                this.regBase = null;
                if(this.regIndex.reg == 4)
                    throw new ASMError("Memory index cannot be RSP", regParsePos);
                if(tempReg.type == OPT.IP)
                    throw new ASMError(`Can't scale ${instr.syntax.prefix ? '%' : ''}${tempReg.size == 32 ? 'e' : 'r'}ip`, multiplierPos);
            }
        }

        if(token != ']' && token != '+' && token != '-')
            throw new ASMError("Expected ']', '+' or '-'");
        lastWasNum = true;
        this.stack.push(0n);
        if(multiplier !== null)
            this.shift = multiplier;
    }




    while(token != ',' && token != '\n' && token != ';')
    {
        if(!lastWasNum && unaries.hasOwnProperty(token)) // Unary operator
        {
            opStack.push({pos: currRange, func: unaries[token], prec: -1});
            next();
        }
        else if(operators.hasOwnProperty(token)) // Operator
        {
            if(!lastWasNum)
            {
                if(expectMemory && instr.syntax.prefix && token == '%')
                {
                    // If expecting memory e.g. (%rax) the '%' goes in here
                    if(instr.syntax.intel)
                    {
                        this.recordIntelRegister();
                        continue;
                    }
                    else if(opStack.length > 0 && opStack[opStack.length - 1].bracket)
                        break;
                }
                
                throw new ASMError("Missing left operand");
            }

            let op = Object.assign({pos: currRange}, operators[token]);
            next();

            lastWasNum = false;

            while(lastOp = opStack[opStack.length - 1], lastOp && lastOp.prec <= op.prec && !lastOp.bracket)
                this.stack.push(opStack.pop());
            opStack.push(op);
        }
        else if(unaries.hasOwnProperty(token))
            throw new ASMError("Unary operator can't be used here");
        else if(token == '(')
        {
            if(lastWasNum)
            {
                if(!instr.syntax.intel && expectMemory)
                    break;
                throw new ASMError("Unexpected parenthesis");
            }
            opStack.push({pos: currRange, bracket: true });
            inParentheses++;
            next();
        }
        else if(token == ')')
        {
            if(!lastWasNum)
                throw new ASMError("Missing right operand", opStack.length ? opStack[opStack.length - 1].pos : currRange);
            while(lastOp = opStack[opStack.length - 1], lastOp && !lastOp.bracket)
                this.stack.push(opStack.pop());
            if(!lastOp || !lastOp.bracket)
                throw new ASMError("Mismatched parentheses");
            opStack.pop();
            lastWasNum = true;
            inParentheses--;
            next();
        }
        else if(instr.syntax.intel && (token == '[' || token == ']'))
        {
            if(!lastWasNum)
                throw new ASMError("Missing right operand", opStack.length ? opStack[opStack.length - 1].pos : currRange);
            break;
        }
        else if(!instr.syntax.prefix && isRegister(token))
        {
            if(expectMemory)
            {
                if(instr.syntax.intel)
                {
                    this.recordIntelRegister();
                    continue;
                }
                else if(!lastWasNum && opStack.length > 0 && opStack[opStack.length - 1].bracket)
                    break;
            }
            throw new ASMError("Can't use registers in an expression");
        }
        else // Number
        {
            if(lastWasNum)
                throw new ASMError("Unexpected value");
            lastWasNum = true;

            let imm = parseNumber(this.floatPrec !== 0, instr.lineEnds ?? {});
            if(imm.floatPrec > this.floatPrec)
                this.floatPrec = imm.floatPrec;
            let value = imm.value;
            this.stack.push(value);
        }
    }

    if(currSyntax.intel && this.stack.length === (this.regBase ? 1 : 0) + (this.regIndex ? 1 : 0))
    {
        this.stack = [];
        opStack = [];
    }

    if(this.stack.length === 0 && !expectMemory)
        throw new ASMError("Expected expression");

    if(expectMemory && opStack.length == 1 && opStack[0].bracket)
    {
        ungetToken();
        setToken('(');
        return null;
    }
    else if(!lastWasNum)
        throw new ASMError("Missing right operand", opStack.length ? opStack[opStack.length - 1].pos : currRange);

    while(opStack[0])
    {
        if(opStack[opStack.length - 1].bracket)
            throw new ASMError("Mismatched parentheses", opStack[opStack.length - 1].pos);
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
            else
            {
                let record;
                if(symbols.has(value.name))
                {
                    record = symbols.get(value.name);
                    record.references.push(instr);
                }
                else
                    symbols.set(value.name, record = {
                        symbol: null,
                        references: [instr],
                        uses: []
                    });
                if(uses !== null)
                    uses.push(record);
            }
            this.hasSymbols = true;
        }
    }

    if(this.floatPrec !== 0)
        this.stack = this.stack.map(num => typeof num === "bigint" ? Number(num) : num);
    
    if(this.shift === null)
        this.shift = 0;
}

Expression.prototype.evaluate = function(currIndex, requireSymbols = false, originRecord = null)
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
                if(record.symbol !== null && !record.symbol.error
                    && (originRecord === null || !checkSymbolRecursion(originRecord, record)))
                    op = symbols.get(op.name).symbol.value;
                else if(!requireSymbols)
                    op = 1n;
                else
                    throw new ASMError(`Unknown symbol "${op.name}"`, op.pos);
            }
            stack[len++] = op;
        }
        
        if(this.floatPrec === 0)
            stack[len - 1] = BigInt(stack[len - 1]);
        else
            stack[len - 1] = Number(stack[len - 1]);
    }
    if(stack.length > 1)
        throw new ASMError("Invalid expression");

    if(this.floatPrec === 0) return stack[0];
    let floatVal = this.floatPrec === 1 ? new Float32Array(1) : new Float64Array(1);
    floatVal[0] = Number(stack[0]);
    return new Uint8Array(floatVal.buffer).reduceRight((prev, val) => (prev << 8n) + BigInt(val), 0n);
}

/** @param {Expression} expr */
Expression.prototype.add = function(expr)
{
    if(expr.stack.length > 0)
        this.stack.push(...expr.stack, operators['+']);
    this.floatPrec = Math.max(this.floatPrec, expr.floatPrec);
    this.hasSymbols = this.hasSymbols || expr.hasSymbols;
}



function checkSymbolRecursion(origin, record)
{
    if(record === origin)
        return true;
    for(const use of record.uses)
        if(use.symbol && !use.symbol.error && checkSymbolRecursion(origin, use))
            return true;
    return false;
}