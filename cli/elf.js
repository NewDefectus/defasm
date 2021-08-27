/**
 * @param {T} fields 
 * @template T 
 */
function header(fields)
{
    let length = 0;
    for(const pairs of Object.values(fields))
        length = Math.max(length, pairs[0] + pairs[1]);

    const result = class
    {
        #fields;
        /** @param {T} config */
        constructor(config)
        {
            for(const name of Object.keys(fields))
                this[name] = config[name] ?? 0;
            this.#fields = fields;
        }

        dump()
        {
            const data = Buffer.alloc(result.size);
            for(const name of Object.keys(this.#fields))
            {
                const [offset, size] = fields[name], number = this[name];
                switch(size)
                {
                    case 1: data.writeInt8(number, offset); break;
                    case 2: data.writeInt16LE(number, offset); break;
                    case 4: data.writeInt32LE(number, offset); break;
                    case 8: data.writeBigInt64LE(BigInt(number), offset); break;
                }
            }
            return data;
        }

        static size = length;
    };
    return result;
}

export const ELFHeader = header({
    /** 0x7F followed by ELF(45 4c 46) in ASCII; these four bytes constitute the magic number. */
    EI_MAG:        [0x00, 4],
    /** This byte is set to either 1 or 2 to signify 32- or 64-bit format, respectively. */
    EI_CLASS:      [0x04, 1],
    /** This byte is set to either 1 or 2 to signify little or big endianness, respectively. This affects interpretation of multi-byte fields starting with offset 0x10. */
    EI_DATA:       [0x05, 1],
    /** Set to 1 for the original and current version of ELF. */
    EI_VERSION:    [0x06, 1],
    /** Identifies the target operating system ABI. It is often set to 0 regardless of the target platform. */
    EI_OSABI:      [0x07, 1],
    /** Further specifies the ABI version. Its interpretation depends on the target ABI. Linux kernel (after at least 2.6) has no definition of it, so it is ignored for statically-linked executables. */
    EI_ABIVERSION: [0x08, 1],
    /** currently unused, should be filled with zeros. */
    EI_PAD:        [0x09, 7],
    /** Identifies object file type. */
    e_type:        [0x10, 2],
    /** Specifies target instruction set architecture. */
    e_machine:     [0x12, 2],
    /** Set to 1 for the original version of ELF. */
    e_version:     [0x14, 4],
    /** This is the memory address of the entry point from where the process starts executing. */
    e_entry:       [0x18, 8],
    /** Points to the start of the program header table. */
    e_phoff:       [0x20, 8],
    /** Points to the start of the section header table. */
    e_shoff:       [0x28, 8],
    /** Interpretation of this field depends on the target architecture. */
    e_flags:       [0x30, 4],
    /** Contains the size of this header. */
    e_ehsize:      [0x34, 2],
    /** Contains the size of a program header table entry. */
    e_phentsize:   [0x36, 2],
    /** Contains the number of entries in the program header table. */
    e_phnum:       [0x38, 2],
    /** Contains the size of a section header table entry. */
    e_shentsize:   [0x3A, 2],
    /** Contains the number of entries in the section header table. */
    e_shnum:       [0x3C, 2],
    /** Contains index of the section header table entry that contains the section names. */
    e_shstrndx:    [0x3E, 2]
});

export const SectionHeader = header({
    /** An offset to a string in the .shstrtab section that represents the name of this section. */
    sh_name:      [0x00, 4],
    /** Identifies the type of this header. */
    sh_type:      [0x04, 4],
    /** Identifies the attributes of the section. */
    sh_flags:     [0x08, 8],
    /** Virtual address of the section in memory, for sections that are loaded. */
    sh_addr:      [0x10, 8],
    /** Offset of the section in the file image. */
    sh_offset:    [0x18, 8],
    /** Size in bytes of the section in the file image. May be 0. */
    sh_size:      [0x20, 8],
    /** Contains the section index of an associated section. This field is used for several purposes, depending on the type of section. */
    sh_link:      [0x28, 4],
    /** Contains extra information about the section. This field is used for several purposes, depending on the type of section. */
    sh_info:      [0x2C, 4],
    /** Contains the required alignment of the section. This field must be a power of two. */
    sh_addralign: [0x30, 8],
    /** Contains the size, in bytes, of each entry, for sections that contain fixed-size entries. Otherwise, this field contains zero. */
    sh_entsize:   [0x38, 8],
});

export class ELFSection
{
    /**
     * @param {Object} config
     * @param {string} config.name
     * @param {StringTable} config.shstrtab
     * @param {number} config.type
     * @param {Buffer} config.buffer
     * @param {number} config.flags
     * @param {number} config.address
     * @param {number} config.entrySize
     * @param {import('@defasm/core/sections.js').Section} config.section */
    constructor({ type = 0, buffer = Buffer.alloc(0), flags = 0, address = 0, entrySize = 0, link = 0, info = 0, align = 1, section = null } = {})
    {
        this.buffer = buffer;
        this.header = new SectionHeader({
            sh_type: type,
            sh_flags: flags,
            sh_addr: address,
            sh_addralign: align,
            sh_size: buffer.length,
            sh_link: link,
            sh_entsize: entrySize,
            sh_info: info,
        });
        this.section = section;
    }

    add(buffer)
    {
        this.buffer = Buffer.concat([this.buffer, buffer]);
        this.header.sh_size = this.buffer.length;
    }

    /**
     * @param {string} name
     * @param {StringTable} shstrtab
     */
    name(name, shstrtab)
    {
        this.header.sh_name = shstrtab.getIndex(name);
    }
}

export class StringTable extends ELFSection
{
    constructor(config)
    {
        super({ ...config, type: 0x3, buffer: Buffer.alloc(1) });
        this.indices = { "": 0 };
    }

    getIndex(string)
    {
        if(!this.indices.hasOwnProperty(string)) 
        {
            this.indices[string] = this.buffer.length;
            this.add(Buffer.from(string + '\0'));
        }
        return this.indices[string];
    }
}

export class SymbolTable extends ELFSection
{
    /**
     * @param {import("@defasm/core/symbols").SymbolRecord[]} symbols
     * @param {StringTable} strtab */
    constructor(config, symbols, strtab)
    {
        super({ ...config, type: 0x2, entrySize: 0x18, buffer: Buffer.alloc(0x18 * (symbols.length + 1)), info: 1, align: 8 });
        this.symbolCount = 1;
        this.strtab = strtab;
        for(let index = 0x18; this.symbolCount <= symbols.length; index += 0x18)
            this.writeSymbol(symbols[this.symbolCount - 1], this.buffer.subarray(index));
    }

    writeSymbol(symbol, buffer)
    {
        symbol.index = this.symbolCount;

        buffer.writeUInt32LE(this.strtab.getIndex(symbol.name), 0x0);
        buffer.writeUInt8((symbol.type ?? 0) | (symbol.bind ?? 0) << 4, 0x4);
        buffer.writeUInt8(symbol.visibility ?? 0, 0x5);
        buffer.writeUInt16LE(symbol.value.section.index, 0x6);
        buffer.writeBigUInt64LE(symbol.value.addend, 0x8);
        buffer.writeBigUInt64LE(BigInt(symbol.size ?? 0), 0x10);

        if(symbol.bind == 0)
            this.header.sh_info = this.symbolCount + 1;
        
        this.symbolCount++;
    }

    addSymbol(symbol)
    {
        const buffer = Buffer.alloc(0x18);
        this.writeSymbol(symbol, buffer);
        this.add(buffer);
    }
}

export class RelocationSection extends ELFSection
{
    /**
     * @param {import('@defasm/core/relocations').RelocEntry[]} relocations
     * @param {SymbolTable} symtab */
    constructor(config, relocations, symtab)
    {
        super({ ...config, type: 0x4, entrySize: 0x18, buffer: Buffer.alloc(0x18 * relocations.length) });
        let index = 0;
        for(const reloc of relocations)
        {
            if(reloc.symbol.index === undefined)
                symtab.addSymbol(reloc.symbol);
            this.buffer.writeBigUInt64LE(BigInt(reloc.offset), index);
            this.buffer.writeBigUInt64LE(BigInt(reloc.type) | BigInt(reloc.symbol.index) << 32n, index + 0x8);
            this.buffer.writeBigInt64LE(BigInt(reloc.addend), index + 0x10);

            index += 0x18;
        }
    }
}