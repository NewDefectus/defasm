import {
    scanMnemonic, isRegister, sizeHints, prefixes,
    isDirective, scanIdentifier
} from '@defasm/core';
import { ContextTracker, ExternalTokenizer, InputStream } from '@lezer/lr';

import * as Terms from './parser.terms.js';

var tok, end;

/** @param {InputStream} input */
function next(input)
{
    tok = '';
    let char;
    
    while(char = input.peek(end), char >= 0 && char != 10 && String.fromCodePoint(char).match(/\s/))
        end++;
    if(char = input.peek(end), char >= 0 && !(char = String.fromCodePoint(char)).match(/[.\w]/))
    {
        tok = char;
        end++;
    }
    else
        while(char = input.peek(end), char >= 0 && (char = String.fromCodePoint(char)).match(/[.\w]/))
        {
            tok += char;
            end++;
        }

    return tok = tok.toLowerCase() || '\n';
}

export const ctxTracker = new ContextTracker({
    /** @type {{intel: boolean, prefix: boolean}} */
    start: null,
    shift: (ctx, term, stack, input) => {
        if(term != Terms.Directive)
            return ctx;
        end = 0;
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
        while(input.peek(end) != '\n'.charCodeAt(0))
            end++;
        return Terms.Comment;
    }

    if(tok == ';')
        return Terms.statementSeparator;

    if(tok == '=' || intel && tok == 'equ')
        return Terms.symEquals;
    
    if(tok == '{')
    {
        let line = input.lineAfter(loadStart), pos = line.indexOf('}') + 1;
        let initEnd = pos || line.length;
        if((!prefix || next(input) == '%') && isRegister(next(input)))
            return null;
        end = initEnd;
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
        let prevEnd = end;
        if(",;\n{:".includes(next(input)))
        {
            end = prevEnd;
            return Terms.word;
        }

        if(tok == 'ptr')
        {
            let nextPrevEnd = end;
            end = ",;\n{:".includes(next(input)) ? prevEnd : nextPrevEnd;
            return Terms.Ptr;
        }

        end = prevEnd;
        return Terms.Ptr;
    }

    const idType = scanIdentifier(tok, intel);
    if(idType === null)
        return null;
    if(idType.type == 'symbol')
        return Terms.word;
    return Terms.number;
}

export const tokenizer = new ExternalTokenizer();

export const makeTokenizer = intel => new ExternalTokenizer(
    (input, stack) => {
        // Skip whitespace
        while(input.next >= 0 && input.next != 10 && String.fromCodePoint(input.next).match(/\s/))
            input.advance();
        
        end = 0;
        next(input);
        const type = tokenize(stack.context ?? { intel, prefix: !intel }, input);
        if(type !== null)
            input.acceptToken(type, end);
        
    }, {
        contextual: false
    }
);