var editor = CodeMirror(document.getElementById("inputAreaContainer"), {
    "theme": "editor",
    "mode": "gas",
    "lineNumbers": true
});
var asmTextOutput = document.getElementById("outputArea");
var download = document.getElementById("downloadButtonLink");

const elfHeader1 = "%7F%45%4C%46%02%01%01%00%00%00%00%00%00%00%00%00%02%00%3E%00%01%00%00%00%78%80%04%08%00%00%00%00%40%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%40%00%38%00%01%00%00%00%00%00%00%00%01%00%00%00%05%00%00%00%00%00%00%00%00%00%00%00%00%80%04%08%00%00%00%00%00%80%04%08%00%00%00%00"
const elfHeader2 = "%00%10%00%00%00%00%00%00"


// Input receiving
editor.on("change", function()
{
    let instructions = compileAsm(editor.getValue()), hexOutput = "";
    for(let instr of instructions)
    {
        if(instr === "")
            hexOutput += '\n';
        else for(i = 0; i < instr.length; i++)
        {
            hexOutput += instr.bytes[i].toString(16).toUpperCase().padStart(2, '0') + ' ';
        }
    }
    makeELF(hexOutput.replace(/\s+/g, '%'));
    asmTextOutput.textContent = hexOutput;
})

function makeELF(bytes)
{
    let byteLength = bytes.length / 3 + 0x78, size = "";
    if(bytes != "")
    {
        bytes = '%' + bytes.slice(0, -1);
    }

    for(let i = 0; i < 8; i++)
    {
        size += '%' + byteLength.toString(16).toUpperCase().padStart(2, '0');
        byteLength >>= 8;
    }
    
    download.setAttribute("href", "data:text/plain;charset=utf-8," + elfHeader1 + size + size + elfHeader2 + bytes);
    console.log(download.href)
    download.setAttribute("download", "file.exe");
}