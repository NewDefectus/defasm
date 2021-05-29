import { Expression, LabelExpression } from "./shuntingYard.js";
import { Instruction } from "./instructions.js";

export var recompQueue = [];

/**
 * @typedef {Object} SymbolRecord
 * @property {?Symbol} symbol The symbol instruction this record belongs to, if it exists
 * @property {Instruction[]} references List of instructions that reference this symbol
 */

/** @type {Map<string, SymbolRecord>} */
export var symbols = new Map();

/**
 * @param {number} address 
 * @param {string} name 
 * @param {Expression} expression 
 */
export function Symbol(address, name, isLabel = false)
{
    this.address = address;
    this.name = name;
    try
    {
        this.expression = isLabel ? LabelExpression(this) : new Expression(this);
        this.length = 0;
        this.bytes = new Uint8Array();
        this.value = this.expression.evaluate(address);
    }
    catch(e)
    {
        this.removed = true;
        throw e;
    }

    if(symbols.has(name))
    {
        let record = symbols.get(name);
        record.symbol = this;
        for(let ref of record.references)
        {
            if(!ref.removed)
            {
                recompQueue.push(ref);
                ref.wantsRecomp = true;
            }
        }
    }
    else
        symbols.set(name, {
            symbol: this,
            references: []
        });
}

Symbol.prototype.recompile = function()
{
    let originValue = this.error ? null : this.value;
    this.error = null;
    this.value = this.expression.evaluate(this.address, true);
    if(originValue !== this.value)
        for(let ref of symbols.get(this.name).references)
        {
            recompQueue.push(ref);
            ref.wantsRecomp = true;
        }
}