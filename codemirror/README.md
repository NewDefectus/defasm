# DefAssembler - CodeMirror Extension
A [CodeMirror 6](https://codemirror.net/6/) extension that highlights Assembly code and assembles it in real-time.

This package uses the [DefAssembler core package](https://www.npmjs.com/package/@defasm/core) to generate binary dumps from the Assembly code. For a demonstration of the plugin in action, I recommend checking out the [GitHub Pages site](https://newdefectus.github.io/defAsm/), or alternatively, the [Code Golf editor](https://code.golf/ng/fizz-buzz#assembly), where you can also run your programs and submit them to the site.

# Usage
The package exports the `assembly()` function, which returns a [`LanguageSupport`](https://codemirror.net/6/docs/ref/#language.LanguageSupport) object that can be added as an extension to the editor.

To access the state of the assembler, get the `EditorView` object of the editor and access the `'asm-state'` property, as in:

```js
const editor = new EditorView({
    dispatch: tr => {
        let result = editor.update([tr]);
        byteCount = editor['asm-state'].bytes;
        return result;
    },
    state: EditorState.create({ extensions: [assembly()] })
});
```