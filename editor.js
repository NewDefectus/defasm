(() => {
  // node_modules/@codemirror/text/dist/index.js
  var extend = "lc,34,7n,7,7b,19,,,,2,,2,,,20,b,1c,l,g,,2t,7,2,6,2,2,,4,z,,u,r,2j,b,1m,9,9,,o,4,,9,,3,,5,17,3,3b,f,,w,1j,,,,4,8,4,,3,7,a,2,t,,1m,,,,2,4,8,,9,,a,2,q,,2,2,1l,,4,2,4,2,2,3,3,,u,2,3,,b,2,1l,,4,5,,2,4,,k,2,m,6,,,1m,,,2,,4,8,,7,3,a,2,u,,1n,,,,c,,9,,14,,3,,1l,3,5,3,,4,7,2,b,2,t,,1m,,2,,2,,3,,5,2,7,2,b,2,s,2,1l,2,,,2,4,8,,9,,a,2,t,,20,,4,,2,3,,,8,,29,,2,7,c,8,2q,,2,9,b,6,22,2,r,,,,,,1j,e,,5,,2,5,b,,10,9,,2u,4,,6,,2,2,2,p,2,4,3,g,4,d,,2,2,6,,f,,jj,3,qa,3,t,3,t,2,u,2,1s,2,,7,8,,2,b,9,,19,3,3b,2,y,,3a,3,4,2,9,,6,3,63,2,2,,1m,,,7,,,,,2,8,6,a,2,,1c,h,1r,4,1c,7,,,5,,14,9,c,2,w,4,2,2,,3,1k,,,2,3,,,3,1m,8,2,2,48,3,,d,,7,4,,6,,3,2,5i,1m,,5,ek,,5f,x,2da,3,3x,,2o,w,fe,6,2x,2,n9w,4,,a,w,2,28,2,7k,,3,,4,,p,2,5,,47,2,q,i,d,,12,8,p,b,1a,3,1c,,2,4,2,2,13,,1v,6,2,2,2,2,c,,8,,1b,,1f,,,3,2,2,5,2,,,16,2,8,,6m,,2,,4,,fn4,,kh,g,g,g,a6,2,gt,,6a,,45,5,1ae,3,,2,5,4,14,3,4,,4l,2,fx,4,ar,2,49,b,4w,,1i,f,1k,3,1d,4,2,2,1x,3,10,5,,8,1q,,c,2,1g,9,a,4,2,,2n,3,2,,,2,6,,4g,,3,8,l,2,1l,2,,,,,m,,e,7,3,5,5f,8,2,3,,,n,,29,,2,6,,,2,,,2,,2,6j,,2,4,6,2,,2,r,2,2d,8,2,,,2,2y,,,,2,6,,,2t,3,2,4,,5,77,9,,2,6t,,a,2,,,4,,40,4,2,2,4,,w,a,14,6,2,4,8,,9,6,2,3,1a,d,,2,ba,7,,6,,,2a,m,2,7,,2,,2,3e,6,3,,,2,,7,,,20,2,3,,,,9n,2,f0b,5,1n,7,t4,,1r,4,29,,f5k,2,43q,,,3,4,5,8,8,2,7,u,4,44,3,1iz,1j,4,1e,8,,e,,m,5,,f,11s,7,,h,2,7,,2,,5,79,7,c5,4,15s,7,31,7,240,5,gx7k,2o,3k,6o".split(",").map((s) => s ? parseInt(s, 36) : 1);
  for (let i = 1; i < extend.length; i++)
    extend[i] += extend[i - 1];
  function isExtendingChar(code) {
    for (let i = 1; i < extend.length; i += 2)
      if (extend[i] > code)
        return extend[i - 1] <= code;
    return false;
  }
  function isRegionalIndicator(code) {
    return code >= 127462 && code <= 127487;
  }
  var ZWJ = 8205;
  function findClusterBreak(str, pos, forward = true) {
    return (forward ? nextClusterBreak : prevClusterBreak)(str, pos);
  }
  function nextClusterBreak(str, pos) {
    if (pos == str.length)
      return pos;
    if (pos && surrogateLow(str.charCodeAt(pos)) && surrogateHigh(str.charCodeAt(pos - 1)))
      pos--;
    let prev = codePointAt(str, pos);
    pos += codePointSize(prev);
    while (pos < str.length) {
      let next2 = codePointAt(str, pos);
      if (prev == ZWJ || next2 == ZWJ || isExtendingChar(next2)) {
        pos += codePointSize(next2);
        prev = next2;
      } else if (isRegionalIndicator(next2)) {
        let countBefore = 0, i = pos - 2;
        while (i >= 0 && isRegionalIndicator(codePointAt(str, i))) {
          countBefore++;
          i -= 2;
        }
        if (countBefore % 2 == 0)
          break;
        else
          pos += 2;
      } else {
        break;
      }
    }
    return pos;
  }
  function prevClusterBreak(str, pos) {
    while (pos > 0) {
      let found = nextClusterBreak(str, pos - 2);
      if (found < pos)
        return found;
      pos--;
    }
    return 0;
  }
  function surrogateLow(ch) {
    return ch >= 56320 && ch < 57344;
  }
  function surrogateHigh(ch) {
    return ch >= 55296 && ch < 56320;
  }
  function codePointAt(str, pos) {
    let code0 = str.charCodeAt(pos);
    if (!surrogateHigh(code0) || pos + 1 == str.length)
      return code0;
    let code1 = str.charCodeAt(pos + 1);
    if (!surrogateLow(code1))
      return code0;
    return (code0 - 55296 << 10) + (code1 - 56320) + 65536;
  }
  function fromCodePoint(code) {
    if (code <= 65535)
      return String.fromCharCode(code);
    code -= 65536;
    return String.fromCharCode((code >> 10) + 55296, (code & 1023) + 56320);
  }
  function codePointSize(code) {
    return code < 65536 ? 1 : 2;
  }
  function countColumn(string2, n, tabSize) {
    for (let i = 0; i < string2.length; ) {
      if (string2.charCodeAt(i) == 9) {
        n += tabSize - n % tabSize;
        i++;
      } else {
        n++;
        i = findClusterBreak(string2, i);
      }
    }
    return n;
  }
  function findColumn(string2, n, col, tabSize) {
    for (let i = 0; i < string2.length; ) {
      if (n >= col)
        return {offset: i, leftOver: 0};
      n += string2.charCodeAt(i) == 9 ? tabSize - n % tabSize : 1;
      i = findClusterBreak(string2, i);
    }
    return {offset: string2.length, leftOver: col - n};
  }
  var Text = class {
    constructor() {
    }
    lineAt(pos) {
      if (pos < 0 || pos > this.length)
        throw new RangeError(`Invalid position ${pos} in document of length ${this.length}`);
      return this.lineInner(pos, false, 1, 0);
    }
    line(n) {
      if (n < 1 || n > this.lines)
        throw new RangeError(`Invalid line number ${n} in ${this.lines}-line document`);
      return this.lineInner(n, true, 1, 0);
    }
    replace(from, to, text) {
      let parts = [];
      this.decompose(0, from, parts, 2);
      if (text.length)
        text.decompose(0, text.length, parts, 1 | 2);
      this.decompose(to, this.length, parts, 1);
      return TextNode.from(parts, this.length - (to - from) + text.length);
    }
    append(other) {
      return this.replace(this.length, this.length, other);
    }
    slice(from, to = this.length) {
      let parts = [];
      this.decompose(from, to, parts, 0);
      return TextNode.from(parts, to - from);
    }
    eq(other) {
      if (other == this)
        return true;
      if (other.length != this.length || other.lines != this.lines)
        return false;
      let a = new RawTextCursor(this), b = new RawTextCursor(other);
      for (; ; ) {
        a.next();
        b.next();
        if (a.lineBreak != b.lineBreak || a.done != b.done || a.value != b.value)
          return false;
        if (a.done)
          return true;
      }
    }
    iter(dir = 1) {
      return new RawTextCursor(this, dir);
    }
    iterRange(from, to = this.length) {
      return new PartialTextCursor(this, from, to);
    }
    toString() {
      return this.sliceString(0);
    }
    toJSON() {
      let lines2 = [];
      this.flatten(lines2);
      return lines2;
    }
    static of(text) {
      if (text.length == 0)
        throw new RangeError("A document must have at least one line");
      if (text.length == 1 && !text[0])
        return Text.empty;
      return text.length <= 32 ? new TextLeaf(text) : TextNode.from(TextLeaf.split(text, []));
    }
  };
  if (typeof Symbol != "undefined")
    Text.prototype[Symbol.iterator] = function() {
      return this.iter();
    };
  var TextLeaf = class extends Text {
    constructor(text, length = textLength(text)) {
      super();
      this.text = text;
      this.length = length;
    }
    get lines() {
      return this.text.length;
    }
    get children() {
      return null;
    }
    lineInner(target, isLine, line, offset) {
      for (let i = 0; ; i++) {
        let string2 = this.text[i], end = offset + string2.length;
        if ((isLine ? line : end) >= target)
          return new Line(offset, end, line, string2);
        offset = end + 1;
        line++;
      }
    }
    decompose(from, to, target, open) {
      let text = from <= 0 && to >= this.length ? this : new TextLeaf(sliceText(this.text, from, to), Math.min(to, this.length) - Math.max(0, from));
      if (open & 1) {
        let prev = target.pop();
        let joined = appendText(text.text, prev.text.slice(), 0, text.length);
        if (joined.length <= 32) {
          target.push(new TextLeaf(joined, prev.length + text.length));
        } else {
          let mid = joined.length >> 1;
          target.push(new TextLeaf(joined.slice(0, mid)), new TextLeaf(joined.slice(mid)));
        }
      } else {
        target.push(text);
      }
    }
    replace(from, to, text) {
      if (!(text instanceof TextLeaf))
        return super.replace(from, to, text);
      let lines2 = appendText(this.text, appendText(text.text, sliceText(this.text, 0, from)), to);
      let newLen = this.length + text.length - (to - from);
      if (lines2.length <= 32)
        return new TextLeaf(lines2, newLen);
      return TextNode.from(TextLeaf.split(lines2, []), newLen);
    }
    sliceString(from, to = this.length, lineSep = "\n") {
      let result = "";
      for (let pos = 0, i = 0; pos <= to && i < this.text.length; i++) {
        let line = this.text[i], end = pos + line.length;
        if (pos > from && i)
          result += lineSep;
        if (from < end && to > pos)
          result += line.slice(Math.max(0, from - pos), to - pos);
        pos = end + 1;
      }
      return result;
    }
    flatten(target) {
      for (let line of this.text)
        target.push(line);
    }
    static split(text, target) {
      let part = [], len = -1;
      for (let line of text) {
        part.push(line);
        len += line.length + 1;
        if (part.length == 32) {
          target.push(new TextLeaf(part, len));
          part = [];
          len = -1;
        }
      }
      if (len > -1)
        target.push(new TextLeaf(part, len));
      return target;
    }
  };
  var TextNode = class extends Text {
    constructor(children, length) {
      super();
      this.children = children;
      this.length = length;
      this.lines = 0;
      for (let child of children)
        this.lines += child.lines;
    }
    lineInner(target, isLine, line, offset) {
      for (let i = 0; ; i++) {
        let child = this.children[i], end = offset + child.length, endLine = line + child.lines - 1;
        if ((isLine ? endLine : end) >= target)
          return child.lineInner(target, isLine, line, offset);
        offset = end + 1;
        line = endLine + 1;
      }
    }
    decompose(from, to, target, open) {
      for (let i = 0, pos = 0; pos <= to && i < this.children.length; i++) {
        let child = this.children[i], end = pos + child.length;
        if (from <= end && to >= pos) {
          let childOpen = open & ((pos <= from ? 1 : 0) | (end >= to ? 2 : 0));
          if (pos >= from && end <= to && !childOpen)
            target.push(child);
          else
            child.decompose(from - pos, to - pos, target, childOpen);
        }
        pos = end + 1;
      }
    }
    replace(from, to, text) {
      if (text.lines < this.lines)
        for (let i = 0, pos = 0; i < this.children.length; i++) {
          let child = this.children[i], end = pos + child.length;
          if (from >= pos && to <= end) {
            let updated = child.replace(from - pos, to - pos, text);
            let totalLines = this.lines - child.lines + updated.lines;
            if (updated.lines < totalLines >> 5 - 1 && updated.lines > totalLines >> 5 + 1) {
              let copy = this.children.slice();
              copy[i] = updated;
              return new TextNode(copy, this.length - (to - from) + text.length);
            }
            return super.replace(pos, end, updated);
          }
          pos = end + 1;
        }
      return super.replace(from, to, text);
    }
    sliceString(from, to = this.length, lineSep = "\n") {
      let result = "";
      for (let i = 0, pos = 0; i < this.children.length && pos <= to; i++) {
        let child = this.children[i], end = pos + child.length;
        if (pos > from && i)
          result += lineSep;
        if (from < end && to > pos)
          result += child.sliceString(from - pos, to - pos, lineSep);
        pos = end + 1;
      }
      return result;
    }
    flatten(target) {
      for (let child of this.children)
        child.flatten(target);
    }
    static from(children, length = children.reduce((l, ch) => l + ch.length + 1, -1)) {
      let lines2 = 0;
      for (let ch of children)
        lines2 += ch.lines;
      if (lines2 < 32) {
        let flat = [];
        for (let ch of children)
          ch.flatten(flat);
        return new TextLeaf(flat, length);
      }
      let chunk = Math.max(32, lines2 >> 5), maxChunk = chunk << 1, minChunk = chunk >> 1;
      let chunked = [], currentLines = 0, currentLen = -1, currentChunk = [];
      function add(child) {
        let last;
        if (child.lines > maxChunk && child instanceof TextNode) {
          for (let node of child.children)
            add(node);
        } else if (child.lines > minChunk && (currentLines > minChunk || !currentLines)) {
          flush();
          chunked.push(child);
        } else if (child instanceof TextLeaf && currentLines && (last = currentChunk[currentChunk.length - 1]) instanceof TextLeaf && child.lines + last.lines <= 32) {
          currentLines += child.lines;
          currentLen += child.length + 1;
          currentChunk[currentChunk.length - 1] = new TextLeaf(last.text.concat(child.text), last.length + 1 + child.length);
        } else {
          if (currentLines + child.lines > chunk)
            flush();
          currentLines += child.lines;
          currentLen += child.length + 1;
          currentChunk.push(child);
        }
      }
      function flush() {
        if (currentLines == 0)
          return;
        chunked.push(currentChunk.length == 1 ? currentChunk[0] : TextNode.from(currentChunk, currentLen));
        currentLen = -1;
        currentLines = currentChunk.length = 0;
      }
      for (let child of children)
        add(child);
      flush();
      return chunked.length == 1 ? chunked[0] : new TextNode(chunked, length);
    }
  };
  Text.empty = new TextLeaf([""], 0);
  function textLength(text) {
    let length = -1;
    for (let line of text)
      length += line.length + 1;
    return length;
  }
  function appendText(text, target, from = 0, to = 1e9) {
    for (let pos = 0, i = 0, first = true; i < text.length && pos <= to; i++) {
      let line = text[i], end = pos + line.length;
      if (end >= from) {
        if (end > to)
          line = line.slice(0, to - pos);
        if (pos < from)
          line = line.slice(from - pos);
        if (first) {
          target[target.length - 1] += line;
          first = false;
        } else
          target.push(line);
      }
      pos = end + 1;
    }
    return target;
  }
  function sliceText(text, from, to) {
    return appendText(text, [""], from, to);
  }
  var RawTextCursor = class {
    constructor(text, dir = 1) {
      this.dir = dir;
      this.done = false;
      this.lineBreak = false;
      this.value = "";
      this.nodes = [text];
      this.offsets = [dir > 0 ? 0 : text instanceof TextLeaf ? text.text.length : text.children.length];
    }
    next(skip = 0) {
      for (; ; ) {
        let last = this.nodes.length - 1;
        if (last < 0) {
          this.done = true;
          this.value = "";
          this.lineBreak = false;
          return this;
        }
        let top2 = this.nodes[last], offset = this.offsets[last];
        let size = top2 instanceof TextLeaf ? top2.text.length : top2.children.length;
        if (offset == (this.dir > 0 ? size : 0)) {
          this.nodes.pop();
          this.offsets.pop();
        } else if (!this.lineBreak && offset != (this.dir > 0 ? 0 : size)) {
          this.lineBreak = true;
          if (skip == 0) {
            this.value = "\n";
            return this;
          }
          skip--;
        } else if (top2 instanceof TextLeaf) {
          let next2 = top2.text[offset - (this.dir < 0 ? 1 : 0)];
          this.offsets[last] = offset += this.dir;
          this.lineBreak = false;
          if (next2.length > Math.max(0, skip)) {
            this.value = skip == 0 ? next2 : this.dir > 0 ? next2.slice(skip) : next2.slice(0, next2.length - skip);
            return this;
          }
          skip -= next2.length;
        } else {
          let next2 = top2.children[this.dir > 0 ? offset : offset - 1];
          this.offsets[last] = offset + this.dir;
          this.lineBreak = false;
          if (skip > next2.length) {
            skip -= next2.length;
          } else {
            this.nodes.push(next2);
            this.offsets.push(this.dir > 0 ? 0 : next2 instanceof TextLeaf ? next2.text.length : next2.children.length);
          }
        }
      }
    }
  };
  var PartialTextCursor = class {
    constructor(text, start, end) {
      this.value = "";
      this.cursor = new RawTextCursor(text, start > end ? -1 : 1);
      if (start > end) {
        this.skip = text.length - start;
        this.limit = start - end;
      } else {
        this.skip = start;
        this.limit = end - start;
      }
    }
    next(skip = 0) {
      if (this.limit <= 0) {
        this.limit = -1;
      } else {
        let {value, lineBreak, done} = this.cursor.next(this.skip + skip);
        this.skip = 0;
        this.value = value;
        let len = lineBreak ? 1 : value.length;
        if (len > this.limit)
          this.value = this.cursor.dir > 0 ? value.slice(0, this.limit) : value.slice(len - this.limit);
        if (done || this.value.length == 0)
          this.limit = -1;
        else
          this.limit -= this.value.length;
      }
      return this;
    }
    get lineBreak() {
      return this.cursor.lineBreak;
    }
    get done() {
      return this.limit < 0;
    }
  };
  var Line = class {
    constructor(from, to, number2, text) {
      this.from = from;
      this.to = to;
      this.number = number2;
      this.text = text;
    }
    get length() {
      return this.to - this.from;
    }
  };

  // node_modules/@codemirror/state/dist/index.js
  var DefaultSplit = /\r\n?|\n/;
  var MapMode = /* @__PURE__ */ function(MapMode2) {
    MapMode2[MapMode2["Simple"] = 0] = "Simple";
    MapMode2[MapMode2["TrackDel"] = 1] = "TrackDel";
    MapMode2[MapMode2["TrackBefore"] = 2] = "TrackBefore";
    MapMode2[MapMode2["TrackAfter"] = 3] = "TrackAfter";
    return MapMode2;
  }(MapMode || (MapMode = {}));
  var ChangeDesc = class {
    constructor(sections) {
      this.sections = sections;
    }
    get length() {
      let result = 0;
      for (let i = 0; i < this.sections.length; i += 2)
        result += this.sections[i];
      return result;
    }
    get newLength() {
      let result = 0;
      for (let i = 0; i < this.sections.length; i += 2) {
        let ins = this.sections[i + 1];
        result += ins < 0 ? this.sections[i] : ins;
      }
      return result;
    }
    get empty() {
      return this.sections.length == 0 || this.sections.length == 2 && this.sections[1] < 0;
    }
    iterGaps(f) {
      for (let i = 0, posA = 0, posB = 0; i < this.sections.length; ) {
        let len = this.sections[i++], ins = this.sections[i++];
        if (ins < 0) {
          f(posA, posB, len);
          posB += len;
        } else {
          posB += ins;
        }
        posA += len;
      }
    }
    iterChangedRanges(f, individual = false) {
      iterChanges(this, f, individual);
    }
    get invertedDesc() {
      let sections = [];
      for (let i = 0; i < this.sections.length; ) {
        let len = this.sections[i++], ins = this.sections[i++];
        if (ins < 0)
          sections.push(len, ins);
        else
          sections.push(ins, len);
      }
      return new ChangeDesc(sections);
    }
    composeDesc(other) {
      return this.empty ? other : other.empty ? this : composeSets(this, other);
    }
    mapDesc(other, before = false) {
      return other.empty ? this : mapSet(this, other, before);
    }
    mapPos(pos, assoc = -1, mode = MapMode.Simple) {
      let posA = 0, posB = 0;
      for (let i = 0; i < this.sections.length; ) {
        let len = this.sections[i++], ins = this.sections[i++], endA = posA + len;
        if (ins < 0) {
          if (endA > pos)
            return posB + (pos - posA);
          posB += len;
        } else {
          if (mode != MapMode.Simple && endA >= pos && (mode == MapMode.TrackDel && posA < pos && endA > pos || mode == MapMode.TrackBefore && posA < pos || mode == MapMode.TrackAfter && endA > pos))
            return null;
          if (endA > pos || endA == pos && assoc < 0 && !len)
            return pos == posA || assoc < 0 ? posB : posB + ins;
          posB += ins;
        }
        posA = endA;
      }
      if (pos > posA)
        throw new RangeError(`Position ${pos} is out of range for changeset of length ${posA}`);
      return posB;
    }
    touchesRange(from, to = from) {
      for (let i = 0, pos = 0; i < this.sections.length && pos <= to; ) {
        let len = this.sections[i++], ins = this.sections[i++], end = pos + len;
        if (ins >= 0 && pos <= to && end >= from)
          return pos < from && end > to ? "cover" : true;
        pos = end;
      }
      return false;
    }
    toString() {
      let result = "";
      for (let i = 0; i < this.sections.length; ) {
        let len = this.sections[i++], ins = this.sections[i++];
        result += (result ? " " : "") + len + (ins >= 0 ? ":" + ins : "");
      }
      return result;
    }
    toJSON() {
      return this.sections;
    }
    static fromJSON(json) {
      if (!Array.isArray(json) || json.length % 2 || json.some((a) => typeof a != "number"))
        throw new RangeError("Invalid JSON representation of ChangeDesc");
      return new ChangeDesc(json);
    }
  };
  var ChangeSet = class extends ChangeDesc {
    constructor(sections, inserted) {
      super(sections);
      this.inserted = inserted;
    }
    apply(doc2) {
      if (this.length != doc2.length)
        throw new RangeError("Applying change set to a document with the wrong length");
      iterChanges(this, (fromA, toA, fromB, _toB, text) => doc2 = doc2.replace(fromB, fromB + (toA - fromA), text), false);
      return doc2;
    }
    mapDesc(other, before = false) {
      return mapSet(this, other, before, true);
    }
    invert(doc2) {
      let sections = this.sections.slice(), inserted = [];
      for (let i = 0, pos = 0; i < sections.length; i += 2) {
        let len = sections[i], ins = sections[i + 1];
        if (ins >= 0) {
          sections[i] = ins;
          sections[i + 1] = len;
          let index = i >> 1;
          while (inserted.length < index)
            inserted.push(Text.empty);
          inserted.push(len ? doc2.slice(pos, pos + len) : Text.empty);
        }
        pos += len;
      }
      return new ChangeSet(sections, inserted);
    }
    compose(other) {
      return this.empty ? other : other.empty ? this : composeSets(this, other, true);
    }
    map(other, before = false) {
      return other.empty ? this : mapSet(this, other, before, true);
    }
    iterChanges(f, individual = false) {
      iterChanges(this, f, individual);
    }
    get desc() {
      return new ChangeDesc(this.sections);
    }
    filter(ranges) {
      let resultSections = [], resultInserted = [], filteredSections = [];
      let iter = new SectionIter(this);
      done:
        for (let i = 0, pos = 0; ; ) {
          let next2 = i == ranges.length ? 1e9 : ranges[i++];
          while (pos < next2 || pos == next2 && iter.len == 0) {
            if (iter.done)
              break done;
            let len = Math.min(iter.len, next2 - pos);
            addSection(filteredSections, len, -1);
            let ins = iter.ins == -1 ? -1 : iter.off == 0 ? iter.ins : 0;
            addSection(resultSections, len, ins);
            if (ins > 0)
              addInsert(resultInserted, resultSections, iter.text);
            iter.forward(len);
            pos += len;
          }
          let end = ranges[i++];
          while (pos < end) {
            if (iter.done)
              break done;
            let len = Math.min(iter.len, end - pos);
            addSection(resultSections, len, -1);
            addSection(filteredSections, len, iter.ins == -1 ? -1 : iter.off == 0 ? iter.ins : 0);
            iter.forward(len);
            pos += len;
          }
        }
      return {
        changes: new ChangeSet(resultSections, resultInserted),
        filtered: new ChangeDesc(filteredSections)
      };
    }
    toJSON() {
      let parts = [];
      for (let i = 0; i < this.sections.length; i += 2) {
        let len = this.sections[i], ins = this.sections[i + 1];
        if (ins < 0)
          parts.push(len);
        else if (ins == 0)
          parts.push([len]);
        else
          parts.push([len].concat(this.inserted[i >> 1].toJSON()));
      }
      return parts;
    }
    static of(changes, length, lineSep) {
      let sections = [], inserted = [], pos = 0;
      let total = null;
      function flush(force = false) {
        if (!force && !sections.length)
          return;
        if (pos < length)
          addSection(sections, length - pos, -1);
        let set = new ChangeSet(sections, inserted);
        total = total ? total.compose(set.map(total)) : set;
        sections = [];
        inserted = [];
        pos = 0;
      }
      function process2(spec) {
        if (Array.isArray(spec)) {
          for (let sub of spec)
            process2(sub);
        } else if (spec instanceof ChangeSet) {
          if (spec.length != length)
            throw new RangeError(`Mismatched change set length (got ${spec.length}, expected ${length})`);
          flush();
          total = total ? total.compose(spec.map(total)) : spec;
        } else {
          let {from, to = from, insert: insert2} = spec;
          if (from > to || from < 0 || to > length)
            throw new RangeError(`Invalid change range ${from} to ${to} (in doc of length ${length})`);
          let insText = !insert2 ? Text.empty : typeof insert2 == "string" ? Text.of(insert2.split(lineSep || DefaultSplit)) : insert2;
          let insLen = insText.length;
          if (from == to && insLen == 0)
            return;
          if (from < pos)
            flush();
          if (from > pos)
            addSection(sections, from - pos, -1);
          addSection(sections, to - from, insLen);
          addInsert(inserted, sections, insText);
          pos = to;
        }
      }
      process2(changes);
      flush(!total);
      return total;
    }
    static empty(length) {
      return new ChangeSet(length ? [length, -1] : [], []);
    }
    static fromJSON(json) {
      if (!Array.isArray(json))
        throw new RangeError("Invalid JSON representation of ChangeSet");
      let sections = [], inserted = [];
      for (let i = 0; i < json.length; i++) {
        let part = json[i];
        if (typeof part == "number") {
          sections.push(part, -1);
        } else if (!Array.isArray(part) || typeof part[0] != "number" || part.some((e, i2) => i2 && typeof e != "string")) {
          throw new RangeError("Invalid JSON representation of ChangeSet");
        } else if (part.length == 1) {
          sections.push(part[0], 0);
        } else {
          while (inserted.length < i)
            inserted.push(Text.empty);
          inserted[i] = Text.of(part.slice(1));
          sections.push(part[0], inserted[i].length);
        }
      }
      return new ChangeSet(sections, inserted);
    }
  };
  function addSection(sections, len, ins, forceJoin = false) {
    if (len == 0 && ins <= 0)
      return;
    let last = sections.length - 2;
    if (last >= 0 && ins <= 0 && ins == sections[last + 1])
      sections[last] += len;
    else if (len == 0 && sections[last] == 0)
      sections[last + 1] += ins;
    else if (forceJoin) {
      sections[last] += len;
      sections[last + 1] += ins;
    } else
      sections.push(len, ins);
  }
  function addInsert(values, sections, value) {
    if (value.length == 0)
      return;
    let index = sections.length - 2 >> 1;
    if (index < values.length) {
      values[values.length - 1] = values[values.length - 1].append(value);
    } else {
      while (values.length < index)
        values.push(Text.empty);
      values.push(value);
    }
  }
  function iterChanges(desc, f, individual) {
    let inserted = desc.inserted;
    for (let posA = 0, posB = 0, i = 0; i < desc.sections.length; ) {
      let len = desc.sections[i++], ins = desc.sections[i++];
      if (ins < 0) {
        posA += len;
        posB += len;
      } else {
        let endA = posA, endB = posB, text = Text.empty;
        for (; ; ) {
          endA += len;
          endB += ins;
          if (ins && inserted)
            text = text.append(inserted[i - 2 >> 1]);
          if (individual || i == desc.sections.length || desc.sections[i + 1] < 0)
            break;
          len = desc.sections[i++];
          ins = desc.sections[i++];
        }
        f(posA, endA, posB, endB, text);
        posA = endA;
        posB = endB;
      }
    }
  }
  function mapSet(setA, setB, before, mkSet = false) {
    let sections = [], insert2 = mkSet ? [] : null;
    let a = new SectionIter(setA), b = new SectionIter(setB);
    for (let posA = 0, posB = 0; ; ) {
      if (a.ins == -1) {
        posA += a.len;
        a.next();
      } else if (b.ins == -1 && posB < posA) {
        let skip = Math.min(b.len, posA - posB);
        b.forward(skip);
        addSection(sections, skip, -1);
        posB += skip;
      } else if (b.ins >= 0 && (a.done || posB < posA || posB == posA && (b.len < a.len || b.len == a.len && !before))) {
        addSection(sections, b.ins, -1);
        while (posA > posB && !a.done && posA + a.len < posB + b.len) {
          posA += a.len;
          a.next();
        }
        posB += b.len;
        b.next();
      } else if (a.ins >= 0) {
        let len = 0, end = posA + a.len;
        for (; ; ) {
          if (b.ins >= 0 && posB > posA && posB + b.len < end) {
            len += b.ins;
            posB += b.len;
            b.next();
          } else if (b.ins == -1 && posB < end) {
            let skip = Math.min(b.len, end - posB);
            len += skip;
            b.forward(skip);
            posB += skip;
          } else {
            break;
          }
        }
        addSection(sections, len, a.ins);
        if (insert2)
          addInsert(insert2, sections, a.text);
        posA = end;
        a.next();
      } else if (a.done && b.done) {
        return insert2 ? new ChangeSet(sections, insert2) : new ChangeDesc(sections);
      } else {
        throw new Error("Mismatched change set lengths");
      }
    }
  }
  function composeSets(setA, setB, mkSet = false) {
    let sections = [];
    let insert2 = mkSet ? [] : null;
    let a = new SectionIter(setA), b = new SectionIter(setB);
    for (let open = false; ; ) {
      if (a.done && b.done) {
        return insert2 ? new ChangeSet(sections, insert2) : new ChangeDesc(sections);
      } else if (a.ins == 0) {
        addSection(sections, a.len, 0, open);
        a.next();
      } else if (b.len == 0 && !b.done) {
        addSection(sections, 0, b.ins, open);
        if (insert2)
          addInsert(insert2, sections, b.text);
        b.next();
      } else if (a.done || b.done) {
        throw new Error("Mismatched change set lengths");
      } else {
        let len = Math.min(a.len2, b.len), sectionLen = sections.length;
        if (a.ins == -1) {
          let insB = b.ins == -1 ? -1 : b.off ? 0 : b.ins;
          addSection(sections, len, insB, open);
          if (insert2 && insB)
            addInsert(insert2, sections, b.text);
        } else if (b.ins == -1) {
          addSection(sections, a.off ? 0 : a.len, len, open);
          if (insert2)
            addInsert(insert2, sections, a.textBit(len));
        } else {
          addSection(sections, a.off ? 0 : a.len, b.off ? 0 : b.ins, open);
          if (insert2 && !b.off)
            addInsert(insert2, sections, b.text);
        }
        open = (a.ins > len || b.ins >= 0 && b.len > len) && (open || sections.length > sectionLen);
        a.forward2(len);
        b.forward(len);
      }
    }
  }
  var SectionIter = class {
    constructor(set) {
      this.set = set;
      this.i = 0;
      this.next();
    }
    next() {
      let {sections} = this.set;
      if (this.i < sections.length) {
        this.len = sections[this.i++];
        this.ins = sections[this.i++];
      } else {
        this.len = 0;
        this.ins = -2;
      }
      this.off = 0;
    }
    get done() {
      return this.ins == -2;
    }
    get len2() {
      return this.ins < 0 ? this.len : this.ins;
    }
    get text() {
      let {inserted} = this.set, index = this.i - 2 >> 1;
      return index >= inserted.length ? Text.empty : inserted[index];
    }
    textBit(len) {
      let {inserted} = this.set, index = this.i - 2 >> 1;
      return index >= inserted.length && !len ? Text.empty : inserted[index].slice(this.off, len == null ? void 0 : this.off + len);
    }
    forward(len) {
      if (len == this.len)
        this.next();
      else {
        this.len -= len;
        this.off += len;
      }
    }
    forward2(len) {
      if (this.ins == -1)
        this.forward(len);
      else if (len == this.ins)
        this.next();
      else {
        this.ins -= len;
        this.off += len;
      }
    }
  };
  var SelectionRange = class {
    constructor(from, to, flags) {
      this.from = from;
      this.to = to;
      this.flags = flags;
    }
    get anchor() {
      return this.flags & 16 ? this.to : this.from;
    }
    get head() {
      return this.flags & 16 ? this.from : this.to;
    }
    get empty() {
      return this.from == this.to;
    }
    get assoc() {
      return this.flags & 4 ? -1 : this.flags & 8 ? 1 : 0;
    }
    get bidiLevel() {
      let level = this.flags & 3;
      return level == 3 ? null : level;
    }
    get goalColumn() {
      let value = this.flags >> 5;
      return value == 33554431 ? void 0 : value;
    }
    map(change, assoc = -1) {
      let from = change.mapPos(this.from, assoc), to = change.mapPos(this.to, assoc);
      return from == this.from && to == this.to ? this : new SelectionRange(from, to, this.flags);
    }
    extend(from, to = from) {
      if (from <= this.anchor && to >= this.anchor)
        return EditorSelection.range(from, to);
      let head = Math.abs(from - this.anchor) > Math.abs(to - this.anchor) ? from : to;
      return EditorSelection.range(this.anchor, head);
    }
    eq(other) {
      return this.anchor == other.anchor && this.head == other.head;
    }
    toJSON() {
      return {anchor: this.anchor, head: this.head};
    }
    static fromJSON(json) {
      if (!json || typeof json.anchor != "number" || typeof json.head != "number")
        throw new RangeError("Invalid JSON representation for SelectionRange");
      return EditorSelection.range(json.anchor, json.head);
    }
  };
  var EditorSelection = class {
    constructor(ranges, mainIndex = 0) {
      this.ranges = ranges;
      this.mainIndex = mainIndex;
    }
    map(change, assoc = -1) {
      if (change.empty)
        return this;
      return EditorSelection.create(this.ranges.map((r) => r.map(change, assoc)), this.mainIndex);
    }
    eq(other) {
      if (this.ranges.length != other.ranges.length || this.mainIndex != other.mainIndex)
        return false;
      for (let i = 0; i < this.ranges.length; i++)
        if (!this.ranges[i].eq(other.ranges[i]))
          return false;
      return true;
    }
    get main() {
      return this.ranges[this.mainIndex];
    }
    asSingle() {
      return this.ranges.length == 1 ? this : new EditorSelection([this.main]);
    }
    addRange(range, main = true) {
      return EditorSelection.create([range].concat(this.ranges), main ? 0 : this.mainIndex + 1);
    }
    replaceRange(range, which = this.mainIndex) {
      let ranges = this.ranges.slice();
      ranges[which] = range;
      return EditorSelection.create(ranges, this.mainIndex);
    }
    toJSON() {
      return {ranges: this.ranges.map((r) => r.toJSON()), main: this.mainIndex};
    }
    static fromJSON(json) {
      if (!json || !Array.isArray(json.ranges) || typeof json.main != "number" || json.main >= json.ranges.length)
        throw new RangeError("Invalid JSON representation for EditorSelection");
      return new EditorSelection(json.ranges.map((r) => SelectionRange.fromJSON(r)), json.main);
    }
    static single(anchor, head = anchor) {
      return new EditorSelection([EditorSelection.range(anchor, head)], 0);
    }
    static create(ranges, mainIndex = 0) {
      if (ranges.length == 0)
        throw new RangeError("A selection needs at least one range");
      for (let pos = 0, i = 0; i < ranges.length; i++) {
        let range = ranges[i];
        if (range.empty ? range.from <= pos : range.from < pos)
          return normalized(ranges.slice(), mainIndex);
        pos = range.to;
      }
      return new EditorSelection(ranges, mainIndex);
    }
    static cursor(pos, assoc = 0, bidiLevel, goalColumn) {
      return new SelectionRange(pos, pos, (assoc == 0 ? 0 : assoc < 0 ? 4 : 8) | (bidiLevel == null ? 3 : Math.min(2, bidiLevel)) | (goalColumn !== null && goalColumn !== void 0 ? goalColumn : 33554431) << 5);
    }
    static range(anchor, head, goalColumn) {
      let goal = (goalColumn !== null && goalColumn !== void 0 ? goalColumn : 33554431) << 5;
      return head < anchor ? new SelectionRange(head, anchor, 16 | goal) : new SelectionRange(anchor, head, goal);
    }
  };
  function normalized(ranges, mainIndex = 0) {
    let main = ranges[mainIndex];
    ranges.sort((a, b) => a.from - b.from);
    mainIndex = ranges.indexOf(main);
    for (let i = 1; i < ranges.length; i++) {
      let range = ranges[i], prev = ranges[i - 1];
      if (range.empty ? range.from <= prev.to : range.from < prev.to) {
        let from = prev.from, to = Math.max(range.to, prev.to);
        if (i <= mainIndex)
          mainIndex--;
        ranges.splice(--i, 2, range.anchor > range.head ? EditorSelection.range(to, from) : EditorSelection.range(from, to));
      }
    }
    return new EditorSelection(ranges, mainIndex);
  }
  function checkSelection(selection, docLength) {
    for (let range of selection.ranges)
      if (range.to > docLength)
        throw new RangeError("Selection points outside of document");
  }
  var nextID = 0;
  var Facet = class {
    constructor(combine, compareInput, compare2, isStatic, extensions) {
      this.combine = combine;
      this.compareInput = compareInput;
      this.compare = compare2;
      this.isStatic = isStatic;
      this.extensions = extensions;
      this.id = nextID++;
      this.default = combine([]);
    }
    static define(config2 = {}) {
      return new Facet(config2.combine || ((a) => a), config2.compareInput || ((a, b) => a === b), config2.compare || (!config2.combine ? sameArray : (a, b) => a === b), !!config2.static, config2.enables);
    }
    of(value) {
      return new FacetProvider([], this, 0, value);
    }
    compute(deps, get) {
      if (this.isStatic)
        throw new Error("Can't compute a static facet");
      return new FacetProvider(deps, this, 1, get);
    }
    computeN(deps, get) {
      if (this.isStatic)
        throw new Error("Can't compute a static facet");
      return new FacetProvider(deps, this, 2, get);
    }
    from(field, get) {
      if (!get)
        get = (x) => x;
      return this.compute([field], (state) => get(state.field(field)));
    }
  };
  function sameArray(a, b) {
    return a == b || a.length == b.length && a.every((e, i) => e === b[i]);
  }
  var FacetProvider = class {
    constructor(dependencies, facet, type, value) {
      this.dependencies = dependencies;
      this.facet = facet;
      this.type = type;
      this.value = value;
      this.id = nextID++;
    }
    dynamicSlot(addresses) {
      var _a;
      let getter = this.value;
      let compare2 = this.facet.compareInput;
      let idx = addresses[this.id] >> 1, multi = this.type == 2;
      let depDoc = false, depSel = false, depAddrs = [];
      for (let dep of this.dependencies) {
        if (dep == "doc")
          depDoc = true;
        else if (dep == "selection")
          depSel = true;
        else if ((((_a = addresses[dep.id]) !== null && _a !== void 0 ? _a : 1) & 1) == 0)
          depAddrs.push(addresses[dep.id]);
      }
      return (state, tr) => {
        if (!tr || tr.reconfigured) {
          state.values[idx] = getter(state);
          return 1;
        } else {
          let depChanged = depDoc && tr.docChanged || depSel && (tr.docChanged || tr.selection) || depAddrs.some((addr) => (ensureAddr(state, addr) & 1) > 0);
          if (!depChanged)
            return 0;
          let newVal = getter(state), oldVal = tr.startState.values[idx];
          if (multi ? compareArray(newVal, oldVal, compare2) : compare2(newVal, oldVal))
            return 0;
          state.values[idx] = newVal;
          return 1;
        }
      };
    }
  };
  function compareArray(a, b, compare2) {
    if (a.length != b.length)
      return false;
    for (let i = 0; i < a.length; i++)
      if (!compare2(a[i], b[i]))
        return false;
    return true;
  }
  function dynamicFacetSlot(addresses, facet, providers) {
    let providerAddrs = providers.map((p) => addresses[p.id]);
    let providerTypes = providers.map((p) => p.type);
    let dynamic = providerAddrs.filter((p) => !(p & 1));
    let idx = addresses[facet.id] >> 1;
    return (state, tr) => {
      let oldAddr = !tr ? null : tr.reconfigured ? tr.startState.config.address[facet.id] : idx << 1;
      let changed = oldAddr == null;
      for (let dynAddr of dynamic) {
        if (ensureAddr(state, dynAddr) & 1)
          changed = true;
      }
      if (!changed)
        return 0;
      let values = [];
      for (let i = 0; i < providerAddrs.length; i++) {
        let value = getAddr(state, providerAddrs[i]);
        if (providerTypes[i] == 2)
          for (let val of value)
            values.push(val);
        else
          values.push(value);
      }
      let newVal = facet.combine(values);
      if (oldAddr != null && facet.compare(newVal, getAddr(tr.startState, oldAddr)))
        return 0;
      state.values[idx] = newVal;
      return 1;
    };
  }
  function maybeIndex(state, id) {
    let found = state.config.address[id];
    return found == null ? null : found >> 1;
  }
  var initField = /* @__PURE__ */ Facet.define({static: true});
  var StateField = class {
    constructor(id, createF, updateF, compareF, spec) {
      this.id = id;
      this.createF = createF;
      this.updateF = updateF;
      this.compareF = compareF;
      this.spec = spec;
      this.provides = void 0;
    }
    static define(config2) {
      let field = new StateField(nextID++, config2.create, config2.update, config2.compare || ((a, b) => a === b), config2);
      if (config2.provide)
        field.provides = config2.provide(field);
      return field;
    }
    create(state) {
      let init = state.facet(initField).find((i) => i.field == this);
      return ((init === null || init === void 0 ? void 0 : init.create) || this.createF)(state);
    }
    slot(addresses) {
      let idx = addresses[this.id] >> 1;
      return (state, tr) => {
        if (!tr || tr.reconfigured && maybeIndex(tr.startState, this.id) == null) {
          state.values[idx] = this.create(state);
          return 1;
        }
        let oldVal, changed = 0;
        if (tr.reconfigured) {
          oldVal = tr.startState.values[maybeIndex(tr.startState, this.id)];
          changed = 1;
        } else {
          oldVal = tr.startState.values[idx];
        }
        let value = this.updateF(oldVal, tr);
        if (!changed && !this.compareF(oldVal, value))
          changed = 1;
        if (changed)
          state.values[idx] = value;
        return changed;
      };
    }
    init(create) {
      return [this, initField.of({field: this, create})];
    }
    get extension() {
      return this;
    }
  };
  var Prec_ = {fallback: 3, default: 2, extend: 1, override: 0};
  function prec(value) {
    return (ext) => new PrecExtension(ext, value);
  }
  var Prec = {
    fallback: /* @__PURE__ */ prec(Prec_.fallback),
    default: /* @__PURE__ */ prec(Prec_.default),
    extend: /* @__PURE__ */ prec(Prec_.extend),
    override: /* @__PURE__ */ prec(Prec_.override)
  };
  var PrecExtension = class {
    constructor(inner, prec2) {
      this.inner = inner;
      this.prec = prec2;
    }
  };
  var Compartment = class {
    of(ext) {
      return new CompartmentInstance(this, ext);
    }
    reconfigure(content2) {
      return Compartment.reconfigure.of({compartment: this, extension: content2});
    }
    get(state) {
      return state.config.compartments.get(this);
    }
  };
  var CompartmentInstance = class {
    constructor(compartment, inner) {
      this.compartment = compartment;
      this.inner = inner;
    }
  };
  var Configuration = class {
    constructor(base2, compartments, dynamicSlots, address, staticValues) {
      this.base = base2;
      this.compartments = compartments;
      this.dynamicSlots = dynamicSlots;
      this.address = address;
      this.staticValues = staticValues;
      this.statusTemplate = [];
      while (this.statusTemplate.length < dynamicSlots.length)
        this.statusTemplate.push(0);
    }
    staticFacet(facet) {
      let addr = this.address[facet.id];
      return addr == null ? facet.default : this.staticValues[addr >> 1];
    }
    static resolve(base2, compartments, oldState) {
      let fields = [];
      let facets = Object.create(null);
      let newCompartments = new Map();
      for (let ext of flatten(base2, compartments, newCompartments)) {
        if (ext instanceof StateField)
          fields.push(ext);
        else
          (facets[ext.facet.id] || (facets[ext.facet.id] = [])).push(ext);
      }
      let address = Object.create(null);
      let staticValues = [];
      let dynamicSlots = [];
      for (let field of fields) {
        address[field.id] = dynamicSlots.length << 1;
        dynamicSlots.push((a) => field.slot(a));
      }
      for (let id in facets) {
        let providers = facets[id], facet = providers[0].facet;
        if (providers.every((p) => p.type == 0)) {
          address[facet.id] = staticValues.length << 1 | 1;
          let value = facet.combine(providers.map((p) => p.value));
          let oldAddr = oldState ? oldState.config.address[facet.id] : null;
          if (oldAddr != null) {
            let oldVal = getAddr(oldState, oldAddr);
            if (facet.compare(value, oldVal))
              value = oldVal;
          }
          staticValues.push(value);
        } else {
          for (let p of providers) {
            if (p.type == 0) {
              address[p.id] = staticValues.length << 1 | 1;
              staticValues.push(p.value);
            } else {
              address[p.id] = dynamicSlots.length << 1;
              dynamicSlots.push((a) => p.dynamicSlot(a));
            }
          }
          address[facet.id] = dynamicSlots.length << 1;
          dynamicSlots.push((a) => dynamicFacetSlot(a, facet, providers));
        }
      }
      return new Configuration(base2, newCompartments, dynamicSlots.map((f) => f(address)), address, staticValues);
    }
  };
  function flatten(extension, compartments, newCompartments) {
    let result = [[], [], [], []];
    let seen = new Map();
    function inner(ext, prec2) {
      let known = seen.get(ext);
      if (known != null) {
        if (known >= prec2)
          return;
        let found = result[known].indexOf(ext);
        if (found > -1)
          result[known].splice(found, 1);
        if (ext instanceof CompartmentInstance)
          newCompartments.delete(ext.compartment);
      }
      seen.set(ext, prec2);
      if (Array.isArray(ext)) {
        for (let e of ext)
          inner(e, prec2);
      } else if (ext instanceof CompartmentInstance) {
        if (newCompartments.has(ext.compartment))
          throw new RangeError(`Duplicate use of compartment in extensions`);
        let content2 = compartments.get(ext.compartment) || ext.inner;
        newCompartments.set(ext.compartment, content2);
        inner(content2, prec2);
      } else if (ext instanceof PrecExtension) {
        inner(ext.inner, ext.prec);
      } else if (ext instanceof StateField) {
        result[prec2].push(ext);
        if (ext.provides)
          inner(ext.provides, prec2);
      } else if (ext instanceof FacetProvider) {
        result[prec2].push(ext);
        if (ext.facet.extensions)
          inner(ext.facet.extensions, prec2);
      } else {
        let content2 = ext.extension;
        if (!content2)
          throw new Error(`Unrecognized extension value in extension set (${ext}). This sometimes happens because multiple instances of @codemirror/state are loaded, breaking instanceof checks.`);
        inner(content2, prec2);
      }
    }
    inner(extension, Prec_.default);
    return result.reduce((a, b) => a.concat(b));
  }
  function ensureAddr(state, addr) {
    if (addr & 1)
      return 2;
    let idx = addr >> 1;
    let status = state.status[idx];
    if (status == 4)
      throw new Error("Cyclic dependency between fields and/or facets");
    if (status & 2)
      return status;
    state.status[idx] = 4;
    let changed = state.config.dynamicSlots[idx](state, state.applying);
    return state.status[idx] = 2 | changed;
  }
  function getAddr(state, addr) {
    return addr & 1 ? state.config.staticValues[addr >> 1] : state.values[addr >> 1];
  }
  var languageData = /* @__PURE__ */ Facet.define();
  var allowMultipleSelections = /* @__PURE__ */ Facet.define({
    combine: (values) => values.some((v) => v),
    static: true
  });
  var lineSeparator = /* @__PURE__ */ Facet.define({
    combine: (values) => values.length ? values[0] : void 0,
    static: true
  });
  var changeFilter = /* @__PURE__ */ Facet.define();
  var transactionFilter = /* @__PURE__ */ Facet.define();
  var transactionExtender = /* @__PURE__ */ Facet.define();
  var Annotation = class {
    constructor(type, value) {
      this.type = type;
      this.value = value;
    }
    static define() {
      return new AnnotationType();
    }
  };
  var AnnotationType = class {
    of(value) {
      return new Annotation(this, value);
    }
  };
  var StateEffectType = class {
    constructor(map) {
      this.map = map;
    }
    of(value) {
      return new StateEffect(this, value);
    }
  };
  var StateEffect = class {
    constructor(type, value) {
      this.type = type;
      this.value = value;
    }
    map(mapping) {
      let mapped = this.type.map(this.value, mapping);
      return mapped === void 0 ? void 0 : mapped == this.value ? this : new StateEffect(this.type, mapped);
    }
    is(type) {
      return this.type == type;
    }
    static define(spec = {}) {
      return new StateEffectType(spec.map || ((v) => v));
    }
    static mapEffects(effects, mapping) {
      if (!effects.length)
        return effects;
      let result = [];
      for (let effect of effects) {
        let mapped = effect.map(mapping);
        if (mapped)
          result.push(mapped);
      }
      return result;
    }
  };
  StateEffect.reconfigure = /* @__PURE__ */ StateEffect.define();
  StateEffect.appendConfig = /* @__PURE__ */ StateEffect.define();
  var Transaction = class {
    constructor(startState, changes, selection, effects, annotations, scrollIntoView) {
      this.startState = startState;
      this.changes = changes;
      this.selection = selection;
      this.effects = effects;
      this.annotations = annotations;
      this.scrollIntoView = scrollIntoView;
      this._doc = null;
      this._state = null;
      if (selection)
        checkSelection(selection, changes.newLength);
      if (!annotations.some((a) => a.type == Transaction.time))
        this.annotations = annotations.concat(Transaction.time.of(Date.now()));
    }
    get newDoc() {
      return this._doc || (this._doc = this.changes.apply(this.startState.doc));
    }
    get newSelection() {
      return this.selection || this.startState.selection.map(this.changes);
    }
    get state() {
      if (!this._state)
        this.startState.applyTransaction(this);
      return this._state;
    }
    annotation(type) {
      for (let ann of this.annotations)
        if (ann.type == type)
          return ann.value;
      return void 0;
    }
    get docChanged() {
      return !this.changes.empty;
    }
    get reconfigured() {
      return this.startState.config != this.state.config;
    }
  };
  Transaction.time = /* @__PURE__ */ Annotation.define();
  Transaction.userEvent = /* @__PURE__ */ Annotation.define();
  Transaction.addToHistory = /* @__PURE__ */ Annotation.define();
  Transaction.remote = /* @__PURE__ */ Annotation.define();
  function joinRanges(a, b) {
    let result = [];
    for (let iA = 0, iB = 0; ; ) {
      let from, to;
      if (iA < a.length && (iB == b.length || b[iB] >= a[iA])) {
        from = a[iA++];
        to = a[iA++];
      } else if (iB < b.length) {
        from = b[iB++];
        to = b[iB++];
      } else
        return result;
      if (!result.length || result[result.length - 1] < from)
        result.push(from, to);
      else if (result[result.length - 1] < to)
        result[result.length - 1] = to;
    }
  }
  function mergeTransaction(a, b, sequential) {
    var _a;
    let mapForA, mapForB, changes;
    if (sequential) {
      mapForA = b.changes;
      mapForB = ChangeSet.empty(b.changes.length);
      changes = a.changes.compose(b.changes);
    } else {
      mapForA = b.changes.map(a.changes);
      mapForB = a.changes.mapDesc(b.changes, true);
      changes = a.changes.compose(mapForA);
    }
    return {
      changes,
      selection: b.selection ? b.selection.map(mapForB) : (_a = a.selection) === null || _a === void 0 ? void 0 : _a.map(mapForA),
      effects: StateEffect.mapEffects(a.effects, mapForA).concat(StateEffect.mapEffects(b.effects, mapForB)),
      annotations: a.annotations.length ? a.annotations.concat(b.annotations) : b.annotations,
      scrollIntoView: a.scrollIntoView || b.scrollIntoView
    };
  }
  function resolveTransactionInner(state, spec, docSize) {
    let sel = spec.selection;
    return {
      changes: spec.changes instanceof ChangeSet ? spec.changes : ChangeSet.of(spec.changes || [], docSize, state.facet(lineSeparator)),
      selection: sel && (sel instanceof EditorSelection ? sel : EditorSelection.single(sel.anchor, sel.head)),
      effects: asArray(spec.effects),
      annotations: asArray(spec.annotations),
      scrollIntoView: !!spec.scrollIntoView
    };
  }
  function resolveTransaction(state, specs, filter) {
    let s = resolveTransactionInner(state, specs.length ? specs[0] : {}, state.doc.length);
    if (specs.length && specs[0].filter === false)
      filter = false;
    for (let i = 1; i < specs.length; i++) {
      if (specs[i].filter === false)
        filter = false;
      let seq = !!specs[i].sequential;
      s = mergeTransaction(s, resolveTransactionInner(state, specs[i], seq ? s.changes.newLength : state.doc.length), seq);
    }
    let tr = new Transaction(state, s.changes, s.selection, s.effects, s.annotations, s.scrollIntoView);
    return extendTransaction(filter ? filterTransaction(tr) : tr);
  }
  function filterTransaction(tr) {
    let state = tr.startState;
    let result = true;
    for (let filter of state.facet(changeFilter)) {
      let value = filter(tr);
      if (value === false) {
        result = false;
        break;
      }
      if (Array.isArray(value))
        result = result === true ? value : joinRanges(result, value);
    }
    if (result !== true) {
      let changes, back;
      if (result === false) {
        back = tr.changes.invertedDesc;
        changes = ChangeSet.empty(state.doc.length);
      } else {
        let filtered = tr.changes.filter(result);
        changes = filtered.changes;
        back = filtered.filtered.invertedDesc;
      }
      tr = new Transaction(state, changes, tr.selection && tr.selection.map(back), StateEffect.mapEffects(tr.effects, back), tr.annotations, tr.scrollIntoView);
    }
    let filters = state.facet(transactionFilter);
    for (let i = filters.length - 1; i >= 0; i--) {
      let filtered = filters[i](tr);
      if (filtered instanceof Transaction)
        tr = filtered;
      else if (Array.isArray(filtered) && filtered.length == 1 && filtered[0] instanceof Transaction)
        tr = filtered[0];
      else
        tr = resolveTransaction(state, asArray(filtered), false);
    }
    return tr;
  }
  function extendTransaction(tr) {
    let state = tr.startState, extenders = state.facet(transactionExtender), spec = tr;
    for (let i = extenders.length - 1; i >= 0; i--) {
      let extension = extenders[i](tr);
      if (extension && Object.keys(extension).length)
        spec = mergeTransaction(tr, resolveTransactionInner(state, extension, tr.changes.newLength), true);
    }
    return spec == tr ? tr : new Transaction(state, tr.changes, tr.selection, spec.effects, spec.annotations, spec.scrollIntoView);
  }
  var none = [];
  function asArray(value) {
    return value == null ? none : Array.isArray(value) ? value : [value];
  }
  var CharCategory = /* @__PURE__ */ function(CharCategory2) {
    CharCategory2[CharCategory2["Word"] = 0] = "Word";
    CharCategory2[CharCategory2["Space"] = 1] = "Space";
    CharCategory2[CharCategory2["Other"] = 2] = "Other";
    return CharCategory2;
  }(CharCategory || (CharCategory = {}));
  var nonASCIISingleCaseWordChar = /[\u00df\u0587\u0590-\u05f4\u0600-\u06ff\u3040-\u309f\u30a0-\u30ff\u3400-\u4db5\u4e00-\u9fcc\uac00-\ud7af]/;
  var wordChar;
  try {
    wordChar = /* @__PURE__ */ new RegExp("[\\p{Alphabetic}\\p{Number}_]", "u");
  } catch (_) {
  }
  function hasWordChar(str) {
    if (wordChar)
      return wordChar.test(str);
    for (let i = 0; i < str.length; i++) {
      let ch = str[i];
      if (/\w/.test(ch) || ch > "\x80" && (ch.toUpperCase() != ch.toLowerCase() || nonASCIISingleCaseWordChar.test(ch)))
        return true;
    }
    return false;
  }
  function makeCategorizer(wordChars) {
    return (char) => {
      if (!/\S/.test(char))
        return CharCategory.Space;
      if (hasWordChar(char))
        return CharCategory.Word;
      for (let i = 0; i < wordChars.length; i++)
        if (char.indexOf(wordChars[i]) > -1)
          return CharCategory.Word;
      return CharCategory.Other;
    };
  }
  var EditorState = class {
    constructor(config2, doc2, selection, tr = null) {
      this.config = config2;
      this.doc = doc2;
      this.selection = selection;
      this.applying = null;
      this.status = config2.statusTemplate.slice();
      if (tr && tr.startState.config == config2) {
        this.values = tr.startState.values.slice();
      } else {
        this.values = config2.dynamicSlots.map((_) => null);
        if (tr)
          for (let id in config2.address) {
            let cur = config2.address[id], prev = tr.startState.config.address[id];
            if (prev != null && (cur & 1) == 0)
              this.values[cur >> 1] = getAddr(tr.startState, prev);
          }
      }
      this.applying = tr;
      if (tr)
        tr._state = this;
      for (let i = 0; i < this.config.dynamicSlots.length; i++)
        ensureAddr(this, i << 1);
      this.applying = null;
    }
    field(field, require2 = true) {
      let addr = this.config.address[field.id];
      if (addr == null) {
        if (require2)
          throw new RangeError("Field is not present in this state");
        return void 0;
      }
      ensureAddr(this, addr);
      return getAddr(this, addr);
    }
    update(...specs) {
      return resolveTransaction(this, specs, true);
    }
    applyTransaction(tr) {
      let conf = this.config, {base: base2, compartments} = conf;
      for (let effect of tr.effects) {
        if (effect.is(Compartment.reconfigure)) {
          if (conf) {
            compartments = new Map();
            conf.compartments.forEach((val, key) => compartments.set(key, val));
            conf = null;
          }
          compartments.set(effect.value.compartment, effect.value.extension);
        } else if (effect.is(StateEffect.reconfigure)) {
          conf = null;
          base2 = effect.value;
        } else if (effect.is(StateEffect.appendConfig)) {
          conf = null;
          base2 = asArray(base2).concat(effect.value);
        }
      }
      new EditorState(conf || Configuration.resolve(base2, compartments, this), tr.newDoc, tr.newSelection, tr);
    }
    replaceSelection(text) {
      if (typeof text == "string")
        text = this.toText(text);
      return this.changeByRange((range) => ({
        changes: {from: range.from, to: range.to, insert: text},
        range: EditorSelection.cursor(range.from + text.length)
      }));
    }
    changeByRange(f) {
      let sel = this.selection;
      let result1 = f(sel.ranges[0]);
      let changes = this.changes(result1.changes), ranges = [result1.range];
      let effects = asArray(result1.effects);
      for (let i = 1; i < sel.ranges.length; i++) {
        let result = f(sel.ranges[i]);
        let newChanges = this.changes(result.changes), newMapped = newChanges.map(changes);
        for (let j = 0; j < i; j++)
          ranges[j] = ranges[j].map(newMapped);
        let mapBy = changes.mapDesc(newChanges, true);
        ranges.push(result.range.map(mapBy));
        changes = changes.compose(newMapped);
        effects = StateEffect.mapEffects(effects, newMapped).concat(StateEffect.mapEffects(asArray(result.effects), mapBy));
      }
      return {
        changes,
        selection: EditorSelection.create(ranges, sel.mainIndex),
        effects
      };
    }
    changes(spec = []) {
      if (spec instanceof ChangeSet)
        return spec;
      return ChangeSet.of(spec, this.doc.length, this.facet(EditorState.lineSeparator));
    }
    toText(string2) {
      return Text.of(string2.split(this.facet(EditorState.lineSeparator) || DefaultSplit));
    }
    sliceDoc(from = 0, to = this.doc.length) {
      return this.doc.sliceString(from, to, this.lineBreak);
    }
    facet(facet) {
      let addr = this.config.address[facet.id];
      if (addr == null)
        return facet.default;
      ensureAddr(this, addr);
      return getAddr(this, addr);
    }
    toJSON(fields) {
      let result = {
        doc: this.sliceDoc(),
        selection: this.selection.toJSON()
      };
      if (fields)
        for (let prop in fields) {
          let value = fields[prop];
          if (value instanceof StateField)
            result[prop] = value.spec.toJSON(this.field(fields[prop]), this);
        }
      return result;
    }
    static fromJSON(json, config2 = {}, fields) {
      if (!json || typeof json.doc != "string")
        throw new RangeError("Invalid JSON representation for EditorState");
      let fieldInit = [];
      if (fields)
        for (let prop in fields) {
          let field = fields[prop], value = json[prop];
          fieldInit.push(field.init((state) => field.spec.fromJSON(value, state)));
        }
      return EditorState.create({
        doc: json.doc,
        selection: EditorSelection.fromJSON(json.selection),
        extensions: config2.extensions ? fieldInit.concat([config2.extensions]) : fieldInit
      });
    }
    static create(config2 = {}) {
      let configuration = Configuration.resolve(config2.extensions || [], new Map());
      let doc2 = config2.doc instanceof Text ? config2.doc : Text.of((config2.doc || "").split(configuration.staticFacet(EditorState.lineSeparator) || DefaultSplit));
      let selection = !config2.selection ? EditorSelection.single(0) : config2.selection instanceof EditorSelection ? config2.selection : EditorSelection.single(config2.selection.anchor, config2.selection.head);
      checkSelection(selection, doc2.length);
      if (!configuration.staticFacet(allowMultipleSelections))
        selection = selection.asSingle();
      return new EditorState(configuration, doc2, selection);
    }
    get tabSize() {
      return this.facet(EditorState.tabSize);
    }
    get lineBreak() {
      return this.facet(EditorState.lineSeparator) || "\n";
    }
    phrase(phrase) {
      for (let map of this.facet(EditorState.phrases))
        if (Object.prototype.hasOwnProperty.call(map, phrase))
          return map[phrase];
      return phrase;
    }
    languageDataAt(name2, pos) {
      let values = [];
      for (let provider of this.facet(languageData)) {
        for (let result of provider(this, pos)) {
          if (Object.prototype.hasOwnProperty.call(result, name2))
            values.push(result[name2]);
        }
      }
      return values;
    }
    charCategorizer(at) {
      return makeCategorizer(this.languageDataAt("wordChars", at).join(""));
    }
    wordAt(pos) {
      let {text, from, length} = this.doc.lineAt(pos);
      let cat = this.charCategorizer(pos);
      let start = pos - from, end = pos - from;
      while (start > 0) {
        let prev = findClusterBreak(text, start, false);
        if (cat(text.slice(prev, start)) != CharCategory.Word)
          break;
        start = prev;
      }
      while (end < length) {
        let next2 = findClusterBreak(text, end);
        if (cat(text.slice(end, next2)) != CharCategory.Word)
          break;
        end = next2;
      }
      return start == end ? EditorSelection.range(start + from, end + from) : null;
    }
  };
  EditorState.allowMultipleSelections = allowMultipleSelections;
  EditorState.tabSize = /* @__PURE__ */ Facet.define({
    combine: (values) => values.length ? values[0] : 4
  });
  EditorState.lineSeparator = lineSeparator;
  EditorState.phrases = /* @__PURE__ */ Facet.define();
  EditorState.languageData = languageData;
  EditorState.changeFilter = changeFilter;
  EditorState.transactionFilter = transactionFilter;
  EditorState.transactionExtender = transactionExtender;
  Compartment.reconfigure = /* @__PURE__ */ StateEffect.define();
  function combineConfig(configs, defaults3, combine = {}) {
    let result = {};
    for (let config2 of configs)
      for (let key of Object.keys(config2)) {
        let value = config2[key], current = result[key];
        if (current === void 0)
          result[key] = value;
        else if (current === value || value === void 0)
          ;
        else if (Object.hasOwnProperty.call(combine, key))
          result[key] = combine[key](current, value);
        else
          throw new Error("Config merge conflict for field " + key);
      }
    for (let key in defaults3)
      if (result[key] === void 0)
        result[key] = defaults3[key];
    return result;
  }

  // node_modules/style-mod/src/style-mod.js
  var C = "\u037C";
  var COUNT = typeof Symbol == "undefined" ? "__" + C : Symbol.for(C);
  var SET = typeof Symbol == "undefined" ? "__styleSet" + Math.floor(Math.random() * 1e8) : Symbol("styleSet");
  var top = typeof globalThis != "undefined" ? globalThis : typeof window != "undefined" ? window : {};
  var StyleModule = class {
    constructor(spec, options) {
      this.rules = [];
      let {finish} = options || {};
      function splitSelector(selector) {
        return /^@/.test(selector) ? [selector] : selector.split(/,\s*/);
      }
      function render(selectors, spec2, target, isKeyframes) {
        let local = [], isAt = /^@(\w+)\b/.exec(selectors[0]), keyframes = isAt && isAt[1] == "keyframes";
        if (isAt && spec2 == null)
          return target.push(selectors[0] + ";");
        for (let prop in spec2) {
          let value = spec2[prop];
          if (/&/.test(prop)) {
            render(prop.split(/,\s*/).map((part) => selectors.map((sel) => part.replace(/&/, sel))).reduce((a, b) => a.concat(b)), value, target);
          } else if (value && typeof value == "object") {
            if (!isAt)
              throw new RangeError("The value of a property (" + prop + ") should be a primitive value.");
            render(splitSelector(prop), value, local, keyframes);
          } else if (value != null) {
            local.push(prop.replace(/_.*/, "").replace(/[A-Z]/g, (l) => "-" + l.toLowerCase()) + ": " + value + ";");
          }
        }
        if (local.length || keyframes) {
          target.push((finish && !isAt && !isKeyframes ? selectors.map(finish) : selectors).join(", ") + " {" + local.join(" ") + "}");
        }
      }
      for (let prop in spec)
        render(splitSelector(prop), spec[prop], this.rules);
    }
    getRules() {
      return this.rules.join("\n");
    }
    static newName() {
      let id = top[COUNT] || 1;
      top[COUNT] = id + 1;
      return C + id.toString(36);
    }
    static mount(root, modules) {
      (root[SET] || new StyleSet(root)).mount(Array.isArray(modules) ? modules : [modules]);
    }
  };
  var adoptedSet = null;
  var StyleSet = class {
    constructor(root) {
      if (!root.head && root.adoptedStyleSheets && typeof CSSStyleSheet != "undefined") {
        if (adoptedSet) {
          root.adoptedStyleSheets = [adoptedSet.sheet].concat(root.adoptedStyleSheets);
          return root[SET] = adoptedSet;
        }
        this.sheet = new CSSStyleSheet();
        root.adoptedStyleSheets = [this.sheet].concat(root.adoptedStyleSheets);
        adoptedSet = this;
      } else {
        this.styleTag = (root.ownerDocument || root).createElement("style");
        let target = root.head || root;
        target.insertBefore(this.styleTag, target.firstChild);
      }
      this.modules = [];
      root[SET] = this;
    }
    mount(modules) {
      let sheet = this.sheet;
      let pos = 0, j = 0;
      for (let i = 0; i < modules.length; i++) {
        let mod = modules[i], index = this.modules.indexOf(mod);
        if (index < j && index > -1) {
          this.modules.splice(index, 1);
          j--;
          index = -1;
        }
        if (index == -1) {
          this.modules.splice(j++, 0, mod);
          if (sheet)
            for (let k = 0; k < mod.rules.length; k++)
              sheet.insertRule(mod.rules[k], pos++);
        } else {
          while (j < index)
            pos += this.modules[j++].rules.length;
          pos += mod.rules.length;
          j++;
        }
      }
      if (!sheet) {
        let text = "";
        for (let i = 0; i < this.modules.length; i++)
          text += this.modules[i].getRules() + "\n";
        this.styleTag.textContent = text;
      }
    }
  };

  // node_modules/@codemirror/rangeset/dist/index.js
  var RangeValue = class {
    eq(other) {
      return this == other;
    }
    range(from, to = from) {
      return new Range(from, to, this);
    }
  };
  RangeValue.prototype.startSide = RangeValue.prototype.endSide = 0;
  RangeValue.prototype.point = false;
  RangeValue.prototype.mapMode = MapMode.TrackDel;
  var Range = class {
    constructor(from, to, value) {
      this.from = from;
      this.to = to;
      this.value = value;
    }
  };
  function cmpRange(a, b) {
    return a.from - b.from || a.value.startSide - b.value.startSide;
  }
  var Chunk = class {
    constructor(from, to, value, maxPoint) {
      this.from = from;
      this.to = to;
      this.value = value;
      this.maxPoint = maxPoint;
    }
    get length() {
      return this.to[this.to.length - 1];
    }
    findIndex(pos, end, side = end * 1e9, startAt = 0) {
      if (pos <= 0)
        return startAt;
      let arr = end < 0 ? this.to : this.from;
      for (let lo = startAt, hi = arr.length; ; ) {
        if (lo == hi)
          return lo;
        let mid = lo + hi >> 1;
        let diff = arr[mid] - pos || (end < 0 ? this.value[mid].startSide : this.value[mid].endSide) - side;
        if (mid == lo)
          return diff >= 0 ? lo : hi;
        if (diff >= 0)
          hi = mid;
        else
          lo = mid + 1;
      }
    }
    between(offset, from, to, f) {
      for (let i = this.findIndex(from, -1), e = this.findIndex(to, 1, void 0, i); i < e; i++)
        if (f(this.from[i] + offset, this.to[i] + offset, this.value[i]) === false)
          return false;
    }
    map(offset, changes) {
      let value = [], from = [], to = [], newPos = -1, maxPoint = -1;
      for (let i = 0; i < this.value.length; i++) {
        let val = this.value[i], curFrom = this.from[i] + offset, curTo = this.to[i] + offset, newFrom, newTo;
        if (curFrom == curTo) {
          let mapped = changes.mapPos(curFrom, val.startSide, val.mapMode);
          if (mapped == null)
            continue;
          newFrom = newTo = mapped;
        } else {
          newFrom = changes.mapPos(curFrom, val.startSide);
          newTo = changes.mapPos(curTo, val.endSide);
          if (newFrom > newTo || newFrom == newTo && val.startSide > 0 && val.endSide <= 0)
            continue;
        }
        if ((newTo - newFrom || val.endSide - val.startSide) < 0)
          continue;
        if (newPos < 0)
          newPos = newFrom;
        if (val.point)
          maxPoint = Math.max(maxPoint, newTo - newFrom);
        value.push(val);
        from.push(newFrom - newPos);
        to.push(newTo - newPos);
      }
      return {mapped: value.length ? new Chunk(from, to, value, maxPoint) : null, pos: newPos};
    }
  };
  var RangeSet = class {
    constructor(chunkPos, chunk, nextLayer = RangeSet.empty, maxPoint) {
      this.chunkPos = chunkPos;
      this.chunk = chunk;
      this.nextLayer = nextLayer;
      this.maxPoint = maxPoint;
    }
    get length() {
      let last = this.chunk.length - 1;
      return last < 0 ? 0 : Math.max(this.chunkEnd(last), this.nextLayer.length);
    }
    get size() {
      if (this == RangeSet.empty)
        return 0;
      let size = this.nextLayer.size;
      for (let chunk of this.chunk)
        size += chunk.value.length;
      return size;
    }
    chunkEnd(index) {
      return this.chunkPos[index] + this.chunk[index].length;
    }
    update(updateSpec) {
      let {add = [], sort = false, filterFrom = 0, filterTo = this.length} = updateSpec;
      let filter = updateSpec.filter;
      if (add.length == 0 && !filter)
        return this;
      if (sort)
        add.slice().sort(cmpRange);
      if (this == RangeSet.empty)
        return add.length ? RangeSet.of(add) : this;
      let cur = new LayerCursor(this, null, -1).goto(0), i = 0, spill = [];
      let builder = new RangeSetBuilder();
      while (cur.value || i < add.length) {
        if (i < add.length && (cur.from - add[i].from || cur.startSide - add[i].value.startSide) >= 0) {
          let range = add[i++];
          if (!builder.addInner(range.from, range.to, range.value))
            spill.push(range);
        } else if (cur.rangeIndex == 1 && cur.chunkIndex < this.chunk.length && (i == add.length || this.chunkEnd(cur.chunkIndex) < add[i].from) && (!filter || filterFrom > this.chunkEnd(cur.chunkIndex) || filterTo < this.chunkPos[cur.chunkIndex]) && builder.addChunk(this.chunkPos[cur.chunkIndex], this.chunk[cur.chunkIndex])) {
          cur.nextChunk();
        } else {
          if (!filter || filterFrom > cur.to || filterTo < cur.from || filter(cur.from, cur.to, cur.value)) {
            if (!builder.addInner(cur.from, cur.to, cur.value))
              spill.push(new Range(cur.from, cur.to, cur.value));
          }
          cur.next();
        }
      }
      return builder.finishInner(this.nextLayer == RangeSet.empty && !spill.length ? RangeSet.empty : this.nextLayer.update({add: spill, filter, filterFrom, filterTo}));
    }
    map(changes) {
      if (changes.length == 0 || this == RangeSet.empty)
        return this;
      let chunks = [], chunkPos = [], maxPoint = -1;
      for (let i = 0; i < this.chunk.length; i++) {
        let start = this.chunkPos[i], chunk = this.chunk[i];
        let touch = changes.touchesRange(start, start + chunk.length);
        if (touch === false) {
          maxPoint = Math.max(maxPoint, chunk.maxPoint);
          chunks.push(chunk);
          chunkPos.push(changes.mapPos(start));
        } else if (touch === true) {
          let {mapped, pos} = chunk.map(start, changes);
          if (mapped) {
            maxPoint = Math.max(maxPoint, mapped.maxPoint);
            chunks.push(mapped);
            chunkPos.push(pos);
          }
        }
      }
      let next2 = this.nextLayer.map(changes);
      return chunks.length == 0 ? next2 : new RangeSet(chunkPos, chunks, next2, maxPoint);
    }
    between(from, to, f) {
      if (this == RangeSet.empty)
        return;
      for (let i = 0; i < this.chunk.length; i++) {
        let start = this.chunkPos[i], chunk = this.chunk[i];
        if (to >= start && from <= start + chunk.length && chunk.between(start, from - start, to - start, f) === false)
          return;
      }
      this.nextLayer.between(from, to, f);
    }
    iter(from = 0) {
      return HeapCursor.from([this]).goto(from);
    }
    static iter(sets, from = 0) {
      return HeapCursor.from(sets).goto(from);
    }
    static compare(oldSets, newSets, textDiff, comparator, minPointSize = -1) {
      let a = oldSets.filter((set) => set.maxPoint >= 500 || set != RangeSet.empty && newSets.indexOf(set) < 0 && set.maxPoint >= minPointSize);
      let b = newSets.filter((set) => set.maxPoint >= 500 || set != RangeSet.empty && oldSets.indexOf(set) < 0 && set.maxPoint >= minPointSize);
      let sharedChunks = findSharedChunks(a, b);
      let sideA = new SpanCursor(a, sharedChunks, minPointSize);
      let sideB = new SpanCursor(b, sharedChunks, minPointSize);
      textDiff.iterGaps((fromA, fromB, length) => compare(sideA, fromA, sideB, fromB, length, comparator));
      if (textDiff.empty && textDiff.length == 0)
        compare(sideA, 0, sideB, 0, 0, comparator);
    }
    static spans(sets, from, to, iterator, minPointSize = -1) {
      let cursor = new SpanCursor(sets, null, minPointSize).goto(from), pos = from;
      let open = cursor.openStart;
      for (; ; ) {
        let curTo = Math.min(cursor.to, to);
        if (cursor.point) {
          iterator.point(pos, curTo, cursor.point, cursor.activeForPoint(cursor.to), open);
          open = cursor.openEnd(curTo) + (cursor.to > curTo ? 1 : 0);
        } else if (curTo > pos) {
          iterator.span(pos, curTo, cursor.active, open);
          open = cursor.openEnd(curTo);
        }
        if (cursor.to > to)
          break;
        pos = cursor.to;
        cursor.next();
      }
      return open;
    }
    static of(ranges, sort = false) {
      let build = new RangeSetBuilder();
      for (let range of ranges instanceof Range ? [ranges] : sort ? ranges.slice().sort(cmpRange) : ranges)
        build.add(range.from, range.to, range.value);
      return build.finish();
    }
  };
  RangeSet.empty = /* @__PURE__ */ new RangeSet([], [], null, -1);
  RangeSet.empty.nextLayer = RangeSet.empty;
  var RangeSetBuilder = class {
    constructor() {
      this.chunks = [];
      this.chunkPos = [];
      this.chunkStart = -1;
      this.last = null;
      this.lastFrom = -1e9;
      this.lastTo = -1e9;
      this.from = [];
      this.to = [];
      this.value = [];
      this.maxPoint = -1;
      this.setMaxPoint = -1;
      this.nextLayer = null;
    }
    finishChunk(newArrays) {
      this.chunks.push(new Chunk(this.from, this.to, this.value, this.maxPoint));
      this.chunkPos.push(this.chunkStart);
      this.chunkStart = -1;
      this.setMaxPoint = Math.max(this.setMaxPoint, this.maxPoint);
      this.maxPoint = -1;
      if (newArrays) {
        this.from = [];
        this.to = [];
        this.value = [];
      }
    }
    add(from, to, value) {
      if (!this.addInner(from, to, value))
        (this.nextLayer || (this.nextLayer = new RangeSetBuilder())).add(from, to, value);
    }
    addInner(from, to, value) {
      let diff = from - this.lastTo || value.startSide - this.last.endSide;
      if (diff <= 0 && (from - this.lastFrom || value.startSide - this.last.startSide) < 0)
        throw new Error("Ranges must be added sorted by `from` position and `startSide`");
      if (diff < 0)
        return false;
      if (this.from.length == 250)
        this.finishChunk(true);
      if (this.chunkStart < 0)
        this.chunkStart = from;
      this.from.push(from - this.chunkStart);
      this.to.push(to - this.chunkStart);
      this.last = value;
      this.lastFrom = from;
      this.lastTo = to;
      this.value.push(value);
      if (value.point)
        this.maxPoint = Math.max(this.maxPoint, to - from);
      return true;
    }
    addChunk(from, chunk) {
      if ((from - this.lastTo || chunk.value[0].startSide - this.last.endSide) < 0)
        return false;
      if (this.from.length)
        this.finishChunk(true);
      this.setMaxPoint = Math.max(this.setMaxPoint, chunk.maxPoint);
      this.chunks.push(chunk);
      this.chunkPos.push(from);
      let last = chunk.value.length - 1;
      this.last = chunk.value[last];
      this.lastFrom = chunk.from[last] + from;
      this.lastTo = chunk.to[last] + from;
      return true;
    }
    finish() {
      return this.finishInner(RangeSet.empty);
    }
    finishInner(next2) {
      if (this.from.length)
        this.finishChunk(false);
      if (this.chunks.length == 0)
        return next2;
      let result = new RangeSet(this.chunkPos, this.chunks, this.nextLayer ? this.nextLayer.finishInner(next2) : next2, this.setMaxPoint);
      this.from = null;
      return result;
    }
  };
  function findSharedChunks(a, b) {
    let inA = new Map();
    for (let set of a)
      for (let i = 0; i < set.chunk.length; i++)
        if (set.chunk[i].maxPoint < 500)
          inA.set(set.chunk[i], set.chunkPos[i]);
    let shared = new Set();
    for (let set of b)
      for (let i = 0; i < set.chunk.length; i++)
        if (inA.get(set.chunk[i]) == set.chunkPos[i])
          shared.add(set.chunk[i]);
    return shared;
  }
  var LayerCursor = class {
    constructor(layer, skip, minPoint, rank = 0) {
      this.layer = layer;
      this.skip = skip;
      this.minPoint = minPoint;
      this.rank = rank;
    }
    get startSide() {
      return this.value ? this.value.startSide : 0;
    }
    get endSide() {
      return this.value ? this.value.endSide : 0;
    }
    goto(pos, side = -1e9) {
      this.chunkIndex = this.rangeIndex = 0;
      this.gotoInner(pos, side, false);
      return this;
    }
    gotoInner(pos, side, forward) {
      while (this.chunkIndex < this.layer.chunk.length) {
        let next2 = this.layer.chunk[this.chunkIndex];
        if (!(this.skip && this.skip.has(next2) || this.layer.chunkEnd(this.chunkIndex) < pos || next2.maxPoint < this.minPoint))
          break;
        this.chunkIndex++;
        forward = false;
      }
      let rangeIndex = this.chunkIndex == this.layer.chunk.length ? 0 : this.layer.chunk[this.chunkIndex].findIndex(pos - this.layer.chunkPos[this.chunkIndex], -1, side);
      if (!forward || this.rangeIndex < rangeIndex)
        this.rangeIndex = rangeIndex;
      this.next();
    }
    forward(pos, side) {
      if ((this.to - pos || this.endSide - side) < 0)
        this.gotoInner(pos, side, true);
    }
    next() {
      for (; ; ) {
        if (this.chunkIndex == this.layer.chunk.length) {
          this.from = this.to = 1e9;
          this.value = null;
          break;
        } else {
          let chunkPos = this.layer.chunkPos[this.chunkIndex], chunk = this.layer.chunk[this.chunkIndex];
          let from = chunkPos + chunk.from[this.rangeIndex];
          this.from = from;
          this.to = chunkPos + chunk.to[this.rangeIndex];
          this.value = chunk.value[this.rangeIndex];
          if (++this.rangeIndex == chunk.value.length) {
            this.chunkIndex++;
            if (this.skip) {
              while (this.chunkIndex < this.layer.chunk.length && this.skip.has(this.layer.chunk[this.chunkIndex]))
                this.chunkIndex++;
            }
            this.rangeIndex = 0;
          }
          if (this.minPoint < 0 || this.value.point && this.to - this.from >= this.minPoint)
            break;
        }
      }
    }
    nextChunk() {
      this.chunkIndex++;
      this.rangeIndex = 0;
      this.next();
    }
    compare(other) {
      return this.from - other.from || this.startSide - other.startSide || this.to - other.to || this.endSide - other.endSide;
    }
  };
  var HeapCursor = class {
    constructor(heap) {
      this.heap = heap;
    }
    static from(sets, skip = null, minPoint = -1) {
      let heap = [];
      for (let i = 0; i < sets.length; i++) {
        for (let cur = sets[i]; cur != RangeSet.empty; cur = cur.nextLayer) {
          if (cur.maxPoint >= minPoint)
            heap.push(new LayerCursor(cur, skip, minPoint, i));
        }
      }
      return heap.length == 1 ? heap[0] : new HeapCursor(heap);
    }
    get startSide() {
      return this.value ? this.value.startSide : 0;
    }
    goto(pos, side = -1e9) {
      for (let cur of this.heap)
        cur.goto(pos, side);
      for (let i = this.heap.length >> 1; i >= 0; i--)
        heapBubble(this.heap, i);
      this.next();
      return this;
    }
    forward(pos, side) {
      for (let cur of this.heap)
        cur.forward(pos, side);
      for (let i = this.heap.length >> 1; i >= 0; i--)
        heapBubble(this.heap, i);
      if ((this.to - pos || this.value.endSide - side) < 0)
        this.next();
    }
    next() {
      if (this.heap.length == 0) {
        this.from = this.to = 1e9;
        this.value = null;
        this.rank = -1;
      } else {
        let top2 = this.heap[0];
        this.from = top2.from;
        this.to = top2.to;
        this.value = top2.value;
        this.rank = top2.rank;
        if (top2.value)
          top2.next();
        heapBubble(this.heap, 0);
      }
    }
  };
  function heapBubble(heap, index) {
    for (let cur = heap[index]; ; ) {
      let childIndex = (index << 1) + 1;
      if (childIndex >= heap.length)
        break;
      let child = heap[childIndex];
      if (childIndex + 1 < heap.length && child.compare(heap[childIndex + 1]) >= 0) {
        child = heap[childIndex + 1];
        childIndex++;
      }
      if (cur.compare(child) < 0)
        break;
      heap[childIndex] = cur;
      heap[index] = child;
      index = childIndex;
    }
  }
  var SpanCursor = class {
    constructor(sets, skip, minPoint) {
      this.minPoint = minPoint;
      this.active = [];
      this.activeTo = [];
      this.activeRank = [];
      this.minActive = -1;
      this.point = null;
      this.pointFrom = 0;
      this.pointRank = 0;
      this.to = -1e9;
      this.endSide = 0;
      this.openStart = -1;
      this.cursor = HeapCursor.from(sets, skip, minPoint);
    }
    goto(pos, side = -1e9) {
      this.cursor.goto(pos, side);
      this.active.length = this.activeTo.length = this.activeRank.length = 0;
      this.minActive = -1;
      this.to = pos;
      this.endSide = side;
      this.openStart = -1;
      this.next();
      return this;
    }
    forward(pos, side) {
      while (this.minActive > -1 && (this.activeTo[this.minActive] - pos || this.active[this.minActive].endSide - side) < 0)
        this.removeActive(this.minActive);
      this.cursor.forward(pos, side);
    }
    removeActive(index) {
      remove(this.active, index);
      remove(this.activeTo, index);
      remove(this.activeRank, index);
      this.minActive = findMinIndex(this.active, this.activeTo);
    }
    addActive(trackOpen) {
      let i = 0, {value, to, rank} = this.cursor;
      while (i < this.activeRank.length && this.activeRank[i] <= rank)
        i++;
      insert(this.active, i, value);
      insert(this.activeTo, i, to);
      insert(this.activeRank, i, rank);
      if (trackOpen)
        insert(trackOpen, i, this.cursor.from);
      this.minActive = findMinIndex(this.active, this.activeTo);
    }
    next() {
      let from = this.to, wasPoint = this.point;
      this.point = null;
      let trackOpen = this.openStart < 0 ? [] : null, trackExtra = 0;
      for (; ; ) {
        let a = this.minActive;
        if (a > -1 && (this.activeTo[a] - this.cursor.from || this.active[a].endSide - this.cursor.startSide) < 0) {
          if (this.activeTo[a] > from) {
            this.to = this.activeTo[a];
            this.endSide = this.active[a].endSide;
            break;
          }
          this.removeActive(a);
          if (trackOpen)
            remove(trackOpen, a);
        } else if (!this.cursor.value) {
          this.to = this.endSide = 1e9;
          break;
        } else if (this.cursor.from > from) {
          this.to = this.cursor.from;
          this.endSide = this.cursor.startSide;
          break;
        } else {
          let nextVal = this.cursor.value;
          if (!nextVal.point) {
            this.addActive(trackOpen);
            this.cursor.next();
          } else if (wasPoint && this.cursor.to == this.to && this.cursor.from < this.cursor.to && nextVal.endSide == this.endSide) {
            this.cursor.next();
          } else {
            this.point = nextVal;
            this.pointFrom = this.cursor.from;
            this.pointRank = this.cursor.rank;
            this.to = this.cursor.to;
            this.endSide = nextVal.endSide;
            if (this.cursor.from < from)
              trackExtra = 1;
            this.cursor.next();
            if (this.to > from)
              this.forward(this.to, this.endSide);
            break;
          }
        }
      }
      if (trackOpen) {
        let openStart = 0;
        while (openStart < trackOpen.length && trackOpen[openStart] < from)
          openStart++;
        this.openStart = openStart + trackExtra;
      }
    }
    activeForPoint(to) {
      if (!this.active.length)
        return this.active;
      let active = [];
      for (let i = 0; i < this.active.length; i++) {
        if (this.activeRank[i] > this.pointRank)
          break;
        if (this.activeTo[i] > to || this.activeTo[i] == to && this.active[i].endSide > this.point.endSide)
          active.push(this.active[i]);
      }
      return active;
    }
    openEnd(to) {
      let open = 0;
      while (open < this.activeTo.length && this.activeTo[open] > to)
        open++;
      return open;
    }
  };
  function compare(a, startA, b, startB, length, comparator) {
    a.goto(startA);
    b.goto(startB);
    let endB = startB + length;
    let pos = startB, dPos = startB - startA;
    for (; ; ) {
      let diff = a.to + dPos - b.to || a.endSide - b.endSide;
      let end = diff < 0 ? a.to + dPos : b.to, clipEnd = Math.min(end, endB);
      if (a.point || b.point) {
        if (!(a.point && b.point && (a.point == b.point || a.point.eq(b.point))))
          comparator.comparePoint(pos, clipEnd, a.point, b.point);
      } else {
        if (clipEnd > pos && !sameValues(a.active, b.active))
          comparator.compareRange(pos, clipEnd, a.active, b.active);
      }
      if (end > endB)
        break;
      pos = end;
      if (diff <= 0)
        a.next();
      if (diff >= 0)
        b.next();
    }
  }
  function sameValues(a, b) {
    if (a.length != b.length)
      return false;
    for (let i = 0; i < a.length; i++)
      if (a[i] != b[i] && !a[i].eq(b[i]))
        return false;
    return true;
  }
  function remove(array, index) {
    for (let i = index, e = array.length - 1; i < e; i++)
      array[i] = array[i + 1];
    array.pop();
  }
  function insert(array, index, value) {
    for (let i = array.length - 1; i >= index; i--)
      array[i + 1] = array[i];
    array[index] = value;
  }
  function findMinIndex(value, array) {
    let found = -1, foundPos = 1e9;
    for (let i = 0; i < array.length; i++)
      if ((array[i] - foundPos || value[i].endSide - value[found].endSide) < 0) {
        found = i;
        foundPos = array[i];
      }
    return found;
  }

  // node_modules/w3c-keyname/index.es.js
  var base = {
    8: "Backspace",
    9: "Tab",
    10: "Enter",
    12: "NumLock",
    13: "Enter",
    16: "Shift",
    17: "Control",
    18: "Alt",
    20: "CapsLock",
    27: "Escape",
    32: " ",
    33: "PageUp",
    34: "PageDown",
    35: "End",
    36: "Home",
    37: "ArrowLeft",
    38: "ArrowUp",
    39: "ArrowRight",
    40: "ArrowDown",
    44: "PrintScreen",
    45: "Insert",
    46: "Delete",
    59: ";",
    61: "=",
    91: "Meta",
    92: "Meta",
    106: "*",
    107: "+",
    108: ",",
    109: "-",
    110: ".",
    111: "/",
    144: "NumLock",
    145: "ScrollLock",
    160: "Shift",
    161: "Shift",
    162: "Control",
    163: "Control",
    164: "Alt",
    165: "Alt",
    173: "-",
    186: ";",
    187: "=",
    188: ",",
    189: "-",
    190: ".",
    191: "/",
    192: "`",
    219: "[",
    220: "\\",
    221: "]",
    222: "'",
    229: "q"
  };
  var shift = {
    48: ")",
    49: "!",
    50: "@",
    51: "#",
    52: "$",
    53: "%",
    54: "^",
    55: "&",
    56: "*",
    57: "(",
    59: ":",
    61: "+",
    173: "_",
    186: ":",
    187: "+",
    188: "<",
    189: "_",
    190: ">",
    191: "?",
    192: "~",
    219: "{",
    220: "|",
    221: "}",
    222: '"',
    229: "Q"
  };
  var chrome = typeof navigator != "undefined" && /Chrome\/(\d+)/.exec(navigator.userAgent);
  var safari = typeof navigator != "undefined" && /Apple Computer/.test(navigator.vendor);
  var gecko = typeof navigator != "undefined" && /Gecko\/\d+/.test(navigator.userAgent);
  var mac = typeof navigator != "undefined" && /Mac/.test(navigator.platform);
  var ie = typeof navigator != "undefined" && /MSIE \d|Trident\/(?:[7-9]|\d{2,})\..*rv:(\d+)/.exec(navigator.userAgent);
  var brokenModifierNames = chrome && (mac || +chrome[1] < 57) || gecko && mac;
  for (var i = 0; i < 10; i++)
    base[48 + i] = base[96 + i] = String(i);
  for (var i = 1; i <= 24; i++)
    base[i + 111] = "F" + i;
  for (var i = 65; i <= 90; i++) {
    base[i] = String.fromCharCode(i + 32);
    shift[i] = String.fromCharCode(i);
  }
  for (var code in base)
    if (!shift.hasOwnProperty(code))
      shift[code] = base[code];
  function keyName(event) {
    var ignoreKey = brokenModifierNames && (event.ctrlKey || event.altKey || event.metaKey) || (safari || ie) && event.shiftKey && event.key && event.key.length == 1;
    var name2 = !ignoreKey && event.key || (event.shiftKey ? shift : base)[event.keyCode] || event.key || "Unidentified";
    if (name2 == "Esc")
      name2 = "Escape";
    if (name2 == "Del")
      name2 = "Delete";
    if (name2 == "Left")
      name2 = "ArrowLeft";
    if (name2 == "Up")
      name2 = "ArrowUp";
    if (name2 == "Right")
      name2 = "ArrowRight";
    if (name2 == "Down")
      name2 = "ArrowDown";
    return name2;
  }

  // node_modules/@codemirror/view/dist/index.js
  function getSelection(root) {
    return root.getSelection ? root.getSelection() : document.getSelection();
  }
  function contains(dom, node) {
    return node ? dom.contains(node.nodeType != 1 ? node.parentNode : node) : false;
  }
  function deepActiveElement() {
    let elt = document.activeElement;
    while (elt && elt.shadowRoot)
      elt = elt.shadowRoot.activeElement;
    return elt;
  }
  function hasSelection(dom, selection) {
    if (!selection.anchorNode)
      return false;
    try {
      return contains(dom, selection.anchorNode);
    } catch (_) {
      return false;
    }
  }
  function clientRectsFor(dom) {
    if (dom.nodeType == 3)
      return textRange(dom, 0, dom.nodeValue.length).getClientRects();
    else if (dom.nodeType == 1)
      return dom.getClientRects();
    else
      return [];
  }
  function isEquivalentPosition(node, off, targetNode, targetOff) {
    return targetNode ? scanFor(node, off, targetNode, targetOff, -1) || scanFor(node, off, targetNode, targetOff, 1) : false;
  }
  function domIndex(node) {
    for (var index = 0; ; index++) {
      node = node.previousSibling;
      if (!node)
        return index;
    }
  }
  function scanFor(node, off, targetNode, targetOff, dir) {
    for (; ; ) {
      if (node == targetNode && off == targetOff)
        return true;
      if (off == (dir < 0 ? 0 : maxOffset(node))) {
        if (node.nodeName == "DIV")
          return false;
        let parent = node.parentNode;
        if (!parent || parent.nodeType != 1)
          return false;
        off = domIndex(node) + (dir < 0 ? 0 : 1);
        node = parent;
      } else if (node.nodeType == 1) {
        node = node.childNodes[off + (dir < 0 ? -1 : 0)];
        off = dir < 0 ? maxOffset(node) : 0;
      } else {
        return false;
      }
    }
  }
  function maxOffset(node) {
    return node.nodeType == 3 ? node.nodeValue.length : node.childNodes.length;
  }
  var Rect0 = {left: 0, right: 0, top: 0, bottom: 0};
  function flattenRect(rect, left) {
    let x = left ? rect.left : rect.right;
    return {left: x, right: x, top: rect.top, bottom: rect.bottom};
  }
  function windowRect(win) {
    return {
      left: 0,
      right: win.innerWidth,
      top: 0,
      bottom: win.innerHeight
    };
  }
  var ScrollSpace = 5;
  function scrollRectIntoView(dom, rect) {
    let doc2 = dom.ownerDocument, win = doc2.defaultView;
    for (let cur = dom.parentNode; cur; ) {
      if (cur.nodeType == 1) {
        let bounding, top2 = cur == document.body;
        if (top2) {
          bounding = windowRect(win);
        } else {
          if (cur.scrollHeight <= cur.clientHeight && cur.scrollWidth <= cur.clientWidth) {
            cur = cur.parentNode;
            continue;
          }
          let rect2 = cur.getBoundingClientRect();
          bounding = {
            left: rect2.left,
            right: rect2.left + cur.clientWidth,
            top: rect2.top,
            bottom: rect2.top + cur.clientHeight
          };
        }
        let moveX = 0, moveY = 0;
        if (rect.top < bounding.top)
          moveY = -(bounding.top - rect.top + ScrollSpace);
        else if (rect.bottom > bounding.bottom)
          moveY = rect.bottom - bounding.bottom + ScrollSpace;
        if (rect.left < bounding.left)
          moveX = -(bounding.left - rect.left + ScrollSpace);
        else if (rect.right > bounding.right)
          moveX = rect.right - bounding.right + ScrollSpace;
        if (moveX || moveY) {
          if (top2) {
            win.scrollBy(moveX, moveY);
          } else {
            if (moveY) {
              let start = cur.scrollTop;
              cur.scrollTop += moveY;
              moveY = cur.scrollTop - start;
            }
            if (moveX) {
              let start = cur.scrollLeft;
              cur.scrollLeft += moveX;
              moveX = cur.scrollLeft - start;
            }
            rect = {
              left: rect.left - moveX,
              top: rect.top - moveY,
              right: rect.right - moveX,
              bottom: rect.bottom - moveY
            };
          }
        }
        if (top2)
          break;
        cur = cur.assignedSlot || cur.parentNode;
      } else if (cur.nodeType == 11) {
        cur = cur.host;
      } else {
        break;
      }
    }
  }
  var DOMSelection = class {
    constructor() {
      this.anchorNode = null;
      this.anchorOffset = 0;
      this.focusNode = null;
      this.focusOffset = 0;
    }
    eq(domSel) {
      return this.anchorNode == domSel.anchorNode && this.anchorOffset == domSel.anchorOffset && this.focusNode == domSel.focusNode && this.focusOffset == domSel.focusOffset;
    }
    set(domSel) {
      this.anchorNode = domSel.anchorNode;
      this.anchorOffset = domSel.anchorOffset;
      this.focusNode = domSel.focusNode;
      this.focusOffset = domSel.focusOffset;
    }
  };
  var preventScrollSupported = null;
  function focusPreventScroll(dom) {
    if (dom.setActive)
      return dom.setActive();
    if (preventScrollSupported)
      return dom.focus(preventScrollSupported);
    let stack = [];
    for (let cur = dom; cur; cur = cur.parentNode) {
      stack.push(cur, cur.scrollTop, cur.scrollLeft);
      if (cur == cur.ownerDocument)
        break;
    }
    dom.focus(preventScrollSupported == null ? {
      get preventScroll() {
        preventScrollSupported = {preventScroll: true};
        return true;
      }
    } : void 0);
    if (!preventScrollSupported) {
      preventScrollSupported = false;
      for (let i = 0; i < stack.length; ) {
        let elt = stack[i++], top2 = stack[i++], left = stack[i++];
        if (elt.scrollTop != top2)
          elt.scrollTop = top2;
        if (elt.scrollLeft != left)
          elt.scrollLeft = left;
      }
    }
  }
  var scratchRange;
  function textRange(node, from, to = from) {
    let range = scratchRange || (scratchRange = document.createRange());
    range.setEnd(node, to);
    range.setStart(node, from);
    return range;
  }
  var DOMPos = class {
    constructor(node, offset, precise = true) {
      this.node = node;
      this.offset = offset;
      this.precise = precise;
    }
    static before(dom, precise) {
      return new DOMPos(dom.parentNode, domIndex(dom), precise);
    }
    static after(dom, precise) {
      return new DOMPos(dom.parentNode, domIndex(dom) + 1, precise);
    }
  };
  var none$3 = [];
  var ContentView = class {
    constructor() {
      this.parent = null;
      this.dom = null;
      this.dirty = 2;
    }
    get editorView() {
      if (!this.parent)
        throw new Error("Accessing view in orphan content view");
      return this.parent.editorView;
    }
    get overrideDOMText() {
      return null;
    }
    get posAtStart() {
      return this.parent ? this.parent.posBefore(this) : 0;
    }
    get posAtEnd() {
      return this.posAtStart + this.length;
    }
    posBefore(view) {
      let pos = this.posAtStart;
      for (let child of this.children) {
        if (child == view)
          return pos;
        pos += child.length + child.breakAfter;
      }
      throw new RangeError("Invalid child in posBefore");
    }
    posAfter(view) {
      return this.posBefore(view) + view.length;
    }
    coordsAt(_pos, _side) {
      return null;
    }
    sync(track) {
      var _a;
      if (this.dirty & 2) {
        let parent = this.dom, pos = null;
        for (let child of this.children) {
          if (child.dirty) {
            let next3 = pos ? pos.nextSibling : parent.firstChild;
            if (!child.dom && next3 && !((_a = ContentView.get(next3)) === null || _a === void 0 ? void 0 : _a.parent))
              child.reuseDOM(next3);
            child.sync(track);
            child.dirty = 0;
          }
          if (track && track.node == parent && pos != child.dom)
            track.written = true;
          syncNodeInto(parent, pos, child.dom);
          pos = child.dom;
        }
        let next2 = pos ? pos.nextSibling : parent.firstChild;
        if (next2 && track && track.node == parent)
          track.written = true;
        while (next2)
          next2 = rm(next2);
      } else if (this.dirty & 1) {
        for (let child of this.children)
          if (child.dirty) {
            child.sync(track);
            child.dirty = 0;
          }
      }
    }
    reuseDOM(_dom) {
      return false;
    }
    localPosFromDOM(node, offset) {
      let after;
      if (node == this.dom) {
        after = this.dom.childNodes[offset];
      } else {
        let bias = maxOffset(node) == 0 ? 0 : offset == 0 ? -1 : 1;
        for (; ; ) {
          let parent = node.parentNode;
          if (parent == this.dom)
            break;
          if (bias == 0 && parent.firstChild != parent.lastChild) {
            if (node == parent.firstChild)
              bias = -1;
            else
              bias = 1;
          }
          node = parent;
        }
        if (bias < 0)
          after = node;
        else
          after = node.nextSibling;
      }
      if (after == this.dom.firstChild)
        return 0;
      while (after && !ContentView.get(after))
        after = after.nextSibling;
      if (!after)
        return this.length;
      for (let i = 0, pos = 0; ; i++) {
        let child = this.children[i];
        if (child.dom == after)
          return pos;
        pos += child.length + child.breakAfter;
      }
    }
    domBoundsAround(from, to, offset = 0) {
      let fromI = -1, fromStart = -1, toI = -1, toEnd = -1;
      for (let i = 0, pos = offset, prevEnd = offset; i < this.children.length; i++) {
        let child = this.children[i], end = pos + child.length;
        if (pos < from && end > to)
          return child.domBoundsAround(from, to, pos);
        if (end >= from && fromI == -1) {
          fromI = i;
          fromStart = pos;
        }
        if (pos > to && child.dom.parentNode == this.dom) {
          toI = i;
          toEnd = prevEnd;
          break;
        }
        prevEnd = end;
        pos = end + child.breakAfter;
      }
      return {from: fromStart, to: toEnd < 0 ? offset + this.length : toEnd, startDOM: (fromI ? this.children[fromI - 1].dom.nextSibling : null) || this.dom.firstChild, endDOM: toI < this.children.length && toI >= 0 ? this.children[toI].dom : null};
    }
    markDirty(andParent = false) {
      if (this.dirty & 2)
        return;
      this.dirty |= 2;
      this.markParentsDirty(andParent);
    }
    markParentsDirty(childList) {
      for (let parent = this.parent; parent; parent = parent.parent) {
        if (childList)
          parent.dirty |= 2;
        if (parent.dirty & 1)
          return;
        parent.dirty |= 1;
        childList = false;
      }
    }
    setParent(parent) {
      if (this.parent != parent) {
        this.parent = parent;
        if (this.dirty)
          this.markParentsDirty(true);
      }
    }
    setDOM(dom) {
      this.dom = dom;
      dom.cmView = this;
    }
    get rootView() {
      for (let v = this; ; ) {
        let parent = v.parent;
        if (!parent)
          return v;
        v = parent;
      }
    }
    replaceChildren(from, to, children = none$3) {
      this.markDirty();
      for (let i = from; i < to; i++)
        this.children[i].parent = null;
      this.children.splice(from, to - from, ...children);
      for (let i = 0; i < children.length; i++)
        children[i].setParent(this);
    }
    ignoreMutation(_rec) {
      return false;
    }
    ignoreEvent(_event) {
      return false;
    }
    childCursor(pos = this.length) {
      return new ChildCursor(this.children, pos, this.children.length);
    }
    childPos(pos, bias = 1) {
      return this.childCursor().findPos(pos, bias);
    }
    toString() {
      let name2 = this.constructor.name.replace("View", "");
      return name2 + (this.children.length ? "(" + this.children.join() + ")" : this.length ? "[" + (name2 == "Text" ? this.text : this.length) + "]" : "") + (this.breakAfter ? "#" : "");
    }
    static get(node) {
      return node.cmView;
    }
  };
  ContentView.prototype.breakAfter = 0;
  function rm(dom) {
    let next2 = dom.nextSibling;
    dom.parentNode.removeChild(dom);
    return next2;
  }
  function syncNodeInto(parent, after, dom) {
    let next2 = after ? after.nextSibling : parent.firstChild;
    if (dom.parentNode == parent)
      while (next2 != dom)
        next2 = rm(next2);
    else
      parent.insertBefore(dom, next2);
  }
  var ChildCursor = class {
    constructor(children, pos, i) {
      this.children = children;
      this.pos = pos;
      this.i = i;
      this.off = 0;
    }
    findPos(pos, bias = 1) {
      for (; ; ) {
        if (pos > this.pos || pos == this.pos && (bias > 0 || this.i == 0 || this.children[this.i - 1].breakAfter)) {
          this.off = pos - this.pos;
          return this;
        }
        let next2 = this.children[--this.i];
        this.pos -= next2.length + next2.breakAfter;
      }
    }
  };
  var [nav, doc] = typeof navigator != "undefined" ? [navigator, document] : [{userAgent: "", vendor: "", platform: ""}, {documentElement: {style: {}}}];
  var ie_edge = /* @__PURE__ */ /Edge\/(\d+)/.exec(nav.userAgent);
  var ie_upto10 = /* @__PURE__ */ /MSIE \d/.test(nav.userAgent);
  var ie_11up = /* @__PURE__ */ /Trident\/(?:[7-9]|\d{2,})\..*rv:(\d+)/.exec(nav.userAgent);
  var ie2 = !!(ie_upto10 || ie_11up || ie_edge);
  var gecko2 = !ie2 && /* @__PURE__ */ /gecko\/(\d+)/i.test(nav.userAgent);
  var chrome2 = !ie2 && /* @__PURE__ */ /Chrome\/(\d+)/.exec(nav.userAgent);
  var webkit = "webkitFontSmoothing" in doc.documentElement.style;
  var safari2 = !ie2 && /* @__PURE__ */ /Apple Computer/.test(nav.vendor);
  var browser = {
    mac: /* @__PURE__ */ /Mac/.test(nav.platform),
    ie: ie2,
    ie_version: ie_upto10 ? doc.documentMode || 6 : ie_11up ? +ie_11up[1] : ie_edge ? +ie_edge[1] : 0,
    gecko: gecko2,
    gecko_version: gecko2 ? +(/* @__PURE__ */ /Firefox\/(\d+)/.exec(nav.userAgent) || [0, 0])[1] : 0,
    chrome: !!chrome2,
    chrome_version: chrome2 ? +chrome2[1] : 0,
    ios: safari2 && (/* @__PURE__ */ /Mobile\/\w+/.test(nav.userAgent) || nav.maxTouchPoints > 2),
    android: /* @__PURE__ */ /Android\b/.test(nav.userAgent),
    webkit,
    safari: safari2,
    webkit_version: webkit ? +(/* @__PURE__ */ /\bAppleWebKit\/(\d+)/.exec(navigator.userAgent) || [0, 0])[1] : 0,
    tabSize: doc.documentElement.style.tabSize != null ? "tab-size" : "-moz-tab-size"
  };
  var none$2 = [];
  var InlineView = class extends ContentView {
    become(_other) {
      return false;
    }
    getSide() {
      return 0;
    }
  };
  InlineView.prototype.children = none$2;
  var MaxJoinLen = 256;
  var TextView = class extends InlineView {
    constructor(text) {
      super();
      this.text = text;
    }
    get length() {
      return this.text.length;
    }
    createDOM(textDOM) {
      this.setDOM(textDOM || document.createTextNode(this.text));
    }
    sync(track) {
      if (!this.dom)
        this.createDOM();
      if (this.dom.nodeValue != this.text) {
        if (track && track.node == this.dom)
          track.written = true;
        this.dom.nodeValue = this.text;
      }
    }
    reuseDOM(dom) {
      if (dom.nodeType != 3)
        return false;
      this.createDOM(dom);
      return true;
    }
    merge(from, to, source) {
      if (source && (!(source instanceof TextView) || this.length - (to - from) + source.length > MaxJoinLen))
        return false;
      this.text = this.text.slice(0, from) + (source ? source.text : "") + this.text.slice(to);
      this.markDirty();
      return true;
    }
    slice(from) {
      return new TextView(this.text.slice(from));
    }
    localPosFromDOM(node, offset) {
      return node == this.dom ? offset : offset ? this.text.length : 0;
    }
    domAtPos(pos) {
      return new DOMPos(this.dom, pos);
    }
    domBoundsAround(_from, _to, offset) {
      return {from: offset, to: offset + this.length, startDOM: this.dom, endDOM: this.dom.nextSibling};
    }
    coordsAt(pos, side) {
      return textCoords(this.dom, pos, side);
    }
  };
  var MarkView = class extends InlineView {
    constructor(mark, children = [], length = 0) {
      super();
      this.mark = mark;
      this.children = children;
      this.length = length;
      for (let ch of children)
        ch.setParent(this);
    }
    createDOM() {
      let dom = document.createElement(this.mark.tagName);
      if (this.mark.class)
        dom.className = this.mark.class;
      if (this.mark.attrs)
        for (let name2 in this.mark.attrs)
          dom.setAttribute(name2, this.mark.attrs[name2]);
      this.setDOM(dom);
    }
    sync(track) {
      if (!this.dom)
        this.createDOM();
      super.sync(track);
    }
    merge(from, to, source, openStart, openEnd) {
      if (source && (!(source instanceof MarkView && source.mark.eq(this.mark)) || from && openStart <= 0 || to < this.length && openEnd <= 0))
        return false;
      mergeInlineChildren(this, from, to, source ? source.children : none$2, openStart - 1, openEnd - 1);
      this.markDirty();
      return true;
    }
    slice(from) {
      return new MarkView(this.mark, sliceInlineChildren(this.children, from), this.length - from);
    }
    domAtPos(pos) {
      return inlineDOMAtPos(this.dom, this.children, pos);
    }
    coordsAt(pos, side) {
      return coordsInChildren(this, pos, side);
    }
  };
  function textCoords(text, pos, side) {
    let length = text.nodeValue.length;
    if (pos > length)
      pos = length;
    let from = pos, to = pos, flatten2 = 0;
    if (pos == 0 && side < 0 || pos == length && side >= 0) {
      if (!(browser.chrome || browser.gecko)) {
        if (pos) {
          from--;
          flatten2 = 1;
        } else {
          to++;
          flatten2 = -1;
        }
      }
    } else {
      if (side < 0)
        from--;
      else
        to++;
    }
    let rects = textRange(text, from, to).getClientRects();
    if (!rects.length)
      return Rect0;
    let rect = rects[(flatten2 ? flatten2 < 0 : side >= 0) ? 0 : rects.length - 1];
    if (browser.safari && !flatten2 && rect.width == 0)
      rect = Array.prototype.find.call(rects, (r) => r.width) || rect;
    return flatten2 ? flattenRect(rect, flatten2 < 0) : rect;
  }
  var WidgetView = class extends InlineView {
    constructor(widget, length, side) {
      super();
      this.widget = widget;
      this.length = length;
      this.side = side;
    }
    static create(widget, length, side) {
      return new (widget.customView || WidgetView)(widget, length, side);
    }
    slice(from) {
      return WidgetView.create(this.widget, this.length - from, this.side);
    }
    sync() {
      if (!this.dom || !this.widget.updateDOM(this.dom)) {
        this.setDOM(this.widget.toDOM(this.editorView));
        this.dom.contentEditable = "false";
      }
    }
    getSide() {
      return this.side;
    }
    merge(from, to, source, openStart, openEnd) {
      if (source && (!(source instanceof WidgetView) || !this.widget.compare(source.widget) || from > 0 && openStart <= 0 || to < this.length && openEnd <= 0))
        return false;
      this.length = from + (source ? source.length : 0) + (this.length - to);
      return true;
    }
    become(other) {
      if (other.length == this.length && other instanceof WidgetView && other.side == this.side) {
        if (this.widget.constructor == other.widget.constructor) {
          if (!this.widget.eq(other.widget))
            this.markDirty(true);
          this.widget = other.widget;
          return true;
        }
      }
      return false;
    }
    ignoreMutation() {
      return true;
    }
    ignoreEvent(event) {
      return this.widget.ignoreEvent(event);
    }
    get overrideDOMText() {
      if (this.length == 0)
        return Text.empty;
      let top2 = this;
      while (top2.parent)
        top2 = top2.parent;
      let view = top2.editorView, text = view && view.state.doc, start = this.posAtStart;
      return text ? text.slice(start, start + this.length) : Text.empty;
    }
    domAtPos(pos) {
      return pos == 0 ? DOMPos.before(this.dom) : DOMPos.after(this.dom, pos == this.length);
    }
    domBoundsAround() {
      return null;
    }
    coordsAt(pos, side) {
      let rects = this.dom.getClientRects(), rect = null;
      if (!rects.length)
        return Rect0;
      for (let i = pos > 0 ? rects.length - 1 : 0; ; i += pos > 0 ? -1 : 1) {
        rect = rects[i];
        if (pos > 0 ? i == 0 : i == rects.length - 1 || rect.top < rect.bottom)
          break;
      }
      return pos == 0 && side > 0 || pos == this.length && side <= 0 ? rect : flattenRect(rect, pos == 0);
    }
  };
  var CompositionView = class extends WidgetView {
    domAtPos(pos) {
      return new DOMPos(this.widget.text, pos);
    }
    sync() {
      if (!this.dom)
        this.setDOM(this.widget.toDOM());
    }
    localPosFromDOM(node, offset) {
      return !offset ? 0 : node.nodeType == 3 ? Math.min(offset, this.length) : this.length;
    }
    ignoreMutation() {
      return false;
    }
    get overrideDOMText() {
      return null;
    }
    coordsAt(pos, side) {
      return textCoords(this.widget.text, pos, side);
    }
  };
  function mergeInlineChildren(parent, from, to, elts, openStart, openEnd) {
    let cur = parent.childCursor();
    let {i: toI, off: toOff} = cur.findPos(to, 1);
    let {i: fromI, off: fromOff} = cur.findPos(from, -1);
    let dLen = from - to;
    for (let view of elts)
      dLen += view.length;
    parent.length += dLen;
    let {children} = parent;
    if (fromI == toI && fromOff) {
      let start = children[fromI];
      if (elts.length == 1 && start.merge(fromOff, toOff, elts[0], openStart, openEnd))
        return;
      if (elts.length == 0) {
        start.merge(fromOff, toOff, null, openStart, openEnd);
        return;
      }
      let after = start.slice(toOff);
      if (after.merge(0, 0, elts[elts.length - 1], 0, openEnd))
        elts[elts.length - 1] = after;
      else
        elts.push(after);
      toI++;
      openEnd = toOff = 0;
    }
    if (toOff) {
      let end = children[toI];
      if (elts.length && end.merge(0, toOff, elts[elts.length - 1], 0, openEnd)) {
        elts.pop();
        openEnd = elts.length ? 0 : openStart;
      } else {
        end.merge(0, toOff, null, 0, 0);
      }
    } else if (toI < children.length && elts.length && children[toI].merge(0, 0, elts[elts.length - 1], 0, openEnd)) {
      elts.pop();
      openEnd = elts.length ? 0 : openStart;
    }
    if (fromOff) {
      let start = children[fromI];
      if (elts.length && start.merge(fromOff, start.length, elts[0], openStart, 0)) {
        elts.shift();
        openStart = elts.length ? 0 : openEnd;
      } else {
        start.merge(fromOff, start.length, null, 0, 0);
      }
      fromI++;
    } else if (fromI && elts.length) {
      let end = children[fromI - 1];
      if (end.merge(end.length, end.length, elts[0], openStart, 0)) {
        elts.shift();
        openStart = elts.length ? 0 : openEnd;
      }
    }
    while (fromI < toI && elts.length && children[toI - 1].become(elts[elts.length - 1])) {
      elts.pop();
      toI--;
      openEnd = elts.length ? 0 : openStart;
    }
    while (fromI < toI && elts.length && children[fromI].become(elts[0])) {
      elts.shift();
      fromI++;
      openStart = elts.length ? 0 : openEnd;
    }
    if (!elts.length && fromI && toI < children.length && openStart && openEnd && children[toI].merge(0, 0, children[fromI - 1], openStart, openEnd))
      fromI--;
    if (elts.length || fromI != toI)
      parent.replaceChildren(fromI, toI, elts);
  }
  function sliceInlineChildren(children, from) {
    let result = [], off = 0;
    for (let elt of children) {
      let end = off + elt.length;
      if (end > from)
        result.push(off < from ? elt.slice(from - off) : elt);
      off = end;
    }
    return result;
  }
  function inlineDOMAtPos(dom, children, pos) {
    let i = 0;
    for (let off = 0; i < children.length; i++) {
      let child = children[i], end = off + child.length;
      if (end == off && child.getSide() <= 0)
        continue;
      if (pos > off && pos < end && child.dom.parentNode == dom)
        return child.domAtPos(pos - off);
      if (pos <= off)
        break;
      off = end;
    }
    for (; i > 0; i--) {
      let before = children[i - 1].dom;
      if (before.parentNode == dom)
        return DOMPos.after(before);
    }
    return new DOMPos(dom, 0);
  }
  function joinInlineInto(parent, view, open) {
    let last, {children} = parent;
    if (open > 0 && view instanceof MarkView && children.length && (last = children[children.length - 1]) instanceof MarkView && last.mark.eq(view.mark)) {
      joinInlineInto(last, view.children[0], open - 1);
    } else {
      children.push(view);
      view.setParent(parent);
    }
    parent.length += view.length;
  }
  function coordsInChildren(view, pos, side) {
    for (let off = 0, i = 0; i < view.children.length; i++) {
      let child = view.children[i], end = off + child.length;
      if (end == off && child.getSide() <= 0)
        continue;
      if (side <= 0 || end == view.length ? end >= pos : end > pos)
        return child.coordsAt(pos - off, side);
      off = end;
    }
    let last = view.dom.lastChild;
    if (!last)
      return view.dom.getBoundingClientRect();
    let rects = clientRectsFor(last);
    return rects[rects.length - 1];
  }
  function combineAttrs(source, target) {
    for (let name2 in source) {
      if (name2 == "class" && target.class)
        target.class += " " + source.class;
      else if (name2 == "style" && target.style)
        target.style += ";" + source.style;
      else
        target[name2] = source[name2];
    }
    return target;
  }
  function attrsEq(a, b) {
    if (a == b)
      return true;
    if (!a || !b)
      return false;
    let keysA = Object.keys(a), keysB = Object.keys(b);
    if (keysA.length != keysB.length)
      return false;
    for (let key of keysA) {
      if (keysB.indexOf(key) == -1 || a[key] !== b[key])
        return false;
    }
    return true;
  }
  function updateAttrs(dom, prev, attrs) {
    if (prev) {
      for (let name2 in prev)
        if (!(attrs && name2 in attrs))
          dom.removeAttribute(name2);
    }
    if (attrs) {
      for (let name2 in attrs)
        if (!(prev && prev[name2] == attrs[name2]))
          dom.setAttribute(name2, attrs[name2]);
    }
  }
  var WidgetType = class {
    eq(_widget) {
      return false;
    }
    updateDOM(_dom) {
      return false;
    }
    compare(other) {
      return this == other || this.constructor == other.constructor && this.eq(other);
    }
    get estimatedHeight() {
      return -1;
    }
    ignoreEvent(_event) {
      return true;
    }
    get customView() {
      return null;
    }
  };
  var BlockType = /* @__PURE__ */ function(BlockType2) {
    BlockType2[BlockType2["Text"] = 0] = "Text";
    BlockType2[BlockType2["WidgetBefore"] = 1] = "WidgetBefore";
    BlockType2[BlockType2["WidgetAfter"] = 2] = "WidgetAfter";
    BlockType2[BlockType2["WidgetRange"] = 3] = "WidgetRange";
    return BlockType2;
  }(BlockType || (BlockType = {}));
  var Decoration = class extends RangeValue {
    constructor(startSide, endSide, widget, spec) {
      super();
      this.startSide = startSide;
      this.endSide = endSide;
      this.widget = widget;
      this.spec = spec;
    }
    get heightRelevant() {
      return false;
    }
    static mark(spec) {
      return new MarkDecoration(spec);
    }
    static widget(spec) {
      let side = spec.side || 0;
      if (spec.block)
        side += (2e8 + 1) * (side > 0 ? 1 : -1);
      return new PointDecoration(spec, side, side, !!spec.block, spec.widget || null, false);
    }
    static replace(spec) {
      let block = !!spec.block;
      let {start, end} = getInclusive(spec);
      let startSide = block ? -2e8 * (start ? 2 : 1) : 1e8 * (start ? -1 : 1);
      let endSide = block ? 2e8 * (end ? 2 : 1) : 1e8 * (end ? 1 : -1);
      return new PointDecoration(spec, startSide, endSide, block, spec.widget || null, true);
    }
    static line(spec) {
      return new LineDecoration(spec);
    }
    static set(of, sort = false) {
      return RangeSet.of(of, sort);
    }
    hasHeight() {
      return this.widget ? this.widget.estimatedHeight > -1 : false;
    }
  };
  Decoration.none = RangeSet.empty;
  var MarkDecoration = class extends Decoration {
    constructor(spec) {
      let {start, end} = getInclusive(spec);
      super(1e8 * (start ? -1 : 1), 1e8 * (end ? 1 : -1), null, spec);
      this.tagName = spec.tagName || "span";
      this.class = spec.class || "";
      this.attrs = spec.attributes || null;
    }
    eq(other) {
      return this == other || other instanceof MarkDecoration && this.tagName == other.tagName && this.class == other.class && attrsEq(this.attrs, other.attrs);
    }
    range(from, to = from) {
      if (from >= to)
        throw new RangeError("Mark decorations may not be empty");
      return super.range(from, to);
    }
  };
  MarkDecoration.prototype.point = false;
  var LineDecoration = class extends Decoration {
    constructor(spec) {
      super(-1e8, -1e8, null, spec);
    }
    eq(other) {
      return other instanceof LineDecoration && attrsEq(this.spec.attributes, other.spec.attributes);
    }
    range(from, to = from) {
      if (to != from)
        throw new RangeError("Line decoration ranges must be zero-length");
      return super.range(from, to);
    }
  };
  LineDecoration.prototype.mapMode = MapMode.TrackBefore;
  LineDecoration.prototype.point = true;
  var PointDecoration = class extends Decoration {
    constructor(spec, startSide, endSide, block, widget, isReplace) {
      super(startSide, endSide, widget, spec);
      this.block = block;
      this.isReplace = isReplace;
      this.mapMode = !block ? MapMode.TrackDel : startSide < 0 ? MapMode.TrackBefore : MapMode.TrackAfter;
    }
    get type() {
      return this.startSide < this.endSide ? BlockType.WidgetRange : this.startSide < 0 ? BlockType.WidgetBefore : BlockType.WidgetAfter;
    }
    get heightRelevant() {
      return this.block || !!this.widget && this.widget.estimatedHeight >= 5;
    }
    eq(other) {
      return other instanceof PointDecoration && widgetsEq(this.widget, other.widget) && this.block == other.block && this.startSide == other.startSide && this.endSide == other.endSide;
    }
    range(from, to = from) {
      if (this.isReplace && (from > to || from == to && this.startSide > 0 && this.endSide < 0))
        throw new RangeError("Invalid range for replacement decoration");
      if (!this.isReplace && to != from)
        throw new RangeError("Widget decorations can only have zero-length ranges");
      return super.range(from, to);
    }
  };
  PointDecoration.prototype.point = true;
  function getInclusive(spec) {
    let {inclusiveStart: start, inclusiveEnd: end} = spec;
    if (start == null)
      start = spec.inclusive;
    if (end == null)
      end = spec.inclusive;
    return {start: start || false, end: end || false};
  }
  function widgetsEq(a, b) {
    return a == b || !!(a && b && a.compare(b));
  }
  function addRange(from, to, ranges, margin = 0) {
    let last = ranges.length - 1;
    if (last >= 0 && ranges[last] + margin > from)
      ranges[last] = Math.max(ranges[last], to);
    else
      ranges.push(from, to);
  }
  var LineView = class extends ContentView {
    constructor() {
      super(...arguments);
      this.children = [];
      this.length = 0;
      this.prevAttrs = void 0;
      this.attrs = null;
      this.breakAfter = 0;
    }
    merge(from, to, source, takeDeco, openStart, openEnd) {
      if (source) {
        if (!(source instanceof LineView))
          return false;
        if (!this.dom)
          source.transferDOM(this);
      }
      if (takeDeco)
        this.setDeco(source ? source.attrs : null);
      mergeInlineChildren(this, from, to, source ? source.children : none$1, openStart, openEnd);
      return true;
    }
    split(at) {
      let end = new LineView();
      end.breakAfter = this.breakAfter;
      if (this.length == 0)
        return end;
      let {i, off} = this.childPos(at);
      if (off) {
        end.append(this.children[i].slice(off), 0);
        this.children[i].merge(off, this.children[i].length, null, 0, 0);
        i++;
      }
      for (let j = i; j < this.children.length; j++)
        end.append(this.children[j], 0);
      while (i > 0 && this.children[i - 1].length == 0) {
        this.children[i - 1].parent = null;
        i--;
      }
      this.children.length = i;
      this.markDirty();
      this.length = at;
      return end;
    }
    transferDOM(other) {
      if (!this.dom)
        return;
      other.setDOM(this.dom);
      other.prevAttrs = this.prevAttrs === void 0 ? this.attrs : this.prevAttrs;
      this.prevAttrs = void 0;
      this.dom = null;
    }
    setDeco(attrs) {
      if (!attrsEq(this.attrs, attrs)) {
        if (this.dom) {
          this.prevAttrs = this.attrs;
          this.markDirty();
        }
        this.attrs = attrs;
      }
    }
    append(child, openStart) {
      joinInlineInto(this, child, openStart);
    }
    addLineDeco(deco) {
      let attrs = deco.spec.attributes;
      if (attrs)
        this.attrs = combineAttrs(attrs, this.attrs || {});
    }
    domAtPos(pos) {
      return inlineDOMAtPos(this.dom, this.children, pos);
    }
    sync(track) {
      if (!this.dom) {
        this.setDOM(document.createElement("div"));
        this.dom.className = "cm-line";
        this.prevAttrs = this.attrs ? null : void 0;
      }
      if (this.prevAttrs !== void 0) {
        updateAttrs(this.dom, this.prevAttrs, this.attrs);
        this.dom.classList.add("cm-line");
        this.prevAttrs = void 0;
      }
      super.sync(track);
      let last = this.dom.lastChild;
      if (!last || last.nodeName != "BR" && ContentView.get(last) instanceof WidgetView) {
        let hack = document.createElement("BR");
        hack.cmIgnore = true;
        this.dom.appendChild(hack);
      }
    }
    measureTextSize() {
      if (this.children.length == 0 || this.length > 20)
        return null;
      let totalWidth = 0;
      for (let child of this.children) {
        if (!(child instanceof TextView))
          return null;
        let rects = clientRectsFor(child.dom);
        if (rects.length != 1)
          return null;
        totalWidth += rects[0].width;
      }
      return {lineHeight: this.dom.getBoundingClientRect().height, charWidth: totalWidth / this.length};
    }
    coordsAt(pos, side) {
      return coordsInChildren(this, pos, side);
    }
    match(_other) {
      return false;
    }
    get type() {
      return BlockType.Text;
    }
    static find(docView, pos) {
      for (let i = 0, off = 0; ; i++) {
        let block = docView.children[i], end = off + block.length;
        if (end >= pos) {
          if (block instanceof LineView)
            return block;
          if (block.length)
            return null;
        }
        off = end + block.breakAfter;
      }
    }
  };
  var none$1 = [];
  var BlockWidgetView = class extends ContentView {
    constructor(widget, length, type) {
      super();
      this.widget = widget;
      this.length = length;
      this.type = type;
      this.breakAfter = 0;
    }
    merge(from, to, source, _takeDeco, openStart, openEnd) {
      if (source && (!(source instanceof BlockWidgetView) || !this.widget.compare(source.widget) || from > 0 && openStart <= 0 || to < this.length && openEnd <= 0))
        return false;
      this.length = from + (source ? source.length : 0) + (this.length - to);
      return true;
    }
    domAtPos(pos) {
      return pos == 0 ? DOMPos.before(this.dom) : DOMPos.after(this.dom, pos == this.length);
    }
    split(at) {
      let len = this.length - at;
      this.length = at;
      return new BlockWidgetView(this.widget, len, this.type);
    }
    get children() {
      return none$1;
    }
    sync() {
      if (!this.dom || !this.widget.updateDOM(this.dom)) {
        this.setDOM(this.widget.toDOM(this.editorView));
        this.dom.contentEditable = "false";
      }
    }
    get overrideDOMText() {
      return this.parent ? this.parent.view.state.doc.slice(this.posAtStart, this.posAtEnd) : Text.empty;
    }
    domBoundsAround() {
      return null;
    }
    match(other) {
      if (other instanceof BlockWidgetView && other.type == this.type && other.widget.constructor == this.widget.constructor) {
        if (!other.widget.eq(this.widget))
          this.markDirty(true);
        this.widget = other.widget;
        this.length = other.length;
        this.breakAfter = other.breakAfter;
        return true;
      }
      return false;
    }
    ignoreMutation() {
      return true;
    }
    ignoreEvent(event) {
      return this.widget.ignoreEvent(event);
    }
  };
  var ContentBuilder = class {
    constructor(doc2, pos, end) {
      this.doc = doc2;
      this.pos = pos;
      this.end = end;
      this.content = [];
      this.curLine = null;
      this.breakAtStart = 0;
      this.openStart = -1;
      this.openEnd = -1;
      this.text = "";
      this.textOff = 0;
      this.cursor = doc2.iter();
      this.skip = pos;
    }
    posCovered() {
      if (this.content.length == 0)
        return !this.breakAtStart && this.doc.lineAt(this.pos).from != this.pos;
      let last = this.content[this.content.length - 1];
      return !last.breakAfter && !(last instanceof BlockWidgetView && last.type == BlockType.WidgetBefore);
    }
    getLine() {
      if (!this.curLine)
        this.content.push(this.curLine = new LineView());
      return this.curLine;
    }
    addWidget(view) {
      this.curLine = null;
      this.content.push(view);
    }
    finish() {
      if (!this.posCovered())
        this.getLine();
    }
    wrapMarks(view, active) {
      for (let i = active.length - 1; i >= 0; i--)
        view = new MarkView(active[i], [view], view.length);
      return view;
    }
    buildText(length, active, openStart) {
      while (length > 0) {
        if (this.textOff == this.text.length) {
          let {value, lineBreak, done} = this.cursor.next(this.skip);
          this.skip = 0;
          if (done)
            throw new Error("Ran out of text content when drawing inline views");
          if (lineBreak) {
            if (!this.posCovered())
              this.getLine();
            if (this.content.length)
              this.content[this.content.length - 1].breakAfter = 1;
            else
              this.breakAtStart = 1;
            this.curLine = null;
            length--;
            continue;
          } else {
            this.text = value;
            this.textOff = 0;
          }
        }
        let take = Math.min(this.text.length - this.textOff, length, 512);
        this.getLine().append(this.wrapMarks(new TextView(this.text.slice(this.textOff, this.textOff + take)), active), openStart);
        this.textOff += take;
        length -= take;
        openStart = 0;
      }
    }
    span(from, to, active, openStart) {
      this.buildText(to - from, active, openStart);
      this.pos = to;
      if (this.openStart < 0)
        this.openStart = openStart;
    }
    point(from, to, deco, active, openStart) {
      let len = to - from;
      if (deco instanceof PointDecoration) {
        if (deco.block) {
          let {type} = deco;
          if (type == BlockType.WidgetAfter && !this.posCovered())
            this.getLine();
          this.addWidget(new BlockWidgetView(deco.widget || new NullWidget("div"), len, type));
        } else {
          let widget = this.wrapMarks(WidgetView.create(deco.widget || new NullWidget("span"), len, deco.startSide), active);
          this.getLine().append(widget, openStart);
        }
      } else if (this.doc.lineAt(this.pos).from == this.pos) {
        this.getLine().addLineDeco(deco);
      }
      if (len) {
        if (this.textOff + len <= this.text.length) {
          this.textOff += len;
        } else {
          this.skip += len - (this.text.length - this.textOff);
          this.text = "";
          this.textOff = 0;
        }
        this.pos = to;
      }
      if (this.openStart < 0)
        this.openStart = openStart;
    }
    static build(text, from, to, decorations2) {
      let builder = new ContentBuilder(text, from, to);
      builder.openEnd = RangeSet.spans(decorations2, from, to, builder);
      if (builder.openStart < 0)
        builder.openStart = builder.openEnd;
      builder.finish();
      return builder;
    }
  };
  var NullWidget = class extends WidgetType {
    constructor(tag) {
      super();
      this.tag = tag;
    }
    eq(other) {
      return other.tag == this.tag;
    }
    toDOM() {
      return document.createElement(this.tag);
    }
    updateDOM(elt) {
      return elt.nodeName.toLowerCase() == this.tag;
    }
  };
  var none2 = [];
  var clickAddsSelectionRange = /* @__PURE__ */ Facet.define();
  var dragMovesSelection$1 = /* @__PURE__ */ Facet.define();
  var mouseSelectionStyle = /* @__PURE__ */ Facet.define();
  var exceptionSink = /* @__PURE__ */ Facet.define();
  var updateListener = /* @__PURE__ */ Facet.define();
  var inputHandler = /* @__PURE__ */ Facet.define();
  function logException(state, exception, context) {
    let handler = state.facet(exceptionSink);
    if (handler.length)
      handler[0](exception);
    else if (window.onerror)
      window.onerror(String(exception), context, void 0, void 0, exception);
    else if (context)
      console.error(context + ":", exception);
    else
      console.error(exception);
  }
  var editable = /* @__PURE__ */ Facet.define({combine: (values) => values.length ? values[0] : true});
  var PluginFieldProvider = class {
    constructor(field, get) {
      this.field = field;
      this.get = get;
    }
  };
  var PluginField = class {
    from(get) {
      return new PluginFieldProvider(this, get);
    }
    static define() {
      return new PluginField();
    }
  };
  PluginField.decorations = /* @__PURE__ */ PluginField.define();
  PluginField.scrollMargins = /* @__PURE__ */ PluginField.define();
  var nextPluginID = 0;
  var viewPlugin = /* @__PURE__ */ Facet.define();
  var ViewPlugin = class {
    constructor(id, create, fields) {
      this.id = id;
      this.create = create;
      this.fields = fields;
      this.extension = viewPlugin.of(this);
    }
    static define(create, spec) {
      let {eventHandlers, provide, decorations: decorations2} = spec || {};
      let fields = [];
      if (provide)
        for (let provider of Array.isArray(provide) ? provide : [provide])
          fields.push(provider);
      if (eventHandlers)
        fields.push(domEventHandlers.from((value) => ({plugin: value, handlers: eventHandlers})));
      if (decorations2)
        fields.push(PluginField.decorations.from(decorations2));
      return new ViewPlugin(nextPluginID++, create, fields);
    }
    static fromClass(cls, spec) {
      return ViewPlugin.define((view) => new cls(view), spec);
    }
  };
  var domEventHandlers = /* @__PURE__ */ PluginField.define();
  var PluginInstance = class {
    constructor(spec) {
      this.spec = spec;
      this.mustUpdate = null;
      this.value = null;
    }
    takeField(type, target) {
      for (let {field, get} of this.spec.fields)
        if (field == type)
          target.push(get(this.value));
    }
    update(view) {
      if (!this.value) {
        try {
          this.value = this.spec.create(view);
        } catch (e) {
          logException(view.state, e, "CodeMirror plugin crashed");
          return PluginInstance.dummy;
        }
      } else if (this.mustUpdate) {
        let update = this.mustUpdate;
        this.mustUpdate = null;
        if (!this.value.update)
          return this;
        try {
          this.value.update(update);
        } catch (e) {
          logException(update.state, e, "CodeMirror plugin crashed");
          if (this.value.destroy)
            try {
              this.value.destroy();
            } catch (_) {
            }
          return PluginInstance.dummy;
        }
      }
      return this;
    }
    destroy(view) {
      var _a;
      if ((_a = this.value) === null || _a === void 0 ? void 0 : _a.destroy) {
        try {
          this.value.destroy();
        } catch (e) {
          logException(view.state, e, "CodeMirror plugin crashed");
        }
      }
    }
  };
  PluginInstance.dummy = /* @__PURE__ */ new PluginInstance(/* @__PURE__ */ ViewPlugin.define(() => ({})));
  var editorAttributes = /* @__PURE__ */ Facet.define({
    combine: (values) => values.reduce((a, b) => combineAttrs(b, a), {})
  });
  var contentAttributes = /* @__PURE__ */ Facet.define({
    combine: (values) => values.reduce((a, b) => combineAttrs(b, a), {})
  });
  var decorations = /* @__PURE__ */ Facet.define();
  var styleModule = /* @__PURE__ */ Facet.define();
  var ChangedRange = class {
    constructor(fromA, toA, fromB, toB) {
      this.fromA = fromA;
      this.toA = toA;
      this.fromB = fromB;
      this.toB = toB;
    }
    join(other) {
      return new ChangedRange(Math.min(this.fromA, other.fromA), Math.max(this.toA, other.toA), Math.min(this.fromB, other.fromB), Math.max(this.toB, other.toB));
    }
    addToSet(set) {
      let i = set.length, me = this;
      for (; i > 0; i--) {
        let range = set[i - 1];
        if (range.fromA > me.toA)
          continue;
        if (range.toA < me.fromA)
          break;
        me = me.join(range);
        set.splice(i - 1, 1);
      }
      set.splice(i, 0, me);
      return set;
    }
    static extendWithRanges(diff, ranges) {
      if (ranges.length == 0)
        return diff;
      let result = [];
      for (let dI = 0, rI = 0, posA = 0, posB = 0; ; dI++) {
        let next2 = dI == diff.length ? null : diff[dI], off = posA - posB;
        let end = next2 ? next2.fromB : 1e9;
        while (rI < ranges.length && ranges[rI] < end) {
          let from = ranges[rI], to = ranges[rI + 1];
          let fromB = Math.max(posB, from), toB = Math.min(end, to);
          if (fromB <= toB)
            new ChangedRange(fromB + off, toB + off, fromB, toB).addToSet(result);
          if (to > end)
            break;
          else
            rI += 2;
        }
        if (!next2)
          return result;
        new ChangedRange(next2.fromA, next2.toA, next2.fromB, next2.toB).addToSet(result);
        posA = next2.toA;
        posB = next2.toB;
      }
    }
  };
  var ViewUpdate = class {
    constructor(view, state, transactions = none2) {
      this.view = view;
      this.state = state;
      this.transactions = transactions;
      this.flags = 0;
      this.startState = view.state;
      this.changes = ChangeSet.empty(this.startState.doc.length);
      for (let tr of transactions)
        this.changes = this.changes.compose(tr.changes);
      let changedRanges = [];
      this.changes.iterChangedRanges((fromA, toA, fromB, toB) => changedRanges.push(new ChangedRange(fromA, toA, fromB, toB)));
      this.changedRanges = changedRanges;
      let focus = view.hasFocus;
      if (focus != view.inputState.notifiedFocused) {
        view.inputState.notifiedFocused = focus;
        this.flags |= 1;
      }
      if (this.docChanged)
        this.flags |= 2;
    }
    get viewportChanged() {
      return (this.flags & 4) > 0;
    }
    get heightChanged() {
      return (this.flags & 2) > 0;
    }
    get geometryChanged() {
      return this.docChanged || (this.flags & (16 | 2)) > 0;
    }
    get focusChanged() {
      return (this.flags & 1) > 0;
    }
    get docChanged() {
      return this.transactions.some((tr) => tr.docChanged);
    }
    get selectionSet() {
      return this.transactions.some((tr) => tr.selection);
    }
    get empty() {
      return this.flags == 0 && this.transactions.length == 0;
    }
  };
  var DocView = class extends ContentView {
    constructor(view) {
      super();
      this.view = view;
      this.compositionDeco = Decoration.none;
      this.decorations = [];
      this.minWidth = 0;
      this.minWidthFrom = 0;
      this.minWidthTo = 0;
      this.impreciseAnchor = null;
      this.impreciseHead = null;
      this.setDOM(view.contentDOM);
      this.children = [new LineView()];
      this.children[0].setParent(this);
      this.updateInner([new ChangedRange(0, 0, 0, view.state.doc.length)], this.updateDeco(), 0);
    }
    get root() {
      return this.view.root;
    }
    get editorView() {
      return this.view;
    }
    get length() {
      return this.view.state.doc.length;
    }
    update(update) {
      let changedRanges = update.changedRanges;
      if (this.minWidth > 0 && changedRanges.length) {
        if (!changedRanges.every(({fromA, toA}) => toA < this.minWidthFrom || fromA > this.minWidthTo)) {
          this.minWidth = 0;
        } else {
          this.minWidthFrom = update.changes.mapPos(this.minWidthFrom, 1);
          this.minWidthTo = update.changes.mapPos(this.minWidthTo, 1);
        }
      }
      if (this.view.inputState.composing < 0)
        this.compositionDeco = Decoration.none;
      else if (update.transactions.length)
        this.compositionDeco = computeCompositionDeco(this.view, update.changes);
      let forceSelection = (browser.ie || browser.chrome) && !this.compositionDeco.size && update && update.state.doc.lines != update.startState.doc.lines;
      let prevDeco = this.decorations, deco = this.updateDeco();
      let decoDiff = findChangedDeco(prevDeco, deco, update.changes);
      changedRanges = ChangedRange.extendWithRanges(changedRanges, decoDiff);
      let pointerSel = update.transactions.some((tr) => tr.annotation(Transaction.userEvent) == "pointerselection");
      if (this.dirty == 0 && changedRanges.length == 0 && !(update.flags & (4 | 8)) && update.state.selection.main.from >= this.view.viewport.from && update.state.selection.main.to <= this.view.viewport.to) {
        this.updateSelection(forceSelection, pointerSel);
        return false;
      } else {
        this.updateInner(changedRanges, deco, update.startState.doc.length, forceSelection, pointerSel);
        return true;
      }
    }
    updateInner(changes, deco, oldLength, forceSelection = false, pointerSel = false) {
      this.updateChildren(changes, deco, oldLength);
      this.view.observer.ignore(() => {
        this.dom.style.height = this.view.viewState.domHeight + "px";
        this.dom.style.minWidth = this.minWidth ? this.minWidth + "px" : "";
        let track = browser.chrome ? {node: getSelection(this.view.root).focusNode, written: false} : void 0;
        this.sync(track);
        this.dirty = 0;
        if (track === null || track === void 0 ? void 0 : track.written)
          forceSelection = true;
        this.updateSelection(forceSelection, pointerSel);
        this.dom.style.height = "";
      });
    }
    updateChildren(changes, deco, oldLength) {
      let cursor = this.childCursor(oldLength);
      for (let i = changes.length - 1; ; i--) {
        let next2 = i >= 0 ? changes[i] : null;
        if (!next2)
          break;
        let {fromA, toA, fromB, toB} = next2;
        let {content: content2, breakAtStart, openStart, openEnd} = ContentBuilder.build(this.view.state.doc, fromB, toB, deco);
        let {i: toI, off: toOff} = cursor.findPos(toA, 1);
        let {i: fromI, off: fromOff} = cursor.findPos(fromA, -1);
        this.replaceRange(fromI, fromOff, toI, toOff, content2, breakAtStart, openStart, openEnd);
      }
    }
    replaceRange(fromI, fromOff, toI, toOff, content2, breakAtStart, openStart, openEnd) {
      let before = this.children[fromI], last = content2.length ? content2[content2.length - 1] : null;
      let breakAtEnd = last ? last.breakAfter : breakAtStart;
      if (fromI == toI && !breakAtStart && !breakAtEnd && content2.length < 2 && before.merge(fromOff, toOff, content2.length ? last : null, fromOff == 0, openStart, openEnd))
        return;
      let after = this.children[toI];
      if (toOff < after.length || after.children.length && after.children[after.children.length - 1].length == 0) {
        if (fromI == toI) {
          after = after.split(toOff);
          toOff = 0;
        }
        if (!breakAtEnd && last && after.merge(0, toOff, last, true, 0, openEnd)) {
          content2[content2.length - 1] = after;
        } else {
          if (toOff || after.children.length && after.children[0].length == 0)
            after.merge(0, toOff, null, false, 0, openEnd);
          content2.push(after);
        }
      } else if (after.breakAfter) {
        if (last)
          last.breakAfter = 1;
        else
          breakAtStart = 1;
      }
      toI++;
      before.breakAfter = breakAtStart;
      if (fromOff > 0) {
        if (!breakAtStart && content2.length && before.merge(fromOff, before.length, content2[0], false, openStart, 0)) {
          before.breakAfter = content2.shift().breakAfter;
        } else if (fromOff < before.length || before.children.length && before.children[before.children.length - 1].length == 0) {
          before.merge(fromOff, before.length, null, false, openStart, 0);
        }
        fromI++;
      }
      while (fromI < toI && content2.length) {
        if (this.children[toI - 1].match(content2[content2.length - 1]))
          toI--, content2.pop();
        else if (this.children[fromI].match(content2[0]))
          fromI++, content2.shift();
        else
          break;
      }
      if (fromI < toI || content2.length)
        this.replaceChildren(fromI, toI, content2);
    }
    updateSelection(force = false, fromPointer = false) {
      if (!(fromPointer || this.mayControlSelection()))
        return;
      let main = this.view.state.selection.main;
      let anchor = this.domAtPos(main.anchor);
      let head = main.empty ? anchor : this.domAtPos(main.head);
      if (browser.gecko && main.empty && betweenUneditable(anchor)) {
        let dummy = document.createTextNode("");
        this.view.observer.ignore(() => anchor.node.insertBefore(dummy, anchor.node.childNodes[anchor.offset] || null));
        anchor = head = new DOMPos(dummy, 0);
        force = true;
      }
      let domSel = this.view.observer.selectionRange;
      if (force || !domSel.focusNode || browser.gecko && main.empty && nextToUneditable(domSel.focusNode, domSel.focusOffset) || !isEquivalentPosition(anchor.node, anchor.offset, domSel.anchorNode, domSel.anchorOffset) || !isEquivalentPosition(head.node, head.offset, domSel.focusNode, domSel.focusOffset)) {
        this.view.observer.ignore(() => {
          let rawSel = getSelection(this.root);
          if (main.empty) {
            if (browser.gecko) {
              let nextTo = nextToUneditable(anchor.node, anchor.offset);
              if (nextTo && nextTo != (1 | 2)) {
                let text = nearbyTextNode(anchor.node, anchor.offset, nextTo == 1 ? 1 : -1);
                if (text)
                  anchor = new DOMPos(text, nextTo == 1 ? 0 : text.nodeValue.length);
              }
            }
            rawSel.collapse(anchor.node, anchor.offset);
            if (main.bidiLevel != null && domSel.cursorBidiLevel != null)
              domSel.cursorBidiLevel = main.bidiLevel;
          } else if (rawSel.extend) {
            rawSel.collapse(anchor.node, anchor.offset);
            rawSel.extend(head.node, head.offset);
          } else {
            let range = document.createRange();
            if (main.anchor > main.head)
              [anchor, head] = [head, anchor];
            range.setEnd(head.node, head.offset);
            range.setStart(anchor.node, anchor.offset);
            rawSel.removeAllRanges();
            rawSel.addRange(range);
          }
        });
        this.view.observer.setSelectionRange(anchor, head);
      }
      this.impreciseAnchor = anchor.precise ? null : new DOMPos(domSel.anchorNode, domSel.anchorOffset);
      this.impreciseHead = head.precise ? null : new DOMPos(domSel.focusNode, domSel.focusOffset);
    }
    enforceCursorAssoc() {
      let cursor = this.view.state.selection.main;
      let sel = getSelection(this.root);
      if (!cursor.empty || !cursor.assoc || !sel.modify)
        return;
      let line = LineView.find(this, cursor.head);
      if (!line)
        return;
      let lineStart = line.posAtStart;
      if (cursor.head == lineStart || cursor.head == lineStart + line.length)
        return;
      let before = this.coordsAt(cursor.head, -1), after = this.coordsAt(cursor.head, 1);
      if (!before || !after || before.bottom > after.top)
        return;
      let dom = this.domAtPos(cursor.head + cursor.assoc);
      sel.collapse(dom.node, dom.offset);
      sel.modify("move", cursor.assoc < 0 ? "forward" : "backward", "lineboundary");
    }
    mayControlSelection() {
      return this.view.state.facet(editable) ? this.root.activeElement == this.dom : hasSelection(this.dom, this.view.observer.selectionRange);
    }
    nearest(dom) {
      for (let cur = dom; cur; ) {
        let domView = ContentView.get(cur);
        if (domView && domView.rootView == this)
          return domView;
        cur = cur.parentNode;
      }
      return null;
    }
    posFromDOM(node, offset) {
      let view = this.nearest(node);
      if (!view)
        throw new RangeError("Trying to find position for a DOM position outside of the document");
      return view.localPosFromDOM(node, offset) + view.posAtStart;
    }
    domAtPos(pos) {
      let {i, off} = this.childCursor().findPos(pos, -1);
      for (; i < this.children.length - 1; ) {
        let child = this.children[i];
        if (off < child.length || child instanceof LineView)
          break;
        i++;
        off = 0;
      }
      return this.children[i].domAtPos(off);
    }
    coordsAt(pos, side) {
      for (let off = this.length, i = this.children.length - 1; ; i--) {
        let child = this.children[i], start = off - child.breakAfter - child.length;
        if (pos > start || pos == start && (child.type == BlockType.Text || !i || this.children[i - 1].breakAfter))
          return child.coordsAt(pos - start, side);
        off = start;
      }
    }
    measureVisibleLineHeights() {
      let result = [], {from, to} = this.view.viewState.viewport;
      let minWidth = Math.max(this.view.scrollDOM.clientWidth, this.minWidth) + 1;
      for (let pos = 0, i = 0; i < this.children.length; i++) {
        let child = this.children[i], end = pos + child.length;
        if (end > to)
          break;
        if (pos >= from) {
          result.push(child.dom.getBoundingClientRect().height);
          let width = child.dom.scrollWidth;
          if (width > minWidth) {
            this.minWidth = minWidth = width;
            this.minWidthFrom = pos;
            this.minWidthTo = end;
          }
        }
        pos = end + child.breakAfter;
      }
      return result;
    }
    measureTextSize() {
      for (let child of this.children) {
        if (child instanceof LineView) {
          let measure = child.measureTextSize();
          if (measure)
            return measure;
        }
      }
      let dummy = document.createElement("div"), lineHeight, charWidth;
      dummy.className = "cm-line";
      dummy.textContent = "abc def ghi jkl mno pqr stu";
      this.view.observer.ignore(() => {
        this.dom.appendChild(dummy);
        let rect = clientRectsFor(dummy.firstChild)[0];
        lineHeight = dummy.getBoundingClientRect().height;
        charWidth = rect ? rect.width / 27 : 7;
        dummy.remove();
      });
      return {lineHeight, charWidth};
    }
    childCursor(pos = this.length) {
      let i = this.children.length;
      if (i)
        pos -= this.children[--i].length;
      return new ChildCursor(this.children, pos, i);
    }
    computeBlockGapDeco() {
      let deco = [], vs = this.view.viewState;
      for (let pos = 0, i = 0; ; i++) {
        let next2 = i == vs.viewports.length ? null : vs.viewports[i];
        let end = next2 ? next2.from - 1 : this.length;
        if (end > pos) {
          let height = vs.lineAt(end, 0).bottom - vs.lineAt(pos, 0).top;
          deco.push(Decoration.replace({widget: new BlockGapWidget(height), block: true, inclusive: true}).range(pos, end));
        }
        if (!next2)
          break;
        pos = next2.to + 1;
      }
      return Decoration.set(deco);
    }
    updateDeco() {
      return this.decorations = [
        this.computeBlockGapDeco(),
        this.view.viewState.lineGapDeco,
        this.compositionDeco,
        ...this.view.state.facet(decorations),
        ...this.view.pluginField(PluginField.decorations)
      ];
    }
    scrollPosIntoView(pos, side) {
      let rect = this.coordsAt(pos, side);
      if (!rect)
        return;
      let mLeft = 0, mRight = 0, mTop = 0, mBottom = 0;
      for (let margins of this.view.pluginField(PluginField.scrollMargins))
        if (margins) {
          let {left, right, top: top2, bottom} = margins;
          if (left != null)
            mLeft = Math.max(mLeft, left);
          if (right != null)
            mRight = Math.max(mRight, right);
          if (top2 != null)
            mTop = Math.max(mTop, top2);
          if (bottom != null)
            mBottom = Math.max(mBottom, bottom);
        }
      scrollRectIntoView(this.dom, {
        left: rect.left - mLeft,
        top: rect.top - mTop,
        right: rect.right + mRight,
        bottom: rect.bottom + mBottom
      });
    }
  };
  function betweenUneditable(pos) {
    return pos.node.nodeType == 1 && pos.node.firstChild && (pos.offset == 0 || pos.node.childNodes[pos.offset - 1].contentEditable == "false") && (pos.offset < pos.node.childNodes.length || pos.node.childNodes[pos.offset].contentEditable == "false");
  }
  var BlockGapWidget = class extends WidgetType {
    constructor(height) {
      super();
      this.height = height;
    }
    toDOM() {
      let elt = document.createElement("div");
      this.updateDOM(elt);
      return elt;
    }
    eq(other) {
      return other.height == this.height;
    }
    updateDOM(elt) {
      elt.style.height = this.height + "px";
      return true;
    }
    get estimatedHeight() {
      return this.height;
    }
  };
  function computeCompositionDeco(view, changes) {
    let sel = view.observer.selectionRange;
    let textNode = sel.focusNode && nearbyTextNode(sel.focusNode, sel.focusOffset, 0);
    if (!textNode)
      return Decoration.none;
    let cView = view.docView.nearest(textNode);
    let from, to, topNode = textNode;
    if (cView instanceof InlineView) {
      while (cView.parent instanceof InlineView)
        cView = cView.parent;
      from = cView.posAtStart;
      to = from + cView.length;
      topNode = cView.dom;
    } else if (cView instanceof LineView) {
      while (topNode.parentNode != cView.dom)
        topNode = topNode.parentNode;
      let prev = topNode.previousSibling;
      while (prev && !ContentView.get(prev))
        prev = prev.previousSibling;
      from = to = prev ? ContentView.get(prev).posAtEnd : cView.posAtStart;
    } else {
      return Decoration.none;
    }
    let newFrom = changes.mapPos(from, 1), newTo = Math.max(newFrom, changes.mapPos(to, -1));
    let text = textNode.nodeValue, {state} = view;
    if (newTo - newFrom < text.length) {
      if (state.sliceDoc(newFrom, Math.min(state.doc.length, newFrom + text.length)) == text)
        newTo = newFrom + text.length;
      else if (state.sliceDoc(Math.max(0, newTo - text.length), newTo) == text)
        newFrom = newTo - text.length;
      else
        return Decoration.none;
    } else if (state.sliceDoc(newFrom, newTo) != text) {
      return Decoration.none;
    }
    return Decoration.set(Decoration.replace({widget: new CompositionWidget(topNode, textNode)}).range(newFrom, newTo));
  }
  var CompositionWidget = class extends WidgetType {
    constructor(top2, text) {
      super();
      this.top = top2;
      this.text = text;
    }
    eq(other) {
      return this.top == other.top && this.text == other.text;
    }
    toDOM() {
      return this.top;
    }
    ignoreEvent() {
      return false;
    }
    get customView() {
      return CompositionView;
    }
  };
  function nearbyTextNode(node, offset, side) {
    for (; ; ) {
      if (node.nodeType == 3)
        return node;
      if (node.nodeType == 1 && offset > 0 && side <= 0) {
        node = node.childNodes[offset - 1];
        offset = maxOffset(node);
      } else if (node.nodeType == 1 && offset < node.childNodes.length && side >= 0) {
        node = node.childNodes[offset];
        offset = 0;
      } else {
        return null;
      }
    }
  }
  function nextToUneditable(node, offset) {
    if (node.nodeType != 1)
      return 0;
    return (offset && node.childNodes[offset - 1].contentEditable == "false" ? 1 : 0) | (offset < node.childNodes.length && node.childNodes[offset].contentEditable == "false" ? 2 : 0);
  }
  var DecorationComparator$1 = class {
    constructor() {
      this.changes = [];
    }
    compareRange(from, to) {
      addRange(from, to, this.changes);
    }
    comparePoint(from, to) {
      addRange(from, to, this.changes);
    }
  };
  function findChangedDeco(a, b, diff) {
    let comp = new DecorationComparator$1();
    RangeSet.compare(a, b, diff, comp);
    return comp.changes;
  }
  var Direction = /* @__PURE__ */ function(Direction2) {
    Direction2[Direction2["LTR"] = 0] = "LTR";
    Direction2[Direction2["RTL"] = 1] = "RTL";
    return Direction2;
  }(Direction || (Direction = {}));
  var LTR = Direction.LTR;
  var RTL = Direction.RTL;
  function dec(str) {
    let result = [];
    for (let i = 0; i < str.length; i++)
      result.push(1 << +str[i]);
    return result;
  }
  var LowTypes = /* @__PURE__ */ dec("88888888888888888888888888888888888666888888787833333333337888888000000000000000000000000008888880000000000000000000000000088888888888888888888888888888888888887866668888088888663380888308888800000000000000000000000800000000000000000000000000000008");
  var ArabicTypes = /* @__PURE__ */ dec("4444448826627288999999999992222222222222222222222222222222222222222222222229999999999999999999994444444444644222822222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222999999949999999229989999223333333333");
  var Brackets = /* @__PURE__ */ Object.create(null);
  var BracketStack = [];
  for (let p of ["()", "[]", "{}"]) {
    let l = /* @__PURE__ */ p.charCodeAt(0), r = /* @__PURE__ */ p.charCodeAt(1);
    Brackets[l] = r;
    Brackets[r] = -l;
  }
  function charType(ch) {
    return ch <= 247 ? LowTypes[ch] : 1424 <= ch && ch <= 1524 ? 2 : 1536 <= ch && ch <= 1785 ? ArabicTypes[ch - 1536] : 1774 <= ch && ch <= 2220 ? 4 : 8192 <= ch && ch <= 8203 ? 256 : ch == 8204 ? 256 : 1;
  }
  var BidiRE = /[\u0590-\u05f4\u0600-\u06ff\u0700-\u08ac]/;
  var BidiSpan = class {
    constructor(from, to, level) {
      this.from = from;
      this.to = to;
      this.level = level;
    }
    get dir() {
      return this.level % 2 ? RTL : LTR;
    }
    side(end, dir) {
      return this.dir == dir == end ? this.to : this.from;
    }
    static find(order, index, level, assoc) {
      let maybe = -1;
      for (let i = 0; i < order.length; i++) {
        let span = order[i];
        if (span.from <= index && span.to >= index) {
          if (span.level == level)
            return i;
          if (maybe < 0 || (assoc != 0 ? assoc < 0 ? span.from < index : span.to > index : order[maybe].level > span.level))
            maybe = i;
        }
      }
      if (maybe < 0)
        throw new RangeError("Index out of range");
      return maybe;
    }
  };
  var types = [];
  function computeOrder(line, direction) {
    let len = line.length, outerType = direction == LTR ? 1 : 2, oppositeType = direction == LTR ? 2 : 1;
    if (!line || outerType == 1 && !BidiRE.test(line))
      return trivialOrder(len);
    for (let i = 0, prev = outerType, prevStrong = outerType; i < len; i++) {
      let type = charType(line.charCodeAt(i));
      if (type == 512)
        type = prev;
      else if (type == 8 && prevStrong == 4)
        type = 16;
      types[i] = type == 4 ? 2 : type;
      if (type & 7)
        prevStrong = type;
      prev = type;
    }
    for (let i = 0, prev = outerType, prevStrong = outerType; i < len; i++) {
      let type = types[i];
      if (type == 128) {
        if (i < len - 1 && prev == types[i + 1] && prev & 24)
          type = types[i] = prev;
        else
          types[i] = 256;
      } else if (type == 64) {
        let end = i + 1;
        while (end < len && types[end] == 64)
          end++;
        let replace = i && prev == 8 || end < len && types[end] == 8 ? prevStrong == 1 ? 1 : 8 : 256;
        for (let j = i; j < end; j++)
          types[j] = replace;
        i = end - 1;
      } else if (type == 8 && prevStrong == 1) {
        types[i] = 1;
      }
      prev = type;
      if (type & 7)
        prevStrong = type;
    }
    for (let i = 0, sI = 0, context = 0, ch, br, type; i < len; i++) {
      if (br = Brackets[ch = line.charCodeAt(i)]) {
        if (br < 0) {
          for (let sJ = sI - 3; sJ >= 0; sJ -= 3) {
            if (BracketStack[sJ + 1] == -br) {
              let flags = BracketStack[sJ + 2];
              let type2 = flags & 2 ? outerType : !(flags & 4) ? 0 : flags & 1 ? oppositeType : outerType;
              if (type2)
                types[i] = types[BracketStack[sJ]] = type2;
              sI = sJ;
              break;
            }
          }
        } else if (BracketStack.length == 189) {
          break;
        } else {
          BracketStack[sI++] = i;
          BracketStack[sI++] = ch;
          BracketStack[sI++] = context;
        }
      } else if ((type = types[i]) == 2 || type == 1) {
        let embed = type == outerType;
        context = embed ? 0 : 1;
        for (let sJ = sI - 3; sJ >= 0; sJ -= 3) {
          let cur = BracketStack[sJ + 2];
          if (cur & 2)
            break;
          if (embed) {
            BracketStack[sJ + 2] |= 2;
          } else {
            if (cur & 4)
              break;
            BracketStack[sJ + 2] |= 4;
          }
        }
      }
    }
    for (let i = 0; i < len; i++) {
      if (types[i] == 256) {
        let end = i + 1;
        while (end < len && types[end] == 256)
          end++;
        let beforeL = (i ? types[i - 1] : outerType) == 1;
        let afterL = (end < len ? types[end] : outerType) == 1;
        let replace = beforeL == afterL ? beforeL ? 1 : 2 : outerType;
        for (let j = i; j < end; j++)
          types[j] = replace;
        i = end - 1;
      }
    }
    let order = [];
    if (outerType == 1) {
      for (let i = 0; i < len; ) {
        let start = i, rtl = types[i++] != 1;
        while (i < len && rtl == (types[i] != 1))
          i++;
        if (rtl) {
          for (let j = i; j > start; ) {
            let end = j, l = types[--j] != 2;
            while (j > start && l == (types[j - 1] != 2))
              j--;
            order.push(new BidiSpan(j, end, l ? 2 : 1));
          }
        } else {
          order.push(new BidiSpan(start, i, 0));
        }
      }
    } else {
      for (let i = 0; i < len; ) {
        let start = i, rtl = types[i++] == 2;
        while (i < len && rtl == (types[i] == 2))
          i++;
        order.push(new BidiSpan(start, i, rtl ? 1 : 2));
      }
    }
    return order;
  }
  function trivialOrder(length) {
    return [new BidiSpan(0, length, 0)];
  }
  var movedOver = "";
  function moveVisually(line, order, dir, start, forward) {
    var _a;
    let startIndex = start.head - line.from, spanI = -1;
    if (startIndex == 0) {
      if (!forward || !line.length)
        return null;
      if (order[0].level != dir) {
        startIndex = order[0].side(false, dir);
        spanI = 0;
      }
    } else if (startIndex == line.length) {
      if (forward)
        return null;
      let last = order[order.length - 1];
      if (last.level != dir) {
        startIndex = last.side(true, dir);
        spanI = order.length - 1;
      }
    }
    if (spanI < 0)
      spanI = BidiSpan.find(order, startIndex, (_a = start.bidiLevel) !== null && _a !== void 0 ? _a : -1, start.assoc);
    let span = order[spanI];
    if (startIndex == span.side(forward, dir)) {
      span = order[spanI += forward ? 1 : -1];
      startIndex = span.side(!forward, dir);
    }
    let indexForward = forward == (span.dir == dir);
    let nextIndex = findClusterBreak(line.text, startIndex, indexForward);
    movedOver = line.text.slice(Math.min(startIndex, nextIndex), Math.max(startIndex, nextIndex));
    if (nextIndex != span.side(forward, dir))
      return EditorSelection.cursor(nextIndex + line.from, indexForward ? -1 : 1, span.level);
    let nextSpan = spanI == (forward ? order.length - 1 : 0) ? null : order[spanI + (forward ? 1 : -1)];
    if (!nextSpan && span.level != dir)
      return EditorSelection.cursor(forward ? line.to : line.from, forward ? -1 : 1, dir);
    if (nextSpan && nextSpan.level < span.level)
      return EditorSelection.cursor(nextSpan.side(!forward, dir) + line.from, forward ? 1 : -1, nextSpan.level);
    return EditorSelection.cursor(nextIndex + line.from, forward ? -1 : 1, span.level);
  }
  function groupAt(state, pos, bias = 1) {
    let categorize = state.charCategorizer(pos);
    let line = state.doc.lineAt(pos), linePos = pos - line.from;
    if (line.length == 0)
      return EditorSelection.cursor(pos);
    if (linePos == 0)
      bias = 1;
    else if (linePos == line.length)
      bias = -1;
    let from = linePos, to = linePos;
    if (bias < 0)
      from = findClusterBreak(line.text, linePos, false);
    else
      to = findClusterBreak(line.text, linePos);
    let cat = categorize(line.text.slice(from, to));
    while (from > 0) {
      let prev = findClusterBreak(line.text, from, false);
      if (categorize(line.text.slice(prev, from)) != cat)
        break;
      from = prev;
    }
    while (to < line.length) {
      let next2 = findClusterBreak(line.text, to);
      if (categorize(line.text.slice(to, next2)) != cat)
        break;
      to = next2;
    }
    return EditorSelection.range(from + line.from, to + line.from);
  }
  function getdx(x, rect) {
    return rect.left > x ? rect.left - x : Math.max(0, x - rect.right);
  }
  function getdy(y, rect) {
    return rect.top > y ? rect.top - y : Math.max(0, y - rect.bottom);
  }
  function yOverlap(a, b) {
    return a.top < b.bottom - 1 && a.bottom > b.top + 1;
  }
  function upTop(rect, top2) {
    return top2 < rect.top ? {top: top2, left: rect.left, right: rect.right, bottom: rect.bottom} : rect;
  }
  function upBot(rect, bottom) {
    return bottom > rect.bottom ? {top: rect.top, left: rect.left, right: rect.right, bottom} : rect;
  }
  function domPosAtCoords(parent, x, y) {
    let closest, closestRect, closestX, closestY;
    let above, below, aboveRect, belowRect;
    for (let child = parent.firstChild; child; child = child.nextSibling) {
      let rects = clientRectsFor(child);
      for (let i = 0; i < rects.length; i++) {
        let rect = rects[i];
        if (closestRect && yOverlap(closestRect, rect))
          rect = upTop(upBot(rect, closestRect.bottom), closestRect.top);
        let dx = getdx(x, rect), dy = getdy(y, rect);
        if (dx == 0 && dy == 0)
          return child.nodeType == 3 ? domPosInText(child, x, y) : domPosAtCoords(child, x, y);
        if (!closest || closestY > dy || closestY == dy && closestX > dx) {
          closest = child;
          closestRect = rect;
          closestX = dx;
          closestY = dy;
        }
        if (dx == 0) {
          if (y > rect.bottom && (!aboveRect || aboveRect.bottom < rect.bottom)) {
            above = child;
            aboveRect = rect;
          } else if (y < rect.top && (!belowRect || belowRect.top > rect.top)) {
            below = child;
            belowRect = rect;
          }
        } else if (aboveRect && yOverlap(aboveRect, rect)) {
          aboveRect = upBot(aboveRect, rect.bottom);
        } else if (belowRect && yOverlap(belowRect, rect)) {
          belowRect = upTop(belowRect, rect.top);
        }
      }
    }
    if (aboveRect && aboveRect.bottom >= y) {
      closest = above;
      closestRect = aboveRect;
    } else if (belowRect && belowRect.top <= y) {
      closest = below;
      closestRect = belowRect;
    }
    if (!closest)
      return {node: parent, offset: 0};
    let clipX = Math.max(closestRect.left, Math.min(closestRect.right, x));
    if (closest.nodeType == 3)
      return domPosInText(closest, clipX, y);
    if (!closestX && closest.contentEditable == "true")
      return domPosAtCoords(closest, clipX, y);
    let offset = Array.prototype.indexOf.call(parent.childNodes, closest) + (x >= (closestRect.left + closestRect.right) / 2 ? 1 : 0);
    return {node: parent, offset};
  }
  function domPosInText(node, x, y) {
    let len = node.nodeValue.length;
    let closestOffset = -1, closestDY = 1e9, generalSide = 0;
    for (let i = 0; i < len; i++) {
      let rects = textRange(node, i, i + 1).getClientRects();
      for (let j = 0; j < rects.length; j++) {
        let rect = rects[j];
        if (rect.top == rect.bottom)
          continue;
        if (!generalSide)
          generalSide = x - rect.left;
        let dy = (rect.top > y ? rect.top - y : y - rect.bottom) - 1;
        if (rect.left - 1 <= x && rect.right + 1 >= x && dy < closestDY) {
          let right = x >= (rect.left + rect.right) / 2, after = right;
          if (browser.chrome || browser.gecko) {
            let rectBefore = textRange(node, i).getBoundingClientRect();
            if (rectBefore.left == rect.right)
              after = !right;
          }
          if (dy <= 0)
            return {node, offset: i + (after ? 1 : 0)};
          closestOffset = i + (after ? 1 : 0);
          closestDY = dy;
        }
      }
    }
    return {node, offset: closestOffset > -1 ? closestOffset : generalSide > 0 ? node.nodeValue.length : 0};
  }
  function posAtCoords(view, {x, y}, bias = -1) {
    let content2 = view.contentDOM.getBoundingClientRect(), block;
    let halfLine = view.defaultLineHeight / 2;
    for (let bounced = false; ; ) {
      block = view.blockAtHeight(y, content2.top);
      if (block.top > y || block.bottom < y) {
        bias = block.top > y ? -1 : 1;
        y = Math.min(block.bottom - halfLine, Math.max(block.top + halfLine, y));
        if (bounced)
          return -1;
        else
          bounced = true;
      }
      if (block.type == BlockType.Text)
        break;
      y = bias > 0 ? block.bottom + halfLine : block.top - halfLine;
    }
    let lineStart = block.from;
    if (lineStart < view.viewport.from)
      return view.viewport.from == 0 ? 0 : null;
    if (lineStart > view.viewport.to)
      return view.viewport.to == view.state.doc.length ? view.state.doc.length : null;
    x = Math.max(content2.left + 1, Math.min(content2.right - 1, x));
    let root = view.root, element = root.elementFromPoint(x, y);
    let node, offset = -1;
    if (element && view.contentDOM.contains(element) && !(view.docView.nearest(element) instanceof WidgetView)) {
      if (root.caretPositionFromPoint) {
        let pos = root.caretPositionFromPoint(x, y);
        if (pos)
          ({offsetNode: node, offset} = pos);
      } else if (root.caretRangeFromPoint) {
        let range = root.caretRangeFromPoint(x, y);
        if (range) {
          ({startContainer: node, startOffset: offset} = range);
          if (browser.safari && isSuspiciousCaretResult(node, offset, x))
            node = void 0;
        }
      }
    }
    if (!node || !view.docView.dom.contains(node)) {
      let line = LineView.find(view.docView, lineStart);
      ({node, offset} = domPosAtCoords(line.dom, x, y));
    }
    return view.docView.posFromDOM(node, offset);
  }
  function isSuspiciousCaretResult(node, offset, x) {
    let len;
    if (node.nodeType != 3 || offset != (len = node.nodeValue.length))
      return false;
    for (let next2 = node.nextSibling; next2; next2 = node.nextSibling)
      if (next2.nodeType != 1 || next2.nodeName != "BR")
        return false;
    return textRange(node, len - 1, len).getBoundingClientRect().left > x;
  }
  function moveToLineBoundary(view, start, forward, includeWrap) {
    let line = view.state.doc.lineAt(start.head);
    let coords = !includeWrap || !view.lineWrapping ? null : view.coordsAtPos(start.assoc < 0 && start.head > line.from ? start.head - 1 : start.head);
    if (coords) {
      let editorRect = view.dom.getBoundingClientRect();
      let pos = view.posAtCoords({
        x: forward == (view.textDirection == Direction.LTR) ? editorRect.right - 1 : editorRect.left + 1,
        y: (coords.top + coords.bottom) / 2
      });
      if (pos != null)
        return EditorSelection.cursor(pos, forward ? -1 : 1);
    }
    let lineView = LineView.find(view.docView, start.head);
    let end = lineView ? forward ? lineView.posAtEnd : lineView.posAtStart : forward ? line.to : line.from;
    return EditorSelection.cursor(end, forward ? -1 : 1);
  }
  function moveByChar(view, start, forward, by) {
    let line = view.state.doc.lineAt(start.head), spans = view.bidiSpans(line);
    for (let cur = start, check = null; ; ) {
      let next2 = moveVisually(line, spans, view.textDirection, cur, forward), char = movedOver;
      if (!next2) {
        if (line.number == (forward ? view.state.doc.lines : 1))
          return cur;
        char = "\n";
        line = view.state.doc.line(line.number + (forward ? 1 : -1));
        spans = view.bidiSpans(line);
        next2 = EditorSelection.cursor(forward ? line.from : line.to);
      }
      if (!check) {
        if (!by)
          return next2;
        check = by(char);
      } else if (!check(char)) {
        return cur;
      }
      cur = next2;
    }
  }
  function byGroup(view, pos, start) {
    let categorize = view.state.charCategorizer(pos);
    let cat = categorize(start);
    return (next2) => {
      let nextCat = categorize(next2);
      if (cat == CharCategory.Space)
        cat = nextCat;
      return cat == nextCat;
    };
  }
  function moveVertically(view, start, forward, distance) {
    var _a;
    let startPos = start.head, dir = forward ? 1 : -1;
    if (startPos == (forward ? view.state.doc.length : 0))
      return EditorSelection.cursor(startPos);
    let startCoords = view.coordsAtPos(startPos);
    if (startCoords) {
      let rect = view.dom.getBoundingClientRect();
      let goal2 = (_a = start.goalColumn) !== null && _a !== void 0 ? _a : startCoords.left - rect.left;
      let resolvedGoal = rect.left + goal2;
      let dist = distance !== null && distance !== void 0 ? distance : view.defaultLineHeight >> 1;
      for (let startY = dir < 0 ? startCoords.top : startCoords.bottom, extra = 0; extra < 50; extra += 10) {
        let pos = posAtCoords(view, {x: resolvedGoal, y: startY + (dist + extra) * dir}, dir);
        if (pos == null)
          break;
        if (pos != startPos)
          return EditorSelection.cursor(pos, void 0, void 0, goal2);
      }
    }
    let {doc: doc2} = view.state, line = doc2.lineAt(startPos), tabSize = view.state.tabSize;
    let goal = start.goalColumn, goalCol = 0;
    if (goal == null) {
      for (const iter = doc2.iterRange(line.from, startPos); !iter.next().done; )
        goalCol = countColumn(iter.value, goalCol, tabSize);
      goal = goalCol * view.defaultCharacterWidth;
    } else {
      goalCol = Math.round(goal / view.defaultCharacterWidth);
    }
    if (dir < 0 && line.from == 0)
      return EditorSelection.cursor(0);
    else if (dir > 0 && line.to == doc2.length)
      return EditorSelection.cursor(line.to);
    let otherLine = doc2.line(line.number + dir);
    let result = otherLine.from;
    let seen = 0;
    for (const iter = doc2.iterRange(otherLine.from, otherLine.to); seen >= goalCol && !iter.next().done; ) {
      const {offset, leftOver} = findColumn(iter.value, seen, goalCol, tabSize);
      seen = goalCol - leftOver;
      result += offset;
    }
    return EditorSelection.cursor(result, void 0, void 0, goal);
  }
  var InputState = class {
    constructor(view) {
      this.lastKeyCode = 0;
      this.lastKeyTime = 0;
      this.lastIOSEnter = 0;
      this.lastIOSBackspace = 0;
      this.lastSelectionOrigin = null;
      this.lastSelectionTime = 0;
      this.lastEscPress = 0;
      this.lastContextMenu = 0;
      this.scrollHandlers = [];
      this.registeredEvents = [];
      this.customHandlers = [];
      this.composing = -1;
      this.compositionEndedAt = 0;
      this.mouseSelection = null;
      for (let type in handlers) {
        let handler = handlers[type];
        view.contentDOM.addEventListener(type, (event) => {
          if (type == "keydown" && this.keydown(view, event))
            return;
          if (!eventBelongsToEditor(view, event) || this.ignoreDuringComposition(event))
            return;
          if (this.mustFlushObserver(event))
            view.observer.forceFlush();
          if (this.runCustomHandlers(type, view, event))
            event.preventDefault();
          else
            handler(view, event);
        });
        this.registeredEvents.push(type);
      }
      this.notifiedFocused = view.hasFocus;
      this.ensureHandlers(view);
    }
    setSelectionOrigin(origin) {
      this.lastSelectionOrigin = origin;
      this.lastSelectionTime = Date.now();
    }
    ensureHandlers(view) {
      let handlers2 = this.customHandlers = view.pluginField(domEventHandlers);
      for (let set of handlers2) {
        for (let type in set.handlers)
          if (this.registeredEvents.indexOf(type) < 0 && type != "scroll") {
            this.registeredEvents.push(type);
            view.contentDOM.addEventListener(type, (event) => {
              if (!eventBelongsToEditor(view, event))
                return;
              if (this.runCustomHandlers(type, view, event))
                event.preventDefault();
            });
          }
      }
    }
    runCustomHandlers(type, view, event) {
      for (let set of this.customHandlers) {
        let handler = set.handlers[type], handled = false;
        if (handler) {
          try {
            handled = handler.call(set.plugin, event, view);
          } catch (e) {
            logException(view.state, e);
          }
          if (handled || event.defaultPrevented) {
            if (browser.android && type == "keydown" && event.keyCode == 13)
              view.observer.flushSoon();
            return true;
          }
        }
      }
      return false;
    }
    runScrollHandlers(view, event) {
      for (let set of this.customHandlers) {
        let handler = set.handlers.scroll;
        if (handler) {
          try {
            handler.call(set.plugin, event, view);
          } catch (e) {
            logException(view.state, e);
          }
        }
      }
    }
    keydown(view, event) {
      this.lastKeyCode = event.keyCode;
      this.lastKeyTime = Date.now();
      if (this.screenKeyEvent(view, event))
        return;
      if (browser.ios && (event.keyCode == 13 || event.keyCode == 8) && !(event.ctrlKey || event.altKey || event.metaKey) && !event.synthetic) {
        this[event.keyCode == 13 ? "lastIOSEnter" : "lastIOSBackspace"] = Date.now();
        return true;
      }
      return false;
    }
    ignoreDuringComposition(event) {
      if (!/^key/.test(event.type))
        return false;
      if (this.composing > 0)
        return true;
      if (browser.safari && Date.now() - this.compositionEndedAt < 500) {
        this.compositionEndedAt = 0;
        return true;
      }
      return false;
    }
    screenKeyEvent(view, event) {
      let protectedTab = event.keyCode == 9 && Date.now() < this.lastEscPress + 2e3;
      if (event.keyCode == 27)
        this.lastEscPress = Date.now();
      else if (modifierCodes.indexOf(event.keyCode) < 0)
        this.lastEscPress = 0;
      return protectedTab;
    }
    mustFlushObserver(event) {
      return event.type == "keydown" && event.keyCode != 229 || event.type == "compositionend" && !browser.ios;
    }
    startMouseSelection(view, event, style) {
      if (this.mouseSelection)
        this.mouseSelection.destroy();
      this.mouseSelection = new MouseSelection(this, view, event, style);
    }
    update(update) {
      if (this.mouseSelection)
        this.mouseSelection.update(update);
      this.lastKeyCode = this.lastSelectionTime = 0;
    }
    destroy() {
      if (this.mouseSelection)
        this.mouseSelection.destroy();
    }
  };
  var modifierCodes = [16, 17, 18, 20, 91, 92, 224, 225];
  var MouseSelection = class {
    constructor(inputState, view, startEvent, style) {
      this.inputState = inputState;
      this.view = view;
      this.startEvent = startEvent;
      this.style = style;
      let doc2 = view.contentDOM.ownerDocument;
      doc2.addEventListener("mousemove", this.move = this.move.bind(this));
      doc2.addEventListener("mouseup", this.up = this.up.bind(this));
      this.extend = startEvent.shiftKey;
      this.multiple = view.state.facet(EditorState.allowMultipleSelections) && addsSelectionRange(view, startEvent);
      this.dragMove = dragMovesSelection(view, startEvent);
      this.dragging = isInPrimarySelection(view, startEvent) ? null : false;
      if (this.dragging === false) {
        startEvent.preventDefault();
        this.select(startEvent);
      }
    }
    move(event) {
      if (event.buttons == 0)
        return this.destroy();
      if (this.dragging !== false)
        return;
      this.select(event);
    }
    up(event) {
      if (this.dragging == null)
        this.select(this.startEvent);
      if (!this.dragging)
        event.preventDefault();
      this.destroy();
    }
    destroy() {
      let doc2 = this.view.contentDOM.ownerDocument;
      doc2.removeEventListener("mousemove", this.move);
      doc2.removeEventListener("mouseup", this.up);
      this.inputState.mouseSelection = null;
    }
    select(event) {
      let selection = this.style.get(event, this.extend, this.multiple);
      if (!selection.eq(this.view.state.selection) || selection.main.assoc != this.view.state.selection.main.assoc)
        this.view.dispatch({
          selection,
          annotations: Transaction.userEvent.of("pointerselection"),
          scrollIntoView: true
        });
    }
    update(update) {
      if (update.docChanged && this.dragging)
        this.dragging = this.dragging.map(update.changes);
      this.style.update(update);
    }
  };
  function addsSelectionRange(view, event) {
    let facet = view.state.facet(clickAddsSelectionRange);
    return facet.length ? facet[0](event) : browser.mac ? event.metaKey : event.ctrlKey;
  }
  function dragMovesSelection(view, event) {
    let facet = view.state.facet(dragMovesSelection$1);
    return facet.length ? facet[0](event) : browser.mac ? !event.altKey : !event.ctrlKey;
  }
  function isInPrimarySelection(view, event) {
    let {main} = view.state.selection;
    if (main.empty)
      return false;
    let sel = getSelection(view.root);
    if (sel.rangeCount == 0)
      return true;
    let rects = sel.getRangeAt(0).getClientRects();
    for (let i = 0; i < rects.length; i++) {
      let rect = rects[i];
      if (rect.left <= event.clientX && rect.right >= event.clientX && rect.top <= event.clientY && rect.bottom >= event.clientY)
        return true;
    }
    return false;
  }
  function eventBelongsToEditor(view, event) {
    if (!event.bubbles)
      return true;
    if (event.defaultPrevented)
      return false;
    for (let node = event.target, cView; node != view.contentDOM; node = node.parentNode)
      if (!node || node.nodeType == 11 || (cView = ContentView.get(node)) && cView.ignoreEvent(event))
        return false;
    return true;
  }
  var handlers = /* @__PURE__ */ Object.create(null);
  var brokenClipboardAPI = browser.ie && browser.ie_version < 15 || browser.ios && browser.webkit_version < 604;
  function capturePaste(view) {
    let parent = view.dom.parentNode;
    if (!parent)
      return;
    let target = parent.appendChild(document.createElement("textarea"));
    target.style.cssText = "position: fixed; left: -10000px; top: 10px";
    target.focus();
    setTimeout(() => {
      view.focus();
      target.remove();
      doPaste(view, target.value);
    }, 50);
  }
  function doPaste(view, input) {
    let {state} = view, changes, i = 1, text = state.toText(input);
    let byLine = text.lines == state.selection.ranges.length;
    let linewise = lastLinewiseCopy && state.selection.ranges.every((r) => r.empty) && lastLinewiseCopy == text.toString();
    if (linewise) {
      let lastLine = -1;
      changes = state.changeByRange((range) => {
        let line = state.doc.lineAt(range.from);
        if (line.from == lastLine)
          return {range};
        lastLine = line.from;
        let insert2 = state.toText((byLine ? text.line(i++).text : input) + state.lineBreak);
        return {
          changes: {from: line.from, insert: insert2},
          range: EditorSelection.cursor(range.from + insert2.length)
        };
      });
    } else if (byLine) {
      changes = state.changeByRange((range) => {
        let line = text.line(i++);
        return {
          changes: {from: range.from, to: range.to, insert: line.text},
          range: EditorSelection.cursor(range.from + line.length)
        };
      });
    } else {
      changes = state.replaceSelection(text);
    }
    view.dispatch(changes, {
      annotations: Transaction.userEvent.of("paste"),
      scrollIntoView: true
    });
  }
  handlers.keydown = (view, event) => {
    view.inputState.setSelectionOrigin("keyboardselection");
  };
  var lastTouch = 0;
  handlers.touchstart = (view, e) => {
    lastTouch = Date.now();
    view.inputState.setSelectionOrigin("pointerselection");
  };
  handlers.touchmove = (view) => {
    view.inputState.setSelectionOrigin("pointerselection");
  };
  handlers.mousedown = (view, event) => {
    view.observer.flush();
    if (lastTouch > Date.now() - 2e3)
      return;
    let style = null;
    for (let makeStyle of view.state.facet(mouseSelectionStyle)) {
      style = makeStyle(view, event);
      if (style)
        break;
    }
    if (!style && event.button == 0)
      style = basicMouseSelection(view, event);
    if (style) {
      if (view.root.activeElement != view.contentDOM)
        view.observer.ignore(() => focusPreventScroll(view.contentDOM));
      view.inputState.startMouseSelection(view, event, style);
    }
  };
  function rangeForClick(view, pos, bias, type) {
    if (type == 1) {
      return EditorSelection.cursor(pos, bias);
    } else if (type == 2) {
      return groupAt(view.state, pos, bias);
    } else {
      let visual = LineView.find(view.docView, pos), line = view.state.doc.lineAt(visual ? visual.posAtEnd : pos);
      let from = visual ? visual.posAtStart : line.from, to = visual ? visual.posAtEnd : line.to;
      if (to < view.state.doc.length && to == line.to)
        to++;
      return EditorSelection.range(from, to);
    }
  }
  var insideY = (y, rect) => y >= rect.top && y <= rect.bottom;
  var inside = (x, y, rect) => insideY(y, rect) && x >= rect.left && x <= rect.right;
  function findPositionSide(view, pos, x, y) {
    let line = LineView.find(view.docView, pos);
    if (!line)
      return 1;
    let off = pos - line.posAtStart;
    if (off == 0)
      return 1;
    if (off == line.length)
      return -1;
    let before = line.coordsAt(off, -1);
    if (before && inside(x, y, before))
      return -1;
    let after = line.coordsAt(off, 1);
    if (after && inside(x, y, after))
      return 1;
    return before && insideY(y, before) ? -1 : 1;
  }
  function queryPos(view, event) {
    let pos = view.posAtCoords({x: event.clientX, y: event.clientY});
    if (pos == null)
      return null;
    return {pos, bias: findPositionSide(view, pos, event.clientX, event.clientY)};
  }
  var BadMouseDetail = browser.ie && browser.ie_version <= 11;
  var lastMouseDown = null;
  var lastMouseDownCount = 0;
  var lastMouseDownTime = 0;
  function getClickType(event) {
    if (!BadMouseDetail)
      return event.detail;
    let last = lastMouseDown, lastTime = lastMouseDownTime;
    lastMouseDown = event;
    lastMouseDownTime = Date.now();
    return lastMouseDownCount = !last || lastTime > Date.now() - 400 && Math.abs(last.clientX - event.clientX) < 2 && Math.abs(last.clientY - event.clientY) < 2 ? (lastMouseDownCount + 1) % 3 : 1;
  }
  function basicMouseSelection(view, event) {
    let start = queryPos(view, event), type = getClickType(event);
    let startSel = view.state.selection;
    let last = start, lastEvent = event;
    return {
      update(update) {
        if (update.changes) {
          if (start)
            start.pos = update.changes.mapPos(start.pos);
          startSel = startSel.map(update.changes);
        }
      },
      get(event2, extend2, multiple) {
        let cur;
        if (event2.clientX == lastEvent.clientX && event2.clientY == lastEvent.clientY)
          cur = last;
        else {
          cur = last = queryPos(view, event2);
          lastEvent = event2;
        }
        if (!cur || !start)
          return startSel;
        let range = rangeForClick(view, cur.pos, cur.bias, type);
        if (start.pos != cur.pos && !extend2) {
          let startRange = rangeForClick(view, start.pos, start.bias, type);
          let from = Math.min(startRange.from, range.from), to = Math.max(startRange.to, range.to);
          range = from < range.from ? EditorSelection.range(from, to) : EditorSelection.range(to, from);
        }
        if (extend2)
          return startSel.replaceRange(startSel.main.extend(range.from, range.to));
        else if (multiple)
          return startSel.addRange(range);
        else
          return EditorSelection.create([range]);
      }
    };
  }
  handlers.dragstart = (view, event) => {
    let {selection: {main}} = view.state;
    let {mouseSelection} = view.inputState;
    if (mouseSelection)
      mouseSelection.dragging = main;
    if (event.dataTransfer) {
      event.dataTransfer.setData("Text", view.state.sliceDoc(main.from, main.to));
      event.dataTransfer.effectAllowed = "copyMove";
    }
  };
  handlers.drop = (view, event) => {
    if (!event.dataTransfer || !view.state.facet(editable))
      return;
    let dropPos = view.posAtCoords({x: event.clientX, y: event.clientY});
    let text = event.dataTransfer.getData("Text");
    if (dropPos == null || !text)
      return;
    event.preventDefault();
    let {mouseSelection} = view.inputState;
    let del = mouseSelection && mouseSelection.dragging && mouseSelection.dragMove ? {from: mouseSelection.dragging.from, to: mouseSelection.dragging.to} : null;
    let ins = {from: dropPos, insert: text};
    let changes = view.state.changes(del ? [del, ins] : ins);
    view.focus();
    view.dispatch({
      changes,
      selection: {anchor: changes.mapPos(dropPos, -1), head: changes.mapPos(dropPos, 1)},
      annotations: Transaction.userEvent.of("drop")
    });
  };
  handlers.paste = (view, event) => {
    if (!view.state.facet(editable))
      return;
    view.observer.flush();
    let data = brokenClipboardAPI ? null : event.clipboardData;
    let text = data && data.getData("text/plain");
    if (text) {
      doPaste(view, text);
      event.preventDefault();
    } else {
      capturePaste(view);
    }
  };
  function captureCopy(view, text) {
    let parent = view.dom.parentNode;
    if (!parent)
      return;
    let target = parent.appendChild(document.createElement("textarea"));
    target.style.cssText = "position: fixed; left: -10000px; top: 10px";
    target.value = text;
    target.focus();
    target.selectionEnd = text.length;
    target.selectionStart = 0;
    setTimeout(() => {
      target.remove();
      view.focus();
    }, 50);
  }
  function copiedRange(state) {
    let content2 = [], ranges = [], linewise = false;
    for (let range of state.selection.ranges)
      if (!range.empty) {
        content2.push(state.sliceDoc(range.from, range.to));
        ranges.push(range);
      }
    if (!content2.length) {
      let upto = -1;
      for (let {from} of state.selection.ranges) {
        let line = state.doc.lineAt(from);
        if (line.number > upto) {
          content2.push(line.text);
          ranges.push({from: line.from, to: Math.min(state.doc.length, line.to + 1)});
        }
        upto = line.number;
      }
      linewise = true;
    }
    return {text: content2.join(state.lineBreak), ranges, linewise};
  }
  var lastLinewiseCopy = null;
  handlers.copy = handlers.cut = (view, event) => {
    let {text, ranges, linewise} = copiedRange(view.state);
    if (!text)
      return;
    lastLinewiseCopy = linewise ? text : null;
    let data = brokenClipboardAPI ? null : event.clipboardData;
    if (data) {
      event.preventDefault();
      data.clearData();
      data.setData("text/plain", text);
    } else {
      captureCopy(view, text);
    }
    if (event.type == "cut" && view.state.facet(editable))
      view.dispatch({
        changes: ranges,
        scrollIntoView: true,
        annotations: Transaction.userEvent.of("cut")
      });
  };
  handlers.focus = handlers.blur = (view) => {
    setTimeout(() => {
      if (view.hasFocus != view.inputState.notifiedFocused)
        view.update([]);
    }, 10);
  };
  handlers.beforeprint = (view) => {
    view.viewState.printing = true;
    view.requestMeasure();
    setTimeout(() => {
      view.viewState.printing = false;
      view.requestMeasure();
    }, 2e3);
  };
  function forceClearComposition(view) {
    if (view.docView.compositionDeco.size)
      view.update([]);
  }
  handlers.compositionstart = handlers.compositionupdate = (view) => {
    if (view.inputState.composing < 0) {
      if (view.docView.compositionDeco.size) {
        view.observer.flush();
        forceClearComposition(view);
      }
      view.inputState.composing = 0;
    }
  };
  handlers.compositionend = (view) => {
    view.inputState.composing = -1;
    view.inputState.compositionEndedAt = Date.now();
    setTimeout(() => {
      if (view.inputState.composing < 0)
        forceClearComposition(view);
    }, 50);
  };
  handlers.contextmenu = (view) => {
    view.inputState.lastContextMenu = Date.now();
  };
  var wrappingWhiteSpace = ["pre-wrap", "normal", "pre-line"];
  var HeightOracle = class {
    constructor() {
      this.doc = Text.empty;
      this.lineWrapping = false;
      this.direction = Direction.LTR;
      this.heightSamples = {};
      this.lineHeight = 14;
      this.charWidth = 7;
      this.lineLength = 30;
      this.heightChanged = false;
    }
    heightForGap(from, to) {
      let lines2 = this.doc.lineAt(to).number - this.doc.lineAt(from).number + 1;
      if (this.lineWrapping)
        lines2 += Math.ceil((to - from - lines2 * this.lineLength * 0.5) / this.lineLength);
      return this.lineHeight * lines2;
    }
    heightForLine(length) {
      if (!this.lineWrapping)
        return this.lineHeight;
      let lines2 = 1 + Math.max(0, Math.ceil((length - this.lineLength) / (this.lineLength - 5)));
      return lines2 * this.lineHeight;
    }
    setDoc(doc2) {
      this.doc = doc2;
      return this;
    }
    mustRefresh(lineHeights, whiteSpace, direction) {
      let newHeight = false;
      for (let i = 0; i < lineHeights.length; i++) {
        let h = lineHeights[i];
        if (h < 0) {
          i++;
        } else if (!this.heightSamples[Math.floor(h * 10)]) {
          newHeight = true;
          this.heightSamples[Math.floor(h * 10)] = true;
        }
      }
      return newHeight || wrappingWhiteSpace.indexOf(whiteSpace) > -1 != this.lineWrapping || this.direction != direction;
    }
    refresh(whiteSpace, direction, lineHeight, charWidth, lineLength, knownHeights) {
      let lineWrapping = wrappingWhiteSpace.indexOf(whiteSpace) > -1;
      let changed = Math.round(lineHeight) != Math.round(this.lineHeight) || this.lineWrapping != lineWrapping || this.direction != direction;
      this.lineWrapping = lineWrapping;
      this.direction = direction;
      this.lineHeight = lineHeight;
      this.charWidth = charWidth;
      this.lineLength = lineLength;
      if (changed) {
        this.heightSamples = {};
        for (let i = 0; i < knownHeights.length; i++) {
          let h = knownHeights[i];
          if (h < 0)
            i++;
          else
            this.heightSamples[Math.floor(h * 10)] = true;
        }
      }
      return changed;
    }
  };
  var MeasuredHeights = class {
    constructor(from, heights) {
      this.from = from;
      this.heights = heights;
      this.index = 0;
    }
    get more() {
      return this.index < this.heights.length;
    }
  };
  var BlockInfo = class {
    constructor(from, length, top2, height, type) {
      this.from = from;
      this.length = length;
      this.top = top2;
      this.height = height;
      this.type = type;
    }
    get to() {
      return this.from + this.length;
    }
    get bottom() {
      return this.top + this.height;
    }
    join(other) {
      let detail = (Array.isArray(this.type) ? this.type : [this]).concat(Array.isArray(other.type) ? other.type : [other]);
      return new BlockInfo(this.from, this.length + other.length, this.top, this.height + other.height, detail);
    }
  };
  var QueryType = /* @__PURE__ */ function(QueryType2) {
    QueryType2[QueryType2["ByPos"] = 0] = "ByPos";
    QueryType2[QueryType2["ByHeight"] = 1] = "ByHeight";
    QueryType2[QueryType2["ByPosNoHeight"] = 2] = "ByPosNoHeight";
    return QueryType2;
  }(QueryType || (QueryType = {}));
  var Epsilon = 1e-4;
  var HeightMap = class {
    constructor(length, height, flags = 2) {
      this.length = length;
      this.height = height;
      this.flags = flags;
    }
    get outdated() {
      return (this.flags & 2) > 0;
    }
    set outdated(value) {
      this.flags = (value ? 2 : 0) | this.flags & ~2;
    }
    setHeight(oracle, height) {
      if (this.height != height) {
        if (Math.abs(this.height - height) > Epsilon)
          oracle.heightChanged = true;
        this.height = height;
      }
    }
    replace(_from, _to, nodes) {
      return HeightMap.of(nodes);
    }
    decomposeLeft(_to, result) {
      result.push(this);
    }
    decomposeRight(_from, result) {
      result.push(this);
    }
    applyChanges(decorations2, oldDoc, oracle, changes) {
      let me = this;
      for (let i = changes.length - 1; i >= 0; i--) {
        let {fromA, toA, fromB, toB} = changes[i];
        let start = me.lineAt(fromA, QueryType.ByPosNoHeight, oldDoc, 0, 0);
        let end = start.to >= toA ? start : me.lineAt(toA, QueryType.ByPosNoHeight, oldDoc, 0, 0);
        toB += end.to - toA;
        toA = end.to;
        while (i > 0 && start.from <= changes[i - 1].toA) {
          fromA = changes[i - 1].fromA;
          fromB = changes[i - 1].fromB;
          i--;
          if (fromA < start.from)
            start = me.lineAt(fromA, QueryType.ByPosNoHeight, oldDoc, 0, 0);
        }
        fromB += start.from - fromA;
        fromA = start.from;
        let nodes = NodeBuilder.build(oracle, decorations2, fromB, toB);
        me = me.replace(fromA, toA, nodes);
      }
      return me.updateHeight(oracle, 0);
    }
    static empty() {
      return new HeightMapText(0, 0);
    }
    static of(nodes) {
      if (nodes.length == 1)
        return nodes[0];
      let i = 0, j = nodes.length, before = 0, after = 0;
      for (; ; ) {
        if (i == j) {
          if (before > after * 2) {
            let split = nodes[i - 1];
            if (split.break)
              nodes.splice(--i, 1, split.left, null, split.right);
            else
              nodes.splice(--i, 1, split.left, split.right);
            j += 1 + split.break;
            before -= split.size;
          } else if (after > before * 2) {
            let split = nodes[j];
            if (split.break)
              nodes.splice(j, 1, split.left, null, split.right);
            else
              nodes.splice(j, 1, split.left, split.right);
            j += 2 + split.break;
            after -= split.size;
          } else {
            break;
          }
        } else if (before < after) {
          let next2 = nodes[i++];
          if (next2)
            before += next2.size;
        } else {
          let next2 = nodes[--j];
          if (next2)
            after += next2.size;
        }
      }
      let brk = 0;
      if (nodes[i - 1] == null) {
        brk = 1;
        i--;
      } else if (nodes[i] == null) {
        brk = 1;
        j++;
      }
      return new HeightMapBranch(HeightMap.of(nodes.slice(0, i)), brk, HeightMap.of(nodes.slice(j)));
    }
  };
  HeightMap.prototype.size = 1;
  var HeightMapBlock = class extends HeightMap {
    constructor(length, height, type) {
      super(length, height);
      this.type = type;
    }
    blockAt(_height, _doc, top2, offset) {
      return new BlockInfo(offset, this.length, top2, this.height, this.type);
    }
    lineAt(_value, _type, doc2, top2, offset) {
      return this.blockAt(0, doc2, top2, offset);
    }
    forEachLine(_from, _to, doc2, top2, offset, f) {
      f(this.blockAt(0, doc2, top2, offset));
    }
    updateHeight(oracle, offset = 0, _force = false, measured) {
      if (measured && measured.from <= offset && measured.more)
        this.setHeight(oracle, measured.heights[measured.index++]);
      this.outdated = false;
      return this;
    }
    toString() {
      return `block(${this.length})`;
    }
  };
  var HeightMapText = class extends HeightMapBlock {
    constructor(length, height) {
      super(length, height, BlockType.Text);
      this.collapsed = 0;
      this.widgetHeight = 0;
    }
    replace(_from, _to, nodes) {
      let node = nodes[0];
      if (nodes.length == 1 && (node instanceof HeightMapText || node instanceof HeightMapGap && node.flags & 4) && Math.abs(this.length - node.length) < 10) {
        if (node instanceof HeightMapGap)
          node = new HeightMapText(node.length, this.height);
        else
          node.height = this.height;
        if (!this.outdated)
          node.outdated = false;
        return node;
      } else {
        return HeightMap.of(nodes);
      }
    }
    updateHeight(oracle, offset = 0, force = false, measured) {
      if (measured && measured.from <= offset && measured.more)
        this.setHeight(oracle, measured.heights[measured.index++]);
      else if (force || this.outdated)
        this.setHeight(oracle, Math.max(this.widgetHeight, oracle.heightForLine(this.length - this.collapsed)));
      this.outdated = false;
      return this;
    }
    toString() {
      return `line(${this.length}${this.collapsed ? -this.collapsed : ""}${this.widgetHeight ? ":" + this.widgetHeight : ""})`;
    }
  };
  var HeightMapGap = class extends HeightMap {
    constructor(length) {
      super(length, 0);
    }
    lines(doc2, offset) {
      let firstLine = doc2.lineAt(offset).number, lastLine = doc2.lineAt(offset + this.length).number;
      return {firstLine, lastLine, lineHeight: this.height / (lastLine - firstLine + 1)};
    }
    blockAt(height, doc2, top2, offset) {
      let {firstLine, lastLine, lineHeight} = this.lines(doc2, offset);
      let line = Math.max(0, Math.min(lastLine - firstLine, Math.floor((height - top2) / lineHeight)));
      let {from, length} = doc2.line(firstLine + line);
      return new BlockInfo(from, length, top2 + lineHeight * line, lineHeight, BlockType.Text);
    }
    lineAt(value, type, doc2, top2, offset) {
      if (type == QueryType.ByHeight)
        return this.blockAt(value, doc2, top2, offset);
      if (type == QueryType.ByPosNoHeight) {
        let {from: from2, to} = doc2.lineAt(value);
        return new BlockInfo(from2, to - from2, 0, 0, BlockType.Text);
      }
      let {firstLine, lineHeight} = this.lines(doc2, offset);
      let {from, length, number: number2} = doc2.lineAt(value);
      return new BlockInfo(from, length, top2 + lineHeight * (number2 - firstLine), lineHeight, BlockType.Text);
    }
    forEachLine(from, to, doc2, top2, offset, f) {
      let {firstLine, lineHeight} = this.lines(doc2, offset);
      for (let pos = Math.max(from, offset), end = Math.min(offset + this.length, to); pos <= end; ) {
        let line = doc2.lineAt(pos);
        if (pos == from)
          top2 += lineHeight * (line.number - firstLine);
        f(new BlockInfo(line.from, line.length, top2, lineHeight, BlockType.Text));
        top2 += lineHeight;
        pos = line.to + 1;
      }
    }
    replace(from, to, nodes) {
      let after = this.length - to;
      if (after > 0) {
        let last = nodes[nodes.length - 1];
        if (last instanceof HeightMapGap)
          nodes[nodes.length - 1] = new HeightMapGap(last.length + after);
        else
          nodes.push(null, new HeightMapGap(after - 1));
      }
      if (from > 0) {
        let first = nodes[0];
        if (first instanceof HeightMapGap)
          nodes[0] = new HeightMapGap(from + first.length);
        else
          nodes.unshift(new HeightMapGap(from - 1), null);
      }
      return HeightMap.of(nodes);
    }
    decomposeLeft(to, result) {
      result.push(new HeightMapGap(to - 1), null);
    }
    decomposeRight(from, result) {
      result.push(null, new HeightMapGap(this.length - from - 1));
    }
    updateHeight(oracle, offset = 0, force = false, measured) {
      let end = offset + this.length;
      if (measured && measured.from <= offset + this.length && measured.more) {
        let nodes = [], pos = Math.max(offset, measured.from);
        if (measured.from > offset)
          nodes.push(new HeightMapGap(measured.from - offset - 1).updateHeight(oracle, offset));
        while (pos <= end && measured.more) {
          let len = oracle.doc.lineAt(pos).length;
          if (nodes.length)
            nodes.push(null);
          let line = new HeightMapText(len, measured.heights[measured.index++]);
          line.outdated = false;
          nodes.push(line);
          pos += len + 1;
        }
        if (pos <= end)
          nodes.push(null, new HeightMapGap(end - pos).updateHeight(oracle, pos));
        oracle.heightChanged = true;
        return HeightMap.of(nodes);
      } else if (force || this.outdated) {
        this.setHeight(oracle, oracle.heightForGap(offset, offset + this.length));
        this.outdated = false;
      }
      return this;
    }
    toString() {
      return `gap(${this.length})`;
    }
  };
  var HeightMapBranch = class extends HeightMap {
    constructor(left, brk, right) {
      super(left.length + brk + right.length, left.height + right.height, brk | (left.outdated || right.outdated ? 2 : 0));
      this.left = left;
      this.right = right;
      this.size = left.size + right.size;
    }
    get break() {
      return this.flags & 1;
    }
    blockAt(height, doc2, top2, offset) {
      let mid = top2 + this.left.height;
      return height < mid || this.right.height == 0 ? this.left.blockAt(height, doc2, top2, offset) : this.right.blockAt(height, doc2, mid, offset + this.left.length + this.break);
    }
    lineAt(value, type, doc2, top2, offset) {
      let rightTop = top2 + this.left.height, rightOffset = offset + this.left.length + this.break;
      let left = type == QueryType.ByHeight ? value < rightTop || this.right.height == 0 : value < rightOffset;
      let base2 = left ? this.left.lineAt(value, type, doc2, top2, offset) : this.right.lineAt(value, type, doc2, rightTop, rightOffset);
      if (this.break || (left ? base2.to < rightOffset : base2.from > rightOffset))
        return base2;
      let subQuery = type == QueryType.ByPosNoHeight ? QueryType.ByPosNoHeight : QueryType.ByPos;
      if (left)
        return base2.join(this.right.lineAt(rightOffset, subQuery, doc2, rightTop, rightOffset));
      else
        return this.left.lineAt(rightOffset, subQuery, doc2, top2, offset).join(base2);
    }
    forEachLine(from, to, doc2, top2, offset, f) {
      let rightTop = top2 + this.left.height, rightOffset = offset + this.left.length + this.break;
      if (this.break) {
        if (from < rightOffset)
          this.left.forEachLine(from, to, doc2, top2, offset, f);
        if (to >= rightOffset)
          this.right.forEachLine(from, to, doc2, rightTop, rightOffset, f);
      } else {
        let mid = this.lineAt(rightOffset, QueryType.ByPos, doc2, top2, offset);
        if (from < mid.from)
          this.left.forEachLine(from, mid.from - 1, doc2, top2, offset, f);
        if (mid.to >= from && mid.from <= to)
          f(mid);
        if (to > mid.to)
          this.right.forEachLine(mid.to + 1, to, doc2, rightTop, rightOffset, f);
      }
    }
    replace(from, to, nodes) {
      let rightStart = this.left.length + this.break;
      if (to < rightStart)
        return this.balanced(this.left.replace(from, to, nodes), this.right);
      if (from > this.left.length)
        return this.balanced(this.left, this.right.replace(from - rightStart, to - rightStart, nodes));
      let result = [];
      if (from > 0)
        this.decomposeLeft(from, result);
      let left = result.length;
      for (let node of nodes)
        result.push(node);
      if (from > 0)
        mergeGaps(result, left - 1);
      if (to < this.length) {
        let right = result.length;
        this.decomposeRight(to, result);
        mergeGaps(result, right);
      }
      return HeightMap.of(result);
    }
    decomposeLeft(to, result) {
      let left = this.left.length;
      if (to <= left)
        return this.left.decomposeLeft(to, result);
      result.push(this.left);
      if (this.break) {
        left++;
        if (to >= left)
          result.push(null);
      }
      if (to > left)
        this.right.decomposeLeft(to - left, result);
    }
    decomposeRight(from, result) {
      let left = this.left.length, right = left + this.break;
      if (from >= right)
        return this.right.decomposeRight(from - right, result);
      if (from < left)
        this.left.decomposeRight(from, result);
      if (this.break && from < right)
        result.push(null);
      result.push(this.right);
    }
    balanced(left, right) {
      if (left.size > 2 * right.size || right.size > 2 * left.size)
        return HeightMap.of(this.break ? [left, null, right] : [left, right]);
      this.left = left;
      this.right = right;
      this.height = left.height + right.height;
      this.outdated = left.outdated || right.outdated;
      this.size = left.size + right.size;
      this.length = left.length + this.break + right.length;
      return this;
    }
    updateHeight(oracle, offset = 0, force = false, measured) {
      let {left, right} = this, rightStart = offset + left.length + this.break, rebalance = null;
      if (measured && measured.from <= offset + left.length && measured.more)
        rebalance = left = left.updateHeight(oracle, offset, force, measured);
      else
        left.updateHeight(oracle, offset, force);
      if (measured && measured.from <= rightStart + right.length && measured.more)
        rebalance = right = right.updateHeight(oracle, rightStart, force, measured);
      else
        right.updateHeight(oracle, rightStart, force);
      if (rebalance)
        return this.balanced(left, right);
      this.height = this.left.height + this.right.height;
      this.outdated = false;
      return this;
    }
    toString() {
      return this.left + (this.break ? " " : "-") + this.right;
    }
  };
  function mergeGaps(nodes, around) {
    let before, after;
    if (nodes[around] == null && (before = nodes[around - 1]) instanceof HeightMapGap && (after = nodes[around + 1]) instanceof HeightMapGap)
      nodes.splice(around - 1, 3, new HeightMapGap(before.length + 1 + after.length));
  }
  var relevantWidgetHeight = 5;
  var NodeBuilder = class {
    constructor(pos, oracle) {
      this.pos = pos;
      this.oracle = oracle;
      this.nodes = [];
      this.lineStart = -1;
      this.lineEnd = -1;
      this.covering = null;
      this.writtenTo = pos;
    }
    get isCovered() {
      return this.covering && this.nodes[this.nodes.length - 1] == this.covering;
    }
    span(_from, to) {
      if (this.lineStart > -1) {
        let end = Math.min(to, this.lineEnd), last = this.nodes[this.nodes.length - 1];
        if (last instanceof HeightMapText)
          last.length += end - this.pos;
        else if (end > this.pos || !this.isCovered)
          this.nodes.push(new HeightMapText(end - this.pos, -1));
        this.writtenTo = end;
        if (to > end) {
          this.nodes.push(null);
          this.writtenTo++;
          this.lineStart = -1;
        }
      }
      this.pos = to;
    }
    point(from, to, deco) {
      if (from < to || deco.heightRelevant) {
        let height = deco.widget ? Math.max(0, deco.widget.estimatedHeight) : 0;
        let len = to - from;
        if (deco.block) {
          this.addBlock(new HeightMapBlock(len, height, deco.type));
        } else if (len || height >= relevantWidgetHeight) {
          this.addLineDeco(height, len);
        }
      } else if (to > from) {
        this.span(from, to);
      }
      if (this.lineEnd > -1 && this.lineEnd < this.pos)
        this.lineEnd = this.oracle.doc.lineAt(this.pos).to;
    }
    enterLine() {
      if (this.lineStart > -1)
        return;
      let {from, to} = this.oracle.doc.lineAt(this.pos);
      this.lineStart = from;
      this.lineEnd = to;
      if (this.writtenTo < from) {
        if (this.writtenTo < from - 1 || this.nodes[this.nodes.length - 1] == null)
          this.nodes.push(this.blankContent(this.writtenTo, from - 1));
        this.nodes.push(null);
      }
      if (this.pos > from)
        this.nodes.push(new HeightMapText(this.pos - from, -1));
      this.writtenTo = this.pos;
    }
    blankContent(from, to) {
      let gap = new HeightMapGap(to - from);
      if (this.oracle.doc.lineAt(from).to == to)
        gap.flags |= 4;
      return gap;
    }
    ensureLine() {
      this.enterLine();
      let last = this.nodes.length ? this.nodes[this.nodes.length - 1] : null;
      if (last instanceof HeightMapText)
        return last;
      let line = new HeightMapText(0, -1);
      this.nodes.push(line);
      return line;
    }
    addBlock(block) {
      this.enterLine();
      if (block.type == BlockType.WidgetAfter && !this.isCovered)
        this.ensureLine();
      this.nodes.push(block);
      this.writtenTo = this.pos = this.pos + block.length;
      if (block.type != BlockType.WidgetBefore)
        this.covering = block;
    }
    addLineDeco(height, length) {
      let line = this.ensureLine();
      line.length += length;
      line.collapsed += length;
      line.widgetHeight = Math.max(line.widgetHeight, height);
      this.writtenTo = this.pos = this.pos + length;
    }
    finish(from) {
      let last = this.nodes.length == 0 ? null : this.nodes[this.nodes.length - 1];
      if (this.lineStart > -1 && !(last instanceof HeightMapText) && !this.isCovered)
        this.nodes.push(new HeightMapText(0, -1));
      else if (this.writtenTo < this.pos || last == null)
        this.nodes.push(this.blankContent(this.writtenTo, this.pos));
      let pos = from;
      for (let node of this.nodes) {
        if (node instanceof HeightMapText)
          node.updateHeight(this.oracle, pos);
        pos += node ? node.length : 1;
      }
      return this.nodes;
    }
    static build(oracle, decorations2, from, to) {
      let builder = new NodeBuilder(from, oracle);
      RangeSet.spans(decorations2, from, to, builder, 0);
      return builder.finish(from);
    }
  };
  function heightRelevantDecoChanges(a, b, diff) {
    let comp = new DecorationComparator();
    RangeSet.compare(a, b, diff, comp, 0);
    return comp.changes;
  }
  var DecorationComparator = class {
    constructor() {
      this.changes = [];
    }
    compareRange() {
    }
    comparePoint(from, to, a, b) {
      if (from < to || a && a.heightRelevant || b && b.heightRelevant)
        addRange(from, to, this.changes, 5);
    }
  };
  function visiblePixelRange(dom, paddingTop) {
    let rect = dom.getBoundingClientRect();
    let left = Math.max(0, rect.left), right = Math.min(innerWidth, rect.right);
    let top2 = Math.max(0, rect.top), bottom = Math.min(innerHeight, rect.bottom);
    for (let parent = dom.parentNode; parent; ) {
      if (parent.nodeType == 1) {
        let style = window.getComputedStyle(parent);
        if ((parent.scrollHeight > parent.clientHeight || parent.scrollWidth > parent.clientWidth) && style.overflow != "visible") {
          let parentRect = parent.getBoundingClientRect();
          left = Math.max(left, parentRect.left);
          right = Math.min(right, parentRect.right);
          top2 = Math.max(top2, parentRect.top);
          bottom = Math.min(bottom, parentRect.bottom);
        }
        parent = style.position == "absolute" || style.position == "fixed" ? parent.offsetParent : parent.parentNode;
      } else if (parent.nodeType == 11) {
        parent = parent.host;
      } else {
        break;
      }
    }
    return {
      left: left - rect.left,
      right: right - rect.left,
      top: top2 - (rect.top + paddingTop),
      bottom: bottom - (rect.top + paddingTop)
    };
  }
  var LineGap = class {
    constructor(from, to, size) {
      this.from = from;
      this.to = to;
      this.size = size;
    }
    static same(a, b) {
      if (a.length != b.length)
        return false;
      for (let i = 0; i < a.length; i++) {
        let gA = a[i], gB = b[i];
        if (gA.from != gB.from || gA.to != gB.to || gA.size != gB.size)
          return false;
      }
      return true;
    }
    draw(wrapping) {
      return Decoration.replace({widget: new LineGapWidget(this.size, wrapping)}).range(this.from, this.to);
    }
  };
  var LineGapWidget = class extends WidgetType {
    constructor(size, vertical) {
      super();
      this.size = size;
      this.vertical = vertical;
    }
    eq(other) {
      return other.size == this.size && other.vertical == this.vertical;
    }
    toDOM() {
      let elt = document.createElement("div");
      if (this.vertical) {
        elt.style.height = this.size + "px";
      } else {
        elt.style.width = this.size + "px";
        elt.style.height = "2px";
        elt.style.display = "inline-block";
      }
      return elt;
    }
    get estimatedHeight() {
      return this.vertical ? this.size : -1;
    }
  };
  var ViewState = class {
    constructor(state) {
      this.state = state;
      this.pixelViewport = {left: 0, right: window.innerWidth, top: 0, bottom: 0};
      this.inView = true;
      this.paddingTop = 0;
      this.paddingBottom = 0;
      this.contentWidth = 0;
      this.heightOracle = new HeightOracle();
      this.scaler = IdScaler;
      this.scrollTo = null;
      this.printing = false;
      this.visibleRanges = [];
      this.mustEnforceCursorAssoc = false;
      this.heightMap = HeightMap.empty().applyChanges(state.facet(decorations), Text.empty, this.heightOracle.setDoc(state.doc), [new ChangedRange(0, 0, 0, state.doc.length)]);
      this.viewport = this.getViewport(0, null);
      this.updateForViewport();
      this.lineGaps = this.ensureLineGaps([]);
      this.lineGapDeco = Decoration.set(this.lineGaps.map((gap) => gap.draw(false)));
      this.computeVisibleRanges();
    }
    updateForViewport() {
      let viewports = [this.viewport], {main} = this.state.selection;
      for (let i = 0; i <= 1; i++) {
        let pos = i ? main.head : main.anchor;
        if (!viewports.some(({from, to}) => pos >= from && pos <= to)) {
          let {from, to} = this.lineAt(pos, 0);
          viewports.push(new Viewport(from, to));
        }
      }
      this.viewports = viewports.sort((a, b) => a.from - b.from);
      this.scaler = this.heightMap.height <= 7e6 ? IdScaler : new BigScaler(this.heightOracle.doc, this.heightMap, this.viewports);
    }
    update(update, scrollTo2 = null) {
      let prev = this.state;
      this.state = update.state;
      let newDeco = this.state.facet(decorations);
      let contentChanges = update.changedRanges;
      let heightChanges = ChangedRange.extendWithRanges(contentChanges, heightRelevantDecoChanges(update.startState.facet(decorations), newDeco, update ? update.changes : ChangeSet.empty(this.state.doc.length)));
      let prevHeight = this.heightMap.height;
      this.heightMap = this.heightMap.applyChanges(newDeco, prev.doc, this.heightOracle.setDoc(this.state.doc), heightChanges);
      if (this.heightMap.height != prevHeight)
        update.flags |= 2;
      let viewport = heightChanges.length ? this.mapViewport(this.viewport, update.changes) : this.viewport;
      if (scrollTo2 && (scrollTo2.head < viewport.from || scrollTo2.head > viewport.to) || !this.viewportIsAppropriate(viewport))
        viewport = this.getViewport(0, scrollTo2);
      if (!viewport.eq(this.viewport)) {
        this.viewport = viewport;
        update.flags |= 4;
      }
      this.updateForViewport();
      if (this.lineGaps.length || this.viewport.to - this.viewport.from > 15e3)
        update.flags |= this.updateLineGaps(this.ensureLineGaps(this.mapLineGaps(this.lineGaps, update.changes)));
      this.computeVisibleRanges();
      if (scrollTo2)
        this.scrollTo = scrollTo2;
      if (!this.mustEnforceCursorAssoc && update.selectionSet && update.view.lineWrapping && update.state.selection.main.empty && update.state.selection.main.assoc)
        this.mustEnforceCursorAssoc = true;
    }
    measure(docView, repeated) {
      let dom = docView.dom, whiteSpace = "", direction = Direction.LTR;
      if (!repeated) {
        let style = window.getComputedStyle(dom);
        whiteSpace = style.whiteSpace, direction = style.direction == "rtl" ? Direction.RTL : Direction.LTR;
        this.paddingTop = parseInt(style.paddingTop) || 0;
        this.paddingBottom = parseInt(style.paddingBottom) || 0;
      }
      let pixelViewport = this.printing ? {top: -1e8, bottom: 1e8, left: -1e8, right: 1e8} : visiblePixelRange(dom, this.paddingTop);
      let dTop = pixelViewport.top - this.pixelViewport.top, dBottom = pixelViewport.bottom - this.pixelViewport.bottom;
      this.pixelViewport = pixelViewport;
      this.inView = this.pixelViewport.bottom > this.pixelViewport.top && this.pixelViewport.right > this.pixelViewport.left;
      if (!this.inView)
        return 0;
      let lineHeights = docView.measureVisibleLineHeights();
      let refresh = false, bias = 0, result = 0, oracle = this.heightOracle;
      if (!repeated) {
        let contentWidth = docView.dom.clientWidth;
        if (oracle.mustRefresh(lineHeights, whiteSpace, direction) || oracle.lineWrapping && Math.abs(contentWidth - this.contentWidth) > oracle.charWidth) {
          let {lineHeight, charWidth} = docView.measureTextSize();
          refresh = oracle.refresh(whiteSpace, direction, lineHeight, charWidth, contentWidth / charWidth, lineHeights);
          if (refresh) {
            docView.minWidth = 0;
            result |= 16;
          }
        }
        if (this.contentWidth != contentWidth) {
          this.contentWidth = contentWidth;
          result |= 16;
        }
        if (dTop > 0 && dBottom > 0)
          bias = Math.max(dTop, dBottom);
        else if (dTop < 0 && dBottom < 0)
          bias = Math.min(dTop, dBottom);
      }
      oracle.heightChanged = false;
      this.heightMap = this.heightMap.updateHeight(oracle, 0, refresh, new MeasuredHeights(this.viewport.from, lineHeights));
      if (oracle.heightChanged)
        result |= 2;
      if (!this.viewportIsAppropriate(this.viewport, bias) || this.scrollTo && (this.scrollTo.head < this.viewport.from || this.scrollTo.head > this.viewport.to)) {
        let newVP = this.getViewport(bias, this.scrollTo);
        if (newVP.from != this.viewport.from || newVP.to != this.viewport.to) {
          this.viewport = newVP;
          result |= 4;
        }
      }
      this.updateForViewport();
      if (this.lineGaps.length || this.viewport.to - this.viewport.from > 15e3)
        result |= this.updateLineGaps(this.ensureLineGaps(refresh ? [] : this.lineGaps));
      this.computeVisibleRanges();
      if (this.mustEnforceCursorAssoc) {
        this.mustEnforceCursorAssoc = false;
        docView.enforceCursorAssoc();
      }
      return result;
    }
    get visibleTop() {
      return this.scaler.fromDOM(this.pixelViewport.top, 0);
    }
    get visibleBottom() {
      return this.scaler.fromDOM(this.pixelViewport.bottom, 0);
    }
    getViewport(bias, scrollTo2) {
      let marginTop = 0.5 - Math.max(-0.5, Math.min(0.5, bias / 1e3 / 2));
      let map = this.heightMap, doc2 = this.state.doc, {visibleTop, visibleBottom} = this;
      let viewport = new Viewport(map.lineAt(visibleTop - marginTop * 1e3, QueryType.ByHeight, doc2, 0, 0).from, map.lineAt(visibleBottom + (1 - marginTop) * 1e3, QueryType.ByHeight, doc2, 0, 0).to);
      if (scrollTo2) {
        if (scrollTo2.head < viewport.from) {
          let {top: newTop} = map.lineAt(scrollTo2.head, QueryType.ByPos, doc2, 0, 0);
          viewport = new Viewport(map.lineAt(newTop - 1e3 / 2, QueryType.ByHeight, doc2, 0, 0).from, map.lineAt(newTop + (visibleBottom - visibleTop) + 1e3 / 2, QueryType.ByHeight, doc2, 0, 0).to);
        } else if (scrollTo2.head > viewport.to) {
          let {bottom: newBottom} = map.lineAt(scrollTo2.head, QueryType.ByPos, doc2, 0, 0);
          viewport = new Viewport(map.lineAt(newBottom - (visibleBottom - visibleTop) - 1e3 / 2, QueryType.ByHeight, doc2, 0, 0).from, map.lineAt(newBottom + 1e3 / 2, QueryType.ByHeight, doc2, 0, 0).to);
        }
      }
      return viewport;
    }
    mapViewport(viewport, changes) {
      let from = changes.mapPos(viewport.from, -1), to = changes.mapPos(viewport.to, 1);
      return new Viewport(this.heightMap.lineAt(from, QueryType.ByPos, this.state.doc, 0, 0).from, this.heightMap.lineAt(to, QueryType.ByPos, this.state.doc, 0, 0).to);
    }
    viewportIsAppropriate({from, to}, bias = 0) {
      let {top: top2} = this.heightMap.lineAt(from, QueryType.ByPos, this.state.doc, 0, 0);
      let {bottom} = this.heightMap.lineAt(to, QueryType.ByPos, this.state.doc, 0, 0);
      let {visibleTop, visibleBottom} = this;
      return (from == 0 || top2 <= visibleTop - Math.max(10, Math.min(-bias, 250))) && (to == this.state.doc.length || bottom >= visibleBottom + Math.max(10, Math.min(bias, 250))) && (top2 > visibleTop - 2 * 1e3 && bottom < visibleBottom + 2 * 1e3);
    }
    mapLineGaps(gaps, changes) {
      if (!gaps.length || changes.empty)
        return gaps;
      let mapped = [];
      for (let gap of gaps)
        if (!changes.touchesRange(gap.from, gap.to))
          mapped.push(new LineGap(changes.mapPos(gap.from), changes.mapPos(gap.to), gap.size));
      return mapped;
    }
    ensureLineGaps(current) {
      let gaps = [];
      if (this.heightOracle.direction != Direction.LTR)
        return gaps;
      this.heightMap.forEachLine(this.viewport.from, this.viewport.to, this.state.doc, 0, 0, (line) => {
        if (line.length < 1e4)
          return;
        let structure = lineStructure(line.from, line.to, this.state);
        if (structure.total < 1e4)
          return;
        let viewFrom, viewTo;
        if (this.heightOracle.lineWrapping) {
          if (line.from != this.viewport.from)
            viewFrom = line.from;
          else
            viewFrom = findPosition(structure, (this.visibleTop - line.top) / line.height);
          if (line.to != this.viewport.to)
            viewTo = line.to;
          else
            viewTo = findPosition(structure, (this.visibleBottom - line.top) / line.height);
        } else {
          let totalWidth = structure.total * this.heightOracle.charWidth;
          viewFrom = findPosition(structure, this.pixelViewport.left / totalWidth);
          viewTo = findPosition(structure, this.pixelViewport.right / totalWidth);
        }
        let sel = this.state.selection.main;
        if (sel.from <= viewFrom && sel.to >= line.from)
          viewFrom = sel.from;
        if (sel.from <= line.to && sel.to >= viewTo)
          viewTo = sel.to;
        let gapTo = viewFrom - 1e4, gapFrom = viewTo + 1e4;
        if (gapTo > line.from + 5e3)
          gaps.push(find(current, (gap) => gap.from == line.from && gap.to > gapTo - 5e3 && gap.to < gapTo + 5e3) || new LineGap(line.from, gapTo, this.gapSize(line, gapTo, true, structure)));
        if (gapFrom < line.to - 5e3)
          gaps.push(find(current, (gap) => gap.to == line.to && gap.from > gapFrom - 5e3 && gap.from < gapFrom + 5e3) || new LineGap(gapFrom, line.to, this.gapSize(line, gapFrom, false, structure)));
      });
      return gaps;
    }
    gapSize(line, pos, start, structure) {
      if (this.heightOracle.lineWrapping) {
        let height = line.height * findFraction(structure, pos);
        return start ? height : line.height - height;
      } else {
        let ratio = findFraction(structure, pos);
        return structure.total * this.heightOracle.charWidth * (start ? ratio : 1 - ratio);
      }
    }
    updateLineGaps(gaps) {
      if (!LineGap.same(gaps, this.lineGaps)) {
        this.lineGaps = gaps;
        this.lineGapDeco = Decoration.set(gaps.map((gap) => gap.draw(this.heightOracle.lineWrapping)));
        return 8;
      }
      return 0;
    }
    computeVisibleRanges() {
      let deco = this.state.facet(decorations);
      if (this.lineGaps.length)
        deco = deco.concat(this.lineGapDeco);
      let ranges = [];
      RangeSet.spans(deco, this.viewport.from, this.viewport.to, {
        span(from, to) {
          ranges.push({from, to});
        },
        point() {
        }
      }, 20);
      this.visibleRanges = ranges;
    }
    lineAt(pos, editorTop) {
      editorTop += this.paddingTop;
      return scaleBlock(this.heightMap.lineAt(pos, QueryType.ByPos, this.state.doc, editorTop, 0), this.scaler, editorTop);
    }
    lineAtHeight(height, editorTop) {
      editorTop += this.paddingTop;
      return scaleBlock(this.heightMap.lineAt(this.scaler.fromDOM(height, editorTop), QueryType.ByHeight, this.state.doc, editorTop, 0), this.scaler, editorTop);
    }
    blockAtHeight(height, editorTop) {
      editorTop += this.paddingTop;
      return scaleBlock(this.heightMap.blockAt(this.scaler.fromDOM(height, editorTop), this.state.doc, editorTop, 0), this.scaler, editorTop);
    }
    forEachLine(from, to, f, editorTop) {
      editorTop += this.paddingTop;
      return this.heightMap.forEachLine(from, to, this.state.doc, editorTop, 0, this.scaler.scale == 1 ? f : (b) => f(scaleBlock(b, this.scaler, editorTop)));
    }
    get contentHeight() {
      return this.domHeight + this.paddingTop + this.paddingBottom;
    }
    get domHeight() {
      return this.scaler.toDOM(this.heightMap.height, this.paddingTop);
    }
  };
  var Viewport = class {
    constructor(from, to) {
      this.from = from;
      this.to = to;
    }
    eq(b) {
      return this.from == b.from && this.to == b.to;
    }
  };
  function lineStructure(from, to, state) {
    let ranges = [], pos = from, total = 0;
    RangeSet.spans(state.facet(decorations), from, to, {
      span() {
      },
      point(from2, to2) {
        if (from2 > pos) {
          ranges.push({from: pos, to: from2});
          total += from2 - pos;
        }
        pos = to2;
      }
    }, 20);
    if (pos < to) {
      ranges.push({from: pos, to});
      total += to - pos;
    }
    return {total, ranges};
  }
  function findPosition({total, ranges}, ratio) {
    if (ratio <= 0)
      return ranges[0].from;
    if (ratio >= 1)
      return ranges[ranges.length - 1].to;
    let dist = Math.floor(total * ratio);
    for (let i = 0; ; i++) {
      let {from, to} = ranges[i], size = to - from;
      if (dist <= size)
        return from + dist;
      dist -= size;
    }
  }
  function findFraction(structure, pos) {
    let counted = 0;
    for (let {from, to} of structure.ranges) {
      if (pos <= to) {
        counted += pos - from;
        break;
      }
      counted += to - from;
    }
    return counted / structure.total;
  }
  function find(array, f) {
    for (let val of array)
      if (f(val))
        return val;
    return void 0;
  }
  var IdScaler = {
    toDOM(n) {
      return n;
    },
    fromDOM(n) {
      return n;
    },
    scale: 1
  };
  var BigScaler = class {
    constructor(doc2, heightMap, viewports) {
      let vpHeight = 0, base2 = 0, domBase = 0;
      this.viewports = viewports.map(({from, to}) => {
        let top2 = heightMap.lineAt(from, QueryType.ByPos, doc2, 0, 0).top;
        let bottom = heightMap.lineAt(to, QueryType.ByPos, doc2, 0, 0).bottom;
        vpHeight += bottom - top2;
        return {from, to, top: top2, bottom, domTop: 0, domBottom: 0};
      });
      this.scale = (7e6 - vpHeight) / (heightMap.height - vpHeight);
      for (let obj of this.viewports) {
        obj.domTop = domBase + (obj.top - base2) * this.scale;
        domBase = obj.domBottom = obj.domTop + (obj.bottom - obj.top);
        base2 = obj.bottom;
      }
    }
    toDOM(n, top2) {
      n -= top2;
      for (let i = 0, base2 = 0, domBase = 0; ; i++) {
        let vp = i < this.viewports.length ? this.viewports[i] : null;
        if (!vp || n < vp.top)
          return domBase + (n - base2) * this.scale + top2;
        if (n <= vp.bottom)
          return vp.domTop + (n - vp.top) + top2;
        base2 = vp.bottom;
        domBase = vp.domBottom;
      }
    }
    fromDOM(n, top2) {
      n -= top2;
      for (let i = 0, base2 = 0, domBase = 0; ; i++) {
        let vp = i < this.viewports.length ? this.viewports[i] : null;
        if (!vp || n < vp.domTop)
          return base2 + (n - domBase) / this.scale + top2;
        if (n <= vp.domBottom)
          return vp.top + (n - vp.domTop) + top2;
        base2 = vp.bottom;
        domBase = vp.domBottom;
      }
    }
  };
  function scaleBlock(block, scaler, top2) {
    if (scaler.scale == 1)
      return block;
    let bTop = scaler.toDOM(block.top, top2), bBottom = scaler.toDOM(block.bottom, top2);
    return new BlockInfo(block.from, block.length, bTop, bBottom - bTop, Array.isArray(block.type) ? block.type.map((b) => scaleBlock(b, scaler, top2)) : block.type);
  }
  var theme = /* @__PURE__ */ Facet.define({combine: (strs) => strs.join(" ")});
  var darkTheme = /* @__PURE__ */ Facet.define({combine: (values) => values.indexOf(true) > -1});
  var baseThemeID = /* @__PURE__ */ StyleModule.newName();
  var baseLightID = /* @__PURE__ */ StyleModule.newName();
  var baseDarkID = /* @__PURE__ */ StyleModule.newName();
  var lightDarkIDs = {"&light": "." + baseLightID, "&dark": "." + baseDarkID};
  function buildTheme(main, spec, scopes) {
    return new StyleModule(spec, {
      finish(sel) {
        return /&/.test(sel) ? sel.replace(/&\w*/, (m) => {
          if (m == "&")
            return main;
          if (!scopes || !scopes[m])
            throw new RangeError(`Unsupported selector: ${m}`);
          return scopes[m];
        }) : main + " " + sel;
      }
    });
  }
  var baseTheme = /* @__PURE__ */ buildTheme("." + baseThemeID, {
    "&": {
      position: "relative !important",
      boxSizing: "border-box",
      "&.cm-focused": {
        outline: "1px dotted #212121"
      },
      display: "flex !important",
      flexDirection: "column"
    },
    ".cm-scroller": {
      display: "flex !important",
      alignItems: "flex-start !important",
      fontFamily: "monospace",
      lineHeight: 1.4,
      height: "100%",
      overflowX: "auto",
      position: "relative",
      zIndex: 0
    },
    ".cm-content": {
      margin: 0,
      flexGrow: 2,
      minHeight: "100%",
      display: "block",
      whiteSpace: "pre",
      wordWrap: "normal",
      boxSizing: "border-box",
      padding: "4px 0",
      outline: "none"
    },
    ".cm-lineWrapping": {
      whiteSpace: "pre-wrap",
      overflowWrap: "anywhere"
    },
    "&light .cm-content": {caretColor: "black"},
    "&dark .cm-content": {caretColor: "white"},
    ".cm-line": {
      display: "block",
      padding: "0 2px 0 4px"
    },
    ".cm-selectionLayer": {
      zIndex: -1,
      contain: "size style"
    },
    ".cm-selectionBackground": {
      position: "absolute"
    },
    "&light .cm-selectionBackground": {
      background: "#d9d9d9"
    },
    "&dark .cm-selectionBackground": {
      background: "#222"
    },
    "&light.cm-focused .cm-selectionBackground": {
      background: "#d7d4f0"
    },
    "&dark.cm-focused .cm-selectionBackground": {
      background: "#233"
    },
    ".cm-cursorLayer": {
      zIndex: 100,
      contain: "size style",
      pointerEvents: "none"
    },
    "&.cm-focused .cm-cursorLayer": {
      animation: "steps(1) cm-blink 1.2s infinite"
    },
    "@keyframes cm-blink": {"0%": {}, "50%": {visibility: "hidden"}, "100%": {}},
    "@keyframes cm-blink2": {"0%": {}, "50%": {visibility: "hidden"}, "100%": {}},
    ".cm-cursor": {
      position: "absolute",
      borderLeft: "1.2px solid black",
      marginLeft: "-0.6px",
      pointerEvents: "none",
      display: "none"
    },
    "&dark .cm-cursor": {
      borderLeftColor: "#444"
    },
    "&.cm-focused .cm-cursor": {
      display: "block"
    },
    "&light .cm-activeLine": {backgroundColor: "#f3f9ff"},
    "&dark .cm-activeLine": {backgroundColor: "#223039"},
    "&light .cm-specialChar": {color: "red"},
    "&dark .cm-specialChar": {color: "#f78"},
    ".cm-tab": {
      display: "inline-block",
      overflow: "hidden",
      verticalAlign: "bottom"
    },
    ".cm-placeholder": {
      color: "#888",
      display: "inline-block"
    },
    ".cm-button": {
      verticalAlign: "middle",
      color: "inherit",
      fontSize: "70%",
      padding: ".2em 1em",
      borderRadius: "3px"
    },
    "&light .cm-button": {
      backgroundImage: "linear-gradient(#eff1f5, #d9d9df)",
      border: "1px solid #888",
      "&:active": {
        backgroundImage: "linear-gradient(#b4b4b4, #d0d3d6)"
      }
    },
    "&dark .cm-button": {
      backgroundImage: "linear-gradient(#393939, #111)",
      border: "1px solid #888",
      "&:active": {
        backgroundImage: "linear-gradient(#111, #333)"
      }
    },
    ".cm-textfield": {
      verticalAlign: "middle",
      color: "inherit",
      fontSize: "70%",
      border: "1px solid silver",
      padding: ".2em .5em"
    },
    "&light .cm-textfield": {
      backgroundColor: "white"
    },
    "&dark .cm-textfield": {
      border: "1px solid #555",
      backgroundColor: "inherit"
    }
  }, lightDarkIDs);
  var observeOptions = {
    childList: true,
    characterData: true,
    subtree: true,
    characterDataOldValue: true
  };
  var useCharData = browser.ie && browser.ie_version <= 11;
  var DOMObserver = class {
    constructor(view, onChange, onScrollChanged) {
      this.view = view;
      this.onChange = onChange;
      this.onScrollChanged = onScrollChanged;
      this.active = false;
      this.ignoreSelection = new DOMSelection();
      this.delayedFlush = -1;
      this.queue = [];
      this.lastFlush = 0;
      this.scrollTargets = [];
      this.intersection = null;
      this.intersecting = false;
      this._selectionRange = null;
      this.parentCheck = -1;
      this.dom = view.contentDOM;
      this.observer = new MutationObserver((mutations) => {
        for (let mut of mutations)
          this.queue.push(mut);
        this._selectionRange = null;
        if ((browser.ie && browser.ie_version <= 11 || browser.ios && view.composing) && mutations.some((m) => m.type == "childList" && m.removedNodes.length || m.type == "characterData" && m.oldValue.length > m.target.nodeValue.length))
          this.flushSoon();
        else
          this.flush();
      });
      if (useCharData)
        this.onCharData = (event) => {
          this.queue.push({
            target: event.target,
            type: "characterData",
            oldValue: event.prevValue
          });
          this.flushSoon();
        };
      this.onSelectionChange = this.onSelectionChange.bind(this);
      this.start();
      this.onScroll = this.onScroll.bind(this);
      window.addEventListener("scroll", this.onScroll);
      if (typeof IntersectionObserver == "function") {
        this.intersection = new IntersectionObserver((entries) => {
          if (this.parentCheck < 0)
            this.parentCheck = setTimeout(this.listenForScroll.bind(this), 1e3);
          if (entries[entries.length - 1].intersectionRatio > 0 != this.intersecting) {
            this.intersecting = !this.intersecting;
            if (this.intersecting != this.view.inView)
              this.onScrollChanged(document.createEvent("Event"));
          }
        }, {});
        this.intersection.observe(this.dom);
      }
      this.listenForScroll();
    }
    onScroll(e) {
      if (this.intersecting)
        this.flush();
      this.onScrollChanged(e);
    }
    onSelectionChange(event) {
      if (this.lastFlush < Date.now() - 50)
        this._selectionRange = null;
      let {view} = this, sel = this.selectionRange;
      if (view.state.facet(editable) ? view.root.activeElement != this.dom : !hasSelection(view.dom, sel))
        return;
      let context = sel.anchorNode && view.docView.nearest(sel.anchorNode);
      if (context && context.ignoreEvent(event))
        return;
      if (browser.ie && browser.ie_version <= 11 && !view.state.selection.main.empty && sel.focusNode && isEquivalentPosition(sel.focusNode, sel.focusOffset, sel.anchorNode, sel.anchorOffset))
        this.flushSoon();
      else
        this.flush();
    }
    get selectionRange() {
      if (!this._selectionRange) {
        let {root} = this.view, sel = getSelection(root);
        if (browser.safari && root.nodeType == 11 && deepActiveElement() == this.view.contentDOM)
          sel = safariSelectionRangeHack(this.view) || sel;
        this._selectionRange = sel;
      }
      return this._selectionRange;
    }
    setSelectionRange(anchor, head) {
      var _a;
      if (!((_a = this._selectionRange) === null || _a === void 0 ? void 0 : _a.type))
        this._selectionRange = {
          anchorNode: anchor.node,
          anchorOffset: anchor.offset,
          focusNode: head.node,
          focusOffset: head.offset
        };
    }
    listenForScroll() {
      this.parentCheck = -1;
      let i = 0, changed = null;
      for (let dom = this.dom; dom; ) {
        if (dom.nodeType == 1) {
          if (!changed && i < this.scrollTargets.length && this.scrollTargets[i] == dom)
            i++;
          else if (!changed)
            changed = this.scrollTargets.slice(0, i);
          if (changed)
            changed.push(dom);
          dom = dom.assignedSlot || dom.parentNode;
        } else if (dom.nodeType == 11) {
          dom = dom.host;
        } else {
          break;
        }
      }
      if (i < this.scrollTargets.length && !changed)
        changed = this.scrollTargets.slice(0, i);
      if (changed) {
        for (let dom of this.scrollTargets)
          dom.removeEventListener("scroll", this.onScroll);
        for (let dom of this.scrollTargets = changed)
          dom.addEventListener("scroll", this.onScroll);
      }
    }
    ignore(f) {
      if (!this.active)
        return f();
      try {
        this.stop();
        return f();
      } finally {
        this.start();
        this.clear();
      }
    }
    start() {
      if (this.active)
        return;
      this.observer.observe(this.dom, observeOptions);
      this.dom.ownerDocument.addEventListener("selectionchange", this.onSelectionChange);
      if (useCharData)
        this.dom.addEventListener("DOMCharacterDataModified", this.onCharData);
      this.active = true;
    }
    stop() {
      if (!this.active)
        return;
      this.active = false;
      this.observer.disconnect();
      this.dom.ownerDocument.removeEventListener("selectionchange", this.onSelectionChange);
      if (useCharData)
        this.dom.removeEventListener("DOMCharacterDataModified", this.onCharData);
    }
    clearSelection() {
      this.ignoreSelection.set(this.selectionRange);
    }
    clear() {
      this.observer.takeRecords();
      this.queue.length = 0;
      this.clearSelection();
    }
    flushSoon() {
      if (this.delayedFlush < 0)
        this.delayedFlush = window.setTimeout(() => {
          this.delayedFlush = -1;
          this.flush();
        }, 20);
    }
    forceFlush() {
      if (this.delayedFlush >= 0) {
        window.clearTimeout(this.delayedFlush);
        this.delayedFlush = -1;
        this.flush();
      }
    }
    flush() {
      if (this.delayedFlush >= 0)
        return;
      this.lastFlush = Date.now();
      let records = this.queue;
      for (let mut of this.observer.takeRecords())
        records.push(mut);
      if (records.length)
        this.queue = [];
      let selection = this.selectionRange;
      let newSel = !this.ignoreSelection.eq(selection) && hasSelection(this.dom, selection);
      if (records.length == 0 && !newSel)
        return;
      let from = -1, to = -1, typeOver = false;
      for (let record of records) {
        let range = this.readMutation(record);
        if (!range)
          continue;
        if (range.typeOver)
          typeOver = true;
        if (from == -1) {
          ({from, to} = range);
        } else {
          from = Math.min(range.from, from);
          to = Math.max(range.to, to);
        }
      }
      let startState = this.view.state;
      if (from > -1 || newSel)
        this.onChange(from, to, typeOver);
      if (this.view.state == startState) {
        if (this.view.docView.dirty) {
          this.ignore(() => this.view.docView.sync());
          this.view.docView.dirty = 0;
        }
        this.view.docView.updateSelection();
      }
      this.clearSelection();
    }
    readMutation(rec) {
      let cView = this.view.docView.nearest(rec.target);
      if (!cView || cView.ignoreMutation(rec))
        return null;
      cView.markDirty();
      if (rec.type == "childList") {
        let childBefore = findChild(cView, rec.previousSibling || rec.target.previousSibling, -1);
        let childAfter = findChild(cView, rec.nextSibling || rec.target.nextSibling, 1);
        return {
          from: childBefore ? cView.posAfter(childBefore) : cView.posAtStart,
          to: childAfter ? cView.posBefore(childAfter) : cView.posAtEnd,
          typeOver: false
        };
      } else {
        return {from: cView.posAtStart, to: cView.posAtEnd, typeOver: rec.target.nodeValue == rec.oldValue};
      }
    }
    destroy() {
      this.stop();
      if (this.intersection)
        this.intersection.disconnect();
      for (let dom of this.scrollTargets)
        dom.removeEventListener("scroll", this.onScroll);
      window.removeEventListener("scroll", this.onScroll);
      clearTimeout(this.parentCheck);
    }
  };
  function findChild(cView, dom, dir) {
    while (dom) {
      let curView = ContentView.get(dom);
      if (curView && curView.parent == cView)
        return curView;
      let parent = dom.parentNode;
      dom = parent != cView.dom ? parent : dir > 0 ? dom.nextSibling : dom.previousSibling;
    }
    return null;
  }
  function safariSelectionRangeHack(view) {
    let found = null;
    function read(event) {
      event.preventDefault();
      event.stopImmediatePropagation();
      found = event.getTargetRanges()[0];
    }
    view.contentDOM.addEventListener("beforeinput", read, true);
    document.execCommand("indent");
    view.contentDOM.removeEventListener("beforeinput", read, true);
    if (!found)
      return null;
    let anchorNode = found.startContainer, anchorOffset = found.startOffset;
    let focusNode = found.endContainer, focusOffset = found.endOffset;
    let curAnchor = view.docView.domAtPos(view.state.selection.main.anchor);
    if (isEquivalentPosition(curAnchor.node, curAnchor.offset, focusNode, focusOffset))
      [anchorNode, anchorOffset, focusNode, focusOffset] = [focusNode, focusOffset, anchorNode, anchorOffset];
    return {anchorNode, anchorOffset, focusNode, focusOffset};
  }
  function applyDOMChange(view, start, end, typeOver) {
    let change, newSel;
    let sel = view.state.selection.main, bounds;
    if (start > -1 && (bounds = view.docView.domBoundsAround(start, end, 0))) {
      let {from, to} = bounds;
      let selPoints = view.docView.impreciseHead || view.docView.impreciseAnchor ? [] : selectionPoints(view);
      let reader = new DOMReader(selPoints, view);
      reader.readRange(bounds.startDOM, bounds.endDOM);
      newSel = selectionFromPoints(selPoints, from);
      let preferredPos = sel.from, preferredSide = null;
      if (view.inputState.lastKeyCode === 8 && view.inputState.lastKeyTime > Date.now() - 100 || browser.android && reader.text.length < to - from) {
        preferredPos = sel.to;
        preferredSide = "end";
      }
      let diff = findDiff(view.state.sliceDoc(from, to), reader.text, preferredPos - from, preferredSide);
      if (diff)
        change = {
          from: from + diff.from,
          to: from + diff.toA,
          insert: view.state.toText(reader.text.slice(diff.from, diff.toB))
        };
    } else if (view.hasFocus || !view.state.facet(editable)) {
      let domSel = view.observer.selectionRange;
      let {impreciseHead: iHead, impreciseAnchor: iAnchor} = view.docView;
      let head = iHead && iHead.node == domSel.focusNode && iHead.offset == domSel.focusOffset || !contains(view.contentDOM, domSel.focusNode) ? view.state.selection.main.head : view.docView.posFromDOM(domSel.focusNode, domSel.focusOffset);
      let anchor = iAnchor && iAnchor.node == domSel.anchorNode && iAnchor.offset == domSel.anchorOffset || !contains(view.contentDOM, domSel.anchorNode) ? view.state.selection.main.anchor : view.docView.posFromDOM(domSel.anchorNode, domSel.anchorOffset);
      if (head != sel.head || anchor != sel.anchor)
        newSel = EditorSelection.single(anchor, head);
    }
    if (!change && !newSel)
      return;
    if (!change && typeOver && !sel.empty && newSel && newSel.main.empty)
      change = {from: sel.from, to: sel.to, insert: view.state.doc.slice(sel.from, sel.to)};
    else if (change && change.from >= sel.from && change.to <= sel.to && (change.from != sel.from || change.to != sel.to) && sel.to - sel.from - (change.to - change.from) <= 4)
      change = {
        from: sel.from,
        to: sel.to,
        insert: view.state.doc.slice(sel.from, change.from).append(change.insert).append(view.state.doc.slice(change.to, sel.to))
      };
    if (change) {
      let startState = view.state;
      if (browser.android && (change.from == sel.from && change.to == sel.to && change.insert.length == 1 && change.insert.lines == 2 && dispatchKey(view, "Enter", 13) || change.from == sel.from - 1 && change.to == sel.to && change.insert.length == 0 && dispatchKey(view, "Backspace", 8) || change.from == sel.from && change.to == sel.to + 1 && change.insert.length == 0 && dispatchKey(view, "Delete", 46)) || browser.ios && (view.inputState.lastIOSEnter > Date.now() - 225 && change.insert.lines > 1 && dispatchKey(view, "Enter", 13) || view.inputState.lastIOSBackspace > Date.now() - 225 && !change.insert.length && dispatchKey(view, "Backspace", 8)))
        return;
      let text = change.insert.toString();
      if (view.state.facet(inputHandler).some((h) => h(view, change.from, change.to, text)))
        return;
      if (view.inputState.composing >= 0)
        view.inputState.composing++;
      let tr;
      if (change.from >= sel.from && change.to <= sel.to && change.to - change.from >= (sel.to - sel.from) / 3 && (!newSel || newSel.main.empty && newSel.main.from == change.from + change.insert.length)) {
        let before = sel.from < change.from ? startState.sliceDoc(sel.from, change.from) : "";
        let after = sel.to > change.to ? startState.sliceDoc(change.to, sel.to) : "";
        tr = startState.replaceSelection(view.state.toText(before + change.insert.sliceString(0, void 0, view.state.lineBreak) + after));
      } else {
        let changes = startState.changes(change);
        tr = {
          changes,
          selection: newSel && !startState.selection.main.eq(newSel.main) && newSel.main.to <= changes.newLength ? startState.selection.replaceRange(newSel.main) : void 0
        };
      }
      view.dispatch(tr, {scrollIntoView: true, annotations: Transaction.userEvent.of("input")});
    } else if (newSel && !newSel.main.eq(sel)) {
      let scrollIntoView = false, annotations;
      if (view.inputState.lastSelectionTime > Date.now() - 50) {
        if (view.inputState.lastSelectionOrigin == "keyboardselection")
          scrollIntoView = true;
        else
          annotations = Transaction.userEvent.of(view.inputState.lastSelectionOrigin);
      }
      view.dispatch({selection: newSel, scrollIntoView, annotations});
    }
  }
  function findDiff(a, b, preferredPos, preferredSide) {
    let minLen = Math.min(a.length, b.length);
    let from = 0;
    while (from < minLen && a.charCodeAt(from) == b.charCodeAt(from))
      from++;
    if (from == minLen && a.length == b.length)
      return null;
    let toA = a.length, toB = b.length;
    while (toA > 0 && toB > 0 && a.charCodeAt(toA - 1) == b.charCodeAt(toB - 1)) {
      toA--;
      toB--;
    }
    if (preferredSide == "end") {
      let adjust = Math.max(0, from - Math.min(toA, toB));
      preferredPos -= toA + adjust - from;
    }
    if (toA < from && a.length < b.length) {
      let move = preferredPos <= from && preferredPos >= toA ? from - preferredPos : 0;
      from -= move;
      toB = from + (toB - toA);
      toA = from;
    } else if (toB < from) {
      let move = preferredPos <= from && preferredPos >= toB ? from - preferredPos : 0;
      from -= move;
      toA = from + (toA - toB);
      toB = from;
    }
    return {from, toA, toB};
  }
  var DOMReader = class {
    constructor(points, view) {
      this.points = points;
      this.view = view;
      this.text = "";
      this.lineBreak = view.state.lineBreak;
    }
    readRange(start, end) {
      if (!start)
        return;
      let parent = start.parentNode;
      for (let cur = start; ; ) {
        this.findPointBefore(parent, cur);
        this.readNode(cur);
        let next2 = cur.nextSibling;
        if (next2 == end)
          break;
        let view = ContentView.get(cur), nextView = ContentView.get(next2);
        if ((view ? view.breakAfter : isBlockElement(cur)) || (nextView ? nextView.breakAfter : isBlockElement(next2)) && !(cur.nodeName == "BR" && !cur.cmIgnore))
          this.text += this.lineBreak;
        cur = next2;
      }
      this.findPointBefore(parent, end);
    }
    readNode(node) {
      if (node.cmIgnore)
        return;
      let view = ContentView.get(node);
      let fromView = view && view.overrideDOMText;
      let text;
      if (fromView != null)
        text = fromView.sliceString(0, void 0, this.lineBreak);
      else if (node.nodeType == 3)
        text = node.nodeValue;
      else if (node.nodeName == "BR")
        text = node.nextSibling ? this.lineBreak : "";
      else if (node.nodeType == 1)
        this.readRange(node.firstChild, null);
      if (text != null) {
        this.findPointIn(node, text.length);
        this.text += text;
        if (browser.chrome && this.view.inputState.lastKeyCode == 13 && !node.nextSibling && /\n\n$/.test(this.text))
          this.text = this.text.slice(0, -1);
      }
    }
    findPointBefore(node, next2) {
      for (let point of this.points)
        if (point.node == node && node.childNodes[point.offset] == next2)
          point.pos = this.text.length;
    }
    findPointIn(node, maxLen) {
      for (let point of this.points)
        if (point.node == node)
          point.pos = this.text.length + Math.min(point.offset, maxLen);
    }
  };
  function isBlockElement(node) {
    return node.nodeType == 1 && /^(DIV|P|LI|UL|OL|BLOCKQUOTE|DD|DT|H\d|SECTION|PRE)$/.test(node.nodeName);
  }
  var DOMPoint = class {
    constructor(node, offset) {
      this.node = node;
      this.offset = offset;
      this.pos = -1;
    }
  };
  function selectionPoints(view) {
    let result = [];
    if (view.root.activeElement != view.contentDOM)
      return result;
    let {anchorNode, anchorOffset, focusNode, focusOffset} = view.observer.selectionRange;
    if (anchorNode) {
      result.push(new DOMPoint(anchorNode, anchorOffset));
      if (focusNode != anchorNode || focusOffset != anchorOffset)
        result.push(new DOMPoint(focusNode, focusOffset));
    }
    return result;
  }
  function selectionFromPoints(points, base2) {
    if (points.length == 0)
      return null;
    let anchor = points[0].pos, head = points.length == 2 ? points[1].pos : anchor;
    return anchor > -1 && head > -1 ? EditorSelection.single(anchor + base2, head + base2) : null;
  }
  function dispatchKey(view, name2, code) {
    let options = {key: name2, code: name2, keyCode: code, which: code, cancelable: true};
    let down = new KeyboardEvent("keydown", options);
    down.synthetic = true;
    view.contentDOM.dispatchEvent(down);
    let up = new KeyboardEvent("keyup", options);
    up.synthetic = true;
    view.contentDOM.dispatchEvent(up);
    return down.defaultPrevented || up.defaultPrevented;
  }
  var EditorView = class {
    constructor(config2 = {}) {
      this.plugins = [];
      this.editorAttrs = {};
      this.contentAttrs = {};
      this.bidiCache = [];
      this.updateState = 2;
      this.measureScheduled = -1;
      this.measureRequests = [];
      this.contentDOM = document.createElement("div");
      this.scrollDOM = document.createElement("div");
      this.scrollDOM.tabIndex = -1;
      this.scrollDOM.className = "cm-scroller";
      this.scrollDOM.appendChild(this.contentDOM);
      this.announceDOM = document.createElement("div");
      this.announceDOM.style.cssText = "position: absolute; top: -10000px";
      this.announceDOM.setAttribute("aria-live", "polite");
      this.dom = document.createElement("div");
      this.dom.appendChild(this.announceDOM);
      this.dom.appendChild(this.scrollDOM);
      this._dispatch = config2.dispatch || ((tr) => this.update([tr]));
      this.dispatch = this.dispatch.bind(this);
      this.root = config2.root || document;
      this.viewState = new ViewState(config2.state || EditorState.create());
      this.plugins = this.state.facet(viewPlugin).map((spec) => new PluginInstance(spec).update(this));
      this.observer = new DOMObserver(this, (from, to, typeOver) => {
        applyDOMChange(this, from, to, typeOver);
      }, (event) => {
        this.inputState.runScrollHandlers(this, event);
        if (this.observer.intersecting)
          this.measure();
      });
      this.inputState = new InputState(this);
      this.docView = new DocView(this);
      this.mountStyles();
      this.updateAttrs();
      this.updateState = 0;
      ensureGlobalHandler();
      this.requestMeasure();
      if (config2.parent)
        config2.parent.appendChild(this.dom);
    }
    get state() {
      return this.viewState.state;
    }
    get viewport() {
      return this.viewState.viewport;
    }
    get visibleRanges() {
      return this.viewState.visibleRanges;
    }
    get inView() {
      return this.viewState.inView;
    }
    get composing() {
      return this.inputState.composing > 0;
    }
    dispatch(...input) {
      this._dispatch(input.length == 1 && input[0] instanceof Transaction ? input[0] : this.state.update(...input));
    }
    update(transactions) {
      if (this.updateState != 0)
        throw new Error("Calls to EditorView.update are not allowed while an update is in progress");
      let redrawn = false, update;
      let state = this.state;
      for (let tr of transactions) {
        if (tr.startState != state)
          throw new RangeError("Trying to update state with a transaction that doesn't start from the previous state.");
        state = tr.state;
      }
      if (state.facet(EditorState.phrases) != this.state.facet(EditorState.phrases))
        return this.setState(state);
      update = new ViewUpdate(this, state, transactions);
      try {
        this.updateState = 2;
        let scrollTo2 = transactions.some((tr) => tr.scrollIntoView) ? state.selection.main : null;
        this.viewState.update(update, scrollTo2);
        this.bidiCache = CachedOrder.update(this.bidiCache, update.changes);
        if (!update.empty)
          this.updatePlugins(update);
        redrawn = this.docView.update(update);
        if (this.state.facet(styleModule) != this.styleModules)
          this.mountStyles();
        this.updateAttrs();
        this.showAnnouncements(transactions);
      } finally {
        this.updateState = 0;
      }
      if (redrawn || scrollTo || this.viewState.mustEnforceCursorAssoc)
        this.requestMeasure();
      if (!update.empty)
        for (let listener of this.state.facet(updateListener))
          listener(update);
    }
    setState(newState) {
      if (this.updateState != 0)
        throw new Error("Calls to EditorView.setState are not allowed while an update is in progress");
      this.updateState = 2;
      try {
        for (let plugin of this.plugins)
          plugin.destroy(this);
        this.viewState = new ViewState(newState);
        this.plugins = newState.facet(viewPlugin).map((spec) => new PluginInstance(spec).update(this));
        this.docView = new DocView(this);
        this.inputState.ensureHandlers(this);
        this.mountStyles();
        this.updateAttrs();
        this.bidiCache = [];
      } finally {
        this.updateState = 0;
      }
      this.requestMeasure();
    }
    updatePlugins(update) {
      let prevSpecs = update.startState.facet(viewPlugin), specs = update.state.facet(viewPlugin);
      if (prevSpecs != specs) {
        let newPlugins = [];
        for (let spec of specs) {
          let found = prevSpecs.indexOf(spec);
          if (found < 0) {
            newPlugins.push(new PluginInstance(spec));
          } else {
            let plugin = this.plugins[found];
            plugin.mustUpdate = update;
            newPlugins.push(plugin);
          }
        }
        for (let plugin of this.plugins)
          if (plugin.mustUpdate != update)
            plugin.destroy(this);
        this.plugins = newPlugins;
        this.inputState.ensureHandlers(this);
      } else {
        for (let p of this.plugins)
          p.mustUpdate = update;
      }
      for (let i = 0; i < this.plugins.length; i++)
        this.plugins[i] = this.plugins[i].update(this);
    }
    measure() {
      if (this.measureScheduled > -1)
        cancelAnimationFrame(this.measureScheduled);
      this.measureScheduled = -1;
      let updated = null;
      try {
        for (let i = 0; ; i++) {
          this.updateState = 1;
          let changed = this.viewState.measure(this.docView, i > 0);
          let measuring = this.measureRequests;
          if (!changed && !measuring.length && this.viewState.scrollTo == null)
            break;
          this.measureRequests = [];
          if (i > 5) {
            console.warn("Viewport failed to stabilize");
            break;
          }
          let measured = measuring.map((m) => {
            try {
              return m.read(this);
            } catch (e) {
              logException(this.state, e);
              return BadMeasure;
            }
          });
          let update = new ViewUpdate(this, this.state);
          update.flags |= changed;
          if (!updated)
            updated = update;
          else
            updated.flags |= changed;
          this.updateState = 2;
          if (!update.empty)
            this.updatePlugins(update);
          this.updateAttrs();
          if (changed)
            this.docView.update(update);
          for (let i2 = 0; i2 < measuring.length; i2++)
            if (measured[i2] != BadMeasure) {
              try {
                measuring[i2].write(measured[i2], this);
              } catch (e) {
                logException(this.state, e);
              }
            }
          if (this.viewState.scrollTo) {
            this.docView.scrollPosIntoView(this.viewState.scrollTo.head, this.viewState.scrollTo.assoc);
            this.viewState.scrollTo = null;
          }
          if (!(changed & 4) && this.measureRequests.length == 0)
            break;
        }
      } finally {
        this.updateState = 0;
      }
      this.measureScheduled = -1;
      if (updated && !updated.empty)
        for (let listener of this.state.facet(updateListener))
          listener(updated);
    }
    get themeClasses() {
      return baseThemeID + " " + (this.state.facet(darkTheme) ? baseDarkID : baseLightID) + " " + this.state.facet(theme);
    }
    updateAttrs() {
      let editorAttrs = combineAttrs(this.state.facet(editorAttributes), {
        class: "cm-editor cm-wrap" + (this.hasFocus ? " cm-focused " : " ") + this.themeClasses
      });
      updateAttrs(this.dom, this.editorAttrs, editorAttrs);
      this.editorAttrs = editorAttrs;
      let contentAttrs = combineAttrs(this.state.facet(contentAttributes), {
        spellcheck: "false",
        autocorrect: "off",
        autocapitalize: "off",
        contenteditable: String(this.state.facet(editable)),
        "data-gramm": "false",
        class: "cm-content",
        style: `${browser.tabSize}: ${this.state.tabSize}`,
        role: "textbox",
        "aria-multiline": "true"
      });
      updateAttrs(this.contentDOM, this.contentAttrs, contentAttrs);
      this.contentAttrs = contentAttrs;
    }
    showAnnouncements(trs) {
      let first = true;
      for (let tr of trs)
        for (let effect of tr.effects)
          if (effect.is(EditorView.announce)) {
            if (first)
              this.announceDOM.textContent = "";
            first = false;
            let div = this.announceDOM.appendChild(document.createElement("div"));
            div.textContent = effect.value;
          }
    }
    mountStyles() {
      this.styleModules = this.state.facet(styleModule);
      StyleModule.mount(this.root, this.styleModules.concat(baseTheme).reverse());
    }
    readMeasured() {
      if (this.updateState == 2)
        throw new Error("Reading the editor layout isn't allowed during an update");
      if (this.updateState == 0 && this.measureScheduled > -1)
        this.measure();
    }
    requestMeasure(request) {
      if (this.measureScheduled < 0)
        this.measureScheduled = requestAnimationFrame(() => this.measure());
      if (request) {
        if (request.key != null)
          for (let i = 0; i < this.measureRequests.length; i++) {
            if (this.measureRequests[i].key === request.key) {
              this.measureRequests[i] = request;
              return;
            }
          }
        this.measureRequests.push(request);
      }
    }
    pluginField(field) {
      let result = [];
      for (let plugin of this.plugins)
        plugin.update(this).takeField(field, result);
      return result;
    }
    plugin(plugin) {
      for (let inst of this.plugins)
        if (inst.spec == plugin)
          return inst.update(this).value;
      return null;
    }
    blockAtHeight(height, docTop) {
      this.readMeasured();
      return this.viewState.blockAtHeight(height, ensureTop(docTop, this.contentDOM));
    }
    visualLineAtHeight(height, docTop) {
      this.readMeasured();
      return this.viewState.lineAtHeight(height, ensureTop(docTop, this.contentDOM));
    }
    viewportLines(f, docTop) {
      let {from, to} = this.viewport;
      this.viewState.forEachLine(from, to, f, ensureTop(docTop, this.contentDOM));
    }
    visualLineAt(pos, docTop = 0) {
      return this.viewState.lineAt(pos, docTop);
    }
    get contentHeight() {
      return this.viewState.contentHeight;
    }
    moveByChar(start, forward, by) {
      return moveByChar(this, start, forward, by);
    }
    moveByGroup(start, forward) {
      return moveByChar(this, start, forward, (initial) => byGroup(this, start.head, initial));
    }
    moveToLineBoundary(start, forward, includeWrap = true) {
      return moveToLineBoundary(this, start, forward, includeWrap);
    }
    moveVertically(start, forward, distance) {
      return moveVertically(this, start, forward, distance);
    }
    scrollPosIntoView(pos) {
      this.viewState.scrollTo = EditorSelection.cursor(pos);
      this.requestMeasure();
    }
    domAtPos(pos) {
      return this.docView.domAtPos(pos);
    }
    posAtDOM(node, offset = 0) {
      return this.docView.posFromDOM(node, offset);
    }
    posAtCoords(coords) {
      this.readMeasured();
      return posAtCoords(this, coords);
    }
    coordsAtPos(pos, side = 1) {
      this.readMeasured();
      let rect = this.docView.coordsAt(pos, side);
      if (!rect || rect.left == rect.right)
        return rect;
      let line = this.state.doc.lineAt(pos), order = this.bidiSpans(line);
      let span = order[BidiSpan.find(order, pos - line.from, -1, side)];
      return flattenRect(rect, span.dir == Direction.LTR == side > 0);
    }
    get defaultCharacterWidth() {
      return this.viewState.heightOracle.charWidth;
    }
    get defaultLineHeight() {
      return this.viewState.heightOracle.lineHeight;
    }
    get textDirection() {
      return this.viewState.heightOracle.direction;
    }
    get lineWrapping() {
      return this.viewState.heightOracle.lineWrapping;
    }
    bidiSpans(line) {
      if (line.length > MaxBidiLine)
        return trivialOrder(line.length);
      let dir = this.textDirection;
      for (let entry of this.bidiCache)
        if (entry.from == line.from && entry.dir == dir)
          return entry.order;
      let order = computeOrder(line.text, this.textDirection);
      this.bidiCache.push(new CachedOrder(line.from, line.to, dir, order));
      return order;
    }
    get hasFocus() {
      var _a;
      return (document.hasFocus() || browser.safari && ((_a = this.inputState) === null || _a === void 0 ? void 0 : _a.lastContextMenu) > Date.now() - 3e4) && this.root.activeElement == this.contentDOM;
    }
    focus() {
      this.observer.ignore(() => {
        focusPreventScroll(this.contentDOM);
        this.docView.updateSelection();
      });
    }
    destroy() {
      for (let plugin of this.plugins)
        plugin.destroy(this);
      this.inputState.destroy();
      this.dom.remove();
      this.observer.destroy();
      if (this.measureScheduled > -1)
        cancelAnimationFrame(this.measureScheduled);
    }
    static domEventHandlers(handlers2) {
      return ViewPlugin.define(() => ({}), {eventHandlers: handlers2});
    }
    static theme(spec, options) {
      let prefix = StyleModule.newName();
      let result = [theme.of(prefix), styleModule.of(buildTheme(`.${prefix}`, spec))];
      if (options && options.dark)
        result.push(darkTheme.of(true));
      return result;
    }
    static baseTheme(spec) {
      return Prec.fallback(styleModule.of(buildTheme("." + baseThemeID, spec, lightDarkIDs)));
    }
  };
  EditorView.styleModule = styleModule;
  EditorView.inputHandler = inputHandler;
  EditorView.exceptionSink = exceptionSink;
  EditorView.updateListener = updateListener;
  EditorView.editable = editable;
  EditorView.mouseSelectionStyle = mouseSelectionStyle;
  EditorView.dragMovesSelection = dragMovesSelection$1;
  EditorView.clickAddsSelectionRange = clickAddsSelectionRange;
  EditorView.decorations = decorations;
  EditorView.contentAttributes = contentAttributes;
  EditorView.editorAttributes = editorAttributes;
  EditorView.lineWrapping = /* @__PURE__ */ EditorView.contentAttributes.of({class: "cm-lineWrapping"});
  EditorView.announce = /* @__PURE__ */ StateEffect.define();
  var MaxBidiLine = 4096;
  function ensureTop(given, dom) {
    return given == null ? dom.getBoundingClientRect().top : given;
  }
  var resizeDebounce = -1;
  function ensureGlobalHandler() {
    window.addEventListener("resize", () => {
      if (resizeDebounce == -1)
        resizeDebounce = setTimeout(handleResize, 50);
    });
  }
  function handleResize() {
    resizeDebounce = -1;
    let found = document.querySelectorAll(".cm-content");
    for (let i = 0; i < found.length; i++) {
      let docView = ContentView.get(found[i]);
      if (docView)
        docView.editorView.requestMeasure();
    }
  }
  var BadMeasure = {};
  var CachedOrder = class {
    constructor(from, to, dir, order) {
      this.from = from;
      this.to = to;
      this.dir = dir;
      this.order = order;
    }
    static update(cache, changes) {
      if (changes.empty)
        return cache;
      let result = [], lastDir = cache.length ? cache[cache.length - 1].dir : Direction.LTR;
      for (let i = Math.max(0, cache.length - 10); i < cache.length; i++) {
        let entry = cache[i];
        if (entry.dir == lastDir && !changes.touchesRange(entry.from, entry.to))
          result.push(new CachedOrder(changes.mapPos(entry.from, 1), changes.mapPos(entry.to, -1), entry.dir, entry.order));
      }
      return result;
    }
  };
  var currentPlatform = typeof navigator == "undefined" ? "key" : /* @__PURE__ */ /Mac/.test(navigator.platform) ? "mac" : /* @__PURE__ */ /Win/.test(navigator.platform) ? "win" : /* @__PURE__ */ /Linux|X11/.test(navigator.platform) ? "linux" : "key";
  function normalizeKeyName(name2, platform) {
    const parts = name2.split(/-(?!$)/);
    let result = parts[parts.length - 1];
    if (result == "Space")
      result = " ";
    let alt, ctrl, shift2, meta2;
    for (let i = 0; i < parts.length - 1; ++i) {
      const mod = parts[i];
      if (/^(cmd|meta|m)$/i.test(mod))
        meta2 = true;
      else if (/^a(lt)?$/i.test(mod))
        alt = true;
      else if (/^(c|ctrl|control)$/i.test(mod))
        ctrl = true;
      else if (/^s(hift)?$/i.test(mod))
        shift2 = true;
      else if (/^mod$/i.test(mod)) {
        if (platform == "mac")
          meta2 = true;
        else
          ctrl = true;
      } else
        throw new Error("Unrecognized modifier name: " + mod);
    }
    if (alt)
      result = "Alt-" + result;
    if (ctrl)
      result = "Ctrl-" + result;
    if (meta2)
      result = "Meta-" + result;
    if (shift2)
      result = "Shift-" + result;
    return result;
  }
  function modifiers(name2, event, shift2) {
    if (event.altKey)
      name2 = "Alt-" + name2;
    if (event.ctrlKey)
      name2 = "Ctrl-" + name2;
    if (event.metaKey)
      name2 = "Meta-" + name2;
    if (shift2 !== false && event.shiftKey)
      name2 = "Shift-" + name2;
    return name2;
  }
  var handleKeyEvents = /* @__PURE__ */ EditorView.domEventHandlers({
    keydown(event, view) {
      return runHandlers(getKeymap(view.state), event, view, "editor");
    }
  });
  var keymap = /* @__PURE__ */ Facet.define({enables: handleKeyEvents});
  var Keymaps = /* @__PURE__ */ new WeakMap();
  function getKeymap(state) {
    let bindings = state.facet(keymap);
    let map = Keymaps.get(bindings);
    if (!map)
      Keymaps.set(bindings, map = buildKeymap(bindings.reduce((a, b) => a.concat(b), [])));
    return map;
  }
  var storedPrefix = null;
  var PrefixTimeout = 4e3;
  function buildKeymap(bindings, platform = currentPlatform) {
    let bound = Object.create(null);
    let isPrefix = Object.create(null);
    let checkPrefix = (name2, is) => {
      let current = isPrefix[name2];
      if (current == null)
        isPrefix[name2] = is;
      else if (current != is)
        throw new Error("Key binding " + name2 + " is used both as a regular binding and as a multi-stroke prefix");
    };
    let add = (scope, key, command, preventDefault) => {
      let scopeObj = bound[scope] || (bound[scope] = Object.create(null));
      let parts = key.split(/ (?!$)/).map((k) => normalizeKeyName(k, platform));
      for (let i = 1; i < parts.length; i++) {
        let prefix = parts.slice(0, i).join(" ");
        checkPrefix(prefix, true);
        if (!scopeObj[prefix])
          scopeObj[prefix] = {
            preventDefault: true,
            commands: [(view) => {
              let ourObj = storedPrefix = {view, prefix, scope};
              setTimeout(() => {
                if (storedPrefix == ourObj)
                  storedPrefix = null;
              }, PrefixTimeout);
              return true;
            }]
          };
      }
      let full = parts.join(" ");
      checkPrefix(full, false);
      let binding = scopeObj[full] || (scopeObj[full] = {preventDefault: false, commands: []});
      binding.commands.push(command);
      if (preventDefault)
        binding.preventDefault = true;
    };
    for (let b of bindings) {
      let name2 = b[platform] || b.key;
      if (!name2)
        continue;
      for (let scope of b.scope ? b.scope.split(" ") : ["editor"]) {
        add(scope, name2, b.run, b.preventDefault);
        if (b.shift)
          add(scope, "Shift-" + name2, b.shift, b.preventDefault);
      }
    }
    return bound;
  }
  function runHandlers(map, event, view, scope) {
    let name2 = keyName(event), isChar = name2.length == 1 && name2 != " ";
    let prefix = "", fallthrough = false;
    if (storedPrefix && storedPrefix.view == view && storedPrefix.scope == scope) {
      prefix = storedPrefix.prefix + " ";
      if (fallthrough = modifierCodes.indexOf(event.keyCode) < 0)
        storedPrefix = null;
    }
    let runFor = (binding) => {
      if (binding) {
        for (let cmd2 of binding.commands)
          if (cmd2(view))
            return true;
        if (binding.preventDefault)
          fallthrough = true;
      }
      return false;
    };
    let scopeObj = map[scope], baseName;
    if (scopeObj) {
      if (runFor(scopeObj[prefix + modifiers(name2, event, !isChar)]))
        return true;
      if (isChar && (event.shiftKey || event.altKey || event.metaKey) && (baseName = base[event.keyCode]) && baseName != name2) {
        if (runFor(scopeObj[prefix + modifiers(baseName, event, true)]))
          return true;
      } else if (isChar && event.shiftKey) {
        if (runFor(scopeObj[prefix + modifiers(name2, event, true)]))
          return true;
      }
    }
    return fallthrough;
  }
  var CanHidePrimary = !browser.ios;
  var themeSpec = {
    ".cm-line": {
      "& ::selection": {backgroundColor: "transparent !important"},
      "&::selection": {backgroundColor: "transparent !important"}
    }
  };
  if (CanHidePrimary)
    themeSpec[".cm-line"].caretColor = "transparent !important";
  var UnicodeRegexpSupport = /x/.unicode != null ? "gu" : "g";

  // node_modules/lezer-tree/dist/tree.es.js
  var DefaultBufferLength = 1024;
  var nextPropID = 0;
  var CachedNode = new WeakMap();
  var NodeProp = class {
    constructor({deserialize} = {}) {
      this.id = nextPropID++;
      this.deserialize = deserialize || (() => {
        throw new Error("This node type doesn't define a deserialize function");
      });
    }
    static string() {
      return new NodeProp({deserialize: (str) => str});
    }
    static number() {
      return new NodeProp({deserialize: Number});
    }
    static flag() {
      return new NodeProp({deserialize: () => true});
    }
    set(propObj, value) {
      propObj[this.id] = value;
      return propObj;
    }
    add(match2) {
      if (typeof match2 != "function")
        match2 = NodeType.match(match2);
      return (type) => {
        let result = match2(type);
        return result === void 0 ? null : [this, result];
      };
    }
  };
  NodeProp.closedBy = new NodeProp({deserialize: (str) => str.split(" ")});
  NodeProp.openedBy = new NodeProp({deserialize: (str) => str.split(" ")});
  NodeProp.group = new NodeProp({deserialize: (str) => str.split(" ")});
  var noProps = Object.create(null);
  var NodeType = class {
    constructor(name2, props, id, flags = 0) {
      this.name = name2;
      this.props = props;
      this.id = id;
      this.flags = flags;
    }
    static define(spec) {
      let props = spec.props && spec.props.length ? Object.create(null) : noProps;
      let flags = (spec.top ? 1 : 0) | (spec.skipped ? 2 : 0) | (spec.error ? 4 : 0) | (spec.name == null ? 8 : 0);
      let type = new NodeType(spec.name || "", props, spec.id, flags);
      if (spec.props)
        for (let src of spec.props) {
          if (!Array.isArray(src))
            src = src(type);
          if (src)
            src[0].set(props, src[1]);
        }
      return type;
    }
    prop(prop) {
      return this.props[prop.id];
    }
    get isTop() {
      return (this.flags & 1) > 0;
    }
    get isSkipped() {
      return (this.flags & 2) > 0;
    }
    get isError() {
      return (this.flags & 4) > 0;
    }
    get isAnonymous() {
      return (this.flags & 8) > 0;
    }
    is(name2) {
      if (typeof name2 == "string") {
        if (this.name == name2)
          return true;
        let group = this.prop(NodeProp.group);
        return group ? group.indexOf(name2) > -1 : false;
      }
      return this.id == name2;
    }
    static match(map) {
      let direct = Object.create(null);
      for (let prop in map)
        for (let name2 of prop.split(" "))
          direct[name2] = map[prop];
      return (node) => {
        for (let groups = node.prop(NodeProp.group), i = -1; i < (groups ? groups.length : 0); i++) {
          let found = direct[i < 0 ? node.name : groups[i]];
          if (found)
            return found;
        }
      };
    }
  };
  NodeType.none = new NodeType("", Object.create(null), 0, 8);
  var NodeSet = class {
    constructor(types2) {
      this.types = types2;
      for (let i = 0; i < types2.length; i++)
        if (types2[i].id != i)
          throw new RangeError("Node type ids should correspond to array positions when creating a node set");
    }
    extend(...props) {
      let newTypes = [];
      for (let type of this.types) {
        let newProps = null;
        for (let source of props) {
          let add = source(type);
          if (add) {
            if (!newProps)
              newProps = Object.assign({}, type.props);
            add[0].set(newProps, add[1]);
          }
        }
        newTypes.push(newProps ? new NodeType(type.name, newProps, type.id, type.flags) : type);
      }
      return new NodeSet(newTypes);
    }
  };
  var Tree = class {
    constructor(type, children, positions, length) {
      this.type = type;
      this.children = children;
      this.positions = positions;
      this.length = length;
    }
    toString() {
      let children = this.children.map((c) => c.toString()).join();
      return !this.type.name ? children : (/\W/.test(this.type.name) && !this.type.isError ? JSON.stringify(this.type.name) : this.type.name) + (children.length ? "(" + children + ")" : "");
    }
    cursor(pos, side = 0) {
      let scope = pos != null && CachedNode.get(this) || this.topNode;
      let cursor = new TreeCursor(scope);
      if (pos != null) {
        cursor.moveTo(pos, side);
        CachedNode.set(this, cursor._tree);
      }
      return cursor;
    }
    fullCursor() {
      return new TreeCursor(this.topNode, true);
    }
    get topNode() {
      return new TreeNode(this, 0, 0, null);
    }
    resolve(pos, side = 0) {
      return this.cursor(pos, side).node;
    }
    iterate(spec) {
      let {enter, leave, from = 0, to = this.length} = spec;
      for (let c = this.cursor(); ; ) {
        let mustLeave = false;
        if (c.from <= to && c.to >= from && (c.type.isAnonymous || enter(c.type, c.from, c.to) !== false)) {
          if (c.firstChild())
            continue;
          if (!c.type.isAnonymous)
            mustLeave = true;
        }
        for (; ; ) {
          if (mustLeave && leave)
            leave(c.type, c.from, c.to);
          mustLeave = c.type.isAnonymous;
          if (c.nextSibling())
            break;
          if (!c.parent())
            return;
          mustLeave = true;
        }
      }
    }
    balance(maxBufferLength = DefaultBufferLength) {
      return this.children.length <= BalanceBranchFactor ? this : balanceRange(this.type, NodeType.none, this.children, this.positions, 0, this.children.length, 0, maxBufferLength, this.length, 0);
    }
    static build(data) {
      return buildTree(data);
    }
  };
  Tree.empty = new Tree(NodeType.none, [], [], 0);
  function withHash(tree, hash) {
    if (hash)
      tree.contextHash = hash;
    return tree;
  }
  var TreeBuffer = class {
    constructor(buffer, length, set, type = NodeType.none) {
      this.buffer = buffer;
      this.length = length;
      this.set = set;
      this.type = type;
    }
    toString() {
      let result = [];
      for (let index = 0; index < this.buffer.length; ) {
        result.push(this.childString(index));
        index = this.buffer[index + 3];
      }
      return result.join(",");
    }
    childString(index) {
      let id = this.buffer[index], endIndex = this.buffer[index + 3];
      let type = this.set.types[id], result = type.name;
      if (/\W/.test(result) && !type.isError)
        result = JSON.stringify(result);
      index += 4;
      if (endIndex == index)
        return result;
      let children = [];
      while (index < endIndex) {
        children.push(this.childString(index));
        index = this.buffer[index + 3];
      }
      return result + "(" + children.join(",") + ")";
    }
    findChild(startIndex, endIndex, dir, after) {
      let {buffer} = this, pick = -1;
      for (let i = startIndex; i != endIndex; i = buffer[i + 3]) {
        if (after != -1e8) {
          let start = buffer[i + 1], end = buffer[i + 2];
          if (dir > 0) {
            if (end > after)
              pick = i;
            if (end > after)
              break;
          } else {
            if (start < after)
              pick = i;
            if (end >= after)
              break;
          }
        } else {
          pick = i;
          if (dir > 0)
            break;
        }
      }
      return pick;
    }
  };
  var TreeNode = class {
    constructor(node, from, index, _parent) {
      this.node = node;
      this.from = from;
      this.index = index;
      this._parent = _parent;
    }
    get type() {
      return this.node.type;
    }
    get name() {
      return this.node.type.name;
    }
    get to() {
      return this.from + this.node.length;
    }
    nextChild(i, dir, after, full = false) {
      for (let parent = this; ; ) {
        for (let {children, positions} = parent.node, e = dir > 0 ? children.length : -1; i != e; i += dir) {
          let next2 = children[i], start = positions[i] + parent.from;
          if (after != -1e8 && (dir < 0 ? start >= after : start + next2.length <= after))
            continue;
          if (next2 instanceof TreeBuffer) {
            let index = next2.findChild(0, next2.buffer.length, dir, after == -1e8 ? -1e8 : after - start);
            if (index > -1)
              return new BufferNode(new BufferContext(parent, next2, i, start), null, index);
          } else if (full || (!next2.type.isAnonymous || hasChild(next2))) {
            let inner = new TreeNode(next2, start, i, parent);
            return full || !inner.type.isAnonymous ? inner : inner.nextChild(dir < 0 ? next2.children.length - 1 : 0, dir, after);
          }
        }
        if (full || !parent.type.isAnonymous)
          return null;
        i = parent.index + dir;
        parent = parent._parent;
        if (!parent)
          return null;
      }
    }
    get firstChild() {
      return this.nextChild(0, 1, -1e8);
    }
    get lastChild() {
      return this.nextChild(this.node.children.length - 1, -1, -1e8);
    }
    childAfter(pos) {
      return this.nextChild(0, 1, pos);
    }
    childBefore(pos) {
      return this.nextChild(this.node.children.length - 1, -1, pos);
    }
    nextSignificantParent() {
      let val = this;
      while (val.type.isAnonymous && val._parent)
        val = val._parent;
      return val;
    }
    get parent() {
      return this._parent ? this._parent.nextSignificantParent() : null;
    }
    get nextSibling() {
      return this._parent ? this._parent.nextChild(this.index + 1, 1, -1) : null;
    }
    get prevSibling() {
      return this._parent ? this._parent.nextChild(this.index - 1, -1, -1) : null;
    }
    get cursor() {
      return new TreeCursor(this);
    }
    resolve(pos, side = 0) {
      return this.cursor.moveTo(pos, side).node;
    }
    getChild(type, before = null, after = null) {
      let r = getChildren(this, type, before, after);
      return r.length ? r[0] : null;
    }
    getChildren(type, before = null, after = null) {
      return getChildren(this, type, before, after);
    }
    toString() {
      return this.node.toString();
    }
  };
  function getChildren(node, type, before, after) {
    let cur = node.cursor, result = [];
    if (!cur.firstChild())
      return result;
    if (before != null) {
      while (!cur.type.is(before))
        if (!cur.nextSibling())
          return result;
    }
    for (; ; ) {
      if (after != null && cur.type.is(after))
        return result;
      if (cur.type.is(type))
        result.push(cur.node);
      if (!cur.nextSibling())
        return after == null ? result : [];
    }
  }
  var BufferContext = class {
    constructor(parent, buffer, index, start) {
      this.parent = parent;
      this.buffer = buffer;
      this.index = index;
      this.start = start;
    }
  };
  var BufferNode = class {
    constructor(context, _parent, index) {
      this.context = context;
      this._parent = _parent;
      this.index = index;
      this.type = context.buffer.set.types[context.buffer.buffer[index]];
    }
    get name() {
      return this.type.name;
    }
    get from() {
      return this.context.start + this.context.buffer.buffer[this.index + 1];
    }
    get to() {
      return this.context.start + this.context.buffer.buffer[this.index + 2];
    }
    child(dir, after) {
      let {buffer} = this.context;
      let index = buffer.findChild(this.index + 4, buffer.buffer[this.index + 3], dir, after == -1e8 ? -1e8 : after - this.context.start);
      return index < 0 ? null : new BufferNode(this.context, this, index);
    }
    get firstChild() {
      return this.child(1, -1e8);
    }
    get lastChild() {
      return this.child(-1, -1e8);
    }
    childAfter(pos) {
      return this.child(1, pos);
    }
    childBefore(pos) {
      return this.child(-1, pos);
    }
    get parent() {
      return this._parent || this.context.parent.nextSignificantParent();
    }
    externalSibling(dir) {
      return this._parent ? null : this.context.parent.nextChild(this.context.index + dir, dir, -1);
    }
    get nextSibling() {
      let {buffer} = this.context;
      let after = buffer.buffer[this.index + 3];
      if (after < (this._parent ? buffer.buffer[this._parent.index + 3] : buffer.buffer.length))
        return new BufferNode(this.context, this._parent, after);
      return this.externalSibling(1);
    }
    get prevSibling() {
      let {buffer} = this.context;
      let parentStart = this._parent ? this._parent.index + 4 : 0;
      if (this.index == parentStart)
        return this.externalSibling(-1);
      return new BufferNode(this.context, this._parent, buffer.findChild(parentStart, this.index, -1, -1e8));
    }
    get cursor() {
      return new TreeCursor(this);
    }
    resolve(pos, side = 0) {
      return this.cursor.moveTo(pos, side).node;
    }
    toString() {
      return this.context.buffer.childString(this.index);
    }
    getChild(type, before = null, after = null) {
      let r = getChildren(this, type, before, after);
      return r.length ? r[0] : null;
    }
    getChildren(type, before = null, after = null) {
      return getChildren(this, type, before, after);
    }
  };
  var TreeCursor = class {
    constructor(node, full = false) {
      this.full = full;
      this.buffer = null;
      this.stack = [];
      this.index = 0;
      this.bufferNode = null;
      if (node instanceof TreeNode) {
        this.yieldNode(node);
      } else {
        this._tree = node.context.parent;
        this.buffer = node.context;
        for (let n = node._parent; n; n = n._parent)
          this.stack.unshift(n.index);
        this.bufferNode = node;
        this.yieldBuf(node.index);
      }
    }
    get name() {
      return this.type.name;
    }
    yieldNode(node) {
      if (!node)
        return false;
      this._tree = node;
      this.type = node.type;
      this.from = node.from;
      this.to = node.to;
      return true;
    }
    yieldBuf(index, type) {
      this.index = index;
      let {start, buffer} = this.buffer;
      this.type = type || buffer.set.types[buffer.buffer[index]];
      this.from = start + buffer.buffer[index + 1];
      this.to = start + buffer.buffer[index + 2];
      return true;
    }
    yield(node) {
      if (!node)
        return false;
      if (node instanceof TreeNode) {
        this.buffer = null;
        return this.yieldNode(node);
      }
      this.buffer = node.context;
      return this.yieldBuf(node.index, node.type);
    }
    toString() {
      return this.buffer ? this.buffer.buffer.childString(this.index) : this._tree.toString();
    }
    enter(dir, after) {
      if (!this.buffer)
        return this.yield(this._tree.nextChild(dir < 0 ? this._tree.node.children.length - 1 : 0, dir, after, this.full));
      let {buffer} = this.buffer;
      let index = buffer.findChild(this.index + 4, buffer.buffer[this.index + 3], dir, after == -1e8 ? -1e8 : after - this.buffer.start);
      if (index < 0)
        return false;
      this.stack.push(this.index);
      return this.yieldBuf(index);
    }
    firstChild() {
      return this.enter(1, -1e8);
    }
    lastChild() {
      return this.enter(-1, -1e8);
    }
    childAfter(pos) {
      return this.enter(1, pos);
    }
    childBefore(pos) {
      return this.enter(-1, pos);
    }
    parent() {
      if (!this.buffer)
        return this.yieldNode(this.full ? this._tree._parent : this._tree.parent);
      if (this.stack.length)
        return this.yieldBuf(this.stack.pop());
      let parent = this.full ? this.buffer.parent : this.buffer.parent.nextSignificantParent();
      this.buffer = null;
      return this.yieldNode(parent);
    }
    sibling(dir) {
      if (!this.buffer)
        return !this._tree._parent ? false : this.yield(this._tree._parent.nextChild(this._tree.index + dir, dir, -1e8, this.full));
      let {buffer} = this.buffer, d = this.stack.length - 1;
      if (dir < 0) {
        let parentStart = d < 0 ? 0 : this.stack[d] + 4;
        if (this.index != parentStart)
          return this.yieldBuf(buffer.findChild(parentStart, this.index, -1, -1e8));
      } else {
        let after = buffer.buffer[this.index + 3];
        if (after < (d < 0 ? buffer.buffer.length : buffer.buffer[this.stack[d] + 3]))
          return this.yieldBuf(after);
      }
      return d < 0 ? this.yield(this.buffer.parent.nextChild(this.buffer.index + dir, dir, -1e8, this.full)) : false;
    }
    nextSibling() {
      return this.sibling(1);
    }
    prevSibling() {
      return this.sibling(-1);
    }
    atLastNode(dir) {
      let index, parent, {buffer} = this;
      if (buffer) {
        if (dir > 0) {
          if (this.index < buffer.buffer.buffer.length)
            return false;
        } else {
          for (let i = 0; i < this.index; i++)
            if (buffer.buffer.buffer[i + 3] < this.index)
              return false;
        }
        ({index, parent} = buffer);
      } else {
        ({index, _parent: parent} = this._tree);
      }
      for (; parent; {index, _parent: parent} = parent) {
        for (let i = index + dir, e = dir < 0 ? -1 : parent.node.children.length; i != e; i += dir) {
          let child = parent.node.children[i];
          if (this.full || !child.type.isAnonymous || child instanceof TreeBuffer || hasChild(child))
            return false;
        }
      }
      return true;
    }
    move(dir) {
      if (this.enter(dir, -1e8))
        return true;
      for (; ; ) {
        if (this.sibling(dir))
          return true;
        if (this.atLastNode(dir) || !this.parent())
          return false;
      }
    }
    next() {
      return this.move(1);
    }
    prev() {
      return this.move(-1);
    }
    moveTo(pos, side = 0) {
      while (this.from == this.to || (side < 1 ? this.from >= pos : this.from > pos) || (side > -1 ? this.to <= pos : this.to < pos))
        if (!this.parent())
          break;
      for (; ; ) {
        if (side < 0 ? !this.childBefore(pos) : !this.childAfter(pos))
          break;
        if (this.from == this.to || (side < 1 ? this.from >= pos : this.from > pos) || (side > -1 ? this.to <= pos : this.to < pos)) {
          this.parent();
          break;
        }
      }
      return this;
    }
    get node() {
      if (!this.buffer)
        return this._tree;
      let cache = this.bufferNode, result = null, depth2 = 0;
      if (cache && cache.context == this.buffer) {
        scan:
          for (let index = this.index, d = this.stack.length; d >= 0; ) {
            for (let c = cache; c; c = c._parent)
              if (c.index == index) {
                if (index == this.index)
                  return c;
                result = c;
                depth2 = d + 1;
                break scan;
              }
            index = this.stack[--d];
          }
      }
      for (let i = depth2; i < this.stack.length; i++)
        result = new BufferNode(this.buffer, result, this.stack[i]);
      return this.bufferNode = new BufferNode(this.buffer, result, this.index);
    }
    get tree() {
      return this.buffer ? null : this._tree.node;
    }
  };
  function hasChild(tree) {
    return tree.children.some((ch) => !ch.type.isAnonymous || ch instanceof TreeBuffer || hasChild(ch));
  }
  var FlatBufferCursor = class {
    constructor(buffer, index) {
      this.buffer = buffer;
      this.index = index;
    }
    get id() {
      return this.buffer[this.index - 4];
    }
    get start() {
      return this.buffer[this.index - 3];
    }
    get end() {
      return this.buffer[this.index - 2];
    }
    get size() {
      return this.buffer[this.index - 1];
    }
    get pos() {
      return this.index;
    }
    next() {
      this.index -= 4;
    }
    fork() {
      return new FlatBufferCursor(this.buffer, this.index);
    }
  };
  var BalanceBranchFactor = 8;
  function buildTree(data) {
    var _a;
    let {buffer, nodeSet, topID = 0, maxBufferLength = DefaultBufferLength, reused = [], minRepeatType = nodeSet.types.length} = data;
    let cursor = Array.isArray(buffer) ? new FlatBufferCursor(buffer, buffer.length) : buffer;
    let types2 = nodeSet.types;
    let contextHash = 0;
    function takeNode(parentStart, minPos, children2, positions2, inRepeat) {
      let {id, start, end, size} = cursor;
      let startPos = start - parentStart;
      if (size < 0) {
        if (size == -1) {
          children2.push(reused[id]);
          positions2.push(startPos);
        } else {
          contextHash = id;
        }
        cursor.next();
        return;
      }
      let type = types2[id], node, buffer2;
      if (end - start <= maxBufferLength && (buffer2 = findBufferSize(cursor.pos - minPos, inRepeat))) {
        let data2 = new Uint16Array(buffer2.size - buffer2.skip);
        let endPos = cursor.pos - buffer2.size, index = data2.length;
        while (cursor.pos > endPos)
          index = copyToBuffer(buffer2.start, data2, index, inRepeat);
        node = new TreeBuffer(data2, end - buffer2.start, nodeSet, inRepeat < 0 ? NodeType.none : types2[inRepeat]);
        startPos = buffer2.start - parentStart;
      } else {
        let endPos = cursor.pos - size;
        cursor.next();
        let localChildren = [], localPositions = [];
        let localInRepeat = id >= minRepeatType ? id : -1;
        while (cursor.pos > endPos) {
          if (cursor.id == localInRepeat)
            cursor.next();
          else
            takeNode(start, endPos, localChildren, localPositions, localInRepeat);
        }
        localChildren.reverse();
        localPositions.reverse();
        if (localInRepeat > -1 && localChildren.length > BalanceBranchFactor)
          node = balanceRange(type, type, localChildren, localPositions, 0, localChildren.length, 0, maxBufferLength, end - start, contextHash);
        else
          node = withHash(new Tree(type, localChildren, localPositions, end - start), contextHash);
      }
      children2.push(node);
      positions2.push(startPos);
    }
    function findBufferSize(maxSize, inRepeat) {
      let fork = cursor.fork();
      let size = 0, start = 0, skip = 0, minStart = fork.end - maxBufferLength;
      let result = {size: 0, start: 0, skip: 0};
      scan:
        for (let minPos = fork.pos - maxSize; fork.pos > minPos; ) {
          if (fork.id == inRepeat) {
            result.size = size;
            result.start = start;
            result.skip = skip;
            skip += 4;
            size += 4;
            fork.next();
            continue;
          }
          let nodeSize = fork.size, startPos = fork.pos - nodeSize;
          if (nodeSize < 0 || startPos < minPos || fork.start < minStart)
            break;
          let localSkipped = fork.id >= minRepeatType ? 4 : 0;
          let nodeStart2 = fork.start;
          fork.next();
          while (fork.pos > startPos) {
            if (fork.size < 0)
              break scan;
            if (fork.id >= minRepeatType)
              localSkipped += 4;
            fork.next();
          }
          start = nodeStart2;
          size += nodeSize;
          skip += localSkipped;
        }
      if (inRepeat < 0 || size == maxSize) {
        result.size = size;
        result.start = start;
        result.skip = skip;
      }
      return result.size > 4 ? result : void 0;
    }
    function copyToBuffer(bufferStart, buffer2, index, inRepeat) {
      let {id, start, end, size} = cursor;
      cursor.next();
      if (id == inRepeat)
        return index;
      let startIndex = index;
      if (size > 4) {
        let endPos = cursor.pos - (size - 4);
        while (cursor.pos > endPos)
          index = copyToBuffer(bufferStart, buffer2, index, inRepeat);
      }
      if (id < minRepeatType) {
        buffer2[--index] = startIndex;
        buffer2[--index] = end - bufferStart;
        buffer2[--index] = start - bufferStart;
        buffer2[--index] = id;
      }
      return index;
    }
    let children = [], positions = [];
    while (cursor.pos > 0)
      takeNode(data.start || 0, 0, children, positions, -1);
    let length = (_a = data.length) !== null && _a !== void 0 ? _a : children.length ? positions[0] + children[0].length : 0;
    return new Tree(types2[topID], children.reverse(), positions.reverse(), length);
  }
  function balanceRange(outerType, innerType, children, positions, from, to, start, maxBufferLength, length, contextHash) {
    let localChildren = [], localPositions = [];
    if (length <= maxBufferLength) {
      for (let i = from; i < to; i++) {
        localChildren.push(children[i]);
        localPositions.push(positions[i] - start);
      }
    } else {
      let maxChild = Math.max(maxBufferLength, Math.ceil(length * 1.5 / BalanceBranchFactor));
      for (let i = from; i < to; ) {
        let groupFrom = i, groupStart = positions[i];
        i++;
        for (; i < to; i++) {
          let nextEnd = positions[i] + children[i].length;
          if (nextEnd - groupStart > maxChild)
            break;
        }
        if (i == groupFrom + 1) {
          let only = children[groupFrom];
          if (only instanceof Tree && only.type == innerType && only.length > maxChild << 1) {
            for (let j = 0; j < only.children.length; j++) {
              localChildren.push(only.children[j]);
              localPositions.push(only.positions[j] + groupStart - start);
            }
            continue;
          }
          localChildren.push(only);
        } else if (i == groupFrom + 1) {
          localChildren.push(children[groupFrom]);
        } else {
          let inner = balanceRange(innerType, innerType, children, positions, groupFrom, i, groupStart, maxBufferLength, positions[i - 1] + children[i - 1].length - groupStart, contextHash);
          if (innerType != NodeType.none && !containsType(inner.children, innerType))
            inner = withHash(new Tree(NodeType.none, inner.children, inner.positions, inner.length), contextHash);
          localChildren.push(inner);
        }
        localPositions.push(groupStart - start);
      }
    }
    return withHash(new Tree(outerType, localChildren, localPositions, length), contextHash);
  }
  function containsType(nodes, type) {
    for (let elt of nodes)
      if (elt.type == type)
        return true;
    return false;
  }
  var TreeFragment = class {
    constructor(from, to, tree, offset, open) {
      this.from = from;
      this.to = to;
      this.tree = tree;
      this.offset = offset;
      this.open = open;
    }
    get openStart() {
      return (this.open & 1) > 0;
    }
    get openEnd() {
      return (this.open & 2) > 0;
    }
    static applyChanges(fragments, changes, minGap = 128) {
      if (!changes.length)
        return fragments;
      let result = [];
      let fI = 1, nextF = fragments.length ? fragments[0] : null;
      let cI = 0, pos = 0, off = 0;
      for (; ; ) {
        let nextC = cI < changes.length ? changes[cI++] : null;
        let nextPos = nextC ? nextC.fromA : 1e9;
        if (nextPos - pos >= minGap)
          while (nextF && nextF.from < nextPos) {
            let cut = nextF;
            if (pos >= cut.from || nextPos <= cut.to || off) {
              let fFrom = Math.max(cut.from, pos) - off, fTo = Math.min(cut.to, nextPos) - off;
              cut = fFrom >= fTo ? null : new TreeFragment(fFrom, fTo, cut.tree, cut.offset + off, (cI > 0 ? 1 : 0) | (nextC ? 2 : 0));
            }
            if (cut)
              result.push(cut);
            if (nextF.to > nextPos)
              break;
            nextF = fI < fragments.length ? fragments[fI++] : null;
          }
        if (!nextC)
          break;
        pos = nextC.toA;
        off = nextC.toA - nextC.toB;
      }
      return result;
    }
    static addTree(tree, fragments = [], partial = false) {
      let result = [new TreeFragment(0, tree.length, tree, 0, partial ? 2 : 0)];
      for (let f of fragments)
        if (f.to > tree.length)
          result.push(f);
      return result;
    }
  };
  function stringInput(input) {
    return new StringInput(input);
  }
  var StringInput = class {
    constructor(string2, length = string2.length) {
      this.string = string2;
      this.length = length;
    }
    get(pos) {
      return pos < 0 || pos >= this.length ? -1 : this.string.charCodeAt(pos);
    }
    lineAfter(pos) {
      if (pos < 0)
        return "";
      let end = this.string.indexOf("\n", pos);
      return this.string.slice(pos, end < 0 ? this.length : Math.min(end, this.length));
    }
    read(from, to) {
      return this.string.slice(from, Math.min(this.length, to));
    }
    clip(at) {
      return new StringInput(this.string, at);
    }
  };

  // node_modules/@codemirror/language/dist/index.js
  var languageDataProp = new NodeProp();
  function defineLanguageFacet(baseData) {
    return Facet.define({
      combine: baseData ? (values) => values.concat(baseData) : void 0
    });
  }
  var Language = class {
    constructor(data, parser2, topNode, extraExtensions = []) {
      this.data = data;
      this.topNode = topNode;
      if (!EditorState.prototype.hasOwnProperty("tree"))
        Object.defineProperty(EditorState.prototype, "tree", {get() {
          return syntaxTree(this);
        }});
      this.parser = parser2;
      this.extension = [
        language.of(this),
        EditorState.languageData.of((state, pos) => state.facet(languageDataFacetAt(state, pos)))
      ].concat(extraExtensions);
    }
    isActiveAt(state, pos) {
      return languageDataFacetAt(state, pos) == this.data;
    }
    findRegions(state) {
      let lang = state.facet(language);
      if ((lang === null || lang === void 0 ? void 0 : lang.data) == this.data)
        return [{from: 0, to: state.doc.length}];
      if (!lang || !lang.allowsNesting)
        return [];
      let result = [];
      syntaxTree(state).iterate({
        enter: (type, from, to) => {
          if (type.isTop && type.prop(languageDataProp) == this.data) {
            result.push({from, to});
            return false;
          }
          return void 0;
        }
      });
      return result;
    }
    get allowsNesting() {
      return true;
    }
    parseString(code) {
      let doc2 = Text.of(code.split("\n"));
      let parse = this.parser.startParse(new DocInput(doc2), 0, new EditorParseContext(this.parser, EditorState.create({doc: doc2}), [], Tree.empty, {from: 0, to: code.length}, [], null));
      let tree;
      while (!(tree = parse.advance())) {
      }
      return tree;
    }
  };
  Language.setState = StateEffect.define();
  function languageDataFacetAt(state, pos) {
    let topLang = state.facet(language);
    if (!topLang)
      return null;
    if (!topLang.allowsNesting)
      return topLang.data;
    let tree = syntaxTree(state);
    let target = tree.resolve(pos, -1);
    while (target) {
      let facet = target.type.prop(languageDataProp);
      if (facet)
        return facet;
      target = target.parent;
    }
    return topLang.data;
  }
  var LezerLanguage = class extends Language {
    constructor(data, parser2) {
      super(data, parser2, parser2.topNode);
      this.parser = parser2;
    }
    static define(spec) {
      let data = defineLanguageFacet(spec.languageData);
      return new LezerLanguage(data, spec.parser.configure({
        props: [languageDataProp.add((type) => type.isTop ? data : void 0)]
      }));
    }
    configure(options) {
      return new LezerLanguage(this.data, this.parser.configure(options));
    }
    get allowsNesting() {
      return this.parser.hasNested;
    }
  };
  function syntaxTree(state) {
    let field = state.field(Language.state, false);
    return field ? field.tree : Tree.empty;
  }
  var DocInput = class {
    constructor(doc2, length = doc2.length) {
      this.doc = doc2;
      this.length = length;
      this.cursorPos = 0;
      this.string = "";
      this.prevString = "";
      this.cursor = doc2.iter();
    }
    syncTo(pos) {
      if (pos < this.cursorPos) {
        this.cursor = this.doc.iter();
        this.cursorPos = 0;
      }
      this.prevString = pos == this.cursorPos ? this.string : "";
      this.string = this.cursor.next(pos - this.cursorPos).value;
      this.cursorPos = pos + this.string.length;
      return this.cursorPos - this.string.length;
    }
    get(pos) {
      if (pos >= this.length)
        return -1;
      let stringStart = this.cursorPos - this.string.length;
      if (pos < stringStart || pos >= this.cursorPos) {
        if (pos < stringStart && pos >= stringStart - this.prevString.length)
          return this.prevString.charCodeAt(pos - (stringStart - this.prevString.length));
        stringStart = this.syncTo(pos);
      }
      return this.string.charCodeAt(pos - stringStart);
    }
    lineAfter(pos) {
      if (pos >= this.length || pos < 0)
        return "";
      let stringStart = this.cursorPos - this.string.length;
      if (pos < stringStart || pos >= this.cursorPos)
        stringStart = this.syncTo(pos);
      return this.cursor.lineBreak ? "" : this.string.slice(pos - stringStart, Math.min(this.length - stringStart, this.string.length));
    }
    read(from, to) {
      let stringStart = this.cursorPos - this.string.length;
      if (from < stringStart || to >= this.cursorPos)
        return this.doc.sliceString(from, to);
      else
        return this.string.slice(from - stringStart, to - stringStart);
    }
    clip(at) {
      return new DocInput(this.doc, at);
    }
  };
  var EditorParseContext = class {
    constructor(parser2, state, fragments = [], tree, viewport, skipped, scheduleOn) {
      this.parser = parser2;
      this.state = state;
      this.fragments = fragments;
      this.tree = tree;
      this.viewport = viewport;
      this.skipped = skipped;
      this.scheduleOn = scheduleOn;
      this.parse = null;
      this.tempSkipped = [];
    }
    work(time, upto) {
      if (this.tree != Tree.empty && (upto == null ? this.tree.length == this.state.doc.length : this.tree.length >= upto)) {
        this.takeTree();
        return true;
      }
      if (!this.parse)
        this.parse = this.parser.startParse(new DocInput(this.state.doc), 0, this);
      let endTime = Date.now() + time;
      for (; ; ) {
        let done = this.parse.advance();
        if (done) {
          this.fragments = this.withoutTempSkipped(TreeFragment.addTree(done));
          this.parse = null;
          this.tree = done;
          return true;
        } else if (upto != null && this.parse.pos >= upto) {
          this.takeTree();
          return true;
        }
        if (Date.now() > endTime)
          return false;
      }
    }
    takeTree() {
      if (this.parse && this.parse.pos > this.tree.length) {
        this.tree = this.parse.forceFinish();
        this.fragments = this.withoutTempSkipped(TreeFragment.addTree(this.tree, this.fragments, true));
      }
    }
    withoutTempSkipped(fragments) {
      for (let r; r = this.tempSkipped.pop(); )
        fragments = cutFragments(fragments, r.from, r.to);
      return fragments;
    }
    changes(changes, newState) {
      let {fragments, tree, viewport, skipped} = this;
      this.takeTree();
      if (!changes.empty) {
        let ranges = [];
        changes.iterChangedRanges((fromA, toA, fromB, toB) => ranges.push({fromA, toA, fromB, toB}));
        fragments = TreeFragment.applyChanges(fragments, ranges);
        tree = Tree.empty;
        viewport = {from: changes.mapPos(viewport.from, -1), to: changes.mapPos(viewport.to, 1)};
        if (this.skipped.length) {
          skipped = [];
          for (let r of this.skipped) {
            let from = changes.mapPos(r.from, 1), to = changes.mapPos(r.to, -1);
            if (from < to)
              skipped.push({from, to});
          }
        }
      }
      return new EditorParseContext(this.parser, newState, fragments, tree, viewport, skipped, this.scheduleOn);
    }
    updateViewport(viewport) {
      this.viewport = viewport;
      let startLen = this.skipped.length;
      for (let i = 0; i < this.skipped.length; i++) {
        let {from, to} = this.skipped[i];
        if (from < viewport.to && to > viewport.from) {
          this.fragments = cutFragments(this.fragments, from, to);
          this.skipped.splice(i--, 1);
        }
      }
      return this.skipped.length < startLen;
    }
    reset() {
      if (this.parse) {
        this.takeTree();
        this.parse = null;
      }
    }
    skipUntilInView(from, to) {
      this.skipped.push({from, to});
    }
    static getSkippingParser(until) {
      return {
        startParse(input, startPos, context) {
          return {
            pos: startPos,
            advance() {
              let ecx = context;
              ecx.tempSkipped.push({from: startPos, to: input.length});
              if (until)
                ecx.scheduleOn = ecx.scheduleOn ? Promise.all([ecx.scheduleOn, until]) : until;
              this.pos = input.length;
              return new Tree(NodeType.none, [], [], input.length - startPos);
            },
            forceFinish() {
              return this.advance();
            }
          };
        }
      };
    }
    movedPast(pos) {
      return this.tree.length < pos && this.parse && this.parse.pos >= pos;
    }
  };
  EditorParseContext.skippingParser = EditorParseContext.getSkippingParser();
  function cutFragments(fragments, from, to) {
    return TreeFragment.applyChanges(fragments, [{fromA: from, toA: to, fromB: from, toB: to}]);
  }
  var LanguageState = class {
    constructor(context) {
      this.context = context;
      this.tree = context.tree;
    }
    apply(tr) {
      if (!tr.docChanged)
        return this;
      let newCx = this.context.changes(tr.changes, tr.state);
      let upto = this.context.tree.length == tr.startState.doc.length ? void 0 : Math.max(tr.changes.mapPos(this.context.tree.length), newCx.viewport.to);
      if (!newCx.work(25, upto))
        newCx.takeTree();
      return new LanguageState(newCx);
    }
    static init(state) {
      let parseState = new EditorParseContext(state.facet(language).parser, state, [], Tree.empty, {from: 0, to: state.doc.length}, [], null);
      if (!parseState.work(25))
        parseState.takeTree();
      return new LanguageState(parseState);
    }
  };
  Language.state = StateField.define({
    create: LanguageState.init,
    update(value, tr) {
      for (let e of tr.effects)
        if (e.is(Language.setState))
          return e.value;
      if (tr.startState.facet(language) != tr.state.facet(language))
        return LanguageState.init(tr.state);
      return value.apply(tr);
    }
  });
  var requestIdle = typeof window != "undefined" && window.requestIdleCallback || ((callback, {timeout}) => setTimeout(callback, timeout));
  var cancelIdle = typeof window != "undefined" && window.cancelIdleCallback || clearTimeout;
  var parseWorker = ViewPlugin.fromClass(class ParseWorker {
    constructor(view) {
      this.view = view;
      this.working = -1;
      this.chunkEnd = -1;
      this.chunkBudget = -1;
      this.work = this.work.bind(this);
      this.scheduleWork();
    }
    update(update) {
      let cx = this.view.state.field(Language.state).context;
      if (update.viewportChanged) {
        if (cx.updateViewport(update.view.viewport))
          cx.reset();
        if (this.view.viewport.to > cx.tree.length)
          this.scheduleWork();
      }
      if (update.docChanged) {
        if (this.view.hasFocus)
          this.chunkBudget += 50;
        this.scheduleWork();
      }
      this.checkAsyncSchedule(cx);
    }
    scheduleWork(force = false) {
      if (this.working > -1)
        return;
      let {state} = this.view, field = state.field(Language.state);
      if (!force && field.tree.length >= state.doc.length)
        return;
      this.working = requestIdle(this.work, {timeout: 500});
    }
    work(deadline) {
      this.working = -1;
      let now = Date.now();
      if (this.chunkEnd < now && (this.chunkEnd < 0 || this.view.hasFocus)) {
        this.chunkEnd = now + 3e4;
        this.chunkBudget = 3e3;
      }
      if (this.chunkBudget <= 0)
        return;
      let {state, viewport: {to: vpTo}} = this.view, field = state.field(Language.state);
      if (field.tree.length >= vpTo + 1e6)
        return;
      let time = Math.min(this.chunkBudget, deadline ? Math.max(25, deadline.timeRemaining()) : 100);
      let done = field.context.work(time, vpTo + 1e6);
      this.chunkBudget -= Date.now() - now;
      if (done || this.chunkBudget <= 0 || field.context.movedPast(vpTo)) {
        field.context.takeTree();
        this.view.dispatch({effects: Language.setState.of(new LanguageState(field.context))});
      }
      if (!done && this.chunkBudget > 0)
        this.scheduleWork();
      this.checkAsyncSchedule(field.context);
    }
    checkAsyncSchedule(cx) {
      if (cx.scheduleOn) {
        cx.scheduleOn.then(() => this.scheduleWork(true));
        cx.scheduleOn = null;
      }
    }
    destroy() {
      if (this.working >= 0)
        cancelIdle(this.working);
    }
  }, {
    eventHandlers: {focus() {
      this.scheduleWork();
    }}
  });
  var language = Facet.define({
    combine(languages) {
      return languages.length ? languages[0] : null;
    },
    enables: [Language.state, parseWorker]
  });
  var LanguageSupport = class {
    constructor(language2, support = []) {
      this.language = language2;
      this.support = support;
      this.extension = [language2, support];
    }
  };
  var indentService = Facet.define();
  var indentUnit = Facet.define({
    combine: (values) => {
      if (!values.length)
        return "  ";
      if (!/^(?: +|\t+)$/.test(values[0]))
        throw new Error("Invalid indent unit: " + JSON.stringify(values[0]));
      return values[0];
    }
  });
  function getIndentUnit(state) {
    let unit = state.facet(indentUnit);
    return unit.charCodeAt(0) == 9 ? state.tabSize * unit.length : unit.length;
  }
  function indentString(state, cols) {
    let result = "", ts = state.tabSize;
    if (state.facet(indentUnit).charCodeAt(0) == 9)
      while (cols >= ts) {
        result += "	";
        cols -= ts;
      }
    for (let i = 0; i < cols; i++)
      result += " ";
    return result;
  }
  function getIndentation(context, pos) {
    if (context instanceof EditorState)
      context = new IndentContext(context);
    for (let service of context.state.facet(indentService)) {
      let result = service(context, pos);
      if (result != null)
        return result;
    }
    let tree = syntaxTree(context.state);
    return tree ? syntaxIndentation(context, tree, pos) : null;
  }
  var IndentContext = class {
    constructor(state, options = {}) {
      this.state = state;
      this.options = options;
      this.unit = getIndentUnit(state);
    }
    textAfterPos(pos) {
      var _a, _b;
      let sim = (_a = this.options) === null || _a === void 0 ? void 0 : _a.simulateBreak;
      if (pos == sim && ((_b = this.options) === null || _b === void 0 ? void 0 : _b.simulateDoubleBreak))
        return "";
      return this.state.sliceDoc(pos, Math.min(pos + 100, sim != null && sim > pos ? sim : 1e9, this.state.doc.lineAt(pos).to));
    }
    column(pos) {
      var _a;
      let line = this.state.doc.lineAt(pos), text = line.text.slice(0, pos - line.from);
      let result = this.countColumn(text, pos - line.from);
      let override = ((_a = this.options) === null || _a === void 0 ? void 0 : _a.overrideIndentation) ? this.options.overrideIndentation(line.from) : -1;
      if (override > -1)
        result += override - this.countColumn(text, text.search(/\S/));
      return result;
    }
    countColumn(line, pos) {
      return countColumn(pos < 0 ? line : line.slice(0, pos), 0, this.state.tabSize);
    }
    lineIndent(line) {
      var _a;
      let override = (_a = this.options) === null || _a === void 0 ? void 0 : _a.overrideIndentation;
      if (override) {
        let overriden = override(line.from);
        if (overriden > -1)
          return overriden;
      }
      return this.countColumn(line.text, line.text.search(/\S/));
    }
  };
  var indentNodeProp = new NodeProp();
  function syntaxIndentation(cx, ast, pos) {
    let tree = ast.resolve(pos);
    for (let scan = tree, scanPos = pos; ; ) {
      let last = scan.childBefore(scanPos);
      if (!last)
        break;
      if (last.type.isError && last.from == last.to) {
        tree = scan;
        scanPos = last.from;
      } else {
        scan = last;
        scanPos = scan.to + 1;
      }
    }
    return indentFrom(tree, pos, cx);
  }
  function ignoreClosed(cx) {
    var _a, _b;
    return cx.pos == ((_a = cx.options) === null || _a === void 0 ? void 0 : _a.simulateBreak) && ((_b = cx.options) === null || _b === void 0 ? void 0 : _b.simulateDoubleBreak);
  }
  function indentStrategy(tree) {
    let strategy = tree.type.prop(indentNodeProp);
    if (strategy)
      return strategy;
    let first = tree.firstChild, close;
    if (first && (close = first.type.prop(NodeProp.closedBy))) {
      let last = tree.lastChild, closed = last && close.indexOf(last.name) > -1;
      return (cx) => delimitedStrategy(cx, true, 1, void 0, closed && !ignoreClosed(cx) ? last.from : void 0);
    }
    return tree.parent == null ? topIndent : null;
  }
  function indentFrom(node, pos, base2) {
    for (; node; node = node.parent) {
      let strategy = indentStrategy(node);
      if (strategy)
        return strategy(new TreeIndentContext(base2, pos, node));
    }
    return null;
  }
  function topIndent() {
    return 0;
  }
  var TreeIndentContext = class extends IndentContext {
    constructor(base2, pos, node) {
      super(base2.state, base2.options);
      this.base = base2;
      this.pos = pos;
      this.node = node;
    }
    get textAfter() {
      return this.textAfterPos(this.pos);
    }
    get baseIndent() {
      let line = this.state.doc.lineAt(this.node.from);
      for (; ; ) {
        let atBreak = this.node.resolve(line.from);
        while (atBreak.parent && atBreak.parent.from == atBreak.from)
          atBreak = atBreak.parent;
        if (isParent(atBreak, this.node))
          break;
        line = this.state.doc.lineAt(atBreak.from);
      }
      return this.lineIndent(line);
    }
    continue() {
      let parent = this.node.parent;
      return parent ? indentFrom(parent, this.pos, this.base) : 0;
    }
  };
  function isParent(parent, of) {
    for (let cur = of; cur; cur = cur.parent)
      if (parent == cur)
        return true;
    return false;
  }
  function bracketedAligned(context) {
    var _a;
    let tree = context.node;
    let openToken = tree.childAfter(tree.from), last = tree.lastChild;
    if (!openToken)
      return null;
    let sim = (_a = context.options) === null || _a === void 0 ? void 0 : _a.simulateBreak;
    let openLine = context.state.doc.lineAt(openToken.from);
    let lineEnd = sim == null || sim <= openLine.from ? openLine.to : Math.min(openLine.to, sim);
    for (let pos = openToken.to; ; ) {
      let next2 = tree.childAfter(pos);
      if (!next2 || next2 == last)
        return null;
      if (!next2.type.isSkipped)
        return next2.from < lineEnd ? openToken : null;
      pos = next2.to;
    }
  }
  function delimitedStrategy(context, align, units, closing2, closedAt) {
    let after = context.textAfter, space = after.match(/^\s*/)[0].length;
    let closed = closing2 && after.slice(space, space + closing2.length) == closing2 || closedAt == context.pos + space;
    let aligned = align ? bracketedAligned(context) : null;
    if (aligned)
      return closed ? context.column(aligned.from) : context.column(aligned.to);
    return context.baseIndent + (closed ? 0 : context.unit * units);
  }
  var foldService = Facet.define();
  var foldNodeProp = new NodeProp();

  // node_modules/@codemirror/closebrackets/dist/index.js
  var defaults = {
    brackets: ["(", "[", "{", "'", '"'],
    before: `)]}'":;>`
  };
  var closeBracketEffect = StateEffect.define({
    map(value, mapping) {
      let mapped = mapping.mapPos(value, -1, MapMode.TrackAfter);
      return mapped == null ? void 0 : mapped;
    }
  });
  var skipBracketEffect = StateEffect.define({
    map(value, mapping) {
      return mapping.mapPos(value);
    }
  });
  var closedBracket = new class extends RangeValue {
  }();
  closedBracket.startSide = 1;
  closedBracket.endSide = -1;
  var bracketState = StateField.define({
    create() {
      return RangeSet.empty;
    },
    update(value, tr) {
      if (tr.selection) {
        let lineStart = tr.state.doc.lineAt(tr.selection.main.head).from;
        let prevLineStart = tr.startState.doc.lineAt(tr.startState.selection.main.head).from;
        if (lineStart != tr.changes.mapPos(prevLineStart, -1))
          value = RangeSet.empty;
      }
      value = value.map(tr.changes);
      for (let effect of tr.effects) {
        if (effect.is(closeBracketEffect))
          value = value.update({add: [closedBracket.range(effect.value, effect.value + 1)]});
        else if (effect.is(skipBracketEffect))
          value = value.update({filter: (from) => from != effect.value});
      }
      return value;
    }
  });
  function closeBrackets() {
    return [EditorView.inputHandler.of(handleInput), bracketState];
  }
  var definedClosing = "()[]{}<>";
  function closing(ch) {
    for (let i = 0; i < definedClosing.length; i += 2)
      if (definedClosing.charCodeAt(i) == ch)
        return definedClosing.charAt(i + 1);
    return fromCodePoint(ch < 128 ? ch : ch + 1);
  }
  function config(state, pos) {
    return state.languageDataAt("closeBrackets", pos)[0] || defaults;
  }
  function handleInput(view, from, to, insert2) {
    if (view.composing)
      return false;
    let sel = view.state.selection.main;
    if (insert2.length > 2 || insert2.length == 2 && codePointSize(codePointAt(insert2, 0)) == 1 || from != sel.from || to != sel.to)
      return false;
    let tr = insertBracket(view.state, insert2);
    if (!tr)
      return false;
    view.dispatch(tr);
    return true;
  }
  var deleteBracketPair = ({state, dispatch}) => {
    let conf = config(state, state.selection.main.head);
    let tokens = conf.brackets || defaults.brackets;
    let dont = null, changes = state.changeByRange((range) => {
      if (range.empty) {
        let before = prevChar(state.doc, range.head);
        for (let token2 of tokens) {
          if (token2 == before && nextChar(state.doc, range.head) == closing(codePointAt(token2, 0)))
            return {
              changes: {from: range.head - token2.length, to: range.head + token2.length},
              range: EditorSelection.cursor(range.head - token2.length),
              annotations: Transaction.userEvent.of("delete")
            };
        }
      }
      return {range: dont = range};
    });
    if (!dont)
      dispatch(state.update(changes, {scrollIntoView: true}));
    return !dont;
  };
  var closeBracketsKeymap = [
    {key: "Backspace", run: deleteBracketPair}
  ];
  function insertBracket(state, bracket2) {
    let conf = config(state, state.selection.main.head);
    let tokens = conf.brackets || defaults.brackets;
    for (let tok of tokens) {
      let closed = closing(codePointAt(tok, 0));
      if (bracket2 == tok)
        return closed == tok ? handleSame(state, tok, tokens.indexOf(tok + tok + tok) > -1) : handleOpen(state, tok, closed, conf.before || defaults.before);
      if (bracket2 == closed && closedBracketAt(state, state.selection.main.from))
        return handleClose(state, tok, closed);
    }
    return null;
  }
  function closedBracketAt(state, pos) {
    let found = false;
    state.field(bracketState).between(0, state.doc.length, (from) => {
      if (from == pos)
        found = true;
    });
    return found;
  }
  function nextChar(doc2, pos) {
    let next2 = doc2.sliceString(pos, pos + 2);
    return next2.slice(0, codePointSize(codePointAt(next2, 0)));
  }
  function prevChar(doc2, pos) {
    let prev = doc2.sliceString(pos - 2, pos);
    return codePointSize(codePointAt(prev, 0)) == prev.length ? prev : prev.slice(1);
  }
  function handleOpen(state, open, close, closeBefore) {
    let dont = null, changes = state.changeByRange((range) => {
      if (!range.empty)
        return {
          changes: [{insert: open, from: range.from}, {insert: close, from: range.to}],
          effects: closeBracketEffect.of(range.to + open.length),
          range: EditorSelection.range(range.anchor + open.length, range.head + open.length)
        };
      let next2 = nextChar(state.doc, range.head);
      if (!next2 || /\s/.test(next2) || closeBefore.indexOf(next2) > -1)
        return {
          changes: {insert: open + close, from: range.head},
          effects: closeBracketEffect.of(range.head + open.length),
          range: EditorSelection.cursor(range.head + open.length)
        };
      return {range: dont = range};
    });
    return dont ? null : state.update(changes, {
      scrollIntoView: true,
      annotations: Transaction.userEvent.of("input")
    });
  }
  function handleClose(state, _open, close) {
    let dont = null, moved = state.selection.ranges.map((range) => {
      if (range.empty && nextChar(state.doc, range.head) == close)
        return EditorSelection.cursor(range.head + close.length);
      return dont = range;
    });
    return dont ? null : state.update({
      selection: EditorSelection.create(moved, state.selection.mainIndex),
      scrollIntoView: true,
      effects: state.selection.ranges.map(({from}) => skipBracketEffect.of(from))
    });
  }
  function handleSame(state, token2, allowTriple) {
    let dont = null, changes = state.changeByRange((range) => {
      if (!range.empty)
        return {
          changes: [{insert: token2, from: range.from}, {insert: token2, from: range.to}],
          effects: closeBracketEffect.of(range.to + token2.length),
          range: EditorSelection.range(range.anchor + token2.length, range.head + token2.length)
        };
      let pos = range.head, next2 = nextChar(state.doc, pos);
      if (next2 == token2) {
        if (nodeStart(state, pos)) {
          return {
            changes: {insert: token2 + token2, from: pos},
            effects: closeBracketEffect.of(pos + token2.length),
            range: EditorSelection.cursor(pos + token2.length)
          };
        } else if (closedBracketAt(state, pos)) {
          let isTriple = allowTriple && state.sliceDoc(pos, pos + token2.length * 3) == token2 + token2 + token2;
          return {
            range: EditorSelection.cursor(pos + token2.length * (isTriple ? 3 : 1)),
            effects: skipBracketEffect.of(pos)
          };
        }
      } else if (allowTriple && state.sliceDoc(pos - 2 * token2.length, pos) == token2 + token2 && nodeStart(state, pos - 2 * token2.length)) {
        return {
          changes: {insert: token2 + token2 + token2 + token2, from: pos},
          effects: closeBracketEffect.of(pos + token2.length),
          range: EditorSelection.cursor(pos + token2.length)
        };
      } else if (state.charCategorizer(pos)(next2) != CharCategory.Word) {
        let prev = state.sliceDoc(pos - 1, pos);
        if (prev != token2 && state.charCategorizer(pos)(prev) != CharCategory.Word)
          return {
            changes: {insert: token2 + token2, from: pos},
            effects: closeBracketEffect.of(pos + token2.length),
            range: EditorSelection.cursor(pos + token2.length)
          };
      }
      return {range: dont = range};
    });
    return dont ? null : state.update(changes, {
      scrollIntoView: true,
      annotations: Transaction.userEvent.of("input")
    });
  }
  function nodeStart(state, pos) {
    let tree = syntaxTree(state).resolve(pos + 1);
    return tree.parent && tree.from == pos;
  }

  // node_modules/@codemirror/commands/dist/index.js
  function updateSel(sel, by) {
    return EditorSelection.create(sel.ranges.map(by), sel.mainIndex);
  }
  function setSel(state, selection) {
    return state.update({selection, scrollIntoView: true, annotations: Transaction.userEvent.of("keyboardselection")});
  }
  function moveSel({state, dispatch}, how) {
    let selection = updateSel(state.selection, how);
    if (selection.eq(state.selection))
      return false;
    dispatch(setSel(state, selection));
    return true;
  }
  function rangeEnd(range, forward) {
    return EditorSelection.cursor(forward ? range.to : range.from);
  }
  function cursorByChar(view, forward) {
    return moveSel(view, (range) => range.empty ? view.moveByChar(range, forward) : rangeEnd(range, forward));
  }
  var cursorCharLeft = (view) => cursorByChar(view, view.textDirection != Direction.LTR);
  var cursorCharRight = (view) => cursorByChar(view, view.textDirection == Direction.LTR);
  function cursorByGroup(view, forward) {
    return moveSel(view, (range) => range.empty ? view.moveByGroup(range, forward) : rangeEnd(range, forward));
  }
  var cursorGroupLeft = (view) => cursorByGroup(view, view.textDirection != Direction.LTR);
  var cursorGroupRight = (view) => cursorByGroup(view, view.textDirection == Direction.LTR);
  var cursorGroupForward = (view) => cursorByGroup(view, true);
  var cursorGroupBackward = (view) => cursorByGroup(view, false);
  function cursorByLine(view, forward) {
    return moveSel(view, (range) => range.empty ? view.moveVertically(range, forward) : rangeEnd(range, forward));
  }
  var cursorLineUp = (view) => cursorByLine(view, false);
  var cursorLineDown = (view) => cursorByLine(view, true);
  function cursorByPage(view, forward) {
    return moveSel(view, (range) => range.empty ? view.moveVertically(range, forward, view.dom.clientHeight) : rangeEnd(range, forward));
  }
  var cursorPageUp = (view) => cursorByPage(view, false);
  var cursorPageDown = (view) => cursorByPage(view, true);
  function moveByLineBoundary(view, start, forward) {
    let line = view.visualLineAt(start.head), moved = view.moveToLineBoundary(start, forward);
    if (moved.head == start.head && moved.head != (forward ? line.to : line.from))
      moved = view.moveToLineBoundary(start, forward, false);
    if (!forward && moved.head == line.from && line.length) {
      let space = /^\s*/.exec(view.state.sliceDoc(line.from, Math.min(line.from + 100, line.to)))[0].length;
      if (space && start.head != line.from + space)
        moved = EditorSelection.cursor(line.from + space);
    }
    return moved;
  }
  var cursorLineBoundaryForward = (view) => moveSel(view, (range) => moveByLineBoundary(view, range, true));
  var cursorLineBoundaryBackward = (view) => moveSel(view, (range) => moveByLineBoundary(view, range, false));
  var cursorLineStart = (view) => moveSel(view, (range) => EditorSelection.cursor(view.visualLineAt(range.head).from, 1));
  var cursorLineEnd = (view) => moveSel(view, (range) => EditorSelection.cursor(view.visualLineAt(range.head).to, -1));
  function extendSel(view, how) {
    let selection = updateSel(view.state.selection, (range) => {
      let head = how(range);
      return EditorSelection.range(range.anchor, head.head, head.goalColumn);
    });
    if (selection.eq(view.state.selection))
      return false;
    view.dispatch(setSel(view.state, selection));
    return true;
  }
  function selectByChar(view, forward) {
    return extendSel(view, (range) => view.moveByChar(range, forward));
  }
  var selectCharLeft = (view) => selectByChar(view, view.textDirection != Direction.LTR);
  var selectCharRight = (view) => selectByChar(view, view.textDirection == Direction.LTR);
  function selectByGroup(view, forward) {
    return extendSel(view, (range) => view.moveByGroup(range, forward));
  }
  var selectGroupLeft = (view) => selectByGroup(view, view.textDirection != Direction.LTR);
  var selectGroupRight = (view) => selectByGroup(view, view.textDirection == Direction.LTR);
  var selectGroupForward = (view) => selectByGroup(view, true);
  var selectGroupBackward = (view) => selectByGroup(view, false);
  function selectByLine(view, forward) {
    return extendSel(view, (range) => view.moveVertically(range, forward));
  }
  var selectLineUp = (view) => selectByLine(view, false);
  var selectLineDown = (view) => selectByLine(view, true);
  function selectByPage(view, forward) {
    return extendSel(view, (range) => view.moveVertically(range, forward, view.dom.clientHeight));
  }
  var selectPageUp = (view) => selectByPage(view, false);
  var selectPageDown = (view) => selectByPage(view, true);
  var selectLineBoundaryForward = (view) => extendSel(view, (range) => moveByLineBoundary(view, range, true));
  var selectLineBoundaryBackward = (view) => extendSel(view, (range) => moveByLineBoundary(view, range, false));
  var selectLineStart = (view) => extendSel(view, (range) => EditorSelection.cursor(view.visualLineAt(range.head).from));
  var selectLineEnd = (view) => extendSel(view, (range) => EditorSelection.cursor(view.visualLineAt(range.head).to));
  var cursorDocStart = ({state, dispatch}) => {
    dispatch(setSel(state, {anchor: 0}));
    return true;
  };
  var cursorDocEnd = ({state, dispatch}) => {
    dispatch(setSel(state, {anchor: state.doc.length}));
    return true;
  };
  var selectDocStart = ({state, dispatch}) => {
    dispatch(setSel(state, {anchor: state.selection.main.anchor, head: 0}));
    return true;
  };
  var selectDocEnd = ({state, dispatch}) => {
    dispatch(setSel(state, {anchor: state.selection.main.anchor, head: state.doc.length}));
    return true;
  };
  var selectAll = ({state, dispatch}) => {
    dispatch(state.update({selection: {anchor: 0, head: state.doc.length}, annotations: Transaction.userEvent.of("keyboardselection")}));
    return true;
  };
  function deleteBy({state, dispatch}, by) {
    let changes = state.changeByRange((range) => {
      let {from, to} = range;
      if (from == to) {
        let towards = by(from);
        from = Math.min(from, towards);
        to = Math.max(to, towards);
      }
      return from == to ? {range} : {changes: {from, to}, range: EditorSelection.cursor(from)};
    });
    if (changes.changes.empty)
      return false;
    dispatch(state.update(changes, {scrollIntoView: true, annotations: Transaction.userEvent.of("delete")}));
    return true;
  }
  var deleteByChar = (target, forward, codePoint) => deleteBy(target, (pos) => {
    let {state} = target, line = state.doc.lineAt(pos), before;
    if (!forward && pos > line.from && pos < line.from + 200 && !/[^ \t]/.test(before = line.text.slice(0, pos - line.from))) {
      if (before[before.length - 1] == "	")
        return pos - 1;
      let col = countColumn(before, 0, state.tabSize), drop = col % getIndentUnit(state) || getIndentUnit(state);
      for (let i = 0; i < drop && before[before.length - 1 - i] == " "; i++)
        pos--;
      return pos;
    }
    let targetPos;
    if (codePoint) {
      let next2 = line.text.slice(pos - line.from + (forward ? 0 : -2), pos - line.from + (forward ? 2 : 0));
      let size = next2 ? codePointSize(codePointAt(next2, 0)) : 1;
      targetPos = forward ? Math.min(state.doc.length, pos + size) : Math.max(0, pos - size);
    } else {
      targetPos = findClusterBreak(line.text, pos - line.from, forward) + line.from;
    }
    if (targetPos == pos && line.number != (forward ? state.doc.lines : 1))
      targetPos += forward ? 1 : -1;
    return targetPos;
  });
  var deleteCodePointBackward = (view) => deleteByChar(view, false, true);
  var deleteCharBackward = (view) => deleteByChar(view, false, false);
  var deleteCharForward = (view) => deleteByChar(view, true, false);
  var deleteByGroup = (target, forward) => deleteBy(target, (start) => {
    let pos = start, {state} = target, line = state.doc.lineAt(pos);
    let categorize = state.charCategorizer(pos);
    for (let cat = null; ; ) {
      if (pos == (forward ? line.to : line.from)) {
        if (pos == start && line.number != (forward ? state.doc.lines : 1))
          pos += forward ? 1 : -1;
        break;
      }
      let next2 = findClusterBreak(line.text, pos - line.from, forward) + line.from;
      let nextChar2 = line.text.slice(Math.min(pos, next2) - line.from, Math.max(pos, next2) - line.from);
      let nextCat = categorize(nextChar2);
      if (cat != null && nextCat != cat)
        break;
      if (nextChar2 != " " || pos != start)
        cat = nextCat;
      pos = next2;
    }
    return pos;
  });
  var deleteGroupBackward = (target) => deleteByGroup(target, false);
  var deleteGroupForward = (target) => deleteByGroup(target, true);
  var deleteToLineEnd = (view) => deleteBy(view, (pos) => {
    let lineEnd = view.visualLineAt(pos).to;
    if (pos < lineEnd)
      return lineEnd;
    return Math.min(view.state.doc.length, pos + 1);
  });
  var deleteToLineStart = (view) => deleteBy(view, (pos) => {
    let lineStart = view.visualLineAt(pos).from;
    if (pos > lineStart)
      return lineStart;
    return Math.max(0, pos - 1);
  });
  var splitLine = ({state, dispatch}) => {
    let changes = state.changeByRange((range) => {
      return {
        changes: {from: range.from, to: range.to, insert: Text.of(["", ""])},
        range: EditorSelection.cursor(range.from)
      };
    });
    dispatch(state.update(changes, {scrollIntoView: true, annotations: Transaction.userEvent.of("input")}));
    return true;
  };
  var transposeChars = ({state, dispatch}) => {
    let changes = state.changeByRange((range) => {
      if (!range.empty || range.from == 0 || range.from == state.doc.length)
        return {range};
      let pos = range.from, line = state.doc.lineAt(pos);
      let from = pos == line.from ? pos - 1 : findClusterBreak(line.text, pos - line.from, false) + line.from;
      let to = pos == line.to ? pos + 1 : findClusterBreak(line.text, pos - line.from, true) + line.from;
      return {
        changes: {from, to, insert: state.doc.slice(pos, to).append(state.doc.slice(from, pos))},
        range: EditorSelection.cursor(to)
      };
    });
    if (changes.changes.empty)
      return false;
    dispatch(state.update(changes, {scrollIntoView: true}));
    return true;
  };
  function isBetweenBrackets(state, pos) {
    if (/\(\)|\[\]|\{\}/.test(state.sliceDoc(pos - 1, pos + 1)))
      return {from: pos, to: pos};
    let context = syntaxTree(state).resolve(pos);
    let before = context.childBefore(pos), after = context.childAfter(pos), closedBy;
    if (before && after && before.to <= pos && after.from >= pos && (closedBy = before.type.prop(NodeProp.closedBy)) && closedBy.indexOf(after.name) > -1 && state.doc.lineAt(before.to).from == state.doc.lineAt(after.from).from)
      return {from: before.to, to: after.from};
    return null;
  }
  var insertNewlineAndIndent = ({state, dispatch}) => {
    let changes = state.changeByRange(({from, to}) => {
      let explode = from == to && isBetweenBrackets(state, from);
      let cx = new IndentContext(state, {simulateBreak: from, simulateDoubleBreak: !!explode});
      let indent = getIndentation(cx, from);
      if (indent == null)
        indent = /^\s*/.exec(state.doc.lineAt(from).text)[0].length;
      let line = state.doc.lineAt(from);
      while (to < line.to && /\s/.test(line.text.slice(to - line.from, to + 1 - line.from)))
        to++;
      if (explode)
        ({from, to} = explode);
      else if (from > line.from && from < line.from + 100 && !/\S/.test(line.text.slice(0, from)))
        from = line.from;
      let insert2 = ["", indentString(state, indent)];
      if (explode)
        insert2.push(indentString(state, cx.lineIndent(line)));
      return {
        changes: {from, to, insert: Text.of(insert2)},
        range: EditorSelection.cursor(from + 1 + insert2[1].length)
      };
    });
    dispatch(state.update(changes, {scrollIntoView: true}));
    return true;
  };
  function changeBySelectedLine(state, f) {
    let atLine = -1;
    return state.changeByRange((range) => {
      let changes = [];
      for (let pos = range.from; pos <= range.to; ) {
        let line = state.doc.lineAt(pos);
        if (line.number > atLine && (range.empty || range.to > line.from)) {
          f(line, changes, range);
          atLine = line.number;
        }
        pos = line.to + 1;
      }
      let changeSet = state.changes(changes);
      return {
        changes,
        range: EditorSelection.range(changeSet.mapPos(range.anchor, 1), changeSet.mapPos(range.head, 1))
      };
    });
  }
  var indentSelection = ({state, dispatch}) => {
    let updated = Object.create(null);
    let context = new IndentContext(state, {overrideIndentation: (start) => {
      let found = updated[start];
      return found == null ? -1 : found;
    }});
    let changes = changeBySelectedLine(state, (line, changes2, range) => {
      let indent = getIndentation(context, line.from);
      if (indent == null)
        return;
      let cur = /^\s*/.exec(line.text)[0];
      let norm = indentString(state, indent);
      if (cur != norm || range.from < line.from + cur.length) {
        updated[line.from] = indent;
        changes2.push({from: line.from, to: line.from + cur.length, insert: norm});
      }
    });
    if (!changes.changes.empty)
      dispatch(state.update(changes));
    return true;
  };
  var indentMore = ({state, dispatch}) => {
    dispatch(state.update(changeBySelectedLine(state, (line, changes) => {
      changes.push({from: line.from, insert: state.facet(indentUnit)});
    })));
    return true;
  };
  var insertTab = ({state, dispatch}) => {
    if (state.selection.ranges.some((r) => !r.empty))
      return indentMore({state, dispatch});
    dispatch(state.update(state.replaceSelection("	"), {scrollIntoView: true, annotations: Transaction.userEvent.of("input")}));
    return true;
  };
  var emacsStyleKeymap = [
    {key: "Ctrl-b", run: cursorCharLeft, shift: selectCharLeft, preventDefault: true},
    {key: "Ctrl-f", run: cursorCharRight, shift: selectCharRight},
    {key: "Ctrl-p", run: cursorLineUp, shift: selectLineUp},
    {key: "Ctrl-n", run: cursorLineDown, shift: selectLineDown},
    {key: "Ctrl-a", run: cursorLineStart, shift: selectLineStart},
    {key: "Ctrl-e", run: cursorLineEnd, shift: selectLineEnd},
    {key: "Ctrl-d", run: deleteCharForward},
    {key: "Ctrl-h", run: deleteCharBackward},
    {key: "Ctrl-k", run: deleteToLineEnd},
    {key: "Alt-d", run: deleteGroupForward},
    {key: "Ctrl-Alt-h", run: deleteGroupBackward},
    {key: "Ctrl-o", run: splitLine},
    {key: "Ctrl-t", run: transposeChars},
    {key: "Alt-f", run: cursorGroupForward, shift: selectGroupForward},
    {key: "Alt-b", run: cursorGroupBackward, shift: selectGroupBackward},
    {key: "Alt-<", run: cursorDocStart},
    {key: "Alt->", run: cursorDocEnd},
    {key: "Ctrl-v", run: cursorPageDown},
    {key: "Alt-v", run: cursorPageUp}
  ];
  var standardKeymap = /* @__PURE__ */ [
    {key: "ArrowLeft", run: cursorCharLeft, shift: selectCharLeft},
    {key: "Mod-ArrowLeft", mac: "Alt-ArrowLeft", run: cursorGroupLeft, shift: selectGroupLeft},
    {mac: "Cmd-ArrowLeft", run: cursorLineBoundaryBackward, shift: selectLineBoundaryBackward},
    {key: "ArrowRight", run: cursorCharRight, shift: selectCharRight},
    {key: "Mod-ArrowRight", mac: "Alt-ArrowRight", run: cursorGroupRight, shift: selectGroupRight},
    {mac: "Cmd-ArrowRight", run: cursorLineBoundaryForward, shift: selectLineBoundaryForward},
    {key: "ArrowUp", run: cursorLineUp, shift: selectLineUp},
    {mac: "Cmd-ArrowUp", run: cursorDocStart, shift: selectDocStart},
    {mac: "Ctrl-ArrowUp", run: cursorPageUp, shift: selectPageUp},
    {key: "ArrowDown", run: cursorLineDown, shift: selectLineDown},
    {mac: "Cmd-ArrowDown", run: cursorDocEnd, shift: selectDocEnd},
    {mac: "Ctrl-ArrowDown", run: cursorPageDown, shift: selectPageDown},
    {key: "PageUp", run: cursorPageUp, shift: selectPageUp},
    {key: "PageDown", run: cursorPageDown, shift: selectPageDown},
    {key: "Home", run: cursorLineBoundaryBackward, shift: selectLineBoundaryBackward},
    {key: "Mod-Home", run: cursorDocStart, shift: selectDocStart},
    {key: "End", run: cursorLineBoundaryForward, shift: selectLineBoundaryForward},
    {key: "Mod-End", run: cursorDocEnd, shift: selectDocEnd},
    {key: "Enter", run: insertNewlineAndIndent},
    {key: "Mod-a", run: selectAll},
    {key: "Backspace", run: deleteCodePointBackward, shift: deleteCodePointBackward},
    {key: "Delete", run: deleteCharForward, shift: deleteCharForward},
    {key: "Mod-Backspace", mac: "Alt-Backspace", run: deleteGroupBackward},
    {key: "Mod-Delete", mac: "Alt-Delete", run: deleteGroupForward},
    {mac: "Mod-Backspace", run: deleteToLineStart},
    {mac: "Mod-Delete", run: deleteToLineEnd}
  ].concat(/* @__PURE__ */ emacsStyleKeymap.map((b) => ({mac: b.key, run: b.run, shift: b.shift})));
  var defaultTabBinding = {key: "Tab", run: insertTab, shift: indentSelection};

  // node_modules/@codemirror/gutter/dist/index.js
  var GutterMarker = class extends RangeValue {
    compare(other) {
      return this == other || this.constructor == other.constructor && this.eq(other);
    }
    toDOM(_view) {
      return null;
    }
    at(pos) {
      return this.range(pos);
    }
  };
  GutterMarker.prototype.elementClass = "";
  GutterMarker.prototype.mapMode = MapMode.TrackBefore;
  var defaults2 = {
    class: "",
    renderEmptyElements: false,
    elementStyle: "",
    markers: () => RangeSet.empty,
    lineMarker: () => null,
    initialSpacer: null,
    updateSpacer: null,
    domEventHandlers: {}
  };
  var activeGutters = /* @__PURE__ */ Facet.define();
  function gutter(config2) {
    return [gutters(), activeGutters.of(Object.assign(Object.assign({}, defaults2), config2))];
  }
  var baseTheme2 = /* @__PURE__ */ EditorView.baseTheme({
    ".cm-gutters": {
      display: "flex",
      height: "100%",
      boxSizing: "border-box",
      left: 0,
      zIndex: 200
    },
    "&light .cm-gutters": {
      backgroundColor: "#f5f5f5",
      color: "#999",
      borderRight: "1px solid #ddd"
    },
    "&dark .cm-gutters": {
      backgroundColor: "#333338",
      color: "#ccc"
    },
    ".cm-gutter": {
      display: "flex !important",
      flexDirection: "column",
      flexShrink: 0,
      boxSizing: "border-box",
      height: "100%",
      overflow: "hidden"
    },
    ".cm-gutterElement": {
      boxSizing: "border-box"
    },
    ".cm-lineNumbers .cm-gutterElement": {
      padding: "0 3px 0 5px",
      minWidth: "20px",
      textAlign: "right",
      whiteSpace: "nowrap"
    }
  });
  var unfixGutters = /* @__PURE__ */ Facet.define({
    combine: (values) => values.some((x) => x)
  });
  function gutters(config2) {
    let result = [
      gutterView,
      baseTheme2
    ];
    if (config2 && config2.fixed === false)
      result.push(unfixGutters.of(true));
    return result;
  }
  var gutterView = /* @__PURE__ */ ViewPlugin.fromClass(class {
    constructor(view) {
      this.view = view;
      this.dom = document.createElement("div");
      this.dom.className = "cm-gutters";
      this.dom.setAttribute("aria-hidden", "true");
      this.gutters = view.state.facet(activeGutters).map((conf) => new SingleGutterView(view, conf));
      for (let gutter2 of this.gutters)
        this.dom.appendChild(gutter2.dom);
      this.fixed = !view.state.facet(unfixGutters);
      if (this.fixed) {
        this.dom.style.position = "sticky";
      }
      view.scrollDOM.insertBefore(this.dom, view.contentDOM);
      this.syncGutters();
    }
    update(update) {
      if (this.updateGutters(update))
        this.syncGutters();
    }
    syncGutters() {
      let contexts = this.gutters.map((gutter2) => new UpdateContext(gutter2, this.view.viewport));
      this.view.viewportLines((line) => {
        let text;
        if (Array.isArray(line.type)) {
          for (let b of line.type)
            if (b.type == BlockType.Text) {
              text = b;
              break;
            }
        } else {
          text = line.type == BlockType.Text ? line : void 0;
        }
        if (!text)
          return;
        for (let cx of contexts)
          cx.line(this.view, text);
      }, 0);
      for (let cx of contexts)
        cx.finish();
      this.dom.style.minHeight = this.view.contentHeight + "px";
      if (this.view.state.facet(unfixGutters) != !this.fixed) {
        this.fixed = !this.fixed;
        this.dom.style.position = this.fixed ? "sticky" : "";
      }
    }
    updateGutters(update) {
      let prev = update.startState.facet(activeGutters), cur = update.state.facet(activeGutters);
      let change = update.docChanged || update.heightChanged || update.viewportChanged;
      if (prev == cur) {
        for (let gutter2 of this.gutters)
          if (gutter2.update(update))
            change = true;
      } else {
        change = true;
        let gutters2 = [];
        for (let conf of cur) {
          let known = prev.indexOf(conf);
          if (known < 0) {
            gutters2.push(new SingleGutterView(this.view, conf));
          } else {
            this.gutters[known].update(update);
            gutters2.push(this.gutters[known]);
          }
        }
        for (let g of this.gutters)
          g.dom.remove();
        for (let g of gutters2)
          this.dom.appendChild(g.dom);
        this.gutters = gutters2;
      }
      return change;
    }
    destroy() {
      this.dom.remove();
    }
  }, {
    provide: /* @__PURE__ */ PluginField.scrollMargins.from((value) => {
      if (value.gutters.length == 0 || !value.fixed)
        return null;
      return value.view.textDirection == Direction.LTR ? {left: value.dom.offsetWidth} : {right: value.dom.offsetWidth};
    })
  });
  function asArray2(val) {
    return Array.isArray(val) ? val : [val];
  }
  var UpdateContext = class {
    constructor(gutter2, viewport) {
      this.gutter = gutter2;
      this.localMarkers = [];
      this.i = 0;
      this.height = 0;
      this.cursor = RangeSet.iter(gutter2.markers, viewport.from);
    }
    line(view, line) {
      if (this.localMarkers.length)
        this.localMarkers = [];
      while (this.cursor.value && this.cursor.from <= line.from) {
        if (this.cursor.from == line.from)
          this.localMarkers.push(this.cursor.value);
        this.cursor.next();
      }
      let forLine = this.gutter.config.lineMarker(view, line, this.localMarkers);
      if (forLine)
        this.localMarkers.unshift(forLine);
      let gutter2 = this.gutter;
      if (this.localMarkers.length == 0 && !gutter2.config.renderEmptyElements)
        return;
      let above = line.top - this.height;
      if (this.i == gutter2.elements.length) {
        let newElt = new GutterElement(view, line.height, above, this.localMarkers);
        gutter2.elements.push(newElt);
        gutter2.dom.appendChild(newElt.dom);
      } else {
        let markers = this.localMarkers, elt = gutter2.elements[this.i];
        if (sameMarkers(markers, elt.markers)) {
          markers = elt.markers;
          this.localMarkers.length = 0;
        }
        elt.update(view, line.height, above, markers);
      }
      this.height = line.bottom;
      this.i++;
    }
    finish() {
      let gutter2 = this.gutter;
      while (gutter2.elements.length > this.i)
        gutter2.dom.removeChild(gutter2.elements.pop().dom);
    }
  };
  var SingleGutterView = class {
    constructor(view, config2) {
      this.view = view;
      this.config = config2;
      this.elements = [];
      this.spacer = null;
      this.dom = document.createElement("div");
      this.dom.className = "cm-gutter" + (this.config.class ? " " + this.config.class : "");
      for (let prop in config2.domEventHandlers) {
        this.dom.addEventListener(prop, (event) => {
          let line = view.visualLineAtHeight(event.clientY, view.contentDOM.getBoundingClientRect().top);
          if (config2.domEventHandlers[prop](view, line, event))
            event.preventDefault();
        });
      }
      this.markers = asArray2(config2.markers(view));
      if (config2.initialSpacer) {
        this.spacer = new GutterElement(view, 0, 0, [config2.initialSpacer(view)]);
        this.dom.appendChild(this.spacer.dom);
        this.spacer.dom.style.cssText += "visibility: hidden; pointer-events: none";
      }
    }
    update(update) {
      let prevMarkers = this.markers;
      this.markers = asArray2(this.config.markers(update.view));
      if (this.spacer && this.config.updateSpacer) {
        let updated = this.config.updateSpacer(this.spacer.markers[0], update);
        if (updated != this.spacer.markers[0])
          this.spacer.update(update.view, 0, 0, [updated]);
      }
      return this.markers != prevMarkers;
    }
  };
  var GutterElement = class {
    constructor(view, height, above, markers) {
      this.height = -1;
      this.above = 0;
      this.dom = document.createElement("div");
      this.update(view, height, above, markers);
    }
    update(view, height, above, markers) {
      if (this.height != height)
        this.dom.style.height = (this.height = height) + "px";
      if (this.above != above)
        this.dom.style.marginTop = (this.above = above) ? above + "px" : "";
      if (this.markers != markers) {
        this.markers = markers;
        for (let ch; ch = this.dom.lastChild; )
          ch.remove();
        let cls = "cm-gutterElement";
        for (let m of markers) {
          let dom = m.toDOM(view);
          if (dom)
            this.dom.appendChild(dom);
          let c = m.elementClass;
          if (c)
            cls += " " + c;
        }
        this.dom.className = cls;
      }
    }
  };
  function sameMarkers(a, b) {
    if (a.length != b.length)
      return false;
    for (let i = 0; i < a.length; i++)
      if (!a[i].compare(b[i]))
        return false;
    return true;
  }
  var lineNumberMarkers = /* @__PURE__ */ Facet.define();
  var lineNumberConfig = /* @__PURE__ */ Facet.define({
    combine(values) {
      return combineConfig(values, {formatNumber: String, domEventHandlers: {}}, {
        domEventHandlers(a, b) {
          let result = Object.assign({}, a);
          for (let event in b) {
            let exists = result[event], add = b[event];
            result[event] = exists ? (view, line, event2) => exists(view, line, event2) || add(view, line, event2) : add;
          }
          return result;
        }
      });
    }
  });
  var NumberMarker = class extends GutterMarker {
    constructor(number2) {
      super();
      this.number = number2;
    }
    eq(other) {
      return this.number == other.number;
    }
    toDOM() {
      return document.createTextNode(this.number);
    }
  };
  function formatNumber(view, number2) {
    return view.state.facet(lineNumberConfig).formatNumber(number2, view.state);
  }
  var lineNumberGutter = /* @__PURE__ */ gutter({
    class: "cm-lineNumbers",
    markers(view) {
      return view.state.facet(lineNumberMarkers);
    },
    lineMarker(view, line, others) {
      if (others.length)
        return null;
      return new NumberMarker(formatNumber(view, view.state.doc.lineAt(line.from).number));
    },
    initialSpacer(view) {
      return new NumberMarker(formatNumber(view, maxLineNumber(view.state.doc.lines)));
    },
    updateSpacer(spacer, update) {
      let max = formatNumber(update.view, maxLineNumber(update.view.state.doc.lines));
      return max == spacer.number ? spacer : new NumberMarker(max);
    }
  });
  function lineNumbers(config2 = {}) {
    return [
      lineNumberConfig.of(config2),
      lineNumberGutter
    ];
  }
  function maxLineNumber(lines2) {
    let last = 9;
    while (last < lines2)
      last = last * 10 + 9;
    return last;
  }

  // node_modules/@codemirror/highlight/dist/index.js
  var nextTagID = 0;
  var Tag = class {
    constructor(set, base2, modified) {
      this.set = set;
      this.base = base2;
      this.modified = modified;
      this.id = nextTagID++;
    }
    static define(parent) {
      if (parent === null || parent === void 0 ? void 0 : parent.base)
        throw new Error("Can not derive from a modified tag");
      let tag = new Tag([], null, []);
      tag.set.push(tag);
      if (parent)
        for (let t2 of parent.set)
          tag.set.push(t2);
      return tag;
    }
    static defineModifier() {
      let mod = new Modifier();
      return (tag) => {
        if (tag.modified.indexOf(mod) > -1)
          return tag;
        return Modifier.get(tag.base || tag, tag.modified.concat(mod).sort((a, b) => a.id - b.id));
      };
    }
  };
  var nextModifierID = 0;
  var Modifier = class {
    constructor() {
      this.instances = [];
      this.id = nextModifierID++;
    }
    static get(base2, mods) {
      if (!mods.length)
        return base2;
      let exists = mods[0].instances.find((t2) => t2.base == base2 && sameArray2(mods, t2.modified));
      if (exists)
        return exists;
      let set = [], tag = new Tag(set, base2, mods);
      for (let m of mods)
        m.instances.push(tag);
      let configs = permute(mods);
      for (let parent of base2.set)
        for (let config2 of configs)
          set.push(Modifier.get(parent, config2));
      return tag;
    }
  };
  function sameArray2(a, b) {
    return a.length == b.length && a.every((x, i) => x == b[i]);
  }
  function permute(array) {
    let result = [array];
    for (let i = 0; i < array.length; i++) {
      for (let a of permute(array.slice(0, i).concat(array.slice(i + 1))))
        result.push(a);
    }
    return result;
  }
  function styleTags(spec) {
    let byName = Object.create(null);
    for (let prop in spec) {
      let tags2 = spec[prop];
      if (!Array.isArray(tags2))
        tags2 = [tags2];
      for (let part of prop.split(" "))
        if (part) {
          let pieces = [], mode = 2, rest = part;
          for (let pos = 0; ; ) {
            if (rest == "..." && pos > 0 && pos + 3 == part.length) {
              mode = 1;
              break;
            }
            let m = /^"(?:[^"\\]|\\.)*?"|[^\/!]+/.exec(rest);
            if (!m)
              throw new RangeError("Invalid path: " + part);
            pieces.push(m[0] == "*" ? null : m[0][0] == '"' ? JSON.parse(m[0]) : m[0]);
            pos += m[0].length;
            if (pos == part.length)
              break;
            let next2 = part[pos++];
            if (pos == part.length && next2 == "!") {
              mode = 0;
              break;
            }
            if (next2 != "/")
              throw new RangeError("Invalid path: " + part);
            rest = part.slice(pos);
          }
          let last = pieces.length - 1, inner = pieces[last];
          if (!inner)
            throw new RangeError("Invalid path: " + part);
          let rule = new Rule(tags2, mode, last > 0 ? pieces.slice(0, last) : null);
          byName[inner] = rule.sort(byName[inner]);
        }
    }
    return ruleNodeProp.add(byName);
  }
  var ruleNodeProp = new NodeProp();
  var highlightStyle = Facet.define({
    combine(stylings) {
      return stylings.length ? HighlightStyle.combinedMatch(stylings) : null;
    }
  });
  var fallbackHighlightStyle = Facet.define({
    combine(values) {
      return values.length ? values[0].match : null;
    }
  });
  function noHighlight() {
    return null;
  }
  function getHighlightStyle(state) {
    return state.facet(highlightStyle) || state.facet(fallbackHighlightStyle) || noHighlight;
  }
  var Rule = class {
    constructor(tags2, mode, context, next2) {
      this.tags = tags2;
      this.mode = mode;
      this.context = context;
      this.next = next2;
    }
    sort(other) {
      if (!other || other.depth < this.depth) {
        this.next = other;
        return this;
      }
      other.next = this.sort(other.next);
      return other;
    }
    get depth() {
      return this.context ? this.context.length : 0;
    }
  };
  var HighlightStyle = class {
    constructor(spec, options) {
      this.map = Object.create(null);
      let modSpec;
      function def(spec2) {
        let cls = StyleModule.newName();
        (modSpec || (modSpec = Object.create(null)))["." + cls] = spec2;
        return cls;
      }
      this.all = typeof options.all == "string" ? options.all : options.all ? def(options.all) : null;
      for (let style of spec) {
        let cls = (style.class || def(Object.assign({}, style, {tag: null}))) + (this.all ? " " + this.all : "");
        let tags2 = style.tag;
        if (!Array.isArray(tags2))
          this.map[tags2.id] = cls;
        else
          for (let tag of tags2)
            this.map[tag.id] = cls;
      }
      this.module = modSpec ? new StyleModule(modSpec) : null;
      this.scope = options.scope || null;
      this.match = this.match.bind(this);
      let ext = [treeHighlighter];
      if (this.module)
        ext.push(EditorView.styleModule.of(this.module));
      this.extension = ext.concat(highlightStyle.of(this));
      this.fallback = ext.concat(fallbackHighlightStyle.of(this));
    }
    match(tag, scope) {
      if (this.scope && scope != this.scope)
        return null;
      for (let t2 of tag.set) {
        let match2 = this.map[t2.id];
        if (match2 !== void 0) {
          if (t2 != tag)
            this.map[tag.id] = match2;
          return match2;
        }
      }
      return this.map[tag.id] = this.all;
    }
    static combinedMatch(styles) {
      if (styles.length == 1)
        return styles[0].match;
      let cache = styles.some((s) => s.scope) ? void 0 : Object.create(null);
      return (tag, scope) => {
        let cached = cache && cache[tag.id];
        if (cached !== void 0)
          return cached;
        let result = null;
        for (let style of styles) {
          let value = style.match(tag, scope);
          if (value)
            result = result ? result + " " + value : value;
        }
        if (cache)
          cache[tag.id] = result;
        return result;
      };
    }
    static define(specs, options) {
      return new HighlightStyle(specs, options || {});
    }
    static get(state, tag, scope) {
      return getHighlightStyle(state)(tag, scope || NodeType.none);
    }
  };
  var TreeHighlighter = class {
    constructor(view) {
      this.markCache = Object.create(null);
      this.tree = syntaxTree(view.state);
      this.decorations = this.buildDeco(view, getHighlightStyle(view.state));
    }
    update(update) {
      let tree = syntaxTree(update.state), style = getHighlightStyle(update.state);
      let styleChange = style != update.startState.facet(highlightStyle);
      if (tree.length < update.view.viewport.to && !styleChange) {
        this.decorations = this.decorations.map(update.changes);
      } else if (tree != this.tree || update.viewportChanged || styleChange) {
        this.tree = tree;
        this.decorations = this.buildDeco(update.view, style);
      }
    }
    buildDeco(view, match2) {
      if (match2 == noHighlight || !this.tree.length)
        return Decoration.none;
      let builder = new RangeSetBuilder();
      for (let {from, to} of view.visibleRanges) {
        highlightTreeRange(this.tree, from, to, match2, (from2, to2, style) => {
          builder.add(from2, to2, this.markCache[style] || (this.markCache[style] = Decoration.mark({class: style})));
        });
      }
      return builder.finish();
    }
  };
  var treeHighlighter = Prec.fallback(ViewPlugin.fromClass(TreeHighlighter, {
    decorations: (v) => v.decorations
  }));
  var nodeStack = [""];
  function highlightTreeRange(tree, from, to, style, span) {
    let spanStart = from, spanClass = "";
    let cursor = tree.topNode.cursor;
    function node(inheritedClass, depth2, scope) {
      let {type, from: start, to: end} = cursor;
      if (start >= to || end <= from)
        return;
      nodeStack[depth2] = type.name;
      if (type.isTop)
        scope = type;
      let cls = inheritedClass;
      let rule = type.prop(ruleNodeProp), opaque = false;
      while (rule) {
        if (!rule.context || matchContext(rule.context, nodeStack, depth2)) {
          for (let tag of rule.tags) {
            let st = style(tag, scope);
            if (st) {
              if (cls)
                cls += " ";
              cls += st;
              if (rule.mode == 1)
                inheritedClass += (inheritedClass ? " " : "") + st;
              else if (rule.mode == 0)
                opaque = true;
            }
          }
          break;
        }
        rule = rule.next;
      }
      if (cls != spanClass) {
        if (start > spanStart && spanClass)
          span(spanStart, cursor.from, spanClass);
        spanStart = start;
        spanClass = cls;
      }
      if (!opaque && cursor.firstChild()) {
        do {
          let end2 = cursor.to;
          node(inheritedClass, depth2 + 1, scope);
          if (spanClass != cls) {
            let pos = Math.min(to, end2);
            if (pos > spanStart && spanClass)
              span(spanStart, pos, spanClass);
            spanStart = pos;
            spanClass = cls;
          }
        } while (cursor.nextSibling());
        cursor.parent();
      }
    }
    node("", 0, tree.type);
  }
  function matchContext(context, stack, depth2) {
    if (context.length > depth2 - 1)
      return false;
    for (let d = depth2 - 1, i = context.length - 1; i >= 0; i--, d--) {
      let check = context[i];
      if (check && check != stack[d])
        return false;
    }
    return true;
  }
  var t = Tag.define;
  var comment = t();
  var name = t();
  var typeName = t(name);
  var literal = t();
  var string = t(literal);
  var number = t(literal);
  var content = t();
  var heading = t(content);
  var keyword = t();
  var operator = t();
  var punctuation = t();
  var bracket = t(punctuation);
  var meta = t();
  var tags = {
    comment,
    lineComment: t(comment),
    blockComment: t(comment),
    docComment: t(comment),
    name,
    variableName: t(name),
    typeName,
    tagName: t(typeName),
    propertyName: t(name),
    className: t(name),
    labelName: t(name),
    namespace: t(name),
    macroName: t(name),
    literal,
    string,
    docString: t(string),
    character: t(string),
    number,
    integer: t(number),
    float: t(number),
    bool: t(literal),
    regexp: t(literal),
    escape: t(literal),
    color: t(literal),
    url: t(literal),
    keyword,
    self: t(keyword),
    null: t(keyword),
    atom: t(keyword),
    unit: t(keyword),
    modifier: t(keyword),
    operatorKeyword: t(keyword),
    controlKeyword: t(keyword),
    definitionKeyword: t(keyword),
    operator,
    derefOperator: t(operator),
    arithmeticOperator: t(operator),
    logicOperator: t(operator),
    bitwiseOperator: t(operator),
    compareOperator: t(operator),
    updateOperator: t(operator),
    definitionOperator: t(operator),
    typeOperator: t(operator),
    controlOperator: t(operator),
    punctuation,
    separator: t(punctuation),
    bracket,
    angleBracket: t(bracket),
    squareBracket: t(bracket),
    paren: t(bracket),
    brace: t(bracket),
    content,
    heading,
    heading1: t(heading),
    heading2: t(heading),
    heading3: t(heading),
    heading4: t(heading),
    heading5: t(heading),
    heading6: t(heading),
    contentSeparator: t(content),
    list: t(content),
    quote: t(content),
    emphasis: t(content),
    strong: t(content),
    link: t(content),
    monospace: t(content),
    inserted: t(),
    deleted: t(),
    changed: t(),
    invalid: t(),
    meta,
    documentMeta: t(meta),
    annotation: t(meta),
    processingInstruction: t(meta),
    definition: Tag.defineModifier(),
    constant: Tag.defineModifier(),
    function: Tag.defineModifier(),
    standard: Tag.defineModifier(),
    local: Tag.defineModifier(),
    special: Tag.defineModifier()
  };
  var defaultHighlightStyle = HighlightStyle.define([
    {
      tag: tags.link,
      textDecoration: "underline"
    },
    {
      tag: tags.heading,
      textDecoration: "underline",
      fontWeight: "bold"
    },
    {
      tag: tags.emphasis,
      fontStyle: "italic"
    },
    {
      tag: tags.strong,
      fontWeight: "bold"
    },
    {
      tag: tags.keyword,
      color: "#708"
    },
    {
      tag: [tags.atom, tags.bool, tags.url, tags.contentSeparator, tags.labelName],
      color: "#219"
    },
    {
      tag: [tags.literal, tags.inserted],
      color: "#164"
    },
    {
      tag: [tags.string, tags.deleted],
      color: "#a11"
    },
    {
      tag: [tags.regexp, tags.escape, tags.special(tags.string)],
      color: "#e40"
    },
    {
      tag: tags.definition(tags.variableName),
      color: "#00f"
    },
    {
      tag: tags.local(tags.variableName),
      color: "#30a"
    },
    {
      tag: [tags.typeName, tags.namespace],
      color: "#085"
    },
    {
      tag: tags.className,
      color: "#167"
    },
    {
      tag: [tags.special(tags.variableName), tags.macroName],
      color: "#256"
    },
    {
      tag: tags.definition(tags.propertyName),
      color: "#00c"
    },
    {
      tag: tags.comment,
      color: "#940"
    },
    {
      tag: tags.meta,
      color: "#7a757a"
    },
    {
      tag: tags.invalid,
      color: "#f00"
    }
  ]);
  var classHighlightStyle = HighlightStyle.define([
    {tag: tags.link, class: "cmt-link"},
    {tag: tags.heading, class: "cmt-heading"},
    {tag: tags.emphasis, class: "cmt-emphasis"},
    {tag: tags.strong, class: "cmt-strong"},
    {tag: tags.keyword, class: "cmt-keyword"},
    {tag: tags.atom, class: "cmt-atom"},
    {tag: tags.bool, class: "cmt-bool"},
    {tag: tags.url, class: "cmt-url"},
    {tag: tags.labelName, class: "cmt-labelName"},
    {tag: tags.inserted, class: "cmt-inserted"},
    {tag: tags.deleted, class: "cmt-deleted"},
    {tag: tags.literal, class: "cmt-literal"},
    {tag: tags.string, class: "cmt-string"},
    {tag: tags.number, class: "cmt-number"},
    {tag: [tags.regexp, tags.escape, tags.special(tags.string)], class: "cmt-string2"},
    {tag: tags.variableName, class: "cmt-variableName"},
    {tag: tags.local(tags.variableName), class: "cmt-variableName cmt-local"},
    {tag: tags.definition(tags.variableName), class: "cmt-variableName cmt-definition"},
    {tag: tags.special(tags.variableName), class: "cmt-variableName2"},
    {tag: tags.typeName, class: "cmt-typeName"},
    {tag: tags.namespace, class: "cmt-namespace"},
    {tag: tags.macroName, class: "cmt-macroName"},
    {tag: tags.propertyName, class: "cmt-propertyName"},
    {tag: tags.operator, class: "cmt-operator"},
    {tag: tags.comment, class: "cmt-comment"},
    {tag: tags.meta, class: "cmt-meta"},
    {tag: tags.invalid, class: "cmt-invalid"},
    {tag: tags.punctuation, class: "cmt-punctuation"}
  ]);

  // node_modules/@codemirror/history/dist/index.js
  var fromHistory = Annotation.define();
  var isolateHistory = Annotation.define();
  var invertedEffects = Facet.define();
  var historyConfig = Facet.define({
    combine(configs) {
      return combineConfig(configs, {
        minDepth: 100,
        newGroupDelay: 500
      }, {minDepth: Math.max, newGroupDelay: Math.min});
    }
  });
  var historyField_ = StateField.define({
    create() {
      return HistoryState.empty;
    },
    update(state, tr) {
      let config2 = tr.state.facet(historyConfig);
      let fromHist = tr.annotation(fromHistory);
      if (fromHist) {
        let item = HistEvent.fromTransaction(tr), from = fromHist.side;
        let other = from == 0 ? state.undone : state.done;
        if (item)
          other = updateBranch(other, other.length, config2.minDepth, item);
        else
          other = addSelection(other, tr.startState.selection);
        return new HistoryState(from == 0 ? fromHist.rest : other, from == 0 ? other : fromHist.rest);
      }
      let isolate = tr.annotation(isolateHistory);
      if (isolate == "full" || isolate == "before")
        state = state.isolate();
      if (tr.annotation(Transaction.addToHistory) === false)
        return !tr.changes.empty ? state.addMapping(tr.changes.desc) : state;
      let event = HistEvent.fromTransaction(tr);
      let time = tr.annotation(Transaction.time), userEvent = tr.annotation(Transaction.userEvent);
      if (event)
        state = state.addChanges(event, time, userEvent, config2.newGroupDelay, config2.minDepth);
      else if (tr.selection)
        state = state.addSelection(tr.startState.selection, time, userEvent, config2.newGroupDelay);
      if (isolate == "full" || isolate == "after")
        state = state.isolate();
      return state;
    },
    toJSON(value) {
      return {done: value.done.map((e) => e.toJSON()), undone: value.undone.map((e) => e.toJSON())};
    },
    fromJSON(json) {
      return new HistoryState(json.done.map(HistEvent.fromJSON), json.undone.map(HistEvent.fromJSON));
    }
  });
  function history(config2 = {}) {
    return [
      historyField_,
      historyConfig.of(config2),
      EditorView.domEventHandlers({
        beforeinput(e, view) {
          if (e.inputType == "historyUndo")
            return undo(view);
          if (e.inputType == "historyRedo")
            return redo(view);
          return false;
        }
      })
    ];
  }
  function cmd(side, selection) {
    return function({state, dispatch}) {
      let historyState = state.field(historyField_, false);
      if (!historyState)
        return false;
      let tr = historyState.pop(side, state, selection);
      if (!tr)
        return false;
      dispatch(tr);
      return true;
    };
  }
  var undo = cmd(0, false);
  var redo = cmd(1, false);
  var undoSelection = cmd(0, true);
  var redoSelection = cmd(1, true);
  function depth(side) {
    return function(state) {
      let histState = state.field(historyField_, false);
      if (!histState)
        return 0;
      let branch = side == 0 ? histState.done : histState.undone;
      return branch.length - (branch.length && !branch[0].changes ? 1 : 0);
    };
  }
  var undoDepth = depth(0);
  var redoDepth = depth(1);
  var HistEvent = class {
    constructor(changes, effects, mapped, startSelection, selectionsAfter) {
      this.changes = changes;
      this.effects = effects;
      this.mapped = mapped;
      this.startSelection = startSelection;
      this.selectionsAfter = selectionsAfter;
    }
    setSelAfter(after) {
      return new HistEvent(this.changes, this.effects, this.mapped, this.startSelection, after);
    }
    toJSON() {
      var _a, _b, _c;
      return {
        changes: (_a = this.changes) === null || _a === void 0 ? void 0 : _a.toJSON(),
        mapped: (_b = this.mapped) === null || _b === void 0 ? void 0 : _b.toJSON(),
        startSelection: (_c = this.startSelection) === null || _c === void 0 ? void 0 : _c.toJSON(),
        selectionsAfter: this.selectionsAfter.map((s) => s.toJSON())
      };
    }
    static fromJSON(json) {
      return new HistEvent(json.changes && ChangeSet.fromJSON(json.changes), [], json.mapped && ChangeDesc.fromJSON(json.mapped), json.startSelection && EditorSelection.fromJSON(json.startSelection), json.selectionsAfter.map(EditorSelection.fromJSON));
    }
    static fromTransaction(tr) {
      let effects = none3;
      for (let invert of tr.startState.facet(invertedEffects)) {
        let result = invert(tr);
        if (result.length)
          effects = effects.concat(result);
      }
      if (!effects.length && tr.changes.empty)
        return null;
      return new HistEvent(tr.changes.invert(tr.startState.doc), effects, void 0, tr.startState.selection, none3);
    }
    static selection(selections) {
      return new HistEvent(void 0, none3, void 0, void 0, selections);
    }
  };
  function updateBranch(branch, to, maxLen, newEvent) {
    let start = to + 1 > maxLen + 20 ? to - maxLen - 1 : 0;
    let newBranch = branch.slice(start, to);
    newBranch.push(newEvent);
    return newBranch;
  }
  function isAdjacent(a, b) {
    let ranges = [], isAdjacent2 = false;
    a.iterChangedRanges((f, t2) => ranges.push(f, t2));
    b.iterChangedRanges((_f, _t, f, t2) => {
      for (let i = 0; i < ranges.length; ) {
        let from = ranges[i++], to = ranges[i++];
        if (t2 >= from && f <= to)
          isAdjacent2 = true;
      }
    });
    return isAdjacent2;
  }
  function eqSelectionShape(a, b) {
    return a.ranges.length == b.ranges.length && a.ranges.filter((r, i) => r.empty != b.ranges[i].empty).length === 0;
  }
  function conc(a, b) {
    return !a.length ? b : !b.length ? a : a.concat(b);
  }
  var none3 = [];
  var MaxSelectionsPerEvent = 200;
  function addSelection(branch, selection) {
    if (!branch.length) {
      return [HistEvent.selection([selection])];
    } else {
      let lastEvent = branch[branch.length - 1];
      let sels = lastEvent.selectionsAfter.slice(Math.max(0, lastEvent.selectionsAfter.length - MaxSelectionsPerEvent));
      if (sels.length && sels[sels.length - 1].eq(selection))
        return branch;
      sels.push(selection);
      return updateBranch(branch, branch.length - 1, 1e9, lastEvent.setSelAfter(sels));
    }
  }
  function popSelection(branch) {
    let last = branch[branch.length - 1];
    let newBranch = branch.slice();
    newBranch[branch.length - 1] = last.setSelAfter(last.selectionsAfter.slice(0, last.selectionsAfter.length - 1));
    return newBranch;
  }
  function addMappingToBranch(branch, mapping) {
    if (!branch.length)
      return branch;
    let length = branch.length, selections = none3;
    while (length) {
      let event = mapEvent(branch[length - 1], mapping, selections);
      if (event.changes && !event.changes.empty || event.effects.length) {
        let result = branch.slice(0, length);
        result[length - 1] = event;
        return result;
      } else {
        mapping = event.mapped;
        length--;
        selections = event.selectionsAfter;
      }
    }
    return selections.length ? [HistEvent.selection(selections)] : none3;
  }
  function mapEvent(event, mapping, extraSelections) {
    let selections = conc(event.selectionsAfter.length ? event.selectionsAfter.map((s) => s.map(mapping)) : none3, extraSelections);
    if (!event.changes)
      return HistEvent.selection(selections);
    let mappedChanges = event.changes.map(mapping), before = mapping.mapDesc(event.changes, true);
    let fullMapping = event.mapped ? event.mapped.composeDesc(before) : before;
    return new HistEvent(mappedChanges, StateEffect.mapEffects(event.effects, mapping), fullMapping, event.startSelection.map(before), selections);
  }
  var HistoryState = class {
    constructor(done, undone, prevTime = 0, prevUserEvent = void 0) {
      this.done = done;
      this.undone = undone;
      this.prevTime = prevTime;
      this.prevUserEvent = prevUserEvent;
    }
    isolate() {
      return this.prevTime ? new HistoryState(this.done, this.undone) : this;
    }
    addChanges(event, time, userEvent, newGroupDelay, maxLen) {
      let done = this.done, lastEvent = done[done.length - 1];
      if (lastEvent && lastEvent.changes && time - this.prevTime < newGroupDelay && !lastEvent.selectionsAfter.length && !lastEvent.changes.empty && event.changes && isAdjacent(lastEvent.changes, event.changes)) {
        done = updateBranch(done, done.length - 1, maxLen, new HistEvent(event.changes.compose(lastEvent.changes), conc(event.effects, lastEvent.effects), lastEvent.mapped, lastEvent.startSelection, none3));
      } else {
        done = updateBranch(done, done.length, maxLen, event);
      }
      return new HistoryState(done, none3, time, userEvent);
    }
    addSelection(selection, time, userEvent, newGroupDelay) {
      let last = this.done.length ? this.done[this.done.length - 1].selectionsAfter : none3;
      if (last.length > 0 && time - this.prevTime < newGroupDelay && userEvent == "keyboardselection" && this.prevUserEvent == userEvent && eqSelectionShape(last[last.length - 1], selection))
        return this;
      return new HistoryState(addSelection(this.done, selection), this.undone, time, userEvent);
    }
    addMapping(mapping) {
      return new HistoryState(addMappingToBranch(this.done, mapping), addMappingToBranch(this.undone, mapping), this.prevTime, this.prevUserEvent);
    }
    pop(side, state, selection) {
      let branch = side == 0 ? this.done : this.undone;
      if (branch.length == 0)
        return null;
      let event = branch[branch.length - 1];
      if (selection && event.selectionsAfter.length) {
        return state.update({
          selection: event.selectionsAfter[event.selectionsAfter.length - 1],
          annotations: fromHistory.of({side, rest: popSelection(branch)})
        });
      } else if (!event.changes) {
        return null;
      } else {
        let rest = branch.length == 1 ? none3 : branch.slice(0, branch.length - 1);
        if (event.mapped)
          rest = addMappingToBranch(rest, event.mapped);
        return state.update({
          changes: event.changes,
          selection: event.startSelection,
          effects: event.effects,
          annotations: fromHistory.of({side, rest}),
          filter: false
        });
      }
    }
  };
  HistoryState.empty = new HistoryState(none3, none3);
  var historyKeymap = [
    {key: "Mod-z", run: undo, preventDefault: true},
    {key: "Mod-y", mac: "Mod-Shift-z", run: redo, preventDefault: true},
    {key: "Mod-u", run: undoSelection, preventDefault: true},
    {key: "Alt-u", mac: "Mod-Shift-u", run: redoSelection, preventDefault: true}
  ];

  // node_modules/@codemirror/tooltip/dist/index.js
  var ios = typeof navigator != "undefined" && !/Edge\/(\d+)/.exec(navigator.userAgent) && /Apple Computer/.test(navigator.vendor) && (/Mobile\/\w+/.test(navigator.userAgent) || navigator.maxTouchPoints > 2);
  var Outside = "-10000px";
  var tooltipPlugin = ViewPlugin.fromClass(class {
    constructor(view) {
      this.view = view;
      this.inView = true;
      this.measureReq = {read: this.readMeasure.bind(this), write: this.writeMeasure.bind(this), key: this};
      this.input = view.state.facet(showTooltip);
      this.tooltips = this.input.filter((t2) => t2);
      this.tooltipViews = this.tooltips.map((tp) => this.createTooltip(tp));
    }
    update(update) {
      let input = update.state.facet(showTooltip);
      if (input == this.input) {
        for (let t2 of this.tooltipViews)
          if (t2.update)
            t2.update(update);
      } else {
        let tooltips = input.filter((x) => x);
        let views = [];
        for (let i = 0; i < tooltips.length; i++) {
          let tip = tooltips[i], known = -1;
          if (!tip)
            continue;
          for (let i2 = 0; i2 < this.tooltips.length; i2++) {
            let other = this.tooltips[i2];
            if (other && other.create == tip.create)
              known = i2;
          }
          if (known < 0) {
            views[i] = this.createTooltip(tip);
          } else {
            let tooltipView = views[i] = this.tooltipViews[known];
            if (tooltipView.update)
              tooltipView.update(update);
          }
        }
        for (let t2 of this.tooltipViews)
          if (views.indexOf(t2) < 0)
            t2.dom.remove();
        this.input = input;
        this.tooltips = tooltips;
        this.tooltipViews = views;
        this.maybeMeasure();
      }
    }
    createTooltip(tooltip) {
      let tooltipView = tooltip.create(this.view);
      tooltipView.dom.classList.add("cm-tooltip");
      if (tooltip.class)
        tooltipView.dom.classList.add(tooltip.class);
      tooltipView.dom.style.top = Outside;
      this.view.dom.appendChild(tooltipView.dom);
      if (tooltipView.mount)
        tooltipView.mount(this.view);
      return tooltipView;
    }
    destroy() {
      for (let {dom} of this.tooltipViews)
        dom.remove();
    }
    readMeasure() {
      return {
        editor: this.view.dom.getBoundingClientRect(),
        pos: this.tooltips.map((t2) => this.view.coordsAtPos(t2.pos)),
        size: this.tooltipViews.map(({dom}) => dom.getBoundingClientRect()),
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight
      };
    }
    writeMeasure(measured) {
      let {editor: editor2} = measured;
      for (let i = 0; i < this.tooltipViews.length; i++) {
        let tooltip = this.tooltips[i], tView = this.tooltipViews[i], {dom} = tView;
        let pos = measured.pos[i], size = measured.size[i];
        if (!pos || pos.bottom <= editor2.top || pos.top >= editor2.bottom || pos.right <= editor2.left || pos.left >= editor2.right) {
          dom.style.top = Outside;
          continue;
        }
        let width = size.right - size.left, height = size.bottom - size.top;
        let left = this.view.textDirection == Direction.LTR ? Math.min(pos.left, measured.innerWidth - width) : Math.max(0, pos.left - width);
        let above = !!tooltip.above;
        if (!tooltip.strictSide && (above ? pos.top - (size.bottom - size.top) < 0 : pos.bottom + (size.bottom - size.top) > measured.innerHeight))
          above = !above;
        if (ios) {
          dom.style.top = (above ? pos.top - height : pos.bottom) - editor2.top + "px";
          dom.style.left = left - editor2.left + "px";
          dom.style.position = "absolute";
        } else {
          dom.style.top = (above ? pos.top - height : pos.bottom) + "px";
          dom.style.left = left + "px";
        }
        dom.classList.toggle("cm-tooltip-above", above);
        dom.classList.toggle("cm-tooltip-below", !above);
        if (tView.positioned)
          tView.positioned();
      }
    }
    maybeMeasure() {
      if (this.tooltips.length) {
        if (this.view.inView || this.inView)
          this.view.requestMeasure(this.measureReq);
        this.inView = this.view.inView;
      }
    }
  }, {
    eventHandlers: {
      scroll() {
        this.maybeMeasure();
      }
    }
  });
  var baseTheme3 = EditorView.baseTheme({
    ".cm-tooltip": {
      position: "fixed",
      zIndex: 100
    },
    "&light .cm-tooltip": {
      border: "1px solid #ddd",
      backgroundColor: "#f5f5f5"
    },
    "&dark .cm-tooltip": {
      backgroundColor: "#333338",
      color: "white"
    }
  });
  var showTooltip = Facet.define({
    enables: [tooltipPlugin, baseTheme3]
  });
  var HoverTime = 750;
  var HoverMaxDist = 6;
  var HoverPlugin = class {
    constructor(view, source, field, setHover) {
      this.view = view;
      this.source = source;
      this.field = field;
      this.setHover = setHover;
      this.lastMouseMove = null;
      this.hoverTimeout = -1;
      this.restartTimeout = -1;
      this.pending = null;
      this.checkHover = this.checkHover.bind(this);
      view.dom.addEventListener("mouseleave", this.mouseleave = this.mouseleave.bind(this));
      view.dom.addEventListener("mousemove", this.mousemove = this.mousemove.bind(this));
    }
    update() {
      if (this.pending) {
        this.pending = null;
        clearTimeout(this.restartTimeout);
        this.restartTimeout = setTimeout(() => this.startHover(), 20);
      }
    }
    get active() {
      return this.view.state.field(this.field);
    }
    checkHover() {
      this.hoverTimeout = -1;
      if (this.active)
        return;
      let now = Date.now(), lastMove = this.lastMouseMove;
      if (now - lastMove.timeStamp < HoverTime)
        this.hoverTimeout = setTimeout(this.checkHover, HoverTime - (now - lastMove.timeStamp));
      else
        this.startHover();
    }
    startHover() {
      var _a;
      clearTimeout(this.restartTimeout);
      let lastMove = this.lastMouseMove;
      let coords = {x: lastMove.clientX, y: lastMove.clientY};
      let pos = this.view.contentDOM.contains(lastMove.target) ? this.view.posAtCoords(coords) : null;
      if (pos == null)
        return;
      let posCoords = this.view.coordsAtPos(pos);
      if (posCoords == null || coords.y < posCoords.top || coords.y > posCoords.bottom || coords.x < posCoords.left - this.view.defaultCharacterWidth || coords.x > posCoords.right + this.view.defaultCharacterWidth)
        return;
      let bidi = this.view.bidiSpans(this.view.state.doc.lineAt(pos)).find((s) => s.from <= pos && s.to >= pos);
      let rtl = bidi && bidi.dir == Direction.RTL ? -1 : 1;
      let open = this.source(this.view, pos, coords.x < posCoords.left ? -rtl : rtl);
      if ((_a = open) === null || _a === void 0 ? void 0 : _a.then) {
        let pending = this.pending = {pos};
        open.then((result) => {
          if (this.pending == pending) {
            this.pending = null;
            if (result)
              this.view.dispatch({effects: this.setHover.of(result)});
          }
        }, (e) => logException(this.view.state, e, "hover tooltip"));
      } else if (open) {
        this.view.dispatch({effects: this.setHover.of(open)});
      }
    }
    mousemove(event) {
      var _a;
      this.lastMouseMove = event;
      if (this.hoverTimeout < 0)
        this.hoverTimeout = setTimeout(this.checkHover, HoverTime);
      let tooltip = this.active;
      if (tooltip && !isInTooltip(event.target) || this.pending) {
        let {pos} = tooltip || this.pending, end = (_a = tooltip === null || tooltip === void 0 ? void 0 : tooltip.end) !== null && _a !== void 0 ? _a : pos;
        if (pos == end ? this.view.posAtCoords({x: event.clientX, y: event.clientY}) != pos : !isOverRange(this.view, pos, end, event.clientX, event.clientY, HoverMaxDist)) {
          this.view.dispatch({effects: this.setHover.of(null)});
          this.pending = null;
        }
      }
    }
    mouseleave() {
      clearTimeout(this.hoverTimeout);
      this.hoverTimeout = -1;
      if (this.active)
        this.view.dispatch({effects: this.setHover.of(null)});
    }
    destroy() {
      clearTimeout(this.hoverTimeout);
      this.view.dom.removeEventListener("mouseleave", this.mouseleave);
      this.view.dom.removeEventListener("mousemove", this.mousemove);
    }
  };
  function isInTooltip(elt) {
    for (let cur = elt; cur; cur = cur.parentNode)
      if (cur.nodeType == 1 && cur.classList.contains("cm-tooltip"))
        return true;
    return false;
  }
  function isOverRange(view, from, to, x, y, margin) {
    let range = document.createRange();
    let fromDOM = view.domAtPos(from), toDOM = view.domAtPos(to);
    range.setEnd(toDOM.node, toDOM.offset);
    range.setStart(fromDOM.node, fromDOM.offset);
    let rects = range.getClientRects();
    range.detach();
    for (let i = 0; i < rects.length; i++) {
      let rect = rects[i];
      let dist = Math.max(rect.top - y, y - rect.bottom, rect.left - x, x - rect.right);
      if (dist <= margin)
        return true;
    }
    return false;
  }
  function hoverTooltip(source, options = {}) {
    const setHover = StateEffect.define();
    const hoverState = StateField.define({
      create() {
        return null;
      },
      update(value, tr) {
        if (value && (options.hideOnChange && (tr.docChanged || tr.selection)))
          return null;
        for (let effect of tr.effects)
          if (effect.is(setHover))
            return effect.value;
        if (value && tr.docChanged) {
          let newPos = tr.changes.mapPos(value.pos, -1, MapMode.TrackDel);
          if (newPos == null)
            return null;
          let copy = Object.assign(Object.create(null), value);
          copy.pos = newPos;
          if (value.end != null)
            copy.end = tr.changes.mapPos(value.end);
          return copy;
        }
        return value;
      },
      provide: (f) => showTooltip.from(f)
    });
    return [
      hoverState,
      ViewPlugin.define((view) => new HoverPlugin(view, source, hoverState, setHover))
    ];
  }

  // core/parser.js
  var srcTokens;
  var match;
  var token;
  var macros = new Map();
  var codePos;
  var lastLineIndex = 0;
  var prevCodePos;
  function loadCode(code) {
    srcTokens = code.matchAll(/(["'])(\\.|[^\\\n])*?\1|>>|<<|\|\||&&|>=|<=|<>|==|!=|[\w.]+|#.*|[\S\n]/g);
    next = defaultNext;
    lastLineIndex = 0;
    prevCodePos = codePos = {start: 0, length: 0};
  }
  var defaultNext = () => token = (match = srcTokens.next()).done ? "\n" : (prevCodePos = codePos, match.value[0] === "\n" ? lastLineIndex = match.value.index + 1 : codePos = {start: match.value.index - lastLineIndex, length: match.value[0].length}, macros.has(match.value[0])) ? (insertTokens(macros.get(match.value[0])), next()) : match.value[0][0] === "#" ? next() : match.value[0];
  var next = defaultNext;
  function insertTokens(tokens) {
    let tokensCopy = [...tokens];
    next = () => token = tokensCopy.shift() || (next = defaultNext)();
  }
  function ungetToken() {
    let t2 = token, p = codePos, oldNext = next;
    codePos = prevCodePos;
    next = () => token = (next = oldNext, codePos = p, t2);
  }
  function setToken(tok) {
    token = tok;
  }
  function ParserError(message, startPos = codePos, endPos = startPos) {
    this.message = message;
    this.pos = startPos.start;
    this.length = endPos.start + endPos.length - startPos.start;
  }

  // core/operands.js
  var OPT = {
    REG: 1,
    VEC: 2,
    VMEM: 3,
    IMM: 4,
    MASK: 5,
    REL: 6,
    MEM: 7,
    ST: 8,
    SEG: 9,
    IP: 10,
    BND: 11,
    CTRL: 12,
    DBG: 13
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
  ].map((x, i) => ({[x]: i})));
  var suffixes = {b: 8, w: 16, l: 32, d: 32, q: 64, t: 80};
  var PREFIX_REX = 1;
  var PREFIX_NOREX = 2;
  var PREFIX_CLASHREX = 3;
  var PREFIX_ADDRSIZE = 4;
  var PREFIX_SEG = 8;
  var regParsePos;
  function parseRegister(expectedType = null) {
    let reg = registers[next().toLowerCase()];
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
          throw new ParserError("Unknown register");
      } else
        ungetToken();
    } else if (reg === registers.rip || reg === registers.eip) {
      if (expectedType == null || !expectedType.includes(OPT.IP))
        throw new ParserError("Can't use RIP here");
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
        throw new ParserError("Unknown register");
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
          throw new ParserError("Unknown register");
      }
      if (isNaN(reg) || !(reg = parseInt(reg), reg >= 0 && reg < max))
        throw new ParserError("Unknown register");
    }
    if (expectedType !== null && expectedType.indexOf(type) < 0)
      throw new ParserError("Invalid register");
    regParsePos = codePos;
    next();
    return [reg, type, size, prefs];
  }
  function Operand(address) {
    this.reg = this.reg2 = -1;
    this.shift = 0;
    this.value = null;
    this.type = null;
    this.size = NaN;
    this.prefs = 0;
    this.startPos = codePos;
    let indirect = token === "*";
    if (indirect)
      next();
    if (token === "%") {
      [this.reg, this.type, this.size, this.prefs] = parseRegister();
      this.endPos = regParsePos;
    } else if (token === "$") {
      this.expression = new Expression();
      this.value = this.expression.evaluate(null, address);
      this.type = OPT.IMM;
    } else {
      this.type = OPT.MEM;
      this.expression = new Expression(0, true);
      this.value = this.expression.evaluate(null, address);
      if (token !== "(") {
        if (!indirect)
          this.type = OPT.REL;
        return;
      }
      let tempSize, tempType;
      if (next() === "%")
        [this.reg, tempType, tempSize] = parseRegister([OPT.REG, OPT.IP, OPT.VEC]);
      else if (token === ",") {
        this.reg = -1;
        tempType = -1;
        tempSize = 64;
      } else
        throw new ParserError("Expected register");
      if (tempType === OPT.VEC) {
        this.type = OPT.VMEM;
        this.size = tempSize;
        if (tempSize < 128)
          throw new ParserError("Invalid register size", regParsePos);
        this.reg2 = this.reg;
        this.reg = -1;
      } else {
        if (tempSize === 32)
          this.prefs |= PREFIX_ADDRSIZE;
        else if (tempSize !== 64)
          throw new ParserError("Invalid register size", regParsePos);
        if (tempType === OPT.IP)
          this.ripRelative = true;
        else if (token === ",") {
          if (next() !== "%")
            throw new ParserError("Expected register");
          [this.reg2, tempType, tempSize] = parseRegister([OPT.REG, OPT.VEC]);
          if (tempType === OPT.VEC) {
            this.type = OPT.VMEM;
            this.size = tempSize;
            if (tempSize < 128)
              throw new ParserError("Invalid register size", regParsePos);
          } else {
            if (this.reg2 === 4)
              throw new ParserError("Memory index cannot be RSP", regParsePos);
            if (tempSize === 32)
              this.prefs |= PREFIX_ADDRSIZE;
            else if (tempSize !== 64)
              throw new ParserError("Invalid register size", regParsePos);
          }
          if (token === ",") {
            this.shift = "1248".indexOf(next());
            if (this.shift < 0)
              throw new ParserError("Scale must be 1, 2, 4, or 8");
            next();
          }
        } else if (this.reg === 4)
          this.reg2 = 4;
      }
      if ((this.reg & 7) === 5)
        this.value = this.value || 0n;
      if (token !== ")")
        throw new ParserError("Expected ')'");
      next();
    }
  }

  // core/shuntingYard.js
  var unaries = {
    "+": (a) => a,
    "-": (a) => -a,
    "~": (a) => ~a,
    "!": (a) => !a
  };
  var operators = [
    {
      "*": (a, b) => a * b,
      "/": (a, b) => a / b,
      "%": (a, b) => a % b,
      "<<": (a, b) => a << b,
      ">>": (a, b) => a >> b
    },
    {
      "|": (a, b) => a | b,
      "&": (a, b) => a & b,
      "^": (a, b) => a ^ b,
      "!": (a, b) => a | ~b
    },
    {
      "+": (a, b) => a + b,
      "-": (a, b) => a - b
    },
    {
      "==": (a, b) => a == b ? -1 : 0,
      "<>": (a, b) => a != b ? -1 : 0,
      "!=": (a, b) => a != b ? -1 : 0,
      "<": (a, b) => a < b ? -1 : 0,
      ">": (a, b) => a > b ? -1 : 0,
      ">=": (a, b) => a >= b ? -1 : 0,
      "<=": (a, b) => a <= b ? -1 : 0
    },
    {"&&": (a, b) => a && b ? 1 : 0},
    {"||": (a, b) => a || b ? 1 : 0}
  ];
  for (let i = 0; i < operators.length; i++) {
    for (let op of Object.keys(operators[i])) {
      operators[i][op] = {func: operators[i][op], prec: i};
    }
  }
  operators = Object.assign({}, ...operators);
  var stringEscapeSeqs = {
    a: "\x07",
    b: "\b",
    e: "",
    f: "\f",
    n: "\n",
    r: "\r",
    t: "	",
    v: "\v",
    "\\": "\\",
    "'": "'",
    '"': '"',
    "?": "?"
  };
  var unescapeString = (string2) => string2.slice(1, -1).replace(/\\x[0-9a-f]{1,2}/ig, (x) => String.fromCharCode(parseInt(x.slice(2), 16))).replace(/\\[0-7]{1,3}/g, (x) => String.fromCharCode(parseInt(x.slice(1), 8) & 255)).replace(/\\u[0-9a-f]{1,8}/ig, (x) => {
    try {
      return String.fromCodePoint(parseInt(x.slice(2), 16));
    } catch (e) {
      return "";
    }
  }).replace(/\\./g, (x) => stringEscapeSeqs[x.slice(1)] || "");
  function parseNumber(asFloat = false) {
    let value = asFloat ? 0 : 0n, floatPrec = asFloat ? 1 : 0;
    try {
      if (token === "\n")
        throw new ParserError("Expected value, got none");
      if (token[0] === "'" && token[token.length - 1] === "'") {
        let string2 = unescapeString(token);
        let i = string2.length;
        while (i--) {
          value <<= asFloat ? 8 : 8n;
          value += asFloat ? string2.charCodeAt(i) : BigInt(string2.charCodeAt(i));
        }
      } else if (isNaN(token)) {
        if (token.length > 1 && !isNaN(token.slice(0, -1))) {
          if (token.endsWith("d"))
            floatPrec = 2, value = parseFloat(token);
          else if (token.endsWith("f"))
            floatPrec = 1, value = parseFloat(token);
          else {
            codePos.start += codePos.length - 1;
            codePos.length = 1;
            throw new ParserError("Invalid number suffix");
          }
        } else if (registers[token] !== void 0)
          throw new ParserError("Registers must be prefixed with %");
        else {
          let labelDependency = {name: token, pos: codePos};
          next();
          return {value: labelDependency, floatPrec};
        }
      } else if (token.includes(".") || asFloat)
        floatPrec = 1, value = parseFloat(token);
      else
        value = asFloat ? Number(token) : BigInt(token);
      if (next() === "f")
        floatPrec = 1, next();
      else if (token === "d")
        floatPrec = 2, next();
      return {value, floatPrec};
    } catch (e) {
      if (e.pos === void 0)
        throw new ParserError("Couldn't parse immediate: " + e);
      throw e;
    }
  }
  function Expression(minFloatPrec = 0, expectMemory = false) {
    this.hasLabelDependency = false;
    this.stack = [];
    this.floatPrec = minFloatPrec;
    let opStack = [], lastOp, lastWasNum = false;
    if (!expectMemory)
      next();
    while (token !== "," && token !== "\n" && token !== ";") {
      if (!lastWasNum && unaries.hasOwnProperty(token)) {
        opStack.push({pos: codePos, func: unaries[token], prec: -1});
        next();
      } else if (operators.hasOwnProperty(token)) {
        if (!lastWasNum) {
          if (expectMemory && opStack.length > 0 && opStack[opStack.length - 1].bracket)
            break;
          throw new ParserError("Missing left operand");
        }
        lastWasNum = false;
        let op = Object.assign({pos: codePos}, operators[token]);
        while (lastOp = opStack[opStack.length - 1], lastOp && lastOp.prec <= op.prec && !lastOp.bracket)
          this.stack.push(opStack.pop());
        opStack.push(op);
        next();
      } else if (unaries.hasOwnProperty(token))
        throw new ParserError("Unary operator can't be used here");
      else if (token === "(") {
        if (lastWasNum) {
          if (expectMemory)
            break;
          throw new ParserError("Unexpected parenthesis");
        }
        opStack.push({pos: codePos, bracket: true});
        next();
      } else if (token === ")") {
        if (!lastWasNum)
          throw new ParserError("Missing right operand", opStack.length ? opStack[opStack.length - 1].pos : codePos);
        while (lastOp = opStack[opStack.length - 1], lastOp && !lastOp.bracket)
          this.stack.push(opStack.pop());
        if (!lastOp || !lastOp.bracket)
          throw new ParserError("Mismatched parentheses");
        opStack.pop();
        lastWasNum = true;
        next();
      } else {
        lastWasNum = true;
        let imm = parseNumber(this.floatPrec !== 0);
        if (imm.floatPrec > this.floatPrec)
          this.floatPrec = imm.floatPrec;
        let value = imm.value;
        if (value.name)
          this.hasLabelDependency = true;
        this.stack.push(value);
      }
    }
    if (expectMemory && opStack.length == 1 && opStack[0].bracket) {
      ungetToken();
      setToken("(");
      return null;
    } else if (!lastWasNum)
      throw new ParserError("Missing right operand", opStack.length ? opStack[opStack.length - 1].pos : codePos);
    while (opStack[0]) {
      if (opStack[opStack.length - 1].bracket)
        throw new ParserError("Mismatched parentheses", opStack[opStack.length - 1].pos);
      this.stack.push(opStack.pop());
    }
    if (this.floatPrec !== 0)
      this.stack = this.stack.map((num) => typeof num === "bigint" ? Number(num) : num);
  }
  Expression.prototype.evaluate = function(labels2 = null, currIndex = 0) {
    if (this.stack.length === 0)
      return null;
    let stack = [], len = 0;
    for (let op of this.stack) {
      let func = op.func;
      if (func) {
        if (func.length === 1)
          stack[len - 1] = func(stack[len - 1]);
        else {
          stack.splice(len - 2, 2, func(stack[len - 2], stack[len - 1]));
          len--;
        }
      } else {
        if (op.name) {
          if (op.name === ".")
            op = BigInt(currIndex);
          else if (labels2 === null)
            op = 1n;
          else if (!labels2.has(op.name))
            throw new ParserError(`Unknown label "${op.name}"`, op.pos);
          else
            op = labels2.get(op.name).address;
        }
        stack[len++] = op;
      }
      if (this.floatPrec === 0)
        stack[len - 1] = BigInt(stack[len - 1]);
      else
        stack[len - 1] = Number(stack[len - 1]);
    }
    if (stack.length > 1)
      throw new ParserError("Invalid expression");
    if (this.floatPrec === 0)
      return stack[0];
    let floatVal = this.floatPrec === 1 ? new Float32Array(1) : new Float64Array(1);
    floatVal[0] = Number(stack[0]);
    return new Uint8Array(floatVal.buffer).reduceRight((prev, val) => (prev << 8n) + BigInt(val), 0n);
  };

  // core/directives.js
  var DIRECTIVE_BUFFER_SIZE = 15;
  var encoder = new TextEncoder();
  var dirs = {
    byte: 1,
    short: 2,
    word: 2,
    hword: 2,
    int: 3,
    long: 3,
    quad: 4,
    octa: 5,
    float: 6,
    single: 6,
    double: 7,
    asciz: 8,
    ascii: 9,
    string: 9
  };
  function Directive(dir) {
    this.bytes = new Uint8Array(DIRECTIVE_BUFFER_SIZE);
    this.length = 0;
    this.outline = null;
    this.floatPrec = 0;
    let appendNullByte = 0;
    try {
      if (!dirs.hasOwnProperty(dir))
        throw new ParserError("Unknown directive");
      switch (dirs[dir]) {
        case dirs.byte:
          this.compileValues(1);
          break;
        case dirs.word:
          this.compileValues(2);
          break;
        case dirs.int:
          this.compileValues(4);
          break;
        case dirs.quad:
          this.compileValues(8);
          break;
        case dirs.octa:
          this.compileValues(16);
          break;
        case dirs.float:
          this.floatPrec = 1;
          this.compileValues(4);
          break;
        case dirs.double:
          this.floatPrec = 2;
          this.compileValues(8);
          break;
        case dirs.asciz:
          appendNullByte = 1;
        case dirs.ascii:
          let strBytes, temp;
          this.bytes = new Uint8Array();
          do {
            if (next().length > 1 && token[0] === '"' && token[token.length - 1] === '"') {
              strBytes = encoder.encode(unescapeString(token));
              temp = new Uint8Array(this.length + strBytes.length + appendNullByte);
              temp.set(this.bytes);
              temp.set(strBytes, this.length);
              this.bytes = temp;
              this.length = temp.length;
            } else
              throw new ParserError("Expected string");
          } while (next() === ",");
          break;
      }
    } catch (e) {
      if (this.length === 0)
        throw e;
    }
  }
  Directive.prototype.compileValues = function(valSize) {
    this.valSize = valSize;
    let value, expression, needsRecompilation = false;
    this.outline = [];
    try {
      do {
        expression = new Expression(this.floatPrec);
        value = expression.evaluate();
        if (expression.hasLabelDependency)
          needsRecompilation = true;
        this.outline.push({value, expression});
        this.genValue(value);
      } while (token === ",");
    } finally {
      if (!needsRecompilation)
        this.outline = null;
    }
  };
  Directive.prototype.resolveLabels = function(labels2) {
    let initialLength = this.length, op, outlineLength = this.outline.length;
    this.length = 0;
    for (let i = 0; i < outlineLength; i++) {
      op = this.outline[i];
      try {
        if (op.expression.hasLabelDependency)
          op.value = op.expression.evaluate(labels2, this.address + i * this.valSize);
        this.genValue(op.value);
      } catch (e) {
        this.error = e;
        if (i === 0)
          return {
            success: false,
            error: this.error
          };
        outlineLength = i;
        i = -1;
        this.length = 0;
      }
    }
    return {
      success: true,
      length: this.length - initialLength
    };
  };
  Directive.prototype.genValue = function(value) {
    for (let i = 0; i < this.valSize; i++) {
      this.bytes[this.length++] = Number(value & 0xffn);
      value >>= 8n;
      if (this.length === this.bytes.length) {
        let temp = new Uint8Array(this.bytes.length + DIRECTIVE_BUFFER_SIZE);
        temp.set(this.bytes);
        this.bytes = temp;
      }
    }
  };

  // core/mnemonicList.js
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
E8 jl
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
jecxz:67)E3 jb

jmp
EB-2 jbl
FF.4 rQ

jrcxz:E3 jb

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
loop:E2 jb
loope:E1 jb
loopne:E0 jb

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
8C s ^Rwlq
8C s mW
8E ^RWlq s
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
xbegin:C7F8 jwl

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
  arithmeticMnemonics.forEach((name2, i) => {
    let opBase = i * 8;
    mnemonics[name2] = [
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
  var shiftMnemonics = `rol ror rcl rcr shl shr  sar`.split(" ");
  shiftMnemonics.forEach((name2, i) => {
    if (name2)
      mnemonics[name2] = [
        "D0." + i + " i_1 rbwlq",
        "D2." + i + " R_1b rbwlq",
        "C0." + i + " ib rbwlq"
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
  conditionals.forEach((names, i) => {
    names = names.split(" ");
    let firstName = names.shift();
    mnemonics["j" + firstName] = [hex(112 + i) + "+3856 jbl"];
    mnemonics["cmov" + firstName] = [hex(3904 + i) + " r Rwlq"];
    mnemonics["set" + firstName] = [hex(3984 + i) + ".0 rB"];
    names.forEach((name2) => {
      mnemonics["j" + name2] = ["#j" + firstName];
      mnemonics["cmov" + name2] = ["#cmov" + firstName];
      mnemonics["set" + name2] = ["#set" + firstName];
    });
  });
  var fpuArithMnemonics = "add mul com comp sub subr div divr";
  fpuArithMnemonics.split(" ").forEach((name2, i) => {
    let list = ["D8." + i + " ml", "DC." + i + " m$q"];
    mnemonics["fi" + name2] = ["DA." + i + " ml", "DE." + i + " m$w"];
    if (i === 2 || i === 3)
      list.push("D8." + i + " F", hex(55489 + i * 8));
    else {
      list.push("D8." + i + " F F_0");
      if (i >= 4)
        i ^= 1;
      list.push("DC." + i + " F_0 F");
      mnemonics["f" + name2 + "p"] = ["DE." + i + " F_0 F", hex(57025 + i * 8)];
    }
    mnemonics["f" + name2] = list;
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

  // core/mnemonics.js
  var REG_MOD = -1;
  var REG_OP = -2;
  var OPC = {
    r: OPT.REG,
    v: OPT.VEC,
    i: OPT.IMM,
    j: OPT.REL,
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
  function parseEvexPermits(string2) {
    let permits = 0;
    for (let c of string2) {
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
    let sizes = [], size, defaultSize, sizeChar;
    for (let i = 0; i < format.length; i++) {
      defaultSize = false;
      size = 0;
      sizeChar = format[i];
      if (sizeChar === "~")
        size |= SIZETYPE_EXPLICITSUF, sizeChar = format[++i];
      if (sizeChar === "$")
        size |= SIZETYPE_IMPLICITENC, sizeChar = format[++i];
      if (sizeChar === "#")
        defaultSize = true, sizeChar = format[++i];
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
    let i = 1;
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
    this.acceptsMemory = "rvbkm".includes(opType);
    this.forceRM = this.forceRM || this.acceptsMemory || this.type === OPT.VMEM;
    this.unsigned = opType === "i";
    this.type = OPC[opType.toLowerCase()];
    this.carrySizeInference = this.carrySizeInference && this.type !== OPT.IMM && this.type !== OPT.MEM;
    this.implicitValue = null;
    if (format[1] === "_") {
      this.implicitValue = parseInt(format[2]);
      i = 3;
    }
    this.defSize = -1;
    if (format[i] === "!") {
      this.sizes = 0;
      this.hasByteSize = false;
    } else if (format[i] === "/") {
      this.sizes = -2;
      this.hasByteSize = false;
    } else {
      this.sizes = getSizes(format.slice(i), (size) => this.defSize = size);
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
    if (operand.type !== this.type && !((operand.type === OPT.MEM || operand.type === OPT.REL) && this.acceptsMemory))
      return null;
    let opSize = this.type === OPT.REL ? operand.virtualSize : this.unsigned ? operand.unsignedSize : operand.size;
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
        if (opSize === rawSize || (this.type === OPT.IMM || this.type === OPT.REL) && opSize < rawSize) {
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
    let [opcode, extension] = format.shift().split(".");
    let adderSeparator = opcode.indexOf("+");
    if (adderSeparator < 0)
      adderSeparator = opcode.indexOf("-");
    if (adderSeparator >= 0) {
      this.opDiff = parseInt(opcode.slice(adderSeparator));
      opcode = opcode.slice(0, adderSeparator);
    } else
      this.opDiff = 1;
    if (opcode[2] === ")") {
      this.code = parseInt(opcode.slice(3), 16);
      this.prefix = parseInt(opcode.slice(0, 2), 16);
      this.maskSizing = 4;
    } else {
      this.code = parseInt(opcode, 16);
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
      if (opCatcher.type === OPT.REL)
        this.relativeSizes = opCatcher.sizes;
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
  Operation.prototype.fit = function(operands, address, enforcedSize, vexInfo) {
    let needsRecompilation = false;
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
    if (this.relativeSizes) {
      if (!(operands.length === 1 && operands[0].type === OPT.REL))
        return null;
      this.generateRelative(operands[0], address);
    }
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
    let correctedSizes = new Array(operands.length), size = -1, prevSize = -1, i, catcher;
    for (i = 0; i < operands.length; i++) {
      catcher = opCatchers[i];
      if (size > 0 || Array.isArray(catcher.sizes)) {
        size = catcher.catch(operands[i], size, enforcedSize);
        if (size === null)
          return null;
      }
      correctedSizes[i] = size;
      if (size === 64 && catcher.copySize !== void 0)
        size = catcher.copySize;
      if (!catcher.carrySizeInference)
        size = prevSize;
      prevSize = size;
    }
    for (i = 0; i < operands.length; i++) {
      if (correctedSizes[i] < 0) {
        size = opCatchers[i].catch(operands[i], size, enforcedSize);
        if (size === null)
          return null;
        correctedSizes[i] = size;
      }
    }
    let reg = null, rm2 = null, vex = this.vexBase, imms = [], correctedOpcode = this.code;
    let extendOp = false;
    let operand;
    for (i = 0; i < operands.length; i++) {
      catcher = opCatchers[i], operand = operands[i];
      size = correctedSizes[i];
      operand.size = size & ~7;
      if (operand.size === 64 && !(size & SIZETYPE_IMPLICITENC) && !this.allVectors)
        rexw = true;
      if (catcher.implicitValue === null) {
        if (operand.type === OPT.IMM)
          imms.unshift(operand);
        else if (catcher.type === OPT.REL) {
          imms.unshift({
            value: operand.virtualValue,
            size
          });
          needsRecompilation = true;
        } else if (catcher.forceRM)
          rm2 = operand;
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
          throw new ParserError("Can't encode MMX with VEX prefix", operand.endPos);
      }
      if (overallSize < (size & ~7) && !(size & SIZETYPE_IMPLICITENC))
        overallSize = size & ~7;
      if (size >= 16)
        adjustByteOp = adjustByteOp || catcher.hasByteSize;
    }
    if (this.extension === REG_OP) {
      correctedOpcode += reg.reg & 7;
      extendOp = reg.reg > 7;
      reg = null;
    } else if (this.extension !== REG_MOD) {
      if (rm2 === null) {
        if (this.modExtension === null)
          rm2 = reg;
        else
          rm2 = {type: OPT.MEM, reg: this.modExtension, value: null};
      }
      reg = {reg: this.extension};
    }
    vexInfo.needed = vexInfo.needed || this.forceVex;
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
            throw new ParserError("Invalid vector size for embedded rounding", vexInfo.roundingPos);
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
              throw new ParserError("Invalid broadcast", vexInfo.broadcastPos);
            vex |= 1048576;
          }
        }
        vex |= vexInfo.mask << 16;
        if (this.evexPermits & EVEXPERM_FORCEW)
          vex |= 32768;
        if (reg.reg >= 16)
          vex |= 16, reg.reg &= 15;
        if (rm2.reg2 >= 16)
          vex |= 524288;
      } else if (overallSize === 256)
        vex |= 1024;
    } else if (overallSize > 128) {
      let reg2;
      for (reg2 of operands)
        if (reg2.size > 128 && reg2.endPos)
          break;
      throw new ParserError("YMM/ZMM registers can't be encoded without VEX", reg2.endPos);
    }
    if (adjustByteOp)
      correctedOpcode += this.opDiff;
    return {
      opcode: correctedOpcode,
      size: overallSize,
      rexw,
      prefix: vexInfo.needed ? null : this.allVectors && overallSize > 64 ? 102 : this.prefix,
      extendOp,
      reg,
      rm: rm2,
      vex: vexInfo.needed ? vex : null,
      imms,
      needsRecompilation
    };
  };
  var sizeLen = (x) => x == 32 ? 4n : x == 16 ? 2n : 1n;
  var absolute = (x) => x < 0n ? ~x : x;
  Operation.prototype.generateRelative = function(operand, address) {
    let target = operand.value - BigInt(address + ((this.code > 255 ? 2 : 1) + (this.prefix !== null ? 1 : 0)));
    if (this.relativeSizes.length === 1) {
      let size = this.relativeSizes[0];
      operand.virtualSize = size;
      operand.virtualValue = target - sizeLen(size);
      return;
    }
    let [small, large] = this.relativeSizes;
    let smallLen = sizeLen(small), largeLen = sizeLen(large) + (this.opDiff > 256 ? 1n : 0n);
    if (absolute(target - smallLen) >= 1 << small - 1) {
      operand.virtualSize = large;
      operand.virtualValue = target - largeLen;
    } else {
      operand.virtualSize = small;
      operand.virtualValue = target - smallLen;
    }
  };

  // core/instructions.js
  var MAX_INSTR_SIZE = 15;
  var prefixes = {
    lock: 240,
    repne: 242,
    repnz: 242,
    rep: 243,
    repe: 243,
    repz: 243
  };
  function Instruction(address, opcode, opcodePos) {
    this.opcode = opcode;
    this.opcodePos = opcodePos;
    this.bytes = new Uint8Array(MAX_INSTR_SIZE);
    this.length = 0;
    this.address = address;
    this.interpret();
  }
  Instruction.prototype.genByte = function(byte) {
    this.bytes[this.length++] = Number(byte);
  };
  Instruction.prototype.genInteger = function(byte, size) {
    do {
      this.genByte(byte & 0xffn);
      byte >>= 8n;
    } while (size -= 8);
  };
  Instruction.prototype.interpret = function() {
    let opcode = this.opcode, operand = null, enforcedSize = 0, prefsToGen = 0;
    let vexInfo = {
      needed: opcode[0] === "v",
      evex: false,
      mask: 0,
      zeroing: false,
      round: null,
      broadcast: null
    };
    let usesMemory = false;
    this.needsRecompilation = false;
    if (prefixes.hasOwnProperty(opcode)) {
      this.genByte(prefixes[opcode]);
      ungetToken();
      setToken(";");
      return;
    }
    if (!mnemonics.hasOwnProperty(opcode)) {
      if (vexInfo.needed && !mnemonics.hasOwnProperty(opcode.slice(0, -1))) {
        opcode = opcode.slice(1);
      }
      if (!mnemonics.hasOwnProperty(opcode)) {
        enforcedSize = suffixes[opcode[opcode.length - 1]];
        opcode = opcode.slice(0, -1);
        if (!mnemonics.hasOwnProperty(opcode))
          throw new ParserError("Unknown opcode", this.opcodePos);
        if (enforcedSize === void 0) {
          this.opcodePos.start += this.opcodePos.length - 1;
          this.opcodePos.length = 1;
          throw new ParserError("Invalid opcode suffix", this.opcodePos);
        }
      }
    }
    let operations = mnemonics[opcode], operands = [];
    if (typeof operations[0] === "string") {
      if (operations[0][0] === "#") {
        let otherOpcode = operations[0].slice(1);
        if (typeof mnemonics[otherOpcode][0] === "string") {
          mnemonics[otherOpcode] = mnemonics[otherOpcode].map((line) => new Operation(line.split(" ")));
        }
        mnemonics[opcode] = operations = mnemonics[otherOpcode];
      } else
        mnemonics[opcode] = operations = operations.map((line) => new Operation(line.split(" ")));
    }
    if (token === "{") {
      vexInfo.evex = true;
      vexInfo.round = ["sae", "rn-sae", "rd-sae", "ru-sae", "rz-sae"].indexOf(next());
      vexInfo.roundingPos = codePos;
      if (vexInfo.round < 0)
        throw new ParserError("Invalid rounding mode");
      if (next() !== "}")
        throw new ParserError("Expected '}'");
      if (next() === ",")
        next();
    }
    while (token !== ";" && token !== "\n") {
      operand = new Operand(this.address);
      if (token === ":") {
        if (operand.type !== OPT.SEG)
          throw new ParserError("Incorrect prefix");
        prefsToGen |= operand.reg + 1 << 3;
        next();
        operand = new Operand(this.address);
        if (operand.type !== OPT.MEM)
          throw new ParserError("Segment prefix must be followed by memory reference");
      }
      if (operand.expression && operand.expression.hasLabelDependency)
        this.needsRecompilation = true;
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
            throw new ParserError("Can't use %k0 as writemask", regParsePos);
        } else if (token === "z")
          vexInfo.zeroing = true, next();
        else if (operand.type === OPT.MEM) {
          vexInfo.broadcast = ["1to2", "1to4", "1to8", "1to16"].indexOf(token);
          if (vexInfo.broadcast < 0)
            throw new ParserError("Invalid broadcast mode");
          vexInfo.broadcastPos = codePos;
          next();
        } else
          throw new ParserError("Invalid decorator");
        if (token !== "}")
          throw new ParserError("Expected '}'");
        next();
      }
      if (token !== ",")
        break;
      next();
    }
    if (usesMemory && vexInfo.round !== null)
      throw new ParserError("Embedded rounding can only be used on reg-reg", vexInfo.roundingPos);
    this.outline = [operands, enforcedSize, operations, prefsToGen, vexInfo];
    this.endPos = codePos;
    if (!this.needsRecompilation) {
      this.compile();
      if (!this.needsRecompilation)
        this.outline = void 0;
    }
  };
  Instruction.prototype.compile = function() {
    let [operands, enforcedSize, operations, prefsToGen, vexInfo] = this.outline;
    this.length = 0;
    if (enforcedSize === 0) {
      for (let op2 of operands) {
        if (op2.type === OPT.IMM) {
          op2.size = inferImmSize(op2.value);
          op2.unsignedSize = inferUnsignedImmSize(op2.value);
        }
      }
    }
    let op, found = false, rexVal = 64;
    for (let operation of operations) {
      op = operation.fit(operands, this.address, enforcedSize, vexInfo);
      if (op !== null) {
        found = true;
        break;
      }
    }
    if (!found) {
      throw new ParserError("Invalid operands", operands.length > 0 ? operands[0].startPos : this.opcodePos, this.endPos);
    }
    this.needsRecompilation = this.needsRecompilation || op.needsRecompilation;
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
      throw new ParserError("Can't encode high 8-bit register", operands[0].startPos, codePos);
    let opcode = op.opcode;
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
  function makeModRM(rm2, r) {
    let modrm = 0, rex = 0;
    let rmReg = rm2.reg, rmReg2 = rm2.reg2;
    if (r.reg >= 8) {
      rex |= 4;
      r.reg &= 7;
    }
    modrm |= r.reg << 3;
    if (rm2.ripRelative) {
      rm2.value = rm2.value || 0n;
      return [rex, modrm | 5, null];
    }
    if (rm2.type !== OPT.MEM && rm2.type !== OPT.VMEM && rm2.type !== OPT.REL)
      modrm |= 192;
    else if (rmReg >= 0) {
      if (rm2.value !== null) {
        if (inferImmSize(rm2.value) === 8) {
          rm2.dispSize = 8;
          modrm |= 64;
        } else {
          rm2.dispSize = 32;
          modrm |= 128;
        }
      }
    } else {
      rmReg = 5;
      if (rmReg2 < 0)
        rmReg2 = 4;
      rm2.value = rm2.value || 0n;
    }
    rex |= rmReg >> 3;
    rmReg &= 7;
    if (rmReg2 >= 0) {
      if (rmReg2 >= 8) {
        rex |= 2;
        rmReg2 &= 7;
      }
      return [rex, modrm | 4, rm2.shift << 6 | rmReg2 << 3 | rmReg];
    }
    return [rex, modrm | rmReg, null];
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
  Instruction.prototype.resolveLabels = function(labels2) {
    let initialLength = this.length;
    try {
      for (let op of this.outline[0]) {
        if (op.expression && op.expression.hasLabelDependency)
          op.value = op.expression.evaluate(labels2, this.address);
      }
      this.compile();
    } catch (e) {
      return {
        success: false,
        error: e
      };
    }
    return {
      success: true,
      length: this.length - initialLength
    };
  };
  function inferImmSize(value) {
    if (value < 0n)
      value = ~value;
    return value < 0x80n ? 8 : value < 0x8000n ? 16 : value < 0x80000000n ? 32 : 64;
  }
  function inferUnsignedImmSize(value) {
    if (value < 0n)
      value = -2n * value - 1n;
    return value < 0x100n ? 8 : value < 0x10000n ? 16 : value < 0x100000000n ? 32 : 64;
  }

  // core/compiler.js
  var baseAddr = 4194424;
  var labels = new Map();
  var lastInstr;
  var currLineArr;
  var currAddr;
  function addInstruction(instr) {
    if (lastInstr)
      lastInstr.next = instr;
    currLineArr.push(instr);
    lastInstr = instr;
    currAddr += instr.length;
  }
  function compileAsm(source, instructions, {haltOnError = false, line = 1, linesRemoved = 0, doSecondPass = true} = {}) {
    let opcode, pos;
    lastInstr = null;
    currLineArr = [];
    macros.clear();
    for (let i = 1; i < line && i <= instructions.length; i++) {
      for (lastInstr of instructions[i - 1]) {
        if (lastInstr.macroName)
          macros.set(lastInstr.macroName, lastInstr.macro);
      }
    }
    currAddr = lastInstr ? lastInstr.address : baseAddr;
    let removedInstrs = instructions.splice(line - 1, linesRemoved + 1, currLineArr);
    for (let removed of removedInstrs)
      for (let instr of removed)
        if (instr.macroName)
          throw "Macro edited, must recompile";
    loadCode(source);
    while (next(), !match.done) {
      try {
        pos = codePos;
        if (token !== "\n" && token !== ";") {
          if (token[0] === ".")
            addInstruction(new Directive(token.slice(1), pos));
          else {
            opcode = token;
            switch (next()) {
              case ":":
                addInstruction({length: 0, bytes: new Uint8Array(), labelName: opcode, pos});
                continue;
              case "=":
                let macroTokens = [];
                while (next() !== "\n")
                  macroTokens.push(token);
                macros.set(opcode, macroTokens);
                addInstruction({length: 0, bytes: new Uint8Array(), macroName: opcode, macro: macroTokens, pos});
                break;
              default:
                addInstruction(new Instruction(currAddr, opcode.toLowerCase(), pos));
                break;
            }
          }
        }
        if (token === "\n") {
          if (!match.done)
            instructions.splice(line++, 0, currLineArr = []);
        } else if (token !== ";")
          throw new ParserError("Expected end of line");
      } catch (e) {
        if (haltOnError)
          throw `Error on line ${line}: ${e.message}`;
        if (e.pos == null || e.length == null)
          console.error("Error on line " + line + ":\n", e);
        else
          addInstruction({length: 0, bytes: new Uint8Array(), error: e});
        while (token !== "\n" && token !== ";")
          next();
        if (token === "\n" && !match.done)
          instructions.splice(line++, 0, currLineArr = []);
      }
    }
    if (lastInstr) {
      while (line < instructions.length) {
        if (instructions[line].length > 0) {
          lastInstr.next = instructions[line][0];
          break;
        }
        line++;
      }
    }
    let bytes = 0;
    if (doSecondPass)
      bytes = secondPass(instructions, haltOnError);
    return {instructions, bytes};
  }
  function secondPass(instructions, haltOnError = false) {
    let currIndex = baseAddr, resizeChange, instr, instrLen;
    labels.clear();
    for (let instrLine of instructions) {
      for (instr of instrLine) {
        instr.address = currIndex;
        if (instr.outline)
          instr.length = 0;
        currIndex += instr.length;
        if (instr.labelName !== void 0)
          labels.set(instr.labelName, instr);
        if (instr.skip) {
          instr.skip = false;
          instr.error = void 0;
        }
      }
    }
    for (let i = 0; i < instructions.length; i++) {
      for (instr of instructions[i]) {
        if (instr.skip)
          continue;
        instrLen = instr.length;
        if (instr.outline) {
          resizeChange = instr.resolveLabels(labels);
          if (!resizeChange.success) {
            let e = resizeChange.error;
            if (haltOnError)
              throw `Error on line ${i + 1}: ${e}`;
            if (e.pos == null || e.length == null)
              console.error("Error on line " + (i + 1) + ":\n", e);
            else
              instr.error = e;
            instr.skip = true;
            instr.length = 0;
            resizeChange.length = -instrLen;
          }
          if (resizeChange.length) {
            while (instr = instr.next)
              instr.address += resizeChange.length;
            i = -1;
            break;
          }
        }
      }
    }
    return instr ? instr.address + instr.length - baseAddr : 0;
  }

  // codemirror/parser.terms.js
  var Opcode = 1;
  var Prefix = 2;
  var Register = 3;
  var Directive2 = 4;

  // codemirror/asmPlugin.js
  var AsmDumpWidget = class extends WidgetType {
    constructor(instrs, offset) {
      super();
      this.instrs = instrs;
      this.offset = offset;
    }
    toDOM() {
      let node = document.createElement("span");
      let finalText = "";
      node.setAttribute("aria-hidden", "true");
      node.className = "cm-asm-dump";
      node.style.marginLeft = this.offset + "px";
      for (let instr of this.instrs) {
        for (let i = 0; i < instr.length; i++) {
          finalText += " " + instr.bytes[i].toString(16).toUpperCase().padStart(2, "0");
        }
      }
      node.innerText = finalText.slice(1);
      return node;
    }
  };
  var asmHover = hoverTooltip((view, pos) => {
    for (let err of view["asm-errors"]) {
      if (err.from <= pos && err.to >= pos) {
        let text = err.value.message;
        return {
          pos: err.from,
          end: err.to,
          above: true,
          create: (view2) => {
            let dom = document.createElement("div");
            dom.textContent = text;
            dom.className = "cm-asm-error-tooltip";
            return {dom};
          }
        };
      }
    }
    return null;
  });
  function expandTabs(text, tabSize) {
    let result = "", i = tabSize;
    for (let char of text) {
      if (char == "	") {
        result += " ".repeat(i);
        i = tabSize;
      } else {
        result += char;
        i = i - 1 || tabSize;
      }
    }
    return result;
  }
  var asmPlugin = ViewPlugin.fromClass(class {
    constructor(view) {
      this.ctx = document.createElement("canvas").getContext("2d");
      this.lineWidths = [];
      this.instrs = [];
      let result = compileAsm(view.state.sliceDoc(), this.instrs);
      view["asm-bytes"] = result.bytes;
      this.decorations = Decoration.set([]);
      setTimeout(() => {
        let style = window.getComputedStyle(view.contentDOM);
        this.ctx.font = `${style.getPropertyValue("font-style")} ${style.getPropertyValue("font-variant")} ${style.getPropertyValue("font-weight")} ${style.getPropertyValue("font-size")} ${style.getPropertyValue("font-family")}`;
        this.tabSize = style.getPropertyValue("tab-size");
        this.updateWidths(0, view.state.doc.length, 0, view.state.doc);
        this.makeAsmDecorations(view);
        view.dispatch();
      }, 1);
    }
    update(update) {
      if (!update.docChanged)
        return;
      let state = update.view.state;
      let doc2 = state.doc;
      update.changes.iterChangedRanges((fromA, toA, fromB, toB) => {
        let removedLines = update.startState.doc.lineAt(toA).number - update.startState.doc.lineAt(fromA).number;
        this.updateWidths(fromB, toB, removedLines, doc2);
      });
      try {
        update.changes.iterChanges((fromA, toA, fromB, toB) => {
          let removedLines = update.startState.doc.lineAt(toA).number - update.startState.doc.lineAt(fromA).number;
          let line = doc2.lineAt(fromB);
          fromB = line.from;
          toB = doc2.lineAt(toB).to;
          compileAsm(state.sliceDoc(fromB, toB), this.instrs, {line: line.number, linesRemoved: removedLines, doSecondPass: false});
        });
        update.view["asm-bytes"] = secondPass(this.instrs);
      } catch (e) {
        if (e !== "Macro edited, must recompile")
          throw e;
        this.instrs = [];
        update.view["asm-bytes"] = compileAsm(state.sliceDoc(), this.instrs).bytes;
      }
      this.makeAsmDecorations(update.view);
    }
    updateWidths(from, to, removedLines, doc2) {
      let start = doc2.lineAt(from).number;
      let end = doc2.lineAt(to).number;
      let newWidths = [];
      for (let i = start; i <= end; i++) {
        newWidths.push(this.ctx.measureText(expandTabs(doc2.line(i).text, this.tabSize)).width);
      }
      this.lineWidths.splice(start - 1, removedLines + 1, ...newWidths);
    }
    makeAsmDecorations(view) {
      let doc2 = view.state.doc;
      let maxOffset2 = Math.max(...this.lineWidths) + 50;
      let widgets = [];
      let hasData;
      view["asm-errors"] = [];
      for (let i = 0; i < this.instrs.length; i++) {
        if (this.instrs[i].length == 0)
          continue;
        hasData = false;
        this.instrs[i].map((x) => {
          let error = x.error;
          if (error) {
            let errorMark = Decoration.mark({
              class: "cm-asm-error"
            });
            errorMark.message = error.message;
            let errorPos = view.state.doc.line(i + 1).from + error.pos;
            let errRange = errorMark.range(errorPos, errorPos + error.length);
            widgets.push(errRange);
            view["asm-errors"].push(errRange);
          }
          if (x.length > 0)
            hasData = true;
        });
        if (hasData) {
          let deco = Decoration.widget({
            widget: new AsmDumpWidget(this.instrs[i], maxOffset2 - this.lineWidths[i]),
            side: 1
          });
          widgets.push(deco.range(doc2.line(i + 1).to));
        }
      }
      this.decorations = Decoration.set(widgets);
    }
  }, {decorations: (view) => view.decorations});
  function isOpcode(opcode) {
    opcode = opcode.toLowerCase();
    if (prefixes.hasOwnProperty(opcode))
      return Prefix;
    if (!mnemonics.hasOwnProperty(opcode)) {
      if (opcode[0] === "v" && !mnemonics.hasOwnProperty(opcode.slice(0, -1)))
        opcode = opcode.slice(1);
      if (!mnemonics.hasOwnProperty(opcode) && !mnemonics.hasOwnProperty(opcode.slice(0, -1)))
        return -1;
    }
    return Opcode;
  }
  function isRegister(reg) {
    reg = reg.slice(1).trim().toLowerCase();
    if (registers.hasOwnProperty(reg))
      return Register;
    if (reg[0] === "r") {
      reg = reg.slice(1);
      if (parseInt(reg) > 0 && parseInt(reg) < 16 && (!isNaN(reg) || suffixes[reg[reg.length - 1]]))
        return Register;
    } else {
      let max = 32;
      if (reg.startsWith("mm") || reg.startsWith("dr"))
        reg = reg.slice(2), max = 8;
      else if (reg.startsWith("cr"))
        reg = reg.slice(2), max = 9;
      else if (reg.startsWith("xmm") || reg.startsWith("ymm") || reg.startsWith("zmm"))
        reg = reg.slice(3);
      else if (reg.startsWith("bnd"))
        reg = reg.slice(3), max = 4;
      else if (reg[0] == "k")
        reg = reg.slice(1), max = 8;
      if (!isNaN(reg) && (reg = parseInt(reg), reg >= 0 && reg < max))
        return Register;
    }
    return -1;
  }
  function isDirective(dir) {
    return dirs.hasOwnProperty(dir.slice(1)) ? Directive2 : -1;
  }

  // node_modules/lezer/dist/index.es.js
  var Stack = class {
    constructor(p, stack, state, reducePos, pos, score, buffer, bufferBase, curContext, parent) {
      this.p = p;
      this.stack = stack;
      this.state = state;
      this.reducePos = reducePos;
      this.pos = pos;
      this.score = score;
      this.buffer = buffer;
      this.bufferBase = bufferBase;
      this.curContext = curContext;
      this.parent = parent;
    }
    toString() {
      return `[${this.stack.filter((_, i) => i % 3 == 0).concat(this.state)}]@${this.pos}${this.score ? "!" + this.score : ""}`;
    }
    static start(p, state, pos = 0) {
      let cx = p.parser.context;
      return new Stack(p, [], state, pos, pos, 0, [], 0, cx ? new StackContext(cx, cx.start) : null, null);
    }
    get context() {
      return this.curContext ? this.curContext.context : null;
    }
    pushState(state, start) {
      this.stack.push(this.state, start, this.bufferBase + this.buffer.length);
      this.state = state;
    }
    reduce(action) {
      let depth2 = action >> 19, type = action & 65535;
      let {parser: parser2} = this.p;
      let dPrec = parser2.dynamicPrecedence(type);
      if (dPrec)
        this.score += dPrec;
      if (depth2 == 0) {
        if (type < parser2.minRepeatTerm)
          this.storeNode(type, this.reducePos, this.reducePos, 4, true);
        this.pushState(parser2.getGoto(this.state, type, true), this.reducePos);
        this.reduceContext(type);
        return;
      }
      let base2 = this.stack.length - (depth2 - 1) * 3 - (action & 262144 ? 6 : 0);
      let start = this.stack[base2 - 2];
      let bufferBase = this.stack[base2 - 1], count = this.bufferBase + this.buffer.length - bufferBase;
      if (type < parser2.minRepeatTerm || action & 131072) {
        let pos = parser2.stateFlag(this.state, 1) ? this.pos : this.reducePos;
        this.storeNode(type, start, pos, count + 4, true);
      }
      if (action & 262144) {
        this.state = this.stack[base2];
      } else {
        let baseStateID = this.stack[base2 - 3];
        this.state = parser2.getGoto(baseStateID, type, true);
      }
      while (this.stack.length > base2)
        this.stack.pop();
      this.reduceContext(type);
    }
    storeNode(term, start, end, size = 4, isReduce = false) {
      if (term == 0) {
        let cur = this, top2 = this.buffer.length;
        if (top2 == 0 && cur.parent) {
          top2 = cur.bufferBase - cur.parent.bufferBase;
          cur = cur.parent;
        }
        if (top2 > 0 && cur.buffer[top2 - 4] == 0 && cur.buffer[top2 - 1] > -1) {
          if (start == end)
            return;
          if (cur.buffer[top2 - 2] >= start) {
            cur.buffer[top2 - 2] = end;
            return;
          }
        }
      }
      if (!isReduce || this.pos == end) {
        this.buffer.push(term, start, end, size);
      } else {
        let index = this.buffer.length;
        if (index > 0 && this.buffer[index - 4] != 0)
          while (index > 0 && this.buffer[index - 2] > end) {
            this.buffer[index] = this.buffer[index - 4];
            this.buffer[index + 1] = this.buffer[index - 3];
            this.buffer[index + 2] = this.buffer[index - 2];
            this.buffer[index + 3] = this.buffer[index - 1];
            index -= 4;
            if (size > 4)
              size -= 4;
          }
        this.buffer[index] = term;
        this.buffer[index + 1] = start;
        this.buffer[index + 2] = end;
        this.buffer[index + 3] = size;
      }
    }
    shift(action, next2, nextEnd) {
      if (action & 131072) {
        this.pushState(action & 65535, this.pos);
      } else if ((action & 262144) == 0) {
        let start = this.pos, nextState = action, {parser: parser2} = this.p;
        if (nextEnd > this.pos || next2 <= parser2.maxNode) {
          this.pos = nextEnd;
          if (!parser2.stateFlag(nextState, 1))
            this.reducePos = nextEnd;
        }
        this.pushState(nextState, start);
        if (next2 <= parser2.maxNode)
          this.buffer.push(next2, start, nextEnd, 4);
        this.shiftContext(next2);
      } else {
        if (next2 <= this.p.parser.maxNode)
          this.buffer.push(next2, this.pos, nextEnd, 4);
        this.pos = nextEnd;
      }
    }
    apply(action, next2, nextEnd) {
      if (action & 65536)
        this.reduce(action);
      else
        this.shift(action, next2, nextEnd);
    }
    useNode(value, next2) {
      let index = this.p.reused.length - 1;
      if (index < 0 || this.p.reused[index] != value) {
        this.p.reused.push(value);
        index++;
      }
      let start = this.pos;
      this.reducePos = this.pos = start + value.length;
      this.pushState(next2, start);
      this.buffer.push(index, start, this.reducePos, -1);
      if (this.curContext)
        this.updateContext(this.curContext.tracker.reuse(this.curContext.context, value, this.p.input, this));
    }
    split() {
      let parent = this;
      let off = parent.buffer.length;
      while (off > 0 && parent.buffer[off - 2] > parent.reducePos)
        off -= 4;
      let buffer = parent.buffer.slice(off), base2 = parent.bufferBase + off;
      while (parent && base2 == parent.bufferBase)
        parent = parent.parent;
      return new Stack(this.p, this.stack.slice(), this.state, this.reducePos, this.pos, this.score, buffer, base2, this.curContext, parent);
    }
    recoverByDelete(next2, nextEnd) {
      let isNode = next2 <= this.p.parser.maxNode;
      if (isNode)
        this.storeNode(next2, this.pos, nextEnd);
      this.storeNode(0, this.pos, nextEnd, isNode ? 8 : 4);
      this.pos = this.reducePos = nextEnd;
      this.score -= 200;
    }
    canShift(term) {
      for (let sim = new SimulatedStack(this); ; ) {
        let action = this.p.parser.stateSlot(sim.top, 4) || this.p.parser.hasAction(sim.top, term);
        if ((action & 65536) == 0)
          return true;
        if (action == 0)
          return false;
        sim.reduce(action);
      }
    }
    get ruleStart() {
      for (let state = this.state, base2 = this.stack.length; ; ) {
        let force = this.p.parser.stateSlot(state, 5);
        if (!(force & 65536))
          return 0;
        base2 -= 3 * (force >> 19);
        if ((force & 65535) < this.p.parser.minRepeatTerm)
          return this.stack[base2 + 1];
        state = this.stack[base2];
      }
    }
    startOf(types2, before) {
      let state = this.state, frame = this.stack.length, {parser: parser2} = this.p;
      for (; ; ) {
        let force = parser2.stateSlot(state, 5);
        let depth2 = force >> 19, term = force & 65535;
        if (types2.indexOf(term) > -1) {
          let base2 = frame - 3 * (force >> 19), pos = this.stack[base2 + 1];
          if (before == null || before > pos)
            return pos;
        }
        if (frame == 0)
          return null;
        if (depth2 == 0) {
          frame -= 3;
          state = this.stack[frame];
        } else {
          frame -= 3 * (depth2 - 1);
          state = parser2.getGoto(this.stack[frame - 3], term, true);
        }
      }
    }
    recoverByInsert(next2) {
      if (this.stack.length >= 300)
        return [];
      let nextStates = this.p.parser.nextStates(this.state);
      if (nextStates.length > 4 << 1 || this.stack.length >= 120) {
        let best = [];
        for (let i = 0, s; i < nextStates.length; i += 2) {
          if ((s = nextStates[i + 1]) != this.state && this.p.parser.hasAction(s, next2))
            best.push(nextStates[i], s);
        }
        if (this.stack.length < 120)
          for (let i = 0; best.length < 4 << 1 && i < nextStates.length; i += 2) {
            let s = nextStates[i + 1];
            if (!best.some((v, i2) => i2 & 1 && v == s))
              best.push(nextStates[i], s);
          }
        nextStates = best;
      }
      let result = [];
      for (let i = 0; i < nextStates.length && result.length < 4; i += 2) {
        let s = nextStates[i + 1];
        if (s == this.state)
          continue;
        let stack = this.split();
        stack.storeNode(0, stack.pos, stack.pos, 4, true);
        stack.pushState(s, this.pos);
        stack.shiftContext(nextStates[i]);
        stack.score -= 200;
        result.push(stack);
      }
      return result;
    }
    forceReduce() {
      let reduce = this.p.parser.stateSlot(this.state, 5);
      if ((reduce & 65536) == 0)
        return false;
      if (!this.p.parser.validAction(this.state, reduce)) {
        this.storeNode(0, this.reducePos, this.reducePos, 4, true);
        this.score -= 100;
      }
      this.reduce(reduce);
      return true;
    }
    forceAll() {
      while (!this.p.parser.stateFlag(this.state, 2) && this.forceReduce()) {
      }
      return this;
    }
    get deadEnd() {
      if (this.stack.length != 3)
        return false;
      let {parser: parser2} = this.p;
      return parser2.data[parser2.stateSlot(this.state, 1)] == 65535 && !parser2.stateSlot(this.state, 4);
    }
    restart() {
      this.state = this.stack[0];
      this.stack.length = 0;
    }
    sameState(other) {
      if (this.state != other.state || this.stack.length != other.stack.length)
        return false;
      for (let i = 0; i < this.stack.length; i += 3)
        if (this.stack[i] != other.stack[i])
          return false;
      return true;
    }
    get parser() {
      return this.p.parser;
    }
    dialectEnabled(dialectID) {
      return this.p.parser.dialect.flags[dialectID];
    }
    shiftContext(term) {
      if (this.curContext)
        this.updateContext(this.curContext.tracker.shift(this.curContext.context, term, this.p.input, this));
    }
    reduceContext(term) {
      if (this.curContext)
        this.updateContext(this.curContext.tracker.reduce(this.curContext.context, term, this.p.input, this));
    }
    emitContext() {
      let cx = this.curContext;
      if (!cx.tracker.strict)
        return;
      let last = this.buffer.length - 1;
      if (last < 0 || this.buffer[last] != -2)
        this.buffer.push(cx.hash, this.reducePos, this.reducePos, -2);
    }
    updateContext(context) {
      if (context != this.curContext.context) {
        let newCx = new StackContext(this.curContext.tracker, context);
        if (newCx.hash != this.curContext.hash)
          this.emitContext();
        this.curContext = newCx;
      }
    }
  };
  var StackContext = class {
    constructor(tracker, context) {
      this.tracker = tracker;
      this.context = context;
      this.hash = tracker.hash(context);
    }
  };
  var Recover;
  (function(Recover2) {
    Recover2[Recover2["Token"] = 200] = "Token";
    Recover2[Recover2["Reduce"] = 100] = "Reduce";
    Recover2[Recover2["MaxNext"] = 4] = "MaxNext";
    Recover2[Recover2["MaxInsertStackDepth"] = 300] = "MaxInsertStackDepth";
    Recover2[Recover2["DampenInsertStackDepth"] = 120] = "DampenInsertStackDepth";
  })(Recover || (Recover = {}));
  var SimulatedStack = class {
    constructor(stack) {
      this.stack = stack;
      this.top = stack.state;
      this.rest = stack.stack;
      this.offset = this.rest.length;
    }
    reduce(action) {
      let term = action & 65535, depth2 = action >> 19;
      if (depth2 == 0) {
        if (this.rest == this.stack.stack)
          this.rest = this.rest.slice();
        this.rest.push(this.top, 0, 0);
        this.offset += 3;
      } else {
        this.offset -= (depth2 - 1) * 3;
      }
      let goto = this.stack.p.parser.getGoto(this.rest[this.offset - 3], term, true);
      this.top = goto;
    }
  };
  var StackBufferCursor = class {
    constructor(stack, pos, index) {
      this.stack = stack;
      this.pos = pos;
      this.index = index;
      this.buffer = stack.buffer;
      if (this.index == 0)
        this.maybeNext();
    }
    static create(stack) {
      return new StackBufferCursor(stack, stack.bufferBase + stack.buffer.length, stack.buffer.length);
    }
    maybeNext() {
      let next2 = this.stack.parent;
      if (next2 != null) {
        this.index = this.stack.bufferBase - next2.bufferBase;
        this.stack = next2;
        this.buffer = next2.buffer;
      }
    }
    get id() {
      return this.buffer[this.index - 4];
    }
    get start() {
      return this.buffer[this.index - 3];
    }
    get end() {
      return this.buffer[this.index - 2];
    }
    get size() {
      return this.buffer[this.index - 1];
    }
    next() {
      this.index -= 4;
      this.pos -= 4;
      if (this.index == 0)
        this.maybeNext();
    }
    fork() {
      return new StackBufferCursor(this.stack, this.pos, this.index);
    }
  };
  var Token = class {
    constructor() {
      this.start = -1;
      this.value = -1;
      this.end = -1;
    }
    accept(value, end) {
      this.value = value;
      this.end = end;
    }
  };
  var TokenGroup = class {
    constructor(data, id) {
      this.data = data;
      this.id = id;
    }
    token(input, token2, stack) {
      readToken(this.data, input, token2, stack, this.id);
    }
  };
  TokenGroup.prototype.contextual = TokenGroup.prototype.fallback = TokenGroup.prototype.extend = false;
  function readToken(data, input, token2, stack, group) {
    let state = 0, groupMask = 1 << group, dialect = stack.p.parser.dialect;
    scan:
      for (let pos = token2.start; ; ) {
        if ((groupMask & data[state]) == 0)
          break;
        let accEnd = data[state + 1];
        for (let i = state + 3; i < accEnd; i += 2)
          if ((data[i + 1] & groupMask) > 0) {
            let term = data[i];
            if (dialect.allows(term) && (token2.value == -1 || token2.value == term || stack.p.parser.overrides(term, token2.value))) {
              token2.accept(term, pos);
              break;
            }
          }
        let next2 = input.get(pos++);
        for (let low = 0, high = data[state + 2]; low < high; ) {
          let mid = low + high >> 1;
          let index = accEnd + mid + (mid << 1);
          let from = data[index], to = data[index + 1];
          if (next2 < from)
            high = mid;
          else if (next2 >= to)
            low = mid + 1;
          else {
            state = data[index + 2];
            continue scan;
          }
        }
        break;
      }
  }
  function decodeArray(input, Type = Uint16Array) {
    if (typeof input != "string")
      return input;
    let array = null;
    for (let pos = 0, out = 0; pos < input.length; ) {
      let value = 0;
      for (; ; ) {
        let next2 = input.charCodeAt(pos++), stop = false;
        if (next2 == 126) {
          value = 65535;
          break;
        }
        if (next2 >= 92)
          next2--;
        if (next2 >= 34)
          next2--;
        let digit = next2 - 32;
        if (digit >= 46) {
          digit -= 46;
          stop = true;
        }
        value += digit;
        if (stop)
          break;
        value *= 46;
      }
      if (array)
        array[out++] = value;
      else
        array = new Type(value);
    }
    return array;
  }
  var verbose = typeof process != "undefined" && /\bparse\b/.test(process.env.LOG);
  var stackIDs = null;
  function cutAt(tree, pos, side) {
    let cursor = tree.cursor(pos);
    for (; ; ) {
      if (!(side < 0 ? cursor.childBefore(pos) : cursor.childAfter(pos)))
        for (; ; ) {
          if ((side < 0 ? cursor.to <= pos : cursor.from >= pos) && !cursor.type.isError)
            return side < 0 ? Math.max(0, Math.min(cursor.to - 1, pos - 5)) : Math.min(tree.length, Math.max(cursor.from + 1, pos + 5));
          if (side < 0 ? cursor.prevSibling() : cursor.nextSibling())
            break;
          if (!cursor.parent())
            return side < 0 ? 0 : tree.length;
        }
    }
  }
  var FragmentCursor = class {
    constructor(fragments) {
      this.fragments = fragments;
      this.i = 0;
      this.fragment = null;
      this.safeFrom = -1;
      this.safeTo = -1;
      this.trees = [];
      this.start = [];
      this.index = [];
      this.nextFragment();
    }
    nextFragment() {
      let fr = this.fragment = this.i == this.fragments.length ? null : this.fragments[this.i++];
      if (fr) {
        this.safeFrom = fr.openStart ? cutAt(fr.tree, fr.from + fr.offset, 1) - fr.offset : fr.from;
        this.safeTo = fr.openEnd ? cutAt(fr.tree, fr.to + fr.offset, -1) - fr.offset : fr.to;
        while (this.trees.length) {
          this.trees.pop();
          this.start.pop();
          this.index.pop();
        }
        this.trees.push(fr.tree);
        this.start.push(-fr.offset);
        this.index.push(0);
        this.nextStart = this.safeFrom;
      } else {
        this.nextStart = 1e9;
      }
    }
    nodeAt(pos) {
      if (pos < this.nextStart)
        return null;
      while (this.fragment && this.safeTo <= pos)
        this.nextFragment();
      if (!this.fragment)
        return null;
      for (; ; ) {
        let last = this.trees.length - 1;
        if (last < 0) {
          this.nextFragment();
          return null;
        }
        let top2 = this.trees[last], index = this.index[last];
        if (index == top2.children.length) {
          this.trees.pop();
          this.start.pop();
          this.index.pop();
          continue;
        }
        let next2 = top2.children[index];
        let start = this.start[last] + top2.positions[index];
        if (start > pos) {
          this.nextStart = start;
          return null;
        } else if (start == pos && start + next2.length <= this.safeTo) {
          return start == pos && start >= this.safeFrom ? next2 : null;
        }
        if (next2 instanceof TreeBuffer) {
          this.index[last]++;
          this.nextStart = start + next2.length;
        } else {
          this.index[last]++;
          if (start + next2.length >= pos) {
            this.trees.push(next2);
            this.start.push(start);
            this.index.push(0);
          }
        }
      }
    }
  };
  var CachedToken = class extends Token {
    constructor() {
      super(...arguments);
      this.extended = -1;
      this.mask = 0;
      this.context = 0;
    }
    clear(start) {
      this.start = start;
      this.value = this.extended = -1;
    }
  };
  var dummyToken = new Token();
  var TokenCache = class {
    constructor(parser2) {
      this.tokens = [];
      this.mainToken = dummyToken;
      this.actions = [];
      this.tokens = parser2.tokenizers.map((_) => new CachedToken());
    }
    getActions(stack, input) {
      let actionIndex = 0;
      let main = null;
      let {parser: parser2} = stack.p, {tokenizers} = parser2;
      let mask = parser2.stateSlot(stack.state, 3);
      let context = stack.curContext ? stack.curContext.hash : 0;
      for (let i = 0; i < tokenizers.length; i++) {
        if ((1 << i & mask) == 0)
          continue;
        let tokenizer = tokenizers[i], token2 = this.tokens[i];
        if (main && !tokenizer.fallback)
          continue;
        if (tokenizer.contextual || token2.start != stack.pos || token2.mask != mask || token2.context != context) {
          this.updateCachedToken(token2, tokenizer, stack, input);
          token2.mask = mask;
          token2.context = context;
        }
        if (token2.value != 0) {
          let startIndex = actionIndex;
          if (token2.extended > -1)
            actionIndex = this.addActions(stack, token2.extended, token2.end, actionIndex);
          actionIndex = this.addActions(stack, token2.value, token2.end, actionIndex);
          if (!tokenizer.extend) {
            main = token2;
            if (actionIndex > startIndex)
              break;
          }
        }
      }
      while (this.actions.length > actionIndex)
        this.actions.pop();
      if (!main) {
        main = dummyToken;
        main.start = stack.pos;
        if (stack.pos == input.length)
          main.accept(stack.p.parser.eofTerm, stack.pos);
        else
          main.accept(0, stack.pos + 1);
      }
      this.mainToken = main;
      return this.actions;
    }
    updateCachedToken(token2, tokenizer, stack, input) {
      token2.clear(stack.pos);
      tokenizer.token(input, token2, stack);
      if (token2.value > -1) {
        let {parser: parser2} = stack.p;
        for (let i = 0; i < parser2.specialized.length; i++)
          if (parser2.specialized[i] == token2.value) {
            let result = parser2.specializers[i](input.read(token2.start, token2.end), stack);
            if (result >= 0 && stack.p.parser.dialect.allows(result >> 1)) {
              if ((result & 1) == 0)
                token2.value = result >> 1;
              else
                token2.extended = result >> 1;
              break;
            }
          }
      } else if (stack.pos == input.length) {
        token2.accept(stack.p.parser.eofTerm, stack.pos);
      } else {
        token2.accept(0, stack.pos + 1);
      }
    }
    putAction(action, token2, end, index) {
      for (let i = 0; i < index; i += 3)
        if (this.actions[i] == action)
          return index;
      this.actions[index++] = action;
      this.actions[index++] = token2;
      this.actions[index++] = end;
      return index;
    }
    addActions(stack, token2, end, index) {
      let {state} = stack, {parser: parser2} = stack.p, {data} = parser2;
      for (let set = 0; set < 2; set++) {
        for (let i = parser2.stateSlot(state, set ? 2 : 1); ; i += 3) {
          if (data[i] == 65535) {
            if (data[i + 1] == 1) {
              i = pair(data, i + 2);
            } else {
              if (index == 0 && data[i + 1] == 2)
                index = this.putAction(pair(data, i + 1), token2, end, index);
              break;
            }
          }
          if (data[i] == token2)
            index = this.putAction(pair(data, i + 1), token2, end, index);
        }
      }
      return index;
    }
  };
  var Rec;
  (function(Rec2) {
    Rec2[Rec2["Distance"] = 5] = "Distance";
    Rec2[Rec2["MaxRemainingPerStep"] = 3] = "MaxRemainingPerStep";
    Rec2[Rec2["MinBufferLengthPrune"] = 200] = "MinBufferLengthPrune";
    Rec2[Rec2["ForceReduceLimit"] = 10] = "ForceReduceLimit";
  })(Rec || (Rec = {}));
  var Parse = class {
    constructor(parser2, input, startPos, context) {
      this.parser = parser2;
      this.input = input;
      this.startPos = startPos;
      this.context = context;
      this.pos = 0;
      this.recovering = 0;
      this.nextStackID = 9812;
      this.nested = null;
      this.nestEnd = 0;
      this.nestWrap = null;
      this.reused = [];
      this.tokens = new TokenCache(parser2);
      this.topTerm = parser2.top[1];
      this.stacks = [Stack.start(this, parser2.top[0], this.startPos)];
      let fragments = context === null || context === void 0 ? void 0 : context.fragments;
      this.fragments = fragments && fragments.length ? new FragmentCursor(fragments) : null;
    }
    advance() {
      if (this.nested) {
        let result = this.nested.advance();
        this.pos = this.nested.pos;
        if (result) {
          this.finishNested(this.stacks[0], result);
          this.nested = null;
        }
        return null;
      }
      let stacks = this.stacks, pos = this.pos;
      let newStacks = this.stacks = [];
      let stopped, stoppedTokens;
      let maybeNest;
      for (let i = 0; i < stacks.length; i++) {
        let stack = stacks[i], nest;
        for (; ; ) {
          if (stack.pos > pos) {
            newStacks.push(stack);
          } else if (nest = this.checkNest(stack)) {
            if (!maybeNest || maybeNest.stack.score < stack.score)
              maybeNest = nest;
          } else if (this.advanceStack(stack, newStacks, stacks)) {
            continue;
          } else {
            if (!stopped) {
              stopped = [];
              stoppedTokens = [];
            }
            stopped.push(stack);
            let tok = this.tokens.mainToken;
            stoppedTokens.push(tok.value, tok.end);
          }
          break;
        }
      }
      if (maybeNest) {
        this.startNested(maybeNest);
        return null;
      }
      if (!newStacks.length) {
        let finished = stopped && findFinished(stopped);
        if (finished)
          return this.stackToTree(finished);
        if (this.parser.strict) {
          if (verbose && stopped)
            console.log("Stuck with token " + this.parser.getName(this.tokens.mainToken.value));
          throw new SyntaxError("No parse at " + pos);
        }
        if (!this.recovering)
          this.recovering = 5;
      }
      if (this.recovering && stopped) {
        let finished = this.runRecovery(stopped, stoppedTokens, newStacks);
        if (finished)
          return this.stackToTree(finished.forceAll());
      }
      if (this.recovering) {
        let maxRemaining = this.recovering == 1 ? 1 : this.recovering * 3;
        if (newStacks.length > maxRemaining) {
          newStacks.sort((a, b) => b.score - a.score);
          while (newStacks.length > maxRemaining)
            newStacks.pop();
        }
        if (newStacks.some((s) => s.reducePos > pos))
          this.recovering--;
      } else if (newStacks.length > 1) {
        outer:
          for (let i = 0; i < newStacks.length - 1; i++) {
            let stack = newStacks[i];
            for (let j = i + 1; j < newStacks.length; j++) {
              let other = newStacks[j];
              if (stack.sameState(other) || stack.buffer.length > 200 && other.buffer.length > 200) {
                if ((stack.score - other.score || stack.buffer.length - other.buffer.length) > 0) {
                  newStacks.splice(j--, 1);
                } else {
                  newStacks.splice(i--, 1);
                  continue outer;
                }
              }
            }
          }
      }
      this.pos = newStacks[0].pos;
      for (let i = 1; i < newStacks.length; i++)
        if (newStacks[i].pos < this.pos)
          this.pos = newStacks[i].pos;
      return null;
    }
    advanceStack(stack, stacks, split) {
      let start = stack.pos, {input, parser: parser2} = this;
      let base2 = verbose ? this.stackID(stack) + " -> " : "";
      if (this.fragments) {
        let strictCx = stack.curContext && stack.curContext.tracker.strict, cxHash = strictCx ? stack.curContext.hash : 0;
        for (let cached = this.fragments.nodeAt(start); cached; ) {
          let match2 = this.parser.nodeSet.types[cached.type.id] == cached.type ? parser2.getGoto(stack.state, cached.type.id) : -1;
          if (match2 > -1 && cached.length && (!strictCx || (cached.contextHash || 0) == cxHash)) {
            stack.useNode(cached, match2);
            if (verbose)
              console.log(base2 + this.stackID(stack) + ` (via reuse of ${parser2.getName(cached.type.id)})`);
            return true;
          }
          if (!(cached instanceof Tree) || cached.children.length == 0 || cached.positions[0] > 0)
            break;
          let inner = cached.children[0];
          if (inner instanceof Tree)
            cached = inner;
          else
            break;
        }
      }
      let defaultReduce = parser2.stateSlot(stack.state, 4);
      if (defaultReduce > 0) {
        stack.reduce(defaultReduce);
        if (verbose)
          console.log(base2 + this.stackID(stack) + ` (via always-reduce ${parser2.getName(defaultReduce & 65535)})`);
        return true;
      }
      let actions = this.tokens.getActions(stack, input);
      for (let i = 0; i < actions.length; ) {
        let action = actions[i++], term = actions[i++], end = actions[i++];
        let last = i == actions.length || !split;
        let localStack = last ? stack : stack.split();
        localStack.apply(action, term, end);
        if (verbose)
          console.log(base2 + this.stackID(localStack) + ` (via ${(action & 65536) == 0 ? "shift" : `reduce of ${parser2.getName(action & 65535)}`} for ${parser2.getName(term)} @ ${start}${localStack == stack ? "" : ", split"})`);
        if (last)
          return true;
        else if (localStack.pos > start)
          stacks.push(localStack);
        else
          split.push(localStack);
      }
      return false;
    }
    advanceFully(stack, newStacks) {
      let pos = stack.pos;
      for (; ; ) {
        let nest = this.checkNest(stack);
        if (nest)
          return nest;
        if (!this.advanceStack(stack, null, null))
          return false;
        if (stack.pos > pos) {
          pushStackDedup(stack, newStacks);
          return true;
        }
      }
    }
    runRecovery(stacks, tokens, newStacks) {
      let finished = null, restarted = false;
      let maybeNest;
      for (let i = 0; i < stacks.length; i++) {
        let stack = stacks[i], token2 = tokens[i << 1], tokenEnd = tokens[(i << 1) + 1];
        let base2 = verbose ? this.stackID(stack) + " -> " : "";
        if (stack.deadEnd) {
          if (restarted)
            continue;
          restarted = true;
          stack.restart();
          if (verbose)
            console.log(base2 + this.stackID(stack) + " (restarted)");
          let done = this.advanceFully(stack, newStacks);
          if (done) {
            if (done !== true)
              maybeNest = done;
            continue;
          }
        }
        let force = stack.split(), forceBase = base2;
        for (let j = 0; force.forceReduce() && j < 10; j++) {
          if (verbose)
            console.log(forceBase + this.stackID(force) + " (via force-reduce)");
          let done = this.advanceFully(force, newStacks);
          if (done) {
            if (done !== true)
              maybeNest = done;
            break;
          }
          if (verbose)
            forceBase = this.stackID(force) + " -> ";
        }
        for (let insert2 of stack.recoverByInsert(token2)) {
          if (verbose)
            console.log(base2 + this.stackID(insert2) + " (via recover-insert)");
          this.advanceFully(insert2, newStacks);
        }
        if (this.input.length > stack.pos) {
          if (tokenEnd == stack.pos) {
            tokenEnd++;
            token2 = 0;
          }
          stack.recoverByDelete(token2, tokenEnd);
          if (verbose)
            console.log(base2 + this.stackID(stack) + ` (via recover-delete ${this.parser.getName(token2)})`);
          pushStackDedup(stack, newStacks);
        } else if (!finished || finished.score < stack.score) {
          finished = stack;
        }
      }
      if (finished)
        return finished;
      if (maybeNest) {
        for (let s of this.stacks)
          if (s.score > maybeNest.stack.score) {
            maybeNest = void 0;
            break;
          }
      }
      if (maybeNest)
        this.startNested(maybeNest);
      return null;
    }
    forceFinish() {
      let stack = this.stacks[0].split();
      if (this.nested)
        this.finishNested(stack, this.nested.forceFinish());
      return this.stackToTree(stack.forceAll());
    }
    stackToTree(stack, pos = stack.pos) {
      if (this.parser.context)
        stack.emitContext();
      return Tree.build({
        buffer: StackBufferCursor.create(stack),
        nodeSet: this.parser.nodeSet,
        topID: this.topTerm,
        maxBufferLength: this.parser.bufferLength,
        reused: this.reused,
        start: this.startPos,
        length: pos - this.startPos,
        minRepeatType: this.parser.minRepeatTerm
      });
    }
    checkNest(stack) {
      let info = this.parser.findNested(stack.state);
      if (!info)
        return null;
      let spec = info.value;
      if (typeof spec == "function")
        spec = spec(this.input, stack);
      return spec ? {stack, info, spec} : null;
    }
    startNested(nest) {
      let {stack, info, spec} = nest;
      this.stacks = [stack];
      this.nestEnd = this.scanForNestEnd(stack, info.end, spec.filterEnd);
      this.nestWrap = typeof spec.wrapType == "number" ? this.parser.nodeSet.types[spec.wrapType] : spec.wrapType || null;
      if (spec.startParse) {
        this.nested = spec.startParse(this.input.clip(this.nestEnd), stack.pos, this.context);
      } else {
        this.finishNested(stack);
      }
    }
    scanForNestEnd(stack, endToken, filter) {
      for (let pos = stack.pos; pos < this.input.length; pos++) {
        dummyToken.start = pos;
        dummyToken.value = -1;
        endToken.token(this.input, dummyToken, stack);
        if (dummyToken.value > -1 && (!filter || filter(this.input.read(pos, dummyToken.end))))
          return pos;
      }
      return this.input.length;
    }
    finishNested(stack, tree) {
      if (this.nestWrap)
        tree = new Tree(this.nestWrap, tree ? [tree] : [], tree ? [0] : [], this.nestEnd - stack.pos);
      else if (!tree)
        tree = new Tree(NodeType.none, [], [], this.nestEnd - stack.pos);
      let info = this.parser.findNested(stack.state);
      stack.useNode(tree, this.parser.getGoto(stack.state, info.placeholder, true));
      if (verbose)
        console.log(this.stackID(stack) + ` (via unnest)`);
    }
    stackID(stack) {
      let id = (stackIDs || (stackIDs = new WeakMap())).get(stack);
      if (!id)
        stackIDs.set(stack, id = String.fromCodePoint(this.nextStackID++));
      return id + stack;
    }
  };
  function pushStackDedup(stack, newStacks) {
    for (let i = 0; i < newStacks.length; i++) {
      let other = newStacks[i];
      if (other.pos == stack.pos && other.sameState(stack)) {
        if (newStacks[i].score < stack.score)
          newStacks[i] = stack;
        return;
      }
    }
    newStacks.push(stack);
  }
  var Dialect = class {
    constructor(source, flags, disabled) {
      this.source = source;
      this.flags = flags;
      this.disabled = disabled;
    }
    allows(term) {
      return !this.disabled || this.disabled[term] == 0;
    }
  };
  var Parser = class {
    constructor(spec) {
      this.bufferLength = DefaultBufferLength;
      this.strict = false;
      this.cachedDialect = null;
      if (spec.version != 13)
        throw new RangeError(`Parser version (${spec.version}) doesn't match runtime version (${13})`);
      let tokenArray = decodeArray(spec.tokenData);
      let nodeNames = spec.nodeNames.split(" ");
      this.minRepeatTerm = nodeNames.length;
      this.context = spec.context;
      for (let i = 0; i < spec.repeatNodeCount; i++)
        nodeNames.push("");
      let nodeProps = [];
      for (let i = 0; i < nodeNames.length; i++)
        nodeProps.push([]);
      function setProp(nodeID, prop, value) {
        nodeProps[nodeID].push([prop, prop.deserialize(String(value))]);
      }
      if (spec.nodeProps)
        for (let propSpec of spec.nodeProps) {
          let prop = propSpec[0];
          for (let i = 1; i < propSpec.length; ) {
            let next2 = propSpec[i++];
            if (next2 >= 0) {
              setProp(next2, prop, propSpec[i++]);
            } else {
              let value = propSpec[i + -next2];
              for (let j = -next2; j > 0; j--)
                setProp(propSpec[i++], prop, value);
              i++;
            }
          }
        }
      this.specialized = new Uint16Array(spec.specialized ? spec.specialized.length : 0);
      this.specializers = [];
      if (spec.specialized)
        for (let i = 0; i < spec.specialized.length; i++) {
          this.specialized[i] = spec.specialized[i].term;
          this.specializers[i] = spec.specialized[i].get;
        }
      this.states = decodeArray(spec.states, Uint32Array);
      this.data = decodeArray(spec.stateData);
      this.goto = decodeArray(spec.goto);
      let topTerms = Object.keys(spec.topRules).map((r) => spec.topRules[r][1]);
      this.nodeSet = new NodeSet(nodeNames.map((name2, i) => NodeType.define({
        name: i >= this.minRepeatTerm ? void 0 : name2,
        id: i,
        props: nodeProps[i],
        top: topTerms.indexOf(i) > -1,
        error: i == 0,
        skipped: spec.skippedNodes && spec.skippedNodes.indexOf(i) > -1
      })));
      this.maxTerm = spec.maxTerm;
      this.tokenizers = spec.tokenizers.map((value) => typeof value == "number" ? new TokenGroup(tokenArray, value) : value);
      this.topRules = spec.topRules;
      this.nested = (spec.nested || []).map(([name2, value, endToken, placeholder]) => {
        return {name: name2, value, end: new TokenGroup(decodeArray(endToken), 0), placeholder};
      });
      this.dialects = spec.dialects || {};
      this.dynamicPrecedences = spec.dynamicPrecedences || null;
      this.tokenPrecTable = spec.tokenPrec;
      this.termNames = spec.termNames || null;
      this.maxNode = this.nodeSet.types.length - 1;
      this.dialect = this.parseDialect();
      this.top = this.topRules[Object.keys(this.topRules)[0]];
    }
    parse(input, startPos = 0, context = {}) {
      if (typeof input == "string")
        input = stringInput(input);
      let cx = new Parse(this, input, startPos, context);
      for (; ; ) {
        let done = cx.advance();
        if (done)
          return done;
      }
    }
    startParse(input, startPos = 0, context = {}) {
      if (typeof input == "string")
        input = stringInput(input);
      return new Parse(this, input, startPos, context);
    }
    getGoto(state, term, loose = false) {
      let table = this.goto;
      if (term >= table[0])
        return -1;
      for (let pos = table[term + 1]; ; ) {
        let groupTag = table[pos++], last = groupTag & 1;
        let target = table[pos++];
        if (last && loose)
          return target;
        for (let end = pos + (groupTag >> 1); pos < end; pos++)
          if (table[pos] == state)
            return target;
        if (last)
          return -1;
      }
    }
    hasAction(state, terminal) {
      let data = this.data;
      for (let set = 0; set < 2; set++) {
        for (let i = this.stateSlot(state, set ? 2 : 1), next2; ; i += 3) {
          if ((next2 = data[i]) == 65535) {
            if (data[i + 1] == 1)
              next2 = data[i = pair(data, i + 2)];
            else if (data[i + 1] == 2)
              return pair(data, i + 2);
            else
              break;
          }
          if (next2 == terminal || next2 == 0)
            return pair(data, i + 1);
        }
      }
      return 0;
    }
    stateSlot(state, slot) {
      return this.states[state * 6 + slot];
    }
    stateFlag(state, flag) {
      return (this.stateSlot(state, 0) & flag) > 0;
    }
    findNested(state) {
      let flags = this.stateSlot(state, 0);
      return flags & 4 ? this.nested[flags >> 10] : null;
    }
    validAction(state, action) {
      if (action == this.stateSlot(state, 4))
        return true;
      for (let i = this.stateSlot(state, 1); ; i += 3) {
        if (this.data[i] == 65535) {
          if (this.data[i + 1] == 1)
            i = pair(this.data, i + 2);
          else
            return false;
        }
        if (action == pair(this.data, i + 1))
          return true;
      }
    }
    nextStates(state) {
      let result = [];
      for (let i = this.stateSlot(state, 1); ; i += 3) {
        if (this.data[i] == 65535) {
          if (this.data[i + 1] == 1)
            i = pair(this.data, i + 2);
          else
            break;
        }
        if ((this.data[i + 2] & 65536 >> 16) == 0) {
          let value = this.data[i + 1];
          if (!result.some((v, i2) => i2 & 1 && v == value))
            result.push(this.data[i], value);
        }
      }
      return result;
    }
    overrides(token2, prev) {
      let iPrev = findOffset(this.data, this.tokenPrecTable, prev);
      return iPrev < 0 || findOffset(this.data, this.tokenPrecTable, token2) < iPrev;
    }
    configure(config2) {
      let copy = Object.assign(Object.create(Parser.prototype), this);
      if (config2.props)
        copy.nodeSet = this.nodeSet.extend(...config2.props);
      if (config2.top) {
        let info = this.topRules[config2.top];
        if (!info)
          throw new RangeError(`Invalid top rule name ${config2.top}`);
        copy.top = info;
      }
      if (config2.tokenizers)
        copy.tokenizers = this.tokenizers.map((t2) => {
          let found = config2.tokenizers.find((r) => r.from == t2);
          return found ? found.to : t2;
        });
      if (config2.dialect)
        copy.dialect = this.parseDialect(config2.dialect);
      if (config2.nested)
        copy.nested = this.nested.map((obj) => {
          if (!Object.prototype.hasOwnProperty.call(config2.nested, obj.name))
            return obj;
          return {name: obj.name, value: config2.nested[obj.name], end: obj.end, placeholder: obj.placeholder};
        });
      if (config2.strict != null)
        copy.strict = config2.strict;
      if (config2.bufferLength != null)
        copy.bufferLength = config2.bufferLength;
      return copy;
    }
    getName(term) {
      return this.termNames ? this.termNames[term] : String(term <= this.maxNode && this.nodeSet.types[term].name || term);
    }
    get eofTerm() {
      return this.maxNode + 1;
    }
    get hasNested() {
      return this.nested.length > 0;
    }
    get topNode() {
      return this.nodeSet.types[this.top[1]];
    }
    dynamicPrecedence(term) {
      let prec2 = this.dynamicPrecedences;
      return prec2 == null ? 0 : prec2[term] || 0;
    }
    parseDialect(dialect) {
      if (this.cachedDialect && this.cachedDialect.source == dialect)
        return this.cachedDialect;
      let values = Object.keys(this.dialects), flags = values.map(() => false);
      if (dialect)
        for (let part of dialect.split(" ")) {
          let id = values.indexOf(part);
          if (id >= 0)
            flags[id] = true;
        }
      let disabled = null;
      for (let i = 0; i < values.length; i++)
        if (!flags[i]) {
          for (let j = this.dialects[values[i]], id; (id = this.data[j++]) != 65535; )
            (disabled || (disabled = new Uint8Array(this.maxTerm + 1)))[id] = 1;
        }
      return this.cachedDialect = new Dialect(dialect, flags, disabled);
    }
    static deserialize(spec) {
      return new Parser(spec);
    }
  };
  function pair(data, off) {
    return data[off] | data[off + 1] << 16;
  }
  function findOffset(data, start, term) {
    for (let i = start, next2; (next2 = data[i]) != 65535; i++)
      if (next2 == term)
        return i - start;
    return -1;
  }
  function findFinished(stacks) {
    let best = null;
    for (let stack of stacks) {
      if (stack.pos == stack.p.input.length && stack.p.parser.stateFlag(stack.state, 2) && (!best || best.score < stack.score))
        best = stack;
    }
    return best;
  }

  // codemirror/parser.js
  var parser = Parser.deserialize({
    version: 13,
    states: "%pOQOPOOOOOO'#Cl'#ClOlOPO'#CcOzOQO'#CcO!`OSO'#ChOOOO'#Cq'#CqO!nOPO'#CqQOOOOOOOOO-E6j-E6jOzOQO,58}O!vOSO'#CdO!{OPO'#CfO#ZOPO'#CfO#cOPO'#CrOOOO,58},58}O#nOPO'#CxOOOO,59S,59SOOOO,59],59]OOOO1G.i1G.iOOOO,59O,59OO#ZOPO,59QOOOO'#Cm'#CmO#yOPO'#CuO$ROPO,59QO$WOQO'#CnO$oOPO,59^O$zOSO'#CoO%]OPO,59dO%hOPO1G.lOOOO-E6k-E6kOOOO1G.l1G.lOOOO,59Y,59YOOOO-E6l-E6lOOOO,59Z,59ZOOOO-E6m-E6mOOOO7+$W7+$W",
    stateData: "%s~OPROQPOSSOUTO^UO_UOmVPnVP~OPXOQPOmVXnVX~OR]OZZOgYOh[OmfPnfP~OX_O]_OmlPnlP~OmaOnaO~OXcO~OhdOjYXmYXnYX~OjeOkiP~OjhOmfXnfX~OjjOmlXnlX~OjeOkiX~OknO~ORoOZZOgYOh[OjbXmbXnbX~OjhOmfanfa~OXqO]qOjcXmcXncX~OjjOmlanla~OksO~O^UZho~",
    goto: "!umPPPPPPPnqPqPnPPPx!O!V!]P!c!fPP!lPP!rRUOS]RXRohQQORWQSf[dRmfQi]RpiQk_RrkRVOQ^RRbXQg[RldR`S",
    nodeNames: "\u26A0 Opcode Prefix Register Directive Program LabelDefinition InstructionStatement Immediate Expression Memory Relative DirectiveStatement FullString MacroDefinition Comment",
    maxTerm: 33,
    skippedNodes: [0],
    repeatNodeCount: 4,
    tokenData: "#6R~RdYZ!aqr!frs!!tst!#htu!#suv!#xwx#_xy!%Vyz!%t{|!f|}!%y}!O!f!O!P!&O!Q!R5Z!R![3X!]!^!'p!c!}!'u#R#S!'u#T#o!'u#r#s!f~!fOn~U!i[qr!fwx#_xy2l{|!f}!O!f!O!P3X!Q!R5Z!R![3X!c!}7p#R#S7p#T#o7p#r#s!fU#fjXSZQOY#_Zq#_qr%Wru#_uv'lvw*Qwx0pxy#_yz#_z{'l{|'l|}#_}!O'l!O!P#_!P!Q'l!Q!^#_!^!_<d!_!`@z!`!aEX!a#O#_#O#PIx#P#Q#_#Q#R'l#R#p#_#p#qJO#q~#_U%_sXSZQOY#_Zq#_qr%Wru#_uv'lvw*Qwx#_xy,fyz#_z{'l{|'l|}#_}!O'l!O!P.t!P!Q'l!Q!R>x!R![.t![!^#_!^!_<d!_!`Bs!`!aEX!a!c#_!c!}Gm!}#O#_#O#PIx#P#Q#_#Q#R'l#R#SGm#S#T#_#T#oGm#o#p#_#p#qJO#q#r#_#r#s'l#s~#_U'ssXSZQOY#_Zq#_qr%Wru#_uv'lvw*Qwx#_xy,fyz#_z{'l{|'l|}#_}!O'l!O!P.t!P!Q'l!Q!R>x!R![.t![!^#_!^!_<d!_!`@z!`!aEX!a!c#_!c!}Gm!}#O#_#O#PIx#P#Q#_#Q#R'l#R#SGm#S#T#_#T#oGm#o#p#_#p#qJO#q#r#_#r#s'l#s~#_U*XsXSZQOY#_Zq#_qr%Wru#_uv'lvw*Qwx#_xy,fyz#_z{'l{|'l|}#_}!O'l!O!P.t!P!Q'l!Q!R>x!R![.t![!^#_!^!_<d!_!`@z!`!aEX!a!c#_!c!}Gm!}#O#_#O#PIx#P#Q#_#Q#R'l#R#SGm#S#T#_#T#oGm#o#p#_#p#qJO#q#r#_#r#s'l#s~#_U,mqXSZQOY#_Zq#_qr%Wru#_uv'lvw*Qwx#_xy,fyz#_z{'l{|'l|}#_}!O'l!O!P.t!P!Q'l!Q!R>x!R![.t![!^#_!^!_<d!_!`@z!`!aEX!a!c#_!c!}Gm!}#O#_#O#PIx#P#Q#_#Q#R'l#R#SGm#S#T#_#T#oGm#o#p#_#p#qJO#q~#_U.{kXSZQOY#_Zq#_qr%Wru#_uv'lvw*Qwx0pxy#_yz#_z{'l{|'l|}#_}!O'l!O!P.t!P!Q'l!Q![.t![!^#_!^!_<d!_!`@z!`!aEX!a#O#_#O#PIx#P#Q#_#Q#R'l#R#p#_#p#qJO#q~#_U0w]XSZQqr1puv!fvw4_yz6dz{!f{|!f}!O!f!P!Q!f!^!_6n!_!`8|!`!a9S#Q#R!f#p#q:RU1s]qr!fwx#_xy2l{|!f}!O!f!O!P3X!Q!R5Z!R![3X!_!`!f!c!}7p#R#S7p#T#o7p#r#s!fU2oWwx#_xy2l!O!P3X!Q!R5Z!R![3X!c!}7p#R#S7p#T#o7pU3`_XSZQqr1puv!fvw4_yz6dz{!f{|!f}!O!f!O!P3X!P!Q!f!Q![3X!^!_6n!_!`8|!`!a9S#Q#R!f#p#q:RU4b]qr!fvw!fwx#_xy2l{|!f}!O!f!O!P3X!Q!R5Z!R![3X!c!}7p#R#S7p#T#o7p#r#s!fU5b`XSZQqr1puv!fvw4_yz6dz{!f{|!f}!O!f!O!P3X!P!Q!f!Q![3X!^!_6n!_!`8|!`!a9S#Q#R!f#l#m:}#p#q:RU6kPXSZQyz6dU6q_qr!fwx#_xy2l{|!f}!O!f!O!P3X!Q!R5Z!R![3X!^!_!f!_!`!f!`!a!f!c!}7p#R#S7p#T#o7p#r#s!fU7waXSZQqr1puv!fvw4_yz6dz{!f{|!f}!O!f!P!Q!f!Q![7p!^!_6n!_!`8|!`!a9S!c!}7p#Q#R!f#R#S7p#T#o7p#p#q:RU9PP!_!`!fU9V^qr!fwx#_xy2l{|!f}!O!f!O!P3X!Q!R5Z!R![3X!_!`!f!`!a!f!c!}7p#R#S7p#T#o7p#r#s!fU:U]qr!fwx#_xy2l{|!f}!O!f!O!P3X!Q!R5Z!R![3X!c!}7p#R#S7p#T#o7p#p#q!f#r#s!fU;QR!Q![;Z!c!i;Z#T#Z;ZU;b`XSZQqr1puv!fvw4_yz6dz{!f{|!f}!O!f!P!Q!f!Q![;Z!^!_6n!_!`8|!`!a9S!c!i;Z#Q#R!f#T#Z;Z#p#q:RU<ksXSZQOY#_Zq#_qr%Wru#_uv'lvw*Qwx#_xy,fyz#_z{'l{|'l|}#_}!O'l!O!P.t!P!Q'l!Q!R>x!R![.t![!^#_!^!_<d!_!`Bs!`!aEX!a!c#_!c!}Gm!}#O#_#O#PIx#P#Q#_#Q#R'l#R#SGm#S#T#_#T#oGm#o#p#_#p#qJO#q#r#_#r#s'l#s~#_U?PmXSZQOY#_Zq#_qr%Wru#_uv'lvw*Qwx0pxy#_yz#_z{'l{|'l|}#_}!O'l!O!P.t!P!Q'l!Q![.t![!^#_!^!_<d!_!`@z!`!aEX!a#O#_#O#PIx#P#Q#_#Q#R'l#R#l#_#l#mLd#m#p#_#p#qJO#q~#_UARjXSZQOY#_Zq#_qr%Wru#_uv'lvw*Qwx0pxy#_yz#_z{'l{|'l|}#_}!O'l!O!P#_!P!Q'l!Q!^#_!^!_<d!_!`Bs!`!aEX!a#O#_#O#PIx#P#Q#_#Q#R'l#R#p#_#p#qJO#q~#_UBzsXSZQOY#_Zq#_qr%Wru#_uv'lvw*Qwx#_xy,fyz#_z{'l{|'l|}#_}!O'l!O!P.t!P!Q'l!Q!R>x!R![.t![!^#_!^!_<d!_!`Bs!`!aEX!a!c#_!c!}Gm!}#O#_#O#PIx#P#Q#_#Q#R'l#R#SGm#S#T#_#T#oGm#o#p#_#p#qJO#q#r#_#r#s'l#s~#_UE`sXSZQOY#_Zq#_qr%Wru#_uv'lvw*Qwx#_xy,fyz#_z{'l{|'l|}#_}!O'l!O!P.t!P!Q'l!Q!R>x!R![.t![!^#_!^!_<d!_!`Bs!`!aEX!a!c#_!c!}Gm!}#O#_#O#PIx#P#Q#_#Q#R'l#R#SGm#S#T#_#T#oGm#o#p#_#p#qJO#q#r#_#r#s'l#s~#_UGtpXSZQOY#_Zq#_qr%Wru#_uv'lvw*Qwx0pxy#_yz#_z{'l{|'l|}#_}!O'l!O!P#_!P!Q'l!Q![Gm![!^#_!^!_<d!_!`@z!`!aEX!a!c#_!c!}Gm!}#O#_#O#PIx#P#Q#_#Q#R'l#R#SGm#S#T#_#T#oGm#o#p#_#p#qJO#q~#_UI{PO~#_UJVsXSZQOY#_Zq#_qr%Wru#_uv'lvw*Qwx#_xy,fyz#_z{'l{|'l|}#_}!O'l!O!P.t!P!Q'l!Q!R>x!R![.t![!^#_!^!_<d!_!`@z!`!aEX!a!c#_!c!}Gm!}#O#_#O#PIx#P#Q#_#Q#R'l#R#SGm#S#T#_#T#oGm#o#p#_#p#qJO#q#r#_#r#s'l#s~#_ULkoXSZQOY#_Zq#_qr%Wru#_uv'lvw*Qwx0pxy#_yz#_z{'l{|'l|}#_}!O'l!O!P#_!P!Q'l!Q![Nl![!^#_!^!_<d!_!`@z!`!aEX!a!c#_!c!iNl!i#O#_#O#PIx#P#Q#_#Q#R'l#R#T#_#T#ZNl#Z#p#_#p#qJO#q~#_UNsoXSZQOY#_Zq#_qr%Wru#_uv'lvw*Qwx0pxy#_yz#_z{'l{|'l|}#_}!O'l!O!P#_!P!Q'l!Q![Nl![!^#_!^!_<d!_!`@z!`!aEX!a!c#_!c!iNl!i#O#_#O#PIx#P#Q#_#Q#R'l#R#T#_#T#ZNl#Z#p#_#p#qJO#q~#_~!!yU]~OY!!tZr!!trs!#]s#O!!t#O#P!#b#P~!!t~!#bO]~~!#ePO~!!t~!#mQ_~OY!#hZ~!#h~!#xOg~~!#{]X^!#xpq!#x!c!}!$t#R#S!$t#T#o!$t#y#z!#x$f$g!#x#BY#BZ!#x$IS$I_!#x$I|$JO!#x$JT$JU!#x$KV$KW!#x&FU&FV!#x~!$ySp~!Q![!$t!c!}!$t#R#S!$t#T#o!$tV!%[WhRwx#_xy2l!O!P3X!Q!R5Z!R![3X!c!}7p#R#S7p#T#o7p~!%yOk~~!&OOj~V!&VbXSZQqr1puv!fvw4_yz6dz{!f{|!f}!O!f!O!P3X!P!Q!f!Q![3X!^!_6n!_!`8|!`!a9S!c!}!'_#Q#R!f#R#S!'_#T#o!'_#p#q:RP!'dSqP!Q![!'_!c!}!'_#R#S!'_#T#o!'_~!'uOm~V!(OlXSZQoPX^!)vpq!)vqr1puv!fvw4_yz6dz{!f{|!f}!O!f!P!Q!f!Q![!'u![!]!*o!^!_6n!_!`!+P!`!a9S!c!}!'u#Q#R!f#R#S!'u#T#o!'u#p#q:R#y#z!)v$f$g!)v#BY#BZ!)v$IS$I_!)v$I|$JO!)v$JT$JU!)v$KV$KW!)v&FU&FV!)vP!)y[X^!)vpq!)v![!]!*o!_!`!*t#y#z!)v$f$g!)v#BY#BZ!)v$IS$I_!)v$I|$JO!)v$JT$JU!)v$KV$KW!)v&FU&FV!)vP!*tOUPP!*yQ^POY!*tZ~!*tV!+US^POY!*tZ!_!*t!_!`!+b!`~!*tV!+gg^POY!*tZq!*tqr!+brw!*twx!-Oxy!>Ry{!*t{|!+b|}!*t}!O!+b!O!P!?Y!P!Q!*t!Q!R!Bn!R![!?Y![!c!*t!c!}!Fx!}#R!*t#R#S!Fx#S#T!*t#T#o!Fx#o#r!*t#r#s!+b#s~!*tV!-XjXS^PZQOY!-OZq!-Oqr!.yru!-Ouv!1avw!3wwx!:mxy!-Oyz!-Oz{!1a{|!1a|}!-O}!O!1a!O!P!-O!P!Q!1a!Q!^!-O!^!_# V!_!`#%q!`!a#*S!a#O!-O#O#P#.w#P#Q!-O#Q#R!1a#R#p!-O#p#q#/V#q~!-OV!/SsXS^PZQOY!-OZq!-Oqr!.yru!-Ouv!1avw!3wwx!-Oxy!6_yz!-Oz{!1a{|!1a|}!-O}!O!1a!O!P!8o!P!Q!1a!Q!R##m!R![!8o![!^!-O!^!_# V!_!`#'l!`!a#*S!a!c!-O!c!}#,j!}#O!-O#O#P#.w#P#Q!-O#Q#R!1a#R#S#,j#S#T!-O#T#o#,j#o#p!-O#p#q#/V#q#r!-O#r#s!1a#s~!-OV!1jsXS^PZQOY!-OZq!-Oqr!.yru!-Ouv!1avw!3wwx!-Oxy!6_yz!-Oz{!1a{|!1a|}!-O}!O!1a!O!P!8o!P!Q!1a!Q!R##m!R![!8o![!^!-O!^!_# V!_!`#%q!`!a#*S!a!c!-O!c!}#,j!}#O!-O#O#P#.w#P#Q!-O#Q#R!1a#R#S#,j#S#T!-O#T#o#,j#o#p!-O#p#q#/V#q#r!-O#r#s!1a#s~!-OV!4QsXS^PZQOY!-OZq!-Oqr!.yru!-Ouv!1avw!3wwx!-Oxy!6_yz!-Oz{!1a{|!1a|}!-O}!O!1a!O!P!8o!P!Q!1a!Q!R##m!R![!8o![!^!-O!^!_# V!_!`#%q!`!a#*S!a!c!-O!c!}#,j!}#O!-O#O#P#.w#P#Q!-O#Q#R!1a#R#S#,j#S#T!-O#T#o#,j#o#p!-O#p#q#/V#q#r!-O#r#s!1a#s~!-OV!6hqXS^PZQOY!-OZq!-Oqr!.yru!-Ouv!1avw!3wwx!-Oxy!6_yz!-Oz{!1a{|!1a|}!-O}!O!1a!O!P!8o!P!Q!1a!Q!R##m!R![!8o![!^!-O!^!_# V!_!`#%q!`!a#*S!a!c!-O!c!}#,j!}#O!-O#O#P#.w#P#Q!-O#Q#R!1a#R#S#,j#S#T!-O#T#o#,j#o#p!-O#p#q#/V#q~!-OV!8xkXS^PZQOY!-OZq!-Oqr!.yru!-Ouv!1avw!3wwx!:mxy!-Oyz!-Oz{!1a{|!1a|}!-O}!O!1a!O!P!8o!P!Q!1a!Q![!8o![!^!-O!^!_# V!_!`#%q!`!a#*S!a#O!-O#O#P#.w#P#Q!-O#Q#R!1a#R#p!-O#p#q#/V#q~!-OV!:vgXS^PZQOY!*tZq!*tqr!<_ru!*tuv!+bvw!@}wy!*tyz!Diz{!+b{|!+b|}!*t}!O!+b!O!P!*t!P!Q!+b!Q!^!*t!^!_!EO!_!`!+P!`!a!H|!a#Q!*t#Q#R!+b#R#p!*t#p#q!Js#q~!*tV!<di^POY!*tZq!*tqr!+brw!*twx!-Oxy!>Ry{!*t{|!+b|}!*t}!O!+b!O!P!?Y!P!Q!*t!Q!R!Bn!R![!?Y![!_!*t!_!`!+b!`!c!*t!c!}!Fx!}#R!*t#R#S!Fx#S#T!*t#T#o!Fx#o#r!*t#r#s!+b#s~!*tV!>W`^POY!*tZw!*twx!-Oxy!>Ry!O!*t!O!P!?Y!P!Q!*t!Q!R!Bn!R![!?Y![!c!*t!c!}!Fx!}#R!*t#R#S!Fx#S#T!*t#T#o!Fx#o~!*tV!?chXS^PZQOY!*tZq!*tqr!<_ru!*tuv!+bvw!@}wy!*tyz!Diz{!+b{|!+b|}!*t}!O!+b!O!P!?Y!P!Q!+b!Q![!?Y![!^!*t!^!_!EO!_!`!+P!`!a!H|!a#Q!*t#Q#R!+b#R#p!*t#p#q!Js#q~!*tV!ASh^POY!*tZq!*tqr!+brv!*tvw!+bwx!-Oxy!>Ry{!*t{|!+b|}!*t}!O!+b!O!P!?Y!P!Q!*t!Q!R!Bn!R![!?Y![!c!*t!c!}!Fx!}#R!*t#R#S!Fx#S#T!*t#T#o!Fx#o#r!*t#r#s!+b#s~!*tV!BwjXS^PZQOY!*tZq!*tqr!<_ru!*tuv!+bvw!@}wy!*tyz!Diz{!+b{|!+b|}!*t}!O!+b!O!P!?Y!P!Q!+b!Q![!?Y![!^!*t!^!_!EO!_!`!+P!`!a!H|!a#Q!*t#Q#R!+b#R#l!*t#l#m!Lg#m#p!*t#p#q!Js#q~!*tV!DrSXS^PZQOY!*tZy!*tyz!Diz~!*tV!ETk^POY!*tZq!*tqr!+brw!*twx!-Oxy!>Ry{!*t{|!+b|}!*t}!O!+b!O!P!?Y!P!Q!*t!Q!R!Bn!R![!?Y![!^!*t!^!_!+b!_!`!+b!`!a!+b!a!c!*t!c!}!Fx!}#R!*t#R#S!Fx#S#T!*t#T#o!Fx#o#r!*t#r#s!+b#s~!*tV!GRmXS^PZQOY!*tZq!*tqr!<_ru!*tuv!+bvw!@}wy!*tyz!Diz{!+b{|!+b|}!*t}!O!+b!O!P!*t!P!Q!+b!Q![!Fx![!^!*t!^!_!EO!_!`!+P!`!a!H|!a!c!*t!c!}!Fx!}#Q!*t#Q#R!+b#R#S!Fx#S#T!*t#T#o!Fx#o#p!*t#p#q!Js#q~!*tV!IRj^POY!*tZq!*tqr!+brw!*twx!-Oxy!>Ry{!*t{|!+b|}!*t}!O!+b!O!P!?Y!P!Q!*t!Q!R!Bn!R![!?Y![!_!*t!_!`!+b!`!a!+b!a!c!*t!c!}!Fx!}#R!*t#R#S!Fx#S#T!*t#T#o!Fx#o#r!*t#r#s!+b#s~!*tV!Jxi^POY!*tZq!*tqr!+brw!*twx!-Oxy!>Ry{!*t{|!+b|}!*t}!O!+b!O!P!?Y!P!Q!*t!Q!R!Bn!R![!?Y![!c!*t!c!}!Fx!}#R!*t#R#S!Fx#S#T!*t#T#o!Fx#o#p!*t#p#q!+b#q#r!*t#r#s!+b#s~!*tV!LlW^POY!*tZ!Q!*t!Q![!MU![!c!*t!c!i!MU!i#T!*t#T#Z!MU#Z~!*tV!M_lXS^PZQOY!*tZq!*tqr!<_ru!*tuv!+bvw!@}wy!*tyz!Diz{!+b{|!+b|}!*t}!O!+b!O!P!*t!P!Q!+b!Q![!MU![!^!*t!^!_!EO!_!`!+P!`!a!H|!a!c!*t!c!i!MU!i#Q!*t#Q#R!+b#R#T!*t#T#Z!MU#Z#p!*t#p#q!Js#q~!*tV# `sXS^PZQOY!-OZq!-Oqr!.yru!-Ouv!1avw!3wwx!-Oxy!6_yz!-Oz{!1a{|!1a|}!-O}!O!1a!O!P!8o!P!Q!1a!Q!R##m!R![!8o![!^!-O!^!_# V!_!`#'l!`!a#*S!a!c!-O!c!}#,j!}#O!-O#O#P#.w#P#Q!-O#Q#R!1a#R#S#,j#S#T!-O#T#o#,j#o#p!-O#p#q#/V#q#r!-O#r#s!1a#s~!-OV##vmXS^PZQOY!-OZq!-Oqr!.yru!-Ouv!1avw!3wwx!:mxy!-Oyz!-Oz{!1a{|!1a|}!-O}!O!1a!O!P!8o!P!Q!1a!Q![!8o![!^!-O!^!_# V!_!`#%q!`!a#*S!a#O!-O#O#P#.w#P#Q!-O#Q#R!1a#R#l!-O#l#m#1m#m#p!-O#p#q#/V#q~!-OV#%zjXS^PZQOY!-OZq!-Oqr!.yru!-Ouv!1avw!3wwx!:mxy!-Oyz!-Oz{!1a{|!1a|}!-O}!O!1a!O!P!-O!P!Q!1a!Q!^!-O!^!_# V!_!`#'l!`!a#*S!a#O!-O#O#P#.w#P#Q!-O#Q#R!1a#R#p!-O#p#q#/V#q~!-OV#'usXS^PZQOY!-OZq!-Oqr!.yru!-Ouv!1avw!3wwx!-Oxy!6_yz!-Oz{!1a{|!1a|}!-O}!O!1a!O!P!8o!P!Q!1a!Q!R##m!R![!8o![!^!-O!^!_# V!_!`#'l!`!a#*S!a!c!-O!c!}#,j!}#O!-O#O#P#.w#P#Q!-O#Q#R!1a#R#S#,j#S#T!-O#T#o#,j#o#p!-O#p#q#/V#q#r!-O#r#s!1a#s~!-OV#*]sXS^PZQOY!-OZq!-Oqr!.yru!-Ouv!1avw!3wwx!-Oxy!6_yz!-Oz{!1a{|!1a|}!-O}!O!1a!O!P!8o!P!Q!1a!Q!R##m!R![!8o![!^!-O!^!_# V!_!`#'l!`!a#*S!a!c!-O!c!}#,j!}#O!-O#O#P#.w#P#Q!-O#Q#R!1a#R#S#,j#S#T!-O#T#o#,j#o#p!-O#p#q#/V#q#r!-O#r#s!1a#s~!-OV#,spXS^PZQOY!-OZq!-Oqr!.yru!-Ouv!1avw!3wwx!:mxy!-Oyz!-Oz{!1a{|!1a|}!-O}!O!1a!O!P!-O!P!Q!1a!Q![#,j![!^!-O!^!_# V!_!`#%q!`!a#*S!a!c!-O!c!}#,j!}#O!-O#O#P#.w#P#Q!-O#Q#R!1a#R#S#,j#S#T!-O#T#o#,j#o#p!-O#p#q#/V#q~!-OV#.|R^POY!-OYZ#_Z~!-OV#/`sXS^PZQOY!-OZq!-Oqr!.yru!-Ouv!1avw!3wwx!-Oxy!6_yz!-Oz{!1a{|!1a|}!-O}!O!1a!O!P!8o!P!Q!1a!Q!R##m!R![!8o![!^!-O!^!_# V!_!`#%q!`!a#*S!a!c!-O!c!}#,j!}#O!-O#O#P#.w#P#Q!-O#Q#R!1a#R#S#,j#S#T!-O#T#o#,j#o#p!-O#p#q#/V#q#r!-O#r#s!1a#s~!-OV#1voXS^PZQOY!-OZq!-Oqr!.yru!-Ouv!1avw!3wwx!:mxy!-Oyz!-Oz{!1a{|!1a|}!-O}!O!1a!O!P!-O!P!Q!1a!Q![#3w![!^!-O!^!_# V!_!`#%q!`!a#*S!a!c!-O!c!i#3w!i#O!-O#O#P#.w#P#Q!-O#Q#R!1a#R#T!-O#T#Z#3w#Z#p!-O#p#q#/V#q~!-OV#4QoXS^PZQOY!-OZq!-Oqr!.yru!-Ouv!1avw!3wwx!:mxy!-Oyz!-Oz{!1a{|!1a|}!-O}!O!1a!O!P!-O!P!Q!1a!Q![#3w![!^!-O!^!_# V!_!`#%q!`!a#*S!a!c!-O!c!i#3w!i#O!-O#O#P#.w#P#Q!-O#Q#R!1a#R#T!-O#T#Z#3w#Z#p!-O#p#q#/V#q~!-O",
    tokenizers: [0, 1, 2],
    topRules: {Program: [0, 5]},
    specialized: [{term: 31, get: (value, stack) => isOpcode(value, stack) << 1}, {term: 32, get: (value, stack) => isRegister(value, stack) << 1}, {term: 33, get: (value, stack) => isDirective(value, stack) << 1}],
    tokenPrec: 213
  });

  // codemirror/assembly.js
  var assemblyLang = LezerLanguage.define({
    parser: parser.configure({
      props: [
        styleTags({
          Opcode: tags.operatorKeyword,
          Prefix: tags.keyword,
          Register: tags.className,
          Directive: tags.meta,
          Comment: tags.lineComment,
          LabelDefinition: tags.definition(tags.labelName),
          MacroDefinition: tags.definition(tags.macroName),
          Immediate: tags.literal,
          Memory: tags.regexp,
          Relative: tags.regexp,
          Expression: tags.literal,
          FullString: tags.string,
          CharString: tags.string
        })
      ]
    })
  });
  var asmTheme = EditorView.baseTheme({
    ".cm-asm-dump": {
      fontStyle: "italic",
      color: "#666"
    },
    ".cm-asm-error": {
      textDecoration: "underline red"
    },
    ".cm-asm-error-tooltip": {
      fontFamily: "monospace",
      color: "#eee",
      backgroundColor: "black",
      borderRadius: ".25em",
      padding: ".1em .25em",
      "&:before": {
        position: "absolute",
        content: '""',
        left: ".3em",
        marginLeft: "-.1em",
        bottom: "-.3em",
        borderLeft: ".3em solid transparent",
        borderRight: ".3em solid transparent",
        borderTop: ".3em solid black"
      }
    }
  });
  function assembly() {
    return new LanguageSupport(assemblyLang, [asmPlugin, asmTheme, asmHover]);
  }

  // gh-pages/editor.js
  var byteCount = document.getElementById("byteCount");
  var editor = new EditorView({
    dispatch: (tr) => {
      document.cookie = "code=" + encodeURIComponent(tr.newDoc.sliceString(0));
      let result = editor.update([tr]);
      byteCount.innerText = `${editor["asm-bytes"]} byte${editor["asm-bytes"] != 1 ? "s" : ""}`;
      return result;
    },
    parent: document.getElementById("inputAreaContainer"),
    state: EditorState.create({
      doc: getLastCode(),
      extensions: [
        defaultHighlightStyle,
        closeBrackets(),
        history(),
        keymap.of([...closeBracketsKeymap, ...historyKeymap, defaultTabBinding, ...standardKeymap]),
        lineNumbers(),
        assembly()
      ]
    })
  });
  editor.contentDOM.setAttribute("data-gramm", "false");
  function getLastCode() {
    let prevCode = document.cookie.split("; ").find((row) => row.startsWith("code="));
    if (prevCode)
      prevCode = decodeURIComponent(prevCode.slice(5));
    return prevCode || `# Printing
mov $1, %eax    # Syscall code 1 (write)
mov $1, %edi    # File descriptor 1 (stdout)
mov $text, %rsi # Address of buffer
mov $14, %edx   # Length of buffer
syscall

# Looping
mov $10, %bl
numberLoop:
    mov $1, %eax
    mov $1, %edi
    mov $digit, %rsi
    mov $2, %edx
    syscall

    incb (%rsi)
    dec %bl
    jnz numberLoop

# Accessing arguments
pop %rbx
pop %rax

argLoop:
    dec %rbx
    jz endArgLoop

    pop %rsi
    mov %rsi, %rdi

    mov $-1, %ecx
    xor %al, %al
    repnz scasb

    not %ecx
    movb $'\\n', -1(%rsi, %rcx)

    mov %ecx, %edx
    mov $1, %eax
    mov $1, %edi
    syscall

    jmp argLoop
endArgLoop:

mov $60, %eax   # Syscall code 60 (exit)
mov $0, %edi    # Exit code
syscall

text:  .string "Hello, World!\\n"
digit: .byte   '0', '\\n'`;
  }
})();
//# sourceMappingURL=editor.js.map
