import { EditorView, ViewPlugin, ViewUpdate, Decoration } from '@codemirror/view';
import { EditorState, ChangeSet } from '@codemirror/state';
import { ASMStateField } from '@defasm/codemirror';

var debugEnabled = false;

export const debugPlugin = [
    
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