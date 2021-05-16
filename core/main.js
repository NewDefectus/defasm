#!/usr/bin/env node

import fs from "fs";
import child_process from "child_process";
import { compileAsm, baseAddr } from "./compiler.js";


let args = process.argv.slice(2);
let code = undefined;
let sizeOutFD = null;
let execute = false;
let outputFile = null, inputFile = null;
let coreDumpLocation = undefined;
let runtimeArgs = [];

if(args[0] === '-h' || args[0] === '--help')
{
    console.log(
`Usage:
defasm [file] [--output outfile] [--size-out=fd] [--run [--core-path path] [-- args]]
    --output        The path to the output file (defaults to 'a' in current
                    directory, or /tmp/asm if --run is provided).
    --size-out      A file descriptor to write the number (in ASCII) of bytes
                    generated by the assembler.
    --run           If given, the program will assemble the code, then
                    immediately execute it.
    --core-path     The path to the core dump file. If given, the assembler
                    will analyze the core dump and attempt to find the line
                    on which the program halted.
    --              The rest of the parameters are sent to the generated
                    program as runtime arguments.`
    );
    process.exit(0);
}

try
{
    while(args.length > 0)
    {
        let arg = args.shift();
        if(arg[0] !== '-')
        {
            inputFile = arg;
            continue;
        }

        if(arg.startsWith('--size-out='))
        {
            sizeOutFD = parseInt(arg.slice('--size-out='.length));
            if(isNaN(sizeOutFD)) throw "--size-out expects a file descriptor";
        }
        else if(arg === '-r' || arg === '--run') execute = true;
        else if(arg === '-o' || arg === '--output')
        {
            outputFile = args.shift();
            if(outputFile === undefined) throw "No output file given";
        }
        else if(arg === '--core-path')
        {
            coreDumpLocation = args.shift();
            if(coreDumpLocation === undefined) throw "No core dump path given";
        }
        else if(arg === '-' || arg === '--')
        {
            if(!execute) throw "Can't provide runtime args without running";
            runtimeArgs = args;
            args = [];
        }
        else
        {
            throw "Unknown flag " + arg;
        }
    }

    if(!execute && coreDumpLocation !== undefined) throw "Can't use core dump without running";
    if(outputFile === null) outputFile = execute ? '/tmp/asm' : 'a';

    if(inputFile === null)
    {
        code = "";
        process.stdin.on("data", x => code += x.toString());
        process.stdin.on("end", assemble);
    }
    else
    {
        try { code = fs.readFileSync(inputFile).toString(); }
        catch(e) { throw "Couldn't read file " + inputFile; }
        assemble();
    }
}
catch(e)
{
    console.error(e);
    process.exit(1);
}

function writeSize(size)
{
    if(sizeOutFD !== null)
    {
        fs.write(sizeOutFD, size + '\n', err => err && console.warn("Failed writing to size-out"));
        fs.close(sizeOutFD, err => err && console.warn("Failed closing size-out"));
    }
}

function assemble()
{
    // Ensure the output path is correct
    if(outputFile[0] !== '/' && outputFile[0] !== '.')
    {
        outputFile = './' + outputFile;
    }

    let instrLines, bytes = 0;

    try
    {
        let results = compileAsm(code, [], { haltOnError: true });
        bytes = results.bytes;
        writeSize(bytes);
        instrLines = results.instructions;
    }
    catch(e)
    {
        writeSize(0);
        console.error(e);
        process.exit(1);
    }
    let outputStream = fs.createWriteStream(outputFile, {mode: 0o0755});


    // Construct the ELF header
    let elfHeader = Buffer.from([
        127,69, 76, 70, 2,  1,  1,  0,        0,  0,  0,  0,  0,  0,  0,  0,
        2,  0,  62, 0,  1,  0,  0,  0,        0,  0,  0,  0,  0,  0,  0,  0,
        64, 0,  0,  0,  0,  0,  0,  0,        0,  0,  0,  0,  0,  0,  0,  0,
        0,  0,  0,  0,  64, 0, 56,  0,        1,  0,  0,  0,  0,  0,  0,  0,
        1,  0,  0,  0,  7,  0,  0,  0,        0,  0,  0,  0,  0,  0,  0,  0,
        0,  0,  0,  0,  0,  0,  0,  0,        0,  0,  0,  0,  0,  0,  0,  0,
        0,  0,  0,  0,  0,  0,  0,  0,        0,  0,  0,  0,  0,  0,  0,  0,
        0,  16, 0,  0,  0,  0,  0,  0
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
        if(!execute) process.exit();
        let proc = child_process.execFile(outputFile, runtimeArgs);
        process.stdin.pipe(proc.stdin);
        proc.stderr.pipe(process.stderr);
        proc.stdout.pipe(process.stdout);

        proc.on('close', (code, signal) => {
            if(!signal)
                process.exit(code);
            
            let errLine = null;
            let pos = "on";

            try
            {
                let data = fs.readFileSync(coreDumpLocation);
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
}