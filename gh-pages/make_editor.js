import { defaultKeymap, indentWithTab, history, historyKeymap } from "@codemirror/commands";
import { closeBrackets, closeBracketsKeymap }                   from "@codemirror/autocomplete";
import { defaultHighlightStyle, syntaxHighlighting }            from "@codemirror/language";
import { EditorState, Compartment }                             from "@codemirror/state";
import { EditorView, keymap, lineNumbers }                      from "@codemirror/view";
import { materialDark }                                         from "cm6-theme-material-dark";
import { assembly, ShellcodePlugin }                            from "@defasm/codemirror";

var theme = new Compartment();

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
    for(let editor of editors)
        editor.dispatch({
            effects: theme.reconfigure(event.matches ? materialDark : syntaxHighlighting(defaultHighlightStyle))
        });
});

/** @type {EditorView[]} */
const editors = [];

for(let container of document.getElementsByClassName('defasm-editor'))
{
    let editor = new EditorView({
        dispatch: container.dispatch ? (tr => container.dispatch(tr, editor)) : (tr => editor.update([tr])),
        parent: container,
        state: EditorState.create({
            doc: (() => {
                let prevCode = container.getAttribute('initial-code');
                prevCode ||= container.innerHTML;
                container.innerHTML = "";
                return prevCode;
            })(),
            extensions: [
                theme.of(
                    window.matchMedia('(prefers-color-scheme: dark)').matches ? materialDark : syntaxHighlighting(defaultHighlightStyle)
                ),
                closeBrackets(),
                history(),
                keymap.of([...closeBracketsKeymap, ...historyKeymap, indentWithTab, ...defaultKeymap]),
                lineNumbers(),
                assembly({ debug: true }),
                ...container.hasAttribute('shellcode') ? [ShellcodePlugin] : []
            ]
        })
    });
    editor.contentDOM.setAttribute("data-gramm", "false"); // Disable Grammarly
    editors.push(editor);
}