var editor = CodeMirror(document.getElementById("inputAreaContainer"), {
    "theme": "editor",
    "mode": "gas",
    "lineNumbers": true
});
var asmTextOutput = document.getElementById("outputArea");

// Input receiving
editor.on("change", function()
{
    asmTextOutput.textContent = compileAsm(editor.getValue());
})