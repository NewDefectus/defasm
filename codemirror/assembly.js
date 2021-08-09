import { compilerPlugin }                 from "./compilerPlugin.js";
import { errorPlugin }                    from "./errorPlugin.js";
import { parser }                         from "./parser.js";
import { LezerLanguage, LanguageSupport } from '@codemirror/language';
import { styleTags, tags }                from '@codemirror/highlight';
import { EditorView }                     from '@codemirror/view';

const assemblyLang = LezerLanguage.define({
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
        borderRadius: ".25em",
        padding: ".1em .25em",
        color: "#eee",
        backgroundColor: "black",
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
    },
    '&dark .cm-asm-error-tooltip': {
        color: "black",
        backgroundColor: "#eee",
        "&:before": {
            borderTop: ".3em solid #eee"
        }
    },
    '&dark .cm-asm-dump': {
        color: "#aaa"
    }
});

export function assembly()
{
    return new LanguageSupport(assemblyLang, [asmTheme, compilerPlugin, errorPlugin]);
}

export { ASMStateField } from "./compilerPlugin";
export { ASMErrorField } from "./errorPlugin";