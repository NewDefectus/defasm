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
        Object.assign(new M(s == 8 ? opcode : nonByteOp, REG_NON), { globalSize: s})
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

function ArithMnemonic(opBase, extension, )
{
    return [
        ...MT(MNT.BW(), opBase + 4, REG_NON, 'imm', 'ax'),
        ...MT(MNT.WLQ(), 0x83, extension, OPF.imm8, 'rm'),
        new M(opBase + 5, REG_NON, OPF.imm32, OPF.ax32),
        ...MT(MNT.BWL(), 0x80, extension, 'imm', 'rm'),
        new M(opBase + 5, REG_NON, OPF.imm32, OPF.ax64),
        new M(0x81, extension, OPF.imm32, OPF.rm64),
        ...MT(MNT.BWLQ(), opBase, REG_MOD, 'r', 'rm'),
        ...MT(MNT.BWLQ(), opBase + 2, REG_MOD, 'rm', 'r')
    ];
}

function ShiftMnemonic(extension)
{
    return [
        ...MT(MNT.BWLQ(), 0xD0, extension, OPF.one, 'rm'),
        ...MT(MNT.BWLQ(), 0xD2, extension, OPF.cx8, 'rm'),
        ...MT(MNT.BWLQ(), 0xC0, extension, OPF.imm8, 'rm')
    ];
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


add:    ArithMnemonic(0x00, 0),
or:     ArithMnemonic(0x08, 1),
adc:    ArithMnemonic(0x10, 2),
sbb:    ArithMnemonic(0x18, 3),
and:    ArithMnemonic(0x20, 4),
sub:    ArithMnemonic(0x28, 5),
xor:    ArithMnemonic(0x30, 6),
cmp:    ArithMnemonic(0x38, 7),
test: [ // Similar to the other ariths, but too distinct to reuse the function
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
    new M(0x90, REG_NON),
    ...MT(MNT.WL(), 0x0F1F, 0, 'rm')
],
syscall: [
    new M(0x0F05, REG_NON)
],
lea: MT(MNT.WLQ(), 0x8D, REG_MOD, 'm', 'r'),


sal: dummy = ShiftMnemonic(4),
sar: ShiftMnemonic(7),
shl: dummy, // sal and shl are the same
shr: ShiftMnemonic(5),


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


hlt: [new M(0xF4, REG_NON)],
cmc: [new M(0xF5, REG_NON)],
clc: [new M(0xF8, REG_NON)],
stc: [new M(0xF9, REG_NON)],
cli: [new M(0xFA, REG_NON)],
sti: [new M(0xFB, REG_NON)],
cld: [new M(0xFC, REG_NON)],
std: [new M(0xFD, REG_NON)],

xlat: [new M(0xD7, REG_NON)],
wait: dummy = [new M(0x9B, REG_NON)],
fwait: dummy,

ret: [
    Object.assign(new M(0xC2, REG_NON, OPF.imm16), {defsTo16: true}),
    new M(0xC3, REG_NON)
],

enter: [new M(0xC8, REG_NON, OPF.imm16, OPF.imm8)],
leave: [new M(0xC9, REG_NON)]
}


// Adding conditional jmp instructions (these are very repetitive so we treat them specially)
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