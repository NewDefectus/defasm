function ASMInstruction(opcode)
{
    this.sym = 0;
    this.opcode = opcode;
    this.type = 0;
    this.nb_ops = 0;
    this.op_type = [];
}

function parseInstruction(opcode)
{
    console.log(parseOperand());
}