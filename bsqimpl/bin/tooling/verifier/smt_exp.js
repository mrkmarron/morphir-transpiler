"use strict";
//-------------------------------------------------------------------------------------------------------
// Copyright (C) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE.txt file in the project root for full license information.
//-------------------------------------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
exports.SMTExists = exports.SMTForAll = exports.SMTADTKindSwitch = exports.SMTCond = exports.SMTIf = exports.SMTLetMulti = exports.SMTLet = exports.SMTCallGeneralWPassThroughMask = exports.SMTCallGeneralWOptMask = exports.SMTCallGeneral = exports.SMTCallSimple = exports.SMTConst = exports.SMTVar = exports.SMTExp = exports.SMTType = exports.BVEmitter = exports.SMTMaskConstruct = void 0;
const assert = require("assert");
class BVEmitter {
    constructor(bvsize, natmax, intmin, intmax, natmax1, intmin1, intmax1) {
        this.bvsize = bvsize;
        this.natmax = natmax;
        this.intmin = intmin;
        this.intmax = intmax;
        this.bvnatmax = BVEmitter.emitNatCore(natmax, natmax, bvsize);
        this.bvintmin = BVEmitter.emitIntCore(intmin, intmin, intmax, bvsize);
        this.bvintmax = BVEmitter.emitIntCore(intmax, intmin, intmax, bvsize);
        this.bvnatmax1 = BVEmitter.emitNatCore(natmax, natmax1, bvsize + 1n);
        this.bvintmin1 = BVEmitter.emitIntCore(intmin, intmin1, intmax1, bvsize + 1n);
        this.bvintmax1 = BVEmitter.emitIntCore(intmax, intmin1, intmax1, bvsize + 1n);
    }
    static computeBVMinSigned(bits) {
        return -((2n ** bits) / 2n);
    }
    static computeBVMaxSigned(bits) {
        return ((2n ** bits) / 2n) - 1n;
    }
    static computeBVMaxUnSigned(bits) {
        return (2n ** bits) - 1n;
    }
    static emitIntCore(val, imin, imax, bvsize) {
        if (val === 0n) {
            return new SMTConst("BInt@zero");
        }
        else {
            if (val > 0) {
                assert(BigInt(val) <= imax);
                let bits = BigInt(val).toString(2);
                while (bits.length < bvsize) {
                    bits = "0" + bits;
                }
                return new SMTConst(`#b${bits}`);
            }
            else {
                assert(imin <= BigInt(val));
                let bits = (~BigInt(val) + 1n).toString(2).slice(0, Number(bvsize));
                while (bits.length < bvsize) {
                    bits = "1" + bits;
                }
                return new SMTConst(`#b${bits}`);
            }
        }
    }
    static emitNatCore(val, nmax, bvsize) {
        if (val === 0n) {
            return new SMTConst("BNat@zero");
        }
        else {
            assert(0 < val && BigInt(val) <= nmax);
            return new SMTConst(`(_ bv${val} ${bvsize})`);
        }
    }
    static create(bvsize) {
        return new BVEmitter(bvsize, BVEmitter.computeBVMaxUnSigned(bvsize), BVEmitter.computeBVMinSigned(bvsize), BVEmitter.computeBVMaxSigned(bvsize), BVEmitter.computeBVMaxUnSigned(bvsize + 1n), BVEmitter.computeBVMinSigned(bvsize + 1n), BVEmitter.computeBVMaxSigned(bvsize + 1n));
    }
    emitIntGeneral(val) {
        return BVEmitter.emitIntCore(val, this.intmin, this.intmax, this.bvsize);
    }
    emitNatGeneral(val) {
        return BVEmitter.emitNatCore(val, this.natmax, this.bvsize);
    }
    emitSimpleInt(val) {
        return this.emitIntGeneral(BigInt(val));
    }
    emitSimpleNat(val) {
        return this.emitNatGeneral(BigInt(val));
    }
    emitInt(intv) {
        return this.emitIntGeneral(BigInt(intv.slice(0, intv.length - 1)));
    }
    emitNat(natv) {
        return this.emitNatGeneral(BigInt(natv.slice(0, natv.length - 1)));
    }
}
exports.BVEmitter = BVEmitter;
class SMTMaskConstruct {
    constructor(maskname) {
        this.entries = [];
        this.maskname = maskname;
    }
    emitSMT2() {
        return `($Mask_${this.entries.length}@cons ${this.entries.map((mv) => mv.emitSMT2(undefined)).join(" ")})`;
    }
}
exports.SMTMaskConstruct = SMTMaskConstruct;
class SMTType {
    constructor(name, smttypetag, typeid) {
        this.name = name;
        this.smttypetag = smttypetag;
        this.typeID = typeid;
    }
    isGeneralKeyType() {
        return this.name === "BKey";
    }
    isGeneralTermType() {
        return this.name === "BTerm";
    }
}
exports.SMTType = SMTType;
class SMTExp {
}
exports.SMTExp = SMTExp;
class SMTVar extends SMTExp {
    constructor(vname) {
        super();
        this.vname = vname;
    }
    emitSMT2(indent) {
        return this.vname;
    }
    computeCallees(callees) {
        //Nothing to do in many cases
    }
}
exports.SMTVar = SMTVar;
class SMTConst extends SMTExp {
    constructor(cname) {
        super();
        this.cname = cname;
    }
    emitSMT2(indent) {
        return this.cname;
    }
    computeCallees(callees) {
        //Nothing to do in many cases
    }
}
exports.SMTConst = SMTConst;
class SMTCallSimple extends SMTExp {
    constructor(fname, args) {
        super();
        this.fname = fname;
        this.args = args;
    }
    emitSMT2(indent) {
        return this.args.length === 0 ? this.fname : `(${this.fname} ${this.args.map((arg) => arg.emitSMT2(undefined)).join(" ")})`;
    }
    computeCallees(callees) {
        callees.add(this.fname);
        this.args.forEach((arg) => arg.computeCallees(callees));
    }
    static makeEq(lhs, rhs) {
        return new SMTCallSimple("=", [lhs, rhs]);
    }
    static makeNotEq(lhs, rhs) {
        return new SMTCallSimple("not", [new SMTCallSimple("=", [lhs, rhs])]);
    }
    static makeBinOp(op, lhs, rhs) {
        return new SMTCallSimple(op, [lhs, rhs]);
    }
    static makeIsTypeOp(smtname, exp) {
        return new SMTCallSimple(`(_ is ${smtname})`, [exp]);
    }
    static makeNot(exp) {
        return new SMTCallSimple("not", [exp]);
    }
    static makeAndOf(...exps) {
        return new SMTCallSimple("and", exps);
    }
    static makeOrOf(...exps) {
        return new SMTCallSimple("or", exps);
    }
}
exports.SMTCallSimple = SMTCallSimple;
class SMTCallGeneral extends SMTExp {
    constructor(fname, args) {
        super();
        this.fname = fname;
        this.args = args;
    }
    emitSMT2(indent) {
        return this.args.length === 0 ? this.fname : `(${this.fname} ${this.args.map((arg) => arg.emitSMT2(undefined)).join(" ")})`;
    }
    computeCallees(callees) {
        callees.add(this.fname);
        this.args.forEach((arg) => arg.computeCallees(callees));
    }
}
exports.SMTCallGeneral = SMTCallGeneral;
class SMTCallGeneralWOptMask extends SMTExp {
    constructor(fname, args, mask) {
        super();
        this.fname = fname;
        this.args = args;
        this.mask = mask;
    }
    emitSMT2(indent) {
        return this.args.length === 0 ? `(${this.fname} ${this.mask.emitSMT2()})` : `(${this.fname} ${this.args.map((arg) => arg.emitSMT2(undefined)).join(" ")} ${this.mask.emitSMT2()})`;
    }
    computeCallees(callees) {
        callees.add(this.fname);
        this.args.forEach((arg) => arg.computeCallees(callees));
        this.mask.entries.forEach((mentry) => mentry.computeCallees(callees));
    }
}
exports.SMTCallGeneralWOptMask = SMTCallGeneralWOptMask;
class SMTCallGeneralWPassThroughMask extends SMTExp {
    constructor(fname, args, mask) {
        super();
        this.fname = fname;
        this.args = args;
        this.mask = mask;
    }
    emitSMT2(indent) {
        return this.args.length === 0 ? `(${this.fname} ${this.mask})` : `(${this.fname} ${this.args.map((arg) => arg.emitSMT2(undefined)).join(" ")} ${this.mask})`;
    }
    computeCallees(callees) {
        callees.add(this.fname);
        this.args.forEach((arg) => arg.computeCallees(callees));
    }
}
exports.SMTCallGeneralWPassThroughMask = SMTCallGeneralWPassThroughMask;
class SMTLet extends SMTExp {
    constructor(vname, value, inexp) {
        super();
        this.vname = vname;
        this.value = value;
        this.inexp = inexp;
    }
    emitSMT2(indent) {
        if (indent === undefined) {
            return `(let ((${this.vname} ${this.value.emitSMT2(undefined)})) ${this.inexp.emitSMT2(undefined)})`;
        }
        else {
            return `(let ((${this.vname} ${this.value.emitSMT2(undefined)}))\n${indent + "  "}${this.inexp.emitSMT2(indent + "  ")}\n${indent})`;
        }
    }
    computeCallees(callees) {
        this.value.computeCallees(callees);
        this.inexp.computeCallees(callees);
    }
}
exports.SMTLet = SMTLet;
class SMTLetMulti extends SMTExp {
    constructor(assigns, inexp) {
        super();
        this.assigns = assigns;
        this.inexp = inexp;
    }
    emitSMT2(indent) {
        const binds = this.assigns.map((asgn) => `(${asgn.vname} ${asgn.value.emitSMT2(undefined)})`);
        if (indent === undefined) {
            return `(let (${binds.join(" ")}) ${this.inexp.emitSMT2(undefined)})`;
        }
        else {
            return `(let (${binds.join(" ")})\n${indent + "  "}${this.inexp.emitSMT2(indent + "  ")}\n${indent})`;
        }
    }
    computeCallees(callees) {
        this.assigns.forEach((asgn) => {
            asgn.value.computeCallees(callees);
        });
        this.inexp.computeCallees(callees);
    }
}
exports.SMTLetMulti = SMTLetMulti;
class SMTIf extends SMTExp {
    constructor(cond, tval, fval) {
        super();
        this.cond = cond;
        this.tval = tval;
        this.fval = fval;
    }
    emitSMT2(indent) {
        if (indent === undefined) {
            return `(ite ${this.cond.emitSMT2(undefined)} ${this.tval.emitSMT2(undefined)} ${this.fval.emitSMT2(undefined)})`;
        }
        else {
            return `(ite ${this.cond.emitSMT2(undefined)}\n${indent + "  "}${this.tval.emitSMT2(indent + "  ")}\n${indent + "  "}${this.fval.emitSMT2(indent + "  ")}\n${indent})`;
        }
    }
    computeCallees(callees) {
        this.cond.computeCallees(callees);
        this.tval.computeCallees(callees);
        this.fval.computeCallees(callees);
    }
}
exports.SMTIf = SMTIf;
class SMTCond extends SMTExp {
    constructor(opts, orelse) {
        super();
        this.opts = opts;
        this.orelse = orelse;
    }
    emitSMT2(indent) {
        if (indent === undefined) {
            let iopts = this.orelse.emitSMT2(undefined);
            for (let i = this.opts.length - 1; i >= 0; --i) {
                iopts = `(ite ${this.opts[i].test.emitSMT2(undefined)} ${this.opts[i].result.emitSMT2(undefined)} ${iopts})`;
            }
            return iopts;
        }
        else {
            let iopts = this.orelse.emitSMT2(undefined);
            for (let i = this.opts.length - 1; i >= 0; --i) {
                iopts = `(ite ${this.opts[i].test.emitSMT2(undefined)}\n${indent + "  "}${this.opts[i].result.emitSMT2(indent + "  ")}\n${indent + "  "}${iopts}\n${indent})`;
            }
            return iopts;
        }
    }
    computeCallees(callees) {
        this.opts.forEach((opt) => {
            opt.test.computeCallees(callees);
            opt.result.computeCallees(callees);
        });
        this.orelse.computeCallees(callees);
    }
}
exports.SMTCond = SMTCond;
class SMTADTKindSwitch extends SMTExp {
    constructor(value, opts) {
        super();
        this.value = value;
        this.opts = opts;
    }
    emitSMT2(indent) {
        const matches = this.opts.map((op) => {
            const test = op.cargs.length !== 0 ? `(${op.cons} ${op.cargs.join(" ")})` : op.cons;
            return `(${test} ${op.result.emitSMT2(undefined)})`;
        });
        if (indent === undefined) {
            return `(match ${this.value.emitSMT2(undefined)} (${matches.join(" ")}))`;
        }
        else {
            return `(match ${this.value.emitSMT2(undefined)} (\n${indent + "  "}${matches.join("\n" + indent + "  ")})\n${indent})`;
        }
    }
    computeCallees(callees) {
        this.value.computeCallees(callees);
        this.opts.forEach((opt) => {
            opt.result.computeCallees(callees);
        });
    }
}
exports.SMTADTKindSwitch = SMTADTKindSwitch;
class SMTForAll extends SMTExp {
    constructor(terms, clause) {
        super();
        this.terms = terms;
        this.clause = clause;
    }
    emitSMT2(indent) {
        const terms = this.terms.map((t) => `(${t.vname} ${t.vtype.name})`);
        if (indent === undefined) {
            return `(forall (${terms.join(" ")}) ${this.clause.emitSMT2(undefined)})`;
        }
        else {
            return `(forall (${terms.join(" ")})\n${indent + "  "}${this.clause.emitSMT2(indent + "  ")}\n${indent})`;
        }
    }
    computeCallees(callees) {
        this.clause.computeCallees(callees);
    }
}
exports.SMTForAll = SMTForAll;
class SMTExists extends SMTExp {
    constructor(terms, clause) {
        super();
        this.terms = terms;
        this.clause = clause;
    }
    emitSMT2(indent) {
        const terms = this.terms.map((t) => `(${t.vname} ${t.vtype.name})`);
        if (indent === undefined) {
            return `(exists (${terms.join(" ")}) ${this.clause.emitSMT2(undefined)})`;
        }
        else {
            return `(exists (${terms.join(" ")})\n${indent + "  "}${this.clause.emitSMT2(indent + "  ")}\n${indent})`;
        }
    }
    computeCallees(callees) {
        this.clause.computeCallees(callees);
    }
}
exports.SMTExists = SMTExists;
//# sourceMappingURL=smt_exp.js.map