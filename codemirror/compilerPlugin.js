import { EditorView, ViewPlugin, ViewUpdate, Decoration, WidgetType } from '@codemirror/view';
import { EditorState, StateField }                                    from '@codemirror/state';
import { AssemblyState, Range }                                       from '@defasm/core';

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
        let offset = 0;
        transaction.changes.iterChanges(
            (fromA, toA, fromB, toB) => {
                state.compile(transaction.state.sliceDoc(fromB, toB), { range: new Range(fromA + offset, toA - fromA), doSecondPass: false });
                offset += toB - fromB - (toA - fromA);
            }
        );

        state.secondPass();
        return state;
    }
});

class AsmDumpWidget extends WidgetType
{
    /**
     * @param {Uint8Array} bytes
     * @param {Number} offset
     */
    constructor(bytes, offset)
    {
        super();
        this.bytes = bytes;
        this.offset = offset;
    }

    toDOM()
    {
        let node = document.createElement('span');
        node.setAttribute('aria-hidden', 'true');
        node.className = 'cm-asm-dump';
        node.style.marginLeft = this.offset + 'px';

        for(const byte of this.bytes)
        {
            let text = byte.toString(16).toUpperCase().padStart(2, '0');
            let span = document.createElement('span');
            // if(buffer.validUtf8 !== undefined)
            //     span.setAttribute('utf8', buffer.validUtf8 ? 'valid' : 'invalid')
            // else
            //     span.setAttribute('section', buffer.section.name);

            span.innerText = text;
            node.appendChild(span);
        }

        return node;
    }

    eq(widget)
    {
        if(this.offset != widget.offset || this.bytes.length != widget.bytes.length)
            return false;

        for(let i = 0; i < this.bytes.length; i++)
            if(this.bytes[i] != widget.bytes[i])
                return false;

        return true;
    }

    /** @param {HTMLElement} node */
    updateDOM(node)
    {
        node.style.marginLeft = this.offset + 'px';

        for(let i = 0; i < this.bytes.length; i++)
        {
            let byte = this.bytes[i];
            let text = byte.toString(16).toUpperCase().padStart(2, '0');
            if(i < node.childElementCount)
            {
                let span = node.children.item(i);
                if(span.innerText != text)
                    span.innerText = text;
            }
            else
            {
                let span = document.createElement('span');
                // if(buffer.validUtf8 !== undefined)
                //     span.setAttribute('utf8', buffer.validUtf8 ? 'valid' : 'invalid')
                // else
                //     span.setAttribute('section', buffer.section.name);

                span.innerText = text;
                node.appendChild(span);
            }
        }
        while(node.childElementCount > this.bytes.length)
            node.removeChild(node.lastChild);

        return true;
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

export const byteDumper = [
    EditorView.baseTheme({
        '.cm-asm-dump'                    : { fontStyle: "italic" },
        '.cm-asm-dump > span'             : { marginRight: "1ch" },
        '.cm-asm-dump [section]'          : { color: "#A66" },
        '.cm-asm-dump [section=".text"]'  : { color: "#666" },
        '.cm-asm-dump [section=".data"]'  : { color: "#66A" },
        '.cm-asm-dump [section=".bss"]'   : { color: "#6A6" },
        '.cm-asm-dump [section=".rodata"]': { color: "#AA6" },
        '.cm-asm-dump [utf8="valid"]'     : { color: "#00F" },
        '.cm-asm-dump [utf8="invalid"]'   : { color: "#F00" },
        '&dark .cm-asm-dump'              : { color: "#AAA" }
    }),
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

            state.field(ASMStateField).bytesPerLine((buffers, line) => {
                if(buffers.length > 0)
                    widgets.push(Decoration.widget({
                            widget: new AsmDumpWidget(bytes, maxOffset - this.lineWidths[line - 1]),
                            side: 2
                        }).range(doc.line(line).to));
            });

            this.decorations = Decoration.set(widgets);
        }

    }, { decorations: plugin => plugin.decorations })
];