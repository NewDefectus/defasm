let lines;
var mnemonicStrings = `

mov
88 r Rbwlq r
8A r rbwlq R
8C r s rWlq
8E r rWq s
C7 0 Il rq
B0 o8 i Rbwlq
C6 0 i rbwl

test
A8 z i R_0bwlo
F6 0 i rbwlo
84 r Rbwlq r

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

inc:FE 0 rbwlq

dec:FE 1 rbwlq

not:F6 2 rbwlq

neg:F6 3 rbwlq

mul:F6 4 rbwlq

div:F6 6 rbwlq

imul
F6 5 rbwlq
0FAF r rwlq R
6B r ib rwlq R
69 r iw rw Rw
69 r il rlq R

idiv:F6 7 rbwlq

nop
90
0F1F 0 rwl

syscall:0F05

int
CC z i_3
F1 z i_1
CD z ib

int3:CC

int1:F1

lea:8D r m Rwlq

cbw:66)98

cwde:98

cdqe:48)98

cwd:66)99

cdq:99

cqo:48)99

loopne:E0 z Ib

loope:E1 z Ib

loop:E2 z Ib

jmp
Eb z-2 Ibl
FF 4 rQ

call
E8 z Il
FF 2 rQ

jecxz:67)E3 z Ib

jrcxz:E3 z Ib

xchg
90 o R_0wlq R
90 o Rwlq R_0
86 r Rbwlq r
86 r rbwlq R

movs:A4 z -bwlq

cmps:A6 z -bwlq

stos:AA z -bwlq

lods:AC z -bwlq

scas:AE z -bwlq

pushf:9C z -wQ

popf:9D z -wQ

hlt:F4

cmc:F5

clc:F8

stc:F9

cli:FA

sti:FB

cld:FC

std:FD

xlat:D7

wait:9B

fwait:#wait

ret
C3
C2 z IW

iret:CF

enter:C8 z iW ib

leave:C9

bswap:0FC8 o Rwlq

cmpxchg:0FB0 r Rbwlq r

cmpxchg8b:0FC7 1 mQ

cmpxchg16b:0FC7 1 m~Q

sal:#shl


adox
F3)0F38F6 r rlq R

adcx
66)0F38F6 r rlq R

addsubpd
66)0FD0 r vx V

addsubps
F2)0FD0 r vx V

addss
F3)0F58 r vx V

addsd
F2)0F58 r vx V

addpd
66)0F58 r vx V

aeskeygenassist
66)0F3ADF r vx V ib`;
mnemonicStrings.split(/\n{2,}/).slice(1).forEach(x => { lines = x.split(/[\n:]/); mnemonics[lines.shift()] = lines; });


let hex = num => num.toString(16), dummy;

// Some extra mnemonics (these are easier to encode programatically as they're quite repetitive)
let arithmeticMnemonics = "add or adc sbb and sub xor cmp".split(' ');
arithmeticMnemonics.forEach((name, i) => {
    let opBase = i * 8;
    mnemonics[name] = [
        hex(opBase + 4) + " z i R_0bw",
        "83 " + i + " Ib rwlq",
        hex(opBase + 5) + " z il R_0l",
        "80 " + i + " i rbwl",
        hex(opBase + 5) + " z il R_0q",
        "81 " + i + " Il rq",
        hex(opBase) + " r Rbwlq r",
        hex(opBase + 2) + " r rbwlq R",
    ];
});

// Shift mnemonics
let shiftMnemonics = `rol ror rcl rcr shl shr  sar`.split(' ');
shiftMnemonics.forEach((name, i) => {
    if(name)
        mnemonics[name] = [
            "D0 " + i + " i_1 rbwlq",
            "D2 " + i + " R_1b rbwlq",
            "C0 " + i + " ib rbwlq"
        ];
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
    names = names.split(' ');
    let firstName = names.shift();
    mnemonics[firstName] = [
        hex(0x70 + i) + " z Ib",
        hex(0x0F80 + i) + " z Il"
    ];
    names.forEach(name => mnemonics[name] = ['#' + firstName]);
})


let bitTests = "bt bts btr btc".split(' ');
bitTests.forEach((name, i) => {
    mnemonics[name] = [
        hex(0x0FA3 + i * 8) + " r Rwlq r",
        "0FBA " + (i + 4) + " ib rwlq"
    ]
})