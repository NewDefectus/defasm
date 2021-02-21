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
    machineCode[machineCodeIndex] = c;
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
        c >>= 8;
    }
}




// Compile Assembly from source code into machine code
function compileAsm(source)
{
    resetMachineCode();

    // First, we'll split the source code into instructions
    for(let c of source)
    {
        genInteger(c.charCodeAt(), 2);
    }
}