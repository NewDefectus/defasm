function parseInstruction(opcode)
{
    let segment = 0, operand = null, type = 0;

    if(prefixes.hasOwnProperty(opcode))
    {
        genByte(prefixes[opcode]);
        ungetToken(token);
        token = ';';
        return;
    }

    if(!mnemonics.hasOwnProperty(opcode))
    {
        type = suffixes[opcode[opcode.length - 1]];
        opcode = opcode.slice(0, -1);
        if(!mnemonics.hasOwnProperty(opcode))
            throw "Unknown opcode";
        if(type === undefined)
            throw "Invalid opcode suffix";
    }
    let variations = mnemonics[opcode], operands = [];

    while(token != ';' && token != '\n')
    {
        operand = parseOperand();
        if(token == ':') // Segment specification for addressing
        {
            if(operand.type != OPT.SEG)
                throw "Incorrect prefix";
            segment = operand.reg;
            next();
            operand = parseOperand();
            if((operand.type & OPT.EA) == 0)
                throw "Segment prefix must be followed by memory reference";
        }
        operands.push(operand);
        if(token != ',') break;
        next();
    }


}