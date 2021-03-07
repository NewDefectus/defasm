var editor = CodeMirror(document.getElementById("inputAreaContainer"), {
    "theme": "editor",
    "mode": {name: "gas", architecture: "x86"},
    "lineNumbers": true
});
var asmTextOutput = document.getElementById("outputArea");

// Input receiving
editor.on("change", function()
{
    asmTextOutput.textContent = compileAsm(editor.getValue());
})