# DefAssembler
DefAssembler is an incremental x86-64 assembler written in JavaScript. It aims to be relatively lightweight, easy to use, and efficient. For a quick demonstration, I recommend checking out the [GitHub Pages site](https://newdefectus.github.io/defAsm/). DefAssembler is also the assembler used by [Code Golf](https://code.golf/ng/fizz-buzz#assembly).

DefAssembler is currently available in the following npm packages, all of which are developed under this repository:
* `@defasm/core` - this is the main package of the assembler; it exports the functionality required to assemble code.
* `@defasm/cli` -  a command-line utility allowing you to assemble code and output ELF object files. It also provides an option to link and execute the code immediately, which displays register contents, flags, and signal information upon the program's crash.
* `@defasm/codemirror` - a collection of [CodeMirror 6](https://codemirror.net/6/) plugins which demonstrate the assembler's real-time assembly capabilities.

See each package's respective README file for more information.

For development, clone this repository and run `npm install`. Run `npm run dev` to open the demo on port 8000 (uses esbuild's watch feature, so you should refresh after making changes in the code). `npm test` runs the test suite (currently quite small; contributions are very much welcome!).