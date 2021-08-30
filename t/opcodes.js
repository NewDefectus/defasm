#!/usr/bin/env node
"use strict";

// All opcodes test

const reverseObject = obj => Object.assign({}, ...Object.keys(obj).map(x => ({[obj[x]]: x})))

exports.run = async function()
{
    const { AssemblyState, fetchMnemonic } = await import("@defasm/core");
    const { mnemonics } = await import("@defasm/core/mnemonicList.js");
    const { execSync } = require('child_process');
    const { readFileSync } = require('fs');

    const { OPT, registers, suffixes, floatSuffixes, floatIntSuffixes } = await import("@defasm/core/operands.js");
    const regNames = reverseObject(registers);
    const suffixNames = reverseObject(suffixes);
    const floatSuffixNames = reverseObject(floatSuffixes);
    const floatIntSuffixNames = reverseObject(floatIntSuffixes);
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
            case OPT.REL:  return '.+' + (1 << (size - 4));
            case OPT.MEM:  return '(%' + regNames[24 + id] +')';
            case OPT.ST:   return '%st' + (id ? '(' + id + ')' : '');
            case OPT.SEG:  return '%' + regNames[32 + id];
            case OPT.IP:   return size == 32 ? '%eip' : '%rip';
            case OPT.BND:  return '%bnd' + id;
            case OPT.CTRL: return '%cr' + id;
            case OPT.DBG:  return '%dr' + id;
        }

        throw `Unknown operand type '${type}'`;
    }

    let source = "";

    /**
     * 
     * @param {string} opcode 
     * @param {import('@defasm/core/mnemonicList.js').Mnemonic} mnemonic 
     * @param {Operation} operation 
     * @param {number} i 
     * @param {string[]} operands 
     * @param {number} prevSize 
     * @param {number} total 
     * @param {string} sizeSuffix 
     * @returns 
     */
    function recurseOperands(opcode, mnemonic, operation, i = 0, operands = [], prevSize = null, total = 0, sizeSuffix = "")
    {
        let opCatchers = mnemonic.vex ? operation.vexOpCatchers : operation.opCatchers;
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

        if(prevSize === null && !Array.isArray(sizes))
        {
            if(nextI == 0) // We've wrapped around without finding a size, so the operation is sizeless
            {
                sizes = [32];
                for(let i = 0; i < opCatchers.length; i++)
                {
                    if(operands[i] === undefined)
                        operands[i] = makeOperand(opCatchers[i].type, 32, i + 1, opCatchers[i].implicitValue);
                }
                source += opcode + ' ' + 
                (opcode == 'lcall' || opcode == 'ljmp' ? '*' : '')
                +
                operands.join(', ') + '\n';
                return;
            }
            else
            {
                recurseOperands(opcode, mnemonic, operation, nextI, operands);
                return;
            }
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
                if(type == OPT.MEM && showSuffix && size != (mnemonic.vex ? catcher.defVexSize : catcher.defSize))
                {
                    sizeSuffix = (
                        opcode[0] == 'f' ?
                            opcode[1] == 'i' ?
                                floatIntSuffixNames
                            :
                                floatSuffixNames
                        :
                            suffixNames)[size & ~7];
                }
                if(!mnemonic.vex && size >= 256 || (size & ~7) == 48)
                    continue;
                if(mnemonic.vex && size < 128 && type == OPT.VEC)
                    continue;
                
                operands[i] = makeOperand(type, size & ~7, total + 1, catcher.implicitValue);

                if(total + 1 >= opCatchers.length)
                {
                    source += opcode + sizeSuffix + ' ' +
                    (mnemonic.relative && type != OPT.REL ? '*' : '')
                    + operands.join(', ') 
                    + (operation.requireMask ? ' {%k1}' : '')
                    + '\n';
                }
                else
                    recurseOperands(opcode, mnemonic, operation, nextI, operands, catcher.carrySizeInference ? size : prevSize, total + 1, sizeSuffix);

                sizeSuffix = sizeSuffixOriginal;
            }

            if(!forceMemory && catcher.acceptsMemory && catcher.type != OPT.MEM && catcher.type != OPT.VMEM && catcher.type != OPT.REL)
                forceMemory = true;
            else
                break;
        }
    }

    function gassemble(source)
    {
        execSync("as -W -o /tmp/opcodeTest.o", {
            input: ".globl _start\n_start:\n" + source
        });

        execSync("ld --oformat binary -o /tmp/opcodeTest /tmp/opcodeTest.o");
        return readFileSync("/tmp/opcodeTest");
    }

    const hex = bytes => [...bytes].map(x => x.toString(16).toUpperCase().padStart(2, '0')).join(' ');

    // These are opcodes that defasm assembles correctly, but GAS doesn't, for some reason
    const uncheckedOpcodes = ['sysexitl', 'sysexitq', 'int1', 'movsx', 'movsxd', 'movzx'];

    // Main starts here
    for(const opcode of Object.keys(mnemonics))
    {
        if(uncheckedOpcodes.includes(opcode))
            continue;
        let start = source.length;

        for(const op of [opcode, 'v' + opcode])
            for(const mnemonic of fetchMnemonic(op, false, false))
                for(const operation of mnemonic.operations)
                    recurseOperands(op, mnemonic, operation);
        console.assert(source.includes(opcode, start))
    }

    let state = new AssemblyState();

    state.compile(source, { haltOnError: true });


    let asOutput = gassemble(source);
    if(!asOutput.equals(state.head.dump()))
    {
        let cmpPtr = 0, discrepancies = [];
        state.iterate(instr => {
            if(asOutput.compare(instr.bytes, 0, instr.length, cmpPtr, cmpPtr + instr.length) != 0)
            {
                const code = instr.range.slice(state.source);
                const correctOutput = gassemble(code);

                discrepancies.push(`- '${
                    code
                }' compiles to ${
                    hex(instr.bytes.subarray(0, instr.length))
                }, should be ${
                    hex(correctOutput)
                }`);
                cmpPtr += correctOutput.length;
            }
            else
                cmpPtr += instr.length;
        });

        throw `Discrepancies detected:\n${
            discrepancies.join('\n')
        }\n\n${
            execSync('as --version').toString()
        }`;
    }
}

if(require.main === module)
{
    exports.run().then(x => process.exit(0)).catch(x => { console.error(x); process.exit(1) });
}