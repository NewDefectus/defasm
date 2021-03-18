var editor = CodeMirror(document.getElementById("inputAreaContainer"), {
    "theme": "editor",
    "mode": "gas",
    "lineNumbers": true
});
var asmTextOutput = document.getElementById("outputArea");

var printableOutputArea = document.getElementById("printableCodeOutput");
var printableOutputContainer = document.getElementById("printableCode");
printableOutputContainer.onclick = function()
{
    window.getSelection().selectAllChildren(printableOutputContainer);
    document.execCommand("copy");
}

var uniSeq = new Uint8Array(8), uniDepth = 0, expectedDepth = 0;
var hexOutput = "", printableOutput = "", tempHexOutput = "";
var justEscaped = false;

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
            if(byte === 0)
            {
                tempHexOutput += hex;
                uniSeq[uniDepth++] = 0;
                dumpBadSeq();
            }
            else if(thisDepth == 0)
            {
                if(expectedDepth) dumpBadSeq();
                hexOutput += tempHexOutput + hex;
                if(justEscaped && byte >= 48 && byte < 56) printableOutput += '""'; // Make sure escape codes don't merge into digits
                if(byte == 13) printableOutput += "\\r";
                else if(byte == 34) printableOutput += "\\\"";
                else if(byte == 92) printableOutput += "\\\\";
                else printableOutput += String.fromCharCode(byte);
                tempHexOutput = "";
                expectedDepth = uniDepth = 0;
                justEscaped = false;
            }
            else
            {
                if(expectedDepth == 0)
                {
                    if(thisDepth == 1)
                    {
                        uniSeq[uniDepth++] = byte;
                        tempHexOutput += hex;
                        dumpBadSeq();
                    }
                    else expectedDepth = thisDepth, uniSeq[uniDepth++] = byte, tempHexOutput += hex;
                }
                else
                {
                    if(thisDepth != 1)
                    {
                        dumpBadSeq();
                        expectedDepth = thisDepth;
                        uniSeq[uniDepth++] = byte;
                        tempHexOutput += hex
                    }
                    else
                    {
                        uniSeq[uniDepth++] = byte;
                        tempHexOutput += hex
                        if(expectedDepth === uniDepth)
                        {
                            dumpUniSeq();
                        }
                    }
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
    try
    {
        printableOutput += '<span class="codeChar">' + decodeURIComponent((' ' + tempHexOutput).slice(0, -1).replace(/\s+/g, '%')) + '</span>';
        hexOutput += '<span class="codeChar">' + tempHexOutput + '</span>';
        tempHexOutput = "";
        expectedDepth = uniDepth = 0;
    }
    catch(e)
    {
        dumpBadSeq();
    }
}

function dumpBadSeq()
{
    hexOutput += '<span class="codeBad">' + tempHexOutput + '</span>';
    printableOutput += '<span class="codeBad">' + escapeUniSeq(uniSeq.slice(0, uniDepth)) + '</span>';
    tempHexOutput = "";
    expectedDepth = uniDepth = 0;
    justEscaped = true;
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