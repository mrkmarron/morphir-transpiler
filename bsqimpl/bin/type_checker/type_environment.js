"use strict";
//-------------------------------------------------------------------------------------------------------
// Copyright (C) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE.txt file in the project root for full license information.
//-------------------------------------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
exports.TypeEnvironment = exports.ExpressionReturnResult = exports.VarInfo = exports.ValueType = exports.FlowTypeTruthOps = exports.FlowTypeTruthValue = void 0;
const assert = require("assert");
var FlowTypeTruthValue;
(function (FlowTypeTruthValue) {
    FlowTypeTruthValue["True"] = "True";
    FlowTypeTruthValue["False"] = "False";
    FlowTypeTruthValue["Unknown"] = "Unknown";
})(FlowTypeTruthValue || (FlowTypeTruthValue = {}));
exports.FlowTypeTruthValue = FlowTypeTruthValue;
class FlowTypeTruthOps {
    static equal(e1, e2) {
        return e1 === e2;
    }
    static subvalue(e1, e2) {
        return e2 === FlowTypeTruthOps.join(e1, e2);
    }
    static join(...values) {
        if (values.length === 0) {
            return FlowTypeTruthValue.Unknown;
        }
        const hasunknown = values.indexOf(FlowTypeTruthValue.Unknown) !== -1;
        const hastrue = values.indexOf(FlowTypeTruthValue.True) !== -1;
        const hasfalse = values.indexOf(FlowTypeTruthValue.False) !== -1;
        if (hasunknown || (hastrue && hasfalse)) {
            return FlowTypeTruthValue.Unknown;
        }
        else {
            return hastrue ? FlowTypeTruthValue.True : FlowTypeTruthValue.False;
        }
    }
    static maybeTrueValue(e) {
        return (e === FlowTypeTruthValue.True || e === FlowTypeTruthValue.Unknown);
    }
    static maybeFalseValue(e) {
        return (e === FlowTypeTruthValue.False || e === FlowTypeTruthValue.Unknown);
    }
}
exports.FlowTypeTruthOps = FlowTypeTruthOps;
class ValueType {
    constructor(layout, flowtype) {
        this.layout = layout;
        this.flowtype = flowtype;
    }
    inferFlow(nflow) {
        return new ValueType(this.layout, nflow);
    }
    static createUniform(ttype) {
        return new ValueType(ttype, ttype);
    }
    static join(assembly, ...args) {
        assert(args.length !== 0);
        const jlayout = assembly.typeUpperBound(args.map((ei) => ei.layout));
        assert(jlayout.isSameType(args[0].layout)); //we should not let this happen!!!
        const jflow = assembly.typeUpperBound(args.map((ei) => ei.flowtype));
        return new ValueType(jlayout, jflow);
    }
}
exports.ValueType = ValueType;
class ExpressionReturnResult {
    constructor(valtype, tval, expvar) {
        this.valtype = valtype;
        this.truthval = tval;
        this.expvar = expvar;
    }
    static join(assembly, expvar, ...args) {
        assert(args.length !== 0);
        const jtype = ValueType.join(assembly, ...args.map((ei) => ei.valtype));
        const jtv = FlowTypeTruthOps.join(...args.map((ei) => ei.truthval));
        return new ExpressionReturnResult(jtype, jtv, expvar);
    }
}
exports.ExpressionReturnResult = ExpressionReturnResult;
class VarInfo {
    constructor(dtype, isConst, isCaptured, mustDefined, ftype) {
        this.declaredType = dtype;
        this.flowType = ftype;
        this.isConst = isConst;
        this.isCaptured = isCaptured;
        this.mustDefined = mustDefined;
    }
    assign(ftype) {
        assert(!this.isConst);
        return new VarInfo(this.declaredType, this.isConst, this.isCaptured, true, ftype);
    }
    infer(ftype) {
        return new VarInfo(this.declaredType, this.isConst, this.isCaptured, true, ftype);
    }
    static join(assembly, ...values) {
        assert(values.length !== 0);
        const jdef = values.every((vi) => vi.mustDefined);
        const jtype = assembly.typeUpperBound(values.map((vi) => vi.flowType));
        return new VarInfo(values[0].declaredType, values[0].isConst, values[0].isCaptured, jdef, jtype);
    }
}
exports.VarInfo = VarInfo;
class TypeEnvironment {
    constructor(ikey, bodyid, terms, pcodes, args, locals, result, inferYield, expressionResult, rflow, yflow, frozenVars) {
        this.ikey = ikey;
        this.bodyid = bodyid;
        this.terms = terms;
        this.pcodes = pcodes;
        this.args = args;
        this.locals = locals;
        this.inferResult = result;
        this.inferYield = inferYield;
        this.expressionResult = expressionResult;
        this.returnResult = rflow;
        this.yieldResult = yflow;
        this.frozenVars = frozenVars;
    }
    updateVarInfo(name, nv) {
        if (this.getLocalVarInfo(name) !== undefined) {
            let localcopy = this.locals.map((frame) => frame.has(name) ? new Map(frame).set(name, nv) : new Map(frame));
            return new TypeEnvironment(this.ikey, this.bodyid, this.terms, this.pcodes, this.args, localcopy, this.inferResult, this.inferYield, this.expressionResult, this.returnResult, this.yieldResult, this.frozenVars);
        }
        else {
            const argscopy = new Map(this.args).set(name, nv);
            return new TypeEnvironment(this.ikey, this.bodyid, this.terms, this.pcodes, argscopy, this.locals, this.inferResult, this.inferYield, this.expressionResult, this.returnResult, this.yieldResult, this.frozenVars);
        }
    }
    static createInitialEnvForCall(ikey, bodyid, terms, pcodes, args, inferResult) {
        return new TypeEnvironment(ikey, bodyid, terms, pcodes, args, [new Map()], inferResult, [], undefined, undefined, undefined, new Set());
    }
    hasNormalFlow() {
        return this.locals !== undefined;
    }
    getExpressionResult() {
        assert(this.hasNormalFlow() && this.expressionResult !== undefined);
        return this.expressionResult;
    }
    inferVarsOfType(ftype, ...vars) {
        let cenv = this;
        for (let i = 0; i < vars.length; ++i) {
            const vv = vars[i];
            if (vv !== undefined) {
                cenv = cenv.updateVarInfo(vv, cenv.lookupVar(vv).infer(ftype));
            }
        }
        return cenv;
    }
    clearExpressionResult() {
        return new TypeEnvironment(this.ikey, this.bodyid, this.terms, this.pcodes, this.args, this.locals, this.inferResult, this.inferYield, undefined, this.returnResult, this.yieldResult, this.frozenVars);
    }
    setUniformResultExpression(etype, value) {
        assert(this.hasNormalFlow());
        const einfo = new ExpressionReturnResult(new ValueType(etype, etype), value || FlowTypeTruthValue.Unknown, undefined);
        return new TypeEnvironment(this.ikey, this.bodyid, this.terms, this.pcodes, this.args, this.locals, this.inferResult, this.inferYield, einfo, this.returnResult, this.yieldResult, this.frozenVars);
    }
    setBoolResultExpression(btype, value) {
        assert(this.hasNormalFlow());
        const einfo = new ExpressionReturnResult(ValueType.createUniform(btype), value || FlowTypeTruthValue.Unknown, undefined);
        return new TypeEnvironment(this.ikey, this.bodyid, this.terms, this.pcodes, this.args, this.locals, this.inferResult, this.inferYield, einfo, this.returnResult, this.yieldResult, this.frozenVars);
    }
    setVarResultExpression(layouttype, flowtype, vname) {
        assert(this.hasNormalFlow());
        const einfo = new ExpressionReturnResult(new ValueType(layouttype, flowtype), FlowTypeTruthValue.Unknown, vname);
        return new TypeEnvironment(this.ikey, this.bodyid, this.terms, this.pcodes, this.args, this.locals, this.inferResult, this.inferYield, einfo, this.returnResult, this.yieldResult, this.frozenVars);
    }
    updateResultExpression(layouttype, flowtype) {
        assert(this.hasNormalFlow());
        const einfo = new ExpressionReturnResult(new ValueType(layouttype, flowtype), this.getExpressionResult().truthval, this.getExpressionResult().expvar);
        return new TypeEnvironment(this.ikey, this.bodyid, this.terms, this.pcodes, this.args, this.locals, this.inferResult, this.inferYield, einfo, this.returnResult, this.yieldResult, this.frozenVars);
    }
    setResultExpression(layouttype, flowtype, value, vname) {
        assert(this.hasNormalFlow());
        const einfo = new ExpressionReturnResult(new ValueType(layouttype, flowtype), value || this.getExpressionResult().truthval, vname || this.getExpressionResult().expvar);
        return new TypeEnvironment(this.ikey, this.bodyid, this.terms, this.pcodes, this.args, this.locals, this.inferResult, this.inferYield, einfo, this.returnResult, this.yieldResult, this.frozenVars);
    }
    setResultExpressionWVarOpt(vtype, evar, value) {
        assert(this.hasNormalFlow());
        const rvalue = value || FlowTypeTruthValue.Unknown;
        const einfo = new ExpressionReturnResult(vtype, rvalue, evar);
        const nte = new TypeEnvironment(this.ikey, this.bodyid, this.terms, this.pcodes, this.args, this.locals, this.inferResult, this.inferYield, einfo, this.returnResult, this.yieldResult, this.frozenVars);
        return evar === undefined ? nte : nte.updateVarInfo(evar, nte.lookupVar(evar).infer(vtype.flowtype));
    }
    static convertToBoolFlowsOnResult(assembly, options) {
        assert(options.every((opt) => assembly.subtypeOf(opt.getExpressionResult().valtype.flowtype, assembly.getSpecialBoolType())));
        const tvals = options.filter((opt) => opt.getExpressionResult().truthval !== FlowTypeTruthValue.False)
            .map((opt) => opt.setResultExpressionWVarOpt(ValueType.createUniform(assembly.getSpecialBoolType()), opt.getExpressionResult().expvar, FlowTypeTruthValue.True));
        const fvals = options.filter((opt) => opt.getExpressionResult().truthval !== FlowTypeTruthValue.True)
            .map((opt) => opt.setResultExpressionWVarOpt(ValueType.createUniform(assembly.getSpecialBoolType()), opt.getExpressionResult().expvar, FlowTypeTruthValue.False));
        return { tenvs: tvals, fenvs: fvals };
    }
    static convertToTypeNotTypeFlowsOnResult(assembly, witht, options) {
        let tp = [];
        let fp = [];
        for (let i = 0; i < options.length; ++i) {
            const opt = options[i];
            const vtype = opt.getExpressionResult().valtype;
            const pccs = assembly.splitTypes(vtype.flowtype, witht);
            if (!pccs.tp.isEmptyType()) {
                tp.push(opt.setResultExpressionWVarOpt(vtype.inferFlow(pccs.tp), opt.getExpressionResult().expvar, opt.getExpressionResult().truthval));
            }
            if (!pccs.fp.isEmptyType()) {
                fp.push(opt.setResultExpressionWVarOpt(vtype.inferFlow(pccs.fp), opt.getExpressionResult().expvar, opt.getExpressionResult().truthval));
            }
        }
        return { tenvs: tp, fenvs: fp };
    }
    static convertToHasIndexNotHasIndexFlowsOnResult(assembly, idx, options) {
        let tp = [];
        let fp = [];
        for (let i = 0; i < options.length; ++i) {
            const opt = options[i];
            const vtype = opt.getExpressionResult().valtype;
            const pccs = assembly.splitIndex(vtype.flowtype, idx);
            if (!pccs.tp.isEmptyType()) {
                tp.push(opt.setResultExpressionWVarOpt(vtype.inferFlow(pccs.tp), opt.getExpressionResult().expvar));
            }
            if (!pccs.fp.isEmptyType()) {
                fp.push(opt.setResultExpressionWVarOpt(vtype.inferFlow(pccs.fp), opt.getExpressionResult().expvar));
            }
        }
        return { tenvs: tp, fenvs: fp };
    }
    static convertToHasIndexNotHasPropertyFlowsOnResult(assembly, pname, options) {
        let tp = [];
        let fp = [];
        for (let i = 0; i < options.length; ++i) {
            const opt = options[i];
            const vtype = opt.getExpressionResult().valtype;
            const pccs = assembly.splitProperty(vtype.flowtype, pname);
            if (!pccs.tp.isEmptyType()) {
                tp.push(opt.setResultExpressionWVarOpt(vtype.inferFlow(pccs.tp), opt.getExpressionResult().expvar));
            }
            if (!pccs.fp.isEmptyType()) {
                fp.push(opt.setResultExpressionWVarOpt(vtype.inferFlow(pccs.fp), opt.getExpressionResult().expvar));
            }
        }
        return { tenvs: tp, fenvs: fp };
    }
    setAbort() {
        assert(this.hasNormalFlow());
        return new TypeEnvironment(this.ikey, this.bodyid, this.terms, this.pcodes, this.args, undefined, this.inferResult, this.inferYield, this.expressionResult, this.returnResult, this.yieldResult, this.frozenVars);
    }
    setReturn(assembly, rtype) {
        assert(this.hasNormalFlow());
        const rrtype = this.returnResult !== undefined ? assembly.typeUpperBound([this.returnResult, rtype]) : rtype;
        return new TypeEnvironment(this.ikey, this.bodyid, this.terms, this.pcodes, this.args, undefined, this.inferResult, this.inferYield, this.expressionResult, rrtype, this.yieldResult, this.frozenVars);
    }
    setYield(assembly, ytype) {
        assert(this.hasNormalFlow());
        const rytype = this.yieldResult !== undefined ? assembly.typeUpperBound([this.yieldResult, ytype]) : ytype;
        return new TypeEnvironment(this.ikey, this.bodyid, this.terms, this.pcodes, this.args, undefined, this.inferResult, this.inferYield, this.expressionResult, this.returnResult, rytype, this.frozenVars);
    }
    pushLocalScope() {
        assert(this.hasNormalFlow());
        let localscopy = [...this.locals, new Map()];
        return new TypeEnvironment(this.ikey, this.bodyid, this.terms, this.pcodes, this.args, localscopy, this.inferResult, this.inferYield, this.expressionResult, this.returnResult, this.yieldResult, this.frozenVars);
    }
    popLocalScope() {
        let localscopy = this.locals !== undefined ? this.locals.slice(0, -1) : undefined;
        return new TypeEnvironment(this.ikey, this.bodyid, this.terms, this.pcodes, this.args, localscopy, this.inferResult, this.inferYield, this.expressionResult, this.returnResult, this.yieldResult, this.frozenVars);
    }
    isInYieldBlock() {
        return this.inferYield.length !== 0;
    }
    getLocalVarInfo(name) {
        const locals = this.locals;
        for (let i = locals.length - 1; i >= 0; --i) {
            if (locals[i].has(name)) {
                return locals[i].get(name);
            }
        }
        return undefined;
    }
    isVarNameDefined(name) {
        return this.getLocalVarInfo(name) !== undefined || this.args.has(name);
    }
    lookupVar(name) {
        return this.getLocalVarInfo(name) || this.args.get(name) || null;
    }
    lookupPCode(pc) {
        return this.pcodes.get(pc);
    }
    addVar(name, isConst, dtype, isDefined, infertype) {
        assert(this.hasNormalFlow());
        let localcopy = this.locals.map((frame) => new Map(frame));
        localcopy[localcopy.length - 1].set(name, new VarInfo(dtype, isConst, false, isDefined, infertype));
        return new TypeEnvironment(this.ikey, this.bodyid, this.terms, this.pcodes, this.args, localcopy, this.inferResult, this.inferYield, this.expressionResult, this.returnResult, this.yieldResult, this.frozenVars);
    }
    setVar(name, flowtype) {
        assert(this.hasNormalFlow());
        const oldv = this.lookupVar(name);
        const nv = oldv.assign(flowtype);
        let localcopy = this.locals.map((frame) => frame.has(name) ? new Map(frame).set(name, nv) : new Map(frame));
        return new TypeEnvironment(this.ikey, this.bodyid, this.terms, this.pcodes, this.args, localcopy, this.inferResult, this.inferYield, this.expressionResult, this.returnResult, this.yieldResult, this.frozenVars);
    }
    setRefVar(name) {
        assert(this.hasNormalFlow());
        const oldv = this.lookupVar(name);
        const nv = oldv.assign(oldv.declaredType);
        let localcopy = this.locals.map((frame) => frame.has(name) ? new Map(frame).set(name, nv) : new Map(frame));
        return new TypeEnvironment(this.ikey, this.bodyid, this.terms, this.pcodes, this.args, localcopy, this.inferResult, this.inferYield, this.expressionResult, this.returnResult, this.yieldResult, this.frozenVars);
    }
    multiVarUpdate(allDeclared, allAssigned) {
        assert(this.hasNormalFlow());
        let nenv = this;
        for (let i = 0; i < allDeclared.length; ++i) {
            const declv = allDeclared[i];
            nenv = nenv.addVar(declv[1], declv[0], declv[2], true, declv[3]);
        }
        for (let i = 0; i < allAssigned.length; ++i) {
            const assignv = allAssigned[i];
            nenv = nenv.setVar(assignv[0], assignv[1]);
        }
        return nenv;
    }
    getCurrentFrameNames() {
        let res = [];
        this.locals[this.locals.length - 1].forEach((v, k) => {
            res.push(k);
        });
        return res;
    }
    getAllLocalNames() {
        let names = new Set();
        this.locals.forEach((frame) => {
            frame.forEach((v, k) => {
                names.add(k);
            });
        });
        return names;
    }
    freezeVars(inferyield) {
        assert(this.hasNormalFlow());
        let svars = new Set();
        for (let i = 0; i < this.locals.length; ++i) {
            this.locals[i].forEach((v, k) => svars.add(k));
        }
        const iyeild = [...this.inferYield, inferyield];
        return new TypeEnvironment(this.ikey, this.bodyid, this.terms, this.pcodes, this.args, this.locals, this.inferResult, iyeild, this.expressionResult, this.returnResult, this.yieldResult, svars);
    }
    static join(assembly, ...opts) {
        assert(opts.length !== 0);
        if (opts.length === 1) {
            return opts[0];
        }
        else {
            const fopts = opts.filter((opt) => opt.locals !== undefined);
            let argnames = [];
            fopts.forEach((opt) => {
                opt.args.forEach((v, k) => argnames.push(k));
            });
            let args = fopts.length !== 0 ? new Map() : undefined;
            if (args !== undefined) {
                argnames.forEach((aname) => {
                    const vinfo = VarInfo.join(assembly, ...fopts.map((opt) => opt.args.get(aname)));
                    args.set(aname, vinfo);
                });
            }
            let locals = fopts.length !== 0 ? [] : undefined;
            if (locals !== undefined) {
                for (let i = 0; i < fopts[0].locals.length; ++i) {
                    let localsi = new Map();
                    fopts[0].locals[i].forEach((v, k) => {
                        localsi.set(k, VarInfo.join(assembly, ...fopts.map((opt) => opt.lookupVar(k))));
                    });
                    locals.push(localsi);
                }
            }
            const expresall = fopts.filter((opt) => opt.expressionResult !== undefined).map((opt) => opt.getExpressionResult());
            let expres = undefined;
            if (expresall.length !== 0) {
                const retype = ValueType.join(assembly, ...expresall.map((opt) => opt.valtype));
                const rflow = FlowTypeTruthOps.join(...expresall.map((opt) => opt.truthval));
                const evar = expresall.every((ee) => ee.expvar === expresall[0].expvar) ? expresall[0].expvar : undefined;
                expres = new ExpressionReturnResult(retype, rflow, evar);
            }
            const rflow = opts.filter((opt) => opt.returnResult !== undefined).map((opt) => opt.returnResult);
            const yflow = opts.filter((opt) => opt.yieldResult !== undefined).map((opt) => opt.yieldResult);
            return new TypeEnvironment(opts[0].ikey, opts[0].bodyid, opts[0].terms, opts[0].pcodes, args, locals, opts[0].inferResult, opts[0].inferYield, expres, rflow.length !== 0 ? assembly.typeUpperBound(rflow) : undefined, yflow.length !== 0 ? assembly.typeUpperBound(yflow) : undefined, opts[0].frozenVars);
        }
    }
}
exports.TypeEnvironment = TypeEnvironment;
//# sourceMappingURL=type_environment.js.map