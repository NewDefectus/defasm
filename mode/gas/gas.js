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

      var style, cur, ch = stream.next();

      if (ch === lineCommentStartSymbol) {
        stream.skipToEnd();
        return "comment";
      }

      if (ch === '"') {
        nextUntilUnescaped(stream, '"');
        return "string";
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

      if (stream.eat('=')) {
        stream.skipToEnd();
        return "tag";
      }

      if(ch === '(' || ch === ')')
        return "bracket";
      if (ch === '$') {
        if (stream.eat("0") && stream.eat("x")) {
          stream.eatWhile(/[0-9a-fA-F]/);
          return "number";
        }
        if(stream.eat('"'))
        {
          nextUntilUnescaped(stream, '"')
          return "number";
        }
        if(stream.eat("'"))
        {
          nextUntilUnescaped(stream, "'")
          return "number";
        }
        stream.eatWhile(/\d/);
        return "number";
      }

      if (ch === '%') {
        stream.eatWhile(/\w/);
        if (stream.eat(":")) {
          return 'tag';
        }
        cur = stream.current().toLowerCase().slice(1);
        if(registers.hasOwnProperty(cur)) return "variable";
        return null;
      }

     stream.eatWhile(/\w/);
     cur = stream.current().toLowerCase();
     if(labels.has(cur))
     {
       stream.eat(':');
       return "meta";
     }
     if(mnemonics.hasOwnProperty(cur)
     || (suffixes[cur[cur.length - 1]] && mnemonics.hasOwnProperty(cur.slice(0, -1)))) return "keyword";
    },

    lineComment: lineCommentStartSymbol
  };
});

});
