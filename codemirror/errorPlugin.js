import { hoverTooltip } from '@codemirror/tooltip';
import { ViewPlugin, Decoration, WidgetType } from '@codemirror/view';
import { ASMStateField } from "./compilerPlugin";
import { ASMError } from "@defasm/core/statement.js";
import { EditorState, StateField } from '@codemirror/state';

/** @param {EditorState} state */
function findErrors(state)
{
    let errors = [];
    state.field(ASMStateField).iterate(instr => {
        if(instr.error)
            errors.push(instr.error);
    });
    return errors;
}

/** @type {StateField<ASMError[]>} */
export const ASMErrorField = StateField.define({
    create: findErrors,
    update: (errors, transaction) =>
        transaction.docChanged ? findErrors(transaction.state) : errors
});

class EOLError extends WidgetType
{
    constructor()
    {
        super();
    }

    toDOM()
    {
        let node = document.createElement('span');
        node.setAttribute('aria-hidden', 'true');
        node.className = 'cm-asm-error';
        node.style.position = 'absolute';
        node.innerText = ' ';
        return node;
    }
}

export const errorPlugin = [
    ASMErrorField.extension,
    // Error underlining
    ViewPlugin.fromClass(
        class
        {
            constructor(view) { this.markErrors(view.state); }
            update(update) { if(update.docChanged) this.markErrors(update.state); }

            /** @param {EditorState} state */
            markErrors(state)
            {
                this.marks = Decoration.set(state.field(ASMErrorField).map(error => {
                    let content = state.sliceDoc(error.range.start, error.range.end);
                    if(content == '\n' || !content)
                        return Decoration.widget({
                            widget: new EOLError(),
                            side: 1
                        }).range(error.range.start);

                    return Decoration.mark({
                        class: 'cm-asm-error'
                    }).range(error.range.start, error.range.end);
                }));
            }
        },
        { decorations: plugin => plugin.marks }
    ),
    // Error tooltips
    hoverTooltip((view, pos) => {
        for(let { range, message } of view.state.field(ASMErrorField))
            if(range.start <= pos && range.end >= pos)
                return {
                    pos: range.start,
                    end: range.end,
                    above: true,
                    create: view => {
                        let dom = document.createElement('div');
                        dom.textContent = message;
                        dom.className = 'cm-asm-error-tooltip';
                        return { dom };
                    }
                }

        return null;
    })
];