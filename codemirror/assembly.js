import { asmPlugin }                      from "../codemirror/asmPlugin.js";
import { parser }                         from "../codemirror/parser.js";
import { LezerLanguage, LanguageSupport } from '@codemirror/language';
import { styleTags, tags }                from '@codemirror/highlight';

const assemblyLang = LezerLanguage.define({
    parser: parser.configure({
        props: [
            styleTags({
                Opcode: tags.operatorKeyword,
                Prefix: tags.keyword,
                Register: tags.className,
                Directive: tags.meta,
                Comment: tags.lineComment,
                LabelDefinition: tags.definition(tags.labelName),
                MacroDefinition: tags.definition(tags.macroName),
                Immediate: tags.literal,
                Expression: tags.literal,
                FullString: tags.string
            })
        ]
    })
});

export function assembly() {
    return new LanguageSupport(assemblyLang, asmPlugin);
}