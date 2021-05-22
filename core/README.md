# DefAssembler - Core
A fast and lightweight JavaScript x86-64 assembler, for use both in browsers and as a Node.js package.

DefAssembler is built from scratch without the use of any additional libraries, making it relatively lightweight (~100 KB) and fast.

# Usage
This package exports a command-line program called `defasm`, with which you can assemble and (optionally) execute Assembly source code. Install the package globally with `npm install -g @defasm/core` and run `defasm --help` for more information.

The assembler parses [AT&T syntax](https://en.wikibooks.org/wiki/X86_Assembly/GAS_Syntax); the command-line utility is
functional only on Linux.

# Live assembly
A special feature of the assembler is the concept of "live assembly" - the ability to write code in an editor and have the binary dumps be generated and displayed in real time.
This feature is demonstrated on the [GitHub Pages site](https://newdefectus.github.io/defAsm/) for DefAssembler, through the [codemirror package](https://www.npmjs.com/package/@defasm/codemirror) which utilizes the assembler within a [CodeMirror 6](https://codemirror.net/6/) extension.

Live assembly is made efficient by re-assembling specific segments of the source code, in accordance with the actions of the user. For example, if the user is editing a 6,000-line document, the assembler can be configured such that a one line change will result in a re-assembly of only that one line, rather than the entire code. The codemirror package (in particular, the `asmPlugin.js` file) illustrates how this is done.