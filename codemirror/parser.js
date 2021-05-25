// This file was generated by lezer-generator. You probably shouldn't edit it.
import {Parser} from "lezer"
import {isOpcode, isRegister, isDirective} from "./asmPlugin"
export const parser = Parser.deserialize({
  version: 13,
  states: "%pOQOPOOOOOO'#Cl'#ClOlOPO'#CcOzOQO'#CcO!`OSO'#ChOOOO'#Cq'#CqO!nOPO'#CqQOOOOOOOOO-E6j-E6jOzOQO,58}O!vOSO'#CdO!{OPO'#CfO#ZOPO'#CfO#cOPO'#CrOOOO,58},58}O#nOPO'#CxOOOO,59S,59SOOOO,59],59]OOOO1G.i1G.iOOOO,59O,59OO#ZOPO,59QOOOO'#Cm'#CmO#yOPO'#CuO$ROPO,59QO$WOQO'#CnO$oOPO,59^O$zOSO'#CoO%]OPO,59dO%hOPO1G.lOOOO-E6k-E6kOOOO1G.l1G.lOOOO,59Y,59YOOOO-E6l-E6lOOOO,59Z,59ZOOOO-E6m-E6mOOOO7+$W7+$W",
  stateData: "%s~OPROQPOSSOUTO^UO_UOmVPnVP~OPXOQPOmVXnVX~OR]OZZOgYOh[OmfPnfP~OX_O]_OmlPnlP~OmaOnaO~OXcO~OhdOjYXmYXnYX~OjeOkiP~OjhOmfXnfX~OjjOmlXnlX~OjeOkiX~OknO~ORoOZZOgYOh[OjbXmbXnbX~OjhOmfanfa~OXqO]qOjcXmcXncX~OjjOmlanla~OksO~O^UZho~",
  goto: "!umPPPPPPPnqPqPnPPPx!O!V!]P!c!fPP!lPP!rRUOS]RXRohQQORWQSf[dRmfQi]RpiQk_RrkRVOQ^RRbXQg[RldR`S",
  nodeNames: "⚠ Opcode Prefix Register Directive Program LabelDefinition InstructionStatement Immediate Expression Memory Relative DirectiveStatement FullString MacroDefinition Comment",
  maxTerm: 33,
  skippedNodes: [0],
  repeatNodeCount: 4,
  tokenData: "#6R~RdYZ!aqr!frs!!tst!#htu!#suv!#xwx#_xy!%Vyz!%t{|!f|}!%y}!O!f!O!P!&O!Q!R5Z!R![3X!]!^!'p!c!}!'u#R#S!'u#T#o!'u#r#s!f~!fOn~U!i[qr!fwx#_xy2l{|!f}!O!f!O!P3X!Q!R5Z!R![3X!c!}7p#R#S7p#T#o7p#r#s!fU#fjXSZQOY#_Zq#_qr%Wru#_uv'lvw*Qwx0pxy#_yz#_z{'l{|'l|}#_}!O'l!O!P#_!P!Q'l!Q!^#_!^!_<d!_!`@z!`!aEX!a#O#_#O#PIx#P#Q#_#Q#R'l#R#p#_#p#qJO#q~#_U%_sXSZQOY#_Zq#_qr%Wru#_uv'lvw*Qwx#_xy,fyz#_z{'l{|'l|}#_}!O'l!O!P.t!P!Q'l!Q!R>x!R![.t![!^#_!^!_<d!_!`Bs!`!aEX!a!c#_!c!}Gm!}#O#_#O#PIx#P#Q#_#Q#R'l#R#SGm#S#T#_#T#oGm#o#p#_#p#qJO#q#r#_#r#s'l#s~#_U'ssXSZQOY#_Zq#_qr%Wru#_uv'lvw*Qwx#_xy,fyz#_z{'l{|'l|}#_}!O'l!O!P.t!P!Q'l!Q!R>x!R![.t![!^#_!^!_<d!_!`@z!`!aEX!a!c#_!c!}Gm!}#O#_#O#PIx#P#Q#_#Q#R'l#R#SGm#S#T#_#T#oGm#o#p#_#p#qJO#q#r#_#r#s'l#s~#_U*XsXSZQOY#_Zq#_qr%Wru#_uv'lvw*Qwx#_xy,fyz#_z{'l{|'l|}#_}!O'l!O!P.t!P!Q'l!Q!R>x!R![.t![!^#_!^!_<d!_!`@z!`!aEX!a!c#_!c!}Gm!}#O#_#O#PIx#P#Q#_#Q#R'l#R#SGm#S#T#_#T#oGm#o#p#_#p#qJO#q#r#_#r#s'l#s~#_U,mqXSZQOY#_Zq#_qr%Wru#_uv'lvw*Qwx#_xy,fyz#_z{'l{|'l|}#_}!O'l!O!P.t!P!Q'l!Q!R>x!R![.t![!^#_!^!_<d!_!`@z!`!aEX!a!c#_!c!}Gm!}#O#_#O#PIx#P#Q#_#Q#R'l#R#SGm#S#T#_#T#oGm#o#p#_#p#qJO#q~#_U.{kXSZQOY#_Zq#_qr%Wru#_uv'lvw*Qwx0pxy#_yz#_z{'l{|'l|}#_}!O'l!O!P.t!P!Q'l!Q![.t![!^#_!^!_<d!_!`@z!`!aEX!a#O#_#O#PIx#P#Q#_#Q#R'l#R#p#_#p#qJO#q~#_U0w]XSZQqr1puv!fvw4_yz6dz{!f{|!f}!O!f!P!Q!f!^!_6n!_!`8|!`!a9S#Q#R!f#p#q:RU1s]qr!fwx#_xy2l{|!f}!O!f!O!P3X!Q!R5Z!R![3X!_!`!f!c!}7p#R#S7p#T#o7p#r#s!fU2oWwx#_xy2l!O!P3X!Q!R5Z!R![3X!c!}7p#R#S7p#T#o7pU3`_XSZQqr1puv!fvw4_yz6dz{!f{|!f}!O!f!O!P3X!P!Q!f!Q![3X!^!_6n!_!`8|!`!a9S#Q#R!f#p#q:RU4b]qr!fvw!fwx#_xy2l{|!f}!O!f!O!P3X!Q!R5Z!R![3X!c!}7p#R#S7p#T#o7p#r#s!fU5b`XSZQqr1puv!fvw4_yz6dz{!f{|!f}!O!f!O!P3X!P!Q!f!Q![3X!^!_6n!_!`8|!`!a9S#Q#R!f#l#m:}#p#q:RU6kPXSZQyz6dU6q_qr!fwx#_xy2l{|!f}!O!f!O!P3X!Q!R5Z!R![3X!^!_!f!_!`!f!`!a!f!c!}7p#R#S7p#T#o7p#r#s!fU7waXSZQqr1puv!fvw4_yz6dz{!f{|!f}!O!f!P!Q!f!Q![7p!^!_6n!_!`8|!`!a9S!c!}7p#Q#R!f#R#S7p#T#o7p#p#q:RU9PP!_!`!fU9V^qr!fwx#_xy2l{|!f}!O!f!O!P3X!Q!R5Z!R![3X!_!`!f!`!a!f!c!}7p#R#S7p#T#o7p#r#s!fU:U]qr!fwx#_xy2l{|!f}!O!f!O!P3X!Q!R5Z!R![3X!c!}7p#R#S7p#T#o7p#p#q!f#r#s!fU;QR!Q![;Z!c!i;Z#T#Z;ZU;b`XSZQqr1puv!fvw4_yz6dz{!f{|!f}!O!f!P!Q!f!Q![;Z!^!_6n!_!`8|!`!a9S!c!i;Z#Q#R!f#T#Z;Z#p#q:RU<ksXSZQOY#_Zq#_qr%Wru#_uv'lvw*Qwx#_xy,fyz#_z{'l{|'l|}#_}!O'l!O!P.t!P!Q'l!Q!R>x!R![.t![!^#_!^!_<d!_!`Bs!`!aEX!a!c#_!c!}Gm!}#O#_#O#PIx#P#Q#_#Q#R'l#R#SGm#S#T#_#T#oGm#o#p#_#p#qJO#q#r#_#r#s'l#s~#_U?PmXSZQOY#_Zq#_qr%Wru#_uv'lvw*Qwx0pxy#_yz#_z{'l{|'l|}#_}!O'l!O!P.t!P!Q'l!Q![.t![!^#_!^!_<d!_!`@z!`!aEX!a#O#_#O#PIx#P#Q#_#Q#R'l#R#l#_#l#mLd#m#p#_#p#qJO#q~#_UARjXSZQOY#_Zq#_qr%Wru#_uv'lvw*Qwx0pxy#_yz#_z{'l{|'l|}#_}!O'l!O!P#_!P!Q'l!Q!^#_!^!_<d!_!`Bs!`!aEX!a#O#_#O#PIx#P#Q#_#Q#R'l#R#p#_#p#qJO#q~#_UBzsXSZQOY#_Zq#_qr%Wru#_uv'lvw*Qwx#_xy,fyz#_z{'l{|'l|}#_}!O'l!O!P.t!P!Q'l!Q!R>x!R![.t![!^#_!^!_<d!_!`Bs!`!aEX!a!c#_!c!}Gm!}#O#_#O#PIx#P#Q#_#Q#R'l#R#SGm#S#T#_#T#oGm#o#p#_#p#qJO#q#r#_#r#s'l#s~#_UE`sXSZQOY#_Zq#_qr%Wru#_uv'lvw*Qwx#_xy,fyz#_z{'l{|'l|}#_}!O'l!O!P.t!P!Q'l!Q!R>x!R![.t![!^#_!^!_<d!_!`Bs!`!aEX!a!c#_!c!}Gm!}#O#_#O#PIx#P#Q#_#Q#R'l#R#SGm#S#T#_#T#oGm#o#p#_#p#qJO#q#r#_#r#s'l#s~#_UGtpXSZQOY#_Zq#_qr%Wru#_uv'lvw*Qwx0pxy#_yz#_z{'l{|'l|}#_}!O'l!O!P#_!P!Q'l!Q![Gm![!^#_!^!_<d!_!`@z!`!aEX!a!c#_!c!}Gm!}#O#_#O#PIx#P#Q#_#Q#R'l#R#SGm#S#T#_#T#oGm#o#p#_#p#qJO#q~#_UI{PO~#_UJVsXSZQOY#_Zq#_qr%Wru#_uv'lvw*Qwx#_xy,fyz#_z{'l{|'l|}#_}!O'l!O!P.t!P!Q'l!Q!R>x!R![.t![!^#_!^!_<d!_!`@z!`!aEX!a!c#_!c!}Gm!}#O#_#O#PIx#P#Q#_#Q#R'l#R#SGm#S#T#_#T#oGm#o#p#_#p#qJO#q#r#_#r#s'l#s~#_ULkoXSZQOY#_Zq#_qr%Wru#_uv'lvw*Qwx0pxy#_yz#_z{'l{|'l|}#_}!O'l!O!P#_!P!Q'l!Q![Nl![!^#_!^!_<d!_!`@z!`!aEX!a!c#_!c!iNl!i#O#_#O#PIx#P#Q#_#Q#R'l#R#T#_#T#ZNl#Z#p#_#p#qJO#q~#_UNsoXSZQOY#_Zq#_qr%Wru#_uv'lvw*Qwx0pxy#_yz#_z{'l{|'l|}#_}!O'l!O!P#_!P!Q'l!Q![Nl![!^#_!^!_<d!_!`@z!`!aEX!a!c#_!c!iNl!i#O#_#O#PIx#P#Q#_#Q#R'l#R#T#_#T#ZNl#Z#p#_#p#qJO#q~#_~!!yU]~OY!!tZr!!trs!#]s#O!!t#O#P!#b#P~!!t~!#bO]~~!#ePO~!!t~!#mQ_~OY!#hZ~!#h~!#xOg~~!#{]X^!#xpq!#x!c!}!$t#R#S!$t#T#o!$t#y#z!#x$f$g!#x#BY#BZ!#x$IS$I_!#x$I|$JO!#x$JT$JU!#x$KV$KW!#x&FU&FV!#x~!$ySp~!Q![!$t!c!}!$t#R#S!$t#T#o!$tV!%[WhRwx#_xy2l!O!P3X!Q!R5Z!R![3X!c!}7p#R#S7p#T#o7p~!%yOk~~!&OOj~V!&VbXSZQqr1puv!fvw4_yz6dz{!f{|!f}!O!f!O!P3X!P!Q!f!Q![3X!^!_6n!_!`8|!`!a9S!c!}!'_#Q#R!f#R#S!'_#T#o!'_#p#q:RP!'dSqP!Q![!'_!c!}!'_#R#S!'_#T#o!'_~!'uOm~V!(OlXSZQoPX^!)vpq!)vqr1puv!fvw4_yz6dz{!f{|!f}!O!f!P!Q!f!Q![!'u![!]!*o!^!_6n!_!`!+P!`!a9S!c!}!'u#Q#R!f#R#S!'u#T#o!'u#p#q:R#y#z!)v$f$g!)v#BY#BZ!)v$IS$I_!)v$I|$JO!)v$JT$JU!)v$KV$KW!)v&FU&FV!)vP!)y[X^!)vpq!)v![!]!*o!_!`!*t#y#z!)v$f$g!)v#BY#BZ!)v$IS$I_!)v$I|$JO!)v$JT$JU!)v$KV$KW!)v&FU&FV!)vP!*tOUPP!*yQ^POY!*tZ~!*tV!+US^POY!*tZ!_!*t!_!`!+b!`~!*tV!+gg^POY!*tZq!*tqr!+brw!*twx!-Oxy!>Ry{!*t{|!+b|}!*t}!O!+b!O!P!?Y!P!Q!*t!Q!R!Bn!R![!?Y![!c!*t!c!}!Fx!}#R!*t#R#S!Fx#S#T!*t#T#o!Fx#o#r!*t#r#s!+b#s~!*tV!-XjXS^PZQOY!-OZq!-Oqr!.yru!-Ouv!1avw!3wwx!:mxy!-Oyz!-Oz{!1a{|!1a|}!-O}!O!1a!O!P!-O!P!Q!1a!Q!^!-O!^!_# V!_!`#%q!`!a#*S!a#O!-O#O#P#.w#P#Q!-O#Q#R!1a#R#p!-O#p#q#/V#q~!-OV!/SsXS^PZQOY!-OZq!-Oqr!.yru!-Ouv!1avw!3wwx!-Oxy!6_yz!-Oz{!1a{|!1a|}!-O}!O!1a!O!P!8o!P!Q!1a!Q!R##m!R![!8o![!^!-O!^!_# V!_!`#'l!`!a#*S!a!c!-O!c!}#,j!}#O!-O#O#P#.w#P#Q!-O#Q#R!1a#R#S#,j#S#T!-O#T#o#,j#o#p!-O#p#q#/V#q#r!-O#r#s!1a#s~!-OV!1jsXS^PZQOY!-OZq!-Oqr!.yru!-Ouv!1avw!3wwx!-Oxy!6_yz!-Oz{!1a{|!1a|}!-O}!O!1a!O!P!8o!P!Q!1a!Q!R##m!R![!8o![!^!-O!^!_# V!_!`#%q!`!a#*S!a!c!-O!c!}#,j!}#O!-O#O#P#.w#P#Q!-O#Q#R!1a#R#S#,j#S#T!-O#T#o#,j#o#p!-O#p#q#/V#q#r!-O#r#s!1a#s~!-OV!4QsXS^PZQOY!-OZq!-Oqr!.yru!-Ouv!1avw!3wwx!-Oxy!6_yz!-Oz{!1a{|!1a|}!-O}!O!1a!O!P!8o!P!Q!1a!Q!R##m!R![!8o![!^!-O!^!_# V!_!`#%q!`!a#*S!a!c!-O!c!}#,j!}#O!-O#O#P#.w#P#Q!-O#Q#R!1a#R#S#,j#S#T!-O#T#o#,j#o#p!-O#p#q#/V#q#r!-O#r#s!1a#s~!-OV!6hqXS^PZQOY!-OZq!-Oqr!.yru!-Ouv!1avw!3wwx!-Oxy!6_yz!-Oz{!1a{|!1a|}!-O}!O!1a!O!P!8o!P!Q!1a!Q!R##m!R![!8o![!^!-O!^!_# V!_!`#%q!`!a#*S!a!c!-O!c!}#,j!}#O!-O#O#P#.w#P#Q!-O#Q#R!1a#R#S#,j#S#T!-O#T#o#,j#o#p!-O#p#q#/V#q~!-OV!8xkXS^PZQOY!-OZq!-Oqr!.yru!-Ouv!1avw!3wwx!:mxy!-Oyz!-Oz{!1a{|!1a|}!-O}!O!1a!O!P!8o!P!Q!1a!Q![!8o![!^!-O!^!_# V!_!`#%q!`!a#*S!a#O!-O#O#P#.w#P#Q!-O#Q#R!1a#R#p!-O#p#q#/V#q~!-OV!:vgXS^PZQOY!*tZq!*tqr!<_ru!*tuv!+bvw!@}wy!*tyz!Diz{!+b{|!+b|}!*t}!O!+b!O!P!*t!P!Q!+b!Q!^!*t!^!_!EO!_!`!+P!`!a!H|!a#Q!*t#Q#R!+b#R#p!*t#p#q!Js#q~!*tV!<di^POY!*tZq!*tqr!+brw!*twx!-Oxy!>Ry{!*t{|!+b|}!*t}!O!+b!O!P!?Y!P!Q!*t!Q!R!Bn!R![!?Y![!_!*t!_!`!+b!`!c!*t!c!}!Fx!}#R!*t#R#S!Fx#S#T!*t#T#o!Fx#o#r!*t#r#s!+b#s~!*tV!>W`^POY!*tZw!*twx!-Oxy!>Ry!O!*t!O!P!?Y!P!Q!*t!Q!R!Bn!R![!?Y![!c!*t!c!}!Fx!}#R!*t#R#S!Fx#S#T!*t#T#o!Fx#o~!*tV!?chXS^PZQOY!*tZq!*tqr!<_ru!*tuv!+bvw!@}wy!*tyz!Diz{!+b{|!+b|}!*t}!O!+b!O!P!?Y!P!Q!+b!Q![!?Y![!^!*t!^!_!EO!_!`!+P!`!a!H|!a#Q!*t#Q#R!+b#R#p!*t#p#q!Js#q~!*tV!ASh^POY!*tZq!*tqr!+brv!*tvw!+bwx!-Oxy!>Ry{!*t{|!+b|}!*t}!O!+b!O!P!?Y!P!Q!*t!Q!R!Bn!R![!?Y![!c!*t!c!}!Fx!}#R!*t#R#S!Fx#S#T!*t#T#o!Fx#o#r!*t#r#s!+b#s~!*tV!BwjXS^PZQOY!*tZq!*tqr!<_ru!*tuv!+bvw!@}wy!*tyz!Diz{!+b{|!+b|}!*t}!O!+b!O!P!?Y!P!Q!+b!Q![!?Y![!^!*t!^!_!EO!_!`!+P!`!a!H|!a#Q!*t#Q#R!+b#R#l!*t#l#m!Lg#m#p!*t#p#q!Js#q~!*tV!DrSXS^PZQOY!*tZy!*tyz!Diz~!*tV!ETk^POY!*tZq!*tqr!+brw!*twx!-Oxy!>Ry{!*t{|!+b|}!*t}!O!+b!O!P!?Y!P!Q!*t!Q!R!Bn!R![!?Y![!^!*t!^!_!+b!_!`!+b!`!a!+b!a!c!*t!c!}!Fx!}#R!*t#R#S!Fx#S#T!*t#T#o!Fx#o#r!*t#r#s!+b#s~!*tV!GRmXS^PZQOY!*tZq!*tqr!<_ru!*tuv!+bvw!@}wy!*tyz!Diz{!+b{|!+b|}!*t}!O!+b!O!P!*t!P!Q!+b!Q![!Fx![!^!*t!^!_!EO!_!`!+P!`!a!H|!a!c!*t!c!}!Fx!}#Q!*t#Q#R!+b#R#S!Fx#S#T!*t#T#o!Fx#o#p!*t#p#q!Js#q~!*tV!IRj^POY!*tZq!*tqr!+brw!*twx!-Oxy!>Ry{!*t{|!+b|}!*t}!O!+b!O!P!?Y!P!Q!*t!Q!R!Bn!R![!?Y![!_!*t!_!`!+b!`!a!+b!a!c!*t!c!}!Fx!}#R!*t#R#S!Fx#S#T!*t#T#o!Fx#o#r!*t#r#s!+b#s~!*tV!Jxi^POY!*tZq!*tqr!+brw!*twx!-Oxy!>Ry{!*t{|!+b|}!*t}!O!+b!O!P!?Y!P!Q!*t!Q!R!Bn!R![!?Y![!c!*t!c!}!Fx!}#R!*t#R#S!Fx#S#T!*t#T#o!Fx#o#p!*t#p#q!+b#q#r!*t#r#s!+b#s~!*tV!LlW^POY!*tZ!Q!*t!Q![!MU![!c!*t!c!i!MU!i#T!*t#T#Z!MU#Z~!*tV!M_lXS^PZQOY!*tZq!*tqr!<_ru!*tuv!+bvw!@}wy!*tyz!Diz{!+b{|!+b|}!*t}!O!+b!O!P!*t!P!Q!+b!Q![!MU![!^!*t!^!_!EO!_!`!+P!`!a!H|!a!c!*t!c!i!MU!i#Q!*t#Q#R!+b#R#T!*t#T#Z!MU#Z#p!*t#p#q!Js#q~!*tV# `sXS^PZQOY!-OZq!-Oqr!.yru!-Ouv!1avw!3wwx!-Oxy!6_yz!-Oz{!1a{|!1a|}!-O}!O!1a!O!P!8o!P!Q!1a!Q!R##m!R![!8o![!^!-O!^!_# V!_!`#'l!`!a#*S!a!c!-O!c!}#,j!}#O!-O#O#P#.w#P#Q!-O#Q#R!1a#R#S#,j#S#T!-O#T#o#,j#o#p!-O#p#q#/V#q#r!-O#r#s!1a#s~!-OV##vmXS^PZQOY!-OZq!-Oqr!.yru!-Ouv!1avw!3wwx!:mxy!-Oyz!-Oz{!1a{|!1a|}!-O}!O!1a!O!P!8o!P!Q!1a!Q![!8o![!^!-O!^!_# V!_!`#%q!`!a#*S!a#O!-O#O#P#.w#P#Q!-O#Q#R!1a#R#l!-O#l#m#1m#m#p!-O#p#q#/V#q~!-OV#%zjXS^PZQOY!-OZq!-Oqr!.yru!-Ouv!1avw!3wwx!:mxy!-Oyz!-Oz{!1a{|!1a|}!-O}!O!1a!O!P!-O!P!Q!1a!Q!^!-O!^!_# V!_!`#'l!`!a#*S!a#O!-O#O#P#.w#P#Q!-O#Q#R!1a#R#p!-O#p#q#/V#q~!-OV#'usXS^PZQOY!-OZq!-Oqr!.yru!-Ouv!1avw!3wwx!-Oxy!6_yz!-Oz{!1a{|!1a|}!-O}!O!1a!O!P!8o!P!Q!1a!Q!R##m!R![!8o![!^!-O!^!_# V!_!`#'l!`!a#*S!a!c!-O!c!}#,j!}#O!-O#O#P#.w#P#Q!-O#Q#R!1a#R#S#,j#S#T!-O#T#o#,j#o#p!-O#p#q#/V#q#r!-O#r#s!1a#s~!-OV#*]sXS^PZQOY!-OZq!-Oqr!.yru!-Ouv!1avw!3wwx!-Oxy!6_yz!-Oz{!1a{|!1a|}!-O}!O!1a!O!P!8o!P!Q!1a!Q!R##m!R![!8o![!^!-O!^!_# V!_!`#'l!`!a#*S!a!c!-O!c!}#,j!}#O!-O#O#P#.w#P#Q!-O#Q#R!1a#R#S#,j#S#T!-O#T#o#,j#o#p!-O#p#q#/V#q#r!-O#r#s!1a#s~!-OV#,spXS^PZQOY!-OZq!-Oqr!.yru!-Ouv!1avw!3wwx!:mxy!-Oyz!-Oz{!1a{|!1a|}!-O}!O!1a!O!P!-O!P!Q!1a!Q![#,j![!^!-O!^!_# V!_!`#%q!`!a#*S!a!c!-O!c!}#,j!}#O!-O#O#P#.w#P#Q!-O#Q#R!1a#R#S#,j#S#T!-O#T#o#,j#o#p!-O#p#q#/V#q~!-OV#.|R^POY!-OYZ#_Z~!-OV#/`sXS^PZQOY!-OZq!-Oqr!.yru!-Ouv!1avw!3wwx!-Oxy!6_yz!-Oz{!1a{|!1a|}!-O}!O!1a!O!P!8o!P!Q!1a!Q!R##m!R![!8o![!^!-O!^!_# V!_!`#%q!`!a#*S!a!c!-O!c!}#,j!}#O!-O#O#P#.w#P#Q!-O#Q#R!1a#R#S#,j#S#T!-O#T#o#,j#o#p!-O#p#q#/V#q#r!-O#r#s!1a#s~!-OV#1voXS^PZQOY!-OZq!-Oqr!.yru!-Ouv!1avw!3wwx!:mxy!-Oyz!-Oz{!1a{|!1a|}!-O}!O!1a!O!P!-O!P!Q!1a!Q![#3w![!^!-O!^!_# V!_!`#%q!`!a#*S!a!c!-O!c!i#3w!i#O!-O#O#P#.w#P#Q!-O#Q#R!1a#R#T!-O#T#Z#3w#Z#p!-O#p#q#/V#q~!-OV#4QoXS^PZQOY!-OZq!-Oqr!.yru!-Ouv!1avw!3wwx!:mxy!-Oyz!-Oz{!1a{|!1a|}!-O}!O!1a!O!P!-O!P!Q!1a!Q![#3w![!^!-O!^!_# V!_!`#%q!`!a#*S!a!c!-O!c!i#3w!i#O!-O#O#P#.w#P#Q!-O#Q#R!1a#R#T!-O#T#Z#3w#Z#p!-O#p#q#/V#q~!-O",
  tokenizers: [0, 1, 2],
  topRules: {"Program":[0,5]},
  specialized: [{term: 31, get: (value, stack) => (isOpcode(value, stack) << 1)},{term: 32, get: (value, stack) => (isRegister(value, stack) << 1)},{term: 33, get: (value, stack) => (isDirective(value, stack) << 1)}],
  tokenPrec: 213
})
