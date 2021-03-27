let lines;
let mnemonicStrings = `

adcx:66)0F38F6 r r Rlq

addpd:66)0F58 r v >V Vxy

addps:0F58 r v >V Vxy

addsd:F2)0F58 r v >V Vx

addss:F3)0F58 r v >V Vx

addsubpd:66)0FD0 r v >V Vxy

addsubps:F2)0FD0 r v >V Vxy

adox:F3)0F38F6 r r Rlq

aesdec:66)0F38DE r v >V Vxy

aesdeclast:66)0F38DF r v >V Vxy

aesenc:66)0F38DC r v >V Vxy

aesenclast:66)0F38DD r v >V Vxy

aesimc:66)0F38DB r v Vx >

aeskeygenassist:66)0F3ADF r ib v Vx >

andn:0F38F2 r r >Rlq R

andpd:66)0F54 r v >V Vxy

andps:0F54 r v >V Vxy

andnpd:66)0F55 r v >V Vxy

andnps:0F55 r v >V Vxy

bextr:0F38F7 r >Rlq r R

blendpd:66)0F3A0D r ib v >V Vxy

blendps:66)0F3A0C r ib v >V Vxy

blendvpd
66)0F3815 r V_0x v V
v 66)0F3A4B r <Vxy v >V V

blendvps
66)0F3814 r V_0x v V
v 66)0F3A4A r <Vxy v >V V

blsi:0F38F3 3 r >Rlq

blsmsk:0F38F3 2 r >Rlq

blsr:0F38F3 1 r >Rlq

bndcl:F3)0F1A r rQ B

bndcn:F2)0F1B r rQ B

bndcu:F2)0F1A r rQ B

bndldx:0F1A r mQ B

bndmk:F3)0F1B r mQ B

bndmov
66)0F1A r b B
66)0F1B r B b

bndstx:0F1B r B mQ

bsf:0FBC r r Rwlq

bsr:0FBD r r Rwlq

bswap:0FC8 o Rwlq

bt
0FA3 r Rwlq r
0FBA 4 ib rwlq

btc
0FBB r Rwlq r
0FBA 7 ib rwlq

btr
0FB3 r Rwlq r
0FBA 6 ib rwlq

bts
0FAB r Rwlq r
0FBA 5 ib rwlq

bzhi:0F38F5 r Rlq r >R

call
E8 r Il
FF 2 rQ

cbw:66)98

cdq:99

cdqe:48)98

clac:0F01CA

clc:F8

cld:FC

cldemote:0F1C 0 mB

clflush:0FAE 7 mB

clflushopt:66)0FAE 7 mB

cli:FA

clrssbsy:F3)0FAE 6 mQ

clts:0F06

clwb:66)0FAE 6 mB

cmc:F5

cmppd:66)0FC2 r ib v >V Vxy

cmpps:0FC2 r ib v >V Vxy

cmps:A6 r -bwlq

cmpsd:F2)0FC2 r ib v >V Vx

cmpss:F3)0FC2 r ib v >V Vx

cmpxchg:0FB0 r Rbwlq r

cmpxchg8b:0FC7 1 mQ

cmpxchg16b:0FC7 1 m#q

comisd:66)0F2F r v Vx >

comiss:0F2F r v Vx >

cpuid:0FA2

crc32
F2)0F38F0 r rbwl RL
F2)0F38F0 r rbq Rq

cvtdq2pd:F3)0FE6 r vX Vxy >

cvtdq2ps:0F5B r v Vxy >

cvtpd2dq:F2)0FE6 r vXy Vx >

cvtpd2pi:66)0F2D r vX VQ

cvtpd2ps:66)0F5A r vXy Vx >

cvtpi2pd:66)0F2A r vQ Vx

cvtpi2ps:0F2A r vQ Vx

cvtps2dq:66)0F5B r v Vxy >

cvtps2pd:0F5A r vX Vxy >

cvtps2pi:0F2D r vX VQ

cvtsd2si:F2)0F2D r vX Rlq >

cvtsd2ss:F2)0F5A r vX >Vx Vx

cvtsi2sd:F2)0F2A r rlq >VX VX

cvtsi2ss:F3)0F2A r rlq >VX VX

cvtss2sd:F3)0F5A r v >Vx Vx

cvtss2si:F3)0F2D r vX Rlq >

cvttpd2dq:66)0FE6 r vXy Vx >

cvttpd2pi:66)0F2C r vX VQ

cvttps2dq:F3)0F5B r v Vxy >

cvttps2pi:0F2C r vX VQ

cvttsd2si:F2)0F2C r vX Rlq >

cvtss2si:F3)0F2C r vX Rlq >

cqo:48)99

cwd:66)99

cwde:98

dec:FE 1 rbwlq

div:F6 6 rbwlq

divpd:66)0F5E r v >V Vxy

divps:0F5E r v >V Vxy

divsd:F2)0F5E r v >V Vx

divss:F3)0F5E r v >V Vx

dppd:66)0F3A41 r ib v >V Vx

dpps:66)0F3A40 r ib v >V Vxy

emms:0F77

endbr32:F3)0F1EFB

endbr64:F3)0F1EFA

enter:C8 r ib iW

extractps:66)0F3A17 r ib Vx rL >

f2xm1:D9F0

fabs:D9E1

fbld:DF 4 mQ

fbstp:DF 6 mQ

fchs:D9E0

fclex:9BDBE2

fcmovb:DA 0 F F_0

fcmove:DA 1 F F_0

fcmovbe:DA 2 F F_0

fcmovu:DA 3 F F_0

fcmovnb:DB 0 F F_0

fcmovne:DB 1 F F_0

fcmovnbe:DB 2 F F_0

fcmovnu:DB 3 F F_0

fcompp:DED9

fcomi:DB 6 F F_0

fcomip:DF 6 F F_0

fcos:D9FF

fdecstp:D9F6

ffree:DD 0 F

fild
DF 0 mW
DB 0 ml
DF 5 mQ

fimul
DA 1 ml
DE 1 mW

fincstp:D9F7

finit:9BDBE3

fist
DB 2 ml
DF 2 mW

fistp
DB 3 ml
DF 3 mW
DF 7 mQ

fisttp
DB 1 ml
DF 1 mW
DD 1 mQ

fisub
DA 4 ml
DE 4 mW

fisubr
DA 5 ml
DE 5 mW

fld
D9 0 ml
DD 0 mQ
D9 0 F

fld1:D9E8

fldl2t:D9E9

fldl2e:D9EA

fldpi:D9EB

fldlg2:D9EC

fldln2:D9ED

fldt:DB 5 mQ

fldz:D9EE

fldcw:D9 5 mW

fldenv:D9 4 mL

fmul
D8 1 ml
DC 1 mQ
D8 1 F F_0
DC 1 F_0 F

fmulp
DE 1 F_0 F
DEC9

fnclex:DBE2

fninit:DBE3

fnop:D9D0

fnsave:DD 6 mQ

fnstcw:D9 7 mW

fnstenv:D9 6 mL

fnstsw
DD 7 mW
DFE0 r R_0W

fpatan:D9F3

fprem:D9F8

fprem1:D9F5

fptan:D9F2

frndint:D9FC

frstor:DD 4 mQ

fsave:9BDD 6 mQ

fscale:D9FD

fsin:D9FE

fsincos:D9FB

fsqrt:D9FA

fst
D9 2 ml
DD 2 mQ
DD 2 F

fstcw:9BD9 7 mW

fstenv:9BD9 6 mL

fstp
D9 3 ml
DD 3 mQ
DD 3 F

fstpt:DB 7 mQ

fstsw
9BDD 7 mW
9BDFE0 r R_0W

ftst:D9E4

fucom
DD 4 F
DDE1

fucomp
DD 5 F
DDE9

fucompp:DAE9

fucomi:DB 5 F F_0

fucomip:DF 5 F F_0

fwait:#wait

fxam:D9E5

fxch
D9 1 F
D9C9

fxrstor:0FAE 1 mQ

fxrstor64:0FAE 1 m#q

fxsave:0FAE 0 mQ

fxsave64:0FAE 0 m#q

fxtract:D9F4

fyl2x:D9F1

fyl2xp1:D9F9

gf2p8affineinvqb:66)0F3ACF r ib v >V Vxy

gf2p8affineqb:66)0F3ACE r ib v >V Vxy

gf2p8mulb:66)0F38CF r v >V Vxy

haddpd:66)0F7C r v >V Vxy

haddps:F2)0F7C r v >V Vxy

hlt:F4

hsubpd:66)0F7D r v >V Vxy

hsubps:F2)0F7D r v >V Vxy

idiv:F6 7 rbwlq

imul
F6 5 rbwlq
0FAF r r Rwlq
6B r ib r Rwlq
69 r iw rw Rw
69 r il r Rlq

in
E4 r ib R_0bwl
EC r R_2W R_0bwl

inc:FE 0 rbwlq

incsspd:F3)0FAE 5 Rlq

ins:6C r -bwl

insertps:66)0F3A21 r ib v >V Vx

int
CC r i_3b
F1 r i_1b
CD r ib

int1:F1

int3:CC

invd:0F08

invlpg:0F01 7 mB

invpcid:66)0F3882 r mQ RQ

iret:CF r -Lq

jecxz:67)E3 r Ib

jmp
EB z-2 Ibl
FF 4 rQ

jrcxz:E3 r Ib

kadd:vl 0F4A r ^Kbwlq >K K

kand:vl 0F41 r ^Kbwlq >K K

kandn:vl 0F42 r ^Kbwlq >K K

kmov
0F90 r k Kbwlq >
0F91 r Kbwlq m >
0F92 r ^Rl Kbwl >
0F92 r ^Rq Kq >
0F93 r ^Kbwl Rl >
0F93 r ^Kq Rq >

knot:0F44 r ^Kbwlq K >

kor:vl 0F45 r ^Kbwlq >K K

kortest:0F98 r ^Kbwlq K >

kshiftl:66)0F3A32 r iB ^Kbwlq K >

kshiftr:66)0F3A30 r iB ^Kbwlq K >

ktest:0F99 r ^Kbwlq K >

kunpckbw:vl 0F4B r ^K#b >K K

kunpckdq:vl 0F4B r ^K#q >K K

kunpckwd:vl 0F4B r ^K#w >K K

kxnor:vl 0F46 r ^Kbwlq >K K

kxor:vl 0F47 r ^Kbwlq >K K

lahf:9F

lar:0F02 r rW Rwlq

lddqu:F2)0FF0 r m Vxy >

ldmxcsr:0FAE 2 mL >

lea:8D r m Rwlq

leave:C9

lfs:0FB4 r m Rwlq

lgs:0FB5 r m Rwlq

lods:AC r -bwlq

loop:E2 r Ib

loope:E1 r Ib

loopne:E0 r Ib

lsl:0F03 r rW Rwlq

lss:0FB2 r m Rwlq

maskmovdqu:66)0FF7 r ^Vx V >

maskmovq:0FF7 r ^VQ V

maxpd:66)0F5F r v >V Vxy

maxps:0F5F r v >V Vxy

maxsd:F2)0F5F r v >V Vx

maxss:F3)0F5F r v >V Vx

mfence:0FAEF0

minpd:66)0F5D r v >V Vxy

minps:0F5D r v >V Vxy

minsd:F2)0F5D r v >V Vx

minss:F3)0F5D r v >V Vx

monitor:0F01C8

mov
88 r Rbwlq r
8A r r Rbwlq
C7 0 Il Rq
C7 0 iL mq
B0 o8 i Rbwlq
C6 0 i rbwl
0F6E r r~l~q VQ
0F7E r VQ r~l~q
66)0F6E r r~l~q VX >
66)0F7E r VX r~l~q >
0F6F r v V~$q
0F7F r V~$q v
F3)0F7E r -$q v Vx >
66)0FD6 r -$q Vx v >
8C r s Rwlq
8C r s mW
8E r Rwlq s
8E r mW s
0F20 r C ^RQ
0F21 r D ^RQ
0F22 r ^RQ C
0F23 r ^RQ D

movddup:F2)0F12 r v Vxy >

movdiri:0F38F9 r Rlq m

movdir64b:66)0F38F8 r m Rwlq

movdqa
66)0F6F r v Vxy >
66)0F7F r Vxy v >

movdqu
F3)0F6F r v Vxy >
F3)0F7F r Vxy v >

movdq2q:F2)0FD6 r ^Vx VQ

movhlps:0F12 r ^Vx >V V

movhpd
66)0F16 r m >V Vx
66)0F17 r Vx m >

movhps
0F16 r m >V Vx
0F17 r Vx m >

movlhps:0F16 r ^Vx >V V

movlpd
66)0F12 r m >V Vx
66)0F13 r Vx m >

movlps
0F12 r m >V Vx
0F13 r Vx m >

movmskpd:66)0F50 r ^Vxy R! >

movmskps:0F50 r ^Vxy R! >

movntdqa:66)0F382A r m Vxy >

movntdq:66)0FE7 r Vxy m >

movnti:0FC3 r Rlq m

movntpd:66)0F2B r Vxy m >

movntps:0F2B r Vxy m >

movntq:0FE7 r VQ m

movq2dq:F3)0FD6 r ^VQ Vx

movs:A4 r -bwlq

movsd
F2)0F10 r ^Vx >V V
F2)0F10 r m Vx >
F2)0F11 r Vx m >

movshdup:F3)0F16 r v Vxy >

movsldup:F3)0F12 r v Vxy >

movss
F3)0F10 r ^Vx >V V
F3)0F10 r m Vx >
F3)0F11 r Vx m >

movsx:0FBE r rb$w Rwlq

movsxd
63 r r Rw
63 r rL Rlq

movupd
66)0F10 r v Vxy >
66)0F11 r Vxy v >

movups
0F10 r v Vxy >
0F11 r Vxy v >

movzx:0FB6 r rb$w Rwlq

mpsadbw:66)0F3A42 r ib v >V Vxy

mul:F6 4 rbwlq

mulpd:66)0F59 r v >V Vxy

mulps:0F59 r v >V Vxy

mulsd:F2)0F59 r v >V Vx

mulss:F3)0F59 r v >V Vx

mulx:F2)0F38F6 r r >Rlq R

mwait:0F01C9

neg:F6 3 rbwlq

nop
90
0F1F 0 rwL

not:F6 2 rbwlq

out
E6 r R_0bwl ib
EE r R_0bwl R_2W

outs:6E r -bwl

pop
58 o RwQ
8F 0 mwQ
0FA1 r s_4
0FA9 r s_5

popf:9D r -wQ

por
0FEB r v VQ
66)0FEB r v >V Vxy

push
50 o RwQ
6A z-2 Ib~wl
FF 6 mwQ
0FA0 r s_4
0FA8 r s_5

pushf:9C r -wQ

ret
C3
C2 r IW

sahf:9E

sal:#shl

scas:AE r -bwlq

setssbsy:F3)0F01E8

sfence:0FAEF8

sgdt:0F01 0 mQ

sha1rnds4:0F3ACC r ib v Vx

sha1nexte:0F38C8 r v Vx

sha1msg1:0F38C9 r v Vx

sha1msg2:0F38CA r v Vx

sha256rnds2:0F38CB r V_0x v V

sha256msg1:0F38CC r v Vx

sha256msg2:0F38CD r v Vx

shld
0FA4 r ib Rwlq r
0FA5 r R_1b Rwlq r

shrd
0FAC r ib Rwlq r
0FAD r R_1b Rwlq r

stc:F9

std:FD

sti:FB

stmxcsr:0FAE 3 mL >

stos:AA r -bwlq

syscall:0F05

test
A8 r i R_0bwl
A9 r iL R_0q
F6 0 i rbwl
F7 0 iL rq
84 r Rbwlq r

vgatherdpd:vw 66)0F3892 r >Vxy Gx V

vgatherdps:66)0F3892 r >Vxy G V

vgatherqpd:vw 66)0F3893 r >Vxy G V

vgatherqps
66)0F3893 r >Vx G V
vl 66)0F3893 r >Vx Gy V

wait:9B

wbinvd:0F09

wbnoinvd:F3)0F09

wrfsbase:F3)0FAE 2 Rlq

wrgsbase:F3)0FAE 3 Rlq

wrmsr:0F30

wrpkru:0F01EF

wrss:0F38F6 r Rlq r

wruss:66)0F38F5 r Rlq r

xabort:C6F8 r ib

xadd:0FC0 r Rbwlq r

xbegin:C7F8 r Iwl

xchg
90 o R_0wlq R
90 o Rwlq R_0
86 r Rbwlq r
86 r r Rbwlq

xend:0F01D5

xgetbv:0F01D0

xlat:D7

xrstor:0FAE 5 mLq

xrstors:0FC7 3 mLq

xsave:0FAE 4 mLq

xsavec:0FC7 4 mLq

xsaveopt:0FAE 6 mLq

xsaves:0FC7 5 mLq

xsetbv:0F01D1

xtest:0F01D6`;
mnemonicStrings.split(/\n{2,}/).slice(1).forEach(x => { lines = x.split(/[\n:]/); mnemonics[lines.shift()] = lines; });


let hex = num => num.toString(16), dummy;

// Some extra mnemonics (these are easier to encode programatically as they're quite repetitive)
let arithmeticMnemonics = "add or adc sbb and sub xor cmp".split(' ');
arithmeticMnemonics.forEach((name, i) => {
    let opBase = i * 8;
    mnemonics[name] = [
        hex(opBase + 4) + " r i R_0bw",
        "83 " + i + " Ib rwlq",
        hex(opBase + 5) + " r iL R_0l",
        "80 " + i + " i rbwl",
        hex(opBase + 5) + " r iL R_0q",
        "81 " + i + " IL rq",
        hex(opBase) + " r Rbwlq r",
        hex(opBase + 2) + " r r Rbwlq"
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

// Adding conditional instructions
let conditionals = `o
no
b c nae
ae nb nc
e z
ne nz
be na
a nbe
s
ns
p pe
np po
l nge
ge nl
le ng
g nle`.split('\n');
conditionals.forEach((names, i) => {
    names = names.split(' ');
    let firstName = names.shift();

    // jxx instructions
    mnemonics['j' + firstName] = [
        hex(0x70 + i) + " r Ib",
        hex(0x0F80 + i) + " r Il"
    ];

    // cmovxx instructions
    mnemonics['cmov' + firstName] = [hex(0x0F40 + i) + " r r Rwlq"];

    // setxx instructions
    mnemonics['set' + firstName] = [hex(0x0F90 + i) + " 0 rB"]

    // Aliases
    names.forEach(name => {
        mnemonics['j' + name] = ['#j' + firstName];
        mnemonics['cmov' + name] = ['#cmov' + firstName];
        mnemonics['set' + name] = ["#set" + firstName]
    });
});

// FPU arithmetics
let fpuArithMnemonics = "add mul com comp sub subr div divr";
fpuArithMnemonics.split(' ').forEach((name, i) => {
    let list = ["D8 " + i + " ml", "DC " + i + " m$q"];
    mnemonics['fi' + name] = ["DA " + i + " ml", "DE " + i + " m$w"];

    if(i === 2 || i === 3) list.push("D8 " + i + " F", hex(0xD8C1 + i * 8));
    else
    {
        list.push("D8 " + i + " F F_0");
        if(i >= 4) i ^= 1;
        list.push("DC " + i + " F_0 F");
        mnemonics['f' + name + 'p'] = ["DE " + i + " F_0 F", hex(0xDEC1 + i * 8)];
    }

    mnemonics['f' + name] = list;
})