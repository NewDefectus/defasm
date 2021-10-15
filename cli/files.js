import { AssemblyState } from "@defasm/core";
import { ELFHeader, ELFSection, ProgramHeader, RelocationSection, SectionHeader, StringTable, SymbolTable } from "./elf.js";
import fs from "fs";
import { pseudoSections, sectionFlags, STT_SECTION } from "@defasm/core/sections.js";

var fd = 0;

function write(buffer, position)
{
    fs.writeSync(fd, buffer, 0, buffer.length, position);
}

/**
 * @param {String} filename
 * @param {AssemblyState} state
 */
export function createObject(filename, state)
{
    fd = fs.openSync(filename, 'w');

    /** @type {import("@defasm/core/symbols").Symbol[]} */
    let recordedSymbols = [];
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
    state.symbols.forEach(symbol => {
        if(symbol.type != STT_SECTION)
            recordedSymbols.push(symbol);
    });

    const strtab = new StringTable();
    let shstrtab = new StringTable(), symtab = new SymbolTable({ linkSection: strtab }, recordedSymbols, strtab);
    let sections = [];
    for(const section of state.sections)
    {
        section.index = sections.length + 1;
        let newSection = new ELFSection({
            type: section.type,
            buffer: section.head.dump(),
            flags: section.flags,
            section,
            entrySize: section.entrySize
        });
        sections.push(newSection);
        const relocs = section.getRelocations();
        if(relocs.length > 0)
        {
            const relocSection = new RelocationSection({ infoSection: newSection, flags: 0x40, align: 8 }, relocs, symtab);
            relocSection.name('.rela' + section.name, shstrtab);
            sections.push(relocSection);
        }
    }

    if(symtab.symbols.length > 0)
    {
        symtab.name('.symtab', shstrtab);
        strtab.name('.strtab', shstrtab);

        sections.push(symtab, strtab);
    }
    sections.push(shstrtab);
    shstrtab.name('.shstrtab', shstrtab);


    // Finalizing
    let fileOffset = ELFHeader.size;

    symtab.symbols.sort((a, b) => (a.bind ?? 0) - (b.bind ?? 0) || (b.type ?? 0) - (a.type ?? 0));

    for(const section of sections)
    {
        section.setIndices(sections);
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
    write(new ELFHeader({
        EI_MAG: 0x46_4C_45_7F,
        EI_CLASS: 2,
        EI_DATA: 1,
        EI_VERSION: 1,
        EI_OSABI: 0,

        e_type: 1, // ET_REL
        e_machine: 0x3E,
        e_version: 1,
        e_shoff: alignedFileOffset,
        e_ehsize: ELFHeader.size,
        e_shentsize: SectionHeader.size,
        e_shnum: sections.length + 1,
        e_shstrndx: sections.indexOf(shstrtab) + 1
    }).dump(), 0);

    // Writing the section buffers
    for(const section of sections)
        write(section.buffer, section.header.sh_offset);
    
    // Writing the headers
    let index = alignedFileOffset + SectionHeader.size;
    for(const section of sections)
    {
        write(section.header.dump(), index);
        index += SectionHeader.size;
    }
    fs.closeSync(fd);
}

/**
 * @param {String} filename
 * @param {AssemblyState} state
 */
export function createExecutable(filename, state)
{
    fd = fs.openSync(filename, 'w', 0o755);

    let entryPoint = 0, entrySection = state.sections.find(section => section.name == '.text');
    let programHeaders = [], fileOffset = Math.ceil(ELFHeader.size / 0x1000) * 0x1000, memoryOffset = 0x400000;
    let sections = [...state.sections];
    /** @type {import("@defasm/core/symbols").Symbol[]} */
    let commonSymbols = [];

    state.symbols.forEach((symbol, name) => {
        if(name == '_start' && symbol.bind == 1)
        {
            entryPoint = Number(symbol.value.absoluteValue());
            entrySection = symbol.value.section;
        }
        if(symbol.value.section == pseudoSections.UND)
            throw `Can't assemble executable: unknown symbol ${symbol.name}`;
        
        if(symbol.value.section == pseudoSections.COM)
            commonSymbols.push(symbol);
    });

    for(const section of sections)
    {
        const data = section.head.dump();
        write(data, fileOffset);
        const header = new ProgramHeader({
            p_type: 1,
            p_flags:
                (section.flags & sectionFlags.a ? 4 : 0) |
                (section.flags & sectionFlags.w ? 2 : 0) |
                (section.flags & sectionFlags.x ? 1 : 0),
            p_offset: fileOffset,
            p_vaddr: memoryOffset,
            p_paddr: memoryOffset,
            p_filesz: data.length,
            p_memsz: data.length
        })
        programHeaders.push(header);
        if(section == entrySection)
            entryPoint += memoryOffset;
        section.programHeader = header;
        header.section = section;

        let length = data.length || 1;
        fileOffset = Math.ceil((fileOffset + length) / 0x1000) * 0x1000;
        memoryOffset = Math.ceil((memoryOffset + length) / 0x1000) * 0x1000;
    }

    const bss = sections.find(section => section.name == '.bss').programHeader;
    if(commonSymbols.length > 0)
    {
        let sectionSize = bss.p_memsz;
        for(const symbol of commonSymbols)
        {
            const alignment = Number(symbol.value.addend) || 1;
            sectionSize = Math.ceil(sectionSize / alignment) * alignment;
            symbol.address = sectionSize;
            sectionSize += Number(symbol.size);
        }
        bss.p_memsz = sectionSize;
    }
    
    write(new ELFHeader({
        EI_MAG: 0x46_4C_45_7F,
        EI_CLASS: 2,
        EI_DATA: 1,
        EI_VERSION: 1,
        EI_OSABI: 0,

        e_type: 2, // ET_EXEC
        e_machine: 0x3E,
        e_version: 1,
        e_entry: entryPoint,
        e_phoff: fileOffset,
        e_ehsize: ELFHeader.size,
        e_phentsize: ProgramHeader.size,
        e_phnum: programHeaders.length
    }).dump(), 0);

    // Writing the program headers
    for(const header of programHeaders)
    {
        write(header.dump(), fileOffset);
        fileOffset += ProgramHeader.size;
    }

    // Applying the relocations
    for(const section of state.sections) for(const reloc of section.getRelocations())
    {
        const offset = section.programHeader.p_vaddr + reloc.offset;
        const buffer = Buffer.alloc(reloc.size / 8);
        let value = reloc.addend + (reloc.symbol.value.section == pseudoSections.COM ? 
                BigInt(reloc.symbol.address + bss.p_vaddr)
            :
                reloc.symbol?.value ?
                    reloc.symbol.value.absoluteValue() + BigInt(reloc.symbol.value.section.programHeader.p_vaddr)
                :
                    0n
        );
        
        if(reloc.pcRelative)
            value -= BigInt(offset);
        let bigInt = reloc.size == 64;
        value = value & (1n << BigInt(reloc.size)) - 1n;
        buffer[`write${bigInt ? 'Big' : ''}${reloc.signed ? '' : 'U'}Int${reloc.size}${reloc.size > 8 ? 'LE' : ''}`](bigInt ? value : Number(value));

        write(buffer, section.programHeader.p_offset + reloc.offset);
    }

    fs.closeSync(fd);
}