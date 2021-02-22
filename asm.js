var machineCode, machineCodeIndex;

const MC_BUFFER_SIZE = 32;

function resetMachineCode()
{
    machineCode = new Uint8Array(MC_BUFFER_SIZE);
    machineCodeIndex = 0;
}

// Generate a single byte of machine code
function genByte(c)
{
    machineCode[machineCodeIndex] = parseInt(c & 0xffn);
    machineCodeIndex++;

    // Resize the buffer if necessary
    if(machineCodeIndex >= machineCode.length)
    {
        let temp = new Uint8Array(machineCode.length + MC_BUFFER_SIZE);
        temp.set(machineCode);
        machineCode = temp;
    }
}

// Generate an integer constant into machine code
function genInteger(c, byteSize)
{
    while(byteSize--)
    {
        genByte(c);
        c >>= 8n;
    }
}