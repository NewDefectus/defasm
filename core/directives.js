import { ASMError, token, next, setSyntax, currSyntax, currRange, ungetToken, setToken } from "./parser.js";
import { Section, sectionFlags, sections, sectionTypes, STT_SECTION } from "./sections.js";
import { Expression, readString, scanIdentifier } from "./shuntingYard.js";
import { Statement } from "./statement.js";
import { CommSymbol, fileSymbols, queueRecomp, referenceSymbol, SymbolDefinition } from "./symbols.js";

export const SYM_BINDS = {
    'local': 0,
    'global': 1,
    'weak': 2
};

export const SYM_TYPES = {
    'no_type': 0,
    'object': 1,
    'function': 2,
    'tls_object': 6
};

const SYM_VISIBS = {
    'internal': 1,
    'hidden': 2,
    'protected': 3,
    'exported': 4,
    'singleton': 5,
    'eliminate': 6
}

// A directive is like a simpler instruction, except while an instruction is limited to
// 15 bytes, a directive is infinitely flexible in size.

const DIRECTIVE_BUFFER_SIZE = 15;

const directives = {
    equ:    -1,
    set:    -1,
    byte:   1,
    short:  2,
    word:   2, // .word = .short
    hword:  2, // .hword = .short
    value:  2, // .value = .short
    '2byte':2, // .2byte = .short
    int:    3,
    long:   3, // .long = .int
    '4byte':4, // .4byte = .int
    quad:   4,
    '8byte':4, // .8byte = .quad
    octa:   5,
    float:  6,
    single: 6, // .single = .float
    double: 7,
    asciz:  8,
    ascii:  9,
    string: 9, // .string = .ascii
    intel_syntax: 10,
    att_syntax: 11,
    text: 12,
    data: 13,
    bss: 14,
    globl: 15,
    global: 15,
    weak: 16,
    size: 17,
    type: 18,
    hidden: 19,
    local: 20,
    section: 21,
    file: 22,
    comm: 23
};

const intelDirectives = {
    '%assign': -1,
    db: 0,
    dw: directives.word,
    dd: directives.long,
    dq: directives.quad,
    ".intel_syntax": directives.intel_syntax,
    ".att_syntax": directives.att_syntax,
    global: directives.global,
    section: directives.section,
    segment: directives.segment
};

/** Check if a given string corresponds to an existing directive
 * @param {string} directive
 * @param {boolean} intel
 */
export function isDirective(directive, intel)
{
    directive = directive.toLowerCase();
    return intel ?
        intelDirectives.hasOwnProperty(directive)
    :
        directive[0] == '.' && directives.hasOwnProperty(directive.slice(1));
}

export function makeDirective(config, dir)
{
    dir = dir.toLowerCase();
    let dirs = currSyntax.intel ? intelDirectives : directives;
    if(!dirs.hasOwnProperty(dir))
        throw new ASMError("Unknown directive", config.range);
    let dirID = dirs[dir];
    switch(dirID)
    {
        case intelDirectives.db:
        case directives.byte:
        case directives.word:
        case directives.int:
        case directives.quad:
        case directives.octa:
        case directives.asciz:
        case directives.ascii:
            return new DataDirective(config, dirID);
        
        case directives.float:  return new FloatDirective(config, 0);
        case directives.double: return new FloatDirective(config, 1);

        case directives.intel_syntax: return new SyntaxDirective(config, true);
        case directives.att_syntax:   return new SyntaxDirective(config, false);

        case directives.section: return new SectionDirective(config);
        
        case directives.text: return new SectionDirective(config, sections[0]);
        case directives.data: return new SectionDirective(config, sections[1]);
        case directives.bss:  return new SectionDirective(config, sections[2]);
        
        case directives.local: return new SymBindDirective(config, SYM_BINDS.local);
        case directives.globl: return new SymBindDirective(config, SYM_BINDS.global);
        case directives.weak:  return new SymBindDirective(config, SYM_BINDS.weak);
        
        case directives.size:  return new SymSizeDirective(config);
        case directives.type:  return new SymTypeDirective(config);

        case directives.hidden: return new SymHiddenDirective(config)

        case directives.file:  return new FileDirective(config);

        case directives.equ:
            let name = token, opcodeRange = currRange;
            if(!currSyntax.intel && next() !== ',')
                throw new ASMError("Expected ','");
            return new SymbolDefinition({ ...config, name, opcodeRange });
        
        case directives.comm: return new CommSymbol(config);
    }
}

class SectionDirective extends Statement
{
    /** @param {Section} section */
    constructor(config, section = null)
    {
        let flags = 0, type = sectionTypes.progbits, attribRange = null;
        if(section === null)
        {
            let sectionName = '';
            while(token != ',' && token != ';' && token != '\n')
            {
                sectionName += token;
                next();
            }
            if(sectionName == '')
                throw new ASMError("Expected section name");
            
            section = sections.find(x => x.name == sectionName) ?? null;
            
            if(token == ',')
            {
                attribRange = currRange;
                flags = 0;
                for(const byte of readString(next()).bytes)
                {
                    const char = String.fromCharCode(byte);
                    if(!sectionFlags.hasOwnProperty(char))
                        throw new ASMError(`Unknown flag '${char}'`);
                    flags |= sectionFlags[char];
                }

                if(next() == ',')
                {
                    if(next() != '@')
                        throw new ASMError("Expected '@'");
                    const sectionType = next();
                    if(!sectionTypes.hasOwnProperty(sectionType))
                        throw new ASMError("Unknown section type");
                    type = sectionTypes[sectionType];
                    next();
                }
                attribRange = attribRange.until(currRange);
            }

            if(section === null)
                sections.push(section = new Section(sectionName));
            if(section.persistent && attribRange)
                throw new ASMError(`Can't give attributes to ${section.name}`, attribRange);
        }
        super({ ...config, maxSize: 0, section });
        section.entryPoints.push(this);
        this.switchSection = true;
        this.sectionAttributes = attribRange ? { flags, type } : null;
        this.attribRange = attribRange;

        if(this.sectionAttributes)
            try { this.recompile(); } catch(e) { this.error = e; }
    }

    recompile()
    {
        this.error = null;
        if(this.section.entryPoints.some(x => x !== this && !x.removed && !x.error && x.sectionAttributes !== null))
            throw new ASMError("Attributes already set for this section", this.attribRange);
        this.section.flags = this.sectionAttributes.flags;
        this.section.type = this.sectionAttributes.type;
    }

    remove()
    {
        this.section.entryPoints.splice(this.section.entryPoints.indexOf(this), 1);
        if(this.section.entryPoints.length == 0)
        {
            if(!this.section.persistent)
            {
                this.section.head.statement.remove();
                sections.splice(sections.indexOf(this.section), 1);
            }
        }
        else if(this.sectionAttributes !== null)
        {
            const otherDefinition = this.section.entryPoints.find(entry => entry.sectionAttributes !== null);
            if(otherDefinition)
                queueRecomp(otherDefinition);
            else
                this.section.flags = 0;
        }
    }
}

class SyntaxDirective extends Statement
{
    constructor(config, intel)
    {
        // Set the syntax now so we can correctly skip comments
        const prevSyntax = currSyntax;
        setSyntax({ prefix: currSyntax.prefix, intel });

        const prefSpecifier = token.toLowerCase();
        let prefix = !intel;

        if(prefSpecifier == 'prefix')
            prefix = true;
        else if(prefSpecifier == 'noprefix')
            prefix = false;
        else if(prefSpecifier != '\n' && prefSpecifier != ';')
        {
            setSyntax(prevSyntax);
            throw new ASMError("Expected 'prefix' or 'noprefix'");
        }
        if(token != '\n' && token != ';')
            next();
        super({ ...config, maxSize: 0, syntax: { intel, prefix } });
        this.switchSyntax = true;
    }
}

class DataDirective extends Statement
{
    constructor(config, dirID)
    {
        super({ ...config, maxSize: DIRECTIVE_BUFFER_SIZE });
        this.outline = null;
        this.floatPrec = 0;

        let appendNullByte = 0;
        

        try
        {
            switch(dirID)
            {
                case intelDirectives.db:  this.compileValues(1, true); break;
                case directives.byte:     this.compileValues(1); break;
                case directives.word:     this.compileValues(2); break;
                case directives.int:      this.compileValues(4); break;
                case directives.quad:     this.compileValues(8); break;
                case directives.octa:     this.compileValues(16); break;

                case directives.asciz:
                    appendNullByte = 1;
                case directives.ascii:
                    this.bytes = new Uint8Array();
                    do
                    {
                        if(token[0] == '"')
                        {
                            const string = readString(token);
                            this.append(string, string.bytes.length + appendNullByte);
                        }
                        else
                            throw new ASMError("Expected string");
                    } while(next() == ',' && next());
                    break;
            }
        }
        catch(e)
        {
            this.error = e;
            while(token != ';' && token != '\n')
                next();
        }
    }

    append({ bytes, lineEnds }, length = bytes.length)
    {
        const temp = new Uint8Array(this.length + length + 1);
        temp.set(this.bytes.subarray(0, this.length));
        temp.set(bytes, this.length);
        this.bytes = temp;
        for(const lineEnd of lineEnds)
            this.lineEnds.push(this.length + lineEnd);
        this.length += length;
    }

    compileValues(valSize, acceptStrings = false)
    {
        this.valSize = valSize;
        let value, expression, needsRecompilation = false, error = null;
        this.outline = [];
        const startAddr = this.address;
        try {
            do
            {
                if(token[0] === '"')
                {
                    if(acceptStrings)
                    {
                        const string = readString(token);
                        this.outline.push(string);
                        this.append(string);
                    }
                    else
                        throw new ASMError("Unexpected string");
                    next();
                }
                else
                {
                    expression = new Expression(this);
                    value = expression.evaluate(this);
                    if(expression.hasSymbols)
                        needsRecompilation = true;

                    this.outline.push({ value, expression });
                    if(!error)
                    {
                        try { this.genValue(value, this.valSize * 8); }
                        catch(e) { error = e; }
                    }
                }
                this.address = startAddr + this.length;
            } while(token === ',' && next());
            if(error)
                throw error;
        }
        finally
        {
            if(!needsRecompilation)
                this.outline = null;
            this.address = startAddr;
        }
    }

    recompile()
    {
        let op, outlineLength = this.outline.length;
        const startAddr = this.address;
        this.clear();
        this.error = null;

        for(let i = 0; i < outlineLength; i++)
        {
            op = this.outline[i];
            try
            {
                if(op.strBytes)
                {
                    this.append(op.strBytes);
                }
                else
                {
                    if(op.expression.hasSymbols)
                        op.value = op.expression.evaluate(this, true);
                    this.genValue(op.value, this.valSize * 8);
                }
                this.address = startAddr + this.length;
            }
            catch(e)
            {
                this.error = e;
                outlineLength = i;
                i = -1;
                this.length = 0;
            }
        }
        this.address = startAddr;
    }

    genByte(byte)
    {
        super.genByte(byte);

        // Resize the array if necessary
        if(this.length == this.bytes.length)
        {
            let temp = new Uint8Array(this.bytes.length + DIRECTIVE_BUFFER_SIZE);
            temp.set(this.bytes);
            this.bytes = temp;
        }
    }
}

class FloatDirective extends Statement {
    constructor(config, precision)
    {
        super({ ...config })
        let values = [];
        do
        {
            if(isNaN(token))
                throw new ASMError("Expected number");
            if(token == '\n')
            {
                this.error = new ASMError("Expected number");
                break;
            }
            values.push(token);
        } while((next() == ',' && next()));

        this.bytes = new Uint8Array((
            precision > 0 ? new Float64Array(values) : new Float32Array(values)
        ).buffer);
        this.length = this.bytes.length;
    }
}

class SymInfo extends Statement
{
    addSymbol()
    {
        let name = token, range = currRange;
        if(scanIdentifier(name, this.syntax.intel) != 'symbol')
            return false;
        next();
        if(token != ',' && token != ';' && token != '\n')
        {
            ungetToken();
            setToken(name);
            return false;
        }
        
        const symbol = referenceSymbol(this, name, true);
        if(symbol.type == STT_SECTION)
            throw new ASMError("Can't modify section labels");
        this.symbols.push({ range, symbol });
        return true;
    }

    constructor(config, name, proceedings = true)
    {
        super({ ...config, maxSize: 0 });
        this.symbols = [];
        if(!this.addSymbol())
            throw new ASMError("Expected symbol name");
        this.infoName = name;
        this.setting = [name];
        this.removed = true;
        
        while(true)
        {
            if(token != ',')
            {
                if(proceedings)
                    throw new ASMError("Expected ','");
                break;
            }
            next()
            if(!this.addSymbol())
                break;
        }
    }

    compile()
    {
        this.removed = false;
        for(const { symbol, range } of this.symbols)
        {
            for(const info of this.setting)
                if(symbol.definitions.some(x => x !== this && !x.removed && !x.error && x.setting?.includes(info)))
                    throw new ASMError(`${this.infoName} already set for this symbol`, range);
            this.setInfo(symbol);
        }
    }

    recompile()
    {
        this.error = null;
        this.compile();
    }

    remove()
    {
        super.remove();
        for(const info of this.setting)
            for(const { symbol } of this.symbols) for(const def of symbol.definitions)
                if(!def.removed && def.setting?.includes(info))
                    queueRecomp(def);
    }
}

class SymBindDirective extends SymInfo
{
    constructor(config, bind)
    {
        super(config, 'Binding', false);
        this.binding = bind;
        try { this.compile(); } catch(e) { this.error = e; }
    }

    setInfo(symbol)
    {
        symbol.bind = this.binding;
    }
    remove()
    {
        super.remove();
        for(const { symbol } of this.symbols)
            symbol.bind = undefined;
    }
}

class SymSizeDirective extends SymInfo
{
    constructor(config)
    {
        super(config, 'Size');
        this.expression = new Expression(this);
        try { this.compile(); } catch(e) { this.error = e; }
    }

    compile()
    {
        this.value = this.expression.evaluate(this, false, true);
        super.compile();
    }

    setInfo(symbol)
    {
        symbol.size = this.value.addend;
    }

    remove()
    {
        super.remove();
        for(const { symbol } of this.symbols)
            symbol.size = undefined;
    }
}

class SymTypeDirective extends SymInfo
{
    constructor(config)
    {
        super(config, 'Type');
        this.visib = undefined;
        if(token != '@')
            throw new ASMError("Expected '@'");
        let type = next().toLowerCase();
        if(!SYM_TYPES.hasOwnProperty(type))
            throw new ASMError("Unknown symbol type");
        this.type = SYM_TYPES[type];
        
        if(next() == ',')
        {
            this.setting.push('Visibility');
            if(next() != '@')
                throw new ASMError("Expected '@'");
            let visib = next().toLowerCase();
            if(!SYM_VISIBS.hasOwnProperty(visib))
                throw new ASMError("Unknown symbol visibility");
            this.visib = SYM_VISIBS[visib];
            next();
        }

        try { this.compile(); } catch(e) { this.error = e; }
    }

    setInfo(symbol)
    {
        symbol.type = this.type;
        symbol.visibility = this.visib;
    }

    remove()
    {
        super.remove();
        for(const { symbol } of this.symbols)
        {
            symbol.type = undefined;
            symbol.visibility = undefined;
        }
    }
}

class SymHiddenDirective extends SymInfo
{
    constructor(config)
    {
        super(config, 'Visibility', false);
        try { this.compile(); } catch(e) { this.error = e; }
    }

    setInfo(symbol)
    {
        symbol.visibility = SYM_VISIBS.hidden;
    }
    remove()
    {
        super.remove();
        for(const { symbol } of this.symbols)
            symbol.visibility = undefined;
    }
}

const decoder = new TextDecoder();
class FileDirective extends Statement
{
    constructor(config)
    {
        super({ ...config, maxSize: 0 });
        try
        {
            this.filename = decoder.decode(readString(token).bytes);
        }
        catch(e)
        {
            throw new ASMError("Bad string");
        }
        next();
        fileSymbols.push(this.filename);
    }

    remove()
    {
        fileSymbols.splice(fileSymbols.indexOf(this.filename), 1);
    }
}