import { test } from "node:test";
import assert from "node:assert";

import { AssemblyState } from "@defasm/core";

function validate(state) {
    const mirrorState = new state.__proto__.constructor();
    mirrorState.compile(state.source);
    assert(state.head.dump().equals(mirrorState.head.dump()), 'Resize inconsistency in\n' + state.source);
}

test("Instruction resizing test", async t => {
    const state = new AssemblyState();

    await t.test("Relative operand", () => {
        state.compile("jmp x", { range: state.line(1) });

        state.compile("x = . + 0x7f", { range: state.line(2) }); validate(state);
        state.compile("x = . + 0x80", { range: state.line(2) }); validate(state);
        state.compile("x = . + 0x7f", { range: state.line(2) }); validate(state);
    });

    await t.test("Immediate operand", () => {
        state.compile("push $sym - .", { range: state.line(1) });
    
        state.compile("sym = . + 0x7d", { range: state.line(2) }); validate(state);
        state.compile("sym = . + 0x7e", { range: state.line(2) }); validate(state);
        state.compile("sym = . + 0x7d", { range: state.line(2) }); validate(state);
    });

    await t.test("Memory offset", () => {
        state.compile("push sym - .(%rax)", { range: state.line(1) });
    
        state.compile("sym = . + 0x7c", { range: state.line(2) }); validate(state);
        state.compile("sym = . + 0x7d", { range: state.line(2) }); validate(state);
        state.compile("sym = . + 0x7c", { range: state.line(2) }); validate(state);
    })

    await t.test("MOV moffset", () => {
        state.compile("mov %eax, sym - .", { range: state.line(1) });
        
        state.compile("sym = . + 0x7ffffff6", { range: state.line(2) }); validate(state);
        state.compile("sym = . + 0x7ffffff7", { range: state.line(2) }); validate(state);
        state.compile("sym = . + 0x7ffffff6", { range: state.line(2) }); validate(state);
    });

    await t.test("Unknown symbol", () => {
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
    });

    await t.test("Unknown identifier", () => {
        state.compile(`\
.byte y-.
y=x
x:`, { range: state.line(1).until(state.line(6)) });
        state.compile("push $y-.", { range: state.line(1) }); validate(state);
    });

    await t.test("Indentation", () => {
        function indent(lines) {
            for(let i = 0; i < 2; i++) {
                for(let line = 1; line <= lines; line++) {
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
    });
});
