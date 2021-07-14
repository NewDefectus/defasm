#!/usr/bin/env node
"use strict";
// Instruction resizing test

function validate(state)
{
    let mirrorState = new state.__proto__.constructor();
    let source = state.source.join('\n');
    mirrorState.compile(source);
    if(!state.dump().equals(mirrorState.dump()))
        throw 'Resize inconsistency in\n\t' + state.source.join('\n\t');
}

exports.run = async function()
{
    const { AssemblyState } = await import("@defasm/core");
    let state = new AssemblyState();

    // Relative operand resizing
    state.compile("jmp x", { line: 1 });

    state.compile("x = . + 0x7f", { line: 2 }); validate(state);
    state.compile("x = . + 0x80", { line: 2 }); validate(state);
    state.compile("x = . + 0x7f", { line: 2 }); validate(state);

    // Immediate operand resizing
    state.compile("push $sym - .", { line: 1 });
    
    state.compile("sym = . + 0x7d", { line: 2 }); validate(state);
    state.compile("sym = . + 0x7e", { line: 2 }); validate(state);
    state.compile("sym = . + 0x7d", { line: 2 }); validate(state);

    // Memory offset resizing
    state.compile("push sym - .(%rax)", { line: 1 });
    
    state.compile("sym = . + 0x7c", { line: 2 }); validate(state);
    state.compile("sym = . + 0x7d", { line: 2 }); validate(state);
    state.compile("sym = . + 0x7c", { line: 2 }); validate(state);
}

if(require.main === module)
{
    exports.run().then(x => process.exit(0)).catch(x => { console.error(x); process.exit(1) });
}