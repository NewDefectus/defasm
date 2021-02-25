function M(opcode, group, type)
{
    this.opcode = opcode;
    this.group = group;
    this.type = type;
    this.operandTypes = Array.from(arguments).slice(3);
}

const OPC = { B: 1, WL: 2, BWL: 3, REG: 4, MODRM: 8, WLQ: 16, BWLQ: 17 };

var prefixes = {
"lock": 0xF0n,
"repne": 0xF2n,
"repnz": 0xF2n,
"rep": 0xF3n,
"repe": 0xF3n,
"repz": 0xF3n
}

var mnemonics = {
mov: [
    new M(0xa2, 0, OPC.BWLQ, OPT.ADDR | OPT.EAX)
],
add: [],
sub: [],
xor: [],
or: [],
and: [],
cmp: [],
push: [],
pop: [],
inc: [],
dec: [],
not: [],
neg: [],
mul: [],
div: []
}