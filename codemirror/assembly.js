import { asmPlugin }                      from "../codemirror/asmPlugin.js";
import { parser }                         from "../codemirror/parser.js";
import { LezerLanguage, LanguageSupport } from '@codemirror/language';
import { styleTags, tags }                from '@codemirror/highlight';
import { EditorView }                     from '@codemirror/view';

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

const asmTheme = EditorView.baseTheme({
    '.cm-asm-dump': {
        fontStyle: "italic",
        color: "#666"
    },
    '.cm-asm-error': {
        textDecoration: "underline red"
    }
});

export function assembly() {
    return new LanguageSupport(assemblyLang, [asmPlugin, asmTheme]);
}