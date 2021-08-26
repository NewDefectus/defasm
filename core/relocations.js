import { pseudoSections } from "./sections.js";

const relocTypes = {
    NONE      : 0,
    64        : 1,
    PC32      : 2,
    GOT32     : 3,
    PLT32     : 4,
    COPY      : 5,
    GLOB_DAT  : 6,
    JUMP_SLOT : 7,
    RELATIVE  : 8,
    GOTPCREL  : 9,
    32        : 10,
    33        : 11, // 32S
    16        : 12,
    PC16      : 13,
    8         : 14,
    PC8       : 15,
    PC64      : 24,
    GOTOFF64  : 25,
    GOTPC32   : 26,
    SIZE32    : 32,
    SIZE64    : 33
};

export const signed32 = 33;

export class RelocEntry
{
    /**
     * 
     * @param {Object} config
     * @param {number} config.offset
     * @param {number} config.addend
     * @param {import("./symbols").SymbolRecord} config.symbol
     * @param {number} config.size
     * @param {boolean} config.pcRelative
     * @param {boolean} config.functionAddr
     */
    constructor({ offset, addend, symbol, size, pcRelative, functionAddr })
    {
        this.offset = offset;
        this.addend = addend;
        if(symbol.bind || symbol.value.section == pseudoSections.UND)
            this.symbol = symbol;
        else
        {
           this.symbol = symbol.value.section.head.statement.record;
           this.addend += symbol.value.addend;
        }

        this.type = (pcRelative ? functionAddr ? 'PLT' : 'PC' : '') + size;
    }
}