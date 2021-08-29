#!/usr/bin/env node
"use strict";
// Operand parsing test

// AT&T prefix | AT&T noprefix | Intel prefix | Intel noprefix | Optype (separated by spaces)
let opStrings = `%al al %al al REG
%ax ax %ax ax REG
%eax eax %eax eax REG
%rax rax %rax rax REG
$20 $20 20 20 IMM
$54/7 $54/7 54/7 54/7 IMM
(%rax) (rax) [%rax] [rax] MEM
(%rax,%rsi) (rax,rsi) [%rax+%rsi] [rax+rsi] MEM
(%rbx,%rcx,2) (rbx,rcx,2) [%rbx+%rcx*2] [rbx+rcx*2] MEM
(,%rcx) (,rcx) [%rcx*1] [rcx*1] MEM
(,%rdi,4) (,rdi,4) [%rdi*4] [rdi*4] MEM
(%rsp,%rsi) (rsp,rsi) [%rsi+%rsp] [rsi+rsp] MEM
24/5(%rsp,%rdx,4) 24/5(rsp,rdx,4) 24/5[%rsp+4*%rdx] [24/5+rsp+rdx*4] MEM
(%rip) (rip) [%rip] [rip] MEM
234(%rip) 234(rip) 234[%rip] [234+rip] MEM
%mm1 mm1 %mm1 mm1 VEC
%xmm1 xmm1 %xmm1 xmm1 VEC
%ymm1 ymm1 %ymm1 ymm1 VEC
%zmm1 zmm1 %zmm1 zmm1 VEC
(,%xmm1) (,xmm1) [%xmm1] [xmm1] VMEM
(%rax,%xmm1) (rax,xmm1) [%xmm1+%rax] [rax+xmm1] VMEM
(%rax,%xmm1,2) (rax,xmm1,2) [%xmm1*2+%rax] [rax+2*xmm1] VMEM
%bnd1 bnd1 %bnd1 bnd1 BND
%k1 k1 %k1 k1 MASK
%st st %st st ST
%st(1) st(1) %st(1) st(1) ST
%fs fs %fs fs SEG
%cr0 cr0 %cr0 cr0 CTRL
%dr0 dr0 %dr0 dr0 DBG`;
let opTests = opStrings.split('\n').map(x => x.split(' '));
let syntaxes = [
    {intel: false,  prefix: true},
    {intel: false,  prefix: false},
    {intel: true,   prefix: true},
    {intel: true,   prefix: false}
];


exports.run = async function()
{
    await import("@defasm/core");
    const { loadCode, setSyntax } = await import("@defasm/core/parser.js");
    const { Operand, OPT } = await import("@defasm/core/operands.js");

    for(let test of opTests)
    {
        let expectedType = OPT[test[4]];

        for(let i = 0; i < 4; i++)
        {
            console.log(test[i]);
            setSyntax(syntaxes[i]);
            loadCode(test[i]);
            let type = new Operand({syntax: syntaxes[i]}).type;
            if(type !== expectedType)
                throw `${test[i]} (.${
                    syntaxes[i].intel ? 'intel' : 'att'
                }_syntax ${
                    syntaxes[i].prefix ? '' : 'no'
                }prefix) got ${
                    Object.keys(OPT).find(x => OPT[x] == type)
                }, expected ${
                    Object.keys(OPT).find(x => OPT[x] == expectedType)
                }`;
        }
    }
}

if(require.main === module)
{
    exports.run().then(x => process.exit(0)).catch(x => { console.error(x); process.exit(1) });
}