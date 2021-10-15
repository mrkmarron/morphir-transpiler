"use strict";
//-------------------------------------------------------------------------------------------------------
// Copyright (C) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE.txt file in the project root for full license information.
//-------------------------------------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
exports.markSafeCalls = exports.constructCallGraphInfo = void 0;
//
//Compute the static call graph for an assembly
//
const assert = require("assert");
const mir_ops_1 = require("./mir_ops");
const mir_assembly_1 = require("./mir_assembly");
function computeCalleesInBlocks(blocks, invokeNode, assembly) {
    blocks.forEach((block) => {
        for (let i = 0; i < block.ops.length; ++i) {
            const op = block.ops[i];
            switch (op.tag) {
                case mir_ops_1.MIROpTag.MIRInvokeFixedFunction: {
                    invokeNode.callees.add(op.mkey);
                    break;
                }
                case mir_ops_1.MIROpTag.MIRInvokeVirtualFunction: {
                    const vcall = op.vresolve;
                    const rcvrtype = assembly.typeMap.get(op.rcvrflowtype);
                    const trgts = [];
                    assembly.entityDecls.forEach((edcl) => {
                        if (edcl instanceof mir_assembly_1.MIRObjectEntityTypeDecl) {
                            if (assembly.subtypeOf(assembly.typeMap.get(edcl.tkey), rcvrtype)) {
                                assert(edcl.vcallMap.has(vcall));
                                trgts.push(edcl.vcallMap.get(vcall));
                            }
                        }
                    });
                    break;
                }
                case mir_ops_1.MIROpTag.MIRInvokeVirtualOperator: {
                    const trgts = assembly.virtualOperatorDecls.get(op.vresolve);
                    trgts.forEach((trgt) => invokeNode.callees.add(trgt));
                    break;
                }
                case mir_ops_1.MIROpTag.MIREntityUpdate: {
                    const rcvrtype = assembly.typeMap.get(op.argflowtype);
                    const trgts = [];
                    assembly.entityDecls.forEach((edcl) => {
                        if (assembly.subtypeOf(assembly.typeMap.get(edcl.tkey), rcvrtype)) {
                            trgts.push(`${edcl.tkey}@@constructor`);
                        }
                    });
                    break;
                }
                default: {
                    //ignore all other ops
                    break;
                }
            }
        }
    });
}
function sccVisit(cn, scc, marked, invokes) {
    if (marked.has(cn.invoke)) {
        return;
    }
    scc.add(cn.invoke);
    marked.add(cn.invoke);
    cn.callers.forEach((pred) => sccVisit(invokes.get(pred), scc, marked, invokes));
}
function topoVisit(cn, pending, tordered, invokes) {
    if (pending.findIndex((vn) => vn.invoke === cn.invoke) !== -1 || tordered.findIndex((vn) => vn.invoke === cn.invoke) !== -1) {
        return;
    }
    pending.push(cn);
    cn.callees.forEach((succ) => invokes.get(succ).callers.add(cn.invoke));
    cn.callees.forEach((succ) => topoVisit(invokes.get(succ), pending, tordered, invokes));
    tordered.push(cn);
}
function processBodyInfo(bkey, binfo, assembly) {
    let cn = { invoke: bkey, callees: new Set(), callers: new Set() };
    binfo.forEach((b) => {
        computeCalleesInBlocks(b.body, cn, assembly);
    });
    return cn;
}
function constructCallGraphInfo(entryPoints, assembly) {
    let invokes = new Map();
    assembly.invokeDecls.forEach((ivk, ikey) => {
        invokes.set(ikey, processBodyInfo(ikey, [ivk.body], assembly));
    });
    assembly.primitiveInvokeDecls.forEach((ivk, ikey) => {
        let cn = { invoke: ikey, callees: new Set(), callers: new Set() };
        ivk.pcodes.forEach((pc) => cn.callees.add(pc.code));
        invokes.set(cn.invoke, cn);
    });
    let roots = [];
    let tordered = [];
    entryPoints.forEach((ivk) => {
        roots.push(invokes.get(ivk));
        topoVisit(invokes.get(ivk), [], tordered, invokes);
    });
    assembly.constantDecls.forEach((cdecl) => {
        roots.push(invokes.get(cdecl.ivalue));
        topoVisit(invokes.get(cdecl.ivalue), [], tordered, invokes);
    });
    tordered = tordered.reverse();
    let marked = new Set();
    let recursive = [];
    for (let i = 0; i < tordered.length; ++i) {
        let scc = new Set();
        sccVisit(tordered[i], scc, marked, invokes);
        if (scc.size > 1 || tordered[i].callees.has(tordered[i].invoke)) {
            recursive.push(scc);
        }
    }
    return { invokes: invokes, topologicalOrder: tordered, roots: roots, recursive: recursive };
}
exports.constructCallGraphInfo = constructCallGraphInfo;
function isSafeInvoke(idecl) {
    return idecl.attributes.includes("__safe") || idecl.attributes.includes("__assume_safe");
}
function isBodySafe(ikey, masm, errorTrgtPos, callg, safeinfo) {
    if (masm.primitiveInvokeDecls.has(ikey)) {
        const pinvk = masm.primitiveInvokeDecls.get(ikey);
        const cn = callg.invokes.get(ikey);
        if (isSafeInvoke(pinvk)) {
            return { safe: true, trgt: false };
        }
        else {
            const istrgt = [...cn.callees].every((callee) => safeinfo.has(callee) && safeinfo.get(callee).trgt);
            return { safe: false, trgt: istrgt };
        }
    }
    else {
        const invk = masm.invokeDecls.get(ikey);
        const haserrorop = [...invk.body.body].some((bb) => bb[1].ops.some((op) => {
            return op.canRaise(true);
        }));
        const hastrgt = (invk.srcFile === errorTrgtPos.file) && [...invk.body.body].some((bb) => bb[1].ops.some((op) => {
            return op.canRaise(true) && (op.sinfo.line === errorTrgtPos.line && op.sinfo.pos === errorTrgtPos.pos);
        }));
        if (hastrgt) {
            return { safe: false, trgt: true };
        }
        else {
            const cn = callg.invokes.get(ikey);
            const allcalleesafe = [...cn.callees].every((callee) => {
                if (isSafeInvoke((masm.primitiveInvokeDecls.get(callee) || masm.invokeDecls.get(callee)))) {
                    return true;
                }
                else {
                    const sii = safeinfo.get(callee);
                    return sii !== undefined && sii.safe;
                }
            });
            if (!haserrorop && allcalleesafe) {
                return { safe: true, trgt: false };
            }
            else {
                const istrgt = hastrgt || [...cn.callees].every((callee) => safeinfo.has(callee) && safeinfo.get(callee).trgt);
                return { safe: false, trgt: istrgt };
            }
        }
    }
}
function markSafeCalls(entryPoints, masm, errorTrgtPos) {
    const cginfo = constructCallGraphInfo(entryPoints, masm);
    const rcg = [...cginfo.topologicalOrder].reverse();
    const etrgt = errorTrgtPos || { file: "[IGNORE ERROR TARGETING]", line: -1, pos: -1 };
    let safeinfo = new Map();
    for (let i = 0; i < rcg.length; ++i) {
        const cn = rcg[i];
        const cscc = cginfo.recursive.find((scc) => scc.has(cn.invoke));
        let worklist = cscc !== undefined ? [...cscc].sort() : [cn.invoke];
        while (worklist.length !== 0) {
            const ikey = worklist.shift();
            const issafe = isBodySafe(ikey, masm, etrgt, cginfo, safeinfo);
            const osafe = safeinfo.get(ikey);
            if (osafe === undefined || issafe.safe !== osafe.safe || issafe.trgt !== osafe.trgt) {
                safeinfo.set(ikey, issafe);
                if (cscc !== undefined) {
                    const ppn = cginfo.invokes.get(ikey);
                    ppn.callers.forEach((caller) => {
                        if (!worklist.includes(caller)) {
                            worklist.push(caller);
                        }
                    });
                }
            }
        }
    }
    return safeinfo;
}
exports.markSafeCalls = markSafeCalls;
//# sourceMappingURL=mir_callg.js.map