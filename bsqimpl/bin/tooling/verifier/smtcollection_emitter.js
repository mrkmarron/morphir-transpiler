"use strict";
//-------------------------------------------------------------------------------------------------------
// Copyright (C) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE.txt file in the project root for full license information.
//-------------------------------------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListOpsInfo = exports.ListOpsManager = void 0;
const mir_assembly_1 = require("../../compiler/mir_assembly");
const smt_assembly_1 = require("./smt_assembly");
const smt_exp_1 = require("./smt_exp");
const assert = require("assert");
class RequiredListConstructors {
    constructor() {
        //always empty, 1, 2, 3
        //always slice
        //always concat2
        this.havoc = false;
        this.fill = false;
        this.filter = false;
        this.map = new Map();
    }
}
class RequiredListDestructors {
    constructor() {
        //always get
        this.safecheckpred = new Map();
        this.safecheckfn = new Map();
        this.isequence = new Map();
        this.haspredcheck = new Map();
        this.findIndexOf = new Map();
        this.findLastIndexOf = new Map();
        this.sum = false;
    }
}
class ListOpsInfo {
    constructor(ltype, ctype) {
        this.ltype = ltype;
        this.ctype = ctype;
        this.consops = new RequiredListConstructors();
        this.dops = new RequiredListDestructors();
    }
}
exports.ListOpsInfo = ListOpsInfo;
class ListOpsManager {
    constructor(vopts, temitter, numgen, safecalls) {
        this.rangenat = false;
        this.rangeint = false;
        this.ops = new Map();
        this.tmpvarctr = 0;
        this.vopts = vopts;
        this.temitter = temitter;
        this.numgen = numgen;
        this.safecalls = safecalls;
        this.booltype = this.temitter.getSMTTypeFor(this.temitter.getMIRType("NSCore::Bool"));
        this.nattype = this.temitter.getSMTTypeFor(this.temitter.getMIRType("NSCore::Nat"));
    }
    generateTempName() {
        return `_@tmpvar_cc@${this.tmpvarctr++}`;
    }
    ensureOpsFor(encltype) {
        if (!this.ops.has(encltype.typeID)) {
            const stypeinfo = this.temitter.assembly.entityDecls.get(encltype.typeID);
            const ctype = stypeinfo.terms.get("T");
            this.ops.set(encltype.typeID, new ListOpsInfo(encltype, ctype));
        }
        return this.ops.get(encltype.typeID);
    }
    generateCapturedArgs(pcode) {
        return pcode.cargs.map((arg) => new smt_exp_1.SMTVar(arg));
    }
    registerHavoc(ltype) {
        const ops = this.ensureOpsFor(ltype);
        ops.consops.havoc = true;
        return this.generateConsCallName(this.temitter.getSMTTypeFor(ltype), "havoc");
    }
    processHavoc(ltype, path) {
        const ops = this.ensureOpsFor(ltype);
        ops.consops.havoc = true;
        return new smt_exp_1.SMTCallSimple(this.generateConsCallName(this.temitter.getSMTTypeFor(ltype), "havoc"), [path]);
    }
    processLiteralK_Pos(ltype, values) {
        const opname = `list_${values.length}`;
        return new smt_exp_1.SMTCallSimple(this.generateConsCallName(this.temitter.getSMTTypeFor(ltype), opname), values);
    }
    processGet(ltype, l, n) {
        this.ensureOpsFor(ltype);
        const op = this.generateDesCallName(this.temitter.getSMTTypeFor(ltype), "get");
        //get always registered
        return new smt_exp_1.SMTCallSimple(op, [l, n]);
    }
    processSafePredCheck(ltype, isidx, code, pcode, l, count) {
        const ops = this.ensureOpsFor(ltype);
        const op = this.generateDesCallNameUsing(this.temitter.getSMTTypeFor(ltype), "safeCheckPred" + (isidx ? "_idx" : ""), code);
        ops.dops.safecheckpred.set(code, { code: pcode, isidx: isidx });
        return new smt_exp_1.SMTCallGeneral(op, [l, count, ...this.generateCapturedArgs(pcode)]);
    }
    processSafeFnCheck(ltype, rtype, isidx, code, pcode, l, count) {
        const ops = this.ensureOpsFor(ltype);
        const op = this.generateDesCallNameUsing(this.temitter.getSMTTypeFor(ltype), "safeCheckFn" + (isidx ? "_idx" : ""), code);
        ops.dops.safecheckfn.set(code, { code: pcode, rtype: rtype, isidx: isidx });
        return new smt_exp_1.SMTCallGeneral(op, [l, count, ...this.generateCapturedArgs(pcode)]);
    }
    processISequence(ltype, isidx, code, pcode, l, count) {
        const ops = this.ensureOpsFor(ltype);
        const op = this.generateDesCallNameUsing(this.temitter.getSMTTypeFor(ltype), "isequence" + (isidx ? "_idx" : ""), code);
        ops.dops.isequence.set(code, { code: pcode, isidx: isidx });
        return new smt_exp_1.SMTCallGeneral(op, [l, count, ...this.generateCapturedArgs(pcode)]);
    }
    processHasPredCheck(ltype, isidx, code, pcode, l, count) {
        const ops = this.ensureOpsFor(ltype);
        const op = this.generateDesCallNameUsing(this.temitter.getSMTTypeFor(ltype), "hasPredCheck" + (isidx ? "_idx" : ""), code);
        ops.dops.haspredcheck.set(code, { code: pcode, isidx: isidx });
        return new smt_exp_1.SMTCallGeneral(op, [l, count, ...this.generateCapturedArgs(pcode)]);
    }
    processFindIndexOf(ltype, isidx, code, pcode, l, count) {
        const ops = this.ensureOpsFor(ltype);
        const op = this.generateDesCallNameUsing(this.temitter.getSMTTypeFor(ltype), "findIndexOf" + (isidx ? "_idx" : ""), code);
        ops.dops.findIndexOf.set(code, { code: pcode, isidx: isidx });
        return new smt_exp_1.SMTCallGeneral(op, [l, count, ...this.generateCapturedArgs(pcode)]);
    }
    processFindLastIndexOf(ltype, isidx, code, pcode, l, count) {
        const ops = this.ensureOpsFor(ltype);
        const op = this.generateDesCallNameUsing(this.temitter.getSMTTypeFor(ltype), "findLastIndexOf" + (isidx ? "_idx" : ""), code);
        ops.dops.findLastIndexOf.set(code, { code: pcode, isidx: isidx });
        return new smt_exp_1.SMTCallGeneral(op, [l, count, ...this.generateCapturedArgs(pcode)]);
    }
    processConcat2(ltype, l1, l2, count) {
        this.ensureOpsFor(ltype);
        const op = this.generateConsCallName(this.temitter.getSMTTypeFor(ltype), "concat2");
        //concat always registered
        return new smt_exp_1.SMTCallSimple(op, [l1, l2, count]);
    }
    processSlice(ltype, l1, start, end, count) {
        this.ensureOpsFor(ltype);
        const op = this.generateDesCallName(this.temitter.getSMTTypeFor(ltype), "slice");
        //slice always registered 
        return new smt_exp_1.SMTCallSimple(op, [l1, start, end, count]);
    }
    processRangeOfIntOperation(ltype, start, end, count) {
        this.ensureOpsFor(ltype);
        this.rangeint = true;
        return new smt_exp_1.SMTCallSimple(this.generateConsCallName(this.temitter.getSMTTypeFor(ltype), "rangeOfInt"), [start, end, count]);
    }
    processRangeOfNatOperation(ltype, start, end, count) {
        this.ensureOpsFor(ltype);
        this.rangenat = true;
        return new smt_exp_1.SMTCallSimple(this.generateConsCallName(this.temitter.getSMTTypeFor(ltype), "rangeOfNat"), [start, end, count]);
    }
    processFillOperation(ltype, count, value) {
        const ops = this.ensureOpsFor(ltype);
        const op = this.generateConsCallName(this.temitter.getSMTTypeFor(ltype), "fill");
        ops.consops.fill = true;
        return new smt_exp_1.SMTCallSimple(op, [count, value]);
    }
    processMap(ltype, intotype, isidx, code, pcode, l, count) {
        const ops = this.ensureOpsFor(intotype);
        const op = this.generateConsCallNameUsing(this.temitter.getSMTTypeFor(intotype), "map" + (isidx ? "_idx" : ""), code);
        ops.consops.map.set(code, { code: pcode, fromtype: ltype, totype: intotype, isidx: isidx });
        return new smt_exp_1.SMTCallGeneral(op, [l, count, ...this.generateCapturedArgs(pcode)]);
    }
    processFilter(ltype, isidx, code, pcode, l, isq, count) {
        const ops = this.ensureOpsFor(ltype);
        const op = this.generateConsCallName(this.temitter.getSMTTypeFor(ltype), "filter" + (isidx ? "_idx" : ""));
        ops.consops.filter = true;
        return new smt_exp_1.SMTCallGeneral(op, [l, isq, count, ...this.generateCapturedArgs(pcode)]);
    }
    processSum(ltype, l) {
        const ops = this.ensureOpsFor(ltype);
        const op = this.generateDesCallName(this.temitter.getSMTTypeFor(ltype), "sum");
        ops.dops.sum = true;
        return new smt_exp_1.SMTCallGeneral(op, [l]);
    }
    generateConsCallName(ltype, opname) {
        return `_@@consop_${ltype.name}_${opname}`;
    }
    generateConsCallNameUsing(ltype, opname, code) {
        return `_@@consop_${ltype.name}_${opname}_using_${this.temitter.lookupFunctionName(code)}`;
    }
    generateDesCallName(ltype, opname) {
        return `_@@desop_${ltype.name}_${opname}`;
    }
    generateDesCallNameUsing(ltype, opname, code) {
        return `_@@desop_${ltype.name}_${opname}_using_${this.temitter.lookupFunctionName(code)}`;
    }
    generateULITypeFor(ltype) {
        return new smt_exp_1.SMTType(ltype.name + "$uli", "[INTERNAL TYPE]", ltype.typeID + "$uli");
    }
    generateULIFieldFor(ltype, consname, fname) {
        return this.generateConsCallName_Direct(ltype, consname) + "_" + fname;
    }
    generateULIFieldUsingFor(ltype, consname, code, fname) {
        return this.generateConsCallNameUsing_Direct(ltype, consname, code) + "_" + fname;
    }
    generateConsCallName_Direct(ltype, opname) {
        return `_@@cons_${ltype.name}_${opname}`;
    }
    generateConsCallNameUsing_Direct(ltype, opname, code) {
        return `_@@cons_${ltype.name}_${opname}_using_${this.temitter.lookupFunctionName(code)}`;
    }
    generateListSizeCall(exp, etype) {
        return new smt_exp_1.SMTCallSimple(`${etype.name}@size`, [exp]);
    }
    generateListContentsCall(exp, etype) {
        return new smt_exp_1.SMTCallSimple(`${etype.name}@uli`, [exp]);
    }
    generateGetULIFieldFor(ltype, consname, fname, arg) {
        return new smt_exp_1.SMTCallSimple(this.generateULIFieldFor(ltype, consname, fname), [arg]);
    }
    generateGetULIFieldUsingFor(ltype, consname, code, fname, arg) {
        return new smt_exp_1.SMTCallSimple(this.generateULIFieldUsingFor(ltype, consname, code, fname), [arg]);
    }
    emitConstructorEmpty(mtype, ltype) {
        const ffunc = new smt_exp_1.SMTCallSimple(this.temitter.getSMTConstructorName(mtype).cons, [
            new smt_exp_1.SMTConst("BNat@zero"),
            new smt_exp_1.SMTCallSimple(this.generateConsCallName_Direct(ltype, "empty"), [])
        ]);
        return {
            cons: {
                cname: this.generateConsCallName_Direct(ltype, "empty"),
                cargs: []
            },
            if: [new smt_assembly_1.SMTFunction(this.generateConsCallName(ltype, "empty"), [], undefined, 0, ltype, ffunc)],
            uf: []
        };
    }
    ////////
    //Slice
    emitConstructorSlice(mtype, ltype) {
        const lcons = this.temitter.getSMTConstructorName(mtype).cons;
        const ffunc = new smt_exp_1.SMTCallSimple(lcons, [
            new smt_exp_1.SMTVar("count"),
            new smt_exp_1.SMTCallSimple(this.generateConsCallName_Direct(ltype, "slice"), [new smt_exp_1.SMTVar("l"), new smt_exp_1.SMTVar("start"), new smt_exp_1.SMTVar("end")])
        ]);
        return {
            cons: { cname: this.generateConsCallName_Direct(ltype, "slice"), cargs: [{ fname: this.generateULIFieldFor(ltype, "slice", "l"), ftype: ltype }, { fname: this.generateULIFieldFor(ltype, "slice", "start"), ftype: this.nattype }, { fname: this.generateULIFieldFor(ltype, "slice", "end"), ftype: this.nattype }] },
            if: [new smt_assembly_1.SMTFunction(this.generateConsCallName(ltype, "slice"), [{ vname: "l", vtype: ltype }, { vname: "start", vtype: this.nattype }, { vname: "end", vtype: this.nattype }, { vname: "count", vtype: this.nattype }], undefined, 0, ltype, ffunc)],
            uf: []
        };
    }
    ////////
    //Concat
    emitConstructorConcat2(mtype, ltype) {
        const lcons = this.temitter.getSMTConstructorName(mtype).cons;
        const ffunc = new smt_exp_1.SMTCallSimple(lcons, [
            new smt_exp_1.SMTVar("count"),
            new smt_exp_1.SMTCallSimple(this.generateConsCallName_Direct(ltype, "concat2"), [new smt_exp_1.SMTVar("l1"), new smt_exp_1.SMTVar("l2")])
        ]);
        return {
            cons: { cname: this.generateConsCallName_Direct(ltype, "concat2"), cargs: [{ fname: this.generateULIFieldFor(ltype, "concat2", "left"), ftype: ltype }, { fname: this.generateULIFieldFor(ltype, "concat2", "right"), ftype: ltype }] },
            if: [new smt_assembly_1.SMTFunction(this.generateConsCallName(ltype, "concat2"), [{ vname: "l1", vtype: ltype }, { vname: "l2", vtype: ltype }, { vname: "count", vtype: this.nattype }], undefined, 0, ltype, ffunc)],
            uf: []
        };
    }
    ////////
    //Havoc
    emitConstructorHavoc(mtype, ltype, ctype) {
        assert(this.vopts.EnableCollection_SmallHavoc || this.vopts.EnableCollection_LargeHavoc);
        const lcons = this.temitter.getSMTConstructorName(mtype).cons;
        const ptype = this.temitter.getSMTTypeFor(this.temitter.getMIRType("NSCore::HavocSequence"));
        const size = "_@size";
        const sizev = new smt_exp_1.SMTVar(size);
        const smallmodeopts = [
            {
                test: smt_exp_1.SMTCallSimple.makeEq(sizev, new smt_exp_1.SMTConst("BNat@zero")),
                result: this.temitter.generateResultTypeConstructorSuccess(mtype, new smt_exp_1.SMTConst(`${this.temitter.lookupTypeName(mtype.typeID)}@empty_const`))
            },
            {
                test: smt_exp_1.SMTCallSimple.makeEq(sizev, this.numgen.emitSimpleNat(1)),
                result: new smt_exp_1.SMTLetMulti([
                    { vname: "_@val0", value: this.temitter.generateHavocConstructorCall(ctype, new smt_exp_1.SMTVar("path"), this.numgen.emitSimpleNat(0)) }
                ], new smt_exp_1.SMTIf(this.temitter.generateResultIsErrorTest(ctype, new smt_exp_1.SMTVar("_@val0")), this.temitter.generateErrorResultAssert(mtype), this.temitter.generateResultTypeConstructorSuccess(mtype, new smt_exp_1.SMTCallSimple(this.generateConsCallName(ltype, "list_1"), [
                    this.temitter.generateResultGetSuccess(ctype, new smt_exp_1.SMTVar("_@val0"))
                ]))))
            },
            {
                test: smt_exp_1.SMTCallSimple.makeEq(sizev, this.numgen.emitSimpleNat(2)),
                result: new smt_exp_1.SMTLetMulti([
                    { vname: "_@val0", value: this.temitter.generateHavocConstructorCall(ctype, new smt_exp_1.SMTVar("path"), this.numgen.emitSimpleNat(0)) },
                    { vname: "_@val1", value: this.temitter.generateHavocConstructorCall(ctype, new smt_exp_1.SMTVar("path"), this.numgen.emitSimpleNat(1)) }
                ], new smt_exp_1.SMTIf(smt_exp_1.SMTCallSimple.makeOrOf(this.temitter.generateResultIsErrorTest(ctype, new smt_exp_1.SMTVar("_@val0")), this.temitter.generateResultIsErrorTest(ctype, new smt_exp_1.SMTVar("_@val1"))), this.temitter.generateErrorResultAssert(mtype), this.temitter.generateResultTypeConstructorSuccess(mtype, new smt_exp_1.SMTCallSimple(this.generateConsCallName(ltype, "list_2"), [
                    this.temitter.generateResultGetSuccess(ctype, new smt_exp_1.SMTVar("_@val0")),
                    this.temitter.generateResultGetSuccess(ctype, new smt_exp_1.SMTVar("_@val1"))
                ]))))
            },
            {
                test: smt_exp_1.SMTCallSimple.makeEq(sizev, this.numgen.emitSimpleNat(3)),
                result: new smt_exp_1.SMTLetMulti([
                    { vname: "_@val0", value: this.temitter.generateHavocConstructorCall(ctype, new smt_exp_1.SMTVar("path"), this.numgen.emitSimpleNat(0)) },
                    { vname: "_@val1", value: this.temitter.generateHavocConstructorCall(ctype, new smt_exp_1.SMTVar("path"), this.numgen.emitSimpleNat(1)) },
                    { vname: "_@val2", value: this.temitter.generateHavocConstructorCall(ctype, new smt_exp_1.SMTVar("path"), this.numgen.emitSimpleNat(2)) }
                ], new smt_exp_1.SMTIf(new smt_exp_1.SMTCallSimple("or", [
                    this.temitter.generateResultIsErrorTest(ctype, new smt_exp_1.SMTVar("_@val0")),
                    this.temitter.generateResultIsErrorTest(ctype, new smt_exp_1.SMTVar("_@val1")),
                    this.temitter.generateResultIsErrorTest(ctype, new smt_exp_1.SMTVar("_@val2"))
                ]), this.temitter.generateErrorResultAssert(mtype), this.temitter.generateResultTypeConstructorSuccess(mtype, new smt_exp_1.SMTCallSimple(this.generateConsCallName(ltype, "list_3"), [
                    this.temitter.generateResultGetSuccess(ctype, new smt_exp_1.SMTVar("_@val0")),
                    this.temitter.generateResultGetSuccess(ctype, new smt_exp_1.SMTVar("_@val1")),
                    this.temitter.generateResultGetSuccess(ctype, new smt_exp_1.SMTVar("_@val2"))
                ]))))
            }
        ];
        let largemodeopts = new smt_exp_1.SMTIf(new smt_exp_1.SMTForAll([{ vname: "_@n", vtype: this.nattype }], new smt_exp_1.SMTCallSimple("=>", [
            new smt_exp_1.SMTCallSimple("bvult", [new smt_exp_1.SMTVar("_@n"), sizev]),
            this.temitter.generateResultIsSuccessTest(ctype, this.temitter.generateHavocConstructorCall(ctype, new smt_exp_1.SMTVar("path"), new smt_exp_1.SMTVar("_@n")))
        ])), this.temitter.generateResultTypeConstructorSuccess(mtype, new smt_exp_1.SMTCallSimple(lcons, [sizev, new smt_exp_1.SMTCallSimple(this.generateConsCallName_Direct(ltype, "havoc"), [new smt_exp_1.SMTVar("path")])])), this.temitter.generateErrorResultAssert(mtype));
        let ffunc = new smt_exp_1.SMTConst("[UNINIT]");
        if (this.vopts.EnableCollection_SmallHavoc && !this.vopts.EnableCollection_LargeHavoc) {
            ffunc = new smt_exp_1.SMTLet(size, new smt_exp_1.SMTCallSimple("ListSize@UFCons_API", [new smt_exp_1.SMTVar("path")]), new smt_exp_1.SMTCond(smallmodeopts.slice(0, smallmodeopts.length - 1), smallmodeopts[smallmodeopts.length - 1].result));
        }
        else if (!this.vopts.EnableCollection_SmallHavoc && this.vopts.EnableCollection_LargeHavoc) {
            ffunc = new smt_exp_1.SMTLet(size, new smt_exp_1.SMTCallSimple("ListSize@UFCons_API", [new smt_exp_1.SMTVar("path")]), largemodeopts);
        }
        else {
            ffunc = new smt_exp_1.SMTLet(size, new smt_exp_1.SMTCallSimple("ListSize@UFCons_API", [new smt_exp_1.SMTVar("path")]), new smt_exp_1.SMTCond(smallmodeopts, largemodeopts));
        }
        return {
            cons: { cname: this.generateConsCallName_Direct(ltype, "havoc"), cargs: [{ fname: this.generateULIFieldFor(ltype, "havoc", "path"), ftype: ptype }] },
            if: [new smt_assembly_1.SMTFunction(this.generateConsCallName(ltype, "havoc"), [{ vname: "path", vtype: ptype }], undefined, 0, this.temitter.generateResultType(mtype), ffunc)],
            uf: []
        };
    }
    ////////
    //Fill
    emitConstructorFill(mtype, ltype, ctype) {
        const lcons = this.temitter.getSMTConstructorName(mtype).cons;
        const ffunc = new smt_exp_1.SMTCallSimple(lcons, [
            new smt_exp_1.SMTVar("count"),
            new smt_exp_1.SMTCallSimple(this.generateConsCallName_Direct(ltype, "fill"), [new smt_exp_1.SMTVar("value")])
        ]);
        return {
            cons: { cname: this.generateConsCallName_Direct(ltype, "fill"), cargs: [{ fname: this.generateULIFieldFor(ltype, "fill", "value"), ftype: this.temitter.getSMTTypeFor(ctype) }] },
            if: [new smt_assembly_1.SMTFunction(this.generateConsCallName(ltype, "fill"), [{ vname: "value", vtype: this.temitter.getSMTTypeFor(ctype) }, { vname: "count", vtype: this.nattype }], undefined, 0, ltype, ffunc)],
            uf: []
        };
    }
    ////////
    //RangeNat/Int
    emitConstructorRange(mtype, ltype, ctype) {
        const lcons = this.temitter.getSMTConstructorName(mtype).cons;
        const opname = ctype.typeID === "NSCore::Nat" ? "rangeOfNat" : "rangeOfInt";
        const rtype = this.temitter.getSMTTypeFor(ctype);
        const ffunc = new smt_exp_1.SMTCallSimple(lcons, [
            new smt_exp_1.SMTCallSimple("bvsub", [new smt_exp_1.SMTVar("end"), new smt_exp_1.SMTVar("start")]),
            new smt_exp_1.SMTCallSimple(this.generateConsCallName_Direct(ltype, opname), [new smt_exp_1.SMTVar("start"), new smt_exp_1.SMTVar("end")])
        ]);
        return {
            cons: { cname: this.generateConsCallName_Direct(ltype, opname), cargs: [{ fname: this.generateULIFieldFor(ltype, opname, "start"), ftype: rtype }, { fname: this.generateULIFieldFor(ltype, opname, "end"), ftype: rtype }] },
            if: [new smt_assembly_1.SMTFunction(this.generateConsCallName(ltype, opname), [{ vname: "start", vtype: rtype }, { vname: "end", vtype: rtype }, { vname: "count", vtype: this.nattype }], undefined, 0, ltype, ffunc)],
            uf: []
        };
    }
    ////////
    //LiteralK
    emitConstructorLiteralK(mtype, ltype, ctype, k) {
        const smtctype = this.temitter.getSMTTypeFor(ctype);
        const opname = `list_${k}`;
        let kfields = [];
        let kfargs = [];
        for (let i = 0; i < k; ++i) {
            kfields.push({ fname: this.generateULIFieldFor(ltype, opname, `_${i}_`), ftype: smtctype });
            kfargs.push({ vname: `_${i}_`, vtype: smtctype });
        }
        //default construct
        const ffunc = new smt_exp_1.SMTCallSimple(this.temitter.getSMTConstructorName(mtype).cons, [
            this.numgen.emitSimpleNat(k),
            new smt_exp_1.SMTCallSimple(this.generateConsCallName_Direct(ltype, opname), kfargs.map((arg) => new smt_exp_1.SMTVar(arg.vname)))
        ]);
        return {
            cons: { cname: this.generateConsCallName_Direct(ltype, opname), cargs: kfields },
            if: [new smt_assembly_1.SMTFunction(this.generateConsCallName(ltype, opname), kfargs, undefined, 0, ltype, ffunc)],
            uf: []
        };
    }
    ////////
    //Filter
    emitConstructorFilter(ltype, mtype) {
        const lcons = this.temitter.getSMTConstructorName(mtype).cons;
        const ffunc = this.temitter.generateResultTypeConstructorSuccess(mtype, new smt_exp_1.SMTCallSimple(lcons, [
            new smt_exp_1.SMTCallSimple("ISequence@size", [new smt_exp_1.SMTVar("isq")]),
            new smt_exp_1.SMTCallSimple(this.generateConsCallName_Direct(ltype, "filter"), [new smt_exp_1.SMTVar("l"), new smt_exp_1.SMTVar("isq")])
        ]));
        const iseqtype = this.temitter.getSMTTypeFor(this.temitter.getMIRType("NSCore::ISequence"));
        return {
            cons: { cname: this.generateConsCallName_Direct(ltype, "filter"), cargs: [{ fname: this.generateULIFieldFor(ltype, "filter", "l"), ftype: ltype }, { fname: this.generateULIFieldFor(ltype, "filter", "isq"), ftype: iseqtype }] },
            if: [new smt_assembly_1.SMTFunction(this.generateConsCallName(ltype, "filter"), [{ vname: "l", vtype: ltype }, { vname: "isq", vtype: iseqtype }, { vname: "osize", vtype: this.nattype }], undefined, 0, this.temitter.generateResultType(mtype), ffunc)],
            uf: []
        };
    }
    ////////
    //Map
    emitConstructorMap(ltype, mtype, isidx, code, pcode) {
        const lcons = this.temitter.getSMTConstructorName(mtype).cons;
        const constype = this.temitter.getSMTTypeFor(mtype);
        const mapname = "map" + (isidx ? "_idx" : "");
        const capturedfields = this.generateCapturedFieldInfoFor(ltype, mapname, isidx ? 2 : 1, code, pcode);
        const ffunc = this.temitter.generateResultTypeConstructorSuccess(mtype, new smt_exp_1.SMTCallSimple(lcons, [
            new smt_exp_1.SMTVar("count"),
            new smt_exp_1.SMTCallSimple(this.generateConsCallNameUsing_Direct(constype, mapname, code), [new smt_exp_1.SMTVar("l")])
        ]));
        return {
            cons: { cname: this.generateConsCallNameUsing_Direct(constype, mapname, code), cargs: [{ fname: this.generateULIFieldUsingFor(ltype, mapname, code, "l"), ftype: ltype }, ...capturedfields] },
            if: [new smt_assembly_1.SMTFunction(this.generateConsCallNameUsing(constype, mapname, code), [{ vname: "l", vtype: ltype }, { vname: "count", vtype: this.nattype }], undefined, 0, this.temitter.generateResultType(mtype), ffunc)],
            uf: []
        };
    }
    ////////
    //Get
    emitDestructorGet_Slice(getop, ltype, ll, n) {
        return new smt_exp_1.SMTCallSimple(getop, [
            this.generateGetULIFieldFor(ltype, "slice", "l", ll),
            new smt_exp_1.SMTCallSimple("bvadd", [
                n,
                this.generateGetULIFieldFor(ltype, "slice", "start", ll)
            ])
        ]);
    }
    emitDestructorGet_Concat2(getop, ltype, ll, n) {
        const l1 = "_@l1";
        const l1v = new smt_exp_1.SMTVar(l1);
        const l1s = "_@l1size";
        const l1sv = new smt_exp_1.SMTVar(l1s);
        return new smt_exp_1.SMTLet(l1, this.generateGetULIFieldFor(ltype, "concat2", "left", ll), new smt_exp_1.SMTLet(l1s, this.generateListSizeCall(l1v, ltype), new smt_exp_1.SMTIf(new smt_exp_1.SMTCallSimple("bvult", [n, l1sv]), new smt_exp_1.SMTCallSimple(getop, [l1v, n]), new smt_exp_1.SMTCallSimple(getop, [this.generateGetULIFieldFor(ltype, "concat2", "right", ll), new smt_exp_1.SMTCallSimple("bvsub", [n, l1sv])]))));
    }
    emitDestructorGet_K(ltype, ll, n, k) {
        if (k === 1) {
            return this.generateGetULIFieldFor(ltype, "list_1", "_0_", ll);
        }
        else {
            let kops = [];
            for (let i = 0; i < k - 1; ++i) {
                kops.push({
                    test: smt_exp_1.SMTCallSimple.makeEq(n, this.numgen.emitSimpleNat(i)),
                    result: this.generateGetULIFieldFor(ltype, `list_${k}`, `_${i}_`, ll)
                });
            }
            const klast = this.generateGetULIFieldFor(ltype, `list_${k}`, `_${k - 1}_`, ll);
            return new smt_exp_1.SMTCond(kops, klast);
        }
    }
    emitDestructorGet_Filter(getop, ltype, ll, n) {
        return new smt_exp_1.SMTLet("_@olist", this.generateGetULIFieldFor(ltype, "filter", "l", ll), new smt_exp_1.SMTCallSimple(getop, [new smt_exp_1.SMTVar("_@olist"), new smt_exp_1.SMTCallSimple("ISequence@get", [this.generateGetULIFieldFor(ltype, "filter", "isq", ll), n])]));
    }
    emitDestructorGet_Map(ctype, srcltype, ll, n, isidx, code, pcode) {
        const getop = this.generateDesCallName(srcltype, "get");
        const mapname = "map" + (isidx ? "_idx" : "");
        const capturedfieldlets = this.generateCapturedFieldLetsInfoFor(srcltype, mapname, isidx ? 2 : 1, code, pcode, ll);
        const largs = isidx ? [new smt_exp_1.SMTCallSimple(getop, [new smt_exp_1.SMTVar("_@olist"), n]), n] : [new smt_exp_1.SMTCallSimple(getop, [new smt_exp_1.SMTVar("_@olist"), n])];
        return new smt_exp_1.SMTLet("_@olist", this.generateGetULIFieldUsingFor(srcltype, mapname, code, "l", ll), this.processCapturedFieldLets(capturedfieldlets, this.generateLambdaCallKnownSafe(code, ctype, largs, capturedfieldlets.map((cfl) => new smt_exp_1.SMTVar(cfl.vname)))));
    }
    emitDestructorGet(ltype, ctype, consopts) {
        const getop = this.generateDesCallName(ltype, "get");
        const llv = new smt_exp_1.SMTVar("_@list_contents");
        let tsops = [];
        for (let i = 1; i <= 3; ++i) {
            tsops.push({
                test: smt_exp_1.SMTCallSimple.makeIsTypeOp(this.generateConsCallName_Direct(ltype, `list_${i}`), llv),
                result: this.emitDestructorGet_K(ltype, llv, new smt_exp_1.SMTVar("n"), i)
            });
        }
        //always slice
        tsops.push({
            test: smt_exp_1.SMTCallSimple.makeIsTypeOp(this.generateConsCallName_Direct(ltype, "slice"), llv),
            result: this.emitDestructorGet_Slice(getop, ltype, llv, new smt_exp_1.SMTVar("n"))
        });
        //always concat2
        tsops.push({
            test: smt_exp_1.SMTCallSimple.makeIsTypeOp(this.generateConsCallName_Direct(ltype, "concat2"), llv),
            result: this.emitDestructorGet_Concat2(getop, ltype, llv, new smt_exp_1.SMTVar("n"))
        });
        if (consopts !== undefined) {
            if (consopts.havoc) {
                tsops.push({
                    test: smt_exp_1.SMTCallSimple.makeIsTypeOp(this.generateConsCallName_Direct(ltype, "havoc"), llv),
                    result: this.temitter.generateResultGetSuccess(ctype, this.temitter.generateHavocConstructorCall(ctype, this.generateGetULIFieldFor(ltype, "havoc", "path", llv), new smt_exp_1.SMTVar("n")))
                });
            }
            if (consopts.fill) {
                tsops.push({
                    test: smt_exp_1.SMTCallSimple.makeIsTypeOp(this.generateConsCallName_Direct(ltype, "fill"), llv),
                    result: this.generateGetULIFieldFor(ltype, "fill", "v", llv)
                });
            }
            if (this.rangenat && ctype.typeID === "NSCore::Nat") {
                tsops.push({
                    test: smt_exp_1.SMTCallSimple.makeIsTypeOp(this.generateConsCallName_Direct(ltype, "rangeOfNat"), llv),
                    result: new smt_exp_1.SMTCallSimple("bvadd", [this.generateGetULIFieldFor(ltype, "rangeOfNat", "start", llv), new smt_exp_1.SMTVar("n")])
                });
            }
            if (this.rangeint && ctype.typeID === "NSCore::Int") {
                tsops.push({
                    test: smt_exp_1.SMTCallSimple.makeIsTypeOp(this.generateConsCallName_Direct(ltype, "rangeOfInt"), llv),
                    result: new smt_exp_1.SMTCallSimple("bvadd", [this.generateGetULIFieldFor(ltype, "rangeOfInt", "start", llv), new smt_exp_1.SMTVar("n")])
                });
            }
            if (consopts.filter) {
                tsops.push({
                    test: smt_exp_1.SMTCallSimple.makeIsTypeOp(this.generateConsCallName_Direct(ltype, "filter"), llv),
                    result: this.emitDestructorGet_Filter(getop, ltype, llv, new smt_exp_1.SMTVar("n"))
                });
            }
            consopts.map.forEach((omi, code) => {
                tsops.push({
                    test: smt_exp_1.SMTCallSimple.makeIsTypeOp(this.generateConsCallNameUsing_Direct(ltype, omi.isidx ? "map_idx" : "map", code), llv),
                    result: this.emitDestructorGet_Map(ctype, this.temitter.getSMTTypeFor(omi.fromtype), llv, new smt_exp_1.SMTVar("n"), omi.isidx, code, omi.code)
                });
            });
        }
        const ffunc = new smt_exp_1.SMTLetMulti([{ vname: "_@list_contents", value: this.generateListContentsCall(new smt_exp_1.SMTVar("l"), ltype) }], new smt_exp_1.SMTCond(tsops.slice(0, tsops.length - 1), tsops[tsops.length - 1].result));
        return {
            if: [new smt_assembly_1.SMTFunction(this.generateDesCallName(ltype, "get"), [{ vname: "l", vtype: ltype }, { vname: "n", vtype: this.nattype }], undefined, 0, this.temitter.getSMTTypeFor(ctype), ffunc)],
            uf: []
        };
    }
    ////////
    //SafeCheck
    emitSafeCheckPred(ltype, mtype, isidx, code, pcode) {
        const restype = this.temitter.getMIRType("NSCore::Bool");
        const safename = "safeCheckPred" + (isidx ? "_idx" : "");
        const getop = this.generateDesCallName(ltype, "get");
        const getcall = new smt_exp_1.SMTCallSimple(getop, [new smt_exp_1.SMTVar("l"), new smt_exp_1.SMTVar("_@n")]);
        const largs = isidx ? [getcall, new smt_exp_1.SMTVar("_@n")] : [getcall];
        const [capturedargs, capturedparams] = this.generateCapturedInfoFor(pcode, isidx ? 2 : 1);
        if (this.safecalls.has(code)) {
            return {
                if: [new smt_assembly_1.SMTFunction(this.generateDesCallNameUsing(ltype, safename, code), [{ vname: "l", vtype: ltype }, { vname: "count", vtype: this.nattype }, ...capturedparams], undefined, 0, this.temitter.generateResultType(mtype), this.temitter.generateResultTypeConstructorSuccess(mtype, new smt_exp_1.SMTVar("l")))],
                uf: []
            };
        }
        else {
            const tecase = new smt_exp_1.SMTExists([{ vname: "_@n", vtype: this.nattype }], smt_exp_1.SMTCallSimple.makeAndOf(new smt_exp_1.SMTCallSimple("bvult", [new smt_exp_1.SMTVar("_@n"), new smt_exp_1.SMTVar("count")]), smt_exp_1.SMTCallSimple.makeEq(this.generateLambdaCallGeneral(code, restype, largs, capturedargs), this.temitter.generateResultTypeConstructorError(restype, new smt_exp_1.SMTConst("ErrorID_Target")))));
            const gecase = new smt_exp_1.SMTExists([{ vname: "_@n", vtype: this.nattype }], smt_exp_1.SMTCallSimple.makeAndOf(new smt_exp_1.SMTCallSimple("bvult", [new smt_exp_1.SMTVar("_@n"), new smt_exp_1.SMTVar("count")]), smt_exp_1.SMTCallSimple.makeEq(this.generateLambdaCallGeneral(code, restype, largs, capturedargs), this.temitter.generateErrorResultAssert(restype))));
            const ffunc = new smt_exp_1.SMTCond([
                { test: tecase, result: this.temitter.generateResultTypeConstructorError(mtype, new smt_exp_1.SMTConst("ErrorID_Target")) },
                { test: gecase, result: this.temitter.generateErrorResultAssert(mtype) }
            ], this.temitter.generateResultTypeConstructorSuccess(mtype, new smt_exp_1.SMTVar("l")));
            return {
                if: [new smt_assembly_1.SMTFunction(this.generateDesCallNameUsing(ltype, safename, code), [{ vname: "l", vtype: ltype }, { vname: "count", vtype: this.nattype }, ...capturedparams], undefined, 0, this.temitter.generateResultType(mtype), ffunc)],
                uf: []
            };
        }
    }
    emitSafeCheckFn(ltype, mtype, restype, isidx, code, pcode) {
        const safename = "safeCheckFn" + (isidx ? "_idx" : "");
        const getop = this.generateDesCallName(ltype, "get");
        const getcall = new smt_exp_1.SMTCallSimple(getop, [new smt_exp_1.SMTVar("l"), new smt_exp_1.SMTVar("_@n")]);
        const largs = isidx ? [getcall, new smt_exp_1.SMTVar("_@n")] : [getcall];
        const [capturedargs, capturedparams] = this.generateCapturedInfoFor(pcode, isidx ? 2 : 1);
        if (this.safecalls.has(code)) {
            return {
                if: [new smt_assembly_1.SMTFunction(this.generateDesCallNameUsing(ltype, safename, code), [{ vname: "l", vtype: ltype }, { vname: "count", vtype: this.nattype }, ...capturedparams], undefined, 0, this.temitter.generateResultType(mtype), this.temitter.generateResultTypeConstructorSuccess(mtype, new smt_exp_1.SMTVar("l")))],
                uf: []
            };
        }
        else {
            const tecase = new smt_exp_1.SMTExists([{ vname: "_@n", vtype: this.nattype }], new smt_exp_1.SMTCallSimple("and", [
                new smt_exp_1.SMTCallSimple("bvult", [new smt_exp_1.SMTVar("_@n"), new smt_exp_1.SMTVar("count")]),
                new smt_exp_1.SMTCallSimple("=", [
                    this.generateLambdaCallGeneral(code, restype, largs, capturedargs),
                    this.temitter.generateResultTypeConstructorError(restype, new smt_exp_1.SMTConst("ErrorID_Target"))
                ])
            ]));
            const gecase = new smt_exp_1.SMTExists([{ vname: "_@n", vtype: this.nattype }], new smt_exp_1.SMTCallSimple("and", [
                new smt_exp_1.SMTCallSimple("bvult", [new smt_exp_1.SMTVar("_@n"), new smt_exp_1.SMTVar("count")]),
                new smt_exp_1.SMTCallSimple("=", [
                    this.generateLambdaCallGeneral(code, restype, largs, capturedargs),
                    this.temitter.generateErrorResultAssert(restype)
                ])
            ]));
            const ffunc = new smt_exp_1.SMTCond([
                { test: tecase, result: this.temitter.generateResultTypeConstructorError(mtype, new smt_exp_1.SMTConst("ErrorID_Target")) },
                { test: gecase, result: this.temitter.generateErrorResultAssert(mtype) }
            ], this.temitter.generateResultTypeConstructorSuccess(mtype, new smt_exp_1.SMTVar("l")));
            return {
                if: [new smt_assembly_1.SMTFunction(this.generateDesCallNameUsing(ltype, safename, code), [{ vname: "l", vtype: ltype }, { vname: "count", vtype: this.nattype }, ...capturedparams], undefined, 0, this.temitter.generateResultType(mtype), ffunc)],
                uf: []
            };
        }
    }
    ////////
    //ISequence
    emitDestructorISequence(ltype, isidx, code, pcode) {
        const iseqtype = this.temitter.getMIRType("NSCore::ISequence");
        const smtiseqtype = this.temitter.getSMTTypeFor(iseqtype);
        const [capturedargs, capturedparams, ufpickargs] = this.generateCapturedInfoFor(pcode, isidx ? 3 : 2, [ltype, this.nattype]);
        const cff = new smt_assembly_1.SMTFunctionUninterpreted(this.generateConsCallNameUsing(smtiseqtype, "ISequence@@cons", code), [...ufpickargs], smtiseqtype);
        const cvar = "_@cseq";
        const getop = this.generateDesCallName(ltype, "get");
        //size(res) <= size(arg0)
        const assertsize = new smt_exp_1.SMTCallSimple("bvule", [new smt_exp_1.SMTCallSimple("ISequence@size", [new smt_exp_1.SMTVar(cvar)]), new smt_exp_1.SMTVar("count")]);
        //\forall n \in [0, size(res)) get(res) < size(arg0)
        const assertrange = new smt_exp_1.SMTCallSimple("ISequence@assertValuesRange", [new smt_exp_1.SMTVar(cvar), new smt_exp_1.SMTVar("count")]);
        //sorted constraint
        const assertsorted = new smt_exp_1.SMTCallSimple("ISequence@assertSorted", [new smt_exp_1.SMTVar(cvar)]);
        //\forall j (j \in [lower, upper) /\ p(get(arg0, j))) => (\exists n \in [0, size(res)) /\ get(res, n) = j)
        const getarglj = new smt_exp_1.SMTCallSimple(getop, [new smt_exp_1.SMTVar("l"), new smt_exp_1.SMTVar("_@j")]);
        const largslj = isidx ? [getarglj, new smt_exp_1.SMTVar("_@j")] : [getarglj];
        const fromassert = new smt_exp_1.SMTForAll([{ vname: "_@j", vtype: this.nattype }], new smt_exp_1.SMTCallSimple("=>", [
            smt_exp_1.SMTCallSimple.makeAndOf(new smt_exp_1.SMTCallSimple("bvult", [new smt_exp_1.SMTVar("_@j"), new smt_exp_1.SMTVar("count")]), this.generateLambdaCallKnownSafe(code, this.temitter.getMIRType("NSCore::Bool"), largslj, capturedargs)),
            new smt_exp_1.SMTExists([{ vname: "_@n", vtype: this.nattype }], smt_exp_1.SMTCallSimple.makeAndOf(new smt_exp_1.SMTCallSimple("bvult", [new smt_exp_1.SMTVar("_@n"), new smt_exp_1.SMTCallSimple("ISequence@size", [new smt_exp_1.SMTVar(cvar)])]), smt_exp_1.SMTCallSimple.makeEq(new smt_exp_1.SMTCallSimple("ISequence@get", [new smt_exp_1.SMTVar(cvar), new smt_exp_1.SMTVar("_@n")]), new smt_exp_1.SMTVar("_@j"))))
        ]));
        //\forall n (n \in [0, size(res)), get(res, n) = j) => p(get(arg0, j))) --- j \in [lower, upper) is checked by the ISequence@assertValuesRange action
        const getarglacc = new smt_exp_1.SMTCallSimple(getop, [new smt_exp_1.SMTVar("l"), new smt_exp_1.SMTCallSimple("ISequence@get", [new smt_exp_1.SMTVar(cvar), new smt_exp_1.SMTVar("_@n")])]);
        const largslacc = isidx ? [getarglacc, new smt_exp_1.SMTCallSimple("ISequence@get", [new smt_exp_1.SMTVar(cvar), new smt_exp_1.SMTVar("_@n")])] : [getarglacc];
        const toassert = new smt_exp_1.SMTForAll([{ vname: "_@n", vtype: this.nattype }], new smt_exp_1.SMTCallSimple("=>", [
            new smt_exp_1.SMTCallSimple("bvult", [new smt_exp_1.SMTVar("_@n"), new smt_exp_1.SMTCallSimple("ISequence@size", [new smt_exp_1.SMTVar(cvar)])]),
            this.generateLambdaCallKnownSafe(code, this.temitter.getMIRType("NSCore::Bool"), largslacc, capturedargs)
        ]));
        const icons = new smt_exp_1.SMTCallSimple(this.generateConsCallNameUsing(smtiseqtype, "ISequence@@cons", code), [new smt_exp_1.SMTVar("l"), new smt_exp_1.SMTVar("count"), ...capturedargs]);
        const fbody = new smt_exp_1.SMTLet(cvar, icons, new smt_exp_1.SMTIf(smt_exp_1.SMTCallSimple.makeAndOf(assertsize, assertrange, assertsorted, fromassert, toassert), new smt_exp_1.SMTCallSimple("$Result_ISequence@success", [new smt_exp_1.SMTVar(cvar)]), new smt_exp_1.SMTCallSimple("$Result_ISequence@error", [new smt_exp_1.SMTConst("ErrorID_AssumeCheck")])));
        return {
            if: [new smt_assembly_1.SMTFunction(this.generateDesCallNameUsing(ltype, "isequence" + (isidx ? "_idx" : ""), code), [{ vname: "l", vtype: ltype }, { vname: "count", vtype: this.nattype }, ...capturedparams], undefined, 0, this.temitter.generateResultType(iseqtype), fbody)],
            uf: [cff]
        };
    }
    ////////
    //HasPredCheck
    emitDestructorHasPredCheck(ltype, isidx, code, pcode) {
        const getop = this.generateDesCallName(ltype, "get");
        const getcall = new smt_exp_1.SMTCallSimple(getop, [new smt_exp_1.SMTVar("l"), new smt_exp_1.SMTVar("_@n")]);
        const largs = isidx ? [getcall, new smt_exp_1.SMTVar("_@n")] : [getcall];
        const [capturedargs, capturedparams] = this.generateCapturedInfoFor(pcode, isidx ? 2 : 1);
        const ffunc = this.temitter.generateResultTypeConstructorSuccess(this.temitter.getMIRType("NSCore::Bool"), new smt_exp_1.SMTExists([{ vname: "_@n", vtype: this.nattype }], smt_exp_1.SMTCallSimple.makeAndOf(new smt_exp_1.SMTCallSimple("bvult", [new smt_exp_1.SMTVar("_@n"), new smt_exp_1.SMTVar("count")]), this.generateLambdaCallKnownSafe(code, this.temitter.getMIRType("NSCore::Bool"), largs, capturedargs))));
        return {
            if: [new smt_assembly_1.SMTFunction(this.generateDesCallNameUsing(ltype, "hasPredCheck" + (isidx ? "_idx" : ""), code), [{ vname: "l", vtype: ltype }, { vname: "count", vtype: this.nattype }, ...capturedparams], undefined, 0, this.temitter.generateResultType(this.temitter.getMIRType("NSCore::Bool")), ffunc)],
            uf: []
        };
    }
    ////////
    //FindIndexOf
    emitDestructorFindIndexOf(ltype, isidx, code, pcode) {
        const [nn, suf] = this.emitDestructorFindIndexOf_Shared(ltype, isidx, code, pcode, new smt_exp_1.SMTVar("l"), new smt_exp_1.SMTVar("count"), new smt_exp_1.SMTConst("BNat@zero"));
        const [capturedargs, capturedparams] = this.generateCapturedInfoFor(pcode, isidx ? 2 : 1);
        const getop = this.generateDesCallName(ltype, "get");
        const getcall = new smt_exp_1.SMTCallSimple(getop, [new smt_exp_1.SMTVar("l"), new smt_exp_1.SMTVar("_@j")]);
        const largs = isidx ? [getcall, new smt_exp_1.SMTVar("_@j")] : [getcall];
        const ffunc = new smt_exp_1.SMTLet("_@n", nn, new smt_exp_1.SMTIf(this.temitter.generateResultIsErrorTest(this.temitter.getMIRType("NSCore::Nat"), new smt_exp_1.SMTVar("_@n")), new smt_exp_1.SMTVar("_@n"), new smt_exp_1.SMTIf(new smt_exp_1.SMTForAll([{ vname: "_@j", vtype: this.nattype }], new smt_exp_1.SMTCallSimple("=>", [
            new smt_exp_1.SMTCallSimple("bvult", [new smt_exp_1.SMTVar("_@j"), this.temitter.generateResultGetSuccess(this.temitter.getMIRType("NSCore::Nat"), new smt_exp_1.SMTVar("_@n"))]),
            smt_exp_1.SMTCallSimple.makeNot(this.generateLambdaCallKnownSafe(code, this.temitter.getMIRType("NSCore::Bool"), largs, capturedargs))
        ])), new smt_exp_1.SMTVar("_@n"), this.temitter.generateErrorResultAssert(this.temitter.getMIRType("NSCore::Nat")))));
        return {
            if: [new smt_assembly_1.SMTFunction(this.generateDesCallNameUsing(ltype, "findIndexOf" + (isidx ? "_idx" : ""), code), [{ vname: "l", vtype: ltype }, { vname: "count", vtype: this.nattype }, ...capturedparams], undefined, 0, this.temitter.generateResultType(this.temitter.getMIRType("NSCore::Nat")), ffunc)],
            uf: [suf]
        };
    }
    ////////
    //FindLastIndexOf
    emitDestructorFindIndexOfLast(ltype, isidx, code, pcode) {
        const [nn, suf] = this.emitDestructorFindIndexOf_Shared(ltype, isidx, code, pcode, new smt_exp_1.SMTVar("l"), new smt_exp_1.SMTVar("count"), new smt_exp_1.SMTConst("BNat@max"));
        const [capturedargs, capturedparams] = this.generateCapturedInfoFor(pcode, isidx ? 2 : 1);
        const getop = this.generateDesCallName(ltype, "get");
        const getcall = new smt_exp_1.SMTCallSimple(getop, [new smt_exp_1.SMTVar("l"), new smt_exp_1.SMTVar("_@j")]);
        const largs = isidx ? [getcall, new smt_exp_1.SMTVar("_@j")] : [getcall];
        const ffunc = new smt_exp_1.SMTLet("_@n", nn, new smt_exp_1.SMTIf(this.temitter.generateResultIsErrorTest(this.temitter.getMIRType("NSCore::Nat"), new smt_exp_1.SMTVar("_@n")), new smt_exp_1.SMTVar("_@n"), new smt_exp_1.SMTIf(new smt_exp_1.SMTForAll([{ vname: "_@j", vtype: this.nattype }], new smt_exp_1.SMTCallSimple("=>", [
            new smt_exp_1.SMTCallSimple("bvult", [this.temitter.generateResultGetSuccess(this.temitter.getMIRType("NSCore::Nat"), new smt_exp_1.SMTVar("_@n")), new smt_exp_1.SMTVar("_@j")]),
            smt_exp_1.SMTCallSimple.makeNot(this.generateLambdaCallKnownSafe(code, this.temitter.getMIRType("NSCore::Bool"), largs, capturedargs))
        ])), new smt_exp_1.SMTVar("_@n"), this.temitter.generateErrorResultAssert(this.temitter.getMIRType("NSCore::Nat")))));
        return {
            if: [new smt_assembly_1.SMTFunction(this.generateDesCallNameUsing(ltype, "findIndexOfLast" + (isidx ? "_idx" : ""), code), [{ vname: "l", vtype: ltype }, { vname: "count", vtype: this.nattype }, ...capturedparams], undefined, 0, this.temitter.generateResultType(this.temitter.getMIRType("NSCore::Nat")), ffunc)],
            uf: [suf]
        };
    }
    ////////
    //Sum
    emitDestructorSum(ltype, ctype) {
        const restype = this.temitter.generateResultType(ctype);
        const cdecl = this.temitter.assembly.entityDecls.get(ctype.typeID);
        const primtype = cdecl instanceof mir_assembly_1.MIRConstructableEntityTypeDecl ? this.temitter.getMIRType(cdecl.fromtype) : ctype;
        let ufconsname = "[UN_INITIALIZED]";
        let ovfname = undefined;
        if (primtype.typeID === "NSCore::Int") {
            ufconsname = "@UFSumConsInt";
            ovfname = "@UFSumConsIntOVF";
        }
        else if (primtype.typeID === "NSCore::Nat") {
            ufconsname = "@UFSumConsNat";
            ovfname = "@UFSumConsNatOVF";
        }
        else if (primtype.typeID === "NSCore::BigInt") {
            ufconsname = "@UFSumConsBigInt";
        }
        else if (primtype.typeID === "NSCore::BigNat") {
            ufconsname = "@UFSumConsBigNat";
        }
        else if (primtype.typeID === "NSCore::Rational") {
            ufconsname = "@UFSumConsRational";
        }
        else if (primtype.typeID === "NSCore::Float") {
            ufconsname = "@UFSumConsFloat";
        }
        else {
            ufconsname = "@UFSumConsDecimal";
        }
        let ufops = [new smt_assembly_1.SMTFunctionUninterpreted(this.generateDesCallName(ltype, ufconsname), [ltype], this.temitter.getSMTTypeFor(ctype))];
        if (ovfname !== undefined) {
            ufops.push(new smt_assembly_1.SMTFunctionUninterpreted(this.generateDesCallName(ltype, ovfname), [ltype], this.booltype));
        }
        let ffunc = new smt_exp_1.SMTConst("[UNINIT]");
        if (cdecl instanceof mir_assembly_1.MIRConstructableEntityTypeDecl) {
            if (primtype.typeID !== "NSCore::BigNat") {
                if (cdecl.usingcons === undefined) {
                    ffunc = this.temitter.generateResultTypeConstructorSuccess(ctype, new smt_exp_1.SMTCallSimple(this.generateDesCallName(ltype, ufconsname), [new smt_exp_1.SMTVar("l")]));
                }
                else {
                    ffunc = new smt_exp_1.SMTCallGeneral(cdecl.usingcons, [new smt_exp_1.SMTCallSimple(this.generateDesCallName(ltype, ufconsname), [new smt_exp_1.SMTVar("l")])]);
                }
            }
            else {
                if (cdecl.usingcons === undefined) {
                    ffunc = new smt_exp_1.SMTLet("@vval", new smt_exp_1.SMTCallSimple(this.generateDesCallName(ltype, ufconsname), [new smt_exp_1.SMTVar("l")]), new smt_exp_1.SMTIf(new smt_exp_1.SMTCallSimple("<", [new smt_exp_1.SMTVar("@vval"), new smt_exp_1.SMTConst("0")]), this.temitter.generateErrorResultAssert(ctype), this.temitter.generateResultTypeConstructorSuccess(ctype, new smt_exp_1.SMTVar("@vval"))));
                }
                else {
                    ffunc = new smt_exp_1.SMTLet("@vval", new smt_exp_1.SMTCallSimple(this.generateDesCallName(ltype, ufconsname), [new smt_exp_1.SMTVar("l")]), new smt_exp_1.SMTIf(new smt_exp_1.SMTCallSimple("<=", [new smt_exp_1.SMTConst("0"), new smt_exp_1.SMTVar("@vval")]), new smt_exp_1.SMTCallGeneral(cdecl.usingcons, [new smt_exp_1.SMTVar("@vval")]), this.temitter.generateErrorResultAssert(ctype)));
                }
            }
        }
        else {
            if (primtype.typeID !== "NSCore::BigNat") {
                ffunc = this.temitter.generateResultTypeConstructorSuccess(ctype, new smt_exp_1.SMTCallSimple(this.generateDesCallName(ltype, ufconsname), [new smt_exp_1.SMTVar("l")]));
            }
            else {
                ffunc = new smt_exp_1.SMTLet("@vval", new smt_exp_1.SMTCallSimple(this.generateDesCallName(ltype, ufconsname), [new smt_exp_1.SMTVar("l")]), new smt_exp_1.SMTIf(new smt_exp_1.SMTCallSimple("<", [new smt_exp_1.SMTVar("@vval"), new smt_exp_1.SMTConst("0")]), this.temitter.generateErrorResultAssert(ctype), this.temitter.generateResultTypeConstructorSuccess(ctype, new smt_exp_1.SMTVar("@vval"))));
            }
        }
        if (ovfname !== undefined) {
            ffunc = new smt_exp_1.SMTIf(new smt_exp_1.SMTCallSimple(this.generateDesCallName(ltype, ovfname), [new smt_exp_1.SMTVar("l")]), ffunc, this.temitter.generateErrorResultAssert(ctype));
        }
        return {
            if: [new smt_assembly_1.SMTFunction(this.generateDesCallName(ltype, "sum"), [{ vname: "l", vtype: ltype }], undefined, 0, restype, ffunc)],
            uf: ufops
        };
    }
    emitDestructorFindIndexOf_Shared(ltype, isidx, code, pcode, sl, osize, k) {
        const [capturedargs, , ufpickargs] = this.generateCapturedInfoFor(pcode, isidx ? 2 : 1, [ltype, this.nattype]);
        const skloemcc = this.generateConsCallNameUsing(ltype, "skolem_list_index" + (isidx ? "_idx" : ""), code);
        const getop = this.generateDesCallName(ltype, "get");
        const getcall = new smt_exp_1.SMTCallSimple(getop, [sl, new smt_exp_1.SMTVar("_@nn")]);
        const largs = isidx ? [getcall, new smt_exp_1.SMTVar("_@nn")] : [getcall];
        const findidx = new smt_exp_1.SMTLet("_@nn", this.generateListIndexPickCall_Kth(skloemcc, sl, k, capturedargs), new smt_exp_1.SMTIf(new smt_exp_1.SMTCallSimple("bvult", [new smt_exp_1.SMTVar("_@nn"), osize]), new smt_exp_1.SMTIf(this.generateLambdaCallKnownSafe(code, this.temitter.getMIRType("NSCore::Bool"), largs, capturedargs), this.temitter.generateResultTypeConstructorSuccess(this.temitter.getMIRType("NSCore::Nat"), new smt_exp_1.SMTVar("_@nn")), this.temitter.generateErrorResultAssert(this.temitter.getMIRType("NSCore::Nat"))), this.temitter.generateErrorResultAssert(this.temitter.getMIRType("NSCore::Nat"))));
        return [
            findidx,
            new smt_assembly_1.SMTFunctionUninterpreted(skloemcc, [ltype, this.nattype, ...ufpickargs], this.nattype)
        ];
    }
    generateCapturedInfoFor(pcode, k, ufpicktypes) {
        const lambdainfo = this.temitter.assembly.invokeDecls.get(pcode.code);
        let capturedargs = [];
        let capturedparams = [];
        let ufpickargs = ufpicktypes || [];
        lambdainfo.params.slice(k).forEach((p) => {
            capturedargs.push(new smt_exp_1.SMTVar(p.name));
            capturedparams.push({ vname: p.name, vtype: this.temitter.getSMTTypeFor(this.temitter.getMIRType(p.type)) });
            ufpickargs.push(this.temitter.getSMTTypeFor(this.temitter.getMIRType(p.type)));
        });
        return [capturedargs, capturedparams, ufpickargs];
    }
    generateCapturedFieldInfoFor(ltype, op, k, code, pcode) {
        const lambdainfo = this.temitter.assembly.invokeDecls.get(pcode.code);
        const capturedfields = lambdainfo.params.slice(k).map((p) => {
            return { fname: this.generateULIFieldUsingFor(ltype, op, code, p.name), ftype: this.temitter.getSMTTypeFor(this.temitter.getMIRType(p.type)) };
        });
        return capturedfields;
    }
    generateCapturedFieldLetsInfoFor(ltype, op, k, code, pcode, ll) {
        const lambdainfo = this.temitter.assembly.invokeDecls.get(pcode.code);
        const capturedfieldlets = lambdainfo.params.slice(k).map((p) => {
            return { vname: "c@" + p.name, value: this.generateGetULIFieldUsingFor(ltype, op, code, p.name, ll) };
        });
        return capturedfieldlets;
    }
    processCapturedFieldLets(clets, continuation) {
        if (clets.length === 0) {
            return continuation;
        }
        else {
            return new smt_exp_1.SMTLetMulti(clets, continuation);
        }
    }
    generateListIndexPickCall_Kth(ctxname, sl, k, capturedargs) {
        return new smt_exp_1.SMTCallSimple(ctxname, [sl, k, ...capturedargs]);
    }
    generateLambdaCallKnownSafe(code, restype, args, cargs) {
        if (this.safecalls.has(code)) {
            return new smt_exp_1.SMTCallSimple(this.temitter.lookupFunctionName(code), [...args, ...cargs]);
        }
        else {
            return this.temitter.generateResultGetSuccess(restype, new smt_exp_1.SMTCallGeneral(this.temitter.lookupFunctionName(code), [...args, ...cargs]));
        }
    }
    generateLambdaCallGeneral(code, restype, args, cargs) {
        return new smt_exp_1.SMTCallGeneral(this.temitter.lookupFunctionName(code), [...args, ...cargs]);
    }
}
exports.ListOpsManager = ListOpsManager;
//# sourceMappingURL=smtcollection_emitter.js.map