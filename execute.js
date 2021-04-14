import fs from "fs";
import child_process from "child_process";
import { compileAsm } from "./compiler.js";

let args = process.argv;
let printSize = args[2] === "--size";
if(printSize) args.splice(2, 1);
if(args.length < 3)
{
    console.error("Not enough arguments");
    process.exit(1);
}

let code = args[2];
let instrLines, bytes = 0;
let outputFileName = "/tmp/code.exe";

try
{
    let results = compileAsm(code, [], true);
    bytes = results.bytes;
    if(printSize) console.log(bytes.toString());
    instrLines = results.instructions;
}
catch(e)
{
    if(printSize) console.log('0');
    console.error(e);
    process.exit(1);
}

let outputStream = fs.createWriteStream(outputFileName, {mode: 0o0755});


// Construct the ELF header
outputStream.write(Buffer.from([
    127, 69, 76, 70,  2,  1,  1,  0,        0,  0,  0,  0,  0,  0,  0,  0,
      2,  0, 62,  0,  1,  0,  0,  0,      120,128,  4,  8,  0,  0,  0,  0,
     64,  0,  0,  0,  0,  0,  0,  0,        0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0, 64,  0, 56,  0,        1,  0,  0,  0,  0,  0,  0,  0,
      1,  0,  0,  0,  7,  0,  0,  0,        0,  0,  0,  0,  0,  0,  0,  0,
      0,128,  4,  8,  0,  0,  0,  0,        0,128,  4,  8,  0,  0,  0,  0
]));

let size = bytes + 0x78;
let sizeBuf = Buffer.from([size, size >> 8, size >> 16, size >> 24, 0, 0, 0, 0]);
outputStream.write(sizeBuf); outputStream.write(sizeBuf); // Write the size twice

outputStream.write(Buffer.from([0, 16, 0, 0, 0, 0, 0, 0]))


// Write the code
for(let line of instrLines)
{
    for(let instr of line)
        outputStream.write(instr.bytes.slice(0, instr.length));
}

outputStream.on('close', () => {
    let proc = child_process.execFile(outputFileName, args.slice(3));
    proc.stderr.pipe(process.stderr);
    proc.stdout.pipe(process.stdout);

    proc.on('close', (code, signal) => {
        if(signal) process.kill(process.pid, signal);
        process.exit(code);
    });
});

outputStream.close();