"use strict";
//-------------------------------------------------------------------------------------------------------
// Copyright (C) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE.txt file in the project root for full license information.
//-------------------------------------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
exports.ssaConvertInvokes = void 0;
const assert = require("assert");
const mir_ops_1 = require("./mir_ops");
const mir_info_1 = require("./mir_info");
function convertToSSA(reg, oftype, ssastate) {
    if (!ssastate.ctrs.has(reg.nameID)) {
        ssastate.ctrs.set(reg.nameID, 0);
        ssastate.remap.set(reg.nameID, reg);
        ssastate.vartypes.set(reg.nameID, oftype);
        return reg;
    }
    else {
        const ssaCtr = ssastate.ctrs.get(reg.nameID) + 1;
        ssastate.ctrs.set(reg.nameID, ssaCtr);
        const vname = reg.nameID + `$${ssaCtr}`;
        ssastate.remap.set(reg.nameID, new mir_ops_1.MIRRegisterArgument(vname, reg.nameID));
        ssastate.vartypes.set(vname, oftype);
        return ssastate.remap.get(reg.nameID);
    }
}
function convertToSSA_Guard(guard, ssastate) {
    if (guard instanceof mir_ops_1.MIRMaskGuard) {
        return guard;
    }
    else {
        const vg = guard;
        if (vg.greg instanceof mir_ops_1.MIRRegisterArgument) {
            return new mir_ops_1.MIRArgGuard(convertToSSA(vg.greg, ssastate.booltype, ssastate));
        }
        else {
            return vg;
        }
    }
}
function processSSA_Use(arg, ssastate) {
    if (arg instanceof mir_ops_1.MIRRegisterArgument) {
        return ssastate.remap.get(arg.nameID) || arg;
    }
    else {
        return arg;
    }
}
function processSSAUse_RemapGuard(guard, ssastate) {
    if (guard === undefined) {
        return undefined;
    }
    else if (guard instanceof mir_ops_1.MIRMaskGuard) {
        return guard;
    }
    else {
        return new mir_ops_1.MIRArgGuard(processSSA_Use(guard.greg, ssastate));
    }
}
function processSSAUse_RemapStatementGuard(sguard, ssastate) {
    if (sguard === undefined) {
        return undefined;
    }
    else {
        const rguard = processSSAUse_RemapGuard(sguard.guard, ssastate);
        const ralt = sguard.defaultvar !== undefined ? processSSA_Use(sguard.defaultvar, ssastate) : undefined;
        return new mir_ops_1.MIRStatmentGuard(rguard, sguard.usedefault, ralt);
    }
}
function processSSAUse_RemapArgs(args, ssastate) {
    return args.map((v) => processSSA_Use(v, ssastate));
}
function processSSAUse_RemapStructuredArgs(args, remap) {
    return args.map((v) => remap(v));
}
function assignSSA(op, ssastate) {
    switch (op.tag) {
        case mir_ops_1.MIROpTag.MIRNop:
        case mir_ops_1.MIROpTag.MIRDeadFlow:
        case mir_ops_1.MIROpTag.MIRAbort:
        case mir_ops_1.MIROpTag.MIRDeclareGuardFlagLocation:
        case mir_ops_1.MIROpTag.MIRSetConstantGuardFlag:
        case mir_ops_1.MIROpTag.MIRVarLifetimeStart:
        case mir_ops_1.MIROpTag.MIRVarLifetimeEnd: {
            return op;
        }
        case mir_ops_1.MIROpTag.MIRAssertCheck: {
            const asrt = op;
            asrt.arg = processSSA_Use(asrt.arg, ssastate);
            return op;
        }
        case mir_ops_1.MIROpTag.MIRDebug: {
            const dbg = op;
            if (dbg.value !== undefined) {
                dbg.value = processSSA_Use(dbg.value, ssastate);
            }
            return op;
        }
        case mir_ops_1.MIROpTag.MIRLoadUnintVariableValue: {
            const luv = op;
            luv.trgt = convertToSSA(luv.trgt, luv.oftype, ssastate);
            return op;
        }
        case mir_ops_1.MIROpTag.MIRConvertValue: {
            const conv = op;
            conv.src = processSSA_Use(conv.src, ssastate);
            conv.sguard = processSSAUse_RemapStatementGuard(conv.sguard, ssastate);
            conv.trgt = convertToSSA(conv.trgt, conv.intotype, ssastate);
            return op;
        }
        case mir_ops_1.MIROpTag.MIRInject: {
            const inj = op;
            inj.src = processSSA_Use(inj.src, ssastate);
            inj.trgt = convertToSSA(inj.trgt, inj.intotype, ssastate);
            return op;
        }
        case mir_ops_1.MIROpTag.MIRGuardedOptionInject: {
            const inj = op;
            inj.src = processSSA_Use(inj.src, ssastate);
            inj.sguard = processSSAUse_RemapStatementGuard(inj.sguard, ssastate);
            inj.trgt = convertToSSA(inj.trgt, inj.optiontype, ssastate);
            return op;
        }
        case mir_ops_1.MIROpTag.MIRExtract: {
            const ext = op;
            ext.src = processSSA_Use(ext.src, ssastate);
            ext.trgt = convertToSSA(ext.trgt, ext.intotype, ssastate);
            return op;
        }
        case mir_ops_1.MIROpTag.MIRLoadConst: {
            const lc = op;
            lc.trgt = convertToSSA(lc.trgt, lc.consttype, ssastate);
            return op;
        }
        case mir_ops_1.MIROpTag.MIRTupleHasIndex: {
            const thi = op;
            thi.arg = processSSA_Use(thi.arg, ssastate);
            thi.trgt = convertToSSA(thi.trgt, ssastate.booltype, ssastate);
            return op;
        }
        case mir_ops_1.MIROpTag.MIRRecordHasProperty: {
            const rhi = op;
            rhi.arg = processSSA_Use(rhi.arg, ssastate);
            rhi.trgt = convertToSSA(rhi.trgt, ssastate.booltype, ssastate);
            return op;
        }
        case mir_ops_1.MIROpTag.MIRLoadTupleIndex: {
            const lti = op;
            lti.arg = processSSA_Use(lti.arg, ssastate);
            lti.trgt = convertToSSA(lti.trgt, lti.resulttype, ssastate);
            return op;
        }
        case mir_ops_1.MIROpTag.MIRLoadTupleIndexSetGuard: {
            const ltig = op;
            ltig.arg = processSSA_Use(ltig.arg, ssastate);
            ltig.guard = convertToSSA_Guard(ltig.guard, ssastate);
            ltig.trgt = convertToSSA(ltig.trgt, ltig.resulttype, ssastate);
            return op;
        }
        case mir_ops_1.MIROpTag.MIRLoadRecordProperty: {
            const lrp = op;
            lrp.arg = processSSA_Use(lrp.arg, ssastate);
            lrp.trgt = convertToSSA(lrp.trgt, lrp.resulttype, ssastate);
            return op;
        }
        case mir_ops_1.MIROpTag.MIRLoadRecordPropertySetGuard: {
            const lrpg = op;
            lrpg.arg = processSSA_Use(lrpg.arg, ssastate);
            lrpg.guard = convertToSSA_Guard(lrpg.guard, ssastate);
            lrpg.trgt = convertToSSA(lrpg.trgt, lrpg.resulttype, ssastate);
            return op;
        }
        case mir_ops_1.MIROpTag.MIRLoadField: {
            const lmf = op;
            lmf.arg = processSSA_Use(lmf.arg, ssastate);
            lmf.trgt = convertToSSA(lmf.trgt, lmf.resulttype, ssastate);
            return op;
        }
        case mir_ops_1.MIROpTag.MIRTupleProjectToEphemeral: {
            const pte = op;
            pte.arg = processSSA_Use(pte.arg, ssastate);
            pte.trgt = convertToSSA(pte.trgt, pte.epht, ssastate);
            return op;
        }
        case mir_ops_1.MIROpTag.MIRRecordProjectToEphemeral: {
            const pre = op;
            pre.arg = processSSA_Use(pre.arg, ssastate);
            pre.trgt = convertToSSA(pre.trgt, pre.epht, ssastate);
            return op;
        }
        case mir_ops_1.MIROpTag.MIREntityProjectToEphemeral: {
            const pee = op;
            pee.arg = processSSA_Use(pee.arg, ssastate);
            pee.trgt = convertToSSA(pee.trgt, pee.epht, ssastate);
            return op;
        }
        case mir_ops_1.MIROpTag.MIRTupleUpdate: {
            const mi = op;
            mi.arg = processSSA_Use(mi.arg, ssastate);
            mi.updates = processSSAUse_RemapStructuredArgs(mi.updates, (u) => [u[0], processSSA_Use(u[1], ssastate), u[2]]);
            mi.trgt = convertToSSA(mi.trgt, mi.argflowtype, ssastate);
            return op;
        }
        case mir_ops_1.MIROpTag.MIRRecordUpdate: {
            const mp = op;
            mp.arg = processSSA_Use(mp.arg, ssastate);
            mp.updates = processSSAUse_RemapStructuredArgs(mp.updates, (u) => [u[0], processSSA_Use(u[1], ssastate), u[2]]);
            mp.trgt = convertToSSA(mp.trgt, mp.argflowtype, ssastate);
            return op;
        }
        case mir_ops_1.MIROpTag.MIREntityUpdate: {
            const mf = op;
            mf.arg = processSSA_Use(mf.arg, ssastate);
            mf.updates = processSSAUse_RemapStructuredArgs(mf.updates, (u) => [u[0], processSSA_Use(u[1], ssastate), u[2]]);
            mf.trgt = convertToSSA(mf.trgt, mf.argflowtype, ssastate);
            return op;
        }
        case mir_ops_1.MIROpTag.MIRLoadFromEpehmeralList: {
            const mle = op;
            mle.arg = processSSA_Use(mle.arg, ssastate);
            mle.trgt = convertToSSA(mle.trgt, mle.resulttype, ssastate);
            return op;
        }
        case mir_ops_1.MIROpTag.MIRMultiLoadFromEpehmeralList: {
            const mle = op;
            mle.arg = processSSA_Use(mle.arg, ssastate);
            mle.trgts.forEach((trgt) => {
                trgt.into = convertToSSA(trgt.into, trgt.oftype, ssastate);
            });
            return op;
        }
        case mir_ops_1.MIROpTag.MIRSliceEpehmeralList: {
            const mle = op;
            mle.arg = processSSA_Use(mle.arg, ssastate);
            mle.trgt = convertToSSA(mle.trgt, mle.sltype, ssastate);
            return op;
        }
        case mir_ops_1.MIROpTag.MIRInvokeFixedFunction: {
            const invk = op;
            invk.args = processSSAUse_RemapArgs(invk.args, ssastate);
            invk.sguard = processSSAUse_RemapStatementGuard(invk.sguard, ssastate);
            invk.trgt = convertToSSA(invk.trgt, invk.resultType, ssastate);
            return op;
        }
        case mir_ops_1.MIROpTag.MIRInvokeVirtualFunction: {
            const invk = op;
            invk.args = processSSAUse_RemapArgs(invk.args, ssastate);
            invk.trgt = convertToSSA(invk.trgt, invk.resultType, ssastate);
            return op;
        }
        case mir_ops_1.MIROpTag.MIRInvokeVirtualOperator: {
            const invk = op;
            invk.args = processSSAUse_RemapStructuredArgs(invk.args, (u) => {
                return { arglayouttype: u.arglayouttype, argflowtype: u.argflowtype, arg: processSSA_Use(u.arg, ssastate) };
            });
            invk.trgt = convertToSSA(invk.trgt, invk.resultType, ssastate);
            return op;
        }
        case mir_ops_1.MIROpTag.MIRConstructorTuple: {
            const tc = op;
            tc.args = processSSAUse_RemapArgs(tc.args, ssastate);
            tc.trgt = convertToSSA(tc.trgt, tc.resultTupleType, ssastate);
            return op;
        }
        case mir_ops_1.MIROpTag.MIRConstructorTupleFromEphemeralList: {
            const tc = op;
            tc.arg = processSSA_Use(tc.arg, ssastate);
            tc.trgt = convertToSSA(tc.trgt, tc.resultTupleType, ssastate);
            return op;
        }
        case mir_ops_1.MIROpTag.MIRConstructorRecord: {
            const tc = op;
            tc.args = processSSAUse_RemapStructuredArgs(tc.args, (v) => [v[0], processSSA_Use(v[1], ssastate)]);
            tc.trgt = convertToSSA(tc.trgt, tc.resultRecordType, ssastate);
            return op;
        }
        case mir_ops_1.MIROpTag.MIRConstructorRecordFromEphemeralList: {
            const tc = op;
            tc.arg = processSSA_Use(tc.arg, ssastate);
            tc.trgt = convertToSSA(tc.trgt, tc.resultRecordType, ssastate);
            return op;
        }
        case mir_ops_1.MIROpTag.MIRStructuredAppendTuple: {
            const at = op;
            at.args = processSSAUse_RemapArgs(at.args, ssastate);
            at.trgt = convertToSSA(at.trgt, at.resultTupleType, ssastate);
            return op;
        }
        case mir_ops_1.MIROpTag.MIRStructuredJoinRecord: {
            const sj = op;
            sj.args = processSSAUse_RemapArgs(sj.args, ssastate);
            sj.trgt = convertToSSA(sj.trgt, sj.resultRecordType, ssastate);
            return op;
        }
        case mir_ops_1.MIROpTag.MIRConstructorEphemeralList: {
            const tc = op;
            tc.args = processSSAUse_RemapArgs(tc.args, ssastate);
            tc.trgt = convertToSSA(tc.trgt, tc.resultEphemeralListType, ssastate);
            return op;
        }
        case mir_ops_1.MIROpTag.MIREphemeralListExtend: {
            const pse = op;
            pse.arg = processSSA_Use(pse.arg, ssastate);
            pse.ext = processSSAUse_RemapArgs(pse.ext, ssastate);
            pse.trgt = convertToSSA(pse.trgt, pse.resultType, ssastate);
            return op;
        }
        case mir_ops_1.MIROpTag.MIRConstructorPrimaryCollectionEmpty: {
            const cc = op;
            cc.trgt = convertToSSA(cc.trgt, cc.tkey, ssastate);
            return op;
        }
        case mir_ops_1.MIROpTag.MIRConstructorPrimaryCollectionSingletons: {
            const cc = op;
            cc.args = processSSAUse_RemapStructuredArgs(cc.args, (v) => [v[0], processSSA_Use(v[1], ssastate)]);
            cc.trgt = convertToSSA(cc.trgt, cc.tkey, ssastate);
            return op;
        }
        case mir_ops_1.MIROpTag.MIRConstructorPrimaryCollectionCopies: {
            const cc = op;
            cc.args = processSSAUse_RemapStructuredArgs(cc.args, (v) => [v[0], processSSA_Use(v[1], ssastate)]);
            cc.trgt = convertToSSA(cc.trgt, cc.tkey, ssastate);
            return op;
        }
        case mir_ops_1.MIROpTag.MIRConstructorPrimaryCollectionMixed: {
            const cc = op;
            cc.args = processSSAUse_RemapStructuredArgs(cc.args, (v) => [v[0], v[1], processSSA_Use(v[2], ssastate)]);
            cc.trgt = convertToSSA(cc.trgt, cc.tkey, ssastate);
            return op;
        }
        case mir_ops_1.MIROpTag.MIRBinKeyEq: {
            const beq = op;
            beq.lhs = processSSA_Use(beq.lhs, ssastate);
            beq.rhs = processSSA_Use(beq.rhs, ssastate);
            beq.sguard = processSSAUse_RemapStatementGuard(beq.sguard, ssastate);
            beq.trgt = convertToSSA(beq.trgt, ssastate.booltype, ssastate);
            return op;
        }
        case mir_ops_1.MIROpTag.MIRBinKeyLess: {
            const bl = op;
            bl.lhs = processSSA_Use(bl.lhs, ssastate);
            bl.rhs = processSSA_Use(bl.rhs, ssastate);
            bl.sguard = processSSAUse_RemapStatementGuard(bl.sguard, ssastate);
            bl.trgt = convertToSSA(bl.trgt, ssastate.booltype, ssastate);
            return op;
        }
        case mir_ops_1.MIROpTag.MIRPrefixNotOp: {
            const pfx = op;
            pfx.arg = processSSA_Use(pfx.arg, ssastate);
            pfx.trgt = convertToSSA(pfx.trgt, ssastate.booltype, ssastate);
            return op;
        }
        case mir_ops_1.MIROpTag.MIRIsTypeOf: {
            const it = op;
            it.arg = processSSA_Use(it.arg, ssastate);
            it.sguard = processSSAUse_RemapStatementGuard(it.sguard, ssastate);
            it.trgt = convertToSSA(it.trgt, ssastate.booltype, ssastate);
            return op;
        }
        case mir_ops_1.MIROpTag.MIRJump: {
            return op;
        }
        case mir_ops_1.MIROpTag.MIRJumpCond: {
            const cjop = op;
            cjop.arg = processSSA_Use(cjop.arg, ssastate);
            return op;
        }
        case mir_ops_1.MIROpTag.MIRJumpNone: {
            const njop = op;
            njop.arg = processSSA_Use(njop.arg, ssastate);
            return op;
        }
        case mir_ops_1.MIROpTag.MIRRegisterAssign: {
            const regop = op;
            regop.src = processSSA_Use(regop.src, ssastate);
            regop.sguard = processSSAUse_RemapStatementGuard(regop.sguard, ssastate);
            regop.trgt = convertToSSA(regop.trgt, regop.layouttype, ssastate);
            return op;
        }
        case mir_ops_1.MIROpTag.MIRReturnAssign: {
            const ra = op;
            ra.src = processSSA_Use(ra.src, ssastate);
            ra.name = convertToSSA(ra.name, ra.oftype, ssastate);
            return op;
        }
        case mir_ops_1.MIROpTag.MIRReturnAssignOfCons: {
            const ra = op;
            ra.args = processSSAUse_RemapArgs(ra.args, ssastate);
            ra.name = convertToSSA(ra.name, ra.oftype, ssastate);
            return op;
        }
        case mir_ops_1.MIROpTag.MIRPhi: {
            assert(false);
            return op;
        }
        default: {
            assert(false);
            return op;
        }
    }
}
function generatePhi(sinfo, lv, opts, ssastate) {
    let vassign = new Map();
    opts.forEach((e) => vassign.set(e[0], e[1]));
    const ptype = ssastate.vartypes.get(opts[0][1].nameID);
    assert(opts.every((opt) => ssastate.vartypes.get(opt[1].nameID) === ptype));
    const nlv = convertToSSA(lv, ptype, ssastate);
    return new mir_ops_1.MIRPhi(sinfo, vassign, ptype, nlv);
}
function computePhis(sinfo, block, ssastate, remapped, links, live) {
    let remap = new Map();
    let phis = [];
    live.get(block).liveEntry.forEach((v, n) => {
        const preds = links.get(block).preds;
        let phiOpts = [];
        let uniqueOpts = new Map();
        preds.forEach((pred) => {
            const pm = remapped.get(pred);
            const mreg = pm.get(n);
            uniqueOpts.set(mreg.nameID, mreg);
            phiOpts.push([pred, mreg]);
        });
        if (uniqueOpts.size === 1) {
            const rmp = [...uniqueOpts][0][1];
            remap.set(n, rmp);
        }
        else {
            const phi = generatePhi(sinfo, v, phiOpts, ssastate);
            phis.push(phi);
            remap.set(n, phi.trgt);
        }
    });
    return [phis, remap];
}
function convertBodyToSSA(body, booltype, args) {
    const blocks = body.body;
    const links = mir_info_1.computeBlockLinks(blocks);
    const live = mir_info_1.computeBlockLiveVars(blocks);
    const torder = mir_info_1.topologicalOrder(blocks);
    let remapped = new Map();
    let ssastate = {
        booltype: booltype.typeID,
        remap: new Map(),
        ctrs: new Map(),
        vartypes: new Map()
    };
    for (let j = 0; j < torder.length; ++j) {
        const block = torder[j];
        if (block.label === "entry") {
            args.forEach((arg, name) => ssastate.remap.set(name, new mir_ops_1.MIRRegisterArgument(name)));
            ssastate.remap.set("$__ir_ret__", new mir_ops_1.MIRRegisterArgument("$__ir_ret__"));
            ssastate.remap.set("$$return", new mir_ops_1.MIRRegisterArgument("$$return"));
            for (let i = 0; i < block.ops.length; ++i) {
                block.ops[i] = assignSSA(block.ops[i], ssastate);
            }
            remapped.set(block.label, ssastate.remap);
        }
        else {
            const [phis, remap] = computePhis(body.sinfo, block.label, ssastate, remapped, links, live);
            ssastate.remap = remap;
            for (let i = 0; i < block.ops.length; ++i) {
                assignSSA(block.ops[i], ssastate);
            }
            block.ops.unshift(...phis);
            remapped.set(block.label, ssastate.remap);
        }
    }
}
function ssaConvertInvokes(masm) {
    masm.invokeDecls.forEach((inv) => {
        let args = new Map();
        inv.params.forEach((p) => {
            args.set(p.name, masm.typeMap.get(p.type));
        });
        convertBodyToSSA(inv.body, masm.typeMap.get("NSCore::Bool"), args);
    });
}
exports.ssaConvertInvokes = ssaConvertInvokes;
//# sourceMappingURL=mir_ssa.js.map