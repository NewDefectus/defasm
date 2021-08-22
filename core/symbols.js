import { Expression, LabelExpression } from "./shuntingYard.js";
import { ASMError, next } from "./parser.js";
import { Statement } from "./statement.js";

export var recompQueue = [];

/**
 * @typedef {Object} SymbolRecord
 * @property {Symbol?} symbol The symbol instruction this record belongs to, if it exists
 * @property {Statement[]} references List of instructions that reference this symbol
 * @property {SymbolRecord[]} uses List of records of symbols used in this symbol's definition
 * @property {import('./shuntingYard.js').IdentifierValue} value The symbol's value
 */

/** @type {Map<string, SymbolRecord>} */
export var symbols = new Map();

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
            if(isLabel)
                this.expression = new LabelExpression(this);
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
            symbols.set(name, this.record = {
                symbol: null,
                references: [],
                uses
            });

        try
        {
            this.record.value = this.expression.evaluate(this);
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
            this.record.value = value = this.expression.evaluate(this);
        }
        catch(e)
        {
            this.error = e;
        }

        if(!(originError && this.error) && (originValue.value !== value.value || originValue.section !== value.section))
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
            }
            else
                symbols.delete(this.name);
        }
        super.remove();
    }
}