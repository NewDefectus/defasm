import { assembly } from "../codemirror/assembly";
import { EditorView } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { lineNumbers } from "@codemirror/gutter";
import { defaultHighlightStyle }              from '@codemirror/highlight';

var editor = new EditorView({
    dispatch: tr => {
        document.cookie = "code=" + encodeURIComponent(tr.newDoc.sliceString(0)); // Save the code
        return editor.update([tr]);
    },
    parent: document.getElementById("inputAreaContainer"),
    state: EditorState.create({
        doc: getLastCode(),
        extensions: [assembly(), lineNumbers(), defaultHighlightStyle]
    })
});

function getLastCode()
{
    let prevCode = document.cookie.split('; ').find(row => row.startsWith("code="));
    if(prevCode)
        return decodeURIComponent(prevCode.slice(5));
    return "";
}