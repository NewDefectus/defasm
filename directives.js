import { token, next } from "./parser.js";
import { clearLabelDependency, floatToInt, labelDependency, parseImmediate, unescapeString } from "./operands.js";

// A directive is like a simpler instruction, except while an instruction is limited to
// 15 bytes, a directive is infinitely flexible in size.

const DIRECTIVE_BUFFER_SIZE = 15;
const encoder = new TextEncoder();

export const dirs = {
    byte:   1,
    short:  2,
    int:    3,
    long:   4,
    float:  5,
    double: 6,
    asciz:  7,
    ascii:  8,
    string: 8 // .string and .ascii are identical
}

export function Directive(dir)
{
    this.bytes = new Uint8Array(DIRECTIVE_BUFFER_SIZE);
    this.length = 0;
    this.newlines = 0;
    this.outline = null;
    this.floatPrec = 0;

    let appendNullByte = 0;

    try
    {
        if(!dirs.hasOwnProperty(dir)) throw "Unknown directive";
        switch(dirs[dir])
        {
            case dirs.byte:     this.compileValues(1); break;
            case dirs.short:    this.compileValues(2); break;
            case dirs.int:      this.compileValues(4); break;
            case dirs.long:     this.compileValues(8); break;

            case dirs.float:    this.floatPrec = 1; this.compileValues(4); break;
            case dirs.double:   this.floatPrec = 2; this.compileValues(8); break;

            case dirs.asciz:
                appendNullByte = 1;
            case dirs.ascii:
                let strBytes, temp;
                this.bytes = new Uint8Array();
                do
                {
                    if(next().length > 1 && token[0] === '"' && token[token.length - 1] === '"')
                    {
                        strBytes = encoder.encode(unescapeString(token));
                        temp = new Uint8Array(this.length + strBytes.length + appendNullByte);
                        temp.set(this.bytes);
                        temp.set(strBytes, this.length);
                        this.bytes = temp;
                        this.length = temp.length;
                    }
                    else throw "Expected string";
                } while(next() === ',');
                break;
        }
    }
    catch(e)
    {
        if(this.length === 0) throw e; // Only propagate the exception if the directive is empty
    }
}

Directive.prototype.compileValues = function(valSize)
{
    this.valSize = valSize;
    let value, needsRecompilation = false;
    this.outline = [];
    do
    {
        clearLabelDependency();
        value = parseImmediate(this.floatPrec);
        if(labelDependency !== null)
        {
            value = labelDependency;
            needsRecompilation = true;
            this.genValue(1n);
        }
        else
        {
            this.genValue(value);
        }
        this.outline.push(value);
    } while(token === ',');

    if(!needsRecompilation) this.outline = null;
}

Directive.prototype.resolveLabels = function(labels, index)
{
    let initialLength = this.length;
    index -= initialLength;
    this.length = 0;
    let value;

    for(let i = 0; i < this.outline.length; i++)
    {
        value = this.outline[i];
        if(typeof value === "string")
        {
            if(!labels.has(value))
            {
                if(i === 0) return null;
                this.outline = this.outline.slice(0, i);
                i = -1;
                this.length = 0;
                continue;
            }
            value = BigInt(labels.get(value) - index - i * this.valSize);
            this.genValue(floatToInt(value, this.floatPrec));
        }
        else this.genValue(value);
    }
    return this.length - initialLength;
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