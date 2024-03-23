import { ASMStateField, ShellcodePlugin, ShellcodeField, ASMFlush, assembly } from "@defasm/codemirror";
import { StateEffect, Compartment } from "@codemirror/state"
import { EditorView } from "@codemirror/view";
import { asmCompartment } from "./compartment";

const editorContainer = document.querySelector('.defasm-editor');

const byteCount = document.getElementById('byte-count');
const bytesSpan = document.getElementById('bytes-span');
const bytesView = document.getElementById('bytes-view');

var selectedSection = null;
const unicodeCompartment = new Compartment();

let unicodeOn = false;
var initialBitness = 64;

const cookieFields = document.cookie.split('; ');
let prevCode = cookieFields.find(row => row.startsWith("code="));
if(prevCode)
    editorContainer.setAttribute('initial-code', decodeURIComponent(prevCode.slice(5)));
let bitnessField = cookieFields.find(row => row.startsWith('bitness='));
if(bitnessField)
{
    initialBitness = parseInt(bitnessField.slice(8));
    editorContainer.setAttribute('bitness', initialBitness);
}

bytesView.onchange = () => {
    let newUnicodeOn = bytesView.selectedIndex === 1;
    let tr = null;

    if(newUnicodeOn != unicodeOn)
    {
        tr = makeUnicodeTransaction(newUnicodeOn);
        unicodeOn = newUnicodeOn;
    }

    selectedSection = bytesView.selectedIndex <= 1 ? null : bytesView.value;
    editorContainer.dispatch(tr);
}

function makeUnicodeTransaction(newState) {
    let extension = newState ? ShellcodePlugin : [];
    return globalEditor.state.update({
        effects: [
            unicodeCompartment.get(globalEditor.state) === undefined ?
                StateEffect.appendConfig.of(unicodeCompartment.of(extension))
            :
                unicodeCompartment.reconfigure(extension),
            ASMFlush.of()
        ]
    });
}

bytesSpan.onclick = () => {
    let range = document.createRange();
    range.setStart(bytesSpan, 0);
    range.setEnd(bytesSpan, bytesSpan.childNodes.length);
    document.getSelection().removeAllRanges();
    document.getSelection().addRange(range);
    document.execCommand('copy');
}

document.querySelectorAll('#bitness-selector span').forEach(button => {
    let thisBitness = button.innerText == 'x64' ? 64 : 32;
    if(thisBitness === initialBitness)
        button.setAttribute('selected', '');

    button.onclick = () => {
        const assemblyState = globalEditor.state.field(ASMStateField);
        if(assemblyState.bitness != thisBitness)
        {
            let newDoc = globalEditor.state.sliceDoc().replace(
                editorContainer.getAttribute(`initial-code-${assemblyState.bitness}`),
                () => editorContainer.getAttribute(`initial-code-${thisBitness}`)
            );
            assemblyState.bitness = thisBitness;
            editorContainer.dispatch(
                globalEditor.state.update({
                    changes: { from: 0, to: globalEditor.state.doc.length, insert: newDoc },
                    effects: asmCompartment.reconfigure(
                        assembly( { assemblyConfig: { syntax: { intel: false, prefix: true}, bitness: thisBitness } })
                    )
                })
            );
        }
        document.querySelector('#bitness-selector span[selected]').removeAttribute('selected')
        button.setAttribute('selected', '');
    }
});

/** @type {EditorView} */
let globalEditor = null;

editorContainer.dispatch = (tr = null, editor = globalEditor) => {
    if(globalEditor === null)
        globalEditor = editor;

    let result = null;
    if(tr !== null)
    {
        result = editor.update([tr]);
        document.cookie = "code=" + encodeURIComponent(tr.newDoc.sliceString(0)); // Save the code
        document.cookie = `bitness=${globalEditor.state.field(ASMStateField).bitness}`;
    }

    const state = editor.state.field(ASMStateField);
    const shownHead = (selectedSection === null ? state : state.sections.find(x => x.name == selectedSection)).head;
    const bytes = shownHead.length();
    byteCount.innerText = `${bytes} byte${bytes != 1 ? 's' : ''}`;
    if (!unicodeOn)
    {
        bytesSpan.innerText = [...shownHead.dump()].map(
            x => x.toString(16).toUpperCase().padStart(2, '0')
        ).join(' ');
    }
    else
    {
        while(bytesSpan.hasChildNodes())
            bytesSpan.removeChild(bytesSpan.firstChild);

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

            bytesSpan.appendChild(span);
        }
    }
    return result;
};
