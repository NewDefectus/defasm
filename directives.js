import { token, next } from "./parser.js";
import { parseImmediate } from "./operands.js";

// A directive is like a simpler instruction, except while an instruction is limited to
// 15 bytes, a directive is infinitely flexible in size.

const DIRECTIVE_BUFFER_SIZE = 15;

function Directive()
{
    this.bytes = new Uint8Array(DIRECTIVE_BUFFER_SIZE);
    this.length = 0;
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

const encoder = new TextEncoder();

const directives = {
byte: result => {
    do { result.genByte(parseImmediate()) } while(token === ',');
},
string: result => {
    if(next().length > 1 && token[0] === '"' && token[token.length - 1] === '"')
    {
        result.bytes = encoder.encode(eval(token));
        result.length = result.bytes.length;
    }
    else throw "Expected string";
    if(next() !== ';' && token !== '\n') throw "Expected end of line";
}
}


export function parseDirective()
{
    let result = new Directive();
    let dir = token.slice(1); // Drop the .
    if(directives.hasOwnProperty(dir))
    {
        try
        {
            directives[dir](result);
        }
        catch(e)
        {
            if(result.length == 0)
                throw e;
            console.warn(e);
        }
    }
    return result;
}