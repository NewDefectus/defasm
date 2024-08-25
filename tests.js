"use strict";
// Run the test suite

const { readdirSync } = require('fs');
const testPath = __dirname + '/t/';

let exitCode = 0;

(async () => {
    let files = readdirSync(testPath);
    let padding = Math.max(...files.map(x => x.length)) + "Running ... ".length;
    for(let file of files)
    {
        process.stdout.write(`Running ${file}...`.padEnd(padding));

        try
        {
            const { run, linuxOnly } = await import('file://' + testPath + file);
            if(linuxOnly && process.platform != 'linux')
            {
                console.log("Skipped (Linux only)");
                continue;
            }
            await run();
            console.log("OK");
        }
        catch(e)
        {
            if(e.range)
                e = e.message;

            console.error("Failed: " + e);
            exitCode = 1;
        }
    }
    process.exit(exitCode);
})();