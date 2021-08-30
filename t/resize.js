#!/usr/bin/env node
"use strict";
// Instruction resizing test

function validate(state)
{
    let mirrorState = new state.__proto__.constructor();
    mirrorState.compile(state.source);
    if(!state.head.dump().equals(mirrorState.head.dump()))
        throw 'Resize inconsistency in\n' + state.source;
}

exports.run = async function()
{
    const { AssemblyState } = await import("@defasm/core");
    let state = new AssemblyState();

    // Relative operand resizing
    state.compile("jmp x", { range: state.line(1) });

    state.compile("x = . + 0x7f", { range: state.line(2) }); validate(state);
    state.compile("x = . + 0x80", { range: state.line(2) }); validate(state);
    state.compile("x = . + 0x7f", { range: state.line(2) }); validate(state);

    // Immediate operand resizing
    state.compile("push $sym - .", { range: state.line(1) });
    
    state.compile("sym = . + 0x7d", { range: state.line(2) }); validate(state);
    state.compile("sym = . + 0x7e", { range: state.line(2) }); validate(state);
    state.compile("sym = . + 0x7d", { range: state.line(2) }); validate(state);

    // Memory offset resizing
    state.compile("push sym - .(%rax)", { range: state.line(1) });
    
    state.compile("sym = . + 0x7c", { range: state.line(2) }); validate(state);
    state.compile("sym = . + 0x7d", { range: state.line(2) }); validate(state);
    state.compile("sym = . + 0x7c", { range: state.line(2) }); validate(state);
}

if(require.main === module)
{
    exports.run().then(x => process.exit(0)).catch(x => { console.error(x); process.exit(1) });
}