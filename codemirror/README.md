# DefAssembler - CodeMirror Extension
A [CodeMirror 6](https://codemirror.net/6/) extension which highlights Assembly code and assembles it in real time.

This package uses the [DefAssembler core package](https://www.npmjs.com/package/@defasm/core) to generate binary dumps from the Assembly code. Note that it only supports [AT&T syntax](https://en.wikibooks.org/wiki/X86_Assembly/GAS_Syntax).

# Usage
The package exports the `assembly()` function, which returns a [`LanguageSupport`](https://codemirror.net/6/docs/ref/#language.LanguageSupport) object that can be added as an extension to the editor.

# Live assembly
A special feature of the assembler is the concept of "live assembly" - the ability to write code in an editor and have the binary dumps be generated and displayed in real time.
This feature is demonstrated on the [GitHub Pages site](https://newdefectus.github.io/defAsm/) for DefAssembler, which displays a CodeMirror editor using this extension.

Live assembly is made efficient by re-assembling specific segments of the source code, in accordance with the actions of the user. For example, if the user is editing a 6,000-line document, the assembler can be configured such that a one line change will result in a re-assembly of only that one line, rather than the entire code. This package implements live assembly within the `asmPlugin.js` file.