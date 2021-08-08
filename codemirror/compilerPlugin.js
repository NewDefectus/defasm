import { EditorView, ViewPlugin, ViewUpdate, Decoration, WidgetType } from '@codemirror/view';
import { EditorState, StateField } from '@codemirror/state';
import { AssemblyState }                     from '@defasm/core/compiler.js';
import { Range }                             from '@defasm/core/statement.js';

/** @type {StateField<AssemblyState>} */
export const ASMStateField = StateField.define({
    create: state => {
        const asm = new AssemblyState();
        asm.compile(state.sliceDoc());
        return asm;
    },
    update: (state, transaction) => {
        if(!transaction.docChanged)
            return state;

        /* In case there are multiple changed ranges, we'll compile each
        range separately and only run the second pass on the final state. */
        transaction.changes.iterChanges(
            (fromA, toA, fromB, toB) =>
                state.compile(transaction.state.sliceDoc(fromB, toB), { range: new Range(fromA, toA - fromA), doSecondPass: false })
        );

        state.secondPass();
        return state;
    }
});

class AsmDumpWidget extends WidgetType
{
    constructor(instrs, offset)
    {
        super();
        this.instrs = instrs;
        this.offset = offset;
    }

    toDOM()
    {
        let node = document.createElement('span');
        let finalText = "";
        node.setAttribute('aria-hidden', 'true');
        node.className = 'cm-asm-dump';
        node.style.marginLeft = this.offset + 'px';

        for(let instr of this.instrs) {
            for(let i = 0; i < instr.length; i++)
            {
                finalText += ' ' +
                    instr.bytes[i].toString(16).toUpperCase().padStart(2, '0');
            }
        }

        node.innerText = finalText.slice(1);
        return node;
    }
}

/* Convert tabs to spaces, for proper width measurement */
function expandTabs(text, tabSize)
{
    let result = "", i = tabSize;
    for(let char of text)
    {
        if(char == '\t')
        {
            result += ' '.repeat(i);
            i = tabSize;
        }
        else
        {
            result += char;
            i = i - 1 || tabSize;
        }
    }
    return result;
}

export const compilerPlugin = [
    ASMStateField.extension,
    // ASM dump plugin
    ViewPlugin.fromClass(class {
        /** @param {EditorView} view */
        constructor(view)
        {
            this.ctx        = document.createElement('canvas').getContext('2d');
            this.lineWidths = [];

            this.decorations = Decoration.set([]);

            // This timeout is required to let the content DOM's style be calculated
            setTimeout(() => {
                let style = window.getComputedStyle(view.contentDOM);

                this.ctx.font = `${
                    style.getPropertyValue('font-style')
                } ${
                    style.getPropertyValue('font-variant')
                } ${
                    style.getPropertyValue('font-weight')
                } ${
                    style.getPropertyValue('font-size')
                } ${
                    style.getPropertyValue('font-family')
                }`;
                
                
                this.updateWidths(0, view.state.doc.length, 0, view.state);
                this.makeAsmDecorations(view.state);
                view.dispatch();
            }, 1);
            
        }

        /** @param {ViewUpdate} update */
        update(update)
        {
            if(!update.docChanged)
                return;

            let state = update.view.state;

            update.changes.iterChangedRanges(
                (fromA, toA, fromB, toB) => {
                    let removedLines =
                        update.startState.doc.lineAt(toA).number
                        -
                        update.startState.doc.lineAt(fromA).number;
                    this.updateWidths(fromB, toB, removedLines, state);
                }
            );

            this.makeAsmDecorations(update.state);
        }

        updateWidths(from, to, removedLines, { doc, tabSize })
        {
            let start = doc.lineAt(from).number;
            let end   = doc.lineAt(to).number;
            let newWidths = [];
            
            for(let i = start; i <= end; i++)
                newWidths.push(this.ctx.measureText(expandTabs(doc.line(i).text, tabSize)).width);
            
            this.lineWidths.splice(start - 1, removedLines + 1, ...newWidths);
        }

        /** @param {EditorState} state */
        makeAsmDecorations(state)
        {
            let doc       = state.doc;
            let maxOffset = Math.max(...this.lineWidths) + 50;
            let widgets   = [];

            state.field(ASMStateField).iterateLines((instrs, line) => {
                if(instrs.length == 0)
                    return;

                if(instrs.some(instr => instr.length > 0))
                    widgets.push(Decoration.widget({
                            widget: new AsmDumpWidget(instrs, maxOffset - this.lineWidths[line - 1]),
                            side: 1
                        }).range(doc.line(line).to));
            });

            this.decorations = Decoration.set(widgets);
        }

    }, { decorations: plugin => plugin.decorations })
];