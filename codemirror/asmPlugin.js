import { EditorView, ViewPlugin, ViewUpdate, Decoration, WidgetType } from '@codemirror/view';
import { hoverTooltip }                                               from '@codemirror/tooltip';

import { AssemblyState }                from '@defasm/core/compiler.js';
import { mnemonics, relativeMnemonics } from '@defasm/core/mnemonicList.js';
import { isRegister, sizePtrs}                    from '@defasm/core/operands.js';
import { prefixes }                     from '@defasm/core/instructions.js';
import { directives, intelDirectives }                   from '@defasm/core/directives.js';

import { ContextTracker, ExternalTokenizer } from 'lezer';

var allTokens, tok, loadStart, end;

function load(input, start)
{
    allTokens = input.lineAfter(loadStart = start).matchAll(/[.\w]+|\S/g) || [];
}

function next()
{
    let match = allTokens.next();
    if(!match.done)
        end = match.value.index + match.value[0].length;
    return tok = match.done ? '\n' : match.value[0].toLowerCase();
}

export const ctxTracker = new ContextTracker({
    start: { intel: false, prefix: true },
    shift: (ctx, term, input, stack) => {
        if(term != Terms.Directive)
            return ctx;
        load(input, stack.ruleStart);
        let result = {}, syntax = next();
        if(syntax == ".intel_syntax")
        {
            result.intel = true;
            result.prefix = false;
        }
        else if(syntax == ".att_syntax")
        {
            result.intel = false;
            result.prefix = true;
        }
        else
            return ctx;
        let pref = next();
        if(pref == 'prefix')
            result.prefix = true;
        else if(pref == 'noprefix')
            result.prefix = false;
        else if(pref != '\n' && pref != (result.intel ? ';' : '#'))
            return ctx;
        
        return result;
    },
    hash: ctx => (ctx.intel ? 1 : 0) | (ctx.prefix ? 2 : 0),
    strict: false
});

function tokenize(ctx, input)
{
    if(tok == '%' && (ctx.prefix || ctx.intel))
    {
        next();
        if(ctx.prefix && isRegister(tok))
            return Terms.Register;
        if(ctx.intel && intelDirectives.hasOwnProperty('%' + tok))
            return Terms.Directive;
        return null;
    }

    if(tok == (ctx.intel ? ';' : '#'))
    {
        end = input.lineAfter(loadStart).length;
        return Terms.Comment;
    }

    if(tok == ';')
        return Terms.statementSeparator;

    if(tok == '=' || ctx.intel && tok == 'equ')
        return Terms.symEquals;
    
    if(tok == '{')
    {
        let line = input.lineAfter(loadStart), pos = line.indexOf('}') + 1;
        let initEnd = pos || line.length;
        if((!ctx.prefix || next() == '%') && isRegister(next()))
        {
            return null;
        }
        end = initEnd;
        return Terms.VEXRound;
    }

    if(ctx.intel ?
        intelDirectives.hasOwnProperty(tok)
        :
        tok[0] == '.' && directives.hasOwnProperty(tok.slice(1)))
        return Terms.Directive;

    if(!ctx.prefix && isRegister(tok))
        return Terms.Register;

    if(ctx.intel && tok == 'offset')
        return Terms.Offset;

    if(prefixes.hasOwnProperty(tok))
        return Terms.Prefix;

    let opcode = tok;
    if(!mnemonics.hasOwnProperty(opcode))
    {
        if(opcode[0] === 'v' && (ctx.intel || !mnemonics.hasOwnProperty(opcode.slice(0, -1))))
            opcode = opcode.slice(1);
        if(!mnemonics.hasOwnProperty(opcode) && !mnemonics.hasOwnProperty(opcode.slice(0, -1)))
        {
            if(ctx.intel && sizePtrs.hasOwnProperty(tok))
            {
                let prevTok = tok, prevEnd = end;
                if('ptr'.startsWith(next()))
                    return Terms.Ptr;
                tok = prevTok, end = prevEnd;
            }
            switch(isNumber(tok, ctx.intel))
            {
                case NUM_INVALID:
                    return null;
                case NUM_SYMBOL:
                    return Terms.word;
            }
            return Terms.number;
        }
    }
    return relativeMnemonics.includes(opcode)
    ?
        ctx.intel ? Terms.IRelOpcode : Terms.RelOpcode
    :
        ctx.intel ? Terms.IOpcode : Terms.Opcode;
}

export const tokenizer = new ExternalTokenizer(
    (input, token, stack) => {
        load(input, token.start);
        next();
        let type = tokenize(stack.context, input);
        if(type !== null)
            token.accept(type, loadStart + end);
    }, {
        contextual: false
    }
)

import * as Terms from './parser.terms.js';
import { isNumber, NUM_INVALID, NUM_SYMBOL } from '@defasm/core/shuntingYard';

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
        this.ctx        = document.createElement('canvas').getContext('2d');
        this.lineWidths = [];
        this.state      = new AssemblyState();

        this.state.compile(view.state.sliceDoc());
        view['asm-state'] = this.state;
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
            
            this.tabSize =
                style.getPropertyValue('tab-size') ||
                style.getPropertyValue('-moz-tab-size') ||
                style.getPropertyValue('-o-tab-size') || 4;
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
                    update.startState.doc.lineAt(fromA).number + 1;
                let line = doc.lineAt(fromB);
                fromB = line.from;
                toB = doc.lineAt(toB).to;
                this.state.compile(state.sliceDoc(fromB, toB), { line: line.number, linesRemoved: removedLines, doSecondPass: false });
            }
        );

        this.state.secondPass();
        this.makeAsmDecorations(update.view);
    }

    updateWidths(from, to, removedLines, doc)
    {
        let start = doc.lineAt(from).number;
        let end   = doc.lineAt(to).number;
        let newWidths = [];
        
        for(let i = start; i <= end; i++)
            newWidths.push(this.ctx.measureText(expandTabs(doc.line(i).text, this.tabSize)).width);
        
        this.lineWidths.splice(start - 1, removedLines + 1, ...newWidths);
    }

    /** @param {EditorView} view */
    makeAsmDecorations(view)
    {
        let doc       = view.state.doc;
        let maxOffset = Math.max(...this.lineWidths) + 50;
        let widgets   = [];
        let instrs    = this.state.instructions;
        let hasData;

        view['asm-errors'] = [];

        for(let i = 0; i < instrs.length; i++)
        {
            if(instrs[i].length == 0) continue;

            hasData = false;
            instrs[i].map(x => {
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
                    widget: new AsmDumpWidget(instrs[i], maxOffset - this.lineWidths[i]),
                    side: 1
                });
                widgets.push(deco.range(doc.line(i + 1).to));
            }
        }

        this.decorations = Decoration.set(widgets);
    }

}, { decorations: view => view.decorations });