#!/usr/bin/env node
"use strict";
// Exit status propagation test

exports.run = async function()
{
    const { AssemblyState, Range } = await import("@defasm/core");;
    const { createExecutable, debug } = await import("@defasm/cli");
    let outputFile = "/tmp/asm";
    let state = new AssemblyState();
    state.compile(`\
EXIT_STATUS = 0
mov $60, %eax
mov $EXIT_STATUS, %edi
syscall`);
    for(let i = 0, j = 0; i < 256; j = i++)
    {
        state.compile(i.toString(), { range: new Range("EXIT_STATUS = ".length, j.toString().length) });
        createExecutable(outputFile, state);
        let status = debug(outputFile, [], state);
        if(status !== i)
            throw `Discrepancy between written exit status and output: ${status} != ${i}`;
    }
}

if(require.main === module)
{
    exports.run().then(x => process.exit(0)).catch(x => { console.error(x); process.exit(1) });
}