#!/usr/bin/env node
"use strict";

// All opcodes test

var OPT, regNames, suffixNames, floatSuffixNames, floatIntSuffixNames, vecNames;
var fetchMnemonic, getMnemonicList;

async function initGlobals()
{
    const reverseObject = obj => Object.assign({}, ...Object.keys(obj).map(x => ({[obj[x]]: x})))

    let imports = await import("@defasm/core");
    getMnemonicList = imports.getMnemonicList;

    imports = await import("@defasm/core/operands.js");
    OPT = imports.OPT;

    let { registers, suffixes, floatSuffixes, floatIntSuffixes } = imports;
    regNames = reverseObject(registers);
    suffixNames = reverseObject(suffixes);
    floatSuffixNames = reverseObject(floatSuffixes);
    floatIntSuffixNames = reverseObject(floatIntSuffixes);
    vecNames = { 64: 'mm', 128: 'xmm', 256: 'ymm', 512: 'zmm' };

    fetchMnemonic = (await import("@defasm/core")).fetchMnemonic;
}


/**
 * Compile code with defasm, then with gcc, then throw an error if
 * the results don't match.
 * @param {String} source the assembly code to compile
 */
exports.checkAgainstGcc = async function(source)
{
    const { execSync } = require('child_process');
    const { readFileSync } = require('fs');
    const { AssemblyState } = await import("@defasm/core");

    function gassemble(source)
    {
        execSync("as -W -o /tmp/opcodeTest.o", {
            input: ".globl _start\n_start:\n" + source
        });

        execSync("ld --oformat binary -o /tmp/opcodeTest /tmp/opcodeTest.o");
        return readFileSync("/tmp/opcodeTest");
    }

    const hex = bytes => [...bytes].map(x => x.toString(16).toUpperCase().padStart(2, '0')).join(' ');

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

/**
 * @param {import("@defasm/core/operations.js").OpCatcher} catcher 
 * @param {Number} size
 * @param {Number} index
 * @param {Number} type
 * @returns {String}
 */
function makeOperand(catcher, size, index, type = catcher.type)
{
    let value = catcher.implicitValue;
    let id = value === null ? index : value;
    
    switch(type)
    {
        case OPT.REG:  return '%' + regNames[Math.log2(size / 8) * 8 + id];
        case OPT.VEC:  return '%' + vecNames[size] + id;
        case OPT.VMEM: return '(,%' + vecNames[size] + id + ')';
        case OPT.IMM:  return value === null ? '$' + (1 << (size - 4)) : '$' + value;
        case OPT.MASK: return '%k' + id;
        case OPT.REL:  return '.+' + (1 << (size - 4));
        case OPT.MEM:  return catcher.moffset ? '' + (1 << (size - 4)) : '(%' + regNames[24 + id] +')';
        case OPT.ST:   return '%st' + (id ? '(' + id + ')' : '');
        case OPT.SEG:  return '%' + regNames[32 + id];
        case OPT.IP:   return size == 32 ? '%eip' : '%rip';
        case OPT.BND:  return '%bnd' + id;
        case OPT.CTRL: return '%cr' + id;
        case OPT.DBG:  return '%dr' + id;
    }

    throw `Unknown operand type '${type}'`;
}

/**
 * @typedef {Object} GenConfig
 * @property {import('@defasm/core/mnemonics.js').MnemonicInterpretation} interp 
 * @property {import('@defasm/core/operations.js').Operation} operation
 * @property {number} config.i
 * @property {string[]} config.operands 
 * @property {number} config.prevSize
 * @property {number} config.total 
 * @property {string} config.sizeSuffix 
 */

/**
 * Generate a list of sample instructions for the given mnemonic
 * @param {string} mnemonic
 * @param {GenConfig} config
 */
function* generateInstrs(mnemonic, {
    interp = null,
    operation = null,
    i = 0,
    operands = [],
    prevSize = null,
    total = 0,
    sizeSuffix = ""
} = {})
{
    if (interp === null)
    {
        for(const interp of fetchMnemonic(mnemonic, false, false))
            for(const operation of interp.operations)
                yield *generateInstrs(mnemonic, {interp, operation});
        return;
    }
    let opCatchers = interp.vex ? operation.vexOpCatchers : operation.opCatchers;
    if(opCatchers.length == 0)
    {
        yield mnemonic;
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
                    operands[i] = makeOperand(opCatchers[i], 32, i + 1);
            }
            let instruction =
                mnemonic + ' ' + 
                (mnemonic == 'lcall' || mnemonic == 'ljmp' ? '*' : '') +
                operands.join(', ');
            yield instruction;
            return;
        }
        else
        {
            yield *generateInstrs(mnemonic, {
                interp,
                operation,
                operands,
                i: nextI
            });
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
            if(type === OPT.MEM && showSuffix && size != (interp.vex ? catcher.defVexSize : catcher.defSize))
            {
                if(catcher.moffset)
                    sizeSuffix = 'addr32';
                else
                    sizeSuffix = (
                        mnemonic[0] == 'f' ?
                            mnemonic[1] == 'i' ?
                                floatIntSuffixNames
                            :
                                floatSuffixNames
                        :
                            suffixNames)[size & ~7];
            }
            if(!interp.vex && size >= 256 || (size & ~7) == 48)
                continue;
            if(interp.vex && size < 128 && type === OPT.VEC)
                continue;
            
            operands[i] = makeOperand(catcher, size & ~7, total + 1, type);

            if(total + 1 >= opCatchers.length)
            {
                let instruction = "";
                if(sizeSuffix == 'addr32')
                {
                    instruction += 'addr32 ';
                    sizeSuffix = '';
                }
                instruction += mnemonic + sizeSuffix + ' ' +
                    (interp.relative && type !== OPT.REL ? '*' : '')
                    + operands.join(', ')
                    + (operation.requireMask ? ' {%k1}' : '')
                yield instruction;
            }
            else
                yield *generateInstrs(mnemonic, {
                    interp,
                    operation,
                    i: nextI,
                    operands,
                    prevSize: catcher.carrySizeInference ? size : prevSize,
                    total: total + 1,
                    sizeSuffix
                });

            sizeSuffix = sizeSuffixOriginal;
        }

        if(!forceMemory && catcher.acceptsMemory && !catcher.type.isMemory)
            forceMemory = true;
        else
            break;
    }
}

exports.run = async function()
{
    await initGlobals();

    // These are mnemonics that defasm assembles correctly, but GAS doesn't, for some reason
    const uncheckedMnemonics = ['sysexitl', 'sysexitq', 'int1', 'movsx', 'movsxd', 'movzx'];

    let source = "";

    for(const mnemonicBase of getMnemonicList())
    {
        if(uncheckedMnemonics.includes(mnemonicBase))
            continue;
        let start = source.length;

        for(const mnemonic of [mnemonicBase, 'v' + mnemonicBase])
            for(const line of generateInstrs(mnemonic))
                source += line + '\n';
                        
        console.assert(source.includes(mnemonicBase, start))
    }

    await exports.checkAgainstGcc(source);
}

if(require.main === module)
{
    exports.run().then(x => process.exit(0)).catch(x => { console.error(x); process.exit(1) });
}