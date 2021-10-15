"use strict";
//-------------------------------------------------------------------------------------------------------
// Copyright (C) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE.txt file in the project root for full license information.
//-------------------------------------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegexSequence = exports.RegexAlternation = exports.RegexOptional = exports.RegexRangeRepeat = exports.RegexPlusRepeat = exports.RegexStarRepeat = exports.RegexConstClass = exports.RegexDotCharClass = exports.RegexCharRange = exports.RegexLiteral = exports.RegexComponent = exports.BSQRegex = void 0;
const assert = require("assert");
class RegexParser {
    constructor(currentns, restr) {
        this.currentns = currentns;
        this.restr = restr;
        this.pos = 0;
    }
    done() {
        return this.restr.length <= this.pos;
    }
    isToken(tk) {
        return this.restr[this.pos] === tk;
    }
    token() {
        return this.restr[this.pos];
    }
    advance(dist) {
        this.pos = this.pos + (dist !== undefined ? dist : 1);
    }
    parseBaseComponent() {
        let res;
        if (this.isToken("(")) {
            this.advance();
            res = this.parseComponent();
            if (!this.isToken(")")) {
                return "Un-matched paren";
            }
            this.advance();
        }
        else if (this.isToken("[")) {
            this.advance();
            const compliment = this.isToken("^");
            if (compliment) {
                this.advance();
            }
            let range = [];
            while (!this.isToken("]")) {
                const lb = this.token();
                this.advance();
                if (!this.isToken("-")) {
                    range.push({ lb: lb.codePointAt(0), ub: lb.codePointAt(0) });
                }
                else {
                    this.advance();
                    const ub = this.token();
                    this.advance();
                    range.push({ lb: lb.codePointAt(0), ub: ub.codePointAt(0) });
                }
            }
            if (!this.isToken("]")) {
                return "Invalid range";
            }
            this.advance();
            return new RegexCharRange(compliment, range);
        }
        else if (this.isToken("$")) {
            this.advance();
            if (!this.isToken("{")) {
                return "Invalid regex const";
            }
            this.advance();
            let fname = "";
            while (!this.isToken("}")) {
                fname += this.token();
                this.advance();
            }
            if (!this.isToken("}")) {
                return "Invalid regex const";
            }
            this.advance();
            let ccpos = fname.indexOf("::");
            let ns = ccpos === -1 ? this.currentns : fname.slice(0, ccpos);
            let ccname = ccpos === -1 ? fname : fname.slice(ccpos + 3);
            return new RegexConstClass(ns, ccname);
        }
        else {
            res = new RegexLiteral(this.token(), this.token(), this.token());
            this.advance();
        }
        return res;
    }
    parseCharClassOrEscapeComponent() {
        if (this.isToken(".")) {
            return new RegexDotCharClass();
        }
        else if (this.isToken("\\")) {
            this.advance();
            if (this.isToken("\\") || this.isToken("/")
                || this.isToken(".") || this.isToken("*") || this.isToken("+") || this.isToken("?") || this.isToken("|")
                || this.isToken("(") || this.isToken(")") || this.isToken("[") || this.isToken("]") || this.isToken("{") || this.isToken("}")
                || this.isToken("$")) {
                const cc = this.token();
                this.advance();
                return new RegexLiteral(`\\${cc}`, cc, cc);
            }
            else {
                const cc = this.token();
                this.advance();
                let rc = "";
                if (cc == "n") {
                    rc = "\n";
                }
                else if (cc == "r") {
                    rc = "\r";
                }
                else {
                    rc = "\t";
                }
                return new RegexLiteral(`\\${cc}`, `\\${cc}`, rc);
            }
        }
        else {
            return this.parseBaseComponent();
        }
    }
    parseRepeatComponent() {
        let rcc = this.parseCharClassOrEscapeComponent();
        if (typeof (rcc) === "string") {
            return rcc;
        }
        while (this.isToken("*") || this.isToken("+") || this.isToken("?") || this.isToken("{")) {
            if (this.isToken("*")) {
                rcc = new RegexStarRepeat(rcc);
                this.advance();
            }
            else if (this.isToken("+")) {
                rcc = new RegexPlusRepeat(rcc);
                this.advance();
            }
            else if (this.isToken("?")) {
                rcc = new RegexOptional(rcc);
                this.advance();
            }
            else {
                this.advance();
                let nre = new RegExp(/[0-9]+/, "y");
                nre.lastIndex = this.pos;
                const nmin = nre.exec(this.restr);
                if (nmin === null) {
                    return "Invalid number";
                }
                this.advance(nmin[0].length);
                const min = Number.parseInt(nmin[0]);
                let max = min;
                if (this.isToken(",")) {
                    this.advance();
                    nre.lastIndex = this.pos;
                    const nmax = nre.exec(this.restr);
                    if (nmax === null) {
                        return "Invalid number";
                    }
                    this.advance(nmax[0].length);
                    max = Number.parseInt(nmax[0]);
                }
                if (!this.isToken("}")) {
                    return "Un-matched paren";
                }
                this.advance();
                rcc = new RegexRangeRepeat(rcc, min, max);
            }
        }
        return rcc;
    }
    parseSequenceComponent() {
        let sre = [];
        while (!this.done() && !this.isToken("|") && !this.isToken(")")) {
            const rpe = this.parseRepeatComponent();
            if (typeof (rpe) === "string") {
                return rpe;
            }
            if (sre.length === 0) {
                sre.push(rpe);
            }
            else {
                const lcc = sre[sre.length - 1];
                if (lcc instanceof RegexLiteral && rpe instanceof RegexLiteral) {
                    sre[sre.length - 1] = RegexLiteral.mergeLiterals(lcc, rpe);
                }
                else {
                    sre.push(rpe);
                }
            }
        }
        if (sre.length === 0) {
            return "Malformed regex";
        }
        if (sre.length === 1) {
            return sre[0];
        }
        else {
            return new RegexSequence(sre);
        }
    }
    parseAlternationComponent() {
        const rpei = this.parseSequenceComponent();
        if (typeof (rpei) === "string") {
            return rpei;
        }
        let are = [rpei];
        while (!this.done() && this.isToken("|")) {
            this.advance();
            const rpe = this.parseSequenceComponent();
            if (typeof (rpe) === "string") {
                return rpe;
            }
            are.push(rpe);
        }
        if (are.length === 1) {
            return are[0];
        }
        else {
            return new RegexAlternation(are);
        }
    }
    parseComponent() {
        return this.parseAlternationComponent();
    }
}
class BSQRegex {
    constructor(restr, re) {
        this.restr = restr;
        this.re = re;
    }
    compileToJS() {
        //
        //TODO: we actually have NFA semantics for our regex -- JS matching is a subset so we need to replace this!!!
        //
        return "^" + this.re.compileToJS() + "$";
    }
    compileToPatternToSMT(ascii) {
        return this.re.compilePatternToSMT(ascii);
    }
    static parse(currentns, rstr) {
        const reparser = new RegexParser(currentns, rstr.substr(1, rstr.length - 2));
        const rep = reparser.parseComponent();
        if (typeof (rep) === "string") {
            return rep;
        }
        else {
            return new BSQRegex(rstr, rep);
        }
    }
    jemit() {
        return { restr: this.restr, re: this.re.jemit() };
    }
    static jparse(obj) {
        return new BSQRegex(obj.restr, RegexComponent.jparse(obj.re));
    }
}
exports.BSQRegex = BSQRegex;
class RegexComponent {
    useParens() {
        return false;
    }
    static jparse(obj) {
        const tag = obj.tag;
        switch (tag) {
            case "Literal":
                return RegexLiteral.jparse(obj);
            case "CharRange":
                return RegexCharRange.jparse(obj);
            case "DotCharClass":
                return RegexDotCharClass.jparse(obj);
            case "ConstRegexClass":
                return RegexConstClass.jparse(obj);
            case "StarRepeat":
                return RegexStarRepeat.jparse(obj);
            case "PlusRepeat":
                return RegexPlusRepeat.jparse(obj);
            case "RangeRepeat":
                return RegexRangeRepeat.jparse(obj);
            case "Optional":
                return RegexOptional.jparse(obj);
            case "Alternation":
                return RegexAlternation.jparse(obj);
            default:
                return RegexSequence.jparse(obj);
        }
    }
}
exports.RegexComponent = RegexComponent;
class RegexLiteral extends RegexComponent {
    constructor(restr, escstr, litstr) {
        super();
        this.restr = restr;
        this.escstr = escstr;
        this.litstr = litstr;
    }
    jemit() {
        return { tag: "Literal", restr: this.restr, escstr: this.escstr, litstr: this.litstr };
    }
    static jparse(obj) {
        return new RegexLiteral(obj.restr, obj.escstr, obj.litstr);
    }
    static mergeLiterals(l1, l2) {
        return new RegexLiteral(l1.restr + l2.restr, l1.escstr + l2.escstr, l1.litstr + l2.litstr);
    }
    compileToJS() {
        return this.restr;
    }
    compilePatternToSMT(ascii) {
        assert(ascii);
        return `(str.to.re "${this.escstr}")`;
    }
}
exports.RegexLiteral = RegexLiteral;
class RegexCharRange extends RegexComponent {
    constructor(compliment, range) {
        super();
        assert(range.length !== 0);
        this.compliment = compliment;
        this.range = range;
    }
    jemit() {
        return { tag: "CharRange", compliment: this.compliment, range: this.range };
    }
    static jparse(obj) {
        return new RegexCharRange(obj.compliment, obj.range);
    }
    static valToSStr(cc) {
        assert(cc >= 9);
        if (cc === 9) {
            return "\\t";
        }
        else if (cc === 10) {
            return "\\n";
        }
        else if (cc === 13) {
            return "\\r";
        }
        else {
            return String.fromCodePoint(cc);
        }
    }
    compileToJS() {
        //
        //TODO: probably need to do some escaping here as well
        //
        const rng = this.range.map((rr) => (rr.lb == rr.ub) ? RegexCharRange.valToSStr(rr.lb) : `${RegexCharRange.valToSStr(rr.lb)}-${RegexCharRange.valToSStr(rr.ub)}`);
        return `[${this.compliment ? "^" : ""}${rng.join("")}]`;
    }
    compilePatternToSMT(ascii) {
        assert(ascii);
        assert(!this.compliment);
        //
        //TODO: probably need to do some escaping here as well
        //
        const rng = this.range.map((rr) => (rr.lb == rr.ub) ? `(str.to.re "${RegexCharRange.valToSStr(rr.lb)}")` : `(re.range "${RegexCharRange.valToSStr(rr.lb)}" "${RegexCharRange.valToSStr(rr.ub)}")`);
        if (rng.length === 1) {
            return rng[0];
        }
        else {
            return `(re.union ${rng.join(" ")})`;
        }
    }
}
exports.RegexCharRange = RegexCharRange;
class RegexDotCharClass extends RegexComponent {
    constructor() {
        super();
    }
    jemit() {
        return { tag: "DotCharClass" };
    }
    static jparse(obj) {
        return new RegexDotCharClass();
    }
    compileToJS() {
        return ".";
    }
    compilePatternToSMT(ascii) {
        return "re.allchar";
    }
}
exports.RegexDotCharClass = RegexDotCharClass;
class RegexConstClass extends RegexComponent {
    constructor(ns, ccname) {
        super();
        this.ns = ns;
        this.ccname = ccname;
    }
    jemit() {
        return { tag: "ConstRegexClass", ns: this.ns, ccname: this.ccname };
    }
    static jparse(obj) {
        return new RegexConstClass(obj.ns, obj.ccname);
    }
    compileToJS() {
        assert(false, `Should be replaced by const ${this.ns}::${this.ccname}`);
        return `${this.ns}::${this.ccname}`;
    }
    compilePatternToSMT(ascii) {
        assert(false, `Should be replaced by const ${this.ns}::${this.ccname}`);
        return `${this.ns}::${this.ccname}`;
    }
}
exports.RegexConstClass = RegexConstClass;
class RegexStarRepeat extends RegexComponent {
    constructor(repeat) {
        super();
        this.repeat = repeat;
    }
    jemit() {
        return { tag: "StarRepeat", repeat: this.repeat.jemit() };
    }
    static jparse(obj) {
        return new RegexStarRepeat(RegexComponent.jparse(obj.repeat));
    }
    compileToJS() {
        return this.repeat.useParens() ? `(${this.repeat.compileToJS()})*` : `${this.repeat.compileToJS()}*`;
    }
    compilePatternToSMT(ascii) {
        return `(re.* ${this.repeat.compilePatternToSMT(ascii)})`;
    }
}
exports.RegexStarRepeat = RegexStarRepeat;
class RegexPlusRepeat extends RegexComponent {
    constructor(repeat) {
        super();
        this.repeat = repeat;
    }
    jemit() {
        return { tag: "PlusRepeat", repeat: this.repeat.jemit() };
    }
    static jparse(obj) {
        return new RegexPlusRepeat(RegexComponent.jparse(obj.repeat));
    }
    compileToJS() {
        return this.repeat.useParens() ? `(${this.repeat.compileToJS()})+` : `${this.repeat.compileToJS()}+`;
    }
    compilePatternToSMT(ascii) {
        return `(re.+ ${this.repeat.compilePatternToSMT(ascii)})`;
    }
}
exports.RegexPlusRepeat = RegexPlusRepeat;
class RegexRangeRepeat extends RegexComponent {
    constructor(repeat, min, max) {
        super();
        this.repeat = repeat;
        this.min = min;
        this.max = max;
    }
    jemit() {
        return { tag: "RangeRepeat", repeat: this.repeat.jemit(), min: this.min, max: this.max };
    }
    static jparse(obj) {
        return new RegexRangeRepeat(RegexComponent.jparse(obj.repeat), obj.min, obj.max);
    }
    compileToJS() {
        return this.repeat.useParens() ? `(${this.repeat.compileToJS()}){${this.min},${this.max}}` : `${this.repeat.compileToJS()}{${this.min},${this.max}}`;
    }
    compilePatternToSMT(ascii) {
        return `(re.loop ${this.repeat.compilePatternToSMT(ascii)} ${this.min} ${this.max})`;
    }
}
exports.RegexRangeRepeat = RegexRangeRepeat;
class RegexOptional extends RegexComponent {
    constructor(opt) {
        super();
        this.opt = opt;
    }
    jemit() {
        return { tag: "Optional", opt: this.opt.jemit() };
    }
    static jparse(obj) {
        return new RegexOptional(RegexComponent.jparse(obj.repeat));
    }
    compileToJS() {
        return this.opt.useParens() ? `(${this.opt.compileToJS()})?` : `${this.opt.compileToJS()}?`;
    }
    compilePatternToSMT(ascii) {
        return `(re.opt ${this.opt.compilePatternToSMT(ascii)})`;
    }
}
exports.RegexOptional = RegexOptional;
class RegexAlternation extends RegexComponent {
    constructor(opts) {
        super();
        this.opts = opts;
    }
    useParens() {
        return true;
    }
    jemit() {
        return { tag: "Alternation", opts: this.opts.map((opt) => opt.jemit()) };
    }
    static jparse(obj) {
        return new RegexAlternation(obj.opts.map((opt) => RegexComponent.jparse(opt)));
    }
    compileToJS() {
        return this.opts.map((opt) => opt.compileToJS()).join("|");
    }
    compilePatternToSMT(ascii) {
        return `(re.union ${this.opts.map((opt) => opt.compilePatternToSMT(ascii)).join(" ")})`;
    }
}
exports.RegexAlternation = RegexAlternation;
class RegexSequence extends RegexComponent {
    constructor(elems) {
        super();
        this.elems = elems;
    }
    useParens() {
        return true;
    }
    jemit() {
        return { tag: "Sequence", elems: this.elems.map((elem) => elem.jemit()) };
    }
    static jparse(obj) {
        return new RegexSequence(obj.elems.map((elem) => RegexComponent.jparse(elem)));
    }
    compileToJS() {
        return this.elems.map((elem) => elem.compileToJS()).join("");
    }
    compilePatternToSMT(ascii) {
        return `(re.++ ${this.elems.map((elem) => elem.compilePatternToSMT(ascii)).join(" ")})`;
    }
}
exports.RegexSequence = RegexSequence;
//# sourceMappingURL=bsqregex.js.map