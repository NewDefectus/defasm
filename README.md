# DefAssembler
DefAssembler is an x86-64 assembler written in JavaScript. It aims to be relatively lightweight, easy to use, and efficient. For a quick demonstration, I recommend checking out the [GitHub Pages site](https://newdefectus.github.io/defAsm/). Note that the assembler only supports [AT&T syntax](https://en.wikibooks.org/wiki/X86_Assembly/GAS_Syntax), so if you're wondering why your code isn't compiling, you might be using the wrong syntax (Intel).

DefAssembler is available in two npm packages, `@defasm/core` and `@defasm/codemirror`, both of which are available in this repository. DefAssembler is also the assembler used by [Code Golf](https://code.golf/ng/fizz-buzz#assembly).

# Features

## Command-line interface
The `@defasm/core` package exports a command-line program called `defasm`, with which you can assemble and (optionally) execute Assembly source code. Install the package globally with `npm install -g @defasm/core` and run `defasm --help` for more information.

When executing the code, after a crash, the assembler will attempt to gather more information about the crash from the process's [core dump](https://en.wikipedia.org/wiki/Core_dump). On most Linux systems, the core dump isn't readily accessible; to allow DefAssembler to read them, core dumps must be enabled (`ulimit -c unlimited`) and their output path configured (`sysctl -w kernel.core_pattern='/tmp/core'`). Note that the core dump path may be any path, so long as it doesn't contain '%' or '|' and the assembler can access it.

The command-line utility is functional only on Linux.

## JavaScript exports
`@defasm/core` also exports a JavaScript prototype called `AssemblyState`; it represents the assembler's state, and as such contains the following data:
* `instructions` - a two-dimensional array of assembled instructions where each row corresponds to a line of source code (note that the instructions also form a linked list).
* `symbols` - a map from a symbol name to the symbol's definition (if it exists) and its references.
* `bytes` - the number of bytes generated after the last compilation.

`AssemblyState` has 3 methods:
* `compile` - usually assembles a given string of source code and discards the previous state; however, it can also be configured to insert (and/or remove) lines of code and update the state appropriately. The assembler aims to perform as few recompilations as possible, so you can rest assured this function is fairly efficient.
* `secondPass` - performs a second pass on the state, resolving symbol references and reporting errors. You typically won't need to use this (it's called automatically after `compile` unless configured otherwise with `doSecondPass`); it's available in case you wish to make multiple changes at once before executing the second pass, which is more efficient.
* `dump` - creates a `Buffer` containing the bytes of all the instructions, one after the other.

### Example

The following node.js script illustrates the assembler's basic capabilities:
```js
import("@defasm/core").then(core => {
    const { AssemblyState } = core;
    let state = new AssemblyState();


    /* Compile just the "nop" instruction */
    state.compile('nop');
    console.log(state.dump()); // <Buffer 90>


    /* Insert a "mov $4, %ax" instruction on line 4 */
    state.compile('mov $4, %ax', { line: 4 });
    console.log(state.dump()); // <Buffer 90 66 b8 04 00>


    /* Insert "jmp lab" on line 3. Note that "lab" is not defined yet, so this
    instruction won't show up in the byte dump */
    state.compile('jmp lab', { line: 3 });
    console.log(state.dump()); // <Buffer 90 66 b8 04 00>


    /* Define "lab" as a label on line 2. This will cause the aforementioned
    "jmp lab" instruction to recompile, now that the "lab" symbol has been defined */
    state.compile('lab:', { line: 2 });
    console.log(state.dump()); // <Buffer 90 eb fe 66 b8 04 00>


    /* Delete lines 1-4, then insert "sub $lab, %dl" on line 1. Note that among the
    deleted instructions was the definition of "lab"; now that it has been removed,
    the symbol is once again undefined, so this instruction will not compile */
    state.compile('sub $lab, %dl', { line: 1, linesRemoved: 4 });
    console.log(state.dump()); // <Buffer >


    /* Redefining the symbol will prompt the previous instruction to recompile */
    state.compile('lab = 27', { line: 2 });
    console.log(state.dump()); // <Buffer 80 ea 1b>

    process.exit();
});
```

## CodeMirror 6 plugin
The `@defasm/codemirror` package provides an extension for [CodeMirror 6](https://codemirror.net/6/) that assembles the code in the editor and displays the results in real-time.

To see this in action, I recommend checking out the aforementioned [GitHub Pages site](https://newdefectus.github.io/defAsm/), or alternatively, the [Code Golf editor](https://code.golf/ng/fizz-buzz#assembly), where you can also run your programs and submit them to the site.

### Usage
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