(() => {
  // directives.js
  var DIRECTIVE_BUFFER_SIZE = 15;
  function Directive() {
    this.bytes = new Uint8Array(DIRECTIVE_BUFFER_SIZE);
    this.length = 0;
  }
  Directive.prototype.genByte = function(byte2) {
    this.bytes[this.length++] = Number(byte2 & 0xffn);
    if (this.length === this.bytes.length) {
      let temp = new Uint8Array(this.bytes.length + DIRECTIVE_BUFFER_SIZE);
      temp.set(this.bytes);
      this.bytes = temp;
    }
  };
  var encoder = new TextEncoder();
  var directives = {
    byte: (result) => {
      do {
        result.genByte(parseImmediate());
      } while (token === ",");
    },
    string: (result) => {
      if (next().length > 1 && token[0] === '"' && token[token.length - 1] === '"') {
        result.bytes = encoder.encode(eval(token));
        result.length = result.bytes.length;
      } else
        throw "Expected string";
      if (next() !== ";" && token !== "\n")
        throw "Expected end of line";
    }
  };
  function parseDirective() {
    let result = new Directive();
    let dir = token.slice(1);
    if (directives.hasOwnProperty(dir)) {
      try {
        directives[dir](result);
      } catch (e) {
        if (result.length == 0)
          throw e;
        console.warn(e);
      }
    }
    return result;
  }

  // mnemonicList.js
  var lines;
  var mnemonicStrings = `
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
andn:V 0F38F2 r >Rlq R

andpd:66)0F54 v >V Vxyz {kzBw
andps:0F54 v >V Vxyz {kzb

andnpd:66)0F55 v >V Vxyz {kzBw
andnps:0F55 v >V Vxyz {kzb

bextr:V 0F38F7 >Rlq r R

blendpd:66)0F3A0D ib v >V Vxy
blendps:66)0F3A0C ib v >V Vxy

blendvpd
66)0F3815 V_0x v V
v 66)0F3A4B <Vxy v >V V

blendvps
66)0F3814 V_0x v V
v 66)0F3A4A <Vxy v >V V

blsi:V 0F38F3.3 r >Rlq
blsmsk:V 0F38F3.2 r >Rlq
blsr:V 0F38F3.1 r >Rlq
bndcl:V F3)0F1A rQ B
bndcn:F2)0F1B rQ B
bndcu:F2)0F1A rQ B
bndldx:0F1A m B
bndmk:F3)0F1B m B

bndmov
66)0F1A b B
66)0F1B B b

bndstx:0F1B B m
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

bzhi:V 0F38F5 Rlq r >R

call
E8 Il
FF.2 rQ

cbtw:66)98
cltd:99
cltq:48)98
clac:0F01CA
clc:F8
cld:FC
cldemote:0F1C.0 m
clflush:0FAE.7 m
clflushopt:66)0FAE.7 m
cli:FA
clrssbsy:F3)0FAE.6 m
clts:0F06
clwb:66)0FAE.6 m
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
cmpxchg8b:0FC7.1 m
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
fbld:DF.4 m
fbstp:DF.6 m
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
DF.0 m$w
DB.0 ml
DF.5 m$q

fincstp:D9F7
finit:9BDBE3

fist
DB.2 ml
DF.2 m$w

fistp
DB.3 ml
DF.3 m$w
DF.7 m$q

fisttp
DB.1 ml
DF.1 m$w
DD.1 m$q

fld
D9.0 ml
DD.0 m$q
DB.5 mt
D9.0 F

fld1:D9E8
fldl2t:D9E9
fldl2e:D9EA
fldpi:D9EB
fldlg2:D9EC
fldln2:D9ED
fldz:D9EE
fldcw:D9.5 m
fldenv:D9.4 m
fnclex:DBE2
fninit:DBE3
fnop:D9D0
fnsave:DD.6 m
fnstcw:D9.7 m
fnstenv:D9.6 m

fnstsw
DD.7 m
DFE0 R_0W

fpatan:D9F3
fprem:D9F8
fprem1:D9F5
fptan:D9F2
frndint:D9FC
frstor:DD.4 m
fsave:9BDD.6 m
fscale:D9FD
fsin:D9FE
fsincos:D9FB
fsqrt:D9FA

fst
D9.2 ml
DD.2 m$q
DD.2 F

fstcw:9BD9.7 m
fstenv:9BD9.6 m

fstp
D9.3 ml
DD.3 m$q
DD.3 F

fstpt:DB.7 m

fstsw
9BDD.7 m
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

fxrstor:0FAE.1 m
fxrstor64:0FAE.1 m#q
fxsave:0FAE.0 m
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
incssp:F3)0FAE.5 R~l~q
ins:6C -bwl
insertps:66)0F3A21 ib v >V Vx {

int
CC i_3b
F1 i_1b
CD ib

int1:F1
int3:CC
invd:0F08
invlpg:0F01.7 m
invpcid:66)0F3882 m RQ
iret:CF -wLq
jecxz:67)E3 Ib

jmp
EB-2 Ibl
FF.4 rQ

jrcxz:E3 Ib

kadd:Vl 0F4A ^Kbwlq >K K
kand:Vl 0F41 ^Kbwlq >K K
kandn:Vl 0F42 ^Kbwlq >K K

kmov
V 0F90 k Kbwlq >
V 0F91 Kbwlq m >
V 0F92 ^Rl Kbwl >
V 0F92 ^Rq Kq >
V 0F93 ^Kbwl Rl >
V 0F93 ^Kq Rq >

knot:V 0F44 ^Kbwlq K >
kor:Vl 0F45 ^Kbwlq >K K
kortest:V 0F98 ^Kbwlq K >
kshiftl:V 66)0F3A32 iB ^Kbwlq K >
kshiftr:V 66)0F3A30 iB ^Kbwlq K >
ktest:V 0F99 ^Kbwlq K >
kunpckbw:Vl 0F4B ^K#b >K K
kunpckdq:Vl 0F4B ^K#q >K K
kunpckwd:Vl 0F4B ^K#w >K K
kxnor:Vl 0F46 ^Kbwlq >K K
kxor:Vl 0F47 ^Kbwlq >K K

lahf:9F
lar:0F02 rW Rwlq
lddqu:F2)0FF0 m Vxy >
ldmxcsr:0FAE.2 m >
lea:8D m Rwlq
leave:C9
lfence:0FAEE8
lgdt:0F01.2 m
lidt:0F01.3 m
ljmp:FF.5 m
lfs:0FB4 m Rwlq
lgs:0FB5 m Rwlq
lldt:0F00.2 rW
lmsw:0F01.6 rW
lods:AC -bwlq
loop:E2 Ib
loope:E1 Ib
loopne:E0 Ib

lret
CB
CA i$w

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
8C s m
8E Rwlq s
8E m s
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

movdqa32
66)0F6F v Vxyz > {kzf
66)0F7F Vxyz v > {kzf

movdqa64
66)0F6F v Vxyz > {kzfw
66)0F7F Vxyz v > {kzfw

movdqu
F3)0F6F v Vxy >
F3)0F7F Vxy v >

movdqu8
F2)0F6F v Vxyz > {kzf
F2)0F7F Vxyz v > {kzf

movdqu16
F2)0F6F v Vxyz > {kzfw
F2)0F7F Vxyz v > {kzfw

movdqu32
F3)0F6F v Vxyz > {kzf
F3)0F7F Vxyz v > {kzf

movdqu64
F3)0F6F v Vxyz > {kzfw
F3)0F7F Vxyz v > {kzfw

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

mulx:V F2)0F38F6 r >Rlq R
mwait:0F01C9

neg:F6.3 rbwlq

nop
90
0F1F.0 rwL

not:F6.2 rbwlq

orpd:66)0F56 v >V Vxyz {kzBw
orps:0F56 v >V Vxyz {kzb

out
E6 R_0bwl ib
EE R_0bwl R_2W

outs:6E -bwl

pabsb:0F381C v Vqxyz > {kz
pabsd:0F381E v Vqxyz > {kzb
pabsq:66)0F381F v Vxyz > {kzBwf
pabsw:0F381D v Vqxyz > {kz

packssdw:0F6B v >V Vqxyz {kzb
packsswb:0F63 v >V Vqxyz {kz
packusdw:66)0F382B v >V Vxyz {kzb
packuswb:0F67 v >V Vqxyz {kz

paddb:0FFC v >V Vqxyz {kz
paddd:0FFE v >V Vqxyz {kbz
paddq:0FD4 v >V Vqxyz {kBzw
paddw:0FFD v >V Vqxyz {kz

paddsb:0FEC v >V Vqxyz {kz
paddsw:0FED v >V Vqxyz {kz
paddusb:0FDC v >V Vqxyz {kz
paddusw:0FDD v >V Vqxyz {kz

palignr:0F3A0F ib v >V Vqxyz {kz

pand:0FDB v >V Vqxy
pandd:66)0FDB v >V Vxyz {kzbf
pandq:66)0FDB v >V Vxyz {kzBwf

pandn:0FDF v >V Vqxy
pandnd:66)0FDF v >V Vxyz {kzbf
pandnq:66)0FDF v >V Vxyz {kzBwf

pause:F3)90

pavgb:0FE0 v >V Vqxyz {kz
pavgw:0FE3 v >V Vqxyz {kz

pblendvb
66)0F3810 V_0x v V
v 66)0F3A4C <Vxy v >V V

pblendw:66)0F3A0E ib v >V Vxy
pclmulqdq:66)0F3A44 ib v >V Vxyz {

pcmpeqb
0F74 v >V Vqxy
66)0F74 v >Vxyz *KB {kf

pcmpeqd
0F76 v >V Vqxy
66)0F76 v >Vxyz *KB {kbf

pcmpeqw
0F75 v >V Vqxy
66)0F75 v >Vxyz *KB {kf

pcmpeqq
66)0F3829 v >V Vxy
66)0F3829 v >Vxyz *KB {kBwf

pcmpestri:66)0F3A61 ib v Vx >

pcmpestrm:66)0F3A60 ib v Vx >

pcmpgtb
0F64 v >V Vqxy
66)0F64 v >Vxyz *KB {kf

pcmpgtd
0F66 v >V Vqxy
66)0F66 v >Vxyz *KB {kbf

pcmpgtq
66)0F3837 v >V Vxy
66)0F3837 v >Vxyz *KB {kBwf

pcmpgtw
0F65 v >V Vqxy
66)0F65 v >Vxyz *KB {kf

pcmpistri:66)0F3A63 ib v Vx >
pcmpistrm:66)0F3A62 ib v Vx >

pdep:V F2)0F38F5 r >Rlq R
pext:V F3)0F38F5 r >Rlq R

pextrb:66)0F3A14 ib Vx r! > {
pextrd:66)0F3A16 ib Vx rL > {

pextrw
0FC5 ib ^Vqx R! > {
66)0F3A15 ib Vx m > {

pextrq:66)0F3A16 ib Vx rq > {

phaddw:0F3801 v >V Vqxy
phaddd:0F3802 v >V Vqxy
phaddsw:0F3803 v >V Vqxy

phminposuw:66)0F3841 v Vx >

phsubd:0F3806 v >V Vqxy
phsubsw:0F3807 v >V Vqxy
phsubw:0F3805 v >V Vqxy

pinsrb:66)0F3A20 ib rL >Vx Vx {
pinsrd:66)0F3A22 ib rL >Vx Vx {
pinsrq:66)0F3A22 ib r#q >Vx Vx {
pinsrw:0FC4 ib *rL >V Vqx {

pmaddubsw:0F3804 v >V Vqxyz {kz
pmaddwd:0FF5 v >V Vqxyz {kz

pmaxq:66)0F383D v >V Vxyz {kzBwf
pmaxsb:66)0F383C v >V Vxyz {kz
pmaxsd:66)0F383D v >V Vxyz {kzb
pmaxsw:0FEE v >V Vqxyz {kz

pmaxub:0FDE v >V Vqxyz {kz
pmaxud:66)0F383F v >V Vxyz {kzb
pmaxuq:66)0F383F v >V Vxyz {kzBwf
pmaxuw:66)0F383E v >V Vxyz {kz

pminq:66)0F3839 v >V Vxyz {kzBwf
pminsb:66)0F3838 v >V Vxyz {kz
pminsw:0FEA v >V Vqxyz {kz
pminsd:66)0F3839 v >V Vxyz {kzb

pminub:0FDA v >V Vqxyz {kz
pminud:66)0F383B v >V Vxyz {kzb
pminuq:66)0F383B v >V Vxyz {kzBwf
pminuw:66)0F383A v >V Vxyz {kz

pmovmskb:0FD7 ^Vqxy R! >
pmovsxbw:66)0F3820 v/ Vxyz > {kz
pmovsxbd:66)0F3821 vX Vxyz > {kz
pmovsxbq:66)0F3822 vX Vxyz > {kz
pmovsxwd:66)0F3823 v/ Vxyz > {kz
pmovsxwq:66)0F3824 vX Vxyz > {kz
pmovsxdq:66)0F3825 v/ Vxyz > {kz

pmovzxbw:66)0F3830 v/ Vxyz > {kz
pmovzxbd:66)0F3831 vX Vxyz > {kz
pmovzxbq:66)0F3832 vX Vxyz > {kz
pmovzxwd:66)0F3833 v/ Vxyz > {kz
pmovzxwq:66)0F3834 vX Vxyz > {kz
pmovzxdq:66)0F3835 v/ Vxyz > {kz

pmuldq:66)0F3828 v >V Vxyz {kzBw

pmulhrsw:0F380B v >V Vqxyz {kz
pmulhuw:0FE4 v >V Vqxyz {kz
pmulhw:0FE5 v >V Vqxyz {kz

pmulld:66)0F3840 v >V Vxyz {kzb
pmullq:66)0F3840 v >V Vxyz {kzBfw
pmullw:0FD5 v >V Vqxyz {kz
pmuludq:0FF4 v >V Vqxyz {kzBw

pop
58.o RwQ
8F.0 mwQ
0FA1 s_4
0FA9 s_5

popcnt:F3)0FB8 r Rwlq
popf:9D -wQ

por:0FEB v >V Vqxy
pord:66)0FEB v >Vxyz V {kzbf
porq:66)0FEB v >Vxyz V {kzBwf

prefetcht0:0F18.1 m
prefetcht1:0F18.2 m
prefetcht2:0F18.3 m
prefetchnta:0F18.0 m
prefetchw:0F0D.1 m

psadbw:0FF6 v >V Vqxyz {

pshufb:0F3800 v >V Vqxyz {kz
pshufd:66)0F70 ib v Vxyz > {kzb
pshufhw:F3)0F70 ib v Vxyz > {kz
pshuflw:F2)0F70 ib v Vxyz > {kz
pshufw:0F70 ib v VQ

psignb:0F3808 v >V Vqxy
psignd:0F380A v >V Vqxy
psignw:0F3809 v >V Vqxy

pslldq
66)0F73.7 ib Vxy >V
66)0F73.7 ib v >Vxyz {f

pslld
0FF2 vQ VQ
66)0FF2 *vX >V Vxyz {kz
0F72.6 ib Vqxy >V
66)0F72.6 ib v >Vxyz {kzbf

psllq
0FF3 vQ VQ
66)0FF3 *vX >V Vxyz {kzw
0F73.6 ib Vqxy >V
66)0F73.6 ib v >Vxyz {kzBfw

psllw
0FF1 vQ VQ
66)0FF1 *vX >V Vxyz {kz
0F71.6 ib Vqxy >V
66)0F71.6 ib v >Vxyz {kzf

psrad
0FE2 vQ VQ
66)0FE2 *vX >V Vxyz {kz
0F72.4 ib Vqxy >V
66)0F72.4 ib v >Vxyz {kzbf

psraq
66)0FE2 *vX >V Vxyz {kzwf
66)0F72.4 ib v >Vxyz {kzBfw

psraw
0FE1 vQ VQ
66)0FE1 *vX >V Vxyz {kz
0F71.4 ib Vqxy >V
66)0F71.4 ib v >Vxyz {kzf

psrldq
66)0F73.3 ib Vxy >V
66)0F73.3 ib v >Vxyz {f

psrld
0FD2 vQ VQ
66)0FD2 *vX >V Vxyz {kz
0F72.2 ib Vqxy >V
66)0F72.2 ib v >Vxyz {kzbf

psrlq
0FD3 vQ VQ
66)0FD3 *vX >V Vxyz {kzw
0F73.2 ib Vqxy >V
66)0F73.2 ib v >Vxyz {kzBfw

psrlw
0FD1 vQ VQ
66)0FD1 *vX >V Vxyz {kz
0F71.2 ib Vqxy >V
66)0F71.2 ib v >Vxyz {kzf

psubb:0FF8 v >V Vqxyz {kz
psubd:0FFA v >V Vqxyz {kzb
psubq:0FFB v >V Vqxyz {kzBw
psubw:0FF9 v >V Vqxyz {kz

psubsb:0FE8 v >V Vqxyz {kz
psubsw:0FE9 v >V Vqxyz {kz
psubusb:0FD8 v >V Vqxyz {kz
psubusw:0FD9 v >V Vqxyz {kz

ptest:66)0F3817 v Vxy >
ptwrite:F3)0FAE.4 rlq

punpckhbw:0F68 v >V Vqxyz {kz
punpckhwd:0F69 v >V Vqxyz {kz
punpckhdq:0F6A v >V Vqxyz {kzb
punpckhqdq:66)0F6D v >V Vxyz {kzBw

punpcklbw:0F60 v >V Vqxyz {kz
punpcklwd:0F61 v >V Vqxyz {kz
punpckldq:0F62 v >V Vqxyz {kzb
punpcklqdq:66)0F6C v >V Vxyz {kzBw

push
50.o RwQ
6A-2 Ib~wl
FF.6 mwQ
0FA0 s_4
0FA8 s_5

pushf:9C -wQ

pxor:0FEF v >V Vqxy
pxord:66)0FEF v >Vxyz V {kzbf
pxorq:66)0FEF v >Vxyz V {kzBfw

rcpps:0F53 v Vxy >
rcpss:F3)0F53 v >V Vx

rdfsbase:F3)0FAE.0 Rlq
rdgsbase:F3)0FAE.1 Rlq
rdmsr:0F32
rdpid:F3)0FC7.7 RQ
rdpkru:0F01EE
rdpmc:0F33
rdrand:0FC7.6 Rwlq
rdseed:0FC7.7 Rwlq
rdssp:F3)0F1E.1 R~l~q
rdtsc:0F31
rdtscp:0F01F9

ret
C3
C2 i$w

rorx:V F2)0F3AF0 ib r Rlq

roundpd:66)0F3A09 ib v Vxy >
roundps:66)0F3A08 ib v Vxy >
roundsd:66)0F3A0B ib v >V Vx
roundss:66)0F3A0A ib v >V Vx

rsm:0FAA

rsqrtps:0F52 v Vxy >
rsqrtss:F3)0F52 v >V Vx

rstorssp:F3)0F01.5 m

sahf:9E
sal:#shl
sarx:V F3)0F38F7 >Rlq r R
saveprevssp:F3)0F01EA.52
scas:AE -bwlq
setssbsy:F3)0F01E8
sfence:0FAEF8
sgdt:0F01.0 m
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

shlx:V 66)0F38F7 >Rlq r R

shrd
0FAC ib Rwlq r
0FAD R_1b Rwlq r

shrx:V F2)0F38F7 >Rlq r R

shufpd:66)0FC6 ib v >V Vxyz {kzBw
shufps:0FC6 ib v >V Vxyz {kzb

sidt:0F01.1 m
sldt:0F00.0 rW
smsw:0F01.4 rw#lq

sqrtpd:66)0F51 v Vxyz > {kzBrw
sqrtps:0F51 v Vxyz > {kzbr
sqrtsd:F2)0F51 v >V Vx {kzrw
sqrtss:F3)0F51 v >V Vx {kzr

stac:0F01CB
stc:F9
std:FD
sti:FB
stmxcsr:0FAE.3 m >
stos:AA -bwlq
str:0F00.1 rwLq

subpd:66)0F5C v >V Vxyz {kzrBw
subps:0F5C v >V Vxyz {kzrb
subsd:F2)0F5C v >V Vx {kzrw
subss:F3)0F5C v >V Vx {kzr

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

tpause:66)0FAE.6 R_0l R_2 R
tzcnt:F3)0FBC r Rwlq

ucomisd:66)0F2E v Vx > {sw
ucomiss:0F2E v Vx > {s

ud0:0FFF rL R
ud1:0FB9 rL R
ud2:0F0B
umonitor:F3)0FAE.6 Rwlq
umwait:F2)0FAE.6 R_0l R_2 R

unpckhpd:66)0F15 v >V Vxyz {kzBw
unpckhps:0F15 v >V Vxyz {kzb
unpcklpd:66)0F14 v >V Vxyz {kzBw
unpcklps:0F14 v >V Vxyz {kzb

valignd:66)0F3A03 ib v >Vxyz V {kzbf
valignq:66)0F3A03 ib v >Vxyz V {kzBfw

vblendmpd:66)0F3865 v >V Vxyz {kzBfw
vblendmps:66)0F3865 v >V Vxyz {kzbf

vbroadcastss:66)0F3818 vX Vxyz > {kz
vbroadcastsd:66)0F3819 vX Vyz > {kzw

vbroadcastf128:66)0F381A m Vy >
vbroadcastf32x2:66)0F3819 vX Vyz > {kzf
vbroadcastf32x4:66)0F381A m Vyz > {kzf
vbroadcastf64x2:66)0F381A m Vyz > {kzwf
vbroadcastf32x8:66)0F381B m Vz > {kzf
vbroadcastf64x4:66)0F381B m Vz > {kzfw

vbroadcasti128:66)0F385A m Vy >
vbroadcasti32x2:66)0F3859 vX Vxyz > {kzf
vbroadcasti32x4:66)0F385A m Vyz > {kzf
vbroadcasti64x2:66)0F385A m Vyz > {kzfw
vbroadcasti32x8:66)0F385B m Vz > {kzf
vbroadcasti64x4:66)0F385B m Vz > {kzfw

vcompresspd:66)0F388A Vxyz v > {kzwf
vcompressps:66)0F388A Vxyz v > {kzf

vcvtne2ps2bf16:F2)0F3872 v >V Vxyz {kzbf
vcvtneps2bf16:F3)0F3872 vxyz V/ > {kzbf

vcvtpd2qq:66)0F7B v Vxyz > {kzBwrf
vcvtpd2udq:0F79 vxyz V/ > {kzBwrf
vcvtpd2uqq:66)0F79 v Vxyz > {kzBwrf
vcvtph2ps:66)0F3813 v/ Vxyz > {kzs
vcvtps2ph:66)0F3A1D ib Vxyz v/ > {kzs
vcvtps2udq:0F79 v Vxyz > {kzbrf
vcvtps2qq:66)0F7B v/ Vxyz > {kzBrf
vcvtps2uqq:66)0F79 v/ Vxyz > {kzBrf
vcvtqq2pd:F3)0FE6 v Vxyz > {kzBrfw
vcvtqq2ps:0F5B vxyz V/ > {kzBrfw
vcvtsd2usi:F2)0F79 v#x Rlq > {rf
vcvtss2usi:F3)0F79 v#x Rlq > {rf
vcvttpd2qq:66)0F7A v Vxyz > {kzBwsf
vcvttpd2udq:0F78 vxyz V/ > {kzBwsf
vcvttpd2uqq:66)0F78 v Vxyz > {kzBwsf
vcvttps2udq:0F78 v Vxyz > {kzbsf
vcvttps2qq:66)0F7A v/ Vxyz > {kzBsf
vcvttps2uqq:66)0F78 v/ Vxyz > {kzBsf
vcvttsd2usi:F2)0F78 v#x Rlq > {sf
vcvttss2usi:F3)0F78 v#x Rlq > {sf
vcvtudq2pd:F3)0F7A v/ Vxyz > {kzBf
vcvtudq2ps:F2)0F7A v Vxyz > {kzbrf
vcvtuqq2pd:F3)0F7A v Vxyz > {kzBrfw
vcvtuqq2ps:F2)0F7A vxyz V/ > {kzBfrw
vcvtusi2sd:F2)0F7B rlq >Vx V {rf
vcvtusi2ss:F3)0F7B rlq >Vx V {rf

vdbpsadbw:66)0F3A42 ib v >Vxyz V {kzf
vdpbf16ps:F3)0F3852 v >Vxyz V {kzf

vexpandpd:66)0F3888 v Vxyz > {kzwf
vexpandps:66)0F3888 v Vxyz > {kzf

verr:v! 0F00.4 rW
verw:v! 0F00.5 rW

vextractf128:66)0F3A19 ib Vy vX >
vextractf32x4:66)0F3A19 ib Vyz vX > {kzf
vextractf64x2:66)0F3A19 ib Vyz vX > {kzfw
vextractf32x8:66)0F3A1B ib Vz vY > {kzf
vextractf64x4:66)0F3A1B ib Vz vY > {kzfw

vextracti128:66)0F3A39 ib Vy vX >
vextracti32x4:66)0F3A39 ib Vyz vX > {kzf
vextracti64x2:66)0F3A39 ib Vyz vX > {kzfw
vextracti32x8:66)0F3A3B ib Vz vY > {kzf
vextracti64x4:66)0F3A3B ib Vz vY > {kzfw

vfixupimmpd:66)0F3A54 ib v >Vxyz V {kzBsfw
vfixupimmps:66)0F3A54 ib v >Vxyz V {kzbsf
vfixupimmsd:66)0F3A55 ib v >Vx V {kzsfw
vfixupimmss:66)0F3A55 ib v >Vx V {kzsf

vfpclasspd:66)0F3A66 ib vxyz *KB > {kBfw
vfpclassps:66)0F3A66 ib vxyz *KB > {kbf
vfpclasssd:66)0F3A67 ib v#x *KB > {kfw
vfpclassss:66)0F3A67 ib v#x *KB > {kf

vgatherdpd
vw 66)0F3892 >Vxy *Gx V
66)0F3892 G/ Vxyz > {kfw

vgatherdps
66)0F3892 >Vxy G V
66)0F3892 Gxyz V > {kf

vgatherqpd
vw 66)0F3893 >Vxy G V
66)0F3893 Gxyz V > {kfw

vgatherqps
66)0F3893 >Vx Gxy Vx
66)0F3893 Gxyz V/ > {kf

vgetexppd:66)0F3842 v Vxyz > {kzBsfw
vgetexpps:66)0F3842 v Vxyz > {kzbsf
vgetexpsd:66)0F3843 v >Vx V > {kzsfw
vgetexpss:66)0F3843 v >Vx V > {kzsf

vgetmantpd:66)0F3A26 ib v Vxyz > {kzBsfw
vgetmantps:66)0F3A26 ib v Vxyz > {kzbsf
vgetmantsd:66)0F3A27 ib v >Vx V {kzsfw
vgetmantss:66)0F3A27 ib v >Vx V {kzsf

vinsertf128:66)0F3A18 ib vX >Vy V
vinsertf32x4:66)0F3A18 ib vX >Vyz V {kzf
vinsertf64x2:66)0F3A18 ib vX >Vyz V {kzfw
vinsertf32x8:66)0F3A1A ib vY >Vz V {kzf
vinsertf64x4:66)0F3A1A ib vY >Vz V {kzfw

vinserti128:66)0F3A38 ib vX >Vy V
vinserti32x4:66)0F3A38 ib vX >Vyz V {kzf
vinserti64x2:66)0F3A38 ib vX >Vyz V {kzfw
vinserti32x8:66)0F3A3A ib vY >Vz V {kzf
vinserti64x4:66)0F3A3A ib vY >Vz V {kzfw

vmaskmovpd
66)0F382D m >Vxy V
66)0F382F Vxy >V m

vmaskmovps
66)0F382C m >Vxy V
66)0F382E Vxy >V m

vp2intersectd:F2)0F3868 v >Vxyz *KB {bf
vp2intersectq:F2)0F3868 v >Vxyz *KB {Bfw

vpblendd:66)0F3A02 ib v >Vxy V

vpblendmb:66)0F3866 v >Vxyz V {kzf
vpblendmd:66)0F3864 v >Vxyz V {kzbf
vpblendmq:66)0F3864 v >Vxyz V {kzBfw
vpblendmw:66)0F3866 v >Vxyz V {kzfw

vpbroadcastb
66)0F3878 vX Vxyz > {kz
66)0F387A ^R! Vxyz > {kzf

vpbroadcastd
66)0F3858 vX Vxyz > {kz
66)0F387C ^Rl Vxyz > {kzf

vpbroadcastq
66)0F3859 vX Vxyz > {kzw
66)0F387C ^Rq Vxyz > {kzf

vpbroadcastw
66)0F3879 vX Vxyz > {kz
66)0F387B ^R! Vxyz > {kzf

vpbroadcastmb2q:F3)0F382A ^*KB Vxyz > {wf
vpbroadcastmw2d:F3)0F383A ^*KB Vxyz > {f

vpcmpb:66)0F3A3F ib v >Vxyz *KB {kf
vpcmpd:66)0F3A1F ib v >Vxyz *KB {kbf
vpcmpq:66)0F3A1F ib v >Vxyz *KB {kBfw
vpcmpw:66)0F3A3F ib v >Vxyz *KB {kfw

vpcmpub:66)0F3A3E ib v >Vxyz *KB {kf
vpcmpud:66)0F3A1E ib v >Vxyz *KB {kbf
vpcmpuq:66)0F3A1E ib v >Vxyz *KB {kBfw
vpcmpuw:66)0F3A3E ib v >Vxyz *KB {kfw

vpcompressb
66)0F3863 Vxyz ^V > {kzf
66)0F3863 Vxyz m > {kf

vpcompressw
66)0F3863 Vxyz ^V > {kzfw
66)0F3863 Vxyz m > {kfw

vpcompressd:66)0F388B Vxyz v > {kzf
vpcompressq:66)0F388B Vxyz v > {kzfw

vpconflictd:66)0F38C4 v Vxyz > {kzbf
vpconflictq:66)0F38C4 v Vxyz > {kzBfw

vpdpbusd:66)0F3850 v >Vxyz V {kzbf
vpdpbusds:66)0F3851 v >Vxyz V {kzbf
vpdpwssd:66)0F3852 v >Vxyz V {kzbf
vpdpwssds:66)0F3853 v >Vxyz V {kzbf

vperm2f128:66)0F3A06 ib v >Vy V
vperm2i128:66)0F3A46 ib v >Vy V

vpermb:66)0F388D v >Vxyz V {kzf
vpermd:66)0F3836 v >Vyz V {kzb
vpermw:66)0F388D v >Vxyz V {kzwf

vpermq
vw 66)0F3A00 ib v Vyz > {kzB
66)0F3836 v >Vyz V {kzBfw

vpermi2b:66)0F3875 v >Vxyz V {kzf
vpermi2d:66)0F3876 v >Vxyz V {kzbf
vpermi2q:66)0F3876 v >Vxyz V {kzBfw
vpermi2w:66)0F3875 v >Vxyz V {kzfw

vpermi2pd:66)0F3877 v >Vxyz V {kzBfw
vpermi2ps:66)0F3877 v >Vxyz V {kzbf

vpermilpd
66)0F380D v >Vxyz V {kzBw
66)0F3A05 ib v Vxyz > {kzBw

vpermilps
66)0F380C v >Vxyz V {kzb
66)0F3A04 ib v Vxyz > {kzb

vpermpd
vw 66)0F3A01 ib v Vyz > {kzB
66)0F3816 v >Vyz V {kzBwf

vpermps:66)0F3816 v >Vyz V {kzb

vpermt2b:66)0F387D v >Vxyz V {kzf
vpermt2d:66)0F387E v >Vxyz V {kzbf
vpermt2q:66)0F387E v >Vxyz V {kzBfw
vpermt2w:66)0F387D v >Vxyz V {kzfw

vpermt2pd:66)0F387F v >Vxyz V {kzBfw
vpermt2ps:66)0F387F v >Vxyz V {kzbf

vpexpandb:66)0F3862 v Vxyz > {kzf
vpexpandd:66)0F3889 v Vxyz > {kzf
vpexpandq:66)0F3889 v Vxyz > {kzfw
vpexpandw:66)0F3862 v Vxyz > {kzfw

vpgatherdd
66)0F3890 >Vxy G V
66)0F3890 Gxyz V > {kf

vpgatherdq
vw 66)0F3890 >Vxy *Gx V
66)0F3890 G/ Vxyz > {kfw

vpgatherqd
66)0F3891 >Vx *Gxy V
66)0F3891 Gxyz V/ > {kf

vpgatherqq
vw 66)0F3891 >Vxy G V
66)0F3891 Gxyz V > {kfw

vplzcntd:66)0F3844 v Vxyz > {kzbf
vplzcntq:66)0F3844 v Vxyz > {kzBwf

vpmadd52huq:66)0F38B5 v >Vxyz V {kzBwf
vpmadd52luq:66)0F38B4 v >Vxyz V {kzBwf

vpmaskmovd
66)0F388C m >Vxy V
66)0F388E Vxy >V m

vpmaskmovq
vw 66)0F388C m >Vxy V
vw 66)0F388E Vxy >V m

vpmovb2m:F3)0F3829 ^Vxyz *KB > {f
vpmovd2m:F3)0F3839 ^Vxyz *KB > {f
vpmovq2m:F3)0F3839 ^Vxyz *KB > {fw
vpmovw2m:F3)0F3829 ^Vxyz *KB > {fw

vpmovdb:F3)0F3831 Vxyz vX > {kzf
vpmovdw:F3)0F3833 Vxyz v/ > {kzf
vpmovqb:F3)0F3832 Vxyz vX > {kzf
vpmovqd:F3)0F3835 Vxyz vX > {kzf
vpmovqw:F3)0F3834 Vxyz vX > {kzf
vpmovwb:F3)0F3830 Vxyz v/ > {kzf

vpmovsdb:F3)0F3821 Vxyz vX > {kzf
vpmovsdw:F3)0F3823 Vxyz v/ > {kzf
vpmovsqb:F3)0F3822 Vxyz vX > {kzf
vpmovsqd:F3)0F3825 Vxyz v/ > {kzf
vpmovsqw:F3)0F3824 Vxyz vX > {kzf
vpmovswb:F3)0F3820 Vxyz v/ > {kzf

vpmovusdb:F3)0F3811 Vxyz vX > {kzf
vpmovusdw:F3)0F3813 Vxyz v/ > {kzf
vpmovusqb:F3)0F3812 Vxyz vX > {kzf
vpmovusqd:F3)0F3815 Vxyz v/ > {kzf
vpmovusqw:F3)0F3814 Vxyz vX > {kzf
vpmovuswb:F3)0F3810 Vxyz v/ > {kzf

vpmovm2b:F3)0F3828 ^*KB Vxyz > {f
vpmovm2d:F3)0F3838 ^*KB Vxyz > {f
vpmovm2q:F3)0F3838 ^*KB Vxyz > {fw
vpmovm2w:F3)0F3828 ^*KB Vxyz > {fw

vpmultishiftqb:66)0F3883 v >Vxyz V {kzBfw

vpopcntb:66)0F3854 v Vxyz > {kzf
vpopcntd:66)0F3855 v Vxyz > {kzbf
vpopcntw:66)0F3854 v Vxyz > {kzfw
vpopcntq:66)0F3855 v Vxyz > {kzBfw

vprold:66)0F72.1 ib v >Vxyz {kzbf
vprolq:66)0F72.1 ib v >Vxyz {kzBfw

vprolvd:66)0F3815 v >Vxyz V {kzbf
vprolvq:66)0F3815 v >Vxyz V {kzBfw

vprord:66)0F72.0 ib v >Vxyz {kzbf
vprorq:66)0F72.0 ib v >Vxyz {kzBfw

vprorvd:66)0F3814 v >Vxyz V {kzbf
vprorvq:66)0F3814 v >Vxyz V {kzBfw

vpscatterdd:66)0F38A0 Vxyz G > {kf
vpscatterdq:66)0F38A0 Vxyz G/ > {kfw
vpscatterqd:66)0F38A1 V/ Gxyz > {kf
vpscatterqq:66)0F38A1 Vxyz G > {kfw

vpshldd:66)0F3A71 ib v >Vxyz V {kzbf
vpshldq:66)0F3A71 ib v >Vxyz V {kzBfw
vpshldw:66)0F3A70 ib v >Vxyz V {kzfw

vpshldvd:66)0F3871 v >Vxyz V {kzbf
vpshldvq:66)0F3871 v >Vxyz V {kzBfw
vpshldvw:66)0F3870 v >Vxyz V {kzfw

vpshrdd:66)0F3A73 ib v >Vxyz V {kzbf
vpshrdq:66)0F3A73 ib v >Vxyz V {kzBfw
vpshrdw:66)0F3A72 ib v >Vxyz V {kzfw

vpshrdvd:66)0F3873 v >Vxyz V {kzbf
vpshrdvq:66)0F3873 v >Vxyz V {kzBfw
vpshrdvw:66)0F3872 v >Vxyz V {kzfw

vpshufbitqmb:66)0F388F v >Vxyz *KB {kf

vpsllvd:66)0F3847 v >Vxyz V {kzb
vpsllvq:vw 66)0F3847 v >Vxyz V {kzB
vpsllvw:66)0F3812 v >Vxyz V {kzfw

vpsravd:66)0F3846 v >Vxyz V {kzb
vpsravq:66)0F3846 v >Vxyz V {kzBfw
vpsravw:66)0F3811 v >Vxyz V {kzfw

vpsrlvd:66)0F3845 v >Vxyz V {kzb
vpsrlvq:vw 66)0F3845 v >Vxyz V {kzB
vpsrlvw:66)0F3810 v >Vxyz V {kzfw

vpternlogd:66)0F3A25 ib v >Vxyz V {kzbf
vpternlogq:66)0F3A25 ib v >Vxyz V {kzBfw

vptestmb:66)0F3826 v >Vxyz *KB {kf
vptestmd:66)0F3827 v >Vxyz *KB {kbf
vptestmq:66)0F3827 v >Vxyz *KB {kBfw
vptestmw:66)0F3826 v >Vxyz *KB {kfw

vptestnmb:F3)0F3826 v >Vxyz *KB {kf
vptestnmd:F3)0F3827 v >Vxyz *KB {kbf
vptestnmq:F3)0F3827 v >Vxyz *KB {kBfw
vptestnmw:F3)0F3826 v >Vxyz *KB {kfw

vrangepd:66)0F3A50 ib v >Vxyz V {kzBsfw
vrangeps:66)0F3A50 ib v >Vxyz V {kzbsf
vrangesd:66)0F3A51 ib v >Vx V {kzsfw
vrangess:66)0F3A51 ib v >Vx V {kzsf

vrcp14pd:66)0F384C v Vxyz > {kzBfw
vrcp14ps:66)0F384C v Vxyz > {kzbf
vrcp14sd:66)0F384D v >Vx V {kzfw
vrcp14ss:66)0F384D v >Vx V {kzf

vreducepd:66)0F3A56 ib v Vxyz > {kzBsfw
vreduceps:66)0F3A56 ib v Vxyz > {kzbsf
vreducesd:66)0F3A57 ib v >Vx V {kzsfw
vreducess:66)0F3A57 ib v >Vx V {kzsf

vrndscalepd:66)0F3A09 ib v Vxyz > {kzBsfw
vrndscaleps:66)0F3A08 ib v Vxyz > {kzbsf
vrndscalesd:66)0F3A0B ib v >Vx V {kzsfw
vrndscaless:66)0F3A0A ib v >Vx V {kzsf

vrsqrt14pd:66)0F384E v Vxyz > {kzBfw
vrsqrt14ps:66)0F384E v Vxyz > {kzbf
vrsqrt14sd:66)0F384F v >Vx V {kzfw
vrsqrt14ss:66)0F384F v >Vx V {kzf

vscalefpd:66)0F382C v >Vxyz V {kzBrfw
vscalefps:66)0F382C v >Vxyz V {kzbrf
vscalefsd:66)0F382D v >Vx V {kzrfw
vscalefss:66)0F382D v >Vx V {kzrf

vscatterdpd:66)0F38A2 Vxyz G/ > {kfw
vscatterdps:66)0F38A2 Vxyz G > {kf
vscatterqpd:66)0F38A3 Vxyz G > {kfw
vscatterqps:66)0F38A3 V/ Gxyz > {kf

vshuff32x4:66)0F3A23 ib v >Vyz V {kzbf
vshuff64x2:66)0F3A23 ib v >Vyz V {kzBfw

vshufi32x4:66)0F3A43 ib v >Vyz V {kzbf
vshufi64x2:66)0F3A43 ib v >Vyz V {kzBfw

vtestpd:66)0F380F v Vxy >
vtestps:66)0F380E v Vxy >

vzeroall:vl 0F77 >
vzeroupper:0F77 >

wait:9B
wbinvd:0F09
wbnoinvd:F3)0F09
wrfsbase:F3)0FAE.2 Rlq
wrgsbase:F3)0FAE.3 Rlq
wrmsr:0F30
wrpkru:0F01EF
wrss:0F38F6 R~l~q r
wruss:66)0F38F5 R~l~q r
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

xorpd:66)0F57 v >V Vxyz {kzBw
xorps:0F57 v >V Vxyz {kzb

xrstor:0FAE.5 m
xrstor64:0FAE.5 m#q
xrstors:0FC7.3 m
xrstors64:0FC7.3 m#q
xsave:0FAE.4 m
xsave64:0FAE.4 m#q
xsavec:0FC7.4 m
xsavec64:0FC7.4 m#q
xsaveopt:0FAE.6 m
xsaveopt64:0FAE.6 m#q
xsaves:0FC7.5 m
xsaves64:0FC7.5 m#q
xsetbv:0F01D1
xtest:0F01D6
`;
  var mnemonics = {};
  mnemonicStrings.match(/.*:.*(?=\n)|.[^]*?(?=\n\n)/g).forEach((x) => {
    lines = x.split(/[\n:]/);
    mnemonics[lines.shift()] = lines;
  });
  var hex = (num) => num.toString(16);
  var arithmeticMnemonics = "add or adc sbb and sub xor cmp".split(" ");
  arithmeticMnemonics.forEach((name, i2) => {
    let opBase = i2 * 8;
    mnemonics[name] = [
      hex(opBase + 4) + " i R_0bw",
      "83." + i2 + " Ib rwlq",
      hex(opBase + 5) + " iL R_0l",
      "80." + i2 + " i rbwl",
      hex(opBase + 5) + " iL R_0q",
      "81." + i2 + " IL rq",
      hex(opBase) + " Rbwlq r",
      hex(opBase + 2) + " r Rbwlq"
    ];
  });
  var shiftMnemonics = `rol ror rcl rcr shl shr  sar`.split(" ");
  shiftMnemonics.forEach((name, i2) => {
    if (name)
      mnemonics[name] = [
        "D0." + i2 + " i_1 rbwlq",
        "D2." + i2 + " R_1b rbwlq",
        "C0." + i2 + " ib rbwlq"
      ];
  });
  var conditionals = `o
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
g nle`.split("\n");
  conditionals.forEach((names, i2) => {
    names = names.split(" ");
    let firstName = names.shift();
    mnemonics["j" + firstName] = [
      hex(112 + i2) + " Ib",
      hex(3968 + i2) + " Il"
    ];
    mnemonics["cmov" + firstName] = [hex(3904 + i2) + " Rwlq"];
    mnemonics["set" + firstName] = [hex(3984 + i2) + ".0 rB"];
    names.forEach((name) => {
      mnemonics["j" + name] = ["#j" + firstName];
      mnemonics["cmov" + name] = ["#cmov" + firstName];
      mnemonics["set" + name] = ["#set" + firstName];
    });
  });
  var fpuArithMnemonics = "add mul com comp sub subr div divr";
  fpuArithMnemonics.split(" ").forEach((name, i2) => {
    let list = ["D8." + i2 + " ml", "DC." + i2 + " m$q"];
    mnemonics["fi" + name] = ["DA." + i2 + " ml", "DE." + i2 + " m$w"];
    if (i2 === 2 || i2 === 3)
      list.push("D8." + i2 + " F", hex(55489 + i2 * 8));
    else {
      list.push("D8." + i2 + " F F_0");
      if (i2 >= 4)
        i2 ^= 1;
      list.push("DC." + i2 + " F_0 F");
      mnemonics["f" + name + "p"] = ["DE." + i2 + " F_0 F", hex(57025 + i2 * 8)];
    }
    mnemonics["f" + name] = list;
  });
  var vfmOps = ["add", "sub"];
  var vfmDirs = ["132", "213", "231"];
  var vfmTypes = ["pd", "ps", "sd", "ss"];
  var vfmPrefs = ["vfm", "vfnm"];
  vfmDirs.forEach((dir, dirI) => vfmOps.forEach((op, opI) => vfmTypes.forEach((type, typeI) => {
    vfmPrefs.forEach((pref, prefI) => mnemonics[pref + op + dir + type] = [
      (typeI % 2 ? "" : "vw ") + "66)" + hex(997528 + 16 * dirI + 4 * prefI + 2 * opI + (typeI >> 1)) + " v >Vx" + (typeI < 2 ? "yz" : "") + " V {kzr" + ["B", "b", "", ""][typeI]
    ]);
    if (typeI < 2) {
      mnemonics["vfm" + op + vfmOps[1 - opI] + dir + type] = [
        (typeI % 2 ? "" : "vw ") + "66)" + hex(997526 + 16 * dirI + opI) + " v >Vxyz V {kzr" + "Bb"[typeI]
      ];
    }
  })));

  // operands.js
  var OPT = {
    REG: 1,
    VEC: 2,
    VMEM: 3,
    IMM: 4,
    MASK: 5,
    MEM: 6,
    ST: 7,
    SEG: 8,
    IP: 9,
    BND: 10,
    CTRL: 11,
    DBG: 12
  };
  var registers = Object.assign({}, ...[
    "al",
    "cl",
    "dl",
    "bl",
    "ah",
    "ch",
    "dh",
    "bh",
    "ax",
    "cx",
    "dx",
    "bx",
    "sp",
    "bp",
    "si",
    "di",
    "eax",
    "ecx",
    "edx",
    "ebx",
    "esp",
    "ebp",
    "esi",
    "edi",
    "rax",
    "rcx",
    "rdx",
    "rbx",
    "rsp",
    "rbp",
    "rsi",
    "rdi",
    "es",
    "cs",
    "ss",
    "ds",
    "fs",
    "gs",
    "st",
    "rip",
    "eip",
    "spl",
    "bpl",
    "sil",
    "dil"
  ].map((x, i2) => ({[x]: i2})));
  var suffixes = {b: 8, w: 16, l: 32, d: 32, q: 64, t: 80};
  var PREFIX_REX = 1;
  var PREFIX_NOREX = 2;
  var PREFIX_CLASHREX = 3;
  var PREFIX_ADDRSIZE = 4;
  var PREFIX_SEG = 8;
  function parseRegister2(expectedType = null) {
    let reg = registers[next()];
    let size = 0, type = -1, prefs = 0;
    if (reg >= registers.al && reg <= registers.rdi) {
      type = OPT.REG;
      size = 8 << (reg >> 3);
      if (size == 8 && reg >= registers.ah && reg <= registers.bh)
        prefs |= PREFIX_NOREX;
      reg &= 7;
    } else if (reg >= registers.mm0 && reg <= registers.mm7) {
      type = OPT.MMX;
      size = 64;
      reg -= registers.mm0;
    } else if (reg >= registers.xmm0 && reg <= registers.xmm7) {
      type = OPT.SSE;
      size = 128;
      reg -= registers.xmm0;
    } else if (reg >= registers.es && reg <= registers.gs) {
      type = OPT.SEG;
      size = 32;
      reg -= registers.es;
    } else if (reg === registers.st) {
      type = OPT.ST;
      reg = 0;
      if (next() == "(") {
        reg = parseInt(next());
        if (isNaN(reg) || reg >= 8 || reg < 0 || next() != ")")
          throw "Unknown register";
      } else
        ungetToken(token);
    } else if (reg === registers.rip || reg === registers.eip) {
      if (expectedType == null || !expectedType.includes(OPT.IP))
        throw "Can't use RIP here";
      type = OPT.IP;
      size = reg == registers.eip ? 32 : 64;
      reg = 0;
    } else if (reg >= registers.spl && reg <= registers.dil) {
      type = OPT.REG;
      size = 8;
      prefs |= PREFIX_REX;
      reg -= registers.spl - 4;
    } else if (token[0] === "r") {
      reg = parseInt(token.slice(1));
      if (isNaN(reg) || reg <= 0 || reg >= 16)
        throw "Unknown register";
      type = OPT.REG;
      size = suffixes[token[token.length - 1]] || 64;
    } else {
      let max = 32;
      if (token.startsWith("bnd"))
        reg = token.slice(3), type = OPT.BND, max = 4;
      else if (token[0] == "k")
        reg = token.slice(1), type = OPT.MASK, max = 8, size = NaN;
      else if (token.startsWith("dr"))
        reg = token.slice(2), type = OPT.DBG, max = 8;
      else if (token.startsWith("cr"))
        reg = token.slice(2), type = OPT.CTRL, max = 9;
      else {
        type = OPT.VEC;
        if (token.startsWith("mm"))
          reg = token.slice(2), size = 64, max = 8;
        else if (token.startsWith("xmm"))
          reg = token.slice(3), size = 128;
        else if (token.startsWith("ymm"))
          reg = token.slice(3), size = 256;
        else if (token.startsWith("zmm"))
          reg = token.slice(3), size = 512;
        else
          throw "Unknown register";
      }
      if (isNaN(reg) || !(reg = parseInt(reg), reg >= 0 && reg < max))
        throw "Unknown register";
    }
    if (expectedType !== null && expectedType.indexOf(type) < 0)
      throw "Invalid register";
    next();
    return [reg, type, size, prefs];
  }
  function parseImmediate2() {
    let value = 0n;
    next();
    try {
      if (token == "\n")
        throw "";
      if (token[0] === "'" && token[token.length - 1] === "'") {
        let string = eval(token);
        for (let i2 = 0; i2 < string.length; i2++) {
          value <<= 8n;
          value += BigInt(string.charCodeAt(i2));
        }
      } else if (isNaN(token)) {
        reportLabelDependency(token);
        value = 1n;
      } else
        value = BigInt(token);
      next();
      return value;
    } catch (e) {
      throw "Couldn't parse immediate: " + e;
    }
  }
  function Operand() {
    this.reg = this.reg2 = -1;
    this.shift = 0;
    this.value = null;
    this.type = null;
    this.size = NaN;
    this.prefs = 0;
    if (token === "%") {
      [this.reg, this.type, this.size, this.prefs] = parseRegister2();
    } else if (token === "$" || isNaN(token) && token !== "(" && peekNext() !== "(") {
      if (token !== "$")
        ungetToken(token);
      this.value = parseImmediate2();
      this.type = OPT.IMM;
    } else {
      this.type = OPT.MEM;
      if (token !== "(") {
        ungetToken(token);
        this.value = parseImmediate2();
      }
      if (token !== "(")
        throw "Invalid operand";
      let tempSize, tempType;
      if (next() !== "%") {
        if (token !== ",") {
          ungetToken(token);
          this.value = parseImmediate2();
          if (token != ")")
            throw "Expected ')'";
          next();
          return;
        } else {
          this.reg = -1;
          tempType = -1;
          tempSize = 64;
        }
      } else
        [this.reg, tempType, tempSize] = parseRegister2([OPT.REG, OPT.IP, OPT.VEC]);
      if (tempType === OPT.VEC) {
        this.type = OPT.VMEM;
        this.size = tempSize;
        if (tempSize < 128)
          throw "Invalid register size";
        this.reg2 = this.reg;
        this.reg = -1;
      } else {
        if (tempSize === 32)
          this.prefs |= PREFIX_ADDRSIZE;
        else if (tempSize !== 64)
          throw "Invalid register size";
        if (tempType === OPT.IP)
          this.ripRelative = true;
        else if (token === ",") {
          if (next() !== "%")
            throw "Expected register";
          [this.reg2, tempType, tempSize] = parseRegister2([OPT.REG, OPT.VEC]);
          if (tempType === OPT.VEC) {
            this.type = OPT.VMEM;
            this.size = tempSize;
            if (tempSize < 128)
              throw "Invalid register size";
          } else {
            if (this.reg2 === 4)
              throw "Memory index cannot be RSP";
            if (tempSize === 32)
              this.prefs |= PREFIX_ADDRSIZE;
            else if (tempSize !== 64)
              throw "Invalid register size";
          }
          if (token === ",") {
            this.shift = [1, 2, 4, 8].indexOf(Number(parseImmediate2()));
            if (this.shift < 0)
              throw "Scale must be 1, 2, 4, or 8";
          }
        } else if (this.reg === 4)
          this.reg2 = 4;
      }
      if ((this.reg & 7) === 5)
        this.value ||= 0n;
      if (token != ")")
        throw "Expected ')'";
      next();
    }
  }

  // mnemonics.js
  var REG_MOD = -1;
  var REG_OP = -2;
  var OPC = {
    r: OPT.REG,
    v: OPT.VEC,
    i: OPT.IMM,
    m: OPT.MEM,
    s: OPT.SEG,
    f: OPT.ST,
    b: OPT.BND,
    k: OPT.MASK,
    c: OPT.CTRL,
    d: OPT.DBG,
    g: OPT.VMEM
  };
  var opCatcherCache = {};
  var sizeIds = {b: 8, w: 16, l: 32, q: 64, t: 80, x: 128, y: 256, z: 512};
  var SIZETYPE_EXPLICITSUF = 1;
  var SIZETYPE_IMPLICITENC = 2;
  var EVEXPERM_MASK = 1;
  var EVEXPERM_ZEROING = 2;
  var EVEXPERM_BROADCAST_32 = 4;
  var EVEXPERM_BROADCAST_64 = 8;
  var EVEXPERM_BROADCAST = 12;
  var EVEXPERM_SAE = 16;
  var EVEXPERM_ROUNDING = 32;
  var EVEXPERM_FORCEW = 64;
  var EVEXPERM_FORCE = 128;
  function parseEvexPermits(string) {
    let permits = 0;
    for (let c of string) {
      switch (c) {
        case "k":
          permits |= EVEXPERM_MASK;
          break;
        case "z":
          permits |= EVEXPERM_ZEROING;
          break;
        case "b":
          permits |= EVEXPERM_BROADCAST_32;
          break;
        case "B":
          permits |= EVEXPERM_BROADCAST_64;
          break;
        case "s":
          permits |= EVEXPERM_SAE;
          break;
        case "r":
          permits |= EVEXPERM_ROUNDING;
          break;
        case "w":
          permits |= EVEXPERM_FORCEW;
          break;
        case "f":
          permits |= EVEXPERM_FORCE;
          break;
      }
    }
    return permits;
  }
  function getSizes(format, defaultCatcher = null) {
    let sizes = [], size, defaultSize;
    for (let i2 = 0; i2 < format.length; i2++) {
      defaultSize = false;
      size = 0;
      sizeChar = format[i2];
      if (sizeChar === "~")
        size |= SIZETYPE_EXPLICITSUF, sizeChar = format[++i2];
      if (sizeChar === "$")
        size |= SIZETYPE_IMPLICITENC, sizeChar = format[++i2];
      if (sizeChar === "#")
        defaultSize = true, sizeChar = format[++i2];
      if (sizeChar < "a")
        defaultSize = true, size |= sizeIds[sizeChar.toLowerCase()] | SIZETYPE_IMPLICITENC;
      else
        size |= sizeIds[sizeChar];
      if (defaultSize)
        defaultCatcher(size);
      sizes.push(size);
    }
    return sizes;
  }
  function OpCatcher(format) {
    opCatcherCache[format] = this;
    let i2 = 1;
    this.sizes = [];
    this.forceRM = format[0] === "^";
    this.vexOpImm = format[0] === "<";
    this.vexOp = this.vexOpImm || format[0] === ">";
    if (this.forceRM || this.vexOp)
      format = format.slice(1);
    this.carrySizeInference = format[0] !== "*";
    if (!this.carrySizeInference)
      format = format.slice(1);
    let opType = format[0];
    this.acceptsMemory = "rvbk".includes(opType);
    this.forceRM ||= this.acceptsMemory;
    this.unsigned = opType === "i";
    this.type = OPC[opType.toLowerCase()];
    this.carrySizeInference &&= this.type !== OPT.IMM && this.type !== OPT.MEM;
    this.forceRM ||= this.type === OPT.VMEM || this.type === OPT.MEM;
    this.implicitValue = null;
    if (format[1] === "_") {
      this.implicitValue = parseInt(format[2]);
      i2 = 3;
    }
    this.defSize = -1;
    if (format[i2] === "!") {
      this.sizes = 0;
      this.hasByteSize = false;
    } else if (format[i2] === "/") {
      this.sizes = -2;
      this.hasByteSize = false;
    } else {
      this.sizes = getSizes(format.slice(i2), (size) => this.defSize = size);
      this.hasByteSize = this.sizes.some((x) => (x & 8) === 8);
    }
    if (this.sizes.length === 0) {
      if (this.type > OPT.MEM)
        this.sizes = 0;
      else
        this.sizes = -1;
    }
  }
  OpCatcher.prototype.catch = function(operand, prevSize, enforcedSize) {
    if (operand.type !== this.type && !(operand.type === OPT.MEM && this.acceptsMemory))
      return null;
    let opSize = this.unsigned ? operand.unsignedSize : operand.size;
    let rawSize, size = 0, found = false;
    if (enforcedSize > 0 && operand.type >= OPT.IMM)
      opSize = enforcedSize;
    if (isNaN(opSize)) {
      if (this.defSize > 0)
        return this.defSize;
      else if (this.sizes === -2) {
        opSize = (prevSize & ~7) >> 1;
        if (opSize < 128)
          opSize = 128;
      } else
        opSize = prevSize & ~7;
    } else if (this.type === OPT.IMM) {
      if (this.defSize > 0 && this.defSize < opSize)
        return this.defSize;
    }
    if (this.sizes === -1) {
      rawSize = prevSize & ~7;
      if (opSize === rawSize || operand.type === OPT.IMM && opSize < rawSize)
        return prevSize;
      return null;
    }
    if (this.sizes === -2) {
      rawSize = (prevSize & ~7) >> 1;
      if (rawSize < 128)
        rawSize = 128;
      if (opSize === rawSize)
        return prevSize;
      return null;
    }
    if (this.sizes !== 0) {
      for (size of this.sizes) {
        rawSize = size & ~7;
        if (opSize === rawSize || operand.type === OPT.IMM && opSize < rawSize) {
          if (!(size & SIZETYPE_EXPLICITSUF) || enforcedSize === rawSize) {
            found = true;
            break;
          }
        }
      }
      if (!found)
        return null;
    }
    if (this.implicitValue !== null) {
      let opValue = operand.type === OPT.IMM ? Number(operand.value) : operand.reg;
      if (this.implicitValue !== opValue)
        return null;
    }
    return size;
  };
  function Operation(format) {
    this.vexBase = 0;
    this.maskSizing = 0;
    this.evexPermits = null;
    this.actuallyNotVex = false;
    this.vexOnly = format[0][0] === "v";
    this.forceVex = format[0][0] === "V";
    if (this.vexOnly || this.forceVex) {
      if (format[0].includes("w"))
        this.vexBase |= 32768;
      if (format[0].includes("l"))
        this.vexBase |= 1024;
      if (format[0].includes("!")) {
        this.actuallyNotVex = true;
        this.vexOnly = this.forceVex = false;
      }
      format.shift();
    }
    let [opcode2, extension] = format.shift().split(".");
    if (opcode2[opcode2.length - 2] === "+" || opcode2[opcode2.length - 2] === "-") {
      this.opDiff = parseInt(opcode2.slice(-2));
      opcode2 = opcode2.slice(0, -2);
    } else
      this.opDiff = 1;
    if (opcode2[2] === ")") {
      this.code = parseInt(opcode2.slice(3), 16);
      this.prefix = parseInt(opcode2.slice(0, 2), 16);
      this.maskSizing = 4;
    } else {
      this.code = parseInt(opcode2, 16);
      this.prefix = null;
    }
    if (extension === void 0) {
      this.extension = REG_MOD;
      this.modExtension = null;
    } else {
      if (extension[0] === "o")
        this.extension = REG_OP;
      else
        this.extension = parseInt(extension[0]);
      this.modExtension = extension[1] ? parseInt(extension[1]) : null;
    }
    this.opCatchers = [];
    if (format.length === 0)
      return;
    this.allowVex = !this.forceVex && format.some((op) => op.includes(">"));
    this.vexOpCatchers = this.allowVex ? [] : null;
    this.checkableSizes = null;
    this.defaultCheckableSize = null;
    this.maxSize = 0;
    let opCatcher;
    if (format[0][0] === "-")
      this.checkableSizes = getSizes(format.shift().slice(1), (s) => this.defaultCheckableSize = s);
    this.allVectors = false;
    for (let operand of format) {
      if (operand === ">")
        continue;
      if (operand[0] === "{") {
        this.evexPermits = parseEvexPermits(operand.slice(1));
        continue;
      }
      opCatcher = opCatcherCache[operand] || new OpCatcher(operand);
      if (!opCatcher.vexOp || this.forceVex)
        this.opCatchers.push(opCatcher);
      if (opCatcher.type === OPT.MASK && opCatcher.carrySizeInference)
        this.maskSizing |= 1;
      if (opCatcher.type === OPT.REG)
        this.maskSizing |= 2;
      if (this.vexOpCatchers !== null)
        this.vexOpCatchers.push(opCatcher);
      if (Array.isArray(opCatcher.sizes)) {
        let had64 = false;
        for (let size of opCatcher.sizes) {
          if (size > this.maxSize)
            this.maxSize = size & ~7;
          if ((size & ~7) === 64)
            had64 = true;
          else if (had64 && (size & ~7) > 64)
            this.allVectors = true;
        }
      }
    }
    if (this.allowVex || this.forceVex) {
      this.vexBase |= 30720 | [15, 3896, 3898].indexOf(this.code >> 8) + 1 | [null, 102, 243, 242].indexOf(this.prefix) << 8;
    }
  }
  Operation.prototype.fit = function(operands, enforcedSize, vexInfo) {
    if (vexInfo.needed) {
      if (this.actuallyNotVex)
        vexInfo.needed = false;
      else if (!this.allowVex)
        return null;
      if (vexInfo.evex) {
        if (this.actuallyNotVex)
          return null;
        if (this.evexPermits === null)
          return null;
        if (!(this.evexPermits & EVEXPERM_MASK) && vexInfo.mask > 0)
          return null;
        if (!(this.evexPermits & EVEXPERM_BROADCAST) && vexInfo.broadcast !== null)
          return null;
        if (!(this.evexPermits & EVEXPERM_ROUNDING) && vexInfo.round > 0)
          return null;
        if (!(this.evexPermits & EVEXPERM_SAE) && vexInfo.round === 0)
          return null;
        if (!(this.evexPermits & EVEXPERM_ZEROING) && vexInfo.zeroing)
          return null;
      } else if (this.evexPermits & EVEXPERM_FORCE)
        vexInfo.evex = true;
    } else if (this.vexOnly)
      return null;
    else if (this.evexPermits & EVEXPERM_FORCE)
      return null;
    let adjustByteOp = false, overallSize = 0, rexw = false;
    if (this.checkableSizes) {
      if (enforcedSize === 0) {
        if (this.defaultCheckableSize === null)
          return null;
        overallSize = this.defaultCheckableSize;
        if (this.checkableSizes.includes(8) && overallSize > 8)
          adjustByteOp = true;
      } else {
        let foundSize = false;
        for (let checkableSize of this.checkableSizes) {
          if (enforcedSize === (checkableSize & ~7)) {
            if (this.checkableSizes.includes(8) && enforcedSize > 8)
              adjustByteOp = true;
            overallSize = checkableSize;
            foundSize = true;
            break;
          }
        }
        if (!foundSize)
          return null;
      }
      if (overallSize & SIZETYPE_IMPLICITENC)
        overallSize = 0;
      overallSize &= ~7;
      if (overallSize === 64)
        rexw = true;
      enforcedSize = 0;
    }
    let opCatchers = vexInfo.needed ? this.vexOpCatchers : this.opCatchers;
    if (operands.length !== opCatchers.length)
      return null;
    let correctedSizes = new Array(operands.length), size = -1, prevSize = -1, i2, catcher;
    for (i2 = 0; i2 < operands.length; i2++) {
      catcher = opCatchers[i2];
      if (size > 0 || Array.isArray(catcher.sizes)) {
        size = catcher.catch(operands[i2], size, enforcedSize);
        if (size === null)
          return null;
      }
      correctedSizes[i2] = size;
      if (size === 64 && catcher.copySize !== void 0)
        size = catcher.copySize;
      if (!catcher.carrySizeInference)
        size = prevSize;
      prevSize = size;
    }
    for (i2 = 0; i2 < operands.length; i2++) {
      if (correctedSizes[i2] < 0) {
        size = opCatchers[i2].catch(operands[i2], size, enforcedSize);
        if (size === null)
          return null;
        correctedSizes[i2] = size;
      }
    }
    let reg = null, rm = null, vex = this.vexBase, imms = [], correctedOpcode = this.code;
    let extendOp = false;
    let operand;
    for (i2 = 0; i2 < operands.length; i2++) {
      catcher = opCatchers[i2], operand = operands[i2];
      size = correctedSizes[i2];
      operand.size = size & ~7;
      if (operand.size === 64 && !(size & SIZETYPE_IMPLICITENC) && !this.allVectors)
        rexw = true;
      if (catcher.implicitValue === null) {
        if (operand.type === OPT.IMM)
          imms.unshift(operand);
        else if (catcher.forceRM)
          rm = operand;
        else if (catcher.vexOp) {
          if (catcher.vexOpImm)
            imms.unshift({value: BigInt(operand.reg << 4), size: 8});
          else
            vex = vex & ~30720 | (~operand.reg & 15) << 11;
          if (operand.reg >= 16)
            vex |= 524288;
        } else
          reg = operand;
        if (operand.type === OPT.VEC && operand.size === 64 && vexInfo.needed)
          throw "Can't encode MMX with VEX prefix";
      }
      if (overallSize < (size & ~7) && !(size & SIZETYPE_IMPLICITENC))
        overallSize = size & ~7;
      if (size >= 16)
        adjustByteOp ||= catcher.hasByteSize;
    }
    if (this.extension === REG_OP) {
      correctedOpcode += reg.reg & 7;
      extendOp = reg.reg > 7;
      reg = null;
    } else if (this.extension !== REG_MOD) {
      if (rm === null) {
        if (this.modExtension === null)
          rm = reg;
        else
          rm = {type: OPT.MEM, reg: this.modExtension, value: null};
      }
      reg = {reg: this.extension};
    }
    vexInfo.needed ||= this.forceVex;
    switch (this.maskSizing) {
      case 1:
        if (overallSize === 8 || overallSize === 32)
          vex |= 256;
        if (overallSize > 16)
          overallSize = 64;
        else
          overallSize = 0;
        adjustByteOp = false;
        break;
      case 3:
        if (overallSize === 8)
          vex |= 256;
        if (overallSize > 16)
          vex |= 768;
        adjustByteOp = false;
        break;
      case 5:
        adjustByteOp = overallSize > 16;
        if (overallSize === 16 || overallSize === 64)
          overallSize = 64;
        break;
    }
    if (vexInfo.needed) {
      if (this.allVectors)
        vex |= 256;
      if (vexInfo.evex) {
        vex |= 1024;
        if (vexInfo.zeroing)
          vex |= 8388608;
        if (vexInfo.round !== null) {
          if (overallSize !== this.maxSize)
            throw "Invalid vector size for embedded rounding";
          if (vexInfo.round > 0)
            vexInfo.round--;
          vex |= vexInfo.round << 21 | 1048576;
        } else {
          let sizeId = [128, 256, 512].indexOf(overallSize);
          vex |= sizeId << 21;
          if (vexInfo.broadcast !== null) {
            if (this.evexPermits & EVEXPERM_BROADCAST_32)
              sizeId++;
            if (vexInfo.broadcast !== sizeId)
              throw "Invalid broadcast";
            vex |= 1048576;
          }
        }
        vex |= vexInfo.mask << 16;
        if (this.evexPermits & EVEXPERM_FORCEW)
          vex |= 32768;
        if (reg.reg >= 16)
          vex |= 16, reg.reg &= 15;
        if (rm.reg2 >= 16)
          vex |= 524288;
      } else if (overallSize === 256)
        vex |= 1024;
    } else if (overallSize > 128)
      throw "YMM/ZMM registers can't be encoded without VEX";
    if (adjustByteOp)
      correctedOpcode += this.opDiff;
    return {
      opcode: correctedOpcode,
      size: overallSize,
      rexw,
      prefix: vexInfo.needed ? null : this.allVectors && overallSize > 64 ? 102 : this.prefix,
      extendOp,
      reg,
      rm,
      vex: vexInfo.needed ? vex : null,
      imms
    };
  };

  // instructions.js
  var MAX_INSTR_SIZE = 15;
  var labelDependency = null;
  function reportLabelDependency(dependency) {
    labelDependency = dependency;
  }
  var prefixes = {
    lock: 240,
    repne: 242,
    repnz: 242,
    rep: 243,
    repe: 243,
    repz: 243
  };
  function Instruction(opcode2) {
    this.opcode = opcode2;
    this.bytes = new Uint8Array(MAX_INSTR_SIZE);
    this.length = 0;
    this.interpret();
  }
  Instruction.prototype.genByte = function(byte2) {
    this.bytes[this.length++] = Number(byte2);
  };
  Instruction.prototype.genInteger = function(byte2, size) {
    do {
      this.genByte(byte2 & 0xffn);
      byte2 >>= 8n;
    } while (size -= 8);
  };
  Instruction.prototype.interpret = function() {
    let opcode2 = this.opcode, operand = null, enforcedSize = 0, prefsToGen = 0;
    let vexInfo = {
      needed: opcode2[0] === "v",
      evex: false,
      mask: 0,
      zeroing: false,
      round: null,
      broadcast: null
    };
    let needsRecompilation = false, usesMemory = false;
    labelDependency = null;
    if (prefixes.hasOwnProperty(opcode2)) {
      this.genByte(prefixes[opcode2]);
      ungetToken(token);
      setToken(";");
      return;
    }
    if (!mnemonics.hasOwnProperty(opcode2)) {
      if (vexInfo.needed && !mnemonics.hasOwnProperty(opcode2.slice(0, -1))) {
        opcode2 = opcode2.slice(1);
      }
      if (!mnemonics.hasOwnProperty(opcode2)) {
        enforcedSize = suffixes[opcode2[opcode2.length - 1]];
        opcode2 = opcode2.slice(0, -1);
        if (!mnemonics.hasOwnProperty(opcode2))
          throw "Unknown opcode";
        if (enforcedSize === void 0)
          throw "Invalid opcode suffix";
      }
    }
    let variations = mnemonics[opcode2], operands = [];
    if (typeof variations[0] === "string") {
      if (variations[0][0] === "#") {
        let otherOpcode = variations[0].slice(1);
        if (typeof mnemonics[otherOpcode][0] === "string") {
          mnemonics[otherOpcode] = mnemonics[otherOpcode].map((line) => new Operation(line.split(" ")));
        }
        mnemonics[opcode2] = variations = mnemonics[otherOpcode];
      } else
        mnemonics[opcode2] = variations = variations.map((line) => new Operation(line.split(" ")));
    }
    if (token === "{") {
      vexInfo.evex = true;
      vexInfo.round = ["sae", "rn-sae", "rd-sae", "ru-sae", "rz-sae"].indexOf(next());
      if (vexInfo.round < 0)
        throw "Invalid rounding mode";
      if (next() !== "}")
        throw "Expected '}'";
      if (next() === ",")
        next();
    }
    while (token !== ";" && token !== "\n") {
      operand = new Operand();
      if (token === ":") {
        if (operand.type !== OPT.SEG)
          throw "Incorrect prefix";
        prefsToGen |= operand.reg + 1 << 3;
        next();
        operand = new Operand();
        if (operand.type !== OPT.MEM)
          throw "Segment prefix must be followed by memory reference";
      }
      if (labelDependency !== null) {
        needsRecompilation = true;
        operand.labelDependency = labelDependency;
        labelDependency = null;
      }
      operands.push(operand);
      prefsToGen |= operand.prefs;
      if (operand.reg >= 16 || operand.reg2 >= 16 || operand.size === 512)
        vexInfo.evex = true;
      if (operand.type === OPT.MEM)
        usesMemory = true;
      while (token === "{") {
        vexInfo.evex = true;
        if (next() === "%") {
          vexInfo.mask = parseRegister([OPT.MASK])[0];
          if ((vexInfo.mask & 7) === 0)
            throw "Can't use %k0 as writemask";
        } else if (token === "z")
          vexInfo.zeroing = true, next();
        else if (operand.type === OPT.MEM) {
          vexInfo.broadcast = ["1to2", "1to4", "1to8", "1to16"].indexOf(token);
          if (vexInfo.broadcast < 0)
            throw "Invalid broadcast mode";
          next();
        } else
          throw "Invalid decorator";
        if (token !== "}")
          throw "Expected '}'";
        next();
      }
      if (token !== ",")
        break;
      next();
    }
    if (usesMemory && vexInfo.round !== null)
      throw "Embedded rounding can only be used on reg-reg";
    this.outline = [operands, enforcedSize, variations, prefsToGen, vexInfo];
    this.compile();
    if (!needsRecompilation)
      this.outline = void 0;
  };
  Instruction.prototype.compile = function() {
    let [operands, enforcedSize, variations, prefsToGen, vexInfo] = this.outline;
    this.length = 0;
    for (let op2 of operands) {
      if (op2.type === OPT.IMM && enforcedSize === 0) {
        op2.size = inferImmSize(op2.value);
        op2.unsignedSize = inferUnsignedImmSize(op2.value);
      }
    }
    let op, found = false, rexVal = 64;
    for (let variation of variations) {
      op = variation.fit(operands, enforcedSize, vexInfo);
      if (op !== null) {
        found = true;
        break;
      }
    }
    if (!found)
      throw "Invalid operands";
    if (op.rexw)
      rexVal |= 8, prefsToGen |= PREFIX_REX;
    let modRM = null, sib = null;
    if (op.extendOp)
      rexVal |= 1, prefsToGen |= PREFIX_REX;
    else if (op.rm !== null) {
      let extraRex;
      [extraRex, modRM, sib] = makeModRM(op.rm, op.reg);
      if (extraRex !== 0)
        rexVal |= extraRex, prefsToGen |= PREFIX_REX;
    }
    if ((prefsToGen & PREFIX_CLASHREX) == PREFIX_CLASHREX)
      throw "Can't encode high 8-bit register";
    opcode = op.opcode;
    if (prefsToGen >= PREFIX_SEG)
      this.genByte([38, 46, 54, 62, 100, 101][(prefsToGen >> 3) - 1]);
    if (prefsToGen & PREFIX_ADDRSIZE)
      this.genByte(103);
    if (op.size === 16)
      this.genByte(102);
    if (op.prefix !== null)
      this.genByte(op.prefix);
    if (op.vex !== null)
      makeVexPrefix(op.vex, rexVal, vexInfo.evex).map((x) => this.genByte(x));
    else {
      if (prefsToGen & PREFIX_REX)
        this.genByte(rexVal);
      if (opcode > 65535)
        this.genByte(opcode >> 16);
      if (opcode > 255)
        this.genByte(opcode >> 8);
    }
    this.genByte(opcode);
    if (modRM !== null)
      this.genByte(modRM);
    if (sib !== null)
      this.genByte(sib);
    if (op.rm !== null && op.rm.value !== null)
      this.genInteger(op.rm.value, op.rm.dispSize || 32);
    for (let imm of op.imms)
      this.genInteger(imm.value, imm.size);
  };
  function makeModRM(rm, r) {
    let modrm = 0, rex = 0;
    if (r.reg >= 8) {
      rex |= 4;
      r.reg &= 7;
    }
    modrm |= r.reg << 3;
    if (rm.ripRelative) {
      rm.value ||= 0n;
      return [rex, modrm | 5, null];
    }
    if (rm.type !== OPT.MEM && rm.type !== OPT.VMEM)
      modrm |= 192;
    else if (rm.reg >= 0) {
      if (rm.value !== null) {
        if (inferImmSize(rm.value) === 8) {
          rm.dispSize = 8;
          modrm |= 64;
        } else
          modrm |= 128;
      }
    } else {
      rm.reg = 5;
      if (rm.reg2 < 0)
        rm.reg2 = 4;
      rm.value ||= 0n;
    }
    rex |= rm.reg >> 3;
    rm.reg &= 7;
    if (rm.reg2 >= 0) {
      if (rm.reg2 >= 8) {
        rex |= 2;
        rm.reg2 &= 7;
      }
      return [rex, modrm | 4, rm.shift << 6 | rm.reg2 << 3 | rm.reg];
    }
    return [rex, modrm | rm.reg, null];
  }
  function makeVexPrefix(vex, rex, isEvex) {
    if (isEvex) {
      vex ^= 524304;
    }
    let vex1 = vex & 255, vex2 = vex >> 8, vex3 = vex >> 16;
    vex1 |= (~rex & 7) << 5;
    vex2 |= (rex & 8) << 4;
    if (isEvex) {
      return [98, vex1, vex2, vex3];
    }
    if ((vex1 & 127) == 97 && (vex2 & 128) == 0) {
      return [197, vex2 | vex1 & 128];
    }
    return [196, vex1, vex2];
  }
  function inferImmSize(value) {
    if (value < 0n) {
      value = -value - 1n;
    }
    return value < 0x80n ? 8 : value < 0x8000n ? 16 : value < 0x80000000n ? 32 : 64;
  }
  function inferUnsignedImmSize(value) {
    if (value < 0n) {
      value = -2n * value - 1n;
    }
    return value < 0x100n ? 8 : value < 0x10000n ? 16 : value < 0x100000000n ? 32 : 64;
  }

  // compiler.js
  var srcTokens;
  var match;
  var currIndex = 0;
  var token;
  var labels = new Map();
  var macros = new Map();
  function lowerCase(str) {
    if (str[0] == '"' || str[0] == "'")
      return str;
    return str.toLowerCase();
  }
  var next = defaultNext = () => token = (match = srcTokens.next()).done ? "\n" : macros.has(match.value[0]) ? (insertTokens(macros.get(match.value[0])), next()) : match.value[0][0] === "#" ? next() : lowerCase(match.value[0]);
  function insertTokens(tokens) {
    let tokensCopy = [...tokens];
    next = () => token = tokensCopy.shift() || (next = defaultNext)();
  }
  function ungetToken(t) {
    let oldNext = next;
    next = () => token = (next = oldNext, t);
  }
  function peekNext() {
    let oldToken = token, nextToken = next();
    ungetToken(nextToken);
    token = oldToken;
    return nextToken;
  }
  function setToken(tok) {
    token = tok;
  }
  function compileAsm(source) {
    let instructions = [];
    let opcode2, resizeChange, instr, i2;
    next = defaultNext;
    labels.clear();
    macros.clear();
    currIndex = 0;
    srcTokens = source.matchAll(/(["'])(\\.|[^\\])*?\1|[\w.-]+|#.*|[\S\n]/g);
    while (next(), !match.done) {
      try {
        if (token !== "\n" && token !== ";") {
          if (token[0] === ".") {
            instr = parseDirective();
            currIndex += instr.length;
            instructions.push(instr);
          } else {
            opcode2 = token;
            switch (next()) {
              case ":":
                labels.set(opcode2, currIndex);
                continue;
              case "=":
                let macroTokens = [];
                while (next() !== "\n")
                  macroTokens.push(token);
                macros.set(opcode2, macroTokens);
                break;
              default:
                instr = new Instruction(opcode2);
                currIndex += instr.length;
                instructions.push(instr);
                break;
            }
          }
        }
        if (token === "\n")
          instructions.push("");
        else if (token !== ";")
          throw "Expected end of line";
      } catch (e) {
        console.warn(e);
        while (token !== "\n" && token !== ";")
          next();
        if (token === "\n")
          instructions.push("");
      }
    }
    currIndex = 0;
    for (i2 = 0; i2 < instructions.length; i2++) {
      instr = instructions[i2];
      currIndex += instr.length;
      if (instr.outline) {
        try {
          for (let op of instr.outline[0]) {
            if (op.labelDependency !== void 0) {
              op.value = BigInt(labels.get(op.labelDependency) - currIndex);
            }
          }
          resizeChange = instr.length;
          instr.compile();
          resizeChange -= instr.length;
          if (resizeChange) {
            labels.forEach((index, label) => {
              if (index >= currIndex)
                labels.set(label, labels.get(label) - resizeChange);
            });
            i2 = -1, currIndex = 0;
          }
        } catch (e) {
          instructions.splice(i2, 1);
          i2 = -1;
          currIndex = 0;
        }
      }
    }
    return instructions;
  }

  // printable/printableEditor.js
  var editor = CodeMirror(document.getElementById("inputAreaContainer"), {
    theme: "editor",
    mode: "gas",
    lineNumbers: true
  });
  var asmTextOutput = document.getElementById("outputArea");
  asmTextOutput.onclick = function() {
    window.getSelection().selectAllChildren(asmTextOutput.parentElement);
    document.execCommand("copy");
  };
  var printableOutputArea = document.getElementById("printableCodeOutput");
  var printableOutputContainer = document.getElementById("printableCode");
  printableOutputContainer.onclick = function() {
    window.getSelection().selectAllChildren(printableOutputContainer);
    document.execCommand("copy");
  };
  var uniSeq = new Uint8Array(8);
  var uniDepth = 0;
  var expectedDepth = 0;
  var hexOutput = "";
  var printableOutput = "";
  var tempHexOutput = "";
  var justEscaped = false;
  var prevCode = document.cookie.split("; ").find((row) => row.startsWith("code="));
  if (prevCode)
    editor.setValue(decodeURIComponent(prevCode.slice(5))), compileEditorCode();
  editor.on("change", compileEditorCode);
  function compileEditorCode() {
    document.cookie = "code=" + encodeURIComponent(editor.getValue());
    let instructions = compileAsm(editor.getValue()), firstOnLine = true, thisDepth = 0, hex2;
    justEscaped = false;
    printableOutput = tempHexOutput = hexOutput = "";
    uniDepth = expectedDepth = 0;
    for (let instr of instructions) {
      if (instr === "")
        tempHexOutput += "\n", firstOnLine = true;
      else
        for (i = 0; i < instr.length; i++) {
          byte = instr.bytes[i];
          thisDepth = getByteDepth(byte);
          hex2 = (firstOnLine ? "" : " ") + byte.toString(16).toUpperCase().padStart(2, "0");
          firstOnLine = false;
          if (byte === 0) {
            tempHexOutput += hex2;
            uniSeq[uniDepth++] = 0;
            dumpBadSeq();
          } else if (thisDepth === 0) {
            if (expectedDepth)
              dumpBadSeq();
            hexOutput += tempHexOutput + hex2;
            if (justEscaped && byte >= 48 && byte < 56)
              printableOutput += '""';
            if (byte === 13)
              printableOutput += "\\r";
            else if (byte === 34)
              printableOutput += '\\"';
            else if (byte === 92)
              printableOutput += "\\\\";
            else
              printableOutput += String.fromCharCode(byte);
            tempHexOutput = "";
            expectedDepth = uniDepth = 0;
            justEscaped = false;
          } else {
            if (expectedDepth === 0) {
              if (thisDepth === 1) {
                uniSeq[uniDepth++] = byte;
                tempHexOutput += hex2;
                dumpBadSeq();
              } else
                expectedDepth = thisDepth, uniSeq[uniDepth++] = byte, tempHexOutput += hex2;
            } else {
              if (thisDepth !== 1) {
                dumpBadSeq();
                expectedDepth = thisDepth;
                uniSeq[uniDepth++] = byte;
                tempHexOutput += hex2;
              } else {
                uniSeq[uniDepth++] = byte;
                tempHexOutput += hex2;
                if (expectedDepth === uniDepth)
                  dumpUniSeq();
              }
            }
          }
        }
    }
    if (expectedDepth)
      dumpBadSeq();
    asmTextOutput.innerHTML = hexOutput;
    printableOutputArea.innerHTML = '"' + printableOutput + '"';
  }
  function getByteDepth(x) {
    let i2 = 8;
    while (i2--) {
      if ((x & 1 << i2) === 0)
        return 7 - i2;
    }
    return 8;
  }
  function dumpUniSeq() {
    try {
      printableOutput += '<span class="codeChar">' + decodeURIComponent((" " + tempHexOutput).replace(/\s+/g, "%")) + "</span>";
      hexOutput += '<span class="codeChar">' + tempHexOutput + "</span>";
      tempHexOutput = "";
      expectedDepth = uniDepth = 0;
    } catch (e) {
      dumpBadSeq();
    }
  }
  function dumpBadSeq() {
    hexOutput += '<span class="codeBad">' + tempHexOutput + "</span>";
    printableOutput += '<span class="codeBad">' + escapeUniSeq(uniSeq.slice(0, uniDepth)) + "</span>";
    tempHexOutput = "";
    expectedDepth = uniDepth = 0;
    justEscaped = true;
  }
  function escapeUniSeq(seq) {
    let result = "";
    for (let i2 = 0; i2 < seq.length; i2++) {
      result += "\\" + seq[i2].toString(8);
    }
    return result;
  }
})();
