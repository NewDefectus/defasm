#!/usr/bin/env node
"use strict";
// Sample code testing

exports.run = async function()
{
    const { AssemblyState } = await import("@defasm/core");
    let attState = new AssemblyState(), intelState = new AssemblyState();
    attState.compile(`\
    .att_syntax
    SYS_WRITE = 1
    SYS_EXIT = 60
    STDOUT_FILENO = 1
    
    # Printing
    .data
    buffer: .string "Hello, World!\n"
    bufferLen = . - buffer
    
    .text
    mov $SYS_WRITE, %eax
    mov $STDOUT_FILENO, %edi
    mov $buffer, %esi
    mov $bufferLen, %edx
    syscall
    
    # Looping
    .data
    digit: .byte '0', '\n'
    
    .text
    mov $0, %bl
    numberLoop:
        mov $SYS_WRITE, %eax
        mov $STDOUT_FILENO, %edi
        mov $digit, %esi
        mov $2, %edx
        syscall
    
        incb (%rsi)
        inc %bl
        cmp $10, %bl
        jl numberLoop
    
    # Accessing arguments
    pop %rbx
    pop %rax
    
    argLoop:
        dec %rbx
        jz endArgLoop
    
        pop %rsi
        mov %rsi, %rdi
    
        mov $-1, %ecx
        mov $0, %al
        repne scasb
    
        not %ecx
        movb $'\n', -1(%rsi, %rcx)
    
        mov %ecx, %edx
        mov $SYS_WRITE, %eax
        mov $STDOUT_FILENO, %edi
        syscall
    
        jmp argLoop
    endArgLoop:
    
    mov $SYS_EXIT, %eax
    mov $0, %edi
    syscall`, { haltOnError: true });

    intelState.compile(`\
    .intel_syntax
    SYS_WRITE = 1
    SYS_EXIT = 60
    STDOUT_FILENO = 1

    ; Printing
    section .data
    buffer db "Hello, World!\n"
    bufferLen = $ - buffer

    section .text
    mov eax, OFFSET SYS_WRITE
    mov edi, OFFSET STDOUT_FILENO
    mov esi, OFFSET buffer
    mov edx, OFFSET bufferLen
    syscall

    ; Looping
    section .data
    digit db '0', '\n'

    section .text
    mov bl, 0
    numberLoop:
        mov eax, OFFSET SYS_WRITE
        mov edi, OFFSET STDOUT_FILENO
        mov esi, OFFSET digit
        mov edx, 2
        syscall

        inc BYTE [rsi]
        inc bl
        cmp bl, 10
        jl numberLoop

    ; Accessing arguments
    pop rbx
    pop rax

    argLoop:
        dec rbx
        jz endArgLoop

        pop rsi
        mov rdi, rsi

        mov ecx, -1
        mov al, 0
        repne scasb

        not ecx
        mov BYTE [rsi + rcx - 1], '\n'

        mov edx, ecx
        mov eax, OFFSET SYS_WRITE
        mov edi, OFFSET STDOUT_FILENO
        syscall

        jmp argLoop
    endArgLoop:

    mov eax, OFFSET SYS_EXIT
    mov edi, 0
    syscall`, { haltOnError: true });

    if(intelState.head.dump() != attState.head.dump())
        throw `Discrepancy between AT&T and Intel output`;
}

if(require.main === module)
{
    exports.run().then(x => process.exit(0)).catch(x => { console.error(x); process.exit(1) });
}