import { token, next, setSyntax, currSyntax } from "./parser.js";
import { capLineEnds, Expression, readString } from "./shuntingYard.js";
import { Statement, ASMError } from "./statement.js";

// A directive is like a simpler instruction, except while an instruction is limited to
// 15 bytes, a directive is infinitely flexible in size.

const DIRECTIVE_BUFFER_SIZE = 15;

export const directives = {
    equ:    -1,
    set:    -1,
    byte:   1,
    short:  2,
    word:   2, // .word = .short
    hword:  2, // .hword = .short
    int:    3,
    long:   3, // .long = .int
    quad:   4,
    octa:   5,
    float:  6,
    single: 6, // .single = .float
    double: 7,
    asciz:  8,
    ascii:  9,
    string: 9, // .string = .ascii
    intel_syntax: 10,
    att_syntax: 11
};

export const intelDirectives = {
    '%assign': -1,
    db: 0,
    dw: directives.word,
    dd: directives.long,
    dq: directives.quad,
    ".intel_syntax": directives.intel_syntax,
    ".att_syntax": directives.att_syntax
};

export class Directive extends Statement
{
    constructor(prev, dir, range)
    {
        super(prev, DIRECTIVE_BUFFER_SIZE, range);
        this.outline = null;
        this.floatPrec = 0;
        this.lineEnds = { lineEnds: [], offset: 0 };

        let appendNullByte = 0;
        dir = dir.toLowerCase();

        try
        {
            let dirs = this.syntax.intel ? intelDirectives : directives;
            if(!dirs.hasOwnProperty(dir))
                throw new ASMError("Unknown directive");
            dir = dirs[dir];
            switch(dir)
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
                            let strBytes = readString(token, this.lineEnds);
                            let temp = new Uint8Array(this.length + strBytes.length + appendNullByte);
                            temp.set(this.bytes);
                            temp.set(strBytes, this.length);
                            this.bytes = temp;
                            this.lineEnds.offset = this.length = temp.length;
                        }
                        else
                            throw new ASMError("Expected string");
                    } while(next() == ',');
                    break;

                case directives.intel_syntax:
                case directives.att_syntax:
                    let intel = dir == directives.intel_syntax;
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
                    this.syntax = { intel, prefix };
                    this.switchSyntax = true;
                    if(token != '\n' && token != ';')
                        next();
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
        try {
            do
            {
                if(next()[0] === '"')
                {
                    if(acceptStrings)
                        readString(token, this.lineEnds).forEach(byte => this.genValue(BigInt(byte)));
                    else
                        throw new ASMError("Unexpected string");
                    next();
                }
                else
                {
                    expression = new Expression(this, this.floatPrec);
                    value = expression.evaluate(this.address);
                    if(expression.hasSymbols)
                        needsRecompilation = true;

                    this.outline.push({ value, expression });
                    this.genValue(value);
                }
            } while(token === ',');
        }
        finally
        {
            if(!needsRecompilation)
                this.outline = null;
        }
    }

    recompile()
    {
        let op, outlineLength = this.outline.length;
        this.length = 0;
        this.error = null;

        for(let i = 0; i < outlineLength; i++)
        {
            op = this.outline[i];
            try
            {
                if(op.expression.hasSymbols)
                    op.value = op.expression.evaluate(this.address + i * this.valSize, true);
                this.genValue(op.value);
            }
            catch(e)
            {
                this.error = e;
                outlineLength = i;
                i = -1;
                this.length = 0;
            }
        }
    }

    genValue(value)
    {
        for(let i = 0; i < this.valSize; i++)
        {
            this.bytes[this.length++] = Number(value & 0xffn);
            value >>= 8n;

            // Resize the array if necessary
            if(this.length === this.bytes.length)
            {
                let temp = new Uint8Array(this.bytes.length + DIRECTIVE_BUFFER_SIZE);
                temp.set(this.bytes);
                this.bytes = temp;
            }
        }

        this.lineEnds.offset = this.length;
    }
}