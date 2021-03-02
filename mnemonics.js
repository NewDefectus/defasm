const REG_MOD = -1;
const REG_OP = -2;
const REG_NON = -3

function M(opcode, extension)
{
    this.opcode = opcode;

    // 0-7 goes to modrm.reg,
    // REG_MOD means reg goes in modrm.reg,
    // REG_OP means no modrm (register is encoded in op),
    // REG_NON means no modrm (register is not encoded at all) 
    this.e = extension;

    this.operandTemplates = Array.from(arguments).slice(2);
}

// Mnemonic set from template
function MT(sizes, opcode, extension, op1, op2)
{
    let nonByteOp = opcode;
    if(sizes.includes(8)) nonByteOp += extension == REG_OP ? 8 : 1;
    return sizes.map(s => 
        new M(s == 8 ? opcode : nonByteOp, extension, OPF[op1 + s], OPF[op2 + s])
    );
}

// Mnemonics whose operand size defaults to 64 bits
function M64()
{
    M.call(this, ...arguments);
    this.defsTo64 = true;
}

// Operand template
function opTemp(type, size)
{
    // Matching function (does a given operator match this template?)
    if(type[0] !== undefined) // Multi-type templates (e.g. "rm")
    {
        this.types = type;
        this.match = o => (o.type == type[0] || o.type == type[1]) && o.size == size;
    }
    else
    {
        this.types = [type];
        if(size === undefined) // No size specified
            this.match = o => o.type == type;
        else if(type == OPT.IMM) // Allow immediates to be "upcast"
            this.match = o => o.type == OPT.IMM && o.size <= size;
        else
            this.match = o => o.type == type && o.size == size;
    }

    // Fitting function (fit a given operator into this template)
    if(size === undefined)
        this.fit = o => o;
    else
        this.fit = o => o.size = size;
}

// Special operand template
function specOpTemp(type, matcher)
{
    this.types = [type];
    this.match = o => o.type == type && matcher(o);
    this.fit = o => o;
}

var prefixes = {
"lock": 0xF0n,
"repne": 0xF2n,
"repnz": 0xF2n,
"rep": 0xF3n,
"repe": 0xF3n,
"repz": 0xF3n
}

// Operand filters
const AND = (f1, f2) => (o) => f1(o) && f2(o);
const OR = (f1, f2) => (o) => f1(o) || f2(o);

const OPF = {
"r8": new opTemp(OPT.REG, 8),
"r16": new opTemp(OPT.REG, 16),
"r32": new opTemp(OPT.REG, 32),
"r64": new opTemp(OPT.REG, 64),

"m8": new opTemp(OPT.MEM, 8),
"m16": new opTemp(OPT.MEM, 16),
"m32": new opTemp(OPT.MEM, 32),
"m64": new opTemp(OPT.MEM, 64),

"rm8": new opTemp([OPT.REG, OPT.MEM], 8),
"rm16": new opTemp([OPT.REG, OPT.MEM], 16),
"rm32": new opTemp([OPT.REG, OPT.MEM], 32),
"rm64": new opTemp([OPT.REG, OPT.MEM], 64),

"imm8": new opTemp(OPT.IMM, 8),
"imm16": new opTemp(OPT.IMM, 16),
"imm32": new opTemp(OPT.IMM, 32),
"imm64": new opTemp(OPT.IMM, 64),

"seg": new opTemp(OPT.SEG),
"eax": new specOpTemp(OPT.REG, o => o.reg == 0)
}

const MNT = {
    "BWL": [8, 16, 32],
    "BWLQ": [8, 16, 32, 64],
    "WLQ": [16, 32, 64],
    "WL": [16, 32]
}

var mnemonics = {
mov: [
    new M(0x8C, REG_MOD, OPF.seg, OPF.rm16),
    new M(0x8E, REG_MOD, OPF.rm16, OPF.seg),

    ...MT(MNT.BWLQ, 0x88, REG_MOD, 'r', 'rm'),
    ...MT(MNT.BWLQ, 0x8A, REG_MOD, 'rm', 'r'),

    new M(0xC7, 0, OPF.imm32, OPF.rm64),
    ...MT(MNT.BWLQ, 0xB0, REG_OP, 'imm', 'r'),
    ...MT(MNT.WLQ, 0xC6, 0, 'imm', 'rm')
],
add: [],
sub: [],
xor: [],
or: [],
and: [],
cmp: [],
push: [
    new M64(0x50, REG_OP, OPF.r16),
    new M64(0x50, REG_OP, OPF.r64),
    new M(0x6A, REG_NON, OPF.imm8),
    new M(0x68, REG_NON, OPF.imm16),
    new M(0x68, REG_NON, OPF.imm32),
    
    new M(0x06, REG_NON, new specOpTemp(OPT.SEG, o => o.reg == 0)),
    new M(0x0E, REG_NON, new specOpTemp(OPT.SEG, o => o.reg == 1)),
    new M(0x16, REG_NON, new specOpTemp(OPT.SEG, o => o.reg == 2)),
    new M(0x1E, REG_NON, new specOpTemp(OPT.SEG, o => o.reg == 3))
],
pop: [],
inc: [],
dec: [],
not: [],
neg: [],
mul: [],
div: [],
nop: [
    new M(0x90, REG_NON)
],
syscall: [
    new M(0x0F05, REG_NON)
]
}