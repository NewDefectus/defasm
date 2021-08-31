import ffi from 'ffi-napi';
import ref from 'ref-napi';
import struct from 'ref-struct-di';
import ArrayType from 'ref-array-di';

const PTRACE_TRACEME = 0;
const PTRACE_CONT = 7;
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

const Registers = struct(ref)(Object.assign({}, ...(
    `r15 r14 r13 r12 rbp rbx r11 r10 r9 r8 rax rcx rdx rsi rdi
    orig_rax rip cs eflags rsp ss fs_base gs_base ds es fs gs`.split(/\s+/).map(x =>
        ({ [x]: ulonglong })
    )
)));

const SigInfo = struct(ref)({
    si_signo: int,
    si_errno: int,
    si_code: int,
    __pad0: int
});

function redirect(stream, fd)
{
    const x = lib.dup(stream.fd);
    lib.dup2(x, fd);
    lib.close(x);
};

export function debug(path, args)
{
    const child = lib.fork();
    if(child == 0)
    {
        lib.prctl(PR_SET_PDEATHSIG, SIGTERM, 0, 0, 0);
        redirect(process.stdin, 0);
        redirect(process.stdout, 1);
        redirect(process.stderr, 2);
        lib.ptrace(PTRACE_TRACEME, 0, null, null);
        lib.execvp(path, [path, ...args, ref.NULL]);
        process.exit(0);
    }
    else
    {
        const regs = Registers(), siginfo = SigInfo(), status = ref.alloc(int);
        lib.waitpid(child, status, 0);
        lib.ptrace(PTRACE_CONT, child, null, null);
        lib.waitpid(child, status, 0);

        if(status[0])
        {
            lib.ptrace(PTRACE_GETREGS, child, null, regs.ref());
            lib.ptrace(PTRACE_GETSIGINFO, child, null, siginfo.ref());
            return {
                exitCode: status[1],
                signal: lib.strsignal(siginfo.si_signo).toLowerCase(),
                regs
            };
        }

        return { exitCode: status[1], signal: '', regs: {} };
    }
}