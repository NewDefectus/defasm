import { EditorView, ViewPlugin, ViewUpdate, Decoration, WidgetType } from '@codemirror/view';
import { hoverTooltip }                                               from '@codemirror/tooltip';

import { compileAsm, secondPass } from '@defasm/core/compiler.js';
import { mnemonics }              from '@defasm/core/mnemonicList.js';
import { registers, suffixes }    from '@defasm/core/operands.js';
import { prefixes }               from '@defasm/core/instructions.js';
import { dirs }                   from '@defasm/core/directives.js';

import * as Terms from './parser.terms.js';

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

export const asmHover = hoverTooltip((view, pos) => {
    for(let err of view['asm-errors'])
    {
        if(err.from <= pos && err.to >= pos)
        {
            let text = err.value.message;
            return {
                pos: err.from,
                end: err.to,
                above: true,
                create: view => {
                    let dom = document.createElement('div');
                    dom.textContent = text;
                    dom.className = 'cm-asm-error-tooltip';
                    return { dom };
                }
            }
        }
    }

    return null;
});

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

export const asmPlugin = ViewPlugin.fromClass(class {
    /** @param {EditorView} view */
    constructor(view)
    {
        this.ctx          = document.createElement('canvas').getContext('2d');
        this.lineWidths   = [];
        this.instrs       = [];

        let result = compileAsm(view.state.sliceDoc(), this.instrs);
        view['asm-bytes'] = result.bytes;
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
            this.tabSize = style.getPropertyValue('tab-size');
            this.updateWidths(0, view.state.doc.length, 0, view.state.doc);
            this.makeAsmDecorations(view);
            view.dispatch();
        }, 1);
        
    }

    /** @param {ViewUpdate} update */
    update(update)
    {
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

        /* In case there are multiple changed ranges, we'll compile each
        range separately and only run the second pass on the final state. */
        update.changes.iterChanges(
            (fromA, toA, fromB, toB) => {
                let removedLines =
                    update.startState.doc.lineAt(toA).number
                    -
                    update.startState.doc.lineAt(fromA).number;
                let line = doc.lineAt(fromB);
                fromB = line.from;
                toB = doc.lineAt(toB).to;
                compileAsm(state.sliceDoc(fromB, toB), this.instrs, { line: line.number, linesRemoved: removedLines, doSecondPass: false });
            }
        );

        update.view['asm-bytes'] = secondPass(this.instrs);
        this.makeAsmDecorations(update.view);
    }

    updateWidths(from, to, removedLines, doc)
    {
        let start = doc.lineAt(from).number;
        let end   = doc.lineAt(to).number;
        let newWidths = [];
        
        for(let i = start; i <= end; i++)
        {
            newWidths.push(this.ctx.measureText(expandTabs(doc.line(i).text, this.tabSize)).width);
        }
        this.lineWidths.splice(start - 1, removedLines + 1, ...newWidths);
    }

    /** @param {EditorView} view */
    makeAsmDecorations(view)
    {
        let doc       = view.state.doc;
        let maxOffset = Math.max(...this.lineWidths) + 50;
        let widgets   = [];
        let hasData;

        view['asm-errors'] = [];

        for(let i = 0; i < this.instrs.length; i++)
        {
            if(this.instrs[i].length == 0) continue;

            hasData = false;
            this.instrs[i].map(x => {
                let error = x.error;
                if(error)
                {
                    let errorMark = Decoration.mark({
                        class: 'cm-asm-error'
                    });
                    errorMark.message = error.message;
                    let errorPos = view.state.doc.line(i + 1).from + error.pos;
                    let errRange = errorMark.range(errorPos, errorPos + error.length);
                    widgets.push(errRange);
                    view['asm-errors'].push(errRange);
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


/* Auxiliary functions for the Assembly grammar, to help identify registered keywords */

export function isOpcode(opcode)
{
    opcode = opcode.toLowerCase();
    if(prefixes.hasOwnProperty(opcode))
        return Terms.Prefix;
    if(!mnemonics.hasOwnProperty(opcode))
    {
        if(opcode[0] === 'v' && !mnemonics.hasOwnProperty(opcode.slice(0, -1)))
            opcode = opcode.slice(1);
        if(!mnemonics.hasOwnProperty(opcode) && !mnemonics.hasOwnProperty(opcode.slice(0, -1)))
            return -1;
    }
    return Terms.Opcode;
}

export function isRegister(reg)
{
    reg = reg.slice(1).trim().toLowerCase();
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

export function isDirective(dir)
{
    return dirs.hasOwnProperty(dir.slice(1)) ? Terms.Directive : -1;
}