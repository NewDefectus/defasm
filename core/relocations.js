export class RelocEntry
{
    /**
     * 
     * @param {Object} config
     * @param {number} config.offset
     * @param {number} config.sizeReduction
     * @param {import("./shuntingYard").IdentifierValue} config.value
     * @param {number} config.size
     * @param {boolean} config.signed
     * @param {boolean} config.pcRelative
     * @param {boolean} config.functionAddr
     */
    constructor({ offset, sizeReduction, value, size, signed, pcRelative, functionAddr })
    {
        this.offset = offset;
        value = value.flatten();
        this.addend = value.addend - sizeReduction;
        if(pcRelative)
            this.addend += BigInt(offset);
        this.symbol = value.symbol;
        this.size = size;
        this.signed = signed;
        this.pcRelative = pcRelative;
        this.functionAddr = functionAddr;
    }
}