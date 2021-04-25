import fs from "fs";
import child_process from "child_process";
import { compileAsm, baseAddr } from "./compiler.js";

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
let elfHeader = Buffer.from([
    127, 69, 76, 70,  2,  1,  1,  0,        0,  0,  0,  0,  0,  0,  0,  0,
      2,  0, 62,  0,  1,  0,  0,  0,        0,  0,  0,  0,  0,  0,  0,  0,
     64,  0,  0,  0,  0,  0,  0,  0,        0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0, 64,  0, 56,  0,        1,  0,  0,  0,  0,  0,  0,  0,
      1,  0,  0,  0,  7,  0,  0,  0,        0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,        0,  0,  0,  0,  0,  0,  0,  0,
      0,  0,  0,  0,  0,  0,  0,  0,        0,  0,  0,  0,  0,  0,  0,  0,
      0, 16,  0,  0,  0,  0,  0,  0
]);

elfHeader.writeBigUInt64LE(BigInt(baseAddr), 0x18);
elfHeader.writeBigUInt64LE(BigInt(baseAddr - 0x78), 0x50);
elfHeader.writeBigUInt64LE(BigInt(baseAddr - 0x78), 0x58);
let size = BigInt(bytes + 0x78);
elfHeader.writeBigInt64LE(size, 0x60); elfHeader.writeBigInt64LE(size, 0x68); // Write the size twice
outputStream.write(elfHeader);


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
        if(!signal)
            process.exit(code);
        
        let errLine = null;
        let pos = "on";

        try
        {
            let data = fs.readFileSync("/tmp/core");
            let lastIP = null;
            
            let e_phoff = Number(data.readBigInt64LE(0x20));
            let e_phentsize = data.readInt16LE(0x36);

            for(let e_phnum = data.readInt16LE(0x38); e_phnum--; e_phoff += e_phentsize)
            {
                if(data.readInt32LE(e_phoff) != 4) continue;
                
                let p_offset = Number(data.readBigInt64LE(e_phoff + 8));

                lastIP = Number(data.readBigInt64LE(252 + p_offset + Math.ceil(data.readInt32LE(p_offset) / 4) * 4));
                break;
            }

            if(lastIP !== null)
            {
                lastIP -= baseAddr;
                if(lastIP < 0) throw "";

                if(signal == "SIGTRAP") lastIP--; // Weird behavior with breakpoints

                for(errLine = 0; errLine < instrLines.length && lastIP >= 0; errLine++)
                    instrLines[errLine].map(instr => lastIP -= instr.length);
                if(lastIP >= 0) pos = 'after';
            }
        }
        catch(e) {}

        
        signal = ({
            SIGFPE:  'floating point error',
            SIGILL:  'illegal instruction',
            SIGSEGV: 'segmentation violation',
            SIGBUS:  'bus error',
            SIGABRT: 'abort',
            SIGTRAP: 'breakpoint trap',
            SIGEMT:  'emulator trap',
            SIGSYS:  'bad system call'
        })[signal] || signal;
        console.warn(`Signal: ${signal}${errLine === null ? '' : ` ${pos} line ${errLine}`}`);
        


        process.exit();
    });
});

outputStream.close();
