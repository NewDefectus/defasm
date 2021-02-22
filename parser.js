function Register(text)
{
    
}

function Immediate(text, size = null)
{
    try
    {
        if((text.startsWith("'") || text.startsWith('"')) && text.endsWith(text[0]))
        {
            // Parse as character constant
            this.value = 0n;
            for(let i = 1; i < text.length - 1; i++)
            {
                this.value <<= 8n;
                this.value += BigInt(text.charCodeAt(i));
            }
        }
        else
        {
            this.value = BigInt(text);
        }
    

        if(size != null)
        {
            this.size = size;
        }
        else
        {
            // Figure out the size through the value
            this.size = 8;
            this.size *= (this.value >= 0x100n) + 1;
            this.size *= (this.value >= 0x10000n) + 1;
            this.size *= (this.value >= 0x100000000n) + 1;
        }

        this.value &= (1n << BigInt(this.size)) - 1n;

    }
    catch(e)
    {
        throw "Couldn't parse immediate";
    }
}

function Address()
{
    this.segment = null; // Segment register
    this.disp = 0; // Immediate
    this.base = null; // Register
    this.index = null; // Register
    this.factor = null; // Immediate
}



/*
// Update the next significant token from the source code
function parseToken()
{
    rawToken = srcTokens.shift();
    switch(rawToken)
    {
        case undefined:
            // EOF
            return;
        
        case '#':
            // Comment
            if(!expect.end) throw "Unexpected comment";
            let nextNewline = srcTokens.indexOf("\n");
            if(nextNewline < 0)
            {
                // EOF
                return;
            }
            srcTokens = srcTokens.slice(nextNewline + 1);
            return parseToken();
        
        case '\n':
        case ';':
            // End of instruction
            if(!expect.end) throw "Incomplete instruction";
            return;
        
        case '%':
            // Register
            if(!expect.register) throw "Unexpected register";
            return;
        
        case '$':
            // Immediate
            if(!expect.number) throw "Unexpected immediate";
            let parsedValue = parseInt(parseToken());
            if(parsedValue == NaN)
            {
                throw "Couldn't parse number";
            }
            return parsedValue;
        
        case ',':
            // Operand separator
            if(!expect.register) throw "Unexpected comma";
            return;
    }
    // (default)

    // Whitespace check (spaces, tabs, etc)
    if(/\s/.test(rawToken))
    {
        // Treat as a token separator
        return;
    }

    if()


}*/