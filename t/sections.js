#!/usr/bin/env node
"use strict";
// Section editing

exports.run = async function()
{
    const { AssemblyState } = await import("@defasm/core");
    let state = new AssemblyState(), checkIndex = 0;

    function checkSection(sectionId, bytes)
    {
        checkIndex++;
        let buffer = Buffer.from(bytes), section = state.sections[sectionId];
        let sectionData = section.head.dump();
        if(!sectionData.equals(buffer))
            throw `[${checkIndex}] ${section.name} has ${sectionData.join('')}, expected ${buffer.join('')}`;
    }

    // Basic section data division check
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
    checkSection(0, [1, 2, 3]); // 1
    checkSection(1, [4, 5, 6]); // 2
    
    // Changing section ranges
    state.compile('.data', { range: state.line(1) });
    checkSection(0, []); // 3
    checkSection(1, [1, 2, 3, 4, 5, 6]); // 4

    state.compile('.text', { range: state.line(1) });
    checkSection(0, [1, 2, 3]); // 5
    checkSection(1, [4, 5, 6]); // 6

    // Merging sections
    state.compile('', { range: state.line(5) });
    checkSection(0, [1, 2, 3, 4, 5, 6]); // 7
    checkSection(1, []); // 8

    // Changing section of symbol
    state.compile(`\
.text
start:
end = . - start
.data`);
    state.compile('.data', { range: state.line(1), haltOnError: true });
}

if(require.main === module)
{
    exports.run().then(x => process.exit(0)).catch(x => { console.error(x); process.exit(1) });
}