import { Expression, LabelExpression } from "./shuntingYard.js";
import { ASMError, next } from "./parser.js";
import { Statement } from "./statement.js";

export var recompQueue = [];

/**
 * @typedef {Object} SymbolRecord
 * @property {Symbol?} symbol The symbol instruction this record belongs to, if it exists
 * @property {Statement[]} references List of instructions that reference this symbol
 * @property {SymbolRecord[]} uses List of records of symbols used in this symbol's definition
 */

/** @type {Map<string, SymbolRecord>} */
export var symbols = null;

export function loadSymbols(table)
{
    symbols = table;
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
    constructor(addr, name, range, opcodeRange, isLabel = false)
    {
        super(addr, 0, range);
        this.name = name;
        let uses = [];
        try
        {
            this.expression = isLabel ? LabelExpression(this) : (next(), new Expression(this, 0, false, uses));
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
            symbols.set(name, this.record = {
                symbol: null,
                references: [],
                uses
            });

        try
        {
            this.value = this.expression.evaluate(this.address, false, this.record);
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

        let originValue = this.error ? null : this.value;
        this.error = null;

        try
        {
            this.value = this.expression.evaluate(this.address, true, this.record);
        }
        catch(e)
        {
            this.error = e;
        }

        if(originValue !== (this.error ? null : this.value))
        {
            this.record.symbol = this;
            for(let ref of this.record.references)
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
            }
            else
                symbols.delete(this.name);
        }
        super.remove();
    }
}