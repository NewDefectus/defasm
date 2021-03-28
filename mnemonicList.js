let lines;
let mnemonicStrings = `

adcx:66)0F38F6 r Rlq

addpd:66)0F58 v >V Vxyz {kzrBw

addps:0F58 v >V Vxyz {kzrb

addsd:F2)0F58 v >V Vx {kzrw

addss:F3)0F58 v >V Vx {kzr

addsubpd:66)0FD0 v >V Vxy

addsubps:F2)0FD0 v >V Vxy

adox:F3)0F38F6 r Rlq

aesdec:66)0F38DE v >V Vxyz {

aesdeclast:66)0F38DF v >V Vxyz {

aesenc:66)0F38DC v >V Vxyz {

aesenclast:66)0F38DD v >V Vxyz {

aesimc:66)0F38DB v Vx >

aeskeygenassist:66)0F3ADF ib v Vx >

andn:0F38F2 r >Rlq R

andpd:66)0F54 v >V Vxyz {kzBw

andps:0F54 v >V Vxyz {kzb

andnpd:66)0F55 v >V Vxyz {kzBw

andnps:0F55 v >V Vxyz {kzb

bextr:0F38F7 >Rlq r R

blendpd:66)0F3A0D ib v >V Vxy

blendps:66)0F3A0C ib v >V Vxy

blendvpd
66)0F3815 V_0x v V
v 66)0F3A4B <Vxy v >V V

blendvps
66)0F3814 V_0x v V
v 66)0F3A4A <Vxy v >V V

blsi:0F38F3.3 r >Rlq

blsmsk:0F38F3.2 r >Rlq

blsr:0F38F3.1 r >Rlq

bndcl:F3)0F1A rQ B

bndcn:F2)0F1B rQ B

bndcu:F2)0F1A rQ B

bndldx:0F1A mQ B

bndmk:F3)0F1B mQ B

bndmov
66)0F1A b B
66)0F1B B b

bndstx:0F1B B mQ

bsf:0FBC r Rwlq

bsr:0FBD r Rwlq

bswap:0FC8.o Rlq

bt
0FA3 Rwlq r
0FBA.4 ib rwlq

btc
0FBB Rwlq r
0FBA.7 ib rwlq

btr
0FB3 Rwlq r
0FBA.6 ib rwlq

bts
0FAB Rwlq r
0FBA.5 ib rwlq

bzhi:0F38F5 Rlq r >R

call
E8 Il
FF.2 rQ

cbtw:66)98

cltd:99

cltq:48)98

clac:0F01CA

clc:F8

cld:FC

cldemote:0F1C.0 mB

clflush:0FAE.7 mB

clflushopt:66)0FAE.7 mB

cli:FA

clrssbsy:F3)0FAE.6 mQ

clts:0F06

clwb:66)0FAE.6 mB

cmc:F5

cmppd
66)0FC2 ib v >V Vxy
66)0FC2 ib v >Vxyz *KB {kBsfw

cmpps
0FC2 ib v >V Vxy
0FC2 ib v >Vxyz *KB {kbsf

cmps:A6 -bwlq

cmpsd
F2)0FC2 ib v >V Vx
F2)0FC2 ib v >Vx *KB {ksfw

cmpss
F3)0FC2 ib v >V Vx
F3)0FC2 ib v >Vx *KB {ksf

cmpxchg:0FB0 Rbwlq r

cmpxchg8b:0FC7.1 mQ

cmpxchg16b:0FC7.1 m#q

comisd:66)0F2F v Vx > {sw

comiss:0F2F v Vx > {s

cpuid:0FA2

crc32
F2)0F38F0 rbwl RL
F2)0F38F0 rbq Rq

cvtdq2pd:F3)0FE6 v/ Vxyz > {kzb

cvtdq2ps:0F5B v Vxyz > {kzbr

cvtpd2dq:F2)0FE6 vXyz V/ > {kzBrw

cvtpd2pi:66)0F2D vX VQ

cvtpd2ps:66)0F5A vXyz V/ > {kzBrw

cvtpi2pd:66)0F2A vQ Vx

cvtpi2ps:0F2A vQ Vx

cvtps2dq:66)0F5B v Vxyz > {kzbr

cvtps2pd:0F5A v/ Vxyz > {kzbs

cvtps2pi:0F2D vX VQ

cvtsd2si:F2)0F2D v#x Rlq > {r

cvtsd2ss:F2)0F5A vX >Vx Vx {kzrw

cvtsi2sd:F2)0F2A rlq >Vx Vx {r

cvtsi2ss:F3)0F2A rlq >Vx Vx {r

cvtss2sd:F3)0F5A v >Vx Vx {kzs

cvtss2si:F3)0F2D v#x Rlq > {r

cvttpd2dq:66)0FE6 vXyz V/ > {kzBsw

cvttpd2pi:66)0F2C vX VQ

cvttps2dq:F3)0F5B v Vxyz > {kzbs

cvttps2pi:0F2C vX VQ

cvttsd2si:F2)0F2C v#x Rlq > {s

cvtss2si:F3)0F2C v#x Rlq > {s

cqto:48)99

cwtd:66)99

cwtl:98

dec:FE.1 rbwlq

div:F6.6 rbwlq

divpd:66)0F5E v >V Vxyz {kzBwr

divps:0F5E v >V Vxyz {kzbr

divsd:F2)0F5E v >V Vx {kzwr

divss:F3)0F5E v >V Vx {kzr

dppd:66)0F3A41 ib v >V Vx

dpps:66)0F3A40 ib v >V Vxy

emms:0F77

endbr32:F3)0F1EFB

endbr64:F3)0F1EFA

enter:C8 ib iW

extractps:66)0F3A17 ib Vx rL > {

f2xm1:D9F0

fabs:D9E1

fbld:DF.4 mQ

fbstp:DF.6 mQ

fchs:D9E0

fclex:9BDBE2

fcmovb:DA.0 F F_0

fcmove:DA.1 F F_0

fcmovbe:DA.2 F F_0

fcmovu:DA.3 F F_0

fcmovnb:DB.0 F F_0

fcmovne:DB.1 F F_0

fcmovnbe:DB.2 F F_0

fcmovnu:DB.3 F F_0

fcompp:DED9

fcomi:DB.6 F F_0

fcomip:DF.6 F F_0

fcos:D9FF

fdecstp:D9F6

ffree:DD.0 F

fild
DF.0 mW
DB.0 ml
DF.5 mQ

fimul
DA.1 ml
DE.1 mW

fincstp:D9F7

finit:9BDBE3

fist
DB.2 ml
DF.2 mW

fistp
DB.3 ml
DF.3 mW
DF.7 mQ

fisttp
DB.1 ml
DF.1 mW
DD.1 mQ

fisub
DA.4 ml
DE.4 mW

fisubr
DA.5 ml
DE.5 mW

fld
D9.0 ml
DD.0 mQ
D9.0 F

fld1:D9E8

fldl2t:D9E9

fldl2e:D9EA

fldpi:D9EB

fldlg2:D9EC

fldln2:D9ED

fldt:DB.5 mQ

fldz:D9EE

fldcw:D9.5 mW

fldenv:D9.4 mL

fmul
D8.1 ml
DC.1 mQ
D8.1 F F_0
DC.1 F_0 F

fmulp
DE.1 F_0 F
DEC9

fnclex:DBE2

fninit:DBE3

fnop:D9D0

fnsave:DD.6 mQ

fnstcw:D9.7 mW

fnstenv:D9.6 mL

fnstsw
DD.7 mW
DFE0 R_0W

fpatan:D9F3

fprem:D9F8

fprem1:D9F5

fptan:D9F2

frndint:D9FC

frstor:DD.4 mQ

fsave:9BDD.6 mQ

fscale:D9FD

fsin:D9FE

fsincos:D9FB

fsqrt:D9FA

fst
D9.2 ml
DD.2 mQ
DD.2 F

fstcw:9BD9.7 mW

fstenv:9BD9.6 mL

fstp
D9.3 ml
DD.3 mQ
DD.3 F

fstpt:DB.7 mQ

fstsw
9BDD.7 mW
9BDFE0 R_0W

ftst:D9E4

fucom
DD.4 F
DDE1

fucomp
DD.5 F
DDE9

fucompp:DAE9

fucomi:DB.5 F F_0

fucomip:DF.5 F F_0

fwait:#wait

fxam:D9E5

fxch
D9.1 F
D9C9

fxrstor:0FAE.1 mQ

fxrstor64:0FAE.1 m#q

fxsave:0FAE.0 mQ

fxsave64:0FAE.0 m#q

fxtract:D9F4

fyl2x:D9F1

fyl2xp1:D9F9

gf2p8affineinvqb:66)0F3ACF ib v >V Vxyz {kzBw

gf2p8affineqb:66)0F3ACE ib v >V Vxyz {kzBw

gf2p8mulb:66)0F38CF v >V Vxyz {kz

haddpd:66)0F7C v >V Vxy

haddps:F2)0F7C v >V Vxy

hlt:F4

hsubpd:66)0F7D v >V Vxy

hsubps:F2)0F7D v >V Vxy

idiv:F6.7 rbwlq

imul
F6.5 rbwlq
0FAF r Rwlq
6B ib r Rwlq
69 iw rw Rw
69 il r Rlq

in
E4 ib R_0bwl
EC R_2W R_0bwl

inc:FE.0 rbwlq

incsspd:F3)0FAE.5 Rl

incsspq:F3)0FAE.5 Rq

ins:6C -bwl

insertps:66)0F3A21 ib v >V Vx {

int
CC i_3b
F1 i_1b
CD ib

int1:F1

int3:CC

invd:0F08

invlpg:0F01.7 mB

invpcid:66)0F3882 mQ RQ

iret:CF -Lq

jecxz:67)E3 Ib

jmp
EB-2 Ibl
FF.4 rQ

jrcxz:E3 Ib

kadd:vl 0F4A ^Kbwlq >K K

kand:vl 0F41 ^Kbwlq >K K

kandn:vl 0F42 ^Kbwlq >K K

kmov
0F90 k Kbwlq >
0F91 Kbwlq m >
0F92 ^Rl Kbwl >
0F92 ^Rq Kq >
0F93 ^Kbwl Rl >
0F93 ^Kq Rq >

knot:0F44 ^Kbwlq K >

kor:vl 0F45 ^Kbwlq >K K

kortest:0F98 ^Kbwlq K >

kshiftl:66)0F3A32 iB ^Kbwlq K >

kshiftr:66)0F3A30 iB ^Kbwlq K >

ktest:0F99 ^Kbwlq K >

kunpckbw:vl 0F4B ^K#b >K K

kunpckdq:vl 0F4B ^K#q >K K

kunpckwd:vl 0F4B ^K#w >K K

kxnor:vl 0F46 ^Kbwlq >K K

kxor:vl 0F47 ^Kbwlq >K K

lahf:9F

lar:0F02 rW Rwlq

lddqu:F2)0FF0 m Vxy >

ldmxcsr:0FAE.2 mL >

lea:8D m Rwlq

leave:C9

lfence:0FAEE8

lgdt:0F01.2 mL

lidt:0F01.3 mL

lfs:0FB4 m Rwlq

lgs:0FB5 m Rwlq

lldt:0F00.2 rW

lmsw:0F01.6 rW

lods:AC -bwlq

loop:E2 Ib

loope:E1 Ib

loopne:E0 Ib

lsl:0F03 rW Rwlq

lss:0FB2 m Rwlq

ltr:0F00.3 rW

lzcnt:F3)0FBD r Rwlq

maskmovdqu:66)0FF7 ^Vx V >

maskmovq:0FF7 ^VQ V

maxpd:66)0F5F v >V Vxyz {kzBsw

maxps:0F5F v >V Vxyz {kzbs

maxsd:F2)0F5F v >V Vx {kzsw

maxss:F3)0F5F v >V Vx {kzs

mfence:0FAEF0

minpd:66)0F5D v >V Vxyz {kzBsw

minps:0F5D v >V Vxyz {kzbs

minsd:F2)0F5D v >V Vx {kzsw

minss:F3)0F5D v >V Vx {kzs

monitor:0F01C8

mov
88 Rbwlq r
8A r Rbwlq
C7.0 Il Rq
C7.0 iL mq
B0+8.o i Rbwlq
C6.0 i rbwl
0F6E r~l~q VQ
0F7E VQ r~l~q
66)0F6E r~l~q VX > {
66)0F7E VX r~l~q > {
0F6F v V~$q
0F7F V~$q v
F3)0F7E -$q v Vx > {w
66)0FD6 -$q Vx v > {w
8C s Rwlq
8C s mW
8E Rwlq s
8E mW s
0F20 C ^RQ
0F21 D ^RQ
0F22 ^RQ C
0F23 ^RQ D

movapd
66)0F28 v Vxyz > {kzw
66)0F29 Vxyz v > {kzw

movaps
0F28 v Vxyz > {kz
0F29 Vxyz v > {kz

movbe
0F38F0 m Rwlq
0F38F1 Rwlq m

movddup:F2)0F12 v Vxyz > {kzw

movdiri:0F38F9 Rlq m

movdir64b:66)0F38F8 m Rwlq

movdqa
66)0F6F v Vxy >
66)0F7F Vxy v >

movdqu
F3)0F6F v Vxy >
F3)0F7F Vxy v >

movdq2q:F2)0FD6 ^Vx VQ

movhlps:0F12 ^Vx >V V {

movhpd
66)0F16 m >V Vx {w
66)0F17 Vx m > {w

movhps
0F16 m >V Vx {
0F17 Vx m > {

movlhps:0F16 ^Vx >V V {

movlpd
66)0F12 m >V Vx {w
66)0F13 Vx m > {w

movlps
0F12 m >V Vx {
0F13 Vx m > {

movmskpd:66)0F50 ^Vxy R! >

movmskps:0F50 ^Vxy R! >

movntdqa:66)0F382A m Vxyz > {

movntdq:66)0FE7 Vxyz m > {

movnti:0FC3 Rlq m

movntpd:66)0F2B Vxyz m > {w

movntps:0F2B Vxyz m > {

movntq:0FE7 VQ m

movq2dq:F3)0FD6 ^VQ Vx

movs:A4 -bwlq

movsd
F2)0F10 ^Vx >V V {kzw
F2)0F10 m Vx > {kzw
F2)0F11 Vx m > {kw

movshdup:F3)0F16 v Vxyz > {kz

movsldup:F3)0F12 v Vxy > {kz

movss
F3)0F10 ^Vx >V V {kz
F3)0F10 m Vx > {kz
F3)0F11 Vx m > {k

movsx:0FBE rb$w Rwlq

movsxd
63 r Rw
63 rL Rlq

movupd
66)0F10 v Vxyz > {kzw
66)0F11 Vxyz v > {kzw

movups
0F10 v Vxy > {kz
0F11 Vxy v > {kz

movzx:0FB6 rb$w Rwlq

mpsadbw:66)0F3A42 ib v >V Vxy

mul:F6.4 rbwlq

mulpd:66)0F59 v >V Vxyz {kzBrw

mulps:0F59 v >V Vxyz {kzbr

mulsd:F2)0F59 v >V Vx {kzrw

mulss:F3)0F59 v >V Vx {kzr

mulx:F2)0F38F6 r >Rlq R

mwait:0F01C9

neg:F6.3 rbwlq

nop
90
0F1F.0 rwL

not:F6.2 rbwlq

out
E6 R_0bwl ib
EE R_0bwl R_2W

outs:6E -bwl

pcmpestri:66)0F3A61 ib v Vx >

pcmpestrm:66)0F3A60 ib v Vx >

pcmpistri:66)0F3A63 ib v Vx >

pcmpistrm:66)0F3A62 ib v Vx >

pop
58.o RwQ
8F.0 mwQ
0FA1 s_4
0FA9 s_5

popf:9D -wQ

por
0FEB v VQ
66)0FEB v >V Vxy

push
50.o RwQ
6A-2 Ib~wl
FF.6 mwQ
0FA0 s_4
0FA8 s_5

pushf:9C -wQ

ret
C3
C2 IW

sahf:9E

sal:#shl

scas:AE -bwlq

setssbsy:F3)0F01E8

sfence:0FAEF8

sgdt:0F01.0 mQ

sha1rnds4:0F3ACC ib v Vx

sha1nexte:0F38C8 v Vx

sha1msg1:0F38C9 v Vx

sha1msg2:0F38CA v Vx

sha256rnds2:0F38CB V_0x v V

sha256msg1:0F38CC v Vx

sha256msg2:0F38CD v Vx

shld
0FA4 ib Rwlq r
0FA5 R_1b Rwlq r

shrd
0FAC ib Rwlq r
0FAD R_1b Rwlq r

stc:F9

std:FD

sti:FB

stmxcsr:0FAE.3 mL >

stos:AA -bwlq

swapgs:0F01F8

syscall:0F05

sysenter:0F34

sysexit:0F35 -Lq

sysret:0F07 -Lq

test
A8 i R_0bwl
A9 iL R_0q
F6.0 i rbwl
F7.0 iL rq
84 Rbwlq r

vgatherdpd:vw 66)0F3892 >Vxy Gx V

vgatherdps:66)0F3892 >Vxy G V

vgatherqpd:vw 66)0F3893 >Vxy G V

vgatherqps
66)0F3893 >Vx G V
vl 66)0F3893 >Vx Gy V

vmovdqa32
66)0F6F v Vxyz > {kzf
66)0F7F Vxyz v > {kzf

vmovdqa64
66)0F6F v Vxyz > {kzfw
66)0F7F Vxyz v > {kzfw

vmovdqu8
F2)0F6F v Vxyz > {kzf
F2)0F7F Vxyz v > {kzf

vmovdqu16
F2)0F6F v Vxyz > {kzfw
F2)0F7F Vxyz v > {kzfw

vmovdqu32
F3)0F6F v Vxyz > {kzf
F3)0F7F Vxyz v > {kzf

vmovdqu64
F3)0F6F v Vxyz > {kzfw
F3)0F7F Vxyz v > {kzfw

wait:9B

wbinvd:0F09

wbnoinvd:F3)0F09

wrfsbase:F3)0FAE.2 Rlq

wrgsbase:F3)0FAE.3 Rlq

wrmsr:0F30

wrpkru:0F01EF

wrss:0F38F6 Rlq r

wruss:66)0F38F5 Rlq r

xabort:C6F8 ib

xadd:0FC0 Rbwlq r

xbegin:C7F8 Iwl

xchg
90.o R_0wlq R
90.o Rwlq R_0
86 Rbwlq r
86 r Rbwlq

xend:0F01D5

xgetbv:0F01D0

xlat:D7

xrstor:0FAE.5 mLq

xrstors:0FC7.3 mLq

xsave:0FAE.4 mLq

xsavec:0FC7.4 mLq

xsaveopt:0FAE.6 mLq

xsaves:0FC7.5 mLq

xsetbv:0F01D1

xtest:0F01D6`;
mnemonicStrings.split(/\n{2,}/).slice(1).forEach(x => { lines = x.split(/[\n:]/); mnemonics[lines.shift()] = lines; });


let hex = num => num.toString(16), dummy;

// Some extra mnemonics (these are easier to encode programatically as they're quite repetitive)
let arithmeticMnemonics = "add or adc sbb and sub xor cmp".split(' ');
arithmeticMnemonics.forEach((name, i) => {
    let opBase = i * 8;
    mnemonics[name] = [
        hex(opBase + 4) + " i R_0bw",
        "83." + i + " Ib rwlq",
        hex(opBase + 5) + " iL R_0l",
        "80." + i + " i rbwl",
        hex(opBase + 5) + " iL R_0q",
        "81." + i + " IL rq",
        hex(opBase) + " Rbwlq r",
        hex(opBase + 2) + " r Rbwlq"
    ];
});

// Shift mnemonics
let shiftMnemonics = `rol ror rcl rcr shl shr  sar`.split(' ');
shiftMnemonics.forEach((name, i) => {
    if(name)
        mnemonics[name] = [
            "D0." + i + " i_1 rbwlq",
            "D2." + i + " R_1b rbwlq",
            "C0." + i + " ib rbwlq"
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
        hex(0x70 + i) + " Ib",
        hex(0x0F80 + i) + " Il"
    ];

    // cmovxx instructions
    mnemonics['cmov' + firstName] = [hex(0x0F40 + i) + " Rwlq"];

    // setxx instructions
    mnemonics['set' + firstName] = [hex(0x0F90 + i) + ".0 rB"]

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
    let list = ["D8." + i + " ml", "DC." + i + " m$q"];
    mnemonics['fi' + name] = ["DA." + i + " ml", "DE." + i + " m$w"];

    if(i === 2 || i === 3) list.push("D8." + i + " F", hex(0xD8C1 + i * 8));
    else
    {
        list.push("D8." + i + " F F_0");
        if(i >= 4) i ^= 1;
        list.push("DC." + i + " F_0 F");
        mnemonics['f' + name + 'p'] = ["DE." + i + " F_0 F", hex(0xDEC1 + i * 8)];
    }

    mnemonics['f' + name] = list;
})