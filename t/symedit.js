import { test } from "node:test";

import { AssemblyState, Range } from "@defasm/core";

test("Editing of symbol names in expressions", () => {
    const state = new AssemblyState();
    state.compile('str: .string "Hello, world!"\nstrLen = . - str', { haltOnError: true });
    state.compile('', { range: new Range(state.source.length - 1, 1) });
    state.compile('r', { range: new Range(state.source.length), haltOnError: true });
});
