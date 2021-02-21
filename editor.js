var asmTextInput = document.getElementById("inputArea");
var asmTextOutput = document.getElementById("outputArea");

// Set the output
function writeToOutput(bytes)
{
    asmTextOutput.textContent = bytes.slice(0, machineCodeIndex).reduce((a,x) =>
        a + x.toString(16)
        .toUpperCase()
        .padStart(2, '0') + ' '
    , "");
}

// Tabbing and newline editing help
asmTextInput.onkeydown = function(event)
{
    if(event.keyCode == 9) // Tab
    {
        event.preventDefault();
        if(this.selectionStart == this.selectionEnd)
        {
            document.execCommand("insertText", false, "\t");
        }
    }
    else if(event.keyCode == 13) // Newline
    {
        event.preventDefault();
        let prevLineStart = this.value.lastIndexOf("\n", this.selectionStart) + 1;
        let prevLine = this.value.slice(prevLineStart, this.selectionStart);
        prevLine = prevLine.split(/\S/, 1)[0]; // Get only the whitespaces at the start
        document.execCommand("insertText", false, "\n" + prevLine)
    }
}

// Input receiving
asmTextInput.oninput = function(event)
{
    compileAsm(this.value);
    writeToOutput(machineCode);
}