// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: https://codemirror.net/LICENSE

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../lib/codemirror"));
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
"use strict";

CodeMirror.defineMode("gas", function(_config, parserConfig) {
  'use strict';

  var lineCommentStartSymbol = "#";

  // These directives are architecture independent.
  // Machine specific directives should go in their respective
  // architecture initialization function.
  // Reference:
  // http://sourceware.org/binutils/docs/as/Pseudo-Ops.html#Pseudo-Ops

  function nextUntilUnescaped(stream, end) {
    var escaped = false, next;
    while ((next = stream.next()) != null) {
      if (next === end && !escaped) {
        return false;
      }
      escaped = !escaped && next === "\\";
    }
    return escaped;
  }

  return {
    startState: function() {
      return {
        tokenize: null
      };
    },

    token: function(stream, state) {
      if (state.tokenize) {
        return state.tokenize(stream, state);
      }

      if (stream.eatSpace()) {
        return null;
      }

      var cur, ch = stream.next();

      if (ch === lineCommentStartSymbol) {
        stream.skipToEnd();
        return "comment";
      }

      if (ch === '.') {
        stream.eatWhile(/\w/);
        cur = stream.current().toLowerCase();
        if(directives.hasOwnProperty(cur.slice(1)))
        {
          stream.skipToEnd();
          return "builtin";
        }
        
        return null;
      }

      stream.eatWhile(/\s/);

      if (stream.eat('=')) {
        stream.skipToEnd();
        return "tag";
      }
      if (ch === '$') {
        if (stream.eat("0") && stream.eat("x")) {
          stream.eatWhile(/[0-9a-fA-F]/);
          return "number";
        }
        if(stream.eat("'"))
        {
          nextUntilUnescaped(stream, "'")
          return "number";
        }
        stream.eat('-')
        stream.eatWhile(/\d/);
        return "number";
      }

      if (ch === '%') {
        stream.eatWhile(/\w/);
        cur = stream.current().toLowerCase().slice(1);
        if(registers.hasOwnProperty(cur)) return "variable";
        if(cur[0] === 'r')
        {
          cur = cur.slice(1);
          if(parseInt(cur) > 0 && parseInt(cur) < 16 && (!isNaN(cur) || suffixes[cur[cur.length - 1]])) return "variable";
        }
        else
        {
          let max = 32;
          if(cur.startsWith("mm") || cur.startsWith("dr")) cur = cur.slice(2), max = 8;
          else if(cur.startsWith("cr")) cur = cur.slice(2), max = 9;
          else if(cur.startsWith("xmm") || cur.startsWith("ymm") || cur.startsWith("zmm")) cur = cur.slice(3);
          else if(cur.startsWith("bnd")) cur = cur.slice(3), max = 4;
          else if(cur[0] == 'k') cur = cur.slice(1), max = 8;
          if(!isNaN(cur) && (cur = parseInt(cur), cur >= 0 && cur < max)) return "variable";
        }
        return null;
      }

      if(ch === ';')
      {
        return null;
      }

     stream.eatWhile(/\w/);
     cur = stream.current().toLowerCase();
     if(labels.has(cur))
     {
       stream.eat(':');
       return "meta";
     }

     if(prefixes.hasOwnProperty(cur)) return "keyword";

     if(mnemonics.hasOwnProperty(cur)) return "keyword";
     if(cur[0] === 'v') cur = cur.slice(1);
     if(mnemonics.hasOwnProperty(cur) ||
     (suffixes[cur[cur.length - 1]] && mnemonics.hasOwnProperty(cur.slice(0, -1)))) return "keyword";
    },

    lineComment: lineCommentStartSymbol
  };
});

});
