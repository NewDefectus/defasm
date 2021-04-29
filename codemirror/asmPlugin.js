import { EditorView, ViewPlugin, Decoration, WidgetType } from '@codemirror/view';

import { compileAsm, secondPass } from './defAsm/compiler.js';
import { mnemonics }              from './defAsm/mnemonicList.js';
import { registers, suffixes }    from './defAsm/operands.js';
import { prefixes }               from './defAsm/instructions.js';
import { dirs }                   from './defAsm/directives.js';

import * as Terms from './parser.terms.js';

class AsmDumpWidget extends WidgetType {
    constructor(instrs, offset) { super(); this.instrs = instrs; this.offset = offset; };

    toDOM() {
        let node = document.createElement('span');
        let finalText = "";
        node.setAttribute('aria-hidden', 'true');
        node.className = 'cm-asm-dump';
        node.style.marginLeft = this.offset + 'px';

        for(let instr of this.instrs) {
            for(let i = 0; i < instr.length; i++) {
                finalText += ' ' +
                    instr.bytes[i].toString(16).toUpperCase().padStart(2, '0');
            }
        }

        node.innerText = finalText.slice(1);
        return node;
    }
}

export var asmBytes = 0;

export var asmPlugin = ViewPlugin.fromClass(class {
    constructor(view) {
        this.ctx          = document.createElement('canvas').getContext('2d');
        this.ctx.font     = '16px monospace';
        this.lineWidths   = [];
        this.instrs       = [];

        let result = compileAsm(view.state.sliceDoc(), this.instrs);
        asmBytes = result.bytes;

        this.updateWidths(0, view.state.doc.length, 0, view.state.doc);
        this.makeAsmDecorations(view);
    }

    update(update) {
        if(!update.docChanged) return;

        let state = update.view.state;
        let doc   = state.doc;

        update.changes.iterChangedRanges(
            (fromA, toA, fromB, toB) => {
                let removedLines =
                    update.startState.doc.lineAt(toA).number
                    -
                    update.startState.doc.lineAt(fromA).number;
                this.updateWidths(fromB, toB, removedLines, doc);
            }
        );

        try
        {
            update.changes.iterChanges(
                (fromA, toA, fromB, toB) => {
                    let removedLines =
                        update.startState.doc.lineAt(toA).number
                        -
                        update.startState.doc.lineAt(fromA).number;
                    let line = doc.lineAt(fromB);
                    fromB = line.from;
                    toB = doc.lineAt(toB).to;
                    compileAsm(state.sliceDoc(fromB, toB), this.instrs, false, line.number, removedLines, false, fromB);
                }
            );

            asmBytes = secondPass(this.instrs);
        }
        catch(e)
        {
            if(e !== "Macro edited, must recompile") throw e;
            this.instrs = [];
            compileAsm(state.sliceDoc(), this.instrs);
        }
        
        this.makeAsmDecorations(update.view);
    }

    updateWidths(from, to, removedLines, doc) {
        let start = doc.lineAt(from).number;
        let end   = doc.lineAt(to).number;
        let newWidths = [];
        
        for(let i = start; i <= end; i++) {
             newWidths.push(this.ctx.measureText(doc.line(i).text).width);
        }
        this.lineWidths.splice(start - 1, removedLines + 1, ...newWidths);
    }

    /** @param {EditorView} view */
    makeAsmDecorations(view) {
        let doc       = view.state.doc;
        let maxOffset = Math.max(...this.lineWidths) + 50;
        let widgets   = [];
        let hasData;

        for(let i = 0; i < this.instrs.length; i++) {
            if(this.instrs[i].length == 0) continue;

            hasData = false;
            this.instrs[i].map(x => {
                let error = x.error;
                if(error)
                {
                    let errorMark = Decoration.mark({
                        attributes: { "data-tooltip": error.message },
                        class: 'cm-asm-error',
                    });
                    widgets.push(errorMark.range(error.pos, error.pos + error.length));
                }
                if(x.length > 0)
                    hasData = true;
            });

            if(hasData)
            {
                let deco = Decoration.widget({
                    widget: new AsmDumpWidget(this.instrs[i], maxOffset - this.lineWidths[i]),
                    side: 1
                });
                widgets.push(deco.range(doc.line(i + 1).to));
            }
        }

        this.decorations = Decoration.set(widgets);
    }

}, { decorations: view => view.decorations });

export function isOpcode(opcode) {
    opcode = opcode.toLowerCase();
    if(prefixes.hasOwnProperty(opcode))
        return Terms.Prefix;
    if(!mnemonics.hasOwnProperty(opcode)) {
        if(opcode[0] === 'v' && !mnemonics.hasOwnProperty(opcode.slice(0, -1)))
            opcode = opcode.slice(1);
        if(!mnemonics.hasOwnProperty(opcode) && !mnemonics.hasOwnProperty(opcode.slice(0, -1))) {
            return -1;
        }
    }
    return Terms.Opcode;
}

export function isRegister(reg) {
    reg = reg.slice(1).toLowerCase();
    if(registers.hasOwnProperty(reg)) return Terms.Register;
    if(reg[0] === 'r')
    {
        reg = reg.slice(1);
        if(parseInt(reg) > 0 && parseInt(reg) < 16 && (!isNaN(reg) || suffixes[reg[reg.length - 1]])) return Terms.Register;
    }
    else
    {
        let max = 32;
        if(reg.startsWith("mm") || reg.startsWith("dr")) reg = reg.slice(2), max = 8;
        else if(reg.startsWith("cr")) reg = reg.slice(2), max = 9;
        else if(reg.startsWith("xmm") || reg.startsWith("ymm") || reg.startsWith("zmm")) reg = reg.slice(3);
        else if(reg.startsWith("bnd")) reg = reg.slice(3), max = 4;
        else if(reg[0] == 'k') reg = reg.slice(1), max = 8;
        if(!isNaN(reg) && (reg = parseInt(reg), reg >= 0 && reg < max)) return Terms.Register;
    }
    return -1;
}

export function isDirective(dir) {
    return dirs.hasOwnProperty(dir.slice(1)) ? Terms.Directive : -1;
}