function parseInstruction(opcode)
{
    let operand = null, size = -1, hasRex = null, rexVal = 0x40;
    let prefsToGen = new Set();

    if(prefixes.hasOwnProperty(opcode))
    {
        genByte(prefixes[opcode]);
        ungetToken(token);
        token = ';';
        return;
    }

    if(!mnemonics.hasOwnProperty(opcode))
    {
        size = suffixes[opcode[opcode.length - 1]];
        opcode = opcode.slice(0, -1);
        if(!mnemonics.hasOwnProperty(opcode))
            throw "Unknown opcode";
        if(size === undefined)
            throw "Invalid opcode suffix";
    }
    let variations = mnemonics[opcode], operands = [];

    while(token != ';' && token != '\n')
    {
        operand = new Operand();
        if(token == ':') // Segment specification for addressing
        {
            if(operand.type != OPT.SEG)
                throw "Incorrect prefix";
            prefsToGen.add([0x26, 0x2E, 0x36, 0x3E, 0x64, 0x65][operand.reg])
            next();
            operand = new Operand();
            if(operand.type != OPT.MEM)
                throw "Segment prefix must be followed by memory reference";
        }

        operands.push(operand);
        for(let p of operand.prefixRequests)
        {
            if(!isNaN(p))
                prefsToGen.add(p);
            else if(p.startsWith("REX"))
            {
                if(hasRex === false) throw "Can't encode higher 8-bit register";
                hasRex = true;
                if(p[3] == '.')
                {
                    rexVal |= ({R: 4, X: 2, B: 1})[p[4]];
                }
            }
            else if(p == "NO REX")
            {
                if(hasRex) throw "Can't encode higher 8-bit register";
                hasRex = false;
            }
        }

        if(operand.size > 0)
        {
            if(size < 0) size = operand.size;
            else if(operand.size < size) size = operand.size; // Always take the minimum size
        }

        if(token != ',') break;
        next();
    }

    if(size == 64) rexVal |= 8, hasRex = true;

    if(size < 0) throw "Cannot infer operand size";
    for(let o of operands) o.size = size;
    console.log(operands);

    let i;
    mnemonicLoop:
    for(let mnemonic of variations)
    {
        if(mnemonic.operandFilters.length != operands.length) continue;
        for(i = 0; i < operands.length; i++)
        {
            if(!mnemonic.operandFilters[i](operands[i])) continue mnemonicLoop;
        }

        prefsToGen.forEach(genByte);
        if(size == 16) genByte(0x66);
        if(hasRex) genByte(rexVal);
        genByte(mnemonic.opcode);
        return;
    }
    throw "Invalid operands";
}