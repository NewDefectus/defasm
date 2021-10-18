import { AssemblyState } from "@defasm/core";
import { execFileSync } from "child_process";
import { readFileSync } from "fs";

import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const signalNames = {
    4: "illegal instruction",
    5: "trace/breakpoint trap",
    7: "bus error",
    8: "floating point error",
    11: "segmentation fault",
    17: "EXIT",
    29: "i/o error",
    31: "bad system call"
};

/**
 * @param {AssemblyState} state
 * @param {Number} address
 */
function findInstruction(state, address)
{
    for(const section of state.sections)
    {
        const segment = section.programHeader;
        if(address >= segment.p_vaddr && address < Math.ceil((segment.p_vaddr + segment.p_memsz) / 0x1000) * 0x1000)
        {
            const localAddress = address - segment.p_vaddr;
            let node = section.head.next;
            while(node)
            {
                if(node.statement.length > 0 && node.statement.address >= localAddress)
                    return { section, instr: node.statement };
                node = node.next;
            }
            return { section, instr: null };
        }
    }

    return { section: null, instr: null };
 }

function execute(path, args)
{
    execFileSync(resolve(dirname(fileURLToPath(import.meta.url)), './debug'), [path, ...args], { stdio: 'inherit' });
    const data = readFileSync('/tmp/asm_trace');
    const signo = data.readUInt32LE(0);
    const status = data.readUInt32LE(4);
    const errorAddr = data.readBigUInt64LE(8);
    return {
        errorAddr,
        status,
        signal: signalNames[signo] ?? `unknown signal (${signo})`,
        dump: data.toString('ascii', 16)
    };
}

/**
 * @param {string} path 
 * @param {string[]} args 
 * @param {AssemblyState} state 
 * @returns 
 */
export function debug(path, args, state)
{
    const { signal, status, errorAddr, dump } = execute(path, args);
    if(signal === "EXIT")
        return status;

    let errLine = null;
    let pos = "on";
    if(signal === "trace/breakpoint trap") // Weird behavior with int3
        errorAddr--;

    let { instr: crashedInstr, section: crashedSection } = findInstruction(state, Number(errorAddr));
    if(crashedInstr === null)
    {
        if(crashedSection !== null)
        {
            pos = 'after';
            state.iterate((instr, line) => {
                if(instr.section === crashedSection)
                    errLine = line;
            });
        }
    }
    else
    {
        state.iterate((instr, line) => {
            if(errLine)
                return;
            if(instr == crashedInstr)
                errLine = line;
        });
    }

    console.warn(`Signal: ${signal}${
        errLine !== null ? ` ${pos} line ${errLine}` : ''
    } (%rip was ${errorAddr.toString(16).toUpperCase().padStart(16, '0')})`);
    console.warn(dump);
    return 0;
}