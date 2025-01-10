import { test } from "node:test";
import assert from "node:assert";

import { AssemblyState, Range } from "@defasm/core";
import { createExecutable, debug } from "@defasm/cli";

test("Exit status propagation test", { skip: process.platform != 'linux' }, () => {
    const outputFile = "/tmp/asm";
    const state = new AssemblyState();
    state.compile(`\
EXIT_STATUS = 0
mov $60, %eax
mov $EXIT_STATUS, %edi
syscall`);
    for(let i = 0, j = 0; i < 256; j = i++)
    {
        state.compile(i.toString(), { range: new Range("EXIT_STATUS = ".length, j.toString().length) });
        createExecutable(outputFile, state);
        const status = debug(outputFile, [], state);
        assert.equal(status, i);
    }
});
