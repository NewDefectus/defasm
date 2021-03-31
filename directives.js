import { token, next } from "./parser.js";
import { clearLabelDependency, labelDependency, parseImmediate } from "./operands.js";

// A directive is like a simpler instruction, except while an instruction is limited to
// 15 bytes, a directive is infinitely flexible in size.

const DIRECTIVE_BUFFER_SIZE = 15;
const encoder = new TextEncoder();

export function Directive(dir)
{
    this.bytes = new Uint8Array(DIRECTIVE_BUFFER_SIZE);
    this.length = 0;
    this.outline = null;

    let value, needsRecompilation = false, appendNullByte = 0;

    try
    {
        switch(dir)
        {
            case "byte":
                this.outline = [];
                do
                {
                    clearLabelDependency();
                    value = parseImmediate();
                    if(labelDependency !== null)
                    {
                        value = labelDependency;
                        needsRecompilation = true;
                        this.genByte(1n);
                    }
                    else
                    {
                        this.genByte(value);
                    }
                    this.outline.push(value);
                } while(token === ',');

                if(!needsRecompilation) this.outline = null;
                break;

            case "asciz":
                appendNullByte = 1;
            case "string":
            case "ascii":
                let strBytes, temp;
                this.bytes = new Uint8Array();
                do
                {
                    if(next().length > 1 && token[0] === '"' && token[token.length - 1] === '"')
                    {
                        strBytes = encoder.encode(eval(token));
                        temp = new Uint8Array(this.length + strBytes.length + appendNullByte);
                        temp.set(this.bytes);
                        temp.set(strBytes, this.length);
                        this.bytes = temp;
                        this.length = temp.length;
                    }
                    else throw "Expected string";
                } while(next() === ',');
                break;
            
            default:
                throw "Unknown directive";
        }
    }
    catch(e)
    {
        if(this.length === 0) throw e; // Only propagate the exception if the directive is empty
    }
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
            this.genByte(BigInt(labels.get(value) - index - i));
        }
        else this.genByte(value);
    }
    return this.length - initialLength;
}

Directive.prototype.genByte = function(byte)
{
    this.bytes[this.length++] = Number(byte & 0xffn);

    // Resize the array if necessary
    if(this.length === this.bytes.length)
    {
        let temp = new Uint8Array(this.bytes.length + DIRECTIVE_BUFFER_SIZE);
        temp.set(this.bytes);
        this.bytes = temp;
    }
}