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

STDOUT_FILENO = 1
PR_SET_PDEATHSIG = 1
SIGTRAP = 5
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
.bss
siginfo:
si_signo: .quad 0
.octa 0
si_status: .quad 0
.octa 0, 0, 0, 0, 0, 0

regs:
r_R15:      .quad 0
r_R14:      .quad 0
r_R13:      .quad 0
r_R12:      .quad 0
r_RBP:      .quad 0
r_RBX:      .quad 0
r_R11:      .quad 0
r_R10:      .quad 0
r_R9:       .quad 0
r_R8:       .quad 0
r_RAX:      .quad 0
r_RCX:      .quad 0
r_RDX:      .quad 0
r_RSI:      .quad 0
r_RDI:      .quad 0
r_ORIG_RAX: .quad 0
r_RIP:      .quad 0
r_CS:       .quad 0
r_FLAGS:    .quad 0
r_RSP:      .quad 0
r_SS:       .quad 0
r_FS_BASE:  .quad 0
r_GS_BASE:  .quad 0
r_DS:       .quad 0
r_ES:       .quad 0
r_FS:       .quad 0
r_GS:       .quad 0

outputData:
signo:   .long 0
status:  .long 0
errAddr: .quad 0
outputDataLength = . - outputData

.section .rodata
outputPath: .asciz "/tmp/asm_trace"

.text
mov %eax, %esi # %esi now stores the child's PID
call waitpid

continue:

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

cmpl $SIGTRAP, (%r10)
jne endDebug
call dumpState
jmp continue

endDebug:

mov si_signo, %eax; mov %eax, signo
mov si_status, %eax; mov %eax, status
mov r_RIP,  %eax; mov %eax, errAddr

# Write to file
mov $sys_open, %eax
mov $outputPath, %edi
mov $O_WRONLY | O_CREAT, %esi
mov $0o666, %edx
syscall

mov %eax, %edi # %edi now stores the file descriptor
mov $sys_write, %eax
mov $outputData, %esi
mov $outputDataLength, %edx
syscall

mov %edi, dumpFile
call dumpState

mov $sys_close, %eax
syscall

# Exit
mov $sys_exit, %eax
mov $0, %edi
syscall




# Execute the file
execFile:
# prctl, to ensure the child process
# doesn't continue after its parent dies
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
mov $0, %edx
syscall




waitpid:
    mov $sys_waitid, %eax
    mov $P_PID, %edi
    mov $siginfo, %edx
    mov $WSTOPPED | WEXITED, %r10d
    mov $0, %r8d
    syscall
    ret

.section .rodata
hexaChars: .string "0123456789ABCDEF"

.data
outputBuffer: .byte 0
dumpFile: .long STDOUT_FILENO

.text

# Print the value of %rax in 16 hexadecimal characters
printQuad:
    push %rbx
    push %rdx
    push %rsi
    push %rdi
    push %rcx
    
    mov $16, %ebx
    mov $outputBuffer, %esi
    
    nibbleLoop:
        rol $4, %rax
        mov %eax, %edx
        and $0xF, %edx
        mov hexaChars(%rdx), %dl
        mov %dl, (%rsi)

        # Print the nibble
        push %rax
            mov $1, %dl
            mov $sys_write, %eax
            mov dumpFile, %edi
            syscall
        pop %rax

        dec %ebx
        jnz nibbleLoop
    
    pop %rcx
    pop %rdi
    pop %rsi
    pop %rdx
    pop %rbx
    ret

.section .rodata

registerOrder:
.long r_RAX, r_R8,  r_RBX, r_R9,  r_RCX, r_R10, r_RDX, r_R11
.long r_RSI, r_R12, r_RDI, r_R13, r_RSP, r_R14, r_RBP, r_R15
.long r_FLAGS

flagOrder:
.byte 0, 6, 11, 7, 10, 2

dumpAlertString: .string "SIGTRAP DETECTED - DUMPING STATE\n"
dumpAlertSize = . - dumpAlertString

dumpString: .string "\
Registers:
    %rax = \0        %r8  = \0
    %rbx = \0        %r9  = \0
    %rcx = \0        %r10 = \0
    %rdx = \0        %r11 = \0
    %rsi = \0        %r12 = \0
    %rdi = \0        %r13 = \0
    %rsp = \0        %r14 = \0
    %rbp = \0        %r15 = \0
Flags (\0):
    Carry     = \0   Zero   = \0
    Overflow  = \0   Sign   = \0
    Direction = \0   Parity = \0

\0"

flagMessages:
.string "0 (no carry)    ", "1 (carry)       "
.string "0 (isn't zero)  ", "1 (is zero)     "
.string "0 (no overflow) ", "1 (overflow)    "
.string "0 (positive)    ", "1 (negative)    "
.string "0 (up)          ", "1 (down)        "
.string "0 (odd)         ", "1 (even)        "
flagMsgLen = 16

.text
dumpState:
    push %rsi
    push %rdi
    push %rdx
    push %rcx
    push %rbx

    cmpl $STDOUT_FILENO, dumpFile
    jne postPrintAlert
        mov $dumpAlertString, %esi
        mov $dumpAlertSize, %edx
        mov $STDOUT_FILENO, %edi
        mov $sys_write, %eax
        syscall
    postPrintAlert:

    xor %ebx, %ebx
    mov $dumpString, %esi

    registerLoop:
        mov %esi, %edi
        mov $-1, %ecx
        xor %al, %al
        repnz scasb

        push %rdi
        not %ecx
        dec %ecx
        mov %ecx, %edx
        mov $sys_write, %eax
        mov dumpFile, %edi
        syscall
        pop %rsi

        cmp $23, %bl
        jge endRegisterLoop

        cmp $17, %bl
        jge printFlag
            # Select register and print it
            mov registerOrder(, %rbx, 4), %eax
            mov (%rax), %rax
            call printQuad
            jmp nextRegister
        printFlag:
            # Select appropriate flag message
            push %rsi

            mov %bl, %dl
            sub $17, %dl
            mov flagOrder(%rdx), %al
            shl $1, %dl
            bt %eax, r_FLAGS
            adc $0, %dl

            imul $flagMsgLen, %edx, %edx
            lea flagMessages(%rdx), %esi

            mov $flagMsgLen, %edx
            mov $sys_write, %eax
            mov dumpFile, %edi
            syscall

            pop %rsi
        nextRegister:
        inc %ebx
        jmp registerLoop
    endRegisterLoop:

    pop %rbx
    pop %rcx
    pop %rdx
    pop %rdi
    pop %rsi
    ret