# DefAssembler - Command-line Utility
This package exports a command-line program called `defasm`, with which you can assemble and (optionally) execute Assembly source code. To use the package, install it globally with `npm install -g @defasm/core` and then run `defasm --help`.

Note that the package does *not* come with an emulator. When executing with `-r`, the assembled code is saved into an ELF file and then executed directly. As such, the execution utility is currently functional only on systems that support ELF files (e.g. Linux).

## Options
* `-i`, `--intel` - use Intel syntax when assembling (defaults to AT&T)
* `-o FILE`, `--output FILE` - set the path to the output file (defaults to 'a.out' in the current directory, or /tmp/asm.out if `--run` is provided)
* `-x`, `--executable` - generate an executable file from the input file (note that it will not be linked against other files)
* `-w`, `--writable` - make the .text section writable
* `-r`, `--run` - if given, the assembler will execute the program and print crash information. All parameters following this flag are sent to the program as runtime arguments
* `--size-out=FD` - set the file descriptor to write the number (in ASCII) of bytes generated by the assembler to