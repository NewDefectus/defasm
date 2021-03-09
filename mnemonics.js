const REG_MOD = -1;
const REG_OP = -2;
const REG_NON = -3

function M(opcode, extension)
{
    if(extension === undefined) extension = REG_NON;
    this.opcode = opcode;

    // 0-7 goes to modrm.reg,
    // REG_MOD means reg goes in modrm.reg,
    // REG_OP means no modrm (register is encoded in op),
    // REG_NON means no modrm (register is not encoded at all) 
    this.e = extension;

    this.operandTemplates = Array.from(arguments).slice(2);
}

// Mnemonic set from template
function MT(template, opcode, extension)
{
    let nonByteOp = opcode;
    let ops = Array.from(arguments).slice(3);
    let sizes = template.sizes, defsTo64 = template.def64;
    if(sizes.includes(8)) nonByteOp += template.diff;
    return sizes.map(s => 
        Object.assign(new M(s == 8 ? opcode : nonByteOp, extension, ...ops.map(op => 
            typeof(op) === "string" ? OPF[op + s] : op
            )), {defsTo64: defsTo64})
    );
}

// Mnemonic set with 0 operands but differing sizes (e.g. string operations)
function MTS(template, opcode)
{
    let nonByteOp = opcode;
    let sizes = template.sizes;
    if(sizes.includes(8)) nonByteOp += template.diff;
    return sizes.map(s => 
        Object.assign(new M(s == 8 ? opcode : nonByteOp), { globalSize: s})
    );
}

// Operand template
function opTemp(type, size)
{
    // Matching function (does a given operator match this template?)
    if(size === undefined) // No size specified
        this.matchSize = o => true;
    else if(type == OPT.IMM) // Allow immediates to be "upcast"
        this.matchSize = o => o.size <= size;
    else
        this.matchSize = o => o.size == size;
    
    
    if(type[0] !== undefined) // Multi-type templates (e.g. "rm")
    {
        this.types = type;
        this.matchType = o => type.includes(o.type)
    }
    else
    {
        this.types = [type];
        this.matchType = o => o.type == type;
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
    this.matchType = o => o.type == type;
    this.matchSize = matcher;
    this.fit = o => o;
    this.implicit = true;
}

const prefixes = {
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
"ax8": new specOpTemp(OPT.REG, o => o.reg == 0 && o.size == 8),
"ax16": new specOpTemp(OPT.REG, o => o.reg == 0 && o.size == 16),
"ax32": new specOpTemp(OPT.REG, o => o.reg == 0 && o.size == 32),
"ax64": new specOpTemp(OPT.REG, o => o.reg == 0 && o.size == 64),
"cx8": new specOpTemp(OPT.REG, o => o.reg == 1 && o.size == 8),
"one": new specOpTemp(OPT.IMM, o => o.value === 1n),
"fs": new specOpTemp(OPT.SEG, o => o.reg == 4),
"gs": new specOpTemp(OPT.SEG, o => o.reg == 5)
}

const MNTT = sizes => (diff=1, def64=false) => ({sizes: sizes, diff: diff, def64: def64})

const MNT = {
    "BWL": MNTT([8, 16, 32]),
    "BWLQ": MNTT([8, 16, 32, 64]),
    "WLQ": MNTT([16, 32, 64]),
    "WL": MNTT([16, 32]),
    "WQ": MNTT([16, 64]),
    "BL": MNTT([8, 32]),
    "BW": MNTT([8, 16]),
    "LQ": MNTT([32, 64])
}

let dummy;

/* Mnemonic variations should be ordered in a way that yields
the shortest, most compact encoding of any given instruction. */

var mnemonics = {
mov: [
    new M(0x8C, REG_MOD, OPF.seg, OPF.rm16),
    new M(0x8E, REG_MOD, OPF.rm16, OPF.seg),

    ...MT(MNT.BWLQ(), 0x88, REG_MOD, 'r', 'rm'),
    ...MT(MNT.BWLQ(), 0x8A, REG_MOD, 'rm', 'r'),

    new M(0xC7, 0, OPF.imm32, OPF.rm64),
    ...MT(MNT.BWLQ(8), 0xB0, REG_OP, 'imm', 'r'),
    ...MT(MNT.BWL(), 0xC6, 0, 'imm', 'rm')
],

test: [
    ...MT(MNT.BWLQ(), 0xA8, REG_NON, 'imm', 'ax'),
    ...MT(MNT.BWLQ(), 0xF6, 0, 'imm', 'rm'),
    ...MT(MNT.BWLQ(), 0x84, REG_MOD, 'r', 'rm')
],


push: [
    ...MT(MNT.WQ(1, true), 0x50, REG_OP, 'r'),
    ...MT(MNT.BWL(-2), 0x6A, REG_NON, 'imm'),
    ...MT(MNT.WQ(1, true), 0xFF, 6, 'm'),
    
    // x64 supports pushing only these two segment registers
    new M(0x0FA0, REG_NON, OPF.fs),
    new M(0x0FA8, REG_NON, OPF.gs)
],
pop: [
    ...MT(MNT.WQ(1, true), 0x58, REG_OP, 'r'),
    ...MT(MNT.WQ(1, true), 0x8F, 0, 'm'),

    // x64 supports popping only these two segment registers
    new M(0x0FA1, REG_NON, OPF.fs),
    new M(0x0FA9, REG_NON, OPF.gs)
],
inc:    MT(MNT.BWLQ(), 0xFE, 0, 'rm'),
dec:    MT(MNT.BWLQ(), 0xFE, 1, 'rm'),
not:    MT(MNT.BWLQ(), 0xF6, 2, 'rm'),
neg:    MT(MNT.BWLQ(), 0xF6, 3, 'rm'),
mul:    MT(MNT.BWLQ(), 0xF6, 4, 'rm'),
div:    MT(MNT.BWLQ(), 0xF6, 6, 'rm'),
idiv:   MT(MNT.BWLQ(), 0xF6, 7, 'rm'),

imul: [
    ...MT(MNT.BWLQ(), 0xF6, 5, 'rm'),
    ...MT(MNT.WLQ(), 0x0FAF, REG_MOD, 'rm', 'r'),
    ...MT(MNT.WLQ(), 0x6B, REG_MOD, OPF.imm8, 'rm', 'r'),
    new M(0x69, REG_MOD, OPF.imm16, OPF.rm16, OPF.r16),
    ...MT(MNT.LQ(), 0x69, REG_MOD, OPF.imm32, 'rm', 'r')
],
nop: [
    new M(0x90),
    ...MT(MNT.WL(), 0x0F1F, 0, 'rm')
],
syscall: [new M(0x0F05)],
int: [
    new M(0xCC, REG_NON, new specOpTemp(OPT.IMM, o => o.value === 3n)),
    new M(0xF1, REG_NON, OPF.one),
    new M(0xCD, REG_NON, OPF.imm8)
],
int3: [new M(0xCC)],
int1: [new M(0xF1)],

lea: MT(MNT.WLQ(), 0x8D, REG_MOD, 'm', 'r'),


cbw: [new M(0x6698)],
cwde: [new M(0x98)],
cdqe: [new M(0x4898)],
cwd: [new M(0x6699)],
cdq: [new M(0x99)],
cqo: [new M(0x4899)],


loopne: [new M(0xE0, REG_NON, OPF.imm8)],
loope: [new M(0xE1, REG_NON, OPF.imm8)],
loop: [new M(0xE2, REG_NON, OPF.imm8)],
jmp: [
    ...MT(MNT.BL(-2), 0xEB, REG_NON, 'imm'),
    Object.assign(new M(0xFF, 4, OPF.rm64), {defsTo64: true})
],
call: [
    new M(0xE8, REG_NON, OPF.imm32),
    Object.assign(new M(0xFF, 2, OPF.rm64), {defsTo64: true})
],
jecxz: [new M(0x67E3, REG_NON, OPF.imm8)],
jrcxz: [new M(0xE3, REG_NON, OPF.imm8)],

xchg: [
    ...MT(MNT.WLQ(), 0x90, REG_OP, 'ax', 'r'),
    ...MT(MNT.WLQ(), 0x90, REG_OP, 'r', 'ax'),
    ...MT(MNT.BWLQ(), 0x86, REG_MOD, 'r', 'rm'),
    ...MT(MNT.BWLQ(), 0x86, REG_MOD, 'rm', 'r')
],


movs: MTS(MNT.BWLQ(), 0xA4),
cmps: MTS(MNT.BWLQ(), 0xA6),
stos: MTS(MNT.BWLQ(), 0xAA),
lods: MTS(MNT.BWLQ(), 0xAC),
scas: MTS(MNT.BWLQ(), 0xAE),

pushf: [Object.assign(new M(0x9C), {defsTo64: true})],
popf: [Object.assign(new M(0x9D), {defsTo64: true})],


hlt: [new M(0xF4)],
cmc: [new M(0xF5)],
clc: [new M(0xF8)],
stc: [new M(0xF9)],
cli: [new M(0xFA)],
sti: [new M(0xFB)],
cld: [new M(0xFC)],
std: [new M(0xFD)],

xlat: [new M(0xD7)],
wait: dummy = [new M(0x9B)],
fwait: dummy,

ret: [
    Object.assign(new M(0xC2, REG_NON, OPF.imm16), {defsTo16: true}),
    new M(0xC3)
],
iret: [new M(0xCF)],

enter: [new M(0xC8, REG_NON, OPF.imm16, OPF.imm8)],
leave: [new M(0xC9)]
}


// Some extra instructions (these are easier to encode programatically as they're quite repetitive)
let arithmeticMnemonics = "add or adc sbb and sub xor cmp".split(' ');
arithmeticMnemonics.forEach((name, i) => {
    let opBase = i * 8;
    mnemonics[name] = [
        ...MT(MNT.BW(), opBase + 4, REG_NON, 'imm', 'ax'),
        ...MT(MNT.WLQ(), 0x83, i, OPF.imm8, 'rm'),
        new M(opBase + 5, REG_NON, OPF.imm32, OPF.ax32),
        ...MT(MNT.BWL(), 0x80, i, 'imm', 'rm'),
        new M(opBase + 5, REG_NON, OPF.imm32, OPF.ax64),
        new M(0x81, i, OPF.imm32, OPF.rm64),
        ...MT(MNT.BWLQ(), opBase, REG_MOD, 'r', 'rm'),
        ...MT(MNT.BWLQ(), opBase + 2, REG_MOD, 'rm', 'r')
    ];
});

// Shift mnemonics
let shiftMnemonics = `rol
ror
rcl
rcr
sal shl
shr

sar`.split('\n');
shiftMnemonics.forEach((names, i) => {
    dummy = [
        ...MT(MNT.BWLQ(), 0xD0, i, OPF.one, 'rm'),
        ...MT(MNT.BWLQ(), 0xD2, i, OPF.cx8, 'rm'),
        ...MT(MNT.BWLQ(), 0xC0, i, OPF.imm8, 'rm')
    ];
    names.split(' ').forEach(name => {
        mnemonics[name] = dummy;
    })
});

// Adding conditional jmp instructions
let conditionalJmps = `jo
jno
jb jc jnae
jae jnb jnc
je jz
jne jnz
jbe jna
ja jnbe
js
jns
jp jpe
jnp jpo
jl jnge
jge jnl
jle jng
jg jnle`.split('\n');
conditionalJmps.forEach((names, i) => {
    dummy = [
        new M(0x70 + i, REG_NON, OPF.imm8),
        new M(0x0F80 + i, REG_NON, OPF.imm32)
    ];
    names.split(' ').forEach(name => mnemonics[name] = dummy);
})