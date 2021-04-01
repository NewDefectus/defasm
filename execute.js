import fs from "fs";
import child_process from "child_process";
import { compileAsm, instrHead } from "./compiler.js";

let args = process.argv;
if(args.length < 3)
{
    console.error("Not enough arguments");
    process.exit(1);
}

let code = args[2];
let totalBytes;
let outputFileName = "/temp/code.exe";

try
{
    totalBytes = compileAsm(code, true);
}
catch(e)
{
    console.error(e);
    process.exit(1);
}

let outputStream = fs.createWriteStream(outputFileName, {mode: 0o0755});


// Construct the ELF header
outputStream.write(Buffer.from([
    127, 69, 76, 70,  2,  1,  1,  0,  0,  0,  0,  0,  0,  0,  0,  0,
      2,  0, 62,  0,  1,  0,  0,  0,120,128,  4,  8,  0,  0,  0,  0,
     64,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0, 64,  0, 56,  0,  1,  0,  0,  0,  0,  0,  0,  0,
      1,  0,  0,  0,  7,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
      0,128,  4,  8,  0,  0,  0,  0,  0,128,  4,  8,  0,  0,  0,  0
]));

let size = totalBytes + 0x78;
let sizeBuf = Buffer.from([size, size >> 8, size >> 16, size >> 24, 0, 0, 0, 0]);
outputStream.write(sizeBuf); outputStream.write(sizeBuf); // Write the size twice

outputStream.write(Buffer.from([0, 16, 0, 0, 0, 0, 0, 0]))


// Write the code
let instr = instrHead;

while(instr = instr.next)
{
    outputStream.write(instr.bytes.slice(0, instr.length));
}

outputStream.on('finish', () => {
    child_process.execFile(outputFileName, args.slice(3));
});

outputStream.close();