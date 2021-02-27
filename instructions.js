function parseInstruction(opcode)
{
    let operand = null, size = -1, hasRex = null, rexVal = 0x40;
    let prefsToGen = new Set();
    let reg = null, rm = null, imm = null, moff = null;

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
    let variations = mnemonics[opcode], operands = [], hateRex = false;

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
            else if(p == "NO REX")
                hateRex = true;
            else if(p.startsWith("REX"))
            {
                hasRex = true;
                if(p[3] == '.')
                {
                    rexVal |= ({R: 4, X: 2, B: 1})[p[4]];
                }
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

    //console.log(operands);
    if(size < 0 && operands.length > 0) throw "Cannot infer operand size";
    for(let o of operands) o.size = size;

    let i, mnemonic, found = false;
    mnemonicLoop:
    for(mnemonic of variations)
    {
        if(mnemonic.operandFilters.length != operands.length) continue;
        for(i = 0; i < operands.length; i++)
        {
            if(!mnemonic.operandFilters[i](operands[i])) continue mnemonicLoop;
        }

        found = true;
        break;
    }
    if(!found) throw "Invalid operands";



    // Finding the reg/rm/immediate operands
    if(mnemonic.operandFilters.length > 0)
    {
        i = 0;
        for(let op of mnemonic.operandFilters)
        {
            if(OPFF.rm(op)) rm = operands[i];
            else if(OPFF.imm(op)) imm = operands[i];
            else if(OPFF.r(op)) reg = operands[i];
            else if(OPFF.moff(op)) moff = operands[i];
            i++;
        }
    }

    if(size == 64 && mnemonic.defsTo64 !== true) rexVal |= 8, hasRex = true;
    
    let extraRex, modRM = -1;
    if(mnemonic.e == REG_OP || mnemonic.e == REG_NON)
    {
        if(mnemonic.e == REG_OP && reg.reg >= 8) rexVal |= 1, hasRex = true;
    }
    else
    {
        [extraRex, modRM] = makeModRM(rm, reg);
        if(extraRex != 0) rexVal |= extraRex, hasRex = true;
    }

    if(hasRex && hateRex) throw "Can't encode high 8-bit register";

    // Time to generate!
    prefsToGen.forEach(genByte);
    if(size == 16) genByte(0x66);
    if(hasRex) genByte(rexVal);
    genByte(mnemonic.opcode | (mnemonic.e == REG_OP ? reg.reg & 7 : 0));
    if(modRM >= 0) genByte(modRM);

    // Generating the displacement and immediate
    console.log(mnemonic.operandFilters)
    if(rm != null && rm.value != null || moff != null)
    {
        if(rm == null)
        {
            genInteger(moff.value, 64);
        }
        else
        {
            genInteger(rm.value, (rm.value >= 0x80n || rm.value < -0x80n) ? 32 : 8);
        }
    }
    if(imm) genInteger(imm.value, imm.size)
}

// Generate the ModRM byte
function makeModRM(rm, r)
{
    let modrm = 0, rex = 0;

    // Encoding the "mod" (modifier) field
    if(rm.type == OPT.REG) modrm |= 0xC0; // mod=11
    else if((rm.value >= 0x80n || rm.value < -0x80n) && rm.reg >= 0) modrm |= 0x80; // mod=10
    else if(rm.reg >= 0) modrm |= 0x40; // mod=01
    // else mod=00

    // Encoding the "reg" field
    modrm |= r.reg << 3;
    
    // Encoding the "rm" field
    modrm |= rm.reg;


    return [rex, modrm]
}