const OPTShorts = {
    R: o => o.type ==OPT.REG,
    r: OPT.RM,
    m: OPT.MEM,
}

var mnemonics = {};

let lines;
var mnemonicStrings = `

push
50 o RwQ
6A z-2 Ib~wl
FF 6 mwQ
0FA0 z s_4
0FA8 z s_5

pop
58 o RwQ
8F 0 mwQ
0FA1 z s_4
0FA9 z s_5

mov
88 r Rbwlq r
8A r rbwlq R
8C r s rWlq
8E r rWq s
A0 z obwlq R_0
A2 z R_0bwlq o
C7 0 Il rq
B0 o8 ibwlq R
C6 0 ibwl r

`.split("\n\n").slice(1).forEach(x => { lines = x.split('\n'); mnemonics[lines.shift()] = lines; });


// Format is a string specified by mnemonicsFormat.txt
function Mnemonic(format)
{
    return format.split('\n').map(line => new MnemonicVariation(line.split(' ')));
}

function MnemonicVariation(format)
{
    this.opcode = parseInt(format[0], 16);

    let extension = format[1];
    switch(extension[0])
    {
        case 'r':
            this.extension = REG_MOD;
            break;
        case 'o':
            this.extension = REG_OP;
            break;
        case 'z':
            this.extension = REG_NON;
            break;
        default:
            this.extension = parseInt(extension[0]);
    }
    this.opDiff = extension[1] ? parseInt(extension.slice(1)) : 1;
    


}


function OperandTemplate(format)
{
    format = format.split('');
    this.typeCheck = OPTShorts[format.shift()];

    for(let c of format)
    {

    }
}