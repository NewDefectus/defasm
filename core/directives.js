import { token, next, ParserError }   from "./parser.js";
import { Expression, unescapeString } from "./shuntingYard.js";

// A directive is like a simpler instruction, except while an instruction is limited to
// 15 bytes, a directive is infinitely flexible in size.

const DIRECTIVE_BUFFER_SIZE = 15;
const encoder = new TextEncoder();

export const dirs = {
    byte:   1,
    short:  2,
    word:   2, // .word = .short
    hword:  2, // .hword = .short
    int:    3,
    long:   3, // .long = .int
    quad:   4,
    octa:   5,
    float:  6,
    single: 6, // .single = .float
    double: 7,
    asciz:  8,
    ascii:  9,
    string: 9 // .string = .ascii
}

export function Directive(address, dir)
{
    this.bytes = new Uint8Array(DIRECTIVE_BUFFER_SIZE);
    this.length = 0;
    this.outline = null;
    this.floatPrec = 0;
    this.address = address;

    let appendNullByte = 0;

    try
    {
        if(!dirs.hasOwnProperty(dir)) throw new ParserError("Unknown directive");
        switch(dirs[dir])
        {
            case dirs.byte:     this.compileValues(1); break;
            case dirs.word:     this.compileValues(2); break;
            case dirs.int:      this.compileValues(4); break;
            case dirs.quad:     this.compileValues(8); break;
            case dirs.octa:     this.compileValues(16); break;


            case dirs.float:    this.floatPrec = 1; this.compileValues(4); break;
            case dirs.double:   this.floatPrec = 2; this.compileValues(8); break;

            case dirs.asciz:
                appendNullByte = 1;
            case dirs.ascii:
                let strBytes, temp;
                this.bytes = new Uint8Array();
                do
                {
                    if(next()[0] === '"')
                    {
                        strBytes = encoder.encode(unescapeString(token));
                        temp = new Uint8Array(this.length + strBytes.length + appendNullByte);
                        temp.set(this.bytes);
                        temp.set(strBytes, this.length);
                        this.bytes = temp;
                        this.length = temp.length;
                    }
                    else throw new ParserError("Expected string");
                } while(next() === ',');
                break;
        }
    }
    catch(e)
    {
        this.error = e;
        while(token !== ';' && token !== '\n') next();
    }
}

Directive.prototype.compileValues = function(valSize)
{
    this.valSize = valSize;
    let value, expression, needsRecompilation = false;
    this.outline = [];
    try {
        do
        {
            expression = new Expression(this, this.floatPrec);
            value = expression.evaluate(this.address);
            if(expression.hasSymbols)
                needsRecompilation = true;

            this.outline.push({ value, expression });
            this.genValue(value);
        } while(token === ',');
    }
    finally
    {
        if(!needsRecompilation) this.outline = null;
    }
}

Directive.prototype.recompile = function()
{
    let op, outlineLength = this.outline.length;
    this.length = 0;
    this.error = null;

    for(let i = 0; i < outlineLength; i++)
    {
        op = this.outline[i];
        try
        {
            if(op.expression.hasSymbols)
                op.value = op.expression.evaluate(this.address + i * this.valSize, true);
            this.genValue(op.value);
        }
        catch(e)
        {
            this.error = e;
            outlineLength = i;
            i = -1;
            this.length = 0;
        }
    }
}

Directive.prototype.genValue = function(value)
{
    for(let i = 0; i < this.valSize; i++)
    {
        this.bytes[this.length++] = Number(value & 0xffn);
        value >>= 8n;

        // Resize the array if necessary
        if(this.length === this.bytes.length)
        {
            let temp = new Uint8Array(this.bytes.length + DIRECTIVE_BUFFER_SIZE);
            temp.set(this.bytes);
            this.bytes = temp;
        }
    }
}