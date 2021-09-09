import { closeBrackets, closeBracketsKeymap } from "@codemirror/closebrackets";
import { standardKeymap, indentWithTab }      from "@codemirror/commands";
import { lineNumbers }                        from "@codemirror/gutter";
import { defaultHighlightStyle }              from "@codemirror/highlight";
import { history, historyKeymap }             from "@codemirror/history";
import { EditorState }                        from "@codemirror/state";
import { EditorView, keymap }                 from "@codemirror/view";
import { assembly, ASMStateField }            from "@defasm/codemirror";

const byteCount = document.getElementById("byteCount");

/** @type {EditorView} */
const editor = new EditorView({
    dispatch: tr => {
        const result = editor.update([tr]);
        const bytes = editor.state.field(ASMStateField).head.length();
        document.cookie = "code=" + encodeURIComponent(tr.newDoc.sliceString(0)); // Save the code
        byteCount.innerText = `${bytes} byte${bytes != 1 ? 's' : ''}`;
        return result;
    },
    parent: document.getElementById("inputAreaContainer"),
    state: EditorState.create({
        doc: getLastCode(),
        extensions: [
            defaultHighlightStyle,
            closeBrackets(),
            history(),
            keymap.of([...closeBracketsKeymap, ...historyKeymap, indentWithTab, ...standardKeymap]),
            lineNumbers(),
            assembly({ debug: true })
        ]
    })
});

editor.contentDOM.setAttribute("data-gramm", "false"); // Disable Grammarly

function getLastCode()
{
    let prevCode = document.cookie.split('; ').find(row => row.startsWith("code="));
    if(prevCode)
        prevCode = decodeURIComponent(prevCode.slice(5));
    return prevCode || `SYS_WRITE = 1
SYS_EXIT = 60
STDOUT_FILENO = 1

# Printing
.data
buffer: .string "Hello, world!\\n"
bufferLen = . - buffer

.text
mov $SYS_WRITE, %eax
mov $STDOUT_FILENO, %edi
mov $buffer, %esi
mov $bufferLen, %edx
syscall

# Looping
.data
digit: .byte '0', '\\n'

.text
mov $10, %bl
numberLoop:
    mov $SYS_WRITE, %eax
    mov $STDOUT_FILENO, %edi
    mov $digit, %esi
    mov $2, %edx
    syscall

    incb (%rsi)
    dec %bl
    jnz numberLoop

# Accessing arguments
pop %rbx
pop %rax

argLoop:
    dec %ebx
    jz endArgLoop

    pop %rsi
    mov %rsi, %rdi

    mov $-1, %ecx
    xor %al, %al
    repnz scasb

    not %ecx
    movb $'\\n', -1(%rsi, %rcx)

    mov %ecx, %edx
    mov $SYS_WRITE, %eax
    mov $STDOUT_FILENO, %edi
    syscall

    jmp argLoop
endArgLoop:

mov $SYS_EXIT, %eax
mov $0, %edi
syscall`;
}