import { Range } from "./parser.js";
import { RelocEntry } from "./relocations.js";
import { StatementNode } from "./statement.js";
import { Symbol } from "./symbols.js";

/** @type {Object.<string, Section>} */
export var sections = null;

/**
 * @param {Object.<string, Section>} table
 * @param {Range} range */
export function loadSections(table, range)
{
    sections = table;
    for(const name of Object.keys(table))
        table[name].cursor = table[name].head.getAffectedArea(range);
}

export const pseudoSections = {
    ABS: { name: '*ABS*' },
    UND: { name: '*UND*' }
};

export const sectionFlags = {
    a: 2, // SHF_ALLOC
    w: 1, // SHF_WRITE
    x: 4, // SHF_EXECINSTR
};

export class Section
{
    /**
     * @param {string} name
     * @param {string[]?} flags
     * @param {boolean?} progbits */
    constructor(name, flags = null, progbits = null)
    {
        this.name = name;
        this.progbits = progbits ?? (name == '.text' || name == '.data');

        /** @type {import('./statement.js').InstructionRange} */
        this.cursor = null;

        this.head = new StatementNode(new Symbol({ addr: 0, name, isLabel: true, section: this }));
        this.flags = 0;
        if(flags === null)
            switch(name)
            {
                case '.text': this.flags = sectionFlags.a | sectionFlags.x; break;
                case '.data':
                case '.bss' : this.flags = sectionFlags.a | sectionFlags.w; break;
            }
        else
            for(const flag of flags)
                this.flags |= sectionFlags[flag];
    }

    getRelocations()
    {
        let node = this.head, relocations = [];
        while(node)
        {
            for(const reloc of node.statement.relocations)
                relocations.push(new RelocEntry({ ...reloc, offset: node.statement.address + reloc.offset }));
            node = node.next;
        }
        return relocations;
    }
}