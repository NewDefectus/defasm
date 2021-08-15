# DefAssembler - Core
A fast and lightweight JavaScript x86-64 assembler, for use both in browsers and as a Node.js package.

DefAssembler is built from scratch without the use of any additional libraries, making it relatively lightweight (~100 KB) and fast. For a quick demonstration, I recommend checking out the [GitHub Pages site](http://newdefectus.github.io/defAsm) showcasing the [@defasm/codemirror](https://www.npmjs.com/package/@defasm/codemirror) package, which utilizes this assembler. Alternatively, you can try it out with the [Code Golf editor](https://code.golf/ng/fizz-buzz#assembly), where you can also run your programs and submit them to the site.

# Features

## Command-line interface
The package exports a command-line program called `defasm`, with which you can assemble and (optionally) execute Assembly source code. Install the package globally with `npm install -g @defasm/core` and run `defasm --help` for more information.

When executing the code, after a crash, the assembler will attempt to gather more information about the crash from the process's [core dump](https://en.wikipedia.org/wiki/Core_dump). On most Linux systems, the core dump isn't readily accessible; to allow DefAssembler to read them, core dumps must be enabled (`ulimit -c unlimited`) and their output path configured (`sysctl -w kernel.core_pattern='/tmp/core'`). Note that the core dump path may be any path, so long as it doesn't contain '%' or '|' and the assembler can access it.

The command-line utility is functional only on Linux.

## Intel and AT&T syntax support
DefAssembler parses AT&T syntax by default, however Intel syntax is also supported. To switch between the two, you can use the `.att_syntax` and `.intel_syntax` directives respectively in your code. For example:

```
.att_syntax # AT&T syntax
push %rax
movb $4, (%rsi, %rbx, 4)
textA: .string "Hello, world!"
textALen = . - textA

.intel_syntax ; Intel syntax
push rax
mov BYTE PTR [rsi + rbx * 4], 4
textB db "Hello, world!"
textBLen equ $ - textB
```


These directives apply until the end of the code or until the next appearance of a syntax directive. Note that adding or removing these directives before other instructions will cause those instructions to recompile.

Additionally, if you wish to control whether registers must be prefixed with '%', you may use either the `prefix` or `noprefix` keywords after either of the aforementioned directives. For instance, the above example may be rewritten with the prefix requirements inverted:

```
.att_syntax noprefix
push rax
movb $4, (rsi, rbx, 4)

.intel_syntax prefix
push %rax
mov BYTE PTR [%rsi + %rbx * 4], 4
```

## JavaScript exports
The package also exports a class called `AssemblyState`. An object of this type is needed for running the assembler; its constructor takes in an optional config object, which can be used to set the parsing syntax to Intel or AT&T (defaults to AT&T).

The class has the following properties:
* `bytes` - the number of bytes generated after the last call to `secondPass`
* `compiledRange` - the range of text parsed by the compiler during the last call to `compile` (used for debugging)
* `instructions` - the dummy header node of a linked list containing all the instructions of the program
* `source` - the source code of the program
* `symbols` - a map from a symbol name to the symbol's definition (if it exists) and its references

`AssemblyState` has 6 methods:
* `compile` - usually assembles a given string of source code and discards the previous state; however, it can also be configured to replace parts of the code and update the state appropriately. The assembler aims to perform as few recompilations as possible, so you can rest assured this function is quite efficient.
* `secondPass` - performs a second pass on the state, resolving symbol references and reporting errors. You typically won't need to use this (it's called automatically after `compile` unless configured otherwise with `doSecondPass`); it's available in case you wish to make multiple changes at once before executing the second pass, which is more efficient.
* `dump` - creates a `Buffer` containing the bytes of all the instructions, one after the other.
* `line` - creates a `Range` object that spans a given line (useful for replacing/inserting lines in `compile`)
* `iterate` - iterates over the instructions using a given callback, passing the instruction's line as a second parameter (note that if an instruction spans multiple lines, it will be called once for each line).
* `bytesPerLine` - iterate over each line in the program using a given callback, sending an array of Uint8Arrays (one per instruction) and a line number. Data directives spanning multiple lines may be sent multiple times. Empty instructions and lines are skipped.

The package also exports a `Range` class, which is used within the compiler to keep track of each instruction's span. A `Range` object may be passed to the `compile` method of `AssemblyState` to specify the range in the code to replace. It can be created using the constructor, which receives the range's start index and length in characters, or using `AssemblyState`'s `line` method described above.

There are also a number of functions exported by the package that identify or collect information about assembly keywords. These are mostly there for syntax highlighting.

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
    state.compile('mov $4, %ax', { range: state.line(4) });
    console.log(state.dump()); // <Buffer 90 66 b8 04 00>


    /* Insert "jmp lab" on line 3. Note that "lab" is not defined yet, so this
    instruction won't show up in the byte dump */
    state.compile('jmp lab', { range: state.line(3) });
    console.log(state.dump()); // <Buffer 90 66 b8 04 00>


    /* Define "lab" as a label on line 2. This will cause the aforementioned
    "jmp lab" instruction to recompile, now that the "lab" symbol has been defined */
    state.compile('lab:', { range: state.line(2) });
    console.log(state.dump()); // <Buffer 90 eb fe 66 b8 04 00>


    /* Replace lines 1-4 with "sub $lab, %dl". Note that among the
    deleted instructions was the definition of "lab"; now that it has been removed,
    the symbol is once again undefined, so this instruction will not compile */
    state.compile('sub $lab, %dl', { range: state.line(1).until(state.line(4)) });
    console.log(state.dump()); // <Buffer >


    /* Redefining the symbol will prompt the previous instruction to recompile */
    state.compile('lab = 27', { range: state.line(2) });
    console.log(state.dump()); // <Buffer 80 ea 1b>

    process.exit();
});
```