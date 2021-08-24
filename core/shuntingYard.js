import { isRegister, nameRegister, OPT, parseRegister, regParsePos } from "./operands.js";
import { ASMError, currRange, next, Range, setToken, token, ungetToken } from "./parser.js";
import { symbols } from "./symbols.js";
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
            let bytes = readString(token, instr.lineEnds ?? {}), i = bytes.length;
            
            while(i--)
            {
                value <<= 8n;
                value += BigInt(bytes[i]);
            }
        }
        else
        {
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
        }
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

/**
 * @typedef {Object} IdentifierValue
 * @property {BigInt?} addend
 * @property {import('./symbols.js').SymbolRecord} symbol
 * @property {Section} section
 * @property {Range} range
 * @property {RegisterData?} regData
 * @property {boolean?} pcRelative */

class Identifier
{
    /**
     * @param {Statement} instr
     * @param {Number} value
     * @param {Range} range */
    constructor(instr, value, range)
    {
        this.value = value;
        this.range = range;
    }

    /**
     * @param {Statement} instr
     * @returns {IdentifierValue} */
    getValue(instr)
    {
        return {
            addend: this.value,
            symbol: null,
            section: pseudoSections.ABS,
            range: this.range,
            pcRelative: false
        };
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
            return {
                addend: BigInt(instr.address),
                symbol: (instr.section.head?.statement ?? instr).record,
                section: instr.section,
                range: this.range,
                pcRelative: false
            };
        const record = symbols.get(this.name);
        if(record.symbol && !record.symbol.error)
        {
            if(instr.record && checkSymbolRecursion(instr.record, record))
                throw new ASMError(`Recursive definition`, this.range);
            return {
                addend: 0n,
                symbol: record,
                section: record.value.section,
                range: this.range,
                pcRelative: false,
            };
        }
        return {
            addend: 0n,
            symbol: record,
            section: pseudoSections.UND,
            range: this.range,
            pcRelative: false,
        };
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
        return {
            addend: null,
            symbol: null,
            section: pseudoSections.ABS,
            range: this.range,
            pcRelative: false,
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
        }
    }
}

export class Expression
{
    /** @param {Statement} instr */
    constructor(instr, expectMemory = false, uses = null)
    {
        this.hasSymbols = false;
        this.vecSize = 0;

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
                            break;
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

        if(this.stack.length === 0 && !expectMemory)
            throw new ASMError("Expected expression");

        if(expectMemory && opStack.length == 1 && opStack[0].bracket)
        {
            ungetToken();
            setToken('(');
            return;
        }
        else if(!lastWasNum)
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
            else if(id.name)
            {
                if(!id.isIP)
                {
                    let record;
                    if(symbols.has(id.name))
                    {
                        record = symbols.get(id.name);
                        record.references.push(instr);
                    }
                    else
                        symbols.set(id.name, record = {
                            symbol: null,
                            name: id.name,
                            references: [instr],
                            uses: []
                        });
                    if(uses !== null)
                        uses.push(record);
                }
                this.hasSymbols = true;
            }
        }
    }

    /**
     * @param {Statement} instr
     * @returns {IdentifierValue} */
    evaluate(instr)
    {
        if(this.stack.length == 0)
            return {
                section: pseudoSections.ABS,
                value: null
            };
        
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
                    if(val.regData || val.section != pseudoSections.ABS && !minusRelative)
                        throw new ASMError("Bad operand", val.range);
                    if(minusRelative)
                        val.pcRelative = true;
                    val.addend = unaries[func].func(val.addend);
                }
                else
                {
                    let op1 = stack[len - 2], op2 = stack.pop();
                    len--;
                    op1.range = op1.range.until(op2.range);

                    if(op1.section == pseudoSections.ABS && op2.section == pseudoSections.ABS)
                        ;
                    else if(op1.section == pseudoSections.ABS && !op1.pcRelative && func == '+')
                    {
                        op1.section = op2.section;
                        op1.symbol = op2.symbol;
                    }
                    else if(op2.section == pseudoSections.ABS && (func == '+' || func == '-'))
                        ;
                    else if(op1.pcRelative || op2.pcRelative)
                        throw new ASMError("Bad operands", op1.range);
                    else if(op1.section == op2.section && op1.section != pseudoSections.UND && func == '-')
                    {
                        op1.section = pseudoSections.ABS;
                        if(op1.symbol)
                            op1.addend += op1.symbol.value.addend;
                        if(op2.symbol)
                            op2.addend += op2.symbol.value.addend;
                        op1.symbol = null;
                    }
                    else if(!instr.record && op2.section == instr.section && func == '-')
                    {
                        op1.pcRelative = true;
                        if(op2.addend)
                            op2.addend = 0n;
                    }
                    else
                        throw new ASMError("Bad operands", op1.range);
                    
                    if(op1.regData || op2.regData)
                    {
                        let regOp = op1.regData ? op1 : op2;
                        let nonRegOp = op1.regData ? op2 : op1;
                        stack[len - 1] = nonRegOp;

                        if(func != '+' && func != '-' && func != '*' ||
                            func == '-' && op2.regData)
                            throw new ASMError("Bad operands", op1.range);
                        
                        if(!nonRegOp.regData)
                            nonRegOp.regData = regOp.regData;
                        else
                        {
                            if(func == '*')
                                throw new ASMError("Bad operands", op1.range);
                            if(regOp.regData.regIndex && nonRegOp.regData.regIndex)
                                throw new ASMError("Can't have multiple index registers", op1.range);
                            if([regOp.regData, nonRegOp.regData].some(data => data.regBase && data.regIndex))
                                throw new ASMError("Too many registers", op1.range);
                            
                            if(regOp.regData.regBase && nonRegOp.regData.regBase)
                            {
                                nonRegOp.regData.regIndex = [nonRegOp.regData.regBase, regOp.regData.regBase].find(reg => reg.reg != 4);
                                if(nonRegOp.regData.regIndex === undefined)
                                    throw new ASMError(`Can't have both registers be ${instr.syntax.prefix ? '%' : ''}rsp`, op1.range);
                                if(nonRegOp.regData.regIndex == nonRegOp.regData.regBase)
                                    nonRegOp.regData.regBase = regOp.regData.regBase;
                            }
                            else if(regOp.regData.regIndex)
                            {
                                nonRegOp.regData.regIndex = regOp.regData.regIndex;
                                nonRegOp.regData.shift = regOp.regData.shift;
                            }
                            else
                                nonRegOp.regData.regBase = regOp.regData.regBase;
                        }

                        if(func == '*')
                        {
                            if(nonRegOp.section != pseudoSections.ABS)
                                throw new ASMError("Scale must be absolute", nonRegOp.range);
                            if(regOp.regData.regIndex && regOp.regData.regBase)
                                throw new ASMError("Can't scale both base and index registers", op1.range);
                            if(regOp.regData.regBase)
                            {
                                const scaled = regOp.regData.regBase;
                                if(scaled.reg == 4)
                                    throw new ASMError(`Can't scale ${nameRegister('sp', scaled.size, instr.syntax)}`, op1.range);
                                if(scaled.type == OPT.IP)
                                    throw new ASMError(`Can't scale ${nameRegister('ip', scaled.size, instr.syntax)}`, op1.range);
                                nonRegOp.regData.regIndex = scaled;
                                nonRegOp.regData.regBase = null;
                            }
                            nonRegOp.regData.shift *= Number(nonRegOp.addend);   
                            nonRegOp.addend = regOp.addend !== null ? nonRegOp.addend * regOp.addend : null;
                        }
                        else if(op1.addend !== null || op2.addend !== null)
                            nonRegOp.addend = operators[func].func(op1.addend ?? 0n, op2.addend ?? 0n);
                    }
                    else
                        op1.addend = operators[func].func(op1.addend, op2.addend);
                    op1.pcRelative = op1.pcRelative || op2.pcRelative;
                }
            }
            else
                stack[len++] = op.getValue(instr);
        }
        if(stack.length > 1)
            throw new ASMError("Invalid expression");

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

function checkSymbolRecursion(origin, record)
{
    if(record === origin)
        return true;
    for(const use of record.uses)
        if(use.symbol && !use.symbol.error && checkSymbolRecursion(origin, use))
            return true;
    return false;
}