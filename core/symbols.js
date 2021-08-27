import { Expression, CurrentIP } from "./shuntingYard.js";
import { ASMError, next } from "./parser.js";
import { Statement } from "./statement.js";
import { pseudoSections } from "./sections.js";

export var recompQueue = [];

/**
 * @typedef {Object} SymbolRecord
 * @property {Symbol?} symbol The symbol instruction this record belongs to, if it exists
 * @property {string} name The symbol's name
 * @property {Statement[]} references List of instructions that reference this symbol
 * @property {Statement[]} definitions List of instructions define or give attributes to this symbol
 * @property {SymbolRecord[]} uses List of records of symbols used in this symbol's definition
 * @property {number?} type The type field of the symbol in the ELF file
 * @property {number?} bind The bind field of the symbol in the ELF file
 * @property {number?} size The size field of the symbol in the ELF file
 * @property {number?} visibility The visibility field of the symbol in the ELF file
 * @property {import('./shuntingYard.js').IdentifierValue} value The symbol's value
 */
 function makeRecord({ name, type = undefined, uses = [], references = [], definitions = [] } = {})
 {
     return {
        symbol: null,
        name,
        references,
        definitions,
        uses,
        value: { addend: 0n, section: pseudoSections.UND },
        type
     };
 }

/** @type {Map<string, SymbolRecord>} */
export var symbols = new Map();
/** @type {string[]} */
export var fileSymbols = [];

export function loadSymbols(table, fileArr)
{
    symbols = table;
    fileSymbols = fileArr;
}

export function queueRecomp(instr)
{
    if(!instr.wantsRecomp)
        recompQueue.push(instr.sectionNode);
    instr.wantsRecomp = true;
}

export class Symbol extends Statement
{
    /** @type {SymbolRecord} */
    record;
    constructor({ name, opcodeRange = null, isLabel = false, type = 0, ...config })
    {
        if(opcodeRange === null)
            opcodeRange = config.range;
        super(config);
        this.name = name;
        let uses = [];
        try
        {
            if(isLabel)
                this.expression = new CurrentIP(this);
            else
            {
                next();
                this.expression = new Expression(this, false, uses);
            }
        }
        catch(e)
        {
            this.removed = true;
            throw e;
        }

        if(symbols.has(name))
        {
            this.record = symbols.get(name);
            if(this.record.symbol)
            {
                this.error = new ASMError(`This ${isLabel ? 'label' : 'symbol'} already exists`, opcodeRange);
                this.duplicate = true;
                this.record.references.push(this);
                return;
            }
            this.record.uses = uses;
            this.duplicate = false;
        }
        else
            symbols.set(name, this.record = makeRecord({ name, type, uses, definitions: [this] }));

        try
        {
            this.record.value = this.expression.evaluate(this, false);
            this.record.symbol = this;
            for(let ref of this.record.references)
                if(!ref.removed)
                    queueRecomp(ref);
        }
        catch(e)
        {
            this.removed = true;
            this.error = e;
        }
    }

    recompile()
    {
        if(this.duplicate && this.record.symbol)
            return;
        this.duplicate = false;

        let originError = this.error;
        let originValue = this.record.value;
        this.error = null;

        let value;
        try
        {
            this.record.value = value = this.expression.evaluate(this, false);
        }
        catch(e)
        {
            this.error = e;
        }

        if(!(originError && this.error) && (originValue.addend !== value.addend || originValue.section !== value.section))
        {
            this.record.symbol = this;
            for(const ref of this.record.references)
                queueRecomp(ref);
        }
    }

    remove()
    {
        if(!this.duplicate)
        {
            if(this.record.references.length > 0)
            {
                this.record.symbol = null;
                this.record.uses = [];
                for(const instr of this.record.references)
                    queueRecomp(instr);
            }
            else
                symbols.delete(this.name);
        }
        super.remove();
    }
}

export function referenceSymbol(instr, name, defining = false)
{
    let record;
    if(symbols.has(name))
    {
        record = symbols.get(name);
        record.references.push(instr);
        if(defining)
            record.definitions.push(instr);
    }
    else
        symbols.set(name, record = makeRecord({ name, references: [instr], definitions: defining ? [instr] : [] }));
    return record;
}