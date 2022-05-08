#!/usr/bin/env node
"use strict";
// Section editing

exports.run = async function()
{
    const { AssemblyState } = await import("@defasm/core");
    let state = new AssemblyState();

    // Basic section data division check
    state.compile(`\
.text
.byte 1
.data
.byte 2
`);
    if(state.sections[0].head.dump()[0] != 1)
        throw '.text did not get 1';
    if(state.sections[1].head.dump()[0] != 2)
        throw '.data did not get 2';
    
    // Changing section ranges
    state.compile('.data', { range: state.line(1) });

    if(state.sections[0].head.dump().length != 0)
        throw '.text did not get emptied';

    if(!state.sections[1].head.dump().equals(Buffer.from([1, 2])))
        throw '.data did not get 1, 2';

    
    
}

if(require.main === module)
{
    exports.run().then(x => process.exit(0)).catch(x => { console.error(x); process.exit(1) });
}