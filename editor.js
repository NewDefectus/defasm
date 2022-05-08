import { standardKeymap, indentWithTab, history, historyKeymap }    from "@codemirror/commands";
import { closeBrackets, closeBracketsKeymap }                       from "@codemirror/autocomplete";
import { defaultHighlightStyle, syntaxHighlighting }                from "@codemirror/language";
import { EditorState }                                              from "@codemirror/state";
import { EditorView, keymap, lineNumbers }                          from "@codemirror/view";
import { assembly, ASMStateField, ShellcodePlugin, ShellcodeField } from "@defasm/codemirror";

const byteCount = document.getElementById('byteCount');
const shellcodeSpan = document.getElementById('shellcode');
const urlParams = new URLSearchParams(window.location.search);
const shellcodeEnabled = urlParams.has('shellcode');
if(shellcodeEnabled)
{
    let shellcodeContainer = document.getElementById('shellcodeContainer');
    shellcodeContainer.style.display = "block";
    shellcodeContainer.onclick = () => {
        let range = document.createRange();
        range.setStart(shellcodeContainer, 0);
        range.setEnd(shellcodeContainer, shellcodeContainer.childNodes.length);
        document.getSelection().removeAllRanges();
        document.getSelection().addRange(range);
        document.execCommand('copy');
    }
}

/** @type {EditorView} */
const editor = new EditorView({
    dispatch: tr => {
        const result = editor.update([tr]);
        const bytes = editor.state.field(ASMStateField).head.length();
        document.cookie = "code=" + encodeURIComponent(tr.newDoc.sliceString(0)); // Save the code
        byteCount.innerText = `${bytes} byte${bytes != 1 ? 's' : ''}`;
        if(shellcodeEnabled)
        {
            while(shellcodeSpan.hasChildNodes())
                shellcodeSpan.removeChild(shellcodeSpan.firstChild);

            let { code } = editor.state.field(ShellcodeField);
            let i = 0;
            for(let j = 0; j < code.length; j++)
            {
                let codepoint = code.charCodeAt(j), oldI = i;
                let span = document.createElement('span');
                span.innerText = code[j];
                i++;

                if(code[j] == '\\' && /[01234567]{3}/.exec(code.slice(j + 1, j + 4)))
                {
                    span.innerText = code.slice(j, j + 4);
                    j += 3;
                    span.style.color = "#F00";
                }
                else if(codepoint >= 0x80)
                {
                    i += 1 + (codepoint >= 0x800);
                    if(codepoint >= 0xD800 && codepoint < 0xDC00) // surrogate pair
                        i++, j++, span.innerText += code[j];
                    span.style.color = "#00F";
                }

                shellcodeSpan.appendChild(span);
            }
        }
        return result;
    },
    parent: document.getElementById("inputAreaContainer"),
    state: EditorState.create({
        doc: getLastCode(),
        extensions: [
            syntaxHighlighting(defaultHighlightStyle),
            closeBrackets(),
            history(),
            keymap.of([...closeBracketsKeymap, ...historyKeymap, indentWithTab, ...standardKeymap]),
            lineNumbers(),
            assembly({ debug: true }),
            ...shellcodeEnabled ? [ShellcodePlugin] : []
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