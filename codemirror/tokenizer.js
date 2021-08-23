import {
    fetchMnemonic, sizeHints, prefixes, isRegister,
    isDirective, scanIdentifier
} from '@defasm/core';
import { ContextTracker, ExternalTokenizer, InputStream } from '@lezer/lr';

import * as Terms from './parser.terms.js';

var tok;

/** @param {InputStream} input */
function next(input)
{
    tok = '';
    let char;
    
    while(input.next >= 0 && input.next != 10 && String.fromCodePoint(input.next).match(/\s/))
        input.advance();
    if(input.next >= 0 && !(char = String.fromCodePoint(input.next)).match(/[.$\w]/))
    {
        tok = char;
        input.advance();
    }
    else
        while(input.next >= 0 && (char = String.fromCodePoint(input.next)).match(/[.$\w]/))
        {
            tok += char;
            input.advance();
        }

    return tok = tok.toLowerCase() || '\n';
}

const
    STATE_SYNTAX_INTEL = 1,
    STATE_SYNTAX_PREFIX = 2,
    STATE_IN_INSTRUCTION = 4,
    STATE_ALLOW_IMM = 8;

/** @param {import('@defasm/core/parser.js').Syntax} initialSyntax */
export const ctxTracker = initialSyntax => new ContextTracker({
    start: (initialSyntax.intel * STATE_SYNTAX_INTEL) | (initialSyntax.prefix * STATE_SYNTAX_PREFIX),
    shift: (ctx, term, stack, input) => {
        if(term == Terms.Opcode)
            ctx |= STATE_IN_INSTRUCTION | STATE_ALLOW_IMM;
        else if((ctx & STATE_IN_INSTRUCTION) && term != Terms.Space)
        {
            if(input.next == ','.charCodeAt(0))
                ctx |= STATE_ALLOW_IMM;
            else
                ctx &= ~STATE_ALLOW_IMM;
        }
        
        if(input.next == '\n'.charCodeAt(0) || input.next == ';'.charCodeAt(0))
            ctx &= ~STATE_IN_INSTRUCTION;
        if(term != Terms.Directive)
            return ctx;
        let result = ctx, syntax = next(input);
        if(syntax == ".intel_syntax")
        {
            result |= STATE_SYNTAX_INTEL;
            result &= ~STATE_SYNTAX_PREFIX;
        }
        else if(syntax == ".att_syntax")
        {
            result &= ~STATE_SYNTAX_INTEL;
            result |= STATE_SYNTAX_PREFIX;
        }
        else
            return ctx;
        const pref = next(input);
        if(pref == 'prefix')
            result |= STATE_SYNTAX_PREFIX;
        else if(pref == 'noprefix')
            result &= ~STATE_SYNTAX_PREFIX;
        else if(pref != '\n' && pref != ';' && ((result & STATE_SYNTAX_INTEL) || pref != '#'))
            return ctx;
        
        return result;
    },
    hash: ctx => ctx,
    strict: false
});

/** @param {InputStream} input */
function tokenize(ctx, input)
{
    if((ctx & STATE_ALLOW_IMM) && tok[0] == '$')
    {
        input.pos -= tok.length - 1;
        return Terms.immPrefix;
    }

    const intel = ctx & STATE_SYNTAX_INTEL, prefix = ctx & STATE_SYNTAX_PREFIX;
    if(tok == '%' && (intel || prefix))
    {
        next(input);
        if(prefix && isRegister(tok))
            return Terms.Register;
        if(intel && isDirective('%' + tok, true))
            return Terms.Directive;
        return null;
    }

    if(tok == (intel ? ';' : '#'))
    {
        while(input.next >= 0 && input.next != '\n'.charCodeAt(0))
            input.advance();
        return Terms.Comment;
    }

    if(tok == '=' || intel && tok == 'equ')
        return Terms.symEquals;
    
    if(tok == '{')
    {
        if((!prefix || next(input) == '%') && isRegister(next(input)))
            return null;
        while(tok != '\n' && tok != '}')
            next(input);
        return Terms.VEXRound;
    }

    if(!(ctx & STATE_IN_INSTRUCTION))
    {
        if(isDirective(tok, intel))
            return Terms.Directive;

        if(intel && tok == 'offset')
            return Terms.Offset;

        if(prefixes.hasOwnProperty(tok))
            return Terms.Prefix;

        let opcode = tok, mnemonics = fetchMnemonic(opcode, intel);
        if(mnemonics.length > 0)
            return mnemonics[0].relative
            ?
                intel ? Terms.IRelOpcode : Terms.RelOpcode
            :
                intel ? Terms.IOpcode : Terms.Opcode;
    }
    if(intel && sizeHints.hasOwnProperty(tok))
    {
        let prevEnd = input.pos;
        if(",;\n{:".includes(next(input)))
        {
            input.pos = prevEnd;
            return Terms.word;
        }

        if(tok == 'ptr')
        {
            let nextPrevEnd = input.pos;
            input.pos = ",;\n{:".includes(next(input)) ? prevEnd : nextPrevEnd;
            return Terms.Ptr;
        }

        input.pos = prevEnd;
        return Terms.Ptr;
    }

    const idType = scanIdentifier(tok, intel);
    if(idType === null)
        return null;
    if(!prefix && isRegister(tok))
        return Terms.Register;
    if(idType == 'symbol')
        return Terms.word;
    return Terms.number;
}
export const tokenizer = new ExternalTokenizer(
    (input, stack) => {
        if(input.next < 0 || String.fromCharCode(input.next).match(/\s/))
            return;

        next(input);
        const type = tokenize(stack.context, input);
        if(type !== null)
            input.acceptToken(type);
        
    }, {
        contextual: false
    }
);