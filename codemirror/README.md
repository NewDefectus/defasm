# DefAssembler - CodeMirror Extension
A [CodeMirror 6](https://codemirror.net/6/) extension that highlights Assembly code and assembles it in real-time.

This package uses the [DefAssembler core package](https://www.npmjs.com/package/@defasm/core) to generate binary dumps from the Assembly code. For a demonstration of the plugin in action, I recommend checking out the [GitHub Pages site](https://newdefectus.github.io/defAsm/), or alternatively, the [Code Golf editor](https://code.golf/ng/fizz-buzz#assembly), where you can also run your programs and submit them to the site.

# Usage
The package exports the `assembly()` function, which returns an extension that can be added to the editor. The configuration object passed to the function may include the following boolean fields:
* `byteDumps` - whether to display the results of the assembly on the side of the editor
* `debug` - whether to enable toggling debug mode when pressing F3
* `errorMarking` - whether to draw a red underline beneath segments of code that cause errors
* `errorTooltips` - whether to show a tooltip on these segments explaining the cause of the error
* `highlighting` - whether to enable syntax highlighting using a [`LanguageSupport`](https://codemirror.net/6/docs/ref/#language.LanguageSupport) object
* `intel` - set to `true` for Intel syntax, `false` for AT&T syntax

By default, all of these fields, except for `debug` and `intel`, are set to `true`.

The `AssemblyState` object associated with the editor may be accessed through the `ASMStateField` state field, as such:

```js
import { assembly, ASMStateField } from "@defasm/codemirror";
new EditorView({
    dispatch: tr => {
        const result = editor.update([tr]);
        const state = editor.state.field(ASMStateField);
        byteCount = state.bytes;
        return result;
    },
    state: EditorState.create({ extensions: [assembly()] })
});
```

Errors from the assembler are also collected into a list; they may be accessed through the `ASMErrorField` state field:

```js
import { assembly, ASMErrorField } from "@defasm/codemirror";
new EditorView({
    dispatch: tr => {
        const result = editor.update([tr]);
        const errors = editor.state.field(ASMErrorField);
        for(const { range, message } of errors)
            console.warn(`Error (${range.start}-${range.end}): ${message}`);
        return result;
    },
    state: EditorState.create({ extensions: [assembly()] })
});
```