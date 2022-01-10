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

    // Unknown symbol resizing
    state.compile(`\
sym = . - 0x7c
jmp a
a:`, { range: state.line(1).until(state.line(3)) });
    state.compile("jmp sym", { range: state.line(4) }); validate(state);

    state.compile(`\
sym = . - 0x7A
jmp b
jmp a
a:
b:`, { range: state.line(1).until(state.line(5)) });
    state.compile("jmp sym", { range: state.line(6) }); validate(state);

    // Unknown identifier resizing
    state.compile(`\
.byte y-.
y=x
x:`, { range: state.line(1).until(state.line(6)) });
    state.compile("push $y-.", { range: state.line(1) }); validate(state);

    // Indentation resizing
    function indent(lines)
    {
        for(let i = 0; i < 2; i++)
        {
            for(let line = 1; line <= lines; line++)
            {
                let range = state.line(line);
                range.length = 0;
                state.compile(' ', { doSecondPass: false, range });
            }
            state.secondPass();
        }
    }
    state.compile(`\
jmp sym
sym = .`, { range: state.line(1).until(state.line(3)) });
    indent(2); validate(state);

    state.compile(`\
sym = . - 0x7A
jmp b  # IMPORTANT
jmp a
a:
b:
jmp sym`, { range: state.line(1).until(state.line(3) )});
    indent(6); validate(state);
}

if(require.main === module)
{
    exports.run().then(x => process.exit(0)).catch(x => { console.error(x); process.exit(1) });
}