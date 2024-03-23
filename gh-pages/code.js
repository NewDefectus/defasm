import { ASMStateField, ShellcodeField } from "@defasm/codemirror";

const editorContainer = document.querySelector('.defasm-editor');

const byteCount = document.getElementById('byte-count');
const bytesSpan = document.getElementById('bytes-span');
const bytesSection = document.getElementById('bytes-section');
const shellcodeSpan = document.getElementById('shellcode');

var selectedSection = null;

bytesSection.onchange = () => {
    if(bytesSection.selectedIndex === 0)
        selectedSection = null;
    else
        selectedSection = bytesSection.value;
    editorContainer.dispatch();
}

bytesSpan.onclick = () => {
    let range = document.createRange();
    range.setStart(bytesSpan, 0);
    range.setEnd(bytesSpan, bytesSpan.childNodes.length);
    document.getSelection().removeAllRanges();
    document.getSelection().addRange(range);
    document.execCommand('copy');
}





const urlParams = new URLSearchParams(window.location.search);
const shellcodeEnabled = urlParams.has('shellcode');
if(shellcodeEnabled)
{
    let shellcodeContainer = document.getElementById('shellcodeContainer');
    shellcodeContainer.style.display = "block";
    editorContainer.setAttribute('shellcode', '');
}

let globalEditor = null;
editorContainer.dispatch = (tr = null, editor = globalEditor) => {
    if(globalEditor === null)
        globalEditor = editor;

    let result = null;
    if(tr !== null)
    {
        result = editor.update([tr]);
        document.cookie = "code=" + encodeURIComponent(tr.newDoc.sliceString(0)); // Save the code
    }

    const state = editor.state.field(ASMStateField);
    const shownHead = (selectedSection === null ? state : state.sections.find(x => x.name == selectedSection)).head;
    const bytes = shownHead.length();
    byteCount.innerText = `${bytes} byte${bytes != 1 ? 's' : ''}`;
    bytesSpan.innerText = [...shownHead.dump()].map(x => x.toString(16).toUpperCase().padStart(2, '0')).join(' ');
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