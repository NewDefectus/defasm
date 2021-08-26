import { ASMError, token, next, setSyntax, currSyntax } from "./parser.js";
import { sections } from "./sections.js";
import { capLineEnds, Expression, readString, scanIdentifier } from "./shuntingYard.js";
import { Statement } from "./statement.js";
import { referenceSymbol } from "./symbols.js";

const STB_GLOBAL = 1, STB_WEAK = 2;

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
    weak: 16,
};

const intelDirectives = {
    '%assign': -1,
    db: 0,
    dw: directives.word,
    dd: directives.long,
    dq: directives.quad,
    ".intel_syntax": directives.intel_syntax,
    ".att_syntax": directives.att_syntax
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
        throw new ASMError("Unknown directive");
    let dirID = dirs[dir];
    switch(dirID)
    {
        case intelDirectives.db:
        case directives.byte:
        case directives.word:
        case directives.int:
        case directives.quad:
        case directives.octa:
        case directives.float:
        case directives.double:
        case directives.asciz:
        case directives.ascii:
            return new DataDirective(config, dirID);

        case directives.intel_syntax:
        case directives.att_syntax:
            let intel = dirID == directives.intel_syntax;
            // Set the syntax now so we can correctly skip comments
            setSyntax({ prefix: currSyntax.prefix, intel });
            let prefix = !intel;
            let prefSpecifier = next().toLowerCase();

            if(prefSpecifier == 'prefix')
                prefix = true;
            else if(prefSpecifier == 'noprefix')
                prefix = false;
            else if(prefSpecifier != '\n' && prefSpecifier != ';')
                throw new ASMError("Expected 'prefix' or 'noprefix'");
            if(token != '\n' && token != ';')
                next();
            return new SyntaxDirective(config, intel, prefix);
        
        case directives.text:
        case directives.data:
        case directives.bss:
            next();
            return new SectionDirective(config, sections['.' + dir]);
        
        case directives.globl: return new SymBindDirective(config, STB_GLOBAL);
        case directives.weak:  return new SymBindDirective(config, STB_WEAK);
    }
}

class SectionDirective extends Statement
{
    constructor(config, section)
    {
        super({ ...config, maxSize: 0, section });
        this.switchSection = true;
    }
}

class SyntaxDirective extends Statement
{
    constructor(config, intel, prefix)
    {
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
        this.lineEnds = { lineEnds: [], offset: 0 };

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

                case directives.float:    this.floatPrec = 1; this.compileValues(4); break;
                case directives.double:   this.floatPrec = 2; this.compileValues(8); break;

                case directives.asciz:
                    appendNullByte = 1;
                case directives.ascii:
                    this.bytes = new Uint8Array();
                    do
                    {
                        if(next()[0] == '"')
                        {
                            const strBytes = readString(token, this.lineEnds);
                            const temp = new Uint8Array(this.length + strBytes.length + appendNullByte);
                            temp.set(this.bytes);
                            temp.set(strBytes, this.length);
                            this.bytes = temp;
                            this.lineEnds.offset = this.length = temp.length;
                        }
                        else
                            throw new ASMError("Expected string");
                    } while(next() == ',');
                    break;
            }
        }
        catch(e)
        {
            this.error = e;
            while(token != ';' && token != '\n')
                next();
        }

        capLineEnds(this.lineEnds);
        this.lineEnds.lineEnds.push(this.length);
    }

    compileValues(valSize, acceptStrings = false)
    {
        this.valSize = valSize;
        let value, expression, needsRecompilation = false;
        this.outline = [];
        const startAddr = this.address;
        try {
            do
            {
                if(next()[0] === '"')
                {
                    if(acceptStrings)
                    {
                        const strBytes = readString(token, this.lineEnds);
                        const temp = new Uint8Array(this.length + strBytes.length);
                        temp.set(this.bytes);
                        temp.set(strBytes, this.length);
                        this.bytes = temp;
                        this.lineEnds.offset = this.length = temp.length;
                    }
                    else
                        throw new ASMError("Unexpected string");
                    next();
                }
                else
                {
                    if(this.floatPrec)
                    {
                        let values = [];
                        do
                        {
                            if(isNaN(next()))
                                throw new ASMError("Expected number");
                            values.push(token);
                        } while(next() == ',');

                        this.bytes = new Uint8Array((
                            this.floatPrec == 1 ? new Float32Array(values) : new Float64Array(values)
                        ).buffer);
                        this.length = this.bytes.length;
                    }
                    else
                    {
                        expression = new Expression(this);
                        value = expression.evaluate(this);
                        if(expression.hasSymbols)
                            needsRecompilation = true;

                        this.outline.push({ value, expression });
                        this.genValue(value, this.valSize * 8);
                        this.address = startAddr + this.length;
                    }
                }
            } while(token === ',');
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
                if(op.expression.hasSymbols)
                    op.value = op.expression.evaluate(this, true);
                this.genValue(op.value, this.valSize * 8);
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
        this.lineEnds.offset = this.length;
    }
}

class SymBindDirective extends Statement
{
    constructor(config, bind)
    {
        super({ ...config, maxSize: 0 });
        this.symBind = bind;
        this.symbols = [];
        do
        {
            if(scanIdentifier(next()) != 'symbol')
                throw new ASMError("Expected symbol name");
            let record = referenceSymbol(this, token);
            this.symbols.push(record);
            record.bind |= bind;
        } while(next() == ',');
    }
    
    recompile()
    {

    }

    remove()
    {
        super.remove();
        for(const symbol of this.symbols)
            if(!symbol.references.some(x => !x.removed && (x.symBind & this.symBind)))
                symbol.bind &= ~this.symBind;
    }
}