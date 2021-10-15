"use strict";
//-------------------------------------------------------------------------------------------------------
// Copyright (C) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE.txt file in the project root for full license information.
//-------------------------------------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeMaxConstantSize = exports.computeVarTypes = exports.computeBlockLiveVars = exports.computeBlockLinks = exports.topologicalOrder = exports.computeDominators = void 0;
const mir_ops_1 = require("./mir_ops");
function computeBlockLinks(blocks) {
    let links = new Map();
    let done = new Set();
    let worklist = ["entry"];
    while (worklist.length !== 0) {
        const bb = worklist.shift();
        const block = blocks.get(bb);
        if (block.ops.length === 0) {
            continue;
        }
        let link = links.get(bb) || { label: bb, succs: new Set(), preds: new Set() };
        if (!links.has(bb)) {
            links.set(bb, link);
        }
        const jop = block.ops[block.ops.length - 1];
        if (jop.tag === mir_ops_1.MIROpTag.MIRJump) {
            const jmp = jop;
            link.succs.add(jmp.trgtblock);
        }
        else if (jop.tag === mir_ops_1.MIROpTag.MIRJumpCond) {
            const jmp = jop;
            link.succs.add(jmp.trueblock);
            link.succs.add(jmp.falseblock);
        }
        else if (jop.tag === mir_ops_1.MIROpTag.MIRJumpNone) {
            const jmp = jop;
            link.succs.add(jmp.someblock);
            link.succs.add(jmp.noneblock);
        }
        else {
            //nothing to do here
        }
        done.add(bb);
        link.succs.forEach((succ) => {
            if (!done.has(succ) && !worklist.includes(succ)) {
                worklist.push(succ);
            }
            if (!links.has(succ)) {
                links.set(succ, { label: succ, succs: new Set(), preds: new Set() });
            }
            let slink = links.get(succ);
            slink.preds.add(bb);
        });
    }
    return links;
}
exports.computeBlockLinks = computeBlockLinks;
function computeDominators(blocks) {
    let allNodes = [];
    let allNonEntryNodes = [];
    blocks.forEach((v, k) => {
        allNodes.push(v);
        if (k !== "entry") {
            allNonEntryNodes.push(v);
        }
    });
    const flow = computeBlockLinks(blocks);
    let dom = new Map().set("entry", [blocks.get("entry")]);
    allNonEntryNodes.forEach((n) => dom.set(n.label, [...allNodes]));
    let changed = true;
    while (changed) {
        for (let i = 0; i < allNonEntryNodes.length; ++i) {
            const n = allNonEntryNodes[i];
            const preds = flow.get(n.label).preds;
            let pdinter = [];
            preds.forEach((pred) => {
                const pdom = dom.get(pred);
                if (pdinter === undefined) {
                    pdinter = [...pdom];
                }
                else {
                    pdinter = pdinter.filter((v) => pdom.findIndex((dn) => dn.label === v.label) !== -1);
                }
            });
            const ndom = [n, ...pdinter];
            changed = changed || ndom.length !== dom.get(n.label).length;
            dom.set(n.label, ndom);
        }
    }
    return dom;
}
exports.computeDominators = computeDominators;
function topoVisit(n, tordered, flow, blocks) {
    if (tordered.findIndex((b) => b.label === n.label) !== -1) {
        return;
    }
    const succs = flow.get(n.label).succs;
    succs.forEach((succ) => topoVisit(blocks.get(succ), tordered, flow, blocks));
    tordered.push(n);
}
function topologicalOrder(blocks) {
    let tordered = [];
    const flow = computeBlockLinks(blocks);
    topoVisit(blocks.get("entry"), tordered, flow, blocks);
    return tordered.reverse();
}
exports.topologicalOrder = topologicalOrder;
function computeLiveVarsInBlock(ops, liveOnExit) {
    let live = new Map(liveOnExit);
    for (let i = ops.length - 1; i >= 0; --i) {
        const op = ops[i];
        const mod = op.getModVars().map((arg) => arg.nameID);
        mod.forEach((v) => live.delete(v));
        const use = op.getUsedVars();
        use.forEach((v) => live.set(v.nameID, v));
    }
    return live;
}
function computeBlockLiveVars(blocks) {
    let liveInfo = new Map();
    const flow = computeBlockLinks(blocks);
    const worklist = topologicalOrder(blocks).reverse();
    for (let i = 0; i < worklist.length; ++i) {
        const bb = worklist[i];
        const finfo = flow.get(bb.label);
        let linfo = [];
        finfo.succs.forEach((succ) => linfo.push(liveInfo.get(succ)));
        let lexit = new Map();
        linfo.forEach((ls) => ls.liveEntry.forEach((v, n) => lexit.set(n, v)));
        if (bb.label === "exit") {
            lexit.set("$$return", new mir_ops_1.MIRRegisterArgument("$$return"));
        }
        const lentry = computeLiveVarsInBlock(bb.ops, lexit);
        liveInfo.set(bb.label, { label: bb.label, liveEntry: lentry, liveExit: lexit });
    }
    return liveInfo;
}
exports.computeBlockLiveVars = computeBlockLiveVars;
function computeVarTypes(blocks, params, masm, booltype) {
    let vinfo = new Map();
    params.forEach((p) => vinfo.set(p.name, p.type));
    blocks.forEach((bb) => {
        bb.ops.forEach((op) => {
            switch (op.tag) {
                case mir_ops_1.MIROpTag.MIRNop:
                case mir_ops_1.MIROpTag.MIRDeadFlow:
                case mir_ops_1.MIROpTag.MIRAbort:
                case mir_ops_1.MIROpTag.MIRDeclareGuardFlagLocation:
                case mir_ops_1.MIROpTag.MIRSetConstantGuardFlag:
                case mir_ops_1.MIROpTag.MIRVarLifetimeStart:
                case mir_ops_1.MIROpTag.MIRVarLifetimeEnd:
                case mir_ops_1.MIROpTag.MIRAssertCheck:
                case mir_ops_1.MIROpTag.MIRDebug: {
                    break;
                }
                case mir_ops_1.MIROpTag.MIRLoadUnintVariableValue: {
                    const luv = op;
                    vinfo.set(luv.trgt.nameID, luv.oftype);
                    break;
                }
                case mir_ops_1.MIROpTag.MIRConvertValue: {
                    const conv = op;
                    vinfo.set(conv.trgt.nameID, conv.intotype);
                    break;
                }
                case mir_ops_1.MIROpTag.MIRInject: {
                    const inj = op;
                    vinfo.set(inj.trgt.nameID, inj.intotype);
                    break;
                }
                case mir_ops_1.MIROpTag.MIRGuardedOptionInject: {
                    const inj = op;
                    vinfo.set(inj.trgt.nameID, inj.optiontype);
                    break;
                }
                case mir_ops_1.MIROpTag.MIRExtract: {
                    const ext = op;
                    vinfo.set(ext.trgt.nameID, ext.intotype);
                    break;
                }
                case mir_ops_1.MIROpTag.MIRLoadConst: {
                    const lc = op;
                    vinfo.set(lc.trgt.nameID, lc.consttype);
                    break;
                }
                case mir_ops_1.MIROpTag.MIRTupleHasIndex: {
                    const thi = op;
                    vinfo.set(thi.trgt.nameID, booltype);
                    break;
                }
                case mir_ops_1.MIROpTag.MIRRecordHasProperty: {
                    const rhi = op;
                    vinfo.set(rhi.trgt.nameID, booltype);
                    break;
                }
                case mir_ops_1.MIROpTag.MIRLoadTupleIndex: {
                    const lti = op;
                    vinfo.set(lti.trgt.nameID, lti.resulttype);
                    break;
                }
                case mir_ops_1.MIROpTag.MIRLoadTupleIndexSetGuard: {
                    const ltig = op;
                    vinfo.set(ltig.trgt.nameID, ltig.resulttype);
                    if (ltig.guard instanceof mir_ops_1.MIRArgGuard) {
                        if (ltig.guard.greg instanceof mir_ops_1.MIRRegisterArgument) {
                            vinfo.set(ltig.guard.greg.nameID, booltype);
                        }
                    }
                    break;
                }
                case mir_ops_1.MIROpTag.MIRLoadRecordProperty: {
                    const lrp = op;
                    vinfo.set(lrp.trgt.nameID, lrp.resulttype);
                    break;
                }
                case mir_ops_1.MIROpTag.MIRLoadRecordPropertySetGuard: {
                    const lrpg = op;
                    vinfo.set(lrpg.trgt.nameID, lrpg.resulttype);
                    if (lrpg.guard instanceof mir_ops_1.MIRArgGuard) {
                        if (lrpg.guard.greg instanceof mir_ops_1.MIRRegisterArgument) {
                            vinfo.set(lrpg.guard.greg.nameID, booltype);
                        }
                    }
                    break;
                }
                case mir_ops_1.MIROpTag.MIRLoadField: {
                    const lmf = op;
                    vinfo.set(lmf.trgt.nameID, lmf.resulttype);
                    break;
                }
                case mir_ops_1.MIROpTag.MIRTupleProjectToEphemeral: {
                    const pte = op;
                    vinfo.set(pte.trgt.nameID, pte.epht);
                    break;
                }
                case mir_ops_1.MIROpTag.MIRRecordProjectToEphemeral: {
                    const pre = op;
                    vinfo.set(pre.trgt.nameID, pre.epht);
                    break;
                }
                case mir_ops_1.MIROpTag.MIREntityProjectToEphemeral: {
                    const pee = op;
                    vinfo.set(pee.trgt.nameID, pee.epht);
                    break;
                }
                case mir_ops_1.MIROpTag.MIRTupleUpdate: {
                    const mi = op;
                    vinfo.set(mi.trgt.nameID, mi.argflowtype);
                    break;
                }
                case mir_ops_1.MIROpTag.MIRRecordUpdate: {
                    const mp = op;
                    vinfo.set(mp.trgt.nameID, mp.argflowtype);
                    break;
                }
                case mir_ops_1.MIROpTag.MIREntityUpdate: {
                    const mf = op;
                    vinfo.set(mf.trgt.nameID, mf.argflowtype);
                    break;
                }
                case mir_ops_1.MIROpTag.MIRLoadFromEpehmeralList: {
                    const mle = op;
                    vinfo.set(mle.trgt.nameID, mle.resulttype);
                    break;
                }
                case mir_ops_1.MIROpTag.MIRMultiLoadFromEpehmeralList: {
                    const mle = op;
                    mle.trgts.forEach((trgt) => {
                        vinfo.set(trgt.into.nameID, trgt.oftype);
                    });
                    break;
                }
                case mir_ops_1.MIROpTag.MIRSliceEpehmeralList: {
                    const mle = op;
                    vinfo.set(mle.trgt.nameID, mle.sltype);
                    break;
                }
                case mir_ops_1.MIROpTag.MIRInvokeFixedFunction: {
                    const invk = op;
                    vinfo.set(invk.trgt.nameID, invk.resultType);
                    break;
                }
                case mir_ops_1.MIROpTag.MIRInvokeVirtualFunction: {
                    const invk = op;
                    vinfo.set(invk.trgt.nameID, invk.resultType);
                    break;
                }
                case mir_ops_1.MIROpTag.MIRInvokeVirtualOperator: {
                    const invk = op;
                    vinfo.set(invk.trgt.nameID, invk.resultType);
                    break;
                }
                case mir_ops_1.MIROpTag.MIRConstructorTuple: {
                    const tc = op;
                    vinfo.set(tc.trgt.nameID, tc.resultTupleType);
                    break;
                }
                case mir_ops_1.MIROpTag.MIRConstructorTupleFromEphemeralList: {
                    const tc = op;
                    vinfo.set(tc.trgt.nameID, tc.resultTupleType);
                    break;
                }
                case mir_ops_1.MIROpTag.MIRConstructorRecord: {
                    const tc = op;
                    vinfo.set(tc.trgt.nameID, tc.resultRecordType);
                    break;
                }
                case mir_ops_1.MIROpTag.MIRConstructorRecordFromEphemeralList: {
                    const tc = op;
                    vinfo.set(tc.trgt.nameID, tc.resultRecordType);
                    break;
                }
                case mir_ops_1.MIROpTag.MIRStructuredAppendTuple: {
                    const at = op;
                    vinfo.set(at.trgt.nameID, at.resultTupleType);
                    break;
                }
                case mir_ops_1.MIROpTag.MIRStructuredJoinRecord: {
                    const sj = op;
                    vinfo.set(sj.trgt.nameID, sj.resultRecordType);
                    break;
                }
                case mir_ops_1.MIROpTag.MIRConstructorEphemeralList: {
                    const tc = op;
                    vinfo.set(tc.trgt.nameID, tc.resultEphemeralListType);
                    break;
                }
                case mir_ops_1.MIROpTag.MIREphemeralListExtend: {
                    const pse = op;
                    vinfo.set(pse.trgt.nameID, pse.resultType);
                    break;
                }
                case mir_ops_1.MIROpTag.MIRConstructorPrimaryCollectionEmpty: {
                    const cc = op;
                    vinfo.set(cc.trgt.nameID, cc.tkey);
                    break;
                }
                case mir_ops_1.MIROpTag.MIRConstructorPrimaryCollectionSingletons: {
                    const cc = op;
                    vinfo.set(cc.trgt.nameID, cc.tkey);
                    break;
                }
                case mir_ops_1.MIROpTag.MIRConstructorPrimaryCollectionCopies: {
                    const cc = op;
                    vinfo.set(cc.trgt.nameID, cc.tkey);
                    break;
                }
                case mir_ops_1.MIROpTag.MIRConstructorPrimaryCollectionMixed: {
                    const cc = op;
                    vinfo.set(cc.trgt.nameID, cc.tkey);
                    break;
                }
                case mir_ops_1.MIROpTag.MIRBinKeyEq: {
                    const beq = op;
                    vinfo.set(beq.trgt.nameID, booltype);
                    break;
                }
                case mir_ops_1.MIROpTag.MIRBinKeyLess: {
                    const bl = op;
                    vinfo.set(bl.trgt.nameID, booltype);
                    break;
                }
                case mir_ops_1.MIROpTag.MIRPrefixNotOp: {
                    const pfx = op;
                    vinfo.set(pfx.trgt.nameID, booltype);
                    break;
                }
                case mir_ops_1.MIROpTag.MIRIsTypeOf: {
                    const it = op;
                    vinfo.set(it.trgt.nameID, booltype);
                    break;
                }
                case mir_ops_1.MIROpTag.MIRJump:
                case mir_ops_1.MIROpTag.MIRJumpCond:
                case mir_ops_1.MIROpTag.MIRJumpNone: {
                    break;
                }
                case mir_ops_1.MIROpTag.MIRRegisterAssign: {
                    const regop = op;
                    vinfo.set(regop.trgt.nameID, regop.layouttype);
                    break;
                }
                case mir_ops_1.MIROpTag.MIRReturnAssign: {
                    const ra = op;
                    vinfo.set(ra.name.nameID, ra.oftype);
                    break;
                }
                case mir_ops_1.MIROpTag.MIRReturnAssignOfCons: {
                    const ra = op;
                    vinfo.set(ra.name.nameID, ra.oftype);
                    break;
                }
                default: {
                    const po = op;
                    vinfo.set(po.trgt.nameID, po.layouttype);
                    break;
                }
            }
        });
    });
    let vresinfo = new Map();
    vinfo.forEach((v, k) => vresinfo.set(k, masm.typeMap.get(v)));
    return vresinfo;
}
exports.computeVarTypes = computeVarTypes;
function maxConst(cc, vv) {
    const bvv = BigInt(vv);
    return cc >= bvv ? cc : bvv;
}
function maxConsts(cc, vv) {
    for (let i = 0; i < vv.length; ++i) {
        const bvv = BigInt(vv[i]);
        cc = cc >= bvv ? cc : bvv;
    }
    return cc;
}
function maxConstArg(cc, arg) {
    if (arg instanceof mir_ops_1.MIRConstantArgument) {
        const args = arg.constantSize();
        return cc >= args ? cc : args;
    }
    else {
        return cc;
    }
}
function maxConstArgs(cc, args) {
    for (let i = 0; i < args.length; ++i) {
        cc = maxConstArg(cc, args[i]);
    }
    return cc;
}
function maxStructuredArgs(cc, args, extract) {
    for (let i = 0; i < args.length; ++i) {
        cc = maxConstArg(cc, extract(args[i]));
    }
    return cc;
}
function maxStatementGuard(cc, arg) {
    if (arg === undefined) {
        return cc;
    }
    else {
        if (arg.defaultvar === undefined) {
            return cc;
        }
        else {
            return maxConstArg(cc, arg.defaultvar);
        }
    }
}
function computeMaxConstantSize(blocks) {
    let cc = 0n;
    blocks.forEach((bb) => {
        bb.ops.forEach((op) => {
            switch (op.tag) {
                case mir_ops_1.MIROpTag.MIRConvertValue: {
                    const conv = op;
                    cc = maxConstArg(cc, conv.src);
                    cc = maxStatementGuard(cc, conv.sguard);
                    break;
                }
                case mir_ops_1.MIROpTag.MIRInject: {
                    const inj = op;
                    cc = maxConstArg(cc, inj.src);
                    break;
                }
                case mir_ops_1.MIROpTag.MIRGuardedOptionInject: {
                    const inj = op;
                    cc = maxConstArg(cc, inj.src);
                    cc = maxStatementGuard(cc, inj.sguard);
                    break;
                }
                case mir_ops_1.MIROpTag.MIRExtract: {
                    const ext = op;
                    cc = maxConstArg(cc, ext.src);
                    break;
                }
                case mir_ops_1.MIROpTag.MIRTupleHasIndex: {
                    const thi = op;
                    cc = maxConst(cc, thi.idx);
                    break;
                }
                case mir_ops_1.MIROpTag.MIRLoadTupleIndex: {
                    const lti = op;
                    cc = maxConst(cc, lti.idx);
                    break;
                }
                case mir_ops_1.MIROpTag.MIRLoadTupleIndexSetGuard: {
                    const ltig = op;
                    cc = maxConst(cc, ltig.idx);
                    break;
                }
                case mir_ops_1.MIROpTag.MIRTupleProjectToEphemeral: {
                    const pte = op;
                    cc = maxConsts(cc, pte.indecies);
                    break;
                }
                case mir_ops_1.MIROpTag.MIRTupleUpdate: {
                    const mi = op;
                    cc = maxConsts(cc, mi.updates.map((uu) => uu[0]));
                    cc = maxStructuredArgs(cc, mi.updates, (uu) => uu[1]);
                    break;
                }
                case mir_ops_1.MIROpTag.MIRLoadFromEpehmeralList: {
                    const mle = op;
                    cc = maxConst(cc, mle.idx);
                    break;
                }
                case mir_ops_1.MIROpTag.MIRMultiLoadFromEpehmeralList: {
                    const mle = op;
                    cc = maxConsts(cc, mle.trgts.map((ll) => ll.pos));
                    break;
                }
                case mir_ops_1.MIROpTag.MIRInvokeFixedFunction: {
                    const invk = op;
                    cc = maxConstArgs(cc, invk.args);
                    cc = maxStatementGuard(cc, invk.sguard);
                    break;
                }
                case mir_ops_1.MIROpTag.MIRInvokeVirtualFunction: {
                    const invk = op;
                    cc = maxConstArgs(cc, invk.args);
                    break;
                }
                case mir_ops_1.MIROpTag.MIRInvokeVirtualOperator: {
                    const invk = op;
                    cc = maxStructuredArgs(cc, invk.args, (vv) => vv.arg);
                    break;
                }
                case mir_ops_1.MIROpTag.MIRConstructorTuple: {
                    const tc = op;
                    cc = maxConstArgs(cc, tc.args);
                    break;
                }
                case mir_ops_1.MIROpTag.MIRConstructorPrimaryCollectionSingletons: {
                    const cps = op;
                    cc = maxStructuredArgs(cc, cps.args, (vv) => vv[1]);
                    break;
                }
                case mir_ops_1.MIROpTag.MIRConstructorPrimaryCollectionCopies: {
                    const cpc = op;
                    cc = maxStructuredArgs(cc, cpc.args, (vv) => vv[1]);
                    break;
                }
                case mir_ops_1.MIROpTag.MIRConstructorPrimaryCollectionMixed: {
                    const cpm = op;
                    cc = maxStructuredArgs(cc, cpm.args, (vv) => vv[2]);
                    break;
                }
                case mir_ops_1.MIROpTag.MIRBinKeyEq: {
                    const beq = op;
                    cc = maxConstArgs(cc, [beq.lhs, beq.rhs]);
                    cc = maxStatementGuard(cc, beq.sguard);
                    break;
                }
                case mir_ops_1.MIROpTag.MIRBinKeyLess: {
                    const bl = op;
                    cc = maxConstArgs(cc, [bl.lhs, bl.rhs]);
                    cc = maxStatementGuard(cc, bl.sguard);
                    break;
                }
                case mir_ops_1.MIROpTag.MIRIsTypeOf: {
                    const it = op;
                    cc = maxConstArg(cc, it.arg);
                    cc = maxStatementGuard(cc, it.sguard);
                    break;
                }
                case mir_ops_1.MIROpTag.MIRJumpNone: {
                    const njop = op;
                    cc = maxConstArg(cc, njop.arg);
                    break;
                }
                case mir_ops_1.MIROpTag.MIRRegisterAssign: {
                    const regop = op;
                    cc = maxConstArg(cc, regop.src);
                    cc = maxStatementGuard(cc, regop.sguard);
                    break;
                }
                case mir_ops_1.MIROpTag.MIRReturnAssign: {
                    const ra = op;
                    cc = maxConstArg(cc, ra.src);
                    break;
                }
                case mir_ops_1.MIROpTag.MIRReturnAssignOfCons: {
                    const ra = op;
                    cc = maxConstArgs(cc, ra.args);
                    break;
                }
                default: {
                    break;
                }
            }
        });
    });
    return cc;
}
exports.computeMaxConstantSize = computeMaxConstantSize;
//# sourceMappingURL=mir_info.js.map