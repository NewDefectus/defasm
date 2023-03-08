(() => {
  // node_modules/@codemirror/state/dist/index.js
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
      let start = this.scanIdentical(other, 1), end = this.length - this.scanIdentical(other, -1);
      let a = new RawTextCursor(this), b = new RawTextCursor(other);
      for (let skip = start, pos = start; ; ) {
        a.next(skip);
        b.next(skip);
        skip = 0;
        if (a.lineBreak != b.lineBreak || a.done != b.done || a.value != b.value)
          return false;
        pos += a.value.length;
        if (a.done || pos >= end)
          return true;
      }
    }
    iter(dir = 1) {
      return new RawTextCursor(this, dir);
    }
    iterRange(from, to = this.length) {
      return new PartialTextCursor(this, from, to);
    }
    iterLines(from, to) {
      let inner;
      if (from == null) {
        inner = this.iter();
      } else {
        if (to == null)
          to = this.lines + 1;
        let start = this.line(from).from;
        inner = this.iterRange(start, Math.max(start, to == this.lines + 1 ? this.length : to <= 1 ? 0 : this.line(to - 1).to));
      }
      return new LineCursor(inner);
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
    lineInner(target, isLine, line2, offset) {
      for (let i = 0; ; i++) {
        let string2 = this.text[i], end = offset + string2.length;
        if ((isLine ? line2 : end) >= target)
          return new Line(offset, end, line2, string2);
        offset = end + 1;
        line2++;
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
        let line2 = this.text[i], end = pos + line2.length;
        if (pos > from && i)
          result += lineSep;
        if (from < end && to > pos)
          result += line2.slice(Math.max(0, from - pos), to - pos);
        pos = end + 1;
      }
      return result;
    }
    flatten(target) {
      for (let line2 of this.text)
        target.push(line2);
    }
    scanIdentical() {
      return 0;
    }
    static split(text, target) {
      let part = [], len = -1;
      for (let line2 of text) {
        part.push(line2);
        len += line2.length + 1;
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
    lineInner(target, isLine, line2, offset) {
      for (let i = 0; ; i++) {
        let child = this.children[i], end = offset + child.length, endLine = line2 + child.lines - 1;
        if ((isLine ? endLine : end) >= target)
          return child.lineInner(target, isLine, line2, offset);
        offset = end + 1;
        line2 = endLine + 1;
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
    scanIdentical(other, dir) {
      if (!(other instanceof TextNode))
        return 0;
      let length = 0;
      let [iA, iB, eA, eB] = dir > 0 ? [0, 0, this.children.length, other.children.length] : [this.children.length - 1, other.children.length - 1, -1, -1];
      for (; ; iA += dir, iB += dir) {
        if (iA == eA || iB == eB)
          return length;
        let chA = this.children[iA], chB = other.children[iB];
        if (chA != chB)
          return length + chA.scanIdentical(chB, dir);
        length += chA.length + 1;
      }
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
  Text.empty = /* @__PURE__ */ new TextLeaf([""], 0);
  function textLength(text) {
    let length = -1;
    for (let line2 of text)
      length += line2.length + 1;
    return length;
  }
  function appendText(text, target, from = 0, to = 1e9) {
    for (let pos = 0, i = 0, first = true; i < text.length && pos <= to; i++) {
      let line2 = text[i], end = pos + line2.length;
      if (end >= from) {
        if (end > to)
          line2 = line2.slice(0, to - pos);
        if (pos < from)
          line2 = line2.slice(from - pos);
        if (first) {
          target[target.length - 1] += line2;
          first = false;
        } else
          target.push(line2);
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
      this.offsets = [dir > 0 ? 1 : (text instanceof TextLeaf ? text.text.length : text.children.length) << 1];
    }
    nextInner(skip, dir) {
      this.done = this.lineBreak = false;
      for (; ; ) {
        let last = this.nodes.length - 1;
        let top2 = this.nodes[last], offsetValue = this.offsets[last], offset = offsetValue >> 1;
        let size = top2 instanceof TextLeaf ? top2.text.length : top2.children.length;
        if (offset == (dir > 0 ? size : 0)) {
          if (last == 0) {
            this.done = true;
            this.value = "";
            return this;
          }
          if (dir > 0)
            this.offsets[last - 1]++;
          this.nodes.pop();
          this.offsets.pop();
        } else if ((offsetValue & 1) == (dir > 0 ? 0 : 1)) {
          this.offsets[last] += dir;
          if (skip == 0) {
            this.lineBreak = true;
            this.value = "\n";
            return this;
          }
          skip--;
        } else if (top2 instanceof TextLeaf) {
          let next3 = top2.text[offset + (dir < 0 ? -1 : 0)];
          this.offsets[last] += dir;
          if (next3.length > Math.max(0, skip)) {
            this.value = skip == 0 ? next3 : dir > 0 ? next3.slice(skip) : next3.slice(0, next3.length - skip);
            return this;
          }
          skip -= next3.length;
        } else {
          let next3 = top2.children[offset + (dir < 0 ? -1 : 0)];
          if (skip > next3.length) {
            skip -= next3.length;
            this.offsets[last] += dir;
          } else {
            if (dir < 0)
              this.offsets[last]--;
            this.nodes.push(next3);
            this.offsets.push(dir > 0 ? 1 : (next3 instanceof TextLeaf ? next3.text.length : next3.children.length) << 1);
          }
        }
      }
    }
    next(skip = 0) {
      if (skip < 0) {
        this.nextInner(-skip, -this.dir);
        skip = this.value.length;
      }
      return this.nextInner(skip, this.dir);
    }
  };
  var PartialTextCursor = class {
    constructor(text, start, end) {
      this.value = "";
      this.done = false;
      this.cursor = new RawTextCursor(text, start > end ? -1 : 1);
      this.pos = start > end ? text.length : 0;
      this.from = Math.min(start, end);
      this.to = Math.max(start, end);
    }
    nextInner(skip, dir) {
      if (dir < 0 ? this.pos <= this.from : this.pos >= this.to) {
        this.value = "";
        this.done = true;
        return this;
      }
      skip += Math.max(0, dir < 0 ? this.pos - this.to : this.from - this.pos);
      let limit = dir < 0 ? this.pos - this.from : this.to - this.pos;
      if (skip > limit)
        skip = limit;
      limit -= skip;
      let { value } = this.cursor.next(skip);
      this.pos += (value.length + skip) * dir;
      this.value = value.length <= limit ? value : dir < 0 ? value.slice(value.length - limit) : value.slice(0, limit);
      this.done = !this.value;
      return this;
    }
    next(skip = 0) {
      if (skip < 0)
        skip = Math.max(skip, this.from - this.pos);
      else if (skip > 0)
        skip = Math.min(skip, this.to - this.pos);
      return this.nextInner(skip, this.cursor.dir);
    }
    get lineBreak() {
      return this.cursor.lineBreak && this.value != "";
    }
  };
  var LineCursor = class {
    constructor(inner) {
      this.inner = inner;
      this.afterBreak = true;
      this.value = "";
      this.done = false;
    }
    next(skip = 0) {
      let { done, lineBreak, value } = this.inner.next(skip);
      if (done) {
        this.done = true;
        this.value = "";
      } else if (lineBreak) {
        if (this.afterBreak) {
          this.value = "";
        } else {
          this.afterBreak = true;
          this.next();
        }
      } else {
        this.value = value;
        this.afterBreak = false;
      }
      return this;
    }
    get lineBreak() {
      return false;
    }
  };
  if (typeof Symbol != "undefined") {
    Text.prototype[Symbol.iterator] = function() {
      return this.iter();
    };
    RawTextCursor.prototype[Symbol.iterator] = PartialTextCursor.prototype[Symbol.iterator] = LineCursor.prototype[Symbol.iterator] = function() {
      return this;
    };
  }
  var Line = class {
    constructor(from, to, number3, text) {
      this.from = from;
      this.to = to;
      this.number = number3;
      this.text = text;
    }
    get length() {
      return this.to - this.from;
    }
  };
  var extend = /* @__PURE__ */ "lc,34,7n,7,7b,19,,,,2,,2,,,20,b,1c,l,g,,2t,7,2,6,2,2,,4,z,,u,r,2j,b,1m,9,9,,o,4,,9,,3,,5,17,3,3b,f,,w,1j,,,,4,8,4,,3,7,a,2,t,,1m,,,,2,4,8,,9,,a,2,q,,2,2,1l,,4,2,4,2,2,3,3,,u,2,3,,b,2,1l,,4,5,,2,4,,k,2,m,6,,,1m,,,2,,4,8,,7,3,a,2,u,,1n,,,,c,,9,,14,,3,,1l,3,5,3,,4,7,2,b,2,t,,1m,,2,,2,,3,,5,2,7,2,b,2,s,2,1l,2,,,2,4,8,,9,,a,2,t,,20,,4,,2,3,,,8,,29,,2,7,c,8,2q,,2,9,b,6,22,2,r,,,,,,1j,e,,5,,2,5,b,,10,9,,2u,4,,6,,2,2,2,p,2,4,3,g,4,d,,2,2,6,,f,,jj,3,qa,3,t,3,t,2,u,2,1s,2,,7,8,,2,b,9,,19,3,3b,2,y,,3a,3,4,2,9,,6,3,63,2,2,,1m,,,7,,,,,2,8,6,a,2,,1c,h,1r,4,1c,7,,,5,,14,9,c,2,w,4,2,2,,3,1k,,,2,3,,,3,1m,8,2,2,48,3,,d,,7,4,,6,,3,2,5i,1m,,5,ek,,5f,x,2da,3,3x,,2o,w,fe,6,2x,2,n9w,4,,a,w,2,28,2,7k,,3,,4,,p,2,5,,47,2,q,i,d,,12,8,p,b,1a,3,1c,,2,4,2,2,13,,1v,6,2,2,2,2,c,,8,,1b,,1f,,,3,2,2,5,2,,,16,2,8,,6m,,2,,4,,fn4,,kh,g,g,g,a6,2,gt,,6a,,45,5,1ae,3,,2,5,4,14,3,4,,4l,2,fx,4,ar,2,49,b,4w,,1i,f,1k,3,1d,4,2,2,1x,3,10,5,,8,1q,,c,2,1g,9,a,4,2,,2n,3,2,,,2,6,,4g,,3,8,l,2,1l,2,,,,,m,,e,7,3,5,5f,8,2,3,,,n,,29,,2,6,,,2,,,2,,2,6j,,2,4,6,2,,2,r,2,2d,8,2,,,2,2y,,,,2,6,,,2t,3,2,4,,5,77,9,,2,6t,,a,2,,,4,,40,4,2,2,4,,w,a,14,6,2,4,8,,9,6,2,3,1a,d,,2,ba,7,,6,,,2a,m,2,7,,2,,2,3e,6,3,,,2,,7,,,20,2,3,,,,9n,2,f0b,5,1n,7,t4,,1r,4,29,,f5k,2,43q,,,3,4,5,8,8,2,7,u,4,44,3,1iz,1j,4,1e,8,,e,,m,5,,f,11s,7,,h,2,7,,2,,5,79,7,c5,4,15s,7,31,7,240,5,gx7k,2o,3k,6o".split(",").map((s) => s ? parseInt(s, 36) : 1);
  for (let i = 1; i < extend.length; i++)
    extend[i] += extend[i - 1];
  function isExtendingChar(code2) {
    for (let i = 1; i < extend.length; i += 2)
      if (extend[i] > code2)
        return extend[i - 1] <= code2;
    return false;
  }
  function isRegionalIndicator(code2) {
    return code2 >= 127462 && code2 <= 127487;
  }
  var ZWJ = 8205;
  function findClusterBreak(str, pos, forward = true, includeExtending = true) {
    return (forward ? nextClusterBreak : prevClusterBreak)(str, pos, includeExtending);
  }
  function nextClusterBreak(str, pos, includeExtending) {
    if (pos == str.length)
      return pos;
    if (pos && surrogateLow(str.charCodeAt(pos)) && surrogateHigh(str.charCodeAt(pos - 1)))
      pos--;
    let prev = codePointAt(str, pos);
    pos += codePointSize(prev);
    while (pos < str.length) {
      let next3 = codePointAt(str, pos);
      if (prev == ZWJ || next3 == ZWJ || includeExtending && isExtendingChar(next3)) {
        pos += codePointSize(next3);
        prev = next3;
      } else if (isRegionalIndicator(next3)) {
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
  function prevClusterBreak(str, pos, includeExtending) {
    while (pos > 0) {
      let found = nextClusterBreak(str, pos - 2, includeExtending);
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
  function fromCodePoint(code2) {
    if (code2 <= 65535)
      return String.fromCharCode(code2);
    code2 -= 65536;
    return String.fromCharCode((code2 >> 10) + 55296, (code2 & 1023) + 56320);
  }
  function codePointSize(code2) {
    return code2 < 65536 ? 1 : 2;
  }
  var DefaultSplit = /\r\n?|\n/;
  var MapMode = /* @__PURE__ */ function(MapMode2) {
    MapMode2[MapMode2["Simple"] = 0] = "Simple";
    MapMode2[MapMode2["TrackDel"] = 1] = "TrackDel";
    MapMode2[MapMode2["TrackBefore"] = 2] = "TrackBefore";
    MapMode2[MapMode2["TrackAfter"] = 3] = "TrackAfter";
    return MapMode2;
  }(MapMode || (MapMode = {}));
  var ChangeDesc = class {
    constructor(sections2) {
      this.sections = sections2;
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
      let sections2 = [];
      for (let i = 0; i < this.sections.length; ) {
        let len = this.sections[i++], ins = this.sections[i++];
        if (ins < 0)
          sections2.push(len, ins);
        else
          sections2.push(ins, len);
      }
      return new ChangeDesc(sections2);
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
    static create(sections2) {
      return new ChangeDesc(sections2);
    }
  };
  var ChangeSet = class extends ChangeDesc {
    constructor(sections2, inserted) {
      super(sections2);
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
      let sections2 = this.sections.slice(), inserted = [];
      for (let i = 0, pos = 0; i < sections2.length; i += 2) {
        let len = sections2[i], ins = sections2[i + 1];
        if (ins >= 0) {
          sections2[i] = ins;
          sections2[i + 1] = len;
          let index = i >> 1;
          while (inserted.length < index)
            inserted.push(Text.empty);
          inserted.push(len ? doc2.slice(pos, pos + len) : Text.empty);
        }
        pos += len;
      }
      return new ChangeSet(sections2, inserted);
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
      return ChangeDesc.create(this.sections);
    }
    filter(ranges) {
      let resultSections = [], resultInserted = [], filteredSections = [];
      let iter = new SectionIter(this);
      done:
        for (let i = 0, pos = 0; ; ) {
          let next3 = i == ranges.length ? 1e9 : ranges[i++];
          while (pos < next3 || pos == next3 && iter.len == 0) {
            if (iter.done)
              break done;
            let len = Math.min(iter.len, next3 - pos);
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
        filtered: ChangeDesc.create(filteredSections)
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
      let sections2 = [], inserted = [], pos = 0;
      let total = null;
      function flush(force = false) {
        if (!force && !sections2.length)
          return;
        if (pos < length)
          addSection(sections2, length - pos, -1);
        let set = new ChangeSet(sections2, inserted);
        total = total ? total.compose(set.map(total)) : set;
        sections2 = [];
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
          let { from, to = from, insert: insert2 } = spec;
          if (from > to || from < 0 || to > length)
            throw new RangeError(`Invalid change range ${from} to ${to} (in doc of length ${length})`);
          let insText = !insert2 ? Text.empty : typeof insert2 == "string" ? Text.of(insert2.split(lineSep || DefaultSplit)) : insert2;
          let insLen = insText.length;
          if (from == to && insLen == 0)
            return;
          if (from < pos)
            flush();
          if (from > pos)
            addSection(sections2, from - pos, -1);
          addSection(sections2, to - from, insLen);
          addInsert(inserted, sections2, insText);
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
      let sections2 = [], inserted = [];
      for (let i = 0; i < json.length; i++) {
        let part = json[i];
        if (typeof part == "number") {
          sections2.push(part, -1);
        } else if (!Array.isArray(part) || typeof part[0] != "number" || part.some((e, i2) => i2 && typeof e != "string")) {
          throw new RangeError("Invalid JSON representation of ChangeSet");
        } else if (part.length == 1) {
          sections2.push(part[0], 0);
        } else {
          while (inserted.length < i)
            inserted.push(Text.empty);
          inserted[i] = Text.of(part.slice(1));
          sections2.push(part[0], inserted[i].length);
        }
      }
      return new ChangeSet(sections2, inserted);
    }
    static createSet(sections2, inserted) {
      return new ChangeSet(sections2, inserted);
    }
  };
  function addSection(sections2, len, ins, forceJoin = false) {
    if (len == 0 && ins <= 0)
      return;
    let last = sections2.length - 2;
    if (last >= 0 && ins <= 0 && ins == sections2[last + 1])
      sections2[last] += len;
    else if (len == 0 && sections2[last] == 0)
      sections2[last + 1] += ins;
    else if (forceJoin) {
      sections2[last] += len;
      sections2[last + 1] += ins;
    } else
      sections2.push(len, ins);
  }
  function addInsert(values, sections2, value) {
    if (value.length == 0)
      return;
    let index = sections2.length - 2 >> 1;
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
    let sections2 = [], insert2 = mkSet ? [] : null;
    let a = new SectionIter(setA), b = new SectionIter(setB);
    for (let inserted = -1; ; ) {
      if (a.ins == -1 && b.ins == -1) {
        let len = Math.min(a.len, b.len);
        addSection(sections2, len, -1);
        a.forward(len);
        b.forward(len);
      } else if (b.ins >= 0 && (a.ins < 0 || inserted == a.i || a.off == 0 && (b.len < a.len || b.len == a.len && !before))) {
        let len = b.len;
        addSection(sections2, b.ins, -1);
        while (len) {
          let piece = Math.min(a.len, len);
          if (a.ins >= 0 && inserted < a.i && a.len <= piece) {
            addSection(sections2, 0, a.ins);
            if (insert2)
              addInsert(insert2, sections2, a.text);
            inserted = a.i;
          }
          a.forward(piece);
          len -= piece;
        }
        b.next();
      } else if (a.ins >= 0) {
        let len = 0, left = a.len;
        while (left) {
          if (b.ins == -1) {
            let piece = Math.min(left, b.len);
            len += piece;
            left -= piece;
            b.forward(piece);
          } else if (b.ins == 0 && b.len < left) {
            left -= b.len;
            b.next();
          } else {
            break;
          }
        }
        addSection(sections2, len, inserted < a.i ? a.ins : 0);
        if (insert2 && inserted < a.i)
          addInsert(insert2, sections2, a.text);
        inserted = a.i;
        a.forward(a.len - left);
      } else if (a.done && b.done) {
        return insert2 ? ChangeSet.createSet(sections2, insert2) : ChangeDesc.create(sections2);
      } else {
        throw new Error("Mismatched change set lengths");
      }
    }
  }
  function composeSets(setA, setB, mkSet = false) {
    let sections2 = [];
    let insert2 = mkSet ? [] : null;
    let a = new SectionIter(setA), b = new SectionIter(setB);
    for (let open = false; ; ) {
      if (a.done && b.done) {
        return insert2 ? ChangeSet.createSet(sections2, insert2) : ChangeDesc.create(sections2);
      } else if (a.ins == 0) {
        addSection(sections2, a.len, 0, open);
        a.next();
      } else if (b.len == 0 && !b.done) {
        addSection(sections2, 0, b.ins, open);
        if (insert2)
          addInsert(insert2, sections2, b.text);
        b.next();
      } else if (a.done || b.done) {
        throw new Error("Mismatched change set lengths");
      } else {
        let len = Math.min(a.len2, b.len), sectionLen = sections2.length;
        if (a.ins == -1) {
          let insB = b.ins == -1 ? -1 : b.off ? 0 : b.ins;
          addSection(sections2, len, insB, open);
          if (insert2 && insB)
            addInsert(insert2, sections2, b.text);
        } else if (b.ins == -1) {
          addSection(sections2, a.off ? 0 : a.len, len, open);
          if (insert2)
            addInsert(insert2, sections2, a.textBit(len));
        } else {
          addSection(sections2, a.off ? 0 : a.len, b.off ? 0 : b.ins, open);
          if (insert2 && !b.off)
            addInsert(insert2, sections2, b.text);
        }
        open = (a.ins > len || b.ins >= 0 && b.len > len) && (open || sections2.length > sectionLen);
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
      let { sections: sections2 } = this.set;
      if (this.i < sections2.length) {
        this.len = sections2[this.i++];
        this.ins = sections2[this.i++];
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
      let { inserted } = this.set, index = this.i - 2 >> 1;
      return index >= inserted.length ? Text.empty : inserted[index];
    }
    textBit(len) {
      let { inserted } = this.set, index = this.i - 2 >> 1;
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
      let from, to;
      if (this.empty) {
        from = to = change.mapPos(this.from, assoc);
      } else {
        from = change.mapPos(this.from, 1);
        to = change.mapPos(this.to, -1);
      }
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
      return { anchor: this.anchor, head: this.head };
    }
    static fromJSON(json) {
      if (!json || typeof json.anchor != "number" || typeof json.head != "number")
        throw new RangeError("Invalid JSON representation for SelectionRange");
      return EditorSelection.range(json.anchor, json.head);
    }
    static create(from, to, flags) {
      return new SelectionRange(from, to, flags);
    }
  };
  var EditorSelection = class {
    constructor(ranges, mainIndex) {
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
      return this.ranges.length == 1 ? this : new EditorSelection([this.main], 0);
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
      return { ranges: this.ranges.map((r) => r.toJSON()), main: this.mainIndex };
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
          return EditorSelection.normalized(ranges.slice(), mainIndex);
        pos = range.to;
      }
      return new EditorSelection(ranges, mainIndex);
    }
    static cursor(pos, assoc = 0, bidiLevel, goalColumn) {
      return SelectionRange.create(pos, pos, (assoc == 0 ? 0 : assoc < 0 ? 4 : 8) | (bidiLevel == null ? 3 : Math.min(2, bidiLevel)) | (goalColumn !== null && goalColumn !== void 0 ? goalColumn : 33554431) << 5);
    }
    static range(anchor, head, goalColumn) {
      let goal = (goalColumn !== null && goalColumn !== void 0 ? goalColumn : 33554431) << 5;
      return head < anchor ? SelectionRange.create(head, anchor, 16 | goal | 8) : SelectionRange.create(anchor, head, goal | (head > anchor ? 4 : 0));
    }
    static normalized(ranges, mainIndex = 0) {
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
  };
  function checkSelection(selection2, docLength) {
    for (let range of selection2.ranges)
      if (range.to > docLength)
        throw new RangeError("Selection points outside of document");
  }
  var nextID = 0;
  var Facet = class {
    constructor(combine, compareInput, compare2, isStatic, enables) {
      this.combine = combine;
      this.compareInput = compareInput;
      this.compare = compare2;
      this.isStatic = isStatic;
      this.id = nextID++;
      this.default = combine([]);
      this.extensions = typeof enables == "function" ? enables(this) : enables;
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
      var _a2;
      let getter = this.value;
      let compare2 = this.facet.compareInput;
      let id2 = this.id, idx = addresses[id2] >> 1, multi = this.type == 2;
      let depDoc = false, depSel = false, depAddrs = [];
      for (let dep of this.dependencies) {
        if (dep == "doc")
          depDoc = true;
        else if (dep == "selection")
          depSel = true;
        else if ((((_a2 = addresses[dep.id]) !== null && _a2 !== void 0 ? _a2 : 1) & 1) == 0)
          depAddrs.push(addresses[dep.id]);
      }
      return {
        create(state) {
          state.values[idx] = getter(state);
          return 1;
        },
        update(state, tr) {
          if (depDoc && tr.docChanged || depSel && (tr.docChanged || tr.selection) || ensureAll(state, depAddrs)) {
            let newVal = getter(state);
            if (multi ? !compareArray(newVal, state.values[idx], compare2) : !compare2(newVal, state.values[idx])) {
              state.values[idx] = newVal;
              return 1;
            }
          }
          return 0;
        },
        reconfigure: (state, oldState) => {
          let newVal = getter(state);
          let oldAddr = oldState.config.address[id2];
          if (oldAddr != null) {
            let oldVal = getAddr(oldState, oldAddr);
            if (this.dependencies.every((dep) => {
              return dep instanceof Facet ? oldState.facet(dep) === state.facet(dep) : dep instanceof StateField ? oldState.field(dep, false) == state.field(dep, false) : true;
            }) || (multi ? compareArray(newVal, oldVal, compare2) : compare2(newVal, oldVal))) {
              state.values[idx] = oldVal;
              return 0;
            }
          }
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
  function ensureAll(state, addrs) {
    let changed = false;
    for (let addr2 of addrs)
      if (ensureAddr(state, addr2) & 1)
        changed = true;
    return changed;
  }
  function dynamicFacetSlot(addresses, facet, providers) {
    let providerAddrs = providers.map((p) => addresses[p.id]);
    let providerTypes = providers.map((p) => p.type);
    let dynamic = providerAddrs.filter((p) => !(p & 1));
    let idx = addresses[facet.id] >> 1;
    function get(state) {
      let values = [];
      for (let i = 0; i < providerAddrs.length; i++) {
        let value = getAddr(state, providerAddrs[i]);
        if (providerTypes[i] == 2)
          for (let val of value)
            values.push(val);
        else
          values.push(value);
      }
      return facet.combine(values);
    }
    return {
      create(state) {
        for (let addr2 of providerAddrs)
          ensureAddr(state, addr2);
        state.values[idx] = get(state);
        return 1;
      },
      update(state, tr) {
        if (!ensureAll(state, dynamic))
          return 0;
        let value = get(state);
        if (facet.compare(value, state.values[idx]))
          return 0;
        state.values[idx] = value;
        return 1;
      },
      reconfigure(state, oldState) {
        let depChanged = ensureAll(state, providerAddrs);
        let oldProviders = oldState.config.facets[facet.id], oldValue = oldState.facet(facet);
        if (oldProviders && !depChanged && sameArray(providers, oldProviders)) {
          state.values[idx] = oldValue;
          return 0;
        }
        let value = get(state);
        if (facet.compare(value, oldValue)) {
          state.values[idx] = oldValue;
          return 0;
        }
        state.values[idx] = value;
        return 1;
      }
    };
  }
  var initField = /* @__PURE__ */ Facet.define({ static: true });
  var StateField = class {
    constructor(id2, createF, updateF, compareF, spec) {
      this.id = id2;
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
      return {
        create: (state) => {
          state.values[idx] = this.create(state);
          return 1;
        },
        update: (state, tr) => {
          let oldVal = state.values[idx];
          let value = this.updateF(oldVal, tr);
          if (this.compareF(oldVal, value))
            return 0;
          state.values[idx] = value;
          return 1;
        },
        reconfigure: (state, oldState) => {
          if (oldState.config.address[this.id] != null) {
            state.values[idx] = oldState.field(this);
            return 0;
          }
          state.values[idx] = this.create(state);
          return 1;
        }
      };
    }
    init(create) {
      return [this, initField.of({ field: this, create })];
    }
    get extension() {
      return this;
    }
  };
  var Prec_ = { lowest: 4, low: 3, default: 2, high: 1, highest: 0 };
  function prec(value) {
    return (ext) => new PrecExtension(ext, value);
  }
  var Prec = {
    highest: /* @__PURE__ */ prec(Prec_.highest),
    high: /* @__PURE__ */ prec(Prec_.high),
    default: /* @__PURE__ */ prec(Prec_.default),
    low: /* @__PURE__ */ prec(Prec_.low),
    lowest: /* @__PURE__ */ prec(Prec_.lowest)
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
      return Compartment.reconfigure.of({ compartment: this, extension: content2 });
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
    constructor(base2, compartments, dynamicSlots, address, staticValues, facets) {
      this.base = base2;
      this.compartments = compartments;
      this.dynamicSlots = dynamicSlots;
      this.address = address;
      this.staticValues = staticValues;
      this.facets = facets;
      this.statusTemplate = [];
      while (this.statusTemplate.length < dynamicSlots.length)
        this.statusTemplate.push(0);
    }
    staticFacet(facet) {
      let addr2 = this.address[facet.id];
      return addr2 == null ? facet.default : this.staticValues[addr2 >> 1];
    }
    static resolve(base2, compartments, oldState) {
      let fields = [];
      let facets = /* @__PURE__ */ Object.create(null);
      let newCompartments = /* @__PURE__ */ new Map();
      for (let ext of flatten(base2, compartments, newCompartments)) {
        if (ext instanceof StateField)
          fields.push(ext);
        else
          (facets[ext.facet.id] || (facets[ext.facet.id] = [])).push(ext);
      }
      let address = /* @__PURE__ */ Object.create(null);
      let staticValues = [];
      let dynamicSlots = [];
      for (let field of fields) {
        address[field.id] = dynamicSlots.length << 1;
        dynamicSlots.push((a) => field.slot(a));
      }
      let oldFacets = oldState === null || oldState === void 0 ? void 0 : oldState.config.facets;
      for (let id2 in facets) {
        let providers = facets[id2], facet = providers[0].facet;
        let oldProviders = oldFacets && oldFacets[id2] || [];
        if (providers.every((p) => p.type == 0)) {
          address[facet.id] = staticValues.length << 1 | 1;
          if (sameArray(oldProviders, providers)) {
            staticValues.push(oldState.facet(facet));
          } else {
            let value = facet.combine(providers.map((p) => p.value));
            staticValues.push(oldState && facet.compare(value, oldState.facet(facet)) ? oldState.facet(facet) : value);
          }
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
      let dynamic = dynamicSlots.map((f) => f(address));
      return new Configuration(base2, newCompartments, dynamic, address, staticValues, facets);
    }
  };
  function flatten(extension, compartments, newCompartments) {
    let result = [[], [], [], [], []];
    let seen = /* @__PURE__ */ new Map();
    function inner(ext, prec2) {
      let known = seen.get(ext);
      if (known != null) {
        if (known <= prec2)
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
          inner(ext.facet.extensions, Prec_.default);
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
  function ensureAddr(state, addr2) {
    if (addr2 & 1)
      return 2;
    let idx = addr2 >> 1;
    let status = state.status[idx];
    if (status == 4)
      throw new Error("Cyclic dependency between fields and/or facets");
    if (status & 2)
      return status;
    state.status[idx] = 4;
    let changed = state.computeSlot(state, state.config.dynamicSlots[idx]);
    return state.status[idx] = 2 | changed;
  }
  function getAddr(state, addr2) {
    return addr2 & 1 ? state.config.staticValues[addr2 >> 1] : state.values[addr2 >> 1];
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
  var readOnly = /* @__PURE__ */ Facet.define({
    combine: (values) => values.length ? values[0] : false
  });
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
    constructor(startState, changes, selection2, effects, annotations, scrollIntoView2) {
      this.startState = startState;
      this.changes = changes;
      this.selection = selection2;
      this.effects = effects;
      this.annotations = annotations;
      this.scrollIntoView = scrollIntoView2;
      this._doc = null;
      this._state = null;
      if (selection2)
        checkSelection(selection2, changes.newLength);
      if (!annotations.some((a) => a.type == Transaction.time))
        this.annotations = annotations.concat(Transaction.time.of(Date.now()));
    }
    static create(startState, changes, selection2, effects, annotations, scrollIntoView2) {
      return new Transaction(startState, changes, selection2, effects, annotations, scrollIntoView2);
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
    isUserEvent(event) {
      let e = this.annotation(Transaction.userEvent);
      return !!(e && (e == event || e.length > event.length && e.slice(0, event.length) == event && e[event.length] == "."));
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
    var _a2;
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
      selection: b.selection ? b.selection.map(mapForB) : (_a2 = a.selection) === null || _a2 === void 0 ? void 0 : _a2.map(mapForA),
      effects: StateEffect.mapEffects(a.effects, mapForA).concat(StateEffect.mapEffects(b.effects, mapForB)),
      annotations: a.annotations.length ? a.annotations.concat(b.annotations) : b.annotations,
      scrollIntoView: a.scrollIntoView || b.scrollIntoView
    };
  }
  function resolveTransactionInner(state, spec, docSize) {
    let sel = spec.selection, annotations = asArray(spec.annotations);
    if (spec.userEvent)
      annotations = annotations.concat(Transaction.userEvent.of(spec.userEvent));
    return {
      changes: spec.changes instanceof ChangeSet ? spec.changes : ChangeSet.of(spec.changes || [], docSize, state.facet(lineSeparator)),
      selection: sel && (sel instanceof EditorSelection ? sel : EditorSelection.single(sel.anchor, sel.head)),
      effects: asArray(spec.effects),
      annotations,
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
    let tr = Transaction.create(state, s.changes, s.selection, s.effects, s.annotations, s.scrollIntoView);
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
        back = filtered.filtered.mapDesc(filtered.changes).invertedDesc;
      }
      tr = Transaction.create(state, changes, tr.selection && tr.selection.map(back), StateEffect.mapEffects(tr.effects, back), tr.annotations, tr.scrollIntoView);
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
        spec = mergeTransaction(spec, resolveTransactionInner(state, extension, tr.changes.newLength), true);
    }
    return spec == tr ? tr : Transaction.create(state, tr.changes, tr.selection, spec.effects, spec.annotations, spec.scrollIntoView);
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
    constructor(config2, doc2, selection2, values, computeSlot, tr) {
      this.config = config2;
      this.doc = doc2;
      this.selection = selection2;
      this.values = values;
      this.status = config2.statusTemplate.slice();
      this.computeSlot = computeSlot;
      if (tr)
        tr._state = this;
      for (let i = 0; i < this.config.dynamicSlots.length; i++)
        ensureAddr(this, i << 1);
      this.computeSlot = null;
    }
    field(field, require2 = true) {
      let addr2 = this.config.address[field.id];
      if (addr2 == null) {
        if (require2)
          throw new RangeError("Field is not present in this state");
        return void 0;
      }
      ensureAddr(this, addr2);
      return getAddr(this, addr2);
    }
    update(...specs) {
      return resolveTransaction(this, specs, true);
    }
    applyTransaction(tr) {
      let conf = this.config, { base: base2, compartments } = conf;
      for (let effect of tr.effects) {
        if (effect.is(Compartment.reconfigure)) {
          if (conf) {
            compartments = /* @__PURE__ */ new Map();
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
      let startValues;
      if (!conf) {
        conf = Configuration.resolve(base2, compartments, this);
        let intermediateState = new EditorState(conf, this.doc, this.selection, conf.dynamicSlots.map(() => null), (state, slot) => slot.reconfigure(state, this), null);
        startValues = intermediateState.values;
      } else {
        startValues = tr.startState.values.slice();
      }
      new EditorState(conf, tr.newDoc, tr.newSelection, startValues, (state, slot) => slot.update(state, tr), tr);
    }
    replaceSelection(text) {
      if (typeof text == "string")
        text = this.toText(text);
      return this.changeByRange((range) => ({
        changes: { from: range.from, to: range.to, insert: text },
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
      let addr2 = this.config.address[facet.id];
      if (addr2 == null)
        return facet.default;
      ensureAddr(this, addr2);
      return getAddr(this, addr2);
    }
    toJSON(fields) {
      let result = {
        doc: this.sliceDoc(),
        selection: this.selection.toJSON()
      };
      if (fields)
        for (let prop in fields) {
          let value = fields[prop];
          if (value instanceof StateField && this.config.address[value.id] != null)
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
          if (Object.prototype.hasOwnProperty.call(json, prop)) {
            let field = fields[prop], value = json[prop];
            fieldInit.push(field.init((state) => field.spec.fromJSON(value, state)));
          }
        }
      return EditorState.create({
        doc: json.doc,
        selection: EditorSelection.fromJSON(json.selection),
        extensions: config2.extensions ? fieldInit.concat([config2.extensions]) : fieldInit
      });
    }
    static create(config2 = {}) {
      let configuration = Configuration.resolve(config2.extensions || [], /* @__PURE__ */ new Map());
      let doc2 = config2.doc instanceof Text ? config2.doc : Text.of((config2.doc || "").split(configuration.staticFacet(EditorState.lineSeparator) || DefaultSplit));
      let selection2 = !config2.selection ? EditorSelection.single(0) : config2.selection instanceof EditorSelection ? config2.selection : EditorSelection.single(config2.selection.anchor, config2.selection.head);
      checkSelection(selection2, doc2.length);
      if (!configuration.staticFacet(allowMultipleSelections))
        selection2 = selection2.asSingle();
      return new EditorState(configuration, doc2, selection2, configuration.dynamicSlots.map(() => null), (state, slot) => slot.create(state), null);
    }
    get tabSize() {
      return this.facet(EditorState.tabSize);
    }
    get lineBreak() {
      return this.facet(EditorState.lineSeparator) || "\n";
    }
    get readOnly() {
      return this.facet(readOnly);
    }
    phrase(phrase, ...insert2) {
      for (let map of this.facet(EditorState.phrases))
        if (Object.prototype.hasOwnProperty.call(map, phrase)) {
          phrase = map[phrase];
          break;
        }
      if (insert2.length)
        phrase = phrase.replace(/\$(\$|\d*)/g, (m, i) => {
          if (i == "$")
            return "$";
          let n = +(i || 1);
          return !n || n > insert2.length ? m : insert2[n - 1];
        });
      return phrase;
    }
    languageDataAt(name2, pos, side = -1) {
      let values = [];
      for (let provider of this.facet(languageData)) {
        for (let result of provider(this, pos, side)) {
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
      let { text, from, length } = this.doc.lineAt(pos);
      let cat = this.charCategorizer(pos);
      let start = pos - from, end = pos - from;
      while (start > 0) {
        let prev = findClusterBreak(text, start, false);
        if (cat(text.slice(prev, start)) != CharCategory.Word)
          break;
        start = prev;
      }
      while (end < length) {
        let next3 = findClusterBreak(text, end);
        if (cat(text.slice(end, next3)) != CharCategory.Word)
          break;
        end = next3;
      }
      return start == end ? null : EditorSelection.range(start + from, end + from);
    }
  };
  EditorState.allowMultipleSelections = allowMultipleSelections;
  EditorState.tabSize = /* @__PURE__ */ Facet.define({
    combine: (values) => values.length ? values[0] : 4
  });
  EditorState.lineSeparator = lineSeparator;
  EditorState.readOnly = readOnly;
  EditorState.phrases = /* @__PURE__ */ Facet.define({
    compare(a, b) {
      let kA = Object.keys(a), kB = Object.keys(b);
      return kA.length == kB.length && kA.every((k) => a[k] == b[k]);
    }
  });
  EditorState.languageData = languageData;
  EditorState.changeFilter = changeFilter;
  EditorState.transactionFilter = transactionFilter;
  EditorState.transactionExtender = transactionExtender;
  Compartment.reconfigure = /* @__PURE__ */ StateEffect.define();
  function combineConfig(configs, defaults2, combine = {}) {
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
    for (let key in defaults2)
      if (result[key] === void 0)
        result[key] = defaults2[key];
    return result;
  }
  var RangeValue = class {
    eq(other) {
      return this == other;
    }
    range(from, to = from) {
      return Range.create(from, to, this);
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
    static create(from, to, value) {
      return new Range(from, to, value);
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
    findIndex(pos, side, end, startAt = 0) {
      let arr = end ? this.to : this.from;
      for (let lo = startAt, hi = arr.length; ; ) {
        if (lo == hi)
          return lo;
        let mid = lo + hi >> 1;
        let diff = arr[mid] - pos || (end ? this.value[mid].endSide : this.value[mid].startSide) - side;
        if (mid == lo)
          return diff >= 0 ? lo : hi;
        if (diff >= 0)
          hi = mid;
        else
          lo = mid + 1;
      }
    }
    between(offset, from, to, f) {
      for (let i = this.findIndex(from, -1e9, true), e = this.findIndex(to, 1e9, false, i); i < e; i++)
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
          if (val.startSide != val.endSide) {
            newTo = changes.mapPos(curFrom, val.endSide);
            if (newTo < newFrom)
              continue;
          }
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
      return { mapped: value.length ? new Chunk(from, to, value, maxPoint) : null, pos: newPos };
    }
  };
  var RangeSet = class {
    constructor(chunkPos, chunk, nextLayer, maxPoint) {
      this.chunkPos = chunkPos;
      this.chunk = chunk;
      this.nextLayer = nextLayer;
      this.maxPoint = maxPoint;
    }
    static create(chunkPos, chunk, nextLayer, maxPoint) {
      return new RangeSet(chunkPos, chunk, nextLayer, maxPoint);
    }
    get length() {
      let last = this.chunk.length - 1;
      return last < 0 ? 0 : Math.max(this.chunkEnd(last), this.nextLayer.length);
    }
    get size() {
      if (this.isEmpty)
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
      let { add = [], sort = false, filterFrom = 0, filterTo = this.length } = updateSpec;
      let filter = updateSpec.filter;
      if (add.length == 0 && !filter)
        return this;
      if (sort)
        add = add.slice().sort(cmpRange);
      if (this.isEmpty)
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
              spill.push(Range.create(cur.from, cur.to, cur.value));
          }
          cur.next();
        }
      }
      return builder.finishInner(this.nextLayer.isEmpty && !spill.length ? RangeSet.empty : this.nextLayer.update({ add: spill, filter, filterFrom, filterTo }));
    }
    map(changes) {
      if (changes.empty || this.isEmpty)
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
          let { mapped, pos } = chunk.map(start, changes);
          if (mapped) {
            maxPoint = Math.max(maxPoint, mapped.maxPoint);
            chunks.push(mapped);
            chunkPos.push(pos);
          }
        }
      }
      let next3 = this.nextLayer.map(changes);
      return chunks.length == 0 ? next3 : new RangeSet(chunkPos, chunks, next3 || RangeSet.empty, maxPoint);
    }
    between(from, to, f) {
      if (this.isEmpty)
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
    get isEmpty() {
      return this.nextLayer == this;
    }
    static iter(sets, from = 0) {
      return HeapCursor.from(sets).goto(from);
    }
    static compare(oldSets, newSets, textDiff, comparator, minPointSize = -1) {
      let a = oldSets.filter((set) => set.maxPoint > 0 || !set.isEmpty && set.maxPoint >= minPointSize);
      let b = newSets.filter((set) => set.maxPoint > 0 || !set.isEmpty && set.maxPoint >= minPointSize);
      let sharedChunks = findSharedChunks(a, b, textDiff);
      let sideA = new SpanCursor(a, sharedChunks, minPointSize);
      let sideB = new SpanCursor(b, sharedChunks, minPointSize);
      textDiff.iterGaps((fromA, fromB, length) => compare(sideA, fromA, sideB, fromB, length, comparator));
      if (textDiff.empty && textDiff.length == 0)
        compare(sideA, 0, sideB, 0, 0, comparator);
    }
    static eq(oldSets, newSets, from = 0, to) {
      if (to == null)
        to = 1e9;
      let a = oldSets.filter((set) => !set.isEmpty && newSets.indexOf(set) < 0);
      let b = newSets.filter((set) => !set.isEmpty && oldSets.indexOf(set) < 0);
      if (a.length != b.length)
        return false;
      if (!a.length)
        return true;
      let sharedChunks = findSharedChunks(a, b);
      let sideA = new SpanCursor(a, sharedChunks, 0).goto(from), sideB = new SpanCursor(b, sharedChunks, 0).goto(from);
      for (; ; ) {
        if (sideA.to != sideB.to || !sameValues(sideA.active, sideB.active) || sideA.point && (!sideB.point || !sideA.point.eq(sideB.point)))
          return false;
        if (sideA.to > to)
          return true;
        sideA.next();
        sideB.next();
      }
    }
    static spans(sets, from, to, iterator, minPointSize = -1) {
      let cursor2 = new SpanCursor(sets, null, minPointSize).goto(from), pos = from;
      let open = cursor2.openStart;
      for (; ; ) {
        let curTo = Math.min(cursor2.to, to);
        if (cursor2.point) {
          iterator.point(pos, curTo, cursor2.point, cursor2.activeForPoint(cursor2.to), open, cursor2.pointRank);
          open = cursor2.openEnd(curTo) + (cursor2.to > curTo ? 1 : 0);
        } else if (curTo > pos) {
          iterator.span(pos, curTo, cursor2.active, open);
          open = cursor2.openEnd(curTo);
        }
        if (cursor2.to > to)
          break;
        pos = cursor2.to;
        cursor2.next();
      }
      return open;
    }
    static of(ranges, sort = false) {
      let build = new RangeSetBuilder();
      for (let range of ranges instanceof Range ? [ranges] : sort ? lazySort(ranges) : ranges)
        build.add(range.from, range.to, range.value);
      return build.finish();
    }
  };
  RangeSet.empty = /* @__PURE__ */ new RangeSet([], [], null, -1);
  function lazySort(ranges) {
    if (ranges.length > 1)
      for (let prev = ranges[0], i = 1; i < ranges.length; i++) {
        let cur = ranges[i];
        if (cmpRange(prev, cur) > 0)
          return ranges.slice().sort(cmpRange);
        prev = cur;
      }
    return ranges;
  }
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
    finishInner(next3) {
      if (this.from.length)
        this.finishChunk(false);
      if (this.chunks.length == 0)
        return next3;
      let result = RangeSet.create(this.chunkPos, this.chunks, this.nextLayer ? this.nextLayer.finishInner(next3) : next3, this.setMaxPoint);
      this.from = null;
      return result;
    }
  };
  function findSharedChunks(a, b, textDiff) {
    let inA = /* @__PURE__ */ new Map();
    for (let set of a)
      for (let i = 0; i < set.chunk.length; i++)
        if (set.chunk[i].maxPoint <= 0)
          inA.set(set.chunk[i], set.chunkPos[i]);
    let shared = /* @__PURE__ */ new Set();
    for (let set of b)
      for (let i = 0; i < set.chunk.length; i++) {
        let known = inA.get(set.chunk[i]);
        if (known != null && (textDiff ? textDiff.mapPos(known) : known) == set.chunkPos[i] && !(textDiff === null || textDiff === void 0 ? void 0 : textDiff.touchesRange(known, known + set.chunk[i].length)))
          shared.add(set.chunk[i]);
      }
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
        let next3 = this.layer.chunk[this.chunkIndex];
        if (!(this.skip && this.skip.has(next3) || this.layer.chunkEnd(this.chunkIndex) < pos || next3.maxPoint < this.minPoint))
          break;
        this.chunkIndex++;
        forward = false;
      }
      if (this.chunkIndex < this.layer.chunk.length) {
        let rangeIndex = this.layer.chunk[this.chunkIndex].findIndex(pos - this.layer.chunkPos[this.chunkIndex], side, true);
        if (!forward || this.rangeIndex < rangeIndex)
          this.setRangeIndex(rangeIndex);
      }
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
          this.setRangeIndex(this.rangeIndex + 1);
          if (this.minPoint < 0 || this.value.point && this.to - this.from >= this.minPoint)
            break;
        }
      }
    }
    setRangeIndex(index) {
      if (index == this.layer.chunk[this.chunkIndex].value.length) {
        this.chunkIndex++;
        if (this.skip) {
          while (this.chunkIndex < this.layer.chunk.length && this.skip.has(this.layer.chunk[this.chunkIndex]))
            this.chunkIndex++;
        }
        this.rangeIndex = 0;
      } else {
        this.rangeIndex = index;
      }
    }
    nextChunk() {
      this.chunkIndex++;
      this.rangeIndex = 0;
      this.next();
    }
    compare(other) {
      return this.from - other.from || this.startSide - other.startSide || this.rank - other.rank || this.to - other.to || this.endSide - other.endSide;
    }
  };
  var HeapCursor = class {
    constructor(heap) {
      this.heap = heap;
    }
    static from(sets, skip = null, minPoint = -1) {
      let heap = [];
      for (let i = 0; i < sets.length; i++) {
        for (let cur = sets[i]; !cur.isEmpty; cur = cur.nextLayer) {
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
      let i = 0, { value, to, rank } = this.cursor;
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
            if (this.cursor.from < from && this.cursor.to > from)
              trackExtra++;
            this.cursor.next();
          } else if (wasPoint && this.cursor.to == this.to && this.cursor.from < this.cursor.to) {
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
      for (let i = this.active.length - 1; i >= 0; i--) {
        if (this.activeRank[i] < this.pointRank)
          break;
        if (this.activeTo[i] > to || this.activeTo[i] == to && this.active[i].endSide >= this.point.endSide)
          active.push(this.active[i]);
      }
      return active.reverse();
    }
    openEnd(to) {
      let open = 0;
      for (let i = this.activeTo.length - 1; i >= 0 && this.activeTo[i] > to; i--)
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
        if (!(a.point && b.point && (a.point == b.point || a.point.eq(b.point)) && sameValues(a.activeForPoint(a.to + dPos), b.activeForPoint(b.to))))
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
  function countColumn(string2, tabSize, to = string2.length) {
    let n = 0;
    for (let i = 0; i < to; ) {
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
  function findColumn(string2, col, tabSize, strict) {
    for (let i = 0, n = 0; ; ) {
      if (n >= col)
        return i;
      if (i == string2.length)
        break;
      n += string2.charCodeAt(i) == 9 ? tabSize - n % tabSize : 1;
      i = findClusterBreak(string2, i);
    }
    return strict === true ? -1 : string2.length;
  }

  // node_modules/style-mod/src/style-mod.js
  var C = "\u037C";
  var COUNT = typeof Symbol == "undefined" ? "__" + C : Symbol.for(C);
  var SET = typeof Symbol == "undefined" ? "__styleSet" + Math.floor(Math.random() * 1e8) : Symbol("styleSet");
  var top = typeof globalThis != "undefined" ? globalThis : typeof window != "undefined" ? window : {};
  var StyleModule = class {
    constructor(spec, options) {
      this.rules = [];
      let { finish } = options || {};
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
            render(
              prop.split(/,\s*/).map((part) => selectors.map((sel) => part.replace(/&/, sel))).reduce((a, b) => a.concat(b)),
              value,
              target
            );
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
      let id2 = top[COUNT] || 1;
      top[COUNT] = id2 + 1;
      return C + id2.toString(36);
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
    222: "'"
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
    222: '"'
  };
  var chrome = typeof navigator != "undefined" && /Chrome\/(\d+)/.exec(navigator.userAgent);
  var gecko = typeof navigator != "undefined" && /Gecko\/\d+/.test(navigator.userAgent);
  var mac = typeof navigator != "undefined" && /Mac/.test(navigator.platform);
  var ie = typeof navigator != "undefined" && /MSIE \d|Trident\/(?:[7-9]|\d{2,})\..*rv:(\d+)/.exec(navigator.userAgent);
  var brokenModifierNames = mac || chrome && +chrome[1] < 57;
  for (i = 0; i < 10; i++)
    base[48 + i] = base[96 + i] = String(i);
  var i;
  for (i = 1; i <= 24; i++)
    base[i + 111] = "F" + i;
  var i;
  for (i = 65; i <= 90; i++) {
    base[i] = String.fromCharCode(i + 32);
    shift[i] = String.fromCharCode(i);
  }
  var i;
  for (code2 in base)
    if (!shift.hasOwnProperty(code2))
      shift[code2] = base[code2];
  var code2;
  function keyName(event) {
    var ignoreKey = brokenModifierNames && (event.ctrlKey || event.altKey || event.metaKey) || ie && event.shiftKey && event.key && event.key.length == 1 || event.key == "Unidentified";
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
    let target;
    if (root.nodeType == 11) {
      target = root.getSelection ? root : root.ownerDocument;
    } else {
      target = root;
    }
    return target.getSelection();
  }
  function contains(dom, node) {
    return node ? dom == node || dom.contains(node.nodeType != 1 ? node.parentNode : node) : false;
  }
  function deepActiveElement(doc2) {
    let elt = doc2.activeElement;
    while (elt && elt.shadowRoot)
      elt = elt.shadowRoot.activeElement;
    return elt;
  }
  function hasSelection(dom, selection2) {
    if (!selection2.anchorNode)
      return false;
    try {
      return contains(dom, selection2.anchorNode);
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
        if (node.nodeType == 1 && node.contentEditable == "false")
          return false;
        off = dir < 0 ? maxOffset(node) : 0;
      } else {
        return false;
      }
    }
  }
  function maxOffset(node) {
    return node.nodeType == 3 ? node.nodeValue.length : node.childNodes.length;
  }
  var Rect0 = { left: 0, right: 0, top: 0, bottom: 0 };
  function flattenRect(rect, left) {
    let x = left ? rect.left : rect.right;
    return { left: x, right: x, top: rect.top, bottom: rect.bottom };
  }
  function windowRect(win) {
    return {
      left: 0,
      right: win.innerWidth,
      top: 0,
      bottom: win.innerHeight
    };
  }
  function scrollRectIntoView(dom, rect, side, x, y, xMargin, yMargin, ltr) {
    let doc2 = dom.ownerDocument, win = doc2.defaultView || window;
    for (let cur = dom; cur; ) {
      if (cur.nodeType == 1) {
        let bounding, top2 = cur == doc2.body;
        if (top2) {
          bounding = windowRect(win);
        } else {
          if (cur.scrollHeight <= cur.clientHeight && cur.scrollWidth <= cur.clientWidth) {
            cur = cur.assignedSlot || cur.parentNode;
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
        if (y == "nearest") {
          if (rect.top < bounding.top) {
            moveY = -(bounding.top - rect.top + yMargin);
            if (side > 0 && rect.bottom > bounding.bottom + moveY)
              moveY = rect.bottom - bounding.bottom + moveY + yMargin;
          } else if (rect.bottom > bounding.bottom) {
            moveY = rect.bottom - bounding.bottom + yMargin;
            if (side < 0 && rect.top - moveY < bounding.top)
              moveY = -(bounding.top + moveY - rect.top + yMargin);
          }
        } else {
          let rectHeight = rect.bottom - rect.top, boundingHeight = bounding.bottom - bounding.top;
          let targetTop = y == "center" && rectHeight <= boundingHeight ? rect.top + rectHeight / 2 - boundingHeight / 2 : y == "start" || y == "center" && side < 0 ? rect.top - yMargin : rect.bottom - boundingHeight + yMargin;
          moveY = targetTop - bounding.top;
        }
        if (x == "nearest") {
          if (rect.left < bounding.left) {
            moveX = -(bounding.left - rect.left + xMargin);
            if (side > 0 && rect.right > bounding.right + moveX)
              moveX = rect.right - bounding.right + moveX + xMargin;
          } else if (rect.right > bounding.right) {
            moveX = rect.right - bounding.right + xMargin;
            if (side < 0 && rect.left < bounding.left + moveX)
              moveX = -(bounding.left + moveX - rect.left + xMargin);
          }
        } else {
          let targetLeft = x == "center" ? rect.left + (rect.right - rect.left) / 2 - (bounding.right - bounding.left) / 2 : x == "start" == ltr ? rect.left - xMargin : rect.right - (bounding.right - bounding.left) + xMargin;
          moveX = targetLeft - bounding.left;
        }
        if (moveX || moveY) {
          if (top2) {
            win.scrollBy(moveX, moveY);
          } else {
            let movedX = 0, movedY = 0;
            if (moveY) {
              let start = cur.scrollTop;
              cur.scrollTop += moveY;
              movedY = cur.scrollTop - start;
            }
            if (moveX) {
              let start = cur.scrollLeft;
              cur.scrollLeft += moveX;
              movedX = cur.scrollLeft - start;
            }
            rect = {
              left: rect.left - movedX,
              top: rect.top - movedY,
              right: rect.right - movedX,
              bottom: rect.bottom - movedY
            };
            if (movedX && Math.abs(movedX - moveX) < 1)
              x = "nearest";
            if (movedY && Math.abs(movedY - moveY) < 1)
              y = "nearest";
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
  var DOMSelectionState = class {
    constructor() {
      this.anchorNode = null;
      this.anchorOffset = 0;
      this.focusNode = null;
      this.focusOffset = 0;
    }
    eq(domSel) {
      return this.anchorNode == domSel.anchorNode && this.anchorOffset == domSel.anchorOffset && this.focusNode == domSel.focusNode && this.focusOffset == domSel.focusOffset;
    }
    setRange(range) {
      this.set(range.anchorNode, range.anchorOffset, range.focusNode, range.focusOffset);
    }
    set(anchorNode, anchorOffset, focusNode, focusOffset) {
      this.anchorNode = anchorNode;
      this.anchorOffset = anchorOffset;
      this.focusNode = focusNode;
      this.focusOffset = focusOffset;
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
        preventScrollSupported = { preventScroll: true };
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
  function dispatchKey(elt, name2, code2) {
    let options = { key: name2, code: name2, keyCode: code2, which: code2, cancelable: true };
    let down = new KeyboardEvent("keydown", options);
    down.synthetic = true;
    elt.dispatchEvent(down);
    let up = new KeyboardEvent("keyup", options);
    up.synthetic = true;
    elt.dispatchEvent(up);
    return down.defaultPrevented || up.defaultPrevented;
  }
  function getRoot(node) {
    while (node) {
      if (node && (node.nodeType == 9 || node.nodeType == 11 && node.host))
        return node;
      node = node.assignedSlot || node.parentNode;
    }
    return null;
  }
  function clearAttributes(node) {
    while (node.attributes.length)
      node.removeAttributeNode(node.attributes[0]);
  }
  function atElementStart(doc2, selection2) {
    let node = selection2.focusNode, offset = selection2.focusOffset;
    if (!node || selection2.anchorNode != node || selection2.anchorOffset != offset)
      return false;
    for (; ; ) {
      if (offset) {
        if (node.nodeType != 1)
          return false;
        let prev = node.childNodes[offset - 1];
        if (prev.contentEditable == "false")
          offset--;
        else {
          node = prev;
          offset = maxOffset(node);
        }
      } else if (node == doc2) {
        return true;
      } else {
        offset = domIndex(node);
        node = node.parentNode;
      }
    }
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
  var noChildren = [];
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
      if (this.dirty & 2) {
        let parent = this.dom;
        let prev = null, next3;
        for (let child of this.children) {
          if (child.dirty) {
            if (!child.dom && (next3 = prev ? prev.nextSibling : parent.firstChild)) {
              let contentView = ContentView.get(next3);
              if (!contentView || !contentView.parent && contentView.canReuseDOM(child))
                child.reuseDOM(next3);
            }
            child.sync(track);
            child.dirty = 0;
          }
          next3 = prev ? prev.nextSibling : parent.firstChild;
          if (track && !track.written && track.node == parent && next3 != child.dom)
            track.written = true;
          if (child.dom.parentNode == parent) {
            while (next3 && next3 != child.dom)
              next3 = rm$1(next3);
          } else {
            parent.insertBefore(child.dom, next3);
          }
          prev = child.dom;
        }
        next3 = prev ? prev.nextSibling : parent.firstChild;
        if (next3 && track && track.node == parent)
          track.written = true;
        while (next3)
          next3 = rm$1(next3);
      } else if (this.dirty & 1) {
        for (let child of this.children)
          if (child.dirty) {
            child.sync(track);
            child.dirty = 0;
          }
      }
    }
    reuseDOM(_dom) {
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
      return {
        from: fromStart,
        to: toEnd < 0 ? offset + this.length : toEnd,
        startDOM: (fromI ? this.children[fromI - 1].dom.nextSibling : null) || this.dom.firstChild,
        endDOM: toI < this.children.length && toI >= 0 ? this.children[toI].dom : null
      };
    }
    markDirty(andParent = false) {
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
      if (this.dom)
        this.dom.cmView = null;
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
    replaceChildren(from, to, children = noChildren) {
      this.markDirty();
      for (let i = from; i < to; i++) {
        let child = this.children[i];
        if (child.parent == this)
          child.destroy();
      }
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
    get isEditable() {
      return true;
    }
    merge(from, to, source, hasStart, openStart, openEnd) {
      return false;
    }
    become(other) {
      return false;
    }
    canReuseDOM(other) {
      return other.constructor == this.constructor;
    }
    getSide() {
      return 0;
    }
    destroy() {
      this.parent = null;
    }
  };
  ContentView.prototype.breakAfter = 0;
  function rm$1(dom) {
    let next3 = dom.nextSibling;
    dom.parentNode.removeChild(dom);
    return next3;
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
        let next3 = this.children[--this.i];
        this.pos -= next3.length + next3.breakAfter;
      }
    }
  };
  function replaceRange(parent, fromI, fromOff, toI, toOff, insert2, breakAtStart, openStart, openEnd) {
    let { children } = parent;
    let before = children.length ? children[fromI] : null;
    let last = insert2.length ? insert2[insert2.length - 1] : null;
    let breakAtEnd = last ? last.breakAfter : breakAtStart;
    if (fromI == toI && before && !breakAtStart && !breakAtEnd && insert2.length < 2 && before.merge(fromOff, toOff, insert2.length ? last : null, fromOff == 0, openStart, openEnd))
      return;
    if (toI < children.length) {
      let after = children[toI];
      if (after && toOff < after.length) {
        if (fromI == toI) {
          after = after.split(toOff);
          toOff = 0;
        }
        if (!breakAtEnd && last && after.merge(0, toOff, last, true, 0, openEnd)) {
          insert2[insert2.length - 1] = after;
        } else {
          if (toOff)
            after.merge(0, toOff, null, false, 0, openEnd);
          insert2.push(after);
        }
      } else if (after === null || after === void 0 ? void 0 : after.breakAfter) {
        if (last)
          last.breakAfter = 1;
        else
          breakAtStart = 1;
      }
      toI++;
    }
    if (before) {
      before.breakAfter = breakAtStart;
      if (fromOff > 0) {
        if (!breakAtStart && insert2.length && before.merge(fromOff, before.length, insert2[0], false, openStart, 0)) {
          before.breakAfter = insert2.shift().breakAfter;
        } else if (fromOff < before.length || before.children.length && before.children[before.children.length - 1].length == 0) {
          before.merge(fromOff, before.length, null, false, openStart, 0);
        }
        fromI++;
      }
    }
    while (fromI < toI && insert2.length) {
      if (children[toI - 1].become(insert2[insert2.length - 1])) {
        toI--;
        insert2.pop();
        openEnd = insert2.length ? 0 : openStart;
      } else if (children[fromI].become(insert2[0])) {
        fromI++;
        insert2.shift();
        openStart = insert2.length ? 0 : openEnd;
      } else {
        break;
      }
    }
    if (!insert2.length && fromI && toI < children.length && !children[fromI - 1].breakAfter && children[toI].merge(0, 0, children[fromI - 1], false, openStart, openEnd))
      fromI--;
    if (fromI < toI || insert2.length)
      parent.replaceChildren(fromI, toI, insert2);
  }
  function mergeChildrenInto(parent, from, to, insert2, openStart, openEnd) {
    let cur = parent.childCursor();
    let { i: toI, off: toOff } = cur.findPos(to, 1);
    let { i: fromI, off: fromOff } = cur.findPos(from, -1);
    let dLen = from - to;
    for (let view of insert2)
      dLen += view.length;
    parent.length += dLen;
    replaceRange(parent, fromI, fromOff, toI, toOff, insert2, 0, openStart, openEnd);
  }
  var nav = typeof navigator != "undefined" ? navigator : { userAgent: "", vendor: "", platform: "" };
  var doc = typeof document != "undefined" ? document : { documentElement: { style: {} } };
  var ie_edge = /* @__PURE__ */ /Edge\/(\d+)/.exec(nav.userAgent);
  var ie_upto10 = /* @__PURE__ */ /MSIE \d/.test(nav.userAgent);
  var ie_11up = /* @__PURE__ */ /Trident\/(?:[7-9]|\d{2,})\..*rv:(\d+)/.exec(nav.userAgent);
  var ie2 = !!(ie_upto10 || ie_11up || ie_edge);
  var gecko2 = !ie2 && /* @__PURE__ */ /gecko\/(\d+)/i.test(nav.userAgent);
  var chrome2 = !ie2 && /* @__PURE__ */ /Chrome\/(\d+)/.exec(nav.userAgent);
  var webkit = "webkitFontSmoothing" in doc.documentElement.style;
  var safari = !ie2 && /* @__PURE__ */ /Apple Computer/.test(nav.vendor);
  var ios = safari && (/* @__PURE__ */ /Mobile\/\w+/.test(nav.userAgent) || nav.maxTouchPoints > 2);
  var browser = {
    mac: ios || /* @__PURE__ */ /Mac/.test(nav.platform),
    windows: /* @__PURE__ */ /Win/.test(nav.platform),
    linux: /* @__PURE__ */ /Linux|X11/.test(nav.platform),
    ie: ie2,
    ie_version: ie_upto10 ? doc.documentMode || 6 : ie_11up ? +ie_11up[1] : ie_edge ? +ie_edge[1] : 0,
    gecko: gecko2,
    gecko_version: gecko2 ? +(/* @__PURE__ */ /Firefox\/(\d+)/.exec(nav.userAgent) || [0, 0])[1] : 0,
    chrome: !!chrome2,
    chrome_version: chrome2 ? +chrome2[1] : 0,
    ios,
    android: /* @__PURE__ */ /Android\b/.test(nav.userAgent),
    webkit,
    safari,
    webkit_version: webkit ? +(/* @__PURE__ */ /\bAppleWebKit\/(\d+)/.exec(navigator.userAgent) || [0, 0])[1] : 0,
    tabSize: doc.documentElement.style.tabSize != null ? "tab-size" : "-moz-tab-size"
  };
  var MaxJoinLen = 256;
  var TextView = class extends ContentView {
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
      if (dom.nodeType == 3)
        this.createDOM(dom);
    }
    merge(from, to, source) {
      if (source && (!(source instanceof TextView) || this.length - (to - from) + source.length > MaxJoinLen))
        return false;
      this.text = this.text.slice(0, from) + (source ? source.text : "") + this.text.slice(to);
      this.markDirty();
      return true;
    }
    split(from) {
      let result = new TextView(this.text.slice(from));
      this.text = this.text.slice(0, from);
      this.markDirty();
      return result;
    }
    localPosFromDOM(node, offset) {
      return node == this.dom ? offset : offset ? this.text.length : 0;
    }
    domAtPos(pos) {
      return new DOMPos(this.dom, pos);
    }
    domBoundsAround(_from, _to, offset) {
      return { from: offset, to: offset + this.length, startDOM: this.dom, endDOM: this.dom.nextSibling };
    }
    coordsAt(pos, side) {
      return textCoords(this.dom, pos, side);
    }
  };
  var MarkView = class extends ContentView {
    constructor(mark, children = [], length = 0) {
      super();
      this.mark = mark;
      this.children = children;
      this.length = length;
      for (let ch of children)
        ch.setParent(this);
    }
    setAttrs(dom) {
      clearAttributes(dom);
      if (this.mark.class)
        dom.className = this.mark.class;
      if (this.mark.attrs)
        for (let name2 in this.mark.attrs)
          dom.setAttribute(name2, this.mark.attrs[name2]);
      return dom;
    }
    reuseDOM(node) {
      if (node.nodeName == this.mark.tagName.toUpperCase()) {
        this.setDOM(node);
        this.dirty |= 4 | 2;
      }
    }
    sync(track) {
      if (!this.dom)
        this.setDOM(this.setAttrs(document.createElement(this.mark.tagName)));
      else if (this.dirty & 4)
        this.setAttrs(this.dom);
      super.sync(track);
    }
    merge(from, to, source, _hasStart, openStart, openEnd) {
      if (source && (!(source instanceof MarkView && source.mark.eq(this.mark)) || from && openStart <= 0 || to < this.length && openEnd <= 0))
        return false;
      mergeChildrenInto(this, from, to, source ? source.children : [], openStart - 1, openEnd - 1);
      this.markDirty();
      return true;
    }
    split(from) {
      let result = [], off = 0, detachFrom = -1, i = 0;
      for (let elt of this.children) {
        let end = off + elt.length;
        if (end > from)
          result.push(off < from ? elt.split(from - off) : elt);
        if (detachFrom < 0 && off >= from)
          detachFrom = i;
        off = end;
        i++;
      }
      let length = this.length - from;
      this.length = from;
      if (detachFrom > -1) {
        this.children.length = detachFrom;
        this.markDirty();
      }
      return new MarkView(this.mark, result, length);
    }
    domAtPos(pos) {
      return inlineDOMAtPos(this, pos);
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
        } else if (to < length) {
          to++;
          flatten2 = -1;
        }
      }
    } else {
      if (side < 0)
        from--;
      else if (to < length)
        to++;
    }
    let rects = textRange(text, from, to).getClientRects();
    if (!rects.length)
      return Rect0;
    let rect = rects[(flatten2 ? flatten2 < 0 : side >= 0) ? 0 : rects.length - 1];
    if (browser.safari && !flatten2 && rect.width == 0)
      rect = Array.prototype.find.call(rects, (r) => r.width) || rect;
    return flatten2 ? flattenRect(rect, flatten2 < 0) : rect || null;
  }
  var WidgetView = class extends ContentView {
    constructor(widget, length, side) {
      super();
      this.widget = widget;
      this.length = length;
      this.side = side;
      this.prevWidget = null;
    }
    static create(widget, length, side) {
      return new (widget.customView || WidgetView)(widget, length, side);
    }
    split(from) {
      let result = WidgetView.create(this.widget, this.length - from, this.side);
      this.length -= from;
      return result;
    }
    sync() {
      if (!this.dom || !this.widget.updateDOM(this.dom)) {
        if (this.dom && this.prevWidget)
          this.prevWidget.destroy(this.dom);
        this.prevWidget = null;
        this.setDOM(this.widget.toDOM(this.editorView));
        this.dom.contentEditable = "false";
      }
    }
    getSide() {
      return this.side;
    }
    merge(from, to, source, hasStart, openStart, openEnd) {
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
          if (this.dom && !this.prevWidget)
            this.prevWidget = this.widget;
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
      return flattenRect(rect, this.side > 0);
    }
    get isEditable() {
      return false;
    }
    destroy() {
      super.destroy();
      if (this.dom)
        this.widget.destroy(this.dom);
    }
  };
  var CompositionView = class extends WidgetView {
    domAtPos(pos) {
      let { topView, text } = this.widget;
      if (!topView)
        return new DOMPos(text, Math.min(pos, text.nodeValue.length));
      return scanCompositionTree(pos, 0, topView, text, (v, p) => v.domAtPos(p), (p) => new DOMPos(text, Math.min(p, text.nodeValue.length)));
    }
    sync() {
      this.setDOM(this.widget.toDOM());
    }
    localPosFromDOM(node, offset) {
      let { topView, text } = this.widget;
      if (!topView)
        return Math.min(offset, this.length);
      return posFromDOMInCompositionTree(node, offset, topView, text);
    }
    ignoreMutation() {
      return false;
    }
    get overrideDOMText() {
      return null;
    }
    coordsAt(pos, side) {
      let { topView, text } = this.widget;
      if (!topView)
        return textCoords(text, pos, side);
      return scanCompositionTree(pos, side, topView, text, (v, pos2, side2) => v.coordsAt(pos2, side2), (pos2, side2) => textCoords(text, pos2, side2));
    }
    destroy() {
      var _a2;
      super.destroy();
      (_a2 = this.widget.topView) === null || _a2 === void 0 ? void 0 : _a2.destroy();
    }
    get isEditable() {
      return true;
    }
    canReuseDOM() {
      return true;
    }
  };
  function scanCompositionTree(pos, side, view, text, enterView, fromText) {
    if (view instanceof MarkView) {
      for (let child = view.dom.firstChild; child; child = child.nextSibling) {
        let desc = ContentView.get(child);
        if (!desc)
          return fromText(pos, side);
        let hasComp = contains(child, text);
        let len = desc.length + (hasComp ? text.nodeValue.length : 0);
        if (pos < len || pos == len && desc.getSide() <= 0)
          return hasComp ? scanCompositionTree(pos, side, desc, text, enterView, fromText) : enterView(desc, pos, side);
        pos -= len;
      }
      return enterView(view, view.length, -1);
    } else if (view.dom == text) {
      return fromText(pos, side);
    } else {
      return enterView(view, pos, side);
    }
  }
  function posFromDOMInCompositionTree(node, offset, view, text) {
    if (view instanceof MarkView) {
      for (let child of view.children) {
        let pos = 0, hasComp = contains(child.dom, text);
        if (contains(child.dom, node))
          return pos + (hasComp ? posFromDOMInCompositionTree(node, offset, child, text) : child.localPosFromDOM(node, offset));
        pos += hasComp ? text.nodeValue.length : child.length;
      }
    } else if (view.dom == text) {
      return Math.min(offset, text.nodeValue.length);
    }
    return view.localPosFromDOM(node, offset);
  }
  var WidgetBufferView = class extends ContentView {
    constructor(side) {
      super();
      this.side = side;
    }
    get length() {
      return 0;
    }
    merge() {
      return false;
    }
    become(other) {
      return other instanceof WidgetBufferView && other.side == this.side;
    }
    split() {
      return new WidgetBufferView(this.side);
    }
    sync() {
      if (!this.dom) {
        let dom = document.createElement("img");
        dom.className = "cm-widgetBuffer";
        dom.setAttribute("aria-hidden", "true");
        this.setDOM(dom);
      }
    }
    getSide() {
      return this.side;
    }
    domAtPos(pos) {
      return DOMPos.before(this.dom);
    }
    localPosFromDOM() {
      return 0;
    }
    domBoundsAround() {
      return null;
    }
    coordsAt(pos) {
      let imgRect = this.dom.getBoundingClientRect();
      let siblingRect = inlineSiblingRect(this, this.side > 0 ? -1 : 1);
      return siblingRect && siblingRect.top < imgRect.bottom && siblingRect.bottom > imgRect.top ? { left: imgRect.left, right: imgRect.right, top: siblingRect.top, bottom: siblingRect.bottom } : imgRect;
    }
    get overrideDOMText() {
      return Text.empty;
    }
  };
  TextView.prototype.children = WidgetView.prototype.children = WidgetBufferView.prototype.children = noChildren;
  function inlineSiblingRect(view, side) {
    let parent = view.parent, index = parent ? parent.children.indexOf(view) : -1;
    while (parent && index >= 0) {
      if (side < 0 ? index > 0 : index < parent.children.length) {
        let next3 = parent.children[index + side];
        if (next3 instanceof TextView) {
          let nextRect = next3.coordsAt(side < 0 ? next3.length : 0, side);
          if (nextRect)
            return nextRect;
        }
        index += side;
      } else if (parent instanceof MarkView && parent.parent) {
        index = parent.parent.children.indexOf(parent) + (side < 0 ? 0 : 1);
        parent = parent.parent;
      } else {
        let last = parent.dom.lastChild;
        if (last && last.nodeName == "BR")
          return last.getClientRects()[0];
        break;
      }
    }
    return void 0;
  }
  function inlineDOMAtPos(parent, pos) {
    let dom = parent.dom, { children } = parent, i = 0;
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
    for (let j = i; j > 0; j--) {
      let prev = children[j - 1];
      if (prev.dom.parentNode == dom)
        return prev.domAtPos(prev.length);
    }
    for (let j = i; j < children.length; j++) {
      let next3 = children[j];
      if (next3.dom.parentNode == dom)
        return next3.domAtPos(0);
    }
    return new DOMPos(dom, 0);
  }
  function joinInlineInto(parent, view, open) {
    let last, { children } = parent;
    if (open > 0 && view instanceof MarkView && children.length && (last = children[children.length - 1]) instanceof MarkView && last.mark.eq(view.mark)) {
      joinInlineInto(last, view.children[0], open - 1);
    } else {
      children.push(view);
      view.setParent(parent);
    }
    parent.length += view.length;
  }
  function coordsInChildren(view, pos, side) {
    if (!view.children.length)
      return fallbackRect(view);
    return (side <= 0 ? coordsInChildrenBefore : coordsInChildrenAfter)(view, pos);
  }
  function coordsInChildrenBefore(view, pos) {
    let found = null, foundPos = -1;
    function scan(view2, pos2) {
      for (let i = 0, off = 0; i < view2.children.length && off <= pos2; i++) {
        let child = view2.children[i], end = off + child.length;
        if (end >= pos2) {
          if (child.children.length) {
            if (scan(child, pos2 - off))
              return true;
          } else if (end >= pos2) {
            if (end == pos2 && child.getSide() > 0)
              return true;
            found = child;
            foundPos = pos2 - off;
          }
        }
        off = end;
      }
    }
    scan(view, pos);
    return found ? found.coordsAt(Math.max(0, foundPos), -1) : coordsInChildrenAfter(view, pos);
  }
  function coordsInChildrenAfter(view, pos) {
    let found = null, foundPos = -1;
    function scan(view2, pos2) {
      for (let i = view2.children.length - 1, off = view2.length; i >= 0 && off >= pos2; i--) {
        let child = view2.children[i];
        off -= child.length;
        if (off <= pos2) {
          if (child.children.length) {
            if (scan(child, pos2 - off))
              return true;
          } else if (off <= pos2) {
            if (off == pos2 && child.getSide() < 0)
              return true;
            found = child;
            foundPos = pos2 - off;
          }
        }
      }
    }
    scan(view, pos);
    return found ? found.coordsAt(Math.max(0, foundPos), 1) : coordsInChildrenBefore(view, pos);
  }
  function fallbackRect(view) {
    let last = view.dom.lastChild;
    if (!last)
      return view.dom.getBoundingClientRect();
    let rects = clientRectsFor(last);
    return rects[rects.length - 1] || null;
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
    let changed = null;
    if (prev) {
      for (let name2 in prev)
        if (!(attrs && name2 in attrs))
          dom.removeAttribute(changed = name2);
    }
    if (attrs) {
      for (let name2 in attrs)
        if (!(prev && prev[name2] == attrs[name2]))
          dom.setAttribute(changed = name2, attrs[name2]);
    }
    return !!changed;
  }
  var WidgetType = class {
    eq(widget) {
      return false;
    }
    updateDOM(dom) {
      return false;
    }
    compare(other) {
      return this == other || this.constructor == other.constructor && this.eq(other);
    }
    get estimatedHeight() {
      return -1;
    }
    ignoreEvent(event) {
      return true;
    }
    get customView() {
      return null;
    }
    destroy(dom) {
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
      let side = spec.side || 0, block = !!spec.block;
      side += block ? side > 0 ? 3e8 : -4e8 : side > 0 ? 1e8 : -1e8;
      return new PointDecoration(spec, side, side, block, spec.widget || null, false);
    }
    static replace(spec) {
      let block = !!spec.block, startSide, endSide;
      if (spec.isBlockGap) {
        startSide = -5e8;
        endSide = 4e8;
      } else {
        let { start, end } = getInclusive(spec, block);
        startSide = (start ? block ? -3e8 : -1 : 5e8) - 1;
        endSide = (end ? block ? 2e8 : 1 : -6e8) + 1;
      }
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
      let { start, end } = getInclusive(spec);
      super(start ? -1 : 5e8, end ? 1 : -6e8, null, spec);
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
      super(-2e8, -2e8, null, spec);
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
      this.mapMode = !block ? MapMode.TrackDel : startSide <= 0 ? MapMode.TrackBefore : MapMode.TrackAfter;
    }
    get type() {
      return this.startSide < this.endSide ? BlockType.WidgetRange : this.startSide <= 0 ? BlockType.WidgetBefore : BlockType.WidgetAfter;
    }
    get heightRelevant() {
      return this.block || !!this.widget && this.widget.estimatedHeight >= 5;
    }
    eq(other) {
      return other instanceof PointDecoration && widgetsEq(this.widget, other.widget) && this.block == other.block && this.startSide == other.startSide && this.endSide == other.endSide;
    }
    range(from, to = from) {
      if (this.isReplace && (from > to || from == to && this.startSide > 0 && this.endSide <= 0))
        throw new RangeError("Invalid range for replacement decoration");
      if (!this.isReplace && to != from)
        throw new RangeError("Widget decorations can only have zero-length ranges");
      return super.range(from, to);
    }
  };
  PointDecoration.prototype.point = true;
  function getInclusive(spec, block = false) {
    let { inclusiveStart: start, inclusiveEnd: end } = spec;
    if (start == null)
      start = spec.inclusive;
    if (end == null)
      end = spec.inclusive;
    return { start: start !== null && start !== void 0 ? start : block, end: end !== null && end !== void 0 ? end : block };
  }
  function widgetsEq(a, b) {
    return a == b || !!(a && b && a.compare(b));
  }
  function addRange(from, to, ranges, margin = 0) {
    let last = ranges.length - 1;
    if (last >= 0 && ranges[last] + margin >= from)
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
    merge(from, to, source, hasStart, openStart, openEnd) {
      if (source) {
        if (!(source instanceof LineView))
          return false;
        if (!this.dom)
          source.transferDOM(this);
      }
      if (hasStart)
        this.setDeco(source ? source.attrs : null);
      mergeChildrenInto(this, from, to, source ? source.children : [], openStart, openEnd);
      return true;
    }
    split(at) {
      let end = new LineView();
      end.breakAfter = this.breakAfter;
      if (this.length == 0)
        return end;
      let { i, off } = this.childPos(at);
      if (off) {
        end.append(this.children[i].split(off), 0);
        this.children[i].merge(off, this.children[i].length, null, false, 0, 0);
        i++;
      }
      for (let j = i; j < this.children.length; j++)
        end.append(this.children[j], 0);
      while (i > 0 && this.children[i - 1].length == 0)
        this.children[--i].destroy();
      this.children.length = i;
      this.markDirty();
      this.length = at;
      return end;
    }
    transferDOM(other) {
      if (!this.dom)
        return;
      this.markDirty();
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
      let attrs = deco.spec.attributes, cls = deco.spec.class;
      if (attrs)
        this.attrs = combineAttrs(attrs, this.attrs || {});
      if (cls)
        this.attrs = combineAttrs({ class: cls }, this.attrs || {});
    }
    domAtPos(pos) {
      return inlineDOMAtPos(this, pos);
    }
    reuseDOM(node) {
      if (node.nodeName == "DIV") {
        this.setDOM(node);
        this.dirty |= 4 | 2;
      }
    }
    sync(track) {
      var _a2;
      if (!this.dom) {
        this.setDOM(document.createElement("div"));
        this.dom.className = "cm-line";
        this.prevAttrs = this.attrs ? null : void 0;
      } else if (this.dirty & 4) {
        clearAttributes(this.dom);
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
      while (last && ContentView.get(last) instanceof MarkView)
        last = last.lastChild;
      if (!last || !this.length || last.nodeName != "BR" && ((_a2 = ContentView.get(last)) === null || _a2 === void 0 ? void 0 : _a2.isEditable) == false && (!browser.ios || !this.children.some((ch) => ch instanceof TextView))) {
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
        if (!(child instanceof TextView) || /[^ -~]/.test(child.text))
          return null;
        let rects = clientRectsFor(child.dom);
        if (rects.length != 1)
          return null;
        totalWidth += rects[0].width;
      }
      return !totalWidth ? null : {
        lineHeight: this.dom.getBoundingClientRect().height,
        charWidth: totalWidth / this.length
      };
    }
    coordsAt(pos, side) {
      return coordsInChildren(this, pos, side);
    }
    become(_other) {
      return false;
    }
    get type() {
      return BlockType.Text;
    }
    static find(docView, pos) {
      for (let i = 0, off = 0; i < docView.children.length; i++) {
        let block = docView.children[i], end = off + block.length;
        if (end >= pos) {
          if (block instanceof LineView)
            return block;
          if (end > pos)
            break;
        }
        off = end + block.breakAfter;
      }
      return null;
    }
  };
  var BlockWidgetView = class extends ContentView {
    constructor(widget, length, type) {
      super();
      this.widget = widget;
      this.length = length;
      this.type = type;
      this.breakAfter = 0;
      this.prevWidget = null;
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
      let end = new BlockWidgetView(this.widget, len, this.type);
      end.breakAfter = this.breakAfter;
      return end;
    }
    get children() {
      return noChildren;
    }
    sync() {
      if (!this.dom || !this.widget.updateDOM(this.dom)) {
        if (this.dom && this.prevWidget)
          this.prevWidget.destroy(this.dom);
        this.prevWidget = null;
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
    become(other) {
      if (other instanceof BlockWidgetView && other.type == this.type && other.widget.constructor == this.widget.constructor) {
        if (!other.widget.eq(this.widget))
          this.markDirty(true);
        if (this.dom && !this.prevWidget)
          this.prevWidget = this.widget;
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
    destroy() {
      super.destroy();
      if (this.dom)
        this.widget.destroy(this.dom);
    }
  };
  var ContentBuilder = class {
    constructor(doc2, pos, end, disallowBlockEffectsFor) {
      this.doc = doc2;
      this.pos = pos;
      this.end = end;
      this.disallowBlockEffectsFor = disallowBlockEffectsFor;
      this.content = [];
      this.curLine = null;
      this.breakAtStart = 0;
      this.pendingBuffer = 0;
      this.atCursorPos = true;
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
      if (!this.curLine) {
        this.content.push(this.curLine = new LineView());
        this.atCursorPos = true;
      }
      return this.curLine;
    }
    flushBuffer(active) {
      if (this.pendingBuffer) {
        this.curLine.append(wrapMarks(new WidgetBufferView(-1), active), active.length);
        this.pendingBuffer = 0;
      }
    }
    addBlockWidget(view) {
      this.flushBuffer([]);
      this.curLine = null;
      this.content.push(view);
    }
    finish(openEnd) {
      if (!openEnd)
        this.flushBuffer([]);
      else
        this.pendingBuffer = 0;
      if (!this.posCovered())
        this.getLine();
    }
    buildText(length, active, openStart) {
      while (length > 0) {
        if (this.textOff == this.text.length) {
          let { value, lineBreak, done } = this.cursor.next(this.skip);
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
            this.flushBuffer([]);
            this.curLine = null;
            length--;
            continue;
          } else {
            this.text = value;
            this.textOff = 0;
          }
        }
        let take = Math.min(this.text.length - this.textOff, length, 512);
        this.flushBuffer(active.slice(0, openStart));
        this.getLine().append(wrapMarks(new TextView(this.text.slice(this.textOff, this.textOff + take)), active), openStart);
        this.atCursorPos = true;
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
    point(from, to, deco, active, openStart, index) {
      if (this.disallowBlockEffectsFor[index] && deco instanceof PointDecoration) {
        if (deco.block)
          throw new RangeError("Block decorations may not be specified via plugins");
        if (to > this.doc.lineAt(this.pos).to)
          throw new RangeError("Decorations that replace line breaks may not be specified via plugins");
      }
      let len = to - from;
      if (deco instanceof PointDecoration) {
        if (deco.block) {
          let { type } = deco;
          if (type == BlockType.WidgetAfter && !this.posCovered())
            this.getLine();
          this.addBlockWidget(new BlockWidgetView(deco.widget || new NullWidget("div"), len, type));
        } else {
          let view = WidgetView.create(deco.widget || new NullWidget("span"), len, len ? 0 : deco.startSide);
          let cursorBefore = this.atCursorPos && !view.isEditable && openStart <= active.length && (from < to || deco.startSide > 0);
          let cursorAfter = !view.isEditable && (from < to || deco.startSide <= 0);
          let line2 = this.getLine();
          if (this.pendingBuffer == 2 && !cursorBefore)
            this.pendingBuffer = 0;
          this.flushBuffer(active);
          if (cursorBefore) {
            line2.append(wrapMarks(new WidgetBufferView(1), active), openStart);
            openStart = active.length + Math.max(0, openStart - active.length);
          }
          line2.append(wrapMarks(view, active), openStart);
          this.atCursorPos = cursorAfter;
          this.pendingBuffer = !cursorAfter ? 0 : from < to ? 1 : 2;
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
    static build(text, from, to, decorations2, dynamicDecorationMap) {
      let builder = new ContentBuilder(text, from, to, dynamicDecorationMap);
      builder.openEnd = RangeSet.spans(decorations2, from, to, builder);
      if (builder.openStart < 0)
        builder.openStart = builder.openEnd;
      builder.finish(builder.openEnd);
      return builder;
    }
  };
  function wrapMarks(view, active) {
    for (let mark of active)
      view = new MarkView(mark, [view], view.length);
    return view;
  }
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
  var clickAddsSelectionRange = /* @__PURE__ */ Facet.define();
  var dragMovesSelection$1 = /* @__PURE__ */ Facet.define();
  var mouseSelectionStyle = /* @__PURE__ */ Facet.define();
  var exceptionSink = /* @__PURE__ */ Facet.define();
  var updateListener = /* @__PURE__ */ Facet.define();
  var inputHandler = /* @__PURE__ */ Facet.define();
  var perLineTextDirection = /* @__PURE__ */ Facet.define({
    combine: (values) => values.some((x) => x)
  });
  var ScrollTarget = class {
    constructor(range, y = "nearest", x = "nearest", yMargin = 5, xMargin = 5) {
      this.range = range;
      this.y = y;
      this.x = x;
      this.yMargin = yMargin;
      this.xMargin = xMargin;
    }
    map(changes) {
      return changes.empty ? this : new ScrollTarget(this.range.map(changes), this.y, this.x, this.yMargin, this.xMargin);
    }
  };
  var scrollIntoView = /* @__PURE__ */ StateEffect.define({ map: (t2, ch) => t2.map(ch) });
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
  var editable = /* @__PURE__ */ Facet.define({ combine: (values) => values.length ? values[0] : true });
  var nextPluginID = 0;
  var viewPlugin = /* @__PURE__ */ Facet.define();
  var ViewPlugin = class {
    constructor(id2, create, domEventHandlers, buildExtensions) {
      this.id = id2;
      this.create = create;
      this.domEventHandlers = domEventHandlers;
      this.extension = buildExtensions(this);
    }
    static define(create, spec) {
      const { eventHandlers, provide, decorations: deco } = spec || {};
      return new ViewPlugin(nextPluginID++, create, eventHandlers, (plugin) => {
        let ext = [viewPlugin.of(plugin)];
        if (deco)
          ext.push(decorations.of((view) => {
            let pluginInst = view.plugin(plugin);
            return pluginInst ? deco(pluginInst) : Decoration.none;
          }));
        if (provide)
          ext.push(provide(plugin));
        return ext;
      });
    }
    static fromClass(cls, spec) {
      return ViewPlugin.define((view) => new cls(view), spec);
    }
  };
  var PluginInstance = class {
    constructor(spec) {
      this.spec = spec;
      this.mustUpdate = null;
      this.value = null;
    }
    update(view) {
      if (!this.value) {
        if (this.spec) {
          try {
            this.value = this.spec.create(view);
          } catch (e) {
            logException(view.state, e, "CodeMirror plugin crashed");
            this.deactivate();
          }
        }
      } else if (this.mustUpdate) {
        let update = this.mustUpdate;
        this.mustUpdate = null;
        if (this.value.update) {
          try {
            this.value.update(update);
          } catch (e) {
            logException(update.state, e, "CodeMirror plugin crashed");
            if (this.value.destroy)
              try {
                this.value.destroy();
              } catch (_) {
              }
            this.deactivate();
          }
        }
      }
      return this;
    }
    destroy(view) {
      var _a2;
      if ((_a2 = this.value) === null || _a2 === void 0 ? void 0 : _a2.destroy) {
        try {
          this.value.destroy();
        } catch (e) {
          logException(view.state, e, "CodeMirror plugin crashed");
        }
      }
    }
    deactivate() {
      this.spec = this.value = null;
    }
  };
  var editorAttributes = /* @__PURE__ */ Facet.define();
  var contentAttributes = /* @__PURE__ */ Facet.define();
  var decorations = /* @__PURE__ */ Facet.define();
  var atomicRanges = /* @__PURE__ */ Facet.define();
  var scrollMargins = /* @__PURE__ */ Facet.define();
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
        let next3 = dI == diff.length ? null : diff[dI], off = posA - posB;
        let end = next3 ? next3.fromB : 1e9;
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
        if (!next3)
          return result;
        new ChangedRange(next3.fromA, next3.toA, next3.fromB, next3.toB).addToSet(result);
        posA = next3.toA;
        posB = next3.toB;
      }
    }
  };
  var ViewUpdate = class {
    constructor(view, state, transactions) {
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
    }
    static create(view, state, transactions) {
      return new ViewUpdate(view, state, transactions);
    }
    get viewportChanged() {
      return (this.flags & 4) > 0;
    }
    get heightChanged() {
      return (this.flags & 2) > 0;
    }
    get geometryChanged() {
      return this.docChanged || (this.flags & (8 | 2)) > 0;
    }
    get focusChanged() {
      return (this.flags & 1) > 0;
    }
    get docChanged() {
      return !this.changes.empty;
    }
    get selectionSet() {
      return this.transactions.some((tr) => tr.selection);
    }
    get empty() {
      return this.flags == 0 && this.transactions.length == 0;
    }
  };
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
    return ch <= 247 ? LowTypes[ch] : 1424 <= ch && ch <= 1524 ? 2 : 1536 <= ch && ch <= 1785 ? ArabicTypes[ch - 1536] : 1774 <= ch && ch <= 2220 ? 4 : 8192 <= ch && ch <= 8203 ? 256 : 64336 <= ch && ch <= 65023 ? 4 : ch == 8204 ? 256 : 1;
  }
  var BidiRE = /[\u0590-\u05f4\u0600-\u06ff\u0700-\u08ac\ufb50-\ufdff]/;
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
  function computeOrder(line2, direction) {
    let len = line2.length, outerType = direction == LTR ? 1 : 2, oppositeType = direction == LTR ? 2 : 1;
    if (!line2 || outerType == 1 && !BidiRE.test(line2))
      return trivialOrder(len);
    for (let i = 0, prev = outerType, prevStrong = outerType; i < len; i++) {
      let type = charType(line2.charCodeAt(i));
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
      if (br = Brackets[ch = line2.charCodeAt(i)]) {
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
  function moveVisually(line2, order, dir, start, forward) {
    var _a2;
    let startIndex = start.head - line2.from, spanI = -1;
    if (startIndex == 0) {
      if (!forward || !line2.length)
        return null;
      if (order[0].level != dir) {
        startIndex = order[0].side(false, dir);
        spanI = 0;
      }
    } else if (startIndex == line2.length) {
      if (forward)
        return null;
      let last = order[order.length - 1];
      if (last.level != dir) {
        startIndex = last.side(true, dir);
        spanI = order.length - 1;
      }
    }
    if (spanI < 0)
      spanI = BidiSpan.find(order, startIndex, (_a2 = start.bidiLevel) !== null && _a2 !== void 0 ? _a2 : -1, start.assoc);
    let span = order[spanI];
    if (startIndex == span.side(forward, dir)) {
      span = order[spanI += forward ? 1 : -1];
      startIndex = span.side(!forward, dir);
    }
    let indexForward = forward == (span.dir == dir);
    let nextIndex = findClusterBreak(line2.text, startIndex, indexForward);
    movedOver = line2.text.slice(Math.min(startIndex, nextIndex), Math.max(startIndex, nextIndex));
    if (nextIndex != span.side(forward, dir))
      return EditorSelection.cursor(nextIndex + line2.from, indexForward ? -1 : 1, span.level);
    let nextSpan = spanI == (forward ? order.length - 1 : 0) ? null : order[spanI + (forward ? 1 : -1)];
    if (!nextSpan && span.level != dir)
      return EditorSelection.cursor(forward ? line2.to : line2.from, forward ? -1 : 1, dir);
    if (nextSpan && nextSpan.level < span.level)
      return EditorSelection.cursor(nextSpan.side(!forward, dir) + line2.from, forward ? 1 : -1, nextSpan.level);
    return EditorSelection.cursor(nextIndex + line2.from, forward ? -1 : 1, span.level);
  }
  var LineBreakPlaceholder = "\uFFFF";
  var DOMReader = class {
    constructor(points, state) {
      this.points = points;
      this.text = "";
      this.lineSeparator = state.facet(EditorState.lineSeparator);
    }
    append(text) {
      this.text += text;
    }
    lineBreak() {
      this.text += LineBreakPlaceholder;
    }
    readRange(start, end) {
      if (!start)
        return this;
      let parent = start.parentNode;
      for (let cur = start; ; ) {
        this.findPointBefore(parent, cur);
        this.readNode(cur);
        let next3 = cur.nextSibling;
        if (next3 == end)
          break;
        let view = ContentView.get(cur), nextView = ContentView.get(next3);
        if (view && nextView ? view.breakAfter : (view ? view.breakAfter : isBlockElement(cur)) || isBlockElement(next3) && (cur.nodeName != "BR" || cur.cmIgnore))
          this.lineBreak();
        cur = next3;
      }
      this.findPointBefore(parent, end);
      return this;
    }
    readTextNode(node) {
      let text = node.nodeValue;
      for (let point of this.points)
        if (point.node == node)
          point.pos = this.text.length + Math.min(point.offset, text.length);
      for (let off = 0, re = this.lineSeparator ? null : /\r\n?|\n/g; ; ) {
        let nextBreak = -1, breakSize = 1, m;
        if (this.lineSeparator) {
          nextBreak = text.indexOf(this.lineSeparator, off);
          breakSize = this.lineSeparator.length;
        } else if (m = re.exec(text)) {
          nextBreak = m.index;
          breakSize = m[0].length;
        }
        this.append(text.slice(off, nextBreak < 0 ? text.length : nextBreak));
        if (nextBreak < 0)
          break;
        this.lineBreak();
        if (breakSize > 1) {
          for (let point of this.points)
            if (point.node == node && point.pos > this.text.length)
              point.pos -= breakSize - 1;
        }
        off = nextBreak + breakSize;
      }
    }
    readNode(node) {
      if (node.cmIgnore)
        return;
      let view = ContentView.get(node);
      let fromView = view && view.overrideDOMText;
      if (fromView != null) {
        this.findPointInside(node, fromView.length);
        for (let i = fromView.iter(); !i.next().done; ) {
          if (i.lineBreak)
            this.lineBreak();
          else
            this.append(i.value);
        }
      } else if (node.nodeType == 3) {
        this.readTextNode(node);
      } else if (node.nodeName == "BR") {
        if (node.nextSibling)
          this.lineBreak();
      } else if (node.nodeType == 1) {
        this.readRange(node.firstChild, null);
      }
    }
    findPointBefore(node, next3) {
      for (let point of this.points)
        if (point.node == node && node.childNodes[point.offset] == next3)
          point.pos = this.text.length;
    }
    findPointInside(node, maxLen) {
      for (let point of this.points)
        if (node.nodeType == 3 ? point.node == node : node.contains(point.node))
          point.pos = this.text.length + Math.min(maxLen, point.offset);
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
  var DocView = class extends ContentView {
    constructor(view) {
      super();
      this.view = view;
      this.compositionDeco = Decoration.none;
      this.decorations = [];
      this.dynamicDecorationMap = [];
      this.minWidth = 0;
      this.minWidthFrom = 0;
      this.minWidthTo = 0;
      this.impreciseAnchor = null;
      this.impreciseHead = null;
      this.forceSelection = false;
      this.lastUpdate = Date.now();
      this.setDOM(view.contentDOM);
      this.children = [new LineView()];
      this.children[0].setParent(this);
      this.updateDeco();
      this.updateInner([new ChangedRange(0, 0, 0, view.state.doc.length)], 0);
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
        if (!changedRanges.every(({ fromA, toA }) => toA < this.minWidthFrom || fromA > this.minWidthTo)) {
          this.minWidth = this.minWidthFrom = this.minWidthTo = 0;
        } else {
          this.minWidthFrom = update.changes.mapPos(this.minWidthFrom, 1);
          this.minWidthTo = update.changes.mapPos(this.minWidthTo, 1);
        }
      }
      if (this.view.inputState.composing < 0)
        this.compositionDeco = Decoration.none;
      else if (update.transactions.length || this.dirty)
        this.compositionDeco = computeCompositionDeco(this.view, update.changes);
      if ((browser.ie || browser.chrome) && !this.compositionDeco.size && update && update.state.doc.lines != update.startState.doc.lines)
        this.forceSelection = true;
      let prevDeco = this.decorations, deco = this.updateDeco();
      let decoDiff = findChangedDeco(prevDeco, deco, update.changes);
      changedRanges = ChangedRange.extendWithRanges(changedRanges, decoDiff);
      if (this.dirty == 0 && changedRanges.length == 0) {
        return false;
      } else {
        this.updateInner(changedRanges, update.startState.doc.length);
        if (update.transactions.length)
          this.lastUpdate = Date.now();
        return true;
      }
    }
    updateInner(changes, oldLength) {
      this.view.viewState.mustMeasureContent = true;
      this.updateChildren(changes, oldLength);
      let { observer } = this.view;
      observer.ignore(() => {
        this.dom.style.height = this.view.viewState.contentHeight + "px";
        this.dom.style.flexBasis = this.minWidth ? this.minWidth + "px" : "";
        let track = browser.chrome || browser.ios ? { node: observer.selectionRange.focusNode, written: false } : void 0;
        this.sync(track);
        this.dirty = 0;
        if (track && (track.written || observer.selectionRange.focusNode != track.node))
          this.forceSelection = true;
        this.dom.style.height = "";
      });
      let gaps = [];
      if (this.view.viewport.from || this.view.viewport.to < this.view.state.doc.length) {
        for (let child of this.children)
          if (child instanceof BlockWidgetView && child.widget instanceof BlockGapWidget)
            gaps.push(child.dom);
      }
      observer.updateGaps(gaps);
    }
    updateChildren(changes, oldLength) {
      let cursor2 = this.childCursor(oldLength);
      for (let i = changes.length - 1; ; i--) {
        let next3 = i >= 0 ? changes[i] : null;
        if (!next3)
          break;
        let { fromA, toA, fromB, toB } = next3;
        let { content: content2, breakAtStart, openStart, openEnd } = ContentBuilder.build(this.view.state.doc, fromB, toB, this.decorations, this.dynamicDecorationMap);
        let { i: toI, off: toOff } = cursor2.findPos(toA, 1);
        let { i: fromI, off: fromOff } = cursor2.findPos(fromA, -1);
        replaceRange(this, fromI, fromOff, toI, toOff, content2, breakAtStart, openStart, openEnd);
      }
    }
    updateSelection(mustRead = false, fromPointer = false) {
      if (mustRead || !this.view.observer.selectionRange.focusNode)
        this.view.observer.readSelectionRange();
      if (!(fromPointer || this.mayControlSelection()))
        return;
      let force = this.forceSelection;
      this.forceSelection = false;
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
      if (force || !domSel.focusNode || !isEquivalentPosition(anchor.node, anchor.offset, domSel.anchorNode, domSel.anchorOffset) || !isEquivalentPosition(head.node, head.offset, domSel.focusNode, domSel.focusOffset)) {
        this.view.observer.ignore(() => {
          if (browser.android && browser.chrome && this.dom.contains(domSel.focusNode) && inUneditable(domSel.focusNode, this.dom)) {
            this.dom.blur();
            this.dom.focus({ preventScroll: true });
          }
          let rawSel = getSelection(this.view.root);
          if (!rawSel)
            ;
          else if (main.empty) {
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
            try {
              rawSel.extend(head.node, head.offset);
            } catch (_) {
            }
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
      if (this.compositionDeco.size)
        return;
      let cursor2 = this.view.state.selection.main;
      let sel = getSelection(this.view.root);
      if (!sel || !cursor2.empty || !cursor2.assoc || !sel.modify)
        return;
      let line2 = LineView.find(this, cursor2.head);
      if (!line2)
        return;
      let lineStart = line2.posAtStart;
      if (cursor2.head == lineStart || cursor2.head == lineStart + line2.length)
        return;
      let before = this.coordsAt(cursor2.head, -1), after = this.coordsAt(cursor2.head, 1);
      if (!before || !after || before.bottom > after.top)
        return;
      let dom = this.domAtPos(cursor2.head + cursor2.assoc);
      sel.collapse(dom.node, dom.offset);
      sel.modify("move", cursor2.assoc < 0 ? "forward" : "backward", "lineboundary");
    }
    mayControlSelection() {
      let active = this.view.root.activeElement;
      return active == this.dom || hasSelection(this.dom, this.view.observer.selectionRange) && !(active && this.dom.contains(active));
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
      let { i, off } = this.childCursor().findPos(pos, -1);
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
        if (pos > start || pos == start && child.type != BlockType.WidgetBefore && child.type != BlockType.WidgetAfter && (!i || side == 2 || this.children[i - 1].breakAfter || this.children[i - 1].type == BlockType.WidgetBefore && side > -2))
          return child.coordsAt(pos - start, side);
        off = start;
      }
    }
    measureVisibleLineHeights(viewport) {
      let result = [], { from, to } = viewport;
      let contentWidth = this.view.contentDOM.clientWidth;
      let isWider = contentWidth > Math.max(this.view.scrollDOM.clientWidth, this.minWidth) + 1;
      let widest = -1, ltr = this.view.textDirection == Direction.LTR;
      for (let pos = 0, i = 0; i < this.children.length; i++) {
        let child = this.children[i], end = pos + child.length;
        if (end > to)
          break;
        if (pos >= from) {
          let childRect = child.dom.getBoundingClientRect();
          result.push(childRect.height);
          if (isWider) {
            let last = child.dom.lastChild;
            let rects = last ? clientRectsFor(last) : [];
            if (rects.length) {
              let rect = rects[rects.length - 1];
              let width = ltr ? rect.right - childRect.left : childRect.right - rect.left;
              if (width > widest) {
                widest = width;
                this.minWidth = contentWidth;
                this.minWidthFrom = pos;
                this.minWidthTo = end;
              }
            }
          }
        }
        pos = end + child.breakAfter;
      }
      return result;
    }
    textDirectionAt(pos) {
      let { i } = this.childPos(pos, 1);
      return getComputedStyle(this.children[i].dom).direction == "rtl" ? Direction.RTL : Direction.LTR;
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
      dummy.style.width = "99999px";
      dummy.textContent = "abc def ghi jkl mno pqr stu";
      this.view.observer.ignore(() => {
        this.dom.appendChild(dummy);
        let rect = clientRectsFor(dummy.firstChild)[0];
        lineHeight = dummy.getBoundingClientRect().height;
        charWidth = rect ? rect.width / 27 : 7;
        dummy.remove();
      });
      return { lineHeight, charWidth };
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
        let next3 = i == vs.viewports.length ? null : vs.viewports[i];
        let end = next3 ? next3.from - 1 : this.length;
        if (end > pos) {
          let height = vs.lineBlockAt(end).bottom - vs.lineBlockAt(pos).top;
          deco.push(Decoration.replace({
            widget: new BlockGapWidget(height),
            block: true,
            inclusive: true,
            isBlockGap: true
          }).range(pos, end));
        }
        if (!next3)
          break;
        pos = next3.to + 1;
      }
      return Decoration.set(deco);
    }
    updateDeco() {
      let allDeco = this.view.state.facet(decorations).map((d, i) => {
        let dynamic = this.dynamicDecorationMap[i] = typeof d == "function";
        return dynamic ? d(this.view) : d;
      });
      for (let i = allDeco.length; i < allDeco.length + 3; i++)
        this.dynamicDecorationMap[i] = false;
      return this.decorations = [
        ...allDeco,
        this.compositionDeco,
        this.computeBlockGapDeco(),
        this.view.viewState.lineGapDeco
      ];
    }
    scrollIntoView(target) {
      let { range } = target;
      let rect = this.coordsAt(range.head, range.empty ? range.assoc : range.head > range.anchor ? -1 : 1), other;
      if (!rect)
        return;
      if (!range.empty && (other = this.coordsAt(range.anchor, range.anchor > range.head ? -1 : 1)))
        rect = {
          left: Math.min(rect.left, other.left),
          top: Math.min(rect.top, other.top),
          right: Math.max(rect.right, other.right),
          bottom: Math.max(rect.bottom, other.bottom)
        };
      let mLeft = 0, mRight = 0, mTop = 0, mBottom = 0;
      for (let margins of this.view.state.facet(scrollMargins).map((f) => f(this.view)))
        if (margins) {
          let { left, right, top: top2, bottom } = margins;
          if (left != null)
            mLeft = Math.max(mLeft, left);
          if (right != null)
            mRight = Math.max(mRight, right);
          if (top2 != null)
            mTop = Math.max(mTop, top2);
          if (bottom != null)
            mBottom = Math.max(mBottom, bottom);
        }
      let targetRect = {
        left: rect.left - mLeft,
        top: rect.top - mTop,
        right: rect.right + mRight,
        bottom: rect.bottom + mBottom
      };
      scrollRectIntoView(this.view.scrollDOM, targetRect, range.head < range.anchor ? -1 : 1, target.x, target.y, target.xMargin, target.yMargin, this.view.textDirection == Direction.LTR);
    }
  };
  function betweenUneditable(pos) {
    return pos.node.nodeType == 1 && pos.node.firstChild && (pos.offset == 0 || pos.node.childNodes[pos.offset - 1].contentEditable == "false") && (pos.offset == pos.node.childNodes.length || pos.node.childNodes[pos.offset].contentEditable == "false");
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
  function compositionSurroundingNode(view) {
    let sel = view.observer.selectionRange;
    let textNode = sel.focusNode && nearbyTextNode(sel.focusNode, sel.focusOffset, 0);
    if (!textNode)
      return null;
    let cView = view.docView.nearest(textNode);
    if (!cView)
      return null;
    if (cView instanceof LineView) {
      let topNode = textNode;
      while (topNode.parentNode != cView.dom)
        topNode = topNode.parentNode;
      let prev = topNode.previousSibling;
      while (prev && !ContentView.get(prev))
        prev = prev.previousSibling;
      let pos = prev ? ContentView.get(prev).posAtEnd : cView.posAtStart;
      return { from: pos, to: pos, node: topNode, text: textNode };
    } else {
      for (; ; ) {
        let { parent } = cView;
        if (!parent)
          return null;
        if (parent instanceof LineView)
          break;
        cView = parent;
      }
      let from = cView.posAtStart;
      return { from, to: from + cView.length, node: cView.dom, text: textNode };
    }
  }
  function computeCompositionDeco(view, changes) {
    let surrounding = compositionSurroundingNode(view);
    if (!surrounding)
      return Decoration.none;
    let { from, to, node, text: textNode } = surrounding;
    let newFrom = changes.mapPos(from, 1), newTo = Math.max(newFrom, changes.mapPos(to, -1));
    let { state } = view, text = node.nodeType == 3 ? node.nodeValue : new DOMReader([], state).readRange(node.firstChild, null).text;
    if (newTo - newFrom < text.length) {
      if (state.doc.sliceString(newFrom, Math.min(state.doc.length, newFrom + text.length), LineBreakPlaceholder) == text)
        newTo = newFrom + text.length;
      else if (state.doc.sliceString(Math.max(0, newTo - text.length), newTo, LineBreakPlaceholder) == text)
        newFrom = newTo - text.length;
      else
        return Decoration.none;
    } else if (state.doc.sliceString(newFrom, newTo, LineBreakPlaceholder) != text) {
      return Decoration.none;
    }
    let topView = ContentView.get(node);
    if (topView instanceof CompositionView)
      topView = topView.widget.topView;
    else if (topView)
      topView.parent = null;
    return Decoration.set(Decoration.replace({ widget: new CompositionWidget(node, textNode, topView), inclusive: true }).range(newFrom, newTo));
  }
  var CompositionWidget = class extends WidgetType {
    constructor(top2, text, topView) {
      super();
      this.top = top2;
      this.text = text;
      this.topView = topView;
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
  function inUneditable(node, inside2) {
    for (let cur = node; cur && cur != inside2; cur = cur.assignedSlot || cur.parentNode) {
      if (cur.nodeType == 1 && cur.contentEditable == "false") {
        return true;
      }
    }
    return false;
  }
  function groupAt(state, pos, bias = 1) {
    let categorize = state.charCategorizer(pos);
    let line2 = state.doc.lineAt(pos), linePos = pos - line2.from;
    if (line2.length == 0)
      return EditorSelection.cursor(pos);
    if (linePos == 0)
      bias = 1;
    else if (linePos == line2.length)
      bias = -1;
    let from = linePos, to = linePos;
    if (bias < 0)
      from = findClusterBreak(line2.text, linePos, false);
    else
      to = findClusterBreak(line2.text, linePos);
    let cat = categorize(line2.text.slice(from, to));
    while (from > 0) {
      let prev = findClusterBreak(line2.text, from, false);
      if (categorize(line2.text.slice(prev, from)) != cat)
        break;
      from = prev;
    }
    while (to < line2.length) {
      let next3 = findClusterBreak(line2.text, to);
      if (categorize(line2.text.slice(to, next3)) != cat)
        break;
      to = next3;
    }
    return EditorSelection.range(from + line2.from, to + line2.from);
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
    return top2 < rect.top ? { top: top2, left: rect.left, right: rect.right, bottom: rect.bottom } : rect;
  }
  function upBot(rect, bottom) {
    return bottom > rect.bottom ? { top: rect.top, left: rect.left, right: rect.right, bottom } : rect;
  }
  function domPosAtCoords(parent, x, y) {
    let closest, closestRect, closestX, closestY, closestOverlap = false;
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
          closestOverlap = !dx || (dx > 0 ? i < rects.length - 1 : i > 0);
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
      return { node: parent, offset: 0 };
    let clipX = Math.max(closestRect.left, Math.min(closestRect.right, x));
    if (closest.nodeType == 3)
      return domPosInText(closest, clipX, y);
    if (closestOverlap && closest.contentEditable != "false")
      return domPosAtCoords(closest, clipX, y);
    let offset = Array.prototype.indexOf.call(parent.childNodes, closest) + (x >= (closestRect.left + closestRect.right) / 2 ? 1 : 0);
    return { node: parent, offset };
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
            return { node, offset: i + (after ? 1 : 0) };
          closestOffset = i + (after ? 1 : 0);
          closestDY = dy;
        }
      }
    }
    return { node, offset: closestOffset > -1 ? closestOffset : generalSide > 0 ? node.nodeValue.length : 0 };
  }
  function posAtCoords(view, { x, y }, precise, bias = -1) {
    var _a2;
    let content2 = view.contentDOM.getBoundingClientRect(), docTop = content2.top + view.viewState.paddingTop;
    let block, { docHeight } = view.viewState;
    let yOffset = y - docTop;
    if (yOffset < 0)
      return 0;
    if (yOffset > docHeight)
      return view.state.doc.length;
    for (let halfLine = view.defaultLineHeight / 2, bounced = false; ; ) {
      block = view.elementAtHeight(yOffset);
      if (block.type == BlockType.Text)
        break;
      for (; ; ) {
        yOffset = bias > 0 ? block.bottom + halfLine : block.top - halfLine;
        if (yOffset >= 0 && yOffset <= docHeight)
          break;
        if (bounced)
          return precise ? null : 0;
        bounced = true;
        bias = -bias;
      }
    }
    y = docTop + yOffset;
    let lineStart = block.from;
    if (lineStart < view.viewport.from)
      return view.viewport.from == 0 ? 0 : precise ? null : posAtCoordsImprecise(view, content2, block, x, y);
    if (lineStart > view.viewport.to)
      return view.viewport.to == view.state.doc.length ? view.state.doc.length : precise ? null : posAtCoordsImprecise(view, content2, block, x, y);
    let doc2 = view.dom.ownerDocument;
    let root = view.root.elementFromPoint ? view.root : doc2;
    let element = root.elementFromPoint(x, y);
    if (element && !view.contentDOM.contains(element))
      element = null;
    if (!element) {
      x = Math.max(content2.left + 1, Math.min(content2.right - 1, x));
      element = root.elementFromPoint(x, y);
      if (element && !view.contentDOM.contains(element))
        element = null;
    }
    let node, offset = -1;
    if (element && ((_a2 = view.docView.nearest(element)) === null || _a2 === void 0 ? void 0 : _a2.isEditable) != false) {
      if (doc2.caretPositionFromPoint) {
        let pos = doc2.caretPositionFromPoint(x, y);
        if (pos)
          ({ offsetNode: node, offset } = pos);
      } else if (doc2.caretRangeFromPoint) {
        let range = doc2.caretRangeFromPoint(x, y);
        if (range) {
          ({ startContainer: node, startOffset: offset } = range);
          if (!view.contentDOM.contains(node) || browser.safari && isSuspiciousSafariCaretResult(node, offset, x) || browser.chrome && isSuspiciousChromeCaretResult(node, offset, x))
            node = void 0;
        }
      }
    }
    if (!node || !view.docView.dom.contains(node)) {
      let line2 = LineView.find(view.docView, lineStart);
      if (!line2)
        return yOffset > block.top + block.height / 2 ? block.to : block.from;
      ({ node, offset } = domPosAtCoords(line2.dom, x, y));
    }
    return view.docView.posFromDOM(node, offset);
  }
  function posAtCoordsImprecise(view, contentRect, block, x, y) {
    let into = Math.round((x - contentRect.left) * view.defaultCharacterWidth);
    if (view.lineWrapping && block.height > view.defaultLineHeight * 1.5) {
      let line2 = Math.floor((y - block.top) / view.defaultLineHeight);
      into += line2 * view.viewState.heightOracle.lineLength;
    }
    let content2 = view.state.sliceDoc(block.from, block.to);
    return block.from + findColumn(content2, into, view.state.tabSize);
  }
  function isSuspiciousSafariCaretResult(node, offset, x) {
    let len;
    if (node.nodeType != 3 || offset != (len = node.nodeValue.length))
      return false;
    for (let next3 = node.nextSibling; next3; next3 = next3.nextSibling)
      if (next3.nodeType != 1 || next3.nodeName != "BR")
        return false;
    return textRange(node, len - 1, len).getBoundingClientRect().left > x;
  }
  function isSuspiciousChromeCaretResult(node, offset, x) {
    if (offset != 0)
      return false;
    for (let cur = node; ; ) {
      let parent = cur.parentNode;
      if (!parent || parent.nodeType != 1 || parent.firstChild != cur)
        return false;
      if (parent.classList.contains("cm-line"))
        break;
      cur = parent;
    }
    let rect = node.nodeType == 1 ? node.getBoundingClientRect() : textRange(node, 0, Math.max(node.nodeValue.length, 1)).getBoundingClientRect();
    return x - rect.left > 5;
  }
  function moveToLineBoundary(view, start, forward, includeWrap) {
    let line2 = view.state.doc.lineAt(start.head);
    let coords = !includeWrap || !view.lineWrapping ? null : view.coordsAtPos(start.assoc < 0 && start.head > line2.from ? start.head - 1 : start.head);
    if (coords) {
      let editorRect = view.dom.getBoundingClientRect();
      let direction = view.textDirectionAt(line2.from);
      let pos = view.posAtCoords({
        x: forward == (direction == Direction.LTR) ? editorRect.right - 1 : editorRect.left + 1,
        y: (coords.top + coords.bottom) / 2
      });
      if (pos != null)
        return EditorSelection.cursor(pos, forward ? -1 : 1);
    }
    let lineView = LineView.find(view.docView, start.head);
    let end = lineView ? forward ? lineView.posAtEnd : lineView.posAtStart : forward ? line2.to : line2.from;
    return EditorSelection.cursor(end, forward ? -1 : 1);
  }
  function moveByChar(view, start, forward, by) {
    let line2 = view.state.doc.lineAt(start.head), spans = view.bidiSpans(line2);
    let direction = view.textDirectionAt(line2.from);
    for (let cur = start, check = null; ; ) {
      let next3 = moveVisually(line2, spans, direction, cur, forward), char = movedOver;
      if (!next3) {
        if (line2.number == (forward ? view.state.doc.lines : 1))
          return cur;
        char = "\n";
        line2 = view.state.doc.line(line2.number + (forward ? 1 : -1));
        spans = view.bidiSpans(line2);
        next3 = EditorSelection.cursor(forward ? line2.from : line2.to);
      }
      if (!check) {
        if (!by)
          return next3;
        check = by(char);
      } else if (!check(char)) {
        return cur;
      }
      cur = next3;
    }
  }
  function byGroup(view, pos, start) {
    let categorize = view.state.charCategorizer(pos);
    let cat = categorize(start);
    return (next3) => {
      let nextCat = categorize(next3);
      if (cat == CharCategory.Space)
        cat = nextCat;
      return cat == nextCat;
    };
  }
  function moveVertically(view, start, forward, distance) {
    let startPos = start.head, dir = forward ? 1 : -1;
    if (startPos == (forward ? view.state.doc.length : 0))
      return EditorSelection.cursor(startPos, start.assoc);
    let goal = start.goalColumn, startY;
    let rect = view.contentDOM.getBoundingClientRect();
    let startCoords = view.coordsAtPos(startPos), docTop = view.documentTop;
    if (startCoords) {
      if (goal == null)
        goal = startCoords.left - rect.left;
      startY = dir < 0 ? startCoords.top : startCoords.bottom;
    } else {
      let line2 = view.viewState.lineBlockAt(startPos);
      if (goal == null)
        goal = Math.min(rect.right - rect.left, view.defaultCharacterWidth * (startPos - line2.from));
      startY = (dir < 0 ? line2.top : line2.bottom) + docTop;
    }
    let resolvedGoal = rect.left + goal;
    let dist = distance !== null && distance !== void 0 ? distance : view.defaultLineHeight >> 1;
    for (let extra = 0; ; extra += 10) {
      let curY = startY + (dist + extra) * dir;
      let pos = posAtCoords(view, { x: resolvedGoal, y: curY }, false, dir);
      if (curY < rect.top || curY > rect.bottom || (dir < 0 ? pos < startPos : pos > startPos))
        return EditorSelection.cursor(pos, start.assoc, void 0, goal);
    }
  }
  function skipAtoms(view, oldPos, pos) {
    let atoms = view.state.facet(atomicRanges).map((f) => f(view));
    for (; ; ) {
      let moved = false;
      for (let set of atoms) {
        set.between(pos.from - 1, pos.from + 1, (from, to, value) => {
          if (pos.from > from && pos.from < to) {
            pos = oldPos.head > pos.from ? EditorSelection.cursor(from, 1) : EditorSelection.cursor(to, -1);
            moved = true;
          }
        });
      }
      if (!moved)
        return pos;
    }
  }
  var InputState = class {
    constructor(view) {
      this.lastKeyCode = 0;
      this.lastKeyTime = 0;
      this.lastTouchTime = 0;
      this.lastFocusTime = 0;
      this.lastScrollTop = 0;
      this.lastScrollLeft = 0;
      this.chromeScrollHack = -1;
      this.pendingIOSKey = void 0;
      this.lastSelectionOrigin = null;
      this.lastSelectionTime = 0;
      this.lastEscPress = 0;
      this.lastContextMenu = 0;
      this.scrollHandlers = [];
      this.registeredEvents = [];
      this.customHandlers = [];
      this.composing = -1;
      this.compositionFirstChange = null;
      this.compositionEndedAt = 0;
      this.mouseSelection = null;
      for (let type in handlers) {
        let handler = handlers[type];
        view.contentDOM.addEventListener(type, (event) => {
          if (!eventBelongsToEditor(view, event) || this.ignoreDuringComposition(event))
            return;
          if (type == "keydown" && this.keydown(view, event))
            return;
          if (this.mustFlushObserver(event))
            view.observer.forceFlush();
          if (this.runCustomHandlers(type, view, event))
            event.preventDefault();
          else
            handler(view, event);
        }, handlerOptions[type]);
        this.registeredEvents.push(type);
      }
      if (browser.chrome && browser.chrome_version == 102) {
        view.scrollDOM.addEventListener("wheel", () => {
          if (this.chromeScrollHack < 0)
            view.contentDOM.style.pointerEvents = "none";
          else
            window.clearTimeout(this.chromeScrollHack);
          this.chromeScrollHack = setTimeout(() => {
            this.chromeScrollHack = -1;
            view.contentDOM.style.pointerEvents = "";
          }, 100);
        }, { passive: true });
      }
      this.notifiedFocused = view.hasFocus;
      if (browser.safari)
        view.contentDOM.addEventListener("input", () => null);
    }
    setSelectionOrigin(origin) {
      this.lastSelectionOrigin = origin;
      this.lastSelectionTime = Date.now();
    }
    ensureHandlers(view, plugins) {
      var _a2;
      let handlers2;
      this.customHandlers = [];
      for (let plugin of plugins)
        if (handlers2 = (_a2 = plugin.update(view).spec) === null || _a2 === void 0 ? void 0 : _a2.domEventHandlers) {
          this.customHandlers.push({ plugin: plugin.value, handlers: handlers2 });
          for (let type in handlers2)
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
        let handler = set.handlers[type];
        if (handler) {
          try {
            if (handler.call(set.plugin, event, view) || event.defaultPrevented)
              return true;
          } catch (e) {
            logException(view.state, e);
          }
        }
      }
      return false;
    }
    runScrollHandlers(view, event) {
      this.lastScrollTop = view.scrollDOM.scrollTop;
      this.lastScrollLeft = view.scrollDOM.scrollLeft;
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
      if (event.keyCode == 9 && Date.now() < this.lastEscPress + 2e3)
        return true;
      if (browser.android && browser.chrome && !event.synthetic && (event.keyCode == 13 || event.keyCode == 8)) {
        view.observer.delayAndroidKey(event.key, event.keyCode);
        return true;
      }
      let pending;
      if (browser.ios && !event.synthetic && !event.altKey && !event.metaKey && ((pending = PendingKeys.find((key) => key.keyCode == event.keyCode)) && !event.ctrlKey || EmacsyPendingKeys.indexOf(event.key) > -1 && event.ctrlKey && !event.shiftKey)) {
        this.pendingIOSKey = pending || event;
        setTimeout(() => this.flushIOSKey(view), 250);
        return true;
      }
      return false;
    }
    flushIOSKey(view) {
      let key = this.pendingIOSKey;
      if (!key)
        return false;
      this.pendingIOSKey = void 0;
      return dispatchKey(view.contentDOM, key.key, key.keyCode);
    }
    ignoreDuringComposition(event) {
      if (!/^key/.test(event.type))
        return false;
      if (this.composing > 0)
        return true;
      if (browser.safari && !browser.ios && Date.now() - this.compositionEndedAt < 100) {
        this.compositionEndedAt = 0;
        return true;
      }
      return false;
    }
    mustFlushObserver(event) {
      return event.type == "keydown" && event.keyCode != 229;
    }
    startMouseSelection(mouseSelection) {
      if (this.mouseSelection)
        this.mouseSelection.destroy();
      this.mouseSelection = mouseSelection;
    }
    update(update) {
      if (this.mouseSelection)
        this.mouseSelection.update(update);
      if (update.transactions.length)
        this.lastKeyCode = this.lastSelectionTime = 0;
    }
    destroy() {
      if (this.mouseSelection)
        this.mouseSelection.destroy();
    }
  };
  var PendingKeys = [
    { key: "Backspace", keyCode: 8, inputType: "deleteContentBackward" },
    { key: "Enter", keyCode: 13, inputType: "insertParagraph" },
    { key: "Delete", keyCode: 46, inputType: "deleteContentForward" }
  ];
  var EmacsyPendingKeys = "dthko";
  var modifierCodes = [16, 17, 18, 20, 91, 92, 224, 225];
  var MouseSelection = class {
    constructor(view, startEvent, style, mustSelect) {
      this.view = view;
      this.style = style;
      this.mustSelect = mustSelect;
      this.lastEvent = startEvent;
      let doc2 = view.contentDOM.ownerDocument;
      doc2.addEventListener("mousemove", this.move = this.move.bind(this));
      doc2.addEventListener("mouseup", this.up = this.up.bind(this));
      this.extend = startEvent.shiftKey;
      this.multiple = view.state.facet(EditorState.allowMultipleSelections) && addsSelectionRange(view, startEvent);
      this.dragMove = dragMovesSelection(view, startEvent);
      this.dragging = isInPrimarySelection(view, startEvent) && getClickType(startEvent) == 1 ? null : false;
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
      this.select(this.lastEvent = event);
    }
    up(event) {
      if (this.dragging == null)
        this.select(this.lastEvent);
      if (!this.dragging)
        event.preventDefault();
      this.destroy();
    }
    destroy() {
      let doc2 = this.view.contentDOM.ownerDocument;
      doc2.removeEventListener("mousemove", this.move);
      doc2.removeEventListener("mouseup", this.up);
      this.view.inputState.mouseSelection = null;
    }
    select(event) {
      let selection2 = this.style.get(event, this.extend, this.multiple);
      if (this.mustSelect || !selection2.eq(this.view.state.selection) || selection2.main.assoc != this.view.state.selection.main.assoc)
        this.view.dispatch({
          selection: selection2,
          userEvent: "select.pointer",
          scrollIntoView: true
        });
      this.mustSelect = false;
    }
    update(update) {
      if (update.docChanged && this.dragging)
        this.dragging = this.dragging.map(update.changes);
      if (this.style.update(update))
        setTimeout(() => this.select(this.lastEvent), 20);
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
    let { main } = view.state.selection;
    if (main.empty)
      return false;
    let sel = getSelection(view.root);
    if (!sel || sel.rangeCount == 0)
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
  var handlerOptions = /* @__PURE__ */ Object.create(null);
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
    let { state } = view, changes, i = 1, text = state.toText(input);
    let byLine = text.lines == state.selection.ranges.length;
    let linewise = lastLinewiseCopy != null && state.selection.ranges.every((r) => r.empty) && lastLinewiseCopy == text.toString();
    if (linewise) {
      let lastLine = -1;
      changes = state.changeByRange((range) => {
        let line2 = state.doc.lineAt(range.from);
        if (line2.from == lastLine)
          return { range };
        lastLine = line2.from;
        let insert2 = state.toText((byLine ? text.line(i++).text : input) + state.lineBreak);
        return {
          changes: { from: line2.from, insert: insert2 },
          range: EditorSelection.cursor(range.from + insert2.length)
        };
      });
    } else if (byLine) {
      changes = state.changeByRange((range) => {
        let line2 = text.line(i++);
        return {
          changes: { from: range.from, to: range.to, insert: line2.text },
          range: EditorSelection.cursor(range.from + line2.length)
        };
      });
    } else {
      changes = state.replaceSelection(text);
    }
    view.dispatch(changes, {
      userEvent: "input.paste",
      scrollIntoView: true
    });
  }
  handlers.keydown = (view, event) => {
    view.inputState.setSelectionOrigin("select");
    if (event.keyCode == 27)
      view.inputState.lastEscPress = Date.now();
    else if (modifierCodes.indexOf(event.keyCode) < 0)
      view.inputState.lastEscPress = 0;
  };
  handlers.touchstart = (view, e) => {
    view.inputState.lastTouchTime = Date.now();
    view.inputState.setSelectionOrigin("select.pointer");
  };
  handlers.touchmove = (view) => {
    view.inputState.setSelectionOrigin("select.pointer");
  };
  handlerOptions.touchstart = handlerOptions.touchmove = { passive: true };
  handlers.mousedown = (view, event) => {
    view.observer.flush();
    if (view.inputState.lastTouchTime > Date.now() - 2e3)
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
      let mustFocus = view.root.activeElement != view.contentDOM;
      if (mustFocus)
        view.observer.ignore(() => focusPreventScroll(view.contentDOM));
      view.inputState.startMouseSelection(new MouseSelection(view, event, style, mustFocus));
    }
  };
  function rangeForClick(view, pos, bias, type) {
    if (type == 1) {
      return EditorSelection.cursor(pos, bias);
    } else if (type == 2) {
      return groupAt(view.state, pos, bias);
    } else {
      let visual = LineView.find(view.docView, pos), line2 = view.state.doc.lineAt(visual ? visual.posAtEnd : pos);
      let from = visual ? visual.posAtStart : line2.from, to = visual ? visual.posAtEnd : line2.to;
      if (to < view.state.doc.length && to == line2.to)
        to++;
      return EditorSelection.range(from, to);
    }
  }
  var insideY = (y, rect) => y >= rect.top && y <= rect.bottom;
  var inside = (x, y, rect) => insideY(y, rect) && x >= rect.left && x <= rect.right;
  function findPositionSide(view, pos, x, y) {
    let line2 = LineView.find(view.docView, pos);
    if (!line2)
      return 1;
    let off = pos - line2.posAtStart;
    if (off == 0)
      return 1;
    if (off == line2.length)
      return -1;
    let before = line2.coordsAt(off, -1);
    if (before && inside(x, y, before))
      return -1;
    let after = line2.coordsAt(off, 1);
    if (after && inside(x, y, after))
      return 1;
    return before && insideY(y, before) ? -1 : 1;
  }
  function queryPos(view, event) {
    let pos = view.posAtCoords({ x: event.clientX, y: event.clientY }, false);
    return { pos, bias: findPositionSide(view, pos, event.clientX, event.clientY) };
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
        if (update.docChanged) {
          start.pos = update.changes.mapPos(start.pos);
          startSel = startSel.map(update.changes);
          lastEvent = null;
        }
      },
      get(event2, extend2, multiple) {
        let cur;
        if (lastEvent && event2.clientX == lastEvent.clientX && event2.clientY == lastEvent.clientY)
          cur = last;
        else {
          cur = last = queryPos(view, event2);
          lastEvent = event2;
        }
        let range = rangeForClick(view, cur.pos, cur.bias, type);
        if (start.pos != cur.pos && !extend2) {
          let startRange = rangeForClick(view, start.pos, start.bias, type);
          let from = Math.min(startRange.from, range.from), to = Math.max(startRange.to, range.to);
          range = from < range.from ? EditorSelection.range(from, to) : EditorSelection.range(to, from);
        }
        if (extend2)
          return startSel.replaceRange(startSel.main.extend(range.from, range.to));
        else if (multiple && startSel.ranges.length > 1 && startSel.ranges.some((r) => r.eq(range)))
          return removeRange(startSel, range);
        else if (multiple)
          return startSel.addRange(range);
        else
          return EditorSelection.create([range]);
      }
    };
  }
  function removeRange(sel, range) {
    for (let i = 0; ; i++) {
      if (sel.ranges[i].eq(range))
        return EditorSelection.create(sel.ranges.slice(0, i).concat(sel.ranges.slice(i + 1)), sel.mainIndex == i ? 0 : sel.mainIndex - (sel.mainIndex > i ? 1 : 0));
    }
  }
  handlers.dragstart = (view, event) => {
    let { selection: { main } } = view.state;
    let { mouseSelection } = view.inputState;
    if (mouseSelection)
      mouseSelection.dragging = main;
    if (event.dataTransfer) {
      event.dataTransfer.setData("Text", view.state.sliceDoc(main.from, main.to));
      event.dataTransfer.effectAllowed = "copyMove";
    }
  };
  function dropText(view, event, text, direct) {
    if (!text)
      return;
    let dropPos = view.posAtCoords({ x: event.clientX, y: event.clientY }, false);
    event.preventDefault();
    let { mouseSelection } = view.inputState;
    let del = direct && mouseSelection && mouseSelection.dragging && mouseSelection.dragMove ? { from: mouseSelection.dragging.from, to: mouseSelection.dragging.to } : null;
    let ins = { from: dropPos, insert: text };
    let changes = view.state.changes(del ? [del, ins] : ins);
    view.focus();
    view.dispatch({
      changes,
      selection: { anchor: changes.mapPos(dropPos, -1), head: changes.mapPos(dropPos, 1) },
      userEvent: del ? "move.drop" : "input.drop"
    });
  }
  handlers.drop = (view, event) => {
    if (!event.dataTransfer)
      return;
    if (view.state.readOnly)
      return event.preventDefault();
    let files = event.dataTransfer.files;
    if (files && files.length) {
      event.preventDefault();
      let text = Array(files.length), read = 0;
      let finishFile = () => {
        if (++read == files.length)
          dropText(view, event, text.filter((s) => s != null).join(view.state.lineBreak), false);
      };
      for (let i = 0; i < files.length; i++) {
        let reader = new FileReader();
        reader.onerror = finishFile;
        reader.onload = () => {
          if (!/[\x00-\x08\x0e-\x1f]{2}/.test(reader.result))
            text[i] = reader.result;
          finishFile();
        };
        reader.readAsText(files[i]);
      }
    } else {
      dropText(view, event, event.dataTransfer.getData("Text"), true);
    }
  };
  handlers.paste = (view, event) => {
    if (view.state.readOnly)
      return event.preventDefault();
    view.observer.flush();
    let data = brokenClipboardAPI ? null : event.clipboardData;
    if (data) {
      doPaste(view, data.getData("text/plain"));
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
      for (let { from } of state.selection.ranges) {
        let line2 = state.doc.lineAt(from);
        if (line2.number > upto) {
          content2.push(line2.text);
          ranges.push({ from: line2.from, to: Math.min(state.doc.length, line2.to + 1) });
        }
        upto = line2.number;
      }
      linewise = true;
    }
    return { text: content2.join(state.lineBreak), ranges, linewise };
  }
  var lastLinewiseCopy = null;
  handlers.copy = handlers.cut = (view, event) => {
    let { text, ranges, linewise } = copiedRange(view.state);
    if (!text && !linewise)
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
    if (event.type == "cut" && !view.state.readOnly)
      view.dispatch({
        changes: ranges,
        scrollIntoView: true,
        userEvent: "delete.cut"
      });
  };
  function updateForFocusChange(view) {
    setTimeout(() => {
      if (view.hasFocus != view.inputState.notifiedFocused)
        view.update([]);
    }, 10);
  }
  handlers.focus = (view) => {
    view.inputState.lastFocusTime = Date.now();
    if (!view.scrollDOM.scrollTop && (view.inputState.lastScrollTop || view.inputState.lastScrollLeft)) {
      view.scrollDOM.scrollTop = view.inputState.lastScrollTop;
      view.scrollDOM.scrollLeft = view.inputState.lastScrollLeft;
    }
    updateForFocusChange(view);
  };
  handlers.blur = (view) => {
    view.observer.clearSelectionRange();
    updateForFocusChange(view);
  };
  handlers.compositionstart = handlers.compositionupdate = (view) => {
    if (view.inputState.compositionFirstChange == null)
      view.inputState.compositionFirstChange = true;
    if (view.inputState.composing < 0) {
      view.inputState.composing = 0;
    }
  };
  handlers.compositionend = (view) => {
    view.inputState.composing = -1;
    view.inputState.compositionEndedAt = Date.now();
    view.inputState.compositionFirstChange = null;
    if (browser.chrome && browser.android)
      view.observer.flushSoon();
    setTimeout(() => {
      if (view.inputState.composing < 0 && view.docView.compositionDeco.size)
        view.update([]);
    }, 50);
  };
  handlers.contextmenu = (view) => {
    view.inputState.lastContextMenu = Date.now();
  };
  handlers.beforeinput = (view, event) => {
    var _a2;
    let pending;
    if (browser.chrome && browser.android && (pending = PendingKeys.find((key) => key.inputType == event.inputType))) {
      view.observer.delayAndroidKey(pending.key, pending.keyCode);
      if (pending.key == "Backspace" || pending.key == "Delete") {
        let startViewHeight = ((_a2 = window.visualViewport) === null || _a2 === void 0 ? void 0 : _a2.height) || 0;
        setTimeout(() => {
          var _a3;
          if ((((_a3 = window.visualViewport) === null || _a3 === void 0 ? void 0 : _a3.height) || 0) > startViewHeight + 10 && view.hasFocus) {
            view.contentDOM.blur();
            view.focus();
          }
        }, 100);
      }
    }
  };
  var wrappingWhiteSpace = ["pre-wrap", "normal", "pre-line", "break-spaces"];
  var HeightOracle = class {
    constructor() {
      this.doc = Text.empty;
      this.lineWrapping = false;
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
    mustRefreshForWrapping(whiteSpace) {
      return wrappingWhiteSpace.indexOf(whiteSpace) > -1 != this.lineWrapping;
    }
    mustRefreshForHeights(lineHeights) {
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
      return newHeight;
    }
    refresh(whiteSpace, lineHeight, charWidth, lineLength, knownHeights) {
      let lineWrapping = wrappingWhiteSpace.indexOf(whiteSpace) > -1;
      let changed = Math.round(lineHeight) != Math.round(this.lineHeight) || this.lineWrapping != lineWrapping;
      this.lineWrapping = lineWrapping;
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
  var Epsilon = 1e-3;
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
        let { fromA, toA, fromB, toB } = changes[i];
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
          let next3 = nodes[i++];
          if (next3)
            before += next3.size;
        } else {
          let next3 = nodes[--j];
          if (next3)
            after += next3.size;
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
    forEachLine(from, to, doc2, top2, offset, f) {
      if (from <= offset + this.length && to >= offset)
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
      return { firstLine, lastLine, lineHeight: this.height / (lastLine - firstLine + 1) };
    }
    blockAt(height, doc2, top2, offset) {
      let { firstLine, lastLine, lineHeight } = this.lines(doc2, offset);
      let line2 = Math.max(0, Math.min(lastLine - firstLine, Math.floor((height - top2) / lineHeight)));
      let { from, length } = doc2.line(firstLine + line2);
      return new BlockInfo(from, length, top2 + lineHeight * line2, lineHeight, BlockType.Text);
    }
    lineAt(value, type, doc2, top2, offset) {
      if (type == QueryType.ByHeight)
        return this.blockAt(value, doc2, top2, offset);
      if (type == QueryType.ByPosNoHeight) {
        let { from: from2, to } = doc2.lineAt(value);
        return new BlockInfo(from2, to - from2, 0, 0, BlockType.Text);
      }
      let { firstLine, lineHeight } = this.lines(doc2, offset);
      let { from, length, number: number3 } = doc2.lineAt(value);
      return new BlockInfo(from, length, top2 + lineHeight * (number3 - firstLine), lineHeight, BlockType.Text);
    }
    forEachLine(from, to, doc2, top2, offset, f) {
      let { firstLine, lineHeight } = this.lines(doc2, offset);
      for (let pos = Math.max(from, offset), end = Math.min(offset + this.length, to); pos <= end; ) {
        let line2 = doc2.lineAt(pos);
        if (pos == from)
          top2 += lineHeight * (line2.number - firstLine);
        f(new BlockInfo(line2.from, line2.length, top2, lineHeight, BlockType.Text));
        top2 += lineHeight;
        pos = line2.to + 1;
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
        let nodes = [], pos = Math.max(offset, measured.from), singleHeight = -1;
        let wasChanged = oracle.heightChanged;
        if (measured.from > offset)
          nodes.push(new HeightMapGap(measured.from - offset - 1).updateHeight(oracle, offset));
        while (pos <= end && measured.more) {
          let len = oracle.doc.lineAt(pos).length;
          if (nodes.length)
            nodes.push(null);
          let height = measured.heights[measured.index++];
          if (singleHeight == -1)
            singleHeight = height;
          else if (Math.abs(height - singleHeight) >= Epsilon)
            singleHeight = -2;
          let line2 = new HeightMapText(len, height);
          line2.outdated = false;
          nodes.push(line2);
          pos += len + 1;
        }
        if (pos <= end)
          nodes.push(null, new HeightMapGap(end - pos).updateHeight(oracle, pos));
        let result = HeightMap.of(nodes);
        oracle.heightChanged = wasChanged || singleHeight < 0 || Math.abs(result.height - this.height) >= Epsilon || Math.abs(singleHeight - this.lines(oracle.doc, offset).lineHeight) >= Epsilon;
        return result;
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
      return height < mid ? this.left.blockAt(height, doc2, top2, offset) : this.right.blockAt(height, doc2, mid, offset + this.left.length + this.break);
    }
    lineAt(value, type, doc2, top2, offset) {
      let rightTop = top2 + this.left.height, rightOffset = offset + this.left.length + this.break;
      let left = type == QueryType.ByHeight ? value < rightTop : value < rightOffset;
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
      let { left, right } = this, rightStart = offset + left.length + this.break, rebalance = null;
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
        let height = deco.widget ? deco.widget.estimatedHeight : 0;
        if (height < 0)
          height = this.oracle.lineHeight;
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
      let { from, to } = this.oracle.doc.lineAt(this.pos);
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
      let line2 = new HeightMapText(0, -1);
      this.nodes.push(line2);
      return line2;
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
      let line2 = this.ensureLine();
      line2.length += length;
      line2.collapsed += length;
      line2.widgetHeight = Math.max(line2.widgetHeight, height);
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
    let doc2 = dom.ownerDocument, win = doc2.defaultView || window;
    let left = Math.max(0, rect.left), right = Math.min(win.innerWidth, rect.right);
    let top2 = Math.max(0, rect.top), bottom = Math.min(win.innerHeight, rect.bottom);
    for (let parent = dom.parentNode; parent && parent != doc2.body; ) {
      if (parent.nodeType == 1) {
        let elt = parent;
        let style = window.getComputedStyle(elt);
        if ((elt.scrollHeight > elt.clientHeight || elt.scrollWidth > elt.clientWidth) && style.overflow != "visible") {
          let parentRect = elt.getBoundingClientRect();
          left = Math.max(left, parentRect.left);
          right = Math.min(right, parentRect.right);
          top2 = Math.max(top2, parentRect.top);
          bottom = parent == dom.parentNode ? parentRect.bottom : Math.min(bottom, parentRect.bottom);
        }
        parent = style.position == "absolute" || style.position == "fixed" ? elt.offsetParent : elt.parentNode;
      } else if (parent.nodeType == 11) {
        parent = parent.host;
      } else {
        break;
      }
    }
    return {
      left: left - rect.left,
      right: Math.max(left, right) - rect.left,
      top: top2 - (rect.top + paddingTop),
      bottom: Math.max(top2, bottom) - (rect.top + paddingTop)
    };
  }
  function fullPixelRange(dom, paddingTop) {
    let rect = dom.getBoundingClientRect();
    return {
      left: 0,
      right: rect.right - rect.left,
      top: paddingTop,
      bottom: rect.bottom - (rect.top + paddingTop)
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
      return Decoration.replace({ widget: new LineGapWidget(this.size, wrapping) }).range(this.from, this.to);
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
      this.pixelViewport = { left: 0, right: window.innerWidth, top: 0, bottom: 0 };
      this.inView = true;
      this.paddingTop = 0;
      this.paddingBottom = 0;
      this.contentDOMWidth = 0;
      this.contentDOMHeight = 0;
      this.editorHeight = 0;
      this.editorWidth = 0;
      this.heightOracle = new HeightOracle();
      this.scaler = IdScaler;
      this.scrollTarget = null;
      this.printing = false;
      this.mustMeasureContent = true;
      this.defaultTextDirection = Direction.RTL;
      this.visibleRanges = [];
      this.mustEnforceCursorAssoc = false;
      this.stateDeco = state.facet(decorations).filter((d) => typeof d != "function");
      this.heightMap = HeightMap.empty().applyChanges(this.stateDeco, Text.empty, this.heightOracle.setDoc(state.doc), [new ChangedRange(0, 0, 0, state.doc.length)]);
      this.viewport = this.getViewport(0, null);
      this.updateViewportLines();
      this.updateForViewport();
      this.lineGaps = this.ensureLineGaps([]);
      this.lineGapDeco = Decoration.set(this.lineGaps.map((gap) => gap.draw(false)));
      this.computeVisibleRanges();
    }
    updateForViewport() {
      let viewports = [this.viewport], { main } = this.state.selection;
      for (let i = 0; i <= 1; i++) {
        let pos = i ? main.head : main.anchor;
        if (!viewports.some(({ from, to }) => pos >= from && pos <= to)) {
          let { from, to } = this.lineBlockAt(pos);
          viewports.push(new Viewport(from, to));
        }
      }
      this.viewports = viewports.sort((a, b) => a.from - b.from);
      this.scaler = this.heightMap.height <= 7e6 ? IdScaler : new BigScaler(this.heightOracle.doc, this.heightMap, this.viewports);
    }
    updateViewportLines() {
      this.viewportLines = [];
      this.heightMap.forEachLine(this.viewport.from, this.viewport.to, this.state.doc, 0, 0, (block) => {
        this.viewportLines.push(this.scaler.scale == 1 ? block : scaleBlock(block, this.scaler));
      });
    }
    update(update, scrollTarget = null) {
      this.state = update.state;
      let prevDeco = this.stateDeco;
      this.stateDeco = this.state.facet(decorations).filter((d) => typeof d != "function");
      let contentChanges = update.changedRanges;
      let heightChanges = ChangedRange.extendWithRanges(contentChanges, heightRelevantDecoChanges(prevDeco, this.stateDeco, update ? update.changes : ChangeSet.empty(this.state.doc.length)));
      let prevHeight = this.heightMap.height;
      this.heightMap = this.heightMap.applyChanges(this.stateDeco, update.startState.doc, this.heightOracle.setDoc(this.state.doc), heightChanges);
      if (this.heightMap.height != prevHeight)
        update.flags |= 2;
      let viewport = heightChanges.length ? this.mapViewport(this.viewport, update.changes) : this.viewport;
      if (scrollTarget && (scrollTarget.range.head < viewport.from || scrollTarget.range.head > viewport.to) || !this.viewportIsAppropriate(viewport))
        viewport = this.getViewport(0, scrollTarget);
      let updateLines = !update.changes.empty || update.flags & 2 || viewport.from != this.viewport.from || viewport.to != this.viewport.to;
      this.viewport = viewport;
      this.updateForViewport();
      if (updateLines)
        this.updateViewportLines();
      if (this.lineGaps.length || this.viewport.to - this.viewport.from > 2e3 << 1)
        this.updateLineGaps(this.ensureLineGaps(this.mapLineGaps(this.lineGaps, update.changes)));
      update.flags |= this.computeVisibleRanges();
      if (scrollTarget)
        this.scrollTarget = scrollTarget;
      if (!this.mustEnforceCursorAssoc && update.selectionSet && update.view.lineWrapping && update.state.selection.main.empty && update.state.selection.main.assoc)
        this.mustEnforceCursorAssoc = true;
    }
    measure(view) {
      let dom = view.contentDOM, style = window.getComputedStyle(dom);
      let oracle = this.heightOracle;
      let whiteSpace = style.whiteSpace;
      this.defaultTextDirection = style.direction == "rtl" ? Direction.RTL : Direction.LTR;
      let refresh = this.heightOracle.mustRefreshForWrapping(whiteSpace);
      let measureContent = refresh || this.mustMeasureContent || this.contentDOMHeight != dom.clientHeight;
      this.contentDOMHeight = dom.clientHeight;
      this.mustMeasureContent = false;
      let result = 0, bias = 0;
      let paddingTop = parseInt(style.paddingTop) || 0, paddingBottom = parseInt(style.paddingBottom) || 0;
      if (this.paddingTop != paddingTop || this.paddingBottom != paddingBottom) {
        this.paddingTop = paddingTop;
        this.paddingBottom = paddingBottom;
        result |= 8 | 2;
      }
      if (this.editorWidth != view.scrollDOM.clientWidth) {
        if (oracle.lineWrapping)
          measureContent = true;
        this.editorWidth = view.scrollDOM.clientWidth;
        result |= 8;
      }
      let pixelViewport = (this.printing ? fullPixelRange : visiblePixelRange)(dom, this.paddingTop);
      let dTop = pixelViewport.top - this.pixelViewport.top, dBottom = pixelViewport.bottom - this.pixelViewport.bottom;
      this.pixelViewport = pixelViewport;
      let inView = this.pixelViewport.bottom > this.pixelViewport.top && this.pixelViewport.right > this.pixelViewport.left;
      if (inView != this.inView) {
        this.inView = inView;
        if (inView)
          measureContent = true;
      }
      if (!this.inView && !this.scrollTarget)
        return 0;
      let contentWidth = dom.clientWidth;
      if (this.contentDOMWidth != contentWidth || this.editorHeight != view.scrollDOM.clientHeight) {
        this.contentDOMWidth = contentWidth;
        this.editorHeight = view.scrollDOM.clientHeight;
        result |= 8;
      }
      if (measureContent) {
        let lineHeights = view.docView.measureVisibleLineHeights(this.viewport);
        if (oracle.mustRefreshForHeights(lineHeights))
          refresh = true;
        if (refresh || oracle.lineWrapping && Math.abs(contentWidth - this.contentDOMWidth) > oracle.charWidth) {
          let { lineHeight, charWidth } = view.docView.measureTextSize();
          refresh = lineHeight > 0 && oracle.refresh(whiteSpace, lineHeight, charWidth, contentWidth / charWidth, lineHeights);
          if (refresh) {
            view.docView.minWidth = 0;
            result |= 8;
          }
        }
        if (dTop > 0 && dBottom > 0)
          bias = Math.max(dTop, dBottom);
        else if (dTop < 0 && dBottom < 0)
          bias = Math.min(dTop, dBottom);
        oracle.heightChanged = false;
        for (let vp of this.viewports) {
          let heights = vp.from == this.viewport.from ? lineHeights : view.docView.measureVisibleLineHeights(vp);
          this.heightMap = this.heightMap.updateHeight(oracle, 0, refresh, new MeasuredHeights(vp.from, heights));
        }
        if (oracle.heightChanged)
          result |= 2;
      }
      let viewportChange = !this.viewportIsAppropriate(this.viewport, bias) || this.scrollTarget && (this.scrollTarget.range.head < this.viewport.from || this.scrollTarget.range.head > this.viewport.to);
      if (viewportChange)
        this.viewport = this.getViewport(bias, this.scrollTarget);
      this.updateForViewport();
      if (result & 2 || viewportChange)
        this.updateViewportLines();
      if (this.lineGaps.length || this.viewport.to - this.viewport.from > 2e3 << 1)
        this.updateLineGaps(this.ensureLineGaps(refresh ? [] : this.lineGaps, view));
      result |= this.computeVisibleRanges();
      if (this.mustEnforceCursorAssoc) {
        this.mustEnforceCursorAssoc = false;
        view.docView.enforceCursorAssoc();
      }
      return result;
    }
    get visibleTop() {
      return this.scaler.fromDOM(this.pixelViewport.top);
    }
    get visibleBottom() {
      return this.scaler.fromDOM(this.pixelViewport.bottom);
    }
    getViewport(bias, scrollTarget) {
      let marginTop = 0.5 - Math.max(-0.5, Math.min(0.5, bias / 1e3 / 2));
      let map = this.heightMap, doc2 = this.state.doc, { visibleTop, visibleBottom } = this;
      let viewport = new Viewport(map.lineAt(visibleTop - marginTop * 1e3, QueryType.ByHeight, doc2, 0, 0).from, map.lineAt(visibleBottom + (1 - marginTop) * 1e3, QueryType.ByHeight, doc2, 0, 0).to);
      if (scrollTarget) {
        let { head } = scrollTarget.range;
        if (head < viewport.from || head > viewport.to) {
          let viewHeight = Math.min(this.editorHeight, this.pixelViewport.bottom - this.pixelViewport.top);
          let block = map.lineAt(head, QueryType.ByPos, doc2, 0, 0), topPos;
          if (scrollTarget.y == "center")
            topPos = (block.top + block.bottom) / 2 - viewHeight / 2;
          else if (scrollTarget.y == "start" || scrollTarget.y == "nearest" && head < viewport.from)
            topPos = block.top;
          else
            topPos = block.bottom - viewHeight;
          viewport = new Viewport(map.lineAt(topPos - 1e3 / 2, QueryType.ByHeight, doc2, 0, 0).from, map.lineAt(topPos + viewHeight + 1e3 / 2, QueryType.ByHeight, doc2, 0, 0).to);
        }
      }
      return viewport;
    }
    mapViewport(viewport, changes) {
      let from = changes.mapPos(viewport.from, -1), to = changes.mapPos(viewport.to, 1);
      return new Viewport(this.heightMap.lineAt(from, QueryType.ByPos, this.state.doc, 0, 0).from, this.heightMap.lineAt(to, QueryType.ByPos, this.state.doc, 0, 0).to);
    }
    viewportIsAppropriate({ from, to }, bias = 0) {
      if (!this.inView)
        return true;
      let { top: top2 } = this.heightMap.lineAt(from, QueryType.ByPos, this.state.doc, 0, 0);
      let { bottom } = this.heightMap.lineAt(to, QueryType.ByPos, this.state.doc, 0, 0);
      let { visibleTop, visibleBottom } = this;
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
    ensureLineGaps(current, mayMeasure) {
      let wrapping = this.heightOracle.lineWrapping;
      let margin = wrapping ? 1e4 : 2e3, halfMargin = margin >> 1, doubleMargin = margin << 1;
      if (this.defaultTextDirection != Direction.LTR && !wrapping)
        return [];
      let gaps = [];
      let addGap = (from, to, line2, structure) => {
        if (to - from < halfMargin)
          return;
        let sel = this.state.selection.main, avoid = [sel.from];
        if (!sel.empty)
          avoid.push(sel.to);
        for (let pos of avoid) {
          if (pos > from && pos < to) {
            addGap(from, pos - 10, line2, structure);
            addGap(pos + 10, to, line2, structure);
            return;
          }
        }
        let gap = find(current, (gap2) => gap2.from >= line2.from && gap2.to <= line2.to && Math.abs(gap2.from - from) < halfMargin && Math.abs(gap2.to - to) < halfMargin && !avoid.some((pos) => gap2.from < pos && gap2.to > pos));
        if (!gap) {
          if (to < line2.to && mayMeasure && wrapping && mayMeasure.visibleRanges.some((r) => r.from <= to && r.to >= to)) {
            let lineStart = mayMeasure.moveToLineBoundary(EditorSelection.cursor(to), false, true).head;
            if (lineStart > from)
              to = lineStart;
          }
          gap = new LineGap(from, to, this.gapSize(line2, from, to, structure));
        }
        gaps.push(gap);
      };
      for (let line2 of this.viewportLines) {
        if (line2.length < doubleMargin)
          continue;
        let structure = lineStructure(line2.from, line2.to, this.stateDeco);
        if (structure.total < doubleMargin)
          continue;
        let target = this.scrollTarget ? this.scrollTarget.range.head : null;
        let viewFrom, viewTo;
        if (wrapping) {
          let marginHeight = margin / this.heightOracle.lineLength * this.heightOracle.lineHeight;
          let top2, bot;
          if (target != null) {
            let targetFrac = findFraction(structure, target);
            let spaceFrac = ((this.visibleBottom - this.visibleTop) / 2 + marginHeight) / line2.height;
            top2 = targetFrac - spaceFrac;
            bot = targetFrac + spaceFrac;
          } else {
            top2 = (this.visibleTop - line2.top - marginHeight) / line2.height;
            bot = (this.visibleBottom - line2.top + marginHeight) / line2.height;
          }
          viewFrom = findPosition(structure, top2);
          viewTo = findPosition(structure, bot);
        } else {
          let totalWidth = structure.total * this.heightOracle.charWidth;
          let marginWidth = margin * this.heightOracle.charWidth;
          let left, right;
          if (target != null) {
            let targetFrac = findFraction(structure, target);
            let spaceFrac = ((this.pixelViewport.right - this.pixelViewport.left) / 2 + marginWidth) / totalWidth;
            left = targetFrac - spaceFrac;
            right = targetFrac + spaceFrac;
          } else {
            left = (this.pixelViewport.left - marginWidth) / totalWidth;
            right = (this.pixelViewport.right + marginWidth) / totalWidth;
          }
          viewFrom = findPosition(structure, left);
          viewTo = findPosition(structure, right);
        }
        if (viewFrom > line2.from)
          addGap(line2.from, viewFrom, line2, structure);
        if (viewTo < line2.to)
          addGap(viewTo, line2.to, line2, structure);
      }
      return gaps;
    }
    gapSize(line2, from, to, structure) {
      let fraction = findFraction(structure, to) - findFraction(structure, from);
      if (this.heightOracle.lineWrapping) {
        return line2.height * fraction;
      } else {
        return structure.total * this.heightOracle.charWidth * fraction;
      }
    }
    updateLineGaps(gaps) {
      if (!LineGap.same(gaps, this.lineGaps)) {
        this.lineGaps = gaps;
        this.lineGapDeco = Decoration.set(gaps.map((gap) => gap.draw(this.heightOracle.lineWrapping)));
      }
    }
    computeVisibleRanges() {
      let deco = this.stateDeco;
      if (this.lineGaps.length)
        deco = deco.concat(this.lineGapDeco);
      let ranges = [];
      RangeSet.spans(deco, this.viewport.from, this.viewport.to, {
        span(from, to) {
          ranges.push({ from, to });
        },
        point() {
        }
      }, 20);
      let changed = ranges.length != this.visibleRanges.length || this.visibleRanges.some((r, i) => r.from != ranges[i].from || r.to != ranges[i].to);
      this.visibleRanges = ranges;
      return changed ? 4 : 0;
    }
    lineBlockAt(pos) {
      return pos >= this.viewport.from && pos <= this.viewport.to && this.viewportLines.find((b) => b.from <= pos && b.to >= pos) || scaleBlock(this.heightMap.lineAt(pos, QueryType.ByPos, this.state.doc, 0, 0), this.scaler);
    }
    lineBlockAtHeight(height) {
      return scaleBlock(this.heightMap.lineAt(this.scaler.fromDOM(height), QueryType.ByHeight, this.state.doc, 0, 0), this.scaler);
    }
    elementAtHeight(height) {
      return scaleBlock(this.heightMap.blockAt(this.scaler.fromDOM(height), this.state.doc, 0, 0), this.scaler);
    }
    get docHeight() {
      return this.scaler.toDOM(this.heightMap.height);
    }
    get contentHeight() {
      return this.docHeight + this.paddingTop + this.paddingBottom;
    }
  };
  var Viewport = class {
    constructor(from, to) {
      this.from = from;
      this.to = to;
    }
  };
  function lineStructure(from, to, stateDeco) {
    let ranges = [], pos = from, total = 0;
    RangeSet.spans(stateDeco, from, to, {
      span() {
      },
      point(from2, to2) {
        if (from2 > pos) {
          ranges.push({ from: pos, to: from2 });
          total += from2 - pos;
        }
        pos = to2;
      }
    }, 20);
    if (pos < to) {
      ranges.push({ from: pos, to });
      total += to - pos;
    }
    return { total, ranges };
  }
  function findPosition({ total, ranges }, ratio) {
    if (ratio <= 0)
      return ranges[0].from;
    if (ratio >= 1)
      return ranges[ranges.length - 1].to;
    let dist = Math.floor(total * ratio);
    for (let i = 0; ; i++) {
      let { from, to } = ranges[i], size = to - from;
      if (dist <= size)
        return from + dist;
      dist -= size;
    }
  }
  function findFraction(structure, pos) {
    let counted = 0;
    for (let { from, to } of structure.ranges) {
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
      this.viewports = viewports.map(({ from, to }) => {
        let top2 = heightMap.lineAt(from, QueryType.ByPos, doc2, 0, 0).top;
        let bottom = heightMap.lineAt(to, QueryType.ByPos, doc2, 0, 0).bottom;
        vpHeight += bottom - top2;
        return { from, to, top: top2, bottom, domTop: 0, domBottom: 0 };
      });
      this.scale = (7e6 - vpHeight) / (heightMap.height - vpHeight);
      for (let obj of this.viewports) {
        obj.domTop = domBase + (obj.top - base2) * this.scale;
        domBase = obj.domBottom = obj.domTop + (obj.bottom - obj.top);
        base2 = obj.bottom;
      }
    }
    toDOM(n) {
      for (let i = 0, base2 = 0, domBase = 0; ; i++) {
        let vp = i < this.viewports.length ? this.viewports[i] : null;
        if (!vp || n < vp.top)
          return domBase + (n - base2) * this.scale;
        if (n <= vp.bottom)
          return vp.domTop + (n - vp.top);
        base2 = vp.bottom;
        domBase = vp.domBottom;
      }
    }
    fromDOM(n) {
      for (let i = 0, base2 = 0, domBase = 0; ; i++) {
        let vp = i < this.viewports.length ? this.viewports[i] : null;
        if (!vp || n < vp.domTop)
          return base2 + (n - domBase) / this.scale;
        if (n <= vp.domBottom)
          return vp.top + (n - vp.domTop);
        base2 = vp.bottom;
        domBase = vp.domBottom;
      }
    }
  };
  function scaleBlock(block, scaler) {
    if (scaler.scale == 1)
      return block;
    let bTop = scaler.toDOM(block.top), bBottom = scaler.toDOM(block.bottom);
    return new BlockInfo(block.from, block.length, bTop, bBottom - bTop, Array.isArray(block.type) ? block.type.map((b) => scaleBlock(b, scaler)) : block.type);
  }
  var theme = /* @__PURE__ */ Facet.define({ combine: (strs) => strs.join(" ") });
  var darkTheme = /* @__PURE__ */ Facet.define({ combine: (values) => values.indexOf(true) > -1 });
  var baseThemeID = /* @__PURE__ */ StyleModule.newName();
  var baseLightID = /* @__PURE__ */ StyleModule.newName();
  var baseDarkID = /* @__PURE__ */ StyleModule.newName();
  var lightDarkIDs = { "&light": "." + baseLightID, "&dark": "." + baseDarkID };
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
  var baseTheme$1 = /* @__PURE__ */ buildTheme("." + baseThemeID, {
    "&.cm-editor": {
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
      flexShrink: 0,
      minHeight: "100%",
      display: "block",
      whiteSpace: "pre",
      wordWrap: "normal",
      boxSizing: "border-box",
      padding: "4px 0",
      outline: "none",
      "&[contenteditable=true]": {
        WebkitUserModify: "read-write-plaintext-only"
      }
    },
    ".cm-lineWrapping": {
      whiteSpace_fallback: "pre-wrap",
      whiteSpace: "break-spaces",
      wordBreak: "break-word",
      overflowWrap: "anywhere",
      flexShrink: 1
    },
    "&light .cm-content": { caretColor: "black" },
    "&dark .cm-content": { caretColor: "white" },
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
    "@keyframes cm-blink": { "0%": {}, "50%": { opacity: 0 }, "100%": {} },
    "@keyframes cm-blink2": { "0%": {}, "50%": { opacity: 0 }, "100%": {} },
    ".cm-cursor, .cm-dropCursor": {
      position: "absolute",
      borderLeft: "1.2px solid black",
      marginLeft: "-0.6px",
      pointerEvents: "none"
    },
    ".cm-cursor": {
      display: "none"
    },
    "&dark .cm-cursor": {
      borderLeftColor: "#444"
    },
    "&.cm-focused .cm-cursor": {
      display: "block"
    },
    "&light .cm-activeLine": { backgroundColor: "#cceeff44" },
    "&dark .cm-activeLine": { backgroundColor: "#99eeff33" },
    "&light .cm-specialChar": { color: "red" },
    "&dark .cm-specialChar": { color: "#f78" },
    ".cm-gutters": {
      flexShrink: 0,
      display: "flex",
      height: "100%",
      boxSizing: "border-box",
      left: 0,
      zIndex: 200
    },
    "&light .cm-gutters": {
      backgroundColor: "#f5f5f5",
      color: "#6c6c6c",
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
      minHeight: "100%",
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
    },
    "&light .cm-activeLineGutter": {
      backgroundColor: "#e2f2ff"
    },
    "&dark .cm-activeLineGutter": {
      backgroundColor: "#222227"
    },
    ".cm-panels": {
      boxSizing: "border-box",
      position: "sticky",
      left: 0,
      right: 0
    },
    "&light .cm-panels": {
      backgroundColor: "#f5f5f5",
      color: "black"
    },
    "&light .cm-panels-top": {
      borderBottom: "1px solid #ddd"
    },
    "&light .cm-panels-bottom": {
      borderTop: "1px solid #ddd"
    },
    "&dark .cm-panels": {
      backgroundColor: "#333338",
      color: "white"
    },
    ".cm-tab": {
      display: "inline-block",
      overflow: "hidden",
      verticalAlign: "bottom"
    },
    ".cm-widgetBuffer": {
      verticalAlign: "text-top",
      height: "1em",
      width: 0,
      display: "inline"
    },
    ".cm-placeholder": {
      color: "#888",
      display: "inline-block",
      verticalAlign: "top"
    },
    ".cm-button": {
      verticalAlign: "middle",
      color: "inherit",
      fontSize: "70%",
      padding: ".2em 1em",
      borderRadius: "1px"
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
  var DOMChange = class {
    constructor(view, start, end, typeOver) {
      this.typeOver = typeOver;
      this.bounds = null;
      this.text = "";
      let { impreciseHead: iHead, impreciseAnchor: iAnchor } = view.docView;
      if (start > -1 && !view.state.readOnly && (this.bounds = view.docView.domBoundsAround(start, end, 0))) {
        let selPoints = iHead || iAnchor ? [] : selectionPoints(view);
        let reader = new DOMReader(selPoints, view.state);
        reader.readRange(this.bounds.startDOM, this.bounds.endDOM);
        this.text = reader.text;
        this.newSel = selectionFromPoints(selPoints, this.bounds.from);
      } else {
        let domSel = view.observer.selectionRange;
        let head = iHead && iHead.node == domSel.focusNode && iHead.offset == domSel.focusOffset || !contains(view.contentDOM, domSel.focusNode) ? view.state.selection.main.head : view.docView.posFromDOM(domSel.focusNode, domSel.focusOffset);
        let anchor = iAnchor && iAnchor.node == domSel.anchorNode && iAnchor.offset == domSel.anchorOffset || !contains(view.contentDOM, domSel.anchorNode) ? view.state.selection.main.anchor : view.docView.posFromDOM(domSel.anchorNode, domSel.anchorOffset);
        this.newSel = EditorSelection.single(anchor, head);
      }
    }
  };
  function applyDOMChange(view, domChange) {
    let change;
    let { newSel } = domChange, sel = view.state.selection.main;
    if (domChange.bounds) {
      let { from, to } = domChange.bounds;
      let preferredPos = sel.from, preferredSide = null;
      if (view.inputState.lastKeyCode === 8 && view.inputState.lastKeyTime > Date.now() - 100 || browser.android && domChange.text.length < to - from) {
        preferredPos = sel.to;
        preferredSide = "end";
      }
      let diff = findDiff(view.state.doc.sliceString(from, to, LineBreakPlaceholder), domChange.text, preferredPos - from, preferredSide);
      if (diff) {
        if (browser.chrome && view.inputState.lastKeyCode == 13 && diff.toB == diff.from + 2 && domChange.text.slice(diff.from, diff.toB) == LineBreakPlaceholder + LineBreakPlaceholder)
          diff.toB--;
        change = {
          from: from + diff.from,
          to: from + diff.toA,
          insert: Text.of(domChange.text.slice(diff.from, diff.toB).split(LineBreakPlaceholder))
        };
      }
    } else if (newSel && (!view.hasFocus || !view.state.facet(editable) || newSel.main.eq(sel))) {
      newSel = null;
    }
    if (!change && !newSel)
      return false;
    if (!change && domChange.typeOver && !sel.empty && newSel && newSel.main.empty) {
      change = { from: sel.from, to: sel.to, insert: view.state.doc.slice(sel.from, sel.to) };
    } else if (change && change.from >= sel.from && change.to <= sel.to && (change.from != sel.from || change.to != sel.to) && sel.to - sel.from - (change.to - change.from) <= 4) {
      change = {
        from: sel.from,
        to: sel.to,
        insert: view.state.doc.slice(sel.from, change.from).append(change.insert).append(view.state.doc.slice(change.to, sel.to))
      };
    } else if ((browser.mac || browser.android) && change && change.from == change.to && change.from == sel.head - 1 && /^\. ?$/.test(change.insert.toString())) {
      if (newSel && change.insert.length == 2)
        newSel = EditorSelection.single(newSel.main.anchor - 1, newSel.main.head - 1);
      change = { from: sel.from, to: sel.to, insert: Text.of([" "]) };
    }
    if (change) {
      let startState = view.state;
      if (browser.ios && view.inputState.flushIOSKey(view))
        return true;
      if (browser.android && (change.from == sel.from && change.to == sel.to && change.insert.length == 1 && change.insert.lines == 2 && dispatchKey(view.contentDOM, "Enter", 13) || change.from == sel.from - 1 && change.to == sel.to && change.insert.length == 0 && dispatchKey(view.contentDOM, "Backspace", 8) || change.from == sel.from && change.to == sel.to + 1 && change.insert.length == 0 && dispatchKey(view.contentDOM, "Delete", 46)))
        return true;
      let text = change.insert.toString();
      if (view.state.facet(inputHandler).some((h) => h(view, change.from, change.to, text)))
        return true;
      if (view.inputState.composing >= 0)
        view.inputState.composing++;
      let tr;
      if (change.from >= sel.from && change.to <= sel.to && change.to - change.from >= (sel.to - sel.from) / 3 && (!newSel || newSel.main.empty && newSel.main.from == change.from + change.insert.length) && view.inputState.composing < 0) {
        let before = sel.from < change.from ? startState.sliceDoc(sel.from, change.from) : "";
        let after = sel.to > change.to ? startState.sliceDoc(change.to, sel.to) : "";
        tr = startState.replaceSelection(view.state.toText(before + change.insert.sliceString(0, void 0, view.state.lineBreak) + after));
      } else {
        let changes = startState.changes(change);
        let mainSel = newSel && !startState.selection.main.eq(newSel.main) && newSel.main.to <= changes.newLength ? newSel.main : void 0;
        if (startState.selection.ranges.length > 1 && view.inputState.composing >= 0 && change.to <= sel.to && change.to >= sel.to - 10) {
          let replaced = view.state.sliceDoc(change.from, change.to);
          let compositionRange = compositionSurroundingNode(view) || view.state.doc.lineAt(sel.head);
          let offset = sel.to - change.to, size = sel.to - sel.from;
          tr = startState.changeByRange((range) => {
            if (range.from == sel.from && range.to == sel.to)
              return { changes, range: mainSel || range.map(changes) };
            let to = range.to - offset, from = to - replaced.length;
            if (range.to - range.from != size || view.state.sliceDoc(from, to) != replaced || compositionRange && range.to >= compositionRange.from && range.from <= compositionRange.to)
              return { range };
            let rangeChanges = startState.changes({ from, to, insert: change.insert }), selOff = range.to - sel.to;
            return {
              changes: rangeChanges,
              range: !mainSel ? range.map(rangeChanges) : EditorSelection.range(Math.max(0, mainSel.anchor + selOff), Math.max(0, mainSel.head + selOff))
            };
          });
        } else {
          tr = {
            changes,
            selection: mainSel && startState.selection.replaceRange(mainSel)
          };
        }
      }
      let userEvent = "input.type";
      if (view.composing) {
        userEvent += ".compose";
        if (view.inputState.compositionFirstChange) {
          userEvent += ".start";
          view.inputState.compositionFirstChange = false;
        }
      }
      view.dispatch(tr, { scrollIntoView: true, userEvent });
      return true;
    } else if (newSel && !newSel.main.eq(sel)) {
      let scrollIntoView2 = false, userEvent = "select";
      if (view.inputState.lastSelectionTime > Date.now() - 50) {
        if (view.inputState.lastSelectionOrigin == "select")
          scrollIntoView2 = true;
        userEvent = view.inputState.lastSelectionOrigin;
      }
      view.dispatch({ selection: newSel, scrollIntoView: scrollIntoView2, userEvent });
      return true;
    } else {
      return false;
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
    return { from, toA, toB };
  }
  function selectionPoints(view) {
    let result = [];
    if (view.root.activeElement != view.contentDOM)
      return result;
    let { anchorNode, anchorOffset, focusNode, focusOffset } = view.observer.selectionRange;
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
  var observeOptions = {
    childList: true,
    characterData: true,
    subtree: true,
    attributes: true,
    characterDataOldValue: true
  };
  var useCharData = browser.ie && browser.ie_version <= 11;
  var DOMObserver = class {
    constructor(view) {
      this.view = view;
      this.active = false;
      this.selectionRange = new DOMSelectionState();
      this.selectionChanged = false;
      this.delayedFlush = -1;
      this.resizeTimeout = -1;
      this.queue = [];
      this.delayedAndroidKey = null;
      this.flushingAndroidKey = -1;
      this.lastChange = 0;
      this.scrollTargets = [];
      this.intersection = null;
      this.resize = null;
      this.intersecting = false;
      this.gapIntersection = null;
      this.gaps = [];
      this.parentCheck = -1;
      this.dom = view.contentDOM;
      this.observer = new MutationObserver((mutations) => {
        for (let mut of mutations)
          this.queue.push(mut);
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
      this.onResize = this.onResize.bind(this);
      this.onPrint = this.onPrint.bind(this);
      this.onScroll = this.onScroll.bind(this);
      if (typeof ResizeObserver == "function") {
        this.resize = new ResizeObserver(() => {
          if (this.view.docView.lastUpdate < Date.now() - 75)
            this.onResize();
        });
        this.resize.observe(view.scrollDOM);
      }
      this.addWindowListeners(this.win = view.win);
      this.start();
      if (typeof IntersectionObserver == "function") {
        this.intersection = new IntersectionObserver((entries) => {
          if (this.parentCheck < 0)
            this.parentCheck = setTimeout(this.listenForScroll.bind(this), 1e3);
          if (entries.length > 0 && entries[entries.length - 1].intersectionRatio > 0 != this.intersecting) {
            this.intersecting = !this.intersecting;
            if (this.intersecting != this.view.inView)
              this.onScrollChanged(document.createEvent("Event"));
          }
        }, {});
        this.intersection.observe(this.dom);
        this.gapIntersection = new IntersectionObserver((entries) => {
          if (entries.length > 0 && entries[entries.length - 1].intersectionRatio > 0)
            this.onScrollChanged(document.createEvent("Event"));
        }, {});
      }
      this.listenForScroll();
      this.readSelectionRange();
    }
    onScrollChanged(e) {
      this.view.inputState.runScrollHandlers(this.view, e);
      if (this.intersecting)
        this.view.measure();
    }
    onScroll(e) {
      if (this.intersecting)
        this.flush(false);
      this.onScrollChanged(e);
    }
    onResize() {
      if (this.resizeTimeout < 0)
        this.resizeTimeout = setTimeout(() => {
          this.resizeTimeout = -1;
          this.view.requestMeasure();
        }, 50);
    }
    onPrint() {
      this.view.viewState.printing = true;
      this.view.measure();
      setTimeout(() => {
        this.view.viewState.printing = false;
        this.view.requestMeasure();
      }, 500);
    }
    updateGaps(gaps) {
      if (this.gapIntersection && (gaps.length != this.gaps.length || this.gaps.some((g, i) => g != gaps[i]))) {
        this.gapIntersection.disconnect();
        for (let gap of gaps)
          this.gapIntersection.observe(gap);
        this.gaps = gaps;
      }
    }
    onSelectionChange(event) {
      let wasChanged = this.selectionChanged;
      if (!this.readSelectionRange() || this.delayedAndroidKey)
        return;
      let { view } = this, sel = this.selectionRange;
      if (view.state.facet(editable) ? view.root.activeElement != this.dom : !hasSelection(view.dom, sel))
        return;
      let context = sel.anchorNode && view.docView.nearest(sel.anchorNode);
      if (context && context.ignoreEvent(event)) {
        if (!wasChanged)
          this.selectionChanged = false;
        return;
      }
      if ((browser.ie && browser.ie_version <= 11 || browser.android && browser.chrome) && !view.state.selection.main.empty && sel.focusNode && isEquivalentPosition(sel.focusNode, sel.focusOffset, sel.anchorNode, sel.anchorOffset))
        this.flushSoon();
      else
        this.flush(false);
    }
    readSelectionRange() {
      let { view } = this;
      let range = browser.safari && view.root.nodeType == 11 && deepActiveElement(this.dom.ownerDocument) == this.dom && safariSelectionRangeHack(this.view) || getSelection(view.root);
      if (!range || this.selectionRange.eq(range))
        return false;
      let local = hasSelection(this.dom, range);
      if (local && !this.selectionChanged && view.inputState.lastFocusTime > Date.now() - 200 && view.inputState.lastTouchTime < Date.now() - 300 && atElementStart(this.dom, range)) {
        this.view.inputState.lastFocusTime = 0;
        view.docView.updateSelection();
        return false;
      }
      this.selectionRange.setRange(range);
      if (local)
        this.selectionChanged = true;
      return true;
    }
    setSelectionRange(anchor, head) {
      this.selectionRange.set(anchor.node, anchor.offset, head.node, head.offset);
      this.selectionChanged = false;
    }
    clearSelectionRange() {
      this.selectionRange.set(null, 0, null, 0);
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
      if (useCharData)
        this.dom.addEventListener("DOMCharacterDataModified", this.onCharData);
      this.active = true;
    }
    stop() {
      if (!this.active)
        return;
      this.active = false;
      this.observer.disconnect();
      if (useCharData)
        this.dom.removeEventListener("DOMCharacterDataModified", this.onCharData);
    }
    clear() {
      this.processRecords();
      this.queue.length = 0;
      this.selectionChanged = false;
    }
    delayAndroidKey(key, keyCode) {
      var _a2;
      if (!this.delayedAndroidKey) {
        let flush = () => {
          let key2 = this.delayedAndroidKey;
          if (key2) {
            this.clearDelayedAndroidKey();
            if (!this.flush() && key2.force)
              dispatchKey(this.dom, key2.key, key2.keyCode);
          }
        };
        this.flushingAndroidKey = this.view.win.requestAnimationFrame(flush);
      }
      if (!this.delayedAndroidKey || key == "Enter")
        this.delayedAndroidKey = {
          key,
          keyCode,
          force: this.lastChange < Date.now() - 50 || !!((_a2 = this.delayedAndroidKey) === null || _a2 === void 0 ? void 0 : _a2.force)
        };
    }
    clearDelayedAndroidKey() {
      this.win.cancelAnimationFrame(this.flushingAndroidKey);
      this.delayedAndroidKey = null;
      this.flushingAndroidKey = -1;
    }
    flushSoon() {
      if (this.delayedFlush < 0)
        this.delayedFlush = this.view.win.requestAnimationFrame(() => {
          this.delayedFlush = -1;
          this.flush();
        });
    }
    forceFlush() {
      if (this.delayedFlush >= 0) {
        this.view.win.cancelAnimationFrame(this.delayedFlush);
        this.delayedFlush = -1;
      }
      this.flush();
    }
    processRecords() {
      let records = this.queue;
      for (let mut of this.observer.takeRecords())
        records.push(mut);
      if (records.length)
        this.queue = [];
      let from = -1, to = -1, typeOver = false;
      for (let record of records) {
        let range = this.readMutation(record);
        if (!range)
          continue;
        if (range.typeOver)
          typeOver = true;
        if (from == -1) {
          ({ from, to } = range);
        } else {
          from = Math.min(range.from, from);
          to = Math.max(range.to, to);
        }
      }
      return { from, to, typeOver };
    }
    readChange() {
      let { from, to, typeOver } = this.processRecords();
      let newSel = this.selectionChanged && hasSelection(this.dom, this.selectionRange);
      if (from < 0 && !newSel)
        return null;
      if (from > -1)
        this.lastChange = Date.now();
      this.view.inputState.lastFocusTime = 0;
      this.selectionChanged = false;
      return new DOMChange(this.view, from, to, typeOver);
    }
    flush(readSelection = true) {
      if (this.delayedFlush >= 0 || this.delayedAndroidKey)
        return false;
      if (readSelection)
        this.readSelectionRange();
      let domChange = this.readChange();
      if (!domChange)
        return false;
      let startState = this.view.state;
      let handled = applyDOMChange(this.view, domChange);
      if (this.view.state == startState)
        this.view.update([]);
      return handled;
    }
    readMutation(rec) {
      let cView = this.view.docView.nearest(rec.target);
      if (!cView || cView.ignoreMutation(rec))
        return null;
      cView.markDirty(rec.type == "attributes");
      if (rec.type == "attributes")
        cView.dirty |= 4;
      if (rec.type == "childList") {
        let childBefore = findChild(cView, rec.previousSibling || rec.target.previousSibling, -1);
        let childAfter = findChild(cView, rec.nextSibling || rec.target.nextSibling, 1);
        return {
          from: childBefore ? cView.posAfter(childBefore) : cView.posAtStart,
          to: childAfter ? cView.posBefore(childAfter) : cView.posAtEnd,
          typeOver: false
        };
      } else if (rec.type == "characterData") {
        return { from: cView.posAtStart, to: cView.posAtEnd, typeOver: rec.target.nodeValue == rec.oldValue };
      } else {
        return null;
      }
    }
    setWindow(win) {
      if (win != this.win) {
        this.removeWindowListeners(this.win);
        this.win = win;
        this.addWindowListeners(this.win);
      }
    }
    addWindowListeners(win) {
      win.addEventListener("resize", this.onResize);
      win.addEventListener("beforeprint", this.onPrint);
      win.addEventListener("scroll", this.onScroll);
      win.document.addEventListener("selectionchange", this.onSelectionChange);
    }
    removeWindowListeners(win) {
      win.removeEventListener("scroll", this.onScroll);
      win.removeEventListener("resize", this.onResize);
      win.removeEventListener("beforeprint", this.onPrint);
      win.document.removeEventListener("selectionchange", this.onSelectionChange);
    }
    destroy() {
      var _a2, _b, _c;
      this.stop();
      (_a2 = this.intersection) === null || _a2 === void 0 ? void 0 : _a2.disconnect();
      (_b = this.gapIntersection) === null || _b === void 0 ? void 0 : _b.disconnect();
      (_c = this.resize) === null || _c === void 0 ? void 0 : _c.disconnect();
      for (let dom of this.scrollTargets)
        dom.removeEventListener("scroll", this.onScroll);
      this.removeWindowListeners(this.win);
      clearTimeout(this.parentCheck);
      clearTimeout(this.resizeTimeout);
      this.win.cancelAnimationFrame(this.delayedFlush);
      this.win.cancelAnimationFrame(this.flushingAndroidKey);
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
    view.dom.ownerDocument.execCommand("indent");
    view.contentDOM.removeEventListener("beforeinput", read, true);
    if (!found)
      return null;
    let anchorNode = found.startContainer, anchorOffset = found.startOffset;
    let focusNode = found.endContainer, focusOffset = found.endOffset;
    let curAnchor = view.docView.domAtPos(view.state.selection.main.anchor);
    if (isEquivalentPosition(curAnchor.node, curAnchor.offset, focusNode, focusOffset))
      [anchorNode, anchorOffset, focusNode, focusOffset] = [focusNode, focusOffset, anchorNode, anchorOffset];
    return { anchorNode, anchorOffset, focusNode, focusOffset };
  }
  var EditorView = class {
    constructor(config2 = {}) {
      this.plugins = [];
      this.pluginMap = /* @__PURE__ */ new Map();
      this.editorAttrs = {};
      this.contentAttrs = {};
      this.bidiCache = [];
      this.destroyed = false;
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
      this._root = config2.root || getRoot(config2.parent) || document;
      this.viewState = new ViewState(config2.state || EditorState.create(config2));
      this.plugins = this.state.facet(viewPlugin).map((spec) => new PluginInstance(spec));
      for (let plugin of this.plugins)
        plugin.update(this);
      this.observer = new DOMObserver(this);
      this.inputState = new InputState(this);
      this.inputState.ensureHandlers(this, this.plugins);
      this.docView = new DocView(this);
      this.mountStyles();
      this.updateAttrs();
      this.updateState = 0;
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
    get compositionStarted() {
      return this.inputState.composing >= 0;
    }
    get root() {
      return this._root;
    }
    get win() {
      return this.dom.ownerDocument.defaultView || window;
    }
    dispatch(...input) {
      this._dispatch(input.length == 1 && input[0] instanceof Transaction ? input[0] : this.state.update(...input));
    }
    update(transactions) {
      if (this.updateState != 0)
        throw new Error("Calls to EditorView.update are not allowed while an update is in progress");
      let redrawn = false, attrsChanged = false, update;
      let state = this.state;
      for (let tr of transactions) {
        if (tr.startState != state)
          throw new RangeError("Trying to update state with a transaction that doesn't start from the previous state.");
        state = tr.state;
      }
      if (this.destroyed) {
        this.viewState.state = state;
        return;
      }
      let pendingKey = this.observer.delayedAndroidKey, domChange = null;
      if (pendingKey) {
        this.observer.clearDelayedAndroidKey();
        domChange = this.observer.readChange();
        if (domChange && !this.state.doc.eq(state.doc) || !this.state.selection.eq(state.selection))
          domChange = null;
      } else {
        this.observer.clear();
      }
      if (state.facet(EditorState.phrases) != this.state.facet(EditorState.phrases))
        return this.setState(state);
      update = ViewUpdate.create(this, state, transactions);
      let scrollTarget = this.viewState.scrollTarget;
      try {
        this.updateState = 2;
        for (let tr of transactions) {
          if (scrollTarget)
            scrollTarget = scrollTarget.map(tr.changes);
          if (tr.scrollIntoView) {
            let { main } = tr.state.selection;
            scrollTarget = new ScrollTarget(main.empty ? main : EditorSelection.cursor(main.head, main.head > main.anchor ? -1 : 1));
          }
          for (let e of tr.effects)
            if (e.is(scrollIntoView))
              scrollTarget = e.value;
        }
        this.viewState.update(update, scrollTarget);
        this.bidiCache = CachedOrder.update(this.bidiCache, update.changes);
        if (!update.empty) {
          this.updatePlugins(update);
          this.inputState.update(update);
        }
        redrawn = this.docView.update(update);
        if (this.state.facet(styleModule) != this.styleModules)
          this.mountStyles();
        attrsChanged = this.updateAttrs();
        this.showAnnouncements(transactions);
        this.docView.updateSelection(redrawn, transactions.some((tr) => tr.isUserEvent("select.pointer")));
      } finally {
        this.updateState = 0;
      }
      if (update.startState.facet(theme) != update.state.facet(theme))
        this.viewState.mustMeasureContent = true;
      if (redrawn || attrsChanged || scrollTarget || this.viewState.mustEnforceCursorAssoc || this.viewState.mustMeasureContent)
        this.requestMeasure();
      if (!update.empty)
        for (let listener of this.state.facet(updateListener))
          listener(update);
      if (domChange) {
        if (!applyDOMChange(this, domChange) && pendingKey.force)
          dispatchKey(this.contentDOM, pendingKey.key, pendingKey.keyCode);
      }
    }
    setState(newState) {
      if (this.updateState != 0)
        throw new Error("Calls to EditorView.setState are not allowed while an update is in progress");
      if (this.destroyed) {
        this.viewState.state = newState;
        return;
      }
      this.updateState = 2;
      let hadFocus = this.hasFocus;
      try {
        for (let plugin of this.plugins)
          plugin.destroy(this);
        this.viewState = new ViewState(newState);
        this.plugins = newState.facet(viewPlugin).map((spec) => new PluginInstance(spec));
        this.pluginMap.clear();
        for (let plugin of this.plugins)
          plugin.update(this);
        this.docView = new DocView(this);
        this.inputState.ensureHandlers(this, this.plugins);
        this.mountStyles();
        this.updateAttrs();
        this.bidiCache = [];
      } finally {
        this.updateState = 0;
      }
      if (hadFocus)
        this.focus();
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
        this.pluginMap.clear();
        this.inputState.ensureHandlers(this, this.plugins);
      } else {
        for (let p of this.plugins)
          p.mustUpdate = update;
      }
      for (let i = 0; i < this.plugins.length; i++)
        this.plugins[i].update(this);
    }
    measure(flush = true) {
      if (this.destroyed)
        return;
      if (this.measureScheduled > -1)
        cancelAnimationFrame(this.measureScheduled);
      this.measureScheduled = 0;
      if (flush)
        this.observer.forceFlush();
      let updated = null;
      let { scrollHeight, scrollTop, clientHeight } = this.scrollDOM;
      let refHeight = scrollTop > scrollHeight - clientHeight - 4 ? scrollHeight : scrollTop;
      try {
        for (let i = 0; ; i++) {
          this.updateState = 1;
          let oldViewport = this.viewport;
          let refBlock = this.viewState.lineBlockAtHeight(refHeight);
          let changed = this.viewState.measure(this);
          if (!changed && !this.measureRequests.length && this.viewState.scrollTarget == null)
            break;
          if (i > 5) {
            console.warn(this.measureRequests.length ? "Measure loop restarted more than 5 times" : "Viewport failed to stabilize");
            break;
          }
          let measuring = [];
          if (!(changed & 4))
            [this.measureRequests, measuring] = [measuring, this.measureRequests];
          let measured = measuring.map((m) => {
            try {
              return m.read(this);
            } catch (e) {
              logException(this.state, e);
              return BadMeasure;
            }
          });
          let update = ViewUpdate.create(this, this.state, []), redrawn = false, scrolled = false;
          update.flags |= changed;
          if (!updated)
            updated = update;
          else
            updated.flags |= changed;
          this.updateState = 2;
          if (!update.empty) {
            this.updatePlugins(update);
            this.inputState.update(update);
            this.updateAttrs();
            redrawn = this.docView.update(update);
          }
          for (let i2 = 0; i2 < measuring.length; i2++)
            if (measured[i2] != BadMeasure) {
              try {
                let m = measuring[i2];
                if (m.write)
                  m.write(measured[i2], this);
              } catch (e) {
                logException(this.state, e);
              }
            }
          if (this.viewState.scrollTarget) {
            this.docView.scrollIntoView(this.viewState.scrollTarget);
            this.viewState.scrollTarget = null;
            scrolled = true;
          } else {
            let diff = this.viewState.lineBlockAt(refBlock.from).top - refBlock.top;
            if (diff > 1 || diff < -1) {
              this.scrollDOM.scrollTop += diff;
              scrolled = true;
            }
          }
          if (redrawn)
            this.docView.updateSelection(true);
          if (this.viewport.from == oldViewport.from && this.viewport.to == oldViewport.to && !scrolled && this.measureRequests.length == 0)
            break;
        }
      } finally {
        this.updateState = 0;
        this.measureScheduled = -1;
      }
      if (updated && !updated.empty)
        for (let listener of this.state.facet(updateListener))
          listener(updated);
    }
    get themeClasses() {
      return baseThemeID + " " + (this.state.facet(darkTheme) ? baseDarkID : baseLightID) + " " + this.state.facet(theme);
    }
    updateAttrs() {
      let editorAttrs = attrsFromFacet(this, editorAttributes, {
        class: "cm-editor" + (this.hasFocus ? " cm-focused " : " ") + this.themeClasses
      });
      let contentAttrs = {
        spellcheck: "false",
        autocorrect: "off",
        autocapitalize: "off",
        translate: "no",
        contenteditable: !this.state.facet(editable) ? "false" : "true",
        class: "cm-content",
        style: `${browser.tabSize}: ${this.state.tabSize}`,
        role: "textbox",
        "aria-multiline": "true"
      };
      if (this.state.readOnly)
        contentAttrs["aria-readonly"] = "true";
      attrsFromFacet(this, contentAttributes, contentAttrs);
      let changed = this.observer.ignore(() => {
        let changedContent = updateAttrs(this.contentDOM, this.contentAttrs, contentAttrs);
        let changedEditor = updateAttrs(this.dom, this.editorAttrs, editorAttrs);
        return changedContent || changedEditor;
      });
      this.editorAttrs = editorAttrs;
      this.contentAttrs = contentAttrs;
      return changed;
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
      StyleModule.mount(this.root, this.styleModules.concat(baseTheme$1).reverse());
    }
    readMeasured() {
      if (this.updateState == 2)
        throw new Error("Reading the editor layout isn't allowed during an update");
      if (this.updateState == 0 && this.measureScheduled > -1)
        this.measure(false);
    }
    requestMeasure(request) {
      if (this.measureScheduled < 0)
        this.measureScheduled = this.win.requestAnimationFrame(() => this.measure());
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
    plugin(plugin) {
      let known = this.pluginMap.get(plugin);
      if (known === void 0 || known && known.spec != plugin)
        this.pluginMap.set(plugin, known = this.plugins.find((p) => p.spec == plugin) || null);
      return known && known.update(this).value;
    }
    get documentTop() {
      return this.contentDOM.getBoundingClientRect().top + this.viewState.paddingTop;
    }
    get documentPadding() {
      return { top: this.viewState.paddingTop, bottom: this.viewState.paddingBottom };
    }
    elementAtHeight(height) {
      this.readMeasured();
      return this.viewState.elementAtHeight(height);
    }
    lineBlockAtHeight(height) {
      this.readMeasured();
      return this.viewState.lineBlockAtHeight(height);
    }
    get viewportLineBlocks() {
      return this.viewState.viewportLines;
    }
    lineBlockAt(pos) {
      return this.viewState.lineBlockAt(pos);
    }
    get contentHeight() {
      return this.viewState.contentHeight;
    }
    moveByChar(start, forward, by) {
      return skipAtoms(this, start, moveByChar(this, start, forward, by));
    }
    moveByGroup(start, forward) {
      return skipAtoms(this, start, moveByChar(this, start, forward, (initial) => byGroup(this, start.head, initial)));
    }
    moveToLineBoundary(start, forward, includeWrap = true) {
      return moveToLineBoundary(this, start, forward, includeWrap);
    }
    moveVertically(start, forward, distance) {
      return skipAtoms(this, start, moveVertically(this, start, forward, distance));
    }
    domAtPos(pos) {
      return this.docView.domAtPos(pos);
    }
    posAtDOM(node, offset = 0) {
      return this.docView.posFromDOM(node, offset);
    }
    posAtCoords(coords, precise = true) {
      this.readMeasured();
      return posAtCoords(this, coords, precise);
    }
    coordsAtPos(pos, side = 1) {
      this.readMeasured();
      let rect = this.docView.coordsAt(pos, side);
      if (!rect || rect.left == rect.right)
        return rect;
      let line2 = this.state.doc.lineAt(pos), order = this.bidiSpans(line2);
      let span = order[BidiSpan.find(order, pos - line2.from, -1, side)];
      return flattenRect(rect, span.dir == Direction.LTR == side > 0);
    }
    get defaultCharacterWidth() {
      return this.viewState.heightOracle.charWidth;
    }
    get defaultLineHeight() {
      return this.viewState.heightOracle.lineHeight;
    }
    get textDirection() {
      return this.viewState.defaultTextDirection;
    }
    textDirectionAt(pos) {
      let perLine = this.state.facet(perLineTextDirection);
      if (!perLine || pos < this.viewport.from || pos > this.viewport.to)
        return this.textDirection;
      this.readMeasured();
      return this.docView.textDirectionAt(pos);
    }
    get lineWrapping() {
      return this.viewState.heightOracle.lineWrapping;
    }
    bidiSpans(line2) {
      if (line2.length > MaxBidiLine)
        return trivialOrder(line2.length);
      let dir = this.textDirectionAt(line2.from);
      for (let entry of this.bidiCache)
        if (entry.from == line2.from && entry.dir == dir)
          return entry.order;
      let order = computeOrder(line2.text, dir);
      this.bidiCache.push(new CachedOrder(line2.from, line2.to, dir, order));
      return order;
    }
    get hasFocus() {
      var _a2;
      return (this.dom.ownerDocument.hasFocus() || browser.safari && ((_a2 = this.inputState) === null || _a2 === void 0 ? void 0 : _a2.lastContextMenu) > Date.now() - 3e4) && this.root.activeElement == this.contentDOM;
    }
    focus() {
      this.observer.ignore(() => {
        focusPreventScroll(this.contentDOM);
        this.docView.updateSelection();
      });
    }
    setRoot(root) {
      if (this._root != root) {
        this._root = root;
        this.observer.setWindow((root.nodeType == 9 ? root : root.ownerDocument).defaultView || window);
        this.mountStyles();
      }
    }
    destroy() {
      for (let plugin of this.plugins)
        plugin.destroy(this);
      this.plugins = [];
      this.inputState.destroy();
      this.dom.remove();
      this.observer.destroy();
      if (this.measureScheduled > -1)
        cancelAnimationFrame(this.measureScheduled);
      this.destroyed = true;
    }
    static scrollIntoView(pos, options = {}) {
      return scrollIntoView.of(new ScrollTarget(typeof pos == "number" ? EditorSelection.cursor(pos) : pos, options.y, options.x, options.yMargin, options.xMargin));
    }
    static domEventHandlers(handlers2) {
      return ViewPlugin.define(() => ({}), { eventHandlers: handlers2 });
    }
    static theme(spec, options) {
      let prefix = StyleModule.newName();
      let result = [theme.of(prefix), styleModule.of(buildTheme(`.${prefix}`, spec))];
      if (options && options.dark)
        result.push(darkTheme.of(true));
      return result;
    }
    static baseTheme(spec) {
      return Prec.lowest(styleModule.of(buildTheme("." + baseThemeID, spec, lightDarkIDs)));
    }
    static findFromDOM(dom) {
      var _a2;
      let content2 = dom.querySelector(".cm-content");
      let cView = content2 && ContentView.get(content2) || ContentView.get(dom);
      return ((_a2 = cView === null || cView === void 0 ? void 0 : cView.rootView) === null || _a2 === void 0 ? void 0 : _a2.view) || null;
    }
  };
  EditorView.styleModule = styleModule;
  EditorView.inputHandler = inputHandler;
  EditorView.perLineTextDirection = perLineTextDirection;
  EditorView.exceptionSink = exceptionSink;
  EditorView.updateListener = updateListener;
  EditorView.editable = editable;
  EditorView.mouseSelectionStyle = mouseSelectionStyle;
  EditorView.dragMovesSelection = dragMovesSelection$1;
  EditorView.clickAddsSelectionRange = clickAddsSelectionRange;
  EditorView.decorations = decorations;
  EditorView.atomicRanges = atomicRanges;
  EditorView.scrollMargins = scrollMargins;
  EditorView.darkTheme = darkTheme;
  EditorView.contentAttributes = contentAttributes;
  EditorView.editorAttributes = editorAttributes;
  EditorView.lineWrapping = /* @__PURE__ */ EditorView.contentAttributes.of({ "class": "cm-lineWrapping" });
  EditorView.announce = /* @__PURE__ */ StateEffect.define();
  var MaxBidiLine = 4096;
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
  function attrsFromFacet(view, facet, base2) {
    for (let sources = view.state.facet(facet), i = sources.length - 1; i >= 0; i--) {
      let source = sources[i], value = typeof source == "function" ? source(view) : source;
      if (value)
        combineAttrs(value, base2);
    }
    return base2;
  }
  var currentPlatform = browser.mac ? "mac" : browser.windows ? "win" : browser.linux ? "linux" : "key";
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
  var handleKeyEvents = /* @__PURE__ */ Prec.default(/* @__PURE__ */ EditorView.domEventHandlers({
    keydown(event, view) {
      return runHandlers(getKeymap(view.state), event, view, "editor");
    }
  }));
  var keymap = /* @__PURE__ */ Facet.define({ enables: handleKeyEvents });
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
    let bound = /* @__PURE__ */ Object.create(null);
    let isPrefix = /* @__PURE__ */ Object.create(null);
    let checkPrefix = (name2, is) => {
      let current = isPrefix[name2];
      if (current == null)
        isPrefix[name2] = is;
      else if (current != is)
        throw new Error("Key binding " + name2 + " is used both as a regular binding and as a multi-stroke prefix");
    };
    let add = (scope, key, command2, preventDefault) => {
      var _a2, _b;
      let scopeObj = bound[scope] || (bound[scope] = /* @__PURE__ */ Object.create(null));
      let parts = key.split(/ (?!$)/).map((k) => normalizeKeyName(k, platform));
      for (let i = 1; i < parts.length; i++) {
        let prefix = parts.slice(0, i).join(" ");
        checkPrefix(prefix, true);
        if (!scopeObj[prefix])
          scopeObj[prefix] = {
            preventDefault: true,
            run: [(view) => {
              let ourObj = storedPrefix = { view, prefix, scope };
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
      let binding = scopeObj[full] || (scopeObj[full] = { preventDefault: false, run: ((_b = (_a2 = scopeObj._any) === null || _a2 === void 0 ? void 0 : _a2.run) === null || _b === void 0 ? void 0 : _b.slice()) || [] });
      if (command2)
        binding.run.push(command2);
      if (preventDefault)
        binding.preventDefault = true;
    };
    for (let b of bindings) {
      let scopes = b.scope ? b.scope.split(" ") : ["editor"];
      if (b.any)
        for (let scope of scopes) {
          let scopeObj = bound[scope] || (bound[scope] = /* @__PURE__ */ Object.create(null));
          if (!scopeObj._any)
            scopeObj._any = { preventDefault: false, run: [] };
          for (let key in scopeObj)
            scopeObj[key].run.push(b.any);
        }
      let name2 = b[platform] || b.key;
      if (!name2)
        continue;
      for (let scope of scopes) {
        add(scope, name2, b.run, b.preventDefault);
        if (b.shift)
          add(scope, "Shift-" + name2, b.shift, b.preventDefault);
      }
    }
    return bound;
  }
  function runHandlers(map, event, view, scope) {
    let name2 = keyName(event);
    let charCode = codePointAt(name2, 0), isChar = codePointSize(charCode) == name2.length && name2 != " ";
    let prefix = "", fallthrough = false;
    if (storedPrefix && storedPrefix.view == view && storedPrefix.scope == scope) {
      prefix = storedPrefix.prefix + " ";
      if (fallthrough = modifierCodes.indexOf(event.keyCode) < 0)
        storedPrefix = null;
    }
    let ran = /* @__PURE__ */ new Set();
    let runFor = (binding) => {
      if (binding) {
        for (let cmd2 of binding.run)
          if (!ran.has(cmd2)) {
            ran.add(cmd2);
            if (cmd2(view, event))
              return true;
          }
        if (binding.preventDefault)
          fallthrough = true;
      }
      return false;
    };
    let scopeObj = map[scope], baseName, shiftName;
    if (scopeObj) {
      if (runFor(scopeObj[prefix + modifiers(name2, event, !isChar)]))
        return true;
      if (isChar && (event.shiftKey || event.altKey || event.metaKey || charCode > 127) && (baseName = base[event.keyCode]) && baseName != name2) {
        if (runFor(scopeObj[prefix + modifiers(baseName, event, true)]))
          return true;
        else if (event.shiftKey && (shiftName = shift[event.keyCode]) != name2 && shiftName != baseName && runFor(scopeObj[prefix + modifiers(shiftName, event, false)]))
          return true;
      } else if (isChar && event.shiftKey) {
        if (runFor(scopeObj[prefix + modifiers(name2, event, true)]))
          return true;
      }
      if (runFor(scopeObj._any))
        return true;
    }
    return fallthrough;
  }
  var CanHidePrimary = !browser.ios;
  var themeSpec = {
    ".cm-line": {
      "& ::selection": { backgroundColor: "transparent !important" },
      "&::selection": { backgroundColor: "transparent !important" }
    }
  };
  if (CanHidePrimary)
    themeSpec[".cm-line"].caretColor = "transparent !important";
  var UnicodeRegexpSupport = /x/.unicode != null ? "gu" : "g";
  var Outside = "-10000px";
  var TooltipViewManager = class {
    constructor(view, facet, createTooltipView) {
      this.facet = facet;
      this.createTooltipView = createTooltipView;
      this.input = view.state.facet(facet);
      this.tooltips = this.input.filter((t2) => t2);
      this.tooltipViews = this.tooltips.map(createTooltipView);
    }
    update(update) {
      let input = update.state.facet(this.facet);
      let tooltips = input.filter((x) => x);
      if (input === this.input) {
        for (let t2 of this.tooltipViews)
          if (t2.update)
            t2.update(update);
        return false;
      }
      let tooltipViews = [];
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
          tooltipViews[i] = this.createTooltipView(tip);
        } else {
          let tooltipView = tooltipViews[i] = this.tooltipViews[known];
          if (tooltipView.update)
            tooltipView.update(update);
        }
      }
      for (let t2 of this.tooltipViews)
        if (tooltipViews.indexOf(t2) < 0)
          t2.dom.remove();
      this.input = input;
      this.tooltips = tooltips;
      this.tooltipViews = tooltipViews;
      return true;
    }
  };
  function windowSpace(view) {
    let { win } = view;
    return { top: 0, left: 0, bottom: win.innerHeight, right: win.innerWidth };
  }
  var tooltipConfig = /* @__PURE__ */ Facet.define({
    combine: (values) => {
      var _a2, _b, _c;
      return {
        position: browser.ios ? "absolute" : ((_a2 = values.find((conf) => conf.position)) === null || _a2 === void 0 ? void 0 : _a2.position) || "fixed",
        parent: ((_b = values.find((conf) => conf.parent)) === null || _b === void 0 ? void 0 : _b.parent) || null,
        tooltipSpace: ((_c = values.find((conf) => conf.tooltipSpace)) === null || _c === void 0 ? void 0 : _c.tooltipSpace) || windowSpace
      };
    }
  });
  var tooltipPlugin = /* @__PURE__ */ ViewPlugin.fromClass(class {
    constructor(view) {
      this.view = view;
      this.inView = true;
      this.lastTransaction = 0;
      this.measureTimeout = -1;
      let config2 = view.state.facet(tooltipConfig);
      this.position = config2.position;
      this.parent = config2.parent;
      this.classes = view.themeClasses;
      this.createContainer();
      this.measureReq = { read: this.readMeasure.bind(this), write: this.writeMeasure.bind(this), key: this };
      this.manager = new TooltipViewManager(view, showTooltip, (t2) => this.createTooltip(t2));
      this.intersectionObserver = typeof IntersectionObserver == "function" ? new IntersectionObserver((entries) => {
        if (Date.now() > this.lastTransaction - 50 && entries.length > 0 && entries[entries.length - 1].intersectionRatio < 1)
          this.measureSoon();
      }, { threshold: [1] }) : null;
      this.observeIntersection();
      view.win.addEventListener("resize", this.measureSoon = this.measureSoon.bind(this));
      this.maybeMeasure();
    }
    createContainer() {
      if (this.parent) {
        this.container = document.createElement("div");
        this.container.style.position = "relative";
        this.container.className = this.view.themeClasses;
        this.parent.appendChild(this.container);
      } else {
        this.container = this.view.dom;
      }
    }
    observeIntersection() {
      if (this.intersectionObserver) {
        this.intersectionObserver.disconnect();
        for (let tooltip of this.manager.tooltipViews)
          this.intersectionObserver.observe(tooltip.dom);
      }
    }
    measureSoon() {
      if (this.measureTimeout < 0)
        this.measureTimeout = setTimeout(() => {
          this.measureTimeout = -1;
          this.maybeMeasure();
        }, 50);
    }
    update(update) {
      if (update.transactions.length)
        this.lastTransaction = Date.now();
      let updated = this.manager.update(update);
      if (updated)
        this.observeIntersection();
      let shouldMeasure = updated || update.geometryChanged;
      let newConfig = update.state.facet(tooltipConfig);
      if (newConfig.position != this.position) {
        this.position = newConfig.position;
        for (let t2 of this.manager.tooltipViews)
          t2.dom.style.position = this.position;
        shouldMeasure = true;
      }
      if (newConfig.parent != this.parent) {
        if (this.parent)
          this.container.remove();
        this.parent = newConfig.parent;
        this.createContainer();
        for (let t2 of this.manager.tooltipViews)
          this.container.appendChild(t2.dom);
        shouldMeasure = true;
      } else if (this.parent && this.view.themeClasses != this.classes) {
        this.classes = this.container.className = this.view.themeClasses;
      }
      if (shouldMeasure)
        this.maybeMeasure();
    }
    createTooltip(tooltip) {
      let tooltipView = tooltip.create(this.view);
      tooltipView.dom.classList.add("cm-tooltip");
      if (tooltip.arrow && !tooltipView.dom.querySelector(".cm-tooltip > .cm-tooltip-arrow")) {
        let arrow = document.createElement("div");
        arrow.className = "cm-tooltip-arrow";
        tooltipView.dom.appendChild(arrow);
      }
      tooltipView.dom.style.position = this.position;
      tooltipView.dom.style.top = Outside;
      this.container.appendChild(tooltipView.dom);
      if (tooltipView.mount)
        tooltipView.mount(this.view);
      return tooltipView;
    }
    destroy() {
      var _a2;
      this.view.win.removeEventListener("resize", this.measureSoon);
      for (let { dom } of this.manager.tooltipViews)
        dom.remove();
      (_a2 = this.intersectionObserver) === null || _a2 === void 0 ? void 0 : _a2.disconnect();
      clearTimeout(this.measureTimeout);
    }
    readMeasure() {
      let editor = this.view.dom.getBoundingClientRect();
      return {
        editor,
        parent: this.parent ? this.container.getBoundingClientRect() : editor,
        pos: this.manager.tooltips.map((t2, i) => {
          let tv = this.manager.tooltipViews[i];
          return tv.getCoords ? tv.getCoords(t2.pos) : this.view.coordsAtPos(t2.pos);
        }),
        size: this.manager.tooltipViews.map(({ dom }) => dom.getBoundingClientRect()),
        space: this.view.state.facet(tooltipConfig).tooltipSpace(this.view)
      };
    }
    writeMeasure(measured) {
      let { editor, space } = measured;
      let others = [];
      for (let i = 0; i < this.manager.tooltips.length; i++) {
        let tooltip = this.manager.tooltips[i], tView = this.manager.tooltipViews[i], { dom } = tView;
        let pos = measured.pos[i], size = measured.size[i];
        if (!pos || pos.bottom <= Math.max(editor.top, space.top) || pos.top >= Math.min(editor.bottom, space.bottom) || pos.right < Math.max(editor.left, space.left) - 0.1 || pos.left > Math.min(editor.right, space.right) + 0.1) {
          dom.style.top = Outside;
          continue;
        }
        let arrow = tooltip.arrow ? tView.dom.querySelector(".cm-tooltip-arrow") : null;
        let arrowHeight = arrow ? 7 : 0;
        let width = size.right - size.left, height = size.bottom - size.top;
        let offset = tView.offset || noOffset, ltr = this.view.textDirection == Direction.LTR;
        let left = size.width > space.right - space.left ? ltr ? space.left : space.right - size.width : ltr ? Math.min(pos.left - (arrow ? 14 : 0) + offset.x, space.right - width) : Math.max(space.left, pos.left - width + (arrow ? 14 : 0) - offset.x);
        let above = !!tooltip.above;
        if (!tooltip.strictSide && (above ? pos.top - (size.bottom - size.top) - offset.y < space.top : pos.bottom + (size.bottom - size.top) + offset.y > space.bottom) && above == space.bottom - pos.bottom > pos.top - space.top)
          above = !above;
        let top2 = above ? pos.top - height - arrowHeight - offset.y : pos.bottom + arrowHeight + offset.y;
        let right = left + width;
        if (tView.overlap !== true) {
          for (let r of others)
            if (r.left < right && r.right > left && r.top < top2 + height && r.bottom > top2)
              top2 = above ? r.top - height - 2 - arrowHeight : r.bottom + arrowHeight + 2;
        }
        if (this.position == "absolute") {
          dom.style.top = top2 - measured.parent.top + "px";
          dom.style.left = left - measured.parent.left + "px";
        } else {
          dom.style.top = top2 + "px";
          dom.style.left = left + "px";
        }
        if (arrow)
          arrow.style.left = `${pos.left + (ltr ? offset.x : -offset.x) - (left + 14 - 7)}px`;
        if (tView.overlap !== true)
          others.push({ left, top: top2, right, bottom: top2 + height });
        dom.classList.toggle("cm-tooltip-above", above);
        dom.classList.toggle("cm-tooltip-below", !above);
        if (tView.positioned)
          tView.positioned();
      }
    }
    maybeMeasure() {
      if (this.manager.tooltips.length) {
        if (this.view.inView)
          this.view.requestMeasure(this.measureReq);
        if (this.inView != this.view.inView) {
          this.inView = this.view.inView;
          if (!this.inView)
            for (let tv of this.manager.tooltipViews)
              tv.dom.style.top = Outside;
        }
      }
    }
  }, {
    eventHandlers: {
      scroll() {
        this.maybeMeasure();
      }
    }
  });
  var baseTheme = /* @__PURE__ */ EditorView.baseTheme({
    ".cm-tooltip": {
      zIndex: 100
    },
    "&light .cm-tooltip": {
      border: "1px solid #bbb",
      backgroundColor: "#f5f5f5"
    },
    "&light .cm-tooltip-section:not(:first-child)": {
      borderTop: "1px solid #bbb"
    },
    "&dark .cm-tooltip": {
      backgroundColor: "#333338",
      color: "white"
    },
    ".cm-tooltip-arrow": {
      height: `${7}px`,
      width: `${7 * 2}px`,
      position: "absolute",
      zIndex: -1,
      overflow: "hidden",
      "&:before, &:after": {
        content: "''",
        position: "absolute",
        width: 0,
        height: 0,
        borderLeft: `${7}px solid transparent`,
        borderRight: `${7}px solid transparent`
      },
      ".cm-tooltip-above &": {
        bottom: `-${7}px`,
        "&:before": {
          borderTop: `${7}px solid #bbb`
        },
        "&:after": {
          borderTop: `${7}px solid #f5f5f5`,
          bottom: "1px"
        }
      },
      ".cm-tooltip-below &": {
        top: `-${7}px`,
        "&:before": {
          borderBottom: `${7}px solid #bbb`
        },
        "&:after": {
          borderBottom: `${7}px solid #f5f5f5`,
          top: "1px"
        }
      }
    },
    "&dark .cm-tooltip .cm-tooltip-arrow": {
      "&:before": {
        borderTopColor: "#333338",
        borderBottomColor: "#333338"
      },
      "&:after": {
        borderTopColor: "transparent",
        borderBottomColor: "transparent"
      }
    }
  });
  var noOffset = { x: 0, y: 0 };
  var showTooltip = /* @__PURE__ */ Facet.define({
    enables: [tooltipPlugin, baseTheme]
  });
  var showHoverTooltip = /* @__PURE__ */ Facet.define();
  var HoverTooltipHost = class {
    constructor(view) {
      this.view = view;
      this.mounted = false;
      this.dom = document.createElement("div");
      this.dom.classList.add("cm-tooltip-hover");
      this.manager = new TooltipViewManager(view, showHoverTooltip, (t2) => this.createHostedView(t2));
    }
    static create(view) {
      return new HoverTooltipHost(view);
    }
    createHostedView(tooltip) {
      let hostedView = tooltip.create(this.view);
      hostedView.dom.classList.add("cm-tooltip-section");
      this.dom.appendChild(hostedView.dom);
      if (this.mounted && hostedView.mount)
        hostedView.mount(this.view);
      return hostedView;
    }
    mount(view) {
      for (let hostedView of this.manager.tooltipViews) {
        if (hostedView.mount)
          hostedView.mount(view);
      }
      this.mounted = true;
    }
    positioned() {
      for (let hostedView of this.manager.tooltipViews) {
        if (hostedView.positioned)
          hostedView.positioned();
      }
    }
    update(update) {
      this.manager.update(update);
    }
  };
  var showHoverTooltipHost = /* @__PURE__ */ showTooltip.compute([showHoverTooltip], (state) => {
    let tooltips = state.facet(showHoverTooltip).filter((t2) => t2);
    if (tooltips.length === 0)
      return null;
    return {
      pos: Math.min(...tooltips.map((t2) => t2.pos)),
      end: Math.max(...tooltips.filter((t2) => t2.end != null).map((t2) => t2.end)),
      create: HoverTooltipHost.create,
      above: tooltips[0].above,
      arrow: tooltips.some((t2) => t2.arrow)
    };
  });
  var HoverPlugin = class {
    constructor(view, source, field, setHover, hoverTime) {
      this.view = view;
      this.source = source;
      this.field = field;
      this.setHover = setHover;
      this.hoverTime = hoverTime;
      this.hoverTimeout = -1;
      this.restartTimeout = -1;
      this.pending = null;
      this.lastMove = { x: 0, y: 0, target: view.dom, time: 0 };
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
      let hovered = Date.now() - this.lastMove.time;
      if (hovered < this.hoverTime)
        this.hoverTimeout = setTimeout(this.checkHover, this.hoverTime - hovered);
      else
        this.startHover();
    }
    startHover() {
      clearTimeout(this.restartTimeout);
      let { lastMove } = this;
      let pos = this.view.contentDOM.contains(lastMove.target) ? this.view.posAtCoords(lastMove) : null;
      if (pos == null)
        return;
      let posCoords = this.view.coordsAtPos(pos);
      if (posCoords == null || lastMove.y < posCoords.top || lastMove.y > posCoords.bottom || lastMove.x < posCoords.left - this.view.defaultCharacterWidth || lastMove.x > posCoords.right + this.view.defaultCharacterWidth)
        return;
      let bidi = this.view.bidiSpans(this.view.state.doc.lineAt(pos)).find((s) => s.from <= pos && s.to >= pos);
      let rtl = bidi && bidi.dir == Direction.RTL ? -1 : 1;
      let open = this.source(this.view, pos, lastMove.x < posCoords.left ? -rtl : rtl);
      if (open === null || open === void 0 ? void 0 : open.then) {
        let pending = this.pending = { pos };
        open.then((result) => {
          if (this.pending == pending) {
            this.pending = null;
            if (result)
              this.view.dispatch({ effects: this.setHover.of(result) });
          }
        }, (e) => logException(this.view.state, e, "hover tooltip"));
      } else if (open) {
        this.view.dispatch({ effects: this.setHover.of(open) });
      }
    }
    mousemove(event) {
      var _a2;
      this.lastMove = { x: event.clientX, y: event.clientY, target: event.target, time: Date.now() };
      if (this.hoverTimeout < 0)
        this.hoverTimeout = setTimeout(this.checkHover, this.hoverTime);
      let tooltip = this.active;
      if (tooltip && !isInTooltip(this.lastMove.target) || this.pending) {
        let { pos } = tooltip || this.pending, end = (_a2 = tooltip === null || tooltip === void 0 ? void 0 : tooltip.end) !== null && _a2 !== void 0 ? _a2 : pos;
        if (pos == end ? this.view.posAtCoords(this.lastMove) != pos : !isOverRange(this.view, pos, end, event.clientX, event.clientY, 6)) {
          this.view.dispatch({ effects: this.setHover.of(null) });
          this.pending = null;
        }
      }
    }
    mouseleave() {
      clearTimeout(this.hoverTimeout);
      this.hoverTimeout = -1;
      if (this.active)
        this.view.dispatch({ effects: this.setHover.of(null) });
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
    let setHover = StateEffect.define();
    let hoverState = StateField.define({
      create() {
        return null;
      },
      update(value, tr) {
        if (value && (options.hideOnChange && (tr.docChanged || tr.selection) || options.hideOn && options.hideOn(tr, value)))
          return null;
        if (value && tr.docChanged) {
          let newPos = tr.changes.mapPos(value.pos, -1, MapMode.TrackDel);
          if (newPos == null)
            return null;
          let copy = Object.assign(/* @__PURE__ */ Object.create(null), value);
          copy.pos = newPos;
          if (value.end != null)
            copy.end = tr.changes.mapPos(value.end);
          value = copy;
        }
        for (let effect of tr.effects) {
          if (effect.is(setHover))
            value = effect.value;
          if (effect.is(closeHoverTooltipEffect))
            value = null;
        }
        return value;
      },
      provide: (f) => showHoverTooltip.from(f)
    });
    return [
      hoverState,
      ViewPlugin.define((view) => new HoverPlugin(view, source, hoverState, setHover, options.hoverTime || 300)),
      showHoverTooltipHost
    ];
  }
  var closeHoverTooltipEffect = /* @__PURE__ */ StateEffect.define();
  var GutterMarker = class extends RangeValue {
    compare(other) {
      return this == other || this.constructor == other.constructor && this.eq(other);
    }
    eq(other) {
      return false;
    }
    destroy(dom) {
    }
  };
  GutterMarker.prototype.elementClass = "";
  GutterMarker.prototype.toDOM = void 0;
  GutterMarker.prototype.mapMode = MapMode.TrackBefore;
  GutterMarker.prototype.startSide = GutterMarker.prototype.endSide = -1;
  GutterMarker.prototype.point = true;
  var gutterLineClass = /* @__PURE__ */ Facet.define();
  var activeGutters = /* @__PURE__ */ Facet.define();
  var unfixGutters = /* @__PURE__ */ Facet.define({
    combine: (values) => values.some((x) => x)
  });
  function gutters(config2) {
    let result = [
      gutterView
    ];
    if (config2 && config2.fixed === false)
      result.push(unfixGutters.of(true));
    return result;
  }
  var gutterView = /* @__PURE__ */ ViewPlugin.fromClass(class {
    constructor(view) {
      this.view = view;
      this.prevViewport = view.viewport;
      this.dom = document.createElement("div");
      this.dom.className = "cm-gutters";
      this.dom.setAttribute("aria-hidden", "true");
      this.dom.style.minHeight = this.view.contentHeight + "px";
      this.gutters = view.state.facet(activeGutters).map((conf) => new SingleGutterView(view, conf));
      for (let gutter2 of this.gutters)
        this.dom.appendChild(gutter2.dom);
      this.fixed = !view.state.facet(unfixGutters);
      if (this.fixed) {
        this.dom.style.position = "sticky";
      }
      this.syncGutters(false);
      view.scrollDOM.insertBefore(this.dom, view.contentDOM);
    }
    update(update) {
      if (this.updateGutters(update)) {
        let vpA = this.prevViewport, vpB = update.view.viewport;
        let vpOverlap = Math.min(vpA.to, vpB.to) - Math.max(vpA.from, vpB.from);
        this.syncGutters(vpOverlap < (vpB.to - vpB.from) * 0.8);
      }
      if (update.geometryChanged)
        this.dom.style.minHeight = this.view.contentHeight + "px";
      if (this.view.state.facet(unfixGutters) != !this.fixed) {
        this.fixed = !this.fixed;
        this.dom.style.position = this.fixed ? "sticky" : "";
      }
      this.prevViewport = update.view.viewport;
    }
    syncGutters(detach) {
      let after = this.dom.nextSibling;
      if (detach)
        this.dom.remove();
      let lineClasses = RangeSet.iter(this.view.state.facet(gutterLineClass), this.view.viewport.from);
      let classSet = [];
      let contexts = this.gutters.map((gutter2) => new UpdateContext(gutter2, this.view.viewport, -this.view.documentPadding.top));
      for (let line2 of this.view.viewportLineBlocks) {
        let text;
        if (Array.isArray(line2.type)) {
          for (let b of line2.type)
            if (b.type == BlockType.Text) {
              text = b;
              break;
            }
        } else {
          text = line2.type == BlockType.Text ? line2 : void 0;
        }
        if (!text)
          continue;
        if (classSet.length)
          classSet = [];
        advanceCursor(lineClasses, classSet, line2.from);
        for (let cx of contexts)
          cx.line(this.view, text, classSet);
      }
      for (let cx of contexts)
        cx.finish();
      if (detach)
        this.view.scrollDOM.insertBefore(this.dom, after);
    }
    updateGutters(update) {
      let prev = update.startState.facet(activeGutters), cur = update.state.facet(activeGutters);
      let change = update.docChanged || update.heightChanged || update.viewportChanged || !RangeSet.eq(update.startState.facet(gutterLineClass), update.state.facet(gutterLineClass), update.view.viewport.from, update.view.viewport.to);
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
        for (let g of this.gutters) {
          g.dom.remove();
          if (gutters2.indexOf(g) < 0)
            g.destroy();
        }
        for (let g of gutters2)
          this.dom.appendChild(g.dom);
        this.gutters = gutters2;
      }
      return change;
    }
    destroy() {
      for (let view of this.gutters)
        view.destroy();
      this.dom.remove();
    }
  }, {
    provide: (plugin) => EditorView.scrollMargins.of((view) => {
      let value = view.plugin(plugin);
      if (!value || value.gutters.length == 0 || !value.fixed)
        return null;
      return view.textDirection == Direction.LTR ? { left: value.dom.offsetWidth } : { right: value.dom.offsetWidth };
    })
  });
  function asArray2(val) {
    return Array.isArray(val) ? val : [val];
  }
  function advanceCursor(cursor2, collect, pos) {
    while (cursor2.value && cursor2.from <= pos) {
      if (cursor2.from == pos)
        collect.push(cursor2.value);
      cursor2.next();
    }
  }
  var UpdateContext = class {
    constructor(gutter2, viewport, height) {
      this.gutter = gutter2;
      this.height = height;
      this.localMarkers = [];
      this.i = 0;
      this.cursor = RangeSet.iter(gutter2.markers, viewport.from);
    }
    line(view, line2, extraMarkers) {
      if (this.localMarkers.length)
        this.localMarkers = [];
      advanceCursor(this.cursor, this.localMarkers, line2.from);
      let localMarkers = extraMarkers.length ? this.localMarkers.concat(extraMarkers) : this.localMarkers;
      let forLine = this.gutter.config.lineMarker(view, line2, localMarkers);
      if (forLine)
        localMarkers.unshift(forLine);
      let gutter2 = this.gutter;
      if (localMarkers.length == 0 && !gutter2.config.renderEmptyElements)
        return;
      let above = line2.top - this.height;
      if (this.i == gutter2.elements.length) {
        let newElt = new GutterElement(view, line2.height, above, localMarkers);
        gutter2.elements.push(newElt);
        gutter2.dom.appendChild(newElt.dom);
      } else {
        gutter2.elements[this.i].update(view, line2.height, above, localMarkers);
      }
      this.height = line2.bottom;
      this.i++;
    }
    finish() {
      let gutter2 = this.gutter;
      while (gutter2.elements.length > this.i) {
        let last = gutter2.elements.pop();
        gutter2.dom.removeChild(last.dom);
        last.destroy();
      }
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
          let line2 = view.lineBlockAtHeight(event.clientY - view.documentTop);
          if (config2.domEventHandlers[prop](view, line2, event))
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
      let vp = update.view.viewport;
      return !RangeSet.eq(this.markers, prevMarkers, vp.from, vp.to) || (this.config.lineMarkerChange ? this.config.lineMarkerChange(update) : false);
    }
    destroy() {
      for (let elt of this.elements)
        elt.destroy();
    }
  };
  var GutterElement = class {
    constructor(view, height, above, markers) {
      this.height = -1;
      this.above = 0;
      this.markers = [];
      this.dom = document.createElement("div");
      this.dom.className = "cm-gutterElement";
      this.update(view, height, above, markers);
    }
    update(view, height, above, markers) {
      if (this.height != height)
        this.dom.style.height = (this.height = height) + "px";
      if (this.above != above)
        this.dom.style.marginTop = (this.above = above) ? above + "px" : "";
      if (!sameMarkers(this.markers, markers))
        this.setMarkers(view, markers);
    }
    setMarkers(view, markers) {
      let cls = "cm-gutterElement", domPos = this.dom.firstChild;
      for (let iNew = 0, iOld = 0; ; ) {
        let skipTo = iOld, marker = iNew < markers.length ? markers[iNew++] : null, matched = false;
        if (marker) {
          let c = marker.elementClass;
          if (c)
            cls += " " + c;
          for (let i = iOld; i < this.markers.length; i++)
            if (this.markers[i].compare(marker)) {
              skipTo = i;
              matched = true;
              break;
            }
        } else {
          skipTo = this.markers.length;
        }
        while (iOld < skipTo) {
          let next3 = this.markers[iOld++];
          if (next3.toDOM) {
            next3.destroy(domPos);
            let after = domPos.nextSibling;
            domPos.remove();
            domPos = after;
          }
        }
        if (!marker)
          break;
        if (marker.toDOM) {
          if (matched)
            domPos = domPos.nextSibling;
          else
            this.dom.insertBefore(marker.toDOM(view), domPos);
        }
        if (matched)
          iOld++;
      }
      this.dom.className = cls;
      this.markers = markers;
    }
    destroy() {
      this.setMarkers(null, []);
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
      return combineConfig(values, { formatNumber: String, domEventHandlers: {} }, {
        domEventHandlers(a, b) {
          let result = Object.assign({}, a);
          for (let event in b) {
            let exists = result[event], add = b[event];
            result[event] = exists ? (view, line2, event2) => exists(view, line2, event2) || add(view, line2, event2) : add;
          }
          return result;
        }
      });
    }
  });
  var NumberMarker = class extends GutterMarker {
    constructor(number3) {
      super();
      this.number = number3;
    }
    eq(other) {
      return this.number == other.number;
    }
    toDOM() {
      return document.createTextNode(this.number);
    }
  };
  function formatNumber(view, number3) {
    return view.state.facet(lineNumberConfig).formatNumber(number3, view.state);
  }
  var lineNumberGutter = /* @__PURE__ */ activeGutters.compute([lineNumberConfig], (state) => ({
    class: "cm-lineNumbers",
    renderEmptyElements: false,
    markers(view) {
      return view.state.facet(lineNumberMarkers);
    },
    lineMarker(view, line2, others) {
      if (others.some((m) => m.toDOM))
        return null;
      return new NumberMarker(formatNumber(view, view.state.doc.lineAt(line2.from).number));
    },
    lineMarkerChange: (update) => update.startState.facet(lineNumberConfig) != update.state.facet(lineNumberConfig),
    initialSpacer(view) {
      return new NumberMarker(formatNumber(view, maxLineNumber(view.state.doc.lines)));
    },
    updateSpacer(spacer, update) {
      let max = formatNumber(update.view, maxLineNumber(update.view.state.doc.lines));
      return max == spacer.number ? spacer : new NumberMarker(max);
    },
    domEventHandlers: state.facet(lineNumberConfig).domEventHandlers
  }));
  function lineNumbers(config2 = {}) {
    return [
      lineNumberConfig.of(config2),
      gutters(),
      lineNumberGutter
    ];
  }
  function maxLineNumber(lines2) {
    let last = 9;
    while (last < lines2)
      last = last * 10 + 9;
    return last;
  }

  // node_modules/@lezer/common/dist/index.js
  var DefaultBufferLength = 1024;
  var nextPropID = 0;
  var Range2 = class {
    constructor(from, to) {
      this.from = from;
      this.to = to;
    }
  };
  var NodeProp = class {
    constructor(config2 = {}) {
      this.id = nextPropID++;
      this.perNode = !!config2.perNode;
      this.deserialize = config2.deserialize || (() => {
        throw new Error("This node type doesn't define a deserialize function");
      });
    }
    add(match2) {
      if (this.perNode)
        throw new RangeError("Can't add per-node props to node types");
      if (typeof match2 != "function")
        match2 = NodeType.match(match2);
      return (type) => {
        let result = match2(type);
        return result === void 0 ? null : [this, result];
      };
    }
  };
  NodeProp.closedBy = new NodeProp({ deserialize: (str) => str.split(" ") });
  NodeProp.openedBy = new NodeProp({ deserialize: (str) => str.split(" ") });
  NodeProp.group = new NodeProp({ deserialize: (str) => str.split(" ") });
  NodeProp.contextHash = new NodeProp({ perNode: true });
  NodeProp.lookAhead = new NodeProp({ perNode: true });
  NodeProp.mounted = new NodeProp({ perNode: true });
  var noProps = /* @__PURE__ */ Object.create(null);
  var NodeType = class {
    constructor(name2, props, id2, flags = 0) {
      this.name = name2;
      this.props = props;
      this.id = id2;
      this.flags = flags;
    }
    static define(spec) {
      let props = spec.props && spec.props.length ? /* @__PURE__ */ Object.create(null) : noProps;
      let flags = (spec.top ? 1 : 0) | (spec.skipped ? 2 : 0) | (spec.error ? 4 : 0) | (spec.name == null ? 8 : 0);
      let type = new NodeType(spec.name || "", props, spec.id, flags);
      if (spec.props)
        for (let src of spec.props) {
          if (!Array.isArray(src))
            src = src(type);
          if (src) {
            if (src[0].perNode)
              throw new RangeError("Can't store a per-node prop on a node type");
            props[src[0].id] = src[1];
          }
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
      let direct = /* @__PURE__ */ Object.create(null);
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
  NodeType.none = new NodeType("", /* @__PURE__ */ Object.create(null), 0, 8);
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
            newProps[add[0].id] = add[1];
          }
        }
        newTypes.push(newProps ? new NodeType(type.name, newProps, type.id, type.flags) : type);
      }
      return new NodeSet(newTypes);
    }
  };
  var CachedNode = /* @__PURE__ */ new WeakMap();
  var CachedInnerNode = /* @__PURE__ */ new WeakMap();
  var IterMode;
  (function(IterMode2) {
    IterMode2[IterMode2["ExcludeBuffers"] = 1] = "ExcludeBuffers";
    IterMode2[IterMode2["IncludeAnonymous"] = 2] = "IncludeAnonymous";
    IterMode2[IterMode2["IgnoreMounts"] = 4] = "IgnoreMounts";
    IterMode2[IterMode2["IgnoreOverlays"] = 8] = "IgnoreOverlays";
  })(IterMode || (IterMode = {}));
  var Tree = class {
    constructor(type, children, positions, length, props) {
      this.type = type;
      this.children = children;
      this.positions = positions;
      this.length = length;
      this.props = null;
      if (props && props.length) {
        this.props = /* @__PURE__ */ Object.create(null);
        for (let [prop, value] of props)
          this.props[typeof prop == "number" ? prop : prop.id] = value;
      }
    }
    toString() {
      let mounted = this.prop(NodeProp.mounted);
      if (mounted && !mounted.overlay)
        return mounted.tree.toString();
      let children = "";
      for (let ch of this.children) {
        let str = ch.toString();
        if (str) {
          if (children)
            children += ",";
          children += str;
        }
      }
      return !this.type.name ? children : (/\W/.test(this.type.name) && !this.type.isError ? JSON.stringify(this.type.name) : this.type.name) + (children.length ? "(" + children + ")" : "");
    }
    cursor(mode = 0) {
      return new TreeCursor(this.topNode, mode);
    }
    cursorAt(pos, side = 0, mode = 0) {
      let scope = CachedNode.get(this) || this.topNode;
      let cursor2 = new TreeCursor(scope);
      cursor2.moveTo(pos, side);
      CachedNode.set(this, cursor2._tree);
      return cursor2;
    }
    get topNode() {
      return new TreeNode(this, 0, 0, null);
    }
    resolve(pos, side = 0) {
      let node = resolveNode(CachedNode.get(this) || this.topNode, pos, side, false);
      CachedNode.set(this, node);
      return node;
    }
    resolveInner(pos, side = 0) {
      let node = resolveNode(CachedInnerNode.get(this) || this.topNode, pos, side, true);
      CachedInnerNode.set(this, node);
      return node;
    }
    iterate(spec) {
      let { enter, leave, from = 0, to = this.length } = spec;
      for (let c = this.cursor((spec.mode || 0) | IterMode.IncludeAnonymous); ; ) {
        let entered = false;
        if (c.from <= to && c.to >= from && (c.type.isAnonymous || enter(c) !== false)) {
          if (c.firstChild())
            continue;
          entered = true;
        }
        for (; ; ) {
          if (entered && leave && !c.type.isAnonymous)
            leave(c);
          if (c.nextSibling())
            break;
          if (!c.parent())
            return;
          entered = true;
        }
      }
    }
    prop(prop) {
      return !prop.perNode ? this.type.prop(prop) : this.props ? this.props[prop.id] : void 0;
    }
    get propValues() {
      let result = [];
      if (this.props)
        for (let id2 in this.props)
          result.push([+id2, this.props[id2]]);
      return result;
    }
    balance(config2 = {}) {
      return this.children.length <= 8 ? this : balanceRange(NodeType.none, this.children, this.positions, 0, this.children.length, 0, this.length, (children, positions, length) => new Tree(this.type, children, positions, length, this.propValues), config2.makeTree || ((children, positions, length) => new Tree(NodeType.none, children, positions, length)));
    }
    static build(data) {
      return buildTree(data);
    }
  };
  Tree.empty = new Tree(NodeType.none, [], [], 0);
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
  var TreeBuffer = class {
    constructor(buffer, length, set) {
      this.buffer = buffer;
      this.length = length;
      this.set = set;
    }
    get type() {
      return NodeType.none;
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
      let id2 = this.buffer[index], endIndex = this.buffer[index + 3];
      let type = this.set.types[id2], result = type.name;
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
    findChild(startIndex, endIndex, dir, pos, side) {
      let { buffer } = this, pick = -1;
      for (let i = startIndex; i != endIndex; i = buffer[i + 3]) {
        if (checkSide(side, pos, buffer[i + 1], buffer[i + 2])) {
          pick = i;
          if (dir > 0)
            break;
        }
      }
      return pick;
    }
    slice(startI, endI, from, to) {
      let b = this.buffer;
      let copy = new Uint16Array(endI - startI);
      for (let i = startI, j = 0; i < endI; ) {
        copy[j++] = b[i++];
        copy[j++] = b[i++] - from;
        copy[j++] = b[i++] - from;
        copy[j++] = b[i++] - startI;
      }
      return new TreeBuffer(copy, to - from, this.set);
    }
  };
  function checkSide(side, pos, from, to) {
    switch (side) {
      case -2:
        return from < pos;
      case -1:
        return to >= pos && from < pos;
      case 0:
        return from < pos && to > pos;
      case 1:
        return from <= pos && to > pos;
      case 2:
        return to > pos;
      case 4:
        return true;
    }
  }
  function enterUnfinishedNodesBefore(node, pos) {
    let scan = node.childBefore(pos);
    while (scan) {
      let last = scan.lastChild;
      if (!last || last.to != scan.to)
        break;
      if (last.type.isError && last.from == last.to) {
        node = scan;
        scan = last.prevSibling;
      } else {
        scan = last;
      }
    }
    return node;
  }
  function resolveNode(node, pos, side, overlays) {
    var _a2;
    while (node.from == node.to || (side < 1 ? node.from >= pos : node.from > pos) || (side > -1 ? node.to <= pos : node.to < pos)) {
      let parent = !overlays && node instanceof TreeNode && node.index < 0 ? null : node.parent;
      if (!parent)
        return node;
      node = parent;
    }
    let mode = overlays ? 0 : IterMode.IgnoreOverlays;
    if (overlays)
      for (let scan = node, parent = scan.parent; parent; scan = parent, parent = scan.parent) {
        if (scan instanceof TreeNode && scan.index < 0 && ((_a2 = parent.enter(pos, side, mode)) === null || _a2 === void 0 ? void 0 : _a2.from) != scan.from)
          node = parent;
      }
    for (; ; ) {
      let inner = node.enter(pos, side, mode);
      if (!inner)
        return node;
      node = inner;
    }
  }
  var TreeNode = class {
    constructor(_tree, from, index, _parent) {
      this._tree = _tree;
      this.from = from;
      this.index = index;
      this._parent = _parent;
    }
    get type() {
      return this._tree.type;
    }
    get name() {
      return this._tree.type.name;
    }
    get to() {
      return this.from + this._tree.length;
    }
    nextChild(i, dir, pos, side, mode = 0) {
      for (let parent = this; ; ) {
        for (let { children, positions } = parent._tree, e = dir > 0 ? children.length : -1; i != e; i += dir) {
          let next3 = children[i], start = positions[i] + parent.from;
          if (!checkSide(side, pos, start, start + next3.length))
            continue;
          if (next3 instanceof TreeBuffer) {
            if (mode & IterMode.ExcludeBuffers)
              continue;
            let index = next3.findChild(0, next3.buffer.length, dir, pos - start, side);
            if (index > -1)
              return new BufferNode(new BufferContext(parent, next3, i, start), null, index);
          } else if (mode & IterMode.IncludeAnonymous || (!next3.type.isAnonymous || hasChild(next3))) {
            let mounted;
            if (!(mode & IterMode.IgnoreMounts) && next3.props && (mounted = next3.prop(NodeProp.mounted)) && !mounted.overlay)
              return new TreeNode(mounted.tree, start, i, parent);
            let inner = new TreeNode(next3, start, i, parent);
            return mode & IterMode.IncludeAnonymous || !inner.type.isAnonymous ? inner : inner.nextChild(dir < 0 ? next3.children.length - 1 : 0, dir, pos, side);
          }
        }
        if (mode & IterMode.IncludeAnonymous || !parent.type.isAnonymous)
          return null;
        if (parent.index >= 0)
          i = parent.index + dir;
        else
          i = dir < 0 ? -1 : parent._parent._tree.children.length;
        parent = parent._parent;
        if (!parent)
          return null;
      }
    }
    get firstChild() {
      return this.nextChild(0, 1, 0, 4);
    }
    get lastChild() {
      return this.nextChild(this._tree.children.length - 1, -1, 0, 4);
    }
    childAfter(pos) {
      return this.nextChild(0, 1, pos, 2);
    }
    childBefore(pos) {
      return this.nextChild(this._tree.children.length - 1, -1, pos, -2);
    }
    enter(pos, side, mode = 0) {
      let mounted;
      if (!(mode & IterMode.IgnoreOverlays) && (mounted = this._tree.prop(NodeProp.mounted)) && mounted.overlay) {
        let rPos = pos - this.from;
        for (let { from, to } of mounted.overlay) {
          if ((side > 0 ? from <= rPos : from < rPos) && (side < 0 ? to >= rPos : to > rPos))
            return new TreeNode(mounted.tree, mounted.overlay[0].from + this.from, -1, this);
        }
      }
      return this.nextChild(0, 1, pos, side, mode);
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
      return this._parent && this.index >= 0 ? this._parent.nextChild(this.index + 1, 1, 0, 4) : null;
    }
    get prevSibling() {
      return this._parent && this.index >= 0 ? this._parent.nextChild(this.index - 1, -1, 0, 4) : null;
    }
    cursor(mode = 0) {
      return new TreeCursor(this, mode);
    }
    get tree() {
      return this._tree;
    }
    toTree() {
      return this._tree;
    }
    resolve(pos, side = 0) {
      return resolveNode(this, pos, side, false);
    }
    resolveInner(pos, side = 0) {
      return resolveNode(this, pos, side, true);
    }
    enterUnfinishedNodesBefore(pos) {
      return enterUnfinishedNodesBefore(this, pos);
    }
    getChild(type, before = null, after = null) {
      let r = getChildren(this, type, before, after);
      return r.length ? r[0] : null;
    }
    getChildren(type, before = null, after = null) {
      return getChildren(this, type, before, after);
    }
    toString() {
      return this._tree.toString();
    }
    get node() {
      return this;
    }
    matchContext(context) {
      return matchNodeContext(this, context);
    }
  };
  function getChildren(node, type, before, after) {
    let cur = node.cursor(), result = [];
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
  function matchNodeContext(node, context, i = context.length - 1) {
    for (let p = node.parent; i >= 0; p = p.parent) {
      if (!p)
        return false;
      if (!p.type.isAnonymous) {
        if (context[i] && context[i] != p.name)
          return false;
        i--;
      }
    }
    return true;
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
    child(dir, pos, side) {
      let { buffer } = this.context;
      let index = buffer.findChild(this.index + 4, buffer.buffer[this.index + 3], dir, pos - this.context.start, side);
      return index < 0 ? null : new BufferNode(this.context, this, index);
    }
    get firstChild() {
      return this.child(1, 0, 4);
    }
    get lastChild() {
      return this.child(-1, 0, 4);
    }
    childAfter(pos) {
      return this.child(1, pos, 2);
    }
    childBefore(pos) {
      return this.child(-1, pos, -2);
    }
    enter(pos, side, mode = 0) {
      if (mode & IterMode.ExcludeBuffers)
        return null;
      let { buffer } = this.context;
      let index = buffer.findChild(this.index + 4, buffer.buffer[this.index + 3], side > 0 ? 1 : -1, pos - this.context.start, side);
      return index < 0 ? null : new BufferNode(this.context, this, index);
    }
    get parent() {
      return this._parent || this.context.parent.nextSignificantParent();
    }
    externalSibling(dir) {
      return this._parent ? null : this.context.parent.nextChild(this.context.index + dir, dir, 0, 4);
    }
    get nextSibling() {
      let { buffer } = this.context;
      let after = buffer.buffer[this.index + 3];
      if (after < (this._parent ? buffer.buffer[this._parent.index + 3] : buffer.buffer.length))
        return new BufferNode(this.context, this._parent, after);
      return this.externalSibling(1);
    }
    get prevSibling() {
      let { buffer } = this.context;
      let parentStart = this._parent ? this._parent.index + 4 : 0;
      if (this.index == parentStart)
        return this.externalSibling(-1);
      return new BufferNode(this.context, this._parent, buffer.findChild(parentStart, this.index, -1, 0, 4));
    }
    cursor(mode = 0) {
      return new TreeCursor(this, mode);
    }
    get tree() {
      return null;
    }
    toTree() {
      let children = [], positions = [];
      let { buffer } = this.context;
      let startI = this.index + 4, endI = buffer.buffer[this.index + 3];
      if (endI > startI) {
        let from = buffer.buffer[this.index + 1], to = buffer.buffer[this.index + 2];
        children.push(buffer.slice(startI, endI, from, to));
        positions.push(0);
      }
      return new Tree(this.type, children, positions, this.to - this.from);
    }
    resolve(pos, side = 0) {
      return resolveNode(this, pos, side, false);
    }
    resolveInner(pos, side = 0) {
      return resolveNode(this, pos, side, true);
    }
    enterUnfinishedNodesBefore(pos) {
      return enterUnfinishedNodesBefore(this, pos);
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
    get node() {
      return this;
    }
    matchContext(context) {
      return matchNodeContext(this, context);
    }
  };
  var TreeCursor = class {
    constructor(node, mode = 0) {
      this.mode = mode;
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
      let { start, buffer } = this.buffer;
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
    enterChild(dir, pos, side) {
      if (!this.buffer)
        return this.yield(this._tree.nextChild(dir < 0 ? this._tree._tree.children.length - 1 : 0, dir, pos, side, this.mode));
      let { buffer } = this.buffer;
      let index = buffer.findChild(this.index + 4, buffer.buffer[this.index + 3], dir, pos - this.buffer.start, side);
      if (index < 0)
        return false;
      this.stack.push(this.index);
      return this.yieldBuf(index);
    }
    firstChild() {
      return this.enterChild(1, 0, 4);
    }
    lastChild() {
      return this.enterChild(-1, 0, 4);
    }
    childAfter(pos) {
      return this.enterChild(1, pos, 2);
    }
    childBefore(pos) {
      return this.enterChild(-1, pos, -2);
    }
    enter(pos, side, mode = this.mode) {
      if (!this.buffer)
        return this.yield(this._tree.enter(pos, side, mode));
      return mode & IterMode.ExcludeBuffers ? false : this.enterChild(1, pos, side);
    }
    parent() {
      if (!this.buffer)
        return this.yieldNode(this.mode & IterMode.IncludeAnonymous ? this._tree._parent : this._tree.parent);
      if (this.stack.length)
        return this.yieldBuf(this.stack.pop());
      let parent = this.mode & IterMode.IncludeAnonymous ? this.buffer.parent : this.buffer.parent.nextSignificantParent();
      this.buffer = null;
      return this.yieldNode(parent);
    }
    sibling(dir) {
      if (!this.buffer)
        return !this._tree._parent ? false : this.yield(this._tree.index < 0 ? null : this._tree._parent.nextChild(this._tree.index + dir, dir, 0, 4, this.mode));
      let { buffer } = this.buffer, d = this.stack.length - 1;
      if (dir < 0) {
        let parentStart = d < 0 ? 0 : this.stack[d] + 4;
        if (this.index != parentStart)
          return this.yieldBuf(buffer.findChild(parentStart, this.index, -1, 0, 4));
      } else {
        let after = buffer.buffer[this.index + 3];
        if (after < (d < 0 ? buffer.buffer.length : buffer.buffer[this.stack[d] + 3]))
          return this.yieldBuf(after);
      }
      return d < 0 ? this.yield(this.buffer.parent.nextChild(this.buffer.index + dir, dir, 0, 4, this.mode)) : false;
    }
    nextSibling() {
      return this.sibling(1);
    }
    prevSibling() {
      return this.sibling(-1);
    }
    atLastNode(dir) {
      let index, parent, { buffer } = this;
      if (buffer) {
        if (dir > 0) {
          if (this.index < buffer.buffer.buffer.length)
            return false;
        } else {
          for (let i = 0; i < this.index; i++)
            if (buffer.buffer.buffer[i + 3] < this.index)
              return false;
        }
        ({ index, parent } = buffer);
      } else {
        ({ index, _parent: parent } = this._tree);
      }
      for (; parent; { index, _parent: parent } = parent) {
        if (index > -1)
          for (let i = index + dir, e = dir < 0 ? -1 : parent._tree.children.length; i != e; i += dir) {
            let child = parent._tree.children[i];
            if (this.mode & IterMode.IncludeAnonymous || child instanceof TreeBuffer || !child.type.isAnonymous || hasChild(child))
              return false;
          }
      }
      return true;
    }
    move(dir, enter) {
      if (enter && this.enterChild(dir, 0, 4))
        return true;
      for (; ; ) {
        if (this.sibling(dir))
          return true;
        if (this.atLastNode(dir) || !this.parent())
          return false;
      }
    }
    next(enter = true) {
      return this.move(1, enter);
    }
    prev(enter = true) {
      return this.move(-1, enter);
    }
    moveTo(pos, side = 0) {
      while (this.from == this.to || (side < 1 ? this.from >= pos : this.from > pos) || (side > -1 ? this.to <= pos : this.to < pos))
        if (!this.parent())
          break;
      while (this.enterChild(1, pos, side)) {
      }
      return this;
    }
    get node() {
      if (!this.buffer)
        return this._tree;
      let cache = this.bufferNode, result = null, depth = 0;
      if (cache && cache.context == this.buffer) {
        scan:
          for (let index = this.index, d = this.stack.length; d >= 0; ) {
            for (let c = cache; c; c = c._parent)
              if (c.index == index) {
                if (index == this.index)
                  return c;
                result = c;
                depth = d + 1;
                break scan;
              }
            index = this.stack[--d];
          }
      }
      for (let i = depth; i < this.stack.length; i++)
        result = new BufferNode(this.buffer, result, this.stack[i]);
      return this.bufferNode = new BufferNode(this.buffer, result, this.index);
    }
    get tree() {
      return this.buffer ? null : this._tree._tree;
    }
    iterate(enter, leave) {
      for (let depth = 0; ; ) {
        let mustLeave = false;
        if (this.type.isAnonymous || enter(this) !== false) {
          if (this.firstChild()) {
            depth++;
            continue;
          }
          if (!this.type.isAnonymous)
            mustLeave = true;
        }
        for (; ; ) {
          if (mustLeave && leave)
            leave(this);
          mustLeave = this.type.isAnonymous;
          if (this.nextSibling())
            break;
          if (!depth)
            return;
          this.parent();
          depth--;
          mustLeave = true;
        }
      }
    }
    matchContext(context) {
      if (!this.buffer)
        return matchNodeContext(this.node, context);
      let { buffer } = this.buffer, { types: types2 } = buffer.set;
      for (let i = context.length - 1, d = this.stack.length - 1; i >= 0; d--) {
        if (d < 0)
          return matchNodeContext(this.node, context, i);
        let type = types2[buffer.buffer[this.stack[d]]];
        if (!type.isAnonymous) {
          if (context[i] && context[i] != type.name)
            return false;
          i--;
        }
      }
      return true;
    }
  };
  function hasChild(tree) {
    return tree.children.some((ch) => ch instanceof TreeBuffer || !ch.type.isAnonymous || hasChild(ch));
  }
  function buildTree(data) {
    var _a2;
    let { buffer, nodeSet, maxBufferLength = DefaultBufferLength, reused = [], minRepeatType = nodeSet.types.length } = data;
    let cursor2 = Array.isArray(buffer) ? new FlatBufferCursor(buffer, buffer.length) : buffer;
    let types2 = nodeSet.types;
    let contextHash = 0, lookAhead = 0;
    function takeNode(parentStart, minPos, children2, positions2, inRepeat) {
      let { id: id2, start, end, size } = cursor2;
      let lookAheadAtStart = lookAhead;
      while (size < 0) {
        cursor2.next();
        if (size == -1) {
          let node2 = reused[id2];
          children2.push(node2);
          positions2.push(start - parentStart);
          return;
        } else if (size == -3) {
          contextHash = id2;
          return;
        } else if (size == -4) {
          lookAhead = id2;
          return;
        } else {
          throw new RangeError(`Unrecognized record size: ${size}`);
        }
      }
      let type = types2[id2], node, buffer2;
      let startPos = start - parentStart;
      if (end - start <= maxBufferLength && (buffer2 = findBufferSize(cursor2.pos - minPos, inRepeat))) {
        let data2 = new Uint16Array(buffer2.size - buffer2.skip);
        let endPos = cursor2.pos - buffer2.size, index = data2.length;
        while (cursor2.pos > endPos)
          index = copyToBuffer(buffer2.start, data2, index);
        node = new TreeBuffer(data2, end - buffer2.start, nodeSet);
        startPos = buffer2.start - parentStart;
      } else {
        let endPos = cursor2.pos - size;
        cursor2.next();
        let localChildren = [], localPositions = [];
        let localInRepeat = id2 >= minRepeatType ? id2 : -1;
        let lastGroup = 0, lastEnd = end;
        while (cursor2.pos > endPos) {
          if (localInRepeat >= 0 && cursor2.id == localInRepeat && cursor2.size >= 0) {
            if (cursor2.end <= lastEnd - maxBufferLength) {
              makeRepeatLeaf(localChildren, localPositions, start, lastGroup, cursor2.end, lastEnd, localInRepeat, lookAheadAtStart);
              lastGroup = localChildren.length;
              lastEnd = cursor2.end;
            }
            cursor2.next();
          } else {
            takeNode(start, endPos, localChildren, localPositions, localInRepeat);
          }
        }
        if (localInRepeat >= 0 && lastGroup > 0 && lastGroup < localChildren.length)
          makeRepeatLeaf(localChildren, localPositions, start, lastGroup, start, lastEnd, localInRepeat, lookAheadAtStart);
        localChildren.reverse();
        localPositions.reverse();
        if (localInRepeat > -1 && lastGroup > 0) {
          let make = makeBalanced(type);
          node = balanceRange(type, localChildren, localPositions, 0, localChildren.length, 0, end - start, make, make);
        } else {
          node = makeTree(type, localChildren, localPositions, end - start, lookAheadAtStart - end);
        }
      }
      children2.push(node);
      positions2.push(startPos);
    }
    function makeBalanced(type) {
      return (children2, positions2, length2) => {
        let lookAhead2 = 0, lastI = children2.length - 1, last, lookAheadProp;
        if (lastI >= 0 && (last = children2[lastI]) instanceof Tree) {
          if (!lastI && last.type == type && last.length == length2)
            return last;
          if (lookAheadProp = last.prop(NodeProp.lookAhead))
            lookAhead2 = positions2[lastI] + last.length + lookAheadProp;
        }
        return makeTree(type, children2, positions2, length2, lookAhead2);
      };
    }
    function makeRepeatLeaf(children2, positions2, base2, i, from, to, type, lookAhead2) {
      let localChildren = [], localPositions = [];
      while (children2.length > i) {
        localChildren.push(children2.pop());
        localPositions.push(positions2.pop() + base2 - from);
      }
      children2.push(makeTree(nodeSet.types[type], localChildren, localPositions, to - from, lookAhead2 - to));
      positions2.push(from - base2);
    }
    function makeTree(type, children2, positions2, length2, lookAhead2 = 0, props) {
      if (contextHash) {
        let pair2 = [NodeProp.contextHash, contextHash];
        props = props ? [pair2].concat(props) : [pair2];
      }
      if (lookAhead2 > 25) {
        let pair2 = [NodeProp.lookAhead, lookAhead2];
        props = props ? [pair2].concat(props) : [pair2];
      }
      return new Tree(type, children2, positions2, length2, props);
    }
    function findBufferSize(maxSize, inRepeat) {
      let fork = cursor2.fork();
      let size = 0, start = 0, skip = 0, minStart = fork.end - maxBufferLength;
      let result = { size: 0, start: 0, skip: 0 };
      scan:
        for (let minPos = fork.pos - maxSize; fork.pos > minPos; ) {
          let nodeSize2 = fork.size;
          if (fork.id == inRepeat && nodeSize2 >= 0) {
            result.size = size;
            result.start = start;
            result.skip = skip;
            skip += 4;
            size += 4;
            fork.next();
            continue;
          }
          let startPos = fork.pos - nodeSize2;
          if (nodeSize2 < 0 || startPos < minPos || fork.start < minStart)
            break;
          let localSkipped = fork.id >= minRepeatType ? 4 : 0;
          let nodeStart2 = fork.start;
          fork.next();
          while (fork.pos > startPos) {
            if (fork.size < 0) {
              if (fork.size == -3)
                localSkipped += 4;
              else
                break scan;
            } else if (fork.id >= minRepeatType) {
              localSkipped += 4;
            }
            fork.next();
          }
          start = nodeStart2;
          size += nodeSize2;
          skip += localSkipped;
        }
      if (inRepeat < 0 || size == maxSize) {
        result.size = size;
        result.start = start;
        result.skip = skip;
      }
      return result.size > 4 ? result : void 0;
    }
    function copyToBuffer(bufferStart, buffer2, index) {
      let { id: id2, start, end, size } = cursor2;
      cursor2.next();
      if (size >= 0 && id2 < minRepeatType) {
        let startIndex = index;
        if (size > 4) {
          let endPos = cursor2.pos - (size - 4);
          while (cursor2.pos > endPos)
            index = copyToBuffer(bufferStart, buffer2, index);
        }
        buffer2[--index] = startIndex;
        buffer2[--index] = end - bufferStart;
        buffer2[--index] = start - bufferStart;
        buffer2[--index] = id2;
      } else if (size == -3) {
        contextHash = id2;
      } else if (size == -4) {
        lookAhead = id2;
      }
      return index;
    }
    let children = [], positions = [];
    while (cursor2.pos > 0)
      takeNode(data.start || 0, data.bufferStart || 0, children, positions, -1);
    let length = (_a2 = data.length) !== null && _a2 !== void 0 ? _a2 : children.length ? positions[0] + children[0].length : 0;
    return new Tree(types2[data.topID], children.reverse(), positions.reverse(), length);
  }
  var nodeSizeCache = /* @__PURE__ */ new WeakMap();
  function nodeSize(balanceType, node) {
    if (!balanceType.isAnonymous || node instanceof TreeBuffer || node.type != balanceType)
      return 1;
    let size = nodeSizeCache.get(node);
    if (size == null) {
      size = 1;
      for (let child of node.children) {
        if (child.type != balanceType || !(child instanceof Tree)) {
          size = 1;
          break;
        }
        size += nodeSize(balanceType, child);
      }
      nodeSizeCache.set(node, size);
    }
    return size;
  }
  function balanceRange(balanceType, children, positions, from, to, start, length, mkTop, mkTree) {
    let total = 0;
    for (let i = from; i < to; i++)
      total += nodeSize(balanceType, children[i]);
    let maxChild = Math.ceil(total * 1.5 / 8);
    let localChildren = [], localPositions = [];
    function divide(children2, positions2, from2, to2, offset) {
      for (let i = from2; i < to2; ) {
        let groupFrom = i, groupStart = positions2[i], groupSize = nodeSize(balanceType, children2[i]);
        i++;
        for (; i < to2; i++) {
          let nextSize = nodeSize(balanceType, children2[i]);
          if (groupSize + nextSize >= maxChild)
            break;
          groupSize += nextSize;
        }
        if (i == groupFrom + 1) {
          if (groupSize > maxChild) {
            let only = children2[groupFrom];
            divide(only.children, only.positions, 0, only.children.length, positions2[groupFrom] + offset);
            continue;
          }
          localChildren.push(children2[groupFrom]);
        } else {
          let length2 = positions2[i - 1] + children2[i - 1].length - groupStart;
          localChildren.push(balanceRange(balanceType, children2, positions2, groupFrom, i, groupStart, length2, null, mkTree));
        }
        localPositions.push(groupStart + offset - start);
      }
    }
    divide(children, positions, from, to, 0);
    return (mkTop || mkTree)(localChildren, localPositions, length);
  }
  var TreeFragment = class {
    constructor(from, to, tree, offset, openStart = false, openEnd = false) {
      this.from = from;
      this.to = to;
      this.tree = tree;
      this.offset = offset;
      this.open = (openStart ? 1 : 0) | (openEnd ? 2 : 0);
    }
    get openStart() {
      return (this.open & 1) > 0;
    }
    get openEnd() {
      return (this.open & 2) > 0;
    }
    static addTree(tree, fragments = [], partial = false) {
      let result = [new TreeFragment(0, tree.length, tree, 0, false, partial)];
      for (let f of fragments)
        if (f.to > tree.length)
          result.push(f);
      return result;
    }
    static applyChanges(fragments, changes, minGap = 128) {
      if (!changes.length)
        return fragments;
      let result = [];
      let fI = 1, nextF = fragments.length ? fragments[0] : null;
      for (let cI = 0, pos = 0, off = 0; ; cI++) {
        let nextC = cI < changes.length ? changes[cI] : null;
        let nextPos = nextC ? nextC.fromA : 1e9;
        if (nextPos - pos >= minGap)
          while (nextF && nextF.from < nextPos) {
            let cut = nextF;
            if (pos >= cut.from || nextPos <= cut.to || off) {
              let fFrom = Math.max(cut.from, pos) - off, fTo = Math.min(cut.to, nextPos) - off;
              cut = fFrom >= fTo ? null : new TreeFragment(fFrom, fTo, cut.tree, cut.offset + off, cI > 0, !!nextC);
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
  };
  var Parser = class {
    startParse(input, fragments, ranges) {
      if (typeof input == "string")
        input = new StringInput(input);
      ranges = !ranges ? [new Range2(0, input.length)] : ranges.length ? ranges.map((r) => new Range2(r.from, r.to)) : [new Range2(0, 0)];
      return this.createParse(input, fragments || [], ranges);
    }
    parse(input, fragments, ranges) {
      let parse = this.startParse(input, fragments, ranges);
      for (; ; ) {
        let done = parse.advance();
        if (done)
          return done;
      }
    }
  };
  var StringInput = class {
    constructor(string2) {
      this.string = string2;
    }
    get length() {
      return this.string.length;
    }
    chunk(from) {
      return this.string.slice(from);
    }
    get lineChunks() {
      return false;
    }
    read(from, to) {
      return this.string.slice(from, to);
    }
  };
  var stoppedInner = new NodeProp({ perNode: true });

  // node_modules/@lezer/highlight/dist/index.js
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
    let byName = /* @__PURE__ */ Object.create(null);
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
            pieces.push(m[0] == "*" ? "" : m[0][0] == '"' ? JSON.parse(m[0]) : m[0]);
            pos += m[0].length;
            if (pos == part.length)
              break;
            let next3 = part[pos++];
            if (pos == part.length && next3 == "!") {
              mode = 0;
              break;
            }
            if (next3 != "/")
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
  var Rule = class {
    constructor(tags2, mode, context, next3) {
      this.tags = tags2;
      this.mode = mode;
      this.context = context;
      this.next = next3;
    }
    get opaque() {
      return this.mode == 0;
    }
    get inherit() {
      return this.mode == 1;
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
  Rule.empty = new Rule([], 2, null);
  function tagHighlighter(tags2, options) {
    let map = /* @__PURE__ */ Object.create(null);
    for (let style of tags2) {
      if (!Array.isArray(style.tag))
        map[style.tag.id] = style.class;
      else
        for (let tag of style.tag)
          map[tag.id] = style.class;
    }
    let { scope, all = null } = options || {};
    return {
      style: (tags3) => {
        let cls = all;
        for (let tag of tags3) {
          for (let sub of tag.set) {
            let tagClass = map[sub.id];
            if (tagClass) {
              cls = cls ? cls + " " + tagClass : tagClass;
              break;
            }
          }
        }
        return cls;
      },
      scope
    };
  }
  function highlightTags(highlighters, tags2) {
    let result = null;
    for (let highlighter of highlighters) {
      let value = highlighter.style(tags2);
      if (value)
        result = result ? result + " " + value : value;
    }
    return result;
  }
  function highlightTree(tree, highlighter, putStyle, from = 0, to = tree.length) {
    let builder = new HighlightBuilder(from, Array.isArray(highlighter) ? highlighter : [highlighter], putStyle);
    builder.highlightRange(tree.cursor(), from, to, "", builder.highlighters);
    builder.flush(to);
  }
  var HighlightBuilder = class {
    constructor(at, highlighters, span) {
      this.at = at;
      this.highlighters = highlighters;
      this.span = span;
      this.class = "";
    }
    startSpan(at, cls) {
      if (cls != this.class) {
        this.flush(at);
        if (at > this.at)
          this.at = at;
        this.class = cls;
      }
    }
    flush(to) {
      if (to > this.at && this.class)
        this.span(this.at, to, this.class);
    }
    highlightRange(cursor2, from, to, inheritedClass, highlighters) {
      let { type, from: start, to: end } = cursor2;
      if (start >= to || end <= from)
        return;
      if (type.isTop)
        highlighters = this.highlighters.filter((h) => !h.scope || h.scope(type));
      let cls = inheritedClass;
      let rule = getStyleTags(cursor2) || Rule.empty;
      let tagCls = highlightTags(highlighters, rule.tags);
      if (tagCls) {
        if (cls)
          cls += " ";
        cls += tagCls;
        if (rule.mode == 1)
          inheritedClass += (inheritedClass ? " " : "") + tagCls;
      }
      this.startSpan(cursor2.from, cls);
      if (rule.opaque)
        return;
      let mounted = cursor2.tree && cursor2.tree.prop(NodeProp.mounted);
      if (mounted && mounted.overlay) {
        let inner = cursor2.node.enter(mounted.overlay[0].from + start, 1);
        let innerHighlighters = this.highlighters.filter((h) => !h.scope || h.scope(mounted.tree.type));
        let hasChild2 = cursor2.firstChild();
        for (let i = 0, pos = start; ; i++) {
          let next3 = i < mounted.overlay.length ? mounted.overlay[i] : null;
          let nextPos = next3 ? next3.from + start : end;
          let rangeFrom = Math.max(from, pos), rangeTo = Math.min(to, nextPos);
          if (rangeFrom < rangeTo && hasChild2) {
            while (cursor2.from < rangeTo) {
              this.highlightRange(cursor2, rangeFrom, rangeTo, inheritedClass, highlighters);
              this.startSpan(Math.min(to, cursor2.to), cls);
              if (cursor2.to >= nextPos || !cursor2.nextSibling())
                break;
            }
          }
          if (!next3 || nextPos > to)
            break;
          pos = next3.to + start;
          if (pos > from) {
            this.highlightRange(inner.cursor(), Math.max(from, next3.from + start), Math.min(to, pos), inheritedClass, innerHighlighters);
            this.startSpan(pos, cls);
          }
        }
        if (hasChild2)
          cursor2.parent();
      } else if (cursor2.firstChild()) {
        do {
          if (cursor2.to <= from)
            continue;
          if (cursor2.from >= to)
            break;
          this.highlightRange(cursor2, from, to, inheritedClass, highlighters);
          this.startSpan(Math.min(to, cursor2.to), cls);
        } while (cursor2.nextSibling());
        cursor2.parent();
      }
    }
  };
  function getStyleTags(node) {
    let rule = node.type.prop(ruleNodeProp);
    while (rule && rule.context && !node.matchContext(rule.context))
      rule = rule.next;
    return rule || null;
  }
  var t = Tag.define;
  var comment = t();
  var name = t();
  var typeName = t(name);
  var propertyName = t(name);
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
    propertyName,
    attributeName: t(propertyName),
    className: t(name),
    labelName: t(name),
    namespace: t(name),
    macroName: t(name),
    literal,
    string,
    docString: t(string),
    character: t(string),
    attributeValue: t(string),
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
    moduleKeyword: t(keyword),
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
    strikethrough: t(content),
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
  var classHighlighter = tagHighlighter([
    { tag: tags.link, class: "tok-link" },
    { tag: tags.heading, class: "tok-heading" },
    { tag: tags.emphasis, class: "tok-emphasis" },
    { tag: tags.strong, class: "tok-strong" },
    { tag: tags.keyword, class: "tok-keyword" },
    { tag: tags.atom, class: "tok-atom" },
    { tag: tags.bool, class: "tok-bool" },
    { tag: tags.url, class: "tok-url" },
    { tag: tags.labelName, class: "tok-labelName" },
    { tag: tags.inserted, class: "tok-inserted" },
    { tag: tags.deleted, class: "tok-deleted" },
    { tag: tags.literal, class: "tok-literal" },
    { tag: tags.string, class: "tok-string" },
    { tag: tags.number, class: "tok-number" },
    { tag: [tags.regexp, tags.escape, tags.special(tags.string)], class: "tok-string2" },
    { tag: tags.variableName, class: "tok-variableName" },
    { tag: tags.local(tags.variableName), class: "tok-variableName tok-local" },
    { tag: tags.definition(tags.variableName), class: "tok-variableName tok-definition" },
    { tag: tags.special(tags.variableName), class: "tok-variableName2" },
    { tag: tags.definition(tags.propertyName), class: "tok-propertyName tok-definition" },
    { tag: tags.typeName, class: "tok-typeName" },
    { tag: tags.namespace, class: "tok-namespace" },
    { tag: tags.className, class: "tok-className" },
    { tag: tags.macroName, class: "tok-macroName" },
    { tag: tags.propertyName, class: "tok-propertyName" },
    { tag: tags.operator, class: "tok-operator" },
    { tag: tags.comment, class: "tok-comment" },
    { tag: tags.meta, class: "tok-meta" },
    { tag: tags.invalid, class: "tok-invalid" },
    { tag: tags.punctuation, class: "tok-punctuation" }
  ]);

  // node_modules/@codemirror/language/dist/index.js
  var _a;
  var languageDataProp = /* @__PURE__ */ new NodeProp();
  function defineLanguageFacet(baseData) {
    return Facet.define({
      combine: baseData ? (values) => values.concat(baseData) : void 0
    });
  }
  var Language = class {
    constructor(data, parser2, extraExtensions = []) {
      this.data = data;
      if (!EditorState.prototype.hasOwnProperty("tree"))
        Object.defineProperty(EditorState.prototype, "tree", { get() {
          return syntaxTree(this);
        } });
      this.parser = parser2;
      this.extension = [
        language.of(this),
        EditorState.languageData.of((state, pos, side) => state.facet(languageDataFacetAt(state, pos, side)))
      ].concat(extraExtensions);
    }
    isActiveAt(state, pos, side = -1) {
      return languageDataFacetAt(state, pos, side) == this.data;
    }
    findRegions(state) {
      let lang = state.facet(language);
      if ((lang === null || lang === void 0 ? void 0 : lang.data) == this.data)
        return [{ from: 0, to: state.doc.length }];
      if (!lang || !lang.allowsNesting)
        return [];
      let result = [];
      let explore = (tree, from) => {
        if (tree.prop(languageDataProp) == this.data) {
          result.push({ from, to: from + tree.length });
          return;
        }
        let mount = tree.prop(NodeProp.mounted);
        if (mount) {
          if (mount.tree.prop(languageDataProp) == this.data) {
            if (mount.overlay)
              for (let r of mount.overlay)
                result.push({ from: r.from + from, to: r.to + from });
            else
              result.push({ from, to: from + tree.length });
            return;
          } else if (mount.overlay) {
            let size = result.length;
            explore(mount.tree, mount.overlay[0].from + from);
            if (result.length > size)
              return;
          }
        }
        for (let i = 0; i < tree.children.length; i++) {
          let ch = tree.children[i];
          if (ch instanceof Tree)
            explore(ch, tree.positions[i] + from);
        }
      };
      explore(syntaxTree(state), 0);
      return result;
    }
    get allowsNesting() {
      return true;
    }
  };
  Language.setState = /* @__PURE__ */ StateEffect.define();
  function languageDataFacetAt(state, pos, side) {
    let topLang = state.facet(language);
    if (!topLang)
      return null;
    let facet = topLang.data;
    if (topLang.allowsNesting) {
      for (let node = syntaxTree(state).topNode; node; node = node.enter(pos, side, IterMode.ExcludeBuffers))
        facet = node.type.prop(languageDataProp) || facet;
    }
    return facet;
  }
  var LRLanguage = class extends Language {
    constructor(data, parser2) {
      super(data, parser2);
      this.parser = parser2;
    }
    static define(spec) {
      let data = defineLanguageFacet(spec.languageData);
      return new LRLanguage(data, spec.parser.configure({
        props: [languageDataProp.add((type) => type.isTop ? data : void 0)]
      }));
    }
    configure(options) {
      return new LRLanguage(this.data, this.parser.configure(options));
    }
    get allowsNesting() {
      return this.parser.hasWrappers();
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
      this.cursor = doc2.iter();
    }
    syncTo(pos) {
      this.string = this.cursor.next(pos - this.cursorPos).value;
      this.cursorPos = pos + this.string.length;
      return this.cursorPos - this.string.length;
    }
    chunk(pos) {
      this.syncTo(pos);
      return this.string;
    }
    get lineChunks() {
      return true;
    }
    read(from, to) {
      let stringStart = this.cursorPos - this.string.length;
      if (from < stringStart || to >= this.cursorPos)
        return this.doc.sliceString(from, to);
      else
        return this.string.slice(from - stringStart, to - stringStart);
    }
  };
  var currentContext = null;
  var ParseContext = class {
    constructor(parser2, state, fragments = [], tree, treeLen, viewport, skipped, scheduleOn) {
      this.parser = parser2;
      this.state = state;
      this.fragments = fragments;
      this.tree = tree;
      this.treeLen = treeLen;
      this.viewport = viewport;
      this.skipped = skipped;
      this.scheduleOn = scheduleOn;
      this.parse = null;
      this.tempSkipped = [];
    }
    static create(parser2, state, viewport) {
      return new ParseContext(parser2, state, [], Tree.empty, 0, viewport, [], null);
    }
    startParse() {
      return this.parser.startParse(new DocInput(this.state.doc), this.fragments);
    }
    work(until, upto) {
      if (upto != null && upto >= this.state.doc.length)
        upto = void 0;
      if (this.tree != Tree.empty && this.isDone(upto !== null && upto !== void 0 ? upto : this.state.doc.length)) {
        this.takeTree();
        return true;
      }
      return this.withContext(() => {
        var _a2;
        if (typeof until == "number") {
          let endTime = Date.now() + until;
          until = () => Date.now() > endTime;
        }
        if (!this.parse)
          this.parse = this.startParse();
        if (upto != null && (this.parse.stoppedAt == null || this.parse.stoppedAt > upto) && upto < this.state.doc.length)
          this.parse.stopAt(upto);
        for (; ; ) {
          let done = this.parse.advance();
          if (done) {
            this.fragments = this.withoutTempSkipped(TreeFragment.addTree(done, this.fragments, this.parse.stoppedAt != null));
            this.treeLen = (_a2 = this.parse.stoppedAt) !== null && _a2 !== void 0 ? _a2 : this.state.doc.length;
            this.tree = done;
            this.parse = null;
            if (this.treeLen < (upto !== null && upto !== void 0 ? upto : this.state.doc.length))
              this.parse = this.startParse();
            else
              return true;
          }
          if (until())
            return false;
        }
      });
    }
    takeTree() {
      let pos, tree;
      if (this.parse && (pos = this.parse.parsedPos) >= this.treeLen) {
        if (this.parse.stoppedAt == null || this.parse.stoppedAt > pos)
          this.parse.stopAt(pos);
        this.withContext(() => {
          while (!(tree = this.parse.advance())) {
          }
        });
        this.treeLen = pos;
        this.tree = tree;
        this.fragments = this.withoutTempSkipped(TreeFragment.addTree(this.tree, this.fragments, true));
        this.parse = null;
      }
    }
    withContext(f) {
      let prev = currentContext;
      currentContext = this;
      try {
        return f();
      } finally {
        currentContext = prev;
      }
    }
    withoutTempSkipped(fragments) {
      for (let r; r = this.tempSkipped.pop(); )
        fragments = cutFragments(fragments, r.from, r.to);
      return fragments;
    }
    changes(changes, newState) {
      let { fragments, tree, treeLen, viewport, skipped } = this;
      this.takeTree();
      if (!changes.empty) {
        let ranges = [];
        changes.iterChangedRanges((fromA, toA, fromB, toB) => ranges.push({ fromA, toA, fromB, toB }));
        fragments = TreeFragment.applyChanges(fragments, ranges);
        tree = Tree.empty;
        treeLen = 0;
        viewport = { from: changes.mapPos(viewport.from, -1), to: changes.mapPos(viewport.to, 1) };
        if (this.skipped.length) {
          skipped = [];
          for (let r of this.skipped) {
            let from = changes.mapPos(r.from, 1), to = changes.mapPos(r.to, -1);
            if (from < to)
              skipped.push({ from, to });
          }
        }
      }
      return new ParseContext(this.parser, newState, fragments, tree, treeLen, viewport, skipped, this.scheduleOn);
    }
    updateViewport(viewport) {
      if (this.viewport.from == viewport.from && this.viewport.to == viewport.to)
        return false;
      this.viewport = viewport;
      let startLen = this.skipped.length;
      for (let i = 0; i < this.skipped.length; i++) {
        let { from, to } = this.skipped[i];
        if (from < viewport.to && to > viewport.from) {
          this.fragments = cutFragments(this.fragments, from, to);
          this.skipped.splice(i--, 1);
        }
      }
      if (this.skipped.length >= startLen)
        return false;
      this.reset();
      return true;
    }
    reset() {
      if (this.parse) {
        this.takeTree();
        this.parse = null;
      }
    }
    skipUntilInView(from, to) {
      this.skipped.push({ from, to });
    }
    static getSkippingParser(until) {
      return new class extends Parser {
        createParse(input, fragments, ranges) {
          let from = ranges[0].from, to = ranges[ranges.length - 1].to;
          let parser2 = {
            parsedPos: from,
            advance() {
              let cx = currentContext;
              if (cx) {
                for (let r of ranges)
                  cx.tempSkipped.push(r);
                if (until)
                  cx.scheduleOn = cx.scheduleOn ? Promise.all([cx.scheduleOn, until]) : until;
              }
              this.parsedPos = to;
              return new Tree(NodeType.none, [], [], to - from);
            },
            stoppedAt: null,
            stopAt() {
            }
          };
          return parser2;
        }
      }();
    }
    isDone(upto) {
      upto = Math.min(upto, this.state.doc.length);
      let frags = this.fragments;
      return this.treeLen >= upto && frags.length && frags[0].from == 0 && frags[0].to >= upto;
    }
    static get() {
      return currentContext;
    }
  };
  function cutFragments(fragments, from, to) {
    return TreeFragment.applyChanges(fragments, [{ fromA: from, toA: to, fromB: from, toB: to }]);
  }
  var LanguageState = class {
    constructor(context) {
      this.context = context;
      this.tree = context.tree;
    }
    apply(tr) {
      if (!tr.docChanged && this.tree == this.context.tree)
        return this;
      let newCx = this.context.changes(tr.changes, tr.state);
      let upto = this.context.treeLen == tr.startState.doc.length ? void 0 : Math.max(tr.changes.mapPos(this.context.treeLen), newCx.viewport.to);
      if (!newCx.work(20, upto))
        newCx.takeTree();
      return new LanguageState(newCx);
    }
    static init(state) {
      let vpTo = Math.min(3e3, state.doc.length);
      let parseState = ParseContext.create(state.facet(language).parser, state, { from: 0, to: vpTo });
      if (!parseState.work(20, vpTo))
        parseState.takeTree();
      return new LanguageState(parseState);
    }
  };
  Language.state = /* @__PURE__ */ StateField.define({
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
  var requestIdle = (callback) => {
    let timeout = setTimeout(() => callback(), 500);
    return () => clearTimeout(timeout);
  };
  if (typeof requestIdleCallback != "undefined")
    requestIdle = (callback) => {
      let idle = -1, timeout = setTimeout(() => {
        idle = requestIdleCallback(callback, { timeout: 500 - 100 });
      }, 100);
      return () => idle < 0 ? clearTimeout(timeout) : cancelIdleCallback(idle);
    };
  var isInputPending = typeof navigator != "undefined" && ((_a = navigator.scheduling) === null || _a === void 0 ? void 0 : _a.isInputPending) ? () => navigator.scheduling.isInputPending() : null;
  var parseWorker = /* @__PURE__ */ ViewPlugin.fromClass(class ParseWorker {
    constructor(view) {
      this.view = view;
      this.working = null;
      this.workScheduled = 0;
      this.chunkEnd = -1;
      this.chunkBudget = -1;
      this.work = this.work.bind(this);
      this.scheduleWork();
    }
    update(update) {
      let cx = this.view.state.field(Language.state).context;
      if (cx.updateViewport(update.view.viewport) || this.view.viewport.to > cx.treeLen)
        this.scheduleWork();
      if (update.docChanged) {
        if (this.view.hasFocus)
          this.chunkBudget += 50;
        this.scheduleWork();
      }
      this.checkAsyncSchedule(cx);
    }
    scheduleWork() {
      if (this.working)
        return;
      let { state } = this.view, field = state.field(Language.state);
      if (field.tree != field.context.tree || !field.context.isDone(state.doc.length))
        this.working = requestIdle(this.work);
    }
    work(deadline) {
      this.working = null;
      let now = Date.now();
      if (this.chunkEnd < now && (this.chunkEnd < 0 || this.view.hasFocus)) {
        this.chunkEnd = now + 3e4;
        this.chunkBudget = 3e3;
      }
      if (this.chunkBudget <= 0)
        return;
      let { state, viewport: { to: vpTo } } = this.view, field = state.field(Language.state);
      if (field.tree == field.context.tree && field.context.isDone(vpTo + 1e5))
        return;
      let endTime = Date.now() + Math.min(this.chunkBudget, 100, deadline && !isInputPending ? Math.max(25, deadline.timeRemaining() - 5) : 1e9);
      let viewportFirst = field.context.treeLen < vpTo && state.doc.length > vpTo + 1e3;
      let done = field.context.work(() => {
        return isInputPending && isInputPending() || Date.now() > endTime;
      }, vpTo + (viewportFirst ? 0 : 1e5));
      this.chunkBudget -= Date.now() - now;
      if (done || this.chunkBudget <= 0) {
        field.context.takeTree();
        this.view.dispatch({ effects: Language.setState.of(new LanguageState(field.context)) });
      }
      if (this.chunkBudget > 0 && !(done && !viewportFirst))
        this.scheduleWork();
      this.checkAsyncSchedule(field.context);
    }
    checkAsyncSchedule(cx) {
      if (cx.scheduleOn) {
        this.workScheduled++;
        cx.scheduleOn.then(() => this.scheduleWork()).catch((err) => logException(this.view.state, err)).then(() => this.workScheduled--);
        cx.scheduleOn = null;
      }
    }
    destroy() {
      if (this.working)
        this.working();
    }
    isWorking() {
      return !!(this.working || this.workScheduled > 0);
    }
  }, {
    eventHandlers: { focus() {
      this.scheduleWork();
    } }
  });
  var language = /* @__PURE__ */ Facet.define({
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
  var indentService = /* @__PURE__ */ Facet.define();
  var indentUnit = /* @__PURE__ */ Facet.define({
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
    lineAt(pos, bias = 1) {
      let line2 = this.state.doc.lineAt(pos);
      let { simulateBreak, simulateDoubleBreak } = this.options;
      if (simulateBreak != null && simulateBreak >= line2.from && simulateBreak <= line2.to) {
        if (simulateDoubleBreak && simulateBreak == pos)
          return { text: "", from: pos };
        else if (bias < 0 ? simulateBreak < pos : simulateBreak <= pos)
          return { text: line2.text.slice(simulateBreak - line2.from), from: simulateBreak };
        else
          return { text: line2.text.slice(0, simulateBreak - line2.from), from: line2.from };
      }
      return line2;
    }
    textAfterPos(pos, bias = 1) {
      if (this.options.simulateDoubleBreak && pos == this.options.simulateBreak)
        return "";
      let { text, from } = this.lineAt(pos, bias);
      return text.slice(pos - from, Math.min(text.length, pos + 100 - from));
    }
    column(pos, bias = 1) {
      let { text, from } = this.lineAt(pos, bias);
      let result = this.countColumn(text, pos - from);
      let override = this.options.overrideIndentation ? this.options.overrideIndentation(from) : -1;
      if (override > -1)
        result += override - this.countColumn(text, text.search(/\S|$/));
      return result;
    }
    countColumn(line2, pos = line2.length) {
      return countColumn(line2, this.state.tabSize, pos);
    }
    lineIndent(pos, bias = 1) {
      let { text, from } = this.lineAt(pos, bias);
      let override = this.options.overrideIndentation;
      if (override) {
        let overriden = override(from);
        if (overriden > -1)
          return overriden;
      }
      return this.countColumn(text, text.search(/\S|$/));
    }
    get simulatedBreak() {
      return this.options.simulateBreak || null;
    }
  };
  var indentNodeProp = /* @__PURE__ */ new NodeProp();
  function syntaxIndentation(cx, ast, pos) {
    return indentFrom(ast.resolveInner(pos).enterUnfinishedNodesBefore(pos), pos, cx);
  }
  function ignoreClosed(cx) {
    return cx.pos == cx.options.simulateBreak && cx.options.simulateDoubleBreak;
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
        return strategy(TreeIndentContext.create(base2, pos, node));
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
    static create(base2, pos, node) {
      return new TreeIndentContext(base2, pos, node);
    }
    get textAfter() {
      return this.textAfterPos(this.pos);
    }
    get baseIndent() {
      let line2 = this.state.doc.lineAt(this.node.from);
      for (; ; ) {
        let atBreak = this.node.resolve(line2.from);
        while (atBreak.parent && atBreak.parent.from == atBreak.from)
          atBreak = atBreak.parent;
        if (isParent(atBreak, this.node))
          break;
        line2 = this.state.doc.lineAt(atBreak.from);
      }
      return this.lineIndent(line2.from);
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
    let tree = context.node;
    let openToken = tree.childAfter(tree.from), last = tree.lastChild;
    if (!openToken)
      return null;
    let sim = context.options.simulateBreak;
    let openLine = context.state.doc.lineAt(openToken.from);
    let lineEnd = sim == null || sim <= openLine.from ? openLine.to : Math.min(openLine.to, sim);
    for (let pos = openToken.to; ; ) {
      let next3 = tree.childAfter(pos);
      if (!next3 || next3 == last)
        return null;
      if (!next3.type.isSkipped)
        return next3.from < lineEnd ? openToken : null;
      pos = next3.to;
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
  var HighlightStyle = class {
    constructor(spec, options) {
      let modSpec;
      function def(spec2) {
        let cls = StyleModule.newName();
        (modSpec || (modSpec = /* @__PURE__ */ Object.create(null)))["." + cls] = spec2;
        return cls;
      }
      const all = typeof options.all == "string" ? options.all : options.all ? def(options.all) : void 0;
      const scopeOpt = options.scope;
      this.scope = scopeOpt instanceof Language ? (type) => type.prop(languageDataProp) == scopeOpt.data : scopeOpt ? (type) => type == scopeOpt : void 0;
      this.style = tagHighlighter(spec.map((style) => ({
        tag: style.tag,
        class: style.class || def(Object.assign({}, style, { tag: null }))
      })), {
        all
      }).style;
      this.module = modSpec ? new StyleModule(modSpec) : null;
      this.themeType = options.themeType;
    }
    static define(specs, options) {
      return new HighlightStyle(specs, options || {});
    }
  };
  var highlighterFacet = /* @__PURE__ */ Facet.define();
  var fallbackHighlighter = /* @__PURE__ */ Facet.define({
    combine(values) {
      return values.length ? [values[0]] : null;
    }
  });
  function getHighlighters(state) {
    let main = state.facet(highlighterFacet);
    return main.length ? main : state.facet(fallbackHighlighter);
  }
  function syntaxHighlighting(highlighter, options) {
    let ext = [treeHighlighter], themeType;
    if (highlighter instanceof HighlightStyle) {
      if (highlighter.module)
        ext.push(EditorView.styleModule.of(highlighter.module));
      themeType = highlighter.themeType;
    }
    if (options === null || options === void 0 ? void 0 : options.fallback)
      ext.push(fallbackHighlighter.of(highlighter));
    else if (themeType)
      ext.push(highlighterFacet.computeN([EditorView.darkTheme], (state) => {
        return state.facet(EditorView.darkTheme) == (themeType == "dark") ? [highlighter] : [];
      }));
    else
      ext.push(highlighterFacet.of(highlighter));
    return ext;
  }
  var TreeHighlighter = class {
    constructor(view) {
      this.markCache = /* @__PURE__ */ Object.create(null);
      this.tree = syntaxTree(view.state);
      this.decorations = this.buildDeco(view, getHighlighters(view.state));
    }
    update(update) {
      let tree = syntaxTree(update.state), highlighters = getHighlighters(update.state);
      let styleChange = highlighters != getHighlighters(update.startState);
      if (tree.length < update.view.viewport.to && !styleChange && tree.type == this.tree.type) {
        this.decorations = this.decorations.map(update.changes);
      } else if (tree != this.tree || update.viewportChanged || styleChange) {
        this.tree = tree;
        this.decorations = this.buildDeco(update.view, highlighters);
      }
    }
    buildDeco(view, highlighters) {
      if (!highlighters || !this.tree.length)
        return Decoration.none;
      let builder = new RangeSetBuilder();
      for (let { from, to } of view.visibleRanges) {
        highlightTree(this.tree, highlighters, (from2, to2, style) => {
          builder.add(from2, to2, this.markCache[style] || (this.markCache[style] = Decoration.mark({ class: style })));
        }, from, to);
      }
      return builder.finish();
    }
  };
  var treeHighlighter = /* @__PURE__ */ Prec.high(/* @__PURE__ */ ViewPlugin.fromClass(TreeHighlighter, {
    decorations: (v) => v.decorations
  }));
  var defaultHighlightStyle = /* @__PURE__ */ HighlightStyle.define([
    {
      tag: tags.meta,
      color: "#7a757a"
    },
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
      tag: tags.strikethrough,
      textDecoration: "line-through"
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
      tag: [tags.regexp, tags.escape, /* @__PURE__ */ tags.special(tags.string)],
      color: "#e40"
    },
    {
      tag: /* @__PURE__ */ tags.definition(tags.variableName),
      color: "#00f"
    },
    {
      tag: /* @__PURE__ */ tags.local(tags.variableName),
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
      tag: [/* @__PURE__ */ tags.special(tags.variableName), tags.macroName],
      color: "#256"
    },
    {
      tag: /* @__PURE__ */ tags.definition(tags.propertyName),
      color: "#00c"
    },
    {
      tag: tags.comment,
      color: "#940"
    },
    {
      tag: tags.invalid,
      color: "#f00"
    }
  ]);
  var DefaultScanDist = 1e4;
  var DefaultBrackets = "()[]{}";
  function matchingNodes(node, dir, brackets) {
    let byProp = node.prop(dir < 0 ? NodeProp.openedBy : NodeProp.closedBy);
    if (byProp)
      return byProp;
    if (node.name.length == 1) {
      let index = brackets.indexOf(node.name);
      if (index > -1 && index % 2 == (dir < 0 ? 1 : 0))
        return [brackets[index + dir]];
    }
    return null;
  }
  function matchBrackets(state, pos, dir, config2 = {}) {
    let maxScanDistance = config2.maxScanDistance || DefaultScanDist, brackets = config2.brackets || DefaultBrackets;
    let tree = syntaxTree(state), node = tree.resolveInner(pos, dir);
    for (let cur = node; cur; cur = cur.parent) {
      let matches = matchingNodes(cur.type, dir, brackets);
      if (matches && cur.from < cur.to)
        return matchMarkedBrackets(state, pos, dir, cur, matches, brackets);
    }
    return matchPlainBrackets(state, pos, dir, tree, node.type, maxScanDistance, brackets);
  }
  function matchMarkedBrackets(_state, _pos, dir, token2, matching, brackets) {
    let parent = token2.parent, firstToken = { from: token2.from, to: token2.to };
    let depth = 0, cursor2 = parent === null || parent === void 0 ? void 0 : parent.cursor();
    if (cursor2 && (dir < 0 ? cursor2.childBefore(token2.from) : cursor2.childAfter(token2.to)))
      do {
        if (dir < 0 ? cursor2.to <= token2.from : cursor2.from >= token2.to) {
          if (depth == 0 && matching.indexOf(cursor2.type.name) > -1 && cursor2.from < cursor2.to) {
            return { start: firstToken, end: { from: cursor2.from, to: cursor2.to }, matched: true };
          } else if (matchingNodes(cursor2.type, dir, brackets)) {
            depth++;
          } else if (matchingNodes(cursor2.type, -dir, brackets)) {
            if (depth == 0)
              return {
                start: firstToken,
                end: cursor2.from == cursor2.to ? void 0 : { from: cursor2.from, to: cursor2.to },
                matched: false
              };
            depth--;
          }
        }
      } while (dir < 0 ? cursor2.prevSibling() : cursor2.nextSibling());
    return { start: firstToken, matched: false };
  }
  function matchPlainBrackets(state, pos, dir, tree, tokenType, maxScanDistance, brackets) {
    let startCh = dir < 0 ? state.sliceDoc(pos - 1, pos) : state.sliceDoc(pos, pos + 1);
    let bracket2 = brackets.indexOf(startCh);
    if (bracket2 < 0 || bracket2 % 2 == 0 != dir > 0)
      return null;
    let startToken = { from: dir < 0 ? pos - 1 : pos, to: dir > 0 ? pos + 1 : pos };
    let iter = state.doc.iterRange(pos, dir > 0 ? state.doc.length : 0), depth = 0;
    for (let distance = 0; !iter.next().done && distance <= maxScanDistance; ) {
      let text = iter.value;
      if (dir < 0)
        distance += text.length;
      let basePos = pos + distance * dir;
      for (let pos2 = dir > 0 ? 0 : text.length - 1, end = dir > 0 ? text.length : -1; pos2 != end; pos2 += dir) {
        let found = brackets.indexOf(text[pos2]);
        if (found < 0 || tree.resolveInner(basePos + pos2, 1).type != tokenType)
          continue;
        if (found % 2 == 0 == dir > 0) {
          depth++;
        } else if (depth == 1) {
          return { start: startToken, end: { from: basePos + pos2, to: basePos + pos2 + 1 }, matched: found >> 1 == bracket2 >> 1 };
        } else {
          depth--;
        }
      }
      if (dir > 0)
        distance += text.length;
    }
    return iter.done ? { start: startToken, matched: false } : null;
  }
  var noTokens = /* @__PURE__ */ Object.create(null);
  var typeArray = [NodeType.none];
  var warned = [];
  var defaultTable = /* @__PURE__ */ Object.create(null);
  for (let [legacyName, name2] of [
    ["variable", "variableName"],
    ["variable-2", "variableName.special"],
    ["string-2", "string.special"],
    ["def", "variableName.definition"],
    ["tag", "tagName"],
    ["attribute", "attributeName"],
    ["type", "typeName"],
    ["builtin", "variableName.standard"],
    ["qualifier", "modifier"],
    ["error", "invalid"],
    ["header", "heading"],
    ["property", "propertyName"]
  ])
    defaultTable[legacyName] = /* @__PURE__ */ createTokenType(noTokens, name2);
  function warnForPart(part, msg) {
    if (warned.indexOf(part) > -1)
      return;
    warned.push(part);
    console.warn(msg);
  }
  function createTokenType(extra, tagStr) {
    let tag = null;
    for (let part of tagStr.split(".")) {
      let value = extra[part] || tags[part];
      if (!value) {
        warnForPart(part, `Unknown highlighting tag ${part}`);
      } else if (typeof value == "function") {
        if (!tag)
          warnForPart(part, `Modifier ${part} used at start of tag`);
        else
          tag = value(tag);
      } else {
        if (tag)
          warnForPart(part, `Tag ${part} used as modifier`);
        else
          tag = value;
      }
    }
    if (!tag)
      return 0;
    let name2 = tagStr.replace(/ /g, "_"), type = NodeType.define({
      id: typeArray.length,
      name: name2,
      props: [styleTags({ [name2]: tag })]
    });
    typeArray.push(type);
    return type.id;
  }

  // node_modules/@codemirror/commands/dist/index.js
  var toggleComment = (target) => {
    let config2 = getConfig(target.state);
    return config2.line ? toggleLineComment(target) : config2.block ? toggleBlockCommentByLine(target) : false;
  };
  function command(f, option) {
    return ({ state, dispatch }) => {
      if (state.readOnly)
        return false;
      let tr = f(option, state);
      if (!tr)
        return false;
      dispatch(state.update(tr));
      return true;
    };
  }
  var toggleLineComment = /* @__PURE__ */ command(changeLineComment, 0);
  var toggleBlockComment = /* @__PURE__ */ command(changeBlockComment, 0);
  var toggleBlockCommentByLine = /* @__PURE__ */ command((o, s) => changeBlockComment(o, s, selectedLineRanges(s)), 0);
  function getConfig(state, pos = state.selection.main.head) {
    let data = state.languageDataAt("commentTokens", pos);
    return data.length ? data[0] : {};
  }
  var SearchMargin = 50;
  function findBlockComment(state, { open, close }, from, to) {
    let textBefore = state.sliceDoc(from - SearchMargin, from);
    let textAfter = state.sliceDoc(to, to + SearchMargin);
    let spaceBefore = /\s*$/.exec(textBefore)[0].length, spaceAfter = /^\s*/.exec(textAfter)[0].length;
    let beforeOff = textBefore.length - spaceBefore;
    if (textBefore.slice(beforeOff - open.length, beforeOff) == open && textAfter.slice(spaceAfter, spaceAfter + close.length) == close) {
      return {
        open: { pos: from - spaceBefore, margin: spaceBefore && 1 },
        close: { pos: to + spaceAfter, margin: spaceAfter && 1 }
      };
    }
    let startText, endText;
    if (to - from <= 2 * SearchMargin) {
      startText = endText = state.sliceDoc(from, to);
    } else {
      startText = state.sliceDoc(from, from + SearchMargin);
      endText = state.sliceDoc(to - SearchMargin, to);
    }
    let startSpace = /^\s*/.exec(startText)[0].length, endSpace = /\s*$/.exec(endText)[0].length;
    let endOff = endText.length - endSpace - close.length;
    if (startText.slice(startSpace, startSpace + open.length) == open && endText.slice(endOff, endOff + close.length) == close) {
      return {
        open: {
          pos: from + startSpace + open.length,
          margin: /\s/.test(startText.charAt(startSpace + open.length)) ? 1 : 0
        },
        close: {
          pos: to - endSpace - close.length,
          margin: /\s/.test(endText.charAt(endOff - 1)) ? 1 : 0
        }
      };
    }
    return null;
  }
  function selectedLineRanges(state) {
    let ranges = [];
    for (let r of state.selection.ranges) {
      let fromLine = state.doc.lineAt(r.from);
      let toLine = r.to <= fromLine.to ? fromLine : state.doc.lineAt(r.to);
      let last = ranges.length - 1;
      if (last >= 0 && ranges[last].to > fromLine.from)
        ranges[last].to = toLine.to;
      else
        ranges.push({ from: fromLine.from, to: toLine.to });
    }
    return ranges;
  }
  function changeBlockComment(option, state, ranges = state.selection.ranges) {
    let tokens = ranges.map((r) => getConfig(state, r.from).block);
    if (!tokens.every((c) => c))
      return null;
    let comments = ranges.map((r, i) => findBlockComment(state, tokens[i], r.from, r.to));
    if (option != 2 && !comments.every((c) => c)) {
      return { changes: state.changes(ranges.map((range, i) => {
        if (comments[i])
          return [];
        return [{ from: range.from, insert: tokens[i].open + " " }, { from: range.to, insert: " " + tokens[i].close }];
      })) };
    } else if (option != 1 && comments.some((c) => c)) {
      let changes = [];
      for (let i = 0, comment3; i < comments.length; i++)
        if (comment3 = comments[i]) {
          let token2 = tokens[i], { open, close } = comment3;
          changes.push({ from: open.pos - token2.open.length, to: open.pos + open.margin }, { from: close.pos - close.margin, to: close.pos + token2.close.length });
        }
      return { changes };
    }
    return null;
  }
  function changeLineComment(option, state, ranges = state.selection.ranges) {
    let lines2 = [];
    let prevLine = -1;
    for (let { from, to } of ranges) {
      let startI = lines2.length, minIndent = 1e9;
      for (let pos = from; pos <= to; ) {
        let line2 = state.doc.lineAt(pos);
        if (line2.from > prevLine && (from == to || to > line2.from)) {
          prevLine = line2.from;
          let token2 = getConfig(state, pos).line;
          if (!token2)
            continue;
          let indent = /^\s*/.exec(line2.text)[0].length;
          let empty = indent == line2.length;
          let comment3 = line2.text.slice(indent, indent + token2.length) == token2 ? indent : -1;
          if (indent < line2.text.length && indent < minIndent)
            minIndent = indent;
          lines2.push({ line: line2, comment: comment3, token: token2, indent, empty, single: false });
        }
        pos = line2.to + 1;
      }
      if (minIndent < 1e9) {
        for (let i = startI; i < lines2.length; i++)
          if (lines2[i].indent < lines2[i].line.text.length)
            lines2[i].indent = minIndent;
      }
      if (lines2.length == startI + 1)
        lines2[startI].single = true;
    }
    if (option != 2 && lines2.some((l) => l.comment < 0 && (!l.empty || l.single))) {
      let changes = [];
      for (let { line: line2, token: token2, indent, empty, single } of lines2)
        if (single || !empty)
          changes.push({ from: line2.from + indent, insert: token2 + " " });
      let changeSet = state.changes(changes);
      return { changes: changeSet, selection: state.selection.map(changeSet, 1) };
    } else if (option != 1 && lines2.some((l) => l.comment >= 0)) {
      let changes = [];
      for (let { line: line2, comment: comment3, token: token2 } of lines2)
        if (comment3 >= 0) {
          let from = line2.from + comment3, to = from + token2.length;
          if (line2.text[to - line2.from] == " ")
            to++;
          changes.push({ from, to });
        }
      return { changes };
    }
    return null;
  }
  var fromHistory = /* @__PURE__ */ Annotation.define();
  var isolateHistory = /* @__PURE__ */ Annotation.define();
  var invertedEffects = /* @__PURE__ */ Facet.define();
  var historyConfig = /* @__PURE__ */ Facet.define({
    combine(configs) {
      return combineConfig(configs, {
        minDepth: 100,
        newGroupDelay: 500
      }, { minDepth: Math.max, newGroupDelay: Math.min });
    }
  });
  function changeEnd(changes) {
    let end = 0;
    changes.iterChangedRanges((_, to) => end = to);
    return end;
  }
  var historyField_ = /* @__PURE__ */ StateField.define({
    create() {
      return HistoryState.empty;
    },
    update(state, tr) {
      let config2 = tr.state.facet(historyConfig);
      let fromHist = tr.annotation(fromHistory);
      if (fromHist) {
        let selection2 = tr.docChanged ? EditorSelection.single(changeEnd(tr.changes)) : void 0;
        let item = HistEvent.fromTransaction(tr, selection2), from = fromHist.side;
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
      return { done: value.done.map((e) => e.toJSON()), undone: value.undone.map((e) => e.toJSON()) };
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
          let command2 = e.inputType == "historyUndo" ? undo : e.inputType == "historyRedo" ? redo : null;
          if (!command2)
            return false;
          e.preventDefault();
          return command2(view);
        }
      })
    ];
  }
  function cmd(side, selection2) {
    return function({ state, dispatch }) {
      if (!selection2 && state.readOnly)
        return false;
      let historyState = state.field(historyField_, false);
      if (!historyState)
        return false;
      let tr = historyState.pop(side, state, selection2);
      if (!tr)
        return false;
      dispatch(tr);
      return true;
    };
  }
  var undo = /* @__PURE__ */ cmd(0, false);
  var redo = /* @__PURE__ */ cmd(1, false);
  var undoSelection = /* @__PURE__ */ cmd(0, true);
  var redoSelection = /* @__PURE__ */ cmd(1, true);
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
      var _a2, _b, _c;
      return {
        changes: (_a2 = this.changes) === null || _a2 === void 0 ? void 0 : _a2.toJSON(),
        mapped: (_b = this.mapped) === null || _b === void 0 ? void 0 : _b.toJSON(),
        startSelection: (_c = this.startSelection) === null || _c === void 0 ? void 0 : _c.toJSON(),
        selectionsAfter: this.selectionsAfter.map((s) => s.toJSON())
      };
    }
    static fromJSON(json) {
      return new HistEvent(json.changes && ChangeSet.fromJSON(json.changes), [], json.mapped && ChangeDesc.fromJSON(json.mapped), json.startSelection && EditorSelection.fromJSON(json.startSelection), json.selectionsAfter.map(EditorSelection.fromJSON));
    }
    static fromTransaction(tr, selection2) {
      let effects = none2;
      for (let invert of tr.startState.facet(invertedEffects)) {
        let result = invert(tr);
        if (result.length)
          effects = effects.concat(result);
      }
      if (!effects.length && tr.changes.empty)
        return null;
      return new HistEvent(tr.changes.invert(tr.startState.doc), effects, void 0, selection2 || tr.startState.selection, none2);
    }
    static selection(selections) {
      return new HistEvent(void 0, none2, void 0, void 0, selections);
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
  var none2 = [];
  var MaxSelectionsPerEvent = 200;
  function addSelection(branch, selection2) {
    if (!branch.length) {
      return [HistEvent.selection([selection2])];
    } else {
      let lastEvent = branch[branch.length - 1];
      let sels = lastEvent.selectionsAfter.slice(Math.max(0, lastEvent.selectionsAfter.length - MaxSelectionsPerEvent));
      if (sels.length && sels[sels.length - 1].eq(selection2))
        return branch;
      sels.push(selection2);
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
    let length = branch.length, selections = none2;
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
    return selections.length ? [HistEvent.selection(selections)] : none2;
  }
  function mapEvent(event, mapping, extraSelections) {
    let selections = conc(event.selectionsAfter.length ? event.selectionsAfter.map((s) => s.map(mapping)) : none2, extraSelections);
    if (!event.changes)
      return HistEvent.selection(selections);
    let mappedChanges = event.changes.map(mapping), before = mapping.mapDesc(event.changes, true);
    let fullMapping = event.mapped ? event.mapped.composeDesc(before) : before;
    return new HistEvent(mappedChanges, StateEffect.mapEffects(event.effects, mapping), fullMapping, event.startSelection.map(before), selections);
  }
  var joinableUserEvent = /^(input\.type|delete)($|\.)/;
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
      if (lastEvent && lastEvent.changes && !lastEvent.changes.empty && event.changes && (!userEvent || joinableUserEvent.test(userEvent)) && (!lastEvent.selectionsAfter.length && time - this.prevTime < newGroupDelay && isAdjacent(lastEvent.changes, event.changes) || userEvent == "input.type.compose")) {
        done = updateBranch(done, done.length - 1, maxLen, new HistEvent(event.changes.compose(lastEvent.changes), conc(event.effects, lastEvent.effects), lastEvent.mapped, lastEvent.startSelection, none2));
      } else {
        done = updateBranch(done, done.length, maxLen, event);
      }
      return new HistoryState(done, none2, time, userEvent);
    }
    addSelection(selection2, time, userEvent, newGroupDelay) {
      let last = this.done.length ? this.done[this.done.length - 1].selectionsAfter : none2;
      if (last.length > 0 && time - this.prevTime < newGroupDelay && userEvent == this.prevUserEvent && userEvent && /^select($|\.)/.test(userEvent) && eqSelectionShape(last[last.length - 1], selection2))
        return this;
      return new HistoryState(addSelection(this.done, selection2), this.undone, time, userEvent);
    }
    addMapping(mapping) {
      return new HistoryState(addMappingToBranch(this.done, mapping), addMappingToBranch(this.undone, mapping), this.prevTime, this.prevUserEvent);
    }
    pop(side, state, selection2) {
      let branch = side == 0 ? this.done : this.undone;
      if (branch.length == 0)
        return null;
      let event = branch[branch.length - 1];
      if (selection2 && event.selectionsAfter.length) {
        return state.update({
          selection: event.selectionsAfter[event.selectionsAfter.length - 1],
          annotations: fromHistory.of({ side, rest: popSelection(branch) }),
          userEvent: side == 0 ? "select.undo" : "select.redo",
          scrollIntoView: true
        });
      } else if (!event.changes) {
        return null;
      } else {
        let rest = branch.length == 1 ? none2 : branch.slice(0, branch.length - 1);
        if (event.mapped)
          rest = addMappingToBranch(rest, event.mapped);
        return state.update({
          changes: event.changes,
          selection: event.startSelection,
          effects: event.effects,
          annotations: fromHistory.of({ side, rest }),
          filter: false,
          userEvent: side == 0 ? "undo" : "redo",
          scrollIntoView: true
        });
      }
    }
  };
  HistoryState.empty = /* @__PURE__ */ new HistoryState(none2, none2);
  var historyKeymap = [
    { key: "Mod-z", run: undo, preventDefault: true },
    { key: "Mod-y", mac: "Mod-Shift-z", run: redo, preventDefault: true },
    { linux: "Ctrl-Shift-z", run: redo, preventDefault: true },
    { key: "Mod-u", run: undoSelection, preventDefault: true },
    { key: "Alt-u", mac: "Mod-Shift-u", run: redoSelection, preventDefault: true }
  ];
  function updateSel(sel, by) {
    return EditorSelection.create(sel.ranges.map(by), sel.mainIndex);
  }
  function setSel(state, selection2) {
    return state.update({ selection: selection2, scrollIntoView: true, userEvent: "select" });
  }
  function moveSel({ state, dispatch }, how) {
    let selection2 = updateSel(state.selection, how);
    if (selection2.eq(state.selection))
      return false;
    dispatch(setSel(state, selection2));
    return true;
  }
  function rangeEnd(range, forward) {
    return EditorSelection.cursor(forward ? range.to : range.from);
  }
  function cursorByChar(view, forward) {
    return moveSel(view, (range) => range.empty ? view.moveByChar(range, forward) : rangeEnd(range, forward));
  }
  function ltrAtCursor(view) {
    return view.textDirectionAt(view.state.selection.main.head) == Direction.LTR;
  }
  var cursorCharLeft = (view) => cursorByChar(view, !ltrAtCursor(view));
  var cursorCharRight = (view) => cursorByChar(view, ltrAtCursor(view));
  function cursorByGroup(view, forward) {
    return moveSel(view, (range) => range.empty ? view.moveByGroup(range, forward) : rangeEnd(range, forward));
  }
  var cursorGroupLeft = (view) => cursorByGroup(view, !ltrAtCursor(view));
  var cursorGroupRight = (view) => cursorByGroup(view, ltrAtCursor(view));
  function interestingNode(state, node, bracketProp) {
    if (node.type.prop(bracketProp))
      return true;
    let len = node.to - node.from;
    return len && (len > 2 || /[^\s,.;:]/.test(state.sliceDoc(node.from, node.to))) || node.firstChild;
  }
  function moveBySyntax(state, start, forward) {
    let pos = syntaxTree(state).resolveInner(start.head);
    let bracketProp = forward ? NodeProp.closedBy : NodeProp.openedBy;
    for (let at = start.head; ; ) {
      let next3 = forward ? pos.childAfter(at) : pos.childBefore(at);
      if (!next3)
        break;
      if (interestingNode(state, next3, bracketProp))
        pos = next3;
      else
        at = forward ? next3.to : next3.from;
    }
    let bracket2 = pos.type.prop(bracketProp), match2, newPos;
    if (bracket2 && (match2 = forward ? matchBrackets(state, pos.from, 1) : matchBrackets(state, pos.to, -1)) && match2.matched)
      newPos = forward ? match2.end.to : match2.end.from;
    else
      newPos = forward ? pos.to : pos.from;
    return EditorSelection.cursor(newPos, forward ? -1 : 1);
  }
  var cursorSyntaxLeft = (view) => moveSel(view, (range) => moveBySyntax(view.state, range, !ltrAtCursor(view)));
  var cursorSyntaxRight = (view) => moveSel(view, (range) => moveBySyntax(view.state, range, ltrAtCursor(view)));
  function cursorByLine(view, forward) {
    return moveSel(view, (range) => {
      if (!range.empty)
        return rangeEnd(range, forward);
      let moved = view.moveVertically(range, forward);
      return moved.head != range.head ? moved : view.moveToLineBoundary(range, forward);
    });
  }
  var cursorLineUp = (view) => cursorByLine(view, false);
  var cursorLineDown = (view) => cursorByLine(view, true);
  function pageHeight(view) {
    return Math.max(view.defaultLineHeight, Math.min(view.dom.clientHeight, innerHeight) - 5);
  }
  function cursorByPage(view, forward) {
    let { state } = view, selection2 = updateSel(state.selection, (range) => {
      return range.empty ? view.moveVertically(range, forward, pageHeight(view)) : rangeEnd(range, forward);
    });
    if (selection2.eq(state.selection))
      return false;
    let startPos = view.coordsAtPos(state.selection.main.head);
    let scrollRect = view.scrollDOM.getBoundingClientRect();
    let effect;
    if (startPos && startPos.top > scrollRect.top && startPos.bottom < scrollRect.bottom && startPos.top - scrollRect.top <= view.scrollDOM.scrollHeight - view.scrollDOM.scrollTop - view.scrollDOM.clientHeight)
      effect = EditorView.scrollIntoView(selection2.main.head, { y: "start", yMargin: startPos.top - scrollRect.top });
    view.dispatch(setSel(state, selection2), { effects: effect });
    return true;
  }
  var cursorPageUp = (view) => cursorByPage(view, false);
  var cursorPageDown = (view) => cursorByPage(view, true);
  function moveByLineBoundary(view, start, forward) {
    let line2 = view.lineBlockAt(start.head), moved = view.moveToLineBoundary(start, forward);
    if (moved.head == start.head && moved.head != (forward ? line2.to : line2.from))
      moved = view.moveToLineBoundary(start, forward, false);
    if (!forward && moved.head == line2.from && line2.length) {
      let space = /^\s*/.exec(view.state.sliceDoc(line2.from, Math.min(line2.from + 100, line2.to)))[0].length;
      if (space && start.head != line2.from + space)
        moved = EditorSelection.cursor(line2.from + space);
    }
    return moved;
  }
  var cursorLineBoundaryForward = (view) => moveSel(view, (range) => moveByLineBoundary(view, range, true));
  var cursorLineBoundaryBackward = (view) => moveSel(view, (range) => moveByLineBoundary(view, range, false));
  var cursorLineBoundaryLeft = (view) => moveSel(view, (range) => moveByLineBoundary(view, range, !ltrAtCursor(view)));
  var cursorLineBoundaryRight = (view) => moveSel(view, (range) => moveByLineBoundary(view, range, ltrAtCursor(view)));
  var cursorLineStart = (view) => moveSel(view, (range) => EditorSelection.cursor(view.lineBlockAt(range.head).from, 1));
  var cursorLineEnd = (view) => moveSel(view, (range) => EditorSelection.cursor(view.lineBlockAt(range.head).to, -1));
  function toMatchingBracket(state, dispatch, extend2) {
    let found = false, selection2 = updateSel(state.selection, (range) => {
      let matching = matchBrackets(state, range.head, -1) || matchBrackets(state, range.head, 1) || range.head > 0 && matchBrackets(state, range.head - 1, 1) || range.head < state.doc.length && matchBrackets(state, range.head + 1, -1);
      if (!matching || !matching.end)
        return range;
      found = true;
      let head = matching.start.from == range.head ? matching.end.to : matching.end.from;
      return extend2 ? EditorSelection.range(range.anchor, head) : EditorSelection.cursor(head);
    });
    if (!found)
      return false;
    dispatch(setSel(state, selection2));
    return true;
  }
  var cursorMatchingBracket = ({ state, dispatch }) => toMatchingBracket(state, dispatch, false);
  function extendSel(view, how) {
    let selection2 = updateSel(view.state.selection, (range) => {
      let head = how(range);
      return EditorSelection.range(range.anchor, head.head, head.goalColumn);
    });
    if (selection2.eq(view.state.selection))
      return false;
    view.dispatch(setSel(view.state, selection2));
    return true;
  }
  function selectByChar(view, forward) {
    return extendSel(view, (range) => view.moveByChar(range, forward));
  }
  var selectCharLeft = (view) => selectByChar(view, !ltrAtCursor(view));
  var selectCharRight = (view) => selectByChar(view, ltrAtCursor(view));
  function selectByGroup(view, forward) {
    return extendSel(view, (range) => view.moveByGroup(range, forward));
  }
  var selectGroupLeft = (view) => selectByGroup(view, !ltrAtCursor(view));
  var selectGroupRight = (view) => selectByGroup(view, ltrAtCursor(view));
  var selectSyntaxLeft = (view) => extendSel(view, (range) => moveBySyntax(view.state, range, !ltrAtCursor(view)));
  var selectSyntaxRight = (view) => extendSel(view, (range) => moveBySyntax(view.state, range, ltrAtCursor(view)));
  function selectByLine(view, forward) {
    return extendSel(view, (range) => view.moveVertically(range, forward));
  }
  var selectLineUp = (view) => selectByLine(view, false);
  var selectLineDown = (view) => selectByLine(view, true);
  function selectByPage(view, forward) {
    return extendSel(view, (range) => view.moveVertically(range, forward, pageHeight(view)));
  }
  var selectPageUp = (view) => selectByPage(view, false);
  var selectPageDown = (view) => selectByPage(view, true);
  var selectLineBoundaryForward = (view) => extendSel(view, (range) => moveByLineBoundary(view, range, true));
  var selectLineBoundaryBackward = (view) => extendSel(view, (range) => moveByLineBoundary(view, range, false));
  var selectLineBoundaryLeft = (view) => extendSel(view, (range) => moveByLineBoundary(view, range, !ltrAtCursor(view)));
  var selectLineBoundaryRight = (view) => extendSel(view, (range) => moveByLineBoundary(view, range, ltrAtCursor(view)));
  var selectLineStart = (view) => extendSel(view, (range) => EditorSelection.cursor(view.lineBlockAt(range.head).from));
  var selectLineEnd = (view) => extendSel(view, (range) => EditorSelection.cursor(view.lineBlockAt(range.head).to));
  var cursorDocStart = ({ state, dispatch }) => {
    dispatch(setSel(state, { anchor: 0 }));
    return true;
  };
  var cursorDocEnd = ({ state, dispatch }) => {
    dispatch(setSel(state, { anchor: state.doc.length }));
    return true;
  };
  var selectDocStart = ({ state, dispatch }) => {
    dispatch(setSel(state, { anchor: state.selection.main.anchor, head: 0 }));
    return true;
  };
  var selectDocEnd = ({ state, dispatch }) => {
    dispatch(setSel(state, { anchor: state.selection.main.anchor, head: state.doc.length }));
    return true;
  };
  var selectAll = ({ state, dispatch }) => {
    dispatch(state.update({ selection: { anchor: 0, head: state.doc.length }, userEvent: "select" }));
    return true;
  };
  var selectLine = ({ state, dispatch }) => {
    let ranges = selectedLineBlocks(state).map(({ from, to }) => EditorSelection.range(from, Math.min(to + 1, state.doc.length)));
    dispatch(state.update({ selection: EditorSelection.create(ranges), userEvent: "select" }));
    return true;
  };
  var selectParentSyntax = ({ state, dispatch }) => {
    let selection2 = updateSel(state.selection, (range) => {
      var _a2;
      let context = syntaxTree(state).resolveInner(range.head, 1);
      while (!(context.from < range.from && context.to >= range.to || context.to > range.to && context.from <= range.from || !((_a2 = context.parent) === null || _a2 === void 0 ? void 0 : _a2.parent)))
        context = context.parent;
      return EditorSelection.range(context.to, context.from);
    });
    dispatch(setSel(state, selection2));
    return true;
  };
  var simplifySelection = ({ state, dispatch }) => {
    let cur = state.selection, selection2 = null;
    if (cur.ranges.length > 1)
      selection2 = EditorSelection.create([cur.main]);
    else if (!cur.main.empty)
      selection2 = EditorSelection.create([EditorSelection.cursor(cur.main.head)]);
    if (!selection2)
      return false;
    dispatch(setSel(state, selection2));
    return true;
  };
  function deleteBy(target, by) {
    if (target.state.readOnly)
      return false;
    let event = "delete.selection", { state } = target;
    let changes = state.changeByRange((range) => {
      let { from, to } = range;
      if (from == to) {
        let towards = by(from);
        if (towards < from) {
          event = "delete.backward";
          towards = skipAtomic(target, towards, false);
        } else if (towards > from) {
          event = "delete.forward";
          towards = skipAtomic(target, towards, true);
        }
        from = Math.min(from, towards);
        to = Math.max(to, towards);
      } else {
        from = skipAtomic(target, from, false);
        to = skipAtomic(target, to, true);
      }
      return from == to ? { range } : { changes: { from, to }, range: EditorSelection.cursor(from) };
    });
    if (changes.changes.empty)
      return false;
    target.dispatch(state.update(changes, {
      scrollIntoView: true,
      userEvent: event,
      effects: event == "delete.selection" ? EditorView.announce.of(state.phrase("Selection deleted")) : void 0
    }));
    return true;
  }
  function skipAtomic(target, pos, forward) {
    if (target instanceof EditorView)
      for (let ranges of target.state.facet(EditorView.atomicRanges).map((f) => f(target)))
        ranges.between(pos, pos, (from, to) => {
          if (from < pos && to > pos)
            pos = forward ? to : from;
        });
    return pos;
  }
  var deleteByChar = (target, forward) => deleteBy(target, (pos) => {
    let { state } = target, line2 = state.doc.lineAt(pos), before, targetPos;
    if (!forward && pos > line2.from && pos < line2.from + 200 && !/[^ \t]/.test(before = line2.text.slice(0, pos - line2.from))) {
      if (before[before.length - 1] == "	")
        return pos - 1;
      let col = countColumn(before, state.tabSize), drop = col % getIndentUnit(state) || getIndentUnit(state);
      for (let i = 0; i < drop && before[before.length - 1 - i] == " "; i++)
        pos--;
      targetPos = pos;
    } else {
      targetPos = findClusterBreak(line2.text, pos - line2.from, forward, forward) + line2.from;
      if (targetPos == pos && line2.number != (forward ? state.doc.lines : 1))
        targetPos += forward ? 1 : -1;
    }
    return targetPos;
  });
  var deleteCharBackward = (view) => deleteByChar(view, false);
  var deleteCharForward = (view) => deleteByChar(view, true);
  var deleteByGroup = (target, forward) => deleteBy(target, (start) => {
    let pos = start, { state } = target, line2 = state.doc.lineAt(pos);
    let categorize = state.charCategorizer(pos);
    for (let cat = null; ; ) {
      if (pos == (forward ? line2.to : line2.from)) {
        if (pos == start && line2.number != (forward ? state.doc.lines : 1))
          pos += forward ? 1 : -1;
        break;
      }
      let next3 = findClusterBreak(line2.text, pos - line2.from, forward) + line2.from;
      let nextChar2 = line2.text.slice(Math.min(pos, next3) - line2.from, Math.max(pos, next3) - line2.from);
      let nextCat = categorize(nextChar2);
      if (cat != null && nextCat != cat)
        break;
      if (nextChar2 != " " || pos != start)
        cat = nextCat;
      pos = next3;
    }
    return pos;
  });
  var deleteGroupBackward = (target) => deleteByGroup(target, false);
  var deleteGroupForward = (target) => deleteByGroup(target, true);
  var deleteToLineEnd = (view) => deleteBy(view, (pos) => {
    let lineEnd = view.lineBlockAt(pos).to;
    return pos < lineEnd ? lineEnd : Math.min(view.state.doc.length, pos + 1);
  });
  var deleteToLineStart = (view) => deleteBy(view, (pos) => {
    let lineStart = view.lineBlockAt(pos).from;
    return pos > lineStart ? lineStart : Math.max(0, pos - 1);
  });
  var splitLine = ({ state, dispatch }) => {
    if (state.readOnly)
      return false;
    let changes = state.changeByRange((range) => {
      return {
        changes: { from: range.from, to: range.to, insert: Text.of(["", ""]) },
        range: EditorSelection.cursor(range.from)
      };
    });
    dispatch(state.update(changes, { scrollIntoView: true, userEvent: "input" }));
    return true;
  };
  var transposeChars = ({ state, dispatch }) => {
    if (state.readOnly)
      return false;
    let changes = state.changeByRange((range) => {
      if (!range.empty || range.from == 0 || range.from == state.doc.length)
        return { range };
      let pos = range.from, line2 = state.doc.lineAt(pos);
      let from = pos == line2.from ? pos - 1 : findClusterBreak(line2.text, pos - line2.from, false) + line2.from;
      let to = pos == line2.to ? pos + 1 : findClusterBreak(line2.text, pos - line2.from, true) + line2.from;
      return {
        changes: { from, to, insert: state.doc.slice(pos, to).append(state.doc.slice(from, pos)) },
        range: EditorSelection.cursor(to)
      };
    });
    if (changes.changes.empty)
      return false;
    dispatch(state.update(changes, { scrollIntoView: true, userEvent: "move.character" }));
    return true;
  };
  function selectedLineBlocks(state) {
    let blocks = [], upto = -1;
    for (let range of state.selection.ranges) {
      let startLine = state.doc.lineAt(range.from), endLine = state.doc.lineAt(range.to);
      if (!range.empty && range.to == endLine.from)
        endLine = state.doc.lineAt(range.to - 1);
      if (upto >= startLine.number) {
        let prev = blocks[blocks.length - 1];
        prev.to = endLine.to;
        prev.ranges.push(range);
      } else {
        blocks.push({ from: startLine.from, to: endLine.to, ranges: [range] });
      }
      upto = endLine.number + 1;
    }
    return blocks;
  }
  function moveLine(state, dispatch, forward) {
    if (state.readOnly)
      return false;
    let changes = [], ranges = [];
    for (let block of selectedLineBlocks(state)) {
      if (forward ? block.to == state.doc.length : block.from == 0)
        continue;
      let nextLine = state.doc.lineAt(forward ? block.to + 1 : block.from - 1);
      let size = nextLine.length + 1;
      if (forward) {
        changes.push({ from: block.to, to: nextLine.to }, { from: block.from, insert: nextLine.text + state.lineBreak });
        for (let r of block.ranges)
          ranges.push(EditorSelection.range(Math.min(state.doc.length, r.anchor + size), Math.min(state.doc.length, r.head + size)));
      } else {
        changes.push({ from: nextLine.from, to: block.from }, { from: block.to, insert: state.lineBreak + nextLine.text });
        for (let r of block.ranges)
          ranges.push(EditorSelection.range(r.anchor - size, r.head - size));
      }
    }
    if (!changes.length)
      return false;
    dispatch(state.update({
      changes,
      scrollIntoView: true,
      selection: EditorSelection.create(ranges, state.selection.mainIndex),
      userEvent: "move.line"
    }));
    return true;
  }
  var moveLineUp = ({ state, dispatch }) => moveLine(state, dispatch, false);
  var moveLineDown = ({ state, dispatch }) => moveLine(state, dispatch, true);
  function copyLine(state, dispatch, forward) {
    if (state.readOnly)
      return false;
    let changes = [];
    for (let block of selectedLineBlocks(state)) {
      if (forward)
        changes.push({ from: block.from, insert: state.doc.slice(block.from, block.to) + state.lineBreak });
      else
        changes.push({ from: block.to, insert: state.lineBreak + state.doc.slice(block.from, block.to) });
    }
    dispatch(state.update({ changes, scrollIntoView: true, userEvent: "input.copyline" }));
    return true;
  }
  var copyLineUp = ({ state, dispatch }) => copyLine(state, dispatch, false);
  var copyLineDown = ({ state, dispatch }) => copyLine(state, dispatch, true);
  var deleteLine = (view) => {
    if (view.state.readOnly)
      return false;
    let { state } = view, changes = state.changes(selectedLineBlocks(state).map(({ from, to }) => {
      if (from > 0)
        from--;
      else if (to < state.doc.length)
        to++;
      return { from, to };
    }));
    let selection2 = updateSel(state.selection, (range) => view.moveVertically(range, true)).map(changes);
    view.dispatch({ changes, selection: selection2, scrollIntoView: true, userEvent: "delete.line" });
    return true;
  };
  function isBetweenBrackets(state, pos) {
    if (/\(\)|\[\]|\{\}/.test(state.sliceDoc(pos - 1, pos + 1)))
      return { from: pos, to: pos };
    let context = syntaxTree(state).resolveInner(pos);
    let before = context.childBefore(pos), after = context.childAfter(pos), closedBy;
    if (before && after && before.to <= pos && after.from >= pos && (closedBy = before.type.prop(NodeProp.closedBy)) && closedBy.indexOf(after.name) > -1 && state.doc.lineAt(before.to).from == state.doc.lineAt(after.from).from)
      return { from: before.to, to: after.from };
    return null;
  }
  var insertNewlineAndIndent = /* @__PURE__ */ newlineAndIndent(false);
  var insertBlankLine = /* @__PURE__ */ newlineAndIndent(true);
  function newlineAndIndent(atEof) {
    return ({ state, dispatch }) => {
      if (state.readOnly)
        return false;
      let changes = state.changeByRange((range) => {
        let { from, to } = range, line2 = state.doc.lineAt(from);
        let explode = !atEof && from == to && isBetweenBrackets(state, from);
        if (atEof)
          from = to = (to <= line2.to ? line2 : state.doc.lineAt(to)).to;
        let cx = new IndentContext(state, { simulateBreak: from, simulateDoubleBreak: !!explode });
        let indent = getIndentation(cx, from);
        if (indent == null)
          indent = /^\s*/.exec(state.doc.lineAt(from).text)[0].length;
        while (to < line2.to && /\s/.test(line2.text[to - line2.from]))
          to++;
        if (explode)
          ({ from, to } = explode);
        else if (from > line2.from && from < line2.from + 100 && !/\S/.test(line2.text.slice(0, from)))
          from = line2.from;
        let insert2 = ["", indentString(state, indent)];
        if (explode)
          insert2.push(indentString(state, cx.lineIndent(line2.from, -1)));
        return {
          changes: { from, to, insert: Text.of(insert2) },
          range: EditorSelection.cursor(from + 1 + insert2[1].length)
        };
      });
      dispatch(state.update(changes, { scrollIntoView: true, userEvent: "input" }));
      return true;
    };
  }
  function changeBySelectedLine(state, f) {
    let atLine = -1;
    return state.changeByRange((range) => {
      let changes = [];
      for (let pos = range.from; pos <= range.to; ) {
        let line2 = state.doc.lineAt(pos);
        if (line2.number > atLine && (range.empty || range.to > line2.from)) {
          f(line2, changes, range);
          atLine = line2.number;
        }
        pos = line2.to + 1;
      }
      let changeSet = state.changes(changes);
      return {
        changes,
        range: EditorSelection.range(changeSet.mapPos(range.anchor, 1), changeSet.mapPos(range.head, 1))
      };
    });
  }
  var indentSelection = ({ state, dispatch }) => {
    if (state.readOnly)
      return false;
    let updated = /* @__PURE__ */ Object.create(null);
    let context = new IndentContext(state, { overrideIndentation: (start) => {
      let found = updated[start];
      return found == null ? -1 : found;
    } });
    let changes = changeBySelectedLine(state, (line2, changes2, range) => {
      let indent = getIndentation(context, line2.from);
      if (indent == null)
        return;
      if (!/\S/.test(line2.text))
        indent = 0;
      let cur = /^\s*/.exec(line2.text)[0];
      let norm = indentString(state, indent);
      if (cur != norm || range.from < line2.from + cur.length) {
        updated[line2.from] = indent;
        changes2.push({ from: line2.from, to: line2.from + cur.length, insert: norm });
      }
    });
    if (!changes.changes.empty)
      dispatch(state.update(changes, { userEvent: "indent" }));
    return true;
  };
  var indentMore = ({ state, dispatch }) => {
    if (state.readOnly)
      return false;
    dispatch(state.update(changeBySelectedLine(state, (line2, changes) => {
      changes.push({ from: line2.from, insert: state.facet(indentUnit) });
    }), { userEvent: "input.indent" }));
    return true;
  };
  var indentLess = ({ state, dispatch }) => {
    if (state.readOnly)
      return false;
    dispatch(state.update(changeBySelectedLine(state, (line2, changes) => {
      let space = /^\s*/.exec(line2.text)[0];
      if (!space)
        return;
      let col = countColumn(space, state.tabSize), keep = 0;
      let insert2 = indentString(state, Math.max(0, col - getIndentUnit(state)));
      while (keep < space.length && keep < insert2.length && space.charCodeAt(keep) == insert2.charCodeAt(keep))
        keep++;
      changes.push({ from: line2.from + keep, to: line2.from + space.length, insert: insert2.slice(keep) });
    }), { userEvent: "delete.dedent" }));
    return true;
  };
  var emacsStyleKeymap = [
    { key: "Ctrl-b", run: cursorCharLeft, shift: selectCharLeft, preventDefault: true },
    { key: "Ctrl-f", run: cursorCharRight, shift: selectCharRight },
    { key: "Ctrl-p", run: cursorLineUp, shift: selectLineUp },
    { key: "Ctrl-n", run: cursorLineDown, shift: selectLineDown },
    { key: "Ctrl-a", run: cursorLineStart, shift: selectLineStart },
    { key: "Ctrl-e", run: cursorLineEnd, shift: selectLineEnd },
    { key: "Ctrl-d", run: deleteCharForward },
    { key: "Ctrl-h", run: deleteCharBackward },
    { key: "Ctrl-k", run: deleteToLineEnd },
    { key: "Ctrl-Alt-h", run: deleteGroupBackward },
    { key: "Ctrl-o", run: splitLine },
    { key: "Ctrl-t", run: transposeChars },
    { key: "Ctrl-v", run: cursorPageDown }
  ];
  var standardKeymap = /* @__PURE__ */ [
    { key: "ArrowLeft", run: cursorCharLeft, shift: selectCharLeft, preventDefault: true },
    { key: "Mod-ArrowLeft", mac: "Alt-ArrowLeft", run: cursorGroupLeft, shift: selectGroupLeft, preventDefault: true },
    { mac: "Cmd-ArrowLeft", run: cursorLineBoundaryLeft, shift: selectLineBoundaryLeft, preventDefault: true },
    { key: "ArrowRight", run: cursorCharRight, shift: selectCharRight, preventDefault: true },
    { key: "Mod-ArrowRight", mac: "Alt-ArrowRight", run: cursorGroupRight, shift: selectGroupRight, preventDefault: true },
    { mac: "Cmd-ArrowRight", run: cursorLineBoundaryRight, shift: selectLineBoundaryRight, preventDefault: true },
    { key: "ArrowUp", run: cursorLineUp, shift: selectLineUp, preventDefault: true },
    { mac: "Cmd-ArrowUp", run: cursorDocStart, shift: selectDocStart },
    { mac: "Ctrl-ArrowUp", run: cursorPageUp, shift: selectPageUp },
    { key: "ArrowDown", run: cursorLineDown, shift: selectLineDown, preventDefault: true },
    { mac: "Cmd-ArrowDown", run: cursorDocEnd, shift: selectDocEnd },
    { mac: "Ctrl-ArrowDown", run: cursorPageDown, shift: selectPageDown },
    { key: "PageUp", run: cursorPageUp, shift: selectPageUp },
    { key: "PageDown", run: cursorPageDown, shift: selectPageDown },
    { key: "Home", run: cursorLineBoundaryBackward, shift: selectLineBoundaryBackward, preventDefault: true },
    { key: "Mod-Home", run: cursorDocStart, shift: selectDocStart },
    { key: "End", run: cursorLineBoundaryForward, shift: selectLineBoundaryForward, preventDefault: true },
    { key: "Mod-End", run: cursorDocEnd, shift: selectDocEnd },
    { key: "Enter", run: insertNewlineAndIndent },
    { key: "Mod-a", run: selectAll },
    { key: "Backspace", run: deleteCharBackward, shift: deleteCharBackward },
    { key: "Delete", run: deleteCharForward },
    { key: "Mod-Backspace", mac: "Alt-Backspace", run: deleteGroupBackward },
    { key: "Mod-Delete", mac: "Alt-Delete", run: deleteGroupForward },
    { mac: "Mod-Backspace", run: deleteToLineStart },
    { mac: "Mod-Delete", run: deleteToLineEnd }
  ].concat(/* @__PURE__ */ emacsStyleKeymap.map((b) => ({ mac: b.key, run: b.run, shift: b.shift })));
  var defaultKeymap = /* @__PURE__ */ [
    { key: "Alt-ArrowLeft", mac: "Ctrl-ArrowLeft", run: cursorSyntaxLeft, shift: selectSyntaxLeft },
    { key: "Alt-ArrowRight", mac: "Ctrl-ArrowRight", run: cursorSyntaxRight, shift: selectSyntaxRight },
    { key: "Alt-ArrowUp", run: moveLineUp },
    { key: "Shift-Alt-ArrowUp", run: copyLineUp },
    { key: "Alt-ArrowDown", run: moveLineDown },
    { key: "Shift-Alt-ArrowDown", run: copyLineDown },
    { key: "Escape", run: simplifySelection },
    { key: "Mod-Enter", run: insertBlankLine },
    { key: "Alt-l", mac: "Ctrl-l", run: selectLine },
    { key: "Mod-i", run: selectParentSyntax, preventDefault: true },
    { key: "Mod-[", run: indentLess },
    { key: "Mod-]", run: indentMore },
    { key: "Mod-Alt-\\", run: indentSelection },
    { key: "Shift-Mod-k", run: deleteLine },
    { key: "Shift-Mod-\\", run: cursorMatchingBracket },
    { key: "Mod-/", run: toggleComment },
    { key: "Alt-A", run: toggleBlockComment }
  ].concat(standardKeymap);
  var indentWithTab = { key: "Tab", run: indentMore, shift: indentLess };

  // node_modules/@codemirror/autocomplete/dist/index.js
  var defaults = {
    brackets: ["(", "[", "{", "'", '"'],
    before: ")]}:;>",
    stringPrefixes: []
  };
  var closeBracketEffect = /* @__PURE__ */ StateEffect.define({
    map(value, mapping) {
      let mapped = mapping.mapPos(value, -1, MapMode.TrackAfter);
      return mapped == null ? void 0 : mapped;
    }
  });
  var skipBracketEffect = /* @__PURE__ */ StateEffect.define({
    map(value, mapping) {
      return mapping.mapPos(value);
    }
  });
  var closedBracket = /* @__PURE__ */ new class extends RangeValue {
  }();
  closedBracket.startSide = 1;
  closedBracket.endSide = -1;
  var bracketState = /* @__PURE__ */ StateField.define({
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
          value = value.update({ add: [closedBracket.range(effect.value, effect.value + 1)] });
        else if (effect.is(skipBracketEffect))
          value = value.update({ filter: (from) => from != effect.value });
      }
      return value;
    }
  });
  function closeBrackets() {
    return [inputHandler2, bracketState];
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
  var android = typeof navigator == "object" && /* @__PURE__ */ /Android\b/.test(navigator.userAgent);
  var inputHandler2 = /* @__PURE__ */ EditorView.inputHandler.of((view, from, to, insert2) => {
    if ((android ? view.composing : view.compositionStarted) || view.state.readOnly)
      return false;
    let sel = view.state.selection.main;
    if (insert2.length > 2 || insert2.length == 2 && codePointSize(codePointAt(insert2, 0)) == 1 || from != sel.from || to != sel.to)
      return false;
    let tr = insertBracket(view.state, insert2);
    if (!tr)
      return false;
    view.dispatch(tr);
    return true;
  });
  var deleteBracketPair = ({ state, dispatch }) => {
    if (state.readOnly)
      return false;
    let conf = config(state, state.selection.main.head);
    let tokens = conf.brackets || defaults.brackets;
    let dont = null, changes = state.changeByRange((range) => {
      if (range.empty) {
        let before = prevChar(state.doc, range.head);
        for (let token2 of tokens) {
          if (token2 == before && nextChar(state.doc, range.head) == closing(codePointAt(token2, 0)))
            return {
              changes: { from: range.head - token2.length, to: range.head + token2.length },
              range: EditorSelection.cursor(range.head - token2.length)
            };
        }
      }
      return { range: dont = range };
    });
    if (!dont)
      dispatch(state.update(changes, { scrollIntoView: true, userEvent: "delete.backward" }));
    return !dont;
  };
  var closeBracketsKeymap = [
    { key: "Backspace", run: deleteBracketPair }
  ];
  function insertBracket(state, bracket2) {
    let conf = config(state, state.selection.main.head);
    let tokens = conf.brackets || defaults.brackets;
    for (let tok2 of tokens) {
      let closed = closing(codePointAt(tok2, 0));
      if (bracket2 == tok2)
        return closed == tok2 ? handleSame(state, tok2, tokens.indexOf(tok2 + tok2 + tok2) > -1, conf) : handleOpen(state, tok2, closed, conf.before || defaults.before);
      if (bracket2 == closed && closedBracketAt(state, state.selection.main.from))
        return handleClose(state, tok2, closed);
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
    let next3 = doc2.sliceString(pos, pos + 2);
    return next3.slice(0, codePointSize(codePointAt(next3, 0)));
  }
  function prevChar(doc2, pos) {
    let prev = doc2.sliceString(pos - 2, pos);
    return codePointSize(codePointAt(prev, 0)) == prev.length ? prev : prev.slice(1);
  }
  function handleOpen(state, open, close, closeBefore) {
    let dont = null, changes = state.changeByRange((range) => {
      if (!range.empty)
        return {
          changes: [{ insert: open, from: range.from }, { insert: close, from: range.to }],
          effects: closeBracketEffect.of(range.to + open.length),
          range: EditorSelection.range(range.anchor + open.length, range.head + open.length)
        };
      let next3 = nextChar(state.doc, range.head);
      if (!next3 || /\s/.test(next3) || closeBefore.indexOf(next3) > -1)
        return {
          changes: { insert: open + close, from: range.head },
          effects: closeBracketEffect.of(range.head + open.length),
          range: EditorSelection.cursor(range.head + open.length)
        };
      return { range: dont = range };
    });
    return dont ? null : state.update(changes, {
      scrollIntoView: true,
      userEvent: "input.type"
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
      effects: state.selection.ranges.map(({ from }) => skipBracketEffect.of(from))
    });
  }
  function handleSame(state, token2, allowTriple, config2) {
    let stringPrefixes = config2.stringPrefixes || defaults.stringPrefixes;
    let dont = null, changes = state.changeByRange((range) => {
      if (!range.empty)
        return {
          changes: [{ insert: token2, from: range.from }, { insert: token2, from: range.to }],
          effects: closeBracketEffect.of(range.to + token2.length),
          range: EditorSelection.range(range.anchor + token2.length, range.head + token2.length)
        };
      let pos = range.head, next3 = nextChar(state.doc, pos), start;
      if (next3 == token2) {
        if (nodeStart(state, pos)) {
          return {
            changes: { insert: token2 + token2, from: pos },
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
      } else if (allowTriple && state.sliceDoc(pos - 2 * token2.length, pos) == token2 + token2 && (start = canStartStringAt(state, pos - 2 * token2.length, stringPrefixes)) > -1 && nodeStart(state, start)) {
        return {
          changes: { insert: token2 + token2 + token2 + token2, from: pos },
          effects: closeBracketEffect.of(pos + token2.length),
          range: EditorSelection.cursor(pos + token2.length)
        };
      } else if (state.charCategorizer(pos)(next3) != CharCategory.Word) {
        if (canStartStringAt(state, pos, stringPrefixes) > -1 && !probablyInString(state, pos, token2, stringPrefixes))
          return {
            changes: { insert: token2 + token2, from: pos },
            effects: closeBracketEffect.of(pos + token2.length),
            range: EditorSelection.cursor(pos + token2.length)
          };
      }
      return { range: dont = range };
    });
    return dont ? null : state.update(changes, {
      scrollIntoView: true,
      userEvent: "input.type"
    });
  }
  function nodeStart(state, pos) {
    let tree = syntaxTree(state).resolveInner(pos + 1);
    return tree.parent && tree.from == pos;
  }
  function probablyInString(state, pos, quoteToken, prefixes2) {
    let node = syntaxTree(state).resolveInner(pos, -1);
    let maxPrefix = prefixes2.reduce((m, p) => Math.max(m, p.length), 0);
    for (let i = 0; i < 5; i++) {
      let start = state.sliceDoc(node.from, Math.min(node.to, node.from + quoteToken.length + maxPrefix));
      let quotePos = start.indexOf(quoteToken);
      if (!quotePos || quotePos > -1 && prefixes2.indexOf(start.slice(0, quotePos)) > -1) {
        let first = node.firstChild;
        while (first && first.from == node.from && first.to - first.from > quoteToken.length + quotePos) {
          if (state.sliceDoc(first.to - quoteToken.length, first.to) == quoteToken)
            return false;
          first = first.firstChild;
        }
        return true;
      }
      let parent = node.to == pos && node.parent;
      if (!parent)
        break;
      node = parent;
    }
    return false;
  }
  function canStartStringAt(state, pos, prefixes2) {
    let charCat = state.charCategorizer(pos);
    if (charCat(state.sliceDoc(pos - 1, pos)) != CharCategory.Word)
      return pos;
    for (let prefix of prefixes2) {
      let start = pos - prefix.length;
      if (state.sliceDoc(start, pos) == prefix && charCat(state.sliceDoc(start - 1, start)) != CharCategory.Word)
        return start;
    }
    return -1;
  }

  // node_modules/cm6-theme-material-dark/dist/index.js
  var base00 = "#2e3235";
  var base01 = "#505d64";
  var base02 = "#606f7a";
  var base03 = "#707d8b";
  var base04 = "#a0a4ae";
  var base05 = "#bdbdbd";
  var base06 = "#e0e0e0";
  var base07 = "#fdf6e3";
  var base_red = "#ff5f52";
  var base_deeporange = "#ff6e40";
  var base_pink = "#fa5788";
  var base_yellow = "#facf4e";
  var base_orange = "#ffad42";
  var base_cyan = "#56c8d8";
  var base_indigo = "#7186f0";
  var base_purple = "#cf6edf";
  var base_green = "#6abf69";
  var base_lightgreen = "#99d066";
  var base_teal = "#4ebaaa";
  var invalid = base_red;
  var darkBackground = "#202325";
  var highlightBackground = "#545b61";
  var background = base00;
  var tooltipBackground = base01;
  var selection = base01;
  var cursor = base04;
  var materialDarkTheme = /* @__PURE__ */ EditorView.theme({
    "&": {
      color: base05,
      backgroundColor: background
    },
    ".cm-content": {
      caretColor: cursor
    },
    ".cm-cursor, .cm-dropCursor": { borderLeftColor: cursor },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": { backgroundColor: selection },
    ".cm-panels": { backgroundColor: darkBackground, color: base03 },
    ".cm-panels.cm-panels-top": { borderBottom: "2px solid black" },
    ".cm-panels.cm-panels-bottom": { borderTop: "2px solid black" },
    ".cm-searchMatch": {
      outline: `1px solid ${base_yellow}`,
      backgroundColor: "transparent"
    },
    ".cm-searchMatch.cm-searchMatch-selected": {
      backgroundColor: highlightBackground
    },
    ".cm-activeLine": { backgroundColor: highlightBackground },
    ".cm-selectionMatch": {
      backgroundColor: darkBackground,
      outline: `1px solid ${base_teal}`
    },
    "&.cm-focused .cm-matchingBracket": {
      color: base06,
      outline: `1px solid ${base_teal}`
    },
    "&.cm-focused .cm-nonmatchingBracket": {
      color: base_red
    },
    ".cm-gutters": {
      backgroundColor: base00,
      borderRight: "1px solid #4f5b66",
      color: base02
    },
    ".cm-activeLineGutter": {
      backgroundColor: highlightBackground,
      color: base07
    },
    ".cm-foldPlaceholder": {
      backgroundColor: "transparent",
      border: "none",
      color: "#ddd"
    },
    ".cm-tooltip": {
      border: "none",
      backgroundColor: tooltipBackground
    },
    ".cm-tooltip .cm-tooltip-arrow:before": {
      borderTopColor: "transparent",
      borderBottomColor: "transparent"
    },
    ".cm-tooltip .cm-tooltip-arrow:after": {
      borderTopColor: tooltipBackground,
      borderBottomColor: tooltipBackground
    },
    ".cm-tooltip-autocomplete": {
      "& > ul > li[aria-selected]": {
        backgroundColor: highlightBackground,
        color: base03
      }
    }
  }, { dark: true });
  var materialDarkHighlightStyle = /* @__PURE__ */ HighlightStyle.define([
    { tag: tags.keyword, color: base_purple },
    {
      tag: [tags.name, tags.deleted, tags.character, tags.macroName],
      color: base_cyan
    },
    { tag: [tags.propertyName], color: base_yellow },
    { tag: [tags.variableName], color: base05 },
    { tag: [/* @__PURE__ */ tags.function(tags.variableName)], color: base_cyan },
    { tag: [tags.labelName], color: base_purple },
    {
      tag: [tags.color, /* @__PURE__ */ tags.constant(tags.name), /* @__PURE__ */ tags.standard(tags.name)],
      color: base_yellow
    },
    { tag: [/* @__PURE__ */ tags.definition(tags.name), tags.separator], color: base_pink },
    { tag: [tags.brace], color: base_purple },
    {
      tag: [tags.annotation],
      color: invalid
    },
    {
      tag: [tags.number, tags.changed, tags.annotation, tags.modifier, tags.self, tags.namespace],
      color: base_orange
    },
    {
      tag: [tags.typeName, tags.className],
      color: base_orange
    },
    {
      tag: [tags.operator, tags.operatorKeyword],
      color: base_indigo
    },
    {
      tag: [tags.tagName],
      color: base_deeporange
    },
    {
      tag: [tags.squareBracket],
      color: base_red
    },
    {
      tag: [tags.angleBracket],
      color: base02
    },
    {
      tag: [tags.attributeName],
      color: base05
    },
    {
      tag: [tags.regexp],
      color: invalid
    },
    {
      tag: [tags.quote],
      color: base_green
    },
    { tag: [tags.string], color: base_lightgreen },
    {
      tag: tags.link,
      color: base_cyan,
      textDecoration: "underline",
      textUnderlinePosition: "under"
    },
    {
      tag: [tags.url, tags.escape, /* @__PURE__ */ tags.special(tags.string)],
      color: base_yellow
    },
    { tag: [tags.meta], color: base03 },
    { tag: [tags.comment], color: base03, fontStyle: "italic" },
    { tag: tags.monospace, color: base05 },
    { tag: tags.strong, fontWeight: "bold", color: base_red },
    { tag: tags.emphasis, fontStyle: "italic", color: base_lightgreen },
    { tag: tags.strikethrough, textDecoration: "line-through" },
    { tag: tags.heading, fontWeight: "bold", color: base_yellow },
    { tag: tags.heading1, fontWeight: "bold", color: base_yellow },
    {
      tag: [tags.heading2, tags.heading3, tags.heading4],
      fontWeight: "bold",
      color: base_yellow
    },
    {
      tag: [tags.heading5, tags.heading6],
      color: base_yellow
    },
    { tag: [tags.atom, tags.bool, /* @__PURE__ */ tags.special(tags.variableName)], color: base_cyan },
    {
      tag: [tags.processingInstruction, tags.inserted],
      color: base_red
    },
    {
      tag: [tags.contentSeparator],
      color: base_cyan
    },
    { tag: tags.invalid, color: base02, borderBottom: `1px dotted ${base_red}` }
  ]);
  var materialDark = [
    materialDarkTheme,
    /* @__PURE__ */ syntaxHighlighting(materialDarkHighlightStyle)
  ];

  // core/parser.js
  var code;
  var comment2;
  var currRange;
  var line;
  var match;
  var prevRange;
  var token;
  var currSyntax = null;
  var parentRange = null;
  function setSyntax(syntax) {
    currSyntax = syntax;
  }
  function startAbsRange() {
    return parentRange = currRange.abs();
  }
  var tokenizer = /(["'])(\\(.|\n|$)|[^\\])*?(\1|$)|>>|<<|\|\||&&|>=|<=|<>|==|!=|[\w.$]+|[\S\n]/g;
  function loadCode(source, index = 0) {
    tokenizer.lastIndex = index;
    code = source;
    line = (source.slice(0, index).match(/\n/g) || []).length + 1;
    next = defaultNext;
    parentRange = currRange = new Range3(index, 0);
    match = 1;
    next();
  }
  var defaultNext = () => {
    prevRange = currRange;
    if (!match)
      return "\n";
    comment2 = false;
    match = tokenizer.exec(code);
    if (match) {
      token = match[0];
      currRange = new RelativeRange(parentRange, match.index, token.length);
      if (token == (currSyntax.intel ? ";" : "#")) {
        comment2 = true;
        token = ";";
        tokenizer.lastIndex = code.indexOf("\n", tokenizer.lastIndex);
        if (tokenizer.lastIndex < 0)
          tokenizer.lastIndex = code.length;
        currRange.length = tokenizer.lastIndex - match.index;
      }
    } else {
      token = "\n";
      currRange = new RelativeRange(parentRange, code.length, 1);
    }
    line += (token.match(/\n/g) || []).length;
    return token;
  };
  var next = defaultNext;
  function ungetToken() {
    let t2 = token, p = currRange, oldNext = next;
    currRange = prevRange;
    next = () => token = (next = oldNext, currRange = p, t2);
  }
  function setToken(tok2, range = currRange) {
    token = tok2 || "\n";
    currRange = range;
  }
  var Range3 = class {
    constructor(start = 0, length = 0) {
      if (start < 0 || length < 0)
        throw `Invalid range ${start} to ${start + length}`;
      this._start = start;
      this.length = length;
    }
    includes(pos) {
      return this.end >= pos && pos >= this.start;
    }
    until(end) {
      return new Range3(this.start, end.end - this.start);
    }
    slice(text) {
      return text.slice(this.start, this.end);
    }
    get start() {
      return this._start;
    }
    set start(val) {
      this._start = val;
    }
    get end() {
      return this.start + this.length;
    }
  };
  var RelativeRange = class extends Range3 {
    constructor(parent, start, length) {
      super(start - parent.start, length);
      this.parent = parent;
    }
    get start() {
      return this.parent.start + this._start;
    }
    set start(val) {
      this._start = val - this.parent.start;
    }
    abs() {
      return new Range3(this.start, this.length);
    }
    until(end) {
      return new RelativeRange(this.parent, this.start, end.end - this.start);
    }
  };
  var ASMError = class {
    constructor(message, range = currRange) {
      this.message = message;
      this.range = range;
    }
  };

  // core/relocations.js
  var RelocEntry = class {
    constructor({ offset, sizeReduction, value, size, signed, pcRelative, functionAddr }) {
      this.offset = offset;
      value = value.flatten();
      this.addend = value.addend - sizeReduction;
      if (pcRelative)
        this.addend += BigInt(offset);
      this.symbol = value.symbol;
      this.size = size;
      this.signed = signed;
      this.pcRelative = pcRelative;
      this.functionAddr = functionAddr;
    }
  };

  // core/statement.js
  var totalStatements = 0;
  var StatementNode = class {
    constructor(statement = null) {
      this.statement = statement;
      this.next = null;
    }
    find(pos) {
      if (this.statement && this.statement.range.includes(pos))
        return this;
      return this.next?.find(pos);
    }
    length() {
      let node = this, length = 0;
      while (node) {
        if (node.statement)
          length += node.statement.length;
        node = node.next;
      }
      return length;
    }
    dump() {
      let output, i = 0, node = this;
      try {
        output = Buffer.alloc(this.length());
      } catch (e) {
        output = new Uint8Array(this.length());
      }
      while (node) {
        if (node.statement) {
          output.set(node.statement.bytes.subarray(0, node.statement.length), i);
          i += node.statement.length;
        }
        node = node.next;
      }
      return output;
    }
    getAffectedArea(range, update = false, sourceLength = 0) {
      let node = this;
      let head = this, last = null, tail = null;
      let changeOffset = sourceLength - range.length;
      while (node) {
        let instr2 = node.statement;
        if (instr2) {
          if (instr2.range.end < range.start)
            head = node;
          else if (instr2.range.start <= range.end) {
            last = node;
            if (update) {
              if (instr2.range.end >= range.end)
                instr2.range.length += changeOffset;
              instr2.remove();
            }
          } else {
            if (tail === null)
              tail = node;
            if (update)
              instr2.range.start += changeOffset;
          }
        }
        node = node.next;
      }
      if (update) {
        if (last) {
          range.start = Math.min(range.start, head.next.statement.range.start);
          range.length = last.statement.range.end - range.start;
        } else if (tail)
          range.length = tail.statement.range.start - range.start - 1;
        else
          range.length = sourceLength;
      }
      return { head, prev: head, tail };
    }
  };
  var Statement = class {
    constructor({ addr: addr2 = 0, maxSize = 0, range = new Range3(), error = null, section = currSection, syntax = currSyntax } = {}) {
      this.id = totalStatements++;
      this.error = error;
      this.range = range;
      this.bytes = new Uint8Array(maxSize);
      this.syntax = syntax;
      this.address = addr2;
      this.section = section;
      this.sectionNode = new StatementNode(this);
      this.removed = true;
      this.clear();
    }
    clear() {
      this.length = 0;
      this.relocations = [];
      this.lineEnds = [];
    }
    genByte(byte) {
      this.bytes[this.length++] = Number(byte);
    }
    genValue(value, size, signed = false, sizeRelative = false, functionAddr = false) {
      let sizeReduction = sizeRelative ? BigInt(this.length + size / 8) : 0n;
      let num = 0n;
      if (value.isRelocatable()) {
        if (size >= 128)
          throw new ASMError("Can't do 16 byte relocations", value.range);
        this.relocations.push({
          offset: this.length,
          sizeReduction,
          value,
          signed: signed && !value.pcRelative && size == 32,
          size,
          pcRelative: value.pcRelative,
          functionAddr: functionAddr && value.section == pseudoSections.UND
        });
      } else
        num = value.addend - sizeReduction;
      for (const lineEnd of value.lineEnds)
        this.lineEnds.push(this.length + Math.min(lineEnd, size / 8));
      do {
        this.genByte(num & 0xffn);
        num >>= 8n;
      } while (size -= 8);
    }
    remove() {
      this.removed = true;
    }
  };

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
  ].map((x, i) => ({ [x]: i })));
  var suffixes = {
    b: 8,
    w: 16,
    l: 32,
    q: 64,
    t: 80,
    x: 128,
    y: 256,
    z: 512
  };
  var floatSuffixes = {
    s: 32,
    l: 64,
    t: 80
  };
  var floatIntSuffixes = {
    s: 16,
    l: 32,
    q: 64
  };
  var sizeHints = Object.freeze({
    byte: 8,
    word: 16,
    long: 32,
    dword: 32,
    far: 48,
    fword: 48,
    qword: 64,
    tbyte: 80,
    oword: 128,
    xmmword: 128,
    ymmword: 256,
    zmmword: 512
  });
  function nameRegister(name2, size, syntax) {
    return `${syntax.prefix ? "%" : ""}${size == 32 ? "e" : "r"}` + name2;
  }
  var PREFIX_REX = 1;
  var PREFIX_NOREX = 2;
  var PREFIX_CLASHREX = 3;
  var PREFIX_LOCK = 4;
  var PREFIX_REPNE = 8;
  var PREFIX_REPE = 16;
  var PREFIX_DATASIZE = 32;
  var PREFIX_ADDRSIZE = 64;
  var PREFIX_SEG = 128;
  var regParsePos;
  var regSuffixes = {
    b: 8,
    w: 16,
    d: 32
  };
  function isRegister(reg) {
    reg = reg.toLowerCase();
    if (registers.hasOwnProperty(reg))
      return true;
    if (reg[0] === "r") {
      reg = reg.slice(1);
      if (parseInt(reg) >= 0 && parseInt(reg) < 16 && (!isNaN(reg) || regSuffixes[reg[reg.length - 1]]))
        return true;
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
      else
        return false;
      if (!isNaN(reg) && (reg = parseInt(reg), reg >= 0 && reg < max))
        return true;
    }
    return false;
  }
  function parseRegister(expectedType = null) {
    let regToken = (currSyntax.prefix ? next() : token).toLowerCase();
    let reg = registers[regToken];
    let size = 0, type = -1, prefs = 0;
    if (reg >= registers.al && reg <= registers.rdi) {
      type = OPT.REG;
      size = 8 << (reg >> 3);
      if (size == 8 && reg >= registers.ah && reg <= registers.bh)
        prefs |= PREFIX_NOREX;
      reg &= 7;
    } else if (reg >= registers.es && reg <= registers.gs) {
      type = OPT.SEG;
      size = 32;
      reg -= registers.es;
    } else if (reg == registers.st) {
      type = OPT.ST;
      reg = 0;
      if (next() == "(") {
        reg = parseInt(next());
        if (isNaN(reg) || reg >= 8 || reg < 0 || next() != ")")
          throw new ASMError("Unknown register");
      } else
        ungetToken();
    } else if (reg == registers.rip || reg == registers.eip) {
      if (expectedType == null || !expectedType.includes(OPT.IP))
        throw new ASMError(`Can't use ${nameRegister("ip", reg == registers.eip ? 32 : 64, currSyntax)} here`);
      type = OPT.IP;
      size = reg == registers.eip ? 32 : 64;
      reg = 0;
    } else if (reg >= registers.spl && reg <= registers.dil) {
      type = OPT.REG;
      size = 8;
      prefs |= PREFIX_REX;
      reg -= registers.spl - 4;
    } else if (regToken[0] == "r") {
      reg = parseInt(regToken.slice(1));
      if (isNaN(reg) || reg < 0 || reg >= 16)
        throw new ASMError("Unknown register");
      type = OPT.REG;
      let regLastChar = regToken[regToken.length - 1];
      if (isNaN(regLastChar)) {
        size = regSuffixes[regLastChar];
        if (!size)
          throw new ASMError("Unknown register");
      } else
        size = 64;
    } else {
      let max = 32;
      if (token.startsWith("bnd"))
        reg = regToken.slice(3), type = OPT.BND, max = 4;
      else if (regToken[0] == "k")
        reg = regToken.slice(1), type = OPT.MASK, max = 8, size = NaN;
      else if (regToken.startsWith("dr"))
        reg = regToken.slice(2), type = OPT.DBG, max = 8;
      else if (regToken.startsWith("cr"))
        reg = regToken.slice(2), type = OPT.CTRL, max = 9;
      else {
        type = OPT.VEC;
        if (regToken.startsWith("mm"))
          reg = regToken.slice(2), size = 64, max = 8;
        else if (regToken.startsWith("xmm"))
          reg = regToken.slice(3), size = 128;
        else if (regToken.startsWith("ymm"))
          reg = regToken.slice(3), size = 256;
        else if (regToken.startsWith("zmm"))
          reg = regToken.slice(3), size = 512;
        else
          throw new ASMError("Unknown register");
      }
      if (isNaN(reg) || !(reg = parseInt(reg), reg >= 0 && reg < max))
        throw new ASMError("Unknown register");
    }
    if (expectedType != null && expectedType.indexOf(type) < 0)
      throw new ASMError("Invalid register");
    regParsePos = currRange;
    next();
    return { reg, type, size, prefs };
  }
  var Operand = class {
    constructor(instr2, expectRelative = false) {
      this.reg = this.reg2 = -1;
      this.shift = 0;
      this.value = null;
      this.type = null;
      this.size = NaN;
      this.prefs = 0;
      this.attemptedSizes = 0;
      this.attemptedUnsignedSizes = 0;
      this.startPos = currRange;
      let indirect = token == "*";
      if (indirect && !instr2.syntax.intel)
        next();
      let forceMemory = false;
      if (instr2.syntax.prefix && isRegister(token))
        throw new ASMError("Registers must be prefixed with '%'");
      if (instr2.syntax.prefix ? token == "%" : isRegister(token)) {
        const regData = parseRegister();
        this.endPos = regParsePos;
        if (regData.type == OPT.SEG && token == ":") {
          this.prefs |= regData.reg + 1 << 3;
          forceMemory = true;
          next();
        } else {
          Object.assign(this, regData);
          return;
        }
      }
      if (instr2.syntax.intel) {
        this.type = expectRelative ? OPT.REL : OPT.IMM;
        if (token != "[" && !forceMemory) {
          let mayBeMem = !expectRelative;
          if (token.toLowerCase() == "offset") {
            next();
            this.type = OPT.IMM;
            mayBeMem = false;
          }
          this.expression = new Expression(instr2);
          if (this.expression.hasSymbols && mayBeMem)
            this.type = OPT.MEM;
        }
        const hasBracket = token == "[";
        if (hasBracket || forceMemory) {
          this.type = OPT.MEM;
          if (hasBracket)
            next();
          let secExpr = new Expression(instr2, true);
          if (this.expression)
            this.expression.apply("+", secExpr);
          else
            this.expression = secExpr;
          this.ripRelative = this.expression.ripRelative;
          if (this.expression.vecSize) {
            this.size = this.expression.vecSize;
            this.type = OPT.VMEM;
          }
          if (hasBracket) {
            if (token != "]")
              throw new ASMError("Expected ']'");
            next();
          }
        }
      } else {
        if (token[0] == "$") {
          if (token.length > 1) {
            setToken(token.slice(1));
            currRange.start++;
          } else
            next();
          this.expression = new Expression(instr2);
          this.type = OPT.IMM;
        } else {
          this.type = OPT.MEM;
          this.expression = new Expression(instr2, true);
          if (this.expression.vecSize) {
            this.size = this.expression.vecSize;
            this.type = OPT.VMEM;
          }
          if (token != "(") {
            if (!indirect && expectRelative)
              this.type = OPT.REL;
          } else {
            let tempReg;
            if (instr2.syntax.prefix ? next() == "%" : isRegister(next())) {
              tempReg = parseRegister([OPT.REG, OPT.IP]);
              this.reg = tempReg.reg;
            } else if (token == ",") {
              this.reg = -1;
              tempReg = { type: -1, size: 64 };
            } else
              throw new ASMError("Expected register");
            if (tempReg.size == 32)
              this.prefs |= PREFIX_ADDRSIZE;
            else if (tempReg.size != 64)
              throw new ASMError("Invalid register size", regParsePos);
            if (tempReg.type == OPT.IP)
              this.ripRelative = true;
            else if (token == ",") {
              if (instr2.syntax.prefix ? next() != "%" : !isRegister(next()))
                throw new ASMError("Expected register");
              tempReg = parseRegister([OPT.REG, OPT.VEC]);
              this.reg2 = tempReg.reg;
              if (tempReg.type == OPT.VEC) {
                this.type = OPT.VMEM;
                this.size = tempReg.size;
                if (tempReg.size < 128)
                  throw new ASMError("Invalid register size", regParsePos);
              } else {
                if (this.reg2 == 4)
                  throw new ASMError("Memory index cannot be RSP", regParsePos);
                if (tempReg.size == 32)
                  this.prefs |= PREFIX_ADDRSIZE;
                else if (tempReg.size != 64)
                  throw new ASMError("Invalid register size", regParsePos);
              }
              if (token == ",") {
                this.shift = "1248".indexOf(next());
                if (this.shift < 0)
                  throw new ASMError("Scale must be 1, 2, 4, or 8");
                next();
              }
            } else if ((this.reg & 7) == 4)
              this.reg2 = 4;
            if (token != ")")
              throw new ASMError("Expected ')'");
            next();
          }
        }
      }
      if (this.expression) {
        if (this.type == OPT.REL)
          this.expression.apply("-", new CurrentIP(instr2));
        if (!this.expression.hasSymbols)
          this.evaluate(instr2);
      }
      this.endPos = prevRange;
    }
    sizeAllowed(size, unsigned = false) {
      return size >= (unsigned ? this.unsignedSize : this.size) || this.sizeAvailable(size, unsigned);
    }
    sizeAvailable(size, unsigned = false) {
      return !((unsigned ? this.attemptedUnsignedSizes : this.attemptedSizes) & 1 << (size >> 4));
    }
    recordSizeUse(size, unsigned = false) {
      if (unsigned)
        this.attemptedUnsignedSizes |= 1 << (size >> 4);
      else
        this.attemptedSizes |= 1 << (size >> 4);
    }
    clearAttemptedSizes() {
      this.attemptedSizes = this.attemptedUnsignedSizes = 0;
    }
    evaluate(instr2, intelMemory = false) {
      this.value = this.expression.evaluate(instr2);
      if (intelMemory) {
        this.prefs &= ~PREFIX_ADDRSIZE;
        let { regBase = null, regIndex = null, shift: shift2 = 1 } = this.value.regData ?? {};
        if (regBase)
          this.reg = regBase.reg;
        if (regIndex)
          this.reg2 = regIndex.reg;
        if (regBase && regBase.size == 32 || regIndex && regIndex.size == 32)
          this.prefs |= PREFIX_ADDRSIZE;
        this.shift = [1, 2, 4, 8].indexOf(shift2);
        if (this.shift < 0)
          throw new ASMError("Scale must be 1, 2, 4, or 8", this.value.range);
        if (this.ripRelative && regIndex)
          throw new ASMError(`Can't use another register with ${nameRegister("ip", regBase.size, instr2.syntax)}`, this.value.range);
      }
      if ((this.reg & 7) == 5)
        this.value.addend = this.value.addend || 0n;
      if (this.reg == 4 && this.reg2 < 0)
        this.reg2 = 4;
    }
  };

  // core/shuntingYard.js
  var unaryTemps = {
    "+": (a) => a,
    "-": (a) => -a,
    "~": (a) => ~a,
    "!": (a) => !a
  };
  var operatorTemps = [
    {
      "*": (a, b) => a * b,
      "/": (a, b) => a / (b || 1n),
      "%": (a, b) => a % (b || 1n),
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
      "==": (a, b) => a == b ? -1n : 0n,
      "<>": (a, b) => a != b ? -1n : 0n,
      "!=": (a, b) => a != b ? -1n : 0n,
      "<": (a, b) => a < b ? -1n : 0n,
      ">": (a, b) => a > b ? -1n : 0n,
      ">=": (a, b) => a >= b ? -1n : 0n,
      "<=": (a, b) => a <= b ? -1n : 0n
    },
    { "&&": (a, b) => a && b ? 1n : 0n },
    { "||": (a, b) => a || b ? 1n : 0n }
  ];
  var operators = {};
  var unaries = {};
  for (let i = 0; i < operatorTemps.length; i++)
    for (const op of Object.keys(operatorTemps[i]))
      operators[op] = { func: operatorTemps[i][op], prec: i };
  for (const op of Object.keys(unaryTemps))
    unaries[op] = { func: unaryTemps[op] };
  var stringEscapeSeqs = {
    "a": 7,
    "b": 8,
    "e": 27,
    "f": 12,
    "n": 10,
    "r": 13,
    "t": 9,
    "v": 11
  };
  var encoder = new TextEncoder();
  function readString(string2) {
    if (string2.length < 2 || string2[string2.length - 1] != string2[0])
      throw new ASMError("Incomplete string");
    const lineEnds = [];
    let output = [];
    let matches = string2.slice(1, -1).match(/(\\(?:x[0-9a-f]{1,2}|[0-7]{1,3}|u[0-9a-f]{1,8}|(.|\n)?))|\n|[^\\\n]+/ig);
    if (matches)
      for (let x of matches) {
        if (x[0] == "\\") {
          x = x.slice(1);
          if (x == "")
            throw new ASMError("Incomplete string");
          if (x.match(/x[0-9a-f]{1,2}/i))
            output.push(parseInt(x.slice(1), 16));
          else if (x.match(/u[0-9a-f]{1,8}/i))
            output.push(...encoder.encode(String.fromCodePoint(parseInt(x.slice(1), 16))));
          else if (x.match(/[0-7]{1,3}/))
            output.push(parseInt(x, 8) & 255);
          else if (stringEscapeSeqs.hasOwnProperty(x))
            output.push(stringEscapeSeqs[x]);
          else if (x != "\n")
            output.push(...encoder.encode(x));
        } else
          output.push(...encoder.encode(x));
        if (x == "\n")
          lineEnds.push(output.length);
      }
    return { bytes: new Uint8Array(output), lineEnds };
  }
  function scanIdentifier(id2, intel) {
    if (id2[0].match(/[a-z_.$]/i))
      return "symbol";
    if (id2[0].match(/[^0-9]/))
      return null;
    if (id2.match(/^([0-9]+|0x[0-9a-f]+|0o[0-7]+|0b[01]+)$/i) || intel && id2.match(/^([0-9][0-9a-f]*)h$/i))
      return "number";
    return null;
  }
  function parseIdentifier(instr2) {
    let value = 0n, startRange = currRange;
    try {
      if (token === "\n")
        throw new ASMError("Expected value, got none");
      if (token[0] === "'") {
        let { bytes, lineEnds } = readString(token), i = bytes.length;
        while (i--) {
          value <<= 8n;
          value += BigInt(bytes[i]);
        }
        next();
        return new Identifier(instr2, value, startRange, lineEnds);
      }
      if (instr2.syntax.prefix ? token == "%" : isRegister(token))
        return new RegisterIdentifier(instr2, parseRegister([OPT.REG, OPT.IP, OPT.VEC]), regParsePos);
      const idType = scanIdentifier(token, instr2.syntax.intel);
      if (idType == "symbol") {
        const name2 = token;
        next();
        return new SymbolIdentifier(instr2, name2, startRange);
      }
      if (idType === null)
        throw new ASMError("Invalid number");
      let mainToken = token;
      if (token[token.length - 1].toLowerCase() == "h")
        mainToken = "0x" + token.slice(0, -1);
      value = BigInt(mainToken);
      next();
      return new Identifier(instr2, value, startRange);
    } catch (e) {
      if (e.range === void 0)
        throw new ASMError(e);
      throw e;
    }
  }
  var IdentifierValue = class {
    constructor({ addend = null, symbol = null, section = pseudoSections.UND, range, regData = null, pcRelative = false, lineEnds = [] } = {}) {
      this.addend = addend;
      this.symbol = symbol;
      this.section = section;
      this.range = range;
      this.regData = regData;
      this.pcRelative = pcRelative;
      this.lineEnds = lineEnds;
    }
    isRelocatable() {
      return this.symbol && this.section != pseudoSections.ABS || this.pcRelative;
    }
    flatten() {
      let val = this, addend = this.addend;
      while (val.symbol && (val.section == pseudoSections.ABS || val.symbol.value.symbol && !val.symbol.bind) && val.symbol.value !== val) {
        val = val.symbol.value;
        addend += val.addend;
      }
      return new IdentifierValue({
        ...val,
        addend
      });
    }
    absoluteValue() {
      let val = this, total = this.addend;
      let passed = /* @__PURE__ */ new Set([val]);
      while (val.symbol && !passed.has(val.symbol.value)) {
        val = val.symbol.value;
        total += val.addend;
        passed.add(val);
      }
      return total;
    }
    apply(instr2, func, op, allowPCRelative = true) {
      this.range = this.range.until(op.range);
      if (this.section == pseudoSections.ABS && op.section == pseudoSections.ABS)
        ;
      else if (func == "+" && this.section == pseudoSections.ABS && !this.pcRelative) {
        this.section = op.section;
        this.symbol = op.symbol;
      } else if ((func == "+" || func == "-") && op.section == pseudoSections.ABS)
        ;
      else if (this.pcRelative || op.pcRelative)
        throw new ASMError("Bad operands", this.range);
      else if (func == "-" && this.section == op.section && (this.section != pseudoSections.UND && this.section != pseudoSections.COM || this.symbol == op.symbol)) {
        if (this.symbol)
          this.addend = this.absoluteValue();
        if (op.symbol)
          op.addend = op.absoluteValue();
        this.section = op.section = pseudoSections.ABS;
        this.symbol = op.symbol = null;
      } else if (func == "-" && allowPCRelative && op.section == instr2.section)
        this.pcRelative = true;
      else
        throw new ASMError("Bad operands", this.range);
      if (this.regData || op.regData) {
        if (func != "+" && func != "-" && func != "*" || func == "-" && op.regData)
          throw new ASMError("Bad operands", this.range);
        let regOp = this.regData ? this : op;
        let nonRegOp = this.regData ? op : this;
        if (!this.regData)
          this.regData = op.regData;
        else if (op.regData) {
          if (func == "*")
            throw new ASMError("Bad operands", this.range);
          if (this.regData.regIndex && op.regData.regIndex)
            throw new ASMError("Can't have multiple index registers", this.range);
          if ([this.regData, op.regData].some((data) => data.regBase && data.regIndex))
            throw new ASMError("Too many registers", this.range);
          if (this.regData.regBase && op.regData.regBase) {
            this.regData.regIndex = [this.regData.regBase, op.regData.regBase].find((reg) => reg.reg != 4);
            if (this.regData.regIndex === void 0)
              throw new ASMError(`Can't have both registers be ${instr2.syntax.prefix ? "%" : ""}rsp`, this.range);
            if (this.regData.regIndex == this.regData.regBase)
              this.regData.regBase = op.regData.regBase;
          } else if (op.regData.regIndex) {
            this.regData.regIndex = op.regData.regIndex;
            this.regData.shift = op.regData.shift;
          } else
            this.regData.regBase = op.regData.regBase;
        }
        if (func == "*") {
          if (nonRegOp.section != pseudoSections.ABS)
            throw new ASMError("Scale must be absolute", nonRegOp.range);
          if (regOp.regData.regIndex && regOp.regData.regBase)
            throw new ASMError("Can't scale both base and index registers", this.range);
          if (regOp.regData.regBase) {
            const scaled = regOp.regData.regBase;
            if (scaled.reg == 4)
              throw new ASMError(`Can't scale ${nameRegister("sp", scaled.size, instr2.syntax)}`, this.range);
            if (scaled.type == OPT.IP)
              throw new ASMError(`Can't scale ${nameRegister("ip", scaled.size, instr2.syntax)}`, this.range);
            this.regData.regIndex = scaled;
            this.regData.regBase = null;
          }
          this.regData.shift *= Number(nonRegOp.addend);
          this.addend = regOp.addend !== null ? nonRegOp.addend * regOp.addend : null;
        } else if (this.addend !== null || op.addend !== null)
          this.addend = operators[func].func(this.addend ?? 0n, op.addend ?? 0n);
      } else
        this.addend = operators[func].func(this.addend, op.addend);
      this.pcRelative = this.pcRelative || op.pcRelative;
      this.lineEnds = [...this.lineEnds, ...op.lineEnds].sort((a, b) => a - b);
    }
  };
  var Identifier = class {
    constructor(instr2, value, range, lineEnds = []) {
      this.value = value;
      this.range = range;
      this.lineEnds = lineEnds;
    }
    getValue(instr2) {
      return new IdentifierValue({
        addend: this.value,
        section: pseudoSections.ABS,
        range: this.range,
        lineEnds: this.lineEnds
      });
    }
  };
  var SymbolIdentifier = class extends Identifier {
    constructor(instr2, name2, range) {
      super(instr2, 0, range);
      this.name = name2;
      this.isIP = name2 == (instr2.syntax.intel ? "$" : ".");
      if (this.isIP)
        instr2.ipRelative = true;
    }
    getValue(instr2) {
      if (this.isIP)
        return new IdentifierValue({
          addend: BigInt(instr2.address),
          symbol: (instr2.section.head?.statement ?? instr2).symbol,
          section: instr2.section,
          range: this.range
        });
      const symbol = symbols.get(this.name);
      if (symbol.statement && !symbol.statement.error) {
        if (instr2.symbol && checkSymbolRecursion(symbol))
          throw new ASMError(`Recursive definition`, this.range);
        let isAbs = symbol.value.section == pseudoSections.ABS;
        return new IdentifierValue({
          addend: isAbs ? symbol.value.addend : 0n,
          symbol: isAbs ? null : symbol,
          section: symbol.value.section,
          range: this.range
        });
      }
      return new IdentifierValue({
        addend: 0n,
        symbol,
        range: this.range
      });
    }
  };
  var RegisterIdentifier = class extends Identifier {
    constructor(instr2, register, range) {
      super(instr2, 0, range);
      this.register = register;
    }
    getValue() {
      return new IdentifierValue({
        section: pseudoSections.ABS,
        range: this.range,
        regData: this.register.type == OPT.VEC ? {
          shift: 1,
          regBase: null,
          regIndex: this.register
        } : {
          shift: 1,
          regBase: this.register,
          regIndex: null
        }
      });
    }
  };
  var Expression = class {
    constructor(instr2, expectMemory = false, uses = null) {
      this.hasSymbols = false;
      this.vecSize = 0;
      this.ripRelative = false;
      this.stack = [];
      let opStack = [];
      let lastOp, lastWasNum = false;
      while (token != "," && token != "\n" && token != ";") {
        if (!lastWasNum && unaries.hasOwnProperty(token)) {
          opStack.push({ range: currRange, func: token, prec: -1, unary: true });
          next();
        } else if (operators.hasOwnProperty(token)) {
          if (!lastWasNum) {
            if (expectMemory && instr2.syntax.prefix && token == "%") {
              if (instr2.syntax.intel) {
                lastWasNum = true;
                this.stack.push(parseIdentifier(instr2));
                continue;
              }
              if (opStack.length > 0 && opStack[opStack.length - 1].bracket) {
                ungetToken();
                setToken("(");
                return;
              }
            }
            throw new ASMError("Missing left operand");
          }
          const op = { range: currRange, func: token, prec: operators[token].prec, unary: false };
          next();
          lastWasNum = false;
          while (lastOp = opStack[opStack.length - 1], lastOp && lastOp.prec <= op.prec && !lastOp.bracket)
            this.stack.push(opStack.pop());
          opStack.push(op);
        } else if (unaries.hasOwnProperty(token))
          throw new ASMError("Unary operator can't be used here");
        else if (token == "(") {
          if (lastWasNum) {
            if (expectMemory)
              break;
            throw new ASMError("Unexpected parenthesis");
          }
          opStack.push({ range: currRange, bracket: true });
          next();
        } else if (token == ")") {
          if (!lastWasNum)
            throw new ASMError("Missing right operand", opStack.length ? opStack[opStack.length - 1].range : currRange);
          while (lastOp = opStack[opStack.length - 1], lastOp && !lastOp.bracket)
            this.stack.push(opStack.pop());
          if (!lastOp || !lastOp.bracket)
            throw new ASMError("Mismatched parentheses");
          opStack.pop();
          lastWasNum = true;
          next();
        } else if (instr2.syntax.intel && (token == "[" || token == "]")) {
          if (!lastWasNum)
            throw new ASMError("Missing right operand", opStack.length ? opStack[opStack.length - 1].range : currRange);
          break;
        } else {
          if (lastWasNum)
            throw new ASMError("Unexpected value");
          lastWasNum = true;
          if (!instr2.syntax.prefix && isRegister(token)) {
            if (!expectMemory)
              throw new ASMError("Can't use registers in an expression");
            if (!instr2.syntax.intel && opStack.length > 0 && opStack[opStack.length - 1].bracket)
              break;
          }
          this.stack.push(parseIdentifier(instr2));
        }
      }
      if (this.stack.length == 0) {
        if (expectMemory) {
          ungetToken();
          setToken("(");
          return;
        } else
          throw new ASMError("Expected expression");
      }
      if (!lastWasNum)
        throw new ASMError("Missing right operand", opStack.length ? opStack[opStack.length - 1].range : currRange);
      while (opStack[0]) {
        if (opStack[opStack.length - 1].bracket)
          throw new ASMError("Mismatched parentheses", opStack[opStack.length - 1].range);
        this.stack.push(opStack.pop());
      }
      for (const id2 of this.stack) {
        if (id2.register && id2.register.type == OPT.VEC)
          this.vecSize = id2.register.size;
        else if (id2.register && id2.register.type == OPT.IP)
          this.ripRelative = true;
        else if (id2.name) {
          if (!id2.isIP) {
            const symbol = referenceSymbol(instr2, id2.name);
            if (uses !== null)
              uses.push(symbol);
          }
          this.hasSymbols = true;
        }
      }
    }
    evaluate(instr2, allowPCRelative = true, expectAbsolute = false) {
      if (this.stack.length == 0)
        return new IdentifierValue({ section: pseudoSections.ABS });
      let stack = [], len = 0;
      for (const op of this.stack) {
        const func = op.func;
        if (func) {
          if (op.unary) {
            if (func == "+")
              continue;
            const val = stack[len - 1], minusRelative = val.section == instr2.section && func == "-";
            if (val.regData || val.section != pseudoSections.ABS && !minusRelative || minusRelative && !allowPCRelative)
              throw new ASMError("Bad operand", val.range);
            if (minusRelative)
              val.pcRelative = true;
            val.addend = unaries[func].func(val.addend);
          } else {
            stack[len - 2].apply(instr2, func, stack.pop(), allowPCRelative);
            len--;
          }
        } else
          stack[len++] = op.getValue(instr2);
      }
      if (stack.length > 1)
        throw new ASMError("Invalid expression", stack[0].range);
      if (expectAbsolute) {
        if (stack[0].section != pseudoSections.ABS)
          throw new ASMError("Expected absolute expression", stack[0].range);
      }
      return stack[0];
    }
    apply(func, expr = null) {
      if (expr === null)
        this.stack.push({ func, unary: true });
      else if (expr.stack.length > 0) {
        this.stack.push(...expr.stack, { func, unary: false });
        this.hasSymbols = this.hasSymbols || expr.hasSymbols;
        this.vecSize = this.vecSize || expr.vecSize;
        this.ripRelative = this.ripRelative || expr.ripRelative;
      }
    }
  };
  function CurrentIP(instr2) {
    this.hasSymbols = true;
    this.pcRelative = false;
    this.stack = [new SymbolIdentifier(instr2, instr2.syntax.intel ? "$" : ".", currRange)];
  }
  CurrentIP.prototype = Object.create(Expression.prototype);
  function checkSymbolRecursion(symbol, passed = /* @__PURE__ */ new Set()) {
    if (passed.has(symbol))
      return true;
    passed.add(symbol);
    for (const use of symbol.uses)
      if (checkSymbolRecursion(use, passed))
        return true;
    passed.delete(symbol);
    return false;
  }

  // core/symbols.js
  var recompQueue = [];
  function makeSymbol({ name: name2, type = void 0, bind = void 0, uses = [], references = [], definitions = [] } = {}) {
    return {
      statement: null,
      name: name2,
      references,
      definitions,
      uses,
      value: new IdentifierValue({ addend: 0n }),
      type,
      bind
    };
  }
  var symbols = /* @__PURE__ */ new Map();
  var fileSymbols = [];
  function loadSymbols(table, fileArr) {
    symbols = table;
    fileSymbols = fileArr;
  }
  function queueRecomp(instr2) {
    if (!instr2.wantsRecomp)
      recompQueue.push(instr2.sectionNode);
    instr2.wantsRecomp = true;
  }
  var SymbolDefinition = class extends Statement {
    symbol;
    constructor({ name: name2, opcodeRange = null, isLabel = false, compile = true, type = 0, bind = 0, ...config2 }) {
      if (opcodeRange === null)
        opcodeRange = config2.range;
      super(config2);
      let uses = [];
      if (isLabel)
        this.expression = new CurrentIP(this);
      else {
        if (compile) {
          next();
          this.expression = new Expression(this, false, uses);
        }
      }
      this.removed = false;
      if (symbols.has(name2)) {
        this.symbol = symbols.get(name2);
        this.symbol.definitions.push(this);
        if (this.symbol.statement) {
          this.error = new ASMError(`This ${isLabel ? "label" : "symbol"} already exists`, opcodeRange);
          this.duplicate = true;
          return;
        }
        this.symbol.uses = uses;
        this.duplicate = false;
      } else
        symbols.set(name2, this.symbol = makeSymbol({ name: name2, type, bind, uses, definitions: [this] }));
      if (compile) {
        this.compile();
        for (const ref of this.symbol.references)
          if (!ref.removed)
            queueRecomp(ref);
      }
    }
    compile() {
      let originError = this.error;
      let originValue = this.symbol.value;
      let prevAbs = this.prevAbs;
      this.error = null;
      let value = void 0;
      try {
        value = this.symbol.value = this.expression.evaluate(this, false);
        this.symbol.statement = this;
        this.prevAbs = value.absoluteValue();
      } catch (e) {
        this.error = e;
      }
      return !(originError && this.error) && (!value || originValue.addend !== value.addend || originValue.section !== value.section || prevAbs !== this.prevAbs);
    }
    recompile() {
      if (this.duplicate && this.symbol.statement)
        return;
      this.duplicate = false;
      if (this.compile()) {
        this.symbol.statement = this;
        for (const ref of this.symbol.references)
          queueRecomp(ref);
      }
    }
    remove() {
      if (!this.duplicate) {
        let refs = this.symbol.references;
        if (refs.length > 0) {
          this.symbol.statement = null;
          this.symbol.uses = [];
          let newDef = this.symbol.definitions.find((def) => def.duplicate);
          if (newDef)
            newDef.recompile();
          else
            for (const instr2 of this.symbol.references)
              queueRecomp(instr2);
        } else
          symbols.delete(this.symbol.name);
      }
      super.remove();
    }
  };
  function getAlignment(x) {
    return x <= 1n ? 1n : x <= 2n ? 2n : x <= 4n ? 4n : x <= 8n ? 8n : 16n;
  }
  var CommSymbol = class extends SymbolDefinition {
    constructor({ name: name2, opcodeRange = null, ...config2 }) {
      super({ ...config2, compile: false, bind: SYM_BINDS.global, type: SYM_TYPES.object, name: token });
      next();
      if (token != ",")
        throw new ASMError("Expected ','");
      next();
      this.sizeExpr = new Expression(this);
      this.alignExpr = null;
      if (token == ",") {
        next();
        this.alignExpr = new Expression(this);
      }
      this.removed = true;
      this.compile();
      for (const ref of this.symbol.references)
        if (!ref.removed)
          queueRecomp(ref);
    }
    compile() {
      let prevErr = this.error;
      this.error = null;
      try {
        const sizeVal = this.sizeExpr.evaluate(this, false, true);
        if (sizeVal.addend < 0n)
          throw new ASMError("Size cannot be negative", sizeVal.range);
        this.symbol.size = sizeVal.addend;
        if (this.alignExpr)
          this.symbol.value = this.alignExpr.evaluate(this, false, true);
        else
          this.symbol.value = new IdentifierValue({ addend: getAlignment(this.symbol.size) });
        this.symbol.value.section = pseudoSections.COM;
        this.removed = false;
        return prevErr !== null;
      } catch (e) {
        this.error = e;
        return prevErr === null;
      }
    }
  };
  function referenceSymbol(instr2, name2, defining = false) {
    let symbol;
    if (symbols.has(name2)) {
      symbol = symbols.get(name2);
      symbol.references.push(instr2);
      if (defining)
        symbol.definitions.push(instr2);
    } else
      symbols.set(name2, symbol = makeSymbol({ name: name2, references: [instr2], definitions: defining ? [instr2] : [] }));
    return symbol;
  }

  // core/sections.js
  var sections = [];
  function loadSections(table, range) {
    sections = table;
    for (const section of table)
      section.cursor = section.head.getAffectedArea(range);
  }
  var pseudoSections = {
    ABS: { name: "*ABS*", index: 65521 },
    UND: { name: "*UND*", index: 0 },
    COM: { name: "*COM*", index: 65522 }
  };
  var sectionFlags = {
    a: 2,
    e: 134217728,
    o: 64,
    w: 1,
    x: 4,
    M: 16,
    S: 32,
    G: 512,
    T: 1024
  };
  var sectionTypes = {
    "progbits": 1,
    "nobits": 8,
    "note": 7,
    "init_array": 14,
    "fini_array": 15,
    "preinit_array": 16
  };
  var STT_SECTION = 3;
  var SHT_DYNSYM = 11;
  var SHT_DYNAMIC = 6;
  var Section = class {
    constructor(name2) {
      this.name = name2;
      this.cursor = null;
      this.persistent = name2 == ".text" || name2 == ".data" || name2 == ".bss";
      this.head = new StatementNode(new SymbolDefinition({ addr: 0, name: name2, isLabel: true, type: STT_SECTION, section: this }));
      this.entryPoints = [];
      this.cursor = { head: this.head, prev: this.head };
      switch (name2) {
        case ".text":
        case ".init":
        case ".fini":
          this.flags = sectionFlags.a | sectionFlags.x;
          break;
        case ".rodata":
        case ".dynsym":
        case ".dynamic":
          this.flags = sectionFlags.a;
          break;
        case ".data":
        case ".bss":
        case ".preinit_array":
        case ".init_array":
        case ".fini_array":
          this.flags = sectionFlags.a | sectionFlags.w;
          break;
        default:
          this.flags = 0;
      }
      switch (name2) {
        case ".notes":
          this.type = sectionTypes.note;
          break;
        case ".bss":
          this.type = sectionTypes.nobits;
          break;
        case ".preinit_array":
          this.type = sectionTypes.preinit_array;
          break;
        case ".init_array":
          this.type = sectionTypes.init_array;
          break;
        case ".fini_array":
          this.type = sectionTypes.fini_array;
          break;
        case ".dynsym":
          this.type = SHT_DYNSYM;
          break;
        case ".dynamic":
          this.type = SHT_DYNAMIC;
          break;
        default:
          this.type = sectionTypes.progbits;
      }
      switch (name2) {
        case ".fini_array":
        case ".init_array":
          this.entrySize = 8;
          break;
        case ".dynsym":
          this.entrySize = 24;
          break;
        case ".dynamic":
          this.entrySize = 16;
          break;
        default:
          this.entrySize = 0;
      }
    }
    getRelocations() {
      let node = this.head, relocations = [];
      while (node) {
        for (const reloc of node.statement.relocations)
          relocations.push(new RelocEntry({ ...reloc, offset: node.statement.address + reloc.offset }));
        node = node.next;
      }
      return relocations;
    }
  };

  // core/directives.js
  var SYM_BINDS = {
    "local": 0,
    "global": 1,
    "weak": 2
  };
  var SYM_TYPES = {
    "no_type": 0,
    "object": 1,
    "function": 2,
    "tls_object": 6
  };
  var SYM_VISIBS = {
    "internal": 1,
    "hidden": 2,
    "protected": 3,
    "exported": 4,
    "singleton": 5,
    "eliminate": 6
  };
  var DIRECTIVE_BUFFER_SIZE = 15;
  var directives = {
    equ: -1,
    set: -1,
    byte: 1,
    short: 2,
    word: 2,
    hword: 2,
    value: 2,
    "2byte": 2,
    int: 3,
    long: 3,
    "4byte": 4,
    quad: 4,
    "8byte": 4,
    octa: 5,
    float: 6,
    single: 6,
    double: 7,
    asciz: 8,
    ascii: 9,
    string: 9,
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
  var intelDirectives = {
    "%assign": -1,
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
  function isDirective(directive, intel) {
    directive = directive.toLowerCase();
    return intel ? intelDirectives.hasOwnProperty(directive) : directive[0] == "." && directives.hasOwnProperty(directive.slice(1));
  }
  function makeDirective(config2, dir) {
    dir = dir.toLowerCase();
    let dirs = currSyntax.intel ? intelDirectives : directives;
    if (!dirs.hasOwnProperty(dir))
      throw new ASMError("Unknown directive", config2.range);
    let dirID = dirs[dir];
    switch (dirID) {
      case intelDirectives.db:
      case directives.byte:
      case directives.word:
      case directives.int:
      case directives.quad:
      case directives.octa:
      case directives.asciz:
      case directives.ascii:
        return new DataDirective(config2, dirID);
      case directives.float:
        return new FloatDirective(config2, 0);
      case directives.double:
        return new FloatDirective(config2, 1);
      case directives.intel_syntax:
        return new SyntaxDirective(config2, true);
      case directives.att_syntax:
        return new SyntaxDirective(config2, false);
      case directives.section:
        return new SectionDirective(config2);
      case directives.text:
        return new SectionDirective(config2, sections[0]);
      case directives.data:
        return new SectionDirective(config2, sections[1]);
      case directives.bss:
        return new SectionDirective(config2, sections[2]);
      case directives.local:
        return new SymBindDirective(config2, SYM_BINDS.local);
      case directives.globl:
        return new SymBindDirective(config2, SYM_BINDS.global);
      case directives.weak:
        return new SymBindDirective(config2, SYM_BINDS.weak);
      case directives.size:
        return new SymSizeDirective(config2);
      case directives.type:
        return new SymTypeDirective(config2);
      case directives.hidden:
        return new SymHiddenDirective(config2);
      case directives.file:
        return new FileDirective(config2);
      case directives.equ:
        let name2 = token, opcodeRange = currRange;
        if (!currSyntax.intel && next() !== ",")
          throw new ASMError("Expected ','");
        return new SymbolDefinition({ ...config2, name: name2, opcodeRange });
      case directives.comm:
        return new CommSymbol(config2);
    }
  }
  var SectionDirective = class extends Statement {
    constructor(config2, section = null) {
      let flags = 0, type = sectionTypes.progbits, attribRange = null;
      if (section === null) {
        let sectionName = "";
        while (token != "," && token != ";" && token != "\n") {
          sectionName += token;
          next();
        }
        if (sectionName == "")
          throw new ASMError("Expected section name");
        section = sections.find((x) => x.name == sectionName) ?? null;
        if (token == ",") {
          attribRange = currRange;
          flags = 0;
          for (const byte of readString(next()).bytes) {
            const char = String.fromCharCode(byte);
            if (!sectionFlags.hasOwnProperty(char))
              throw new ASMError(`Unknown flag '${char}'`);
            flags |= sectionFlags[char];
          }
          if (next() == ",") {
            if (next() != "@")
              throw new ASMError("Expected '@'");
            const sectionType = next();
            if (!sectionTypes.hasOwnProperty(sectionType))
              throw new ASMError("Unknown section type");
            type = sectionTypes[sectionType];
            next();
          }
          attribRange = attribRange.until(currRange);
        }
        if (section === null)
          sections.push(section = new Section(sectionName));
        if (section.persistent && attribRange)
          throw new ASMError(`Can't give attributes to ${section.name}`, attribRange);
      }
      super({ ...config2, maxSize: 0, section });
      section.entryPoints.push(this);
      this.switchSection = true;
      this.sectionAttributes = attribRange ? { flags, type } : null;
      this.attribRange = attribRange;
      if (this.sectionAttributes)
        try {
          this.recompile();
        } catch (e) {
          this.error = e;
        }
    }
    recompile() {
      this.error = null;
      if (this.section.entryPoints.some((x) => x !== this && !x.removed && !x.error && x.sectionAttributes !== null))
        throw new ASMError("Attributes already set for this section", this.attribRange);
      this.section.flags = this.sectionAttributes.flags;
      this.section.type = this.sectionAttributes.type;
    }
    remove() {
      this.section.entryPoints.splice(this.section.entryPoints.indexOf(this), 1);
      if (this.section.entryPoints.length == 0) {
        if (!this.section.persistent) {
          this.section.head.statement.remove();
          sections.splice(sections.indexOf(this.section), 1);
        }
      } else if (this.sectionAttributes !== null) {
        const otherDefinition = this.section.entryPoints.find((entry) => entry.sectionAttributes !== null);
        if (otherDefinition)
          queueRecomp(otherDefinition);
        else
          this.section.flags = 0;
      }
    }
  };
  var SyntaxDirective = class extends Statement {
    constructor(config2, intel) {
      const prevSyntax = currSyntax;
      setSyntax({ prefix: currSyntax.prefix, intel });
      const prefSpecifier = token.toLowerCase();
      let prefix = !intel;
      if (prefSpecifier == "prefix")
        prefix = true;
      else if (prefSpecifier == "noprefix")
        prefix = false;
      else if (prefSpecifier != "\n" && prefSpecifier != ";") {
        setSyntax(prevSyntax);
        throw new ASMError("Expected 'prefix' or 'noprefix'");
      }
      if (token != "\n" && token != ";")
        next();
      super({ ...config2, maxSize: 0, syntax: { intel, prefix } });
      this.switchSyntax = true;
    }
  };
  var DataDirective = class extends Statement {
    constructor(config2, dirID) {
      super({ ...config2, maxSize: DIRECTIVE_BUFFER_SIZE });
      this.outline = null;
      this.floatPrec = 0;
      let appendNullByte = 0;
      try {
        switch (dirID) {
          case intelDirectives.db:
            this.compileValues(1, true);
            break;
          case directives.byte:
            this.compileValues(1);
            break;
          case directives.word:
            this.compileValues(2);
            break;
          case directives.int:
            this.compileValues(4);
            break;
          case directives.quad:
            this.compileValues(8);
            break;
          case directives.octa:
            this.compileValues(16);
            break;
          case directives.asciz:
            appendNullByte = 1;
          case directives.ascii:
            this.bytes = new Uint8Array();
            do {
              if (token[0] == '"') {
                const string2 = readString(token);
                this.append(string2, string2.bytes.length + appendNullByte);
              } else
                throw new ASMError("Expected string");
            } while (next() == "," && next());
            break;
        }
      } catch (e) {
        this.error = e;
        while (token != ";" && token != "\n")
          next();
      }
    }
    append({ bytes, lineEnds }, length = bytes.length) {
      const temp = new Uint8Array(this.length + length + 1);
      temp.set(this.bytes.subarray(0, this.length));
      temp.set(bytes, this.length);
      this.bytes = temp;
      for (const lineEnd of lineEnds)
        this.lineEnds.push(this.length + lineEnd);
      this.length += length;
    }
    compileValues(valSize, acceptStrings = false) {
      this.valSize = valSize;
      let expression, needsRecompilation = false;
      this.outline = [];
      try {
        do {
          if (token[0] === '"') {
            if (acceptStrings) {
              const string2 = readString(token);
              this.outline.push(string2);
            } else
              throw new ASMError("Unexpected string");
            next();
          } else {
            expression = new Expression(this);
            if (expression.hasSymbols)
              needsRecompilation = true;
            this.outline.push({ expression });
          }
        } while (token === "," && next());
        this.removed = false;
        this.compile();
      } finally {
        if (!needsRecompilation)
          this.outline = null;
      }
    }
    compile() {
      let op, outlineLength = this.outline.length;
      const startAddr = this.address;
      for (let i = 0; i < outlineLength; i++) {
        op = this.outline[i];
        try {
          if (op.bytes)
            this.append(op);
          else {
            if (op.value === void 0 || op.expression.hasSymbols)
              op.value = op.expression.evaluate(this, true);
            this.genValue(op.value, this.valSize * 8);
          }
          this.address = startAddr + this.length;
        } catch (e) {
          this.error = e;
          outlineLength = i;
          i = -1;
          this.length = 0;
        }
      }
      this.address = startAddr;
    }
    recompile() {
      this.clear();
      this.error = null;
      this.compile();
    }
    genByte(byte) {
      super.genByte(byte);
      if (this.length == this.bytes.length) {
        let temp = new Uint8Array(this.bytes.length + DIRECTIVE_BUFFER_SIZE);
        temp.set(this.bytes);
        this.bytes = temp;
      }
    }
  };
  var FloatDirective = class extends Statement {
    constructor(config2, precision) {
      super({ ...config2 });
      let values = [];
      do {
        if (isNaN(token))
          throw new ASMError("Expected number");
        if (token == "\n") {
          this.error = new ASMError("Expected number");
          break;
        }
        values.push(token);
      } while (next() == "," && next());
      this.bytes = new Uint8Array((precision > 0 ? new Float64Array(values) : new Float32Array(values)).buffer);
      this.length = this.bytes.length;
    }
  };
  var SymInfo = class extends Statement {
    addSymbol() {
      let name2 = token, range = currRange;
      if (scanIdentifier(name2, this.syntax.intel) != "symbol")
        return false;
      next();
      if (token != "," && token != ";" && token != "\n") {
        ungetToken();
        setToken(name2);
        return false;
      }
      const symbol = referenceSymbol(this, name2, true);
      if (symbol.type == STT_SECTION)
        throw new ASMError("Can't modify section labels");
      this.symbols.push({ range, symbol });
      return true;
    }
    constructor(config2, name2, proceedings = true) {
      super({ ...config2, maxSize: 0 });
      this.symbols = [];
      if (!this.addSymbol())
        throw new ASMError("Expected symbol name");
      this.infoName = name2;
      this.setting = [name2];
      while (true) {
        if (token != ",") {
          if (proceedings)
            throw new ASMError("Expected ','");
          break;
        }
        next();
        if (!this.addSymbol())
          break;
      }
    }
    compile() {
      this.removed = false;
      for (const { symbol, range } of this.symbols) {
        for (const info of this.setting)
          if (symbol.definitions.some((x) => x !== this && !x.removed && !x.error && x.setting?.includes(info)))
            throw new ASMError(`${this.infoName} already set for this symbol`, range);
        this.setInfo(symbol);
      }
    }
    recompile() {
      this.error = null;
      this.compile();
    }
    remove() {
      super.remove();
      for (const info of this.setting)
        for (const { symbol } of this.symbols)
          for (const def of symbol.definitions)
            if (!def.removed && def.setting?.includes(info))
              queueRecomp(def);
    }
  };
  var SymBindDirective = class extends SymInfo {
    constructor(config2, bind) {
      super(config2, "Binding", false);
      this.binding = bind;
      try {
        this.compile();
      } catch (e) {
        this.error = e;
      }
    }
    setInfo(symbol) {
      symbol.bind = this.binding;
    }
    remove() {
      super.remove();
      for (const { symbol } of this.symbols)
        symbol.bind = void 0;
    }
  };
  var SymSizeDirective = class extends SymInfo {
    constructor(config2) {
      super(config2, "Size");
      this.expression = new Expression(this);
      try {
        this.compile();
      } catch (e) {
        this.error = e;
      }
    }
    compile() {
      this.value = this.expression.evaluate(this, false, true);
      super.compile();
    }
    setInfo(symbol) {
      symbol.size = this.value.addend;
    }
    remove() {
      super.remove();
      for (const { symbol } of this.symbols)
        symbol.size = void 0;
    }
  };
  var SymTypeDirective = class extends SymInfo {
    constructor(config2) {
      super(config2, "Type");
      this.visib = void 0;
      if (token != "@")
        throw new ASMError("Expected '@'");
      let type = next().toLowerCase();
      if (!SYM_TYPES.hasOwnProperty(type))
        throw new ASMError("Unknown symbol type");
      this.type = SYM_TYPES[type];
      if (next() == ",") {
        this.setting.push("Visibility");
        if (next() != "@")
          throw new ASMError("Expected '@'");
        let visib = next().toLowerCase();
        if (!SYM_VISIBS.hasOwnProperty(visib))
          throw new ASMError("Unknown symbol visibility");
        this.visib = SYM_VISIBS[visib];
        next();
      }
      try {
        this.compile();
      } catch (e) {
        this.error = e;
      }
    }
    setInfo(symbol) {
      symbol.type = this.type;
      symbol.visibility = this.visib;
    }
    remove() {
      super.remove();
      for (const { symbol } of this.symbols) {
        symbol.type = void 0;
        symbol.visibility = void 0;
      }
    }
  };
  var SymHiddenDirective = class extends SymInfo {
    constructor(config2) {
      super(config2, "Visibility", false);
      try {
        this.compile();
      } catch (e) {
        this.error = e;
      }
    }
    setInfo(symbol) {
      symbol.visibility = SYM_VISIBS.hidden;
    }
    remove() {
      super.remove();
      for (const { symbol } of this.symbols)
        symbol.visibility = void 0;
    }
  };
  var decoder = new TextDecoder();
  var FileDirective = class extends Statement {
    constructor(config2) {
      super({ ...config2, maxSize: 0 });
      try {
        this.filename = decoder.decode(readString(token).bytes);
      } catch (e) {
        throw new ASMError("Bad string");
      }
      next();
      fileSymbols.push(this.filename);
    }
    remove() {
      fileSymbols.splice(fileSymbols.indexOf(this.filename), 1);
    }
  };

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
  var sizers = Object.assign({ f: 48 }, suffixes);
  var opCatcherCache = {};
  var SIZETYPE_IMPLICITENC = 1;
  var EVEXPERM_MASK = 1;
  var EVEXPERM_ZEROING = 2;
  var EVEXPERM_BROADCAST_32 = 4;
  var EVEXPERM_BROADCAST_64 = 8;
  var EVEXPERM_BROADCAST = 12;
  var EVEXPERM_SAE = 16;
  var EVEXPERM_ROUNDING = 32;
  var EVEXPERM_FORCEW = 64;
  var EVEXPERM_FORCE = 128;
  var EVEXPERM_FORCE_MASK = 256;
  function parseEvexPermits(string2) {
    let permits = 0;
    for (let c of string2) {
      switch (c) {
        case "k":
          permits |= EVEXPERM_MASK;
          break;
        case "K":
          permits |= EVEXPERM_FORCE_MASK | EVEXPERM_MASK;
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
  function getSizes(format) {
    let sizes = { list: [] };
    for (let i = 0; i < format.length; i++) {
      let defaultSize = false, defaultVexSize = false, size = 0, sizeChar = format[i];
      if (sizeChar == "$")
        size |= SIZETYPE_IMPLICITENC, sizeChar = format[++i];
      if (sizeChar == "#")
        defaultSize = true, sizeChar = format[++i];
      if (sizeChar == "~")
        defaultVexSize = true, sizeChar = format[++i];
      if (sizeChar < "a")
        defaultSize = true, size |= sizers[sizeChar.toLowerCase()] | SIZETYPE_IMPLICITENC;
      else
        size |= sizers[sizeChar];
      sizes.list.push(size);
      if (defaultSize)
        sizes.def = size;
      if (defaultVexSize)
        sizes.defVex = size;
    }
    return sizes;
  }
  function OpCatcher(format) {
    opCatcherCache[format] = this;
    let i = 1;
    this.sizes = [];
    this.forceRM = format[0] == "^";
    this.vexOpImm = format[0] == "<";
    this.vexOp = this.vexOpImm || format[0] == ">";
    this.moffset = format[0] == "%";
    if (this.forceRM || this.vexOp || this.moffset)
      format = format.slice(1);
    this.carrySizeInference = format[0] != "*";
    if (!this.carrySizeInference)
      format = format.slice(1);
    let opType = format[0];
    this.acceptsMemory = "rvbkm".includes(opType);
    this.unsigned = opType == "i";
    this.type = OPC[opType.toLowerCase()];
    this.forceRM = this.forceRM || this.acceptsMemory || this.type == OPT.VMEM;
    this.carrySizeInference = this.carrySizeInference && this.type != OPT.IMM && this.type != OPT.MEM;
    this.implicitValue = null;
    if (format[1] == "_") {
      this.implicitValue = parseInt(format[2]);
      i = 3;
    }
    this.defSize = this.defVexSize = -1;
    if (format[i] == "!") {
      this.sizes = 0;
      this.hasByteSize = false;
    } else if (format[i] == "/") {
      this.sizes = -2;
      this.hasByteSize = false;
    } else {
      let sizeData = getSizes(format.slice(i));
      this.sizes = sizeData.list;
      if (sizeData.def)
        this.defSize = this.defVexSize = sizeData.def;
      if (sizeData.defVex)
        this.defVexSize = sizeData.defVex;
      this.hasByteSize = this.sizes.some((x) => (x & 8) === 8);
    }
    if (this.sizes.length == 0) {
      if (this.type > OPT.MEM)
        this.sizes = 0;
      else
        this.sizes = -1;
    }
  }
  OpCatcher.prototype.catch = function(operand, prevSize, isVex) {
    let opSize = this.moffset ? operand.dispSize : this.unsigned ? operand.unsignedSize : operand.size;
    let rawSize, size = 0, found = false;
    let defSize = isVex ? this.defVexSize : this.defSize;
    if (isNaN(opSize)) {
      if (defSize > 0)
        return defSize;
      else if (this.moffset) {
        if (inferImmSize(operand.value) == 64)
          opSize = 64;
        else
          return null;
      } else if (this.sizes == -2) {
        opSize = (prevSize & ~7) >> 1;
        if (opSize < 128)
          opSize = 128;
      } else
        opSize = prevSize & ~7;
    } else if (this.type == OPT.IMM && defSize > 0 && defSize < opSize)
      return defSize;
    if (this.sizes == -1) {
      rawSize = prevSize & ~7;
      if (opSize == rawSize || operand.type == OPT.IMM && opSize < rawSize)
        return prevSize;
      return null;
    }
    if (this.sizes == -2) {
      rawSize = (prevSize & ~7) >> 1;
      if (rawSize < 128)
        rawSize = 128;
      if (opSize == rawSize)
        return prevSize;
      return null;
    }
    if (this.sizes !== 0) {
      for (size of this.sizes) {
        rawSize = size & ~7;
        if (opSize == rawSize || (this.type == OPT.IMM || this.type == OPT.REL) && opSize < rawSize) {
          found = true;
          break;
        }
      }
      if (!found)
        return null;
    }
    return size;
  };
  function Operation(format) {
    this.vexBase = 0;
    this.evexPermits = null;
    this.actuallyNotVex = false;
    this.vexOnly = false;
    this.requireMask = false;
    this.forceVex = format[0][0] == "V";
    this.vexOnly = format[0][0] == "v";
    if ("vVwl!".includes(format[0][0])) {
      let specializers = format.shift();
      if (specializers.includes("w"))
        this.vexBase |= 32768;
      if (specializers.includes("l"))
        this.vexBase |= 1024;
      if (specializers.includes("!"))
        this.actuallyNotVex = true;
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
    if (opcode.includes(")"))
      [this.prefix, this.code] = opcode.split(")").map((x) => parseInt(x, 16));
    else {
      this.code = parseInt(opcode, 16);
      this.prefix = null;
    }
    if (extension === void 0) {
      this.extension = REG_MOD;
      this.modExtension = null;
    } else {
      if (extension[0] == "o")
        this.extension = REG_OP;
      else
        this.extension = parseInt(extension[0]);
      this.modExtension = extension[1] ? parseInt(extension[1]) : null;
    }
    this.allVectors = false;
    this.relativeSizes = null;
    this.allowVex = this.forceVex || format.some((op) => op.includes(">"));
    this.maxSize = 0;
    this.vexOpCatchers = this.allowVex ? [] : null;
    this.opCatchers = [];
    if (format.length == 0)
      return;
    let opCatcher;
    for (let operand of format) {
      if (operand == ">")
        continue;
      if (operand[0] == "{") {
        this.evexPermits = parseEvexPermits(operand.slice(1));
        if (this.evexPermits & EVEXPERM_FORCE)
          this.vexOnly = true;
        if (this.evexPermits & EVEXPERM_FORCE_MASK)
          this.requireMask = true;
        continue;
      }
      opCatcher = opCatcherCache[operand] || new OpCatcher(operand);
      if (opCatcher.type == OPT.REL)
        this.relativeSizes = opCatcher.sizes;
      if (!opCatcher.vexOp || this.forceVex)
        this.opCatchers.push(opCatcher);
      if (this.vexOpCatchers !== null)
        this.vexOpCatchers.push(opCatcher);
      if (Array.isArray(opCatcher.sizes)) {
        let had64 = false;
        for (let size of opCatcher.sizes) {
          if (size > this.maxSize)
            this.maxSize = size & ~7;
          if ((size & ~7) == 64)
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
  Operation.prototype.validateVEX = function(vexInfo) {
    if (vexInfo.needed) {
      if (this.actuallyNotVex || !this.allowVex)
        return false;
      if (vexInfo.evex) {
        if (this.evexPermits === null || !(this.evexPermits & EVEXPERM_MASK) && vexInfo.mask > 0 || !(this.evexPermits & EVEXPERM_BROADCAST) && vexInfo.broadcast !== null || !(this.evexPermits & EVEXPERM_ROUNDING) && vexInfo.round > 0 || !(this.evexPermits & EVEXPERM_SAE) && vexInfo.round === 0 || !(this.evexPermits & EVEXPERM_ZEROING) && vexInfo.zeroing)
          return false;
      } else if (this.evexPermits & EVEXPERM_FORCE)
        vexInfo.evex = true;
    } else if (this.vexOnly || this.evexPermits & EVEXPERM_FORCE)
      return false;
    if (this.evexPermits & EVEXPERM_FORCE_MASK && vexInfo.mask == 0)
      return false;
    return true;
  };
  Operation.prototype.fit = function(operands, instr2, vexInfo) {
    if (!this.validateVEX(vexInfo))
      return null;
    let adjustByteOp = false, overallSize = 0, rexw = false;
    if (this.relativeSizes) {
      if (!(operands.length == 1 && operands[0].type == OPT.REL))
        return null;
      operands[0].size = this.getRelSize(operands[0], instr2);
    }
    let opCatchers = vexInfo.needed ? this.vexOpCatchers : this.opCatchers;
    if (operands.length != opCatchers.length)
      return null;
    let correctedSizes = new Array(operands.length), size = -1, prevSize = -1, i, catcher;
    for (i = 0; i < operands.length; i++) {
      catcher = opCatchers[i];
      if (size > 0 || Array.isArray(catcher.sizes)) {
        size = catcher.catch(operands[i], size, vexInfo.needed);
        if (size === null)
          return null;
      }
      correctedSizes[i] = size;
      if (size >= 512 && !vexInfo.evex) {
        vexInfo.evex = true;
        if (!this.validateVEX(vexInfo))
          return null;
      }
      if (!catcher.carrySizeInference)
        size = prevSize;
      prevSize = size;
    }
    for (i = 0; i < operands.length; i++) {
      if (correctedSizes[i] < 0) {
        size = opCatchers[i].catch(operands[i], size, vexInfo.needed);
        if (size === null)
          return null;
        correctedSizes[i] = size;
      }
    }
    let reg = null, rm = null, vex = this.vexBase, imms = [], correctedOpcode = this.code, evexImm = null, relImm = null, moffs = null;
    let extendOp = false, unsigned = false;
    let operand;
    for (i = 0; i < operands.length; i++) {
      catcher = opCatchers[i], operand = operands[i];
      size = correctedSizes[i];
      if (catcher.moffset)
        operand.dispSize = size & ~7;
      else {
        operand.size = size & ~7;
        operand.recordSizeUse(operand.size, catcher.unsigned);
      }
      if (catcher.unsigned)
        unsigned = true;
      if (operand.size == 64 && !(size & SIZETYPE_IMPLICITENC) && !this.allVectors)
        rexw = true;
      if (catcher.implicitValue === null) {
        if (operand.type == OPT.IMM)
          imms.push(operand);
        else if (catcher.type == OPT.REL) {
          relImm = operand;
          instr2.ipRelative = true;
        } else if (catcher.moffset)
          moffs = operand;
        else if (catcher.forceRM)
          rm = operand;
        else if (catcher.vexOp) {
          if (catcher.vexOpImm)
            evexImm = BigInt(operand.reg << 4);
          else
            vex = vex & ~30720 | (~operand.reg & 15) << 11;
          if (operand.reg >= 16)
            vex |= 524288;
        } else
          reg = operand;
        if (operand.type == OPT.VEC && operand.size == 64 && vexInfo.needed)
          throw new ASMError("Can't encode MMX with VEX prefix", operand.endPos);
      }
      if (!catcher.moffset && overallSize < (size & ~7) && !(size & SIZETYPE_IMPLICITENC))
        overallSize = size & ~7;
      if (size >= 16)
        adjustByteOp = adjustByteOp || catcher.hasByteSize;
    }
    if (this.extension == REG_OP) {
      correctedOpcode += reg.reg & 7;
      extendOp = reg.reg > 7;
      reg = null;
    } else if (this.extension != REG_MOD) {
      if (rm === null) {
        if (this.modExtension === null)
          rm = reg;
        else
          rm = { type: OPT.MEM, reg: this.modExtension, value: null };
      }
      reg = { reg: this.extension };
    }
    vexInfo.needed = vexInfo.needed || this.forceVex;
    if (vexInfo.needed) {
      if (this.allVectors)
        vex |= 256;
      if (vexInfo.evex) {
        vex |= 1024;
        if (vexInfo.zeroing)
          vex |= 8388608;
        if (vexInfo.round !== null) {
          if (overallSize !== this.maxSize)
            throw new ASMError("Invalid vector size for embedded rounding", vexInfo.roundingPos);
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
              throw new ASMError("Invalid broadcast", vexInfo.broadcastPos);
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
      } else if (overallSize == 256)
        vex |= 1024;
    } else {
      if (overallSize > 128) {
        for (let reg2 of operands)
          if (reg2.size > 128 && reg2.endPos)
            throw new ASMError("YMM/ZMM registers can't be encoded without VEX", reg2.endPos);
      }
      for (let reg2 of operands)
        if (reg2.type == OPT.VEC && reg2.reg >= 16 && reg2.endPos)
          throw new ASMError("Registers with ID >= 16 can't be encoded without EVEX", reg2.endPos);
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
      rm,
      vex: vexInfo.needed ? vex : null,
      evexImm,
      relImm,
      imms,
      unsigned,
      moffs
    };
  };
  var sizeLen = (x) => x == 32 ? 4n : x == 16 ? 2n : 1n;
  var absolute = (x) => x < 0n ? ~x : x;
  Operation.prototype.getRelSize = function(operand, instr2) {
    if (operand.value.isRelocatable())
      return Math.max(...this.relativeSizes);
    const target = operand.value.addend - BigInt((this.code > 255 ? 2 : 1) + (this.prefix !== null ? 1 : 0));
    if (this.relativeSizes.length == 1) {
      const size = this.relativeSizes[0];
      if (absolute(target - sizeLen(size)) >= 1n << BigInt(size - 1))
        throw new ASMError(`Can't fit offset in ${size >> 3} byte${size != 8 ? "s" : ""}`, operand.startPos.until(operand.endPos));
      return size;
    }
    let [small, large] = this.relativeSizes;
    let smallLen = sizeLen(small), largeLen = sizeLen(large) + (this.opDiff > 256 ? 1n : 0n);
    if (absolute(target - smallLen) >= 1n << BigInt(small - 1) || !operand.sizeAllowed(small, false)) {
      if (small != operand.size && operand.sizeAllowed(small, false)) {
        queueRecomp(instr2);
        return small;
      }
      if (absolute(target - largeLen) >= 1n << BigInt(large - 1))
        throw new ASMError(`Can't fit offset in ${large >> 3} bytes`, operand.startPos.until(operand.endPos));
      return large;
    }
    return small;
  };
  Operation.prototype.matchTypes = function(operands, vexInfo) {
    if (vexInfo.mask == 0 && this.requireMask)
      return false;
    let opCatchers = vexInfo.needed ? this.vexOpCatchers : this.opCatchers;
    if (operands.length != opCatchers.length)
      return false;
    for (let i = 0; i < operands.length; i++) {
      const catcher = opCatchers[i], operand = operands[i];
      if (operand.type != catcher.type && !(operand.type == OPT.MEM && catcher.acceptsMemory) || catcher.implicitValue !== null && catcher.implicitValue !== (operand.type == OPT.IMM ? Number(operand.value.addend) : operand.reg) || catcher.moffset && (operand.reg >= 0 || operand.reg2 >= 0))
        return false;
    }
    return true;
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
bndcl:F3)0F1A rQ B
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
0FBA.4 iB rwlq

btc
0FBB Rwlq r
0FBA.7 iB rwlq

btr
0FB3 Rwlq r
0FBA.6 iB rwlq

bts
0FAB Rwlq r
0FBA.5 iB rwlq

bzhi:V 0F38F5 >Rlq r R

call
E8 jl
FF.2 rQ
FF.3 mf

cbtw/cbw:66)98
cltd/cdq:99
cltq/cdqe:48)98
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
66)0FC2 ib v >Vxyz K {kBsfw

cmpps
0FC2 ib v >V Vxy
0FC2 ib v >Vxyz K {kbsf

cmps{bwlq:A6

cmpsd
F2)0FC2 ib v >V Vx
F2)0FC2 ib v >Vx K {ksfw

cmpss
F3)0FC2 ib v >V Vx
F3)0FC2 ib v >Vx K {ksf

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
cvtpd2dq:F2)0FE6 v#xy~z V/ > {kzBrw
cvtpd2pi:66)0F2D vX VQ
cvtpd2ps:66)0F5A v#xy~z V/ > {kzBrw
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
cvttpd2dq:66)0FE6 v#xy~z V/ > {kzBsw
cvttpd2pi:66)0F2C vX VQ
cvttps2dq:F3)0F5B v Vxyz > {kzbs
cvttps2pi:0F2C vX VQ
cvttsd2si:F2)0F2C v#x Rlq > {s
cvttss2si:F3)0F2C v#x Rlq > {s

cqto/cqo:48)99
cwtd/cwd:66)99
cwtl/cwde:98
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
enter:C8 iW ib
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
DF.0 mW
DB.0 ml
DF.5 m$q

fincstp:D9F7
finit:9BDBE3

fist
DF.2 mW
DB.2 ml

fistp
DF.3 mW
DB.3 ml
DF.7 m$q

fisttp
DF.1 mW
DB.1 ml
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

gf2p8affineinvqb:w 66)0F3ACF ib v >V Vxyz {kzBw
gf2p8affineqb:w 66)0F3ACE ib v >V Vxyz {kzBw
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
6B Ib r Rwlq
69 iw rw Rw
69 il r Rlq

in
E4 ib R_0bwl
EC R_2W R_0bwl

inc:FE.0 rbwlq
incsspd:F3)0FAE.5 Rl
incsspq:F3)0FAE.5 Rq
ins{bwl:6C
insertps:66)0F3A21 ib v >V Vx {

int
CC i_3b
CD ib

int1:F1
int3:CC
invd:0F08
invlpg:0F01.7 m
invpcid:66)0F3882 m RQ
iret{wLq:CF
jecxz:67)E3 jb

jmp
EB-2 jbl
FF.4 rQ
FF.5 mf

jrcxz:E3 jb

kaddb:Vl 66)0F4A ^K >K K
kaddw:Vl 0F4A ^K >K K
kaddd:Vlw 66)0F4A ^K >K K
kaddq:Vlw 0F4A ^K >K K

kandb:Vl 66)0F41 ^K >K K
kandw:Vl 0F41 ^K >K K
kandd:Vlw 66)0F41 ^K >K K
kandq:Vlw 0F41 ^K >K K

kandnb:Vl 66)0F42 ^K >K K
kandnw:Vl 0F42 ^K >K K
kandnd:Vlw 66)0F42 ^K >K K
kandnq:Vlw 0F42 ^K >K K

kmovb
V 66)0F90 k K >
V 66)0F91 K m >
V 66)0F92 ^Rl K >
V 66)0F93 ^K Rl >

kmovw
V 0F90 k K >
V 0F91 K m >
V 0F92 ^Rl K >
V 0F93 ^K Rl >

kmovd
Vw 66)0F90 k K >
Vw 66)0F91 K m >
V F2)0F92 ^Rl K >
V F2)0F93 ^K Rl >

kmovq
Vw 0F90 k K >
Vw 0F91 K m >
V F2)0F92 ^Rq K >
V F2)0F93 ^K Rq >

knotb:V 66)0F44 ^K K >
knotw:V 0F44 ^K K >
knotd:Vw 66)0F44 ^K K >
knotq:Vw 0F44 ^K K >

korb:Vl 66)0F45 ^K >K K
korw:Vl 0F45 ^K >K K
kord:Vlw 66)0F45 ^K >K K
korq:Vlw 0F45 ^K >K K

kortestb:V 66)0F98 ^K K >
kortestw:V 0F98 ^K K >
kortestd:Vw 66)0F98 ^K K >
kortestq:Vw 0F98 ^K K >

kshiftlb:V 66)0F3A32 iB ^K K >
kshiftlw:Vw 66)0F3A32 iB ^K K >
kshiftld:V 66)0F3A33 iB ^K K >
kshiftlq:Vw 66)0F3A33 iB ^K K >

kshiftrb:V 66)0F3A30 iB ^K K >
kshiftrw:Vw 66)0F3A30 iB ^K K >
kshiftrd:V 66)0F3A31 iB ^K K >
kshiftrq:Vw 66)0F3A31 iB ^K K >


ktestb:V 66)0F99 ^K K >
ktestw:V 0F99 ^K K >
ktestd:Vw 66)0F99 ^K K >
ktestq:Vw 0F99 ^K K >

kunpckbw:Vl 66)0F4B ^K >K K
kunpckdq:Vlw 0F4B ^K >K K
kunpckwd:Vl 0F4B ^K >K K

kxnorb:Vl 66)0F46 ^K >K K
kxnorw:Vl 0F46 ^K >K K
kxnord:Vlw 66)0F46 ^K >K K
kxnorq:Vlw 0F46 ^K >K K

kxorb:Vl 66)0F47 ^K >K K
kxorw:Vl 0F47 ^K >K K
kxord:Vlw 66)0F47 ^K >K K
kxorq:Vlw 0F47 ^K >K K

lahf:9F
lar:0F02 rW Rwlq
lcall/:FF.3 m
lddqu:F2)0FF0 m Vxy >
ldmxcsr:0FAE.2 m >
lea:8D m Rwlq
leave:C9
lfence:0FAEE8
lgdt:0F01.2 m
lidt:0F01.3 m
ljmp/:FF.5 m
lfs:0FB4 m Rwl
lgs:0FB5 m Rwl
lldt:0F00.2 rW
lmsw:0F01.6 rW
lods{bwlq:AC
loop:E2 jb
loope:E1 jb
loopne:E0 jb

lret
CB
CA i$w

lsl:0F03 rW Rwlq
lss:0FB2 m Rwl
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
A0 %mlq R_0bwlq
A2 R_0bwlq %mlq
88 Rbwlq r
8A r Rbwlq
C7.0 Il Rq
C7.0 iL mq
B0+8.o i Rbwlq
C6.0 i rbwl
8C s ^RwlQ
8C s mW
8E ^RWlQ s
8E mW s
0F20 C ^RQ
0F21 D ^RQ
0F22 ^RQ C
0F23 ^RQ D

movabs/
A0 %mlQ R_0bwlq
A2 R_0bwlq %mlQ

movapd
66)0F28 v Vxyz > {kzw
66)0F29 Vxyz v > {kzw

movaps
0F28 v Vxyz > {kz
0F29 Vxyz v > {kz

movbe
0F38F0 m Rwlq
0F38F1 Rwlq m

movd
0F6E rL VQ
0F7E VQ rL
66)0F6E rL Vx > {
66)0F7E Vx rL > {

movddup:F2)0F12 v Vxyz > {kzw
movdiri:0F38F9 Rlq m
movdir64b:66)0F38F8 m RQ

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

movq
0F6E ^R Vq
0F7E Vq ^R
66)0F6E ^R#q VX > {
66)0F7E VX ^R#q > {
0F6F vQ V
0F7F VQ v
F3)0F7E v Vx > {w
66)0FD6 Vx v > {w

movq2dq:F3)0FD6 ^VQ Vx
movs{bwlq:A4

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

movsbw/:0FBE rB Rw
movsbl/:0FBE rB Rl
movsbq/:0FBE rB Rq
movswl/:0FBF rW Rl
movswq/:0FBF rW Rq
movslq/:63 rL Rq
movsxd/:63 rL Rq
/movsxd:63 rL Rwlq
movsx:0FBE rb$w Rwlq

movupd
66)0F10 v Vxyz > {kzw
66)0F11 Vxyz v > {kzw

movups
0F10 v Vxyz > {kz
0F11 Vxyz v > {kz

movzbw/:0FB6 rB Rw
movzbl/:0FB6 rB Rl
movzwl/:0FB7 rW Rl
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

outs{bwl:6E

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
66)0F74 v >Vxyz K {kf

pcmpeqd
0F76 v >V Vqxy
66)0F76 v >Vxyz K {kbf

pcmpeqw
0F75 v >V Vqxy
66)0F75 v >Vxyz K {kf

pcmpeqq
66)0F3829 v >V Vxy
66)0F3829 v >Vxyz K {kBwf

pcmpestri:66)0F3A61 ib v Vx >

pcmpestrm:66)0F3A60 ib v Vx >

pcmpgtb
0F64 v >V Vqxy
66)0F64 v >Vxyz K {kf

pcmpgtd
0F66 v >V Vqxy
66)0F66 v >Vxyz K {kbf

pcmpgtq
66)0F3837 v >V Vxy
66)0F3837 v >Vxyz K {kBwf

pcmpgtw
0F65 v >V Vqxy
66)0F65 v >Vxyz K {kf

pcmpistri:66)0F3A63 ib v Vx >
pcmpistrm:66)0F3A62 ib v Vx >

pdep:V F2)0F38F5 r >Rlq R
pext:V F3)0F38F5 r >Rlq R

pextrb:66)0F3A14 ib Vx r! > {
pextrd:66)0F3A16 ib Vx rL > {

pextrw
0FC5 ib ^Vqx R! > {
66)0F3A15 ib Vx m > {

pextrq:66)0F3A16 ib Vx r#q > {

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

pmaxsb:66)0F383C v >V Vxyz {kz
pmaxsd:66)0F383D v >V Vxyz {kzb
pmaxsq:66)0F383D v >V Vxyz {kzBwf
pmaxsw:0FEE v >V Vqxyz {kz

pmaxub:0FDE v >V Vqxyz {kz
pmaxud:66)0F383F v >V Vxyz {kzb
pmaxuq:66)0F383F v >V Vxyz {kzBwf
pmaxuw:66)0F383E v >V Vxyz {kz

pminsb:66)0F3838 v >V Vxyz {kz
pminsw:0FEA v >V Vqxyz {kz
pminsq:66)0F3839 v >V Vxyz {kzBwf
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

popf:9D
popfq:#popf
popfw:66)9D

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
6A-2 Ibl
FF.6 mwQ
0FA0 s_4
0FA8 s_5

pushf{wQ}:9C
pushw:66)6A-2 Ib$w

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
rdsspd:F3)0F1E.1 Rl
rdsspq:F3)0F1E.1 Rq
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
saveprevssp:F3)0F01EA
scas{bwlq:AE
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

sldt
0F00.0 Rwl$q
0F00.0 mW

smsw
0F01.4 Rwlq
0F01.4 mWL

sqrtpd:66)0F51 v Vxyz > {kzBrw
sqrtps:0F51 v Vxyz > {kzbr
sqrtsd:F2)0F51 v >V Vx {kzrw
sqrtss:F3)0F51 v >V Vx {kzr

stac:0F01CB
stc:F9
std:FD
sti:FB
stmxcsr:0FAE.3 m >
stos{bwlq:AA

str
0F00.1 RwL$q
0F00.1 mW

subpd:66)0F5C v >V Vxyz {kzrBw
subps:0F5C v >V Vxyz {kzrb
subsd:F2)0F5C v >V Vx {kzrw
subss:F3)0F5C v >V Vx {kzr

swapgs:0F01F8
syscall:0F05
sysenter:0F34
sysexit{Lq:0F35
sysret{Lq:0F07

test
A8 i R_0bwl
A9 iL R_0q
F6.0 i rbwl
F7.0 iL rq
84 Rbwlq r

tpause:66)0FAE.6 Rl
tzcnt:F3)0FBC r Rwlq

ucomisd:66)0F2E v Vx > {sw
ucomiss:0F2E v Vx > {s

ud0:0FFF rL R
ud1:0FB9 rL R
ud2:0F0B

umonitor
67F3)0FAE.6 Rl
F3)0FAE.6 RQ

umwait:F2)0FAE.6 Rl

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
vcvtneps2bf16:F3)0F3872 v#xy~z V/ > {kzbf

vcvtpd2qq:66)0F7B v Vxyz > {kzBwrf
vcvtpd2udq:0F79 v#xy~z V/ > {kzBwrf
vcvtpd2uqq:66)0F79 v Vxyz > {kzBwrf
vcvtph2ps:66)0F3813 v/ Vxyz > {kzs
vcvtps2ph:66)0F3A1D ib Vxyz v/ > {kzs
vcvtps2udq:0F79 v Vxyz > {kzbrf
vcvtps2qq:66)0F7B v/ Vxyz > {kzBrf
vcvtps2uqq:66)0F79 v/ Vxyz > {kzBrf
vcvtqq2pd:F3)0FE6 v Vxyz > {kzBrfw
vcvtqq2ps:0F5B v#xy~z V/ > {kzBrfw
vcvtsd2usi:F2)0F79 v#x Rlq > {rf
vcvtss2usi:F3)0F79 v#x Rlq > {rf
vcvttpd2qq:66)0F7A v Vxyz > {kzBwsf
vcvttpd2udq:0F78 v#xy~z V/ > {kzBwsf
vcvttpd2uqq:66)0F78 v Vxyz > {kzBwsf
vcvttps2udq:0F78 v Vxyz > {kzbsf
vcvttps2qq:66)0F7A v/ Vxyz > {kzBsf
vcvttps2uqq:66)0F78 v/ Vxyz > {kzBsf
vcvttsd2usi:F2)0F78 v#x Rlq > {sf
vcvttss2usi:F3)0F78 v#x Rlq > {sf
vcvtudq2pd:F3)0F7A v/ Vxyz > {kzBf
vcvtudq2ps:F2)0F7A v Vxyz > {kzbrf
vcvtuqq2pd:F3)0F7A v Vxyz > {kzBrfw
vcvtuqq2ps:F2)0F7A v#xy~z V/ > {kzBfrw
vcvtusi2sd:F2)0F7B rlq >Vx V {rf
vcvtusi2ss:F3)0F7B rlq >Vx V {rf

vdbpsadbw:66)0F3A42 ib v >Vxyz V {kzf
vdpbf16ps:F3)0F3852 v >Vxyz V {kzf

vexpandpd:66)0F3888 v Vxyz > {kzwf
vexpandps:66)0F3888 v Vxyz > {kzf

verr:! 0F00.4 rW
verw:! 0F00.5 rW

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

vfpclasspd:66)0F3A66 iB vxyz K > {kBfw
vfpclassps:66)0F3A66 iB vxyz K > {kbf
vfpclasssd:66)0F3A67 ib v#x K > {kfw
vfpclassss:66)0F3A67 ib v#x K > {kf

vgatherdpd
vw 66)0F3892 >Vxy *Gx V
66)0F3892 G/ Vxyz > {Kfw

vgatherdps
66)0F3892 >Vxy G V
66)0F3892 Gxyz V > {Kf

vgatherqpd
vw 66)0F3893 >Vxy G V
66)0F3893 Gxyz V > {Kfw

vgatherqps
66)0F3893 >Vx Gxy Vx
66)0F3893 Gxyz V/ > {Kf

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

vp2intersectd:F2)0F3868 v >Vxyz K {bf
vp2intersectq:F2)0F3868 v >Vxyz K {Bfw

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

vpbroadcastmb2q:F3)0F382A ^K Vxyz > {wf
vpbroadcastmw2d:F3)0F383A ^K Vxyz > {f

vpcmpb:66)0F3A3F ib v >Vxyz K {kf
vpcmpd:66)0F3A1F ib v >Vxyz K {kbf
vpcmpq:66)0F3A1F ib v >Vxyz K {kBfw
vpcmpw:66)0F3A3F ib v >Vxyz K {kfw

vpcmpub:66)0F3A3E ib v >Vxyz K {kf
vpcmpud:66)0F3A1E ib v >Vxyz K {kbf
vpcmpuq:66)0F3A1E ib v >Vxyz K {kBfw
vpcmpuw:66)0F3A3E ib v >Vxyz K {kfw

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
66)0F3890 Gxyz V > {Kf

vpgatherdq
vw 66)0F3890 >Vxy *Gx V
66)0F3890 G/ Vxyz > {Kfw

vpgatherqd
66)0F3891 >Vx *Gxy V
66)0F3891 Gxyz V/ > {Kf

vpgatherqq
vw 66)0F3891 >Vxy G V
66)0F3891 Gxyz V > {Kfw

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

vpmovb2m:F3)0F3829 ^Vxyz K > {f
vpmovd2m:F3)0F3839 ^Vxyz K > {f
vpmovq2m:F3)0F3839 ^Vxyz K > {fw
vpmovw2m:F3)0F3829 ^Vxyz K > {fw

vpmovdb:F3)0F3831 Vxyz vX > {kzf
vpmovdw:F3)0F3833 Vxyz v/ > {kzf
vpmovqb:F3)0F3832 Vxyz vX > {kzf
vpmovqd:F3)0F3835 Vxyz v/ > {kzf
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

vpmovm2b:F3)0F3828 ^K Vxyz > {f
vpmovm2d:F3)0F3838 ^K Vxyz > {f
vpmovm2q:F3)0F3838 ^K Vxyz > {fw
vpmovm2w:F3)0F3828 ^K Vxyz > {fw

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

vpscatterdd:66)0F38A0 Vxyz G > {Kf
vpscatterdq:66)0F38A0 Vxyz G/ > {Kfw
vpscatterqd:66)0F38A1 V/ Gxyz > {Kf
vpscatterqq:66)0F38A1 Vxyz G > {Kfw

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

vpshufbitqmb:66)0F388F v >Vxyz K {kf

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

vptestmb:66)0F3826 v >Vxyz K {kf
vptestmd:66)0F3827 v >Vxyz K {kbf
vptestmq:66)0F3827 v >Vxyz K {kBfw
vptestmw:66)0F3826 v >Vxyz K {kfw

vptestnmb:F3)0F3826 v >Vxyz K {kf
vptestnmd:F3)0F3827 v >Vxyz K {kbf
vptestnmq:F3)0F3827 v >Vxyz K {kBfw
vptestnmw:F3)0F3826 v >Vxyz K {kfw

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

vscatterdpd:66)0F38A2 Vxyz G/ > {Kfw
vscatterdps:66)0F38A2 Vxyz G > {Kf
vscatterqpd:66)0F38A3 Vxyz G > {Kfw
vscatterqps:66)0F38A3 V/ Gxyz > {Kf

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
wrssd:0F38F6 Rl m
wrssq:0F38F6 Rq m
wrussd:66)0F38F5 Rl m
wrussq:66)0F38F5 Rq m
xabort:C6F8 ib
xadd:0FC0 Rbwlq r
xbegin:C7F8 jl

xchg
90 R_0Q R_0
87C0 R_0l R_0
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
  var relativeMnemonics = [];
  var mnemonics = {};
  var intelDifferences = {};
  var intelInvalids = [];
  var attInvalids = [];
  mnemonicStrings.match(/.*:.*(?=\n)|.[^]*?(?=\n\n)/g).forEach((x) => {
    lines = x.split(/[\n:]/);
    let name2 = lines.shift();
    if (name2.includes("{")) {
      let suffixes2;
      [name2, suffixes2] = name2.split("{");
      let higherOpcode = (parseInt(lines[0], 16) + (suffixes2.includes("b") ? 1 : 0)).toString(16);
      for (let suffix of suffixes2) {
        let fullName = name2 + suffix.toLowerCase();
        if (suffix <= "Z") {
          mnemonics[name2] = lines;
          mnemonics[fullName] = ["#" + name2];
        } else {
          switch (suffix.toLowerCase()) {
            case "b":
              mnemonics[fullName] = lines;
              break;
            case "w":
              mnemonics[fullName] = ["66)" + higherOpcode];
              break;
            case "l":
              mnemonics[fullName] = [higherOpcode];
              intelDifferences[name2 + "d"] = [higherOpcode];
              intelInvalids.push(fullName);
              break;
            case "q":
              mnemonics[fullName] = ["48)" + higherOpcode];
              break;
          }
        }
      }
    } else {
      if (name2.includes("/")) {
        let intelName;
        [name2, intelName] = name2.split("/");
        if (name2) {
          if (intelName)
            intelDifferences[intelName] = lines;
          intelInvalids.push(name2);
        } else {
          name2 = intelName;
          if (intelInvalids.includes(name2)) {
            intelInvalids.splice(intelInvalids.indexOf(name2), 1);
            intelDifferences[name2] = lines;
            return;
          }
          attInvalids.push(name2);
        }
      }
      mnemonics[name2] = lines;
      if (lines[0].includes("j"))
        relativeMnemonics.push(name2);
    }
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
        "D0." + i + " rbwlq",
        "D0." + i + " i_1B rbwlq",
        "D2." + i + " R_1b rbwlq",
        "C0." + i + " iB rbwlq"
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
    relativeMnemonics.push("j" + firstName);
    mnemonics["cmov" + firstName] = [hex(3904 + i) + " r Rwlq"];
    mnemonics["set" + firstName] = [hex(3984 + i) + ".0 rB"];
    names.forEach((name2) => {
      mnemonics["j" + name2] = ["#j" + firstName];
      relativeMnemonics.push("j" + name2);
      mnemonics["cmov" + name2] = ["#cmov" + firstName];
      mnemonics["set" + name2] = ["#set" + firstName];
    });
  });
  var fpuArithMnemonics = "add mul com comp sub subr div divr";
  fpuArithMnemonics.split(" ").forEach((name2, i) => {
    let list = ["D8." + i + " ml", "DC." + i + " m$q"];
    mnemonics["fi" + name2] = ["DA." + i + " ml", "DE." + i + " m$w"];
    if (i == 2 || i == 3)
      list.push("D8." + i + " F", hex(55489 + i * 8));
    else {
      list.push("D8." + i + " F F_0");
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
  function isMnemonic(mnemonic, intel) {
    if (mnemonics.hasOwnProperty(mnemonic))
      return !(intel ? intelInvalids : attInvalids).includes(mnemonic);
    return intel && intelDifferences.hasOwnProperty(mnemonic);
  }
  function Mnemonic(raw, operations, size, isVex) {
    this.raw = raw;
    this.operations = operations;
    this.relative = relativeMnemonics.includes(raw);
    this.size = size;
    this.vex = isVex && !operations[0].actuallyNotVex || operations[0].forceVex;
  }
  function addMnemonic(list, raw, intel, size, isVex) {
    if (!isMnemonic(raw, intel))
      return;
    const operations = getOperations(raw, intel).filter((x) => isVex ? (x.allowVex || x.actuallyNotVex) && !x.forceVex : !x.vexOnly);
    if (operations.length == 0)
      return;
    list.push(new Mnemonic(raw, operations, size, isVex));
  }
  function fetchMnemonic(mnemonic, intel, expectSuffix = !intel) {
    mnemonic = mnemonic.toLowerCase();
    if (mnemonic.startsWith("vv"))
      return [];
    let isVex = mnemonic[0] == "v";
    let possibleOpcodes = isVex ? [mnemonic, mnemonic.slice(1)] : [mnemonic];
    let interps = [];
    for (const raw of possibleOpcodes) {
      addMnemonic(interps, raw, intel, void 0, isVex);
      if (expectSuffix)
        addMnemonic(
          interps,
          raw.slice(0, -1),
          intel,
          (raw[0] == "f" ? raw[1] == "i" ? floatIntSuffixes : floatSuffixes : suffixes)[raw[raw.length - 1]] ?? null,
          isVex
        );
    }
    return interps;
  }
  function getOperations(opcode, intel) {
    if (intel) {
      if (intelDifferences.hasOwnProperty(opcode)) {
        if (mnemonics.hasOwnProperty(opcode))
          return [...extractMnemonic(intelDifferences, opcode), ...getOperations(opcode, false)];
        return extractMnemonic(intelDifferences, opcode);
      } else if (intelInvalids.includes(opcode))
        return [];
    } else if (attInvalids.includes(opcode))
      return [];
    if (!mnemonics.hasOwnProperty(opcode))
      return [];
    return extractMnemonic(mnemonics, opcode);
  }
  function extractMnemonic(database, opcode) {
    let operations = database[opcode];
    if (typeof operations[0] == "string") {
      if (operations[0][0] == "#")
        return database[opcode] = extractMnemonic(database, operations[0].slice(1));
      return database[opcode] = operations.map((line2) => new Operation(line2.split(" ")));
    }
    return operations;
  }

  // core/instructions.js
  var MAX_INSTR_SIZE = 15;
  var prefixes = Object.freeze({
    lock: PREFIX_LOCK,
    repne: PREFIX_REPNE,
    repnz: PREFIX_REPNE,
    rep: PREFIX_REPE,
    repe: PREFIX_REPE,
    repz: PREFIX_REPE,
    data16: PREFIX_DATASIZE,
    addr32: PREFIX_ADDRSIZE
  });
  var SHORT_DISP = 1024;
  function parseRoundingMode(vexInfo) {
    let roundingName = "", roundStart = currRange;
    vexInfo.evex = true;
    while (next() != "}") {
      if (token == "\n")
        throw new ASMError("Expected '}'");
      roundingName += token;
    }
    vexInfo.round = ["sae", "rn-sae", "rd-sae", "ru-sae", "rz-sae"].indexOf(roundingName);
    vexInfo.roundingPos = new Range3(roundStart.start, currRange.end - roundStart.start);
    if (vexInfo.round < 0)
      throw new ASMError("Invalid rounding mode", vexInfo.roundingPos);
  }
  function explainNoMatch(mnemonics2, operands, vexInfo) {
    let minOperandCount = Infinity, maxOperandCount = 0;
    let firstOrderPossible = false, secondOrderPossible = false;
    let requiresMask = false;
    for (const mnemonic of mnemonics2)
      for (const operation of mnemonic.operations) {
        let opCount = (mnemonic.vex ? operation.vexOpCatchers : operation.opCatchers).length;
        if (opCount > maxOperandCount)
          maxOperandCount = opCount;
        if (opCount < minOperandCount)
          minOperandCount = opCount;
        if (opCount == operands.length && operation.requireMask)
          requiresMask = true;
        vexInfo.needed = mnemonic.vex;
        firstOrderPossible = firstOrderPossible || operation.matchTypes(operands, vexInfo);
        operands.reverse();
        secondOrderPossible = secondOrderPossible || operation.matchTypes(operands, vexInfo);
        operands.reverse();
      }
    if (operands.length < minOperandCount)
      return "Not enough operands";
    if (operands.length > maxOperandCount)
      return "Too many operands";
    if (!firstOrderPossible && secondOrderPossible)
      return "Wrong operand order";
    if (vexInfo.mask == 0 && requiresMask)
      return "Must use a mask for this instruction";
    return "Wrong operand type" + (operands.length == 1 ? "" : "s");
  }
  var Instruction = class extends Statement {
    constructor({ name: name2, ...config2 }) {
      super({ ...config2, maxSize: MAX_INSTR_SIZE });
      this.opcode = name2.toLowerCase();
      this.opcodeRange = new RelativeRange(config2.range, config2.range.start, config2.range.length);
      this.interpret();
    }
    interpret() {
      let opcode = this.opcode, operand = null;
      let vexInfo = {
        needed: false,
        evex: false,
        mask: 0,
        zeroing: false,
        round: null,
        broadcast: null
      };
      let memoryOperand = null;
      this.needsRecompilation = false;
      let operands = [];
      this.prefsToGen = 0;
      while (prefixes.hasOwnProperty(opcode.toLowerCase())) {
        this.prefsToGen |= prefixes[opcode];
        this.opcodeRange = new RelativeRange(this.range, currRange.start, currRange.length);
        opcode = token;
        if (opcode === ";" || opcode === "\n")
          throw new ASMError("Expected opcode", this.opcodeRange);
        next();
      }
      this.opcode = opcode.toLowerCase();
      let mnemonics2 = fetchMnemonic(opcode, this.syntax.intel);
      if (mnemonics2.length == 0)
        throw new ASMError("Unknown opcode", this.opcodeRange);
      mnemonics2 = mnemonics2.filter((mnemonic) => mnemonic.size !== null);
      if (mnemonics2.length == 0)
        throw new ASMError(
          "Invalid opcode suffix",
          new RelativeRange(this.range, this.opcodeRange.end - 1, 1)
        );
      const expectRelative = mnemonics2.some((mnemonic) => mnemonic.relative);
      if (!this.syntax.intel && token == "{") {
        parseRoundingMode(vexInfo);
        if (next() != ",")
          throw new ASMError("Expected ','");
        next();
      }
      while (token != ";" && token != "\n") {
        let sizePtrRange = currRange, enforcedSize = null;
        if (this.syntax.intel) {
          if (token == "{") {
            parseRoundingMode(vexInfo);
            next();
            break;
          }
          let sizePtr = token;
          if (sizeHints.hasOwnProperty(sizePtr.toLowerCase())) {
            let following = next();
            if (following.toLowerCase() == "ptr") {
              sizePtrRange = sizePtrRange.until(currRange);
              enforcedSize = sizeHints[sizePtr.toLowerCase()];
              if (",;\n{:".includes(next())) {
                ungetToken();
                setToken(following);
              }
            } else {
              if (",;\n{:".includes(following)) {
                ungetToken();
                setToken(sizePtr);
              } else
                enforcedSize = sizeHints[sizePtr.toLowerCase()];
            }
          }
        }
        operand = new Operand(this, expectRelative);
        if (operand.expression && operand.expression.hasSymbols)
          this.needsRecompilation = true;
        operands.push(operand);
        if (operand.reg >= 16 || operand.reg2 >= 16 || operand.size == 512)
          vexInfo.evex = true;
        if (operand.type == OPT.MEM || operand.type == OPT.VMEM || operand.type == OPT.REL) {
          memoryOperand = operand;
          if (enforcedSize)
            operand.size = enforcedSize;
        } else if (enforcedSize)
          throw new ASMError("Size hints work only for memory operands", sizePtrRange);
        while (token == "{") {
          vexInfo.evex = true;
          if (this.syntax.prefix ? next() == "%" : next()[0] == "k") {
            vexInfo.mask = parseRegister([OPT.MASK]).reg;
            if ((vexInfo.mask & 7) == 0)
              throw new ASMError(`Can't use ${this.syntax.prefix ? "%" : ""}k0 as writemask`, regParsePos);
          } else if (token == "z")
            vexInfo.zeroing = true, next();
          else if (operand.type == OPT.MEM) {
            vexInfo.broadcast = ["1to2", "1to4", "1to8", "1to16"].indexOf(token);
            if (vexInfo.broadcast < 0)
              throw new ASMError("Invalid broadcast mode");
            vexInfo.broadcastPos = currRange;
            next();
          } else
            throw new ASMError("Invalid decorator");
          if (token != "}")
            throw new ASMError("Expected '}'");
          next();
        }
        if (token != ",")
          break;
        next();
      }
      this.operandStartPos = operands.length > 0 ? operands[0].startPos : this.opcodeRange;
      if (this.syntax.intel && !(operands.length == 2 && operands[0].type == OPT.IMM && operands[1].type == OPT.IMM))
        operands.reverse();
      if (memoryOperand && vexInfo.round !== null)
        throw new ASMError("Embedded rounding can only be used on reg-reg", vexInfo.roundingPos);
      if (memoryOperand && this.prefsToGen & PREFIX_ADDRSIZE)
        memoryOperand.dispSize = 32;
      let matchingMnemonics = [];
      for (const mnemonic of mnemonics2) {
        vexInfo.needed = mnemonic.vex;
        const matchingOps = mnemonic.operations.filter((operation) => operation.matchTypes(operands, vexInfo));
        if (matchingOps.length > 0)
          matchingMnemonics.push({ ...mnemonic, operations: matchingOps });
      }
      if (matchingMnemonics.length == 0)
        throw new ASMError(explainNoMatch(mnemonics2, operands, vexInfo), this.operandStartPos.until(currRange));
      this.outline = { operands, memoryOperand, mnemonics: matchingMnemonics, vexInfo };
      this.endPos = currRange;
      this.removed = false;
      try {
        this.compile();
      } catch (e) {
        this.error = e;
        this.clear();
      }
      if (!this.needsRecompilation && !this.ipRelative)
        this.outline = void 0;
    }
    compile() {
      let { operands, memoryOperand, mnemonics: mnemonics2, vexInfo } = this.outline;
      let prefsToGen = this.prefsToGen;
      this.clear();
      if (memoryOperand)
        memoryOperand.evaluate(this, this.syntax.intel);
      for (let i = 0; i < operands.length; i++) {
        const op2 = operands[i];
        prefsToGen |= op2.prefs;
        if (op2.type == OPT.IMM) {
          if (op2.expression.hasSymbols)
            op2.evaluate(this);
          if (op2.value.isRelocatable()) {
            const firstMnem = mnemonics2[0];
            if (firstMnem.operations.length == 1) {
              let operation = firstMnem.operations[0];
              op2.size = Math.max(
                ...(firstMnem.vex ? operation.vexOpCatchers : operation.opCatchers)[i].sizes
              ) & ~7;
            } else {
              op2.size = 8;
              relocationSizeLoop:
                for (const mnemonic of mnemonics2)
                  for (const operation of mnemonic.operations) {
                    const sizes = (mnemonic.vex ? operation.vexOpCatchers : operation.opCatchers)[i].sizes;
                    if (sizes.length != 1 || (sizes[0] & ~7) != 8) {
                      op2.size = operands.length > 2 ? operands[2].size : operands[1].size;
                      if (op2.size > 32)
                        op2.size = 32;
                      break relocationSizeLoop;
                    }
                  }
            }
            op2.unsignedSize = op2.size;
          } else if (!op2.expression.hasSymbols) {
            op2.size = inferImmSize(op2.value);
            op2.unsignedSize = inferUnsignedImmSize(op2.value);
          } else {
            let max = inferImmSize(op2.value);
            for (let size = 8; size <= max; size *= 2) {
              if ((size != op2.size || op2.size == max) && op2.sizeAllowed(size)) {
                op2.size = size;
                op2.recordSizeUse(size);
                if (size < max)
                  queueRecomp(this);
                break;
              }
            }
            max = inferUnsignedImmSize(op2.value);
            for (let size = 8; size <= max; size *= 2) {
              if ((size != op2.unsignedSize || op2.unsignedSize == max) && op2.sizeAllowed(size, true)) {
                op2.unsignedSize = size;
                op2.recordSizeUse(size, true);
                if (size < max)
                  queueRecomp(this);
                break;
              }
            }
          }
        }
      }
      let op, found = false, rexVal = 64, memOpSize = memoryOperand?.size;
      mnemonicLoop:
        for (const mnemonic of mnemonics2) {
          if (memoryOperand)
            memoryOperand.size = mnemonic.size || memOpSize;
          vexInfo.needed = mnemonic.vex;
          for (const operation of mnemonic.operations) {
            op = operation.fit(operands, this, vexInfo);
            if (op !== null) {
              found = true;
              break mnemonicLoop;
            }
          }
        }
      if (!found) {
        if (memoryOperand && isNaN(memoryOperand.size))
          throw new ASMError("Ambiguous memory size", memoryOperand.startPos.until(memoryOperand.endPos));
        throw new ASMError(
          "Wrong operand size" + (operands.length == 1 ? "" : "s"),
          this.operandStartPos.until(this.endPos)
        );
      }
      if (op.rexw)
        rexVal |= 8, prefsToGen |= PREFIX_REX;
      let modRM = null, sib = null;
      if (op.extendOp)
        rexVal |= 1, prefsToGen |= PREFIX_REX;
      else if (op.rm !== null) {
        let extraRex;
        [extraRex, modRM, sib] = this.makeModRM(op.rm, op.reg);
        if (extraRex !== 0)
          rexVal |= extraRex, prefsToGen |= PREFIX_REX;
      }
      if ((prefsToGen & PREFIX_CLASHREX) == PREFIX_CLASHREX)
        throw new ASMError("Can't encode high 8-bit register", operands[0].startPos.until(currRange));
      let opcode = op.opcode;
      if (op.size == 16)
        prefsToGen |= PREFIX_DATASIZE;
      if (prefsToGen >= PREFIX_SEG)
        this.genByte([38, 46, 54, 62, 100, 101][(prefsToGen / PREFIX_SEG | 0) - 1]);
      if (prefsToGen & PREFIX_ADDRSIZE)
        this.genByte(103);
      if (prefsToGen & PREFIX_DATASIZE)
        this.genByte(102);
      if (prefsToGen & PREFIX_LOCK)
        this.genByte(240);
      if (prefsToGen & PREFIX_REPNE)
        this.genByte(242);
      if (prefsToGen & PREFIX_REPE)
        this.genByte(243);
      if (op.prefix !== null) {
        if (op.prefix > 255)
          this.genByte(op.prefix >> 8);
        this.genByte(op.prefix);
      }
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
      if (op.rm?.value?.addend != null) {
        let sizeRelative = false, value = op.rm.value;
        if (op.rm.ripRelative && op.rm.value.section != pseudoSections.ABS && !op.rm.value.pcRelative) {
          sizeRelative = true;
          value.apply(this, "-", new IdentifierValue({
            addend: BigInt(this.address),
            symbol: (this.section.head.statement ?? instr).symbol,
            section: this.section,
            range: value.range
          }));
          this.ipRelative = true;
        }
        this.genValue(value, op.rm.dispSize || 32, true, sizeRelative);
      }
      if (op.relImm !== null)
        this.genValue(op.relImm.value, op.relImm.size, false, true, true);
      else if (op.evexImm !== null)
        this.genByte(op.evexImm);
      else if (op.moffs !== null)
        this.genValue(op.moffs.value, op.moffs.dispSize, true);
      else
        for (const imm of op.imms)
          this.genValue(imm.value, imm.size, !op.unsigned);
    }
    makeModRM(rm, r) {
      let modrm = 0, rex = 0;
      let rmReg = rm.reg, rmReg2 = rm.reg2, rReg = r.reg;
      if (rReg >= 8) {
        rex |= 4;
        rReg &= 7;
      }
      modrm |= rReg << 3;
      if (rm.ripRelative) {
        rm.value.addend = rm.value.addend || 0n;
        return [rex, modrm | 5, null];
      }
      if (rm.type !== OPT.MEM && rm.type !== OPT.VMEM)
        modrm |= 192;
      else if (rmReg >= 0) {
        if (rm.value.addend != null) {
          this.determineDispSize(rm, 8, 32);
          if (rm.dispSize == 8)
            modrm |= 64;
          else
            modrm |= 128;
        }
      } else {
        rmReg = 5;
        if (rmReg2 < 0)
          rmReg2 = 4;
        rm.value.addend = rm.value.addend || 0n;
      }
      rex |= rmReg >> 3;
      rmReg &= 7;
      if (rmReg2 >= 0) {
        if (rmReg2 >= 8) {
          rex |= 2;
          rmReg2 &= 7;
        }
        return [rex, modrm | 4, rm.shift << 6 | rmReg2 << 3 | rmReg];
      }
      return [rex, modrm | rmReg, null];
    }
    determineDispSize(operand, shortSize, longSize) {
      if (!operand.value.isRelocatable() && inferImmSize(operand.value) < longSize && (operand.dispSize == shortSize || operand.sizeAvailable(SHORT_DISP))) {
        operand.dispSize = shortSize;
        operand.recordSizeUse(SHORT_DISP);
      } else if (!operand.value.isRelocatable() && operand.expression && operand.expression.hasSymbols && operand.dispSize != shortSize && operand.sizeAvailable(SHORT_DISP)) {
        operand.dispSize = shortSize;
        operand.recordSizeUse(SHORT_DISP);
        queueRecomp(this);
      } else
        operand.dispSize = longSize;
    }
    recompile() {
      this.error = null;
      try {
        for (const op of this.outline.operands)
          if (op.expression && op.expression.hasSymbols)
            op.value = op.expression.evaluate(this);
        this.compile();
      } catch (e) {
        this.clear();
        throw e;
      }
    }
  };
  function makeVexPrefix(vex, rex, isEvex) {
    if (isEvex)
      vex ^= 524304;
    let vex1 = vex & 255, vex2 = vex >> 8, vex3 = vex >> 16;
    vex1 |= (~rex & 7) << 5;
    vex2 |= (rex & 8) << 4;
    if (isEvex)
      return [98, vex1, vex2, vex3];
    if ((vex1 & 127) == 97 && (vex2 & 128) == 0)
      return [197, vex2 | vex1 & 128];
    return [196, vex1, vex2];
  }
  function inferImmSize(value) {
    let num = value.addend;
    if (num < 0n)
      num = ~num;
    return num < 0x80n ? 8 : num < 0x8000n ? 16 : num < 0x80000000n ? 32 : 64;
  }
  function inferUnsignedImmSize(value) {
    let num = value.addend;
    if (num < 0n)
      num = -2n * num - 1n;
    return num < 0x100n ? 8 : num < 0x10000n ? 16 : num < 0x100000000n ? 32 : 64;
  }

  // core/compiler.js
  var prevNode = null;
  var currSection = null;
  var addr = 0;
  function setSection(section) {
    currSection = section;
    const prevInstr = section.cursor.prev.statement;
    return prevInstr.address + prevInstr.length;
  }
  function addInstruction(instr2, seekEnd = true) {
    if (instr2.section !== currSection)
      instr2.address = setSection(instr2.section);
    prevNode = prevNode.next = new StatementNode(instr2);
    currSection.cursor.prev = currSection.cursor.prev.next = instr2.sectionNode;
    setSyntax(instr2.syntax);
    if (seekEnd && token != "\n" && token != ";") {
      instr2.error = new ASMError("Expected end of line");
      while (token != "\n" && token != ";")
        next();
    }
    addr = instr2.address + instr2.length;
    instr2.range.length = (seekEnd ? currRange.start : currRange.end) - instr2.range.start;
  }
  var AssemblyState = class {
    constructor({
      syntax = {
        intel: false,
        prefix: true
      },
      writableText = false
    } = {}) {
      this.defaultSyntax = syntax;
      this.symbols = /* @__PURE__ */ new Map();
      this.fileSymbols = [];
      setSyntax(syntax);
      loadSymbols(this.symbols, this.fileSymbols);
      this.sections = [
        new Section(".text"),
        new Section(".data"),
        new Section(".bss")
      ];
      if (writableText)
        this.sections[0].flags |= sectionFlags.w;
      this.head = new StatementNode();
      this.source = "";
      this.compiledRange = new Range3();
      this.errors = [];
    }
    compile(source, {
      haltOnError = false,
      range: replacementRange = new Range3(0, this.source.length),
      doSecondPass = true
    } = {}) {
      this.source = this.source.slice(0, replacementRange.start).padEnd(replacementRange.start, "\n") + source + this.source.slice(replacementRange.end);
      loadSymbols(this.symbols, this.fileSymbols);
      loadSections(this.sections, replacementRange);
      let { head, tail } = this.head.getAffectedArea(replacementRange, true, source.length);
      setSyntax(head.statement ? head.statement.syntax : this.defaultSyntax);
      addr = setSection(head.statement ? head.statement.section : this.sections[0]);
      loadCode(this.source, replacementRange.start);
      prevNode = head;
      while (match) {
        let range = startAbsRange();
        try {
          if (token != "\n" && token != ";") {
            let name2 = token;
            next();
            if (token == ":")
              addInstruction(new SymbolDefinition({ addr, name: name2, range, isLabel: true }), false);
            else if (token == "=" || currSyntax.intel && token.toLowerCase() == "equ")
              addInstruction(new SymbolDefinition({ addr, name: name2, range }));
            else {
              let isDir = false;
              if (currSyntax.intel) {
                if (name2[0] == "%") {
                  isDir = true;
                  name2 += token.toLowerCase();
                  next();
                } else
                  isDir = isDirective(name2, true);
              } else
                isDir = name2[0] == ".";
              if (isDir)
                addInstruction(makeDirective({ addr, range }, currSyntax.intel ? name2 : name2.slice(1)));
              else if (currSyntax.intel && isDirective(token, true)) {
                addInstruction(new SymbolDefinition({ addr, name: name2, range, isLabel: true }), false);
                name2 = token;
                range = startAbsRange();
                next();
                addInstruction(makeDirective({ addr, range }, name2));
              } else
                addInstruction(new Instruction({ addr, name: name2, range }));
            }
          }
        } catch (error) {
          while (token != "\n" && token != ";")
            next();
          if (haltOnError && !(doSecondPass && error.range))
            throw `Error on line ${line}: ${error.message}`;
          if (!error.range)
            console.error(`Error on line ${line}:
`, error);
          else
            addInstruction(new Statement({ addr, range, error }), !comment2);
        }
        if (comment2)
          addInstruction(new Statement({ addr, range: startAbsRange() }), false);
        next();
        if (currRange.end > replacementRange.end)
          break;
      }
      for (const section of sections) {
        let node = section.cursor.tail;
        while (node && node.statement.range.start < currRange.start)
          node = node.next;
        section.cursor.tail = node;
      }
      while (tail && tail.statement.range.start < currRange.start) {
        tail.statement.remove();
        tail = tail.next;
      }
      if (tail && currSection !== tail.statement.section && !tail.statement.switchSection) {
        let tailSection = tail.statement.section;
        let node = tailSection.cursor.tail;
        currSection.cursor.prev.next = node;
        while (node && !node.statement.switchSection) {
          node.statement.section = currSection;
          if (node.statement.ipRelative)
            queueRecomp(node.statement);
          currSection.cursor.prev = node;
          node = node.next;
        }
        tailSection.cursor.tail = node;
      }
      for (const section of sections) {
        let prev = section.cursor.prev;
        prev.next = section.cursor.tail;
        if (prev.next)
          recompQueue.push(prev);
      }
      prevNode.next = tail;
      if (tail) {
        let instr2 = tail.statement;
        if ((currSyntax.prefix != instr2.syntax.prefix || currSyntax.intel != instr2.syntax.intel) && !instr2.switchSyntax) {
          let nextSyntaxChange = tail;
          while (nextSyntaxChange.next && !nextSyntaxChange.next.switchSyntax)
            nextSyntaxChange = nextSyntaxChange.next;
          const recompStart = prevNode.statement.range.end;
          const recompRange = new Range3(recompStart, nextSyntaxChange.statement.range.end - recompStart);
          this.compile(recompRange.slice(this.source), {
            haltOnError,
            range: recompRange,
            doSecondPass: false
          });
        }
      }
      this.compiledRange = replacementRange.until(prevRange);
      if (doSecondPass)
        this.secondPass(haltOnError);
    }
    secondPass(haltOnError = false) {
      addr = 0;
      let node;
      loadSymbols(this.symbols);
      symbols.forEach((symbol, name2) => {
        symbol.references = symbol.references.filter((instr2) => !instr2.removed);
        symbol.definitions = symbol.definitions.filter((instr2) => !instr2.removed);
        if ((symbol.statement === null || symbol.statement.error) && symbol.references.length == 0 && symbol.definitions.length == 0)
          symbols.delete(name2);
      });
      recompQueue.sort((a, b) => a.statement.address - b.statement.address);
      while (node = recompQueue.shift()) {
        addr = node.statement.address;
        do {
          let instr2 = node.statement;
          if (instr2) {
            instr2.address = addr;
            if ((instr2.wantsRecomp || instr2.ipRelative) && !instr2.removed) {
              try {
                instr2.wantsRecomp = false;
                instr2.recompile();
              } catch (e) {
                instr2.error = e;
                if (instr2.symbol)
                  for (const ref of instr2.symbol.references)
                    queueRecomp(ref);
              }
            }
            addr = instr2.address + instr2.length;
          }
          node = node.next;
        } while (node && node.statement.address != addr);
      }
      this.errors = [];
      const reportedErrors = [];
      this.iterate((instr2, line2) => {
        if (instr2.outline && instr2.outline.operands)
          for (let op of instr2.outline.operands)
            op.clearAttemptedSizes();
        const error = instr2.error;
        if (error) {
          this.errors.push(error);
          if (!error.range) {
            console.error(`Error on line ${line2}:
`, error);
            error.range = new RelativeRange(instr2.range, instr2.range.start, instr2.range.length);
          }
          reportedErrors.push({ line: line2, error });
        }
      });
      if (haltOnError && reportedErrors.length > 0)
        throw reportedErrors.map(({ error, line: line2 }) => {
          const linePart = `Error on line ${line2}: `;
          return linePart + (error.range.parent ?? error.range).slice(this.source) + "\n" + " ".repeat(linePart.length + (error.range.parent ? error.range.start - error.range.parent.start : 0)) + "^ " + error.message;
        }).join("\n\n");
    }
    line(line2) {
      if (line2-- < 1)
        throw "Invalid line";
      let start = 0;
      while (line2) {
        start = this.source.indexOf("\n", start) + 1;
        if (start == 0)
          return new Range3(this.source.length + line2, 0);
        line2--;
      }
      let end = this.source.indexOf("\n", start);
      if (end < 0)
        end = this.source.length;
      return new Range3(start, end - start);
    }
    iterate(func) {
      let line2 = 1, nextLine = 0, node = this.head.next;
      while (nextLine != Infinity) {
        nextLine = this.source.indexOf("\n", nextLine) + 1 || Infinity;
        while (node && node.statement.range.end < nextLine) {
          func(node.statement, line2);
          node = node.next;
        }
        line2++;
      }
    }
    bytesPerLine(func) {
      let lineQueue = [];
      let line2 = 1, nextLine = 0, node = this.head.next;
      while (nextLine != Infinity) {
        let bytes = new Uint8Array();
        let addToBytes = () => {
          if (lineQueue.length > 0) {
            const line3 = lineQueue.shift();
            if (line3.length > 0) {
              let newBytes = new Uint8Array(bytes.length + line3.length);
              newBytes.set(bytes);
              newBytes.set(line3, bytes.length);
              bytes = newBytes;
            }
          }
        };
        nextLine = this.source.indexOf("\n", nextLine) + 1 || Infinity;
        addToBytes();
        while (node && node.statement.range.start < nextLine) {
          let instr2 = node.statement, prevEnd = 0;
          for (const end of [...instr2.lineEnds, instr2.length]) {
            if (end <= instr2.length)
              lineQueue.push(instr2.bytes.subarray(prevEnd, end));
            prevEnd = end;
          }
          addToBytes();
          node = node.next;
        }
        func(bytes, line2);
        line2++;
      }
    }
  };

  // codemirror/compilerPlugin.js
  var ASMStateField = StateField.define({
    create: (state) => {
      const asm = new AssemblyState();
      asm.compile(state.sliceDoc());
      return asm;
    },
    update: (state, transaction) => {
      if (!transaction.docChanged)
        return state;
      let offset = 0;
      transaction.changes.iterChanges(
        (fromA, toA, fromB, toB) => {
          state.compile(transaction.state.sliceDoc(fromB, toB), { range: new Range3(fromA + offset, toA - fromA), doSecondPass: false });
          offset += toB - fromB - (toA - fromA);
        }
      );
      state.secondPass();
      return state;
    }
  });
  var ASMLanguageData = EditorState.languageData.of((state, pos, side) => {
    pos = state.doc.lineAt(pos).from;
    var asmState = state.field(ASMStateField);
    var lastInstr = null;
    asmState.iterate((instr2) => {
      if (instr2.range.start < pos)
        lastInstr = instr2;
    });
    return [{
      commentTokens: { line: (lastInstr ? lastInstr.syntax : asmState.defaultSyntax).intel ? ";" : "#" }
    }];
  });
  var ASMColor = class extends RangeValue {
    constructor(color) {
      super();
      this.color = color;
    }
    eq(other) {
      return this.color == other.color;
    }
  };
  var ASMColorFacet = Facet.define();
  var SectionColors = ASMColorFacet.compute(
    ["doc"],
    (state) => {
      let assemblyState = state.field(ASMStateField), offset = 0;
      let builder = new RangeSetBuilder();
      assemblyState.iterate((instr2, line2) => {
        let sectionName = instr2.section.name;
        let color = sectionName == ".text" ? "#666" : sectionName == ".data" ? "#66A" : sectionName == ".bss" ? "#6A6" : sectionName == ".rodata" ? "#AA6" : "#A66";
        builder.add(offset, offset += instr2.length, new ASMColor(color));
      });
      return builder.finish();
    }
  );
  var AsmDumpWidget = class extends WidgetType {
    constructor(bytes, offset, colors) {
      super();
      this.bytes = bytes;
      this.offset = offset;
      this.colors = colors;
    }
    toDOM() {
      let node = document.createElement("span");
      node.setAttribute("aria-hidden", "true");
      node.className = "cm-asm-dump";
      node.style.marginLeft = this.offset + "px";
      let colorCursor = this.colors.iter();
      for (let i = 0; i < this.bytes.length; i++) {
        let text = this.bytes[i].toString(16).toUpperCase().padStart(2, "0");
        let span = document.createElement("span");
        while (colorCursor.to <= i)
          colorCursor.next();
        if (colorCursor.from <= i && i < colorCursor.to)
          span.style.color = colorCursor.value.color;
        span.innerText = text;
        node.appendChild(span);
      }
      return node;
    }
    eq(widget) {
      if (this.offset != widget.offset || this.bytes.length != widget.bytes.length)
        return false;
      for (let i = 0; i < this.bytes.length; i++)
        if (this.bytes[i] != widget.bytes[i])
          return false;
      let oldCursor = widget.colors.iter(), newCursor = this.colors.iter();
      while (true) {
        if (newCursor.value === null) {
          if (oldCursor.value === null)
            break;
          return false;
        }
        if (!newCursor.value.eq(oldCursor.value) || newCursor.from !== oldCursor.from || newCursor.to !== oldCursor.to)
          return false;
        oldCursor.next();
        newCursor.next();
      }
      return true;
    }
    updateDOM(node) {
      node.style.marginLeft = this.offset + "px";
      let colorCursor = this.colors.iter();
      for (let i = 0; i < this.bytes.length; i++) {
        while (colorCursor.to <= i)
          colorCursor.next();
        let text = this.bytes[i].toString(16).toUpperCase().padStart(2, "0");
        if (i < node.childElementCount) {
          let span = node.children.item(i);
          if (span.innerText !== text)
            span.innerText = text;
          if (colorCursor.from <= i && i < colorCursor.to) {
            if (colorCursor.value.color !== span.style.color)
              span.style.color = colorCursor.value.color;
          } else
            span.style.color = "";
        } else {
          let span = document.createElement("span");
          if (colorCursor.value !== null)
            span.style.color = colorCursor.value.color;
          span.innerText = text;
          node.appendChild(span);
        }
        while (colorCursor.to < i)
          colorCursor.next();
      }
      while (node.childElementCount > this.bytes.length)
        node.removeChild(node.lastChild);
      return true;
    }
  };
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
  var byteDumper = [
    EditorView.baseTheme({
      ".cm-asm-dump": { fontStyle: "italic" },
      ".cm-asm-dump > span": { marginRight: "1ch" },
      "&dark .cm-asm-dump": { color: "#AAA" }
    }),
    ViewPlugin.fromClass(class {
      constructor(view) {
        this.ctx = document.createElement("canvas").getContext("2d");
        this.lineWidths = [];
        this.decorations = Decoration.set([]);
        setTimeout(() => {
          let style = window.getComputedStyle(view.contentDOM);
          this.ctx.font = `${style.getPropertyValue("font-style")} ${style.getPropertyValue("font-variant")} ${style.getPropertyValue("font-weight")} ${style.getPropertyValue("font-size")} ${style.getPropertyValue("font-family")}`;
          this.updateWidths(0, view.state.doc.length, 0, view.state);
          this.makeAsmDecorations(view.state);
          view.dispatch();
        }, 1);
      }
      update(update) {
        if (!update.docChanged)
          return;
        let state = update.view.state;
        update.changes.iterChangedRanges(
          (fromA, toA, fromB, toB) => {
            let removedLines = update.startState.doc.lineAt(toA).number - update.startState.doc.lineAt(fromA).number;
            this.updateWidths(fromB, toB, removedLines, state);
          }
        );
        this.makeAsmDecorations(update.state);
      }
      updateWidths(from, to, removedLines, { doc: doc2, tabSize }) {
        let start = doc2.lineAt(from).number;
        let end = doc2.lineAt(to).number;
        let newWidths = [];
        for (let i = start; i <= end; i++)
          newWidths.push(this.ctx.measureText(expandTabs(doc2.line(i).text, tabSize)).width);
        this.lineWidths.splice(start - 1, removedLines + 1, ...newWidths);
      }
      makeAsmDecorations(state) {
        let doc2 = state.doc;
        let maxOffset2 = Math.max(...this.lineWidths) + 50;
        let widgets = [];
        let asmColors = state.facet(ASMColorFacet);
        let assemblyState = state.field(ASMStateField);
        let i = 0;
        assemblyState.bytesPerLine((bytes, line2) => {
          if (bytes.length > 0) {
            let builder = new RangeSetBuilder();
            RangeSet.spans(asmColors, i, i + bytes.length, {
              span: (from, to, active) => {
                if (active.length > 0)
                  builder.add(from - i, to - i, active[active.length - 1]);
              }
            });
            let colors = builder.finish();
            i += bytes.length;
            widgets.push(Decoration.widget({
              widget: new AsmDumpWidget(
                bytes,
                maxOffset2 - this.lineWidths[line2 - 1],
                colors
              ),
              side: 2
            }).range(doc2.line(line2).to));
          }
        });
        this.decorations = Decoration.set(widgets);
      }
    }, { decorations: (plugin) => plugin.decorations })
  ];

  // codemirror/errorPlugin.js
  var EOLError = class extends WidgetType {
    constructor() {
      super();
    }
    toDOM() {
      let node = document.createElement("span");
      node.setAttribute("aria-hidden", "true");
      node.className = "cm-asm-error";
      node.style.position = "absolute";
      node.innerText = " ";
      return node;
    }
  };
  var errorMarker = [
    EditorView.baseTheme({
      ".cm-asm-error": {
        textDecoration: "underline red"
      }
    }),
    ViewPlugin.fromClass(
      class {
        constructor(view) {
          this.markErrors(view.state);
        }
        update(update) {
          if (update.docChanged)
            this.markErrors(update.state);
        }
        markErrors(state) {
          this.marks = Decoration.set(state.field(ASMStateField).errors.map((error) => {
            let content2 = state.sliceDoc(error.range.start, error.range.end);
            if (content2 == "\n" || !content2)
              return Decoration.widget({
                widget: new EOLError(),
                side: 1
              }).range(error.range.start);
            return Decoration.mark({
              class: "cm-asm-error"
            }).range(error.range.start, error.range.end);
          }));
        }
      },
      { decorations: (plugin) => plugin.marks }
    )
  ];
  var errorTooltipper = [
    EditorView.baseTheme({
      ".cm-asm-error-tooltip": {
        fontFamily: "monospace",
        borderRadius: ".25em",
        padding: ".1em .25em",
        color: "#eee",
        backgroundColor: "black !important",
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
      },
      "&dark .cm-asm-error-tooltip": {
        color: "black",
        backgroundColor: "#eee !important",
        "&:before": {
          borderTop: ".3em solid #eee"
        }
      }
    }),
    hoverTooltip((view, pos) => {
      for (let { range, message } of view.state.field(ASMStateField).errors)
        if (range.start <= pos && range.end >= pos)
          return {
            pos: range.start,
            end: Math.min(range.end, view.state.doc.length),
            above: true,
            create: (view2) => {
              let dom = document.createElement("div");
              dom.textContent = message;
              dom.className = "cm-asm-error-tooltip";
              return { dom };
            }
          };
      return null;
    })
  ];

  // node_modules/@lezer/lr/dist/index.js
  var Stack = class {
    constructor(p, stack, state, reducePos, pos, score, buffer, bufferBase, curContext, lookAhead = 0, parent) {
      this.p = p;
      this.stack = stack;
      this.state = state;
      this.reducePos = reducePos;
      this.pos = pos;
      this.score = score;
      this.buffer = buffer;
      this.bufferBase = bufferBase;
      this.curContext = curContext;
      this.lookAhead = lookAhead;
      this.parent = parent;
    }
    toString() {
      return `[${this.stack.filter((_, i) => i % 3 == 0).concat(this.state)}]@${this.pos}${this.score ? "!" + this.score : ""}`;
    }
    static start(p, state, pos = 0) {
      let cx = p.parser.context;
      return new Stack(p, [], state, pos, pos, 0, [], 0, cx ? new StackContext(cx, cx.start) : null, 0, null);
    }
    get context() {
      return this.curContext ? this.curContext.context : null;
    }
    pushState(state, start) {
      this.stack.push(this.state, start, this.bufferBase + this.buffer.length);
      this.state = state;
    }
    reduce(action) {
      let depth = action >> 19, type = action & 65535;
      let { parser: parser2 } = this.p;
      let dPrec = parser2.dynamicPrecedence(type);
      if (dPrec)
        this.score += dPrec;
      if (depth == 0) {
        this.pushState(parser2.getGoto(this.state, type, true), this.reducePos);
        if (type < parser2.minRepeatTerm)
          this.storeNode(type, this.reducePos, this.reducePos, 4, true);
        this.reduceContext(type, this.reducePos);
        return;
      }
      let base2 = this.stack.length - (depth - 1) * 3 - (action & 262144 ? 6 : 0);
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
      this.reduceContext(type, start);
    }
    storeNode(term, start, end, size = 4, isReduce = false) {
      if (term == 0 && (!this.stack.length || this.stack[this.stack.length - 1] < this.buffer.length + this.bufferBase)) {
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
    shift(action, next3, nextEnd) {
      let start = this.pos;
      if (action & 131072) {
        this.pushState(action & 65535, this.pos);
      } else if ((action & 262144) == 0) {
        let nextState = action, { parser: parser2 } = this.p;
        if (nextEnd > this.pos || next3 <= parser2.maxNode) {
          this.pos = nextEnd;
          if (!parser2.stateFlag(nextState, 1))
            this.reducePos = nextEnd;
        }
        this.pushState(nextState, start);
        this.shiftContext(next3, start);
        if (next3 <= parser2.maxNode)
          this.buffer.push(next3, start, nextEnd, 4);
      } else {
        this.pos = nextEnd;
        this.shiftContext(next3, start);
        if (next3 <= this.p.parser.maxNode)
          this.buffer.push(next3, start, nextEnd, 4);
      }
    }
    apply(action, next3, nextEnd) {
      if (action & 65536)
        this.reduce(action);
      else
        this.shift(action, next3, nextEnd);
    }
    useNode(value, next3) {
      let index = this.p.reused.length - 1;
      if (index < 0 || this.p.reused[index] != value) {
        this.p.reused.push(value);
        index++;
      }
      let start = this.pos;
      this.reducePos = this.pos = start + value.length;
      this.pushState(next3, start);
      this.buffer.push(index, start, this.reducePos, -1);
      if (this.curContext)
        this.updateContext(this.curContext.tracker.reuse(this.curContext.context, value, this, this.p.stream.reset(this.pos - value.length)));
    }
    split() {
      let parent = this;
      let off = parent.buffer.length;
      while (off > 0 && parent.buffer[off - 2] > parent.reducePos)
        off -= 4;
      let buffer = parent.buffer.slice(off), base2 = parent.bufferBase + off;
      while (parent && base2 == parent.bufferBase)
        parent = parent.parent;
      return new Stack(this.p, this.stack.slice(), this.state, this.reducePos, this.pos, this.score, buffer, base2, this.curContext, this.lookAhead, parent);
    }
    recoverByDelete(next3, nextEnd) {
      let isNode = next3 <= this.p.parser.maxNode;
      if (isNode)
        this.storeNode(next3, this.pos, nextEnd, 4);
      this.storeNode(0, this.pos, nextEnd, isNode ? 8 : 4);
      this.pos = this.reducePos = nextEnd;
      this.score -= 190;
    }
    canShift(term) {
      for (let sim = new SimulatedStack(this); ; ) {
        let action = this.p.parser.stateSlot(sim.state, 4) || this.p.parser.hasAction(sim.state, term);
        if ((action & 65536) == 0)
          return true;
        if (action == 0)
          return false;
        sim.reduce(action);
      }
    }
    recoverByInsert(next3) {
      if (this.stack.length >= 300)
        return [];
      let nextStates = this.p.parser.nextStates(this.state);
      if (nextStates.length > 4 << 1 || this.stack.length >= 120) {
        let best = [];
        for (let i = 0, s; i < nextStates.length; i += 2) {
          if ((s = nextStates[i + 1]) != this.state && this.p.parser.hasAction(s, next3))
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
        stack.pushState(s, this.pos);
        stack.storeNode(0, stack.pos, stack.pos, 4, true);
        stack.shiftContext(nextStates[i], this.pos);
        stack.score -= 200;
        result.push(stack);
      }
      return result;
    }
    forceReduce() {
      let reduce = this.p.parser.stateSlot(this.state, 5);
      if ((reduce & 65536) == 0)
        return false;
      let { parser: parser2 } = this.p;
      if (!parser2.validAction(this.state, reduce)) {
        let depth = reduce >> 19, term = reduce & 65535;
        let target = this.stack.length - depth * 3;
        if (target < 0 || parser2.getGoto(this.stack[target], term, false) < 0)
          return false;
        this.storeNode(0, this.reducePos, this.reducePos, 4, true);
        this.score -= 100;
      }
      this.reducePos = this.pos;
      this.reduce(reduce);
      return true;
    }
    forceAll() {
      while (!this.p.parser.stateFlag(this.state, 2)) {
        if (!this.forceReduce()) {
          this.storeNode(0, this.pos, this.pos, 4, true);
          break;
        }
      }
      return this;
    }
    get deadEnd() {
      if (this.stack.length != 3)
        return false;
      let { parser: parser2 } = this.p;
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
    shiftContext(term, start) {
      if (this.curContext)
        this.updateContext(this.curContext.tracker.shift(this.curContext.context, term, this, this.p.stream.reset(start)));
    }
    reduceContext(term, start) {
      if (this.curContext)
        this.updateContext(this.curContext.tracker.reduce(this.curContext.context, term, this, this.p.stream.reset(start)));
    }
    emitContext() {
      let last = this.buffer.length - 1;
      if (last < 0 || this.buffer[last] != -3)
        this.buffer.push(this.curContext.hash, this.reducePos, this.reducePos, -3);
    }
    emitLookAhead() {
      let last = this.buffer.length - 1;
      if (last < 0 || this.buffer[last] != -4)
        this.buffer.push(this.lookAhead, this.reducePos, this.reducePos, -4);
    }
    updateContext(context) {
      if (context != this.curContext.context) {
        let newCx = new StackContext(this.curContext.tracker, context);
        if (newCx.hash != this.curContext.hash)
          this.emitContext();
        this.curContext = newCx;
      }
    }
    setLookAhead(lookAhead) {
      if (lookAhead > this.lookAhead) {
        this.emitLookAhead();
        this.lookAhead = lookAhead;
      }
    }
    close() {
      if (this.curContext && this.curContext.tracker.strict)
        this.emitContext();
      if (this.lookAhead > 0)
        this.emitLookAhead();
    }
  };
  var StackContext = class {
    constructor(tracker, context) {
      this.tracker = tracker;
      this.context = context;
      this.hash = tracker.strict ? tracker.hash(context) : 0;
    }
  };
  var Recover;
  (function(Recover2) {
    Recover2[Recover2["Insert"] = 200] = "Insert";
    Recover2[Recover2["Delete"] = 190] = "Delete";
    Recover2[Recover2["Reduce"] = 100] = "Reduce";
    Recover2[Recover2["MaxNext"] = 4] = "MaxNext";
    Recover2[Recover2["MaxInsertStackDepth"] = 300] = "MaxInsertStackDepth";
    Recover2[Recover2["DampenInsertStackDepth"] = 120] = "DampenInsertStackDepth";
  })(Recover || (Recover = {}));
  var SimulatedStack = class {
    constructor(start) {
      this.start = start;
      this.state = start.state;
      this.stack = start.stack;
      this.base = this.stack.length;
    }
    reduce(action) {
      let term = action & 65535, depth = action >> 19;
      if (depth == 0) {
        if (this.stack == this.start.stack)
          this.stack = this.stack.slice();
        this.stack.push(this.state, 0, 0);
        this.base += 3;
      } else {
        this.base -= (depth - 1) * 3;
      }
      let goto = this.start.p.parser.getGoto(this.stack[this.base - 3], term, true);
      this.state = goto;
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
    static create(stack, pos = stack.bufferBase + stack.buffer.length) {
      return new StackBufferCursor(stack, pos, pos - stack.bufferBase);
    }
    maybeNext() {
      let next3 = this.stack.parent;
      if (next3 != null) {
        this.index = this.stack.bufferBase - next3.bufferBase;
        this.stack = next3;
        this.buffer = next3.buffer;
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
  var CachedToken = class {
    constructor() {
      this.start = -1;
      this.value = -1;
      this.end = -1;
      this.extended = -1;
      this.lookAhead = 0;
      this.mask = 0;
      this.context = 0;
    }
  };
  var nullToken = new CachedToken();
  var InputStream = class {
    constructor(input, ranges) {
      this.input = input;
      this.ranges = ranges;
      this.chunk = "";
      this.chunkOff = 0;
      this.chunk2 = "";
      this.chunk2Pos = 0;
      this.next = -1;
      this.token = nullToken;
      this.rangeIndex = 0;
      this.pos = this.chunkPos = ranges[0].from;
      this.range = ranges[0];
      this.end = ranges[ranges.length - 1].to;
      this.readNext();
    }
    resolveOffset(offset, assoc) {
      let range = this.range, index = this.rangeIndex;
      let pos = this.pos + offset;
      while (pos < range.from) {
        if (!index)
          return null;
        let next3 = this.ranges[--index];
        pos -= range.from - next3.to;
        range = next3;
      }
      while (assoc < 0 ? pos > range.to : pos >= range.to) {
        if (index == this.ranges.length - 1)
          return null;
        let next3 = this.ranges[++index];
        pos += next3.from - range.to;
        range = next3;
      }
      return pos;
    }
    clipPos(pos) {
      if (pos >= this.range.from && pos < this.range.to)
        return pos;
      for (let range of this.ranges)
        if (range.to > pos)
          return Math.max(pos, range.from);
      return this.end;
    }
    peek(offset) {
      let idx = this.chunkOff + offset, pos, result;
      if (idx >= 0 && idx < this.chunk.length) {
        pos = this.pos + offset;
        result = this.chunk.charCodeAt(idx);
      } else {
        let resolved = this.resolveOffset(offset, 1);
        if (resolved == null)
          return -1;
        pos = resolved;
        if (pos >= this.chunk2Pos && pos < this.chunk2Pos + this.chunk2.length) {
          result = this.chunk2.charCodeAt(pos - this.chunk2Pos);
        } else {
          let i = this.rangeIndex, range = this.range;
          while (range.to <= pos)
            range = this.ranges[++i];
          this.chunk2 = this.input.chunk(this.chunk2Pos = pos);
          if (pos + this.chunk2.length > range.to)
            this.chunk2 = this.chunk2.slice(0, range.to - pos);
          result = this.chunk2.charCodeAt(0);
        }
      }
      if (pos >= this.token.lookAhead)
        this.token.lookAhead = pos + 1;
      return result;
    }
    acceptToken(token2, endOffset = 0) {
      let end = endOffset ? this.resolveOffset(endOffset, -1) : this.pos;
      if (end == null || end < this.token.start)
        throw new RangeError("Token end out of bounds");
      this.token.value = token2;
      this.token.end = end;
    }
    getChunk() {
      if (this.pos >= this.chunk2Pos && this.pos < this.chunk2Pos + this.chunk2.length) {
        let { chunk, chunkPos } = this;
        this.chunk = this.chunk2;
        this.chunkPos = this.chunk2Pos;
        this.chunk2 = chunk;
        this.chunk2Pos = chunkPos;
        this.chunkOff = this.pos - this.chunkPos;
      } else {
        this.chunk2 = this.chunk;
        this.chunk2Pos = this.chunkPos;
        let nextChunk = this.input.chunk(this.pos);
        let end = this.pos + nextChunk.length;
        this.chunk = end > this.range.to ? nextChunk.slice(0, this.range.to - this.pos) : nextChunk;
        this.chunkPos = this.pos;
        this.chunkOff = 0;
      }
    }
    readNext() {
      if (this.chunkOff >= this.chunk.length) {
        this.getChunk();
        if (this.chunkOff == this.chunk.length)
          return this.next = -1;
      }
      return this.next = this.chunk.charCodeAt(this.chunkOff);
    }
    advance(n = 1) {
      this.chunkOff += n;
      while (this.pos + n >= this.range.to) {
        if (this.rangeIndex == this.ranges.length - 1)
          return this.setDone();
        n -= this.range.to - this.pos;
        this.range = this.ranges[++this.rangeIndex];
        this.pos = this.range.from;
      }
      this.pos += n;
      if (this.pos >= this.token.lookAhead)
        this.token.lookAhead = this.pos + 1;
      return this.readNext();
    }
    setDone() {
      this.pos = this.chunkPos = this.end;
      this.range = this.ranges[this.rangeIndex = this.ranges.length - 1];
      this.chunk = "";
      return this.next = -1;
    }
    reset(pos, token2) {
      if (token2) {
        this.token = token2;
        token2.start = pos;
        token2.lookAhead = pos + 1;
        token2.value = token2.extended = -1;
      } else {
        this.token = nullToken;
      }
      if (this.pos != pos) {
        this.pos = pos;
        if (pos == this.end) {
          this.setDone();
          return this;
        }
        while (pos < this.range.from)
          this.range = this.ranges[--this.rangeIndex];
        while (pos >= this.range.to)
          this.range = this.ranges[++this.rangeIndex];
        if (pos >= this.chunkPos && pos < this.chunkPos + this.chunk.length) {
          this.chunkOff = pos - this.chunkPos;
        } else {
          this.chunk = "";
          this.chunkOff = 0;
        }
        this.readNext();
      }
      return this;
    }
    read(from, to) {
      if (from >= this.chunkPos && to <= this.chunkPos + this.chunk.length)
        return this.chunk.slice(from - this.chunkPos, to - this.chunkPos);
      if (from >= this.chunk2Pos && to <= this.chunk2Pos + this.chunk2.length)
        return this.chunk2.slice(from - this.chunk2Pos, to - this.chunk2Pos);
      if (from >= this.range.from && to <= this.range.to)
        return this.input.read(from, to);
      let result = "";
      for (let r of this.ranges) {
        if (r.from >= to)
          break;
        if (r.to > from)
          result += this.input.read(Math.max(r.from, from), Math.min(r.to, to));
      }
      return result;
    }
  };
  var TokenGroup = class {
    constructor(data, id2) {
      this.data = data;
      this.id = id2;
    }
    token(input, stack) {
      readToken(this.data, input, stack, this.id);
    }
  };
  TokenGroup.prototype.contextual = TokenGroup.prototype.fallback = TokenGroup.prototype.extend = false;
  var ExternalTokenizer = class {
    constructor(token2, options = {}) {
      this.token = token2;
      this.contextual = !!options.contextual;
      this.fallback = !!options.fallback;
      this.extend = !!options.extend;
    }
  };
  function readToken(data, input, stack, group) {
    let state = 0, groupMask = 1 << group, { parser: parser2 } = stack.p, { dialect } = parser2;
    scan:
      for (; ; ) {
        if ((groupMask & data[state]) == 0)
          break;
        let accEnd = data[state + 1];
        for (let i = state + 3; i < accEnd; i += 2)
          if ((data[i + 1] & groupMask) > 0) {
            let term = data[i];
            if (dialect.allows(term) && (input.token.value == -1 || input.token.value == term || parser2.overrides(term, input.token.value))) {
              input.acceptToken(term);
              break;
            }
          }
        let next3 = input.next, low = 0, high = data[state + 2];
        if (input.next < 0 && high > low && data[accEnd + high * 3 - 3] == 65535) {
          state = data[accEnd + high * 3 - 1];
          continue scan;
        }
        for (; low < high; ) {
          let mid = low + high >> 1;
          let index = accEnd + mid + (mid << 1);
          let from = data[index], to = data[index + 1];
          if (next3 < from)
            high = mid;
          else if (next3 >= to)
            low = mid + 1;
          else {
            state = data[index + 2];
            input.advance();
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
        let next3 = input.charCodeAt(pos++), stop = false;
        if (next3 == 126) {
          value = 65535;
          break;
        }
        if (next3 >= 92)
          next3--;
        if (next3 >= 34)
          next3--;
        let digit = next3 - 32;
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
  var verbose = typeof process != "undefined" && process.env && /\bparse\b/.test(process.env.LOG);
  var stackIDs = null;
  var Safety;
  (function(Safety2) {
    Safety2[Safety2["Margin"] = 25] = "Margin";
  })(Safety || (Safety = {}));
  function cutAt(tree, pos, side) {
    let cursor2 = tree.cursor(IterMode.IncludeAnonymous);
    cursor2.moveTo(pos);
    for (; ; ) {
      if (!(side < 0 ? cursor2.childBefore(pos) : cursor2.childAfter(pos)))
        for (; ; ) {
          if ((side < 0 ? cursor2.to < pos : cursor2.from > pos) && !cursor2.type.isError)
            return side < 0 ? Math.max(0, Math.min(cursor2.to - 1, pos - 25)) : Math.min(tree.length, Math.max(cursor2.from + 1, pos + 25));
          if (side < 0 ? cursor2.prevSibling() : cursor2.nextSibling())
            break;
          if (!cursor2.parent())
            return side < 0 ? 0 : tree.length;
        }
    }
  }
  var FragmentCursor = class {
    constructor(fragments, nodeSet) {
      this.fragments = fragments;
      this.nodeSet = nodeSet;
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
        let next3 = top2.children[index];
        let start = this.start[last] + top2.positions[index];
        if (start > pos) {
          this.nextStart = start;
          return null;
        }
        if (next3 instanceof Tree) {
          if (start == pos) {
            if (start < this.safeFrom)
              return null;
            let end = start + next3.length;
            if (end <= this.safeTo) {
              let lookAhead = next3.prop(NodeProp.lookAhead);
              if (!lookAhead || end + lookAhead < this.fragment.to)
                return next3;
            }
          }
          this.index[last]++;
          if (start + next3.length >= Math.max(this.safeFrom, pos)) {
            this.trees.push(next3);
            this.start.push(start);
            this.index.push(0);
          }
        } else {
          this.index[last]++;
          this.nextStart = start + next3.length;
        }
      }
    }
  };
  var TokenCache = class {
    constructor(parser2, stream) {
      this.stream = stream;
      this.tokens = [];
      this.mainToken = null;
      this.actions = [];
      this.tokens = parser2.tokenizers.map((_) => new CachedToken());
    }
    getActions(stack) {
      let actionIndex = 0;
      let main = null;
      let { parser: parser2 } = stack.p, { tokenizers } = parser2;
      let mask = parser2.stateSlot(stack.state, 3);
      let context = stack.curContext ? stack.curContext.hash : 0;
      let lookAhead = 0;
      for (let i = 0; i < tokenizers.length; i++) {
        if ((1 << i & mask) == 0)
          continue;
        let tokenizer3 = tokenizers[i], token2 = this.tokens[i];
        if (main && !tokenizer3.fallback)
          continue;
        if (tokenizer3.contextual || token2.start != stack.pos || token2.mask != mask || token2.context != context) {
          this.updateCachedToken(token2, tokenizer3, stack);
          token2.mask = mask;
          token2.context = context;
        }
        if (token2.lookAhead > token2.end + 25)
          lookAhead = Math.max(token2.lookAhead, lookAhead);
        if (token2.value != 0) {
          let startIndex = actionIndex;
          if (token2.extended > -1)
            actionIndex = this.addActions(stack, token2.extended, token2.end, actionIndex);
          actionIndex = this.addActions(stack, token2.value, token2.end, actionIndex);
          if (!tokenizer3.extend) {
            main = token2;
            if (actionIndex > startIndex)
              break;
          }
        }
      }
      while (this.actions.length > actionIndex)
        this.actions.pop();
      if (lookAhead)
        stack.setLookAhead(lookAhead);
      if (!main && stack.pos == this.stream.end) {
        main = new CachedToken();
        main.value = stack.p.parser.eofTerm;
        main.start = main.end = stack.pos;
        actionIndex = this.addActions(stack, main.value, main.end, actionIndex);
      }
      this.mainToken = main;
      return this.actions;
    }
    getMainToken(stack) {
      if (this.mainToken)
        return this.mainToken;
      let main = new CachedToken(), { pos, p } = stack;
      main.start = pos;
      main.end = Math.min(pos + 1, p.stream.end);
      main.value = pos == p.stream.end ? p.parser.eofTerm : 0;
      return main;
    }
    updateCachedToken(token2, tokenizer3, stack) {
      let start = this.stream.clipPos(stack.pos);
      tokenizer3.token(this.stream.reset(start, token2), stack);
      if (token2.value > -1) {
        let { parser: parser2 } = stack.p;
        for (let i = 0; i < parser2.specialized.length; i++)
          if (parser2.specialized[i] == token2.value) {
            let result = parser2.specializers[i](this.stream.read(token2.start, token2.end), stack);
            if (result >= 0 && stack.p.parser.dialect.allows(result >> 1)) {
              if ((result & 1) == 0)
                token2.value = result >> 1;
              else
                token2.extended = result >> 1;
              break;
            }
          }
      } else {
        token2.value = 0;
        token2.end = this.stream.clipPos(start + 1);
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
      let { state } = stack, { parser: parser2 } = stack.p, { data } = parser2;
      for (let set = 0; set < 2; set++) {
        for (let i = parser2.stateSlot(state, set ? 2 : 1); ; i += 3) {
          if (data[i] == 65535) {
            if (data[i + 1] == 1) {
              i = pair(data, i + 2);
            } else {
              if (index == 0 && data[i + 1] == 2)
                index = this.putAction(pair(data, i + 2), token2, end, index);
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
    Rec2[Rec2["MinBufferLengthPrune"] = 500] = "MinBufferLengthPrune";
    Rec2[Rec2["ForceReduceLimit"] = 10] = "ForceReduceLimit";
    Rec2[Rec2["CutDepth"] = 15e3] = "CutDepth";
    Rec2[Rec2["CutTo"] = 9e3] = "CutTo";
  })(Rec || (Rec = {}));
  var Parse = class {
    constructor(parser2, input, fragments, ranges) {
      this.parser = parser2;
      this.input = input;
      this.ranges = ranges;
      this.recovering = 0;
      this.nextStackID = 9812;
      this.minStackPos = 0;
      this.reused = [];
      this.stoppedAt = null;
      this.stream = new InputStream(input, ranges);
      this.tokens = new TokenCache(parser2, this.stream);
      this.topTerm = parser2.top[1];
      let { from } = ranges[0];
      this.stacks = [Stack.start(this, parser2.top[0], from)];
      this.fragments = fragments.length && this.stream.end - from > parser2.bufferLength * 4 ? new FragmentCursor(fragments, parser2.nodeSet) : null;
    }
    get parsedPos() {
      return this.minStackPos;
    }
    advance() {
      let stacks = this.stacks, pos = this.minStackPos;
      let newStacks = this.stacks = [];
      let stopped, stoppedTokens;
      for (let i = 0; i < stacks.length; i++) {
        let stack = stacks[i];
        for (; ; ) {
          this.tokens.mainToken = null;
          if (stack.pos > pos) {
            newStacks.push(stack);
          } else if (this.advanceStack(stack, newStacks, stacks)) {
            continue;
          } else {
            if (!stopped) {
              stopped = [];
              stoppedTokens = [];
            }
            stopped.push(stack);
            let tok2 = this.tokens.getMainToken(stack);
            stoppedTokens.push(tok2.value, tok2.end);
          }
          break;
        }
      }
      if (!newStacks.length) {
        let finished = stopped && findFinished(stopped);
        if (finished)
          return this.stackToTree(finished);
        if (this.parser.strict) {
          if (verbose && stopped)
            console.log("Stuck with token " + (this.tokens.mainToken ? this.parser.getName(this.tokens.mainToken.value) : "none"));
          throw new SyntaxError("No parse at " + pos);
        }
        if (!this.recovering)
          this.recovering = 5;
      }
      if (this.recovering && stopped) {
        let finished = this.stoppedAt != null && stopped[0].pos > this.stoppedAt ? stopped[0] : this.runRecovery(stopped, stoppedTokens, newStacks);
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
              if (stack.sameState(other) || stack.buffer.length > 500 && other.buffer.length > 500) {
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
      this.minStackPos = newStacks[0].pos;
      for (let i = 1; i < newStacks.length; i++)
        if (newStacks[i].pos < this.minStackPos)
          this.minStackPos = newStacks[i].pos;
      return null;
    }
    stopAt(pos) {
      if (this.stoppedAt != null && this.stoppedAt < pos)
        throw new RangeError("Can't move stoppedAt forward");
      this.stoppedAt = pos;
    }
    advanceStack(stack, stacks, split) {
      let start = stack.pos, { parser: parser2 } = this;
      let base2 = verbose ? this.stackID(stack) + " -> " : "";
      if (this.stoppedAt != null && start > this.stoppedAt)
        return stack.forceReduce() ? stack : null;
      if (this.fragments) {
        let strictCx = stack.curContext && stack.curContext.tracker.strict, cxHash = strictCx ? stack.curContext.hash : 0;
        for (let cached = this.fragments.nodeAt(start); cached; ) {
          let match2 = this.parser.nodeSet.types[cached.type.id] == cached.type ? parser2.getGoto(stack.state, cached.type.id) : -1;
          if (match2 > -1 && cached.length && (!strictCx || (cached.prop(NodeProp.contextHash) || 0) == cxHash)) {
            stack.useNode(cached, match2);
            if (verbose)
              console.log(base2 + this.stackID(stack) + ` (via reuse of ${parser2.getName(cached.type.id)})`);
            return true;
          }
          if (!(cached instanceof Tree) || cached.children.length == 0 || cached.positions[0] > 0)
            break;
          let inner = cached.children[0];
          if (inner instanceof Tree && cached.positions[0] == 0)
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
      if (stack.stack.length >= 15e3) {
        while (stack.stack.length > 9e3 && stack.forceReduce()) {
        }
      }
      let actions = this.tokens.getActions(stack);
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
          if (done)
            continue;
        }
        let force = stack.split(), forceBase = base2;
        for (let j = 0; force.forceReduce() && j < 10; j++) {
          if (verbose)
            console.log(forceBase + this.stackID(force) + " (via force-reduce)");
          let done = this.advanceFully(force, newStacks);
          if (done)
            break;
          if (verbose)
            forceBase = this.stackID(force) + " -> ";
        }
        for (let insert2 of stack.recoverByInsert(token2)) {
          if (verbose)
            console.log(base2 + this.stackID(insert2) + " (via recover-insert)");
          this.advanceFully(insert2, newStacks);
        }
        if (this.stream.end > stack.pos) {
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
      return finished;
    }
    stackToTree(stack) {
      stack.close();
      return Tree.build({
        buffer: StackBufferCursor.create(stack),
        nodeSet: this.parser.nodeSet,
        topID: this.topTerm,
        maxBufferLength: this.parser.bufferLength,
        reused: this.reused,
        start: this.ranges[0].from,
        length: stack.pos - this.ranges[0].from,
        minRepeatType: this.parser.minRepeatTerm
      });
    }
    stackID(stack) {
      let id2 = (stackIDs || (stackIDs = /* @__PURE__ */ new WeakMap())).get(stack);
      if (!id2)
        stackIDs.set(stack, id2 = String.fromCodePoint(this.nextStackID++));
      return id2 + stack;
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
  var id = (x) => x;
  var ContextTracker = class {
    constructor(spec) {
      this.start = spec.start;
      this.shift = spec.shift || id;
      this.reduce = spec.reduce || id;
      this.reuse = spec.reuse || id;
      this.hash = spec.hash || (() => 0);
      this.strict = spec.strict !== false;
    }
  };
  var LRParser = class extends Parser {
    constructor(spec) {
      super();
      this.wrappers = [];
      if (spec.version != 14)
        throw new RangeError(`Parser version (${spec.version}) doesn't match runtime version (${14})`);
      let nodeNames = spec.nodeNames.split(" ");
      this.minRepeatTerm = nodeNames.length;
      for (let i = 0; i < spec.repeatNodeCount; i++)
        nodeNames.push("");
      let topTerms = Object.keys(spec.topRules).map((r) => spec.topRules[r][1]);
      let nodeProps = [];
      for (let i = 0; i < nodeNames.length; i++)
        nodeProps.push([]);
      function setProp(nodeID, prop, value) {
        nodeProps[nodeID].push([prop, prop.deserialize(String(value))]);
      }
      if (spec.nodeProps)
        for (let propSpec of spec.nodeProps) {
          let prop = propSpec[0];
          if (typeof prop == "string")
            prop = NodeProp[prop];
          for (let i = 1; i < propSpec.length; ) {
            let next3 = propSpec[i++];
            if (next3 >= 0) {
              setProp(next3, prop, propSpec[i++]);
            } else {
              let value = propSpec[i + -next3];
              for (let j = -next3; j > 0; j--)
                setProp(propSpec[i++], prop, value);
              i++;
            }
          }
        }
      this.nodeSet = new NodeSet(nodeNames.map((name2, i) => NodeType.define({
        name: i >= this.minRepeatTerm ? void 0 : name2,
        id: i,
        props: nodeProps[i],
        top: topTerms.indexOf(i) > -1,
        error: i == 0,
        skipped: spec.skippedNodes && spec.skippedNodes.indexOf(i) > -1
      })));
      if (spec.propSources)
        this.nodeSet = this.nodeSet.extend(...spec.propSources);
      this.strict = false;
      this.bufferLength = DefaultBufferLength;
      let tokenArray = decodeArray(spec.tokenData);
      this.context = spec.context;
      this.specializerSpecs = spec.specialized || [];
      this.specialized = new Uint16Array(this.specializerSpecs.length);
      for (let i = 0; i < this.specializerSpecs.length; i++)
        this.specialized[i] = this.specializerSpecs[i].term;
      this.specializers = this.specializerSpecs.map(getSpecializer);
      this.states = decodeArray(spec.states, Uint32Array);
      this.data = decodeArray(spec.stateData);
      this.goto = decodeArray(spec.goto);
      this.maxTerm = spec.maxTerm;
      this.tokenizers = spec.tokenizers.map((value) => typeof value == "number" ? new TokenGroup(tokenArray, value) : value);
      this.topRules = spec.topRules;
      this.dialects = spec.dialects || {};
      this.dynamicPrecedences = spec.dynamicPrecedences || null;
      this.tokenPrecTable = spec.tokenPrec;
      this.termNames = spec.termNames || null;
      this.maxNode = this.nodeSet.types.length - 1;
      this.dialect = this.parseDialect();
      this.top = this.topRules[Object.keys(this.topRules)[0]];
    }
    createParse(input, fragments, ranges) {
      let parse = new Parse(this, input, fragments, ranges);
      for (let w of this.wrappers)
        parse = w(parse, input, fragments, ranges);
      return parse;
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
        for (let i = this.stateSlot(state, set ? 2 : 1), next3; ; i += 3) {
          if ((next3 = data[i]) == 65535) {
            if (data[i + 1] == 1)
              next3 = data[i = pair(data, i + 2)];
            else if (data[i + 1] == 2)
              return pair(data, i + 2);
            else
              break;
          }
          if (next3 == terminal || next3 == 0)
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
      let copy = Object.assign(Object.create(LRParser.prototype), this);
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
      if (config2.specializers) {
        copy.specializers = this.specializers.slice();
        copy.specializerSpecs = this.specializerSpecs.map((s, i) => {
          let found = config2.specializers.find((r) => r.from == s.external);
          if (!found)
            return s;
          let spec = Object.assign(Object.assign({}, s), { external: found.to });
          copy.specializers[i] = getSpecializer(spec);
          return spec;
        });
      }
      if (config2.contextTracker)
        copy.context = config2.contextTracker;
      if (config2.dialect)
        copy.dialect = this.parseDialect(config2.dialect);
      if (config2.strict != null)
        copy.strict = config2.strict;
      if (config2.wrap)
        copy.wrappers = copy.wrappers.concat(config2.wrap);
      if (config2.bufferLength != null)
        copy.bufferLength = config2.bufferLength;
      return copy;
    }
    hasWrappers() {
      return this.wrappers.length > 0;
    }
    getName(term) {
      return this.termNames ? this.termNames[term] : String(term <= this.maxNode && this.nodeSet.types[term].name || term);
    }
    get eofTerm() {
      return this.maxNode + 1;
    }
    get topNode() {
      return this.nodeSet.types[this.top[1]];
    }
    dynamicPrecedence(term) {
      let prec2 = this.dynamicPrecedences;
      return prec2 == null ? 0 : prec2[term] || 0;
    }
    parseDialect(dialect) {
      let values = Object.keys(this.dialects), flags = values.map(() => false);
      if (dialect)
        for (let part of dialect.split(" ")) {
          let id2 = values.indexOf(part);
          if (id2 >= 0)
            flags[id2] = true;
        }
      let disabled = null;
      for (let i = 0; i < values.length; i++)
        if (!flags[i]) {
          for (let j = this.dialects[values[i]], id2; (id2 = this.data[j++]) != 65535; )
            (disabled || (disabled = new Uint8Array(this.maxTerm + 1)))[id2] = 1;
        }
      return new Dialect(dialect, flags, disabled);
    }
    static deserialize(spec) {
      return new LRParser(spec);
    }
  };
  function pair(data, off) {
    return data[off] | data[off + 1] << 16;
  }
  function findOffset(data, start, term) {
    for (let i = start, next3; (next3 = data[i]) != 65535; i++)
      if (next3 == term)
        return i - start;
    return -1;
  }
  function findFinished(stacks) {
    let best = null;
    for (let stack of stacks) {
      let stopped = stack.p.stoppedAt;
      if ((stack.pos == stack.p.stream.end || stopped != null && stack.pos > stopped) && stack.p.parser.stateFlag(stack.state, 2) && (!best || best.score < stack.score))
        best = stack;
    }
    return best;
  }
  function getSpecializer(spec) {
    if (spec.external) {
      let mask = spec.extend ? 1 : 0;
      return (value, stack) => spec.external(value, stack) << 1 | mask;
    }
    return spec.get;
  }

  // codemirror/parser.terms.js
  var Register = 1;
  var Directive = 2;
  var Comment = 3;
  var Opcode = 4;
  var IOpcode = 5;
  var RelOpcode = 6;
  var IRelOpcode = 7;
  var Prefix = 8;
  var word = 38;
  var Ptr = 9;
  var Offset = 10;
  var symEquals = 39;
  var SymbolName = 11;
  var VEXRound = 12;
  var number2 = 40;
  var immPrefix = 41;
  var SpecialWord = 13;
  var None = 14;
  var Space = 15;

  // codemirror/tokenizer.js
  var tok;
  var pureString;
  function next2(input) {
    tok = "";
    let char;
    while (input.next >= 0 && input.next != 10 && String.fromCharCode(input.next).match(/\s/))
      input.advance();
    if (input.next >= 0 && !(char = String.fromCharCode(input.next)).match(/[.$\w]/)) {
      tok = char;
      input.advance();
      pureString = false;
    } else
      while (input.next >= 0 && (char = String.fromCharCode(input.next)).match(/[.$\w]/)) {
        tok += char;
        input.advance();
      }
    tok = tok.toLowerCase() || "\n";
    return tok;
  }
  function peekNext(input) {
    let i = 0, char;
    while ((char = input.peek(i)) >= 0 && char != 10 && String.fromCharCode(char).match(/\s/))
      i++;
    if ((char = input.peek(i)) >= 0 && !(char = String.fromCharCode(char)).match(/[.$\w]/))
      return char;
    let result = "";
    while ((char = input.peek(i)) >= 0 && (char = String.fromCharCode(char)).match(/[.$\w]/)) {
      result += char;
      i++;
    }
    return result.toLowerCase() || "\n";
  }
  var STATE_SYNTAX_INTEL = 1;
  var STATE_SYNTAX_PREFIX = 2;
  var STATE_IN_INSTRUCTION = 4;
  var STATE_ALLOW_IMM = 8;
  var ctxTracker = (initialSyntax) => new ContextTracker({
    start: initialSyntax.intel * STATE_SYNTAX_INTEL | initialSyntax.prefix * STATE_SYNTAX_PREFIX,
    shift: (ctx, term, stack, input) => {
      if (term == Opcode)
        ctx |= STATE_IN_INSTRUCTION | STATE_ALLOW_IMM;
      else if (term == RelOpcode || term == IOpcode || term == IRelOpcode || term == symEquals || term == Directive)
        ctx |= STATE_IN_INSTRUCTION;
      else if (ctx & STATE_IN_INSTRUCTION && term != Space) {
        if (input.next == ",".charCodeAt(0))
          ctx |= STATE_ALLOW_IMM;
        else
          ctx &= ~STATE_ALLOW_IMM;
      }
      if (input.next == "\n".charCodeAt(0) || input.next == ";".charCodeAt(0))
        ctx &= ~STATE_IN_INSTRUCTION;
      if (term != Directive)
        return ctx;
      let result = ctx, syntax = next2(input);
      if (syntax == ".intel_syntax") {
        result |= STATE_SYNTAX_INTEL;
        result &= ~STATE_SYNTAX_PREFIX;
      } else if (syntax == ".att_syntax") {
        result &= ~STATE_SYNTAX_INTEL;
        result |= STATE_SYNTAX_PREFIX;
      } else
        return ctx;
      const pref = next2(input);
      if (pref == "prefix")
        result |= STATE_SYNTAX_PREFIX;
      else if (pref == "noprefix")
        result &= ~STATE_SYNTAX_PREFIX;
      else if (pref != "\n" && pref != ";" && (result & STATE_SYNTAX_INTEL || pref != "#"))
        return ctx;
      return result;
    },
    hash: (ctx) => ctx,
    strict: false
  });
  function tokenize(ctx, input) {
    const intel = ctx & STATE_SYNTAX_INTEL, prefix = ctx & STATE_SYNTAX_PREFIX;
    if (tok == (intel ? ";" : "#")) {
      while (input.next >= 0 && input.next != "\n".charCodeAt(0))
        input.advance();
      return Comment;
    }
    if (!(ctx & STATE_IN_INSTRUCTION)) {
      const nextTok = peekNext(input);
      if (nextTok == "=" || nextTok == ":" || intel && (nextTok == "equ" || isDirective(nextTok, true)))
        return SymbolName;
      if (tok == "%" && intel)
        return isDirective("%" + next2(input), true) ? Directive : null;
      if (isDirective(tok, intel))
        return Directive;
      if (intel && tok == "offset")
        return Offset;
      if (prefixes.hasOwnProperty(tok))
        return Prefix;
      if (tok == "=" || intel && tok == "equ")
        return symEquals;
      let opcode = tok, mnemonics2 = fetchMnemonic(opcode, intel);
      if (mnemonics2.length > 0)
        return mnemonics2[0].relative ? intel ? IRelOpcode : RelOpcode : intel ? IOpcode : Opcode;
      return null;
    }
    if (ctx & STATE_ALLOW_IMM && tok[0] == "$") {
      input.pos -= tok.length - 1;
      return immPrefix;
    }
    if (tok == "@") {
      next2(input);
      return SpecialWord;
    }
    if (tok == "%" && prefix)
      return isRegister(next2(input)) ? Register : null;
    if (tok == "{") {
      if ((!prefix || next2(input) == "%") && isRegister(next2(input)))
        return null;
      while (tok != "\n" && tok != "}")
        next2(input);
      return VEXRound;
    }
    if (intel && sizeHints.hasOwnProperty(tok)) {
      let prevEnd = input.pos;
      if (",;\n{:".includes(next2(input))) {
        input.pos = prevEnd;
        return word;
      }
      if (tok == "ptr") {
        let nextPrevEnd = input.pos;
        input.pos = ",;\n{:".includes(next2(input)) ? prevEnd : nextPrevEnd;
        return Ptr;
      }
      input.pos = prevEnd;
      return Ptr;
    }
    const idType = scanIdentifier(tok, intel);
    if (idType === null)
      return null;
    if (!prefix && isRegister(tok))
      return Register;
    if (idType == "symbol")
      return word;
    return number2;
  }
  var tokenizer2 = new ExternalTokenizer(
    (input, stack) => {
      if (input.next < 0 || String.fromCharCode(input.next).match(/\s/))
        return;
      pureString = true;
      next2(input);
      const type = tokenize(stack.context, input);
      if (type !== null || pureString)
        input.acceptToken(type ?? None);
    },
    {
      contextual: false
    }
  );

  // codemirror/parser.js
  var parser = LRParser.deserialize({
    version: 14,
    states: "8SOVQROOO}QRO'#CmO#gQRO'#CnO$SQRO'#CnO%hQRO'#CnO%rQRO'#CnO%|QRO'#CvOOQP'#Cy'#CyO'uQRO'#DXOOQO'#DX'#DXQ(VQQOOOOQP,59X,59XO%|QRO,59bO(_QRO,59dOOQP'#Cz'#CzO(pQRO'#CzO)XQRO'#CqO(_QRO'#CoO)jQTO'#CqO+xQRO'#DZO*wQRO'#DZOOQP,59Y,59YO!YQRO,59YO,PQRO'#CqO,bQTO'#CqO-lQRO'#CuO.QQQO'#CuO.VQRO'#DdO(_QRO'#DdO/WQRO'#DdO/bQRO'#CpO0nQTO'#CpO0{QQO'#CrO1cQRO,59YO1jQRO'#CpO1{QTO'#CpO2]QRO'#DiOOQP,59b,59bOOQP-E6w-E6wOOQO,59s,59sOVQRO'#DQQ(VQQOOOOQP1G.|1G.|OOQP1G/O1G/OOOQP,59^,59^O3WQQO,59^OOQP-E6x-E6xO3`QTO,59]OOQP,59Z,59ZOOQP'#C{'#C{O3`QTO,59]O4mQRO,59]O5OQRO,59^O5WQRO'#CsO5]QRO'#C}O6`QRO,59uO7ZQRO,59uO7eQRO,59uOOQP1G.t1G.tO7lQTO,59]O7lQTO,59]O8vQRO,59]O9XQRO'#DfO9mQSO'#DfO9xQQO,59aO-lQRO,59aO9}QRO'#DOO;TQRO,5:OO<OQRO,5:OO<YQRO,5:OO<aQRO,5:OO(_QRO,5:OO<kQTO,59[O<kQTO,59[O=oQRO,59[O>QQRO1G.tO>{QTO,59[O>{QTO,59[O(_QRO,59[O@SQRO'#DPOAVQRO,5:TOOQO,59l,59lOOQO-E7O-E7OOBQQRO'#C|OB`QQO1G.xOOQP1G.x1G.xOBhQTO1G.wO4mQRO1G.wOOQP-E6y-E6yOOQP1G.w1G.wOB`QQO1G.xOCuQQO,59_OD{QRO,59iOCzQRO,59iOOQP-E6{-E6{OESQRO1G/aOESQRO1G/aOE}QRO1G/aOFUQTO1G.wO8vQRO1G.wOOQP1G.z1G.zOG`QSO,5:QOG`QSO,5:QO-lQRO,5:QOOQP1G.{1G.{OGkQQO1G.{OGpQRO,59jO(_QRO,59jOHqQRO,59jOOQP-E6|-E6|OH{QRO1G/jOH{QRO1G/jOIvQRO1G/jOI}QRO1G/jOJXQRO1G/jOK^QTO1G.vO=oQRO1G.vOOQP1G.v1G.vOKkQTO1G.vO(_QRO1G.vOOQP,59k,59kOOQP-E6}-E6}OOQO,59h,59hOOQO-E6z-E6zOOQP7+$d7+$dO4mQRO7+$cOOQP7+$c7+$cOK{QQO7+$dOOQP1G.y1G.yOMRQRO1G/TOLTQRO1G/TOMYQRO7+${OMYQRO7+${O8vQRO7+$cOOQP7+$f7+$fONTQSO1G/lO-lQRO1G/lOOQO1G/l1G/lOOQP7+$g7+$gO! ^QRO1G/UON`QRO1G/UO! eQRO1G/UO(_QRO1G/UO!!fQRO7+%UO!!fQRO7+%UO!#aQRO7+%UO!#hQRO7+%UO=oQRO7+$bOOQP7+$b7+$bO(_QRO7+$bOOQP<<G}<<G}OOQP<<HO<<HOOOQP7+$o7+$oO!#rQRO7+$oO!$pQRO<<HgOOQP<<HQ<<HQO-lQRO7+%WOOQO7+%W7+%WOOQP7+$p7+$pO!%kQRO7+$pO!&iQRO7+$pO!&pQRO7+$pO!'qQRO<<HpO!'qQRO<<HpO!(lQRO<<HpOOQP<<G|<<G|OOQP<<HZ<<HZOOQO<<Hr<<HrOOQP<<H[<<H[O!(sQRO<<H[O!)qQRO<<H[O!)xQROAN>[O!)xQROAN>[OOQPAN=vAN=vO!*sQROAN=vO!+qQROG23vOOQPG23bG23b",
    stateData: "!,l~O_OS~OQUORXOSQOTROUSOVTOWVOZPO^VOu{P!^{P!_{P~OQ[Ow]O|ZO~OPdOvbOxbOyaO!O^O!P_O!QbOQ}PR}PS}PT}PU}PV}PW}PZ}P^}Pu}P!^}P!_}P~O[fO~P!YOvbOxhO!O^O!P^O!QhO!XiO~OPkOXmOYlOQ!WPR!WPS!WPT!WPU!WPV!WPW!WPZ!WP^!WPu!WP!^!WP!_!WP~P#nOPeOvoOxoO!O^O!QoO~O!P_O![qO~P%VO!P^O!XiO~P%VO]tOktOvsOxsO!O^O!P^O!QsOQ!]PR!]PS!]PT!]PU!]PV!]PW!]PZ!]P^!]Pu!]P!^!]P!_!]P~OQUOSQOTROUSOVTOWVOZPO^VO~ORwOu{X!^{X!_{X~P'ZO!^xO!_xO~OvsOxsO!O^O!P^O!QsO~OP}O!R|OvnXxnX!OnX!PnX!QnX~Ov!POx!PO!O^O!P^O!Q!PO~O!R!RO!S!TOQeXReXSeXTeXUeXVeXWeXZeX[eX^eXueX!PeX!TeX!UeX!^eX!_eX!XeX~O[!YO!T!WO!U!VOQ}XR}XS}XT}XU}XV}XW}XZ}X^}Xu}X!^}X!_}X~O!P!UO~P*wOv!POx!]O!O^O!P^O!Q!]O~O!R!RO!S!_OQhXRhXShXThXUhXVhXWhXZhX[hX^hXuhX!ThX!UhX!XeX!^hX!_hX~OP!aOv!aOx!aO!O^O!P^O!Q!aO~O!X!cO~O[!fO!T!dO!U!VOQ!WXR!WXS!WXT!WXU!WXV!WXW!WXZ!WX^!WXu!WX!^!WX!_!WX~OP!hOY!iO~P#nOv!jOx!jO!O^O!P^O!Q!jO~O!R!ROQdXRdXSdXTdXUdXVdXWdXZdX^dXudX!^dX!_dX~O!S!lO!PeX!XeX~P/sO!P!UO~OvbOxbO!O^O!P_O!QbO~OP![O~P1QOv!nOx!nO!O^O!P^O!Q!nO~O!S!pO!TdX[dX!UdX~P/sO!T!qOQ!]XR!]XS!]XT!]XU!]XV!]XW!]XZ!]X^!]Xu!]X!^!]X!_!]X~O!R!wO!T!uO~O!R!RO!S!yOQeaReaSeaTeaUeaVeaWeaZea[ea^eauea!Pea!Tea!Uea!^ea!_ea!Xea~OvbOxbO!O^O!P^O!QbO~OP!|O!R!wO~OP!}O~OP#POyaOQqXRqXSqXTqXUqXVqXWqXZqX^qXuqX!TqX!^qX!_qX~P1QO!T!WOQ}aR}aS}aT}aU}aV}aW}aZ}a^}au}a!^}a!_}a~O[#SO!U!VO~P6`O[#SO~P6`O!R!RO!S#VOQhaRhaShaThaUhaVhaWhaZha[ha^hauha!Tha!Uha!Xea!^ha!_ha~OvbOxhO!O^O!P^O!QhO~OP#XOv#XOx#XO!O^O!P^O!Q#XO~O!R!RO!S#ZO!Z!YX~O!Z#[O~OP#^OX#`OY#_OQrXRrXSrXTrXUrXVrXWrXZrX^rXurX!TrX!^rX!_rX~P#nO!T!dOQ!WaR!WaS!WaT!WaU!WaV!WaW!WaZ!Wa^!Wau!Wa!^!Wa!_!Wa~O[#cO!U!VO~P;TO[#cO~P;TO[#eO!U!VO~P;TO!R!RO!S#hOQdaRdaSdaTdaUdaVdaWdaZda^dauda!Pea!^da!_da!Xea~OvoOxoO!O^O!P^O!QoO~O!P!UOQbiRbiSbiTbiUbiVbiWbiZbi^biubi!^bi!_bi~O!R!RO!S#kOQdaRdaSdaTdaUdaVdaWdaZda^dauda!Tda!^da!_da[da!Uda~O]#lOk#lOQsXRsXSsXTsXUsXVsXWsXZsX^sXusX!TsX!^sX!_sX~P(_O!T!qOQ!]aR!]aS!]aT!]aU!]aV!]aW!]aZ!]a^!]au!]a!^!]a!_!]a~OP#nOx#nO!RpX!TpX~O!R#pO!T!uO~O!R!RO!S#qOQeiReiSeiTeiUeiVeiWeiZei[ei^eiuei!Pei!Tei!Uei!^ei!_ei!Xei~O!V#tO~O[#uO!U!VOQqaRqaSqaTqaUqaVqaWqaZqa^qauqa!Tqa!^qa!_qa~O!P!UO~PCzO!T!WOQ}iR}iS}iT}iU}iV}iW}iZ}i^}iu}i!^}i!_}i~O[#xO~PESO!R!RO!S#yOQhiRhiShiThiUhiVhiWhiZhi[hi^hiuhi!Thi!Uhi!Xei!^hi!_hi~O!R!RO!S#|O!Z!Ya~O!Z$OO~O[$PO!U!VOQraRraSraTraUraVraWraZra^raura!Tra!^ra!_ra~OP$ROY$SO~P#nO!T!dOQ!WiR!WiS!WiT!WiU!WiV!WiW!WiZ!Wi^!Wiu!Wi!^!Wi!_!Wi~O[$UO~PH{O[$UO!U!VO~PH{O[$WO!U!VO~PH{O!R!ROQdiRdiSdiTdiUdiVdiWdiZdi^diudi!^di!_di~O!S$XO!Pei!Xei~PJcO!S$ZO!Tdi[di!Udi~PJcO!R$]O!T!uO~O[$^OQqiRqiSqiTqiUqiVqiWqiZqi^qiuqi!Tqi!^qi!_qi~O!U!VO~PLTO!T!WOQ}qR}qS}qT}qU}qV}qW}qZ}q^}qu}q!^}q!_}q~O!R!RO!S$bO!Z!Yi~O[$dOQriRriSriTriUriVriWriZri^riuri!Tri!^ri!_ri~O!U!VO~PN`O[$fO!U!VOQriRriSriTriUriVriWriZri^riuri!Tri!^ri!_ri~O!T!dOQ!WqR!WqS!WqT!WqU!WqV!WqW!WqZ!Wq^!Wqu!Wq!^!Wq!_!Wq~O[$iO~P!!fO[$iO!U!VO~P!!fO[$lOQqqRqqSqqTqqUqqVqqWqqZqq^qquqq!Tqq!^qq!_qq~O!T!WOQ}yR}yS}yT}yU}yV}yW}yZ}y^}yu}y!^}y!_}y~O[$nOQrqRrqSrqTrqUrqVrqWrqZrq^rqurq!Trq!^rq!_rq~O!U!VO~P!%kO[$pO!U!VOQrqRrqSrqTrqUrqVrqWrqZrq^rqurq!Trq!^rq!_rq~O!T!dOQ!WyR!WyS!WyT!WyU!WyV!WyW!WyZ!Wy^!Wyu!Wy!^!Wy!_!Wy~O[$rO~P!'qO[$sOQryRrySryTryUryVryWryZry^ryury!Try!^ry!_ry~O!U!VO~P!(sO!T!dOQ!W!RR!W!RS!W!RT!W!RU!W!RV!W!RW!W!RZ!W!R^!W!Ru!W!R!^!W!R!_!W!R~O[$vOQr!RRr!RSr!RTr!RUr!RVr!RWr!RZr!R^r!Rur!R!Tr!R!^r!R!_r!R~O!T!dOQ!W!ZR!W!ZS!W!ZT!W!ZU!W!ZV!W!ZW!W!ZZ!W!Z^!W!Zu!W!Z!^!W!Z!_!W!Z~O",
    goto: "*y!^PPPPPPPPPPPPPPPPP!_!_!d!k#f$Z$h%d%y!_P!_&Y&a'h(d(n)T)w)}PPPPPP*TP*ZPPPPPPPP*aP*dPP*sVVOWxSdQfR#P!WSeSTStU[Q{]Q!QaQ!hlQ#f!iS#i!l!pQ#l!qQ$R#_S$Y#h#kQ$g$ST$k$X$ZScQfYjRTm!d#`QpSQ!mqU!{!T!_!lQ#O!WU#r!y#V#hV$[#q#y$XSdQfQeSQ![qR#P!WS!ZcdQ!gkQ#T!YS#d!f!hS#v#O#PQ$Q#^S$V#e#fQ$_#uS$e$P$RQ$j$WS$o$f$gR$t$pQkRQ!hmQ#W!_Q#^!dQ#z#VQ$R#`R$a#yQeTQkRQ!hmQ#^!dR$R#`SWOxRvW^`Qfq!T!W!y#q^gRm!_!d#V#`#yYnST!l#h$XhrU[]al!i!p!q#_#k$S$ZY!O`gnr!`Z!`i!c#Z#|$bQ!SbQ!^hQ!koQ!osQ!x!Pd!z!S!^!k!o!x#U#Y#g#j#{Q#U!]Q#Y!aQ#g!jQ#j!nR#{#XQ!v}S#o!v#sR#s!|S!XcdW#Q!X#R#w$`S#R!Y!ZS#w#S#TR$`#xQ!ek[#a!e#b$T$h$q$uU#b!f!g!hW$T#c#d#e#fU$h$U$V$WS$q$i$jR$u$rQ!rtR#m!rQyYR!tyQYOR!sxQeQR![fReRQ!biQ#]!cQ#}#ZQ$c#|R$m$bQuURz[",
    nodeNames: "\u26A0 Register Directive Comment Opcode IOpcode RelOpcode IRelOpcode Prefix Ptr Offset SymbolName VEXRound SpecialWord None Space Program LabelDefinition InstructionStatement Immediate Expression Relative Memory VEXMask IImmediate IMemory DirectiveStatement FullString SymbolDefinition",
    maxTerm: 61,
    skippedNodes: [0, 15],
    repeatNodeCount: 8,
    tokenData: "'s~RtXY#cYZ#hZ^#cpq#cqr#ors$Ouv#yvw$owx$wxy%hyz%mz{%r{|%y|}&Q}!O%y!P!Q#y![!]&V!]!^&[!^!_&a!_!`&o!`!a&u!}#O'Q#P#Q'V#Q#R#y#o#p'[#p#q'a#q#r'i#r#s'n#y#z#c$f$g#c#BY#BZ#c$IS$I_#c$I|$JO#c$JT$JU#c$KV$KW#c&FU&FV#c~#hO_~~#oO!_~_~R#vP!SQ!OP!_!`#yQ$OO!SQ~$TTk~Or$Ors$ds#O$O#O#P$i#P~$O~$iOk~~$lPO~$OQ$tP!SQvw#y~$|T!Q~Ow$wwx%]x#O$w#O#P%b#P~$w~%bO!Q~~%ePO~$w~%mO!P~~%rO!R~R%yO![P!SQR&QO!SQ!OP~&VO!T~~&[O|~~&aO!^~Q&fR!SQ!^!_#y!_!`#y!`!a#yQ&rP!_!`#yQ&zQ!SQ!_!`#y!`!a#y~'VO!X~~'[O!Z~~'aO!U~Q'fP!SQ#p#q#y~'nO!V~P'sO!OP",
    tokenizers: [tokenizer2, 0, 1],
    topRules: { "Program": [0, 16] },
    dynamicPrecedences: { "24": 1 },
    tokenPrec: 0
  });

  // codemirror/debugPlugin.js
  var debugEnabled = false;
  var debugPlugin = [
    EditorView.baseTheme({
      ".red": { background: "lightcoral" },
      ".blue": { background: "lightblue" },
      ".cm-asm-debug-compiled .red, .red .cm-asm-debug-compiled": { background: "indianred" },
      ".cm-asm-debug-compiled .blue, .blue .cm-asm-debug-compiled": { background: "dodgerblue" },
      ".cm-asm-debug-compiled": { background: "#ddd" }
    }),
    hoverTooltip((view, pos) => {
      if (!debugEnabled)
        return null;
      const node = view.state.field(ASMStateField).head.find(pos);
      if (!node)
        return null;
      const instr2 = node.statement;
      return {
        pos: instr2.range.start,
        end: Math.min(instr2.range.end, view.state.doc.length),
        above: true,
        create: (view2) => {
          let dom = document.createElement("div");
          dom.textContent = `${instr2.constructor.name} (#${instr2.id})`;
          dom.className = "cm-asm-error-tooltip";
          return { dom };
        }
      };
    }),
    EditorView.domEventHandlers({
      mousedown: (event, view) => {
        if (debugEnabled && event.ctrlKey) {
          console.log(view.state.field(ASMStateField).head.find(view.posAtCoords(event)));
          return true;
        }
      },
      keydown: (event, view) => {
        if (event.key == "F3") {
          debugEnabled = !debugEnabled;
          view.dispatch(ChangeSet.empty(0));
          return true;
        }
      }
    }),
    ViewPlugin.fromClass(
      class {
        constructor(view) {
          this.markInstructions(view.state);
        }
        update(update) {
          this.markInstructions(update.state);
        }
        markInstructions(state) {
          if (!debugEnabled) {
            this.decorations = Decoration.set([]);
            return;
          }
          let instrMarks = [];
          let i = 0;
          state.field(ASMStateField).iterate((instr2) => {
            instrMarks.push(Decoration.mark({
              class: i++ % 2 ? "blue" : "red"
            }).range(instr2.range.start, instr2.range.end));
          });
          let compiledRange = state.field(ASMStateField).compiledRange;
          if (compiledRange.length > 0)
            instrMarks.push(Decoration.mark({
              class: "cm-asm-debug-compiled"
            }).range(compiledRange.start, compiledRange.end));
          this.decorations = Decoration.set(instrMarks, true);
        }
      },
      { decorations: (plugin) => plugin.decorations }
    )
  ];

  // codemirror/shellcodePlugin.js
  function getShellcode(bytes) {
    let uniSeqLen = 0, uniSeqStart = -1;
    let code2 = "";
    let builder = new RangeSetBuilder();
    for (let i = 0; true; i++) {
      let byte = bytes[i] ?? 0;
      try {
        if (byte < 128) {
          if (uniSeqStart >= 0)
            throw [uniSeqStart, i];
        } else if (byte < 192) {
          if (uniSeqStart < 0)
            throw [i, i + 1];
          if (i - uniSeqStart == uniSeqLen) {
            try {
              let uriSeq = "";
              for (let j = uniSeqStart; j <= i; j++)
                uriSeq += "%" + bytes[j].toString(16);
              code2 += decodeURIComponent(uriSeq);
            } catch (e) {
              throw [uniSeqStart, i + 1];
            }
            builder.add(uniSeqStart, i + 1, new ASMColor("#00F"));
            uniSeqStart = -1;
          }
        } else {
          if (uniSeqStart >= 0)
            throw [uniSeqStart, i];
        }
      } catch ([from, to]) {
        builder.add(from, to, new ASMColor("#F00"));
        for (let i2 = from; i2 < to; i2++)
          code2 += "\\" + bytes[i2].toString(8);
        uniSeqStart = -1;
      }
      if (i == bytes.length)
        break;
      if (byte < 128) {
        let char;
        if (byte == 0)
          char = "\\0";
        else if (byte == 13)
          char = "\\15";
        else {
          char = String.fromCharCode(byte);
          if (char == "\\" || char == '"')
            char = "\\" + char;
        }
        code2 += char;
      } else if (byte >= 192) {
        uniSeqStart = i;
        uniSeqLen = byte < 224 ? 1 : byte < 240 ? 2 : 3;
      }
    }
    return { code: code2, colors: builder.finish() };
  }
  var ShellcodeField = StateField.define({
    create: (state) => {
      return getShellcode(state.field(ASMStateField).head.dump());
    },
    update: (state, transaction) => {
      if (!transaction.docChanged)
        return state;
      return getShellcode(transaction.state.field(ASMStateField).head.dump());
    }
  });
  var ShellcodeColors = ASMColorFacet.compute(
    [ShellcodeField],
    (state) => state.field(ShellcodeField).colors
  );
  var ShellcodePlugin = [ShellcodeField.extension, ShellcodeColors];

  // codemirror/assembly.js
  var assemblyLang = LRLanguage.define({
    parser: parser.configure({
      props: [
        styleTags({
          Opcode: tags.operatorKeyword,
          IOpcode: tags.operatorKeyword,
          RelOpcode: tags.operatorKeyword,
          IRelOpcode: tags.operatorKeyword,
          Prefix: tags.operatorKeyword,
          Register: tags.className,
          Directive: tags.meta,
          Comment: tags.lineComment,
          SymbolName: tags.definition(tags.labelName),
          Immediate: tags.literal,
          IImmediate: tags.literal,
          Memory: tags.regexp,
          IMemory: tags.regexp,
          Relative: tags.regexp,
          Expression: tags.literal,
          FullString: tags.string,
          VEXRound: tags.modifier,
          VEXMask: tags.modifier,
          Offset: tags.emphasis,
          Ptr: tags.emphasis,
          SpecialWord: tags.annotation
        })
      ]
    })
  });
  function assembly({
    assemblyConfig = { syntax: { intel: false, prefix: true } },
    byteDumps = true,
    debug = false,
    errorMarking = true,
    errorTooltips = true,
    highlighting = true
  } = {}) {
    const plugins = [
      ASMStateField.init((state) => {
        const asm = new AssemblyState(assemblyConfig);
        asm.compile(state.sliceDoc());
        return asm;
      }),
      ASMLanguageData
    ];
    if (byteDumps)
      plugins.push(SectionColors, byteDumper);
    if (debug)
      plugins.push(debugPlugin);
    if (errorMarking)
      plugins.push(errorMarker);
    if (errorTooltips)
      plugins.push(errorTooltipper);
    if (highlighting)
      return new LanguageSupport(assemblyLang.configure({
        contextTracker: ctxTracker(assemblyConfig.syntax)
      }), plugins);
    return plugins;
  }

  // gh-pages/make_editor.js
  var theme2 = new Compartment();
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (event) => {
    for (let editor of editors)
      editor.dispatch({
        effects: theme2.reconfigure(event.matches ? materialDark : syntaxHighlighting(defaultHighlightStyle))
      });
  });
  var editors = [];
  for (let container of document.getElementsByClassName("defasm-editor")) {
    let editor = new EditorView({
      dispatch: container.dispatch ? (tr) => container.dispatch(tr, editor) : (tr) => editor.update([tr]),
      parent: container,
      state: EditorState.create({
        doc: (() => {
          let prevCode = container.getAttribute("initial-code");
          prevCode ||= container.innerHTML;
          container.innerHTML = "";
          return prevCode;
        })(),
        extensions: [
          theme2.of(
            window.matchMedia("(prefers-color-scheme: dark)").matches ? materialDark : syntaxHighlighting(defaultHighlightStyle)
          ),
          closeBrackets(),
          history(),
          keymap.of([...closeBracketsKeymap, ...historyKeymap, indentWithTab, ...defaultKeymap]),
          lineNumbers(),
          assembly({ debug: true }),
          ...container.hasAttribute("shellcode") ? [ShellcodePlugin] : []
        ]
      })
    });
    editor.contentDOM.setAttribute("data-gramm", "false");
    editors.push(editor);
  }
})();
