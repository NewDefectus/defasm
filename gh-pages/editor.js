import { closeBrackets, closeBracketsKeymap } from "@codemirror/closebrackets";
import { standardKeymap, defaultTabBinding }  from "@codemirror/commands";
import { lineNumbers }                        from "@codemirror/gutter";
import { defaultHighlightStyle }              from "@codemirror/highlight";
import { history, historyKeymap }             from "@codemirror/history";
import { EditorState }                        from "@codemirror/state";
import { EditorView, keymap }                 from "@codemirror/view";
import { assembly }                           from "@defasm/codemirror";

const byteCount = document.getElementById("byteCount");

var editor = new EditorView({
    dispatch: tr => {
        document.cookie = "code=" + encodeURIComponent(tr.newDoc.sliceString(0)); // Save the code
        let result = editor.update([tr]);
        byteCount.innerText = `${editor['asm-bytes']} byte${editor['asm-bytes'] != 1 ? 's' : ''}`;
        return result;
    },
    parent: document.getElementById("inputAreaContainer"),
    state: EditorState.create({
        doc: getLastCode(),
        extensions: [
            defaultHighlightStyle,
            closeBrackets(),
            history(),
            keymap.of([...closeBracketsKeymap, ...historyKeymap, defaultTabBinding, ...standardKeymap]),
            lineNumbers(),
            assembly()
        ]
    })
});

editor.contentDOM.setAttribute("data-gramm", "false"); // Disable Grammarly

function getLastCode()
{
    let prevCode = document.cookie.split('; ').find(row => row.startsWith("code="));
    if(prevCode)
        prevCode = decodeURIComponent(prevCode.slice(5));
    return prevCode || `# Printing
mov $1, %eax    # Syscall code 1 (write)
mov $1, %edi    # File descriptor 1 (stdout)
mov $text, %rsi # Address of buffer
mov $14, %edx   # Length of buffer
syscall

# Looping
mov $10, %bl
numberLoop:
    mov $1, %eax
    mov $1, %edi
    mov $digit, %rsi
    mov $2, %edx
    syscall

    incb (%rsi)
    dec %bl
    jnz numberLoop

# Accessing arguments
pop %rbx
pop %rax

argLoop:
    dec %rbx
    jz endArgLoop

    pop %rsi
    mov %rsi, %rdi

    mov $-1, %ecx
    xor %al, %al
    repnz scasb

    not %ecx
    movb $'\\n', -1(%rsi, %rcx)

    mov %ecx, %edx
    mov $1, %eax
    mov $1, %edi
    syscall

    jmp argLoop
endArgLoop:

mov $60, %eax   # Syscall code 60 (exit)
mov $0, %edi    # Exit code
syscall

text:  .string "Hello, World!\\n"
digit: .byte   '0', '\\n'`;
}