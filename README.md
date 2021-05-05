# DefAssembler
DefAssembler is an x86-64 assembler written in JavaScript. It aims to be relatively lightweight, easy to use, and efficient.

This repository contains two npm packages comprising the assembler. It can be accessed through either a command-line program (as seen in the `@defasm/core` package) or a [CodeMirror 6](https://codemirror.net/6/) extension (as seen in the `@defasm/codemirror` package). See their READMEs for more information.

For a quick demonstration of the assembler, I recommend checking out the [GitHub Pages site](https://newdefectus.github.io/defAsm/). Note that the assembler only supports [AT&T syntax](https://en.wikibooks.org/wiki/X86_Assembly/GAS_Syntax), so if you're wondering why your code isn't compiling, you might be using the wrong syntax (Intel).