import {
    scanMnemonic, isRegister, sizeHints, prefixes,
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
    if(input.next >= 0 && !(char = String.fromCodePoint(input.next)).match(/[.\w]/))
    {
        tok = char;
        input.advance();
    }
    else
        while(input.next >= 0 && (char = String.fromCodePoint(input.next)).match(/[.\w]/))
        {
            tok += char;
            input.advance();
        }

    return tok = tok.toLowerCase() || '\n';
}

/** @param {{intel: boolean, prefix: boolean}} initialSyntax */
export const ctxTracker = initialSyntax => new ContextTracker({
    start: initialSyntax,
    shift: (ctx, term, stack, input) => {
        if(term != Terms.Directive)
            return ctx;
        let result = {}, syntax = next(input);
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
        const pref = next(input);
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

function tokenize({prefix, intel}, input)
{
    if(tok == '%' && (prefix || intel))
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

    if(tok == ';')
        return Terms.statementSeparator;

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

    if(isDirective(tok, intel))
        return Terms.Directive;

    if(!prefix && isRegister(tok))
        return Terms.Register;

    if(intel && tok == 'offset')
        return Terms.Offset;

    if(prefixes.hasOwnProperty(tok))
        return Terms.Prefix;

    let opcode = tok, opData = scanMnemonic(opcode, intel);
    if(opData.length > 0)
        return opData[0].relative
        ?
            intel ? Terms.IRelOpcode : Terms.RelOpcode
        :
            intel ? Terms.IOpcode : Terms.Opcode;

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
    if(idType.type == 'symbol')
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