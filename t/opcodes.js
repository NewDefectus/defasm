import { test } from "node:test";

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

import "@defasm/core";
import { AssemblyState, getMnemonicList, fetchMnemonic } from "@defasm/core";
import { OPT, registers, suffixes, floatSuffixes, floatIntSuffixes } from "@defasm/core/operands.js";

function reverseObject(obj) {
    return Object.assign({}, ...Object.keys(obj).map(x => ({[obj[x]]: x})));
}

function hex(bytes) {
    return [...bytes].map(x => x.toString(16).toUpperCase().padStart(2, '0')).join(' ');
}

function gassemble(source) {
    execSync("as -W -o /tmp/opcodeTest.o", {
        input: ".globl _start\n_start:\n" + source
    });

    execSync("objcopy /tmp/opcodeTest.o --dump-section .text=/tmp/opcodeTest");
    return readFileSync("/tmp/opcodeTest");
}

const regNames = reverseObject(registers);
const suffixNames = reverseObject(suffixes);
const floatSuffixNames = reverseObject(floatSuffixes);
const floatIntSuffixNames = reverseObject(floatIntSuffixes);
const vecNames = { 64: 'mm', 128: 'xmm', 256: 'ymm', 512: 'zmm' };

/**
 * @param {import("@defasm/core/operations.js").OpCatcher} catcher 
 * @param {Number} size
 * @param {Number} index
 * @param {Number} type
 * @returns {String}
 */
function makeOperand(catcher, size, index, type = catcher.type) {
    let value = catcher.implicitValue;
    let id = value === null ? index : value;
    
    switch(type) {
        case OPT.REG:  return '%' + regNames[Math.log2(size / 8) * 8 + id];
        case OPT.VEC:  return '%' + vecNames[size] + id;
        case OPT.VMEM: return '(,%' + vecNames[size] + id + ')';
        case OPT.IMM:  return value === null ? '$' + (1 << (size - 4)) : '$' + value;
        case OPT.MASK: return '%k' + id;
        case OPT.REL:  return '.+' + (1 << (size - 4));
        case OPT.MEM:  return catcher.moffset ? '' + (1 << (size - 4)) : '64(%' + regNames[24 + id] +')';
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
} = {}) {
    if (interp === null) {
        let interps = fetchMnemonic(mnemonic, false, false);
        let vInterps = fetchMnemonic('v' + mnemonic, false, false);

        for(const interp of interps)
            for(const operation of interp.operations)
                yield *generateInstrs(mnemonic, {interp, operation});
        for(const interp of vInterps)
            for(const operation of interp.operations)
                yield *generateInstrs('v' + mnemonic, {interp, operation});
        return;
    }
    let opCatchers = interp.vex ? operation.vexOpCatchers : operation.opCatchers;
    if(opCatchers.length == 0) {
        yield mnemonic;
        return;
    }

    let nextI = (i + 1) % opCatchers.length;
    let catcher = opCatchers[i];
    let sizes = catcher.sizes;

    let showSuffix = Array.isArray(sizes);

    if(sizes == 0) // Size is arbitrary
        sizes = [32];

    if(prevSize === null && !Array.isArray(sizes)) {
        if(nextI == 0) { // We've wrapped around without finding a size, so the operation is sizeless
            sizes = [32];
            for(let i = 0; i < opCatchers.length; i++) {
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
        else {
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
    
    let halfMemorySize = false;
    if(sizes == -2) {
        sizes = [(prevSize & ~7) / catcher.sizeDivisor];
        if(sizes[0] < 128)
        {
            sizes[0] = 128;
            halfMemorySize = true;
        }
    }

    let forceMemory = false;
    let triedBroadcast = false, canTryBroadcast = false;
    
    while(true) {
        for(let size of sizes) {
            let type = forceMemory ? OPT.MEM : catcher.type;
            let sizeSuffixOriginal = sizeSuffix;
            if(type === OPT.MEM && catcher.memorySize)
                size = catcher.memorySize, showSuffix = false;
            if(type === OPT.MEM && showSuffix && size != (interp.vex ? catcher.defVexSize : catcher.defSize)) {
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
            if(interp.vex && type.isMemory && (
                operation.evexPermits?.BROADCAST_32 || operation.evexPermits?.BROADCAST_64
            )) {
                if(canTryBroadcast) {
                    if(!triedBroadcast) {
                        if(operation.evexPermits?.BROADCAST_32)
                            operands[i] = operands[i] + ` {1to${(size & ~7) / 32}}`;
                        if(operation.evexPermits?.BROADCAST_64)
                            operands[i] = operands[i] + ` {1to${(size & ~7) / 64}}`;
                        triedBroadcast = true;
                    }
                }
                canTryBroadcast = true;
            }

            if(total + 1 >= opCatchers.length) {
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

        if(canTryBroadcast && !triedBroadcast)
            continue;

        if(!forceMemory && catcher.acceptsMemory && !catcher.type.isMemory) {
            forceMemory = true;
            if(halfMemorySize)
                sizes[0] /= 2;
            continue;
        }
        break;
    }
}

test("All opcodes test", { skip: process.platform != 'linux' }, async () => {
    const mnemonics = process.argv.slice(3);

    // These are mnemonics that defasm assembles correctly, but GAS doesn't, for some reason
    const uncheckedMnemonics = ['sysexitl', 'sysexitq', 'int1', 'movsx', 'movsxd', 'movzx'];

    let source = "";

    const mnemonicList = mnemonics.length > 0 ? mnemonics : getMnemonicList();
    for(const mnemonic of mnemonicList) {
        if(uncheckedMnemonics.includes(mnemonic))
            continue;
        for(const line of generateInstrs(mnemonic))
            source += line + '\n';
    }

    const state = new AssemblyState();

    state.compile(source, { haltOnError: true });

    const asOutput = gassemble(source);
    if(!asOutput.equals(state.head.dump())) {
        let cmpPtr = 0, discrepancies = [];
        state.iterate(instr => {
            while(cmpPtr < asOutput.length) {
                if(asOutput.compare(instr.bytes, 0, instr.length, cmpPtr, cmpPtr + instr.length) != 0) {
                    const code = instr.range.slice(state.source);
                    const correctOutput = gassemble(code);
                    if(correctOutput.compare(instr.bytes, 0, instr.length) == 0)
                    {
                        // Most likely just a misalignment error - realign and try again
                        cmpPtr = asOutput.indexOf(instr.bytes.subarray(0, instr.length), cmpPtr);
                        continue;
                    }

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
                break;
            }
        });

        throw `Discrepancies detected:\n${
            discrepancies.join('\n')
        }\n\n${
            execSync('as --version').toString()
        }`;
    }
});
