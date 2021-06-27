import { baseAddr } from "./compiler";
import { setSyntax } from "./parser";

export class Statement
{
    /**
     * @param {Statement} prev
     * @param {Number} maxSize */
    constructor(prev, maxSize, error = null)
    {
        this.error = error;

        /** @type {Number} */
        this.length = 0;

        /** @type {Uint8Array} */
        this.bytes = new Uint8Array(maxSize);

        /** @type {Statement?} */
        this.next = null;

        if(prev)
        {
            prev.next = this;
            this.syntax = prev.syntax;

            /** @type {Number} */
            this.address = prev.address + prev.length;
        }
        else
        {
            this.syntax = { intel: false, prefix: true };
            this.address = baseAddr;
        }

        setSyntax(this.syntax);
    }
}