sys_exit = 1
sys_fork = 2
sys_write = 4
sys_open = 5
sys_close = 6
sys_execve = 11
sys_ptrace = 26
sys_prctl = 172
sys_waitid = 284

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
O_TRUNC = 0o1000

.text
.globl _start
_start:

mov $sys_fork, %eax
int $0x80

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
r_EBX:      .long 0
r_ECX:      .long 0
r_EDX:      .long 0
r_ESI:      .long 0
r_EDI:      .long 0
r_EBP:      .long 0
r_EAX:      .long 0
r_XDS:      .long 0
r_XES:      .long 0
r_XFS:      .long 0
r_XGS:      .long 0
r_ORIG_EAX: .long 0
r_EIP:      .long 0
r_XCS:      .long 0
r_EFLAGS:   .long 0
r_ESP:      .long 0
r_XSS:      .long 0

outputData:
signo:   .long 0
status:  .long 0
errAddr: .long 0
outputDataLength = . - outputData

.section .rodata
outputPath: .asciz "/tmp/asm_trace"

.text
mov %eax, %ecx # %ecx now stores the child's PID
call waitpid

continue:

mov $sys_ptrace, %eax
mov $PTRACE_CONT, %ebx
mov $0, %esi
int $0x80

call waitpid

# Get registers
mov $sys_ptrace, %eax
mov $PTRACE_GETREGS, %ebx
mov $regs, %esi
int $0x80

# Get signal information
mov $sys_ptrace, %eax
mov $PTRACE_GETSIGINFO, %ebx
mov $siginfo, %esi
int $0x80

cmpl $SIGTRAP, (%esi)
jne endDebug
call dumpState
jmp continue

endDebug:

mov si_signo, %eax; mov %eax, signo
mov si_status, %eax; mov %eax, status
mov r_EIP,  %eax; mov %eax, errAddr

# Write to file
mov $sys_open, %eax
mov $outputPath, %ebx
mov $O_WRONLY | O_CREAT | O_TRUNC, %ecx
mov $0o666, %edx
int $0x80

mov %eax, %ebx # %ebx now stores the file descriptor
mov $sys_write, %eax
mov $outputData, %ecx
mov $outputDataLength, %edx
int $0x80

mov %ebx, dumpFile
call dumpState

mov $sys_close, %eax
int $0x80

# Exit
mov $sys_exit, %eax
mov $0, %ebx
int $0x80




# Execute the file
execFile:
# prctl, to ensure the child process
# doesn't continue after its parent dies
mov $sys_prctl, %eax
mov $PR_SET_PDEATHSIG, %ebx
mov $SIGTERM, %ecx
int $0x80

# Enable ptrace
mov $sys_ptrace, %eax
mov $PTRACE_TRACEME, %ebx
int $0x80

# execve
mov $sys_execve, %eax
pop %ecx
pop %ecx
mov (%esp), %ebx
mov %esp, %ecx
mov $0, %edx
int $0x80




waitpid:
    mov $sys_waitid, %eax
    mov $P_PID, %ebx
    mov $siginfo, %edx
    mov $WSTOPPED | WEXITED, %esi
    mov $0, %edi
    int $0x80
    ret

.section .rodata
hexaChars: .string "0123456789ABCDEF"

.data
outputBuffer: .byte 0
dumpFile: .long STDOUT_FILENO

.text

# Print the value of %eax in 8 hexadecimal characters
printDword:
    push %ebx
    push %ecx
    push %edx
    
    mov $8, %esi
    mov $outputBuffer, %ecx
    
    nibbleLoop:
        rol $4, %eax
        mov %eax, %edx
        and $0xF, %edx
        mov hexaChars(%edx), %dl
        mov %dl, (%ecx)

        # Print the nibble
        push %eax
            mov $sys_write, %eax
            mov dumpFile, %ebx
            mov $1, %edx
            int $0x80
        pop %eax

        dec %esi
        jnz nibbleLoop
    
    pop %edx
    pop %ecx
    pop %ebx
    ret

.section .rodata

registerOrder:
.long r_EAX, r_ESI,  r_EBX, r_EDI,  r_ECX, r_ESP, r_EDX, r_EBP
.long r_EFLAGS

flagOrder:
.byte 0, 6, 11, 7, 10, 2

dumpAlertString: .string "SIGTRAP DETECTED - DUMPING STATE\n"
dumpAlertSize = . - dumpAlertString

dumpString: .string "\
Registers:
    %eax = \0     %esi = \0
    %ebx = \0     %edi = \0
    %ecx = \0     %esp = \0
    %edx = \0     %ebp = \0
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
    push %esi
    push %edi
    push %edx
    push %ecx
    push %ebx

    cmpl $STDOUT_FILENO, dumpFile
    jne postPrintAlert
        mov $sys_write, %eax
        mov $STDOUT_FILENO, %ebx
        mov $dumpAlertString, %ecx
        mov $dumpAlertSize, %edx
        int $0x80
    postPrintAlert:

    xor %ebx, %ebx
    mov $dumpString, %ecx

    registerLoop:
        push %ebx
        mov %ecx, %esi
        mov %ecx, %edi
        mov $-1, %ecx
        xor %al, %al
        repnz scasb

        push %edi
        not %ecx
        dec %ecx
        mov $sys_write, %eax
        mov dumpFile, %ebx
        mov %ecx, %edx
        mov %esi, %ecx
        int $0x80
        pop %ecx

        pop %ebx
        cmp $15, %bl
        jge endRegisterLoop

        cmp $9, %bl
        jge printFlag
            # Select register and print it
            mov registerOrder(, %ebx, 4), %eax
            mov (%eax), %eax
            call printDword
            jmp nextRegister
        printFlag:
            # Select appropriate flag message
            push %ebx
            push %ecx

            mov %bl, %dl
            sub $9, %dl
            mov flagOrder(%edx), %al
            shl $1, %dl
            bt %eax, r_EFLAGS
            adc $0, %dl

            imul $flagMsgLen, %edx, %edx

            mov $sys_write, %eax
            mov dumpFile, %ebx
            lea flagMessages(%edx), %ecx
            mov $flagMsgLen, %edx
            int $0x80

            pop %ecx
            pop %ebx
        nextRegister:
        inc %ebx
        jmp registerLoop
    endRegisterLoop:

    pop %ebx
    pop %ecx
    pop %edx
    pop %edi
    pop %esi
    ret