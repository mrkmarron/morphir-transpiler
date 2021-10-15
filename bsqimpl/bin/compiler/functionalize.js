"use strict";
//-------------------------------------------------------------------------------------------------------
// Copyright (C) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE.txt file in the project root for full license information.
//-------------------------------------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
exports.functionalizeInvokes = void 0;
const mir_ops_1 = require("./mir_ops");
const mir_info_1 = require("./mir_info");
const mir_assembly_1 = require("./mir_assembly");
const parser_1 = require("../ast/parser");
const sinfo_undef = new parser_1.SourceInfo(-1, -1, -1, -1);
class FunctionalizeEnv {
    constructor(emitter, rtype, invid, tailargs, jlabel) {
        this.nbbl = [];
        this.emitter = emitter;
        this.rtype = rtype;
        this.invid = invid;
        this.tailargs = tailargs;
        this.jlabel = jlabel;
    }
}
function generateTargetFunctionName(cinvoke, trgtlbl) {
    return (cinvoke + "$$" + trgtlbl);
}
function generateTailCall(fenv) {
    return new mir_ops_1.MIRInvokeFixedFunction(sinfo_undef, fenv.rtype, fenv.invid, fenv.tailargs, undefined, new mir_ops_1.MIRRegisterArgument("$__ir_ret__"), undefined);
}
function updateJumpOp(bb, fenv) {
    const jop = bb.ops[bb.ops.length - 1];
    if (jop.trgtblock === fenv.jlabel) {
        const tc = generateTailCall(fenv);
        bb.ops[bb.ops.length - 1] = tc;
        bb.ops.push(new mir_ops_1.MIRJump(sinfo_undef, "returnassign"));
    }
}
function updateCondJumpOp(bb, fenv, nbb) {
    const jop = bb.ops[bb.ops.length - 1];
    if (jop.trueblock === fenv.jlabel) {
        const tjop = bb.ops[bb.ops.length - 1];
        const tc = generateTailCall(fenv);
        const ntb = new mir_ops_1.MIRBasicBlock(bb.label + "tbb", [tc, new mir_ops_1.MIRJump(sinfo_undef, "returnassign")]);
        bb.ops[bb.ops.length - 1] = new mir_ops_1.MIRJumpCond(tjop.sinfo, tjop.arg, ntb.label, tjop.falseblock);
        nbb.push(ntb);
    }
    if (jop.falseblock === fenv.jlabel) {
        const fjop = bb.ops[bb.ops.length - 1];
        const tc = generateTailCall(fenv);
        const ntb = new mir_ops_1.MIRBasicBlock(bb.label + "fbb", [tc, new mir_ops_1.MIRJump(sinfo_undef, "returnassign")]);
        bb.ops[bb.ops.length - 1] = new mir_ops_1.MIRJumpCond(fjop.sinfo, fjop.arg, fjop.trueblock, ntb.label);
        nbb.push(ntb);
    }
}
function updateNoneJumpOp(bb, fenv, nbb) {
    const jop = bb.ops[bb.ops.length - 1];
    if (jop.noneblock === fenv.jlabel) {
        const tjop = bb.ops[bb.ops.length - 1];
        const tc = generateTailCall(fenv);
        const ntb = new mir_ops_1.MIRBasicBlock(bb.label + "tbb", [tc, new mir_ops_1.MIRJump(sinfo_undef, "returnassign")]);
        bb.ops[bb.ops.length - 1] = new mir_ops_1.MIRJumpNone(tjop.sinfo, tjop.arg, tjop.arglayouttype, ntb.label, tjop.someblock);
        nbb.push(ntb);
    }
    if (jop.someblock === fenv.jlabel) {
        const fjop = bb.ops[bb.ops.length - 1];
        const tc = generateTailCall(fenv);
        const ntb = new mir_ops_1.MIRBasicBlock(bb.label + "fbb", [tc, new mir_ops_1.MIRJump(sinfo_undef, "returnassign")]);
        bb.ops[bb.ops.length - 1] = new mir_ops_1.MIRJumpNone(fjop.sinfo, fjop.arg, fjop.arglayouttype, fjop.noneblock, ntb.label);
        nbb.push(ntb);
    }
}
function replaceJumpsWithCalls(bbl, fenv) {
    let nbb = [];
    bbl
        .filter((bb) => bb.ops.length !== 0)
        .forEach((bb) => {
        const lop = bb.ops[bb.ops.length - 1];
        switch (lop.tag) {
            case mir_ops_1.MIROpTag.MIRJump: {
                updateJumpOp(bb, fenv);
                break;
            }
            case mir_ops_1.MIROpTag.MIRJumpCond: {
                updateCondJumpOp(bb, fenv, nbb);
                break;
            }
            case mir_ops_1.MIROpTag.MIRJumpNone: {
                updateNoneJumpOp(bb, fenv, nbb);
                break;
            }
        }
    });
    return nbb;
}
function computeBodySplits(jidx, bo, struct) {
    let continuationblocks = [bo[jidx]];
    const getRBB = (cblocks) => {
        return bo.find((bb) => {
            if (bb.label === "returnassign" || cblocks.find((obb) => obb.label === bb.label) !== undefined) {
                return false;
            }
            let preds = struct.get(bb.label).preds;
            return cblocks.some((obb) => preds.has(obb.label));
        });
    };
    let rbb = getRBB(continuationblocks);
    while (rbb !== undefined) {
        continuationblocks.push(rbb);
        rbb = getRBB(continuationblocks);
    }
    const rblocks = bo.filter((bb) => continuationblocks.find((rbb) => rbb.label === bb.label) === undefined);
    return { rblocks: rblocks, cblocks: continuationblocks.slice(1) };
}
function processBody(emitter, invid, masm, b, params) {
    const links = mir_info_1.computeBlockLinks(b.body);
    const bo = mir_info_1.topologicalOrder(b.body);
    const lv = mir_info_1.computeBlockLiveVars(b.body);
    const vtypes = mir_info_1.computeVarTypes(b.body, params, masm, "NSCore::Bool");
    const rtype = vtypes.get("$__ir_ret__");
    if (bo.find((bb) => links.get(bb.label).preds.size > 1 && bb.label !== "returnassign") === undefined) {
        return undefined;
    }
    const jidx = (bo.length - 1) - [...bo].reverse().findIndex((bb) => links.get(bb.label).preds.size > 1 && bb.label !== "returnassign");
    const jlabel = bo[jidx].label;
    let { rblocks, cblocks } = computeBodySplits(jidx, bo, links);
    const tailvars = [...lv.get(bo[jidx].label).liveEntry].sort((a, b) => a[0].localeCompare(b[0]));
    const nparams = tailvars.map((lvn) => new mir_assembly_1.MIRFunctionParameter(lvn[0], vtypes.get(lvn[0]).typeID));
    const ninvid = generateTargetFunctionName(invid, jlabel);
    let fenv = new FunctionalizeEnv(emitter, rtype.typeID, ninvid, tailvars.map((lvn) => lvn[1]), jlabel);
    const nbb = replaceJumpsWithCalls(rblocks, fenv);
    cblocks = [
        new mir_ops_1.MIRBasicBlock("entry", [...bo[jidx].ops]),
        ...cblocks,
        new mir_ops_1.MIRBasicBlock("returnassign", [
            new mir_ops_1.MIRRegisterAssign(sinfo_undef, new mir_ops_1.MIRRegisterArgument("$__ir_ret__"), new mir_ops_1.MIRRegisterArgument("$$return"), rtype.typeID, undefined),
            new mir_ops_1.MIRJump(sinfo_undef, "exit")
        ]),
        new mir_ops_1.MIRBasicBlock("exit", [])
    ];
    b.body = new Map();
    [...rblocks, ...nbb].forEach((bb) => b.body.set(bb.label, bb));
    return { nname: ninvid, nparams: nparams, nblocks: cblocks };
}
function processInvoke(emitter, inv, masm) {
    const f1 = processBody(emitter, inv.ikey, masm, inv.body, inv.params);
    if (f1 === undefined) {
        return [];
    }
    let rbl = [];
    let wl = [{ nbi: f1, post: inv.postconditions }];
    while (wl.length !== 0) {
        const item = wl.shift();
        const bproc = item.nbi;
        const bmap = new Map();
        bproc.nblocks.map((bb) => bmap.set(bb.label, bb));
        const ninv = new mir_assembly_1.MIRInvokeBodyDecl(inv.enclosingDecl, inv.bodyID, bproc.nname, bproc.nname, [...inv.attributes], inv.recursive, inv.sourceLocation, inv.srcFile, bproc.nparams, 0, inv.resultType, undefined, item.post, new mir_ops_1.MIRBody(inv.srcFile, inv.sourceLocation, bmap));
        rbl.push(ninv);
        const ff = processBody(emitter, inv.ikey, masm, inv.body, inv.params);
        if (ff !== undefined) {
            wl.push({ nbi: ff, post: undefined });
        }
    }
    return rbl;
}
function functionalizeInvokes(emitter, masm) {
    const oinvokes = [...masm.invokeDecls].map((iv) => iv[1]);
    oinvokes.forEach((iiv) => {
        const nil = processInvoke(emitter, iiv, masm);
        nil.forEach((niv) => masm.invokeDecls.set(niv.ikey, niv));
    });
}
exports.functionalizeInvokes = functionalizeInvokes;
//# sourceMappingURL=functionalize.js.map