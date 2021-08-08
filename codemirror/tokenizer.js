import { mnemonicExists, relativeMnemonics } from '@defasm/core/mnemonicList.js';
import { isRegister, sizeHints }             from '@defasm/core/operands.js';
import { prefixes }                          from '@defasm/core/instructions.js';
import { directives, intelDirectives }       from '@defasm/core/directives.js';
import { isNumber, NUM_INVALID, NUM_SYMBOL } from '@defasm/core/shuntingYard.js';
import { ContextTracker, ExternalTokenizer } from 'lezer';

import * as Terms from './parser.terms.js';

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
        else if(pref != '\n' && pref != ';' && (result.intel || pref != '#'))
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
            return null;
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
    if(!mnemonicExists(opcode, ctx.intel))
    {
        if(opcode[0] == 'v' && (ctx.intel || !mnemonicExists(opcode.slice(0, -1), false)))
            opcode = opcode.slice(1);
        if(!ctx.intel && mnemonicExists(opcode.slice(0, -1), false))
            opcode = opcode.slice(0, -1);
        else if(!mnemonicExists(opcode, ctx.intel))
        {
            if(ctx.intel && sizeHints.hasOwnProperty(tok))
            {
                let prevEnd = end;
                if(",;\n{:".includes(next()))
                {
                    end = prevEnd;
                    return Terms.word;
                }

                if(tok == 'ptr')
                {
                    let nextPrevEnd = end;
                    end = ",;\n{:".includes(next()) ? prevEnd : nextPrevEnd;
                    return Terms.Ptr;
                }

                end = prevEnd;
                return Terms.Ptr;
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
};

export const tokenizer = new ExternalTokenizer(
    (input, token, stack) => {
        if(input.read(token.start, token.start + 1).match(/\s/))
            return;
        load(input, token.start);
        next();
        let type = tokenize(stack.context, input);
        if(type !== null)
            token.accept(type, loadStart + end);
        
    }, {
        contextual: false
    }
);