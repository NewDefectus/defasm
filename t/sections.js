import { test } from "node:test";
import assert from "node:assert";

import { AssemblyState } from "@defasm/core";

test("Section editing", async t => {
    const state = new AssemblyState();

    function checkSection(sectionId, bytes) {
        const buffer = Buffer.from(bytes), section = state.sections[sectionId];
        const sectionData = section.head.dump();
        assert(
            sectionData.equals(buffer),
            `${section.name} has ${sectionData.join('')}, expected ${buffer.join('')}`
        );
    }

    await t.test("Basic section data division", () => {
        state.compile(`\
.text
    .byte 1
    .byte 2
    .byte 3
.data
    .byte 4
    .byte 5
    .byte 6
`);
        checkSection(0, [1, 2, 3]);
        checkSection(1, [4, 5, 6]);
    });
    
    await t.test("Changing section ranges", () => {
        state.compile('.data', { range: state.line(1) });
        checkSection(0, []);
        checkSection(1, [1, 2, 3, 4, 5, 6]);

        state.compile('.text', { range: state.line(1) });
        checkSection(0, [1, 2, 3]);
        checkSection(1, [4, 5, 6]);
    });

    await t.test("Merging sections", () => {
        state.compile('', { range: state.line(5) });
        checkSection(0, [1, 2, 3, 4, 5, 6]);
        checkSection(1, []);
    });

    await t.test("Changing section of symbol", () => {
        state.compile(`\
.text
start:
end = . - start
.data`);
        state.compile('.data', { range: state.line(1), haltOnError: true });
    });
});
