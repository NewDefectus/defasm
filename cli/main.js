#!/usr/bin/env node

import fs from "fs";
import child_process from "child_process";
import { fileURLToPath } from "url";

import { AssemblyState } from "@defasm/core";
import { ELFHeader, ELFSection, RelocationSection, SectionHeader, StringTable, SymbolTable } from "./elf.js";
import { pseudoSections, STT_FILE, STT_SECTION } from "@defasm/core/sections.js";


let args = process.argv.slice(2);
let code = undefined;
let sizeOutFD = null;
let execute = false;
let outputFile = null, inputFile = null;
let runtimeArgs = [];
let assemblyConfig = {};

if(args[0] === '-h' || args[0] === '--help')
{
    console.log(
`Usage: defasm [file] [--intel] [--output outfile] [--size-out=fd] [--run [arguments...]]
    --intel         Use Intel syntax when assembling (defaults to AT&T)
    --output        The path to the output file (defaults to 'a.out' in current
                    directory, or /tmp/asm.out if --run is provided).
    --size-out      A file descriptor to write the number (in ASCII) of bytes
                    generated by the assembler to.
    --run           If given, the program will assemble the code, then
                    immediately execute it. All parameters following this flag
                    are sent to the program as runtime arguments.`
    );
    process.exit();
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
            if(isNaN(sizeOutFD))
                throw "--size-out expects a file descriptor";
        }
        else switch(arg)
        {
            case '-r':
            case '--run':
                execute = true;
                runtimeArgs = args;
                args = [];
                break;

            case '-o':
            case '--output':
                
                outputFile = args.shift();
                if(outputFile === undefined)
                    throw "No output file given";
                break;

            case '-i':
            case '--intel':
                assemblyConfig.intel = true;
                break;
            
            default:
                throw "Unknown flag " + arg;
        }
    }

    if(outputFile === null)
        outputFile = execute ? '/tmp/asm.out' : 'a.out';

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
    if(outputFile[0] != '/' && outputFile[0] != '.')
    {
        outputFile = './' + outputFile;
    }

    let state = new AssemblyState(assemblyConfig);

    try
    {
        state.compile(code, { haltOnError: true });
        writeSize(state.data.length);
    }
    catch(e)
    {
        writeSize(0);
        console.error(e);
        process.exit();
    }
    let outputStream = fs.createWriteStream(outputFile, { mode: 0o0755 });

    let shstrtab = new StringTable();
    let sections = [], asmSections = Object.values(state.sections);
    for(const section of asmSections)
    {
        section.index = sections.length + 1;
        sections.push(new ELFSection({
            type: section.type,
            buffer: section.head.dump(),
            flags: section.flags,
            section
        }));
    }

    /** @type {import("@defasm/core/symbols").SymbolRecord[]} */
    let recordedSymbols = [], symtab = null;
    for(const fileSymbol of state.fileSymbols)
    {
        recordedSymbols.push({
            type: STT_FILE,
            bind: 0,
            name: fileSymbol,
            size: 0,
            visibility: 0,
            value: { section: pseudoSections.ABS, addend: 0n }
        });
    }
    state.symbols.forEach(record => {
        if(record.type != STT_SECTION)
            recordedSymbols.push(record);
    });

    if(recordedSymbols.length > 0)
    {
        const strtab = new StringTable();
        symtab = new SymbolTable({ link: sections.length + 2 }, recordedSymbols, strtab)
        symtab.name('.symtab', shstrtab);
        strtab.name('.strtab', shstrtab);

        sections.push(symtab, strtab);
    }
    sections.push(shstrtab);

    if(symtab)
        for(const section of asmSections)
        {
            const relocs = section.getRelocations();
            if(relocs.length > 0)
            {
                const relocSection = new RelocationSection({ link: sections.indexOf(symtab) + 1, info: section.index }, relocs, symtab);
                relocSection.name('.rela' + section.name, shstrtab);
                sections.push(relocSection);
            }
        }
    shstrtab.name('.shstrtab', shstrtab);


    // Finalizing
    let fileOffset = ELFHeader.size;

    for(const section of sections)
    {
        const align = section.header.sh_addralign;
        if(align)
            fileOffset = Math.ceil(fileOffset / align) * align;
        
        section.header.sh_offset = fileOffset;
        fileOffset += section.buffer.length;
        if(section.section)
            section.name(section.section.name, shstrtab);
    }

    // 8-byte alignment
    let alignedFileOffset = Math.ceil(fileOffset / 8) * 8;

    
    /* Outputting */
    outputStream.write(new ELFHeader({
        EI_MAG: 0x46_4C_45_7F,
        EI_CLASS: 2,
        EI_DATA: 1,
        EI_VERSION: 1,
        EI_OSABI: 0,

        e_type: 1,
        e_machine: 0x3E,
        e_version: 1,
        e_entry: 0,
        e_phoff: 0,
        e_shoff: alignedFileOffset,
        e_flags: 0,
        e_ehsize: ELFHeader.size,
        e_shentsize: SectionHeader.size,
        e_shnum: sections.length + 1,
        e_shstrndx: sections.indexOf(shstrtab) + 1
    }).dump());

    fileOffset = ELFHeader.size;

    for(const section of sections)
    {
        outputStream.write(Buffer.alloc(section.header.sh_offset - fileOffset));
        fileOffset = section.header.sh_offset;
        outputStream.write(section.buffer);
        fileOffset += section.buffer.length;
    }
    
    outputStream.write(Buffer.alloc(alignedFileOffset - fileOffset + SectionHeader.size));
    
    for(const section of sections)
        outputStream.write(section.header.dump());

    outputStream.on('close', () => {
        if(!execute)
            process.exit();
        child_process.execSync(`ld ${outputFile} -o /tmp/asm`);
        const entryAddr = Number(fs.readFileSync('/tmp/asm').readBigUInt64LE(0x18));
        let proc = child_process.execFile(fileURLToPath(new URL('./debug', import.meta.url)), ['/tmp/asm', ...runtimeArgs]);
        process.stdin.pipe(proc.stdin);
        proc.stderr.pipe(process.stderr);
        proc.stdout.pipe(process.stdout);

        proc.on('close', () => {
            let errLine = null;
            let pos = "on";

            const data = JSON.parse(fs.readFileSync('/tmp/asm_trace.json').toString());

            const signal = data['signal'];
            if(signal == '')
                process.exit(data['exitCode']);

            let lastIP = data['rip'] - entryAddr;

            if(lastIP >= 0)
            {
                state.iterate((instr, line) => {
                    if(errLine)
                        return;
                    if(instr.address + instr.length > lastIP)
                        errLine = line;
                });
                if(!errLine)
                {
                    pos = 'after';
                    errLine = (state.source.match(/\n/g) || []).length + 1;
                }
            }

            let regFormat = reg => data[reg].toString(16).toUpperCase().padStart(16, '0');
            console.warn(`Signal: ${signal.toLowerCase()}${
                errLine !== null ? ` ${pos} line ${errLine}` : ''
            } ${
                data['rip'] !== undefined ? `(%rip was ${regFormat('rip')})` : ''
            }`);
            
            console.warn("Registers:");
            let regTab = reg => `%${reg.padEnd(4, ' ')}= ${regFormat(reg)}`;
            for(let regNames of "rax r8|rbx r9|rcx r10|rdx r11|rsi r12|rdi r13|rsp r14|rbp r15".split('|'))
            {
                let [reg1, reg2] = regNames.split(' ');
                console.warn('    ' + regTab(reg1) + '        ' + regTab(reg2));
            }
            
            let flag = i => data['eflags'] & 1 << i ? 1 : 0;
            let tmp;
            let flagTab = (name, id, length, options = []) =>
                ('    ' + name.padEnd(length, ' ') + ' = ' + (tmp = flag(id)) +
                ' (' + options[tmp] + ')').padEnd(31, ' ');
            let twoFlagTab = (name1, id1, options1, name2, id2, options2) =>
                console.warn(flagTab(name1, id1, 9, options1) + (name2 ? flagTab(name2, id2, 6, options2) : ''));

            console.warn(`Flags (${regFormat('eflags')}):`);
            
            twoFlagTab('Carry', 0, ['no carry', 'carry'], 'Zero', 6, ["isn't zero", 'is zero']);
            twoFlagTab('Overflow', 11, ['no overflow', 'overflow'], 'Sign', 7, ['positive', 'negative']);
            twoFlagTab('Direction', 10, ['up', 'down'], 'Parity', 2, ['odd', 'even']);
            twoFlagTab('Adjust', 4, ['no aux carry', 'aux carry']);

            process.exit();
        });
    });

    outputStream.close();
}