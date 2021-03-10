function optShort(types, )
{

}


const OPTShorts = {
    R: o => o.type ==OPT.REG,
    r: OPT.RM,
    m: OPT.MEM,

}
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