"use strict";
//-------------------------------------------------------------------------------------------------------
// Copyright (C) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE.txt file in the project root for full license information.
//-------------------------------------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
exports.SMTBodyEmitter = void 0;
const mir_assembly_1 = require("../../compiler/mir_assembly");
const mir_ops_1 = require("../../compiler/mir_ops");
const smt_exp_1 = require("./smt_exp");
const smt_assembly_1 = require("./smt_assembly");
const assert = require("assert");
const smtcollection_emitter_1 = require("./smtcollection_emitter");
function NOT_IMPLEMENTED(msg) {
    throw new Error(`Not Implemented: ${msg}`);
}
class SMTBodyEmitter {
    constructor(assembly, typegen, numgen, vopts, callsafety, errorTrgtPos) {
        this.tmpvarctr = 0;
        this.currentFile = "[No File]";
        this.currentSCC = new Set();
        this.pendingMask = [];
        this.requiredTypecheck = [];
        this.maskSizes = new Set();
        //!!!
        //See the methods generateLoadTupleIndexVirtual, generateLoadTupleIndexVirtual, etc for processing the entries in these arrays
        //!!!
        this.requiredLoadVirtualTupleIndex = [];
        this.requiredLoadVirtualRecordProperty = [];
        this.requiredLoadVirtualEntityField = [];
        this.requiredProjectVirtualTupleIndex = [];
        this.requiredProjectVirtualRecordProperty = [];
        this.requiredProjectVirtualEntityField = [];
        this.requiredUpdateVirtualTuple = [];
        this.requiredUpdateVirtualRecord = [];
        this.requiredUpdateVirtualEntity = [];
        this.requiredVirtualFunctionInvokes = [];
        this.requiredVirtualOperatorInvokes = [];
        this.requiredSubtypeTagChecks = [];
        this.requiredIndexTagChecks = [];
        this.requiredRecordTagChecks = [];
        this.requiredUFConsts = [];
        this.assembly = assembly;
        this.typegen = typegen;
        this.numgen = numgen;
        this.callsafety = callsafety;
        this.errorTrgtPos = errorTrgtPos;
        this.allErrors = [];
        this.vopts = vopts;
        this.currentRType = typegen.getMIRType("NSCore::None");
        const safecalls = new Set();
        callsafety.forEach((pv, inv) => {
            if (pv.safe) {
                safecalls.add(inv);
            }
        });
        this.lopsManager = new smtcollection_emitter_1.ListOpsManager(vopts, typegen, this.numgen.int, safecalls);
    }
    varStringToSMT(name) {
        if (name === "$$return") {
            return new smt_exp_1.SMTVar("$$return");
        }
        else {
            return new smt_exp_1.SMTVar(name);
        }
    }
    varToSMTName(varg) {
        return this.varStringToSMT(varg.nameID);
    }
    globalToSMT(gval) {
        this.typegen.internGlobalName(gval.gkey, gval.shortname);
        return new smt_exp_1.SMTConst(this.typegen.lookupGlobalName(gval.gkey));
    }
    processSubtypeTagCheck(t, oftype) {
        const stc = this.requiredSubtypeTagChecks.find((tc) => tc.t.typeID === t.typeID && tc.oftype.typeID === oftype.typeID);
        if (stc === undefined) {
            this.requiredSubtypeTagChecks.push({ t: t, oftype: oftype });
        }
    }
    processIndexTagCheck(idx, oftype) {
        const stc = this.requiredIndexTagChecks.find((tc) => tc.idx === idx && tc.oftype.typeID === oftype.typeID);
        if (stc === undefined) {
            this.requiredIndexTagChecks.push({ idx: idx, oftype: oftype });
        }
    }
    processPropertyTagCheck(pname, oftype) {
        const stc = this.requiredRecordTagChecks.find((tc) => tc.pname === pname && tc.oftype.typeID === oftype.typeID);
        if (stc === undefined) {
            this.requiredRecordTagChecks.push({ pname: pname, oftype: oftype });
        }
    }
    generateTypeCheckName(argflowtype, oftype) {
        return `$SubtypeCheck_${this.typegen.lookupTypeName(argflowtype.typeID)}_oftype_${this.typegen.lookupTypeName(oftype.typeID)}`;
    }
    registerRequiredTypeCheck(argflowtype, oftype) {
        const inv = this.generateTypeCheckName(argflowtype, oftype);
        if (this.requiredTypecheck.findIndex((rtc) => rtc.inv === inv) === -1) {
            this.requiredTypecheck.push({ inv: inv, flowtype: argflowtype, oftype: oftype });
        }
        return inv;
    }
    generateUFConstantForType(tt) {
        const ctype = this.typegen.getSMTTypeFor(tt);
        const ufcname = `${ctype.name}@uicons_UF`;
        if (this.requiredUFConsts.find((cc) => cc.name === ctype.name) === undefined) {
            this.requiredUFConsts.push(ctype);
        }
        return ufcname;
    }
    generateBoolForGuard(guard) {
        if (guard instanceof mir_ops_1.MIRMaskGuard) {
            return new smt_exp_1.SMTCallSimple(`$Mask_${guard.gsize}@${guard.gindex}`, [this.varStringToSMT(guard.gmask)]);
        }
        else {
            return this.argToSMT(guard.greg);
        }
    }
    generateAltForGuardStmt(arg, oftype) {
        return arg !== undefined ? this.argToSMT(arg) : new smt_exp_1.SMTConst(this.generateUFConstantForType(oftype));
    }
    generateGuardStmtCond(sguard, gexp, rtype) {
        if (sguard === undefined) {
            return gexp;
        }
        else {
            const gcond = this.generateBoolForGuard(sguard.guard);
            const galt = this.generateAltForGuardStmt(sguard.defaultvar, this.typegen.getMIRType(rtype));
            if (sguard.usedefault === "defaultonfalse") {
                return new smt_exp_1.SMTIf(gcond, gexp, galt);
            }
            else {
                return new smt_exp_1.SMTIf(gcond, galt, gexp);
            }
        }
    }
    generateGeneralCallValueProcessing(callertype, calleetype, gcall, trgt, continuation) {
        const cres = this.generateTempName();
        const callersmt = this.typegen.getSMTTypeFor(callertype);
        const calleesmt = this.typegen.getSMTTypeFor(calleetype);
        const okpath = new smt_exp_1.SMTLet(this.varToSMTName(trgt).vname, this.typegen.generateResultGetSuccess(calleetype, new smt_exp_1.SMTVar(cres)), continuation);
        const errpath = (callersmt.name === calleesmt.name) ? new smt_exp_1.SMTVar(cres) : this.typegen.generateResultTypeConstructorError(callertype, this.typegen.generateResultGetError(calleetype, new smt_exp_1.SMTVar(cres)));
        const icond = new smt_exp_1.SMTIf(this.typegen.generateResultIsErrorTest(calleetype, new smt_exp_1.SMTVar(cres)), errpath, okpath);
        return new smt_exp_1.SMTLet(cres, gcall, icond);
    }
    generateLoadVirtualTupleInvName(argflowtype, idx, resulttype, guard) {
        const fullname = `$TupleLoad!${argflowtype.typeID}!${idx}!${resulttype.typeID}${guard !== undefined ? "_WG" : ""}`;
        const shortname = `$TupleLoad_${this.typegen.lookupTypeName(argflowtype.typeID)}@_${idx}_`;
        this.typegen.internFunctionName(fullname, shortname);
        return fullname;
    }
    generateLoadVirtualPropertyInvName(argflowtype, pname, resulttype, guard) {
        const fullname = `$RecordLoad!${argflowtype.typeID}!${pname}!${resulttype.typeID}${guard !== undefined ? "_WG" : ""}`;
        const shortname = `$RecordLoad_${this.typegen.lookupTypeName(argflowtype.typeID)}@_${pname}_`;
        this.typegen.internFunctionName(fullname, shortname);
        return fullname;
    }
    generateLoadVirtualFieldInvName(argflowtype, fkey, resulttype) {
        const fdecl = this.assembly.fieldDecls.get(fkey);
        const fullname = `$EntityLoad!${argflowtype.typeID}!${fkey}!${resulttype.typeID}`;
        const shortname = `$EntityLoad_${this.typegen.lookupTypeName(argflowtype.typeID)}@_${fdecl.fname}_`;
        this.typegen.internFunctionName(fullname, shortname);
        return fullname;
    }
    generateProjectVirtualTupleInvName(argflowtype, indecies, resulttype) {
        const idxs = indecies.map((idx) => `${idx}`).join(",");
        const fullname = `$TupleProject!${argflowtype.typeID}[${idxs}]!${resulttype.typeID}`;
        const shortname = `$TupleProject_${this.typegen.lookupTypeName(argflowtype.typeID)}@_${idxs}_`;
        this.typegen.internFunctionName(fullname, shortname);
        return fullname;
    }
    generateProjectVirtualRecordInvName(argflowtype, properties, resulttype) {
        const pnames = properties.join(",");
        const fullname = `$RecordProject!${argflowtype.typeID}{${pnames}}${resulttype.typeID}`;
        const shortname = `$RecordProject_${this.typegen.lookupTypeName(argflowtype.typeID)}@_${pnames}_`;
        this.typegen.internFunctionName(fullname, shortname);
        return fullname;
    }
    generateProjectVirtualEntityInvName(argflowtype, fields, resulttype) {
        const fkeys = fields.join(",");
        const shortkeys = fields.map((fn) => this.assembly.fieldDecls.get(fn).fname).join(",");
        const fullname = `$EntityProject!${argflowtype.typeID}!{${fkeys}}!${resulttype.typeID}`;
        const shortname = `$EntityProject_${this.typegen.lookupTypeName(argflowtype.typeID)}@_${shortkeys}_`;
        this.typegen.internFunctionName(fullname, shortname);
        return fullname;
    }
    generateUpdateVirtualTupleInvName(argflowtype, indecies, resulttype) {
        const idxs = indecies.map((idx) => `(${idx[0]} ${idx[1]})`).join(",");
        const shortidxs = indecies.map((idx) => idx[0]).join(",");
        const fullname = `$TupleUpdate!${argflowtype.typeID}![${idxs}]=!${resulttype.typeID}`;
        const shortname = `$TupleUpdate_${this.typegen.lookupTypeName(argflowtype.typeID)}@_${shortidxs}_`;
        this.typegen.internFunctionName(fullname, shortname);
        return fullname;
    }
    generateUpdateVirtualRecordInvName(argflowtype, properties, resulttype) {
        const pnames = properties.map((pname) => `(${pname[0]} ${pname[1]})`).join(",");
        const shortpnames = properties.map((pname) => pname[0]).join(",");
        const fullname = `$RecordUpdate!${argflowtype.typeID}!{${pnames}}=!${resulttype.typeID}`;
        const shortname = `$RecordUpdate_${this.typegen.lookupTypeName(argflowtype.typeID)}@_${shortpnames}_`;
        this.typegen.internFunctionName(fullname, shortname);
        return fullname;
    }
    generateUpdateVirtualEntityInvName(argflowtype, fields, resulttype) {
        const fnames = fields.map((fname) => `(${fname[0]} ${fname[1]})`).join(",");
        const shortfnames = fields.map((fname) => this.assembly.fieldDecls.get(fname[0]).fname).join(",");
        const fullname = `$EntityUpdate!${argflowtype.typeID}!{${fnames}}=!${resulttype.typeID}`;
        const shortname = `$EntityUpdate_${argflowtype.typeID}@_${shortfnames}_`;
        this.typegen.internFunctionName(fullname, shortname);
        return fullname;
    }
    generateVirtualInvokeFunctionName(argflowtype, fname, shortvname, optmask, resulttype) {
        const fullname = `$VirtualInvoke!${argflowtype.typeID}!${fname}${optmask ? "_WM_" : ""}!${resulttype.typeID}`;
        const shortname = `$VirtualInvoke_${this.typegen.lookupTypeName(argflowtype.typeID)}@_${shortvname}_`;
        this.typegen.internFunctionName(fullname, shortname);
        return fullname;
    }
    generateVirtualInvokeOperatorName(fname, shortvname, rcvrtypes, resulttype) {
        const rnames = `(${rcvrtypes.join(",")})`;
        const shortrnames = `(${rcvrtypes.map((tt) => this.typegen.getMIRType(tt).shortname).join(",")})`;
        const fullname = `$VirtualOperator!${fname}${rnames}!${resulttype.typeID}`;
        const shortname = `$VirtualOperator_${shortvname}${shortrnames}`;
        this.typegen.internFunctionName(fullname, shortname);
        return fullname;
    }
    generateLoadTupleIndexVirtual(geninfo) {
        const ttuples = [...this.assembly.tupleDecls]
            .filter((tt) => {
            const mtt = this.typegen.getMIRType(tt[1].typeID);
            return this.typegen.isUniqueTupleType(mtt) && this.assembly.subtypeOf(mtt, geninfo.argflowtype);
        })
            .map((tt) => tt[1]);
        const rtype = geninfo.guard !== undefined ? this.typegen.generateAccessWithSetGuardResultType(geninfo.resulttype) : this.typegen.getSMTTypeFor(geninfo.resulttype);
        const ufcname = this.generateUFConstantForType(geninfo.resulttype);
        if (ttuples.length === 0) {
            const rbody = geninfo.guard !== undefined ? this.typegen.generateAccessWithSetGuardResultTypeConstructorLoad(geninfo.resulttype, new smt_exp_1.SMTConst(ufcname), false) : new smt_exp_1.SMTConst(ufcname);
            return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(geninfo.inv), [{ vname: "arg", vtype: this.typegen.getSMTTypeFor(geninfo.argflowtype) }], rtype, rbody);
        }
        else {
            const ops = ttuples.map((tt) => {
                const mtt = this.typegen.getMIRType(tt.typeID);
                const test = new smt_exp_1.SMTCallSimple(this.registerRequiredTypeCheck(geninfo.argflowtype, mtt), [new smt_exp_1.SMTVar("arg")]);
                const argpp = this.typegen.coerce(new smt_exp_1.SMTVar("arg"), geninfo.argflowtype, mtt);
                const idxr = new smt_exp_1.SMTCallSimple(this.typegen.generateTupleIndexGetFunction(tt, geninfo.idx), [argpp]);
                const crt = this.typegen.coerce(idxr, geninfo.argflowtype.options[0].entries[geninfo.idx], geninfo.resulttype);
                const action = geninfo.guard !== undefined ? this.typegen.generateAccessWithSetGuardResultTypeConstructorLoad(geninfo.resulttype, crt, true) : crt;
                return { test: test, result: action };
            });
            const orelse = geninfo.guard !== undefined ? this.typegen.generateAccessWithSetGuardResultTypeConstructorLoad(geninfo.resulttype, new smt_exp_1.SMTConst(ufcname), false) : new smt_exp_1.SMTConst(ufcname);
            return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(geninfo.inv), [{ vname: "arg", vtype: this.typegen.getSMTTypeFor(geninfo.argflowtype) }], rtype, new smt_exp_1.SMTCond(ops, orelse));
        }
    }
    generateLoadRecordPropertyVirtual(geninfo) {
        const trecords = [...this.assembly.recordDecls]
            .filter((tt) => {
            const mtt = this.typegen.getMIRType(tt[1].typeID);
            return this.typegen.isUniqueRecordType(mtt) && this.assembly.subtypeOf(mtt, geninfo.argflowtype);
        })
            .map((tt) => tt[1]);
        const rtype = geninfo.guard !== undefined ? this.typegen.generateAccessWithSetGuardResultType(geninfo.resulttype) : this.typegen.getSMTTypeFor(geninfo.resulttype);
        const ufcname = this.generateUFConstantForType(geninfo.resulttype);
        if (trecords.length === 0) {
            const rbody = geninfo.guard !== undefined ? this.typegen.generateAccessWithSetGuardResultTypeConstructorLoad(geninfo.resulttype, new smt_exp_1.SMTConst(ufcname), false) : new smt_exp_1.SMTConst(ufcname);
            return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(geninfo.inv), [{ vname: "arg", vtype: this.typegen.getSMTTypeFor(geninfo.argflowtype) }], rtype, rbody);
        }
        else {
            const ops = trecords.map((tt) => {
                const mtt = this.typegen.getMIRType(tt.typeID);
                const test = new smt_exp_1.SMTCallSimple(this.registerRequiredTypeCheck(geninfo.argflowtype, mtt), [new smt_exp_1.SMTVar("arg")]);
                const argpp = this.typegen.coerce(new smt_exp_1.SMTVar("arg"), geninfo.argflowtype, mtt);
                const idxr = new smt_exp_1.SMTCallSimple(this.typegen.generateRecordPropertyGetFunction(tt, geninfo.pname), [argpp]);
                const crt = this.typegen.coerce(idxr, geninfo.argflowtype.options[0].entries.find((vv) => vv.pname === geninfo.pname).ptype, geninfo.resulttype);
                const action = geninfo.guard !== undefined ? this.typegen.generateAccessWithSetGuardResultTypeConstructorLoad(geninfo.resulttype, crt, true) : crt;
                return { test: test, result: action };
            });
            const orelse = geninfo.guard !== undefined ? this.typegen.generateAccessWithSetGuardResultTypeConstructorLoad(geninfo.resulttype, new smt_exp_1.SMTConst(ufcname), false) : new smt_exp_1.SMTConst(ufcname);
            return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(geninfo.inv), [{ vname: "arg", vtype: this.typegen.getSMTTypeFor(geninfo.argflowtype) }], rtype, new smt_exp_1.SMTCond(ops, orelse));
        }
    }
    generateLoadEntityFieldVirtual(geninfo) {
        const tentities = [...this.assembly.entityDecls]
            .filter((tt) => {
            const mtt = this.typegen.getMIRType(tt[1].tkey);
            return this.typegen.isUniqueEntityType(mtt) && this.assembly.subtypeOf(mtt, geninfo.argflowtype);
        })
            .map((tt) => tt[1]);
        const rtype = this.typegen.getSMTTypeFor(geninfo.resulttype);
        let ops = tentities.map((tt) => {
            const mtt = this.typegen.getMIRType(tt.tkey);
            const test = new smt_exp_1.SMTCallSimple(this.registerRequiredTypeCheck(geninfo.argflowtype, mtt), [new smt_exp_1.SMTVar("arg")]);
            const argpp = this.typegen.coerce(new smt_exp_1.SMTVar("arg"), geninfo.argflowtype, mtt);
            const action = new smt_exp_1.SMTCallSimple(this.typegen.generateEntityFieldGetFunction(tt, geninfo.field), [argpp]);
            return { test: test, result: action };
        });
        const orelse = ops[ops.length - 1].result;
        ops = ops.slice(0, ops.length - 1);
        return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(geninfo.inv), [{ vname: "arg", vtype: this.typegen.getSMTTypeFor(geninfo.argflowtype) }], rtype, new smt_exp_1.SMTCond(ops, orelse));
    }
    generateProjectTupleIndexVirtual(geninfo) {
        const ttuples = [...this.assembly.tupleDecls]
            .filter((tt) => {
            const mtt = this.typegen.getMIRType(tt[1].typeID);
            return this.typegen.isUniqueTupleType(mtt) && this.assembly.subtypeOf(mtt, geninfo.argflowtype);
        })
            .map((tt) => tt[1]);
        const rtype = this.typegen.getSMTTypeFor(geninfo.resulttype);
        let ops = ttuples.map((tt) => {
            const mtt = this.typegen.getMIRType(tt.typeID);
            const test = new smt_exp_1.SMTCallSimple(this.registerRequiredTypeCheck(geninfo.argflowtype, mtt), [new smt_exp_1.SMTVar("arg")]);
            const argpp = this.typegen.coerce(new smt_exp_1.SMTVar("arg"), geninfo.argflowtype, mtt);
            const pargs = geninfo.indecies.map((idx, i) => {
                const idxr = new smt_exp_1.SMTCallSimple(this.typegen.generateTupleIndexGetFunction(geninfo.argflowtype.options[0], idx), [argpp]);
                return this.typegen.coerce(idxr, geninfo.argflowtype.options[0].entries[idx], geninfo.resulttype.options[0].entries[i]);
            });
            const action = new smt_exp_1.SMTCallSimple(this.typegen.getSMTConstructorName(geninfo.resulttype).cons, pargs);
            return { test: test, result: action };
        });
        const orelse = ops[ops.length - 1].result;
        ops = ops.slice(0, ops.length - 1);
        return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(geninfo.inv), [{ vname: "arg", vtype: this.typegen.getSMTTypeFor(geninfo.argflowtype) }], rtype, new smt_exp_1.SMTCond(ops, orelse));
    }
    generateProjectRecordPropertyVirtual(geninfo) {
        const trecords = [...this.assembly.recordDecls]
            .filter((tt) => {
            const mtt = this.typegen.getMIRType(tt[1].typeID);
            return this.typegen.isUniqueRecordType(mtt) && this.assembly.subtypeOf(mtt, geninfo.argflowtype);
        })
            .map((tt) => tt[1]);
        const rtype = this.typegen.getSMTTypeFor(geninfo.resulttype);
        let ops = trecords.map((tt) => {
            const mtt = this.typegen.getMIRType(tt.typeID);
            const test = new smt_exp_1.SMTCallSimple(this.registerRequiredTypeCheck(geninfo.argflowtype, mtt), [new smt_exp_1.SMTVar("arg")]);
            const argpp = this.typegen.coerce(new smt_exp_1.SMTVar("arg"), geninfo.argflowtype, mtt);
            const pargs = geninfo.properties.map((pname, i) => {
                const idxr = new smt_exp_1.SMTCallSimple(this.typegen.generateRecordPropertyGetFunction(geninfo.argflowtype.options[0], pname), [argpp]);
                return this.typegen.coerce(idxr, geninfo.argflowtype.options[0].entries.find((vv) => vv.pname === pname).ptype, geninfo.resulttype.options[0].entries[i]);
            });
            const action = new smt_exp_1.SMTCallSimple(this.typegen.getSMTConstructorName(geninfo.resulttype).cons, pargs);
            return { test: test, result: action };
        });
        const orelse = ops[ops.length - 1].result;
        ops = ops.slice(0, ops.length - 1);
        return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(geninfo.inv), [{ vname: "arg", vtype: this.typegen.getSMTTypeFor(geninfo.argflowtype) }], rtype, new smt_exp_1.SMTCond(ops, orelse));
    }
    generateProjectEntityFieldVirtual(geninfo) {
        const tentities = [...this.assembly.entityDecls]
            .filter((tt) => {
            const mtt = this.typegen.getMIRType(tt[1].tkey);
            return this.typegen.isUniqueEntityType(mtt) && this.assembly.subtypeOf(mtt, geninfo.argflowtype);
        })
            .map((tt) => tt[1]);
        const rtype = this.typegen.getSMTTypeFor(geninfo.resulttype);
        let ops = tentities.map((tt) => {
            const mtt = this.typegen.getMIRType(tt.tkey);
            const test = new smt_exp_1.SMTCallSimple(this.registerRequiredTypeCheck(geninfo.argflowtype, mtt), [new smt_exp_1.SMTVar("arg")]);
            const argpp = this.typegen.coerce(new smt_exp_1.SMTVar("arg"), geninfo.argflowtype, mtt);
            const pargs = geninfo.fields.map((field, i) => {
                const idxr = new smt_exp_1.SMTCallSimple(this.typegen.generateEntityFieldGetFunction(tt, field), [argpp]);
                return this.typegen.coerce(idxr, this.typegen.getMIRType(field.declaredType), geninfo.resulttype.options[0].entries[i]);
            });
            const action = new smt_exp_1.SMTCallSimple(this.typegen.getSMTConstructorName(geninfo.resulttype).cons, pargs);
            return { test: test, result: action };
        });
        const orelse = ops[ops.length - 1].result;
        ops = ops.slice(0, ops.length - 1);
        return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(geninfo.inv), [{ vname: "arg", vtype: this.typegen.getSMTTypeFor(geninfo.argflowtype) }], rtype, new smt_exp_1.SMTCond(ops, orelse));
    }
    generateUpdateTupleIndexVirtual(geninfo) {
        const ttuples = [...this.assembly.tupleDecls]
            .filter((tt) => {
            const mtt = this.typegen.getMIRType(tt[1].typeID);
            return this.typegen.isUniqueTupleType(mtt) && this.assembly.subtypeOf(mtt, geninfo.argflowtype);
        })
            .map((tt) => tt[1]);
        const rtype = this.typegen.getSMTTypeFor(geninfo.resulttype);
        let ops = ttuples.map((tt) => {
            const mtt = this.typegen.getMIRType(tt.typeID);
            const test = new smt_exp_1.SMTCallSimple(this.registerRequiredTypeCheck(geninfo.argflowtype, mtt), [new smt_exp_1.SMTVar("arg")]);
            const argpp = this.typegen.coerce(new smt_exp_1.SMTVar("arg"), geninfo.argflowtype, mtt);
            let cargs = [];
            for (let i = 0; i < tt.entries.length; ++i) {
                const upd = geninfo.updates.findIndex((vv) => vv[0] === i);
                if (upd === undefined) {
                    cargs.push(new smt_exp_1.SMTCallSimple(this.typegen.generateTupleIndexGetFunction(tt, i), [argpp]));
                }
                else {
                    cargs.push(new smt_exp_1.SMTVar(`arg_${i}`));
                }
            }
            const action = new smt_exp_1.SMTCallSimple(this.typegen.getSMTConstructorName(geninfo.resulttype).cons, cargs);
            return { test: test, result: action };
        });
        const orelse = ops[ops.length - 1].result;
        ops = ops.slice(0, ops.length - 1);
        const fargs = [
            { vname: "arg", vtype: this.typegen.getSMTTypeFor(geninfo.argflowtype) },
            ...geninfo.updates.map((upd, i) => {
                return { vname: `arg_${i}`, vtype: this.typegen.getSMTTypeFor(this.typegen.getMIRType(upd[1])) };
            })
        ];
        return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(geninfo.inv), fargs, rtype, new smt_exp_1.SMTCond(ops, orelse));
    }
    generateUpdateRecordPropertyVirtual(geninfo) {
        const trecords = [...this.assembly.recordDecls]
            .filter((tt) => {
            const mtt = this.typegen.getMIRType(tt[1].typeID);
            return this.typegen.isUniqueRecordType(mtt) && this.assembly.subtypeOf(mtt, geninfo.argflowtype);
        })
            .map((tt) => tt[1]);
        const rtype = this.typegen.getSMTTypeFor(geninfo.resulttype);
        let ops = trecords.map((tt) => {
            const mtt = this.typegen.getMIRType(tt.typeID);
            const test = new smt_exp_1.SMTCallSimple(this.registerRequiredTypeCheck(geninfo.argflowtype, mtt), [new smt_exp_1.SMTVar("arg")]);
            const argpp = this.typegen.coerce(new smt_exp_1.SMTVar("arg"), geninfo.argflowtype, mtt);
            let cargs = [];
            for (let i = 0; i < tt.entries.length; ++i) {
                const upd = geninfo.updates.find((vv) => vv[0] === tt.entries[i].pname);
                if (upd === undefined) {
                    cargs.push(new smt_exp_1.SMTCallSimple(this.typegen.generateRecordPropertyGetFunction(tt, tt.entries[i].pname), [argpp]));
                }
                else {
                    cargs.push(new smt_exp_1.SMTVar(`arg_${i}`));
                }
            }
            const action = new smt_exp_1.SMTCallSimple(this.typegen.getSMTConstructorName(geninfo.resulttype).cons, cargs);
            return { test: test, result: action };
        });
        const orelse = ops[ops.length - 1].result;
        ops = ops.slice(0, ops.length - 1);
        const fargs = [
            { vname: "arg", vtype: this.typegen.getSMTTypeFor(geninfo.argflowtype) },
            ...geninfo.updates.map((upd, i) => {
                return { vname: `arg_${i}`, vtype: this.typegen.getSMTTypeFor(this.typegen.getMIRType(upd[1])) };
            })
        ];
        return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(geninfo.inv), fargs, rtype, new smt_exp_1.SMTCond(ops, orelse));
    }
    generateUpdateEntityFieldVirtual(geninfo) {
        const tentities = [...this.assembly.entityDecls]
            .filter((tt) => {
            const mtt = this.typegen.getMIRType(tt[1].tkey);
            return this.typegen.isUniqueEntityType(mtt) && this.assembly.subtypeOf(mtt, geninfo.argflowtype);
        })
            .map((tt) => tt[1]);
        const rtype = this.typegen.getSMTTypeFor(geninfo.resulttype);
        let ops = tentities.map((tt) => {
            const mtt = this.typegen.getMIRType(tt.tkey);
            const consfunc = this.assembly.entityDecls.get(tt.tkey).consfunc;
            const consfields = this.assembly.entityDecls.get(tt.tkey).consfuncfields.map((ccf) => this.assembly.fieldDecls.get(ccf));
            const test = new smt_exp_1.SMTCallSimple(this.registerRequiredTypeCheck(geninfo.argflowtype, mtt), [new smt_exp_1.SMTVar("arg")]);
            const argpp = this.typegen.coerce(new smt_exp_1.SMTVar("arg"), geninfo.argflowtype, mtt);
            let cargs = [];
            for (let i = 0; i < consfields.length; ++i) {
                const upd = geninfo.updates.find((vv) => vv[0] === consfields[i].fname);
                if (upd === undefined) {
                    cargs.push(new smt_exp_1.SMTCallSimple(this.typegen.generateEntityFieldGetFunction(tt, consfields[i]), [argpp]));
                }
                else {
                    cargs.push(new smt_exp_1.SMTVar(`arg_${i}`));
                }
            }
            const ccall = new smt_exp_1.SMTCallGeneral(this.typegen.lookupFunctionName(consfunc), cargs);
            let action = new smt_exp_1.SMTConst("[NOT SET]");
            if (this.isSafeConstructorInvoke(mtt) && geninfo.allsafe) {
                action = this.typegen.coerce(ccall, mtt, geninfo.resulttype);
            }
            else {
                if (this.isSafeConstructorInvoke(mtt)) {
                    action = this.typegen.generateResultTypeConstructorSuccess(geninfo.resulttype, this.typegen.coerce(ccall, mtt, geninfo.resulttype));
                }
                else {
                    if (mtt.typeID === geninfo.resulttype.typeID) {
                        action = ccall;
                    }
                    else {
                        const tres = this.generateTempName();
                        const cond = this.typegen.generateResultIsSuccessTest(mtt, new smt_exp_1.SMTVar(tres));
                        const erropt = this.typegen.generateResultTypeConstructorError(geninfo.resulttype, this.typegen.generateResultGetError(mtt, new smt_exp_1.SMTVar(tres)));
                        const okopt = this.typegen.generateResultTypeConstructorSuccess(geninfo.resulttype, this.typegen.coerce(this.typegen.generateResultGetSuccess(mtt, new smt_exp_1.SMTVar(tres)), mtt, geninfo.resulttype));
                        action = new smt_exp_1.SMTLet(tres, ccall, new smt_exp_1.SMTIf(cond, okopt, erropt));
                    }
                }
            }
            return { test: test, result: action };
        });
        const orelse = ops[ops.length - 1].result;
        ops = ops.slice(0, ops.length - 1);
        const fargs = [
            { vname: "arg", vtype: this.typegen.getSMTTypeFor(geninfo.argflowtype) },
            ...geninfo.updates.map((upd, i) => {
                return { vname: `arg_${i}`, vtype: this.typegen.getSMTTypeFor(this.typegen.getMIRType(upd[1])) };
            })
        ];
        return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(geninfo.inv), fargs, rtype, new smt_exp_1.SMTCond(ops, orelse));
    }
    generateVirtualFunctionInvoke(geninfo) {
        const tentities = [...this.assembly.entityDecls]
            .filter((tt) => {
            const mtt = this.typegen.getMIRType(tt[1].tkey);
            return this.typegen.isUniqueEntityType(mtt) && this.assembly.subtypeOf(mtt, geninfo.argflowtype);
        })
            .map((tt) => tt[1]);
        const rtype = this.typegen.getSMTTypeFor(geninfo.resulttype);
        let ops = tentities.map((tt) => {
            const mtt = this.typegen.getMIRType(tt.tkey);
            const vfunc = this.assembly.entityDecls.get(tt.tkey).vcallMap.get(geninfo.vfname);
            const test = new smt_exp_1.SMTCallSimple(this.registerRequiredTypeCheck(geninfo.argflowtype, mtt), [new smt_exp_1.SMTVar("arg")]);
            const argpp = this.typegen.coerce(new smt_exp_1.SMTVar("arg"), geninfo.argflowtype, mtt);
            const invk = this.assembly.invokeDecls.get(vfunc);
            const atype = this.typegen.getMIRType(invk.resultType);
            const cargs = [argpp, ...invk.params.slice(1).map((p, i) => new smt_exp_1.SMTVar(`arg_${i}`))];
            const gcall = geninfo.optmask !== undefined ? new smt_exp_1.SMTCallGeneralWPassThroughMask(this.typegen.lookupFunctionName(vfunc), cargs, geninfo.optmask) : new smt_exp_1.SMTCallGeneral(this.typegen.lookupFunctionName(vfunc), cargs);
            let action = new smt_exp_1.SMTConst("[NOT SET]");
            if (this.isSafeInvoke(vfunc) && geninfo.allsafe) {
                action = this.typegen.coerce(gcall, atype, geninfo.resulttype);
            }
            else {
                if (this.isSafeInvoke(vfunc)) {
                    action = this.typegen.generateResultTypeConstructorSuccess(geninfo.resulttype, this.typegen.coerce(gcall, atype, geninfo.resulttype));
                }
                else {
                    const smtaatype = this.typegen.getSMTTypeFor(atype);
                    const smtgresult = this.typegen.getSMTTypeFor(geninfo.resulttype);
                    if (smtaatype.name === smtgresult.name) {
                        action = gcall;
                    }
                    else {
                        const tres = this.generateTempName();
                        const cond = this.typegen.generateResultIsSuccessTest(atype, new smt_exp_1.SMTVar(tres));
                        const erropt = this.typegen.generateResultTypeConstructorError(geninfo.resulttype, this.typegen.generateResultGetError(atype, new smt_exp_1.SMTVar(tres)));
                        const okopt = this.typegen.generateResultTypeConstructorSuccess(geninfo.resulttype, this.typegen.coerce(this.typegen.generateResultGetSuccess(atype, new smt_exp_1.SMTVar(tres)), atype, geninfo.resulttype));
                        action = new smt_exp_1.SMTLet(tres, gcall, new smt_exp_1.SMTIf(cond, okopt, erropt));
                    }
                }
            }
            return { test: test, result: action };
        });
        const orelse = ops[ops.length - 1].result;
        ops = ops.slice(0, ops.length - 1);
        const sinvk = this.assembly.invokeDecls.get(this.assembly.entityDecls.get(tentities[0].tkey).vcallMap.get(geninfo.vfname));
        const argtypes = sinvk.params.slice(1).map((p) => this.typegen.getSMTTypeFor(this.typegen.getMIRType(p.type)));
        const fargs = [
            { vname: "arg", vtype: this.typegen.getSMTTypeFor(geninfo.argflowtype) },
            ...argtypes.map((vv, i) => {
                return { vname: `arg_${i}`, vtype: vv };
            })
        ];
        return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(geninfo.inv), fargs, rtype, new smt_exp_1.SMTCond(ops, orelse));
    }
    generateVirtualOperatorInvoke(geninfo) {
        //const otrgts = this.assembly.virtualOperatorDecls.get(geninfo.opname) as MIRInvokeKey[];
        return smt_assembly_1.SMTFunction.create("NOT_IMPLEMENTED", [], this.typegen.getSMTTypeFor(geninfo.resulttype), NOT_IMPLEMENTED("generateVirtualOperatorInvoke"));
    }
    generateSubtypeCheckEntity(arg, layout, flow, ofentity) {
        if (flow.options.every((opt) => (opt instanceof mir_assembly_1.MIRTupleType) || (opt instanceof mir_assembly_1.MIRRecordType))) {
            return new smt_exp_1.SMTConst("false");
        }
        if (this.typegen.isUniqueEntityType(flow)) {
            return new smt_exp_1.SMTConst(flow.typeID === ofentity.typeID ? "true" : "false");
        }
        else {
            const accessTypeTag = this.typegen.getSMTTypeFor(layout).isGeneralTermType() ? new smt_exp_1.SMTCallSimple("GetTypeTag@BTerm", [this.argToSMT(arg)]) : new smt_exp_1.SMTCallSimple("GetTypeTag@BKey", [this.argToSMT(arg)]);
            return smt_exp_1.SMTCallSimple.makeEq(accessTypeTag, new smt_exp_1.SMTConst(`TypeTag_${this.typegen.lookupTypeName(ofentity.typeID)}`));
        }
    }
    generateSubtypeCheckConcept(arg, layout, flow, ofconcept) {
        if (this.typegen.isUniqueEntityType(flow) || this.typegen.isUniqueTupleType(flow) || this.typegen.isUniqueRecordType(flow)) {
            return new smt_exp_1.SMTConst(this.assembly.subtypeOf(flow, ofconcept) ? "true" : "false");
        }
        else {
            const accessTypeTag = this.typegen.getSMTTypeFor(layout).isGeneralTermType() ? new smt_exp_1.SMTCallSimple("GetTypeTag@BTerm", [this.argToSMT(arg)]) : new smt_exp_1.SMTCallSimple("GetTypeTag@BKey", [this.argToSMT(arg)]);
            const occ = ofconcept.options[0];
            let tests = [];
            for (let i = 0; i < occ.ckeys.length; ++i) {
                this.processSubtypeTagCheck(flow, ofconcept);
                tests.push(new smt_exp_1.SMTCallSimple("SubtypeOf@", [accessTypeTag, new smt_exp_1.SMTConst(`AbstractTypeTag_${this.typegen.lookupTypeName(occ.ckeys[i])}`)]));
            }
            if (tests.length === 1) {
                return tests[0];
            }
            else {
                return smt_exp_1.SMTCallSimple.makeAndOf(...tests);
            }
        }
    }
    generateSubtypeCheckTuple(arg, layout, flow, oftuple) {
        if (flow.options.every((opt) => (opt instanceof mir_assembly_1.MIREntityType) || (opt instanceof mir_assembly_1.MIRRecordType))) {
            return new smt_exp_1.SMTConst("false");
        }
        if (this.typegen.isUniqueTupleType(flow)) {
            return new smt_exp_1.SMTConst(this.assembly.subtypeOf(flow, oftuple) ? "true" : "false");
        }
        else {
            const accessTypeTag = this.typegen.getSMTTypeFor(layout).isGeneralTermType() ? new smt_exp_1.SMTCallSimple("GetTypeTag@BTerm", [this.argToSMT(arg)]) : new smt_exp_1.SMTCallSimple("GetTypeTag@BKey", [this.argToSMT(arg)]);
            return smt_exp_1.SMTCallSimple.makeEq(accessTypeTag, new smt_exp_1.SMTConst(`TypeTag_${this.typegen.lookupTypeName(oftuple.typeID)}`));
        }
    }
    generateSubtypeCheckRecord(arg, layout, flow, ofrecord) {
        if (flow.options.every((opt) => (opt instanceof mir_assembly_1.MIREntityType) || (opt instanceof mir_assembly_1.MIRTupleType))) {
            return new smt_exp_1.SMTConst("false");
        }
        if (this.typegen.isUniqueRecordType(flow)) {
            return new smt_exp_1.SMTConst(this.assembly.subtypeOf(flow, ofrecord) ? "true" : "false");
        }
        else {
            const accessTypeTag = this.typegen.getSMTTypeFor(layout).isGeneralTermType() ? new smt_exp_1.SMTCallSimple("GetTypeTag@BTerm", [this.argToSMT(arg)]) : new smt_exp_1.SMTCallSimple("GetTypeTag@BKey", [this.argToSMT(arg)]);
            return smt_exp_1.SMTCallSimple.makeEq(accessTypeTag, new smt_exp_1.SMTConst(`TypeTag_${this.typegen.lookupTypeName(ofrecord.typeID)}`));
        }
    }
    generateTempName() {
        return `_@tmpvar@${this.tmpvarctr++}`;
    }
    generateErrorCreate(sinfo, rtype, msg) {
        if (this.allErrors.find((vv) => this.currentFile === vv.file && sinfo.pos === vv.pos) === undefined) {
            this.allErrors.push({ file: this.currentFile, line: sinfo.line, pos: sinfo.pos, msg: msg });
        }
        if (this.currentFile === this.errorTrgtPos.file && sinfo.pos === this.errorTrgtPos.pos) {
            return this.typegen.generateResultTypeConstructorError(rtype, new smt_exp_1.SMTConst("ErrorID_Target"));
        }
        else {
            return this.typegen.generateResultTypeConstructorError(rtype, new smt_exp_1.SMTConst("ErrorID_AssumeCheck"));
        }
    }
    isSafeInvoke(mkey) {
        const idecl = (this.assembly.invokeDecls.get(mkey) || this.assembly.primitiveInvokeDecls.get(mkey));
        if (idecl.attributes.includes("__safe") || idecl.attributes.includes("__assume_safe")) {
            return true;
        }
        else {
            const csi = this.callsafety.get(mkey);
            return csi !== undefined && csi.safe;
        }
    }
    isSafeVirtualInvoke(vkey, rcvrtype) {
        return [...this.assembly.entityDecls]
            .filter((tt) => {
            const mtt = this.typegen.getMIRType(tt[1].tkey);
            return this.typegen.isUniqueEntityType(mtt) && this.assembly.subtypeOf(mtt, rcvrtype);
        })
            .every((edcl) => {
            return this.isSafeInvoke(this.assembly.entityDecls.get(edcl[1].tkey).vcallMap.get(vkey));
        });
    }
    isSafeConstructorInvoke(oftype) {
        const edecl = this.assembly.entityDecls.get(oftype.typeID);
        if (edecl instanceof mir_assembly_1.MIRConstructableEntityTypeDecl) {
            const cname = edecl.usingcons;
            return this.isSafeInvoke(cname);
        }
        else {
            const cname = edecl.consfunc;
            return this.isSafeInvoke(cname);
        }
    }
    isSafeVirtualConstructorInvoke(oftypes) {
        return [...this.assembly.entityDecls]
            .filter((tt) => {
            const mtt = this.typegen.getMIRType(tt[1].tkey);
            return this.typegen.isUniqueEntityType(mtt) && this.assembly.subtypeOf(mtt, oftypes);
        })
            .every((edcl) => {
            return this.isSafeConstructorInvoke(this.typegen.getMIRType(edcl[0]));
        });
    }
    constantToSMT(cval) {
        if (cval instanceof mir_ops_1.MIRConstantNone) {
            return new smt_exp_1.SMTConst("bsq_none@literal");
        }
        else if (cval instanceof mir_ops_1.MIRConstantNothing) {
            return new smt_exp_1.SMTConst("bsq_nothing@literal");
        }
        else if (cval instanceof mir_ops_1.MIRConstantTrue) {
            return new smt_exp_1.SMTConst("true");
        }
        else if (cval instanceof mir_ops_1.MIRConstantFalse) {
            return new smt_exp_1.SMTConst("false");
        }
        else if (cval instanceof mir_ops_1.MIRConstantInt) {
            return this.numgen.int.emitInt(cval.value);
        }
        else if (cval instanceof mir_ops_1.MIRConstantNat) {
            return this.numgen.int.emitNat(cval.value);
        }
        else if (cval instanceof mir_ops_1.MIRConstantBigInt) {
            return new smt_exp_1.SMTConst(cval.value.slice(0, cval.value.length - 1));
        }
        else if (cval instanceof mir_ops_1.MIRConstantBigNat) {
            return new smt_exp_1.SMTConst(cval.value.slice(0, cval.value.length - 1));
        }
        else if (cval instanceof mir_ops_1.MIRConstantRational) {
            const spos = cval.value.indexOf("/");
            const num = new smt_exp_1.SMTConst(cval.value.slice(0, spos) + ".0");
            const denom = new smt_exp_1.SMTConst(cval.value.slice(spos + 1, cval.value.length - 1) + ".0");
            return new smt_exp_1.SMTCallSimple("/", [num, denom]);
        }
        else if (cval instanceof mir_ops_1.MIRConstantFloat) {
            const sv = cval.value.includes(".") ? cval.value.slice(0, cval.value.length - 1) : (cval.value.slice(0, cval.value.length - 1) + ".0");
            return new smt_exp_1.SMTConst(sv);
        }
        else if (cval instanceof mir_ops_1.MIRConstantDecimal) {
            const sv = cval.value.includes(".") ? cval.value.slice(0, cval.value.length - 1) : (cval.value.slice(0, cval.value.length - 1) + ".0");
            return new smt_exp_1.SMTConst(sv);
        }
        else if (cval instanceof mir_ops_1.MIRConstantString) {
            assert(this.vopts.StringOpt === "ASCII", "We need to UNICODE!!!🦄🚀✨");
            return new smt_exp_1.SMTConst(cval.value);
        }
        else if (cval instanceof mir_ops_1.MIRConstantTypedNumber) {
            return this.constantToSMT(cval.value);
        }
        else if (cval instanceof mir_ops_1.MIRConstantStringOf) {
            assert(this.vopts.StringOpt === "ASCII", "We need to UNICODE!!!🦄🚀✨");
            return new smt_exp_1.SMTConst("\"" + cval.value.slice(1, cval.value.length - 1) + "\"");
        }
        else if (cval instanceof mir_ops_1.MIRConstantDataString) {
            assert(this.vopts.StringOpt === "ASCII", "We need to UNICODE!!!🦄🚀✨");
            return new smt_exp_1.SMTConst("\"" + cval.value.slice(1, cval.value.length - 1) + "\"");
        }
        else {
            assert(cval instanceof mir_ops_1.MIRConstantRegex);
            const rval = cval.value;
            const ere = this.assembly.literalRegexs.findIndex((re) => re.restr === rval.restr);
            return new smt_exp_1.SMTCallSimple("bsq_regex@cons", [new smt_exp_1.SMTConst(`${ere}`)]);
        }
    }
    argToSMT(arg) {
        if (arg instanceof mir_ops_1.MIRRegisterArgument) {
            return this.varToSMTName(arg);
        }
        else if (arg instanceof mir_ops_1.MIRGlobalVariable) {
            return this.globalToSMT(arg);
        }
        else {
            return this.constantToSMT(arg);
        }
    }
    generateNoneCheck(arg, argtype) {
        if (this.typegen.isType(argtype, "NSCore::None")) {
            return new smt_exp_1.SMTConst("true");
        }
        else if (!this.assembly.subtypeOf(this.typegen.getMIRType("NSCore::None"), argtype)) {
            return new smt_exp_1.SMTConst("false");
        }
        else {
            const trepr = this.typegen.getSMTTypeFor(argtype);
            if (trepr.isGeneralKeyType()) {
                return smt_exp_1.SMTCallSimple.makeEq(this.argToSMT(arg), new smt_exp_1.SMTConst("BKey@none"));
            }
            else {
                return smt_exp_1.SMTCallSimple.makeEq(this.argToSMT(arg), new smt_exp_1.SMTConst("BTerm@none"));
            }
        }
    }
    generateSomeCheck(arg, argtype) {
        if (this.typegen.isType(argtype, "NSCore::None")) {
            return new smt_exp_1.SMTConst("false");
        }
        else if (!this.assembly.subtypeOf(this.typegen.getMIRType("NSCore::None"), argtype)) {
            return new smt_exp_1.SMTConst("true");
        }
        else {
            const trepr = this.typegen.getSMTTypeFor(argtype);
            if (trepr.isGeneralKeyType()) {
                return smt_exp_1.SMTCallSimple.makeNotEq(this.argToSMT(arg), new smt_exp_1.SMTConst("BKey@none"));
            }
            else {
                return smt_exp_1.SMTCallSimple.makeNotEq(this.argToSMT(arg), new smt_exp_1.SMTConst("BTerm@none"));
            }
        }
    }
    generateNothingCheck(arg, argtype) {
        if (this.typegen.isType(argtype, "NSCore::Nothing")) {
            return new smt_exp_1.SMTConst("true");
        }
        else if (!this.assembly.subtypeOf(this.typegen.getMIRType("NSCore::Nothing"), argtype)) {
            return new smt_exp_1.SMTConst("false");
        }
        else {
            const trepr = this.typegen.getSMTTypeFor(argtype);
            if (trepr.isGeneralKeyType()) {
                return smt_exp_1.SMTCallSimple.makeEq(this.argToSMT(arg), new smt_exp_1.SMTConst("BKey@nothing"));
            }
            else {
                return smt_exp_1.SMTCallSimple.makeEq(this.argToSMT(arg), new smt_exp_1.SMTConst("BTerm@nothing"));
            }
        }
    }
    processAbort(op) {
        return this.generateErrorCreate(op.sinfo, this.currentRType, op.info);
    }
    processAssertCheck(op, continuation) {
        const chkval = this.argToSMT(op.arg);
        const errorval = this.generateErrorCreate(op.sinfo, this.currentRType, op.info);
        return new smt_exp_1.SMTIf(chkval, continuation, errorval);
    }
    processLoadUnintVariableValue(op, continuation) {
        const ufcname = this.generateUFConstantForType(this.typegen.getMIRType(op.oftype));
        return new smt_exp_1.SMTLet(this.varToSMTName(op.trgt).vname, new smt_exp_1.SMTConst(ufcname), continuation);
    }
    processDeclareGuardFlagLocation(op) {
        this.maskSizes.add(op.count);
        this.pendingMask = this.pendingMask.filter((pm) => pm.maskname !== op.name);
    }
    processSetConstantGuardFlag(op) {
        const pm = this.pendingMask.find((mm) => mm.maskname === op.name);
        pm.entries[op.position] = new smt_exp_1.SMTConst(op.flag ? "true" : "false");
    }
    processConvertValue(op, continuation) {
        const conv = this.typegen.coerce(this.argToSMT(op.src), this.typegen.getMIRType(op.srctypelayout), this.typegen.getMIRType(op.intotype));
        const call = this.generateGuardStmtCond(op.sguard, conv, op.intotype);
        return new smt_exp_1.SMTLet(this.varToSMTName(op.trgt).vname, call, continuation);
    }
    processInject(op, continuation) {
        const srctype = this.typegen.getSMTTypeFor(this.typegen.getMIRType(op.srctype));
        const intotype = this.typegen.getSMTTypeFor(this.typegen.getMIRType(op.intotype));
        assert(srctype.name === intotype.name);
        return new smt_exp_1.SMTLet(this.varToSMTName(op.trgt).vname, this.argToSMT(op.src), continuation);
    }
    processGuardedOptionInject(op, continuation) {
        const srctype = this.typegen.getSMTTypeFor(this.typegen.getMIRType(op.srctype));
        const somethingtype = this.typegen.getSMTTypeFor(this.typegen.getMIRType(op.somethingtype));
        assert(srctype.name === somethingtype.name);
        const conv = this.typegen.coerce(this.argToSMT(op.src), this.typegen.getMIRType(op.somethingtype), this.typegen.getMIRType(op.optiontype));
        const call = this.generateGuardStmtCond(op.sguard, conv, op.optiontype);
        return new smt_exp_1.SMTLet(this.varToSMTName(op.trgt).vname, call, continuation);
    }
    processExtract(op, continuation) {
        const srctype = this.typegen.getSMTTypeFor(this.typegen.getMIRType(op.srctype));
        const intotype = this.typegen.getSMTTypeFor(this.typegen.getMIRType(op.intotype));
        assert(srctype.name === intotype.name);
        return new smt_exp_1.SMTLet(this.varToSMTName(op.trgt).vname, this.argToSMT(op.src), continuation);
    }
    processLoadConst(op, continuation) {
        return new smt_exp_1.SMTLet(this.varToSMTName(op.trgt).vname, this.argToSMT(op.src), continuation);
    }
    processTupleHasIndex(op, continuation) {
        const argtype = this.typegen.getSMTTypeFor(this.typegen.getMIRType(op.arglayouttype));
        this.processIndexTagCheck(op.idx, this.typegen.getMIRType(op.argflowtype));
        const accessTypeTag = argtype.isGeneralTermType() ? new smt_exp_1.SMTCallSimple("GetTypeTag@BTerm", [this.argToSMT(op.arg)]) : new smt_exp_1.SMTCallSimple("GetTypeTag@BKey", [this.argToSMT(op.arg)]);
        return new smt_exp_1.SMTLet(this.varToSMTName(op.trgt).vname, new smt_exp_1.SMTCallSimple("HasIndex@", [accessTypeTag, new smt_exp_1.SMTConst(`TupleIndexTag_${op.idx}`)]), continuation);
    }
    processRecordHasProperty(op, continuation) {
        const argtype = this.typegen.getSMTTypeFor(this.typegen.getMIRType(op.arglayouttype));
        this.processPropertyTagCheck(op.pname, this.typegen.getMIRType(op.argflowtype));
        const accessTypeTag = argtype.isGeneralTermType() ? new smt_exp_1.SMTCallSimple("GetTypeTag@BTerm", [this.argToSMT(op.arg)]) : new smt_exp_1.SMTCallSimple("GetTypeTag@BKey", [this.argToSMT(op.arg)]);
        return new smt_exp_1.SMTLet(this.varToSMTName(op.trgt).vname, new smt_exp_1.SMTCallSimple("HasProperty@", [accessTypeTag, new smt_exp_1.SMTConst(`RecordPropertyTag_${op.pname}`)]), continuation);
    }
    processLoadTupleIndex(op, continuation) {
        const arglayouttype = this.typegen.getMIRType(op.arglayouttype);
        const argflowtype = this.typegen.getMIRType(op.argflowtype);
        if (op.isvirtual) {
            const icall = this.generateLoadVirtualTupleInvName(this.typegen.getMIRType(op.argflowtype), op.idx, this.typegen.getMIRType(op.resulttype), undefined);
            if (this.requiredLoadVirtualTupleIndex.findIndex((vv) => vv.inv === icall) === -1) {
                const geninfo = { inv: icall, argflowtype: this.typegen.getMIRType(op.argflowtype), idx: op.idx, resulttype: this.typegen.getMIRType(op.resulttype), guard: undefined };
                this.requiredLoadVirtualTupleIndex.push(geninfo);
            }
            const argpp = this.typegen.coerce(this.argToSMT(op.arg), arglayouttype, argflowtype);
            return new smt_exp_1.SMTLet(this.varToSMTName(op.trgt).vname, new smt_exp_1.SMTCallSimple(this.typegen.lookupFunctionName(icall), [argpp]), continuation);
        }
        else {
            const argpp = this.typegen.coerce(this.argToSMT(op.arg), arglayouttype, argflowtype);
            const idxr = new smt_exp_1.SMTCallSimple(this.typegen.generateTupleIndexGetFunction(argflowtype.options[0], op.idx), [argpp]);
            return new smt_exp_1.SMTLet(this.varToSMTName(op.trgt).vname, idxr, continuation);
        }
    }
    processLoadTupleIndexSetGuard(op, continuation) {
        const arglayouttype = this.typegen.getMIRType(op.arglayouttype);
        const argflowtype = this.typegen.getMIRType(op.argflowtype);
        if (op.isvirtual) {
            const icall = this.generateLoadVirtualTupleInvName(this.typegen.getMIRType(op.argflowtype), op.idx, this.typegen.getMIRType(op.resulttype), op.guard);
            if (this.requiredLoadVirtualTupleIndex.findIndex((vv) => vv.inv === icall) === -1) {
                const geninfo = { inv: icall, argflowtype: this.typegen.getMIRType(op.argflowtype), idx: op.idx, resulttype: this.typegen.getMIRType(op.resulttype), guard: op.guard };
                this.requiredLoadVirtualTupleIndex.push(geninfo);
            }
            const argpp = this.typegen.coerce(this.argToSMT(op.arg), arglayouttype, argflowtype);
            const cc = new smt_exp_1.SMTCallSimple(this.typegen.lookupFunctionName(icall), [argpp]);
            const callbind = this.generateTempName();
            const smtcallvar = new smt_exp_1.SMTVar(callbind);
            let ncont = new smt_exp_1.SMTConst("[UNDEF]");
            if (op.guard instanceof mir_ops_1.MIRMaskGuard) {
                const pm = this.pendingMask.find((mm) => mm.maskname === op.guard.gmask);
                pm.entries[op.guard.gindex] = this.typegen.generateAccessWithSetGuardResultGetFlag(this.typegen.getMIRType(op.resulttype), smtcallvar);
                ncont = new smt_exp_1.SMTLet(this.varToSMTName(op.trgt).vname, this.typegen.generateAccessWithSetGuardResultGetValue(this.typegen.getMIRType(op.resulttype), smtcallvar), continuation);
            }
            else {
                ncont = new smt_exp_1.SMTLetMulti([
                    { vname: this.varToSMTName(op.guard.greg).vname, value: this.typegen.generateAccessWithSetGuardResultGetFlag(this.typegen.getMIRType(op.resulttype), smtcallvar) },
                    { vname: this.varToSMTName(op.trgt).vname, value: this.typegen.generateAccessWithSetGuardResultGetValue(this.typegen.getMIRType(op.resulttype), smtcallvar) }
                ], continuation);
            }
            return new smt_exp_1.SMTLet(callbind, cc, ncont);
        }
        else {
            const argpp = this.typegen.coerce(this.argToSMT(op.arg), arglayouttype, argflowtype);
            const idxr = new smt_exp_1.SMTCallSimple(this.typegen.generateTupleIndexGetFunction(argflowtype.options[0], op.idx), [argpp]);
            if (op.guard instanceof mir_ops_1.MIRMaskGuard) {
                const pm = this.pendingMask.find((mm) => mm.maskname === op.guard.gmask);
                pm.entries[op.guard.gindex] = new smt_exp_1.SMTConst("true");
                return new smt_exp_1.SMTLet(this.varToSMTName(op.trgt).vname, idxr, continuation);
            }
            else {
                return new smt_exp_1.SMTLetMulti([
                    { vname: this.varToSMTName(op.guard.greg).vname, value: new smt_exp_1.SMTConst("true") },
                    { vname: this.varToSMTName(op.trgt).vname, value: idxr }
                ], continuation);
            }
        }
    }
    processLoadRecordProperty(op, continuation) {
        const arglayouttype = this.typegen.getMIRType(op.arglayouttype);
        const argflowtype = this.typegen.getMIRType(op.argflowtype);
        if (op.isvirtual) {
            const icall = this.generateLoadVirtualPropertyInvName(this.typegen.getMIRType(op.argflowtype), op.pname, this.typegen.getMIRType(op.resulttype), undefined);
            if (this.requiredLoadVirtualRecordProperty.findIndex((vv) => vv.inv === icall) === -1) {
                const geninfo = { inv: icall, argflowtype: this.typegen.getMIRType(op.argflowtype), pname: op.pname, resulttype: this.typegen.getMIRType(op.resulttype), guard: undefined };
                this.requiredLoadVirtualRecordProperty.push(geninfo);
            }
            const argpp = this.typegen.coerce(this.argToSMT(op.arg), arglayouttype, argflowtype);
            return new smt_exp_1.SMTLet(this.varToSMTName(op.trgt).vname, new smt_exp_1.SMTCallSimple(this.typegen.lookupFunctionName(icall), [argpp]), continuation);
        }
        else {
            const argpp = this.typegen.coerce(this.argToSMT(op.arg), arglayouttype, argflowtype);
            const idxr = new smt_exp_1.SMTCallSimple(this.typegen.generateRecordPropertyGetFunction(argflowtype.options[0], op.pname), [argpp]);
            return new smt_exp_1.SMTLet(this.varToSMTName(op.trgt).vname, idxr, continuation);
        }
    }
    processLoadRecordPropertySetGuard(op, continuation) {
        const arglayouttype = this.typegen.getMIRType(op.arglayouttype);
        const argflowtype = this.typegen.getMIRType(op.argflowtype);
        if (op.isvirtual) {
            const icall = this.generateLoadVirtualPropertyInvName(this.typegen.getMIRType(op.argflowtype), op.pname, this.typegen.getMIRType(op.resulttype), op.guard);
            if (this.requiredLoadVirtualRecordProperty.findIndex((vv) => vv.inv === icall) === -1) {
                const geninfo = { inv: icall, argflowtype: this.typegen.getMIRType(op.argflowtype), pname: op.pname, resulttype: this.typegen.getMIRType(op.resulttype), guard: op.guard };
                this.requiredLoadVirtualRecordProperty.push(geninfo);
            }
            const argpp = this.typegen.coerce(this.argToSMT(op.arg), arglayouttype, argflowtype);
            const cc = new smt_exp_1.SMTCallSimple(this.typegen.lookupFunctionName(icall), [argpp]);
            const callbind = this.generateTempName();
            const smtcallvar = new smt_exp_1.SMTVar(callbind);
            let ncont = new smt_exp_1.SMTConst("[UNDEF]");
            if (op.guard instanceof mir_ops_1.MIRMaskGuard) {
                const pm = this.pendingMask.find((mm) => mm.maskname === op.guard.gmask);
                pm.entries[op.guard.gindex] = this.typegen.generateAccessWithSetGuardResultGetFlag(this.typegen.getMIRType(op.resulttype), smtcallvar);
                ncont = new smt_exp_1.SMTLet(this.varToSMTName(op.trgt).vname, this.typegen.generateAccessWithSetGuardResultGetValue(this.typegen.getMIRType(op.resulttype), smtcallvar), continuation);
            }
            else {
                ncont = new smt_exp_1.SMTLetMulti([
                    { vname: this.varToSMTName(op.guard.greg).vname, value: this.typegen.generateAccessWithSetGuardResultGetFlag(this.typegen.getMIRType(op.resulttype), smtcallvar) },
                    { vname: this.varToSMTName(op.trgt).vname, value: this.typegen.generateAccessWithSetGuardResultGetValue(this.typegen.getMIRType(op.resulttype), smtcallvar) }
                ], continuation);
            }
            return new smt_exp_1.SMTLet(callbind, cc, ncont);
        }
        else {
            const argpp = this.typegen.coerce(this.argToSMT(op.arg), arglayouttype, argflowtype);
            const idxr = new smt_exp_1.SMTCallSimple(this.typegen.generateRecordPropertyGetFunction(argflowtype.options[0], op.pname), [argpp]);
            if (op.guard instanceof mir_ops_1.MIRMaskGuard) {
                const pm = this.pendingMask.find((mm) => mm.maskname === op.guard.gmask);
                pm.entries[op.guard.gindex] = new smt_exp_1.SMTConst("true");
                return new smt_exp_1.SMTLet(this.varToSMTName(op.trgt).vname, idxr, continuation);
            }
            else {
                return new smt_exp_1.SMTLetMulti([
                    { vname: this.varToSMTName(op.guard.greg).vname, value: new smt_exp_1.SMTConst("true") },
                    { vname: this.varToSMTName(op.trgt).vname, value: idxr }
                ], continuation);
            }
        }
    }
    processLoadField(op, continuation) {
        const arglayouttype = this.typegen.getMIRType(op.arglayouttype);
        const argflowtype = this.typegen.getMIRType(op.argflowtype);
        if (op.isvirtual) {
            const icall = this.generateLoadVirtualFieldInvName(this.typegen.getMIRType(op.argflowtype), op.field, this.typegen.getMIRType(op.resulttype));
            if (this.requiredLoadVirtualEntityField.findIndex((vv) => vv.inv === icall) === -1) {
                const geninfo = { inv: icall, argflowtype: this.typegen.getMIRType(op.argflowtype), field: this.assembly.fieldDecls.get(op.field), resulttype: this.typegen.getMIRType(op.resulttype) };
                this.requiredLoadVirtualEntityField.push(geninfo);
            }
            const argpp = this.typegen.coerce(this.argToSMT(op.arg), arglayouttype, argflowtype);
            return new smt_exp_1.SMTLet(this.varToSMTName(op.trgt).vname, new smt_exp_1.SMTCallSimple(this.typegen.lookupFunctionName(icall), [argpp]), continuation);
        }
        else {
            const argpp = this.typegen.coerce(this.argToSMT(op.arg), arglayouttype, argflowtype);
            const fdecl = this.assembly.fieldDecls.get(op.field);
            const idxr = new smt_exp_1.SMTCallSimple(this.typegen.generateEntityFieldGetFunction(this.assembly.entityDecls.get(argflowtype.typeID), fdecl), [argpp]);
            return new smt_exp_1.SMTLet(this.varToSMTName(op.trgt).vname, idxr, continuation);
        }
    }
    processTupleProjectToEphemeral(op, continuation) {
        const arglayouttype = this.typegen.getMIRType(op.arglayouttype);
        const argflowtype = this.typegen.getMIRType(op.argflowtype);
        const resulttype = this.typegen.getMIRType(op.epht);
        if (op.isvirtual) {
            const icall = this.generateProjectVirtualTupleInvName(this.typegen.getMIRType(op.argflowtype), op.indecies, resulttype);
            if (this.requiredProjectVirtualTupleIndex.findIndex((vv) => vv.inv === icall) === -1) {
                const geninfo = { inv: icall, argflowtype: this.typegen.getMIRType(op.argflowtype), indecies: op.indecies, resulttype: resulttype };
                this.requiredProjectVirtualTupleIndex.push(geninfo);
            }
            const argpp = this.typegen.coerce(this.argToSMT(op.arg), arglayouttype, argflowtype);
            return new smt_exp_1.SMTLet(this.varToSMTName(op.trgt).vname, new smt_exp_1.SMTCallSimple(this.typegen.lookupFunctionName(icall), [argpp]), continuation);
        }
        else {
            const argpp = this.typegen.coerce(this.argToSMT(op.arg), arglayouttype, argflowtype);
            const pargs = op.indecies.map((idx, i) => {
                const idxr = new smt_exp_1.SMTCallSimple(this.typegen.generateTupleIndexGetFunction(argflowtype.options[0], idx), [argpp]);
                return this.typegen.coerce(idxr, argflowtype.options[0].entries[idx], resulttype.options[0].entries[i]);
            });
            return new smt_exp_1.SMTLet(this.varToSMTName(op.trgt).vname, new smt_exp_1.SMTCallSimple(this.typegen.getSMTConstructorName(resulttype).cons, pargs), continuation);
        }
    }
    processRecordProjectToEphemeral(op, continuation) {
        const arglayouttype = this.typegen.getMIRType(op.arglayouttype);
        const argflowtype = this.typegen.getMIRType(op.argflowtype);
        const resulttype = this.typegen.getMIRType(op.epht);
        if (op.isvirtual) {
            const icall = this.generateProjectVirtualRecordInvName(this.typegen.getMIRType(op.argflowtype), op.properties, resulttype);
            if (this.requiredProjectVirtualRecordProperty.findIndex((vv) => vv.inv === icall) === -1) {
                const geninfo = { inv: icall, argflowtype: this.typegen.getMIRType(op.argflowtype), properties: op.properties, resulttype: resulttype };
                this.requiredProjectVirtualRecordProperty.push(geninfo);
            }
            const argpp = this.typegen.coerce(this.argToSMT(op.arg), arglayouttype, argflowtype);
            return new smt_exp_1.SMTLet(this.varToSMTName(op.trgt).vname, new smt_exp_1.SMTCallSimple(this.typegen.lookupFunctionName(icall), [argpp]), continuation);
        }
        else {
            const argpp = this.typegen.coerce(this.argToSMT(op.arg), arglayouttype, argflowtype);
            const pargs = op.properties.map((pname, i) => {
                const idxr = new smt_exp_1.SMTCallSimple(this.typegen.generateRecordPropertyGetFunction(argflowtype.options[0], pname), [argpp]);
                return this.typegen.coerce(idxr, argflowtype.options[0].entries.find((vv) => vv.pname === pname).ptype, resulttype.options[0].entries[i]);
            });
            return new smt_exp_1.SMTLet(this.varToSMTName(op.trgt).vname, new smt_exp_1.SMTCallSimple(this.typegen.getSMTConstructorName(resulttype).cons, pargs), continuation);
        }
    }
    processEntityProjectToEphemeral(op, continuation) {
        const arglayouttype = this.typegen.getMIRType(op.arglayouttype);
        const argflowtype = this.typegen.getMIRType(op.argflowtype);
        const resulttype = this.typegen.getMIRType(op.epht);
        if (op.isvirtual) {
            const icall = this.generateProjectVirtualEntityInvName(this.typegen.getMIRType(op.argflowtype), op.fields, resulttype);
            if (this.requiredProjectVirtualEntityField.findIndex((vv) => vv.inv === icall) === -1) {
                const geninfo = { inv: icall, argflowtype: this.typegen.getMIRType(op.argflowtype), fields: op.fields.map((fkey) => this.assembly.fieldDecls.get(fkey)), resulttype: resulttype };
                this.requiredProjectVirtualEntityField.push(geninfo);
            }
            const argpp = this.typegen.coerce(this.argToSMT(op.arg), arglayouttype, argflowtype);
            return new smt_exp_1.SMTLet(this.varToSMTName(op.trgt).vname, new smt_exp_1.SMTCallSimple(this.typegen.lookupFunctionName(icall), [argpp]), continuation);
        }
        else {
            const argpp = this.typegen.coerce(this.argToSMT(op.arg), arglayouttype, argflowtype);
            const pargs = op.fields.map((fkey, i) => {
                const fdecl = this.assembly.fieldDecls.get(fkey);
                const idxr = new smt_exp_1.SMTCallSimple(this.typegen.generateEntityFieldGetFunction(this.assembly.entityDecls.get(argflowtype.typeID), fdecl), [argpp]);
                return this.typegen.coerce(idxr, this.typegen.getMIRType(this.assembly.fieldDecls.get(fkey).declaredType), resulttype.options[0].entries[i]);
            });
            return new smt_exp_1.SMTLet(this.varToSMTName(op.trgt).vname, new smt_exp_1.SMTCallSimple(this.typegen.getSMTConstructorName(resulttype).cons, pargs), continuation);
        }
    }
    processTupleUpdate(op, continuation) {
        const arglayouttype = this.typegen.getMIRType(op.arglayouttype);
        const argflowtype = this.typegen.getMIRType(op.argflowtype);
        const resulttype = this.typegen.getMIRType(op.argflowtype);
        if (op.isvirtual) {
            const icall = this.generateUpdateVirtualTupleInvName(this.typegen.getMIRType(op.argflowtype), op.updates.map((upd) => [upd[0], upd[2]]), resulttype);
            if (this.requiredUpdateVirtualTuple.findIndex((vv) => vv.inv === icall) === -1) {
                const geninfo = { inv: icall, argflowtype: this.typegen.getMIRType(op.argflowtype), updates: op.updates.map((upd) => [upd[0], upd[2]]), resulttype: resulttype };
                this.requiredUpdateVirtualTuple.push(geninfo);
            }
            const argpp = this.typegen.coerce(this.argToSMT(op.arg), arglayouttype, argflowtype);
            return new smt_exp_1.SMTLet(this.varToSMTName(op.trgt).vname, new smt_exp_1.SMTCallSimple(this.typegen.lookupFunctionName(icall), [argpp]), continuation);
        }
        else {
            const ttype = argflowtype.options[0];
            const argpp = this.typegen.coerce(this.argToSMT(op.arg), arglayouttype, argflowtype);
            let cargs = [];
            for (let i = 0; i < ttype.entries.length; ++i) {
                const upd = op.updates.find((vv) => vv[0] === i);
                if (upd === undefined) {
                    cargs.push(new smt_exp_1.SMTCallSimple(this.typegen.generateTupleIndexGetFunction(ttype, i), [argpp]));
                }
                else {
                    cargs.push(this.argToSMT(upd[1]));
                }
            }
            return new smt_exp_1.SMTLet(this.varToSMTName(op.trgt).vname, new smt_exp_1.SMTCallSimple(this.typegen.getSMTConstructorName(resulttype).cons, cargs), continuation);
        }
    }
    processRecordUpdate(op, continuation) {
        const arglayouttype = this.typegen.getMIRType(op.arglayouttype);
        const argflowtype = this.typegen.getMIRType(op.argflowtype);
        const resulttype = this.typegen.getMIRType(op.argflowtype);
        if (op.isvirtual) {
            const icall = this.generateUpdateVirtualRecordInvName(this.typegen.getMIRType(op.argflowtype), op.updates.map((upd) => [upd[0], upd[2]]), resulttype);
            if (this.requiredUpdateVirtualRecord.findIndex((vv) => vv.inv === icall) === -1) {
                const geninfo = { inv: icall, argflowtype: this.typegen.getMIRType(op.argflowtype), updates: op.updates.map((upd) => [upd[0], upd[2]]), resulttype: resulttype };
                this.requiredUpdateVirtualRecord.push(geninfo);
            }
            const argpp = this.typegen.coerce(this.argToSMT(op.arg), arglayouttype, argflowtype);
            return new smt_exp_1.SMTLet(this.varToSMTName(op.trgt).vname, new smt_exp_1.SMTCallSimple(this.typegen.lookupFunctionName(icall), [argpp]), continuation);
        }
        else {
            const ttype = argflowtype.options[0];
            const argpp = this.typegen.coerce(this.argToSMT(op.arg), arglayouttype, argflowtype);
            let cargs = [];
            for (let i = 0; i < ttype.entries.length; ++i) {
                const upd = op.updates.find((vv) => vv[0] === ttype.entries[i].pname);
                if (upd === undefined) {
                    cargs.push(new smt_exp_1.SMTCallSimple(this.typegen.generateRecordPropertyGetFunction(ttype, ttype.entries[i].pname), [argpp]));
                }
                else {
                    cargs.push(this.argToSMT(upd[1]));
                }
            }
            return new smt_exp_1.SMTLet(this.varToSMTName(op.trgt).vname, new smt_exp_1.SMTCallSimple(this.typegen.getSMTConstructorName(resulttype).cons, cargs), continuation);
        }
    }
    processEntityUpdate(op, continuation) {
        const arglayouttype = this.typegen.getMIRType(op.arglayouttype);
        const argflowtype = this.typegen.getMIRType(op.argflowtype);
        const resulttype = this.typegen.getMIRType(op.argflowtype);
        if (op.isvirtual) {
            const allsafe = this.isSafeVirtualConstructorInvoke(argflowtype);
            const icall = this.generateUpdateVirtualEntityInvName(this.typegen.getMIRType(op.argflowtype), op.updates.map((upd) => [upd[0], upd[2]]), resulttype);
            if (this.requiredUpdateVirtualEntity.findIndex((vv) => vv.inv === icall) === -1) {
                const geninfo = { inv: icall, argflowtype: this.typegen.getMIRType(op.argflowtype), allsafe: allsafe, updates: op.updates.map((upd) => [upd[0], upd[2]]), resulttype: resulttype };
                this.requiredUpdateVirtualEntity.push(geninfo);
            }
            const argpp = this.typegen.coerce(this.argToSMT(op.arg), arglayouttype, argflowtype);
            const ccall = new smt_exp_1.SMTLet(this.varToSMTName(op.trgt).vname, new smt_exp_1.SMTCallGeneral(this.typegen.lookupFunctionName(icall), [argpp]), continuation);
            if (allsafe) {
                return new smt_exp_1.SMTLet(this.varToSMTName(op.trgt).vname, ccall, continuation);
            }
            else {
                return this.generateGeneralCallValueProcessing(this.currentRType, resulttype, ccall, op.trgt, continuation);
            }
        }
        else {
            const ttype = argflowtype.options[0];
            const ttdecl = this.assembly.entityDecls.get(ttype.typeID);
            const consfunc = ttdecl.consfunc;
            const consfields = ttdecl.consfuncfields.map((ccf) => this.assembly.fieldDecls.get(ccf));
            const argpp = this.typegen.coerce(this.argToSMT(op.arg), arglayouttype, argflowtype);
            let cargs = [];
            for (let i = 0; i < consfields.length; ++i) {
                const upd = op.updates.find((vv) => vv[0] === consfields[i].fname);
                if (upd === undefined) {
                    cargs.push(new smt_exp_1.SMTCallSimple(this.typegen.generateEntityFieldGetFunction(ttdecl, consfields[i]), [argpp]));
                }
                else {
                    cargs.push(this.argToSMT(upd[1]));
                }
            }
            const ccall = new smt_exp_1.SMTCallGeneral(this.typegen.lookupFunctionName(consfunc), cargs);
            if (this.isSafeConstructorInvoke(argflowtype)) {
                return new smt_exp_1.SMTLet(this.varToSMTName(op.trgt).vname, ccall, continuation);
            }
            else {
                return this.generateGeneralCallValueProcessing(this.currentRType, resulttype, ccall, op.trgt, continuation);
            }
        }
    }
    processLoadFromEpehmeralList(op, continuation) {
        const argtype = this.typegen.getMIRType(op.argtype);
        const idxr = new smt_exp_1.SMTCallSimple(this.typegen.generateEphemeralListGetFunction(argtype.options[0], op.idx), [this.argToSMT(op.arg)]);
        return new smt_exp_1.SMTLet(this.varToSMTName(op.trgt).vname, idxr, continuation);
    }
    processMultiLoadFromEpehmeralList(op, continuation) {
        const eltype = this.typegen.getMIRType(op.argtype).options[0];
        const assigns = op.trgts.map((asgn) => {
            const idxr = new smt_exp_1.SMTCallSimple(this.typegen.generateEphemeralListGetFunction(eltype, asgn.pos), [this.argToSMT(op.arg)]);
            return { vname: this.varToSMTName(asgn.into).vname, value: idxr };
        });
        return new smt_exp_1.SMTLetMulti(assigns, continuation);
    }
    processSliceEpehmeralList(op, continuation) {
        const eltype = this.typegen.getMIRType(op.argtype).options[0];
        const sltype = this.typegen.getMIRType(op.sltype).options[0];
        const pargs = sltype.entries.map((sle, i) => new smt_exp_1.SMTCallSimple(this.typegen.generateEphemeralListGetFunction(eltype, i), [this.argToSMT(op.arg)]));
        return new smt_exp_1.SMTLet(this.varToSMTName(op.trgt).vname, new smt_exp_1.SMTCallSimple(this.typegen.getSMTConstructorName(this.typegen.getMIRType(op.sltype)).cons, pargs), continuation);
    }
    processInvokeFixedFunction(op, continuation) {
        const invk = (this.assembly.invokeDecls.get(op.mkey) || this.assembly.primitiveInvokeDecls.get(op.mkey));
        const rtype = this.typegen.getMIRType(invk.resultType);
        if (invk instanceof mir_assembly_1.MIRInvokePrimitiveDecl && invk.implkey === "default") {
            assert(op.sguard === undefined && op.optmask === undefined);
            const args = op.args.map((arg) => this.argToSMT(arg));
            return this.processDefaultOperatorInvokePrimitiveType(op.sinfo, op.trgt, op.mkey, args, continuation);
        }
        else {
            let mask = undefined;
            if (op.optmask !== undefined) {
                mask = new smt_exp_1.SMTMaskConstruct(op.optmask);
                this.pendingMask.push(mask);
            }
            const args = op.args.map((arg) => this.argToSMT(arg));
            const call = mask !== undefined ? new smt_exp_1.SMTCallGeneralWOptMask(this.typegen.lookupFunctionName(op.mkey), args, mask) : new smt_exp_1.SMTCallGeneral(this.typegen.lookupFunctionName(op.mkey), args);
            const gcall = this.generateGuardStmtCond(op.sguard, call, invk.resultType);
            if (this.isSafeInvoke(op.mkey)) {
                return new smt_exp_1.SMTLet(this.varToSMTName(op.trgt).vname, gcall, continuation);
            }
            else {
                return this.generateGeneralCallValueProcessing(this.currentRType, rtype, gcall, op.trgt, continuation);
            }
        }
    }
    processInvokeVirtualFunction(op, continuation) {
        const rcvrlayouttype = this.typegen.getMIRType(op.rcvrlayouttype);
        const rcvrflowtype = this.typegen.getMIRType(op.rcvrflowtype);
        const resulttype = this.typegen.getMIRType(op.resultType);
        const allsafe = this.isSafeVirtualInvoke(op.vresolve, rcvrflowtype);
        const icall = this.generateVirtualInvokeFunctionName(rcvrflowtype, op.vresolve, op.shortname, op.optmask !== undefined, resulttype);
        if (this.requiredVirtualFunctionInvokes.findIndex((vv) => vv.inv === icall) === -1) {
            const geninfo = { inv: icall, allsafe: allsafe, argflowtype: rcvrflowtype, vfname: op.vresolve, optmask: op.optmask, resulttype: resulttype };
            this.requiredVirtualFunctionInvokes.push(geninfo);
        }
        let mask = undefined;
        if (op.optmask !== undefined) {
            mask = new smt_exp_1.SMTMaskConstruct(op.optmask);
            this.pendingMask.push(mask);
        }
        const argpp = this.typegen.coerce(this.argToSMT(op.args[0]), rcvrlayouttype, rcvrflowtype);
        const args = [argpp, ...op.args.slice(1).map((arg) => this.argToSMT(arg))];
        const call = mask !== undefined ? new smt_exp_1.SMTCallGeneralWOptMask(this.typegen.lookupFunctionName(icall), args, mask) : new smt_exp_1.SMTCallGeneral(this.typegen.lookupFunctionName(icall), args);
        if (allsafe) {
            return new smt_exp_1.SMTLet(this.varToSMTName(op.trgt).vname, call, continuation);
        }
        else {
            return this.generateGeneralCallValueProcessing(this.currentRType, resulttype, call, op.trgt, continuation);
        }
    }
    processInvokeVirtualOperator(op, continuation) {
        const resulttype = this.typegen.getMIRType(op.resultType);
        //TODO: also need all operator safe here 
        const iop = this.generateVirtualInvokeOperatorName(op.vresolve, op.shortname, op.args.map((arg) => arg.argflowtype), resulttype);
        if (this.requiredVirtualOperatorInvokes.findIndex((vv) => vv.inv === iop) === -1) {
            assert(false);
        }
        return NOT_IMPLEMENTED("processInvokeVirtualOperator");
    }
    processConstructorTuple(op, continuation) {
        const args = op.args.map((arg) => this.argToSMT(arg));
        return new smt_exp_1.SMTLet(this.varToSMTName(op.trgt).vname, new smt_exp_1.SMTCallSimple(this.typegen.getSMTConstructorName(this.typegen.getMIRType(op.resultTupleType)).cons, args), continuation);
    }
    processConstructorTupleFromEphemeralList(op, continuation) {
        const elt = this.typegen.getMIRType(op.elistType).options[0];
        const args = elt.entries.map((tt, i) => new smt_exp_1.SMTCallSimple(this.typegen.generateEphemeralListGetFunction(elt, i), [this.argToSMT(op.arg)]));
        return new smt_exp_1.SMTLet(this.varToSMTName(op.trgt).vname, new smt_exp_1.SMTCallSimple(this.typegen.getSMTConstructorName(this.typegen.getMIRType(op.resultTupleType)).cons, args), continuation);
    }
    processConstructorRecord(op, continuation) {
        const args = op.args.map((arg) => this.argToSMT(arg[1]));
        return new smt_exp_1.SMTLet(this.varToSMTName(op.trgt).vname, new smt_exp_1.SMTCallSimple(this.typegen.getSMTConstructorName(this.typegen.getMIRType(op.resultRecordType)).cons, args), continuation);
    }
    processConstructorRecordFromEphemeralList(op, continuation) {
        const elt = this.typegen.getMIRType(op.elistType).options[0];
        const eargs = elt.entries.map((tt, i) => new smt_exp_1.SMTCallSimple(this.typegen.generateEphemeralListGetFunction(elt, i), [this.argToSMT(op.arg)]));
        const rtype = this.typegen.getMIRType(op.resultRecordType).options[0];
        const args = rtype.entries.map((rentry) => {
            const eidx = op.propertyPositions.indexOf(rentry.pname);
            return eargs[eidx];
        });
        return new smt_exp_1.SMTLet(this.varToSMTName(op.trgt).vname, new smt_exp_1.SMTCallSimple(this.typegen.getSMTConstructorName(this.typegen.getMIRType(op.resultRecordType)).cons, args), continuation);
    }
    processStructuredAppendTuple(op, continuation) {
        let args = [];
        for (let i = 0; i < op.args.length; ++i) {
            const tt = this.typegen.getMIRType(op.ttypes[i].flow).options[0];
            const argi = this.argToSMT(op.args[i]);
            for (let j = 0; j < tt.entries.length; ++j) {
                args.push(new smt_exp_1.SMTCallSimple(this.typegen.generateTupleIndexGetFunction(tt, j), [argi]));
            }
        }
        return new smt_exp_1.SMTLet(this.varToSMTName(op.trgt).vname, new smt_exp_1.SMTCallSimple(this.typegen.getSMTConstructorName(this.typegen.getMIRType(op.resultTupleType)).cons, args), continuation);
    }
    processStructuredJoinRecord(op, continuation) {
        const rtype = this.typegen.getMIRType(op.resultRecordType).options[0];
        let args = [];
        for (let i = 0; i < op.args.length; ++i) {
            const tt = this.typegen.getMIRType(op.ttypes[i].flow).options[0];
            const argi = this.argToSMT(op.args[i]);
            for (let j = 0; j < tt.entries.length; ++j) {
                const ppidx = rtype.entries.findIndex((ee) => ee.pname === tt.entries[j].pname);
                args[ppidx] = new smt_exp_1.SMTCallSimple(this.typegen.generateRecordPropertyGetFunction(tt, tt.entries[j].pname), [argi]);
            }
        }
        return new smt_exp_1.SMTLet(this.varToSMTName(op.trgt).vname, new smt_exp_1.SMTCallSimple(this.typegen.getSMTConstructorName(this.typegen.getMIRType(op.resultRecordType)).cons, args), continuation);
    }
    processConstructorEphemeralList(op, continuation) {
        const args = op.args.map((arg) => this.argToSMT(arg));
        return new smt_exp_1.SMTLet(this.varToSMTName(op.trgt).vname, new smt_exp_1.SMTCallSimple(this.typegen.getSMTConstructorName(this.typegen.getMIRType(op.resultEphemeralListType)).cons, args), continuation);
    }
    processEphemeralListExtend(op, continuation) {
        const ietype = this.typegen.getMIRType(op.argtype).options[0];
        const iargs = ietype.entries.map((ee, i) => new smt_exp_1.SMTCallSimple(this.typegen.generateEphemeralListGetFunction(ietype, i), [this.argToSMT(op.arg)]));
        const eargs = op.ext.map((arg) => this.argToSMT(arg));
        return new smt_exp_1.SMTLet(this.varToSMTName(op.trgt).vname, new smt_exp_1.SMTCallSimple(this.typegen.getSMTConstructorName(this.typegen.getMIRType(op.resultType)).cons, [...iargs, ...eargs]), continuation);
    }
    processConstructorPrimaryCollectionEmpty(op, continuation) {
        const consexp = new smt_exp_1.SMTConst(`${this.typegen.lookupTypeName(op.tkey)}@empty_const`);
        return new smt_exp_1.SMTLet(this.varToSMTName(op.trgt).vname, consexp, continuation);
    }
    processConstructorPrimaryCollectionSingletons_Helper(ltype, exps) {
        if (exps.length <= 3) {
            assert(exps.length !== 0, "Not sure how this could happen");
            return this.lopsManager.processLiteralK_Pos(ltype, exps);
        }
        else {
            const mid = exps.length / 2;
            const lhs = this.processConstructorPrimaryCollectionSingletons_Helper(ltype, exps.slice(0, mid));
            const rhs = this.processConstructorPrimaryCollectionSingletons_Helper(ltype, exps.slice(mid));
            return this.lopsManager.processConcat2(ltype, lhs, rhs, this.numgen.int.emitSimpleNat(exps.length));
        }
    }
    processConstructorPrimaryCollectionSingletons(op, continuation) {
        const constype = this.assembly.entityDecls.get(op.tkey);
        const args = op.args.map((arg) => this.argToSMT(arg[1]));
        if (constype instanceof mir_assembly_1.MIRPrimitiveListEntityTypeDecl) {
            const consexp = this.processConstructorPrimaryCollectionSingletons_Helper(this.typegen.getMIRType(op.tkey), args);
            return new smt_exp_1.SMTLet(this.varToSMTName(op.trgt).vname, consexp, continuation);
        }
        else {
            if (constype instanceof mir_assembly_1.MIRPrimitiveStackEntityTypeDecl) {
                const ultype = this.typegen.getMIRType(constype.ultype);
                const consexp = this.processConstructorPrimaryCollectionSingletons_Helper(ultype, args);
                //it is just an inject -- so direct assign is ok
                return new smt_exp_1.SMTLet(this.varToSMTName(op.trgt).vname, consexp, continuation);
            }
            else if (constype instanceof mir_assembly_1.MIRPrimitiveQueueEntityTypeDecl) {
                const ultype = this.typegen.getMIRType(constype.ultype);
                const consexp = this.processConstructorPrimaryCollectionSingletons_Helper(ultype, args);
                //it is just an inject -- so direct assign is ok
                return new smt_exp_1.SMTLet(this.varToSMTName(op.trgt).vname, consexp, continuation);
            }
            else if (constype instanceof mir_assembly_1.MIRPrimitiveSetEntityTypeDecl) {
                const ultype = this.typegen.getMIRType(constype.ultype);
                const consexp = this.processConstructorPrimaryCollectionSingletons_Helper(ultype, args);
                const cvar = this.generateTempName();
                const uvar = this.generateTempName();
                const unqinv = new smt_exp_1.SMTCallGeneral(this.typegen.lookupFunctionName(constype.unqconvinv), [new smt_exp_1.SMTVar(cvar)]);
                const erropt = this.typegen.generateResultTypeConstructorError(this.currentRType, this.typegen.generateResultGetError(ultype, new smt_exp_1.SMTVar(uvar)));
                return new smt_exp_1.SMTLet(cvar, consexp, new smt_exp_1.SMTLet(uvar, unqinv, new smt_exp_1.SMTIf(this.typegen.generateResultIsErrorTest(ultype, unqinv), erropt, new smt_exp_1.SMTLet(this.varToSMTName(op.trgt).vname, this.typegen.generateResultGetSuccess(ultype, new smt_exp_1.SMTVar(uvar)), continuation))));
            }
            else {
                assert(constype instanceof mir_assembly_1.MIRPrimitiveMapEntityTypeDecl);
                const mapconstype = constype;
                const ultype = this.typegen.getMIRType(mapconstype.ultype);
                const consexp = this.processConstructorPrimaryCollectionSingletons_Helper(ultype, args);
                const cvar = this.generateTempName();
                const uvar = this.generateTempName();
                const unqinv = new smt_exp_1.SMTCallGeneral(this.typegen.lookupFunctionName(mapconstype.unqchkinv), [new smt_exp_1.SMTVar(cvar)]);
                const erropt = this.typegen.generateResultTypeConstructorError(this.currentRType, this.typegen.generateResultGetError(this.typegen.getMIRType("NSCore::Bool"), new smt_exp_1.SMTVar(uvar)));
                return new smt_exp_1.SMTLet(cvar, consexp, new smt_exp_1.SMTLet(uvar, unqinv, new smt_exp_1.SMTIf(this.typegen.generateResultIsErrorTest(this.typegen.getMIRType("NSCore::Bool"), unqinv), erropt, new smt_exp_1.SMTIf(smt_exp_1.SMTCallSimple.makeNot(this.typegen.generateResultGetSuccess(this.typegen.getMIRType("NSCore::Bool"), new smt_exp_1.SMTVar(uvar))), this.generateErrorCreate(op.sinfo, this.typegen.getMIRType(op.tkey), "Key collision in Map constructor"), new smt_exp_1.SMTLet(this.varToSMTName(op.trgt).vname, this.typegen.generateResultGetSuccess(ultype, new smt_exp_1.SMTVar(uvar)), continuation)))));
            }
        }
    }
    processConstructorPrimaryCollectionCopies(op, continuation) {
        return NOT_IMPLEMENTED("processConstructorPrimaryCollectionCopies");
    }
    processConstructorPrimaryCollectionMixed(op, continuation) {
        return NOT_IMPLEMENTED("processConstructorPrimaryCollectionMixed");
    }
    processBinKeyEq(op, continuation) {
        let eqcmp = new smt_exp_1.SMTConst("false");
        if (op.lhslayouttype === op.rhslayouttype) {
            eqcmp = smt_exp_1.SMTCallSimple.makeEq(this.argToSMT(op.lhs), this.argToSMT(op.rhs));
        }
        else {
            const lhs = this.typegen.coerceToKey(this.argToSMT(op.lhs), this.typegen.getMIRType(op.lhslayouttype));
            const rhs = this.typegen.coerceToKey(this.argToSMT(op.rhs), this.typegen.getMIRType(op.rhslayouttype));
            eqcmp = smt_exp_1.SMTCallSimple.makeEq(lhs, rhs);
        }
        const gop = this.generateGuardStmtCond(op.sguard, eqcmp, "NSCore::Bool");
        return new smt_exp_1.SMTLet(this.varToSMTName(op.trgt).vname, gop, continuation);
    }
    processBinKeyLess(op, continuation) {
        return NOT_IMPLEMENTED("processBinKeyLess");
    }
    processPrefixNotOp(op, continuation) {
        return new smt_exp_1.SMTLet(this.varToSMTName(op.trgt).vname, smt_exp_1.SMTCallSimple.makeNot(this.argToSMT(op.arg)), continuation);
    }
    processIsTypeOf(op, continuation) {
        const layout = this.typegen.getMIRType(op.srclayouttype);
        const flow = this.typegen.getMIRType(op.srcflowtype);
        const oftype = this.typegen.getMIRType(op.chktype);
        let ttop = new smt_exp_1.SMTConst("false");
        if (this.assembly.subtypeOf(flow, oftype)) {
            //also handles the oftype is Any case
            ttop = new smt_exp_1.SMTConst("true");
        }
        else if (this.typegen.isType(oftype, "NSCore::None")) {
            ttop = this.generateNoneCheck(op.arg, layout);
        }
        else if (this.typegen.isType(oftype, "NSCore::Some")) {
            ttop = this.generateSomeCheck(op.arg, layout);
        }
        else if (this.typegen.isType(oftype, "NSCore::Nothing")) {
            ttop = this.generateNothingCheck(op.arg, layout);
        }
        else {
            const tests = oftype.options.map((topt) => {
                const mtype = this.typegen.getMIRType(topt.typeID);
                assert(mtype !== undefined, "We should generate all the component types by default??");
                if (topt instanceof mir_assembly_1.MIREntityType) {
                    return this.generateSubtypeCheckEntity(op.arg, layout, flow, mtype);
                }
                else if (topt instanceof mir_assembly_1.MIRConceptType) {
                    return this.generateSubtypeCheckConcept(op.arg, layout, flow, mtype);
                }
                else if (topt instanceof mir_assembly_1.MIRTupleType) {
                    return this.generateSubtypeCheckTuple(op.arg, layout, flow, mtype);
                }
                else {
                    assert(topt instanceof mir_assembly_1.MIRRecordType, "All other cases should be handled previously (e.g. dynamic subtype of ephemeral or literal types is not good here)");
                    return this.generateSubtypeCheckRecord(op.arg, layout, flow, mtype);
                }
            })
                .filter((test) => !(test instanceof smt_exp_1.SMTConst) || test.cname !== "false");
            if (tests.length === 0) {
                ttop = new smt_exp_1.SMTConst("false");
            }
            else if (tests.findIndex((test) => (test instanceof smt_exp_1.SMTConst) && test.cname === "true") !== -1) {
                ttop = new smt_exp_1.SMTConst("true");
            }
            else if (tests.length === 1) {
                ttop = tests[0];
            }
            else {
                ttop = smt_exp_1.SMTCallSimple.makeOrOf(...tests);
            }
        }
        const gop = this.generateGuardStmtCond(op.sguard, ttop, "NSCore::Bool");
        return new smt_exp_1.SMTLet(this.varToSMTName(op.trgt).vname, gop, continuation);
    }
    processRegisterAssign(op, continuation) {
        if (op.sguard === undefined) {
            return new smt_exp_1.SMTLet(this.varToSMTName(op.trgt).vname, this.argToSMT(op.src), continuation);
        }
        else {
            const cassign = this.generateGuardStmtCond(op.sguard, this.argToSMT(op.src), op.layouttype);
            return new smt_exp_1.SMTLet(this.varToSMTName(op.trgt).vname, cassign, continuation);
        }
    }
    processReturnAssign(op, continuation) {
        return new smt_exp_1.SMTLet(this.varToSMTName(op.name).vname, this.argToSMT(op.src), continuation);
    }
    processReturnAssignOfCons(op, continuation) {
        const conscall = new smt_exp_1.SMTCallSimple(this.typegen.getSMTConstructorName(this.typegen.getMIRType(op.oftype)).cons, op.args.map((arg) => this.argToSMT(arg)));
        return new smt_exp_1.SMTLet(this.varToSMTName(op.name).vname, conscall, continuation);
    }
    processOp(op, continuation) {
        switch (op.tag) {
            case mir_ops_1.MIROpTag.MIRNop:
            case mir_ops_1.MIROpTag.MIRDebug:
            case mir_ops_1.MIROpTag.MIRJump:
            case mir_ops_1.MIROpTag.MIRJumpCond:
            case mir_ops_1.MIROpTag.MIRJumpNone:
            case mir_ops_1.MIROpTag.MIRVarLifetimeStart:
            case mir_ops_1.MIROpTag.MIRVarLifetimeEnd: {
                return undefined;
            }
            case mir_ops_1.MIROpTag.MIRAbort: {
                return this.processAbort(op);
            }
            case mir_ops_1.MIROpTag.MIRAssertCheck: {
                return this.processAssertCheck(op, continuation);
            }
            case mir_ops_1.MIROpTag.MIRLoadUnintVariableValue: {
                return this.processLoadUnintVariableValue(op, continuation);
            }
            case mir_ops_1.MIROpTag.MIRDeclareGuardFlagLocation: {
                this.processDeclareGuardFlagLocation(op);
                return undefined;
            }
            case mir_ops_1.MIROpTag.MIRSetConstantGuardFlag: {
                this.processSetConstantGuardFlag(op);
                return undefined;
            }
            case mir_ops_1.MIROpTag.MIRConvertValue: {
                return this.processConvertValue(op, continuation);
            }
            case mir_ops_1.MIROpTag.MIRInject: {
                return this.processInject(op, continuation);
            }
            case mir_ops_1.MIROpTag.MIRGuardedOptionInject: {
                return this.processGuardedOptionInject(op, continuation);
            }
            case mir_ops_1.MIROpTag.MIRExtract: {
                return this.processExtract(op, continuation);
            }
            case mir_ops_1.MIROpTag.MIRLoadConst: {
                return this.processLoadConst(op, continuation);
            }
            case mir_ops_1.MIROpTag.MIRTupleHasIndex: {
                return this.processTupleHasIndex(op, continuation);
            }
            case mir_ops_1.MIROpTag.MIRRecordHasProperty: {
                return this.processRecordHasProperty(op, continuation);
            }
            case mir_ops_1.MIROpTag.MIRLoadTupleIndex: {
                return this.processLoadTupleIndex(op, continuation);
            }
            case mir_ops_1.MIROpTag.MIRLoadTupleIndexSetGuard: {
                return this.processLoadTupleIndexSetGuard(op, continuation);
            }
            case mir_ops_1.MIROpTag.MIRLoadRecordProperty: {
                return this.processLoadRecordProperty(op, continuation);
            }
            case mir_ops_1.MIROpTag.MIRLoadRecordPropertySetGuard: {
                return this.processLoadRecordPropertySetGuard(op, continuation);
            }
            case mir_ops_1.MIROpTag.MIRLoadField: {
                return this.processLoadField(op, continuation);
            }
            case mir_ops_1.MIROpTag.MIRTupleProjectToEphemeral: {
                return this.processTupleProjectToEphemeral(op, continuation);
            }
            case mir_ops_1.MIROpTag.MIRRecordProjectToEphemeral: {
                return this.processRecordProjectToEphemeral(op, continuation);
            }
            case mir_ops_1.MIROpTag.MIREntityProjectToEphemeral: {
                return this.processEntityProjectToEphemeral(op, continuation);
            }
            case mir_ops_1.MIROpTag.MIRTupleUpdate: {
                return this.processTupleUpdate(op, continuation);
            }
            case mir_ops_1.MIROpTag.MIRRecordUpdate: {
                return this.processRecordUpdate(op, continuation);
            }
            case mir_ops_1.MIROpTag.MIREntityUpdate: {
                return this.processEntityUpdate(op, continuation);
            }
            case mir_ops_1.MIROpTag.MIRLoadFromEpehmeralList: {
                return this.processLoadFromEpehmeralList(op, continuation);
            }
            case mir_ops_1.MIROpTag.MIRMultiLoadFromEpehmeralList: {
                return this.processMultiLoadFromEpehmeralList(op, continuation);
            }
            case mir_ops_1.MIROpTag.MIRSliceEpehmeralList: {
                return this.processSliceEpehmeralList(op, continuation);
            }
            case mir_ops_1.MIROpTag.MIRInvokeFixedFunction: {
                return this.processInvokeFixedFunction(op, continuation);
            }
            case mir_ops_1.MIROpTag.MIRInvokeVirtualFunction: {
                return this.processInvokeVirtualFunction(op, continuation);
            }
            case mir_ops_1.MIROpTag.MIRInvokeVirtualOperator: {
                return this.processInvokeVirtualOperator(op, continuation);
            }
            case mir_ops_1.MIROpTag.MIRConstructorTuple: {
                return this.processConstructorTuple(op, continuation);
            }
            case mir_ops_1.MIROpTag.MIRConstructorTupleFromEphemeralList: {
                return this.processConstructorTupleFromEphemeralList(op, continuation);
            }
            case mir_ops_1.MIROpTag.MIRConstructorRecord: {
                return this.processConstructorRecord(op, continuation);
            }
            case mir_ops_1.MIROpTag.MIRConstructorRecordFromEphemeralList: {
                return this.processConstructorRecordFromEphemeralList(op, continuation);
            }
            case mir_ops_1.MIROpTag.MIRStructuredAppendTuple: {
                return this.processStructuredAppendTuple(op, continuation);
            }
            case mir_ops_1.MIROpTag.MIRStructuredJoinRecord: {
                return this.processStructuredJoinRecord(op, continuation);
            }
            case mir_ops_1.MIROpTag.MIRConstructorEphemeralList: {
                return this.processConstructorEphemeralList(op, continuation);
            }
            case mir_ops_1.MIROpTag.MIREphemeralListExtend: {
                return this.processEphemeralListExtend(op, continuation);
            }
            case mir_ops_1.MIROpTag.MIRConstructorPrimaryCollectionEmpty: {
                return this.processConstructorPrimaryCollectionEmpty(op, continuation);
            }
            case mir_ops_1.MIROpTag.MIRConstructorPrimaryCollectionSingletons: {
                return this.processConstructorPrimaryCollectionSingletons(op, continuation);
            }
            case mir_ops_1.MIROpTag.MIRConstructorPrimaryCollectionCopies: {
                return this.processConstructorPrimaryCollectionCopies(op, continuation);
            }
            case mir_ops_1.MIROpTag.MIRConstructorPrimaryCollectionMixed: {
                return this.processConstructorPrimaryCollectionMixed(op, continuation);
            }
            case mir_ops_1.MIROpTag.MIRBinKeyEq: {
                return this.processBinKeyEq(op, continuation);
            }
            case mir_ops_1.MIROpTag.MIRBinKeyLess: {
                return this.processBinKeyLess(op, continuation);
            }
            case mir_ops_1.MIROpTag.MIRPrefixNotOp: {
                return this.processPrefixNotOp(op, continuation);
            }
            case mir_ops_1.MIROpTag.MIRIsTypeOf: {
                return this.processIsTypeOf(op, continuation);
            }
            case mir_ops_1.MIROpTag.MIRRegisterAssign: {
                return this.processRegisterAssign(op, continuation);
            }
            case mir_ops_1.MIROpTag.MIRReturnAssign: {
                return this.processReturnAssign(op, continuation);
            }
            case mir_ops_1.MIROpTag.MIRReturnAssignOfCons: {
                return this.processReturnAssignOfCons(op, continuation);
            }
            case mir_ops_1.MIROpTag.MIRDeadFlow:
            case mir_ops_1.MIROpTag.MIRPhi: {
                assert(false, "Should be eliminated in cleanup");
                return undefined;
            }
        }
    }
    processGenerateResultWithZeroArgCheck(sinfo, zero, not0arg, oftype, val) {
        const chkzero = smt_exp_1.SMTCallSimple.makeEq(zero, not0arg);
        return new smt_exp_1.SMTIf(chkzero, this.generateErrorCreate(sinfo, oftype, "Div by 0"), this.typegen.generateResultTypeConstructorSuccess(oftype, val));
    }
    processGenerateSafeDiv_Int(sinfo, args) {
        const bvmin = this.numgen.int.bvintmin;
        const chkzero = smt_exp_1.SMTCallSimple.makeEq(new smt_exp_1.SMTConst("BInt@zero"), args[1]);
        const checkovf = smt_exp_1.SMTCallSimple.makeAndOf(smt_exp_1.SMTCallSimple.makeEq(bvmin, args[0]), smt_exp_1.SMTCallSimple.makeEq(this.numgen.int.emitSimpleInt(-1), args[1]));
        return new smt_exp_1.SMTIf(checkovf, this.typegen.generateErrorResultAssert(this.typegen.getMIRType("NSCore::Int")), new smt_exp_1.SMTIf(chkzero, this.generateErrorCreate(sinfo, this.typegen.getMIRType("NSCore::Int"), "Div by 0"), this.typegen.generateResultTypeConstructorSuccess(this.typegen.getMIRType("NSCore::Int"), new smt_exp_1.SMTCallSimple("bvsdiv", args))));
    }
    processGenerateSafeNegate_Int(args) {
        const bvmin = this.numgen.int.bvintmin;
        return new smt_exp_1.SMTIf(smt_exp_1.SMTCallSimple.makeEq(args[0], bvmin), this.typegen.generateErrorResultAssert(this.typegen.getMIRType("NSCore::Int")), this.typegen.generateResultTypeConstructorSuccess(this.typegen.getMIRType("NSCore::Int"), new smt_exp_1.SMTCallSimple("bvneg", args)));
    }
    processGenerateSafeAdd_Nat(args) {
        //TODO: maybe this is better (but more complex) https://github.com/Z3Prover/z3/blob/master/src/api/api_bv.cpp
        const extl = new smt_exp_1.SMTCallSimple("(_ zero_extend 1)", [args[0]]);
        const extr = new smt_exp_1.SMTCallSimple("(_ zero_extend 1)", [args[1]]);
        const bvmax = this.numgen.int.bvnatmax1;
        return new smt_exp_1.SMTIf(new smt_exp_1.SMTCallSimple("bvugt", [new smt_exp_1.SMTCallSimple("bvadd", [extl, extr]), bvmax]), this.typegen.generateErrorResultAssert(this.typegen.getMIRType("NSCore::Nat")), this.typegen.generateResultTypeConstructorSuccess(this.typegen.getMIRType("NSCore::Nat"), new smt_exp_1.SMTCallSimple("bvadd", args)));
    }
    processGenerateSafeAdd_Int(args) {
        //TODO: maybe this is better (but more complex) https://github.com/Z3Prover/z3/blob/master/src/api/api_bv.cpp
        const extl = new smt_exp_1.SMTCallSimple("(_ sign_extend 1)", [args[0]]);
        const extr = new smt_exp_1.SMTCallSimple("(_ sign_extend 1)", [args[1]]);
        const bvmin = this.numgen.int.bvintmin1;
        const bvmax = this.numgen.int.bvintmax1;
        const tres = this.generateTempName();
        return new smt_exp_1.SMTLet(tres, new smt_exp_1.SMTCallSimple("bvadd", [extl, extr]), new smt_exp_1.SMTIf(smt_exp_1.SMTCallSimple.makeOrOf(new smt_exp_1.SMTCallSimple("bvslt", [new smt_exp_1.SMTVar(tres), bvmin]), new smt_exp_1.SMTCallSimple("bvsgt", [new smt_exp_1.SMTVar(tres), bvmax])), this.typegen.generateErrorResultAssert(this.typegen.getMIRType("NSCore::Int")), this.typegen.generateResultTypeConstructorSuccess(this.typegen.getMIRType("NSCore::Int"), new smt_exp_1.SMTCallSimple("bvadd", args))));
    }
    processGenerateSafeSub_Nat(args) {
        return new smt_exp_1.SMTIf(new smt_exp_1.SMTCallSimple("bvult", args), this.typegen.generateErrorResultAssert(this.typegen.getMIRType("NSCore::Nat")), this.typegen.generateResultTypeConstructorSuccess(this.typegen.getMIRType("NSCore::Nat"), new smt_exp_1.SMTCallSimple("bvsub", args)));
    }
    processGenerateSafeSub_Int(args) {
        //TODO: maybe this is better (but more complex) https://github.com/Z3Prover/z3/blob/master/src/api/api_bv.cpp
        const extl = new smt_exp_1.SMTCallSimple("(_ sign_extend 1)", [args[0]]);
        const extr = new smt_exp_1.SMTCallSimple("(_ sign_extend 1)", [args[1]]);
        const bvmin = this.numgen.int.bvintmin1;
        const bvmax = this.numgen.int.bvintmax1;
        const tres = this.generateTempName();
        return new smt_exp_1.SMTLet(tres, new smt_exp_1.SMTCallSimple("bvsub", [extl, extr]), new smt_exp_1.SMTIf(smt_exp_1.SMTCallSimple.makeOrOf(new smt_exp_1.SMTCallSimple("bvslt", [new smt_exp_1.SMTVar(tres), bvmin]), new smt_exp_1.SMTCallSimple("bvsgt", [new smt_exp_1.SMTVar(tres), bvmax])), this.typegen.generateErrorResultAssert(this.typegen.getMIRType("NSCore::Int")), this.typegen.generateResultTypeConstructorSuccess(this.typegen.getMIRType("NSCore::Int"), new smt_exp_1.SMTCallSimple("bvsub", args))));
    }
    processGenerateSafeMult_Nat(args) {
        return new smt_exp_1.SMTIf(new smt_exp_1.SMTCallSimple("bvumul_noovfl", args), this.typegen.generateResultTypeConstructorSuccess(this.typegen.getMIRType("NSCore::Nat"), new smt_exp_1.SMTCallSimple("bvmul", args)), this.typegen.generateErrorResultAssert(this.typegen.getMIRType("NSCore::Nat")));
    }
    processGenerateSafeMult_Int(args) {
        return new smt_exp_1.SMTIf(smt_exp_1.SMTCallSimple.makeAndOf(new smt_exp_1.SMTCallSimple("bvsmul_noovfl", args), new smt_exp_1.SMTCallSimple("bvsmul_noudfl", args)), this.typegen.generateResultTypeConstructorSuccess(this.typegen.getMIRType("NSCore::Int"), new smt_exp_1.SMTCallSimple("bvmul", args)), this.typegen.generateErrorResultAssert(this.typegen.getMIRType("NSCore::Int")));
    }
    processDefaultOperatorInvokePrimitiveType(sinfo, trgt, op, args, continuation) {
        let smte = new smt_exp_1.SMTConst("[INVALID]");
        let erropt = false;
        let rtype = this.typegen.getMIRType("NSCore::Bool"); //default for all the compare ops
        switch (op) {
            //op unary +
            case "__i__NSCore::+=prefix=(NSCore::Int)": {
                rtype = this.typegen.getMIRType("NSCore::Int");
                smte = args[0];
                break;
            }
            case "__i__NSCore::+=prefix=(NSCore::Nat)": {
                rtype = this.typegen.getMIRType("NSCore::Nat");
                smte = args[0];
                break;
            }
            case "__i__NSCore::+=prefix=(NSCore::BigInt)": {
                rtype = this.typegen.getMIRType("NSCore::BigInt");
                smte = args[0];
                break;
            }
            case "__i__NSCore::+=prefix=(NSCore::BigNat)": {
                rtype = this.typegen.getMIRType("NSCore::BigNat");
                smte = args[0];
                break;
            }
            case "__i__NSCore::+=prefix=(NSCore::Rational)": {
                rtype = this.typegen.getMIRType("NSCore::Rational");
                smte = args[0];
                break;
            }
            case "__i__NSCore::+=prefix=(NSCore::Float)": {
                rtype = this.typegen.getMIRType("NSCore::Float");
                smte = args[0];
                break;
            }
            case "__i__NSCore::+=prefix=(NSCore::Decimal)": {
                rtype = this.typegen.getMIRType("NSCore::Decimal");
                smte = args[0];
                break;
            }
            //op unary -
            case "__i__NSCore::-=prefix=(NSCore::Int)": {
                rtype = this.typegen.getMIRType("NSCore::Int");
                smte = this.processGenerateSafeNegate_Int(args);
                erropt = true;
                break;
            }
            case "__i__NSCore::-=prefix=(NSCore::BigInt)": {
                rtype = this.typegen.getMIRType("NSCore::BigInt");
                smte = new smt_exp_1.SMTCallSimple("*", [args[0], new smt_exp_1.SMTConst("-1")]);
                break;
            }
            case "__i__NSCore::-=prefix=(NSCore::Rational)": {
                rtype = this.typegen.getMIRType("NSCore::Rational");
                smte = new smt_exp_1.SMTCallSimple("*", [args[0], new smt_exp_1.SMTConst("-1")]);
                break;
            }
            case "__i__NSCore::-=prefix=(NSCore::Float)": {
                rtype = this.typegen.getMIRType("NSCore::Float");
                smte = new smt_exp_1.SMTCallSimple("*", [args[0], new smt_exp_1.SMTConst("-1")]);
                break;
            }
            case "__i__NSCore::-=prefix=(NSCore::Decimal)": {
                rtype = this.typegen.getMIRType("NSCore::Decimal");
                smte = new smt_exp_1.SMTCallSimple("*", [args[0], new smt_exp_1.SMTConst("-1")]);
                break;
            }
            //op infix +
            case "__i__NSCore::+=infix=(NSCore::Int, NSCore::Int)": {
                rtype = this.typegen.getMIRType("NSCore::Int");
                smte = this.processGenerateSafeAdd_Int(args);
                erropt = true;
                break;
            }
            case "__i__NSCore::+=infix=(NSCore::Nat, NSCore::Nat)": {
                rtype = this.typegen.getMIRType("NSCore::Nat");
                smte = this.processGenerateSafeAdd_Nat(args);
                erropt = true;
                break;
            }
            case "__i__NSCore::+=infix=(NSCore::BigInt, NSCore::BigInt)": {
                rtype = this.typegen.getMIRType("NSCore::BigInt");
                smte = new smt_exp_1.SMTCallSimple("+", args);
                break;
            }
            case "__i__NSCore::+=infix=(NSCore::BigNat, NSCore::BigNat)": {
                rtype = this.typegen.getMIRType("NSCore::BigNat");
                smte = new smt_exp_1.SMTCallSimple("+", args);
                break;
            }
            case "__i__NSCore::+=infix=(NSCore::Rational, NSCore::Rational)": {
                rtype = this.typegen.getMIRType("NSCore::Rational");
                smte = new smt_exp_1.SMTCallSimple("+", args);
                break;
            }
            case "__i__NSCore::+=infix=(NSCore::Float, NSCore::Float)": {
                rtype = this.typegen.getMIRType("NSCore::Float");
                smte = new smt_exp_1.SMTCallSimple("+", args);
                break;
            }
            case "__i__NSCore::+=infix=(NSCore::Decimal, NSCore::Decimal)": {
                rtype = this.typegen.getMIRType("NSCore::Decmial");
                smte = new smt_exp_1.SMTCallSimple("+", args);
                break;
            }
            //op infix -
            case "__i__NSCore::-=infix=(NSCore::Int, NSCore::Int)": {
                rtype = this.typegen.getMIRType("NSCore::Int");
                smte = this.processGenerateSafeSub_Int(args);
                erropt = true;
                break;
            }
            case "__i__NSCore::-=infix=(NSCore::Nat, NSCore::Nat)": {
                rtype = this.typegen.getMIRType("NSCore::Nat");
                smte = this.processGenerateSafeSub_Nat(args);
                erropt = true;
                break;
            }
            case "__i__NSCore::-=infix=(NSCore::BigInt, NSCore::BigInt)": {
                rtype = this.typegen.getMIRType("NSCore::BigInt");
                smte = new smt_exp_1.SMTCallSimple("-", args);
                break;
            }
            case "__i__NSCore::-=infix=(NSCore::BigNat, NSCore::BigNat)": {
                rtype = this.typegen.getMIRType("NSCore::BigNat");
                smte = new smt_exp_1.SMTCallSimple("-", args);
                break;
            }
            case "__i__NSCore::-=infix=(NSCore::Rational, NSCore::Rational)": {
                rtype = this.typegen.getMIRType("NSCore::Rational");
                smte = new smt_exp_1.SMTCallSimple("-", args);
                break;
            }
            case "__i__NSCore::-=infix=(NSCore::Float, NSCore::Float)": {
                rtype = this.typegen.getMIRType("NSCore::Float");
                smte = new smt_exp_1.SMTCallSimple("-", args);
                break;
            }
            case "__i__NSCore::-=infix=(NSCore::Decimal, NSCore::Decimal)": {
                rtype = this.typegen.getMIRType("NSCore::Decmial");
                smte = new smt_exp_1.SMTCallSimple("-", args);
                break;
            }
            //op infix *
            case "__i__NSCore::*=infix=(NSCore::Int, NSCore::Int)": {
                rtype = this.typegen.getMIRType("NSCore::Int");
                smte = this.processGenerateSafeMult_Int(args);
                erropt = true;
                break;
            }
            case "__i__NSCore::*=infix=(NSCore::Nat, NSCore::Nat)": {
                rtype = this.typegen.getMIRType("NSCore::Nat");
                smte = this.processGenerateSafeMult_Nat(args);
                erropt = true;
                break;
            }
            case "__i__NSCore::*=infix=(NSCore::BigInt, NSCore::BigInt)": {
                rtype = this.typegen.getMIRType("NSCore::BigInt");
                smte = new smt_exp_1.SMTCallSimple("*", args);
                break;
            }
            case "__i__NSCore::*=infix=(NSCore::BigNat, NSCore::BigNat)": {
                rtype = this.typegen.getMIRType("NSCore::BigNat");
                smte = new smt_exp_1.SMTCallSimple("*", args);
                break;
            }
            case "__i__NSCore::*=infix=(NSCore::Rational, NSCore::Rational)": {
                rtype = this.typegen.getMIRType("NSCore::Rational");
                smte = new smt_exp_1.SMTCallSimple("*", args);
                break;
            }
            case "__i__NSCore::*=infix=(NSCore::Float, NSCore::Float)": {
                rtype = this.typegen.getMIRType("NSCore::Float");
                smte = new smt_exp_1.SMTCallSimple("*", args);
                break;
            }
            case "__i__NSCore::*=infix=(NSCore::Decimal, NSCore::Decimal)": {
                rtype = this.typegen.getMIRType("NSCore::Decmial");
                smte = new smt_exp_1.SMTCallSimple("*", args);
                break;
            }
            //op infix /
            case "__i__NSCore::/=infix=(NSCore::Int, NSCore::Int)": {
                rtype = this.typegen.getMIRType("NSCore::Int");
                smte = this.processGenerateSafeDiv_Int(sinfo, args);
                erropt = true;
                break;
            }
            case "__i__NSCore::/=infix=(NSCore::Nat, NSCore::Nat)": {
                rtype = this.typegen.getMIRType("NSCore::Nat");
                smte = this.processGenerateResultWithZeroArgCheck(sinfo, new smt_exp_1.SMTConst("BNat@zero"), args[1], rtype, new smt_exp_1.SMTCallSimple("bvudiv", args));
                erropt = true;
                break;
            }
            case "__i__NSCore::/=infix=(NSCore::BigInt, NSCore::BigInt)": {
                rtype = this.typegen.getMIRType("NSCore::BigInt");
                smte = this.processGenerateResultWithZeroArgCheck(sinfo, new smt_exp_1.SMTConst("BBigInt@zero"), args[1], rtype, new smt_exp_1.SMTCallSimple("/", args));
                erropt = true;
                break;
            }
            case "__i__NSCore::/=infix=(NSCore::BigNat, NSCore::BigNat)": {
                rtype = this.typegen.getMIRType("NSCore::BigNat");
                smte = this.processGenerateResultWithZeroArgCheck(sinfo, new smt_exp_1.SMTConst("BBigNat@zero"), args[1], rtype, new smt_exp_1.SMTCallSimple("/", args));
                erropt = true;
                break;
            }
            case "__i__NSCore::/=infix=(NSCore::Rational, NSCore::Rational)": {
                rtype = this.typegen.getMIRType("NSCore::Rational");
                smte = this.processGenerateResultWithZeroArgCheck(sinfo, new smt_exp_1.SMTConst("BRational@zero"), args[1], rtype, new smt_exp_1.SMTCallSimple("/", args));
                erropt = true;
                break;
            }
            case "__i__NSCore::/=infix=(NSCore::Float, NSCore::Float)": {
                rtype = this.typegen.getMIRType("NSCore::Float");
                smte = this.processGenerateResultWithZeroArgCheck(sinfo, new smt_exp_1.SMTConst("BFloat@zero"), args[1], rtype, new smt_exp_1.SMTCallSimple("/", args));
                erropt = true;
                break;
            }
            case "__i__NSCore::/=infix=(NSCore::Decimal, NSCore::Decimal)": {
                rtype = this.typegen.getMIRType("NSCore::Decimal");
                smte = this.processGenerateResultWithZeroArgCheck(sinfo, new smt_exp_1.SMTConst("BDecimal@zero"), args[1], rtype, new smt_exp_1.SMTCallSimple("/", args));
                erropt = true;
                break;
            }
            //op infix ==
            case "__i__NSCore::===infix=(NSCore::Int, NSCore::Int)":
            case "__i__NSCore::===infix=(NSCore::Nat, NSCore::Nat)":
            case "__i__NSCore::===infix=(NSCore::BigInt, NSCore::BigInt)":
            case "__i__NSCore::===infix=(NSCore::BigNat, NSCore::BigNat)":
            case "__i__NSCore::===infix=(NSCore::Rational, NSCore::Rational)": {
                smte = smt_exp_1.SMTCallSimple.makeEq(args[0], args[1]);
                break;
            }
            //op infix !=
            case "__i__NSCore::!==infix=(NSCore::Int, NSCore::Int)":
            case "__i__NSCore::!==infix=(NSCore::Nat, NSCore::Nat)":
            case "__i__NSCore::!==infix=(NSCore::BigInt, NSCore::BigInt)":
            case "__i__NSCore::!==infix=(NSCore::BigNat, NSCore::BigNat)":
            case "__i__NSCore::!==infix=(NSCore::Rational, NSCore::Rational)": {
                smte = smt_exp_1.SMTCallSimple.makeNotEq(args[0], args[1]);
                break;
            }
            //op infix <
            case "__i__NSCore::<=infix=(NSCore::Int, NSCore::Int)": {
                smte = new smt_exp_1.SMTCallSimple("bvslt", args);
                break;
            }
            case "__i__NSCore::<=infix=(NSCore::Nat, NSCore::Nat)": {
                smte = new smt_exp_1.SMTCallSimple("bvult", args);
                break;
            }
            case "__i__NSCore::<=infix=(NSCore::BigInt, NSCore::BigInt)": {
                smte = new smt_exp_1.SMTCallSimple("<", args);
                break;
            }
            case "__i__NSCore::<=infix=(NSCore::BigNat, NSCore::BigNat)": {
                smte = new smt_exp_1.SMTCallSimple("<", args);
                break;
            }
            case "__i__NSCore::<=infix=(NSCore::Rational, NSCore::Rational)": {
                smte = new smt_exp_1.SMTCallSimple("<", args);
                break;
            }
            case "__i__NSCore::<=infix=(NSCore::Float, NSCore::Float)": {
                smte = new smt_exp_1.SMTCallSimple("<", args);
                break;
            }
            case "__i__NSCore::<=infix=(NSCore::Decimal, NSCore::Decimal)": {
                smte = new smt_exp_1.SMTCallSimple("<", args);
                break;
            }
            //op infix >
            case "__i__NSCore::>=infix=(NSCore::Int, NSCore::Int)": {
                smte = new smt_exp_1.SMTCallSimple("bvsgt", args);
                break;
            }
            case "__i__NSCore::>=infix=(NSCore::Nat, NSCore::Nat)": {
                smte = new smt_exp_1.SMTCallSimple("bvugt", args);
                break;
            }
            case "__i__NSCore::>=infix=(NSCore::BigInt, NSCore::BigInt)": {
                smte = new smt_exp_1.SMTCallSimple(">", args);
                break;
            }
            case "__i__NSCore::>=infix=(NSCore::BigNat, NSCore::BigNat)": {
                smte = new smt_exp_1.SMTCallSimple(">", args);
                break;
            }
            case "__i__NSCore::>=infix=(NSCore::Rational, NSCore::Rational)": {
                smte = new smt_exp_1.SMTCallSimple(">", args);
                break;
            }
            case "__i__NSCore::>=infix=(NSCore::Float, NSCore::Float)": {
                smte = new smt_exp_1.SMTCallSimple(">", args);
                break;
            }
            case "__i__NSCore::>=infix=(NSCore::Decimal, NSCore::Decimal)": {
                smte = new smt_exp_1.SMTCallSimple(">", args);
                break;
            }
            //op infix <=
            case "__i__NSCore::<==infix=(NSCore::Int, NSCore::Int)": {
                smte = new smt_exp_1.SMTCallSimple("bvsle", args);
                break;
            }
            case "__i__NSCore::<==infix=(NSCore::Nat, NSCore::Nat)": {
                smte = new smt_exp_1.SMTCallSimple("bvule", args);
                break;
            }
            case "__i__NSCore::<==infix=(NSCore::BigInt, NSCore::BigInt)": {
                smte = new smt_exp_1.SMTCallSimple("<=", args);
                break;
            }
            case "__i__NSCore::<==infix=(NSCore::BigNat, NSCore::BigNat)": {
                smte = new smt_exp_1.SMTCallSimple("<=", args);
                break;
            }
            case "__i__NSCore::<==infix=(NSCore::Rational, NSCore::Rational)": {
                smte = new smt_exp_1.SMTCallSimple("<=", args);
                break;
            }
            case "__i__NSCore::<==infix=(NSCore::Float, NSCore::Float)": {
                smte = new smt_exp_1.SMTCallSimple("<=", args);
                break;
            }
            case "__i__NSCore::<==infix=(NSCore::Decimal, NSCore::Decimal)": {
                smte = new smt_exp_1.SMTCallSimple("<=", args);
                break;
            }
            //op infix >=
            case "__i__NSCore::>==infix=(NSCore::Int, NSCore::Int)": {
                smte = new smt_exp_1.SMTCallSimple("bvsge", args);
                break;
            }
            case "__i__NSCore::>==infix=(NSCore::Nat, NSCore::Nat)": {
                smte = new smt_exp_1.SMTCallSimple("bvuge", args);
                break;
            }
            case "__i__NSCore::>==infix=(NSCore::BigInt, NSCore::BigInt)": {
                smte = new smt_exp_1.SMTCallSimple(">=", args);
                break;
            }
            case "__i__NSCore::>==infix=(NSCore::BigNat, NSCore::BigNat)": {
                smte = new smt_exp_1.SMTCallSimple(">=", args);
                break;
            }
            case "__i__NSCore::>==infix=(NSCore::Rational, NSCore::Rational)": {
                smte = new smt_exp_1.SMTCallSimple(">=", args);
                break;
            }
            case "__i__NSCore::>==infix=(NSCore::Float, NSCore::Float)": {
                smte = new smt_exp_1.SMTCallSimple(">=", args);
                break;
            }
            case "__i__NSCore::>==infix=(NSCore::Decimal, NSCore::Decimal)": {
                smte = new smt_exp_1.SMTCallSimple(">=", args);
                break;
            }
            case "__i__NSCore::===infix=(NSCore::StringPos, NSCore::StringPos)": {
                smte = smt_exp_1.SMTCallSimple.makeEq(args[0], args[1]);
                break;
            }
            case "__i__NSCore::!==infix=(NSCore::StringPos, NSCore::StringPos)": {
                smte = smt_exp_1.SMTCallSimple.makeNotEq(args[0], args[1]);
                break;
            }
            case "__i__NSCore::<=infix=(NSCore::StringPos, NSCore::StringPos)": {
                smte = new smt_exp_1.SMTCallSimple("<", args);
                break;
            }
            case "__i__NSCore::>=infix=(NSCore::StringPos, NSCore::StringPos)": {
                smte = new smt_exp_1.SMTCallSimple(">", args);
                break;
            }
            case "__i__NSCore::<==infix=(NSCore::StringPos, NSCore::StringPos)": {
                smte = new smt_exp_1.SMTCallSimple("<=", args);
                break;
            }
            case "__i__NSCore::>==infix=(NSCore::StringPos, NSCore::StringPos)": {
                smte = new smt_exp_1.SMTCallSimple(">=", args);
                break;
            }
            default: {
                assert(false);
            }
        }
        if (!erropt) {
            return new smt_exp_1.SMTLet(this.varToSMTName(trgt).vname, smte, continuation);
        }
        else {
            const cres = this.generateTempName();
            const okpath = new smt_exp_1.SMTLet(this.varToSMTName(trgt).vname, this.typegen.generateResultGetSuccess(rtype, new smt_exp_1.SMTVar(cres)), continuation);
            const smtrtype = this.typegen.getSMTTypeFor(rtype);
            const smtcurrenttype = this.typegen.getSMTTypeFor(this.currentRType);
            const errpath = (smtrtype.name === smtcurrenttype.name) ? new smt_exp_1.SMTVar(cres) : this.typegen.generateResultTypeConstructorError(this.currentRType, this.typegen.generateResultGetError(rtype, new smt_exp_1.SMTVar(cres)));
            const icond = new smt_exp_1.SMTIf(this.typegen.generateResultIsErrorTest(rtype, new smt_exp_1.SMTVar(cres)), errpath, okpath);
            return new smt_exp_1.SMTLet(cres, smte, icond);
        }
    }
    getReadyBlock(blocks, done) {
        return [...blocks].map((bb) => bb[1]).find((bb) => {
            if (done.has(bb.label)) {
                return false;
            }
            const jop = bb.ops[bb.ops.length - 1];
            if (jop.tag === mir_ops_1.MIROpTag.MIRAbort) {
                return true;
            }
            else if (jop.tag === mir_ops_1.MIROpTag.MIRJump) {
                return done.has(jop.trgtblock);
            }
            else {
                assert(jop.tag === mir_ops_1.MIROpTag.MIRJumpCond || jop.tag === mir_ops_1.MIROpTag.MIRJumpNone);
                let tdone = (jop.tag === mir_ops_1.MIROpTag.MIRJumpCond) ? done.has(jop.trueblock) : done.has(jop.noneblock);
                let fdone = (jop.tag === mir_ops_1.MIROpTag.MIRJumpCond) ? done.has(jop.falseblock) : done.has(jop.someblock);
                return tdone && fdone;
            }
        });
    }
    getNextBlockExp(blocks, smtexps, from, trgt) {
        if (trgt !== "returnassign") {
            return smtexps.get(trgt);
        }
        else {
            const eblock = blocks.get("returnassign");
            let rexp = smtexps.get("exit");
            const nomrmalidx = eblock.ops.findIndex((op) => !(op instanceof mir_ops_1.MIRPhi));
            for (let i = eblock.ops.length - 1; i >= nomrmalidx; --i) {
                const texp = this.processOp(eblock.ops[i], rexp);
                if (texp !== undefined) {
                    rexp = texp;
                }
            }
            if (nomrmalidx === 0) {
                return rexp;
            }
            else {
                const phis = eblock.ops.slice(0, nomrmalidx);
                const assigns = phis.map((phi) => {
                    return {
                        vname: this.varToSMTName(phi.trgt).vname,
                        value: this.varToSMTName(phi.src.get(from))
                    };
                });
                return new smt_exp_1.SMTLetMulti(assigns, rexp);
            }
        }
    }
    generateBlockExps(issafe, blocks) {
        let smtexps = new Map();
        const eblock = blocks.get("exit");
        let rexp = issafe ? new smt_exp_1.SMTVar("$$return") : this.typegen.generateResultTypeConstructorSuccess(this.currentRType, new smt_exp_1.SMTVar("$$return"));
        for (let i = eblock.ops.length - 1; i >= 0; --i) {
            const texp = this.processOp(eblock.ops[i], rexp);
            if (texp !== undefined) {
                rexp = texp;
            }
        }
        smtexps.set("exit", rexp);
        smtexps.set("returnassign", new smt_exp_1.SMTConst("[DUMMY RETURN ASSIGN]"));
        let bb = this.getReadyBlock(blocks, smtexps);
        while (bb !== undefined) {
            const jop = bb.ops[bb.ops.length - 1];
            let rexp = new smt_exp_1.SMTConst("[UNITIALIZED FLOW]");
            if (jop.tag === mir_ops_1.MIROpTag.MIRAbort) {
                ; //No continuation so just leave uninit
            }
            else if (jop.tag === mir_ops_1.MIROpTag.MIRJump) {
                rexp = this.getNextBlockExp(blocks, smtexps, bb.label, jop.trgtblock);
            }
            else if (jop.tag === mir_ops_1.MIROpTag.MIRJumpCond) {
                const smtcond = this.argToSMT(jop.arg);
                const texp = this.getNextBlockExp(blocks, smtexps, bb.label, jop.trueblock);
                const fexp = this.getNextBlockExp(blocks, smtexps, bb.label, jop.falseblock);
                rexp = new smt_exp_1.SMTIf(smtcond, texp, fexp);
            }
            else {
                assert(jop.tag === mir_ops_1.MIROpTag.MIRJumpNone);
                const smtcond = this.generateNoneCheck(jop.arg, this.typegen.getMIRType(jop.arglayouttype));
                const nexp = this.getNextBlockExp(blocks, smtexps, bb.label, jop.noneblock);
                const sexp = this.getNextBlockExp(blocks, smtexps, bb.label, jop.someblock);
                rexp = new smt_exp_1.SMTIf(smtcond, nexp, sexp);
            }
            for (let i = bb.ops.length - 1; i >= 0; --i) {
                const texp = this.processOp(bb.ops[i], rexp);
                if (texp !== undefined) {
                    rexp = texp;
                }
            }
            smtexps.set(bb.label, rexp);
            bb = this.getReadyBlock(blocks, smtexps);
        }
        return smtexps.get("entry");
    }
    generateSMTInvoke(idecl) {
        this.currentFile = idecl.srcFile;
        this.currentRType = this.typegen.getMIRType(idecl.resultType);
        const args = idecl.params.map((arg) => {
            return { vname: this.varStringToSMT(arg.name).vname, vtype: this.typegen.getSMTTypeFor(this.typegen.getMIRType(arg.type)) };
        });
        const issafe = this.isSafeInvoke(idecl.ikey);
        const restype = issafe ? this.typegen.getSMTTypeFor(this.typegen.getMIRType(idecl.resultType)) : this.typegen.generateResultType(this.typegen.getMIRType(idecl.resultType));
        if (idecl instanceof mir_assembly_1.MIRInvokeBodyDecl) {
            const body = this.generateBlockExps(issafe, idecl.body.body);
            if (idecl.masksize === 0) {
                return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, restype, body);
            }
            else {
                return smt_assembly_1.SMTFunction.createWithMask(this.typegen.lookupFunctionName(idecl.ikey), args, "@maskparam@", idecl.masksize, restype, body);
            }
        }
        else {
            assert(idecl instanceof mir_assembly_1.MIRInvokePrimitiveDecl);
            return this.generateBuiltinFunction(idecl);
        }
    }
    generateBuiltinFunction(idecl) {
        const args = idecl.params.map((arg) => {
            return { vname: this.varStringToSMT(arg.name).vname, vtype: this.typegen.getSMTTypeFor(this.typegen.getMIRType(arg.type)) };
        });
        const issafe = this.isSafeInvoke(idecl.ikey);
        const arg0typekey = idecl.params.length !== 0 ? idecl.params[0].type : "NSCore::None";
        const smtarg0typekey = this.typegen.getSMTTypeFor(this.typegen.getMIRType(arg0typekey));
        const mirrestype = this.typegen.getMIRType(idecl.resultType);
        const smtrestype = this.typegen.getSMTTypeFor(mirrestype);
        const chkrestype = issafe ? smtrestype : this.typegen.generateResultType(mirrestype);
        switch (idecl.implkey) {
            case "default":
            case "special_extract": {
                return undefined;
            }
            case "validator_accepts": {
                const bsqre = this.assembly.validatorRegexs.get(idecl.enclosingDecl);
                const lre = bsqre.compileToPatternToSMT(this.vopts.StringOpt === "ASCII");
                let accept = new smt_exp_1.SMTConst("false");
                if (this.vopts.StringOpt === "ASCII") {
                    accept = new smt_exp_1.SMTCallSimple("str.in.re", [new smt_exp_1.SMTVar(args[0].vname), new smt_exp_1.SMTConst(lre)]);
                }
                else {
                    accept = new smt_exp_1.SMTCallSimple("seq.in.re", [new smt_exp_1.SMTVar(args[0].vname), new smt_exp_1.SMTConst(lre)]);
                }
                return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, accept);
            }
            case "apitype_generate": {
                const synthbody = this.typegen.generateHavocConstructorCall(mirrestype, new smt_exp_1.SMTConst("(as seq.empty (Seq BNat))"), this.numgen.int.emitSimpleNat(1));
                return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, synthbody);
            }
            case "number_nattoint": {
                const bchk = new smt_exp_1.SMTCallSimple("bvule", [new smt_exp_1.SMTVar(args[0].vname), this.numgen.int.bvintmax]);
                const bce = new smt_exp_1.SMTIf(bchk, this.typegen.generateResultTypeConstructorSuccess(mirrestype, new smt_exp_1.SMTVar(args[0].vname)), this.typegen.generateErrorResultAssert(mirrestype));
                return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, bce);
            }
            case "number_inttonat": {
                const bchk = new smt_exp_1.SMTCallSimple("bvsle", [this.numgen.int.emitSimpleInt(0), new smt_exp_1.SMTVar(args[0].vname)]);
                const bce = new smt_exp_1.SMTIf(bchk, this.typegen.generateResultTypeConstructorSuccess(mirrestype, new smt_exp_1.SMTVar(args[0].vname)), this.typegen.generateErrorResultAssert(mirrestype));
                return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, bce);
            }
            case "number_nattobignat": {
                return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, new smt_exp_1.SMTCallSimple("bv2nat", [new smt_exp_1.SMTVar(args[0].vname)]));
            }
            case "number_inttobigint": {
                return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, new smt_exp_1.SMTCallSimple("bv2int", [new smt_exp_1.SMTVar(args[0].vname)]));
            }
            case "number_bignattonat": {
                const bchk = new smt_exp_1.SMTCallSimple("<=", [new smt_exp_1.SMTVar(args[0].vname), new smt_exp_1.SMTConst(this.numgen.int.natmax.toString())]);
                const bce = new smt_exp_1.SMTIf(bchk, this.typegen.generateResultTypeConstructorSuccess(mirrestype, new smt_exp_1.SMTCallSimple(`(_ int2bv ${this.numgen.int.bvsize})`, [new smt_exp_1.SMTVar(args[0].vname)])), this.typegen.generateErrorResultAssert(mirrestype));
                return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, bce);
            }
            case "number_biginttoint": {
                const bchk = smt_exp_1.SMTCallSimple.makeAndOf(new smt_exp_1.SMTCallSimple("<=", [new smt_exp_1.SMTConst(this.numgen.int.intmin.toString()), new smt_exp_1.SMTVar(args[0].vname)]), new smt_exp_1.SMTCallSimple("<=", [new smt_exp_1.SMTVar(args[0].vname), new smt_exp_1.SMTConst(this.numgen.int.intmax.toString())]));
                const bce = new smt_exp_1.SMTIf(bchk, this.typegen.generateResultTypeConstructorSuccess(mirrestype, new smt_exp_1.SMTCallSimple(`(_ int2bv ${this.numgen.int.bvsize})`, [new smt_exp_1.SMTVar(args[0].vname)])), this.typegen.generateErrorResultAssert(mirrestype));
                return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, bce);
            }
            case "number_bignattobigint": {
                return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, new smt_exp_1.SMTVar(args[0].vname));
            }
            case "number_biginttobignat": {
                const bce = new smt_exp_1.SMTIf(new smt_exp_1.SMTCallSimple("<=", [new smt_exp_1.SMTConst("0"), new smt_exp_1.SMTVar(args[0].vname)]), this.typegen.generateResultTypeConstructorSuccess(mirrestype, new smt_exp_1.SMTVar(args[0].vname)), this.typegen.generateErrorResultAssert(mirrestype));
                return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, bce);
            }
            case "number_bignattofloat":
            case "number_bignattodecimal":
            case "number_bignattorational":
            case "number_biginttofloat":
            case "number_biginttodecimal":
            case "number_biginttorational": {
                return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, new smt_exp_1.SMTCallSimple("to_real", [new smt_exp_1.SMTVar(args[0].vname)]));
            }
            case "number_floattobigint":
            case "number_decimaltobigint":
            case "number_rationaltobigint": {
                return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, new smt_exp_1.SMTCallSimple("to_int", [new smt_exp_1.SMTVar(args[0].vname)]));
            }
            case "number_floattodecimal":
            case "number_floattorational":
            case "number_decimaltofloat":
            case "number_decimaltorational":
            case "number_rationaltofloat":
            case "number_rationaltodecimal": {
                return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, new smt_exp_1.SMTVar(args[0].vname));
            }
            case "float_floor":
            case "decimal_floor": {
                const ceil = new smt_exp_1.SMTIf(new smt_exp_1.SMTCallSimple("<=", [new smt_exp_1.SMTVar("vvround"), new smt_exp_1.SMTVar(args[0].vname)]), new smt_exp_1.SMTCallSimple("to_int", [new smt_exp_1.SMTVar(args[0].vname)]), new smt_exp_1.SMTCallSimple("-", [new smt_exp_1.SMTCallSimple("to_int", [new smt_exp_1.SMTVar(args[0].vname)]), new smt_exp_1.SMTConst("1")]));
                const vvround = new smt_exp_1.SMTLet("vvround", new smt_exp_1.SMTCallSimple("to_real", [new smt_exp_1.SMTCallSimple("to_int", [new smt_exp_1.SMTVar(args[0].vname)])]), ceil);
                return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, vvround);
            }
            case "float_ceil":
            case "decimal_ceil": {
                const ceil = new smt_exp_1.SMTIf(new smt_exp_1.SMTCallSimple(">=", [new smt_exp_1.SMTVar("vvround"), new smt_exp_1.SMTVar(args[0].vname)]), new smt_exp_1.SMTCallSimple("to_int", [new smt_exp_1.SMTVar(args[0].vname)]), new smt_exp_1.SMTCallSimple("+", [new smt_exp_1.SMTCallSimple("to_int", [new smt_exp_1.SMTVar(args[0].vname)]), new smt_exp_1.SMTConst("1")]));
                const vvround = new smt_exp_1.SMTLet("vvround", new smt_exp_1.SMTCallSimple("to_real", [new smt_exp_1.SMTCallSimple("to_int", [new smt_exp_1.SMTVar(args[0].vname)])]), ceil);
                return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, vvround);
            }
            case "float_truncate":
            case "decimal_truncate": {
                const truncate = new smt_exp_1.SMTIf(new smt_exp_1.SMTCallSimple(">=", [new smt_exp_1.SMTVar(args[0].vname), new smt_exp_1.SMTConst("0.0")]), new smt_exp_1.SMTCallSimple("to_int", [new smt_exp_1.SMTVar(args[0].vname)]), new smt_exp_1.SMTCallSimple("-", [new smt_exp_1.SMTCallSimple("to_int", [new smt_exp_1.SMTCallSimple("-", [new smt_exp_1.SMTVar(args[0].vname)])])]));
                return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, truncate);
            }
            case "string_empty": {
                return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, smt_exp_1.SMTCallSimple.makeEq(new smt_exp_1.SMTCallSimple("str.len", [new smt_exp_1.SMTVar(args[0].vname)]), new smt_exp_1.SMTConst("0")));
            }
            case "string_append": {
                return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, new smt_exp_1.SMTCallSimple("str.++", [new smt_exp_1.SMTVar(args[0].vname), new smt_exp_1.SMTVar(args[1].vname)]));
            }
            case "stringof_into": {
                return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, new smt_exp_1.SMTVar(args[0].vname));
            }
            case "list_empty": {
                const emptylist = new smt_exp_1.SMTConst(`${this.typegen.lookupTypeName(arg0typekey)}@empty_const`);
                return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, smt_exp_1.SMTCallSimple.makeEq(new smt_exp_1.SMTVar(args[0].vname), emptylist));
            }
            case "flat_list_is1": {
                const flat_uli = this.lopsManager.generateListContentsCall(new smt_exp_1.SMTVar(args[0].vname), smtarg0typekey);
                const check_uli = this.lopsManager.generateConsCallName_Direct(smtarg0typekey, "list_1");
                return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, smt_exp_1.SMTCallSimple.makeIsTypeOp(check_uli, flat_uli));
            }
            case "flat_list_1at0": {
                const flat_uli = this.lopsManager.generateListContentsCall(new smt_exp_1.SMTVar(args[0].vname), smtarg0typekey);
                const get_uli = this.lopsManager.generateGetULIFieldFor(smtarg0typekey, "list_1", "_0_", flat_uli);
                return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, get_uli);
            }
            case "flat_list_is2": {
                const flat_uli = this.lopsManager.generateListContentsCall(new smt_exp_1.SMTVar(args[0].vname), smtarg0typekey);
                const check_uli = this.lopsManager.generateConsCallName_Direct(smtarg0typekey, "list_2");
                return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, smt_exp_1.SMTCallSimple.makeIsTypeOp(check_uli, flat_uli));
            }
            case "flat_list_2at0": {
                const flat_uli = this.lopsManager.generateListContentsCall(new smt_exp_1.SMTVar(args[0].vname), smtarg0typekey);
                const get_uli = this.lopsManager.generateGetULIFieldFor(smtarg0typekey, "list_2", "_0_", flat_uli);
                return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, get_uli);
            }
            case "flat_list_2at1": {
                const flat_uli = this.lopsManager.generateListContentsCall(new smt_exp_1.SMTVar(args[0].vname), smtarg0typekey);
                const get_uli = this.lopsManager.generateGetULIFieldFor(smtarg0typekey, "list_2", "_1_", flat_uli);
                return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, get_uli);
            }
            case "flat_list_is3": {
                const flat_uli = this.lopsManager.generateListContentsCall(new smt_exp_1.SMTVar(args[0].vname), smtarg0typekey);
                const check_uli = this.lopsManager.generateConsCallName_Direct(smtarg0typekey, "list_3");
                return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, smt_exp_1.SMTCallSimple.makeIsTypeOp(check_uli, flat_uli));
            }
            case "flat_list_3at0": {
                const flat_uli = this.lopsManager.generateListContentsCall(new smt_exp_1.SMTVar(args[0].vname), smtarg0typekey);
                const get_uli = this.lopsManager.generateGetULIFieldFor(smtarg0typekey, "list_3", "_0_", flat_uli);
                return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, get_uli);
            }
            case "flat_list_3at1": {
                const flat_uli = this.lopsManager.generateListContentsCall(new smt_exp_1.SMTVar(args[0].vname), smtarg0typekey);
                const get_uli = this.lopsManager.generateGetULIFieldFor(smtarg0typekey, "list_3", "_1_", flat_uli);
                return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, get_uli);
            }
            case "flat_list_3at2": {
                const flat_uli = this.lopsManager.generateListContentsCall(new smt_exp_1.SMTVar(args[0].vname), smtarg0typekey);
                const get_uli = this.lopsManager.generateGetULIFieldFor(smtarg0typekey, "list_3", "_2_", flat_uli);
                return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, get_uli);
            }
            case "list_isflat": {
                const flat_uli = this.lopsManager.generateListContentsCall(new smt_exp_1.SMTVar(args[0].vname), smtarg0typekey);
                const emptylist = new smt_exp_1.SMTConst(`${this.typegen.lookupTypeName(arg0typekey)}@empty_const`);
                const check_uli1 = this.lopsManager.generateConsCallName_Direct(smtarg0typekey, "list_1");
                const check_uli2 = this.lopsManager.generateConsCallName_Direct(smtarg0typekey, "list_1");
                const check_uli3 = this.lopsManager.generateConsCallName_Direct(smtarg0typekey, "list_1");
                const orof = smt_exp_1.SMTCallSimple.makeOrOf(smt_exp_1.SMTCallSimple.makeEq(new smt_exp_1.SMTVar(args[0].vname), emptylist), smt_exp_1.SMTCallSimple.makeIsTypeOp(check_uli1, flat_uli), smt_exp_1.SMTCallSimple.makeIsTypeOp(check_uli2, flat_uli), smt_exp_1.SMTCallSimple.makeIsTypeOp(check_uli3, flat_uli));
                return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, orof);
            }
            case "concat_list_left": {
                const cons_uli = this.lopsManager.generateListContentsCall(new smt_exp_1.SMTVar(args[0].vname), smtarg0typekey);
                const get_uli = this.lopsManager.generateGetULIFieldFor(smtarg0typekey, "concat2", "left", cons_uli);
                return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, get_uli);
            }
            case "concat_list_right": {
                const cons_uli = this.lopsManager.generateListContentsCall(new smt_exp_1.SMTVar(args[0].vname), smtarg0typekey);
                const get_uli = this.lopsManager.generateGetULIFieldFor(smtarg0typekey, "concat2", "right", cons_uli);
                return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, get_uli);
            }
            case "list_isconcat": {
                const cons_uli = this.lopsManager.generateListContentsCall(new smt_exp_1.SMTVar(args[0].vname), smtarg0typekey);
                const check_uli = this.lopsManager.generateConsCallName_Direct(smtarg0typekey, "concat2");
                return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, smt_exp_1.SMTCallSimple.makeIsTypeOp(check_uli, cons_uli));
            }
            case "isequence_size": {
                const sbody = new smt_exp_1.SMTCallSimple("ISequence@size", [new smt_exp_1.SMTVar(args[0].vname)]);
                return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, sbody);
            }
            case "jsequence_size": {
                const sbody = new smt_exp_1.SMTCallSimple("JSequence@size", [new smt_exp_1.SMTVar(args[0].vname)]);
                return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, sbody);
            }
            case "ssequence_size": {
                const sbody = new smt_exp_1.SMTCallSimple("SSequence@size", [new smt_exp_1.SMTVar(args[0].vname)]);
                return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, sbody);
            }
            case "list_safeas": {
                const conv = this.typegen.coerce(new smt_exp_1.SMTVar(args[0].vname), this.typegen.getMIRType(idecl.params[0].type), mirrestype);
                return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, conv);
            }
            case "list_or2": {
                const orof = smt_exp_1.SMTCallSimple.makeOrOf(new smt_exp_1.SMTVar(args[0].vname), new smt_exp_1.SMTVar(args[1].vname));
                return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, orof);
            }
            case "list_or3": {
                const orof = smt_exp_1.SMTCallSimple.makeOrOf(new smt_exp_1.SMTVar(args[0].vname), new smt_exp_1.SMTVar(args[1].vname), new smt_exp_1.SMTVar(args[2].vname));
                return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, orof);
            }
            case "list_and2": {
                const andof = smt_exp_1.SMTCallSimple.makeAndOf(new smt_exp_1.SMTVar(args[0].vname), new smt_exp_1.SMTVar(args[1].vname));
                return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, andof);
            }
            case "list_and3": {
                const andof = smt_exp_1.SMTCallSimple.makeAndOf(new smt_exp_1.SMTVar(args[0].vname), new smt_exp_1.SMTVar(args[1].vname), new smt_exp_1.SMTVar(args[2].vname));
                return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, andof);
            }
            case "list_size": {
                return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, this.lopsManager.generateListSizeCall(new smt_exp_1.SMTVar(args[0].vname), args[0].vtype));
            }
            case "list_safe_get": {
                const [l, n] = args.map((arg) => new smt_exp_1.SMTVar(arg.vname));
                const fbody = this.lopsManager.processGet(this.typegen.getMIRType(arg0typekey), l, n);
                return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, fbody);
            }
            case "list_safe_check_pred": {
                if (!this.vopts.EnableCollection_LargeOps) {
                    return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, this.typegen.generateErrorResultAssert(mirrestype));
                }
                else {
                    const pcode = idecl.pcodes.get("p");
                    const [l, count] = args.map((arg) => new smt_exp_1.SMTVar(arg.vname));
                    const fbody = this.lopsManager.processSafePredCheck(this.typegen.getMIRType(arg0typekey), false, pcode.code, pcode, l, count);
                    return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, fbody);
                }
            }
            case "list_safe_check_pred_idx": {
                if (!this.vopts.EnableCollection_LargeOps) {
                    return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, this.typegen.generateErrorResultAssert(mirrestype));
                }
                else {
                    const pcode = idecl.pcodes.get("p");
                    const [l, count] = args.map((arg) => new smt_exp_1.SMTVar(arg.vname));
                    const fbody = this.lopsManager.processSafePredCheck(this.typegen.getMIRType(arg0typekey), true, pcode.code, pcode, l, count);
                    return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, fbody);
                }
            }
            case "list_safe_check_fn": {
                if (!this.vopts.EnableCollection_LargeOps) {
                    return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, this.typegen.generateErrorResultAssert(mirrestype));
                }
                else {
                    const pcode = idecl.pcodes.get("f");
                    const pcrtype = this.typegen.getMIRType(this.assembly.invokeDecls.get(pcode.code).resultType);
                    const [l, count] = args.map((arg) => new smt_exp_1.SMTVar(arg.vname));
                    const fbody = this.lopsManager.processSafeFnCheck(this.typegen.getMIRType(arg0typekey), pcrtype, false, pcode.code, pcode, l, count);
                    return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, fbody);
                }
            }
            case "list_safe_check_fn_idx": {
                if (!this.vopts.EnableCollection_LargeOps) {
                    return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, this.typegen.generateErrorResultAssert(mirrestype));
                }
                else {
                    const pcode = idecl.pcodes.get("f");
                    const pcrtype = this.typegen.getMIRType(this.assembly.invokeDecls.get(pcode.code).resultType);
                    const [l, count] = args.map((arg) => new smt_exp_1.SMTVar(arg.vname));
                    const fbody = this.lopsManager.processSafeFnCheck(this.typegen.getMIRType(arg0typekey), pcrtype, true, pcode.code, pcode, l, count);
                    return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, fbody);
                }
            }
            case "list_safe_check_pred_pair": {
                if (!this.vopts.EnableCollection_LargeOps) {
                    return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, this.typegen.generateErrorResultAssert(mirrestype));
                }
                else {
                    assert(false, `[NOT IMPLEMENTED -- ${idecl.implkey}]`);
                    return undefined;
                }
            }
            case "list_has_pred_pair": {
                if (!this.vopts.EnableCollection_LargeOps) {
                    return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, this.typegen.generateErrorResultAssert(mirrestype));
                }
                else {
                    assert(false, `[NOT IMPLEMENTED -- ${idecl.implkey}]`);
                    return undefined;
                }
            }
            case "list_has_pred_check": {
                if (!this.vopts.EnableCollection_LargeOps) {
                    return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, this.typegen.generateErrorResultAssert(mirrestype));
                }
                else {
                    const pcode = idecl.pcodes.get("p");
                    const [l, count] = args.map((arg) => new smt_exp_1.SMTVar(arg.vname));
                    const fbody = this.lopsManager.processHasPredCheck(this.typegen.getMIRType(arg0typekey), false, pcode.code, pcode, l, count);
                    return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, fbody);
                }
            }
            case "list_has_pred_check_idx": {
                if (!this.vopts.EnableCollection_LargeOps) {
                    return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, this.typegen.generateErrorResultAssert(mirrestype));
                }
                else {
                    const pcode = idecl.pcodes.get("p");
                    const [l, count] = args.map((arg) => new smt_exp_1.SMTVar(arg.vname));
                    const fbody = this.lopsManager.processHasPredCheck(this.typegen.getMIRType(arg0typekey), true, pcode.code, pcode, l, count);
                    return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, fbody);
                }
            }
            case "list_find_index_pred": {
                if (!this.vopts.EnableCollection_LargeOps) {
                    return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, this.typegen.generateErrorResultAssert(mirrestype));
                }
                else {
                    const pcode = idecl.pcodes.get("p");
                    const [l, count] = args.map((arg) => new smt_exp_1.SMTVar(arg.vname));
                    const fbody = this.lopsManager.processFindIndexOf(this.typegen.getMIRType(arg0typekey), false, pcode.code, pcode, l, count);
                    return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, fbody);
                }
            }
            case "list_find_index_pred_idx": {
                if (!this.vopts.EnableCollection_LargeOps) {
                    return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, this.typegen.generateErrorResultAssert(mirrestype));
                }
                else {
                    const pcode = idecl.pcodes.get("p");
                    const [l, count] = args.map((arg) => new smt_exp_1.SMTVar(arg.vname));
                    const fbody = this.lopsManager.processFindIndexOf(this.typegen.getMIRType(arg0typekey), true, pcode.code, pcode, l, count);
                    return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, fbody);
                }
            }
            case "list_find_last_index_pred": {
                if (!this.vopts.EnableCollection_LargeOps) {
                    return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, this.typegen.generateErrorResultAssert(mirrestype));
                }
                else {
                    const pcode = idecl.pcodes.get("p");
                    const [l, count] = args.map((arg) => new smt_exp_1.SMTVar(arg.vname));
                    const fbody = this.lopsManager.processFindLastIndexOf(this.typegen.getMIRType(arg0typekey), false, pcode.code, pcode, l, count);
                    return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, fbody);
                }
            }
            case "list_find_last_index_pred_idx": {
                if (!this.vopts.EnableCollection_LargeOps) {
                    return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, this.typegen.generateErrorResultAssert(mirrestype));
                }
                else {
                    const pcode = idecl.pcodes.get("p");
                    const [l, count] = args.map((arg) => new smt_exp_1.SMTVar(arg.vname));
                    const fbody = this.lopsManager.processFindLastIndexOf(this.typegen.getMIRType(arg0typekey), true, pcode.code, pcode, l, count);
                    return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, fbody);
                }
            }
            case "list_concat2": {
                const [l1, l2, count] = args.map((arg) => new smt_exp_1.SMTVar(arg.vname));
                const fbody = this.lopsManager.processConcat2(mirrestype, l1, l2, count);
                return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, fbody);
            }
            case "list_slice": {
                const [l1, start, end, count] = args.map((arg) => new smt_exp_1.SMTVar(arg.vname));
                const fbody = this.lopsManager.processSlice(mirrestype, l1, start, end, count);
                return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, fbody);
            }
            case "list_rangeofint": {
                if (!this.vopts.EnableCollection_LargeOps) {
                    return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, this.typegen.generateErrorResultAssert(mirrestype));
                }
                else {
                    const [low, high, count] = args.map((arg) => new smt_exp_1.SMTVar(arg.vname));
                    const fbody = this.lopsManager.processRangeOfIntOperation(mirrestype, low, high, count);
                    return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, fbody);
                }
            }
            case "list_rangeofnat": {
                if (!this.vopts.EnableCollection_LargeOps) {
                    return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, this.typegen.generateErrorResultAssert(mirrestype));
                }
                else {
                    const [low, high, count] = args.map((arg) => new smt_exp_1.SMTVar(arg.vname));
                    const fbody = this.lopsManager.processRangeOfNatOperation(mirrestype, low, high, count);
                    return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, fbody);
                }
            }
            case "list_fill": {
                if (!this.vopts.EnableCollection_LargeOps) {
                    return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, this.typegen.generateErrorResultAssert(mirrestype));
                }
                else {
                    const [count, value] = args.map((arg) => new smt_exp_1.SMTVar(arg.vname));
                    const fbody = this.lopsManager.processFillOperation(this.typegen.getMIRType(arg0typekey), count, value);
                    return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, fbody);
                }
            }
            case "list_reverse": {
                if (!this.vopts.EnableCollection_LargeOps) {
                    return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, this.typegen.generateErrorResultAssert(mirrestype));
                }
                else {
                    assert(false, `[NOT IMPLEMENTED -- ${idecl.implkey}]`);
                    return undefined;
                }
            }
            case "list_zipindex": {
                if (!this.vopts.EnableCollection_LargeOps) {
                    return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, this.typegen.generateErrorResultAssert(mirrestype));
                }
                else {
                    assert(false, `[NOT IMPLEMENTED -- ${idecl.implkey}]`);
                    return undefined;
                }
            }
            case "list_zip": {
                if (!this.vopts.EnableCollection_LargeOps) {
                    return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, this.typegen.generateErrorResultAssert(mirrestype));
                }
                else {
                    assert(false, `[NOT IMPLEMENTED -- ${idecl.implkey}]`);
                    return undefined;
                }
            }
            case "list_computeisequence": {
                if (!this.vopts.EnableCollection_LargeOps) {
                    return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, this.typegen.generateErrorResultAssert(mirrestype));
                }
                else {
                    const pcode = idecl.pcodes.get("p");
                    const [l, count] = args.map((arg) => new smt_exp_1.SMTVar(arg.vname));
                    const fbody = this.lopsManager.processISequence(this.typegen.getMIRType(arg0typekey), false, pcode.code, pcode, l, count);
                    return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, fbody);
                }
            }
            case "list_computeisequence_idx": {
                if (!this.vopts.EnableCollection_LargeOps) {
                    return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, this.typegen.generateErrorResultAssert(mirrestype));
                }
                else {
                    const pcode = idecl.pcodes.get("p");
                    const [l, count] = args.map((arg) => new smt_exp_1.SMTVar(arg.vname));
                    const fbody = this.lopsManager.processISequence(this.typegen.getMIRType(arg0typekey), true, pcode.code, pcode, l, count);
                    return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, fbody);
                }
            }
            case "list_computejsequence": {
                if (!this.vopts.EnableCollection_LargeOps) {
                    return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, this.typegen.generateErrorResultAssert(mirrestype));
                }
                else {
                    assert(false, `[NOT IMPLEMENTED -- ${idecl.implkey}]`);
                    return undefined;
                }
            }
            case "list_computessequence": {
                if (!this.vopts.EnableCollection_LargeOps) {
                    return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, this.typegen.generateErrorResultAssert(mirrestype));
                }
                else {
                    assert(false, `[NOT IMPLEMENTED -- ${idecl.implkey}]`);
                    return undefined;
                }
            }
            case "list_map": {
                if (!this.vopts.EnableCollection_LargeOps) {
                    return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, this.typegen.generateErrorResultAssert(mirrestype));
                }
                else {
                    const pcode = idecl.pcodes.get("f");
                    const [l, count] = args.map((arg) => new smt_exp_1.SMTVar(arg.vname));
                    const fbody = this.lopsManager.processMap(this.typegen.getMIRType(arg0typekey), mirrestype, false, pcode.code, pcode, l, count);
                    return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, fbody);
                }
            }
            case "list_map_idx": {
                if (!this.vopts.EnableCollection_LargeOps) {
                    return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, this.typegen.generateErrorResultAssert(mirrestype));
                }
                else {
                    const pcode = idecl.pcodes.get("f");
                    const [l, count] = args.map((arg) => new smt_exp_1.SMTVar(arg.vname));
                    const fbody = this.lopsManager.processMap(this.typegen.getMIRType(arg0typekey), mirrestype, true, pcode.code, pcode, l, count);
                    return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, fbody);
                }
            }
            case "list_filter": {
                if (!this.vopts.EnableCollection_LargeOps) {
                    return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, this.typegen.generateErrorResultAssert(mirrestype));
                }
                else {
                    const pcode = idecl.pcodes.get("p");
                    const [l, isq, count] = args.map((arg) => new smt_exp_1.SMTVar(arg.vname));
                    const fbody = this.lopsManager.processFilter(this.typegen.getMIRType(arg0typekey), false, pcode.code, pcode, l, isq, count);
                    return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, fbody);
                }
            }
            case "list_filter_idx": {
                if (!this.vopts.EnableCollection_LargeOps) {
                    return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, this.typegen.generateErrorResultAssert(mirrestype));
                }
                else {
                    const pcode = idecl.pcodes.get("p");
                    const [l, isq, count] = args.map((arg) => new smt_exp_1.SMTVar(arg.vname));
                    const fbody = this.lopsManager.processFilter(this.typegen.getMIRType(arg0typekey), true, pcode.code, pcode, l, isq, count);
                    return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, fbody);
                }
            }
            case "list_min_arg": {
                if (!this.vopts.EnableCollection_LargeOps) {
                    return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, this.typegen.generateErrorResultAssert(mirrestype));
                }
                else {
                    assert(false, `[NOT IMPLEMENTED -- ${idecl.implkey}]`);
                    return undefined;
                }
            }
            case "list_max_arg": {
                if (!this.vopts.EnableCollection_LargeOps) {
                    return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, this.typegen.generateErrorResultAssert(mirrestype));
                }
                else {
                    assert(false, `[NOT IMPLEMENTED -- ${idecl.implkey}]`);
                    return undefined;
                }
            }
            case "list_join": {
                if (!this.vopts.EnableCollection_LargeOps) {
                    return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, this.typegen.generateErrorResultAssert(mirrestype));
                }
                else {
                    assert(false, `[NOT IMPLEMENTED -- ${idecl.implkey}]`);
                    return undefined;
                }
            }
            case "list_sort": {
                if (!this.vopts.EnableCollection_LargeOps) {
                    return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, this.typegen.generateErrorResultAssert(mirrestype));
                }
                else {
                    assert(false, `[NOT IMPLEMENTED -- ${idecl.implkey}]`);
                    return undefined;
                }
            }
            case "list_sum": {
                if (!this.vopts.EnableCollection_LargeOps) {
                    return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, this.typegen.generateErrorResultAssert(mirrestype));
                }
                else {
                    const [l] = args.map((arg) => new smt_exp_1.SMTVar(arg.vname));
                    const fbody = this.lopsManager.processSum(this.typegen.getMIRType(arg0typekey), l);
                    return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, fbody);
                }
            }
            case "map_get_list_repr": {
                return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, new smt_exp_1.SMTVar(args[0].vname));
            }
            case "map_safe_create": {
                return smt_assembly_1.SMTFunction.create(this.typegen.lookupFunctionName(idecl.ikey), args, chkrestype, new smt_exp_1.SMTVar(args[0].vname));
            }
            default: {
                assert(false, `[NOT IMPLEMENTED -- ${idecl.implkey}]`);
                return undefined;
            }
        }
    }
}
exports.SMTBodyEmitter = SMTBodyEmitter;
//# sourceMappingURL=smtbody_emitter.js.map