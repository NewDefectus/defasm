import { compileAsm } from "./compiler.js";

var editor = CodeMirror(document.getElementById("inputAreaContainer"), {
    "theme": "editor",
    "mode": "gas",
    "architecture": "x86",
    "lineNumbers": true
});
var asmTextOutput = document.getElementById("outputArea");
asmTextOutput.onclick = function()
{
    window.getSelection().selectAllChildren(asmTextOutput.parentElement);
    document.execCommand("copy");
};
var download = document.getElementById("downloadButtonLink");

const elfHeader1 = "%7F%45%4C%46%02%01%01%00%00%00%00%00%00%00%00%00%02%00%3E%00%01%00%00%00%78%80%04%08%00%00%00%00%40%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%40%00%38%00%01%00%00%00%00%00%00%00%01%00%00%00%07%00%00%00%00%00%00%00%00%00%00%00%00%80%04%08%00%00%00%00%00%80%04%08%00%00%00%00";
const elfHeader2 = "%00%10%00%00%00%00%00%00";

// Load the previously stored code
let prevCode = document.cookie.split('; ').find(row => row.startsWith("code="));
if(prevCode) editor.setValue(decodeURIComponent(prevCode.slice(5))), compileEditorCode();


// Input receiving
editor.on("change", compileEditorCode);
function compileEditorCode()
{
    document.cookie = "code=" + encodeURIComponent(editor.getValue()); // Save the code
    let instructions = compileAsm(editor.getValue()), hexOutput = "", firstOnLine = true;
    for(let instr of instructions)
    {
        if(instr === "")
            hexOutput += '\n', firstOnLine = true;
        else for(i = 0; i < instr.length; i++)
        {
            if(instr.skip) continue;
            hexOutput += (firstOnLine ? "" : ' ') + instr.bytes[i].toString(16).toUpperCase().padStart(2, '0');
            firstOnLine = false;
        }
    }
    makeELF(hexOutput.trim().replace(/\s+/g, '%'));
    asmTextOutput.textContent = hexOutput;
}

function makeELF(bytes)
{
    if(bytes !== "") bytes = '%' + bytes;
    let byteLength = bytes.length / 3 + 0x78, size = "";

    for(let i = 0; i < 8; i++)
    {
        size += '%' + (byteLength & 255).toString(16).padStart(2, '0');
        byteLength >>= 8;
    }
    
    download.setAttribute("href", "data:text/plain;charset=utf-8," + elfHeader1 + size + size + elfHeader2 + bytes);
    download.setAttribute("download", "file.exe");
}