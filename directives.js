function parseDirective()
{
    let imm;
    switch(token)
    {
        case '.byte':
            do
            {
                imm = parseImmediate(opTypes.IM8)[0];
                genByte(imm);
            }
            while(token == ',')
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