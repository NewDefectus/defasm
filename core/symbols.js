import { Expression, CurrentIP } from "./shuntingYard.js";
import { ASMError, next } from "./parser.js";
import { Statement } from "./statement.js";
import { pseudoSections } from "./sections.js";

export var recompQueue = [];

/**
 * @typedef {Object} Symbol
 * @property {SymbolDefinition?} statement The statement defining this symbol, if it exists
 * @property {string} name The symbol's name
 * @property {Statement[]} references List of instructions that reference this symbol
 * @property {Statement[]} definitions List of instructions define or give attributes to this symbol
 * @property {Symbol[]} uses List of symbols used in this symbol's definition
 * @property {number?} type The type field of the symbol in the ELF file
 * @property {number?} bind The bind field of the symbol in the ELF file
 * @property {number?} size The size field of the symbol in the ELF file
 * @property {number?} visibility The visibility field of the symbol in the ELF file
 * @property {import('./shuntingYard.js').IdentifierValue} value The symbol's value
 */
 function makeSymbol({ name, type = undefined, uses = [], references = [], definitions = [] } = {})
 {
     return {
        statement: null,
        name,
        references,
        definitions,
        uses,
        value: { addend: 0n, section: pseudoSections.UND },
        type
     };
 }

/** @type {Map<string, Symbol>} */
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

export class SymbolDefinition extends Statement
{
    /** @type {Symbol} */
    symbol;
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
            this.symbol = symbols.get(name);
            if(this.symbol.statement)
            {
                this.error = new ASMError(`This ${isLabel ? 'label' : 'symbol'} already exists`, opcodeRange);
                this.duplicate = true;
                this.symbol.references.push(this);
                return;
            }
            this.symbol.uses = uses;
            this.duplicate = false;
        }
        else
            symbols.set(name, this.symbol = makeSymbol({ name, type, uses, definitions: [this] }));

        try
        {
            this.symbol.value = this.expression.evaluate(this, false);
            this.symbol.statement = this;
            for(const ref of this.symbol.references)
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
        if(this.duplicate && this.symbol.statement)
            return;
        this.duplicate = false;

        let originError = this.error;
        let originValue = this.symbol.value;
        this.error = null;

        let value;
        try
        {
            this.symbol.value = value = this.expression.evaluate(this, false);
        }
        catch(e)
        {
            this.error = e;
        }

        if(!(originError && this.error) && (originValue.addend !== value.addend || originValue.section !== value.section))
        {
            this.symbol.statement = this;
            for(const ref of this.symbol.references)
                queueRecomp(ref);
        }
    }

    remove()
    {
        if(!this.duplicate)
        {
            if(this.symbol.references.length > 0)
            {
                this.symbol.statement = null;
                this.symbol.uses = [];
                for(const instr of this.symbol.references)
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
    let symbol;
    if(symbols.has(name))
    {
        symbol = symbols.get(name);
        symbol.references.push(instr);
        if(defining)
            symbol.definitions.push(instr);
    }
    else
        symbols.set(name, symbol = makeSymbol({ name, references: [instr], definitions: defining ? [instr] : [] }));
    return symbol;
}