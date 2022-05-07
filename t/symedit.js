#!/usr/bin/env node
"use strict";
// Editing of symbol names in expressions

exports.run = async function()
{
    const { AssemblyState, Range } = await import("@defasm/core");
    let state = new AssemblyState();
    state.compile('str: .string "Hello, world!"\nstrLen = . - str', { haltOnError: true });
    state.compile('', { range: new Range(state.source.length - 1, 1) });
    state.compile('r', { range: new Range(state.source.length), haltOnError: true });
}

if(require.main === module)
{
    exports.run().then(x => process.exit(0)).catch(x => { console.error(x); process.exit(1) });
}