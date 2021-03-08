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
    let instructions = compileAsm(editor.getValue()), thisDepth = 0, hex;
    printableOutput = tempHexOutput = hexOutput = ""; uniDepth = expectedDepth = 0;
    
    for(let instr of instructions)
    {
        if(instr === "")
            tempHexOutput += '\n';
        else for(i = 0; i < instr.length; i++)
        {
            byte = instr.bytes[i]; thisDepth = getByteDepth(byte);
            hex = byte.toString(16).toUpperCase().padStart(2, '0') + ' ';
            if(thisDepth == 0)
            {
                if(expectedDepth) dumpBadSeq();
                hexOutput += hex + tempHexOutput;
                printableOutput += String.fromCharCode(byte);
                tempHexOutput = "";
                expectedDepth = uniDepth = 0;
            }
            else
            {
                if(expectedDepth == 0)
                {
                    if(thisDepth == 1)
                    {
                        uniSeq[0] = byte;
                        tempHexOutput += hex;
                        dumpBadSeq();
                    }
                    else expectedDepth = thisDepth, uniSeq[uniDepth++] = byte, tempHexOutput += hex;
                }
                else
                {
                    uniSeq[uniDepth++] = byte;
                    if(thisDepth != 1) tempHexOutput += hex, dumpBadSeq();
                    else if(expectedDepth === uniDepth) tempHexOutput += hex, dumpUniSeq();
                }
            }
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

function dumpUniSeq()
{
    hexOutput += '<span class="codeChar">' + tempHexOutput + '</span>';
    printableOutput += '<span class="codeChar">' + decoder.decode(uniSeq.slice(0, uniDepth)) + '</span>';
    tempHexOutput = "";
    expectedDepth = uniDepth = 0;
}

function dumpBadSeq()
{
    hexOutput += '<span class="codeBad">' + tempHexOutput + '</span>';
    printableOutput += '<span class="codeBad">' + escapeUniSeq(uniSeq.slice(0, uniDepth)) + '</span>';
    tempHexOutput = "";
    expectedDepth = uniDepth = 0;
}


function escapeUniSeq(seq)
{
    let result = "";
    for(let i = 0; i < seq.length; i++)
    {
        result += '\\' + seq[i].toString(8);
    }
    return result;
}