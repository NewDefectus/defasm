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

        default:
            throw "Unknown directive";
    }
}