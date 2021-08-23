export const relocTypes = {
    R_X86_64_NONE      : 0,
    R_X86_64_64        : 1,
    R_X86_64_PC32      : 2,
    R_X86_64_GOT32     : 3,
    R_X86_64_PLT32     : 4,
    R_X86_64_COPY      : 5,
    R_X86_64_GLOB_DAT  : 6,
    R_X86_64_JUMP_SLOT : 7,
    R_X86_64_RELATIVE  : 8,
    R_X86_64_GOTPCREL  : 9,
    R_X86_64_32        : 10,
    R_X86_64_32S       : 11,
    R_X86_64_16        : 12,
    R_X86_64_PC16      : 13,
    R_X86_64_8         : 14,
    R_X86_64_PC8       : 15,
    R_X86_64_PC64      : 24,
    R_X86_64_GOTOFF64  : 25,
    R_X86_64_GOTPC32   : 26,
    R_X86_64_SIZE32    : 32,
    R_X86_64_SIZE64    : 33
};

export class RelocEntry
{
    constructor(offset, addend, symbol, type)
    {
        this.offset = offset;
        this.addend = addend;
        this.symbol = symbol;
        this.type = type;
    }
}