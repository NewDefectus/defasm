/**
 * Infer the size (in bits - 8, 16, 32, etc.) of a BigInt number
 * @param {BigInt} value the value to check
 * @param {boolean} signed if true, assumes two's-complement represents negative numbers
 * @returns the bits in the minimum number of bytes needed to represent the number
 */
export function inferSize(value, signed = true)
{
    if(signed)
    {
        if(value < 0n) // Correct for negative values
            value = ~value;

        return value < 0x80n ? 8 :
                value < 0x8000n ? 16 :
                value < 0x80000000n ? 32 : 64;
    }
    else
    {
        if(value < 0n) // Technically this doesn't make sense, but we'll allow it
            value = -2n * value - 1n;

        return value < 0x100n ? 8 :
                value < 0x10000n ? 16 :
                value < 0x100000000n ? 32 : 64;
    }
}