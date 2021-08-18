
/**
 * @param {T} fields
 * @returns {Buffer & T}
 * @template T */
function header(fields)
{
    let length = 0;
    for(const pairs of Object.values(fields))
        length = Math.max(length, pairs[0] + pairs[1]);

    let data = Buffer.alloc(length);
    for(const name of Object.keys(fields))
    {
        let [offset, size] = fields[name];
        Object.defineProperty(data, name, {
            set: number => {
                switch(size)
                {
                    case 1: data.writeInt8(number, offset); break;
                    case 2: data.writeInt16LE(number, offset); break;
                    case 4: data.writeInt32LE(number, offset); break;
                    case 8: data.writeBigInt64LE(BigInt(number), offset); break;
                }
                return number;
            },
            get: () => {
                switch(size)
                {
                    case 1: return data.readInt8(number, offset);
                    case 2: return data.readInt16LE(number, offset);
                    case 4: return data.readInt32LE(number, offset);
                    case 8: return data.readBigInt64LE(BigInt(number), offset);
                }
            }
        });
    }
    return data;
}

export const ELFHeader = header({
    EI_MAG:        [0x00, 4],
    EI_CLASS:      [0x04, 1],
    EI_DATA:       [0x05, 1],
    EI_VERSION:    [0x06, 1],
    EI_OSABI:      [0x07, 1],
    EI_ABIVERSION: [0x08, 1],
    EI_PAD:        [0x09, 7],
    e_type:        [0x10, 2],
    e_machine:     [0x12, 2],
    e_version:     [0x14, 4],
    e_entry:       [0x18, 8],
    e_phoff:       [0x20, 8],
    e_shoff:       [0x28, 8],
    e_flags:       [0x30, 4],
    e_ehsize:      [0x34, 2],
    e_phentsize:   [0x36, 2],
    e_phnum:       [0x38, 2],
    e_shentsize:   [0x3A, 2],
    e_shnum:       [0x3C, 2],
    e_shstrndx:    [0x3E, 2]
});

export const ProgramHeader = header({
    p_type:   [0x00, 4],
    p_flags:  [0x04, 4],
    p_offset: [0x08, 8],
    p_vaddr:  [0x10, 8],
    p_paddr:  [0x18, 8],
    p_filesz: [0x20, 8],
    p_memsz:  [0x28, 8],
    p_align:  [0x30, 8],
});

export const SectionHeader = header({
    sh_name:      [0x00, 4],
    sh_type:      [0x04, 4],
    sh_flags:     [0x08, 8],
    sh_addr:      [0x10, 8],
    sh_offset:    [0x18, 8],
    sh_size:      [0x20, 8],
    sh_link:      [0x28, 4],
    sh_info:      [0x2C, 4],
    sh_addralign: [0x30, 8],
    sh_entsize:   [0x38, 8],
})