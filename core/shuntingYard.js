import { isRegister, nameRegister, OPT, parseRegister, regParsePos } from "./operands.js";
import { ASMError, currRange, next, Range, setToken, token, ungetToken } from "./parser.js";
import { referenceSymbol, symbols } from "./symbols.js";
import { Statement } from "./statement.js";
import { pseudoSections, Section } from "./sections.js";

let unaryTemps = {
    '+': a=>a,
    '-': a=>-a,
    '~': a=>~a,
    '!': a=>!a,
};

let operatorTemps = [
    {
        '*': (a,b)=>a*b,
        '/': (a,b)=>a/(b||1n),
        '%': (a,b)=>a%(b||1n),
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
        '==':(a,b)=>a==b?-1n:0n,
        '<>':(a,b)=>a!=b?-1n:0n,
        '!=':(a,b)=>a!=b?-1n:0n,
        '<': (a,b)=>a<b?-1n:0n,
        '>': (a,b)=>a>b?-1n:0n,
        '>=':(a,b)=>a>=b?-1n:0n,
        '<=':(a,b)=>a<=b?-1n:0n,
    },
    {   '&&':(a,b)=>a&&b?1n:0n },
    {   '||':(a,b)=>a||b?1n:0n },
];

/**
 * @typedef {Object} Operator
 * @property {string} name
 * @property {Function} func
 * @property {Range} range
 * @property {Number} prec */

/** @type {Object.<string, Operator>} */
var operators = {};
/** @type {Object.<string, Operator>} */
var unaries = {};

for(let i = 0; i < operatorTemps.length; i++)
    for(const op of Object.keys(operatorTemps[i]))
        operators[op] = { func: operatorTemps[i][op], prec: i };
for(const op of Object.keys(unaryTemps))
    unaries[op] = { func: unaryTemps[op] };

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
export function readString(string)
{
    if(string.length < 2 || string[string.length - 1] != string[0])
        throw new ASMError("Incomplete string");
    
    const lineEnds = [];

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
                lineEnds.push(output.length);
        }

    return { bytes: new Uint8Array(output), lineEnds };
}

/** Get the type of an identifier (returns null if the string isn't a valid identifier).
 * @param {string} id
 * @param {boolean} intel
 * @returns {'symbol' | 'number'}
 */
export function scanIdentifier(id, intel)
{
    if(id[0].match(/[a-z_.$]/i))
        return 'symbol';
    if(id[0].match(/[^0-9]/))
        return null;
    if(id.match(/^([0-9]+|0x[0-9a-f]+|0o[0-7]+|0b[01]+)$/i) || intel && id.match(/^([0-9][0-9a-f]*)h$/i))
        return 'number';
    return null;
}


function parseIdentifier(instr)
{
    let value = 0n, startRange = currRange;
    
    try
    {
        if(token === '\n')
            throw new ASMError("Expected value, got none");
        if(token[0] === "'")
        {
            let { bytes, lineEnds } = readString(token), i = bytes.length;
            
            while(i--)
            {
                value <<= 8n;
                value += BigInt(bytes[i]);
            }

            next();
            return new Identifier(instr, value, startRange, lineEnds);
        }
        if(instr.syntax.prefix ? token == '%' : isRegister(token)) // Register
            return new RegisterIdentifier(instr, parseRegister([OPT.REG, OPT.IP, OPT.VEC]), regParsePos);
        
        const idType = scanIdentifier(token, instr.syntax.intel);
        if(idType == 'symbol') // Symbol
        {
            const name = token;
            next();
            return new SymbolIdentifier(instr, name, startRange);
        }

        if(idType === null)
            throw new ASMError("Invalid number");

        let mainToken = token;
        if(token[token.length - 1].toLowerCase() == 'h')
            mainToken = '0x' + token.slice(0, -1);
        value = BigInt(mainToken);
        next();
        return new Identifier(instr, value, startRange);
    }
    catch(e)
    {
        if(e.range === undefined)
            throw new ASMError(e);
        throw e;
    }
}

/**
 * @typedef {Object} RegisterData
 * @property {Number} shift
 * @property {import('./operands.js').Register?} regBase
 * @property {import('./operands.js').Register?} regIndex
 */

export class IdentifierValue
{
    /**
     * @param {Object} config
     * @param {BigInt} config.addend 
     * @property {import('./symbols.js').Symbol} config.symbol
     * @property {Section} config.section
     * @property {Range} config.range
     * @property {RegData} config.regData
     * @property {Number[]} lineEnds */
    constructor({ addend = null, symbol = null, section = pseudoSections.UND, range, regData = null, pcRelative = false, lineEnds = [] } = {})
    {
        this.addend = addend;
        this.symbol = symbol;
        this.section = section;
        this.range = range;
        this.regData = regData;
        this.pcRelative = pcRelative;
        this.lineEnds = lineEnds;
    }

    isRelocatable()
    {
        return this.symbol && this.section != pseudoSections.ABS || this.pcRelative;
    }

    flatten()
    {
        let val = this, addend = this.addend;
        while(val.symbol &&
            (val.section == pseudoSections.ABS || val.symbol.value.symbol && !val.symbol.bind)
            && val.symbol.value !== val)
        {
            val = val.symbol.value;
            addend += val.addend;
        }
        return new IdentifierValue({
            ...val,
            addend
        });
    }

    absoluteValue()
    {
        let val = this, total = this.addend;
        let passed = new Set([val]);
        while(val.symbol && !passed.has(val.symbol.value))
        {
            val = val.symbol.value;
            total += val.addend;
            passed.add(val);
        }
        return total;
    }

    /**
     * @param {Statement} instr
     * @param {IdentifierValue} op1
     * @param {string} func
     * @param {IdentifierValue} op2
     */
     apply(instr, func, op, allowPCRelative = true)
     {
        this.range = this.range.until(op.range);
        if(this.section == pseudoSections.ABS && op.section == pseudoSections.ABS)
            ;
        else if(func == '+' && this.section == pseudoSections.ABS && !this.pcRelative)
        {
            this.section = op.section;
            this.symbol = op.symbol;
        }
        else if((func == '+' || func == '-') && op.section == pseudoSections.ABS)
            ;
        else if(this.pcRelative || op.pcRelative)
            throw new ASMError("Bad operands", this.range);
        else if(func == '-' && this.section == op.section &&
            (this.section != pseudoSections.UND && this.section != pseudoSections.COM || this.symbol == op.symbol))
        {
            if(this.symbol)
                this.addend = this.absoluteValue();
            if(op.symbol)
                op.addend = op.absoluteValue();
            this.section = op.section = pseudoSections.ABS;
            this.symbol = op.symbol = null;
        }
        else if(func == '-' && allowPCRelative && op.section == instr.section)
            this.pcRelative = true;
        else
            throw new ASMError("Bad operands", this.range);
        
        if(this.regData || op.regData)
        {
            if(func != '+' && func != '-' && func != '*' ||
                func == '-' && op.regData)
                throw new ASMError("Bad operands", this.range);
            
            let regOp = this.regData ? this : op;
            let nonRegOp = this.regData ? op : this;

            if(!this.regData)
                this.regData = op.regData;
            else if(op.regData) // Both operands are registers
            {
                if(func == '*')
                    throw new ASMError("Bad operands", this.range);
                if(this.regData.regIndex && op.regData.regIndex)
                    throw new ASMError("Can't have multiple index registers", this.range);
                if([this.regData, op.regData].some(data => data.regBase && data.regIndex))
                    throw new ASMError("Too many registers", this.range);
                
                if(this.regData.regBase && op.regData.regBase)
                {
                    this.regData.regIndex = [this.regData.regBase, op.regData.regBase].find(reg => reg.reg != 4);
                    if(this.regData.regIndex === undefined)
                        throw new ASMError(`Can't have both registers be ${instr.syntax.prefix ? '%' : ''}rsp`, this.range);
                    if(this.regData.regIndex == this.regData.regBase)
                        this.regData.regBase = op.regData.regBase;
                }
                else if(op.regData.regIndex)
                {
                    this.regData.regIndex = op.regData.regIndex;
                    this.regData.shift = op.regData.shift;
                }
                else
                    this.regData.regBase = op.regData.regBase;
            }

            if(func == '*')
            {
                if(nonRegOp.section != pseudoSections.ABS)
                    throw new ASMError("Scale must be absolute", nonRegOp.range);
                if(regOp.regData.regIndex && regOp.regData.regBase)
                    throw new ASMError("Can't scale both base and index registers", this.range);
                if(regOp.regData.regBase)
                {
                    const scaled = regOp.regData.regBase;
                    if(scaled.reg == 4)
                        throw new ASMError(`Can't scale ${nameRegister('sp', scaled.size, instr.syntax)}`, this.range);
                    if(scaled.type == OPT.IP)
                        throw new ASMError(`Can't scale ${nameRegister('ip', scaled.size, instr.syntax)}`, this.range);
                    this.regData.regIndex = scaled;
                    this.regData.regBase = null;
                }
                this.regData.shift *= Number(nonRegOp.addend);
                this.addend = regOp.addend !== null ? nonRegOp.addend * regOp.addend : null;
            }
            else if(this.addend !== null || op.addend !== null)
                this.addend = operators[func].func(this.addend ?? 0n, op.addend ?? 0n);
        }
        else
            this.addend = operators[func].func(this.addend, op.addend);
        this.pcRelative = this.pcRelative || op.pcRelative;
        this.lineEnds = [...this.lineEnds, ...op.lineEnds].sort((a, b) => a - b);
     }
}

class Identifier
{
    /**
     * @param {Statement} instr
     * @param {Number} value
     * @param {Range} range
     * @param {Number[]} lineEnds */
    constructor(instr, value, range, lineEnds = [])
    {
        this.value = value;
        this.range = range;
        this.lineEnds = lineEnds;
    }

    /**
     * @param {Statement} instr
     * @returns {IdentifierValue} */
    getValue(instr)
    {
        return new IdentifierValue({
            addend: this.value,
            section: pseudoSections.ABS,
            range: this.range,
            lineEnds: this.lineEnds
        });
    }
}

class SymbolIdentifier extends Identifier
{
    /**
     * @param {Statement} instr
     * @param {string} name
     * @param {Range} range */
    constructor(instr, name, range)
    {
        super(instr, 0, range);
        this.name = name;
        this.isIP = name == (instr.syntax.intel ? '$' : '.');
        if(this.isIP)
            instr.ipRelative = true;
    }

    /**
     * @param {Statement} instr
     * @returns {IdentifierValue} */
    getValue(instr)
    {
        if(this.isIP)
            return new IdentifierValue({
                addend: BigInt(instr.address),
                symbol: (instr.section.head?.statement ?? instr).symbol,
                section: instr.section,
                range: this.range
            });
        const symbol = symbols.get(this.name);
        if(symbol.statement && !symbol.statement.error)
        {
            if(instr.symbol && checkSymbolRecursion(symbol))
                throw new ASMError(`Recursive definition`, this.range);
            let isAbs = symbol.value.section == pseudoSections.ABS;
            return new IdentifierValue({
                addend: isAbs ? symbol.value.addend : 0n,
                symbol: isAbs ? null : symbol,
                section: symbol.value.section,
                range: this.range
            });
        }
        return new IdentifierValue({
            addend: 0n,
            symbol,
            range: this.range
        });
    }
}

class RegisterIdentifier extends Identifier
{
    /**
     * @param {Statement} instr
     * @param {import("./operands.js").Register} register
     * @param {Range} range */
    constructor(instr, register, range)
    {
        super(instr, 0, range);
        this.register = register;
    }

    getValue()
    {
        return new IdentifierValue({
            section: pseudoSections.ABS,
            range: this.range,
            regData: this.register.type == OPT.VEC 
            ?
                {
                    shift: 1,
                    regBase: null,
                    regIndex: this.register
                }
            :
                {
                    shift: 1,
                    regBase: this.register,
                    regIndex: null
                }
        });
    }
}

export class Expression
{
    /** @param {Statement} instr */
    constructor(instr, expectMemory = false, uses = null)
    {
        this.hasSymbols = false;
        this.vecSize = 0;
        this.ripRelative = false;

        /** @type {(Identifier|RegisterIdentifier|Operator)[]} */
        this.stack = [];

        /** @type {Operator[]}*/
        let opStack = [];
        let lastOp, lastWasNum = false;

        while(token != ',' && token != '\n' && token != ';')
        {
            if(!lastWasNum && unaries.hasOwnProperty(token)) // Unary operator
            {
                opStack.push({range: currRange, func: token, prec: -1, unary: true });
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
                            lastWasNum = true;
                            this.stack.push(parseIdentifier(instr));
                            continue;
                        }
                        if(opStack.length > 0 && opStack[opStack.length - 1].bracket)
                        {
                            ungetToken();
                            setToken('(');
                            return;
                        }
                    }
                    
                    throw new ASMError("Missing left operand");
                }

                const op = { range: currRange, func: token, prec: operators[token].prec, unary: false };
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
                    if(expectMemory)
                        break;
                    throw new ASMError("Unexpected parenthesis");
                }
                opStack.push({ range: currRange, bracket: true });
                next();
            }
            else if(token == ')')
            {
                if(!lastWasNum)
                    throw new ASMError("Missing right operand", opStack.length ? opStack[opStack.length - 1].range : currRange);
                while(lastOp = opStack[opStack.length - 1], lastOp && !lastOp.bracket)
                    this.stack.push(opStack.pop());
                if(!lastOp || !lastOp.bracket)
                    throw new ASMError("Mismatched parentheses");
                opStack.pop();
                lastWasNum = true;
                next();
            }
            else if(instr.syntax.intel && (token == '[' || token == ']'))
            {
                if(!lastWasNum)
                    throw new ASMError("Missing right operand", opStack.length ? opStack[opStack.length - 1].range : currRange);
                break;
            }
            else // Identifier
            {
                if(lastWasNum)
                    throw new ASMError("Unexpected value");
                lastWasNum = true;

                if(!instr.syntax.prefix && isRegister(token))
                {
                    if(!expectMemory)
                        throw new ASMError("Can't use registers in an expression");
                    if(!instr.syntax.intel && opStack.length > 0 && opStack[opStack.length - 1].bracket)
                        break;
                }
                this.stack.push(parseIdentifier(instr));
            }
        }

        if(this.stack.length == 0)
        {
            if(expectMemory)
            {
                ungetToken();
                setToken('(');
                return;
            }
            else
                throw new ASMError("Expected expression");
        }

        if(!lastWasNum)
            throw new ASMError("Missing right operand", opStack.length ? opStack[opStack.length - 1].range : currRange);

        while(opStack[0])
        {
            if(opStack[opStack.length - 1].bracket)
                throw new ASMError("Mismatched parentheses", opStack[opStack.length - 1].range);
            this.stack.push(opStack.pop());
        }

        for(const id of this.stack)
        {
            if(id.register && id.register.type == OPT.VEC)
                this.vecSize = id.register.size;
            else if(id.register && id.register.type == OPT.IP)
                this.ripRelative = true;
            else if(id.name)
            {
                if(!id.isIP)
                {
                    const symbol = referenceSymbol(instr, id.name);
                    if(uses !== null)
                        uses.push(symbol);
                }
                this.hasSymbols = true;
            }
        }
    }

    /**
     * @param {Statement} instr
     * @param {boolean} allowPCRelative
     * @param {boolean} expectAbsolute
     * @returns {IdentifierValue} */
    evaluate(instr, allowPCRelative = true, expectAbsolute = false)
    {
        if(this.stack.length == 0)
            return new IdentifierValue({ section: pseudoSections.ABS });
        
        /** @type {IdentifierValue[]} */
        let stack = [], len = 0;
        for(const op of this.stack)
        {
            const func = op.func;
            if(func)
            {
                if(op.unary)
                {
                    if(func == '+')
                        continue;
                    const val = stack[len - 1], minusRelative = val.section == instr.section && func == '-';
                    if(val.regData || val.section != pseudoSections.ABS && !minusRelative || minusRelative && !allowPCRelative)
                        throw new ASMError("Bad operand", val.range);
                    if(minusRelative)
                        val.pcRelative = true;
                    val.addend = unaries[func].func(val.addend);
                }
                else
                {
                    stack[len - 2].apply(instr, func, stack.pop(), allowPCRelative);
                    len--;
                }
            }
            else
                stack[len++] = op.getValue(instr);
        }
        if(stack.length > 1)
            throw new ASMError("Invalid expression", stack[0].range);
        
        if(expectAbsolute)
            if(stack[0].section != pseudoSections.ABS)
                throw new ASMError("Expected absolute expression", stack[0].range);
        return stack[0];
    }

    /**
     * @param {string} func
     * @param {Expression} expr */
    apply(func, expr = null)
    {
        if(expr === null)
            this.stack.push({ func, unary: true });
        else if(expr.stack.length > 0)
        {
            this.stack.push(...expr.stack, { func, unary: false });
            this.hasSymbols = this.hasSymbols || expr.hasSymbols;
            this.vecSize = this.vecSize || expr.vecSize;
            this.ripRelative = this.ripRelative || expr.ripRelative;
        }
    }
}

export function CurrentIP(instr)
{
    this.hasSymbols = true;
    this.pcRelative = false;
    this.stack = [new SymbolIdentifier(instr, instr.syntax.intel ? '$' : '.', currRange)];
}
CurrentIP.prototype = Object.create(Expression.prototype);

/** Check if a symbol's definition contains a recursion
 * @param {import("./symbols.js").Symbol} symbol The checked symbol
 * @param {Set.<import("./symbols.js").Symbol>} passed The symbols that have been passed
 * @returns {boolean}
 */
function checkSymbolRecursion(symbol, passed = new Set())
{
    if(passed.has(symbol))
        return true;

    passed.add(symbol);
    for(const use of symbol.uses)
        if(checkSymbolRecursion(use, passed))
            return true;

    passed.delete(symbol);
    return false;
}