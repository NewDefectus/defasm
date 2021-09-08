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
    const signo = data.readUInt32LE();
    if(signo == 17)
        process.exit(data[0x18]);
    return {
        regs: Object.assign({}, ...
        `r15 r14 r13 r12 rbp rbx r11 r10 r9 r8
        rax rcx rdx rsi rdi orig_rax rip cs eflags
        rsp ss fs_base gs_base ds es fs gs`.split(/\s+/).map((reg, i) =>
            ({ [reg]: data.readBigUInt64LE(0x80 + i * 8) })
        )),
        signal: signalNames[signo] ?? `unknown signal (${signo})`
    }
}

export function debug(path, args, state)
{
    const { signal, regs } = execute(path, args);

    let errLine = null;
    let pos = "on";
    let errorAddr = Number(BigInt.asUintN(64, regs['rip'].toString()));
    if(signal === "trace/breakpoint trap") // Weird behavior with int3
        errorAddr--;

    let { instr: crashedInstr, section: crashedSection } = findInstruction(state, errorAddr);
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

    const formatReg = reg => BigInt.asUintN(64, regs[reg].toString()).toString(16).toUpperCase().padStart(16, '0');

    console.warn(`Signal: ${signal}${
        errLine !== null ? ` ${pos} line ${errLine}` : ''
    } (%rip was ${formatReg('rip')})`);
    
    console.warn("Registers:");
    let regTab = reg => `%${reg.padEnd(4, ' ')}= ${formatReg(reg)}`;
    for(let regNames of "rax r8|rbx r9|rcx r10|rdx r11|rsi r12|rdi r13|rsp r14|rbp r15".split('|'))
    {
        let [reg1, reg2] = regNames.split(' ');
        console.warn('    ' + regTab(reg1) + '        ' + regTab(reg2));
    }
    
    let flag = i => Number(regs['eflags']) & 1 << i ? 1 : 0;
    let tmp;
    let flagTab = (name, id, length, options = []) =>
        ('    ' + name.padEnd(length, ' ') + ' = ' + (tmp = flag(id)) +
        ' (' + options[tmp] + ')').padEnd(31, ' ');
    let twoFlagTab = (name1, id1, options1, name2, id2, options2) =>
        console.warn(flagTab(name1, id1, 9, options1) + (name2 ? flagTab(name2, id2, 6, options2) : ''));

    console.warn(`Flags (${formatReg('eflags')}):`);
    
    twoFlagTab('Carry', 0, ['no carry', 'carry'], 'Zero', 6, ["isn't zero", 'is zero']);
    twoFlagTab('Overflow', 11, ['no overflow', 'overflow'], 'Sign', 7, ['positive', 'negative']);
    twoFlagTab('Direction', 10, ['up', 'down'], 'Parity', 2, ['odd', 'even']);
    twoFlagTab('Adjust', 4, ['no aux carry', 'aux carry']);
}