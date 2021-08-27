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
    ABS: { name: '*ABS*', index: 0xfff1 },
    UND: { name: '*UND*', index: 0 }
};

export const sectionFlags = {
    a: 2,          // SHF_ALLOC
    e: 0x8000000, // SHF_EXCLUDE
    o: 0x40,      // SHF_INFO_LINK
    w: 1,         // SHF_WRITE
    x: 4,         // SHF_EXECINSTR
    M: 0x10,      // SHF_MERGE
    S: 0x20,      // SHF_STRINGS
    G: 0x200,     // SHF_GROUP
    T: 0x400,     // SHF_TLS
};

export const sectionTypes = {
    'progbits': 0x1,
    'nobits': 0x8,
    'note': 0x7,
    'init_array': 0xE,
    'fini_array': 0xF,
    'preinit_array': 0x10
}

export const STT_SECTION = 3, STT_FILE = 4;

export class Section
{
    /** @param {string} name */
    constructor(name)
    {
        this.name = name;

        /** @type {import('./statement.js').InstructionRange} */
        this.cursor = null;

        this.persistent = name == '.text' || name == '.data' || name == '.bss';

        this.head = new StatementNode(new Symbol({ addr: 0, name, isLabel: true, type: STT_SECTION, section: this }));
        this.entryPoints = [];

        this.cursor = { head: this.head, prev: this.head };

        switch(name)
        {
            case '.text': this.flags = sectionFlags.a | sectionFlags.x; break;
            case '.rodata': this.flags = sectionFlags.a; break;
            case '.data':
            case '.bss' :
                this.flags = sectionFlags.a | sectionFlags.w; break;
            default: this.flags = 0;
        }

        switch(name)
        {
            case '.notes': this.type = sectionTypes.note; break;
            case '.bss'  : this.type = sectionTypes.nobits; break;
            default: this.type = sectionTypes.progbits;
        }
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