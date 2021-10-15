"use strict";
//-------------------------------------------------------------------------------------------------------
// Copyright (C) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE.txt file in the project root for full license information.
//-------------------------------------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
exports.SMTEmitter = void 0;
const assert = require("assert");
const mir_assembly_1 = require("../../compiler/mir_assembly");
const mir_callg_1 = require("../../compiler/mir_callg");
const smtbody_emitter_1 = require("./smtbody_emitter");
const smttype_emitter_1 = require("./smttype_emitter");
const smt_assembly_1 = require("./smt_assembly");
const smt_exp_1 = require("./smt_exp");
class SMTEmitter {
    constructor(temitter, bemitter, assembly) {
        this.lastVInvokeIdx = 0;
        this.lastVOperatorIdx = 0;
        this.lastVEntityUpdateIdx = 0;
        this.temitter = temitter;
        this.bemitter = bemitter;
        this.assembly = assembly;
        this.havocPathType = this.temitter.getSMTTypeFor(this.temitter.getMIRType("NSCore::HavocSequence"));
    }
    generateAPITypeConstructorFunction_BigNat(havocfuncs) {
        const bntype = this.temitter.getMIRType("NSCore::BigNat");
        const fbody = new smt_exp_1.SMTLet("@vval", new smt_exp_1.SMTCallSimple("BBigNat@UFCons_API", [new smt_exp_1.SMTVar("path")]), new smt_exp_1.SMTIf(new smt_exp_1.SMTCallSimple("<", [new smt_exp_1.SMTVar("@vval"), new smt_exp_1.SMTConst("0")]), this.temitter.generateErrorResultAssert(bntype), this.temitter.generateResultTypeConstructorSuccess(bntype, new smt_exp_1.SMTVar("@vval"))));
        havocfuncs.add(this.temitter.generateHavocConstructorName(bntype));
        this.assembly.functions.push(smt_assembly_1.SMTFunction.create(this.temitter.generateHavocConstructorName(bntype), [{ vname: "path", vtype: this.havocPathType }], this.temitter.generateResultType(bntype), fbody));
    }
    generateAPITypeConstructorFunction_String(havocfuncs) {
        const bcreate = new smt_exp_1.SMTCallSimple("BString@UFCons_API", [new smt_exp_1.SMTVar("path")]);
        let fbody = new smt_exp_1.SMTConst("[UNDEFINED]");
        if (this.bemitter.vopts.StringOpt === "ASCII") {
            fbody = new smt_exp_1.SMTLet("str", bcreate, new smt_exp_1.SMTIf(new smt_exp_1.SMTCallSimple("<=", [new smt_exp_1.SMTCallSimple("str.len", [new smt_exp_1.SMTVar("str")]), new smt_exp_1.SMTConst(this.bemitter.numgen.int.natmax.toString(10))]), this.temitter.generateResultTypeConstructorSuccess(this.temitter.getMIRType("NSCore::String"), new smt_exp_1.SMTVar("str")), this.temitter.generateErrorResultAssert(this.temitter.getMIRType("NSCore::String"))));
        }
        else {
            fbody = new smt_exp_1.SMTLet("str", bcreate, new smt_exp_1.SMTIf(new smt_exp_1.SMTCallSimple("<=", [new smt_exp_1.SMTCallSimple("seq.len", [new smt_exp_1.SMTVar("str")]), new smt_exp_1.SMTConst(this.bemitter.numgen.int.natmax.toString(10))]), this.temitter.generateResultTypeConstructorSuccess(this.temitter.getMIRType("NSCore::String"), new smt_exp_1.SMTVar("str")), this.temitter.generateErrorResultAssert(this.temitter.getMIRType("NSCore::String"))));
        }
        havocfuncs.add(this.temitter.generateHavocConstructorName(this.temitter.getMIRType("NSCore::String")));
        this.assembly.functions.push(smt_assembly_1.SMTFunction.create(this.temitter.generateHavocConstructorName(this.temitter.getMIRType("NSCore::String")), [{ vname: "path", vtype: this.havocPathType }], this.temitter.generateResultType(this.temitter.getMIRType("NSCore::String")), fbody));
    }
    generateAPITypeConstructorFunction_ISOTime(havocfuncs) {
        const bntype = this.temitter.getMIRType("NSCore::ISOTime");
        const fbody = new smt_exp_1.SMTLet("@vval", new smt_exp_1.SMTCallSimple("BISOTime@UFCons_API", [new smt_exp_1.SMTVar("path")]), new smt_exp_1.SMTIf(new smt_exp_1.SMTCallSimple("<", [new smt_exp_1.SMTVar("@vval"), new smt_exp_1.SMTConst("0")]), this.temitter.generateErrorResultAssert(bntype), this.temitter.generateResultTypeConstructorSuccess(bntype, new smt_exp_1.SMTVar("@vval"))));
        havocfuncs.add(this.temitter.generateHavocConstructorName(bntype));
        this.assembly.functions.push(smt_assembly_1.SMTFunction.create(this.temitter.generateHavocConstructorName(bntype), [{ vname: "path", vtype: this.havocPathType }], this.temitter.generateResultType(bntype), fbody));
    }
    generateAPITypeConstructorFunction_LogicalTime(havocfuncs) {
        const bntype = this.temitter.getMIRType("NSCore::LogicalTime");
        const fbody = new smt_exp_1.SMTLet("@vval", new smt_exp_1.SMTCallSimple("BLogicalTime@UFCons_API", [new smt_exp_1.SMTVar("path")]), new smt_exp_1.SMTIf(new smt_exp_1.SMTCallSimple("<", [new smt_exp_1.SMTVar("@vval"), new smt_exp_1.SMTConst("0")]), this.temitter.generateErrorResultAssert(bntype), this.temitter.generateResultTypeConstructorSuccess(bntype, new smt_exp_1.SMTVar("@vval"))));
        havocfuncs.add(this.temitter.generateHavocConstructorName(bntype));
        this.assembly.functions.push(smt_assembly_1.SMTFunction.create(this.temitter.generateHavocConstructorName(bntype), [{ vname: "path", vtype: this.havocPathType }], this.temitter.generateResultType(bntype), fbody));
    }
    generateAPITypeConstructorFunction_UUID(havocfuncs) {
        const bcreate = new smt_exp_1.SMTCallSimple("BUUID@UFCons_API", [new smt_exp_1.SMTVar("path")]);
        const fbody = new smt_exp_1.SMTLet("bb", bcreate, new smt_exp_1.SMTIf(smt_exp_1.SMTCallSimple.makeEq(new smt_exp_1.SMTCallSimple("seq.len", [new smt_exp_1.SMTVar("bb")]), new smt_exp_1.SMTConst("16")), this.temitter.generateResultTypeConstructorSuccess(this.temitter.getMIRType("NSCore::UUID"), new smt_exp_1.SMTVar("bb")), this.temitter.generateErrorResultAssert(this.temitter.getMIRType("NSCore::UUID"))));
        havocfuncs.add(this.temitter.generateHavocConstructorName(this.temitter.getMIRType("NSCore::UUID")));
        this.assembly.functions.push(smt_assembly_1.SMTFunction.create(this.temitter.generateHavocConstructorName(this.temitter.getMIRType("NSCore::UUID")), [{ vname: "path", vtype: this.havocPathType }], this.temitter.generateResultType(this.temitter.getMIRType("NSCore::ByteBuffer")), fbody));
    }
    generateAPITypeConstructorFunction_ByteBuffer(havocfuncs) {
        const bcreate = new smt_exp_1.SMTCallSimple("BByteBuffer@UFCons_API", [new smt_exp_1.SMTVar("path")]);
        const fbody = new smt_exp_1.SMTLet("bb", bcreate, new smt_exp_1.SMTIf(new smt_exp_1.SMTCallSimple("<=", [new smt_exp_1.SMTCallSimple("seq.len", [new smt_exp_1.SMTVar("bb")]), new smt_exp_1.SMTConst(this.bemitter.numgen.int.natmax.toString(10))]), this.temitter.generateResultTypeConstructorSuccess(this.temitter.getMIRType("NSCore::ByteBuffer"), new smt_exp_1.SMTVar("bb")), this.temitter.generateErrorResultAssert(this.temitter.getMIRType("NSCore::ByteBuffer"))));
        havocfuncs.add(this.temitter.generateHavocConstructorName(this.temitter.getMIRType("NSCore::ByteBuffer")));
        this.assembly.functions.push(smt_assembly_1.SMTFunction.create(this.temitter.generateHavocConstructorName(this.temitter.getMIRType("NSCore::ByteBuffer")), [{ vname: "path", vtype: this.havocPathType }], this.temitter.generateResultType(this.temitter.getMIRType("NSCore::ByteBuffer")), fbody));
    }
    generateAPITypeConstructorFunction_ValidatedString(tt, havocfuncs, ufuncs) {
        this.walkAndGenerateHavocType(this.temitter.getMIRType("NSCore::String"), havocfuncs, ufuncs);
        const bcreate = this.temitter.generateHavocConstructorCall(this.temitter.getMIRType("NSCore::String"), new smt_exp_1.SMTVar("path"), this.bemitter.numgen.int.emitSimpleNat(0));
        const ttdecl = this.bemitter.assembly.entityDecls.get(tt.typeID);
        const vre = this.bemitter.assembly.validatorRegexs.get(ttdecl.fromtype);
        const lre = vre.compileToPatternToSMT(this.bemitter.vopts.StringOpt === "ASCII");
        let accept = new smt_exp_1.SMTConst("false");
        if (this.bemitter.vopts.StringOpt === "ASCII") {
            accept = new smt_exp_1.SMTCallSimple("str.in.re", [this.temitter.generateResultGetSuccess(this.temitter.getMIRType("NSCore::String"), new smt_exp_1.SMTVar("str")), new smt_exp_1.SMTConst(lre)]);
        }
        else {
            accept = new smt_exp_1.SMTCallSimple("seq.in.re", [this.temitter.generateResultGetSuccess(this.temitter.getMIRType("NSCore::String"), new smt_exp_1.SMTVar("str")), new smt_exp_1.SMTConst(lre)]);
        }
        const fbody = new smt_exp_1.SMTLet("str", bcreate, new smt_exp_1.SMTIf(smt_exp_1.SMTCallSimple.makeAndOf(this.temitter.generateResultIsSuccessTest(this.temitter.getMIRType("NSCore::String"), new smt_exp_1.SMTVar("str")), accept), new smt_exp_1.SMTVar("str"), this.temitter.generateErrorResultAssert(tt)));
        havocfuncs.add(this.temitter.generateHavocConstructorName(tt));
        this.assembly.functions.push(smt_assembly_1.SMTFunction.create(this.temitter.generateHavocConstructorName(tt), [{ vname: "path", vtype: this.havocPathType }], this.temitter.generateResultType(tt), fbody));
    }
    generateAPITypeConstructorFunction_DataString(tt, havocfuncs, ufuncs) {
        this.walkAndGenerateHavocType(this.temitter.getMIRType("NSCore::String"), havocfuncs, ufuncs);
        const bcreate = this.temitter.generateHavocConstructorCall(this.temitter.getMIRType("NSCore::String"), new smt_exp_1.SMTVar("path"), new smt_exp_1.SMTConst(`(_ bv${0} ${this.assembly.vopts.ISize})`));
        const ttdecl = this.bemitter.assembly.entityDecls.get(tt.typeID);
        const accepts = this.temitter.lookupFunctionName(ttdecl.optaccepts);
        const pcheck = smt_exp_1.SMTCallSimple.makeEq(new smt_exp_1.SMTCallGeneral(accepts, [new smt_exp_1.SMTVar("str")]), this.temitter.generateResultTypeConstructorSuccess(this.temitter.getMIRType("NSCore::Bool"), new smt_exp_1.SMTConst("true")));
        const fbody = new smt_exp_1.SMTLet("str", bcreate, new smt_exp_1.SMTIf(smt_exp_1.SMTCallSimple.makeAndOf(this.temitter.generateResultIsSuccessTest(this.temitter.getMIRType("NSCore::String"), new smt_exp_1.SMTVar("str")), pcheck), this.temitter.generateResultTypeConstructorSuccess(tt, new smt_exp_1.SMTVar("str")), this.temitter.generateErrorResultAssert(tt)));
        havocfuncs.add(this.temitter.generateHavocConstructorName(tt));
        this.assembly.functions.push(smt_assembly_1.SMTFunction.create(this.temitter.generateHavocConstructorName(tt), [{ vname: "path", vtype: this.havocPathType }], this.temitter.generateResultType(tt), fbody));
    }
    generateAPITypeConstructorFunction_ValidatedBuffer(tt, havocfuncs, ufuncs) {
        this.walkAndGenerateHavocType(this.temitter.getMIRType("NSCore::ByteBuffer"), havocfuncs, ufuncs);
        const bcreate = this.temitter.generateHavocConstructorCall(this.temitter.getMIRType("NSCore::ByteBuffer"), new smt_exp_1.SMTVar("path"), this.bemitter.numgen.int.emitSimpleNat(0));
        const ttdecl = this.bemitter.assembly.entityDecls.get(tt.typeID);
        const bcreateval = this.temitter.generateHavocConstructorCall(this.temitter.getMIRType(ttdecl.fromtype), new smt_exp_1.SMTVar("path"), this.bemitter.numgen.int.emitSimpleNat(1));
        const uufsmt = this.temitter.getSMTTypeFor(this.temitter.getMIRType(ttdecl.fromtype));
        const uuf = new smt_assembly_1.SMTFunctionUninterpreted(`BByteBuffer@expand_${uufsmt.name}`, [this.temitter.getSMTTypeFor(this.temitter.getMIRType("NSCore::ByteBuffer"))], uufsmt);
        const fbody = new smt_exp_1.SMTLetMulti([{ vname: "bb", value: bcreate }, { vname: "apiv", value: bcreateval }], new smt_exp_1.SMTIf(smt_exp_1.SMTCallSimple.makeAndOf(this.temitter.generateResultIsSuccessTest(this.temitter.getMIRType("NSCore::ByteBuffer"), new smt_exp_1.SMTVar("bb")), this.temitter.generateResultIsSuccessTest(this.temitter.getMIRType(ttdecl.fromtype), new smt_exp_1.SMTVar("apiv")), smt_exp_1.SMTCallSimple.makeEq(this.temitter.generateResultGetSuccess(this.temitter.getMIRType(ttdecl.fromtype), new smt_exp_1.SMTVar("apiv")), new smt_exp_1.SMTCallSimple(`BByteBuffer@expand_${uufsmt.name}`, [this.temitter.generateResultGetSuccess(this.temitter.getMIRType("NSCore::ByteBuffer"), new smt_exp_1.SMTVar("bb"))]))), new smt_exp_1.SMTVar("bb"), this.temitter.generateErrorResultAssert(tt)));
        ufuncs.push(uuf);
        havocfuncs.add(this.temitter.generateHavocConstructorName(tt));
        this.assembly.functions.push(smt_assembly_1.SMTFunction.create(this.temitter.generateHavocConstructorName(tt), [{ vname: "path", vtype: this.havocPathType }], this.temitter.generateResultType(tt), fbody));
    }
    generateAPITypeConstructorFunction_DataBuffer(tt, havocfuncs, ufuncs) {
        this.walkAndGenerateHavocType(this.temitter.getMIRType("NSCore::ByteBuffer"), havocfuncs, ufuncs);
        const bcreate = this.temitter.generateHavocConstructorCall(this.temitter.getMIRType("NSCore::ByteBuffer"), new smt_exp_1.SMTVar("path"), this.bemitter.numgen.int.emitSimpleNat(0));
        this.walkAndGenerateHavocType(this.temitter.getMIRType("NSCore::String"), havocfuncs, ufuncs);
        const screate = this.temitter.generateHavocConstructorCall(this.temitter.getMIRType("NSCore::String"), new smt_exp_1.SMTVar("path"), this.bemitter.numgen.int.emitSimpleNat(1));
        const ttdecl = this.bemitter.assembly.entityDecls.get(tt.typeID);
        const accepts = this.temitter.lookupFunctionName(ttdecl.optaccepts);
        const pcheck = smt_exp_1.SMTCallSimple.makeEq(new smt_exp_1.SMTCallGeneral(accepts, [new smt_exp_1.SMTVar("str")]), this.temitter.generateResultTypeConstructorSuccess(this.temitter.getMIRType("NSCore::Bool"), new smt_exp_1.SMTConst("true")));
        const fbody = new smt_exp_1.SMTLetMulti([{ vname: "bb", value: bcreate }, { vname: "str", value: screate }], new smt_exp_1.SMTIf(smt_exp_1.SMTCallSimple.makeAndOf(this.temitter.generateResultIsSuccessTest(this.temitter.getMIRType("NSCore::ByteBuffer"), new smt_exp_1.SMTVar("bb")), this.temitter.generateResultIsSuccessTest(this.temitter.getMIRType("NSCore::String"), new smt_exp_1.SMTVar("str")), pcheck, smt_exp_1.SMTCallSimple.makeEq(this.temitter.generateResultGetSuccess(this.temitter.getMIRType("NSCore::String"), new smt_exp_1.SMTVar("str")), new smt_exp_1.SMTCallSimple("BByteBuffer@expandstr", [this.temitter.generateResultGetSuccess(this.temitter.getMIRType("NSCore::ByteBuffer"), new smt_exp_1.SMTVar("bb"))]))), new smt_exp_1.SMTVar("bb"), this.temitter.generateErrorResultAssert(tt)));
        havocfuncs.add(this.temitter.generateHavocConstructorName(tt));
        this.assembly.functions.push(smt_assembly_1.SMTFunction.create(this.temitter.generateHavocConstructorName(tt), [{ vname: "path", vtype: this.havocPathType }], this.temitter.generateResultType(tt), fbody));
    }
    generateAPITypeConstructorFunction_TypedPrimitive(tt, havocfuncs, ufuncs) {
        const tdecl = this.bemitter.assembly.entityDecls.get(tt.typeID);
        const oftype = this.temitter.getMIRType(tdecl.fromtype);
        this.walkAndGenerateHavocType(oftype, havocfuncs, ufuncs);
        const bcreate = this.temitter.generateHavocConstructorCall(oftype, new smt_exp_1.SMTVar("path"), this.bemitter.numgen.int.emitSimpleNat(0));
        havocfuncs.add(this.temitter.generateHavocConstructorName(tt));
        if (tdecl.usingcons === undefined) {
            this.assembly.functions.push(smt_assembly_1.SMTFunction.create(this.temitter.generateHavocConstructorName(tt), [{ vname: "path", vtype: this.havocPathType }], this.temitter.generateResultType(tt), bcreate));
        }
        else {
            if (!this.bemitter.isSafeConstructorInvoke(tt)) {
                const ccons = new smt_exp_1.SMTCallGeneral(this.temitter.lookupFunctionName(tdecl.usingcons), [this.temitter.generateResultGetSuccess(oftype, new smt_exp_1.SMTVar("vv"))]);
                const fbody = new smt_exp_1.SMTLet("vv", bcreate, new smt_exp_1.SMTIf(this.temitter.generateResultIsSuccessTest(oftype, new smt_exp_1.SMTVar("vv")), new smt_exp_1.SMTLet("cc", ccons, new smt_exp_1.SMTIf(this.temitter.generateResultIsSuccessTest(tt, new smt_exp_1.SMTVar("cc")), new smt_exp_1.SMTVar("cc"), this.temitter.generateErrorResultAssert(tt))), this.temitter.generateErrorResultAssert(tt)));
                this.assembly.functions.push(smt_assembly_1.SMTFunction.create(this.temitter.generateHavocConstructorName(tt), [{ vname: "path", vtype: this.havocPathType }], this.temitter.generateResultType(tt), fbody));
            }
            else {
                const ccons = new smt_exp_1.SMTCallSimple(this.temitter.lookupFunctionName(tdecl.usingcons), [this.temitter.generateResultGetSuccess(oftype, new smt_exp_1.SMTVar("vv"))]);
                const fbody = new smt_exp_1.SMTLet("vv", bcreate, new smt_exp_1.SMTIf(this.temitter.generateResultIsSuccessTest(oftype, new smt_exp_1.SMTVar("vv")), this.temitter.generateResultTypeConstructorSuccess(tt, ccons), this.temitter.generateErrorResultAssert(tt)));
                this.assembly.functions.push(smt_assembly_1.SMTFunction.create(this.temitter.generateHavocConstructorName(tt), [{ vname: "path", vtype: this.havocPathType }], this.temitter.generateResultType(tt), fbody));
            }
        }
    }
    generateAPITypeConstructorFunction_Something(tt, havocfuncs, ufuncs) {
        const tdecl = this.bemitter.assembly.entityDecls.get(tt.typeID);
        const oftype = this.temitter.getMIRType(tdecl.fromtype);
        this.walkAndGenerateHavocType(oftype, havocfuncs, ufuncs);
        const bcreate = this.temitter.generateHavocConstructorCall(oftype, new smt_exp_1.SMTVar("path"), this.bemitter.numgen.int.emitSimpleNat(0));
        havocfuncs.add(this.temitter.generateHavocConstructorName(tt));
        this.assembly.functions.push(smt_assembly_1.SMTFunction.create(this.temitter.generateHavocConstructorName(tt), [{ vname: "path", vtype: this.havocPathType }], this.temitter.generateResultType(tt), bcreate));
    }
    generateAPITypeConstructorFunction_Ok(tt, havocfuncs, ufuncs) {
        const tdecl = this.bemitter.assembly.entityDecls.get(tt.typeID);
        const oftype = this.temitter.getMIRType(tdecl.fromtype);
        this.walkAndGenerateHavocType(oftype, havocfuncs, ufuncs);
        const bcreate = this.temitter.generateHavocConstructorCall(oftype, new smt_exp_1.SMTVar("path"), this.bemitter.numgen.int.emitSimpleNat(0));
        havocfuncs.add(this.temitter.generateHavocConstructorName(tt));
        this.assembly.functions.push(smt_assembly_1.SMTFunction.create(this.temitter.generateHavocConstructorName(tt), [{ vname: "path", vtype: this.havocPathType }], this.temitter.generateResultType(tt), bcreate));
    }
    generateAPITypeConstructorFunction_Err(tt, havocfuncs, ufuncs) {
        const tdecl = this.bemitter.assembly.entityDecls.get(tt.typeID);
        const oftype = this.temitter.getMIRType(tdecl.fromtype);
        this.walkAndGenerateHavocType(oftype, havocfuncs, ufuncs);
        const bcreate = this.temitter.generateHavocConstructorCall(oftype, new smt_exp_1.SMTVar("path"), this.bemitter.numgen.int.emitSimpleNat(0));
        havocfuncs.add(this.temitter.generateHavocConstructorName(tt));
        this.assembly.functions.push(smt_assembly_1.SMTFunction.create(this.temitter.generateHavocConstructorName(tt), [{ vname: "path", vtype: this.havocPathType }], this.temitter.generateResultType(tt), bcreate));
    }
    generateAPITypeConstructorFunction_Enum(tt, havocfuncs, ufuncs) {
        const tdecl = this.bemitter.assembly.entityDecls.get(tt.typeID);
        const fbody = new smt_exp_1.SMTLet("@vval", new smt_exp_1.SMTCallSimple("EnumChoice@UFCons_API", [new smt_exp_1.SMTVar("path")]), new smt_exp_1.SMTIf(new smt_exp_1.SMTCallSimple("bvult", [new smt_exp_1.SMTVar("@vval"), this.bemitter.numgen.int.emitSimpleNat(tdecl.enums.length)]), this.temitter.generateResultTypeConstructorSuccess(tt, new smt_exp_1.SMTVar("@vval")), this.temitter.generateErrorResultAssert(tt)));
        havocfuncs.add(this.temitter.generateHavocConstructorName(tt));
        this.assembly.functions.push(smt_assembly_1.SMTFunction.create(this.temitter.generateHavocConstructorName(tt), [{ vname: "path", vtype: this.havocPathType }], this.temitter.generateResultType(tt), fbody));
    }
    generateAPITypeConstructorFunction_Tuple(tt, havocfuncs, ufuncs) {
        const ttuple = tt.options[0];
        const ctors = ttuple.entries.map((ee, i) => {
            this.walkAndGenerateHavocType(ee, havocfuncs, ufuncs);
            const cc = this.temitter.generateHavocConstructorCall(ee, new smt_exp_1.SMTVar("path"), this.bemitter.numgen.int.emitSimpleNat(i));
            const ccvar = this.bemitter.generateTempName();
            const issafehavoc = this.temitter.isKnownSafeHavocConstructorType(ee);
            const chkfun = issafehavoc ? new smt_exp_1.SMTConst("true") : this.temitter.generateResultIsSuccessTest(ee, new smt_exp_1.SMTVar(ccvar));
            const access = this.temitter.generateResultGetSuccess(ee, new smt_exp_1.SMTVar(ccvar));
            return { ccvar: ccvar, cc: cc, chk: chkfun, access: access };
        });
        const fbody = new smt_exp_1.SMTLetMulti(ctors.map((ctor) => { return { vname: ctor.ccvar, value: ctor.cc }; }), new smt_exp_1.SMTIf((ttuple.entries.length !== 0 ? smt_exp_1.SMTCallSimple.makeAndOf(...ctors.filter((ctor) => ctor.chk !== undefined).map((ctor) => ctor.chk)) : new smt_exp_1.SMTConst("true")), this.temitter.generateResultTypeConstructorSuccess(tt, new smt_exp_1.SMTCallSimple(this.temitter.getSMTConstructorName(tt).cons, ctors.map((ctor) => ctor.access))), this.temitter.generateErrorResultAssert(tt)));
        havocfuncs.add(this.temitter.generateHavocConstructorName(tt));
        this.assembly.functions.push(smt_assembly_1.SMTFunction.create(this.temitter.generateHavocConstructorName(tt), [{ vname: "path", vtype: this.havocPathType }], this.temitter.generateResultType(tt), fbody));
    }
    generateAPITypeConstructorFunction_Record(tt, havocfuncs, ufuncs) {
        const trecord = tt.options[0];
        const ctors = trecord.entries.map((ee, i) => {
            this.walkAndGenerateHavocType(ee.ptype, havocfuncs, ufuncs);
            const cc = this.temitter.generateHavocConstructorCall(ee.ptype, new smt_exp_1.SMTVar("path"), this.bemitter.numgen.int.emitSimpleNat(i));
            const ccvar = this.bemitter.generateTempName();
            const issafehavoc = this.temitter.isKnownSafeHavocConstructorType(ee.ptype);
            const chkfun = issafehavoc ? new smt_exp_1.SMTConst("true") : this.temitter.generateResultIsSuccessTest(ee.ptype, new smt_exp_1.SMTVar(ccvar));
            const access = this.temitter.generateResultGetSuccess(ee.ptype, new smt_exp_1.SMTVar(ccvar));
            return { pname: ee.pname, ccvar: ccvar, cc: cc, chk: chkfun, access: access };
        });
        const fbody = new smt_exp_1.SMTLetMulti(ctors.map((ctor) => { return { vname: ctor.ccvar, value: ctor.cc }; }), new smt_exp_1.SMTIf((trecord.entries.length !== 0 ? smt_exp_1.SMTCallSimple.makeAndOf(...ctors.filter((ctor) => ctor.chk !== undefined).map((ctor) => ctor.chk)) : new smt_exp_1.SMTConst("true")), this.temitter.generateResultTypeConstructorSuccess(tt, new smt_exp_1.SMTCallSimple(this.temitter.getSMTConstructorName(tt).cons, ctors.map((ctor) => ctor.access))), this.temitter.generateErrorResultAssert(tt)));
        havocfuncs.add(this.temitter.generateHavocConstructorName(tt));
        this.assembly.functions.push(smt_assembly_1.SMTFunction.create(this.temitter.generateHavocConstructorName(tt), [{ vname: "path", vtype: this.havocPathType }], this.temitter.generateResultType(tt), fbody));
    }
    generateAPITypeConstructorFunction_Object(tt, havocfuncs, ufuncs) {
        const tdecl = this.bemitter.assembly.entityDecls.get(tt.typeID);
        const ctors = tdecl.consfuncfields.map((ee, i) => {
            const ff = this.temitter.assembly.fieldDecls.get(ee);
            const fftype = this.temitter.getMIRType(ff.declaredType);
            this.walkAndGenerateHavocType(fftype, havocfuncs, ufuncs);
            const cc = this.temitter.generateHavocConstructorCall(fftype, new smt_exp_1.SMTVar("path"), this.bemitter.numgen.int.emitSimpleNat(i));
            const ccvar = this.bemitter.generateTempName();
            const issafehavoc = this.temitter.isKnownSafeHavocConstructorType(fftype);
            const chkfun = issafehavoc ? new smt_exp_1.SMTConst("true") : this.temitter.generateResultIsSuccessTest(fftype, new smt_exp_1.SMTVar(ccvar));
            const access = this.temitter.generateResultGetSuccess(fftype, new smt_exp_1.SMTVar(ccvar));
            return { ccvar: ccvar, cc: cc, chk: chkfun, access: access };
        });
        let ccons = new smt_exp_1.SMTConst("[UNDEF]");
        if (!this.bemitter.isSafeConstructorInvoke(tt)) {
            ccons = new smt_exp_1.SMTCallGeneral(this.temitter.lookupFunctionName(tdecl.consfunc), ctors.map((arg) => arg.access));
        }
        else {
            ccons = this.temitter.generateResultTypeConstructorSuccess(tt, new smt_exp_1.SMTCallSimple(this.temitter.lookupFunctionName(tdecl.consfunc), ctors.map((arg) => arg.access)));
        }
        const fbody = new smt_exp_1.SMTLetMulti(ctors.map((ctor) => { return { vname: ctor.ccvar, value: ctor.cc }; }), new smt_exp_1.SMTIf((ctors.length !== 0 ? smt_exp_1.SMTCallSimple.makeAndOf(...ctors.filter((ctor) => ctor.chk !== undefined).map((ctor) => ctor.chk)) : new smt_exp_1.SMTConst("true")), ccons, this.temitter.generateErrorResultAssert(tt)));
        havocfuncs.add(this.temitter.generateHavocConstructorName(tt));
        this.assembly.functions.push(smt_assembly_1.SMTFunction.create(this.temitter.generateHavocConstructorName(tt), [{ vname: "path", vtype: this.havocPathType }], this.temitter.generateResultType(tt), fbody));
    }
    generateAPITypeConstructorFunction_Union(tt, havocfuncs, ufuncs) {
        for (let i = 0; i < tt.options.length; ++i) {
            this.walkAndGenerateHavocType(this.temitter.getMIRType(tt.options[i].typeID), havocfuncs, ufuncs);
        }
        const bselect = new smt_exp_1.SMTCallSimple("UnionChoice@UFCons_API", [new smt_exp_1.SMTVar("path")]);
        let ccv = new smt_exp_1.SMTVar("cc");
        let bexp = this.temitter.generateErrorResultAssert(tt);
        for (let i = 0; i < tt.options.length; ++i) {
            let ofidx = tt.options.length - (i + 1);
            let oftt = this.temitter.getMIRType(tt.options[ofidx].typeID);
            const cc = this.temitter.generateHavocConstructorCall(oftt, new smt_exp_1.SMTVar("path"), this.bemitter.numgen.int.emitSimpleNat(ofidx));
            const ccvar = this.bemitter.generateTempName();
            const issafehavoc = this.temitter.isKnownSafeHavocConstructorType(oftt);
            const chkfun = issafehavoc ? new smt_exp_1.SMTConst("true") : this.temitter.generateResultIsSuccessTest(oftt, new smt_exp_1.SMTVar(ccvar));
            const access = this.temitter.generateResultGetSuccess(oftt, new smt_exp_1.SMTVar(ccvar));
            bexp = new smt_exp_1.SMTIf(new smt_exp_1.SMTCallSimple("=", [ccv, this.bemitter.numgen.int.emitSimpleNat(ofidx)]), new smt_exp_1.SMTLet(ccvar, cc, new smt_exp_1.SMTIf(chkfun, this.temitter.generateResultTypeConstructorSuccess(tt, this.temitter.coerce(access, oftt, tt)), this.temitter.generateErrorResultAssert(tt))), bexp);
        }
        let fbody = new smt_exp_1.SMTLet("cc", bselect, bexp);
        havocfuncs.add(this.temitter.generateHavocConstructorName(tt));
        this.assembly.functions.push(smt_assembly_1.SMTFunction.create(this.temitter.generateHavocConstructorName(tt), [{ vname: "path", vtype: this.havocPathType }], this.temitter.generateResultType(tt), fbody));
    }
    generateAPITypeConstructorFunction_Concept(ctt, options, havocfuncs, ufuncs) {
        for (let i = 0; i < options.length; ++i) {
            this.walkAndGenerateHavocType(this.temitter.getMIRType(options[i].typeID), havocfuncs, ufuncs);
        }
        const bselect = new smt_exp_1.SMTCallSimple("ConceptChoice@UFCons_API", [new smt_exp_1.SMTVar("path")]);
        let ccv = new smt_exp_1.SMTVar("cc");
        let bexp = this.temitter.generateErrorResultAssert(ctt);
        for (let i = 0; i < options.length; ++i) {
            let ofidx = options.length - (i + 1);
            let oftt = this.temitter.getMIRType(options[ofidx].typeID);
            const cc = this.temitter.generateHavocConstructorCall(oftt, new smt_exp_1.SMTVar("path"), this.bemitter.numgen.int.emitSimpleNat(ofidx));
            const ccvar = this.bemitter.generateTempName();
            const issafehavoc = this.temitter.isKnownSafeHavocConstructorType(oftt);
            const chkfun = issafehavoc ? new smt_exp_1.SMTConst("true") : this.temitter.generateResultIsSuccessTest(oftt, new smt_exp_1.SMTVar(ccvar));
            const access = this.temitter.generateResultGetSuccess(oftt, new smt_exp_1.SMTVar(ccvar));
            bexp = new smt_exp_1.SMTIf(new smt_exp_1.SMTCallSimple("=", [ccv, this.bemitter.numgen.int.emitSimpleNat(ofidx)]), new smt_exp_1.SMTLet(ccvar, cc, new smt_exp_1.SMTIf(chkfun, this.temitter.generateResultTypeConstructorSuccess(ctt, this.temitter.coerce(access, oftt, ctt)), this.temitter.generateErrorResultAssert(ctt))), bexp);
        }
        let fbody = new smt_exp_1.SMTLet("cc", bselect, bexp);
        havocfuncs.add(this.temitter.generateHavocConstructorName(ctt));
        this.assembly.functions.push(smt_assembly_1.SMTFunction.create(this.temitter.generateHavocConstructorName(ctt), [{ vname: "path", vtype: this.havocPathType }], this.temitter.generateResultType(ctt), fbody));
    }
    generateAPITypeConstructorFunction_List(tt, havocfuncs, ufuncs) {
        const ldecl = this.temitter.assembly.entityDecls.get(tt.typeID);
        const ctype = this.temitter.getMIRType(ldecl.oftype);
        this.walkAndGenerateHavocType(ctype, havocfuncs, ufuncs);
        const invop = this.bemitter.lopsManager.registerHavoc(tt);
        const fbody = new smt_exp_1.SMTCallGeneral(invop, [new smt_exp_1.SMTVar("path")]);
        havocfuncs.add(this.temitter.generateHavocConstructorName(tt));
        this.assembly.functions.push(smt_assembly_1.SMTFunction.create(this.temitter.generateHavocConstructorName(tt), [{ vname: "path", vtype: this.havocPathType }], this.temitter.generateResultType(tt), fbody));
    }
    generateAPITypeConstructorFunction_Stack(tt, havocfuncs, ufuncs) {
        //
        //TODO: not implemented yet
        //
        assert(false, "Stack Havoc Not Implemented");
    }
    generateAPITypeConstructorFunction_Queue(tt, havocfuncs, ufuncs) {
        //
        //TODO: not implemented yet
        //
        assert(false, "Queue Havoc Not Implemented");
    }
    generateAPITypeConstructorFunction_Set(tt, havocfuncs, ufuncs) {
        //
        //TODO: not implemented yet
        //
        assert(false, "Set Havoc Not Implemented");
    }
    generateAPITypeConstructorFunction_Map(tt, havocfuncs, ufuncs) {
        const mdecl = this.temitter.assembly.entityDecls.get(tt.typeID);
        const ultype = this.temitter.getMIRType(mdecl.ultype);
        const ulcreate = this.temitter.generateHavocConstructorCall(ultype, new smt_exp_1.SMTVar("path"), this.bemitter.numgen.int.emitSimpleNat(0));
        const chk = new smt_exp_1.SMTCallGeneral(this.temitter.lookupFunctionName(mdecl.unqchkinv), [this.temitter.generateResultGetSuccess(ultype, new smt_exp_1.SMTVar("ll"))]);
        const rtrue = this.temitter.generateResultTypeConstructorSuccess(this.temitter.getMIRType("NSCore::Bool"), new smt_exp_1.SMTConst("true"));
        const fbody = new smt_exp_1.SMTLet("ll", ulcreate, new smt_exp_1.SMTIf(this.temitter.generateResultIsSuccessTest(ultype, new smt_exp_1.SMTVar("ll")), new smt_exp_1.SMTIf(smt_exp_1.SMTCallSimple.makeEq(chk, rtrue), new smt_exp_1.SMTVar("ll"), this.temitter.generateErrorResultAssert(tt)), this.temitter.generateErrorResultAssert(tt)));
        havocfuncs.add(this.temitter.generateHavocConstructorName(tt));
        this.assembly.functions.push(smt_assembly_1.SMTFunction.create(this.temitter.generateHavocConstructorName(tt), [{ vname: "path", vtype: this.havocPathType }], this.temitter.generateResultType(tt), fbody));
    }
    processConstructorGenInfo(cgen, constructors) {
        cgen.uf.forEach((uf) => {
            if (this.assembly.uninterpfunctions.find((f) => smt_assembly_1.SMTFunctionUninterpreted.areDuplicates(f, uf)) === undefined) {
                this.assembly.uninterpfunctions.push(uf);
            }
        });
        this.assembly.functions.push(...cgen.if);
        constructors.push(cgen.cons);
    }
    processDestructorGenInfo(dgen) {
        dgen.uf.forEach((uf) => {
            if (this.assembly.uninterpfunctions.find((f) => smt_assembly_1.SMTFunctionUninterpreted.areDuplicates(f, uf)) === undefined) {
                this.assembly.uninterpfunctions.push(uf);
            }
        });
        this.assembly.functions.push(...dgen.if);
    }
    processListTypeDecl(ldecl) {
        const mtype = this.temitter.getMIRType(ldecl.tkey);
        const ltype = this.temitter.getSMTTypeFor(mtype);
        const ctype = this.temitter.getMIRType(ldecl.oftype);
        const nattype = this.temitter.getSMTTypeFor(this.temitter.getMIRType("NSCore::Nat"));
        const linfo = this.bemitter.lopsManager.ops.get(ldecl.tkey);
        const constructors = [];
        ////
        //cons ops
        if (this.bemitter.lopsManager.rangenat && ctype.typeID == this.temitter.getMIRType("NSCore::Nat").typeID) {
            const crange = this.bemitter.lopsManager.emitConstructorRange(mtype, ltype, ctype);
            this.processConstructorGenInfo(crange, constructors);
        }
        if (this.bemitter.lopsManager.rangeint && ctype.typeID == this.temitter.getMIRType("NSCore::Int").typeID) {
            const crange = this.bemitter.lopsManager.emitConstructorRange(mtype, ltype, ctype);
            this.processConstructorGenInfo(crange, constructors);
        }
        const cempty = this.bemitter.lopsManager.emitConstructorEmpty(mtype, ltype);
        this.processConstructorGenInfo(cempty, constructors);
        const cslice = this.bemitter.lopsManager.emitConstructorSlice(mtype, ltype);
        this.processConstructorGenInfo(cslice, constructors);
        const cconcat2 = this.bemitter.lopsManager.emitConstructorConcat2(mtype, ltype);
        this.processConstructorGenInfo(cconcat2, constructors);
        for (let i = 1; i <= 3; ++i) {
            const ck = this.bemitter.lopsManager.emitConstructorLiteralK(mtype, ltype, ctype, i);
            this.processConstructorGenInfo(ck, constructors);
        }
        if (linfo !== undefined) {
            //large consops
            if (linfo.consops.fill) {
                const cfill = this.bemitter.lopsManager.emitConstructorFill(mtype, ltype, ctype);
                this.processConstructorGenInfo(cfill, constructors);
            }
            if (linfo.consops.havoc) {
                const chavoc = this.bemitter.lopsManager.emitConstructorHavoc(mtype, ltype, ctype);
                this.processConstructorGenInfo(chavoc, constructors);
            }
            if (linfo.consops.filter) {
                const cfilter = this.bemitter.lopsManager.emitConstructorFilter(ltype, mtype);
                this.processConstructorGenInfo(cfilter, constructors);
            }
            linfo.consops.map.forEach((minfo, code) => {
                const cmap = this.bemitter.lopsManager.emitConstructorMap(this.temitter.getSMTTypeFor(minfo.fromtype), minfo.totype, minfo.isidx, code, minfo.code);
                this.processConstructorGenInfo(cmap, constructors);
            });
        }
        ////
        //des ops
        const dget = this.bemitter.lopsManager.emitDestructorGet(ltype, ctype, linfo !== undefined ? linfo.consops : undefined);
        this.processDestructorGenInfo(dget);
        if (linfo !== undefined) {
            linfo.dops.safecheckpred.forEach((pcode, code) => {
                const dsafe = this.bemitter.lopsManager.emitSafeCheckPred(ltype, mtype, pcode.isidx, code, pcode.code);
                this.processDestructorGenInfo(dsafe);
            });
            linfo.dops.safecheckfn.forEach((cinfo, code) => {
                const dsafe = this.bemitter.lopsManager.emitSafeCheckFn(ltype, mtype, cinfo.rtype, cinfo.isidx, code, cinfo.code);
                this.processDestructorGenInfo(dsafe);
            });
            linfo.dops.isequence.forEach((pcode, code) => {
                const disq = this.bemitter.lopsManager.emitDestructorISequence(ltype, pcode.isidx, code, pcode.code);
                this.processDestructorGenInfo(disq);
            });
            linfo.dops.haspredcheck.forEach((pcode, code) => {
                const disq = this.bemitter.lopsManager.emitDestructorHasPredCheck(ltype, pcode.isidx, code, pcode.code);
                this.processDestructorGenInfo(disq);
            });
            linfo.dops.findIndexOf.forEach((pcode, code) => {
                const disq = this.bemitter.lopsManager.emitDestructorFindIndexOf(ltype, pcode.isidx, code, pcode.code);
                this.processDestructorGenInfo(disq);
            });
            linfo.dops.findLastIndexOf.forEach((pcode, code) => {
                const disq = this.bemitter.lopsManager.emitDestructorFindIndexOfLast(ltype, pcode.isidx, code, pcode.code);
                this.processDestructorGenInfo(disq);
            });
            if (linfo.dops.sum) {
                const disq = this.bemitter.lopsManager.emitDestructorSum(ltype, ctype);
                this.processDestructorGenInfo(disq);
            }
        }
        const ttag = `TypeTag_${ltype.name}`;
        const iskey = this.temitter.assembly.subtypeOf(mtype, this.temitter.getMIRType("NSCore::KeyType"));
        const consfuncs = this.temitter.getSMTConstructorName(mtype);
        const consdecl = {
            cname: consfuncs.cons,
            cargs: [
                { fname: `${ltype.name}@size`, ftype: nattype },
                { fname: `${ltype.name}@uli`, ftype: this.bemitter.lopsManager.generateULITypeFor(ltype) }
            ]
        };
        const emptyconst = `(declare-const ${this.temitter.lookupTypeName(ldecl.tkey)}@empty_const ${ltype.name}) (assert (= ${this.temitter.lookupTypeName(ldecl.tkey)}@empty_const (${consfuncs.cons} BNat@zero ${this.bemitter.lopsManager.generateConsCallName_Direct(ltype, "empty")})))`;
        const smtdecl = new smt_assembly_1.SMTListDecl(iskey, this.bemitter.lopsManager.generateULITypeFor(ltype).name, constructors, emptyconst, ltype.name, ttag, consdecl, consfuncs.box, consfuncs.bfield);
        this.assembly.listDecls.push(smtdecl);
    }
    processEntityDecl(edecl) {
        const mirtype = this.temitter.getMIRType(edecl.tkey);
        const smttype = this.temitter.getSMTTypeFor(mirtype);
        const ttag = `TypeTag_${smttype.name}`;
        const iskey = this.temitter.assembly.subtypeOf(mirtype, this.temitter.getMIRType("NSCore::KeyType"));
        const consfuncs = this.temitter.getSMTConstructorName(mirtype);
        const consdecl = {
            cname: consfuncs.cons,
            cargs: edecl.fields.map((fd) => {
                return { fname: this.temitter.generateEntityFieldGetFunction(edecl, fd), ftype: this.temitter.getSMTTypeFor(this.temitter.getMIRType(fd.declaredType)) };
            })
        };
        const smtdecl = new smt_assembly_1.SMTEntityDecl(iskey, smttype.name, ttag, consdecl, consfuncs.box, consfuncs.bfield);
        this.assembly.entityDecls.push(smtdecl);
    }
    processSpecialEntityDecl(edecl) {
        const mirtype = this.temitter.getMIRType(edecl.tkey);
        const smttype = this.temitter.getSMTTypeFor(mirtype);
        const ttag = `TypeTag_${smttype.name}`;
        const iskey = this.temitter.assembly.subtypeOf(mirtype, this.temitter.getMIRType("NSCore::KeyType"));
        const consfuncs = this.temitter.getSMTConstructorName(mirtype);
        const smtdecl = new smt_assembly_1.SMTEntityDecl(iskey, smttype.name, ttag, undefined, consfuncs.box, consfuncs.bfield);
        this.assembly.entityDecls.push(smtdecl);
    }
    processVirtualInvokes() {
        for (let i = this.lastVInvokeIdx; i < this.bemitter.requiredVirtualFunctionInvokes.length; ++i) {
            this.bemitter.generateVirtualFunctionInvoke(this.bemitter.requiredVirtualFunctionInvokes[i]);
        }
        this.lastVInvokeIdx = this.bemitter.requiredVirtualFunctionInvokes.length;
        for (let i = this.lastVOperatorIdx; i < this.bemitter.requiredVirtualOperatorInvokes.length; ++i) {
            this.bemitter.generateVirtualOperatorInvoke(this.bemitter.requiredVirtualOperatorInvokes[i]);
        }
        this.lastVOperatorIdx = this.bemitter.requiredVirtualOperatorInvokes.length;
    }
    processVirtualEntityUpdates() {
        for (let i = this.lastVEntityUpdateIdx; i < this.bemitter.requiredUpdateVirtualEntity.length; ++i) {
            this.bemitter.generateUpdateEntityFieldVirtual(this.bemitter.requiredUpdateVirtualEntity[i]);
        }
        this.lastVInvokeIdx = this.bemitter.requiredUpdateVirtualEntity.length;
    }
    walkAndGenerateHavocType(tt, havocfuncs, ufuncs) {
        if (havocfuncs.has(this.temitter.generateHavocConstructorName(tt))) {
            return; //already generated function
        }
        if (this.temitter.isKnownSafeHavocConstructorType(tt)) {
            //Don't need to do anything
        }
        else if (tt.options.length !== 1) {
            this.generateAPITypeConstructorFunction_Union(tt, havocfuncs, ufuncs);
        }
        else {
            if (this.temitter.isUniqueTupleType(tt)) {
                this.generateAPITypeConstructorFunction_Tuple(tt, havocfuncs, ufuncs);
            }
            else if (this.temitter.isUniqueRecordType(tt)) {
                this.generateAPITypeConstructorFunction_Record(tt, havocfuncs, ufuncs);
            }
            else if (this.temitter.isUniqueEntityType(tt)) {
                const etype = tt.options[0];
                const edecl = this.temitter.assembly.entityDecls.get(etype.typeID);
                if (edecl instanceof mir_assembly_1.MIRObjectEntityTypeDecl) {
                    this.generateAPITypeConstructorFunction_Object(tt, havocfuncs, ufuncs);
                }
                else if (this.temitter.isType(tt, "NSCore::BigNat")) {
                    this.generateAPITypeConstructorFunction_BigNat(havocfuncs);
                }
                else if (this.temitter.isType(tt, "NSCore::String")) {
                    this.generateAPITypeConstructorFunction_String(havocfuncs);
                }
                else if (this.temitter.isType(tt, "NSCore::ISOTime")) {
                    this.generateAPITypeConstructorFunction_ISOTime(havocfuncs);
                }
                else if (this.temitter.isType(tt, "NSCore::LogicalTime")) {
                    this.generateAPITypeConstructorFunction_LogicalTime(havocfuncs);
                }
                else if (this.temitter.isType(tt, "NSCore::UUID")) {
                    this.generateAPITypeConstructorFunction_UUID(havocfuncs);
                }
                else if (this.temitter.isType(tt, "NSCore::ByteBuffer")) {
                    this.generateAPITypeConstructorFunction_ByteBuffer(havocfuncs);
                }
                else if (edecl.attributes.includes("__stringof_type")) {
                    this.generateAPITypeConstructorFunction_ValidatedString(tt, havocfuncs, ufuncs);
                }
                else if (edecl.attributes.includes("__datastring_type")) {
                    this.generateAPITypeConstructorFunction_DataString(tt, havocfuncs, ufuncs);
                }
                else if (edecl.attributes.includes("__bufferof_type")) {
                    this.generateAPITypeConstructorFunction_ValidatedBuffer(tt, havocfuncs, ufuncs);
                }
                else if (edecl.attributes.includes("__databuffer_type")) {
                    this.generateAPITypeConstructorFunction_DataBuffer(tt, havocfuncs, ufuncs);
                }
                else if (edecl.attributes.includes("__typedprimitive")) {
                    this.generateAPITypeConstructorFunction_TypedPrimitive(tt, havocfuncs, ufuncs);
                }
                else if (edecl.attributes.includes("__enum_type")) {
                    this.generateAPITypeConstructorFunction_Enum(tt, havocfuncs, ufuncs);
                }
                else if (edecl.attributes.includes("__ok_type")) {
                    this.generateAPITypeConstructorFunction_Ok(tt, havocfuncs, ufuncs);
                }
                else if (edecl.attributes.includes("__err_type")) {
                    this.generateAPITypeConstructorFunction_Err(tt, havocfuncs, ufuncs);
                }
                else if (edecl.attributes.includes("__something_type")) {
                    this.generateAPITypeConstructorFunction_Something(tt, havocfuncs, ufuncs);
                }
                else if (edecl.attributes.includes("__list_type")) {
                    this.generateAPITypeConstructorFunction_List(tt, havocfuncs, ufuncs);
                }
                else if (edecl.attributes.includes("__stack_type")) {
                    this.generateAPITypeConstructorFunction_Stack(tt, havocfuncs, ufuncs);
                }
                else if (edecl.attributes.includes("__queue_type")) {
                    this.generateAPITypeConstructorFunction_Queue(tt, havocfuncs, ufuncs);
                }
                else if (edecl.attributes.includes("__set_type")) {
                    this.generateAPITypeConstructorFunction_Set(tt, havocfuncs, ufuncs);
                }
                else if (edecl.attributes.includes("__map_type")) {
                    this.generateAPITypeConstructorFunction_Map(tt, havocfuncs, ufuncs);
                }
                else {
                    //Don't need to do anything
                }
            }
            else if (tt.options[0] instanceof mir_assembly_1.MIRConceptType) {
                const etypes = [...this.temitter.assembly.entityDecls].filter((edi) => this.temitter.assembly.subtypeOf(this.temitter.getMIRType(edi[1].tkey), this.temitter.getMIRType(tt.typeID)));
                const opts = etypes.map((opt) => this.temitter.getMIRType(opt[1].tkey));
                this.generateAPITypeConstructorFunction_Concept(tt, opts, havocfuncs, ufuncs);
            }
            else {
                //Don't need to do anything
            }
        }
    }
    initializeSMTAssembly(assembly, entrypoint, callsafety) {
        const cinits = [...assembly.constantDecls].map((cdecl) => cdecl[1].ivalue);
        const apicons = [];
        [...assembly.entityDecls].forEach((edecl) => {
            if (edecl[1] instanceof mir_assembly_1.MIRConstructableEntityTypeDecl && this.temitter.assembly.subtypeOf(this.temitter.getMIRType(edecl[0]), this.temitter.getMIRType("NSCore::APIType")) && edecl[1].usingcons !== undefined) {
                apicons.push(edecl[1].usingcons);
            }
            else if (edecl[1] instanceof mir_assembly_1.MIRObjectEntityTypeDecl && this.temitter.assembly.subtypeOf(this.temitter.getMIRType(edecl[0]), this.temitter.getMIRType("NSCore::APIType")) && edecl[1].consfunc !== undefined) {
                apicons.push(edecl[1].consfunc);
            }
            else {
                //nothing needs to be done
            }
        });
        const cginfo = mir_callg_1.constructCallGraphInfo([entrypoint, ...apicons, ...cinits], assembly);
        const rcg = [...cginfo.topologicalOrder].reverse();
        for (let i = 0; i < rcg.length; ++i) {
            const cn = rcg[i];
            const cscc = cginfo.recursive.find((scc) => scc.has(cn.invoke));
            let worklist = cscc !== undefined ? [...cscc].sort() : [cn.invoke];
            for (let mi = 0; mi < worklist.length; ++mi) {
                const ikey = worklist[mi];
                const idcl = (assembly.invokeDecls.get(ikey) || assembly.primitiveInvokeDecls.get(ikey));
                const finfo = this.bemitter.generateSMTInvoke(idcl);
                this.processVirtualInvokes();
                this.processVirtualEntityUpdates();
                if (finfo !== undefined) {
                    if (finfo instanceof smt_assembly_1.SMTFunction) {
                        this.assembly.functions.push(finfo);
                    }
                    else {
                        this.assembly.uninterpfunctions.push(finfo);
                    }
                }
            }
        }
        assembly.typeMap.forEach((tt) => {
            const restype = this.temitter.getSMTTypeFor(tt);
            if (this.assembly.resultTypes.find((rtt) => rtt.ctype.name === restype.name) === undefined) {
                this.assembly.resultTypes.push(({ hasFlag: false, rtname: tt.typeID, ctype: restype }));
            }
        });
        this.bemitter.requiredLoadVirtualTupleIndex.forEach((rvlt) => this.assembly.functions.push(this.bemitter.generateLoadTupleIndexVirtual(rvlt)));
        this.bemitter.requiredLoadVirtualRecordProperty.forEach((rvlr) => this.assembly.functions.push(this.bemitter.generateLoadRecordPropertyVirtual(rvlr)));
        this.bemitter.requiredLoadVirtualEntityField.forEach((rvle) => this.assembly.functions.push(this.bemitter.generateLoadEntityFieldVirtual(rvle)));
        this.bemitter.requiredProjectVirtualTupleIndex.forEach((rvpt) => this.assembly.functions.push(this.bemitter.generateProjectTupleIndexVirtual(rvpt)));
        this.bemitter.requiredProjectVirtualRecordProperty.forEach((rvpr) => this.assembly.functions.push(this.bemitter.generateProjectRecordPropertyVirtual(rvpr)));
        this.bemitter.requiredProjectVirtualEntityField.forEach((rvpe) => this.assembly.functions.push(this.bemitter.generateProjectEntityFieldVirtual(rvpe)));
        this.bemitter.requiredUpdateVirtualTuple.forEach((rvut) => this.assembly.functions.push(this.bemitter.generateUpdateTupleIndexVirtual(rvut)));
        this.bemitter.requiredUpdateVirtualRecord.forEach((rvur) => this.assembly.functions.push(this.bemitter.generateUpdateRecordPropertyVirtual(rvur)));
        const mirep = assembly.invokeDecls.get(entrypoint);
        const iargs = mirep.params.map((param, i) => {
            const mirptype = this.temitter.getMIRType(param.type);
            const vname = this.bemitter.varStringToSMT(param.name).vname;
            let ufuncs = [];
            this.walkAndGenerateHavocType(mirptype, this.assembly.havocfuncs, []);
            ufuncs.forEach((uf) => {
                if (this.assembly.uninterpfunctions.find((f) => smt_assembly_1.SMTFunctionUninterpreted.areDuplicates(f, uf)) === undefined) {
                    this.assembly.uninterpfunctions.push(uf);
                }
            });
            const vexp = this.temitter.generateHavocConstructorCall(mirptype, new smt_exp_1.SMTCallSimple("seq.unit", [this.bemitter.numgen.int.emitSimpleNat(0)]), this.bemitter.numgen.int.emitSimpleNat(i));
            return { vname: vname, vtype: this.temitter.generateResultType(mirptype), vinit: vexp, vchk: this.temitter.generateResultIsSuccessTest(mirptype, new smt_exp_1.SMTVar(vname)), callexp: this.temitter.generateResultGetSuccess(mirptype, new smt_exp_1.SMTVar(vname)) };
        });
        const restype = this.temitter.getMIRType(mirep.resultType);
        let ufuncs = [];
        this.walkAndGenerateHavocType(restype, this.assembly.havocfuncs, ufuncs);
        ufuncs.forEach((uf) => {
            if (this.assembly.uninterpfunctions.find((f) => smt_assembly_1.SMTFunctionUninterpreted.areDuplicates(f, uf)) === undefined) {
                this.assembly.uninterpfunctions.push(uf);
            }
        });
        const resvexp = this.temitter.generateHavocConstructorCall(restype, new smt_exp_1.SMTConst("(as seq.empty (Seq BNat))"), this.bemitter.numgen.int.emitSimpleNat(1));
        const rarg = { vname: "_@smtres@_arg", vtype: this.temitter.generateResultType(restype), vinit: resvexp, vchk: this.temitter.generateResultIsSuccessTest(restype, new smt_exp_1.SMTVar("_@smtres@_arg")), callexp: this.temitter.generateResultGetSuccess(restype, new smt_exp_1.SMTVar("_@smtres@_arg")) };
        assembly.entityDecls.forEach((edcl) => {
            const mirtype = this.temitter.getMIRType(edcl.tkey);
            const ttag = this.temitter.getSMTTypeFor(mirtype).smttypetag;
            if (!this.assembly.typeTags.includes(ttag)) {
                this.assembly.typeTags.push(ttag);
            }
            if (!this.assembly.keytypeTags.includes(ttag)) {
                if (assembly.subtypeOf(mirtype, this.temitter.getMIRType("NSCore::KeyType"))) {
                    this.assembly.keytypeTags.push(ttag);
                }
            }
            if (edcl instanceof mir_assembly_1.MIRPrimitiveListEntityTypeDecl) {
                this.processListTypeDecl(edcl);
            }
            else {
                if (edcl instanceof mir_assembly_1.MIRObjectEntityTypeDecl) {
                    this.processEntityDecl(edcl);
                }
                else {
                    this.processSpecialEntityDecl(edcl);
                }
            }
        });
        this.bemitter.requiredSubtypeTagChecks.forEach((stc) => {
            const occ = stc.oftype.options[0];
            for (let i = 0; i < occ.ckeys.length; ++i) {
                const atname = `AbstractTypeTag_${this.temitter.getSMTTypeFor(this.temitter.getMIRType(occ.ckeys[i]))}`;
                if (!this.assembly.abstractTypes.includes(atname)) {
                    this.assembly.abstractTypes.push(atname);
                }
                assembly.typeMap.forEach((mtype) => {
                    if (this.temitter.isUniqueType(mtype) && assembly.subtypeOf(mtype, stc.t)) {
                        const ttag = this.temitter.getSMTTypeFor(mtype).smttypetag;
                        if (this.assembly.subtypeRelation.find((ee) => ee.ttype === ttag && ee.atype === atname) === undefined) {
                            const issub = assembly.subtypeOf(mtype, stc.oftype);
                            this.assembly.subtypeRelation.push({ ttype: ttag, atype: atname, value: issub });
                        }
                    }
                });
            }
        });
        this.bemitter.requiredIndexTagChecks.forEach((itc) => {
            const itag = `TupleIndexTag_${itc.idx}`;
            if (!this.assembly.indexTags.includes(itag)) {
                this.assembly.indexTags.push(itag);
            }
            assembly.typeMap.forEach((mtype) => {
                if (this.temitter.isUniqueType(mtype) && assembly.subtypeOf(mtype, itc.oftype)) {
                    const ttype = mtype.options[0];
                    const ttag = `TypeTag_${this.temitter.getSMTTypeFor(mtype).name}`;
                    if (this.assembly.hasIndexRelation.find((ee) => ee.idxtag === itag && ee.atype === ttag) === undefined) {
                        const hasidx = itc.idx < ttype.entries.length;
                        this.assembly.hasIndexRelation.push({ idxtag: itag, atype: ttag, value: hasidx });
                    }
                }
            });
        });
        this.bemitter.requiredRecordTagChecks.forEach((rtc) => {
            const ptag = `RecordPropertyTag_${rtc.pname}`;
            if (!this.assembly.propertyTags.includes(ptag)) {
                this.assembly.propertyTags.push(ptag);
            }
            assembly.typeMap.forEach((mtype) => {
                if (this.temitter.isUniqueType(mtype) && assembly.subtypeOf(mtype, rtc.oftype)) {
                    const ttype = mtype.options[0];
                    const ttag = `TypeTag_${this.temitter.getSMTTypeFor(mtype).name}`;
                    if (this.assembly.hasPropertyRelation.find((ee) => ee.pnametag === ptag && ee.atype === ttag) === undefined) {
                        const haspname = ttype.entries.find((entry) => entry.pname === rtc.pname) !== undefined;
                        this.assembly.hasPropertyRelation.push({ pnametag: ptag, atype: ttag, value: haspname });
                    }
                }
            });
        });
        assembly.tupleDecls.forEach((ttup) => {
            const mirtype = this.temitter.getMIRType(ttup.typeID);
            const ttag = `TypeTag_${this.temitter.getSMTTypeFor(mirtype).name}`;
            const iskey = assembly.subtypeOf(mirtype, this.temitter.getMIRType("NSCore::KeyType"));
            this.assembly.typeTags.push(ttag);
            if (iskey) {
                this.assembly.keytypeTags.push(ttag);
            }
            ttup.entries.map((entry) => {
                const etype = this.temitter.getSMTTypeFor(entry);
                if (this.assembly.resultTypes.find((rtt) => rtt.ctype.name === etype.name) === undefined) {
                    this.assembly.resultTypes.push(({ hasFlag: true, rtname: entry.typeID, ctype: etype }));
                }
            });
            const smttype = this.temitter.getSMTTypeFor(mirtype);
            const ops = this.temitter.getSMTConstructorName(mirtype);
            const consargs = ttup.entries.map((entry, i) => {
                return { fname: this.temitter.generateTupleIndexGetFunction(ttup, i), ftype: this.temitter.getSMTTypeFor(entry) };
            });
            this.assembly.tupleDecls.push(new smt_assembly_1.SMTTupleDecl(iskey, smttype.name, ttag, { cname: ops.cons, cargs: consargs }, ops.box, ops.bfield));
        });
        assembly.recordDecls.forEach((trec) => {
            const mirtype = this.temitter.getMIRType(trec.typeID);
            const ttag = `TypeTag_${this.temitter.getSMTTypeFor(mirtype).name}`;
            const iskey = assembly.subtypeOf(mirtype, this.temitter.getMIRType("NSCore::KeyType"));
            this.assembly.typeTags.push(ttag);
            if (iskey) {
                this.assembly.keytypeTags.push(ttag);
            }
            trec.entries.map((entry) => {
                const etype = this.temitter.getSMTTypeFor(entry.ptype);
                if (this.assembly.resultTypes.find((rtt) => rtt.ctype.name === etype.name) === undefined) {
                    this.assembly.resultTypes.push(({ hasFlag: true, rtname: entry.ptype.typeID, ctype: etype }));
                }
            });
            const smttype = this.temitter.getSMTTypeFor(mirtype);
            const ops = this.temitter.getSMTConstructorName(mirtype);
            const consargs = trec.entries.map((entry) => {
                return { fname: this.temitter.generateRecordPropertyGetFunction(trec, entry.pname), ftype: this.temitter.getSMTTypeFor(entry.ptype) };
            });
            this.assembly.recordDecls.push(new smt_assembly_1.SMTRecordDecl(iskey, smttype.name, ttag, { cname: ops.cons, cargs: consargs }, ops.box, ops.bfield));
        });
        assembly.ephemeralListDecls.forEach((ephl) => {
            const mirtype = this.temitter.getMIRType(ephl.typeID);
            const smttype = this.temitter.getSMTTypeFor(mirtype);
            const ops = this.temitter.getSMTConstructorName(mirtype);
            const consargs = ephl.entries.map((entry, i) => {
                return { fname: this.temitter.generateEphemeralListGetFunction(ephl, i), ftype: this.temitter.getSMTTypeFor(entry) };
            });
            this.assembly.ephemeralDecls.push(new smt_assembly_1.SMTEphemeralListDecl(smttype.name, { cname: ops.cons, cargs: consargs }));
        });
        assembly.constantDecls.forEach((cdecl) => {
            const smtname = this.temitter.lookupGlobalName(cdecl.gkey);
            const consf = this.temitter.lookupFunctionName(cdecl.ivalue);
            const ctype = this.temitter.getSMTTypeFor(this.temitter.getMIRType(cdecl.declaredType));
            let optenumname = undefined;
            if (cdecl.attributes.includes("enum")) {
                optenumname = [cdecl.enclosingDecl, cdecl.gkey];
            }
            this.assembly.constantDecls.push(new smt_assembly_1.SMTConstantDecl(smtname, optenumname, ctype, consf));
        });
        this.assembly.maskSizes = this.bemitter.maskSizes;
        const smtcall = this.temitter.lookupFunctionName(mirep.ikey);
        const callargs = iargs.map((arg) => arg.callexp);
        const issafe = callsafety.get(entrypoint).safe;
        let iexp = undefined;
        let argchk = undefined;
        let targeterrorcheck = undefined;
        let isvaluecheck = undefined;
        if (issafe) {
            iexp = this.temitter.generateResultTypeConstructorSuccess(restype, new smt_exp_1.SMTCallSimple(smtcall, callargs));
            targeterrorcheck = new smt_exp_1.SMTConst("false");
            isvaluecheck = new smt_exp_1.SMTConst("true");
        }
        else {
            iexp = new smt_exp_1.SMTCallGeneral(smtcall, callargs);
            if (mirep.preconditions !== undefined) {
                argchk = mirep.preconditions.map((pc) => {
                    const ispcsafe = callsafety.get(pc).safe;
                    if (ispcsafe) {
                        return new smt_exp_1.SMTCallSimple(this.temitter.lookupFunctionName(pc), callargs);
                    }
                    else {
                        return smt_exp_1.SMTCallSimple.makeEq(new smt_exp_1.SMTCallGeneral(this.temitter.lookupFunctionName(pc), callargs), this.temitter.generateResultTypeConstructorSuccess(this.temitter.getMIRType("NSCore::Bool"), new smt_exp_1.SMTConst("true")));
                    }
                });
            }
            targeterrorcheck = new smt_exp_1.SMTCallSimple("=", [new smt_exp_1.SMTVar("_@smtres@"), this.temitter.generateResultTypeConstructorError(restype, new smt_exp_1.SMTConst("ErrorID_Target"))]);
            isvaluecheck = this.temitter.generateResultIsSuccessTest(restype, new smt_exp_1.SMTVar("_@smtres@"));
        }
        this.bemitter.requiredUFConsts.forEach((ctype) => {
            const ufcc = new smt_assembly_1.SMTFunctionUninterpreted(`${ctype.name}@uicons_UF`, [], ctype);
            this.assembly.uninterpfunctions.push(ufcc);
        });
        this.assembly.model = new smt_assembly_1.SMTModelState(iargs, rarg, argchk, this.temitter.generateResultType(restype), iexp, targeterrorcheck, isvaluecheck);
        this.assembly.allErrors = this.bemitter.allErrors;
    }
    generateAPIModule(entrypoint, bvwidth, constants) {
        const apitype = this.temitter.assembly.typeMap.get("NSCore::APIType");
        const mirapitypes = [...this.temitter.assembly.typeMap].filter((tme) => this.temitter.assembly.subtypeOf(tme[1], apitype) && (tme[1].options.length > 1 || !(tme[1].options[0] instanceof mir_assembly_1.MIRConceptType)));
        const apiout = mirapitypes.map((tme) => this.temitter.getAPITypeFor(tme[1]));
        let argnames = [];
        let smtargnames = [];
        let argtypes = [];
        for (let i = 0; i < entrypoint.params.length; ++i) {
            const param = entrypoint.params[i];
            argnames.push(param.name);
            smtargnames.push(this.bemitter.varStringToSMT(param.name).vname);
            argtypes.push(param.type);
        }
        const signature = {
            name: this.temitter.lookupFunctionName(entrypoint.ikey),
            restype: entrypoint.resultType,
            argnames: argnames,
            smtargnames: smtargnames,
            argtypes: argtypes
        };
        return {
            apitypes: apiout,
            apisig: signature,
            bvwidth: bvwidth,
            constants: constants
        };
    }
    static generateSMTPayload(assembly, mode, timeout, runtime, vopts, numgen, errorTrgtPos, entrypoint) {
        const allivks = [...assembly.invokeDecls].map((idecl) => idecl[1].ikey);
        const callsafety = mir_callg_1.markSafeCalls([...allivks], assembly, errorTrgtPos);
        const temitter = new smttype_emitter_1.SMTTypeEmitter(assembly, vopts);
        assembly.typeMap.forEach((tt) => {
            temitter.internTypeName(tt.typeID, tt.shortname);
        });
        assembly.invokeDecls.forEach((idcl) => {
            temitter.internFunctionName(idcl.ikey, idcl.shortname);
        });
        assembly.primitiveInvokeDecls.forEach((idcl) => {
            temitter.internFunctionName(idcl.ikey, idcl.shortname);
        });
        assembly.constantDecls.forEach((cdecl) => {
            temitter.internGlobalName(cdecl.gkey, cdecl.shortname);
        });
        const bemitter = new smtbody_emitter_1.SMTBodyEmitter(assembly, temitter, numgen, vopts, callsafety, errorTrgtPos);
        const smtassembly = new smt_assembly_1.SMTAssembly(vopts, numgen.int, Number(numgen.hash.bvsize), temitter.lookupFunctionName(entrypoint));
        let smtemit = new SMTEmitter(temitter, bemitter, smtassembly);
        smtemit.initializeSMTAssembly(assembly, entrypoint, callsafety);
        ////////////
        const mirep = assembly.invokeDecls.get(entrypoint);
        //
        //TODO: compute constants info here...
        //
        const constants = [];
        const apiinfo = smtemit.generateAPIModule(mirep, Number(numgen.int.bvsize), constants);
        const smtinfo = smtemit.assembly.buildSMT2file(mode, runtime);
        return { smt2decl: smtinfo, timeout: timeout, apimodule: apiinfo };
    }
    static generateSMTAssemblyAllErrors(assembly, vopts, numgen, entrypoint) {
        const allivks = [...assembly.invokeDecls].map((idecl) => idecl[1].ikey);
        const callsafety = mir_callg_1.markSafeCalls([...allivks], assembly, { file: "[]", line: -1, pos: -1 });
        const temitter = new smttype_emitter_1.SMTTypeEmitter(assembly, vopts);
        assembly.typeMap.forEach((tt) => {
            temitter.internTypeName(tt.typeID, tt.shortname);
        });
        assembly.invokeDecls.forEach((idcl) => {
            temitter.internFunctionName(idcl.ikey, idcl.shortname);
        });
        assembly.primitiveInvokeDecls.forEach((idcl) => {
            temitter.internFunctionName(idcl.ikey, idcl.shortname);
        });
        assembly.constantDecls.forEach((cdecl) => {
            temitter.internGlobalName(cdecl.gkey, cdecl.shortname);
        });
        const bemitter = new smtbody_emitter_1.SMTBodyEmitter(assembly, temitter, numgen, vopts, callsafety, { file: "[]", line: -1, pos: -1 });
        const smtassembly = new smt_assembly_1.SMTAssembly(vopts, numgen.int, Number(numgen.hash.bvsize), temitter.lookupFunctionName(entrypoint));
        let smtemit = new SMTEmitter(temitter, bemitter, smtassembly);
        smtemit.initializeSMTAssembly(assembly, entrypoint, callsafety);
        return smtemit.assembly.allErrors;
    }
}
exports.SMTEmitter = SMTEmitter;
//# sourceMappingURL=smtdecls_emitter.js.map