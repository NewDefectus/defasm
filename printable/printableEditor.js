var editor = CodeMirror(document.getElementById("inputAreaContainer"), {
    "theme": "editor",
    "mode": "gas",
    "lineNumbers": true
});
var asmTextOutput = document.getElementById("outputArea");
var decoder = new TextDecoder();

var printableOutputArea = document.getElementById("printableCodeOutput");

var uniSeq = new Uint8Array(8), uniDepth = 0, expectedDepth = 0;
var hexOutput = "", printableOutput = "", tempHexOutput = "";

// Input receiving
editor.on("change", function()
{
    let instructions = compileAsm(editor.getValue()), thisDepth = 0, printGoodLater = false, printBadLater = false;
    printableOutput = tempHexOutput = hexOutput = ""; uniDepth = expectedDepth = 0;
    
    for(let instr of instructions)
    {
        if(instr === "")
            tempHexOutput += '\n';
        else for(i = 0; i < instr.length; i++)
        {
            printGoodLater = printBadLater = false;
            byte = instr.bytes[i]; thisDepth = getByteDepth(byte);
            if(thisDepth == 0)
            {
                if(expectedDepth > 0) dumpBadSeq();
                printGoodLater = true;
            }
            else
            {
                if(expectedDepth == 0)
                {
                    if(thisDepth == 1)
                    {
                        uniSeq[0] = byte;
                        printBadLater = true;
                    }
                    else expectedDepth = thisDepth, uniDepth = 1, uniSeq[0] = byte;
                }
                else
                {
                    uniSeq[uniDepth++] = byte;
                    if(thisDepth != 1) printBadLater = true;
                    else
                    {
                        if(expectedDepth === uniDepth) printGoodLater = true;
                    }
                }
            }

            tempHexOutput += byte.toString(16).toUpperCase().padStart(2, '0') + ' ';
            if(printGoodLater) dumpUniSeq(byte);
            else if(printBadLater) dumpBadSeq(byte);
        }
    }
    if(expectedDepth) dumpBadSeq();
    asmTextOutput.innerHTML = hexOutput;
    printableOutputArea.innerHTML = '"' + printableOutput + '"'
})

function getByteDepth(x)
{
    let i = 8;
    while(i--)
    {
        if((x & (1 << i)) == 0)
            return 7 - i;
    }
    return 8;
}

function dumpUniSeq(byte)
{
    if(uniDepth == 0)
    {
        hexOutput += tempHexOutput;
        printableOutput += String.fromCharCode(byte);
    }
    else
    {
        hexOutput += '<span class="codeChar">' + tempHexOutput + '</span>';
        printableOutput += '<span class="codeChar">' + decoder.decode(uniSeq.slice(0, uniDepth)) + '</span>';
    }
    tempHexOutput = "";
    expectedDepth = uniDepth = 0;
}

function dumpBadSeq(byte)
{
    hexOutput += '<span class="codeBad">' + tempHexOutput + '</span>';
    printableOutput += '<span class="codeBad">' + escapeUniSeq(uniSeq.slice(0, uniDepth || 1)) + '</span>';
    tempHexOutput = "";
    expectedDepth = uniDepth = 0;
}


function escapeUniSeq(seq)
{
    let result = "";
    for(let i = 0; i < seq.length; i++)
    {
        result += '\\' + seq[i].toString(8).padStart(3, '0');
    }
    return result;
}