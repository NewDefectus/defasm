sys_write = 1
sys_open = 2
sys_close = 3
sys_fork = 57
sys_execve = 59
sys_exit = 60
sys_ptrace = 101
sys_prctl = 157
sys_waitid = 247

PTRACE_TRACEME = 0
PTRACE_CONT = 7
PTRACE_GETREGS = 12
PTRACE_GETSIGINFO = 16898

PR_SET_PDEATHSIG = 1
SIGTERM = 15
P_PID = 1
WSTOPPED = 2
WEXITED = 4
O_WRONLY = 1
O_CREAT = 0o100

.text
.globl _start
_start:

mov $sys_fork, %eax
syscall

test %eax, %eax
jz execFile

# Tracing the file
.data
returnData:
siginfo: .octa 0, 0, 0, 0, 0, 0, 0, 0
regs: .octa 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
returnDataLength = . - returnData
outputPath: .asciz "/tmp/asm_trace"

.text
mov %eax, %esi # %esi now stores the child's PID
call waitpid

mov $sys_ptrace, %eax
mov $PTRACE_CONT, %edi
mov $0, %r10d
syscall

call waitpid

# Get registers
mov $sys_ptrace, %eax
mov $PTRACE_GETREGS, %edi
mov $regs, %r10d
syscall

# Get signal information
mov $sys_ptrace, %eax
mov $PTRACE_GETSIGINFO, %edi
mov $siginfo, %r10d
syscall

# Write to file
mov $sys_open, %eax
mov $outputPath, %edi
mov $O_WRONLY | O_CREAT, %esi
mov $0o666, %edx
syscall

mov %eax, %edi # %edi now stores the file descriptor
mov $sys_write, %eax
mov $returnData, %esi
mov $returnDataLength, %edx
syscall

mov $sys_close, %eax
syscall

# Exit
mov $sys_exit, %eax
mov $0, %edi
syscall




# Execute the file
execFile:
mov $0x123456789, %rbx
# prctl, to ensure the child process doesn't continue after its parent dies
mov $sys_prctl, %eax
mov $PR_SET_PDEATHSIG, %edi
mov $SIGTERM, %esi
syscall

# Enable ptrace
mov $sys_ptrace, %eax
mov $PTRACE_TRACEME, %edi
syscall

# execve
mov $sys_execve, %eax
pop %rcx
pop %rcx
mov (%rsp), %rdi
mov %rsp, %rsi
mov $0, %rdx
syscall




waitpid:
    mov $sys_waitid, %eax
    mov $P_PID, %edi
    mov $siginfo, %edx
    mov $WSTOPPED | WEXITED, %r10d
    mov $0, %r8d
    syscall
    ret