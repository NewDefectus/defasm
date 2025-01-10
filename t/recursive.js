import { test } from "node:test";
import assert from "node:assert";

import { AssemblyState, Range } from "@defasm/core";

test("Recursive symbol definition detection", { timeout: 1000 }, () => {
    const state = new AssemblyState();

    const checkError = () => {
        assert(state.errors.length > 0, `Missing recursive definition error in: ${state.source}`);
        if(state.errors[0].message != "Recursive definition")
            throw state.errors[0];
    }
    const checkFirstByte = byte => assert.equal(state.head.dump()[0], byte, `Incorrect recursion handling for ${state.source}`);

    state.compile('a=a'); checkError();
    state.compile('x=y; y=x'); checkError();
    state.compile('x', { range: new Range(2, 1) }); checkError();
    state.compile('y', { range: new Range(2, 1) }); checkError();

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
});
