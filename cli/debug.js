import ffi from 'ffi-napi';
import ref from 'ref-napi';
import struct from 'ref-struct-di';
import ArrayType from 'ref-array-di';

import fs from 'fs';
import { AssemblyState } from '@defasm/core';

const PTRACE_TRACEME = 0;
const PTRACE_CONT = 7;
const PTRACE_SYSCALL = 24;
const PTRACE_GETREGS = 12;
const PTRACE_GETSIGINFO = 16898

const PR_SET_PDEATHSIG = 1;
const SIGTERM = 15;

const {
    types: {
        int,
        int64,
        void: Void,
        ulong,
        ulonglong,
        CString
    }
} = ref;

const CStringArr = ArrayType(ref)(CString)
const ptr = type => ref.refType(type);

const lib = ffi.Library(null, {
    waitpid: [int, [int, ptr(int), int]],
    fork: [int, []],
    ptrace: [int, [int, int, ptr(Void), ptr(Void)]],
    execvp: [int, [CString, CStringArr]],
    strsignal: [CString, [int]],
    strerror: [CString, [int]],
    dup: [int, [int]],
    dup2: [int, [int, int]],
    close: [int, [int]],
    prctl: [int, [int, ulong, ulong, ulong, ulong]],
    perror: [Void, [CString]]
});

const registerNames = `r15 r14 r13 r12 rbp rbx r11 r10 r9 r8 rax rcx rdx rsi rdi
UNUSED1 rip UNUSED2 eflags rsp UNUSED3 UNUSED4 UNUSED5 UNUSED6 UNUSED7 UNUSED8 UNUSED9`.split(/\s+/);

const Registers = struct(ref)(Object.assign({}, ...(
    registerNames.map(x =>
        ({ [x]: ulonglong })
    )
)));

const SigInfo = struct(ref)({
    si_signo: int,
    si_errno: int,
    si_code: int,
    __pad0: int,
    si_addr: ptr(Void),
    __pad1: ulonglong, __pad2: ulonglong,
    __pad3: ulonglong, __pad4: ulonglong,
    __pad5: ulonglong, __pad6: ulonglong,
    __pad7: ulonglong, __pad8: ulonglong,
    __pad9: ulonglong, __pad10: ulonglong,
    __pad11: ulonglong, __pad12: ulonglong,
    __pad13: ulonglong
});

function redirect(stream, fd)
{
    const x = lib.dup(stream.fd);
    lib.dup2(x, fd);
    lib.close(x);
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
    const child = lib.fork();
    if(child == 0)
    {
        lib.prctl(PR_SET_PDEATHSIG, SIGTERM, 0, 0, 0);
        redirect(process.stdin, 0);
        redirect(process.stdout, 1);
        redirect(process.stderr, 2);
        lib.ptrace(PTRACE_TRACEME, 0, null, null);
        //lib.ptrace(PTRACE_TRACEME, 0, null, null);
        lib.execvp(path, [path, ...args, ref.NULL]);
        process.exit(0);
    }
    else
    {
        const regs = Registers(), siginfo = SigInfo(), status = ref.alloc(int);
        lib.waitpid(child, status, 0);
        //fs.unlinkSync("/tmp/asm");
        //lib.ptrace(PTRACE_SYSCALL, child, null, null);
        //lib.waitpid(child, status, 0);
        
        lib.ptrace(PTRACE_CONT, child, null, null);
        lib.waitpid(child, status, 0);

        if(status[0])
        {
            lib.ptrace(PTRACE_GETREGS, child, null, regs.ref());
            lib.ptrace(PTRACE_GETSIGINFO, child, null, siginfo.ref());
            return {
                signal: lib.strsignal(siginfo.si_signo).toLowerCase(),
                regs
            };
        }

        process.exit(status[1]);
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