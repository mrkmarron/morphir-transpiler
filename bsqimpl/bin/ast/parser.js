"use strict";
//-------------------------------------------------------------------------------------------------------
// Copyright (C) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE.txt file in the project root for full license information.
//-------------------------------------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
exports.unescapeLiteralString = exports.Parser = exports.ParseError = exports.SourceInfo = void 0;
const parser_env_1 = require("./parser_env");
const type_signature_1 = require("./type_signature");
const body_1 = require("./body");
const assembly_1 = require("./assembly");
const bsqregex_1 = require("./bsqregex");
const KeywordStrings = [
    "recursive?",
    "recursive",
    "_debug",
    "abort",
    "assert",
    "astype",
    "check",
    "concept",
    "const",
    "elif",
    "else",
    "enum",
    "entity",
    "ensures",
    "err",
    "false",
    "field",
    "fn",
    "pred",
    "function",
    "if",
    "invariant",
    "istype",
    "let",
    "match",
    "method",
    "namespace",
    "none",
    "nothing",
    "of",
    "ok",
    "operator",
    "provides",
    "ref",
    "out",
    "out?",
    "release",
    "return",
    "requires",
    "something",
    "spec",
    "switch",
    "test",
    "true",
    "type",
    "typedef",
    "typedecl",
    "using",
    "var",
    "when",
    "yield"
].sort((a, b) => { return (a.length !== b.length) ? (b.length - a.length) : a.localeCompare(b); });
const SymbolStrings = [
    "[",
    "(",
    "{",
    "]",
    ")",
    "}",
    "(|",
    "|)",
    "{|",
    "|}",
    "#",
    "&",
    "&&",
    "@",
    "!",
    "!=",
    "!==",
    ":",
    "::",
    ",",
    ".",
    ".$",
    "...",
    "=",
    "==",
    "===",
    "=>",
    "==>",
    ";",
    "|",
    "||",
    "+",
    "?",
    "<",
    "<=",
    ">",
    ">=",
    "-",
    "->",
    "*",
    "/"
].sort((a, b) => { return (a.length !== b.length) ? (b.length - a.length) : a.localeCompare(b); });
const RegexFollows = new Set([
    "_debug",
    "abort",
    "assert",
    "check",
    "else",
    "ensures",
    "invariant",
    "release",
    "return",
    "requires",
    "test",
    "validate",
    "when",
    "yield",
    "[",
    "(",
    "(|",
    "{|",
    "&",
    "&&",
    "!",
    "!=",
    ",",
    "=",
    "==",
    "=>",
    "==>",
    "?",
    "|",
    "||",
    "+",
    "<",
    "<=",
    ">",
    ">=",
    "-",
    "*",
    "/"
]);
const LeftScanParens = ["[", "(", "{", "(|", "{|"];
const RightScanParens = ["]", ")", "}", "|)", "|}"];
const AttributeStrings = [
    "algebraic",
    "orderable",
    "entrypoint",
    "hidden",
    "private",
    "factory",
    "virtual",
    "abstract",
    "override",
    "recursive?",
    "recursive",
    "derived",
    "lazy",
    "memoized",
    "interned",
    "inline",
    "prefix",
    "infix",
    "dynamic",
    "__internal",
    "__typedeclable",
    "__constructable",
    "__primitive",
    "__safe",
    "__assume_safe",
    "__universal"
];
const UnsafeFieldNames = ["is", "as", "isNone", "isSome", "asTry", "asOrNone", "asOptional", "asResult", "hasProperty", "getPropertyOrNone", "getPropertyOption", "getPropertyTry"];
const TokenStrings = {
    Clear: "[CLEAR]",
    Error: "[ERROR]",
    Numberino: "[LITERAL_NUMBERINO]",
    Int: "[LITERAL_INT]",
    Nat: "[LITERAL_NAT]",
    Float: "[LITERAL_FLOAT]",
    Decimal: "[LITERAL_DECIMAL]",
    BigInt: "[LITERAL_BIGINT]",
    BigNat: "[LITERAL_BIGNAT]",
    Rational: "[LITERAL_RATIONAL]",
    String: "[LITERAL_STRING]",
    Regex: "[LITERAL_REGEX]",
    TypedString: "[LITERAL_TYPED_STRING]",
    //Names
    Namespace: "[NAMESPACE]",
    Type: "[TYPE]",
    Template: "[TEMPLATE]",
    Identifier: "[IDENTIFIER]",
    Operator: "[OPERATOR]",
    EndOfStream: "[EOS]"
};
class Token {
    constructor(line, column, cpos, span, kind, data) {
        this.line = line;
        this.column = column;
        this.pos = cpos;
        this.span = span;
        this.kind = kind;
        this.data = data;
    }
}
class SourceInfo {
    constructor(line, column, cpos, span) {
        this.line = line;
        this.column = column;
        this.pos = cpos;
        this.span = span;
    }
}
exports.SourceInfo = SourceInfo;
function unescapeLiteralString(str) {
    let rs = str
        .replace(/\\0/g, "\0")
        .replace(/\\'/g, "'")
        .replace(/\\"/g, "\"")
        .replace(/\\n/g, "\n")
        .replace(/\\r/g, "\r")
        .replace(/\\t/g, "\t");
    return rs.replace(/\\\\/g, "\\");
}
exports.unescapeLiteralString = unescapeLiteralString;
class Lexer {
    constructor(input, macrodefs) {
        this.m_macrodefs = macrodefs;
        this.m_input = input;
        this.m_internTable = new Map();
        this.m_cline = 1;
        this.m_linestart = 0;
        this.m_cpos = 0;
        this.m_tokens = [];
    }
    static findKeywordString(str) {
        let imin = 0;
        let imax = KeywordStrings.length;
        while (imin < imax) {
            const imid = Math.floor((imin + imax) / 2);
            const scmpval = (str.length !== KeywordStrings[imid].length) ? (KeywordStrings[imid].length - str.length) : str.localeCompare(KeywordStrings[imid]);
            if (scmpval === 0) {
                return KeywordStrings[imid];
            }
            else if (scmpval < 0) {
                imax = imid;
            }
            else {
                imin = imid + 1;
            }
        }
        return undefined;
    }
    ////
    //Helpers
    static isNamespaceName(str) {
        return /^NS/.test(str);
    }
    static isTypenameName(str) {
        return str.length > 1 && !/^NS/.test(str) && /^[A-Z]/.test(str);
    }
    static isTemplateName(str) {
        return str.length === 1 && /^[A-Z]$/.test(str);
    }
    //TODO: we need to make sure that someone doesn't name a local variable "_"
    static isIdentifierName(str) {
        return /^([$]?([_a-zA-Z]|([_a-zA-Z][_a-zA-Z0-9]*[a-zA-Z0-9])))$/.test(str);
    }
    recordLexToken(epos, kind) {
        this.m_tokens.push(new Token(this.m_cline, this.m_cpos - this.m_linestart, this.m_cpos, epos - this.m_cpos, kind, kind)); //set data to kind string
        this.m_cpos = epos;
    }
    recordLexTokenWData(epos, kind, data) {
        const rdata = this.m_internTable.get(data) || this.m_internTable.set(data, data).get(data);
        this.m_tokens.push(new Token(this.m_cline, this.m_cpos - this.m_linestart, this.m_cpos, epos - this.m_cpos, kind, rdata));
        this.m_cpos = epos;
    }
    tryLexWS() {
        Lexer._s_whitespaceRe.lastIndex = this.m_cpos;
        const m = Lexer._s_whitespaceRe.exec(this.m_input);
        if (m === null) {
            return false;
        }
        for (let i = 0; i < m[0].length; ++i) {
            if (m[0][i] === "\n") {
                this.m_cline++;
                this.m_linestart = this.m_cpos + i + 1;
            }
        }
        this.m_cpos += m[0].length;
        return true;
    }
    tryLexComment() {
        Lexer._s_commentRe.lastIndex = this.m_cpos;
        const m = Lexer._s_commentRe.exec(this.m_input);
        if (m === null) {
            return false;
        }
        for (let i = 0; i < m[0].length; ++i) {
            if (m[0][i] === "\n") {
                this.m_cline++;
                this.m_linestart = this.m_cpos + i + 1;
            }
        }
        this.m_cpos += m[0].length;
        return true;
    }
    tryLexNumber() {
        Lexer._s_rationalRe.lastIndex = this.m_cpos;
        const mr = Lexer._s_rationalRe.exec(this.m_input);
        if (mr !== null) {
            this.recordLexTokenWData(this.m_cpos + mr[0].length, TokenStrings.Rational, mr[0]);
            return true;
        }
        Lexer._s_bignatRe.lastIndex = this.m_cpos;
        const mbn = Lexer._s_bignatRe.exec(this.m_input);
        if (mbn !== null) {
            this.recordLexTokenWData(this.m_cpos + mbn[0].length, TokenStrings.BigNat, mbn[0]);
            return true;
        }
        Lexer._s_bigintRe.lastIndex = this.m_cpos;
        const mbi = Lexer._s_bigintRe.exec(this.m_input);
        if (mbi !== null) {
            this.recordLexTokenWData(this.m_cpos + mbi[0].length, TokenStrings.BigInt, mbi[0]);
            return true;
        }
        Lexer._s_decimalRe.lastIndex = this.m_cpos;
        const md = Lexer._s_decimalRe.exec(this.m_input);
        if (md !== null) {
            this.recordLexTokenWData(this.m_cpos + md[0].length, TokenStrings.Decimal, md[0]);
            return true;
        }
        Lexer._s_floatRe.lastIndex = this.m_cpos;
        const mf = Lexer._s_floatRe.exec(this.m_input);
        if (mf !== null) {
            this.recordLexTokenWData(this.m_cpos + mf[0].length, TokenStrings.Float, mf[0]);
            return true;
        }
        Lexer._s_natRe.lastIndex = this.m_cpos;
        const mn = Lexer._s_natRe.exec(this.m_input);
        if (mn !== null) {
            this.recordLexTokenWData(this.m_cpos + mn[0].length, TokenStrings.Nat, mn[0]);
            return true;
        }
        Lexer._s_intRe.lastIndex = this.m_cpos;
        const mi = Lexer._s_intRe.exec(this.m_input);
        if (mi !== null) {
            this.recordLexTokenWData(this.m_cpos + mi[0].length, TokenStrings.Int, mi[0]);
            return true;
        }
        Lexer._s_numberinoRe.lastIndex = this.m_cpos;
        const mnio = Lexer._s_numberinoRe.exec(this.m_input);
        if (mnio !== null) {
            this.recordLexTokenWData(this.m_cpos + mnio[0].length, TokenStrings.Numberino, mnio[0]);
            return true;
        }
        return false;
    }
    tryLexString() {
        Lexer._s_stringRe.lastIndex = this.m_cpos;
        const ms = Lexer._s_stringRe.exec(this.m_input);
        if (ms !== null) {
            this.recordLexTokenWData(this.m_cpos + ms[0].length, TokenStrings.String, ms[0]);
            return true;
        }
        Lexer._s_typedStringRe.lastIndex = this.m_cpos;
        const mts = Lexer._s_typedStringRe.exec(this.m_input);
        if (mts !== null) {
            this.recordLexTokenWData(this.m_cpos + mts[0].length, TokenStrings.TypedString, mts[0]);
            return true;
        }
        return false;
    }
    tryLexRegex() {
        Lexer._s_regexRe.lastIndex = this.m_cpos;
        const ms = Lexer._s_regexRe.exec(this.m_input);
        if (ms !== null && RegexFollows.has(this.m_tokens[this.m_tokens.length - 1].kind)) {
            this.recordLexTokenWData(this.m_cpos + ms[0].length, TokenStrings.Regex, ms[0]);
            return true;
        }
        return false;
    }
    tryLexSymbol() {
        Lexer._s_symbolRe.lastIndex = this.m_cpos;
        const ms = Lexer._s_symbolRe.exec(this.m_input);
        if (ms === null) {
            return false;
        }
        const sym = SymbolStrings.find((value) => ms[0].startsWith(value));
        if (sym !== undefined) {
            this.recordLexToken(this.m_cpos + sym.length, sym);
            return true;
        }
        Lexer._s_operatorRe.lastIndex = this.m_cpos;
        const mo = Lexer._s_operatorRe.exec(this.m_input);
        if (mo !== null) {
            const oper = mo[0];
            this.recordLexTokenWData(this.m_cpos + oper.length, TokenStrings.Operator, oper);
            return true;
        }
        return false;
    }
    tryLexName() {
        Lexer._s_nameRe.lastIndex = this.m_cpos;
        const m = Lexer._s_nameRe.exec(this.m_input);
        if (m === null) {
            return false;
        }
        const name = m[0];
        const kwmatch = Lexer.findKeywordString(name);
        if (kwmatch) {
            this.recordLexToken(this.m_cpos + name.length, kwmatch);
            return true;
        }
        else if (Lexer.isNamespaceName(name)) {
            this.recordLexTokenWData(this.m_cpos + name.length, TokenStrings.Namespace, name);
            return true;
        }
        else if (Lexer.isTypenameName(name)) {
            this.recordLexTokenWData(this.m_cpos + name.length, TokenStrings.Type, name);
            return true;
        }
        else if (Lexer.isTemplateName(name)) {
            this.recordLexTokenWData(this.m_cpos + name.length, TokenStrings.Template, name);
            return true;
        }
        else if (Lexer.isIdentifierName(name)) {
            const isTypeThing = /^_[A-Z]/.test(name);
            if (isTypeThing) {
                this.recordLexTokenWData(this.m_cpos + 1, TokenStrings.Identifier, "_");
            }
            else {
                this.recordLexTokenWData(this.m_cpos + name.length, TokenStrings.Identifier, name);
            }
            return true;
        }
        else {
            this.recordLexToken(this.m_cpos + name.length, TokenStrings.Error);
            return false;
        }
    }
    static isAttributeKW(str) {
        return AttributeStrings.indexOf(str) !== -1;
    }
    tryLexMacroOp() {
        Lexer._s_macroRe.lastIndex = this.m_cpos;
        const m = Lexer._s_macroRe.exec(this.m_input);
        if (m === null) {
            return undefined;
        }
        const name = m[0].trim();
        this.m_cpos += m[0].length;
        if (name.slice(0, "#if".length) === "#if") {
            return ["#if", name.slice("#if".length).trim()];
        }
        else {
            return [name, undefined];
        }
    }
    lex() {
        if (this.m_tokens.length !== 0) {
            return this.m_tokens;
        }
        let mode = "normal";
        let macrostack = [];
        this.m_tokens = [];
        while (this.m_cpos < this.m_input.length) {
            if (mode === "scan") {
                const macro = this.tryLexMacroOp();
                if (macro !== undefined) {
                    if (macro[0] === "#if") {
                        macrostack.push("scan");
                    }
                    else if (macro[0] === "#else") {
                        mode = "normal";
                    }
                    else {
                        mode = macrostack.pop();
                    }
                }
                else {
                    const nexthash = this.m_input.indexOf("#", this.m_cpos + 1);
                    if (nexthash === -1) {
                        //ended in dangling macro
                        this.recordLexToken(this.m_input.length, TokenStrings.Error);
                        this.m_cpos = this.m_input.length;
                    }
                    else {
                        const skips = this.m_input.slice(this.m_cpos, nexthash);
                        for (let i = 0; i < skips.length; ++i) {
                            if (skips[i] === "\n") {
                                this.m_cline++;
                                this.m_linestart = this.m_cpos + i + 1;
                            }
                        }
                        this.m_cpos = nexthash;
                    }
                }
            }
            else {
                const macro = this.tryLexMacroOp();
                if (macro !== undefined) {
                    if (macro[0] === "#if") {
                        macrostack.push("normal");
                        if (this.m_macrodefs.includes(macro[1])) {
                            mode = "normal";
                        }
                        else {
                            mode = "scan";
                        }
                    }
                    else if (macro[0] === "#else") {
                        mode = "scan";
                    }
                    else {
                        mode = macrostack.pop();
                    }
                }
                else {
                    if (this.tryLexWS() || this.tryLexComment()) {
                        //continue
                    }
                    else if (this.tryLexNumber() || this.tryLexString() || this.tryLexRegex() || this.tryLexSymbol() || this.tryLexName()) {
                        //continue
                    }
                    else {
                        this.recordLexToken(this.m_cpos + 1, TokenStrings.Error);
                    }
                }
            }
        }
        this.recordLexToken(this.m_input.length, TokenStrings.EndOfStream);
        return this.m_tokens;
    }
}
Lexer._s_whitespaceRe = /\s+/y;
Lexer._s_commentRe = /(\/\/.*)|(\/\*(.|\s)*?\*\/)/uy;
Lexer._s_numberinoRe = /(0|[1-9][0-9]*)|([0-9]+\.[0-9]+)([eE][-+]?[0-9]+)?/y;
Lexer._s_intRe = /(0|[1-9][0-9]*)i/y;
Lexer._s_natRe = /(0|[1-9][0-9]*)n/y;
Lexer._s_floatRe = /([0-9]+\.[0-9]+)([eE][-+]?[0-9]+)?f/y;
Lexer._s_decimalRe = /([0-9]+\.[0-9]+)([eE][-+]?[0-9]+)?d/y;
Lexer._s_bigintRe = /(0|[1-9][0-9]*)I/y;
Lexer._s_bignatRe = /(0|[1-9][0-9]*)N/y;
Lexer._s_rationalRe = /((0|[1-9][0-9]*)|(0|[1-9][0-9]*)\/([1-9][0-9]*))R/y;
Lexer._s_stringRe = /"[^"\\\r\n]*(\\(.|\r?\n)[^"\\\r\n]*)*"/uy;
Lexer._s_typedStringRe = /'[^'\\\r\n]*(\\(.|\r?\n)[^'\\\r\n]*)*'/uy;
Lexer._s_regexRe = /\/[^"\\\r\n]*(\\(.)[^"\\\r\n]*)*\//y;
Lexer._s_symbolRe = /[\W]+/y;
Lexer._s_operatorRe = /_([\\a-zA-Z0-9]+)_/y;
Lexer._s_nameRe = /(recursive\?)|(out\?)|([$]?\w+)/y;
Lexer._s_macroRe = /(#if[ ]+([A-Z][_A-Z0-9]*)|#else|#endif)/y;
class ParseError extends Error {
    constructor(line, message) {
        super(`Parse failure on line ${line} -- ${message}`);
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
exports.ParseError = ParseError;
var InvokableKind;
(function (InvokableKind) {
    InvokableKind[InvokableKind["Basic"] = 0] = "Basic";
    InvokableKind[InvokableKind["Member"] = 1] = "Member";
    InvokableKind[InvokableKind["PCodeFn"] = 2] = "PCodeFn";
    InvokableKind[InvokableKind["PCodePred"] = 3] = "PCodePred";
    InvokableKind[InvokableKind["StaticOperator"] = 4] = "StaticOperator";
    InvokableKind[InvokableKind["DynamicOperator"] = 5] = "DynamicOperator";
})(InvokableKind || (InvokableKind = {}));
class Parser {
    constructor(assembly, srcFileNames) {
        this.m_tokens = [];
        this.m_cpos = 0;
        this.m_epos = 0;
        this.m_penv = new parser_env_1.ParserEnvironment(assembly);
        this.m_errors = [];
        this.m_recoverStack = [];
        this.sortedSrcFiles = srcFileNames.sort((a, b) => a.fullname.localeCompare(b.fullname));
    }
    initialize(toks) {
        this.m_tokens = toks;
        this.m_cpos = 0;
        this.m_epos = toks.length;
    }
    ////
    //Helpers
    generateBodyID(sinfo, srcFile, etag) {
        //Keep consistent with version in type checker!!!
        const sfpos = this.sortedSrcFiles.findIndex((entry) => entry.fullname === srcFile);
        return `${this.sortedSrcFiles[sfpos].shortname}#k${sfpos}${etag !== undefined ? ("_" + etag) : ""}::${sinfo.line}@${sinfo.pos}`;
    }
    static attributeSetContains(attr, attribs) {
        return attribs.indexOf(attr) !== -1;
    }
    getCurrentLine() {
        return this.m_tokens[this.m_cpos].line;
    }
    getCurrentSrcInfo() {
        const tk = this.m_tokens[this.m_cpos];
        return new SourceInfo(tk.line, 0, tk.pos, tk.span);
    }
    setRecover(pos) {
        this.m_recoverStack.push(pos);
    }
    clearRecover(pos) {
        this.m_recoverStack.pop();
    }
    processRecover() {
        this.m_cpos = this.m_recoverStack.pop();
    }
    raiseError(line, msg) {
        this.m_errors.push([this.m_penv.getCurrentFile(), line, msg]);
        throw new ParseError(line, msg);
    }
    scanMatchingParens(lp, rp, sindex) {
        let pscount = 1;
        for (let pos = this.m_cpos + (sindex || 0) + 1; pos < this.m_epos; ++pos) {
            const tok = this.m_tokens[pos];
            if (tok.kind === lp) {
                pscount++;
            }
            else if (tok.kind === rp) {
                pscount--;
            }
            else {
                //nop
            }
            if (pscount === 0) {
                return pos + 1;
            }
        }
        return this.m_epos;
    }
    scanCodeParens() {
        let pscount = 1;
        for (let pos = this.m_cpos + 1; pos < this.m_epos; ++pos) {
            const tok = this.m_tokens[pos];
            if (LeftScanParens.indexOf(tok.kind) !== -1) {
                pscount++;
            }
            else if (RightScanParens.indexOf(tok.kind) !== -1) {
                pscount--;
            }
            else {
                //nop
            }
            if (pscount === 0) {
                return pos + 1;
            }
        }
        return this.m_epos;
    }
    setNamespaceAndFile(ns, file) {
        this.m_penv.setNamespaceAndFile(ns, file);
    }
    peekToken(pos) {
        return this.m_tokens[this.m_cpos + (pos || 0)].kind;
    }
    peekTokenData(pos) {
        return this.m_tokens[this.m_cpos + (pos || 0)].data;
    }
    testToken(kind) {
        return (this.m_cpos !== this.m_epos) && this.m_tokens[this.m_cpos].kind === kind;
    }
    testFollows(...kinds) {
        for (let i = 0; i < kinds.length; ++i) {
            if (this.m_cpos + i === this.m_epos || this.m_tokens[this.m_cpos + i].kind !== kinds[i]) {
                return false;
            }
        }
        return true;
    }
    consumeToken() {
        this.m_cpos++;
    }
    consumeTokenIf(kind) {
        if (this.testToken(kind)) {
            this.consumeToken();
        }
    }
    testAndConsumeTokenIf(kind) {
        const test = this.testToken(kind);
        if (test) {
            this.consumeToken();
        }
        return test;
    }
    consumeTokenAndGetValue() {
        const td = this.m_tokens[this.m_cpos].data;
        this.consumeToken();
        return td;
    }
    ensureToken(kind) {
        if (!this.testToken(kind)) {
            const found = this.m_tokens[this.m_cpos].data || this.m_tokens[this.m_cpos].kind;
            this.raiseError(this.m_tokens[this.m_cpos].line, `Expected "${kind}" but found "${found}"`);
        }
    }
    ensureAndConsumeToken(kind) {
        this.ensureToken(kind);
        this.consumeToken();
    }
    ensureNotToken(kind) {
        if (this.testToken(kind)) {
            this.raiseError(this.m_tokens[this.m_cpos].line, `Token "${kind}" is not allowed`);
        }
    }
    scanToken(tok) {
        let pos = this.m_cpos;
        while (pos !== this.m_epos) {
            if (this.m_tokens[pos].kind === tok) {
                return pos;
            }
            pos++;
        }
        return this.m_epos;
    }
    scanTokenOptions(...toks) {
        let pos = this.m_cpos;
        while (pos !== this.m_epos) {
            if (toks.indexOf(this.m_tokens[pos].kind) !== -1) {
                return pos;
            }
            pos++;
        }
        return this.m_epos;
    }
    parseListOf(start, end, sep, fn, specialToken) {
        let specialFound = false;
        let result = [];
        this.ensureAndConsumeToken(start);
        while (!this.testAndConsumeTokenIf(end)) {
            if (specialToken !== undefined && this.testAndConsumeTokenIf(specialToken)) {
                specialFound = true;
                this.ensureToken(end);
            }
            else {
                result.push(fn());
            }
            if (this.testAndConsumeTokenIf(sep)) {
                this.ensureNotToken(end);
            }
            else {
                this.ensureToken(end);
            }
        }
        return [result, specialFound];
    }
    parseEphemeralListOf(fn) {
        let result = [];
        while (true) {
            result.push(fn());
            if (!this.testAndConsumeTokenIf(",")) {
                break;
            }
        }
        return result;
    }
    parseBuildInfo(cb) {
        if (this.testToken("spec") || this.testToken("debug") || this.testToken("test") || this.testToken("release")) {
            return this.consumeTokenAndGetValue();
        }
        else {
            return cb;
        }
    }
    ////
    //Misc parsing
    parseInvokableCommon(ikind, noBody, attributes, isrecursive, terms, termRestrictions, optSelfRef, optSelfType) {
        const sinfo = this.getCurrentSrcInfo();
        const srcFile = this.m_penv.getCurrentFile();
        const line = this.getCurrentLine();
        const bodyid = this.generateBodyID(sinfo, srcFile);
        let fparams = [];
        if (ikind === InvokableKind.Member) {
            fparams.push(new type_signature_1.FunctionParameter("this", optSelfType, false, optSelfRef, undefined, undefined));
        }
        let restName = undefined;
        let restType = undefined;
        let resultInfo = this.m_penv.SpecialAutoSignature;
        const params = this.parseListOf("(", ")", ",", () => {
            const isrest = this.testAndConsumeTokenIf("...");
            let rref = undefined;
            if (this.testToken("ref") || this.testToken("out") || this.testToken("out?")) {
                rref = this.consumeTokenAndGetValue();
            }
            this.ensureToken(TokenStrings.Identifier);
            const pname = this.consumeTokenAndGetValue();
            const isopt = this.testAndConsumeTokenIf("?");
            let argtype = this.m_penv.SpecialAutoSignature;
            if (this.testAndConsumeTokenIf(":")) {
                argtype = this.parseTypeSignature();
            }
            else {
                if (ikind !== InvokableKind.PCodeFn && ikind !== InvokableKind.PCodePred) {
                    this.raiseError(line, "Auto typing is not supported for this");
                }
            }
            if (rref !== undefined && (isopt || isrest)) {
                this.raiseError(line, "Cannot use ref parameters here");
            }
            let defaultexp = undefined;
            if (isopt && this.testAndConsumeTokenIf("=")) {
                defaultexp = this.parseConstExpression(true);
            }
            let litexp = undefined;
            if (this.testAndConsumeTokenIf("==")) {
                if (ikind !== InvokableKind.DynamicOperator) {
                    this.raiseError(line, "Literal match parameters are only allowed on dynamic operator definitions");
                }
                litexp = this.parseLiteralExpression();
            }
            if (ikind === InvokableKind.DynamicOperator || ikind === InvokableKind.StaticOperator) {
                if (isopt || isrest) {
                    this.raiseError(line, "Cannot use opt or rest parameters in operators");
                }
            }
            return [pname, argtype, isopt, isrest, rref, defaultexp, litexp];
        })[0];
        for (let i = 0; i < params.length; i++) {
            if (!params[i][3]) {
                fparams.push(new type_signature_1.FunctionParameter(params[i][0], params[i][1], params[i][2], params[i][4], params[i][5], params[i][6]));
            }
            else {
                if (i + 1 !== params.length) {
                    this.raiseError(line, "Rest parameter must be last in parameter list");
                }
                restName = params[i][0];
                restType = params[i][1];
            }
        }
        if (restName !== undefined && params.some((p) => p[2])) {
            this.raiseError(line, "Cannot have optional and rest parameters in a function");
        }
        const allTypedParams = params.every((param) => !(param[1] instanceof type_signature_1.AutoTypeSignature));
        if (this.testAndConsumeTokenIf(":")) {
            resultInfo = this.parseResultType(false);
        }
        else {
            if (ikind === InvokableKind.PCodePred && allTypedParams) {
                resultInfo = new type_signature_1.NominalTypeSignature("NSCore", ["Bool"]);
            }
            if (ikind !== InvokableKind.PCodeFn && ikind !== InvokableKind.PCodePred) {
                if (!params.some((p) => p[4])) {
                    this.raiseError(line, "Cannot have void return unless one of the params is by-ref");
                }
                resultInfo = this.m_penv.SpecialNoneSignature; //void conversion
            }
        }
        const argNames = new Set([...(restName ? [restName] : []), ...fparams.map((param) => param.name)]);
        let preconds = [];
        let postconds = [];
        let body = undefined;
        let captured = new Set();
        if (noBody) {
            this.ensureAndConsumeToken(";");
        }
        else {
            if (ikind === InvokableKind.PCodeFn || ikind === InvokableKind.PCodePred) {
                this.ensureAndConsumeToken("=>");
            }
            else {
                [preconds, postconds] = this.parsePreAndPostConditions(sinfo, argNames, resultInfo);
            }
            try {
                this.m_penv.pushFunctionScope(new parser_env_1.FunctionScope(argNames, resultInfo, ikind === InvokableKind.PCodeFn || ikind === InvokableKind.PCodePred));
                body = this.parseBody(bodyid, srcFile);
                captured = this.m_penv.getCurrentFunctionScope().getCaptureVars();
                this.m_penv.popFunctionScope();
            }
            catch (ex) {
                this.m_penv.popFunctionScope();
                throw ex;
            }
        }
        if (ikind === InvokableKind.PCodeFn || ikind === InvokableKind.PCodePred) {
            const bbody = body;
            return assembly_1.InvokeDecl.createPCodeInvokeDecl(sinfo, bodyid, srcFile, attributes, isrecursive, fparams, restName, restType, resultInfo, captured, bbody.impl, ikind === InvokableKind.PCodeFn, ikind === InvokableKind.PCodePred);
        }
        else {
            if (body !== undefined) {
                return assembly_1.InvokeDecl.createStandardInvokeDecl(sinfo, bodyid, srcFile, attributes, isrecursive, terms, termRestrictions, fparams, restName, restType, resultInfo, preconds, postconds, body.impl, body.optscalarslots, body.optmixedslots);
            }
            else {
                return assembly_1.InvokeDecl.createStandardInvokeDecl(sinfo, bodyid, srcFile, attributes, isrecursive, terms, termRestrictions, fparams, restName, restType, resultInfo, preconds, postconds, undefined, [], []);
            }
        }
    }
    ////
    //Type parsing
    parseResultType(parensreq) {
        if (this.testAndConsumeTokenIf("(|")) {
            const decls = this.parseEphemeralListOf(() => {
                const tdecl = this.parseTypeSignature();
                return tdecl;
            });
            this.ensureAndConsumeToken("|)");
            return new type_signature_1.EphemeralListTypeSignature(decls);
        }
        else {
            if (parensreq) {
                return this.parseTypeSignature();
            }
            else {
                const decls = this.parseEphemeralListOf(() => {
                    const tdecl = this.parseTypeSignature();
                    return tdecl;
                });
                return decls.length === 1 ? decls[0] : new type_signature_1.EphemeralListTypeSignature(decls);
            }
        }
    }
    parseTypeSignature() {
        return this.parseOrCombinatorType();
    }
    parseOrCombinatorType() {
        const ltype = this.parsePostfixTypeReference();
        if (!this.testToken("|")) {
            return ltype;
        }
        else {
            this.consumeToken();
            return Parser.orOfTypeSignatures(ltype, this.parseOrCombinatorType());
        }
    }
    parsePostfixTypeReference() {
        let roottype = this.parseCombineCombinatorType();
        while (this.testToken("?")) {
            roottype = this.parseNoneableType(roottype);
        }
        return roottype;
    }
    parseNoneableType(basetype) {
        this.ensureAndConsumeToken("?");
        return Parser.orOfTypeSignatures(basetype, this.m_penv.SpecialNoneSignature);
    }
    parseCombineCombinatorType() {
        const ltype = this.parseProjectType();
        if (!this.testToken("&") && !this.testToken("+")) {
            return ltype;
        }
        else {
            if (this.testToken("&")) {
                this.consumeToken();
                return this.andOfTypeSignatures(ltype, this.parseCombineCombinatorType());
            }
            else {
                this.consumeToken();
                return this.plusOfTypeSignatures(ltype, this.parseCombineCombinatorType());
            }
        }
    }
    parseProjectType() {
        const ltype = this.parseBaseTypeReference();
        if (!this.testToken("!")) {
            return ltype;
        }
        else {
            this.consumeToken();
            const ptype = this.parseNominalType();
            return new type_signature_1.ProjectTypeSignature(ltype, ptype);
        }
    }
    parseBaseTypeReference() {
        switch (this.peekToken()) {
            case TokenStrings.Template:
                return this.parseTemplateTypeReference();
            case TokenStrings.Namespace:
            case TokenStrings.Type:
                return this.parseNominalType();
            case "[":
                return this.parseTupleType();
            case "{":
                return this.parseRecordType();
            case "fn":
            case "pred":
            case "recursive?":
            case "recursive":
                return this.parsePCodeType();
            default: {
                this.ensureAndConsumeToken("(");
                const ptype = this.parseTypeSignature();
                this.ensureAndConsumeToken(")");
                return ptype;
            }
        }
    }
    parseTemplateTypeReference() {
        return new type_signature_1.TemplateTypeSignature(this.consumeTokenAndGetValue());
    }
    parseTermList() {
        let terms = [];
        if (this.testToken("<")) {
            try {
                this.setRecover(this.scanMatchingParens("<", ">"));
                terms = this.parseListOf("<", ">", ",", () => {
                    return this.parseTypeSignature();
                })[0];
                this.clearRecover();
            }
            catch (ex) {
                this.processRecover();
            }
        }
        return terms;
    }
    parseNominalType() {
        let ns = undefined;
        if (this.testToken(TokenStrings.Namespace)) {
            ns = this.consumeTokenAndGetValue();
            this.ensureAndConsumeToken("::");
        }
        const tname = this.consumeTokenAndGetValue();
        ns = this.m_penv.tryResolveNamespace(ns, tname);
        if (ns === undefined) {
            ns = "[Unresolved Error]";
        }
        let tnames = [tname];
        let terms = this.parseTermList();
        while (this.testFollows("::", TokenStrings.Type)) {
            this.ensureAndConsumeToken("::");
            this.ensureToken(TokenStrings.Type);
            const stname = this.consumeTokenAndGetValue();
            tnames.push(stname);
            const sterms = this.parseTermList();
            terms = [...terms, ...sterms];
        }
        return new type_signature_1.NominalTypeSignature(ns, tnames, terms);
    }
    parseTupleType() {
        let entries = [];
        try {
            this.setRecover(this.scanMatchingParens("[", "]"));
            entries = this.parseListOf("[", "]", ",", () => {
                const rtype = this.parseTypeSignature();
                return rtype;
            })[0];
            this.clearRecover();
            return new type_signature_1.TupleTypeSignature(entries);
        }
        catch (ex) {
            this.processRecover();
            return new type_signature_1.ParseErrorTypeSignature();
        }
    }
    parseRecordType() {
        let entries = [];
        try {
            this.setRecover(this.scanMatchingParens("{", "}"));
            let pnames = new Set();
            entries = this.parseListOf("{", "}", ",", () => {
                this.ensureToken(TokenStrings.Identifier);
                const name = this.consumeTokenAndGetValue();
                if (UnsafeFieldNames.includes(name)) {
                    this.raiseError(this.getCurrentLine(), `Property name "${name}" is ambigious with the methods that Record may provide`);
                }
                if (pnames.has(name)) {
                    this.raiseError(this.getCurrentLine(), `Duplicate property name "${name}" in record declaration`);
                }
                pnames.add(name);
                this.ensureAndConsumeToken(":");
                const rtype = this.parseTypeSignature();
                return [name, rtype];
            })[0];
            this.clearRecover();
            return new type_signature_1.RecordTypeSignature(entries);
        }
        catch (ex) {
            this.processRecover();
            return new type_signature_1.ParseErrorTypeSignature();
        }
    }
    parsePCodeType() {
        let recursive = "no";
        if (this.testAndConsumeTokenIf("recursive?")) {
            recursive = "cond";
        }
        if (this.testAndConsumeTokenIf("recursive")) {
            recursive = "yes";
        }
        const ispred = this.testToken("pred");
        this.consumeToken();
        try {
            this.setRecover(this.scanMatchingParens("(", ")"));
            let fparams = [];
            let restName = undefined;
            let restType = undefined;
            const params = this.parseListOf("(", ")", ",", () => {
                const isrest = this.testAndConsumeTokenIf("...");
                let rref = undefined;
                if (this.testToken("ref") || this.testToken("out") || this.testToken("out?")) {
                    rref = this.consumeTokenAndGetValue();
                }
                this.ensureToken(TokenStrings.Identifier);
                const pname = this.consumeTokenAndGetValue();
                const isopt = this.testAndConsumeTokenIf("?");
                this.ensureAndConsumeToken(":");
                const argtype = this.parseTypeSignature();
                if (rref !== undefined && (isopt || isrest)) {
                    this.raiseError(this.getCurrentLine(), "Cannot use ref/borrow parameters here");
                }
                return [pname, argtype, isopt, isrest, rref];
            })[0];
            for (let i = 0; i < params.length; i++) {
                if (!params[i][3]) {
                    fparams.push(new type_signature_1.FunctionParameter(params[i][0], params[i][1], params[i][2], params[i][4], undefined, undefined));
                }
                else {
                    if (i + 1 !== params.length) {
                        this.raiseError(this.getCurrentLine(), "Rest parameter must be last in parameter list");
                    }
                    restName = params[i][0];
                    restType = params[i][1];
                }
            }
            if (restName !== undefined && params.some((p) => p[2])) {
                this.raiseError(this.getCurrentLine(), "Cannot have optional and rest parameters in a function type");
            }
            this.ensureAndConsumeToken("->");
            const resultInfo = this.parseResultType(true);
            this.clearRecover();
            return new type_signature_1.FunctionTypeSignature(recursive, fparams, restName, restType, resultInfo, ispred);
        }
        catch (ex) {
            this.processRecover();
            return new type_signature_1.ParseErrorTypeSignature();
        }
    }
    static orOfTypeSignatures(t1, t2) {
        const types = [
            ...((t1 instanceof type_signature_1.UnionTypeSignature) ? t1.types : [t1]),
            ...((t2 instanceof type_signature_1.UnionTypeSignature) ? t2.types : [t2]),
        ];
        return new type_signature_1.UnionTypeSignature(types);
    }
    andOfTypeSignatures(t1, t2) {
        if (t1 instanceof type_signature_1.PlusTypeSignature || t2 instanceof type_signature_1.PlusTypeSignature) {
            this.raiseError(this.getCurrentLine(), "Cannot mix & and + type combiners");
        }
        const types = [
            ...((t1 instanceof type_signature_1.AndTypeSignature) ? t1.types : [t1]),
            ...((t2 instanceof type_signature_1.AndTypeSignature) ? t2.types : [t2]),
        ];
        return new type_signature_1.AndTypeSignature(types);
    }
    plusOfTypeSignatures(t1, t2) {
        if (t1 instanceof type_signature_1.AndTypeSignature || t2 instanceof type_signature_1.AndTypeSignature) {
            this.raiseError(this.getCurrentLine(), "Cannot mix & and + type combiners");
        }
        const types = [
            ...((t1 instanceof type_signature_1.PlusTypeSignature) ? t1.types : [t1]),
            ...((t2 instanceof type_signature_1.PlusTypeSignature) ? t2.types : [t2]),
        ];
        return new type_signature_1.PlusTypeSignature(types);
    }
    ////
    //Expression parsing
    parseArguments(lparen, rparen) {
        const argSrcInfo = this.getCurrentSrcInfo();
        let seenNames = new Set();
        let args = [];
        try {
            this.setRecover(this.scanMatchingParens(lparen, rparen));
            this.ensureAndConsumeToken(lparen);
            while (!this.testAndConsumeTokenIf(rparen)) {
                const line = this.getCurrentLine();
                let rref = undefined;
                if (this.testToken("ref") || this.testToken("out") || this.testToken("out?")) {
                    rref = this.consumeTokenAndGetValue();
                }
                if (this.testFollows(TokenStrings.Identifier, "=")) {
                    const name = this.consumeTokenAndGetValue();
                    this.ensureAndConsumeToken("=");
                    let exp = this.parseExpression();
                    if (seenNames.has(name)) {
                        this.raiseError(line, "Cannot have duplicate named argument name");
                    }
                    if (name === "_") {
                        this.raiseError(line, `"_" is not a valid named parameter name`);
                    }
                    seenNames.add(name);
                    args.push(new body_1.NamedArgument(rref, name, exp));
                }
                else {
                    const isSpread = this.testAndConsumeTokenIf("...");
                    let exp = this.parseExpression();
                    args.push(new body_1.PositionalArgument(rref, isSpread, exp));
                }
                if (this.testAndConsumeTokenIf(",")) {
                    this.ensureNotToken(rparen);
                }
                else {
                    this.ensureToken(rparen);
                }
            }
            this.clearRecover();
            return new body_1.Arguments(args);
        }
        catch (ex) {
            this.processRecover();
            return new body_1.Arguments([new body_1.PositionalArgument(undefined, false, new body_1.InvalidExpression(argSrcInfo))]);
        }
    }
    parseTemplateArguments() {
        try {
            this.setRecover(this.scanMatchingParens("<", ">"));
            let targs = [];
            this.ensureAndConsumeToken("<");
            while (!this.testAndConsumeTokenIf(">")) {
                targs.push(this.parseTypeSignature());
                if (this.testAndConsumeTokenIf(",")) {
                    this.ensureNotToken(">");
                }
                else {
                    this.ensureToken(">");
                }
            }
            this.clearRecover();
            return new body_1.TemplateArguments(targs);
        }
        catch (ex) {
            this.processRecover();
            return new body_1.TemplateArguments([]);
        }
    }
    parseRecursiveAnnotation() {
        try {
            this.setRecover(this.scanMatchingParens("[", "]"));
            let recursive = "no";
            this.ensureAndConsumeToken("[");
            while (!this.testAndConsumeTokenIf("]")) {
                if (!this.testToken("recursive") && !this.testToken("recursive?")) {
                    this.raiseError(this.getCurrentLine(), "Expected recursive annotation");
                }
                if (recursive !== "no") {
                    this.raiseError(this.getCurrentLine(), "Multiple recursive annotations on call");
                }
                recursive = this.testToken("recursive") ? "yes" : "cond";
                this.consumeToken();
                if (this.testAndConsumeTokenIf(",")) {
                    this.ensureNotToken("]");
                }
                else {
                    this.ensureToken("]");
                }
            }
            this.clearRecover();
            return recursive;
        }
        catch (ex) {
            this.processRecover();
            return "no";
        }
    }
    parseConstructorPrimary(otype) {
        const sinfo = this.getCurrentSrcInfo();
        this.ensureAndConsumeToken("@");
        const args = this.parseArguments("{", "}");
        return new body_1.ConstructorPrimaryExpression(sinfo, otype, args);
    }
    parseConstructorPrimaryWithFactory(otype) {
        const sinfo = this.getCurrentSrcInfo();
        this.ensureAndConsumeToken("@");
        this.ensureToken(TokenStrings.Identifier);
        const fname = this.consumeTokenAndGetValue();
        const targs = this.testToken("<") ? this.parseTemplateArguments() : new body_1.TemplateArguments([]);
        const rec = this.testToken("[") ? this.parseRecursiveAnnotation() : "no";
        const args = this.parseArguments("(", ")");
        return new body_1.ConstructorPrimaryWithFactoryExpression(sinfo, otype, fname, rec, targs, args);
    }
    parsePCodeTerm() {
        const line = this.getCurrentLine();
        const sinfo = this.getCurrentSrcInfo();
        let isrecursive = "no";
        if (this.testAndConsumeTokenIf("recursive")) {
            isrecursive = "yes";
        }
        else if (this.testAndConsumeTokenIf("recursive?")) {
            isrecursive = "cond";
        }
        else {
            isrecursive = "no";
        }
        const ispred = this.testToken("pred");
        this.consumeToken();
        const sig = this.parseInvokableCommon(ispred ? InvokableKind.PCodePred : InvokableKind.PCodeFn, false, [], isrecursive, [], undefined);
        const someAuto = sig.params.some((param) => param.type instanceof type_signature_1.AutoTypeSignature) || (sig.optRestType !== undefined && sig.optRestType instanceof type_signature_1.AutoTypeSignature) || (sig.resultType instanceof type_signature_1.AutoTypeSignature);
        const allAuto = sig.params.every((param) => param.type instanceof type_signature_1.AutoTypeSignature) && (sig.optRestType === undefined || sig.optRestType instanceof type_signature_1.AutoTypeSignature) && (sig.resultType instanceof type_signature_1.AutoTypeSignature);
        if (someAuto && !allAuto) {
            this.raiseError(line, "Cannot have mixed of auto propagated and explicit types on lambda arguments/return");
        }
        sig.captureSet.forEach((v) => {
            this.m_penv.useLocalVar(v);
        });
        return new body_1.ConstructorPCodeExpression(sinfo, allAuto, sig);
    }
    parseFollowTypeTag() {
        this.ensureAndConsumeToken("#");
        if (this.testToken(TokenStrings.Template)) {
            return this.parseTemplateTypeReference();
        }
        else {
            const line = this.getCurrentLine();
            let ns = undefined;
            if (this.testToken(TokenStrings.Namespace)) {
                ns = this.consumeTokenAndGetValue();
                this.ensureAndConsumeToken("::");
            }
            const tname = this.consumeTokenAndGetValue();
            ns = this.m_penv.tryResolveNamespace(ns, tname);
            if (ns === undefined) {
                this.raiseError(line, "Could not resolve namespace");
            }
            return new type_signature_1.NominalTypeSignature(ns, [tname], []);
        }
    }
    parseFollowTypeConstructor() {
        if (this.testToken(TokenStrings.Template)) {
            return this.parseTemplateTypeReference();
        }
        else {
            const ostype = this.parseNominalType();
            return ostype;
        }
    }
    processPrefixOnLiteralExpressionsIfNeeded(exp, op) {
        if (op === "!") {
            if (exp instanceof body_1.LiteralBoolExpression) {
                return [true, new body_1.LiteralBoolExpression(exp.sinfo, !exp.value)];
            }
            else {
                return [false, exp];
            }
        }
        else {
            if (op === "+") {
                if (exp instanceof body_1.LiteralIntegralExpression) {
                    return [true, exp];
                }
                else if (exp instanceof body_1.LiteralNumberinoExpression) {
                    return [true, exp];
                }
                else if (exp instanceof body_1.LiteralRationalExpression) {
                    return [true, exp];
                }
                else if (exp instanceof body_1.LiteralFloatPointExpression) {
                    return [true, exp];
                }
                else {
                    return [false, exp];
                }
            }
            else {
                if (exp instanceof body_1.LiteralIntegralExpression) {
                    return [true, new body_1.LiteralIntegralExpression(exp.sinfo, exp.value.startsWith("-") ? exp.value.slice(1) : ("-" + exp.value), exp.itype)];
                }
                else if (exp instanceof body_1.LiteralNumberinoExpression) {
                    return [true, new body_1.LiteralNumberinoExpression(exp.sinfo, exp.value.startsWith("-") ? exp.value.slice(1) : ("-" + exp.value))];
                }
                else if (exp instanceof body_1.LiteralRationalExpression) {
                    return [true, new body_1.LiteralRationalExpression(exp.sinfo, exp.value.startsWith("-") ? exp.value.slice(1) : ("-" + exp.value), exp.rtype)];
                }
                else if (exp instanceof body_1.LiteralFloatPointExpression) {
                    return [true, new body_1.LiteralFloatPointExpression(exp.sinfo, exp.value.startsWith("-") ? exp.value.slice(1) : ("-" + exp.value), exp.fptype)];
                }
                else {
                    return [false, exp];
                }
            }
        }
    }
    parseLiteralExpression() {
        const sinfo = this.getCurrentSrcInfo();
        try {
            this.m_penv.pushFunctionScope(new parser_env_1.FunctionScope(new Set(), this.m_penv.SpecialAutoSignature, true));
            const exp = this.parsePrefixExpression();
            const captured = this.m_penv.getCurrentFunctionScope().getCaptureVars();
            if (captured.size !== 0) {
                this.raiseError(sinfo.line, "Cannot reference local variables in constant expression");
            }
            this.m_penv.popFunctionScope();
            return new body_1.LiteralExpressionValue(exp);
        }
        catch (ex) {
            this.m_penv.popFunctionScope();
            throw ex;
        }
    }
    parseConstExpression(capturesok) {
        const sinfo = this.getCurrentSrcInfo();
        try {
            this.m_penv.pushFunctionScope(new parser_env_1.FunctionScope(new Set(), this.m_penv.SpecialAutoSignature, true));
            const exp = this.parseOfExpression();
            const captured = this.m_penv.getCurrentFunctionScope().getCaptureVars();
            if (!capturesok && captured.size !== 0) {
                this.raiseError(sinfo.line, "Cannot reference local variables in constant expression");
            }
            this.m_penv.popFunctionScope();
            return new body_1.ConstantExpressionValue(exp, captured);
        }
        catch (ex) {
            this.m_penv.popFunctionScope();
            throw ex;
        }
    }
    checkTypeBasedExpressionFollowsParens() {
        const lpos = this.scanMatchingParens("(", ")");
        const ptok = this.peekToken(lpos - this.m_cpos);
        return ptok === "::" || ptok === "@" || ptok === "#";
    }
    parsePrimaryExpression() {
        const line = this.getCurrentLine();
        const sinfo = this.getCurrentSrcInfo();
        const tk = this.peekToken();
        if (tk === "none") {
            this.consumeToken();
            return new body_1.LiteralNoneExpression(sinfo);
        }
        else if (tk === "nothing") {
            this.consumeToken();
            return new body_1.LiteralNothingExpression(sinfo);
        }
        else if (tk === "true" || tk === "false") {
            this.consumeToken();
            return new body_1.LiteralBoolExpression(sinfo, tk === "true");
        }
        else if (tk === TokenStrings.Numberino) {
            const niostr = this.consumeTokenAndGetValue();
            return new body_1.LiteralNumberinoExpression(sinfo, niostr);
        }
        else if (tk === TokenStrings.Int) {
            const istr = this.consumeTokenAndGetValue();
            return new body_1.LiteralIntegralExpression(sinfo, istr, this.m_penv.SpecialIntSignature);
        }
        else if (tk === TokenStrings.Nat) {
            const istr = this.consumeTokenAndGetValue();
            return new body_1.LiteralIntegralExpression(sinfo, istr, this.m_penv.SpecialNatSignature);
        }
        else if (tk === TokenStrings.Float) {
            const fstr = this.consumeTokenAndGetValue();
            return new body_1.LiteralFloatPointExpression(sinfo, fstr, this.m_penv.SpecialFloatSignature);
        }
        else if (tk === TokenStrings.Decimal) {
            const fstr = this.consumeTokenAndGetValue();
            return new body_1.LiteralFloatPointExpression(sinfo, fstr, this.m_penv.SpecialDecimalSignature);
        }
        else if (tk === TokenStrings.BigInt) {
            const istr = this.consumeTokenAndGetValue();
            return new body_1.LiteralIntegralExpression(sinfo, istr, this.m_penv.SpecialBigIntSignature);
        }
        else if (tk === TokenStrings.BigNat) {
            const istr = this.consumeTokenAndGetValue();
            return new body_1.LiteralIntegralExpression(sinfo, istr, this.m_penv.SpecialBigNatSignature);
        }
        else if (tk === TokenStrings.Rational) {
            const istr = this.consumeTokenAndGetValue();
            return new body_1.LiteralRationalExpression(sinfo, istr, this.m_penv.SpecialRationalSignature);
        }
        else if (tk === TokenStrings.String) {
            const sstr = this.consumeTokenAndGetValue(); //keep in escaped format
            return new body_1.LiteralStringExpression(sinfo, sstr);
        }
        else if (tk === TokenStrings.Regex) {
            const restr = this.consumeTokenAndGetValue(); //keep in escaped format
            const re = bsqregex_1.BSQRegex.parse(this.m_penv.getCurrentNamespace(), restr);
            if (typeof (re) === "string") {
                this.raiseError(line, re);
            }
            this.m_penv.assembly.addLiteralRegex(re);
            return new body_1.LiteralRegexExpression(sinfo, re);
        }
        else if (tk === "ok" || tk === "err" || tk === "something") {
            this.consumeToken();
            this.ensureAndConsumeToken("(");
            const arg = this.parseExpression();
            this.ensureAndConsumeToken(")");
            return new body_1.SpecialConstructorExpression(sinfo, tk, arg);
        }
        else if (tk === TokenStrings.Identifier) {
            let namestr = this.consumeTokenAndGetValue();
            const tryfunctionns = this.m_penv.tryResolveNamespace(undefined, namestr);
            const isvar = this.m_penv.isVarDefinedInAnyScope(namestr) || tryfunctionns === undefined || namestr.startsWith("$");
            if (isvar) {
                const istr = this.m_penv.useLocalVar(namestr);
                if (this.testToken("[")) {
                    const rec = this.parseRecursiveAnnotation();
                    const args = this.parseArguments("(", ")");
                    return new body_1.PCodeInvokeExpression(sinfo, istr, rec, args);
                }
                else if (this.testToken("(")) {
                    const args = this.parseArguments("(", ")");
                    return new body_1.PCodeInvokeExpression(sinfo, istr, "no", args);
                }
                else {
                    return new body_1.AccessVariableExpression(sinfo, istr);
                }
            }
            else {
                if (tryfunctionns === undefined) {
                    this.raiseError(line, `Cannot resolve namespace for "${namestr}"`);
                }
                const targs = this.testToken("<") ? this.parseTemplateArguments() : new body_1.TemplateArguments([]);
                const rec = this.testToken("[") ? this.parseRecursiveAnnotation() : "no";
                const args = this.parseArguments("(", ")");
                return new body_1.CallNamespaceFunctionOrOperatorExpression(sinfo, tryfunctionns, namestr, targs, rec, args, "std");
            }
        }
        else if (tk === TokenStrings.Operator) {
            const istr = this.consumeTokenAndGetValue();
            const ns = this.m_penv.tryResolveNamespace(undefined, istr);
            if (ns === undefined) {
                this.raiseError(line, "Cannot resolve namespace for invoke");
            }
            const rec = this.testToken("[") ? this.parseRecursiveAnnotation() : "no";
            const args = this.parseArguments("(", ")");
            return new body_1.CallNamespaceFunctionOrOperatorExpression(sinfo, ns, istr, new body_1.TemplateArguments([]), rec, args, "std");
        }
        else if (tk === "fn" || this.testFollows("recursive", "fn") || this.testFollows("recursive?", "fn") || tk === "pred" || this.testFollows("recursive", "pred") || this.testFollows("recursive?", "pred")) {
            return this.parsePCodeTerm();
        }
        else if (tk === "(" && !this.checkTypeBasedExpressionFollowsParens()) {
            try {
                this.setRecover(this.scanMatchingParens("(", ")"));
                this.consumeToken();
                const exp = this.parseExpression();
                this.ensureAndConsumeToken(")");
                this.clearRecover();
                return exp;
            }
            catch (ex) {
                this.processRecover();
                return new body_1.InvalidExpression(sinfo);
            }
        }
        else if (this.testToken("[")) {
            const args = this.parseArguments("[", "]");
            return new body_1.ConstructorTupleExpression(sinfo, args);
        }
        else if (this.testToken("{")) {
            const args = this.parseArguments("{", "}");
            return new body_1.ConstructorRecordExpression(sinfo, args);
        }
        else if (this.testToken("(|")) {
            const args = this.parseArguments("(|", "|)");
            return new body_1.ConstructorEphemeralValueList(sinfo, args);
        }
        else if (this.testFollows(TokenStrings.Namespace, "::", TokenStrings.Identifier)) {
            //it is a namespace access of some type
            const ns = this.consumeTokenAndGetValue();
            this.consumeToken();
            const name = this.consumeTokenAndGetValue();
            if (!this.testToken("<") && !this.testToken("[") && !this.testToken("(")) {
                //just a constant access
                return new body_1.AccessNamespaceConstantExpression(sinfo, ns, name);
            }
            else {
                const targs = this.testToken("<") ? this.parseTemplateArguments() : new body_1.TemplateArguments([]);
                const rec = this.testToken("[") ? this.parseRecursiveAnnotation() : "no";
                const args = this.parseArguments("(", ")");
                return new body_1.CallNamespaceFunctionOrOperatorExpression(sinfo, ns, name, targs, rec, args, "std");
            }
        }
        else if (this.testFollows(TokenStrings.Namespace, "::", TokenStrings.Operator)) {
            //it is a namespace access of some type
            const ns = this.consumeTokenAndGetValue();
            this.consumeToken();
            const name = this.consumeTokenAndGetValue();
            const rec = this.testToken("[") ? this.parseRecursiveAnnotation() : "no";
            const args = this.parseArguments("(", ")");
            return new body_1.CallNamespaceFunctionOrOperatorExpression(sinfo, ns, name, new body_1.TemplateArguments([]), rec, args, "std");
        }
        else {
            const ttype = this.parseTypeSignature();
            if (this.testFollows("::", TokenStrings.Identifier)) {
                this.consumeToken();
                const name = this.consumeTokenAndGetValue();
                if (!this.testToken("<") && !this.testToken("[") && !this.testToken("(")) {
                    //just a static access
                    return new body_1.AccessStaticFieldExpression(sinfo, ttype, name);
                }
                else {
                    const targs = this.testToken("<") ? this.parseTemplateArguments() : new body_1.TemplateArguments([]);
                    const rec = this.testToken("[") ? this.parseRecursiveAnnotation() : "no";
                    const args = this.parseArguments("(", ")");
                    return new body_1.CallStaticFunctionOrOperatorExpression(sinfo, ttype, name, targs, rec, args, "std");
                }
            }
            else if (this.testFollows("@", TokenStrings.Identifier)) {
                return this.parseConstructorPrimaryWithFactory(ttype);
            }
            else if (this.testFollows("@", "{")) {
                return this.parseConstructorPrimary(ttype);
            }
            else {
                this.raiseError(line, "Unknown token sequence in parsing expression");
                return new body_1.InvalidExpression(sinfo);
            }
        }
    }
    literalPrefixStackAndTypedConstructorHandler(ops) {
        const sinfo = this.getCurrentSrcInfo();
        if (this.testToken(TokenStrings.TypedString)) {
            const tstring = this.consumeTokenAndGetValue();
            if (this.testAndConsumeTokenIf("#")) {
                const ttype = this.parseFollowTypeConstructor();
                return [new body_1.LiteralTypedStringExpression(sinfo, tstring, ttype), ops];
            }
            else {
                this.ensureAndConsumeToken("(");
                const ttype = this.parseFollowTypeConstructor();
                this.ensureAndConsumeToken(")");
                return [new body_1.LiteralTypedStringConstructorExpression(sinfo, tstring, ttype), ops];
            }
        }
        else {
            let exp = this.parsePrimaryExpression();
            let cpos = 0;
            while (cpos < ops.length) {
                const op = ops[cpos];
                let done = false;
                [done, exp] = this.processPrefixOnLiteralExpressionsIfNeeded(exp, op);
                if (!done) {
                    break;
                }
                cpos++;
            }
            const rops = ops.slice(cpos);
            if (this.peekTokenData() === "#") {
                const ttype = this.parseFollowTypeTag();
                if (exp instanceof body_1.LiteralIntegralExpression) {
                    return [new body_1.LiteralTypedPrimitiveConstructorExpression(sinfo, exp.value, exp.itype, ttype), rops];
                }
                else if (exp instanceof body_1.LiteralFloatPointExpression) {
                    return [new body_1.LiteralTypedPrimitiveConstructorExpression(sinfo, exp.value, exp.fptype, ttype), rops];
                }
                else if (exp instanceof body_1.LiteralRationalExpression) {
                    return [new body_1.LiteralTypedPrimitiveConstructorExpression(sinfo, exp.value, exp.rtype, ttype), rops];
                }
                else {
                    if (!(exp instanceof body_1.LiteralNumberinoExpression)) {
                        this.raiseError(sinfo.line, "Expected literal value -- int, float, rational, or numberino");
                    }
                    const rexp = exp;
                    return [new body_1.LiteralTypedPrimitiveConstructorExpression(sinfo, rexp.value, undefined, ttype), rops];
                }
            }
            else {
                return [exp, rops];
            }
        }
    }
    parseTupleIndex() {
        if (this.testToken(TokenStrings.Numberino)) {
            const niov = this.consumeTokenAndGetValue();
            return Number.parseInt(niov);
        }
        else if (this.testToken(TokenStrings.Int)) {
            const iv = this.consumeTokenAndGetValue();
            return Number.parseInt(iv.substr(0, iv.length - 1));
        }
        else if (this.testToken(TokenStrings.Nat)) {
            const nv = this.consumeTokenAndGetValue();
            return Number.parseInt(nv.substr(0, nv.length - 1));
        }
        else {
            this.raiseError(this.getCurrentSrcInfo().line, "Expected an Int or a Nat literal");
            return -1;
        }
    }
    handleSpecialCaseMethods(sinfo, specificResolve, name) {
        if (specificResolve !== undefined) {
            this.raiseError(this.getCurrentLine(), "Cannot use specific resolve on special methods");
        }
        const line = sinfo.line;
        if (name === "is") {
            this.ensureAndConsumeToken("<");
            const istype = this.parseTypeSignature();
            this.ensureAndConsumeToken(">");
            this.ensureAndConsumeToken("(");
            this.ensureAndConsumeToken(")");
            return new body_1.PostfixIs(sinfo, istype);
        }
        else if (name === "isSome") {
            this.ensureAndConsumeToken("(");
            this.ensureAndConsumeToken(")");
            return new body_1.PostfixIs(sinfo, this.m_penv.SpecialSomeSignature);
        }
        else if (name === "isNone") {
            this.ensureAndConsumeToken("(");
            this.ensureAndConsumeToken(")");
            return new body_1.PostfixIs(sinfo, this.m_penv.SpecialNoneSignature);
        }
        else if (name === "as") {
            this.ensureAndConsumeToken("<");
            const astype = this.parseTypeSignature();
            this.ensureAndConsumeToken(">");
            this.ensureAndConsumeToken("(");
            this.ensureAndConsumeToken(")");
            return new body_1.PostfixAs(sinfo, astype);
        }
        else if (name === "hasIndex") {
            this.ensureAndConsumeToken("<");
            const idx = this.parseTupleIndex();
            this.ensureAndConsumeToken(">");
            this.ensureAndConsumeToken("(");
            this.ensureAndConsumeToken(")");
            return new body_1.PostfixHasIndex(sinfo, idx);
        }
        else if (name === "hasProperty") {
            this.ensureAndConsumeToken("<");
            this.ensureToken(TokenStrings.Identifier);
            const pname = this.consumeTokenAndGetValue();
            this.ensureAndConsumeToken(">");
            this.ensureAndConsumeToken("(");
            this.ensureAndConsumeToken(")");
            return new body_1.PostfixHasProperty(sinfo, pname);
        }
        else if (name === "getIndexOrNone") {
            this.ensureAndConsumeToken("<");
            const idx = this.parseTupleIndex();
            this.ensureAndConsumeToken(">");
            this.ensureAndConsumeToken("(");
            this.ensureAndConsumeToken(")");
            return new body_1.PostfixGetIndexOrNone(sinfo, idx);
        }
        else if (name === "getIndexOption") {
            this.ensureAndConsumeToken("<");
            const idx = this.parseTupleIndex();
            this.ensureAndConsumeToken(">");
            this.ensureAndConsumeToken("(");
            this.ensureAndConsumeToken(")");
            return new body_1.PostfixGetIndexOption(sinfo, idx);
        }
        else if (name === "getIndexTry") {
            this.ensureAndConsumeToken("<");
            const idx = this.parseTupleIndex();
            this.ensureAndConsumeToken(">");
            this.ensureAndConsumeToken("(");
            this.ensureAndConsumeToken("out?");
            this.ensureToken(TokenStrings.Identifier);
            const exp = this.consumeTokenAndGetValue();
            this.ensureAndConsumeToken(")");
            return new body_1.PostfixGetIndexTry(sinfo, idx, exp);
        }
        else if (name === "getPropertyOrNone") {
            this.ensureAndConsumeToken("<");
            this.ensureToken(TokenStrings.Identifier);
            const pname = this.consumeTokenAndGetValue();
            this.ensureAndConsumeToken(">");
            this.ensureAndConsumeToken("(");
            this.ensureAndConsumeToken(")");
            return new body_1.PostfixGetPropertyOrNone(sinfo, pname);
        }
        else if (name === "getPropertyOption") {
            this.ensureAndConsumeToken("<");
            this.ensureToken(TokenStrings.Identifier);
            const pname = this.consumeTokenAndGetValue();
            this.ensureAndConsumeToken(">");
            this.ensureAndConsumeToken("(");
            this.ensureAndConsumeToken(")");
            return new body_1.PostfixGetPropertyOption(sinfo, pname);
        }
        else if (name === "getPropertyTry") {
            this.ensureAndConsumeToken("<");
            this.ensureToken(TokenStrings.Identifier);
            const pname = this.consumeTokenAndGetValue();
            this.ensureAndConsumeToken(">");
            this.ensureAndConsumeToken("(");
            this.ensureAndConsumeToken("out?");
            this.ensureToken(TokenStrings.Identifier);
            const exp = this.consumeTokenAndGetValue();
            this.ensureAndConsumeToken(")");
            return new body_1.PostfixGetPropertyTry(sinfo, pname, exp);
        }
        else {
            this.raiseError(line, "unknown special operation");
            return undefined;
        }
    }
    parsePostfixExpression(pfxops) {
        const rootinfo = this.getCurrentSrcInfo();
        let [rootexp, remainingops] = this.literalPrefixStackAndTypedConstructorHandler(pfxops);
        let ops = [];
        while (true) {
            const sinfo = this.getCurrentSrcInfo();
            if (this.testToken(".") || this.testToken(".$")) {
                const isBinder = this.testToken(".$");
                this.consumeToken();
                if (this.testToken(TokenStrings.Numberino) || this.testToken(TokenStrings.Int) || this.testToken(TokenStrings.Nat)) {
                    if (isBinder) {
                        this.raiseError(sinfo.line, "Cannot use binder in this position");
                    }
                    const index = this.parseTupleIndex();
                    ops.push(new body_1.PostfixAccessFromIndex(sinfo, index));
                }
                else if (this.testToken("[")) {
                    this.consumeToken();
                    if (this.testFollows("[", TokenStrings.Numberino, "=") || this.testFollows("[", TokenStrings.Int, "=") || this.testFollows("[", TokenStrings.Nat, "=")) {
                        const updates = this.parseListOf("[", "]", ",", () => {
                            const idx = this.parseTupleIndex();
                            this.ensureAndConsumeToken("=");
                            try {
                                this.m_penv.getCurrentFunctionScope().pushLocalScope();
                                this.m_penv.getCurrentFunctionScope().defineLocalVar(`$${idx}`, `$${idx}_@${sinfo.pos}`, true);
                                if (isBinder) {
                                    this.m_penv.getCurrentFunctionScope().defineLocalVar(`$this`, `$this_@${sinfo.pos}`, true);
                                }
                                const value = this.parseExpression();
                                return { index: idx, value: value };
                            }
                            finally {
                                this.m_penv.getCurrentFunctionScope().popLocalScope();
                            }
                        })[0].sort((a, b) => a.index - b.index);
                        ops.push(new body_1.PostfixModifyWithIndecies(sinfo, isBinder, updates));
                    }
                    else {
                        if (isBinder) {
                            this.raiseError(sinfo.line, "Cannot use binder in this position");
                        }
                        const indecies = this.parseListOf("[", "]", ",", () => {
                            const idx = this.parseTupleIndex();
                            if (!this.testAndConsumeTokenIf(":")) {
                                return { index: idx, reqtype: undefined };
                            }
                            else {
                                return { index: idx, reqtype: this.parseTypeSignature() };
                            }
                        })[0];
                        if (indecies.length === 0) {
                            this.raiseError(sinfo.line, "You must have at least one index when projecting");
                        }
                        ops.push(new body_1.PostfixProjectFromIndecies(sinfo, false, indecies));
                    }
                }
                else if (this.testToken("{")) {
                    this.consumeToken();
                    if (this.testFollows("{", TokenStrings.Identifier, "=")) {
                        const updates = this.parseListOf("{", "}", ",", () => {
                            this.ensureToken(TokenStrings.Identifier);
                            const uname = this.consumeTokenAndGetValue();
                            this.ensureAndConsumeToken("=");
                            try {
                                this.m_penv.getCurrentFunctionScope().pushLocalScope();
                                this.m_penv.getCurrentFunctionScope().defineLocalVar(`$${uname}`, `$${uname}_@${sinfo.pos}`, true);
                                if (isBinder) {
                                    this.m_penv.getCurrentFunctionScope().defineLocalVar(`$this`, `$this_@${sinfo.pos}`, true);
                                }
                                const value = this.parseExpression();
                                return { name: uname, value: value };
                            }
                            finally {
                                if (isBinder) {
                                    this.m_penv.getCurrentFunctionScope().popLocalScope();
                                }
                            }
                        })[0].sort((a, b) => a.name.localeCompare(b.name));
                        ops.push(new body_1.PostfixModifyWithNames(sinfo, isBinder, updates));
                    }
                    else {
                        if (isBinder) {
                            this.raiseError(sinfo.line, "Cannot use binder in this position");
                        }
                        const names = this.parseListOf("{", "}", ",", () => {
                            this.ensureToken(TokenStrings.Identifier);
                            const nn = this.consumeTokenAndGetValue();
                            if (!this.testAndConsumeTokenIf(":")) {
                                return { name: nn, reqtype: undefined };
                            }
                            else {
                                return { name: nn, reqtype: this.parseTypeSignature() };
                            }
                        })[0];
                        if (names.length === 0) {
                            this.raiseError(sinfo.line, "You must have at least one name when projecting");
                        }
                        ops.push(new body_1.PostfixProjectFromNames(sinfo, false, names));
                    }
                }
                else if (this.testToken("(|")) {
                    if (isBinder) {
                        this.raiseError(sinfo.line, "Cannot use binder in this position");
                    }
                    if (this.testFollows("(|", TokenStrings.Numberino) || this.testFollows("(|", TokenStrings.Int) || this.testFollows("(|", TokenStrings.Nat)) {
                        const indecies = this.parseListOf("(|", "|)", ",", () => {
                            const idx = this.parseTupleIndex();
                            if (!this.testAndConsumeTokenIf(":")) {
                                return { index: idx, reqtype: undefined };
                            }
                            else {
                                return { index: idx, reqtype: this.parseTypeSignature() };
                            }
                        })[0];
                        if (indecies.length <= 1) {
                            this.raiseError(sinfo.line, "You must have at least two indecies when projecting out a Ephemeral value pack (otherwise just access the index directly)");
                        }
                        ops.push(new body_1.PostfixProjectFromIndecies(sinfo, true, indecies));
                    }
                    else {
                        const names = this.parseListOf("(|", "|)", ",", () => {
                            this.ensureToken(TokenStrings.Identifier);
                            const nn = this.consumeTokenAndGetValue();
                            if (this.testAndConsumeTokenIf("?")) {
                                this.raiseError(sinfo.line, "Cannot have optional part in Ephemeral List projection");
                            }
                            if (!this.testAndConsumeTokenIf(":")) {
                                return { name: nn, isopt: false, reqtype: undefined };
                            }
                            else {
                                return { name: nn, isopt: false, reqtype: this.parseTypeSignature() };
                            }
                        })[0];
                        if (names.length <= 1) {
                            this.raiseError(sinfo.line, "You must have at least two names when projecting out a Ephemeral value pack (otherwise just access the property/field directly)");
                        }
                        ops.push(new body_1.PostfixProjectFromNames(sinfo, true, names));
                    }
                }
                else {
                    let specificResolve = undefined;
                    if (this.testToken(TokenStrings.Namespace) || this.testToken(TokenStrings.Type) || this.testToken(TokenStrings.Template)) {
                        specificResolve = this.parseTypeSignature();
                        this.ensureAndConsumeToken("::");
                    }
                    this.ensureToken(TokenStrings.Identifier);
                    const name = this.consumeTokenAndGetValue();
                    if (name === "as" || name === "is" || name === "isSome" || name === "isNone"
                        || name === "hasIndex" || name === "getIndexOrNone" || name === "getIndexOption" || name === "getIndexTry"
                        || name === "hasProperty" || name === "getPropertyOrNone" || name === "getPropertyOption" || name === "getPropertyTry") {
                        ops.push(this.handleSpecialCaseMethods(sinfo, specificResolve, name));
                    }
                    else if (!(this.testToken("<") || this.testToken("[") || this.testToken("("))) {
                        if (isBinder) {
                            this.raiseError(sinfo.line, "Cannot use binder in this position");
                        }
                        if (specificResolve !== undefined) {
                            this.raiseError(this.getCurrentLine(), "Encountered named access but given type resolver (only valid on method calls)");
                        }
                        ops.push(new body_1.PostfixAccessFromName(sinfo, name));
                    }
                    else {
                        //ugly ambiguity with < -- the follows should be a NS, Type, or T token
                        //    this.f.g < (1 + 2) and this.f.g<(Int)>() don't know with bounded lookahead :(
                        //
                        //TODO: in theory it could also be a "(" and we need to do a tryParseType thing OR just disallow () in this position
                        //
                        if (this.testToken("<")) {
                            if (this.testFollows("<", TokenStrings.Namespace) || this.testFollows("<", TokenStrings.Type) || this.testFollows("<", TokenStrings.Template)) {
                                const terms = this.parseTemplateArguments();
                                const rec = this.testToken("[") ? this.parseRecursiveAnnotation() : "no";
                                try {
                                    if (isBinder) {
                                        this.m_penv.getCurrentFunctionScope().pushLocalScope();
                                        this.m_penv.getCurrentFunctionScope().defineLocalVar(`$this`, `$this_@${sinfo.pos}`, true);
                                    }
                                    const args = this.parseArguments("(", ")");
                                    ops.push(new body_1.PostfixInvoke(sinfo, isBinder, specificResolve, name, terms, rec, args));
                                }
                                finally {
                                    if (isBinder) {
                                        this.m_penv.getCurrentFunctionScope().popLocalScope();
                                    }
                                }
                            }
                            else {
                                if (isBinder) {
                                    this.raiseError(sinfo.line, "Cannot use binder in this position");
                                }
                                if (specificResolve !== undefined) {
                                    this.raiseError(this.getCurrentLine(), "Encountered named access but given type resolver (only valid on method calls)");
                                }
                                ops.push(new body_1.PostfixAccessFromName(sinfo, name));
                            }
                        }
                        else {
                            const rec = this.testToken("[") ? this.parseRecursiveAnnotation() : "no";
                            try {
                                if (isBinder) {
                                    this.m_penv.getCurrentFunctionScope().pushLocalScope();
                                    this.m_penv.getCurrentFunctionScope().defineLocalVar(`$this`, `$this_@${sinfo.pos}`, true);
                                }
                                const args = this.parseArguments("(", ")");
                                ops.push(new body_1.PostfixInvoke(sinfo, isBinder, specificResolve, name, new body_1.TemplateArguments([]), rec, args));
                            }
                            finally {
                                if (isBinder) {
                                    this.m_penv.getCurrentFunctionScope().popLocalScope();
                                }
                            }
                        }
                    }
                }
            }
            else {
                if (ops.length === 0) {
                    return [rootexp, remainingops];
                }
                else {
                    return [new body_1.PostfixOp(rootinfo, rootexp, ops), remainingops];
                }
            }
        }
    }
    parseStatementExpression(ops) {
        if (this.testToken("{|")) {
            return [this.parseBlockStatementExpression(), ops];
        }
        else if (this.testToken("if")) {
            return [this.parseIfExpression(), ops];
        }
        else if (this.testToken("switch")) {
            return [this.parseSwitchExpression(), ops];
        }
        else if (this.testToken("match")) {
            return [this.parseMatchExpression(), ops];
        }
        else {
            return this.parsePostfixExpression(ops);
        }
    }
    prefixStackApplicationHandler(sinfo, ops) {
        let [exp, remainingops] = this.parseStatementExpression(ops);
        for (let i = 0; i < remainingops.length; ++i) {
            const op = remainingops[i];
            if (op === "!") {
                exp = new body_1.PrefixNotOp(sinfo, exp);
            }
            else {
                const ons = this.m_penv.tryResolveAsPrefixUnaryOperator(op, 1);
                if (ons === undefined) {
                    this.raiseError(sinfo.line, "Could not resolve operator");
                }
                const arg = new body_1.PositionalArgument(undefined, false, exp);
                return new body_1.CallNamespaceFunctionOrOperatorExpression(sinfo, ons, op, new body_1.TemplateArguments([]), "no", new body_1.Arguments([arg]), "prefix");
            }
        }
        return exp;
    }
    parsePrefixExpression() {
        const sinfo = this.getCurrentSrcInfo();
        let ops = [];
        while (this.testToken("!") || this.testToken("+") || this.testToken("-")) {
            ops.push(this.consumeTokenAndGetValue());
        }
        return this.prefixStackApplicationHandler(sinfo, ops.reverse());
    }
    isMultiplicativeFollow() {
        if (this.testToken("*") || this.testToken("/")) {
            return true;
        }
        else if (this.testToken(TokenStrings.Operator) && this.m_penv.tryResolveAsInfixBinaryOperator(this.peekTokenData(), 2) !== undefined) {
            return true;
        }
        else {
            return false;
        }
    }
    parseMultiplicativeExpression() {
        const sinfo = this.getCurrentSrcInfo();
        const exp = this.parsePrefixExpression();
        if (!this.isMultiplicativeFollow()) {
            return exp;
        }
        else {
            let aexp = exp;
            while (this.isMultiplicativeFollow()) {
                if (this.testToken("*") || this.testToken("/")) {
                    const op = this.consumeTokenAndGetValue();
                    const ons = this.m_penv.tryResolveAsInfixBinaryOperator(op, 2);
                    if (ons === undefined) {
                        this.raiseError(sinfo.line, "Could not resolve operator");
                    }
                    const lhs = new body_1.PositionalArgument(undefined, false, aexp);
                    const rhs = new body_1.PositionalArgument(undefined, false, this.parsePrefixExpression());
                    aexp = new body_1.CallNamespaceFunctionOrOperatorExpression(sinfo, ons, op, new body_1.TemplateArguments([]), "no", new body_1.Arguments([lhs, rhs]), "infix");
                }
                else {
                    const ons = this.m_penv.tryResolveAsInfixBinaryOperator(this.peekTokenData(), 2);
                    const op = this.consumeTokenAndGetValue();
                    const lhs = new body_1.PositionalArgument(undefined, false, aexp);
                    const rhs = new body_1.PositionalArgument(undefined, false, this.parsePrefixExpression());
                    aexp = new body_1.CallNamespaceFunctionOrOperatorExpression(sinfo, ons, op, new body_1.TemplateArguments([]), "no", new body_1.Arguments([lhs, rhs]), "infix");
                }
            }
            return aexp;
        }
    }
    isAdditiveFollow() {
        if (this.testToken("+") || this.testToken("-")) {
            return true;
        }
        else if (this.testToken(TokenStrings.Operator) && this.m_penv.tryResolveAsInfixBinaryOperator(this.peekTokenData(), 3) !== undefined) {
            return true;
        }
        else {
            return false;
        }
    }
    parseAdditiveExpression() {
        const sinfo = this.getCurrentSrcInfo();
        const exp = this.parseMultiplicativeExpression();
        if (!this.isAdditiveFollow()) {
            return exp;
        }
        else {
            let aexp = exp;
            while (this.isAdditiveFollow()) {
                if (this.testToken("+") || this.testToken("-")) {
                    const op = this.consumeTokenAndGetValue();
                    const ons = this.m_penv.tryResolveAsInfixBinaryOperator(op, 3);
                    if (ons === undefined) {
                        this.raiseError(sinfo.line, "Could not resolve operator");
                    }
                    const lhs = new body_1.PositionalArgument(undefined, false, aexp);
                    const rhs = new body_1.PositionalArgument(undefined, false, this.parseMultiplicativeExpression());
                    aexp = new body_1.CallNamespaceFunctionOrOperatorExpression(sinfo, ons, op, new body_1.TemplateArguments([]), "no", new body_1.Arguments([lhs, rhs]), "infix");
                }
                else {
                    const ons = this.m_penv.tryResolveAsInfixBinaryOperator(this.peekTokenData(), 3);
                    const op = this.consumeTokenAndGetValue();
                    const lhs = new body_1.PositionalArgument(undefined, false, aexp);
                    const rhs = new body_1.PositionalArgument(undefined, false, this.parseMultiplicativeExpression());
                    aexp = new body_1.CallNamespaceFunctionOrOperatorExpression(sinfo, ons, op, new body_1.TemplateArguments([]), "no", new body_1.Arguments([lhs, rhs]), "infix");
                }
            }
            return aexp;
        }
    }
    parseRelationalExpression() {
        const sinfo = this.getCurrentSrcInfo();
        const exp = this.parseAdditiveExpression();
        if (this.testToken("===") || this.testToken("!==")) {
            const op = this.consumeTokenAndGetValue();
            return new body_1.BinKeyExpression(sinfo, exp, op, this.parseRelationalExpression());
        }
        else if (this.testToken("==") || this.testToken("!=") || this.testToken("<") || this.testToken(">") || this.testToken("<=") || this.testToken(">=")) {
            const ons = this.m_penv.tryResolveAsInfixBinaryOperator(this.peekTokenData(), 4);
            if (ons === undefined) {
                this.raiseError(sinfo.line, "Could not resolve operator");
            }
            const op = this.consumeTokenAndGetValue();
            const lhs = new body_1.PositionalArgument(undefined, false, exp);
            const rhs = new body_1.PositionalArgument(undefined, false, this.parseRelationalExpression());
            return new body_1.CallNamespaceFunctionOrOperatorExpression(sinfo, ons, op, new body_1.TemplateArguments([]), "no", new body_1.Arguments([lhs, rhs]), "infix");
        }
        else if (this.testToken(TokenStrings.Operator) && this.m_penv.tryResolveAsInfixBinaryOperator(this.peekTokenData(), 4) !== undefined) {
            const ons = this.m_penv.tryResolveAsInfixBinaryOperator(this.peekTokenData(), 4);
            const op = this.consumeTokenAndGetValue();
            const lhs = new body_1.PositionalArgument(undefined, false, exp);
            const rhs = new body_1.PositionalArgument(undefined, false, this.parseRelationalExpression());
            return new body_1.CallNamespaceFunctionOrOperatorExpression(sinfo, ons, op, new body_1.TemplateArguments([]), "no", new body_1.Arguments([lhs, rhs]), "infix");
        }
        else {
            return exp;
        }
    }
    parseAndExpression() {
        const sinfo = this.getCurrentSrcInfo();
        const exp = this.parseRelationalExpression();
        if (this.testAndConsumeTokenIf("&&")) {
            return new body_1.BinLogicExpression(sinfo, exp, "&&", this.parseAndExpression());
        }
        else {
            return exp;
        }
    }
    parseOrExpression() {
        const sinfo = this.getCurrentSrcInfo();
        const exp = this.parseAndExpression();
        if (this.testAndConsumeTokenIf("||")) {
            return new body_1.BinLogicExpression(sinfo, exp, "||", this.parseOrExpression());
        }
        else {
            return exp;
        }
    }
    parseImpliesExpression() {
        const sinfo = this.getCurrentSrcInfo();
        const exp = this.parseOrExpression();
        if (this.testAndConsumeTokenIf("==>")) {
            return new body_1.BinLogicExpression(sinfo, exp, "==>", this.parseImpliesExpression());
        }
        else {
            return exp;
        }
    }
    parseMapEntryConstructorExpression() {
        const sinfo = this.getCurrentSrcInfo();
        const lexp = this.parseImpliesExpression();
        if (this.testAndConsumeTokenIf("=>")) {
            const rexp = this.parseImpliesExpression();
            return new body_1.MapEntryConstructorExpression(sinfo, lexp, rexp);
        }
        else {
            return lexp;
        }
    }
    parseSelectExpression() {
        const sinfo = this.getCurrentSrcInfo();
        const texp = this.parseMapEntryConstructorExpression();
        if (this.testAndConsumeTokenIf("?")) {
            const exp1 = this.parseMapEntryConstructorExpression();
            this.ensureAndConsumeToken(":");
            const exp2 = this.parseSelectExpression();
            return new body_1.SelectExpression(sinfo, texp, exp1, exp2);
        }
        else {
            return texp;
        }
    }
    parseOfExpression() {
        const sinfo = this.getCurrentSrcInfo();
        //
        //TODO: This will have an ugly parse if we do -- x of Int < 3
        //      It will try to parse as Int<3, ... as a type which fails
        //
        let exp = this.parseSelectExpression();
        if (this.testAndConsumeTokenIf("istype")) {
            const oftype = this.parseTypeSignature();
            return new body_1.IsTypeExpression(sinfo, exp, oftype);
        }
        else if (this.testAndConsumeTokenIf("astype")) {
            const oftype = this.parseTypeSignature();
            return new body_1.AsTypeExpression(sinfo, exp, oftype);
        }
        else {
            return exp;
        }
    }
    parseExpOrExpression() {
        const texp = this.parseOfExpression();
        if (this.testFollows("?", "none", "?") || this.testFollows("?", "nothing", "?") || this.testFollows("?", "err", "?")) {
            const ffsinfo = this.getCurrentSrcInfo();
            this.consumeToken();
            let cond = this.consumeTokenAndGetValue();
            this.consumeToken();
            return new body_1.ExpOrExpression(ffsinfo, texp, cond);
        }
        else {
            return texp;
        }
    }
    parseBlockStatementExpression() {
        const sinfo = this.getCurrentSrcInfo();
        this.m_penv.getCurrentFunctionScope().pushLocalScope();
        let stmts = [];
        try {
            this.setRecover(this.scanMatchingParens("{|", "|}"));
            this.consumeToken();
            while (!this.testAndConsumeTokenIf("|}")) {
                stmts.push(this.parseStatement());
            }
            this.m_penv.getCurrentFunctionScope().popLocalScope();
            this.clearRecover();
            return new body_1.BlockStatementExpression(sinfo, stmts);
        }
        catch (ex) {
            this.m_penv.getCurrentFunctionScope().popLocalScope();
            this.processRecover();
            return new body_1.BlockStatementExpression(sinfo, [new body_1.InvalidStatement(sinfo)]);
        }
    }
    parseIfExpression() {
        const sinfo = this.getCurrentSrcInfo();
        let conds = [];
        this.ensureAndConsumeToken("if");
        this.ensureAndConsumeToken("(");
        const iftest = this.parseExpression();
        this.ensureAndConsumeToken(")");
        const ifbody = this.parseExpression();
        conds.push(new body_1.CondBranchEntry(iftest, ifbody));
        while (this.testAndConsumeTokenIf("elif")) {
            this.ensureAndConsumeToken("(");
            const eliftest = this.parseExpression();
            this.ensureAndConsumeToken(")");
            const elifbody = this.parseExpression();
            conds.push(new body_1.CondBranchEntry(eliftest, elifbody));
        }
        this.ensureAndConsumeToken("else");
        const elsebody = this.parseExpression();
        return new body_1.IfExpression(sinfo, new body_1.IfElse(conds, elsebody));
    }
    parseSwitchExpression() {
        const sinfo = this.getCurrentSrcInfo();
        this.ensureAndConsumeToken("switch");
        this.ensureAndConsumeToken("(");
        const mexp = this.parseExpression();
        this.ensureAndConsumeToken(")");
        try {
            this.m_penv.getCurrentFunctionScope().pushLocalScope();
            this.m_penv.getCurrentFunctionScope().defineLocalVar("$switch", `$switch_@${sinfo.pos}`, true);
            let entries = [];
            this.ensureAndConsumeToken("{|");
            entries.push(this.parseSwitchEntry(this.getCurrentSrcInfo(), "|}", () => this.parseExpression()));
            while (this.testAndConsumeTokenIf("|")) {
                entries.push(this.parseSwitchEntry(this.getCurrentSrcInfo(), "|}", () => this.parseExpression()));
            }
            this.ensureAndConsumeToken("|}");
            return new body_1.SwitchExpression(sinfo, mexp, entries);
        }
        finally {
            this.m_penv.getCurrentFunctionScope().popLocalScope();
        }
    }
    parseMatchExpression() {
        const sinfo = this.getCurrentSrcInfo();
        this.ensureAndConsumeToken("match");
        this.ensureAndConsumeToken("(");
        const mexp = this.parseExpression();
        this.ensureAndConsumeToken(")");
        try {
            this.m_penv.getCurrentFunctionScope().pushLocalScope();
            this.m_penv.getCurrentFunctionScope().defineLocalVar("$match", `$match_@${sinfo.pos}`, true);
            let entries = [];
            this.ensureAndConsumeToken("{|");
            entries.push(this.parseMatchEntry(this.getCurrentSrcInfo(), "|}", () => this.parseExpression()));
            while (this.testAndConsumeTokenIf("|")) {
                entries.push(this.parseMatchEntry(this.getCurrentSrcInfo(), "|}", () => this.parseExpression()));
            }
            this.ensureAndConsumeToken("|}");
            return new body_1.MatchExpression(sinfo, mexp, entries);
        }
        finally {
            this.m_penv.getCurrentFunctionScope().popLocalScope();
        }
    }
    parseExpression() {
        return this.parseExpOrExpression();
    }
    ////
    //Statement parsing
    parsePrimitiveStructuredAssignment(sinfo, vars, decls) {
        this.ensureToken(TokenStrings.Identifier);
        const name = this.consumeTokenAndGetValue();
        if (name === "_") {
            let itype = this.m_penv.SpecialAnySignature;
            if (this.testAndConsumeTokenIf(":")) {
                itype = this.parseTypeSignature();
            }
            return new body_1.IgnoreTermStructuredAssignment(itype);
        }
        else {
            let itype = this.m_penv.SpecialAutoSignature;
            if (this.testAndConsumeTokenIf(":")) {
                itype = this.parseTypeSignature();
            }
            if (vars !== undefined) {
                if (decls.has(name)) {
                    this.raiseError(sinfo.line, "Variable is already defined in scope");
                }
                decls.add(name);
                return new body_1.VariableDeclarationStructuredAssignment(name, itype);
            }
            else {
                if (!this.m_penv.getCurrentFunctionScope().isVarNameDefined(name)) {
                    this.raiseError(sinfo.line, "Variable is not defined in scope");
                }
                if (!(itype instanceof type_signature_1.AutoTypeSignature)) {
                    this.raiseError(sinfo.line, "Cannot redeclare type of variable on assignment");
                }
                return new body_1.VariableAssignmentStructuredAssignment(name);
            }
        }
    }
    parseStructuredAssignment(sinfo, vars, decls) {
        if (this.testToken("[")) {
            const assigns = this.parseListOf("[", "]", ",", () => {
                return this.parsePrimitiveStructuredAssignment(this.getCurrentSrcInfo(), vars, decls);
            })[0];
            return new body_1.TupleStructuredAssignment(assigns);
        }
        else if (this.testToken("{")) {
            const assigns = this.parseListOf("{", "}", ",", () => {
                this.ensureToken(TokenStrings.Identifier);
                const name = this.consumeTokenAndGetValue();
                this.ensureAndConsumeToken("=");
                const subg = this.parsePrimitiveStructuredAssignment(this.getCurrentSrcInfo(), vars, decls);
                return [name, subg];
            })[0];
            return new body_1.RecordStructuredAssignment(assigns);
        }
        else if (this.testToken("(|")) {
            const assigns = this.parseListOf("(|", "|)", ",", () => {
                return this.parsePrimitiveStructuredAssignment(this.getCurrentSrcInfo(), vars, decls);
            })[0];
            return new body_1.ValueListStructuredAssignment(assigns);
        }
        else if (this.testFollows(TokenStrings.Namespace, "::", TokenStrings.Type) || this.testToken(TokenStrings.Type)) {
            const ttype = this.parseTypeSignature();
            this.ensureAndConsumeToken("@");
            const assigns = this.parseListOf("{", "}", ",", () => {
                if (this.testFollows(TokenStrings.Identifier, "=")) {
                    this.ensureToken(TokenStrings.Identifier);
                    const name = this.consumeTokenAndGetValue();
                    this.ensureAndConsumeToken("=");
                    const subg = this.parsePrimitiveStructuredAssignment(this.getCurrentSrcInfo(), vars, decls);
                    return [name, subg];
                }
                else {
                    const subg = this.parsePrimitiveStructuredAssignment(this.getCurrentSrcInfo(), vars, decls);
                    return [undefined, subg];
                }
            })[0];
            return new body_1.NominalStructuredAssignment(ttype, assigns);
        }
        else {
            return this.parsePrimitiveStructuredAssignment(sinfo, vars, decls);
        }
    }
    parseLineStatement() {
        const line = this.getCurrentLine();
        const sinfo = this.getCurrentSrcInfo();
        const tk = this.peekToken();
        if (tk === ";") {
            this.consumeToken();
            return new body_1.EmptyStatement(sinfo);
        }
        else if (tk === "let" || tk === "var") {
            this.consumeToken();
            const isConst = tk === "let";
            if (this.testToken("[") || this.testToken("{") || this.testToken("(|") || this.testFollows(TokenStrings.Namespace, "::", TokenStrings.Type) || this.testToken(TokenStrings.Type)) {
                let decls = new Set();
                const assign = this.parseStructuredAssignment(this.getCurrentSrcInfo(), isConst ? "let" : "var", decls);
                decls.forEach((dv) => {
                    if (this.m_penv.getCurrentFunctionScope().isVarNameDefined(dv)) {
                        this.raiseError(line, "Variable name is already defined");
                    }
                    this.m_penv.getCurrentFunctionScope().defineLocalVar(dv, dv, false);
                });
                this.ensureAndConsumeToken("=");
                const exp = this.parseExpression();
                this.ensureAndConsumeToken(";");
                return new body_1.StructuredVariableAssignmentStatement(sinfo, isConst, assign, exp);
            }
            else {
                let decls = new Set();
                const assigns = this.parseEphemeralListOf(() => {
                    return this.parseStructuredAssignment(this.getCurrentSrcInfo(), isConst ? "let" : "var", decls);
                });
                if (assigns.length === 0 || (assigns.length === 1 && !(assigns[0] instanceof body_1.VariableDeclarationStructuredAssignment))) {
                    this.raiseError(sinfo.line, "Vacuous variable declaration");
                }
                let vars = [];
                for (let i = 0; i < assigns.length; ++i) {
                    if (assigns[i] instanceof body_1.IgnoreTermStructuredAssignment) {
                        vars.push({ name: "_", vtype: assigns[i].assigntype });
                    }
                    else if (assigns[i] instanceof body_1.VariableDeclarationStructuredAssignment) {
                        const dv = assigns[i];
                        if (this.m_penv.getCurrentFunctionScope().isVarNameDefined(dv.vname)) {
                            this.raiseError(line, "Variable name is already defined");
                        }
                        this.m_penv.getCurrentFunctionScope().defineLocalVar(dv.vname, dv.vname, false);
                        vars.push({ name: dv.vname, vtype: dv.assigntype });
                    }
                    else {
                        this.raiseError(sinfo.line, "Cannot have structured multi-decls");
                    }
                }
                let exp = undefined;
                if (this.testAndConsumeTokenIf("=")) {
                    exp = this.parseEphemeralListOf(() => {
                        return this.parseExpression();
                    });
                }
                if ((exp === undefined && isConst)) {
                    this.raiseError(line, "Const variable declaration must include an assignment to the variable");
                }
                this.ensureAndConsumeToken(";");
                if (vars.length === 1) {
                    if (exp !== undefined && exp.length !== 1) {
                        this.raiseError(line, "Mismatch between variables declared and values provided");
                    }
                    const sexp = exp !== undefined ? exp[0] : undefined;
                    return new body_1.VariableDeclarationStatement(sinfo, vars[0].name, isConst, vars[0].vtype, sexp);
                }
                else {
                    return new body_1.VariablePackDeclarationStatement(sinfo, isConst, vars, exp);
                }
            }
        }
        else if (this.testToken("[") || this.testToken("{") || this.testToken("(|")) {
            let decls = new Set();
            const assign = this.parseStructuredAssignment(this.getCurrentSrcInfo(), undefined, decls);
            this.ensureAndConsumeToken("=");
            const exp = this.parseExpression();
            this.ensureAndConsumeToken(";");
            return new body_1.StructuredVariableAssignmentStatement(sinfo, false, assign, exp);
        }
        else if (tk === TokenStrings.Identifier) {
            let decls = new Set();
            const assigns = this.parseEphemeralListOf(() => {
                return this.parseStructuredAssignment(this.getCurrentSrcInfo(), undefined, decls);
            });
            if (assigns.length === 0 || (assigns.length === 1 && !(assigns[0] instanceof body_1.VariableAssignmentStructuredAssignment))) {
                this.raiseError(sinfo.line, "Vacuous variable assignment");
            }
            let vars = [];
            for (let i = 0; i < assigns.length; ++i) {
                if (assigns[i] instanceof body_1.IgnoreTermStructuredAssignment) {
                    vars.push("_");
                }
                else if (assigns[i] instanceof body_1.VariableAssignmentStructuredAssignment) {
                    const av = assigns[i];
                    if (!this.m_penv.getCurrentFunctionScope().isVarNameDefined(av.vname)) {
                        this.raiseError(line, "Variable name is not defined");
                    }
                    vars.push(av.vname);
                }
                else {
                    this.raiseError(sinfo.line, "Cannot have structured multi-assigns");
                }
            }
            this.ensureAndConsumeToken("=");
            let exps = this.parseEphemeralListOf(() => {
                return this.parseExpression();
            });
            this.ensureAndConsumeToken(";");
            if (vars.length === 1) {
                if (exps.length !== 1) {
                    this.raiseError(line, "Mismatch between variables assigned and values provided");
                }
                return new body_1.VariableAssignmentStatement(sinfo, vars[0], exps[0]);
            }
            else {
                return new body_1.VariablePackAssignmentStatement(sinfo, vars, exps);
            }
        }
        else if (tk === "return") {
            this.consumeToken();
            if (this.testAndConsumeTokenIf(";")) {
                return new body_1.ReturnStatement(sinfo, [new body_1.LiteralNoneExpression(sinfo)]);
            }
            else {
                const exps = this.parseEphemeralListOf(() => this.parseExpression());
                this.ensureAndConsumeToken(";");
                return new body_1.ReturnStatement(sinfo, exps);
            }
        }
        else if (tk === "yield") {
            this.consumeToken();
            const exps = this.parseEphemeralListOf(() => this.parseExpression());
            this.ensureAndConsumeToken(";");
            return new body_1.YieldStatement(sinfo, exps);
        }
        else if (tk === "abort") {
            this.consumeToken();
            this.ensureAndConsumeToken(";");
            return new body_1.AbortStatement(sinfo);
        }
        else if (tk === "assert") {
            this.consumeToken();
            let level = "debug";
            level = this.parseBuildInfo(level);
            const exp = this.parseExpression();
            this.ensureAndConsumeToken(";");
            return new body_1.AssertStatement(sinfo, exp, level);
        }
        else if (tk === "check") {
            this.consumeToken();
            const exp = this.parseExpression();
            this.ensureAndConsumeToken(";");
            return new body_1.CheckStatement(sinfo, exp);
        }
        else if (tk === "validate") {
            this.consumeToken();
            const exp = this.parseOfExpression();
            let err = new body_1.LiteralNoneExpression(sinfo);
            if (this.testFollows("else")) {
                err = this.parseExpression();
            }
            this.ensureAndConsumeToken(";");
            return new body_1.ValidateStatement(sinfo, exp, err);
        }
        else if (tk === "_debug") {
            this.consumeToken();
            let value = undefined;
            if (this.testToken("(")) {
                this.consumeToken();
                value = this.parseExpression();
                this.ensureAndConsumeToken(")");
            }
            this.ensureAndConsumeToken(";");
            return new body_1.DebugStatement(sinfo, value);
        }
        else if (this.testFollows(TokenStrings.Namespace, "::", TokenStrings.Identifier)) {
            //it is a namespace function call
            const ns = this.consumeTokenAndGetValue();
            this.consumeToken();
            const name = this.consumeTokenAndGetValue();
            const targs = this.testToken("<") ? this.parseTemplateArguments() : new body_1.TemplateArguments([]);
            const rec = this.testToken("[") ? this.parseRecursiveAnnotation() : "no";
            const args = this.parseArguments("(", ")");
            return new body_1.NakedCallStatement(sinfo, new body_1.CallNamespaceFunctionOrOperatorExpression(sinfo, ns, name, targs, rec, args, "std"));
        }
        else if (this.testFollows(TokenStrings.Namespace, "::", TokenStrings.Operator)) {
            //it is a namespace function call
            const ns = this.consumeTokenAndGetValue();
            this.consumeToken();
            const name = this.consumeTokenAndGetValue();
            const rec = this.testToken("[") ? this.parseRecursiveAnnotation() : "no";
            const args = this.parseArguments("(", ")");
            return new body_1.NakedCallStatement(sinfo, new body_1.CallNamespaceFunctionOrOperatorExpression(sinfo, ns, name, new body_1.TemplateArguments([]), rec, args, "std"));
        }
        else {
            //we should find a type (nominal here) and it is a static invoke or a structured assign
            const ttype = this.parseTypeSignature();
            if (this.testFollows("@", "{")) {
                this.consumeToken();
                let decls = new Set();
                const assigns = this.parseListOf("{", "}", ",", () => {
                    if (this.testFollows(TokenStrings.Identifier, "=")) {
                        this.ensureToken(TokenStrings.Identifier);
                        const name = this.consumeTokenAndGetValue();
                        this.ensureAndConsumeToken("=");
                        const subg = this.parsePrimitiveStructuredAssignment(this.getCurrentSrcInfo(), undefined, decls);
                        return [name, subg];
                    }
                    else {
                        const subg = this.parsePrimitiveStructuredAssignment(this.getCurrentSrcInfo(), undefined, decls);
                        return [undefined, subg];
                    }
                })[0];
                const assign = new body_1.NominalStructuredAssignment(ttype, assigns);
                decls.forEach((dv) => {
                    if (this.m_penv.getCurrentFunctionScope().isVarNameDefined(dv)) {
                        this.raiseError(line, "Variable name is already defined");
                    }
                    this.m_penv.getCurrentFunctionScope().defineLocalVar(dv, dv, false);
                });
                this.ensureAndConsumeToken("=");
                const exp = this.parseExpression();
                this.ensureAndConsumeToken(";");
                return new body_1.StructuredVariableAssignmentStatement(sinfo, false, assign, exp);
            }
            else if (this.testFollows("::", TokenStrings.Identifier)) {
                this.consumeToken();
                const name = this.consumeTokenAndGetValue();
                const targs = this.testToken("<") ? this.parseTemplateArguments() : new body_1.TemplateArguments([]);
                const rec = this.testToken("[") ? this.parseRecursiveAnnotation() : "no";
                const args = this.parseArguments("(", ")");
                return new body_1.NakedCallStatement(sinfo, new body_1.CallStaticFunctionOrOperatorExpression(sinfo, ttype, name, targs, rec, args, "std"));
            }
            else if (this.testFollows("::", TokenStrings.Operator)) {
                this.consumeToken();
                const name = this.consumeTokenAndGetValue();
                const rec = this.testToken("[") ? this.parseRecursiveAnnotation() : "no";
                const args = this.parseArguments("(", ")");
                return new body_1.NakedCallStatement(sinfo, new body_1.CallStaticFunctionOrOperatorExpression(sinfo, ttype, name, new body_1.TemplateArguments([]), rec, args, "std"));
            }
            else {
                this.raiseError(line, "Unknown statement structure");
                return new body_1.InvalidStatement(sinfo);
            }
        }
    }
    parseBlockStatement() {
        const sinfo = this.getCurrentSrcInfo();
        this.m_penv.getCurrentFunctionScope().pushLocalScope();
        let stmts = [];
        try {
            this.setRecover(this.scanMatchingParens("{", "}"));
            this.consumeToken();
            while (!this.testAndConsumeTokenIf("}")) {
                stmts.push(this.parseStatement());
            }
            this.m_penv.getCurrentFunctionScope().popLocalScope();
            if (stmts.length === 0) {
                this.raiseError(this.getCurrentLine(), "No empty blocks -- requires at least ';'");
            }
            this.clearRecover();
            return new body_1.BlockStatement(sinfo, stmts);
        }
        catch (ex) {
            this.m_penv.getCurrentFunctionScope().popLocalScope();
            this.processRecover();
            return new body_1.BlockStatement(sinfo, [new body_1.InvalidStatement(sinfo)]);
        }
    }
    parseIfElseStatement() {
        const sinfo = this.getCurrentSrcInfo();
        let conds = [];
        this.ensureAndConsumeToken("if");
        this.ensureAndConsumeToken("(");
        const iftest = this.parseExpression();
        this.ensureAndConsumeToken(")");
        const ifbody = this.parseBlockStatement();
        conds.push(new body_1.CondBranchEntry(iftest, ifbody));
        while (this.testAndConsumeTokenIf("elif")) {
            this.ensureAndConsumeToken("(");
            const eliftest = this.parseExpression();
            this.ensureAndConsumeToken(")");
            const elifbody = this.parseBlockStatement();
            conds.push(new body_1.CondBranchEntry(eliftest, elifbody));
        }
        const elsebody = this.testAndConsumeTokenIf("else") ? this.parseBlockStatement() : undefined;
        return new body_1.IfElseStatement(sinfo, new body_1.IfElse(conds, elsebody));
    }
    parseSwitchGuard(sinfo) {
        if (this.testToken(TokenStrings.Identifier)) {
            const tv = this.consumeTokenAndGetValue();
            if (tv !== "_") {
                this.raiseError(sinfo.line, "Expected wildcard match");
            }
            return new body_1.WildcardSwitchGuard();
        }
        else {
            const lexp = this.parseLiteralExpression();
            return new body_1.LiteralSwitchGuard(lexp);
        }
    }
    parseMatchGuard(sinfo) {
        if (this.testToken(TokenStrings.Identifier)) {
            const tv = this.consumeTokenAndGetValue();
            if (tv !== "_") {
                this.raiseError(sinfo.line, "Expected wildcard match");
            }
            return [new body_1.WildcardMatchGuard(), new Set()];
        }
        else {
            if (this.testToken("[")) {
                let decls = new Set();
                if (this.testFollows("[", TokenStrings.Identifier)) {
                    const assign = this.parseStructuredAssignment(this.getCurrentSrcInfo(), "let", decls);
                    return [new body_1.StructureMatchGuard(assign, decls), decls];
                }
                else {
                    const oftype = this.parseTupleType();
                    return [new body_1.TypeMatchGuard(oftype), decls];
                }
            }
            else if (this.testToken("{")) {
                let decls = new Set();
                if (this.testFollows("{", TokenStrings.Identifier, "=")) {
                    const assign = this.parseStructuredAssignment(this.getCurrentSrcInfo(), "let", decls);
                    return [new body_1.StructureMatchGuard(assign, decls), decls];
                }
                else {
                    const oftype = this.parseRecordType();
                    return [new body_1.TypeMatchGuard(oftype), decls];
                }
            }
            else {
                let decls = new Set();
                const oftype = this.parseTypeSignature();
                if (this.testFollows("@", "{")) {
                    this.consumeToken();
                    const assigns = this.parseListOf("{", "}", ",", () => {
                        if (this.testFollows(TokenStrings.Identifier, "=")) {
                            this.ensureToken(TokenStrings.Identifier);
                            const name = this.consumeTokenAndGetValue();
                            this.ensureAndConsumeToken("=");
                            const subg = this.parsePrimitiveStructuredAssignment(this.getCurrentSrcInfo(), "let", decls);
                            return [name, subg];
                        }
                        else {
                            const subg = this.parsePrimitiveStructuredAssignment(this.getCurrentSrcInfo(), "let", decls);
                            return [undefined, subg];
                        }
                    })[0];
                    const assign = new body_1.NominalStructuredAssignment(oftype, assigns);
                    return [new body_1.StructureMatchGuard(assign, decls), decls];
                }
                else {
                    return [new body_1.TypeMatchGuard(oftype), decls];
                }
            }
        }
    }
    parseSwitchEntry(sinfo, tailToken, actionp) {
        const guard = this.parseSwitchGuard(sinfo);
        this.ensureAndConsumeToken("=>");
        const action = actionp();
        const isokfollow = this.testToken(tailToken) || this.testToken("|");
        if (!isokfollow) {
            this.raiseError(this.getCurrentLine(), "Unknown token at end of match entry");
        }
        return new body_1.SwitchEntry(guard, action);
    }
    parseMatchEntry(sinfo, tailToken, actionp) {
        const [guard, decls] = this.parseMatchGuard(sinfo);
        this.ensureAndConsumeToken("=>");
        if (decls.size !== 0) {
            decls.forEach((dv) => {
                if (this.m_penv.getCurrentFunctionScope().isVarNameDefined(dv)) {
                    this.raiseError(sinfo.line, "Variable name is already defined");
                }
                this.m_penv.getCurrentFunctionScope().defineLocalVar(dv, dv, false);
            });
        }
        const action = actionp();
        if (decls.size !== 0) {
            this.m_penv.getCurrentFunctionScope().popLocalScope();
        }
        const isokfollow = this.testToken(tailToken) || this.testToken("|");
        if (!isokfollow) {
            this.raiseError(this.getCurrentLine(), "Unknown token at end of match entry");
        }
        return new body_1.MatchEntry(guard, action);
    }
    parseStatementActionInBlock() {
        if (this.testToken("{")) {
            return this.parseBlockStatement();
        }
        else {
            return new body_1.BlockStatement(this.getCurrentSrcInfo(), [this.parseLineStatement()]);
        }
    }
    parseSwitchStatement() {
        const sinfo = this.getCurrentSrcInfo();
        this.ensureAndConsumeToken("switch");
        this.ensureAndConsumeToken("(");
        const mexp = this.parseExpression();
        this.ensureAndConsumeToken(")");
        try {
            this.m_penv.getCurrentFunctionScope().pushLocalScope();
            this.m_penv.getCurrentFunctionScope().defineLocalVar("$switch", `$switch_@${sinfo.pos}`, true);
            let entries = [];
            this.ensureAndConsumeToken("{");
            entries.push(this.parseSwitchEntry(this.getCurrentSrcInfo(), "}", () => this.parseStatementActionInBlock()));
            while (this.testAndConsumeTokenIf("|")) {
                entries.push(this.parseSwitchEntry(this.getCurrentSrcInfo(), "}", () => this.parseStatementActionInBlock()));
            }
            this.ensureAndConsumeToken("}");
            return new body_1.SwitchStatement(sinfo, mexp, entries);
        }
        finally {
            this.m_penv.getCurrentFunctionScope().popLocalScope();
        }
    }
    parseMatchStatement() {
        const sinfo = this.getCurrentSrcInfo();
        this.ensureAndConsumeToken("match");
        this.ensureAndConsumeToken("(");
        const mexp = this.parseExpression();
        this.ensureAndConsumeToken(")");
        try {
            this.m_penv.getCurrentFunctionScope().pushLocalScope();
            this.m_penv.getCurrentFunctionScope().defineLocalVar("$match", `$match_@${sinfo.pos}`, true);
            let entries = [];
            this.ensureAndConsumeToken("{");
            entries.push(this.parseMatchEntry(this.getCurrentSrcInfo(), "}", () => this.parseStatementActionInBlock()));
            while (this.testAndConsumeTokenIf("|")) {
                entries.push(this.parseMatchEntry(this.getCurrentSrcInfo(), "}", () => this.parseStatementActionInBlock()));
            }
            this.ensureAndConsumeToken("}");
            return new body_1.MatchStatement(sinfo, mexp, entries);
        }
        finally {
            this.m_penv.getCurrentFunctionScope().popLocalScope();
        }
    }
    parseStatement() {
        if (this.testToken("if")) {
            return this.parseIfElseStatement();
        }
        else if (this.testToken("switch")) {
            return this.parseSwitchStatement();
        }
        else if (this.testToken("match")) {
            return this.parseMatchStatement();
        }
        else {
            return this.parseLineStatement();
        }
    }
    parseBody(bodyid, file) {
        if (this.testToken("#")) {
            this.consumeToken();
            const scalarslots = this.testToken("(")
                ? this.parseListOf("(", ")", ",", () => {
                    this.ensureToken(TokenStrings.Identifier);
                    const vname = this.consumeTokenAndGetValue();
                    this.ensureAndConsumeToken(":");
                    const vtype = this.parseTypeSignature();
                    return { vname: vname, vtype: vtype };
                })[0]
                : [];
            const mixedslots = this.testToken("(")
                ? this.parseListOf("(", ")", ",", () => {
                    this.ensureToken(TokenStrings.Identifier);
                    const vname = this.consumeTokenAndGetValue();
                    this.ensureAndConsumeToken(":");
                    const vtype = this.parseTypeSignature();
                    return { vname: vname, vtype: vtype };
                })[0]
                : [];
            this.ensureToken(TokenStrings.Identifier);
            return { impl: new body_1.BodyImplementation(bodyid, file, this.consumeTokenAndGetValue()), optscalarslots: scalarslots, optmixedslots: mixedslots };
        }
        else if (this.testToken("=")) {
            this.consumeToken();
            const iname = this.consumeTokenAndGetValue();
            if (iname !== "default") {
                this.raiseError(this.getCurrentSrcInfo().line, "Only valid option is 'default'");
            }
            this.ensureAndConsumeToken(";");
            return { impl: new body_1.BodyImplementation(bodyid, file, "default"), optscalarslots: [], optmixedslots: [] };
        }
        else if (this.testToken("{")) {
            return { impl: new body_1.BodyImplementation(bodyid, file, this.parseBlockStatement()), optscalarslots: [], optmixedslots: [] };
        }
        else {
            return { impl: new body_1.BodyImplementation(bodyid, file, this.parseExpression()), optscalarslots: [], optmixedslots: [] };
        }
    }
    ////
    //Decl parsing
    parseAttributes() {
        let attributes = [];
        while (Lexer.isAttributeKW(this.peekTokenData())) {
            attributes.push(this.consumeTokenAndGetValue());
        }
        return attributes;
    }
    parseTemplateConstraint(hasconstraint) {
        if (!hasconstraint) {
            return this.m_penv.SpecialAnySignature;
        }
        else {
            return this.parseTypeSignature();
        }
    }
    parseTermDeclarations() {
        let terms = [];
        if (this.testToken("<")) {
            terms = this.parseListOf("<", ">", ",", () => {
                this.ensureToken(TokenStrings.Template);
                const templatename = this.consumeTokenAndGetValue();
                const isunique = this.testToken(TokenStrings.Identifier) && this.peekTokenData() === "unique";
                if (isunique) {
                    this.consumeToken();
                }
                const isgrounded = this.testToken(TokenStrings.Identifier) && this.peekTokenData() === "grounded";
                if (isgrounded) {
                    this.consumeToken();
                }
                const tconstraint = this.parseTemplateConstraint(!this.testToken(",") && !this.testToken(">") && !this.testToken("="));
                let isinfer = false;
                let defaulttype = undefined;
                if (this.testAndConsumeTokenIf("=")) {
                    if (this.testAndConsumeTokenIf("?")) {
                        isinfer = true;
                    }
                    else {
                        defaulttype = this.parseTypeSignature();
                    }
                }
                return new assembly_1.TemplateTermDecl(templatename, isunique, isgrounded, tconstraint, isinfer, defaulttype);
            })[0];
        }
        return terms;
    }
    parseSingleTermRestriction() {
        this.ensureToken(TokenStrings.Template);
        const templatename = this.consumeTokenAndGetValue();
        const isunique = this.testToken(TokenStrings.Identifier) && this.peekTokenData() === "unique";
        if (isunique) {
            this.consumeToken();
        }
        const isgrounded = this.testToken(TokenStrings.Identifier) && this.peekTokenData() === "grounded";
        if (isgrounded) {
            this.consumeToken();
        }
        const tconstraint = this.parseTemplateConstraint(true);
        return new assembly_1.TemplateTypeRestriction(new type_signature_1.TemplateTypeSignature(templatename), isunique, isgrounded, tconstraint);
    }
    parseTermRestrictionList() {
        const trl = this.parseSingleTermRestriction();
        if (this.testAndConsumeTokenIf("&&")) {
            const ands = this.parseTermRestrictionList();
            return [trl, ...ands];
        }
        else {
            return [trl];
        }
    }
    parseTermRestriction(parencheck) {
        if (parencheck && !this.testToken("{")) {
            return undefined;
        }
        this.testAndConsumeTokenIf("{");
        if (parencheck) {
            this.testAndConsumeTokenIf("when");
        }
        const trl = this.parseTermRestrictionList();
        if (parencheck) {
            this.ensureAndConsumeToken("}");
        }
        return new assembly_1.TypeConditionRestriction(trl);
    }
    parsePreAndPostConditions(sinfo, argnames, rtype) {
        let preconds = [];
        try {
            this.m_penv.pushFunctionScope(new parser_env_1.FunctionScope(new Set(argnames), rtype, false));
            while (this.testToken("requires") || this.testToken("validate")) {
                const isvalidate = this.testToken("validate");
                this.consumeToken();
                let level = isvalidate ? "release" : "debug";
                if (!isvalidate) {
                    level = this.parseBuildInfo(level);
                }
                const exp = this.parseOfExpression();
                let err = new body_1.LiteralNoneExpression(sinfo);
                if (this.testFollows("else")) {
                    err = this.parseExpression();
                }
                preconds.push(new assembly_1.PreConditionDecl(sinfo, isvalidate, level, exp, err));
                this.ensureAndConsumeToken(";");
            }
        }
        finally {
            this.m_penv.popFunctionScope();
        }
        let postconds = [];
        try {
            this.m_penv.pushFunctionScope(new parser_env_1.FunctionScope(argnames, rtype, false));
            while (this.testToken("ensures")) {
                this.consumeToken();
                let level = "debug";
                level = this.parseBuildInfo(level);
                const exp = this.parseExpression();
                postconds.push(new assembly_1.PostConditionDecl(sinfo, level, exp));
                this.ensureAndConsumeToken(";");
            }
        }
        finally {
            this.m_penv.popFunctionScope();
        }
        return [preconds, postconds];
    }
    parseNamespaceUsing(currentDecl) {
        //import NS {...} ;
        this.ensureAndConsumeToken("import");
        this.ensureToken(TokenStrings.Namespace);
        const fromns = this.consumeTokenAndGetValue();
        const names = this.parseListOf("{", "}", ",", () => {
            return this.consumeTokenAndGetValue();
        })[0];
        this.ensureAndConsumeToken(";");
        if (currentDecl.checkUsingNameClash(names)) {
            this.raiseError(this.getCurrentLine(), "Collision between imported using names");
        }
        currentDecl.usings.push(new assembly_1.NamespaceUsing(fromns, names));
    }
    parseNamespaceTypedef(currentDecl) {
        //typedef NAME<T...> = TypeConstraint;
        this.ensureAndConsumeToken("typedef");
        this.ensureToken(TokenStrings.Type);
        const tyname = this.consumeTokenAndGetValue();
        if (currentDecl.checkDeclNameClash(currentDecl.ns, tyname)) {
            this.raiseError(this.getCurrentLine(), "Collision between typedef and other names");
        }
        const terms = this.parseTermDeclarations();
        this.ensureAndConsumeToken("=");
        const rpos = this.scanToken(";");
        if (rpos === this.m_epos) {
            this.raiseError(this.getCurrentLine(), "Missing ; on typedef");
        }
        const btype = this.parseTypeSignature();
        this.consumeToken();
        currentDecl.typeDefs.set(currentDecl.ns + "::" + tyname, new assembly_1.NamespaceTypedef(currentDecl.ns, tyname, terms, btype));
    }
    parseProvides(iscorens, endtoken) {
        let provides = [];
        if (this.testAndConsumeTokenIf("provides")) {
            while (!endtoken.some((tok) => this.testToken(tok))) {
                this.consumeTokenIf(",");
                const pv = this.parseTypeSignature();
                let res = undefined;
                if (this.testAndConsumeTokenIf("when")) {
                    res = this.parseTermRestriction(false);
                }
                provides.push([pv, res]);
            }
        }
        if (!iscorens) {
            provides.push([new type_signature_1.NominalTypeSignature("NSCore", ["Object"]), undefined]);
        }
        return provides;
    }
    parseConstMember(staticMembers, allMemberNames, attributes) {
        const sinfo = this.getCurrentSrcInfo();
        //[attr] const NAME: T = exp;
        this.ensureAndConsumeToken("const");
        this.ensureToken(TokenStrings.Identifier);
        const sname = this.consumeTokenAndGetValue();
        this.ensureAndConsumeToken(":");
        const stype = this.parseTypeSignature();
        this.ensureAndConsumeToken("=");
        const value = this.parseConstExpression(false);
        this.ensureAndConsumeToken(";");
        if (allMemberNames.has(sname)) {
            this.raiseError(this.getCurrentLine(), "Collision between const and other names");
        }
        allMemberNames.add(sname);
        staticMembers.push(new assembly_1.StaticMemberDecl(sinfo, this.m_penv.getCurrentFile(), attributes, sname, stype, value));
    }
    parseStaticFunction(staticFunctions, allMemberNames, attributes) {
        const sinfo = this.getCurrentSrcInfo();
        //[attr] function NAME<T where C...>(params): type [requires...] [ensures...] { ... }
        this.ensureAndConsumeToken("function");
        const termRestrictions = this.parseTermRestriction(true);
        this.ensureToken(TokenStrings.Identifier);
        const fname = this.consumeTokenAndGetValue();
        const terms = this.parseTermDeclarations();
        let recursive = "no";
        if (Parser.attributeSetContains("recursive", attributes) || Parser.attributeSetContains("recursive?", attributes)) {
            recursive = Parser.attributeSetContains("recursive", attributes) ? "yes" : "cond";
        }
        const sig = this.parseInvokableCommon(InvokableKind.Basic, Parser.attributeSetContains("abstract", attributes), attributes, recursive, terms, termRestrictions);
        if (allMemberNames.has(fname)) {
            this.raiseError(this.getCurrentLine(), "Collision between static and other names");
        }
        allMemberNames.add(fname);
        staticFunctions.push(new assembly_1.StaticFunctionDecl(sinfo, this.m_penv.getCurrentFile(), fname, sig));
    }
    parseStaticOperator(staticOperators, allMemberNames, attributes) {
        const sinfo = this.getCurrentSrcInfo();
        //[attr] operator NAME(params): type [requires...] [ensures...] { ... }
        this.ensureAndConsumeToken("operator");
        const termRestrictions = this.parseTermRestriction(true);
        if (!this.testToken(TokenStrings.Identifier) && !this.testToken(TokenStrings.Operator)) {
            this.raiseError(sinfo.line, "Expected valid name for operator");
        }
        const fname = this.consumeTokenAndGetValue();
        let recursive = "no";
        if (Parser.attributeSetContains("recursive", attributes) || Parser.attributeSetContains("recursive?", attributes)) {
            recursive = Parser.attributeSetContains("recursive", attributes) ? "yes" : "cond";
        }
        const ikind = attributes.includes("dynamic") ? InvokableKind.DynamicOperator : InvokableKind.StaticOperator;
        const sig = this.parseInvokableCommon(ikind, Parser.attributeSetContains("abstract", attributes), attributes, recursive, [], termRestrictions);
        if (allMemberNames.has(fname)) {
            this.raiseError(this.getCurrentLine(), "Collision between static and other names");
        }
        allMemberNames.add(fname);
        staticOperators.push(new assembly_1.StaticOperatorDecl(sinfo, this.m_penv.getCurrentFile(), fname, sig));
    }
    parseMemberField(memberFields, allMemberNames, attributes) {
        const sinfo = this.getCurrentSrcInfo();
        //[attr] field NAME: T = exp;
        this.ensureAndConsumeToken("field");
        this.ensureToken(TokenStrings.Identifier);
        const fname = this.consumeTokenAndGetValue();
        this.ensureAndConsumeToken(":");
        const stype = this.parseTypeSignature();
        let value = undefined;
        if (this.testAndConsumeTokenIf("=")) {
            value = this.parseConstExpression(true);
        }
        this.ensureAndConsumeToken(";");
        if (allMemberNames.has(fname)) {
            this.raiseError(this.getCurrentLine(), "Collision between const and other names");
        }
        memberFields.push(new assembly_1.MemberFieldDecl(sinfo, this.m_penv.getCurrentFile(), attributes, fname, stype, value));
    }
    parseMemberMethod(thisRef, thisType, memberMethods, allMemberNames, attributes) {
        const sinfo = this.getCurrentSrcInfo();
        //[attr] [ref] method NAME<T where C...>(params): type [requires...] [ensures...] { ... }
        const refrcvr = this.testAndConsumeTokenIf("ref");
        this.ensureAndConsumeToken("method");
        const termRestrictions = this.parseTermRestriction(true);
        this.ensureToken(TokenStrings.Identifier);
        const mname = this.consumeTokenAndGetValue();
        const terms = this.parseTermDeclarations();
        let recursive = "no";
        if (Parser.attributeSetContains("recursive", attributes) || Parser.attributeSetContains("recursive?", attributes)) {
            recursive = Parser.attributeSetContains("recursive", attributes) ? "yes" : "cond";
        }
        const sig = this.parseInvokableCommon(InvokableKind.Member, Parser.attributeSetContains("abstract", attributes), attributes, recursive, terms, termRestrictions, thisRef, thisType);
        allMemberNames.add(mname);
        memberMethods.push(new assembly_1.MemberMethodDecl(sinfo, this.m_penv.getCurrentFile(), mname, refrcvr, sig));
    }
    parseInvariantsInto(invs) {
        try {
            //
            //TODO: we should support release/test/debug/spec attributes on invariants as well
            //
            this.m_penv.pushFunctionScope(new parser_env_1.FunctionScope(new Set(), new type_signature_1.NominalTypeSignature("NSCore", ["Bool"]), false));
            while (this.testToken("invariant")) {
                this.consumeToken();
                let level = this.parseBuildInfo("debug");
                const sinfo = this.getCurrentSrcInfo();
                const exp = this.parseConstExpression(true);
                invs.push(new assembly_1.InvariantDecl(sinfo, level, exp));
                this.ensureAndConsumeToken(";");
            }
        }
        finally {
            this.m_penv.popFunctionScope();
        }
    }
    parseOOPMembersCommon(thisType, currentNamespace, currentTypeNest, currentTermNest, nestedEntities, invariants, staticMembers, staticFunctions, staticOperators, memberFields, memberMethods) {
        let allMemberNames = new Set();
        while (!this.testToken("}")) {
            const attributes = this.parseAttributes();
            if (this.testToken("entity")) {
                this.parseObject(currentNamespace, nestedEntities, currentTypeNest, currentTermNest);
            }
            else if (this.testToken("invariant")) {
                this.parseInvariantsInto(invariants);
            }
            else if (this.testToken("const")) {
                this.parseConstMember(staticMembers, allMemberNames, attributes);
            }
            else if (this.testToken("function")) {
                this.parseStaticFunction(staticFunctions, allMemberNames, attributes);
            }
            else if (this.testToken("operator")) {
                this.parseStaticOperator(staticOperators, allMemberNames, attributes);
            }
            else if (this.testToken("field")) {
                this.parseMemberField(memberFields, allMemberNames, attributes);
            }
            else {
                this.ensureToken("method");
                const thisRef = attributes.find((attr) => attr === "ref");
                this.parseMemberMethod(thisRef, thisType, memberMethods, allMemberNames, attributes);
            }
        }
    }
    parseConcept(currentDecl) {
        const line = this.getCurrentLine();
        //[attr] concept NAME[T where C...] provides {...}
        const attributes = this.parseAttributes();
        const sinfo = this.getCurrentSrcInfo();
        this.ensureAndConsumeToken("concept");
        this.ensureToken(TokenStrings.Type);
        const cname = this.consumeTokenAndGetValue();
        const terms = this.parseTermDeclarations();
        const provides = this.parseProvides(currentDecl.ns === "NSCore", ["{"]);
        try {
            this.setRecover(this.scanCodeParens());
            this.ensureAndConsumeToken("{");
            const thisType = new type_signature_1.NominalTypeSignature(currentDecl.ns, [cname], terms.map((term) => new type_signature_1.TemplateTypeSignature(term.name)));
            const invariants = [];
            const staticMembers = [];
            const staticFunctions = [];
            const staticOperators = [];
            const memberFields = [];
            const memberMethods = [];
            const nestedEntities = new Map();
            this.parseOOPMembersCommon(thisType, currentDecl, [cname], [...terms], nestedEntities, invariants, staticMembers, staticFunctions, staticOperators, memberFields, memberMethods);
            this.ensureAndConsumeToken("}");
            if (currentDecl.checkDeclNameClash(currentDecl.ns, cname)) {
                this.raiseError(line, "Collision between concept and other names");
            }
            this.clearRecover();
            if (currentDecl.ns === "NSCore") {
                if (cname === "Result") {
                    attributes.push("__result_type");
                }
                else if (cname === "Option") {
                    attributes.push("__option_type");
                }
                else {
                    //not special
                }
            }
            const cdecl = new assembly_1.ConceptTypeDecl(sinfo, this.m_penv.getCurrentFile(), attributes, currentDecl.ns, cname, terms, provides, invariants, staticMembers, staticFunctions, staticOperators, memberFields, memberMethods, nestedEntities);
            currentDecl.concepts.set(cname, cdecl);
            this.m_penv.assembly.addConceptDecl(currentDecl.ns + "::" + cname, cdecl);
        }
        catch (ex) {
            this.processRecover();
        }
    }
    parseObject(currentDecl, enclosingMap, currentTypeNest, currentTermNest) {
        const line = this.getCurrentLine();
        //[attr] object NAME[T where C...] provides {...}
        const attributes = this.parseAttributes();
        const sinfo = this.getCurrentSrcInfo();
        this.ensureAndConsumeToken("entity");
        this.ensureToken(TokenStrings.Type);
        const ename = this.consumeTokenAndGetValue();
        const terms = this.parseTermDeclarations();
        const provides = this.parseProvides(currentDecl.ns === "NSCore", ["{"]);
        try {
            this.setRecover(this.scanCodeParens());
            this.ensureAndConsumeToken("{");
            const thisType = new type_signature_1.NominalTypeSignature(currentDecl.ns, [...currentTypeNest, ename], [...terms, ...currentTermNest].map((term) => new type_signature_1.TemplateTypeSignature(term.name)));
            const invariants = [];
            const staticMembers = [];
            const staticFunctions = [];
            const staticOperators = [];
            const memberFields = [];
            const memberMethods = [];
            const nestedEntities = new Map();
            this.parseOOPMembersCommon(thisType, currentDecl, [...currentTypeNest, ename], [...currentTermNest, ...terms], nestedEntities, invariants, staticMembers, staticFunctions, staticOperators, memberFields, memberMethods);
            this.ensureAndConsumeToken("}");
            if (currentDecl.checkDeclNameClash(currentDecl.ns, [...currentTypeNest, ename].join("::"))) {
                this.raiseError(line, "Collision between object and other names");
            }
            if (currentDecl.ns === "NSCore") {
                if (ename === "StringOf") {
                    attributes.push("__stringof_type");
                }
                else if (ename === "DataString") {
                    attributes.push("__datastring_type");
                }
                if (ename === "BufferOf") {
                    attributes.push("__bufferof_type");
                }
                else if (ename === "DataBuffer") {
                    attributes.push("__databuffer_type");
                }
                else if (ename === "Ok") {
                    attributes.push("__ok_type");
                }
                else if (ename === "Err") {
                    attributes.push("__err_type");
                }
                else if (ename === "Something") {
                    attributes.push("__something_type");
                }
                else if (ename === "List") {
                    attributes.push("__list_type");
                }
                else if (ename === "Stack") {
                    attributes.push("__stack_type");
                }
                else if (ename === "Queue") {
                    attributes.push("__queue_type");
                }
                else if (ename === "Set") {
                    attributes.push("__set_type");
                }
                else if (ename === "Map") {
                    attributes.push("__map_type");
                }
                else {
                    //not special
                }
            }
            this.clearRecover();
            const fename = [...currentTypeNest, ename].join("::");
            const feterms = [...currentTermNest, ...terms];
            const edecl = new assembly_1.EntityTypeDecl(sinfo, this.m_penv.getCurrentFile(), attributes, currentDecl.ns, fename, feterms, provides, invariants, staticMembers, staticFunctions, staticOperators, memberFields, memberMethods, nestedEntities);
            this.m_penv.assembly.addObjectDecl(currentDecl.ns + "::" + fename, edecl);
            currentDecl.objects.set(ename, edecl);
            if (enclosingMap !== undefined) {
                enclosingMap.set(ename, edecl);
            }
        }
        catch (ex) {
            this.processRecover();
        }
    }
    parseEnum(currentDecl) {
        const line = this.getCurrentLine();
        //[attr] enum NAME {...} [& {...}]
        const attributes = this.parseAttributes();
        const sinfo = this.getCurrentSrcInfo();
        const sfpos = this.sortedSrcFiles.findIndex((entry) => entry.fullname === this.m_penv.getCurrentFile());
        if (sfpos === -1) {
            this.raiseError(sinfo.line, "Source name not registered");
        }
        this.ensureAndConsumeToken("enum");
        this.ensureToken(TokenStrings.Type);
        const ename = this.consumeTokenAndGetValue();
        const etype = new type_signature_1.NominalTypeSignature(currentDecl.ns, [ename]);
        if (currentDecl.checkDeclNameClash(currentDecl.ns, ename)) {
            this.raiseError(line, "Collision between object and other names");
        }
        try {
            this.setRecover(this.scanCodeParens());
            const enums = this.parseListOf("{", "}", ",", () => {
                this.ensureToken(TokenStrings.Identifier);
                return this.consumeTokenAndGetValue();
            })[0];
            const provides = [
                [new type_signature_1.NominalTypeSignature("NSCore", ["Some"]), undefined],
                [new type_signature_1.NominalTypeSignature("NSCore", ["KeyType"]), undefined],
                [new type_signature_1.NominalTypeSignature("NSCore", ["APIType"]), undefined]
            ];
            const invariants = [];
            const staticMembers = [];
            const staticFunctions = [];
            const staticOperators = [];
            const memberFields = [];
            const memberMethods = [];
            for (let i = 0; i < enums.length; ++i) {
                const exp = new body_1.LiteralIntegralExpression(sinfo, i.toString() + "n", this.m_penv.SpecialNatSignature);
                const enminit = new body_1.ConstructorPrimaryExpression(sinfo, etype, new body_1.Arguments([new body_1.PositionalArgument(undefined, false, exp)]));
                const enm = new assembly_1.StaticMemberDecl(sinfo, this.m_penv.getCurrentFile(), ["__enum"], enums[i], etype, new body_1.ConstantExpressionValue(enminit, new Set()));
                staticMembers.push(enm);
            }
            if (this.testAndConsumeTokenIf("&")) {
                this.setRecover(this.scanCodeParens());
                this.ensureAndConsumeToken("{");
                const thisType = new type_signature_1.NominalTypeSignature(currentDecl.ns, [ename], []);
                const nestedEntities = new Map();
                this.parseOOPMembersCommon(thisType, currentDecl, [ename], [], nestedEntities, invariants, staticMembers, staticFunctions, staticOperators, memberFields, memberMethods);
                this.ensureAndConsumeToken("}");
                this.clearRecover();
            }
            if (currentDecl.checkDeclNameClash(currentDecl.ns, ename)) {
                this.raiseError(line, "Collision between object and other names");
            }
            if (invariants.length !== 0) {
                this.raiseError(line, "Cannot have invariant function on Enum types");
            }
            attributes.push("__enum_type", "__constructable");
            this.clearRecover();
            currentDecl.objects.set(ename, new assembly_1.EntityTypeDecl(sinfo, this.m_penv.getCurrentFile(), attributes, currentDecl.ns, ename, [], provides, invariants, staticMembers, staticFunctions, staticOperators, memberFields, memberMethods, new Map()));
            this.m_penv.assembly.addObjectDecl(currentDecl.ns + "::" + ename, currentDecl.objects.get(ename));
        }
        catch (ex) {
            this.processRecover();
        }
    }
    parseTypeDecl(currentDecl) {
        const line = this.getCurrentLine();
        const attributes = this.parseAttributes();
        const sinfo = this.getCurrentSrcInfo();
        this.ensureAndConsumeToken("typedecl");
        const iname = this.consumeTokenAndGetValue();
        const terms = this.parseTermDeclarations();
        if (currentDecl.checkDeclNameClash(currentDecl.ns, iname)) {
            this.raiseError(line, "Collision between object and other names");
        }
        const isassigntype = this.testAndConsumeTokenIf("=");
        const sfpos = this.sortedSrcFiles.findIndex((entry) => entry.fullname === this.m_penv.getCurrentFile());
        if (sfpos === -1) {
            this.raiseError(sinfo.line, "Source name not registered");
        }
        const bodyid = `k${sfpos}#${this.sortedSrcFiles[sfpos].shortname}::${sinfo.line}@${sinfo.pos}`;
        if (isassigntype) {
            if (this.testToken(TokenStrings.Regex)) {
                //[attr] typedecl NAME = regex;
                if (terms.length !== 0) {
                    this.raiseError(line, "Cannot have template terms on Validator type");
                }
                const vregex = this.consumeTokenAndGetValue();
                this.consumeToken();
                const re = bsqregex_1.BSQRegex.parse(this.m_penv.getCurrentNamespace(), vregex);
                if (typeof (re) === "string") {
                    this.raiseError(this.getCurrentLine(), re);
                }
                const validator = new assembly_1.StaticMemberDecl(sinfo, this.m_penv.getCurrentFile(), [], "vregex", new type_signature_1.NominalTypeSignature("NSCore", ["Regex"]), new body_1.ConstantExpressionValue(new body_1.LiteralRegexExpression(sinfo, re), new Set()));
                const param = new type_signature_1.FunctionParameter("arg", new type_signature_1.NominalTypeSignature("NSCore", ["String"]), false, undefined, undefined, undefined);
                const acceptsid = this.generateBodyID(sinfo, this.m_penv.getCurrentFile(), "accepts");
                const acceptsbody = new body_1.BodyImplementation(`${this.m_penv.getCurrentFile()}::${sinfo.pos}`, this.m_penv.getCurrentFile(), "validator_accepts");
                const acceptsinvoke = new assembly_1.InvokeDecl(sinfo, acceptsid, this.m_penv.getCurrentFile(), ["__safe"], "no", [], undefined, [param], undefined, undefined, new type_signature_1.NominalTypeSignature("NSCore", ["Bool"]), [], [], false, false, new Set(), acceptsbody, [], []);
                const accepts = new assembly_1.StaticFunctionDecl(sinfo, this.m_penv.getCurrentFile(), "accepts", acceptsinvoke);
                const provides = [[new type_signature_1.NominalTypeSignature("NSCore", ["Some"]), undefined], [new type_signature_1.NominalTypeSignature("NSCore", ["Validator"]), undefined]];
                const validatortype = new assembly_1.EntityTypeDecl(sinfo, this.m_penv.getCurrentFile(), ["__validator_type", ...attributes], currentDecl.ns, iname, [], provides, [], [validator], [accepts], [], [], [], new Map());
                currentDecl.objects.set(iname, validatortype);
                this.m_penv.assembly.addObjectDecl(currentDecl.ns + "::" + iname, currentDecl.objects.get(iname));
                this.m_penv.assembly.addValidatorRegex(currentDecl.ns + "::" + iname, re);
            }
            else {
                //[attr] typedecl NAME = PRIMITIVE [& {...}];
                if (terms.length !== 0) {
                    this.raiseError(line, "Cannot have template terms on Typed Primitive type");
                }
                const idval = this.parseNominalType();
                let provides = [[new type_signature_1.NominalTypeSignature("NSCore", ["Some"]), undefined], [new type_signature_1.NominalTypeSignature("NSCore", ["APIType"]), undefined]];
                provides.push([new type_signature_1.NominalTypeSignature("NSCore", ["KeyType"]), new assembly_1.TypeConditionRestriction([new assembly_1.TemplateTypeRestriction(idval, false, false, new type_signature_1.NominalTypeSignature("NSCore", ["KeyType"]))])]);
                if (attributes.includes("algebraic")) {
                    provides.push([new type_signature_1.NominalTypeSignature("NSCore", ["Algebraic"]), undefined]);
                }
                if (attributes.includes("orderable")) {
                    provides.push([new type_signature_1.NominalTypeSignature("NSCore", ["Orderable"]), undefined]);
                }
                //
                //TODO: [using {+, -, *, /, ==, !=, >, < , <=, >=}]
                //
                const invariants = [];
                const staticMembers = [];
                const staticFunctions = [];
                const staticOperators = [];
                const memberFields = [];
                const memberMethods = [];
                if (this.testAndConsumeTokenIf("&")) {
                    this.setRecover(this.scanCodeParens());
                    this.ensureAndConsumeToken("{");
                    const thisType = new type_signature_1.NominalTypeSignature(currentDecl.ns, [iname], []);
                    const nestedEntities = new Map();
                    this.parseOOPMembersCommon(thisType, currentDecl, [iname], [], nestedEntities, invariants, staticMembers, staticFunctions, staticOperators, memberFields, memberMethods);
                    this.ensureAndConsumeToken("}");
                    if (currentDecl.checkDeclNameClash(currentDecl.ns, iname)) {
                        this.raiseError(line, "Collision between concept and other names");
                    }
                    this.clearRecover();
                }
                else {
                    this.ensureAndConsumeToken(";");
                }
                const vparam = new type_signature_1.FunctionParameter("v", idval, false, undefined, undefined, undefined);
                const valueid = this.generateBodyID(sinfo, this.m_penv.getCurrentFile(), "value");
                const valuebody = new body_1.BodyImplementation(`${bodyid}_value`, this.m_penv.getCurrentFile(), "special_extract");
                const valuedecl = new assembly_1.InvokeDecl(sinfo, valueid, this.m_penv.getCurrentFile(), ["__safe"], "no", [], undefined, [vparam], undefined, undefined, idval, [], [], false, false, new Set(), valuebody, [], []);
                const value = new assembly_1.MemberMethodDecl(sinfo, this.m_penv.getCurrentFile(), "value", false, valuedecl);
                memberMethods.push(value);
                attributes.push("__typedprimitive", "__constructable");
                currentDecl.objects.set(iname, new assembly_1.EntityTypeDecl(sinfo, this.m_penv.getCurrentFile(), attributes, currentDecl.ns, iname, [], provides, invariants, staticMembers, staticFunctions, staticOperators, memberFields, memberMethods, new Map()));
                this.m_penv.assembly.addObjectDecl(currentDecl.ns + "::" + iname, currentDecl.objects.get(iname));
            }
        }
        else {
            //[attr] typedecl NAME<...> [provides ... ] [using {...}] of
            // Foo {...}
            // | ...
            // [& {...}] | ;
            const concepttype = new type_signature_1.NominalTypeSignature(currentDecl.ns, [iname], terms);
            const provides = this.parseProvides(currentDecl.ns === "NSCore", ["of", "using"]);
            let cusing = [];
            if (this.testAndConsumeTokenIf("using")) {
                cusing = this.parseListOf("{", "}", ",", () => {
                    const mfinfo = this.getCurrentSrcInfo();
                    this.ensureToken(TokenStrings.Identifier);
                    const name = this.consumeTokenAndGetValue();
                    this.ensureAndConsumeToken(":");
                    const ttype = this.parseTypeSignature();
                    let dvalue = undefined;
                    if (this.testAndConsumeTokenIf("=")) {
                        dvalue = this.parseConstExpression(false);
                    }
                    return new assembly_1.MemberFieldDecl(mfinfo, this.m_penv.getCurrentFile(), [], name, ttype, dvalue);
                })[0];
            }
            this.ensureAndConsumeToken("of");
            const edecls = [];
            while (!this.testToken(";") && !this.testToken("&")) {
                if (this.testToken("|")) {
                    this.consumeToken();
                }
                let esinfo = this.getCurrentSrcInfo();
                this.ensureToken(TokenStrings.Type);
                const ename = this.consumeTokenAndGetValue();
                if (currentDecl.checkDeclNameClash(currentDecl.ns, ename)) {
                    this.raiseError(line, "Collision between object and other names");
                }
                const invariants = [];
                const staticMembers = [];
                const staticFunctions = [];
                const staticOperators = [];
                let memberFields = [];
                const memberMethods = [];
                if (this.testFollows("{", TokenStrings.Identifier)) {
                    memberFields = this.parseListOf("{", "}", ",", () => {
                        const mfinfo = this.getCurrentSrcInfo();
                        this.ensureToken(TokenStrings.Identifier);
                        const name = this.consumeTokenAndGetValue();
                        this.ensureAndConsumeToken(":");
                        const ttype = this.parseTypeSignature();
                        let dvalue = undefined;
                        if (this.testAndConsumeTokenIf("=")) {
                            dvalue = this.parseConstExpression(false);
                        }
                        return new assembly_1.MemberFieldDecl(mfinfo, this.m_penv.getCurrentFile(), [], name, ttype, dvalue);
                    })[0];
                }
                else {
                    const thisType = new type_signature_1.NominalTypeSignature(currentDecl.ns, [ename], []);
                    const nestedEntities = new Map();
                    this.parseOOPMembersCommon(thisType, currentDecl, [ename], [], nestedEntities, invariants, staticMembers, staticFunctions, staticOperators, memberFields, memberMethods);
                }
                const eprovides = [[concepttype, undefined]];
                const edecl = new assembly_1.EntityTypeDecl(esinfo, this.m_penv.getCurrentFile(), ["__adt_entity_type"], currentDecl.ns, ename, terms, eprovides, invariants, staticMembers, staticFunctions, staticOperators, memberFields, memberMethods, new Map());
                edecls.push(edecl);
                currentDecl.objects.set(ename, edecl);
                this.m_penv.assembly.addObjectDecl(currentDecl.ns + "::" + ename, currentDecl.objects.get(ename));
            }
            const invariants = [];
            const staticMembers = [];
            const staticFunctions = [];
            const staticOperators = [];
            const memberFields = [];
            const memberMethods = [];
            if (this.testAndConsumeTokenIf("&")) {
                this.setRecover(this.scanCodeParens());
                this.ensureAndConsumeToken("{");
                const thisType = new type_signature_1.NominalTypeSignature(currentDecl.ns, [iname], []);
                const nestedEntities = new Map();
                this.parseOOPMembersCommon(thisType, currentDecl, [iname], [], nestedEntities, invariants, staticMembers, staticFunctions, staticOperators, memberFields, memberMethods);
                this.ensureAndConsumeToken("}");
                if (currentDecl.checkDeclNameClash(currentDecl.ns, iname)) {
                    this.raiseError(line, "Collision between concept and other names");
                }
                this.clearRecover();
            }
            else {
                this.ensureAndConsumeToken(";");
            }
            if (memberFields.length !== 0) {
                this.raiseError(sinfo.line, "Cannot declare additional member fields on ADT");
            }
            const cdecl = new assembly_1.ConceptTypeDecl(sinfo, this.m_penv.getCurrentFile(), ["__adt_concept_type"], currentDecl.ns, iname, terms, provides, invariants, staticMembers, staticFunctions, staticOperators, cusing, memberMethods, new Map());
            currentDecl.concepts.set(iname, cdecl);
            this.m_penv.assembly.addConceptDecl(currentDecl.ns + "::" + iname, cdecl);
        }
    }
    parseNamespaceConst(currentDecl) {
        const sinfo = this.getCurrentSrcInfo();
        //[attr] const NAME = exp;
        const attributes = this.parseAttributes();
        this.ensureAndConsumeToken("const");
        this.ensureToken(TokenStrings.Identifier);
        const gname = this.consumeTokenAndGetValue();
        this.ensureAndConsumeToken(":");
        const gtype = this.parseTypeSignature();
        this.ensureAndConsumeToken("=");
        const value = this.parseConstExpression(false);
        this.ensureAndConsumeToken(";");
        if (currentDecl.checkDeclNameClash(currentDecl.ns, gname)) {
            this.raiseError(this.getCurrentLine(), "Collision between global and other names");
        }
        currentDecl.consts.set(gname, new assembly_1.NamespaceConstDecl(sinfo, this.m_penv.getCurrentFile(), attributes, currentDecl.ns, gname, gtype, value));
    }
    parseNamespaceFunction(currentDecl) {
        const sinfo = this.getCurrentSrcInfo();
        //[attr] function NAME<T where C...>(params): type [requires...] [ensures...] { ... }
        const attributes = this.parseAttributes();
        this.ensureAndConsumeToken("function");
        this.ensureToken(TokenStrings.Identifier);
        const fname = this.consumeTokenAndGetValue();
        const terms = this.parseTermDeclarations();
        let recursive = "no";
        if (Parser.attributeSetContains("recursive", attributes) || Parser.attributeSetContains("recursive?", attributes)) {
            recursive = Parser.attributeSetContains("recursive", attributes) ? "yes" : "cond";
        }
        const sig = this.parseInvokableCommon(InvokableKind.Basic, false, attributes, recursive, terms, undefined);
        currentDecl.functions.set(fname, new assembly_1.NamespaceFunctionDecl(sinfo, this.m_penv.getCurrentFile(), currentDecl.ns, fname, sig));
    }
    parseNamespaceOperator(currentDecl) {
        const sinfo = this.getCurrentSrcInfo();
        //[attr] operator [NS ::] NAME(params): type [requires...] [ensures...] { ... }
        const attributes = this.parseAttributes();
        this.ensureAndConsumeToken("operator");
        if (this.testToken("+") || this.testToken("-") || this.testToken("*") || this.testToken("/") ||
            this.testToken("==") || this.testToken("!=") || this.testToken("<") || this.testToken(">") || this.testToken("<=") || this.testToken(">=")) {
            const fname = this.consumeTokenAndGetValue();
            let recursive = "no";
            if (Parser.attributeSetContains("recursive", attributes) || Parser.attributeSetContains("recursive?", attributes)) {
                recursive = Parser.attributeSetContains("recursive", attributes) ? "yes" : "cond";
            }
            const ns = this.m_penv.assembly.getNamespace("NSCore");
            const sig = this.parseInvokableCommon(InvokableKind.StaticOperator, attributes.includes("abstract"), attributes, recursive, [], undefined);
            let level = -1;
            if (fname === "+" || fname === "-") {
                level = attributes.includes("prefix") ? 1 : 3;
            }
            else if (fname === "*" || fname === "/") {
                level = 2;
            }
            else {
                level = 4;
            }
            if (!ns.operators.has(fname)) {
                ns.operators.set(fname, []);
            }
            ns.operators.get(fname).push(new assembly_1.NamespaceOperatorDecl(sinfo, this.m_penv.getCurrentFile(), "NSCore", fname, sig, level));
        }
        else {
            if (!this.testToken(TokenStrings.Identifier) && !this.testToken(TokenStrings.Operator)) {
                this.raiseError(sinfo.line, "Expected valid name for operator");
            }
            const fname = this.consumeTokenAndGetValue();
            let recursive = "no";
            if (Parser.attributeSetContains("recursive", attributes) || Parser.attributeSetContains("recursive?", attributes)) {
                recursive = Parser.attributeSetContains("recursive", attributes) ? "yes" : "cond";
            }
            let ns = currentDecl;
            if (this.testToken(TokenStrings.Namespace)) {
                const nns = this.consumeTokenAndGetValue();
                this.ensureAndConsumeToken("::");
                ns = this.m_penv.assembly.getNamespace(nns);
            }
            const isabstract = assembly_1.OOPTypeDecl.attributeSetContains("abstract", attributes);
            const ikind = attributes.includes("dynamic") ? InvokableKind.DynamicOperator : InvokableKind.StaticOperator;
            const sig = this.parseInvokableCommon(ikind, isabstract, attributes, recursive, [], undefined);
            let level = -1;
            if (isabstract) {
                level = Number.parseInt(this.consumeTokenAndGetValue());
                this.ensureAndConsumeToken(";");
            }
            if (!ns.operators.has(fname)) {
                ns.operators.set(fname, []);
            }
            ns.operators.get(fname).push(new assembly_1.NamespaceOperatorDecl(sinfo, this.m_penv.getCurrentFile(), ns.ns, fname, sig, level));
        }
    }
    parseEndOfStream() {
        this.ensureAndConsumeToken(TokenStrings.EndOfStream);
    }
    ////
    //Public methods
    parseCompilationUnitPass1(file, contents, macrodefs) {
        this.setNamespaceAndFile("[No Namespace]", file);
        const lexer = new Lexer(contents, macrodefs);
        this.initialize(lexer.lex());
        //namespace NS; ...
        this.ensureAndConsumeToken("namespace");
        this.ensureToken(TokenStrings.Namespace);
        const ns = this.consumeTokenAndGetValue();
        this.ensureAndConsumeToken(";");
        this.setNamespaceAndFile(ns, file);
        const nsdecl = this.m_penv.assembly.ensureNamespace(ns);
        let parseok = true;
        while (this.m_cpos < this.m_epos) {
            try {
                this.m_cpos = this.scanTokenOptions("function", "operator", "const", "typedef", "concept", "entity", "enum", "typedecl");
                if (this.m_cpos === this.m_epos) {
                    const tokenIndexBeforeEOF = this.m_cpos - 2;
                    if (tokenIndexBeforeEOF >= 0 && tokenIndexBeforeEOF < this.m_tokens.length) {
                        const tokenBeforeEOF = this.m_tokens[tokenIndexBeforeEOF];
                        if (tokenBeforeEOF.kind === TokenStrings.Error) {
                            this.raiseError(tokenBeforeEOF.line, `Expected */ but found EOF`);
                        }
                    }
                    break;
                }
                if (this.testToken("function") || this.testToken("const")) {
                    this.consumeToken();
                    this.ensureToken(TokenStrings.Identifier);
                    const fname = this.consumeTokenAndGetValue();
                    if (nsdecl.declaredNames.has(fname)) {
                        this.raiseError(this.getCurrentLine(), "Duplicate definition of name");
                    }
                    nsdecl.declaredNames.add(ns + "::" + fname);
                }
                else if (this.testToken("operator")) {
                    this.consumeToken();
                    if (this.testToken("+") || this.testToken("-") || this.testToken("*") || this.testToken("/")
                        || this.testToken("==") || this.testToken("!=") || this.testToken("<") || this.testToken(">") || this.testToken("<=") || this.testToken(">=")) {
                        const fname = this.consumeTokenAndGetValue();
                        const nscore = this.m_penv.assembly.getNamespace("NSCore");
                        nscore.declaredNames.add("NSCore::" + fname);
                    }
                    else {
                        const fname = this.consumeTokenAndGetValue();
                        let nns = ns;
                        if (this.testToken(TokenStrings.Namespace)) {
                            nns = this.consumeTokenAndGetValue();
                        }
                        if (nns === ns) {
                            nsdecl.declaredNames.add(ns + "::" + fname);
                        }
                    }
                }
                else if (this.testToken("typedef")) {
                    this.consumeToken();
                    this.ensureToken(TokenStrings.Type);
                    const tname = this.consumeTokenAndGetValue();
                    if (nsdecl.declaredNames.has(tname)) {
                        this.raiseError(this.getCurrentLine(), "Duplicate definition of name");
                    }
                    nsdecl.declaredNames.add(ns + "::" + tname);
                }
                else if (this.testToken("typedecl")) {
                    this.consumeToken();
                    this.ensureToken(TokenStrings.Type);
                    const tname = this.consumeTokenAndGetValue();
                    if (nsdecl.declaredNames.has(tname)) {
                        this.raiseError(this.getCurrentLine(), "Duplicate definition of name");
                    }
                    nsdecl.declaredNames.add(ns + "::" + tname);
                    const isassigntype = this.testAndConsumeTokenIf("=");
                    if (isassigntype) {
                        if (this.testToken(TokenStrings.Regex)) {
                            this.consumeToken();
                            this.ensureAndConsumeToken(";");
                        }
                        else {
                            if (this.testAndConsumeTokenIf("&")) {
                                this.ensureToken("{"); //we should be at the opening left paren 
                                this.m_cpos = this.scanCodeParens(); //scan to the closing paren
                            }
                        }
                    }
                    else {
                        //[attr] typedecl NAME<...> [provides ... ] [using {...}] of
                        // Foo {...}
                        // | ...
                        // [& {...}] | ;
                        this.parseProvides(false /*Doesn't matter since we arejust scanning*/, ["of", "using"]);
                        if (this.testAndConsumeTokenIf("using")) {
                            this.ensureToken("{"); //we should be at the opening left paren 
                            this.m_cpos = this.scanCodeParens(); //scan to the closing paren
                        }
                        this.ensureAndConsumeToken("of");
                        while (!this.testToken(";") && !this.testToken("&")) {
                            if (this.testToken("|")) {
                                this.consumeToken();
                            }
                            this.ensureToken(TokenStrings.Type);
                            const ename = this.consumeTokenAndGetValue();
                            if (nsdecl.declaredNames.has(tname)) {
                                this.raiseError(this.getCurrentLine(), "Duplicate definition of name");
                            }
                            nsdecl.declaredNames.add(ns + "::" + ename);
                            if (this.testToken("{")) {
                                this.m_cpos = this.scanCodeParens(); //scan to the closing paren
                            }
                        }
                        if (this.testAndConsumeTokenIf("&")) {
                            this.ensureToken("{"); //we should be at the opening left paren 
                            this.m_cpos = this.scanCodeParens(); //scan to the closing paren
                        }
                        else {
                            this.ensureAndConsumeToken(";");
                        }
                    }
                }
                else if (this.testToken("enum")) {
                    this.consumeToken();
                    this.ensureToken(TokenStrings.Type);
                    const tname = this.consumeTokenAndGetValue();
                    if (nsdecl.declaredNames.has(tname)) {
                        this.raiseError(this.getCurrentLine(), "Duplicate definition of name");
                    }
                    if (this.testAndConsumeTokenIf("=")) {
                        this.ensureAndConsumeToken(TokenStrings.Type);
                    }
                    this.ensureToken("{"); //we should be at the opening left paren 
                    this.m_cpos = this.scanCodeParens(); //scan to the closing paren
                    nsdecl.declaredNames.add(ns + "::" + tname);
                    if (this.testToken("&")) {
                        this.ensureToken("{"); //we should be at the opening left paren 
                        this.m_cpos = this.scanCodeParens(); //scan to the closing paren
                    }
                }
                else if (this.testToken("concept") || this.testToken("entity")) {
                    this.consumeToken();
                    this.ensureToken(TokenStrings.Type);
                    const tname = this.consumeTokenAndGetValue();
                    if (nsdecl.declaredNames.has(tname)) {
                        this.raiseError(this.getCurrentLine(), "Duplicate definition of name");
                    }
                    nsdecl.declaredNames.add(ns + "::" + tname);
                    this.parseTermDeclarations();
                    this.parseProvides(ns === "NSCore", ["{"]);
                    this.ensureToken("{"); //we should be at the opening left paren 
                    this.m_cpos = this.scanCodeParens(); //scan to the closing paren
                }
                else {
                    this.raiseError(this.getCurrentLine(), "Failed to parse top-level namespace declaration");
                }
            }
            catch (ex) {
                this.m_cpos++;
                parseok = false;
            }
        }
        return parseok;
    }
    parseCompilationUnitPass2(file, contents, macrodefs) {
        this.setNamespaceAndFile("[No Namespace]", file);
        const lexer = new Lexer(contents, macrodefs);
        this.initialize(lexer.lex());
        //namespace NS; ...
        this.ensureAndConsumeToken("namespace");
        this.ensureToken(TokenStrings.Namespace);
        const ns = this.consumeTokenAndGetValue();
        this.ensureAndConsumeToken(";");
        this.setNamespaceAndFile(ns, file);
        const nsdecl = this.m_penv.assembly.ensureNamespace(ns);
        let importok = true;
        let parseok = true;
        while (this.m_cpos < this.m_epos) {
            const rpos = this.scanTokenOptions("function", "operator", "const", "import", "typedef", "concept", "entity", "enum", "typedecl", TokenStrings.EndOfStream);
            try {
                if (rpos === this.m_epos) {
                    break;
                }
                const tk = this.m_tokens[rpos].kind;
                importok = importok && tk === "import";
                if (tk === "import") {
                    if (!importok) {
                        this.raiseError(this.getCurrentLine(), "Using statements must come before other declarations");
                    }
                    this.parseNamespaceUsing(nsdecl);
                }
                else if (tk === "function") {
                    this.parseNamespaceFunction(nsdecl);
                }
                else if (tk === "operator") {
                    this.parseNamespaceOperator(nsdecl);
                }
                else if (tk === "const") {
                    this.parseNamespaceConst(nsdecl);
                }
                else if (tk === "typedef") {
                    this.parseNamespaceTypedef(nsdecl);
                }
                else if (tk === "concept") {
                    this.parseConcept(nsdecl);
                }
                else if (tk === "entity") {
                    this.parseObject(nsdecl, undefined, [], []);
                }
                else if (tk === "enum") {
                    this.parseEnum(nsdecl);
                }
                else if (tk === "typedecl") {
                    this.parseTypeDecl(nsdecl);
                }
                else if (tk === TokenStrings.EndOfStream) {
                    this.parseEndOfStream();
                }
                else {
                    this.raiseError(this.getCurrentLine(), "Invalid top-level definiton");
                }
            }
            catch (ex) {
                this.m_cpos = rpos + 1;
                parseok = false;
            }
        }
        return parseok;
    }
    getParseErrors() {
        return this.m_errors.length !== 0 ? this.m_errors : undefined;
    }
}
exports.Parser = Parser;
//# sourceMappingURL=parser.js.map