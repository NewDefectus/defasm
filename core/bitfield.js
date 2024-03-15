/**
 * Create a bitfield class with accessible names
 * @param {string[]} fieldNames names of the fields in the bitfield
 * @returns a class
 */
export function createBitfieldClass(fieldNames)
{
    let prototype = {};

    for(let i = 0; i < fieldNames.length; i++)
    {
        let fieldValue = 1 << i;
        Object.defineProperty(prototype, fieldNames[i], {
            get()
            {
                return (this.bits & fieldValue) != 0;
            },
            set(value)
            {
                if(value)
                    this.bits |= fieldValue;
                else
                    this.bits &= ~fieldValue;
                return value;
            }
        })
    };

    prototype.add = function(field) {
        this.bits |= field.bits;
    };

    return class {
        constructor()
        {
            this.bits = 0;
            Object.setPrototypeOf(this, prototype)
        }
    };
}