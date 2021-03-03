// A directive is like a simpler instruction, except while an instruction is limited to
// 15 bytes, a directive is infinitely flexible in size.

function Directive()
{
    this.bytes = new Uint8Array(MAX_INSTR_SIZE);
    this.length = 0;
}

Directive.prototype.genByte = function(byte)
{
    this.bytes[this.length++] = Number(byte & 0xffn);

    // Resize the array if necessary
    if(this.length == this.bytes.length)
    {
        let temp = new Uint8Array(this.bytes.length + MAX_INSTR_SIZE);
        temp.set(this.bytes);
        this.bytes = temp;
    }
}


function parseDirective()
{
    let imm;
    let result = new Directive();
    try
    {
        switch(token)
        {
            case '.byte':
                do
                {
                    imm = parseImmediate();
                    result.genByte(imm);
                }
                while(token == ',')
                break;
            
            case '.string':
                while(next() != ';' && token != '\n')
                {
                    if(token[0] != '"' && token[0] != "'" && token != ',')
                    {
                        throw "Expected string";
                    }

                    for(let c of token.slice(1, token.length - 1))
                    {
                        result.genByte(BigInt(c.charCodeAt(0)));
                    }
                }
                break;

            default:
                throw "Unknown directive";
        }
    }
    catch(e)
    {
        // Only throw the exception up if no directive should be generated
        if(result.length == 0)
            throw e;
        console.warn(e);
    }
    return result;
}