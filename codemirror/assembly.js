import { ASMStateField, byteDumper }                   from "./compilerPlugin.js";
import { ASMErrorField, errorMarker, errorTooltipper } from "./errorPlugin.js";
import { parser }                                      from "./parser.js";
import { debugPlugin }                                 from "./debugPlugin.js";
import { LRLanguage, LanguageSupport }                 from '@codemirror/language';
import { styleTags, tags }                             from '@codemirror/highlight';
import { AssemblyState }                               from '@defasm/core';
import { makeTokenizer, tokenizer } from "./tokenizer.js";

const assemblyLang = LRLanguage.define({
    parser: parser.configure({
        props: [
            styleTags({
                Opcode: tags.operatorKeyword,
                IOpcode: tags.operatorKeyword,
                RelOpcode: tags.operatorKeyword,
                IRelOpcode: tags.operatorKeyword,
                Prefix: tags.operatorKeyword,
                Register: tags.className,
                Directive: tags.meta,
                Comment: tags.lineComment,
                LabelDefinition: tags.definition(tags.labelName),
                SymbolDefinition: tags.definition(tags.macroName),
                Immediate: tags.literal,
                IImmediate: tags.literal,
                Memory: tags.regexp,
                IMemory: tags.regexp,
                Relative: tags.regexp,
                Expression: tags.literal,
                FullString: tags.string,
                VEXRound: tags.modifier,
                VEXMask: tags.modifier,
                Offset: tags.emphasis,
                Ptr: tags.emphasis
            })
        ]
    })
});

export function assembly({
    byteDumps     = true,
    debug         = false,
    errorMarking  = true,
    errorTooltips = true,
    highlighting  = true,
    intel         = false
} = {})
{
    const plugins = [ASMStateField.init(state => {
        const asm = new AssemblyState({ intel });
        asm.compile(state.sliceDoc());
        return asm;
    }), ASMErrorField.extension];
    if(byteDumps)     plugins.push(byteDumper);
    if(debug)         plugins.push(debugPlugin);
    if(errorMarking)  plugins.push(errorMarker);
    if(errorTooltips) plugins.push(errorTooltipper);

    if(highlighting)
        return new LanguageSupport(assemblyLang.configure({
            tokenizers: [{
                from: tokenizer,
                to: makeTokenizer(intel)
            }]
        }), plugins);
    return plugins;
}

export { ASMStateField } from "./compilerPlugin";
export { ASMErrorField } from "./errorPlugin";