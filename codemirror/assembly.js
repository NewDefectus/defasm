import { asmHover, asmPlugin }            from "./asmPlugin.js";
import { parser }                         from "./parser.js";
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
                Memory: tags.regexp,
                Relative: tags.regexp,
                Expression: tags.literal,
                FullString: tags.string,
                CharString: tags.string
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
    },
    '.cm-asm-error-tooltip': {
        fontFamily: "monospace",
        color: "#eee",
        backgroundColor: "black",
        borderRadius: ".25em",
        padding: ".1em .25em",
        "&:before": {
            position: "absolute",
            content: '""',
            left: ".3em",
            marginLeft: "-.1em",
            bottom: "-.3em",
            borderLeft: ".3em solid transparent",
            borderRight: ".3em solid transparent",
            borderTop: ".3em solid black"
        }
    }
});

export function assembly() {
    return new LanguageSupport(assemblyLang, [asmPlugin, asmTheme, asmHover]);
}