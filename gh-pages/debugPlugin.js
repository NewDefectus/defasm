import { EditorView, ViewPlugin, ViewUpdate, Decoration } from '@codemirror/view';
import { EditorState, ChangeSet } from '@codemirror/state';
import { hoverTooltip } from '@codemirror/tooltip';
import { ASMStateField } from '@defasm/codemirror';

var debugEnabled = false;

export const debugPlugin = [
    hoverTooltip((view, pos) => {
        if(!debugEnabled)
            return null;
        const instr = view.state.field(ASMStateField).find(pos);
        if(!instr)
            return null;
        return {
            pos: instr.range.start,
            end: instr.range.end,
            above: true,
            create: view => {
                let dom = document.createElement('div');
                dom.textContent = `${instr.constructor.name} (#${instr.id})`;
                dom.className = 'cm-asm-error-tooltip';
                return { dom };
            }
        }
    }),
    EditorView.domEventHandlers({
        mousedown: (event, view) => {
            if(debugEnabled && event.ctrlKey)
            {
                console.log(view.state.field(ASMStateField).find(view.posAtCoords(event)));
                return true;
            }
        },
        keydown: (event, view) => {
            if(event.key == 'F3')
            {
                debugEnabled = !debugEnabled;
                view.dispatch(ChangeSet.empty(0));
                return true;
            }
        }
    }),
    ViewPlugin.fromClass(
        class
        {
            /** @param {EditorView} view */
            constructor(view)
            {
                this.markInstructions(view.state);
            }

            /** @param {ViewUpdate} update */
            update(update)
            {
                this.markInstructions(update.state);
            }

            /** @param {EditorState} state */
            markInstructions(state)
            {
                if(!debugEnabled)
                {
                    this.decorations = Decoration.set([]);
                    return;
                }
                let instrMarks = [];
                let i = 0;
                state.field(ASMStateField).iterate(instr => {
                    instrMarks.push(Decoration.mark({
                        class: 'cm-asm-debug',
                        attributes: {
                            style: "background: " + (i++ % 2 ? 'lightcoral' : 'lightblue')
                        }
                    }).range(instr.range.start, instr.range.end))
                });
                this.decorations = Decoration.set(instrMarks);
            }
        },
        { decorations: plugin => plugin.decorations }
    )
];