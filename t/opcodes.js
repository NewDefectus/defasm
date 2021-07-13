"use strict";

// All opcodes test

const reverseObject = obj => Object.assign({}, ...Object.keys(obj).map(x => ({[obj[x]]: x})))

exports.run = async function()
{
    const { AssemblyState } = await import("@defasm/core");
    const { mnemonics, fetchMnemonic, relativeMnemonics } = await import("@defasm/core/mnemonicList.js");
    const { EVEXPERM_FORCE } = await import("@defasm/core/mnemonics.js");
    const { execSync } = require('child_process');
    const { readFileSync, writeFileSync } = require('fs');

    const { OPT, registers, suffixes } = await import("@defasm/core/operands.js");
    const regNames = reverseObject(registers);
    const suffixNames = reverseObject(suffixes);
    suffixNames[32] = 'l';
    const vecNames = { 64: 'mm', 128: 'xmm', 256: 'ymm', 512: 'zmm' };

    function makeOperand(type, size, index, value = null)
    {
        let id = value === null ? index : value;
        
        switch(type)
        {
            case OPT.REG:  return '%' + regNames[Math.log2(size / 8) * 8 + id];
            case OPT.VEC:  return '%' + vecNames[size] + id;
            case OPT.VMEM: return '(,%' + vecNames[size] + id + ')';
            case OPT.IMM:  return value === null ? '$' + (1 << (size - 4)) : '$' + value;
            case OPT.MASK: return '%k' + id;
            case OPT.REL:  return '.';
            case OPT.MEM:  return '(%' + regNames[24 + id] +')';
            case OPT.ST:   return '%st' + (id ? '(' + id + ')' : '');
            case OPT.SEG:  return '%' + regNames[32 + id];
            case OPT.IP:   return size == 32 ? '%eip' : '%rip';
            case OPT.BND:  return '%bnd' + id;
            case OPT.CTRL: return '%cr' + id;
            case OPT.DBG:  return '%dr' + id;
        }

        throw "Unknown operand type";
    }

    let source = "";

    function recurseOperands(opcode, opCatchers, isVex, i = 0, operands = [], prevSize = null, total = 0, sizeSuffix = "")
    {
        if(opCatchers.length == 0)
        {
            source += opcode + '\n';
            return;
        }

        let nextI = (i + 1) % opCatchers.length;
        let catcher = opCatchers[i];
        let sizes = catcher.sizes;

        let showSuffix = Array.isArray(sizes);

        if(sizes == 0) // Size is arbitrary
            sizes = [32];
        if(sizes == -1 && opCatchers.length == 1)
            sizes = [32];

        if(prevSize === null && !Array.isArray(sizes))
        {
            recurseOperands(opcode, opCatchers, isVex, nextI);
            return;
        }
        
        if(sizes == -1)
            sizes = [prevSize];
        
        if(sizes == -2)
        {
            sizes = [(prevSize & ~7) >> 1];
            if(sizes[0] < 128)
                sizes[0] = 128;
        }

        let forceMemory = false;
        
        while(true)
        {
            for(let size of sizes)
            {
                let type = forceMemory ? OPT.MEM : catcher.type;
                let sizeSuffixOriginal = sizeSuffix;
                if((type == OPT.MEM || type == OPT.MASK) && showSuffix && size != (isVex ? catcher.defVexSize : catcher.defSize))
                {
                    sizeSuffix = suffixNames[size & ~7];
                }
                if(!isVex && size >= 256 || (size & ~7) == 48)
                    continue;
                if(isVex && size < 128 && type == OPT.VEC)
                    continue;
                
                operands[i] = makeOperand(type, size & ~7, total + 1, catcher.implicitValue);

                if(total + 1 >= opCatchers.length)
                {
                    source += opcode + sizeSuffix + ' ' +
                    ((relativeMnemonics.includes(opcode) || opcode == 'lcall' || opcode == 'ljmp') && type != OPT.REL ? '*' : '')
                    + operands.join(', ') + '\n';
                }
                else
                    recurseOperands(opcode, opCatchers, isVex, nextI, operands, catcher.carrySizeInference ? size : prevSize, total + 1, sizeSuffix);
                sizeSuffix = sizeSuffixOriginal;
            }

            if(!forceMemory && catcher.acceptsMemory && catcher.type != OPT.MEM && catcher.type != OPT.VMEM && catcher.type != OPT.REL)
                forceMemory = true;
            else
                break;
        }
    }

    /** @param { Operation } operation */
    function sampleOperation(opcode, operation)
    {
        if(!(operation.vexOnly || operation.evexPermits & EVEXPERM_FORCE || opcode[0] == 'v' && !operation.actuallyNotVex))
        {
            recurseOperands(opcode, operation.opCatchers, false);
        }

        if(operation.allowVex || operation.vexOnly)
        {
            recurseOperands(opcode[0] == 'v' ? opcode : 'v' + opcode, operation.vexOpCatchers, true);
        }
    }

    // Main starts here
    for(let opcode of Object.keys(mnemonics))
    {
        let ops = fetchMnemonic(opcode, false);

        for(let operation of ops)
        {
            sampleOperation(opcode, operation) + '\n\n';
        }
    }
    
    writeFileSync("allOpcodeTestSource.s", source);

    let state = new AssemblyState();
    state.compile(source, { haltOnError: true });

    /*
    // Assembling the code with GAS and comparing the results
    execSync("as -o /tmp/opcodeTest.o", {
        input: ".globl _start\n_start:\n" + source
    });

    execSync("ld --oformat binary -o /tmp/opcodeTest /tmp/opcodeTest.o");
    let asOutput = readFileSync("/tmp/opcodeTest");

    if(!asOutput.equals(state.dump()))
    {
        throw "Incorrect";
    }*/
}

if(require.main === module)
{
    exports.run().then(x => process.exit(0)).catch(x => { console.error(x); process.exit(1) });
}