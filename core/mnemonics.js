import { Operation } from "./operations.js"; // For proper JSDoc
import { floatIntSuffixes, floatSuffixes, suffixes } from "./operands.js";
import mnemonicList from "./mnemonicList.js";

let lines;

var relativeMnemonics = [];

/** Mnemonic set (loaded from mnemonicList.js)
* @type {Object.<string,(string[]|Operation[])} */
var mnemonics = {};
var intelDifferences = {}, intelInvalids = [], attInvalids = [];
mnemonicList.match(/.*:.*(?=\n)|.[^]*?(?=\n\n)/g).forEach(x => {
    lines = x.split(/[\n:]/);
    let name = lines.shift();
    if(name.includes('{'))
    {
        let suffixes;
        [name, suffixes] = name.split('{');
        let higherOpcode = (parseInt(lines[0], 16) + (suffixes.includes('b') ? 1 : 0)).toString(16);
        for(let suffix of suffixes)
        {
            let fullName = name + suffix.toLowerCase();
            if(suffix <= 'Z')
            {
                mnemonics[name] = lines;
                mnemonics[fullName] = ['#' + name];
            }
            else
            {
                switch(suffix.toLowerCase())
                {
                    case 'b':
                        mnemonics[fullName] = lines;
                        break;
                    
                    case 'w':
                        mnemonics[fullName] = ['66)' + higherOpcode];
                        break;
                    
                    case 'l':
                        mnemonics[fullName] = [higherOpcode];
                        intelDifferences[name + 'd'] = [higherOpcode];
                        intelInvalids.push(fullName);
                        break;

                    case 'q':
                        mnemonics[fullName] = ['48)' + higherOpcode];
                        break;
                }
            }
        }
    }
    else
    {
        if(name.includes('/'))
        {
            let intelName;
            [name, intelName] = name.split('/');
            if(name)
            {
                if(intelName)
                    intelDifferences[intelName] = lines;
                intelInvalids.push(name);
            }
            else
            {
                name = intelName;
                if(intelInvalids.includes(name)) // Super special case, but we'll handle it
                {
                    intelInvalids.splice(intelInvalids.indexOf(name), 1);
                    intelDifferences[name] = lines;
                    return;
                }
                attInvalids.push(name);
            }
        }
        mnemonics[name] = lines;
        if(lines[0].includes('j'))
            relativeMnemonics.push(name);
    }
});


let hex = num => num.toString(16);

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
            "D0." + i + " rbwlq",
            "D0." + i + " i_1B rbwlq",
            "D2." + i + " R_1b rbwlq",
            "C0." + i + " iB rbwlq"
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
    mnemonics['j' + firstName] = [hex(0x70 + i) + "+3856 jbl"];
    relativeMnemonics.push('j' + firstName);

    // cmovxx instructions
    mnemonics['cmov' + firstName] = [hex(0x0F40 + i) + " r Rwlq"];

    // setxx instructions
    mnemonics['set' + firstName] = [hex(0x0F90 + i) + ".0 rB"]

    // Aliases
    names.forEach(name => {
        mnemonics['j' + name] = ['#j' + firstName];
        relativeMnemonics.push('j' + name);
        mnemonics['cmov' + name] = ['#cmov' + firstName];
        mnemonics['set' + name] = ["#set" + firstName]
    });
});

// FPU arithmetics
let fpuArithMnemonics = "add mul com comp sub subr div divr";
fpuArithMnemonics.split(' ').forEach((name, i) => {
    let list = ["D8." + i + " ml", "DC." + i + " m$q"];
    mnemonics['fi' + name] = ["DA." + i + " ml", "DE." + i + " m$w"];

    if(i == 2 || i == 3) list.push("D8." + i + " F", hex(0xD8C1 + i * 8));
    else
    {
        list.push("D8." + i + " F F_0");
        list.push("DC." + i + " F_0 F");
        mnemonics['f' + name + 'p'] = ["DE." + i + " F_0 F", hex(0xDEC1 + i * 8)];
    }

    mnemonics['f' + name] = list;
});

// VFM (Vector fused multiply (-add)) instructions
let vfmOps = ["add", "sub"];
let vfmDirs = ["132", "213", "231"];
let vfmTypes = ["pd", "ps", "sd", "ss"];
let vfmPrefs = ["vfm", "vfnm"];

vfmDirs.forEach((dir, dirI) => vfmOps.forEach((op, opI) => vfmTypes.forEach((type, typeI) =>
{
    vfmPrefs.forEach((pref, prefI) => 
        mnemonics[pref + op + dir + type] = [
            (typeI % 2 ? "" : "vw ") + "66)" +
                hex(0x0F3898 + 0x10 * dirI + 4 * prefI + 2 * opI + (typeI >> 1))
                + " v >Vx" + (typeI < 2 ? "yz" : "") + " V {kzr" + ['B', 'b', '', ''][typeI]
        ]);
    if(typeI < 2)
    {
        mnemonics["vfm" + op + vfmOps[1 - opI] + dir + type] = [
            (typeI % 2 ? "" : "vw ") + "66)" +
                hex(0x0F3896 + 0x10 * dirI + opI) + " v >Vxyz V {kzr" + "Bb"[typeI]
        ];
    }
})));

function isMnemonic(mnemonic, intel)
{
    if(mnemonics.hasOwnProperty(mnemonic))
        return !(intel ? intelInvalids : attInvalids).includes(mnemonic);

    return intel && intelDifferences.hasOwnProperty(mnemonic);
}

/**
 * This represents a particular interpretation of a
 * mnemonic, containing a list of operations
 */
class MnemonicInterpretation
{
    /** 
     * Constructor
     * @param {string} raw
     * @param {Operation[]} operations
     * @param {Number | null | undefined} size
     * @param {boolean} isVex
     */
    constructor(raw, operations, size, isVex)
    {
        this.raw = raw;
        this.operations = operations;
        this.relative = relativeMnemonics.includes(raw);
        this.size = size;
        this.vex = isVex && !operations[0].actuallyNotVex || operations[0].forceVex;
    }
}

function addMnemonicInterpretation(list, raw, intel, size, isVex)
{
    if(!isMnemonic(raw, intel))
        return;
    const operations = getOperations(raw, intel).filter(x => isVex ? (x.allowVex || x.actuallyNotVex) && !x.forceVex : !x.vexOnly);
    if(operations.length == 0)
        return;
    list.push(new MnemonicInterpretation(raw, operations, size, isVex));
}

/**
 * Get all possible interpretations of a mnemonic.
 * 
 * This will usually consist of a single item, although in some
 * cases 2 or more interpretations can coexist.
 * 
 * For example: "cmpsd" - is both "cmps" (compare string) with
 * the "d" (dword) suffix, but it can also be the "cmpsd" (compare
 * scalar double-precision) instruction.
 * @param {string} mnemonic
 * @param {boolean} intel
 * @param {boolean} expectSuffix
 * @returns {MnemonicInterpretation[]}
 */
export function fetchMnemonic(mnemonic, intel, expectSuffix = !intel)
{
    mnemonic = mnemonic.toLowerCase();
    if(mnemonic.startsWith('vv'))
        return [];

    let isVex = mnemonic[0] == 'v';
    let possibleOpcodes = isVex ? [mnemonic, mnemonic.slice(1)] : [mnemonic];
    let interps = [];

    for(const raw of possibleOpcodes)
    {
        addMnemonicInterpretation(interps, raw, intel, undefined, isVex);

        // Size suffix interpretation
        if(expectSuffix)
            addMnemonicInterpretation(
                interps,
                raw.slice(0, -1),
                intel,
                (
                    raw[0] == 'f' ?
                        raw[1] == 'i' ?
                            floatIntSuffixes
                        :
                            floatSuffixes
                    :
                        suffixes
                )[raw[raw.length - 1]] ?? null,
                isVex
            );
    }

    return interps;
}

/** @returns { Operation[] } */
function getOperations(opcode, intel)
{
    if(intel)
    {
        if(intelDifferences.hasOwnProperty(opcode))
        {
            // For situations such as cmpsd having two different interpretations in Intel syntax
            if(mnemonics.hasOwnProperty(opcode))
                return [...extractMnemonic(intelDifferences, opcode), ...getOperations(opcode, false)];

            return extractMnemonic(intelDifferences, opcode);
        }
        else if(intelInvalids.includes(opcode))
            return [];
    }
    else if(attInvalids.includes(opcode))
        return [];
    if(!mnemonics.hasOwnProperty(opcode))
        return [];

    return extractMnemonic(mnemonics, opcode);
}

/**
 * Get a list of all registered mnemonic names
 * @returns {string[]}
 */
export function getMnemonicList()
{
    return Object.keys(mnemonics);
}

function extractMnemonic(database, opcode)
{
    let operations = database[opcode];
    if(typeof operations[0] == "string") // If the mnemonic hasn't been decoded yet, decode it
    {
        if(operations[0][0] == '#') // References other mnemonic
            return database[opcode] = extractMnemonic(database, operations[0].slice(1));
        return database[opcode] = operations.map(line => new Operation(line.split(' ')));
    }

    return operations;
}