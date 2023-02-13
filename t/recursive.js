#!/usr/bin/env node
"use strict";
// Recursive symbol definition detection

exports.run = async function()
{
    setTimeout(() => process.exit(-1), 1000);
    const { AssemblyState, Range } = await import("@defasm/core");
    let state = new AssemblyState();

    const checkError = () => {
        if(state.errors.length < 1)
            throw(`Missing recursive definition error in: ${state.source}`)
        else if(state.errors[0].message != "Recursive definition")
            throw state.errors[0];
    }

    state.compile('a=a'); checkError();
    state.compile('x=y; y=x'); checkError();
    state.compile('x', { range: new Range(2, 1) }); checkError();
    state.compile('y', { range: new Range(2, 1) }); checkError();

    const checkFirstByte = byte => {
        if(state.head.dump()[0] != byte)
            throw `Incorrect recursion handling for ${state.source}: expected ${byte}, got ${state.head.dump()[0]}`;
    }

    state.compile(`\
a=4
.byte a`);
    state.compile('a=a', { range: state.line(1) });
    checkError(); checkFirstByte(0);

    state.compile('a=4', { range: state.line(1) });
    state.compile('x=a; .byte x', { range: state.line(2) });
    state.compile('a=a', { range: state.line(1) });
    checkFirstByte(0);
    
    state.compile('a=4', { range: state.line(1) });
    checkFirstByte(4);
}

if(require.main === module)
{
    exports.run().then(x => process.exit(0)).catch(x => { console.error(x); process.exit(1) });
}