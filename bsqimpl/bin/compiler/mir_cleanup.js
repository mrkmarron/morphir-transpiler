"use strict";
//-------------------------------------------------------------------------------------------------------
// Copyright (C) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE.txt file in the project root for full license information.
//-------------------------------------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
exports.simplifyBody = void 0;
const assert = require("assert");
const mir_ops_1 = require("./mir_ops");
function getEmptyBlocks(b) {
    return [...b.body].filter((b) => b[0] !== "entry" && b[0] !== "exit" && b[0] !== "returnassign" && b[1].ops.length === 0).map((b) => b[1]);
}
function cleanDeadBlocks(b) {
    const allempty = getEmptyBlocks(b);
    allempty.forEach((bb) => b.body.delete(bb.label));
    let dblock = [...b.body].find((bb) => bb[1].ops.some((op) => op.tag === mir_ops_1.MIROpTag.MIRDeadFlow));
    while (dblock !== undefined) {
        const rblock = dblock;
        b.body.delete(rblock[0]);
        b.body.forEach((bb) => {
            const jidx = bb.ops.length - 1;
            if (jidx >= 0) {
                const jop = bb.ops[jidx];
                if (jop instanceof mir_ops_1.MIRJumpCond && (jop.trueblock === rblock[0] || jop.falseblock === rblock[0])) {
                    const ujop = new mir_ops_1.MIRJump(jop.sinfo, jop.trueblock !== rblock[0] ? jop.trueblock : jop.falseblock);
                    bb.ops[jidx] = ujop;
                }
                else if (jop instanceof mir_ops_1.MIRJumpNone && (jop.noneblock === rblock[0] || jop.someblock === rblock[0])) {
                    const ujop = new mir_ops_1.MIRJump(jop.sinfo, jop.noneblock !== rblock[0] ? jop.noneblock : jop.someblock);
                    bb.ops[jidx] = ujop;
                }
                else {
                    ;
                }
            }
        });
        dblock = [...b.body].find((bb) => bb[1].ops.some((op) => op.tag === mir_ops_1.MIROpTag.MIRDeadFlow));
    }
}
function propagateAssign_Bind(treg, arg, propMap) {
    assert(!propMap.has(treg.nameID));
    propMap.set(treg.nameID, arg);
}
function propagateAssign_Kill(arg, propMap) {
    let killset = new Set();
    propMap.forEach((v, k) => {
        if (v instanceof mir_ops_1.MIRRegisterArgument && v.nameID === arg.nameID) {
            killset.add(k);
        }
    });
    killset.forEach((k) => propMap.delete(k));
}
function propagateAssign_Remap(arg, propMap) {
    return (arg instanceof mir_ops_1.MIRRegisterArgument && propMap.has(arg.nameID)) ? propMap.get(arg.nameID) : arg;
}
function propagateAssign_RemapGuard(arg, propMap) {
    if (arg === undefined) {
        return arg;
    }
    else if (arg instanceof mir_ops_1.MIRMaskGuard) {
        return arg;
    }
    else {
        return new mir_ops_1.MIRArgGuard(propagateAssign_Remap(arg.greg, propMap));
    }
}
function propagateAssign_RemapStatementGuard(arg, propMap) {
    if (arg === undefined) {
        return arg;
    }
    else {
        const rguard = propagateAssign_RemapGuard(arg.guard, propMap);
        const ralt = arg.defaultvar !== undefined ? propagateAssign_Remap(arg.defaultvar, propMap) : undefined;
        return new mir_ops_1.MIRStatmentGuard(rguard, arg.usedefault, ralt);
    }
}
function propagateAssign_RemapArgs(args, propMap) {
    return args.map((v) => propagateAssign_Remap(v, propMap));
}
function propagateAssign_RemapStructuredArgs(args, remap) {
    return args.map((v) => remap(v));
}
function propagateAssignForOp(op, propMap) {
    switch (op.tag) {
        case mir_ops_1.MIROpTag.MIRNop:
        case mir_ops_1.MIROpTag.MIRDeadFlow:
        case mir_ops_1.MIROpTag.MIRAbort:
        case mir_ops_1.MIROpTag.MIRLoadUnintVariableValue:
        case mir_ops_1.MIROpTag.MIRDeclareGuardFlagLocation:
        case mir_ops_1.MIROpTag.MIRSetConstantGuardFlag:
        case mir_ops_1.MIROpTag.MIRLoadConst:
        case mir_ops_1.MIROpTag.MIRVarLifetimeStart:
        case mir_ops_1.MIROpTag.MIRVarLifetimeEnd: {
            break;
        }
        case mir_ops_1.MIROpTag.MIRAssertCheck: {
            const asrt = op;
            asrt.arg = propagateAssign_Remap(asrt.arg, propMap);
        }
        case mir_ops_1.MIROpTag.MIRDebug: {
            const dbg = op;
            if (dbg.value !== undefined) {
                dbg.value = propagateAssign_Remap(dbg.value, propMap);
            }
            break;
        }
        case mir_ops_1.MIROpTag.MIRConvertValue: {
            const conv = op;
            conv.src = propagateAssign_Remap(conv.src, propMap);
            conv.sguard = propagateAssign_RemapStatementGuard(conv.sguard, propMap);
            break;
        }
        case mir_ops_1.MIROpTag.MIRInject: {
            const inj = op;
            inj.src = propagateAssign_Remap(inj.src, propMap);
            break;
        }
        case mir_ops_1.MIROpTag.MIRGuardedOptionInject: {
            const inj = op;
            inj.src = propagateAssign_Remap(inj.src, propMap);
            inj.sguard = propagateAssign_RemapStatementGuard(inj.sguard, propMap);
            break;
        }
        case mir_ops_1.MIROpTag.MIRExtract: {
            const ext = op;
            ext.src = propagateAssign_Remap(ext.src, propMap);
            break;
        }
        case mir_ops_1.MIROpTag.MIRTupleHasIndex: {
            const thi = op;
            thi.arg = propagateAssign_Remap(thi.arg, propMap);
            break;
        }
        case mir_ops_1.MIROpTag.MIRRecordHasProperty: {
            const rhi = op;
            rhi.arg = propagateAssign_Remap(rhi.arg, propMap);
            break;
        }
        case mir_ops_1.MIROpTag.MIRLoadTupleIndex: {
            const lti = op;
            lti.arg = propagateAssign_Remap(lti.arg, propMap);
            break;
        }
        case mir_ops_1.MIROpTag.MIRLoadTupleIndexSetGuard: {
            const ltig = op;
            ltig.arg = propagateAssign_Remap(ltig.arg, propMap);
            break;
        }
        case mir_ops_1.MIROpTag.MIRLoadRecordProperty: {
            const lrp = op;
            lrp.arg = propagateAssign_Remap(lrp.arg, propMap);
            break;
        }
        case mir_ops_1.MIROpTag.MIRLoadRecordPropertySetGuard: {
            const lrpg = op;
            lrpg.arg = propagateAssign_Remap(lrpg.arg, propMap);
            break;
        }
        case mir_ops_1.MIROpTag.MIRLoadField: {
            const lmf = op;
            lmf.arg = propagateAssign_Remap(lmf.arg, propMap);
            break;
        }
        case mir_ops_1.MIROpTag.MIRTupleProjectToEphemeral: {
            const pte = op;
            pte.arg = propagateAssign_Remap(pte.arg, propMap);
            break;
        }
        case mir_ops_1.MIROpTag.MIRRecordProjectToEphemeral: {
            const pre = op;
            pre.arg = propagateAssign_Remap(pre.arg, propMap);
            break;
        }
        case mir_ops_1.MIROpTag.MIREntityProjectToEphemeral: {
            const pee = op;
            pee.arg = propagateAssign_Remap(pee.arg, propMap);
            break;
        }
        case mir_ops_1.MIROpTag.MIRTupleUpdate: {
            const mi = op;
            mi.arg = propagateAssign_Remap(mi.arg, propMap);
            mi.updates = propagateAssign_RemapStructuredArgs(mi.updates, (u) => [u[0], propagateAssign_Remap(u[1], propMap), u[2]]);
            break;
        }
        case mir_ops_1.MIROpTag.MIRRecordUpdate: {
            const mp = op;
            mp.arg = propagateAssign_Remap(mp.arg, propMap);
            mp.updates = propagateAssign_RemapStructuredArgs(mp.updates, (u) => [u[0], propagateAssign_Remap(u[1], propMap), u[2]]);
            break;
        }
        case mir_ops_1.MIROpTag.MIREntityUpdate: {
            const mf = op;
            mf.arg = propagateAssign_Remap(mf.arg, propMap);
            mf.updates = propagateAssign_RemapStructuredArgs(mf.updates, (u) => [u[0], propagateAssign_Remap(u[1], propMap), u[2]]);
            break;
        }
        case mir_ops_1.MIROpTag.MIRLoadFromEpehmeralList: {
            const mle = op;
            mle.arg = propagateAssign_Remap(mle.arg, propMap);
            break;
        }
        case mir_ops_1.MIROpTag.MIRMultiLoadFromEpehmeralList: {
            const mle = op;
            mle.arg = propagateAssign_Remap(mle.arg, propMap);
            break;
        }
        case mir_ops_1.MIROpTag.MIRSliceEpehmeralList: {
            const mle = op;
            mle.arg = propagateAssign_Remap(mle.arg, propMap);
            break;
        }
        case mir_ops_1.MIROpTag.MIRInvokeFixedFunction: {
            const invk = op;
            invk.args = propagateAssign_RemapArgs(invk.args, propMap);
            invk.sguard = propagateAssign_RemapStatementGuard(invk.sguard, propMap);
            break;
        }
        case mir_ops_1.MIROpTag.MIRInvokeVirtualFunction: {
            const invk = op;
            invk.args = propagateAssign_RemapArgs(invk.args, propMap);
            break;
        }
        case mir_ops_1.MIROpTag.MIRInvokeVirtualOperator: {
            const invk = op;
            invk.args = propagateAssign_RemapStructuredArgs(invk.args, (u) => {
                return { arglayouttype: u.arglayouttype, argflowtype: u.argflowtype, arg: propagateAssign_Remap(u.arg, propMap) };
            });
            break;
        }
        case mir_ops_1.MIROpTag.MIRConstructorTuple: {
            const tc = op;
            tc.args = propagateAssign_RemapArgs(tc.args, propMap);
            break;
        }
        case mir_ops_1.MIROpTag.MIRConstructorTupleFromEphemeralList: {
            const tc = op;
            tc.arg = propagateAssign_Remap(tc.arg, propMap);
            break;
        }
        case mir_ops_1.MIROpTag.MIRConstructorRecord: {
            const tc = op;
            tc.args = propagateAssign_RemapStructuredArgs(tc.args, (v) => [v[0], propagateAssign_Remap(v[1], propMap)]);
            break;
        }
        case mir_ops_1.MIROpTag.MIRConstructorRecordFromEphemeralList: {
            const tc = op;
            tc.arg = propagateAssign_Remap(tc.arg, propMap);
            break;
        }
        case mir_ops_1.MIROpTag.MIRStructuredAppendTuple: {
            const at = op;
            at.args = propagateAssign_RemapArgs(at.args, propMap);
            break;
        }
        case mir_ops_1.MIROpTag.MIRStructuredJoinRecord: {
            const sj = op;
            sj.args = propagateAssign_RemapArgs(sj.args, propMap);
            break;
        }
        case mir_ops_1.MIROpTag.MIRConstructorEphemeralList: {
            const tc = op;
            tc.args = propagateAssign_RemapArgs(tc.args, propMap);
            break;
        }
        case mir_ops_1.MIROpTag.MIREphemeralListExtend: {
            const pse = op;
            pse.arg = propagateAssign_Remap(pse.arg, propMap);
            pse.ext = propagateAssign_RemapArgs(pse.ext, propMap);
            break;
        }
        case mir_ops_1.MIROpTag.MIRConstructorPrimaryCollectionEmpty: {
            break;
        }
        case mir_ops_1.MIROpTag.MIRConstructorPrimaryCollectionSingletons: {
            const cc = op;
            cc.args = propagateAssign_RemapStructuredArgs(cc.args, (v) => [v[0], propagateAssign_Remap(v[1], propMap)]);
            break;
        }
        case mir_ops_1.MIROpTag.MIRConstructorPrimaryCollectionCopies: {
            const cc = op;
            cc.args = propagateAssign_RemapStructuredArgs(cc.args, (v) => [v[0], propagateAssign_Remap(v[1], propMap)]);
            break;
        }
        case mir_ops_1.MIROpTag.MIRConstructorPrimaryCollectionMixed: {
            const cc = op;
            cc.args = propagateAssign_RemapStructuredArgs(cc.args, (v) => [v[0], v[1], propagateAssign_Remap(v[2], propMap)]);
            break;
        }
        case mir_ops_1.MIROpTag.MIRBinKeyEq: {
            const beq = op;
            beq.lhs = propagateAssign_Remap(beq.lhs, propMap);
            beq.rhs = propagateAssign_Remap(beq.rhs, propMap);
            beq.sguard = propagateAssign_RemapStatementGuard(beq.sguard, propMap);
            break;
        }
        case mir_ops_1.MIROpTag.MIRBinKeyLess: {
            const bl = op;
            bl.lhs = propagateAssign_Remap(bl.lhs, propMap);
            bl.rhs = propagateAssign_Remap(bl.rhs, propMap);
            bl.sguard = propagateAssign_RemapStatementGuard(bl.sguard, propMap);
            break;
        }
        case mir_ops_1.MIROpTag.MIRPrefixNotOp: {
            const pfx = op;
            pfx.arg = propagateAssign_Remap(pfx.arg, propMap);
            break;
        }
        case mir_ops_1.MIROpTag.MIRIsTypeOf: {
            const it = op;
            it.arg = propagateAssign_Remap(it.arg, propMap);
            it.sguard = propagateAssign_RemapStatementGuard(it.sguard, propMap);
            break;
        }
        case mir_ops_1.MIROpTag.MIRJump: {
            break;
        }
        case mir_ops_1.MIROpTag.MIRJumpCond: {
            const cjop = op;
            cjop.arg = propagateAssign_Remap(cjop.arg, propMap);
            break;
        }
        case mir_ops_1.MIROpTag.MIRJumpNone: {
            const njop = op;
            njop.arg = propagateAssign_Remap(njop.arg, propMap);
            break;
        }
        case mir_ops_1.MIROpTag.MIRRegisterAssign: {
            const regop = op;
            regop.src = propagateAssign_Remap(regop.src, propMap);
            regop.sguard = propagateAssign_RemapStatementGuard(regop.sguard, propMap);
            break;
        }
        case mir_ops_1.MIROpTag.MIRReturnAssign: {
            const ra = op;
            ra.src = propagateAssign_Remap(ra.src, propMap);
            break;
        }
        case mir_ops_1.MIROpTag.MIRReturnAssignOfCons: {
            const ra = op;
            ra.args = propagateAssign_RemapArgs(ra.args, propMap);
            break;
        }
        case mir_ops_1.MIROpTag.MIRPhi: {
            const mp = op;
            mp.src;
            break;
        }
        default: {
            assert(false);
            break;
        }
    }
    const ks = op.getModVars();
    ks.forEach((kv) => propagateAssign_Kill(kv, propMap));
    switch (op.tag) {
        case mir_ops_1.MIROpTag.MIRLoadConst: {
            const lc = op;
            propagateAssign_Bind(lc.trgt, lc.src, propMap);
            break;
        }
        case mir_ops_1.MIROpTag.MIRRegisterAssign: {
            const regop = op;
            if (regop.sguard === undefined) {
                propagateAssign_Bind(regop.trgt, regop.src, propMap);
            }
            break;
        }
        default: {
            break;
        }
    }
}
function propagateAssignForBody(body) {
    if (typeof (body) === "string") {
        return;
    }
    body.body.forEach((blk) => {
        let propMap = new Map();
        for (let i = 0; i < blk.ops.length; ++i) {
            propagateAssignForOp(blk.ops[i], propMap);
        }
    });
}
function computeTempUseForBody(body) {
    if (typeof (body) === "string") {
        return new Set();
    }
    let usedTemps = new Set();
    body.body.forEach((blk) => {
        for (let i = 0; i < blk.ops.length; ++i) {
            const optmps = blk.ops[i].getUsedVars().filter((arg) => arg instanceof mir_ops_1.MIRRegisterArgument);
            for (let j = 0; j < optmps.length; ++j) {
                usedTemps.add(optmps[j].nameID);
            }
        }
    });
    return usedTemps;
}
function removeSelfAssigns(body) {
    body.body.forEach((blk, tag) => {
        const nblock = blk.ops.filter((op) => {
            if (op instanceof mir_ops_1.MIRRegisterAssign) {
                return op.trgt.nameID !== op.src.nameID || op.sguard !== undefined;
            }
            else {
                return true;
            }
        });
        blk.ops = nblock;
    });
}
function isDeadTempAssign(op, liveTemps) {
    switch (op.tag) {
        case mir_ops_1.MIROpTag.MIRLoadConst:
        case mir_ops_1.MIROpTag.MIRRegisterAssign: {
            return op.getModVars().every((mv) => mv instanceof mir_ops_1.MIRRegisterArgument && mv.nameID.startsWith("@tmp") && !liveTemps.has(mv.nameID));
        }
        default:
            return false;
    }
}
function removeDeadTempAssignsFromBody(body) {
    let oldLiveSize = Number.MAX_SAFE_INTEGER;
    let liveTemps = computeTempUseForBody(body);
    while (liveTemps.size < oldLiveSize) {
        let nbody = new Map();
        body.body.forEach((blk, id) => {
            const ops = blk.ops.filter((op) => !isDeadTempAssign(op, liveTemps));
            nbody.set(id, new mir_ops_1.MIRBasicBlock(id, ops));
        });
        body.body = nbody;
        oldLiveSize = liveTemps.size;
        liveTemps = computeTempUseForBody(body);
    }
}
function simplifyBody(body) {
    if (typeof (body) === "string") {
        return;
    }
    cleanDeadBlocks(body);
    propagateAssignForBody(body);
    removeSelfAssigns(body);
    removeDeadTempAssignsFromBody(body);
}
exports.simplifyBody = simplifyBody;
//# sourceMappingURL=mir_cleanup.js.map