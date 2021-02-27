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

    this.operandFilters = Array.from(arguments).slice(2);
}

// Mnemonics for byte / non-byte operands
function MB(opcode, extension, op1, op2)
{
    let nonByteOp = opcode + (extension == REG_OP ? 8 : 1);
    return [
        new M(opcode, extension, AND(op1, OPF.s8), AND(op2, OPF.s8)),
        new M(nonByteOp, extension, AND(op1, OPF.s16), AND(op2, OPF.s16)),
        new M(nonByteOp, extension, AND(op1, OPF.s32), AND(op2, OPF.s32)),
        new M(nonByteOp, extension, AND(op1, OPF.s64), AND(op2, OPF.s64))
    ];
}

// Mnemonics whose operand size defaults to 64 bits
function M64()
{
    M.call(this, ...arguments);
    this.defsTo64 = true;
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
"s8": o => o.size == 8 || o.size == undefined,
"s16": o => o.size == 16 || o.size == undefined,
"s32": o => o.size == 32 || o.size == undefined,
"s64": o => o.size == 64 || o.size == undefined,
"r": o => o.type == OPT.REG,
"m": o => o.type == OPT.MEM,
"rm": o => o.type == OPT.REG || o.type == OPT.MEM,
"imm": o => o.type == OPT.IMM,
"seg": o => o.type == OPT.SEG,
"eax": o => o.type == OPT.REG && o.reg == 0,
"moffs": o => o.type == OPT.MEM && o.reg == -1
}

Object.assign(OPF, {
"r8": AND(OPF.r, OPF.s8),
"r16": AND(OPF.r, OPF.s16),
"r32": AND(OPF.r, OPF.s32),
"r64": AND(OPF.r, OPF.s64),

"m8": AND(OPF.m, OPF.s8),
"m16": AND(OPF.m, OPF.s16),
"m32": AND(OPF.m, OPF.s32),
"m64": AND(OPF.m, OPF.s64),
"rm8": AND(OPF.rm, OPF.s8),
"rm16": AND(OPF.rm, OPF.s16),
"rm32": AND(OPF.rm, OPF.s32),
"rm64": AND(OPF.rm, OPF.s64),


"imm8": AND(OPF.imm, OPF.s8),
"imm16": AND(OPF.imm, OPF.s16),
"imm32": AND(OPF.imm, OPF.s32),
"imm64": AND(OPF.imm, OPF.s64),
});

var OPFF = {
    "rm": f => f({type: OPT.REG}) && f({type: OPT.MEM}),
    "r": f => f({type: OPT.REG}) && !f({type: OPT.MEM}),
    "imm": f => f({type: OPT.IMM}),
    "moff": f => f({type: OPT.MEM, reg: -1})
}

var mnemonics = {
mov: [
    ...MB(0xA0, REG_NON, OPF.moffs, OPF.eax),
    ...MB(0xA2, REG_NON, OPF.eax, OPF.moffs),

    new M(0x8C, REG_MOD, OPF.seg, OR(OR(OPF.rm16, OPF.r32), OPF.r64)),
    new M(0x8E, REG_MOD, OR(OPF.rm16, OPF.rm64), OPF.seg),

    ...MB(0x88, REG_MOD, OPF.r, OPF.rm),
    ...MB(0x8A, REG_MOD, OPF.rm, OPF.r),

    ...MB(0xB0, REG_OP, OPF.imm, OPF.r),
    ...MB(0xC6, 0, OPF.imm, OPF.rm)
],
add: [],
sub: [],
xor: [],
or: [],
and: [],
cmp: [],
push: [
    new M64(0x50, REG_OP, OR(OPF.r64, OPF.r16)),
    new M(0x6A, REG_NON, OPF.imm8),
    new M(0x68, REG_NON, OR(OPF.imm16, OPF.imm32)),
    new M(0x06, REG_NON, o => OPF.seg(o) && o.reg == 0),
    new M(0x0E, REG_NON, o => OPF.seg(o) && o.reg == 1),
    new M(0x16, REG_NON, o => OPF.seg(o) && o.reg == 2),
    new M(0x1E, REG_NON, o => OPF.seg(o) && o.reg == 3)
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
]
}