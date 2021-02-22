function parseDirective()
{
    let imm;
    switch(token)
    {
        case '.byte':
            while(next() != ';' && token != '\n')
            {
                if(token != ',')
                {
                    imm = new Immediate(token, 8);
                    genByte(imm.value);
                }
            }
            break;
        
        case '.string':
            while(next() != ';' && token != '\n')
            {
                if(token[0] != '"' && token != ',')
                {
                    throw "Expected string";
                }

                for(let c of token.slice(1, token.length - 1))
                {
                    genByte(BigInt(c.charCodeAt(0)));
                }
            }
            break;

        default:
            throw "Unknown directive";
    }
}