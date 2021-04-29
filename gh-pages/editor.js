import { assembly } from "../codemirror/assembly";
import { EditorView } from "@codemirror/view";
import { EditorState } from "@codemirror/state";

var editor = new EditorView({
    dispatch: tr => {
        document.cookie = "code=" + encodeURIComponent(editor.getValue()); // Save the code
        return editor.update([tr]);
    },
    parent: document.getElementById("inputAreaContainer"),
    state: EditorState.create({
        doc: getLastCode(),
        extensions: [assembly()]
    })
});

function getLastCode()
{
    let prevCode = document.cookie.split('; ').find(row => row.startsWith("code="));
    if(prevCode)
        return decodeURIComponent(prevCode.slice(5));
    return "";
}