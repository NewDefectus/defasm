import { ASMStateField, ShellcodeField } from "@defasm/codemirror";

const editorContainer = document.querySelector('.defasm-editor');

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
    editorContainer.setAttribute('shellcode', '');
}

editorContainer.dispatch = (tr, editor) => {
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
            let codepoint = code.charCodeAt(j);
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
};

let prevCode = document.cookie.split('; ').find(row => row.startsWith("code="));
if(prevCode)
    editorContainer.setAttribute('initial-code', decodeURIComponent(prevCode.slice(5)));