"use strict";
//-------------------------------------------------------------------------------------------------------
// Copyright (C) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE.txt file in the project root for full license information.
//-------------------------------------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
exports.MIREmitter = exports.MIRKeyGenerator = void 0;
const parser_1 = require("../ast/parser");
const mir_ops_1 = require("./mir_ops");
const assembly_1 = require("../ast/assembly");
const resolved_type_1 = require("../ast/resolved_type");
const mir_assembly_1 = require("./mir_assembly");
const type_checker_1 = require("../type_checker/type_checker");
const mir_cleanup_1 = require("./mir_cleanup");
const mir_ssa_1 = require("./mir_ssa");
const functionalize_1 = require("./functionalize");
const Crypto = require("crypto");
class MIRKeyGenerator {
    static computeBindsKeyInfo(binds) {
        if (binds.size === 0) {
            return ["", ""];
        }
        let terms = [];
        binds.forEach((v, k) => terms.push(`${k}=${v.typeID}`));
        let shortterms = [];
        binds.forEach((v, k) => terms.push(`${k}=${v.shortID}`));
        return [`<${terms.sort().join(", ")}>`, `<${shortterms.sort().join(", ")}>`];
    }
    static computePCodeKeyInfo(pcodes) {
        if (pcodes.length === 0) {
            return "";
        }
        return "[" + pcodes.map((pc) => `${pc.ikey}`).join(",") + "]";
    }
    static generateTypeKey(t) {
        return { keyid: t.typeID, shortname: t.shortID };
    }
    static generateFieldKey(t, name) {
        const tkey = this.generateTypeKey(t);
        return `__f__${tkey.keyid}.${name}`;
    }
    static generateGlobalKeyWNamespace(ns, name, prefix) {
        const fname = `__g__${prefix !== undefined ? (prefix + "#") : ""}${ns}::${name}`;
        const shortfname = `${prefix !== undefined ? (prefix + "#") : ""}${ns}::${name}`;
        return { keyid: fname, shortname: shortfname };
    }
    static generateGlobalKeyWType(t, name, prefix) {
        const tinfo = MIRKeyGenerator.generateTypeKey(t);
        const fname = `__g__${prefix !== undefined ? (prefix + "#") : ""}${tinfo.keyid}::${name}`;
        const shortfname = `${prefix !== undefined ? (prefix + "#") : ""}${tinfo.shortname}::${name}`;
        return { keyid: fname, shortname: shortfname };
    }
    static generateFunctionKeyWNamespace(ns, name, binds, pcodes, prefix) {
        const [binfo, shortbinfo] = MIRKeyGenerator.computeBindsKeyInfo(binds);
        const pcinfo = MIRKeyGenerator.computePCodeKeyInfo(pcodes);
        const fname = `__i__${prefix !== undefined ? (prefix + "#") : ""}${ns}::${name}${binfo}${pcinfo}`;
        const shortfname = `${prefix !== undefined ? (prefix + "#") : ""}${ns}::${name}${shortbinfo}${pcinfo}`;
        return { keyid: fname, shortname: shortfname };
    }
    static generateFunctionKeyWType(t, name, binds, pcodes, prefix) {
        const tinfo = MIRKeyGenerator.generateTypeKey(t);
        const [binfo, shortbinfo] = MIRKeyGenerator.computeBindsKeyInfo(binds);
        const pcinfo = MIRKeyGenerator.computePCodeKeyInfo(pcodes);
        const fname = `__i__${prefix !== undefined ? (prefix + "#") : ""}${tinfo.keyid}::${name}${binfo}${pcinfo}`;
        const shortfname = `${prefix !== undefined ? (prefix + "#") : ""}${tinfo.shortname}::${name}${shortbinfo}${pcinfo}`;
        return { keyid: fname, shortname: shortfname };
    }
    static generateVirtualMethodKey(vname, binds, pcodes) {
        const [binfo, shortbinfo] = MIRKeyGenerator.computeBindsKeyInfo(binds);
        const pcinfo = MIRKeyGenerator.computePCodeKeyInfo(pcodes);
        const iname = `__v__${vname}${binfo}${pcinfo}`;
        const shortvname = `${vname}${shortbinfo}${pcinfo}`;
        return { keyid: iname, shortname: shortvname };
    }
    static generatePCodeKey(isPCodeFn, bodyID) {
        return `${isPCodeFn ? "fn" : "pred"}--${bodyID}`;
    }
    static generateOperatorSignatureKey(ikey, shortname, isprefix, isinfix, sigkeys) {
        if (isprefix) {
            ikey = ikey + "=prefix";
            shortname = shortname + "=prefix";
        }
        if (isinfix) {
            ikey = ikey + "=infix";
            shortname = shortname + "=infix";
        }
        return { keyid: ikey + `=(${sigkeys.join(", ")})`, shortname: shortname + `=(${sigkeys.join(", ")})` };
    }
}
exports.MIRKeyGenerator = MIRKeyGenerator;
class MIREmitter {
    constructor(assembly, masm, emitEnabled) {
        this.pendingOOProcessing = [];
        this.pendingConstExprProcessing = [];
        this.pendingFunctionProcessing = [];
        this.pendingOperatorProcessing = [];
        this.pendingOOMethodProcessing = [];
        this.pendingPCodeProcessing = [];
        this.pendingOPVirtualProcessing = [];
        this.entityInstantiationInfo = [];
        this.allVInvokes = [];
        this.m_blockMap = new Map();
        this.m_currentBlockName = "UNDEFINED";
        this.m_currentBlock = [];
        this.m_tmpIDCtr = 0;
        this.m_capturedNameIDMap = new Map();
        this.yieldPatchInfo = [];
        this.returnPatchInfo = [];
        this.m_activeResultType = undefined;
        this.assembly = assembly;
        this.masm = masm;
        this.emitEnabled = emitEnabled;
    }
    getEmitEnabled() {
        return this.emitEnabled;
    }
    setEmitEnabled(enabled) {
        this.emitEnabled = enabled;
    }
    initializeBodyEmitter(activeResultType) {
        this.m_tmpIDCtr = 0;
        this.m_blockMap = new Map();
        this.m_blockMap.set("entry", new mir_ops_1.MIRBasicBlock("entry", []));
        this.m_blockMap.set("returnassign", new mir_ops_1.MIRBasicBlock("returnassign", []));
        this.m_blockMap.set("exit", new mir_ops_1.MIRBasicBlock("exit", []));
        this.m_currentBlockName = "entry";
        this.m_currentBlock = this.m_blockMap.get("entry").ops;
        this.yieldPatchInfo = [];
        this.returnPatchInfo = [];
        this.m_activeResultType = activeResultType;
    }
    generateTmpRegister() {
        if (!this.emitEnabled) {
            return new mir_ops_1.MIRRegisterArgument(`@tmp_${-1}`);
        }
        return new mir_ops_1.MIRRegisterArgument(`@tmp_${this.m_tmpIDCtr++}`);
    }
    generateCapturedVarName(name, bodyid) {
        if (!this.m_capturedNameIDMap.has(bodyid)) {
            this.m_capturedNameIDMap.set(bodyid, this.m_capturedNameIDMap.size);
        }
        return `@@c_${this.m_capturedNameIDMap.get(bodyid)}_${name}`;
    }
    flattenCapturedPCodeVarCaptures(cc) {
        const ccopts = [...cc].map((ccx) => {
            return [...ccx[1].captured].map((cv) => this.generateCapturedVarName(cv[0], ccx[1].code.bodyID));
        });
        return [].concat(...ccopts).sort();
    }
    createNewBlock(pfx) {
        if (!this.emitEnabled) {
            return "DISABLED";
        }
        const name = `${pfx}_${this.m_blockMap.size}`;
        this.m_blockMap.set(name, new mir_ops_1.MIRBasicBlock(name, []));
        return name;
    }
    getActiveBlockName() {
        return this.m_currentBlockName;
    }
    setActiveBlock(name) {
        if (!this.emitEnabled) {
            return;
        }
        this.m_currentBlockName = name;
        this.m_currentBlock = this.m_blockMap.get(name).ops;
    }
    emitNOP(sinfo) {
        if (!this.emitEnabled) {
            return;
        }
        this.m_currentBlock.push(new mir_ops_1.MIRNop(sinfo));
    }
    emitDeadBlock(sinfo) {
        if (!this.emitEnabled) {
            return;
        }
        this.m_currentBlock.push(new mir_ops_1.MIRDeadFlow(sinfo));
    }
    emitAbort(sinfo, info) {
        if (!this.emitEnabled) {
            return;
        }
        this.m_currentBlock.push(new mir_ops_1.MIRAbort(sinfo, info));
    }
    emitAssertCheck(sinfo, msg, src) {
        if (!this.emitEnabled) {
            return;
        }
        this.m_currentBlock.push(new mir_ops_1.MIRAssertCheck(sinfo, msg, src));
    }
    emitDebugBreak(sinfo) {
        if (!this.emitEnabled) {
            return;
        }
        this.m_currentBlock.push(new mir_ops_1.MIRDebug(sinfo, undefined));
    }
    emitDebugPrint(sinfo, value) {
        if (!this.emitEnabled) {
            return;
        }
        this.m_currentBlock.push(new mir_ops_1.MIRDebug(sinfo, value));
    }
    emitRegisterStore(sinfo, src, trgt, vtype, guard) {
        if (!this.emitEnabled) {
            return;
        }
        this.m_currentBlock.push(new mir_ops_1.MIRRegisterAssign(sinfo, src, trgt, vtype.typeID, guard));
    }
    emitLoadUninitVariableValue(sinfo, oftype, trgt) {
        if (!this.emitEnabled) {
            return;
        }
        //This value will not be accessed from but can be passed/assigned atomically
        //we need to have space for it etc. so just plop a "fresh" or zero-filled value there
        this.m_currentBlock.push(new mir_ops_1.MIRLoadUnintVariableValue(sinfo, trgt, oftype.typeID));
    }
    emitGuardFlagLocation(sinfo, name, count) {
        if (!this.emitEnabled || count === 0) {
            return undefined;
        }
        this.m_currentBlock.push(new mir_ops_1.MIRDeclareGuardFlagLocation(sinfo, name, count));
        return name;
    }
    emitSetGuardFlagConstant(sinfo, name, position, flag) {
        if (!this.emitEnabled) {
            return;
        }
        this.m_currentBlock.push(new mir_ops_1.MIRSetConstantGuardFlag(sinfo, name, position, flag));
    }
    emitConvert(sinfo, srctypelayout, srctypeflow, intotype, src, trgt, guard) {
        if (!this.emitEnabled) {
            return;
        }
        this.m_currentBlock.push(new mir_ops_1.MIRConvertValue(sinfo, srctypelayout.typeID, srctypeflow.typeID, intotype.typeID, src, trgt, guard));
    }
    emitInject(sinfo, srctype, intotype, src, trgt) {
        if (!this.emitEnabled) {
            return;
        }
        this.m_currentBlock.push(new mir_ops_1.MIRInject(sinfo, srctype.typeID, intotype.typeID, src, trgt));
    }
    emitGuardedOptionInject(sinfo, srctype, somethingtype, optiontype, src, trgt, guard) {
        if (!this.emitEnabled) {
            return;
        }
        //either use default or inject into something and convert to Option
        this.m_currentBlock.push(new mir_ops_1.MIRGuardedOptionInject(sinfo, srctype.typeID, somethingtype.typeID, optiontype.typeID, src, trgt, guard));
    }
    emitExtract(sinfo, srctype, intotype, src, trgt) {
        if (!this.emitEnabled) {
            return;
        }
        this.m_currentBlock.push(new mir_ops_1.MIRExtract(sinfo, srctype.typeID, intotype.typeID, src, trgt));
    }
    emitCheckNoError(sinfo, src, srctype, oktype, trgt) {
        if (!this.emitEnabled) {
            return;
        }
        this.m_currentBlock.push(new mir_ops_1.MIRIsTypeOf(sinfo, trgt, oktype.typeID, src, srctype.typeID, srctype.typeID, undefined));
    }
    emitLoadConstNone(sinfo, trgt) {
        if (!this.emitEnabled) {
            return;
        }
        this.m_currentBlock.push(new mir_ops_1.MIRLoadConst(sinfo, new mir_ops_1.MIRConstantNone(), this.registerResolvedTypeReference(this.assembly.getSpecialNoneType()).typeID, trgt));
    }
    emitLoadConstNothing(sinfo, trgt) {
        if (!this.emitEnabled) {
            return;
        }
        this.m_currentBlock.push(new mir_ops_1.MIRLoadConst(sinfo, new mir_ops_1.MIRConstantNothing(), this.registerResolvedTypeReference(this.assembly.getSpecialNothingType()).typeID, trgt));
    }
    emitLoadConstBool(sinfo, bv, trgt) {
        if (!this.emitEnabled) {
            return;
        }
        this.m_currentBlock.push(new mir_ops_1.MIRLoadConst(sinfo, bv ? new mir_ops_1.MIRConstantTrue() : new mir_ops_1.MIRConstantFalse(), this.registerResolvedTypeReference(this.assembly.getSpecialBoolType()).typeID, trgt));
    }
    emitLoadConstIntegralValue(sinfo, itype, vv, trgt) {
        if (!this.emitEnabled) {
            return;
        }
        if (itype.typeID === "NSCore::Int") {
            this.m_currentBlock.push(new mir_ops_1.MIRLoadConst(sinfo, new mir_ops_1.MIRConstantInt(vv), itype.typeID, trgt));
        }
        else if (itype.typeID === "NSCore::Nat") {
            this.m_currentBlock.push(new mir_ops_1.MIRLoadConst(sinfo, new mir_ops_1.MIRConstantNat(vv), itype.typeID, trgt));
        }
        else if (itype.typeID === "NSCore::BigInt") {
            this.m_currentBlock.push(new mir_ops_1.MIRLoadConst(sinfo, new mir_ops_1.MIRConstantBigInt(vv), itype.typeID, trgt));
        }
        else {
            this.m_currentBlock.push(new mir_ops_1.MIRLoadConst(sinfo, new mir_ops_1.MIRConstantBigNat(vv), itype.typeID, trgt));
        }
    }
    emitLoadConstRational(sinfo, iv, trgt) {
        if (!this.emitEnabled) {
            return;
        }
        this.m_currentBlock.push(new mir_ops_1.MIRLoadConst(sinfo, new mir_ops_1.MIRConstantRational(iv), this.registerResolvedTypeReference(this.assembly.getSpecialRationalType()).typeID, trgt));
    }
    emitLoadConstFloatPoint(sinfo, ftype, fv, trgt) {
        if (!this.emitEnabled) {
            return;
        }
        if (ftype.typeID === "NSCore::Float") {
            this.m_currentBlock.push(new mir_ops_1.MIRLoadConst(sinfo, new mir_ops_1.MIRConstantFloat(fv), ftype.typeID, trgt));
        }
        else {
            this.m_currentBlock.push(new mir_ops_1.MIRLoadConst(sinfo, new mir_ops_1.MIRConstantDecimal(fv), ftype.typeID, trgt));
        }
    }
    emitLoadConstString(sinfo, sv, trgt) {
        if (!this.emitEnabled) {
            return;
        }
        this.m_currentBlock.push(new mir_ops_1.MIRLoadConst(sinfo, new mir_ops_1.MIRConstantString(sv), this.registerResolvedTypeReference(this.assembly.getSpecialStringType()).typeID, trgt));
    }
    emitLoadLiteralRegex(sinfo, restr, trgt) {
        if (!this.emitEnabled) {
            return;
        }
        this.m_currentBlock.push(new mir_ops_1.MIRLoadConst(sinfo, new mir_ops_1.MIRConstantRegex(restr), this.registerResolvedTypeReference(this.assembly.getSpecialRegexType()).typeID, trgt));
    }
    emitLoadLiteralStringOf(sinfo, sv, tskey, trgt) {
        if (!this.emitEnabled) {
            return;
        }
        this.m_currentBlock.push(new mir_ops_1.MIRLoadConst(sinfo, new mir_ops_1.MIRConstantStringOf(sv, tskey), tskey, trgt));
    }
    emitLoadConstDataString(sinfo, sv, tskey, trgt) {
        if (!this.emitEnabled) {
            return;
        }
        this.m_currentBlock.push(new mir_ops_1.MIRLoadConst(sinfo, new mir_ops_1.MIRConstantDataString(sv, tskey), tskey, trgt));
    }
    emitLoadTypedNumeric(sinfo, nv, tnkey, trgt) {
        if (!this.emitEnabled) {
            return;
        }
        this.m_currentBlock.push(new mir_ops_1.MIRLoadConst(sinfo, new mir_ops_1.MIRConstantTypedNumber(nv, tnkey), tnkey, trgt));
    }
    emitTupleHasIndex(sinfo, arg, arglayouttype, argflowtype, idx, trgt) {
        if (!this.emitEnabled) {
            return;
        }
        this.m_currentBlock.push(new mir_ops_1.MIRTupleHasIndex(sinfo, arg, arglayouttype.typeID, argflowtype.typeID, idx, trgt));
    }
    emitRecordHasProperty(sinfo, arg, arglayouttype, argflowtype, pname, trgt) {
        if (!this.emitEnabled) {
            return;
        }
        this.m_currentBlock.push(new mir_ops_1.MIRRecordHasProperty(sinfo, arg, arglayouttype.typeID, argflowtype.typeID, pname, trgt));
    }
    emitLoadTupleIndex(sinfo, arg, arglayouttype, argflowtype, idx, isvirtual, resulttype, trgt) {
        if (!this.emitEnabled) {
            return;
        }
        this.m_currentBlock.push(new mir_ops_1.MIRLoadTupleIndex(sinfo, arg, arglayouttype.typeID, argflowtype.typeID, idx, isvirtual, resulttype.typeID, trgt));
    }
    emitLoadTupleIndexSetGuard(sinfo, arg, arglayouttype, argflowtype, idx, isvirtual, resulttype, trgt, guard) {
        if (!this.emitEnabled) {
            return;
        }
        this.m_currentBlock.push(new mir_ops_1.MIRLoadTupleIndexSetGuard(sinfo, arg, arglayouttype.typeID, argflowtype.typeID, idx, isvirtual, resulttype.typeID, trgt, guard));
    }
    emitLoadProperty(sinfo, arg, arglayouttype, argflowtype, pname, isvirtual, resulttype, trgt) {
        if (!this.emitEnabled) {
            return;
        }
        this.m_currentBlock.push(new mir_ops_1.MIRLoadRecordProperty(sinfo, arg, arglayouttype.typeID, argflowtype.typeID, pname, isvirtual, resulttype.typeID, trgt));
    }
    emitLoadRecordPropertySetGuard(sinfo, arg, arglayouttype, argflowtype, pname, isvirtual, resulttype, trgt, guard) {
        if (!this.emitEnabled) {
            return;
        }
        this.m_currentBlock.push(new mir_ops_1.MIRLoadRecordPropertySetGuard(sinfo, arg, arglayouttype.typeID, argflowtype.typeID, pname, isvirtual, resulttype.typeID, trgt, guard));
    }
    emitLoadField(sinfo, arg, arglayouttype, argflowtype, fname, isvirtual, resulttype, trgt) {
        if (!this.emitEnabled) {
            return;
        }
        this.m_currentBlock.push(new mir_ops_1.MIRLoadField(sinfo, arg, arglayouttype.typeID, argflowtype.typeID, fname, isvirtual, resulttype.typeID, trgt));
    }
    emitTupleProjectToEphemeral(sinfo, arg, arglayouttype, argflowtype, indecies, isvirtual, epht, trgt) {
        if (!this.emitEnabled) {
            return;
        }
        this.m_currentBlock.push(new mir_ops_1.MIRTupleProjectToEphemeral(sinfo, arg, arglayouttype.typeID, argflowtype.typeID, indecies, isvirtual, this.registerResolvedTypeReference(resolved_type_1.ResolvedType.createSingle(epht)).typeID, trgt));
    }
    emitRecordProjectToEphemeral(sinfo, arg, arglayouttype, argflowtype, properties, isvirtual, epht, trgt) {
        if (!this.emitEnabled) {
            return;
        }
        this.m_currentBlock.push(new mir_ops_1.MIRRecordProjectToEphemeral(sinfo, arg, arglayouttype.typeID, argflowtype.typeID, properties, isvirtual, this.registerResolvedTypeReference(resolved_type_1.ResolvedType.createSingle(epht)).typeID, trgt));
    }
    emitEntityProjectToEphemeral(sinfo, arg, arglayouttype, argflowtype, fields, isvirtual, epht, trgt) {
        if (!this.emitEnabled) {
            return;
        }
        this.m_currentBlock.push(new mir_ops_1.MIREntityProjectToEphemeral(sinfo, arg, arglayouttype.typeID, argflowtype.typeID, fields, isvirtual, this.registerResolvedTypeReference(resolved_type_1.ResolvedType.createSingle(epht)).typeID, trgt));
    }
    emitTupleUpdate(sinfo, arg, arglayouttype, argflowtype, updates, isvirtual, trgt) {
        if (!this.emitEnabled) {
            return;
        }
        const upds = updates.map((upd) => [upd[0], upd[2], this.registerResolvedTypeReference(upd[1]).typeID]);
        this.m_currentBlock.push(new mir_ops_1.MIRTupleUpdate(sinfo, arg, arglayouttype.typeID, argflowtype.typeID, upds, isvirtual, trgt));
    }
    emitRecordUpdate(sinfo, arg, arglayouttype, argflowtype, updates, isvirtual, trgt) {
        if (!this.emitEnabled) {
            return;
        }
        const upds = updates.map((upd) => [upd[0], upd[2], this.registerResolvedTypeReference(upd[1]).typeID]);
        this.m_currentBlock.push(new mir_ops_1.MIRRecordUpdate(sinfo, arg, arglayouttype.typeID, argflowtype.typeID, upds, isvirtual, trgt));
    }
    emitEntityUpdate(sinfo, arg, arglayouttype, argflowtype, updates, isvirtual, trgt) {
        if (!this.emitEnabled) {
            return;
        }
        const upds = updates.map((upd) => [upd[0], upd[2], this.registerResolvedTypeReference(upd[1]).typeID]);
        this.m_currentBlock.push(new mir_ops_1.MIREntityUpdate(sinfo, arg, arglayouttype.typeID, argflowtype.typeID, upds, isvirtual, trgt));
    }
    emitLoadFromEpehmeralList(sinfo, arg, argtype, idx, resulttype, trgt) {
        if (!this.emitEnabled) {
            return;
        }
        this.m_currentBlock.push(new mir_ops_1.MIRLoadFromEpehmeralList(sinfo, arg, argtype.typeID, idx, resulttype.typeID, trgt));
    }
    emitMultiLoadFromEpehmeralList(sinfo, arg, argtype, trgts) {
        if (!this.emitEnabled) {
            return;
        }
        const etrgts = trgts.map((trgt) => {
            return { pos: trgt.pos, into: trgt.into, oftype: trgt.oftype.typeID };
        });
        this.m_currentBlock.push(new mir_ops_1.MIRMultiLoadFromEpehmeralList(sinfo, arg, argtype.typeID, etrgts));
    }
    emitInvokeFixedFunction(sinfo, ikey, args, optstatusmask, rretinfo, trgt) {
        if (!this.emitEnabled) {
            return;
        }
        const retinfo = rretinfo instanceof mir_assembly_1.MIRType ? { declresult: rretinfo, runtimeresult: rretinfo, elrcount: -1, refargs: [] } : rretinfo;
        if (retinfo.refargs.length === 0) {
            this.m_currentBlock.push(new mir_ops_1.MIRInvokeFixedFunction(sinfo, retinfo.declresult.typeID, ikey, args, optstatusmask, trgt, undefined));
        }
        else {
            const rr = this.generateTmpRegister();
            this.m_currentBlock.push(new mir_ops_1.MIRInvokeFixedFunction(sinfo, retinfo.runtimeresult.typeID, ikey, args, optstatusmask, rr, undefined));
            if (retinfo.elrcount === -1) {
                this.m_currentBlock.push(new mir_ops_1.MIRLoadFromEpehmeralList(sinfo, rr, retinfo.runtimeresult.typeID, 0, retinfo.declresult.typeID, trgt));
            }
            else {
                this.m_currentBlock.push(new mir_ops_1.MIRSliceEpehmeralList(sinfo, rr, retinfo.runtimeresult.typeID, retinfo.declresult.typeID, trgt));
            }
            const refbase = retinfo.elrcount != -1 ? retinfo.elrcount : 1;
            const argvs = retinfo.refargs.map((rinfo, idx) => {
                return { pos: refbase + idx, into: rinfo[0], oftype: retinfo.declresult.options[0].entries[refbase + idx] };
            });
            this.emitMultiLoadFromEpehmeralList(sinfo, rr, retinfo.declresult, argvs);
        }
    }
    emitInvokeFixedFunctionWithGuard(sinfo, ikey, args, optstatusmask, retinfo, trgt, guard) {
        if (!this.emitEnabled) {
            return;
        }
        this.m_currentBlock.push(new mir_ops_1.MIRInvokeFixedFunction(sinfo, retinfo.typeID, ikey, args, optstatusmask, trgt, guard));
    }
    emitInvokeVirtualFunction(sinfo, vresolve, shortvname, rcvrlayouttype, rcvrflowtype, args, optstatusmask, rretinfo, trgt) {
        if (!this.emitEnabled) {
            return;
        }
        const retinfo = rretinfo instanceof mir_assembly_1.MIRType ? { declresult: rretinfo, runtimeresult: rretinfo, elrcount: -1, refargs: [] } : rretinfo;
        if (retinfo.refargs.length === 0) {
            this.m_currentBlock.push(new mir_ops_1.MIRInvokeVirtualFunction(sinfo, retinfo.declresult.typeID, vresolve, shortvname, rcvrlayouttype.typeID, rcvrflowtype.typeID, args, optstatusmask, trgt));
        }
        else {
            const rr = this.generateTmpRegister();
            this.m_currentBlock.push(new mir_ops_1.MIRInvokeVirtualFunction(sinfo, retinfo.runtimeresult.typeID, vresolve, shortvname, rcvrlayouttype.typeID, rcvrflowtype.typeID, args, optstatusmask, rr));
            if (retinfo.elrcount === -1) {
                this.m_currentBlock.push(new mir_ops_1.MIRLoadFromEpehmeralList(sinfo, rr, retinfo.runtimeresult.typeID, 0, retinfo.declresult.typeID, trgt));
            }
            else {
                this.m_currentBlock.push(new mir_ops_1.MIRSliceEpehmeralList(sinfo, rr, retinfo.runtimeresult.typeID, retinfo.declresult.typeID, trgt));
            }
            const refbase = retinfo.elrcount != -1 ? retinfo.elrcount : 1;
            const argvs = retinfo.refargs.map((rinfo, idx) => {
                return { pos: refbase + idx, into: rinfo[0], oftype: retinfo.declresult.options[0].entries[refbase + idx] };
            });
            this.emitMultiLoadFromEpehmeralList(sinfo, rr, retinfo.declresult, argvs);
        }
    }
    emitInvokeVirtualOperator(sinfo, vresolve, shortvname, args, retinfo, trgt) {
        const eargs = args.map((arg) => {
            return { arglayouttype: arg.arglayouttype.typeID, argflowtype: arg.argflowtype.typeID, arg: arg.arg };
        });
        if (retinfo.refargs.length === 0) {
            this.m_currentBlock.push(new mir_ops_1.MIRInvokeVirtualOperator(sinfo, retinfo.declresult.typeID, vresolve, shortvname, eargs, trgt));
        }
        else {
            const rr = this.generateTmpRegister();
            this.m_currentBlock.push(new mir_ops_1.MIRInvokeVirtualOperator(sinfo, retinfo.runtimeresult.typeID, vresolve, shortvname, eargs, rr));
            if (retinfo.elrcount === -1) {
                this.m_currentBlock.push(new mir_ops_1.MIRLoadFromEpehmeralList(sinfo, rr, retinfo.runtimeresult.typeID, 0, retinfo.declresult.typeID, trgt));
            }
            else {
                this.m_currentBlock.push(new mir_ops_1.MIRSliceEpehmeralList(sinfo, rr, retinfo.runtimeresult.typeID, retinfo.declresult.typeID, trgt));
            }
            const refbase = retinfo.elrcount != -1 ? retinfo.elrcount : 1;
            const argvs = retinfo.refargs.map((rinfo, idx) => {
                return { pos: refbase + idx, into: rinfo[0], oftype: retinfo.declresult.options[0].entries[refbase + idx] };
            });
            this.emitMultiLoadFromEpehmeralList(sinfo, rr, retinfo.declresult, argvs);
        }
    }
    emitConstructorTuple(sinfo, resultTupleType, args, trgt) {
        if (!this.emitEnabled) {
            return;
        }
        this.m_currentBlock.push(new mir_ops_1.MIRConstructorTuple(sinfo, resultTupleType.typeID, args, trgt));
    }
    emitConstructorTupleFromEphemeralList(sinfo, resultTupleType, arg, elisttype, trgt) {
        if (!this.emitEnabled) {
            return;
        }
        this.m_currentBlock.push(new mir_ops_1.MIRConstructorTupleFromEphemeralList(sinfo, resultTupleType.typeID, arg, elisttype.typeID, trgt));
    }
    emitConstructorRecord(sinfo, resultRecordType, args, trgt) {
        if (!this.emitEnabled) {
            return;
        }
        this.m_currentBlock.push(new mir_ops_1.MIRConstructorRecord(sinfo, resultRecordType.typeID, args, trgt));
    }
    emitConstructorRecordFromEphemeralList(sinfo, resultRecordType, arg, elisttype, namelayout, trgt) {
        if (!this.emitEnabled) {
            return;
        }
        this.m_currentBlock.push(new mir_ops_1.MIRConstructorRecordFromEphemeralList(sinfo, resultRecordType.typeID, arg, elisttype.typeID, namelayout, trgt));
    }
    emitStructuredAppendTuple(sinfo, resultTupleType, args, ttypes, trgt) {
        if (!this.emitEnabled) {
            return;
        }
        const etypes = ttypes.map((tt) => {
            return { layout: tt.layout.typeID, flow: tt.flow.typeID };
        });
        this.m_currentBlock.push(new mir_ops_1.MIRStructuredAppendTuple(sinfo, resultTupleType.typeID, args, etypes, trgt));
    }
    emitStructuredJoinRecord(sinfo, resultRecordType, args, ttypes, trgt) {
        if (!this.emitEnabled) {
            return;
        }
        const etypes = ttypes.map((tt) => {
            return { layout: tt.layout.typeID, flow: tt.flow.typeID };
        });
        this.m_currentBlock.push(new mir_ops_1.MIRStructuredJoinRecord(sinfo, resultRecordType.typeID, args, etypes, trgt));
    }
    emitConstructorValueList(sinfo, resultEphemeralType, args, trgt) {
        if (!this.emitEnabled) {
            return;
        }
        this.m_currentBlock.push(new mir_ops_1.MIRConstructorEphemeralList(sinfo, resultEphemeralType.typeID, args, trgt));
    }
    emitMIRPackExtend(sinfo, basepack, basetype, ext, sltype, trgt) {
        if (!this.emitEnabled) {
            return;
        }
        this.m_currentBlock.push(new mir_ops_1.MIREphemeralListExtend(sinfo, basepack, basetype.typeID, ext, sltype.typeID, trgt));
    }
    emitConstructorPrimaryCollectionEmpty(sinfo, tkey, trgt) {
        if (!this.emitEnabled) {
            return;
        }
        this.m_currentBlock.push(new mir_ops_1.MIRConstructorPrimaryCollectionEmpty(sinfo, tkey, trgt));
    }
    emitConstructorPrimaryCollectionSingletons(sinfo, tkey, args, trgt) {
        if (!this.emitEnabled) {
            return;
        }
        this.m_currentBlock.push(new mir_ops_1.MIRConstructorPrimaryCollectionSingletons(sinfo, tkey, args.map((arg) => [arg[0].typeID, arg[1]]), trgt));
    }
    emitConstructorPrimaryCollectionCopies(sinfo, tkey, args, trgt) {
        if (!this.emitEnabled) {
            return;
        }
        this.m_currentBlock.push(new mir_ops_1.MIRConstructorPrimaryCollectionCopies(sinfo, tkey, args.map((arg) => [arg[0].typeID, arg[1]]), trgt));
    }
    emitConstructorPrimaryCollectionMixed(sinfo, tkey, args, trgt) {
        if (!this.emitEnabled) {
            return;
        }
        this.m_currentBlock.push(new mir_ops_1.MIRConstructorPrimaryCollectionMixed(sinfo, tkey, args.map((arg) => [arg[0], arg[1].typeID, arg[2]]), trgt));
    }
    emitBinKeyEq(sinfo, lhslayouttype, lhs, rhslayouttype, rhs, cmptype, trgt, guard, lhsflowtype, rhsflowtype) {
        if (!this.emitEnabled) {
            return;
        }
        this.m_currentBlock.push(new mir_ops_1.MIRBinKeyEq(sinfo, lhslayouttype.typeID, lhs, rhslayouttype.typeID, rhs, cmptype.typeID, trgt, guard, lhsflowtype.typeID, rhsflowtype.typeID));
    }
    emitBinKeyLess(sinfo, lhslayouttype, lhs, rhslayouttype, rhs, cmptype, trgt, guard, lhsflowtype, rhsflowtype) {
        if (!this.emitEnabled) {
            return;
        }
        this.m_currentBlock.push(new mir_ops_1.MIRBinKeyLess(sinfo, lhslayouttype.typeID, lhs, rhslayouttype.typeID, rhs, cmptype.typeID, trgt, guard, lhsflowtype.typeID, rhsflowtype.typeID));
    }
    emitPrefixNotOp(sinfo, arg, trgt) {
        if (!this.emitEnabled) {
            return;
        }
        this.m_currentBlock.push(new mir_ops_1.MIRPrefixNotOp(sinfo, arg, trgt));
    }
    emitTypeOf(sinfo, trgt, chktype, src, srclayouttype, srcflowtype, guard) {
        if (!this.emitEnabled) {
            return;
        }
        this.m_currentBlock.push(new mir_ops_1.MIRIsTypeOf(sinfo, trgt, chktype.typeID, src, srclayouttype.typeID, srcflowtype.typeID, guard));
    }
    emitDirectJump(sinfo, blck) {
        if (!this.emitEnabled) {
            return;
        }
        this.m_currentBlock.push(new mir_ops_1.MIRJump(sinfo, blck));
    }
    emitBoolJump(sinfo, arg, trueblck, falseblck) {
        if (!this.emitEnabled) {
            return;
        }
        this.m_currentBlock.push(new mir_ops_1.MIRJumpCond(sinfo, arg, trueblck, falseblck));
    }
    emitNoneJump(sinfo, arg, arglayout, noneblck, someblk) {
        if (!this.emitEnabled) {
            return;
        }
        this.m_currentBlock.push(new mir_ops_1.MIRJumpNone(sinfo, arg, arglayout.typeID, noneblck, someblk));
    }
    emitReturnAssign(sinfo, src, rtype) {
        if (!this.emitEnabled) {
            return;
        }
        this.m_currentBlock.push(new mir_ops_1.MIRReturnAssign(sinfo, src, rtype.typeID));
    }
    emitReturnAssignOfCons(sinfo, oftype, args) {
        if (!this.emitEnabled) {
            return;
        }
        this.m_currentBlock.push(new mir_ops_1.MIRReturnAssignOfCons(sinfo, oftype.typeID, args));
    }
    processEnterYield() {
        if (!this.emitEnabled) {
            return;
        }
        this.yieldPatchInfo.push([]);
    }
    getActiveYieldSet() {
        return this.emitEnabled ? this.yieldPatchInfo[this.yieldPatchInfo.length - 1] : [];
    }
    processExitYield() {
        if (!this.emitEnabled) {
            return;
        }
        this.yieldPatchInfo.pop();
    }
    getActiveReturnSet() {
        return this.emitEnabled ? this.returnPatchInfo : [];
    }
    localLifetimeStart(sinfo, name, vtype) {
        if (!this.emitEnabled) {
            return;
        }
        this.m_currentBlock.push(new mir_ops_1.MIRVarLifetimeStart(sinfo, name, vtype.typeID));
    }
    localLifetimeEnd(sinfo, name) {
        if (!this.emitEnabled) {
            return;
        }
        this.m_currentBlock.push(new mir_ops_1.MIRVarLifetimeEnd(sinfo, name));
    }
    getBody(file, sinfo) {
        if (!this.emitEnabled) {
            return undefined;
        }
        let ibody = new mir_ops_1.MIRBody(file, sinfo, this.m_blockMap);
        mir_cleanup_1.simplifyBody(ibody);
        return ibody;
    }
    getVCallInstantiations(assembly) {
        if (this.allVInvokes.length === 0) {
            return [];
        }
        let resvi = new Map();
        for (let i = 0; i < this.allVInvokes.length; ++i) {
            const vinv = this.allVInvokes[i];
            const vcpt = vinv.enclosingtype;
            const impls = this.entityInstantiationInfo.filter((iinfo) => {
                if (iinfo.ootype instanceof assembly_1.EntityTypeDecl) {
                    const etype = resolved_type_1.ResolvedType.createSingle(resolved_type_1.ResolvedEntityAtomType.create(iinfo.ootype, iinfo.binds));
                    return assembly.subtypeOf(etype, vcpt);
                }
                else {
                    const cpt = resolved_type_1.ResolvedConceptAtomType.create([resolved_type_1.ResolvedConceptAtomTypeEntry.create(iinfo.ootype, iinfo.binds)]);
                    const ctype = resolved_type_1.ResolvedType.createSingle(cpt);
                    return assembly.subtypeOf(ctype, vcpt);
                }
            });
            for (let j = 0; j < impls.length; ++j) {
                const impl = impls[j];
                const itype = resolved_type_1.ResolvedType.createSingle(resolved_type_1.ResolvedEntityAtomType.create(impl.ootype, impl.binds));
                const mcreate_multi = assembly.tryGetMethodUniqueConcreteDeclFromType(itype, vinv.name);
                if (mcreate_multi !== undefined) {
                    const mcreate = new assembly_1.OOMemberLookupInfo(mcreate_multi.contiainingType, mcreate_multi.decl[0], mcreate_multi.binds);
                    const binds = new Map(mcreate.binds);
                    vinv.binds.forEach((v, k) => binds.set(k, v));
                    const mctype = (mcreate.contiainingType instanceof assembly_1.EntityTypeDecl) ? resolved_type_1.ResolvedType.createSingle(resolved_type_1.ResolvedEntityAtomType.create(mcreate.contiainingType, mcreate.binds)) : resolved_type_1.ResolvedType.createSingle(resolved_type_1.ResolvedConceptAtomType.create([resolved_type_1.ResolvedConceptAtomTypeEntry.create(mcreate.contiainingType, mcreate.binds)]));
                    const mirmctype = this.registerResolvedTypeReference(mctype);
                    const mkey = MIRKeyGenerator.generateFunctionKeyWType(mctype, mcreate.decl.name, binds, vinv.pcodes);
                    if (!resvi.has(mkey.keyid)) {
                        resvi.set(mkey.keyid, [vinv.vkey, mkey.keyid, mcreate.decl.name, `${mirmctype.typeID}::${mcreate.decl.name}`, [mirmctype, mcreate.contiainingType, mcreate.binds], mcreate.decl, binds, vinv.pcodes, vinv.cargs]);
                    }
                }
            }
        }
        let fres = [];
        resvi.forEach((v) => fres.push(v));
        return fres;
    }
    generateSigKeys(invoke, binds) {
        const sigkeys = [];
        for (let i = 0; i < invoke.params.length; ++i) {
            const ptype = this.assembly.normalizeTypeGeneral(invoke.params[i], binds);
            if (ptype instanceof resolved_type_1.ResolvedFunctionType || ptype.isEmptyType()) {
                continue;
            }
            if (invoke.params[i].litexp === undefined) {
                sigkeys.push(this.registerResolvedTypeReference(ptype).typeID);
            }
            else {
                const lev = invoke.params[i].litexp;
                const cexp = this.assembly.reduceLiteralValueToCanonicalForm(lev.exp, binds, ptype);
                if (cexp === undefined) {
                    return [];
                }
                sigkeys.push(cexp[2]);
            }
        }
        return sigkeys;
    }
    getVirtualOpImpls(vkey, optns, optenclosingType, name, binds, pcodes, cargs) {
        let impls = [];
        if (optns !== undefined) {
            const ns = optns;
            const nsd = this.assembly.getNamespace(ns);
            if (nsd !== undefined) {
                nsd.operators.forEach((op) => {
                    if (op[1].name === name && !assembly_1.OOPTypeDecl.attributeSetContains("abstract", op[1].invoke.attributes)) {
                        const sigkeys = this.generateSigKeys(op[1].invoke, binds);
                        const key = MIRKeyGenerator.generateFunctionKeyWNamespace(ns, name, binds, pcodes);
                        const okey = MIRKeyGenerator.generateOperatorSignatureKey(key.keyid, key.shortname, op[1].isPrefix, op[1].isInfix, sigkeys);
                        impls.push([vkey, okey.keyid, op[1].name, `${ns}::${op[1].name}`, undefined, op[1].invoke, binds, pcodes, cargs]);
                    }
                });
            }
        }
        else {
            const enclosingType = optenclosingType;
            const ootype = enclosingType[2];
            ootype.staticOperators.forEach((op) => {
                if (op.name === name && !assembly_1.OOPTypeDecl.attributeSetContains("abstract", op.invoke.attributes)) {
                    const sigkeys = this.generateSigKeys(op.invoke, binds);
                    const key = MIRKeyGenerator.generateFunctionKeyWType(enclosingType[0], name, binds, pcodes);
                    const okey = MIRKeyGenerator.generateOperatorSignatureKey(key.keyid, key.shortname, op.isPrefix, op.isInfix, sigkeys);
                    impls.push([vkey, okey.keyid, op.name, `${enclosingType[0].typeID}::${op.name}`, enclosingType, op.invoke, binds, pcodes, cargs]);
                }
            });
        }
        return impls;
    }
    registerTypeInstantiation(rtype, decl, binds) {
        if (!this.emitEnabled) {
            return;
        }
        const key = MIRKeyGenerator.generateTypeKey(rtype);
        if (this.masm.conceptDecls.has(key.keyid) || this.masm.entityDecls.has(key.keyid) || this.pendingOOProcessing.findIndex((oop) => oop.tkey === key.keyid) !== -1) {
            return;
        }
        if (decl.ns === "NSCore" && decl.name === "Result") {
            const okdecl = this.assembly.tryGetObjectTypeForFullyResolvedName("NSCore::Result::Ok");
            const okkey = MIRKeyGenerator.generateTypeKey(resolved_type_1.ResolvedType.createSingle(resolved_type_1.ResolvedEntityAtomType.create(okdecl, binds)));
            const okentry = { tkey: okkey.keyid, shortname: okkey.shortname, ootype: okdecl, binds: binds };
            if (!this.masm.entityDecls.has(okkey.keyid) && this.pendingOOProcessing.findIndex((oop) => oop.tkey === okkey.keyid) === -1) {
                this.pendingOOProcessing.push(okentry);
                this.entityInstantiationInfo.push(okentry);
                if (this.emitEnabled) {
                    const ft = mir_assembly_1.MIREntityType.create(okkey.keyid, okkey.shortname);
                    this.masm.typeMap.set(ft.typeID, mir_assembly_1.MIRType.createSingle(ft));
                }
            }
            const errdecl = this.assembly.tryGetObjectTypeForFullyResolvedName("NSCore::Result::Err");
            const errkey = MIRKeyGenerator.generateTypeKey(resolved_type_1.ResolvedType.createSingle(resolved_type_1.ResolvedEntityAtomType.create(errdecl, binds)));
            const errentry = { tkey: errkey.keyid, shortname: errkey.shortname, ootype: errdecl, binds: binds };
            if (!this.masm.entityDecls.has(errkey.keyid) && this.pendingOOProcessing.findIndex((oop) => oop.tkey === errkey.keyid) === -1) {
                this.pendingOOProcessing.push(errentry);
                this.entityInstantiationInfo.push(errentry);
                if (this.emitEnabled) {
                    const ft = mir_assembly_1.MIREntityType.create(errkey.keyid, errkey.shortname);
                    this.masm.typeMap.set(ft.typeID, mir_assembly_1.MIRType.createSingle(ft));
                }
            }
        }
        if (decl.ns === "NSCore" && decl.name === "Option") {
            const somethingdecl = this.assembly.tryGetObjectTypeForFullyResolvedName("NSCore::Something");
            const somethngkey = MIRKeyGenerator.generateTypeKey(resolved_type_1.ResolvedType.createSingle(resolved_type_1.ResolvedEntityAtomType.create(somethingdecl, binds)));
            const somethingentry = { tkey: somethngkey.keyid, shortname: somethngkey.shortname, ootype: somethingdecl, binds: binds };
            if (!this.masm.entityDecls.has(somethngkey.keyid) && this.pendingOOProcessing.findIndex((oop) => oop.tkey === somethngkey.keyid) === -1) {
                this.pendingOOProcessing.push(somethingentry);
                this.entityInstantiationInfo.push(somethingentry);
                if (this.emitEnabled) {
                    const ft = mir_assembly_1.MIREntityType.create(somethngkey.keyid, somethngkey.shortname);
                    this.masm.typeMap.set(ft.typeID, mir_assembly_1.MIRType.createSingle(ft));
                }
            }
        }
        this.pendingOOProcessing.push({ tkey: key.keyid, shortname: key.shortname, ootype: decl, binds: binds });
        this.entityInstantiationInfo.push({ tkey: key.keyid, shortname: key.shortname, ootype: decl, binds: binds });
    }
    registerResolvedTypeReference(t) {
        if (t.options.length > 1) {
            const oopts = t.options.map((opt) => this.registerResolvedTypeReference(resolved_type_1.ResolvedType.createSingle(opt)).options);
            const ft = mir_assembly_1.MIRType.create([].concat(...oopts));
            if (this.emitEnabled) {
                this.masm.typeMap.set(ft.typeID, ft);
            }
            return ft;
        }
        else {
            const sopt = t.options[0];
            const rtt = resolved_type_1.ResolvedType.createSingle(sopt);
            let rt = undefined;
            if (sopt instanceof resolved_type_1.ResolvedEntityAtomType) {
                if (this.emitEnabled) {
                    this.registerTypeInstantiation(rtt, sopt.object, sopt.binds);
                }
                const ekey = MIRKeyGenerator.generateTypeKey(rtt);
                rt = mir_assembly_1.MIREntityType.create(ekey.keyid, ekey.shortname);
            }
            else if (sopt instanceof resolved_type_1.ResolvedConceptAtomType) {
                if (sopt.conceptTypes.length > 1) {
                    sopt.conceptTypes.forEach((opt) => this.registerResolvedTypeReference(resolved_type_1.ResolvedType.createSingle(resolved_type_1.ResolvedConceptAtomType.create([opt]))));
                }
                const natoms = sopt.conceptTypes.map((cpt) => {
                    this.registerTypeInstantiation(rtt, cpt.concept, cpt.binds);
                    return MIRKeyGenerator.generateTypeKey(rtt);
                });
                rt = mir_assembly_1.MIRConceptType.create(natoms.map((kk) => [kk.keyid, kk.shortname]));
            }
            else if (sopt instanceof resolved_type_1.ResolvedTupleAtomType) {
                const tatoms = sopt.types.map((entry) => this.registerResolvedTypeReference(entry));
                rt = mir_assembly_1.MIRTupleType.create(tatoms);
                if (!this.masm.tupleDecls.has(rt.typeID)) {
                    this.masm.tupleDecls.set(rt.typeID, rt);
                }
            }
            else if (sopt instanceof resolved_type_1.ResolvedRecordAtomType) {
                const tatoms = sopt.entries.map((entry) => { return { pname: entry.pname, ptype: this.registerResolvedTypeReference(entry.ptype) }; });
                rt = mir_assembly_1.MIRRecordType.create(tatoms);
                if (!this.masm.recordDecls.has(rt.typeID)) {
                    this.masm.recordDecls.set(rt.typeID, rt);
                }
            }
            else {
                const vpatoms = sopt.types.map((tt) => this.registerResolvedTypeReference(tt));
                rt = mir_assembly_1.MIREphemeralListType.create(vpatoms);
                if (!this.masm.ephemeralListDecls.has(rt.typeID)) {
                    this.masm.ephemeralListDecls.set(rt.typeID, rt);
                }
            }
            const ft = mir_assembly_1.MIRType.create([rt]);
            if (this.emitEnabled) {
                this.masm.typeMap.set(ft.typeID, ft);
            }
            return ft;
        }
    }
    registerPendingGlobalProcessing(decl, etype) {
        const gkey = MIRKeyGenerator.generateGlobalKeyWNamespace(decl.ns, decl.name);
        if (!this.emitEnabled || this.masm.constantDecls.has(gkey.keyid) || this.pendingConstExprProcessing.findIndex((gp) => gp.gkey === gkey.keyid) !== -1) {
            return gkey;
        }
        this.pendingConstExprProcessing.push({ gkey: gkey.keyid, shortname: gkey.shortname, name: decl.name, srcFile: decl.srcFile, containingType: undefined, cexp: decl.value, attribs: ["static_initializer", ...decl.attributes], binds: new Map(), ddecltype: etype });
        return gkey;
    }
    registerPendingConstProcessing(resolvedcontaining, containingtype, decl, binds, etype) {
        const gkey = MIRKeyGenerator.generateGlobalKeyWType(resolvedcontaining, decl.name);
        if (!this.emitEnabled || this.masm.constantDecls.has(gkey.keyid) || this.pendingConstExprProcessing.findIndex((cp) => cp.gkey === gkey.keyid) !== -1) {
            return gkey;
        }
        this.pendingConstExprProcessing.push({ gkey: gkey.keyid, shortname: gkey.shortname, name: decl.name, srcFile: decl.srcFile, containingType: containingtype, cexp: decl.value, attribs: ["static_initializer", ...decl.attributes], binds: binds, ddecltype: etype });
        return gkey;
    }
    registerFunctionCall(ns, name, f, binds, pcodes, cinfo) {
        const key = MIRKeyGenerator.generateFunctionKeyWNamespace(ns, name, binds, pcodes);
        if (!this.emitEnabled || this.masm.invokeDecls.has(key.keyid) || this.masm.primitiveInvokeDecls.has(key.keyid) || this.pendingFunctionProcessing.findIndex((fp) => fp.fkey === key.keyid) !== -1) {
            return key.keyid;
        }
        this.pendingFunctionProcessing.push({ fkey: key.keyid, shortname: key.shortname, name: name, enclosingdecl: undefined, invoke: f.invoke, binds: binds, pcodes: pcodes, cargs: cinfo });
        return key.keyid;
    }
    registerNamespaceOperatorCall(ns, name, opdecl, sigkeys, pcodes, cinfo) {
        const key = MIRKeyGenerator.generateFunctionKeyWNamespace(ns, name, new Map(), pcodes);
        const okey = MIRKeyGenerator.generateOperatorSignatureKey(key.keyid, key.shortname, opdecl.isPrefix, opdecl.isInfix, sigkeys);
        if (!this.emitEnabled || this.masm.invokeDecls.has(okey.keyid) || this.masm.primitiveInvokeDecls.has(okey.keyid) || this.pendingOperatorProcessing.findIndex((fp) => fp.fkey === okey.keyid) !== -1) {
            return okey.keyid;
        }
        this.pendingOperatorProcessing.push({ fkey: okey.keyid, shortname: okey.shortname, name: name, enclosingdecl: undefined, invoke: opdecl.invoke, binds: new Map(), pcodes: pcodes, cargs: cinfo });
        return okey.keyid;
    }
    registerStaticCall(resolvedcontaining, containingType, f, name, binds, pcodes, cinfo) {
        const key = MIRKeyGenerator.generateFunctionKeyWType(resolvedcontaining, name, binds, pcodes);
        if (!this.emitEnabled || this.masm.invokeDecls.has(key.keyid) || this.masm.primitiveInvokeDecls.has(key.keyid) || this.pendingFunctionProcessing.findIndex((sp) => sp.fkey === key.keyid) !== -1) {
            return key.keyid;
        }
        this.pendingFunctionProcessing.push({ fkey: key.keyid, shortname: key.shortname, name: name, enclosingdecl: containingType, invoke: f.invoke, binds: binds, pcodes: pcodes, cargs: cinfo });
        return key.keyid;
    }
    registerStaticOperatorCall(resolvedcontaining, containingType, name, opdecl, sigkeys, binds, pcodes, cinfo) {
        const key = MIRKeyGenerator.generateFunctionKeyWType(resolvedcontaining, name, binds, pcodes);
        const okey = MIRKeyGenerator.generateOperatorSignatureKey(key.keyid, key.shortname, opdecl.isPrefix, opdecl.isInfix, sigkeys);
        if (!this.emitEnabled || this.masm.invokeDecls.has(okey.keyid) || this.masm.primitiveInvokeDecls.has(okey.keyid) || this.pendingOperatorProcessing.findIndex((fp) => fp.fkey === okey.keyid) !== -1) {
            return okey.keyid;
        }
        this.pendingOperatorProcessing.push({ fkey: okey.keyid, shortname: okey.shortname, name: name, enclosingdecl: containingType, invoke: opdecl.invoke, binds: binds, pcodes: pcodes, cargs: cinfo });
        return okey.keyid;
    }
    registerMethodCall(resolvedcontaining, containingType, m, name, binds, pcodes, cinfo) {
        const vkey = MIRKeyGenerator.generateVirtualMethodKey(name, binds, pcodes);
        const key = MIRKeyGenerator.generateFunctionKeyWType(resolvedcontaining, name, binds, pcodes);
        if (!this.emitEnabled || this.masm.invokeDecls.has(key.keyid) || this.masm.primitiveInvokeDecls.has(key.keyid) || this.pendingOOMethodProcessing.findIndex((mp) => mp.mkey === key.keyid) !== -1) {
            return key.keyid;
        }
        this.pendingOOMethodProcessing.push({ vkey: vkey.keyid, mkey: key.keyid, shortname: key.shortname, name: name, enclosingDecl: containingType, mdecl: m, binds: binds, pcodes: pcodes, cargs: cinfo });
        return key.keyid;
    }
    registerVirtualMethodCall(containingType, name, binds, pcodes, cinfo) {
        const key = MIRKeyGenerator.generateVirtualMethodKey(name, binds, pcodes);
        if (!this.emitEnabled || this.allVInvokes.findIndex((vi) => vi.vkey === key.keyid && vi.enclosingtype.typeID === containingType.typeID) !== -1) {
            return key;
        }
        this.allVInvokes.push({ vkey: key.keyid, enclosingtype: containingType, name: name, binds: binds, pcodes: pcodes, cargs: cinfo });
        return key;
    }
    registerVirtualNamespaceOperatorCall(ns, name, pcodes, cinfo) {
        const key = MIRKeyGenerator.generateVirtualMethodKey(`${ns}::${name}`, new Map(), pcodes);
        if (!this.emitEnabled || this.masm.virtualOperatorDecls.has(key.keyid) || this.pendingOPVirtualProcessing.findIndex((vi) => vi.vkey === key.keyid) !== -1) {
            return key;
        }
        this.pendingOPVirtualProcessing.push({ vkey: key.keyid, optns: ns, optenclosingType: undefined, name: name, binds: new Map(), pcodes: pcodes, cargs: cinfo });
        return key;
    }
    registerVirtualStaticOperatorCall(containingType, name, binds, pcodes, cinfo) {
        const key = MIRKeyGenerator.generateVirtualMethodKey(`${containingType[0].typeID}::${name}`, new Map(), pcodes);
        if (!this.emitEnabled || this.masm.virtualOperatorDecls.has(key.keyid) || this.pendingOPVirtualProcessing.findIndex((vi) => vi.vkey === key.keyid) !== -1) {
            return key;
        }
        this.pendingOPVirtualProcessing.push({ vkey: key.keyid, optns: undefined, optenclosingType: containingType, name: name, binds: binds, pcodes: pcodes, cargs: cinfo });
        return key;
    }
    registerPCode(ikey, shortname, idecl, fsig, bodybinds, cinfo, capturedpcode) {
        if (!this.emitEnabled || this.masm.invokeDecls.has(ikey) || this.masm.primitiveInvokeDecls.has(ikey) || this.pendingPCodeProcessing.findIndex((fp) => fp.lkey === ikey) !== -1) {
            return;
        }
        this.pendingPCodeProcessing.push({ lkey: ikey, lshort: shortname, invoke: idecl, sigt: fsig, bodybinds: bodybinds, cargs: cinfo, capturedpcodes: capturedpcode });
    }
    static generateMASM(pckge, buildLevel, macrodefs, entrypoints, functionalize, srcFiles) {
        ////////////////
        //Parse the contents and generate the assembly
        const assembly = new assembly_1.Assembly();
        let p = new parser_1.Parser(assembly, srcFiles.map((sfi) => { return { fullname: sfi.fpath, shortname: sfi.filepath }; }));
        try {
            for (let i = 0; i < srcFiles.length; ++i) {
                p.parseCompilationUnitPass1(srcFiles[i].fpath, srcFiles[i].contents, macrodefs);
            }
            for (let i = 0; i < srcFiles.length; ++i) {
                p.parseCompilationUnitPass2(srcFiles[i].fpath, srcFiles[i].contents, macrodefs);
            }
        }
        catch (ex) {
            return { masm: undefined, errors: [`Hard failure in parse with exception -- ${ex}`] };
        }
        const parseErrors = p.getParseErrors();
        if (parseErrors !== undefined) {
            return { masm: undefined, errors: parseErrors.map((err) => JSON.stringify(err)) };
        }
        ////////////////
        //Compute the assembly hash and initialize representations
        const hash = Crypto.createHash("sha512");
        const data = [...srcFiles].sort((a, b) => a.fpath.localeCompare(b.fpath));
        data.forEach((sf) => {
            hash.update(sf.fpath);
            hash.update(sf.contents);
        });
        const masm = new mir_assembly_1.MIRAssembly(pckge, srcFiles, hash.digest("hex"));
        const emitter = new MIREmitter(assembly, masm, true);
        const checker = new type_checker_1.TypeChecker(assembly, emitter, buildLevel, p.sortedSrcFiles);
        emitter.registerResolvedTypeReference(assembly.getSpecialAnyConceptType());
        emitter.registerResolvedTypeReference(assembly.getSpecialSomeConceptType());
        emitter.registerResolvedTypeReference(assembly.getSpecialKeyTypeConceptType());
        emitter.registerResolvedTypeReference(assembly.getSpecialValidatorConceptType());
        emitter.registerResolvedTypeReference(assembly.getSpecialParsableConceptType());
        emitter.registerResolvedTypeReference(assembly.getSpecialAPITypeConceptType());
        emitter.registerResolvedTypeReference(assembly.getSpecialAlgebraicConceptType());
        emitter.registerResolvedTypeReference(assembly.getSpecialOrderableConceptType());
        emitter.registerResolvedTypeReference(assembly.getSpecialTupleConceptType());
        emitter.registerResolvedTypeReference(assembly.getSpecialRecordConceptType());
        emitter.registerResolvedTypeReference(assembly.getSpecialObjectConceptType());
        emitter.registerResolvedTypeReference(assembly.getSpecialNoneType());
        emitter.registerResolvedTypeReference(assembly.getSpecialBoolType());
        emitter.registerResolvedTypeReference(assembly.getSpecialIntType());
        emitter.registerResolvedTypeReference(assembly.getSpecialNatType());
        emitter.registerResolvedTypeReference(assembly.getSpecialBigIntType());
        emitter.registerResolvedTypeReference(assembly.getSpecialBigNatType());
        emitter.registerResolvedTypeReference(assembly.getSpecialRationalType());
        emitter.registerResolvedTypeReference(assembly.getSpecialFloatType());
        emitter.registerResolvedTypeReference(assembly.getSpecialDecimalType());
        emitter.registerResolvedTypeReference(assembly.getSpecialStringPosType());
        emitter.registerResolvedTypeReference(assembly.getSpecialStringType());
        emitter.registerResolvedTypeReference(assembly.getSpecialBufferFormatType());
        emitter.registerResolvedTypeReference(assembly.getSpecialBufferCompressionType());
        emitter.registerResolvedTypeReference(assembly.getSpecialByteBufferType());
        emitter.registerResolvedTypeReference(assembly.getSpecialISOTimeType());
        emitter.registerResolvedTypeReference(assembly.getSpecialLogicalTimeType());
        emitter.registerResolvedTypeReference(assembly.getSpecialUUIDType());
        emitter.registerResolvedTypeReference(assembly.getSpecialContentHashType());
        emitter.registerResolvedTypeReference(assembly.getSpecialRegexType());
        emitter.registerResolvedTypeReference(assembly.getSpecialNothingType());
        emitter.registerResolvedTypeReference(assembly.getSpecialHavocType());
        //get any entrypoint functions and initialize the checker there
        const epns = assembly.getNamespace(entrypoints.namespace);
        if (epns === undefined) {
            return { masm: undefined, errors: [`Could not find namespace ${entrypoints.namespace}`] };
        }
        else {
            if (entrypoints.names.length === 0) {
                return { masm: undefined, errors: ["No entrypoints specified"] };
            }
            for (let i = 0; i < entrypoints.names.length; ++i) {
                const f = epns.functions.get(entrypoints.names[i]);
                if (f === undefined) {
                    return { masm: undefined, errors: [`Could not find function ${entrypoints.names[i]}`] };
                }
                emitter.registerFunctionCall(f.ns, f.name, f, new Map(), [], []);
            }
        }
        ////////////////
        //While there is more to process get an item and run the checker on it
        try {
            let lastVCount = -1;
            while (true) {
                while (emitter.pendingOOProcessing.length !== 0 || emitter.pendingConstExprProcessing.length !== 0
                    || emitter.pendingFunctionProcessing.length !== 0 || emitter.pendingOperatorProcessing.length !== 0
                    || emitter.pendingOOMethodProcessing.length !== 0 || emitter.pendingPCodeProcessing.length !== 0
                    || emitter.pendingOPVirtualProcessing.length !== 0) {
                    while (emitter.pendingOOProcessing.length !== 0) {
                        const tt = emitter.pendingOOProcessing[0];
                        checker.processOOType(tt.tkey, tt.shortname, tt.ootype, tt.binds);
                        emitter.pendingOOProcessing.shift();
                    }
                    if (emitter.pendingConstExprProcessing.length !== 0) {
                        const pc = emitter.pendingConstExprProcessing[0];
                        checker.processConstExpr(pc.gkey, pc.shortname, pc.name, pc.srcFile, pc.containingType, pc.cexp, pc.attribs, pc.binds, pc.ddecltype);
                        emitter.pendingConstExprProcessing.shift();
                    }
                    else if (emitter.pendingFunctionProcessing.length !== 0) {
                        const pf = emitter.pendingFunctionProcessing[0];
                        checker.processFunctionDecl(pf.fkey, pf.shortname, pf.name, pf.enclosingdecl, pf.invoke, pf.binds, pf.pcodes, pf.cargs);
                        emitter.pendingFunctionProcessing.shift();
                    }
                    else if (emitter.pendingOperatorProcessing.length !== 0) {
                        const pf = emitter.pendingOperatorProcessing[0];
                        checker.processFunctionDecl(pf.fkey, pf.shortname, pf.name, pf.enclosingdecl, pf.invoke, pf.binds, pf.pcodes, pf.cargs);
                        emitter.pendingOperatorProcessing.shift();
                    }
                    else if (emitter.pendingOOMethodProcessing.length !== 0) {
                        const mf = emitter.pendingOOMethodProcessing[0];
                        checker.processMethodFunction(mf.vkey, mf.mkey, mf.shortname, mf.name, mf.enclosingDecl, mf.mdecl, mf.binds, mf.pcodes, mf.cargs);
                        emitter.pendingOOMethodProcessing.shift();
                    }
                    else if (emitter.pendingPCodeProcessing.length !== 0) {
                        const lf = emitter.pendingPCodeProcessing[0];
                        checker.processLambdaFunction(lf.lkey, lf.lshort, lf.invoke, lf.sigt, lf.bodybinds, lf.cargs, lf.capturedpcodes);
                        emitter.pendingPCodeProcessing.shift();
                    }
                    else if (emitter.pendingOPVirtualProcessing.length !== 0) {
                        const vop = emitter.pendingOPVirtualProcessing[0];
                        const opimpls = emitter.getVirtualOpImpls(vop.vkey, vop.optns, vop.optenclosingType, vop.name, vop.binds, vop.pcodes, vop.cargs);
                        for (let i = 0; i < opimpls.length; ++i) {
                            checker.processVirtualOperator(...opimpls[i]);
                        }
                        emitter.pendingOPVirtualProcessing.shift();
                    }
                    else {
                        ;
                    }
                }
                //make sure all vcall candidates are processed
                const vcgens = emitter.getVCallInstantiations(assembly);
                if (vcgens.length === lastVCount) {
                    break;
                }
                lastVCount = vcgens.length;
                for (let i = 0; i < vcgens.length; ++i) {
                    checker.processMethodFunction(...vcgens[i]);
                }
            }
            if (checker.getErrorList().length === 0) {
                checker.processRegexInfo();
                if (functionalize) {
                    functionalize_1.functionalizeInvokes(emitter, masm);
                }
                mir_ssa_1.ssaConvertInvokes(masm);
            }
        }
        catch (ex) {
            //ignore
        }
        const tcerrors = checker.getErrorList();
        if (tcerrors.length !== 0) {
            return { masm: undefined, errors: tcerrors.map((err) => JSON.stringify(err)) };
        }
        else {
            return { masm: masm, errors: [] };
        }
    }
}
exports.MIREmitter = MIREmitter;
//# sourceMappingURL=mir_emitter.js.map