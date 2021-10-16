"use strict";
//-------------------------------------------------------------------------------------------------------
// Copyright (C) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE.txt file in the project root for full license information.
//-------------------------------------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
exports.SMTModelState = exports.SMTAssembly = exports.SMTFunctionUninterpreted = exports.SMTFunction = exports.SMTConstantDecl = exports.SMTEphemeralListDecl = exports.SMTRecordDecl = exports.SMTTupleDecl = exports.SMTListDecl = exports.SMTEntityDecl = void 0;
const smt_exp_1 = require("./smt_exp");
class SMTFunction {
    constructor(fname, args, maskname, masksize, result, body) {
        this.fname = fname;
        this.args = args;
        this.maskname = maskname;
        this.masksize = masksize;
        this.result = result;
        this.body = body;
    }
    static create(fname, args, result, body) {
        return new SMTFunction(fname, args, undefined, 0, result, body);
    }
    static createWithMask(fname, args, maskname, masksize, result, body) {
        return new SMTFunction(fname, args, maskname, masksize, result, body);
    }
    emitSMT2() {
        const args = this.args.map((arg) => `(${arg.vname} ${arg.vtype.name})`);
        const body = this.body.emitSMT2("  ");
        if (this.maskname === undefined) {
            return `(define-fun ${this.fname} (${args.join(" ")}) ${this.result.name}\n${body}\n)`;
        }
        else {
            return `(define-fun ${this.fname} (${args.join(" ")} (${this.maskname} $Mask_${this.masksize})) ${this.result.name}\n${body}\n)`;
        }
    }
    emitSMT2_DeclOnly() {
        const args = this.args.map((arg) => `(${arg.vname} ${arg.vtype.name})`);
        if (this.maskname === undefined) {
            return `(${this.fname} (${args.join(" ")}) ${this.result.name})`;
        }
        else {
            return `(${this.fname} (${args.join(" ")} (${this.maskname} $Mask_${this.masksize})) ${this.result.name})`;
        }
    }
    emitSMT2_SingleDeclOnly() {
        const args = this.args.map((arg) => `(${arg.vname} ${arg.vtype.name})`);
        if (this.maskname === undefined) {
            return `${this.fname} (${args.join(" ")}) ${this.result.name}`;
        }
        else {
            return `${this.fname} (${args.join(" ")} (${this.maskname} $Mask_${this.masksize})) ${this.result.name}`;
        }
    }
}
exports.SMTFunction = SMTFunction;
class SMTFunctionUninterpreted {
    constructor(fname, args, result) {
        this.fname = fname;
        this.args = args;
        this.result = result;
    }
    emitSMT2() {
        return `(declare-fun ${this.fname} (${this.args.map((arg) => arg.name).join(" ")}) ${this.result.name})`;
    }
    static areDuplicates(f1, f2) {
        if (f1.fname !== f2.fname || f1.args.length !== f2.args.length) {
            return false;
        }
        if (f1.result.name !== f2.result.name) {
            return false;
        }
        for (let i = 0; i < f1.args.length; ++i) {
            if (f1.args[i].name !== f2.args[i].name) {
                return false;
            }
        }
        return true;
    }
}
exports.SMTFunctionUninterpreted = SMTFunctionUninterpreted;
class SMTEntityDecl {
    constructor(iskeytype, smtname, typetag, consf, boxf, ubf) {
        this.iskeytype = iskeytype;
        this.smtname = smtname;
        this.typetag = typetag;
        this.consf = consf;
        this.boxf = boxf;
        this.ubf = ubf;
    }
}
exports.SMTEntityDecl = SMTEntityDecl;
class SMTListDecl {
    constructor(iskeytype, smtllisttype, listtypeconsf, emptyconst, smtname, typetag, consf, boxf, ubf) {
        this.iskeytype = iskeytype;
        this.smtllisttype = smtllisttype;
        this.listtypeconsf = listtypeconsf;
        this.emptyconst = emptyconst;
        this.smtname = smtname;
        this.typetag = typetag;
        this.consf = consf;
        this.boxf = boxf;
        this.ubf = ubf;
    }
}
exports.SMTListDecl = SMTListDecl;
class SMTTupleDecl {
    constructor(iskeytype, smtname, typetag, consf, boxf, ubf) {
        this.iskeytype = iskeytype;
        this.smtname = smtname;
        this.typetag = typetag;
        this.consf = consf;
        this.boxf = boxf;
        this.ubf = ubf;
    }
}
exports.SMTTupleDecl = SMTTupleDecl;
class SMTRecordDecl {
    constructor(iskeytype, smtname, typetag, consf, boxf, ubf) {
        this.iskeytype = iskeytype;
        this.smtname = smtname;
        this.typetag = typetag;
        this.consf = consf;
        this.boxf = boxf;
        this.ubf = ubf;
    }
}
exports.SMTRecordDecl = SMTRecordDecl;
class SMTEphemeralListDecl {
    constructor(smtname, consf) {
        this.smtname = smtname;
        this.consf = consf;
    }
}
exports.SMTEphemeralListDecl = SMTEphemeralListDecl;
class SMTConstantDecl {
    constructor(gkey, optenumname, ctype, consf) {
        this.gkey = gkey;
        this.optenumname = optenumname;
        this.ctype = ctype;
        this.consf = consf;
    }
}
exports.SMTConstantDecl = SMTConstantDecl;
class SMTModelState {
    constructor(arginits, resinit, argchk, checktype, echeck, targeterrorcheck, isvaluecheck) {
        this.arginits = arginits;
        this.resinit = resinit;
        this.argchk = argchk;
        this.checktype = checktype;
        this.fcheck = echeck;
        this.targeterrorcheck = targeterrorcheck;
        this.isvaluecheck = isvaluecheck;
    }
}
exports.SMTModelState = SMTModelState;
class SMTAssembly {
    constructor(vopts, numgen, hashsize, entrypoint) {
        this.allErrors = [];
        this.entityDecls = [];
        this.listDecls = [];
        this.tupleDecls = [];
        this.recordDecls = [];
        this.ephemeralDecls = [];
        this.typeTags = [
            "TypeTag_None",
            "TypeTag_Bool",
            "TypeTag_Int",
            "TypeTag_Nat",
            "TypeTag_BigInt",
            "TypeTag_BigNat",
            "TypeTag_Float",
            "TypeTag_Decimal",
            "TypeTag_Rational",
            "TypeTag_StringPos",
            "TypeTag_String",
            "TypeTag_ByteBuffer",
            "TypeTag_ISOTime",
            "TypeTag_LogicalTime",
            "TypeTag_UUID",
            "TypeTag_ContentHash",
            "TypeTag_Regex"
        ];
        this.keytypeTags = [
            "TypeTag_None",
            "TypeTag_Bool",
            "TypeTag_Int",
            "TypeTag_Nat",
            "TypeTag_BigInt",
            "TypeTag_BigNat",
            "TypeTag_String",
            "TypeTag_ISOTime",
            "TypeTag_LogicalTime",
            "TypeTag_UUID",
            "TypeTag_ContentHash"
        ];
        this.abstractTypes = [];
        this.indexTags = [];
        this.propertyTags = [];
        this.subtypeRelation = [];
        this.hasIndexRelation = [];
        this.hasPropertyRelation = [];
        this.literalRegexs = [];
        this.validatorRegexs = new Map();
        this.constantDecls = [];
        this.uninterpfunctions = [];
        this.maskSizes = new Set();
        this.resultTypes = [];
        this.functions = [];
        this.havocfuncs = new Set();
        this.model = new SMTModelState([], { vname: "[EMPTY]", vtype: new smt_exp_1.SMTType("[UNINIT_VTYPE]", "[UNINIT_VTYPE]", "[UNINIT_VTYPE]"), vinit: new smt_exp_1.SMTConst("[UNINT_VINIT]"), vchk: undefined, callexp: new smt_exp_1.SMTConst("[UNINT_CALLEXP]") }, undefined, new smt_exp_1.SMTType("[UNINIT_CHK_TYPE]", "[UNINIT_CHK_TYPE]", "[UNINIT_CHK_TYPE]"), new smt_exp_1.SMTConst("[UNINT_ECHK]"), new smt_exp_1.SMTConst("[UNINIT_ERR_CHK]"), new smt_exp_1.SMTConst("[UNINIT_VLAUE_CHK]"));
        this.vopts = vopts;
        this.entrypoint = entrypoint;
        this.numgen = numgen;
        this.hashsize = hashsize;
    }
    static sccVisit(cn, scc, marked, invokes) {
        if (marked.has(cn.invoke)) {
            return;
        }
        scc.add(cn.invoke);
        marked.add(cn.invoke);
        cn.callers.forEach((pred) => SMTAssembly.sccVisit(invokes.get(pred), scc, marked, invokes));
    }
    static topoVisit(cn, pending, tordered, invokes) {
        if (pending.findIndex((vn) => vn.invoke === cn.invoke) !== -1 || tordered.findIndex((vn) => vn.invoke === cn.invoke) !== -1) {
            return;
        }
        pending.push(cn);
        cn.callees.forEach((succ) => invokes.get(succ).callers.add(cn.invoke));
        cn.callees.forEach((succ) => SMTAssembly.topoVisit(invokes.get(succ), pending, tordered, invokes));
        tordered.push(cn);
    }
    static processBodyInfo(bkey, binfo, invokes) {
        let cn = { invoke: bkey, callees: new Set(), callers: new Set() };
        let ac = new Set();
        binfo.computeCallees(ac);
        ac.forEach((cc) => {
            if (invokes.has(cc)) {
                cn.callees.add(cc);
            }
        });
        return cn;
    }
    static constructCallGraphInfo(entryPoints, assembly) {
        let invokes = new Map();
        const okinv = new Set(assembly.functions.map((f) => f.fname));
        assembly.functions.forEach((smtfun) => {
            invokes.set(smtfun.fname, SMTAssembly.processBodyInfo(smtfun.fname, smtfun.body, okinv));
        });
        let roots = [];
        let tordered = [];
        entryPoints.forEach((ivk) => {
            roots.push(invokes.get(ivk));
            SMTAssembly.topoVisit(invokes.get(ivk), [], tordered, invokes);
        });
        assembly.constantDecls.forEach((cdecl) => {
            roots.push(invokes.get(cdecl.consf));
            SMTAssembly.topoVisit(invokes.get(cdecl.consf), [], tordered, invokes);
        });
        tordered = tordered.reverse();
        let marked = new Set();
        let recursive = [];
        for (let i = 0; i < tordered.length; ++i) {
            let scc = new Set();
            SMTAssembly.sccVisit(tordered[i], scc, marked, invokes);
            if (scc.size > 1 || tordered[i].callees.has(tordered[i].invoke)) {
                recursive.push(scc);
            }
        }
        return { invokes: invokes, topologicalOrder: tordered, roots: roots, recursive: recursive };
    }
    generateSMT2AssemblyInfo(mode) {
        const subtypeasserts = this.subtypeRelation.map((tc) => tc.value ? `(assert (SubtypeOf@ ${tc.ttype} ${tc.atype}))` : `(assert (not (SubtypeOf@ ${tc.ttype} ${tc.atype})))`).sort();
        const indexasserts = this.hasIndexRelation.map((hi) => hi.value ? `(assert (HasIndex@ ${hi.idxtag} ${hi.atype}))` : `(assert (not (HasIndex@ ${hi.idxtag} ${hi.atype})))`).sort();
        const propertyasserts = this.hasPropertyRelation.map((hp) => hp.value ? `(assert (HasProperty@ ${hp.pnametag} ${hp.atype}))` : `(assert (not (HasProperty@ ${hp.pnametag} ${hp.atype})))`).sort();
        const keytypeorder = [...this.keytypeTags].sort().map((ktt, i) => `(assert (= (TypeTagRank@ ${ktt}) ${i}))`);
        let integral_type_alias = [
            `(define-sort BInt () (_ BitVec ${this.vopts.ISize}))`,
            `(define-sort BNat () (_ BitVec ${this.vopts.ISize}))`,
        ];
        let integral_constants = [
            `(declare-const BInt@zero BInt) (assert (= BInt@zero (_ bv0 ${this.vopts.ISize})))`,
            `(declare-const BInt@one BInt) (assert (= BInt@one ${this.numgen.emitSimpleInt(1).emitSMT2(undefined)}))`,
            `(declare-const BInt@min BInt) (assert (= BInt@min ${this.numgen.emitIntGeneral(this.numgen.intmin).emitSMT2(undefined)}))`,
            `(declare-const BInt@max BInt) (assert (= BInt@max ${this.numgen.emitIntGeneral(this.numgen.intmax).emitSMT2(undefined)}))`,
            `(declare-const BNat@zero BNat) (assert (= BNat@zero (_ bv0 ${this.vopts.ISize})))`,
            `(declare-const BNat@one BNat) (assert (= BNat@one ${this.numgen.emitSimpleNat(1).emitSMT2(undefined)}))`,
            `(declare-const BNat@min BNat) (assert (= BNat@min BNat@zero))`,
            `(declare-const BNat@max BNat) (assert (= BNat@max ${this.numgen.emitNatGeneral(this.numgen.natmax).emitSMT2(undefined)}))`
        ];
        const termtupleinfo = this.tupleDecls
            .filter((tt) => !tt.iskeytype)
            .sort((t1, t2) => t1.smtname.localeCompare(t2.smtname))
            .map((kt) => {
            return {
                decl: `(${kt.smtname} 0)`,
                consf: `( (${kt.consf.cname} ${kt.consf.cargs.map((ke) => `(${ke.fname} ${ke.ftype.name})`).join(" ")}) )`,
                boxf: `(${kt.boxf} (${kt.ubf} ${kt.smtname}))`
            };
        });
        const termrecordinfo = this.recordDecls
            .filter((rt) => !rt.iskeytype)
            .sort((t1, t2) => t1.smtname.localeCompare(t2.smtname))
            .map((kt) => {
            return {
                decl: `(${kt.smtname} 0)`,
                consf: `( (${kt.consf.cname} ${kt.consf.cargs.map((ke) => `(${ke.fname} ${ke.ftype.name})`).join(" ")}) )`,
                boxf: `(${kt.boxf} (${kt.ubf} ${kt.smtname}))`
            };
        });
        const keytypeinfo = this.entityDecls
            .filter((et) => et.iskeytype)
            .sort((t1, t2) => t1.smtname.localeCompare(t2.smtname))
            .map((kt) => {
            return {
                decl: kt.consf !== undefined ? `(${kt.smtname} 0)` : undefined,
                consf: kt.consf !== undefined ? `( (${kt.consf.cname} ${kt.consf.cargs.map((ke) => `(${ke.fname} ${ke.ftype.name})`).join(" ")}) )` : undefined,
                boxf: `(${kt.boxf} (${kt.ubf} ${kt.smtname}))`
            };
        });
        const termtypeinfo = this.entityDecls
            .filter((et) => !et.iskeytype)
            .sort((t1, t2) => t1.smtname.localeCompare(t2.smtname))
            .map((tt) => {
            return {
                decl: tt.consf !== undefined ? `(${tt.smtname} 0)` : undefined,
                consf: tt.consf !== undefined ? `( (${tt.consf.cname} ${tt.consf.cargs.map((te) => `(${te.fname} ${te.ftype.name})`).join(" ")}) )` : undefined,
                boxf: `(${tt.boxf} (${tt.ubf} ${tt.smtname}))`
            };
        });
        let generalcollectioninternaldecls = [];
        let constcollectiondecls = [];
        this.listDecls
            .sort((t1, t2) => t1.smtname.localeCompare(t2.smtname))
            .forEach((kt) => {
            const iconsopts = kt.listtypeconsf.map((cf) => `(${cf.cname} ${cf.cargs.map((ke) => `(${ke.fname} ${ke.ftype.name})`).join(" ")})`);
            generalcollectioninternaldecls.push({
                decl: `(${kt.smtllisttype} 0)`,
                consf: `( ${iconsopts.join(" ")} )`
            });
            termtypeinfo.push({
                decl: `(${kt.smtname} 0)`,
                consf: `( (${kt.consf.cname} ${kt.consf.cargs.map((ke) => `(${ke.fname} ${ke.ftype.name})`).join(" ")}) )`,
                boxf: `(${kt.boxf} (${kt.ubf} ${kt.smtname}))`
            });
            constcollectiondecls.push(kt.emptyconst);
        });
        const etypeinfo = this.ephemeralDecls
            .sort((t1, t2) => t1.smtname.localeCompare(t2.smtname))
            .map((et) => {
            return {
                decl: `(${et.smtname} 0)`,
                consf: `( (${et.consf.cname} ${et.consf.cargs.map((ke) => `(${ke.fname} ${ke.ftype.name})`).join(" ")}) )`
            };
        });
        const rtypeinfo = this.resultTypes
            .sort((t1, t2) => (t1.hasFlag !== t2.hasFlag) ? (t1.hasFlag ? 1 : -1) : t1.rtname.localeCompare(t2.rtname))
            .map((rt) => {
            if (rt.hasFlag) {
                return {
                    decl: `($GuardResult_${rt.ctype.name} 0)`,
                    consf: `( ($GuardResult_${rt.ctype.name}@cons ($GuardResult_${rt.ctype.name}@result ${rt.ctype.name}) ($GuardResult_${rt.ctype.name}@flag Bool)) )`
                };
            }
            else {
                return {
                    decl: `($Result_${rt.ctype.name} 0)`,
                    consf: `( ($Result_${rt.ctype.name}@success ($Result_${rt.ctype.name}@success_value ${rt.ctype.name})) ($Result_${rt.ctype.name}@error ($Result_${rt.ctype.name}@error_value ErrorID)) )`
                };
            }
        });
        const maskinfo = [...this.maskSizes]
            .sort()
            .map((msize) => {
            let entries = [];
            for (let i = 0; i < msize; ++i) {
                entries.push(`($Mask_${msize}@${i} Bool)`);
            }
            return {
                decl: `($Mask_${msize} 0)`,
                consf: `( ($Mask_${msize}@cons ${entries.join(" ")}) )`
            };
        });
        const gdecls = this.constantDecls
            .sort((c1, c2) => c1.gkey.localeCompare(c2.gkey))
            .map((c) => `(declare-const ${c.gkey} ${c.ctype.name})`);
        const ufdecls = this.uninterpfunctions
            .sort((uf1, uf2) => uf1.fname.localeCompare(uf2.fname))
            .map((uf) => uf.emitSMT2());
        const gdefs = this.constantDecls
            .sort((c1, c2) => c1.gkey.localeCompare(c2.gkey))
            .map((c) => `(assert (= ${c.gkey} ${c.consf}))`);
        let action = [];
        this.model.arginits.map((iarg) => {
            action.push(`(declare-const ${iarg.vname} ${iarg.vtype.name})`);
            action.push(`(assert (= ${iarg.vname} ${iarg.vinit.emitSMT2(undefined)}))`);
            if (iarg.vchk !== undefined) {
                action.push(`(assert ${iarg.vchk.emitSMT2(undefined)})`);
            }
        });
        if (this.model.argchk !== undefined) {
            action.push(...this.model.argchk.map((chk) => `(assert ${chk.emitSMT2(undefined)})`));
        }
        action.push(`(declare-const _@smtres@ ${this.model.checktype.name})`);
        action.push(`(assert (= _@smtres@ ${this.model.fcheck.emitSMT2(undefined)}))`);
        if (mode === "unreachable" || mode === "witness") {
            action.push(`(assert ${this.model.targeterrorcheck.emitSMT2(undefined)})`);
        }
        else if (mode === "evaluate") {
            action.push(`(assert ${this.model.isvaluecheck.emitSMT2(undefined)})`);
            action.push(`(declare-const ${this.model.resinit.vname} ${this.model.resinit.vtype.name})`);
            action.push(`(assert (= ${this.model.resinit.vname} ${this.model.resinit.vinit.emitSMT2(undefined)}))`);
            if (this.model.resinit.vchk !== undefined) {
                action.push(`(assert ${this.model.resinit.vchk.emitSMT2(undefined)})`);
            }
            action.push(`(assert (= ${this.model.resinit.vname} _@smtres@))`);
        }
        else {
            action.push(`(assert ${this.model.isvaluecheck.emitSMT2(undefined)})`);
            action.push(`(assert (= ${this.model.resinit.vname} _@smtres@))`);
        }
        let foutput = [];
        let doneset = new Set();
        const cginfo = SMTAssembly.constructCallGraphInfo([this.entrypoint, ...this.havocfuncs], this);
        const rcg = [...cginfo.topologicalOrder];
        for (let i = 0; i < rcg.length; ++i) {
            const cn = rcg[i];
            if (doneset.has(cn.invoke)) {
                continue;
            }
            const rf = this.functions.find((f) => f.fname === cn.invoke);
            const cscc = cginfo.recursive.find((scc) => scc.has(cn.invoke));
            if (cscc === undefined) {
                doneset.add(cn.invoke);
                foutput.push(rf.emitSMT2());
            }
            else {
                let worklist = [...cscc].sort();
                if (worklist.length === 1) {
                    const cf = worklist.shift();
                    const crf = this.functions.find((f) => f.fname === cf);
                    const decl = crf.emitSMT2_SingleDeclOnly();
                    const impl = crf.body.emitSMT2("  ");
                    if (cscc !== undefined) {
                        cscc.forEach((v) => doneset.add(v));
                    }
                    foutput.push(`(define-fun-rec ${decl}\n ${impl}\n)`);
                }
                else {
                    let decls = [];
                    let impls = [];
                    while (worklist.length !== 0) {
                        const cf = worklist.shift();
                        const crf = this.functions.find((f) => f.fname === cf);
                        decls.push(crf.emitSMT2_DeclOnly());
                        impls.push(crf.body.emitSMT2("  "));
                    }
                    if (cscc !== undefined) {
                        cscc.forEach((v) => doneset.add(v));
                    }
                    foutput.push(`(define-funs-rec (\n  ${decls.join("\n  ")}\n) (\n${impls.join("\n")}))`);
                }
            }
        }
        return {
            TYPE_TAG_DECLS: this.typeTags.sort().map((tt) => `(${tt})`),
            ABSTRACT_TYPE_TAG_DECLS: this.abstractTypes.sort().map((tt) => `(${tt})`),
            INDEX_TAG_DECLS: this.indexTags.sort().map((tt) => `(${tt})`),
            PROPERTY_TAG_DECLS: this.propertyTags.sort().map((tt) => `(${tt})`),
            SUBTYPE_DECLS: subtypeasserts,
            TUPLE_HAS_INDEX_DECLS: indexasserts,
            RECORD_HAS_PROPERTY_DECLS: propertyasserts,
            KEY_TYPE_TAG_RANK: keytypeorder,
            BINTEGRAL_TYPE_ALIAS: integral_type_alias,
            BINTEGRAL_CONSTANTS: integral_constants,
            STRING_TYPE_ALIAS: (this.vopts.StringOpt === "UNICODE" ? "(define-sort BString () (Seq (_ BitVec 32)))" : "(define-sort BString () String)"),
            BHASHCODE_TYPE_ALIAS: `(define-sort BHash () (_ BitVec ${this.hashsize}))`,
            KEY_TYPE_INFO: { decls: keytypeinfo.filter((kti) => kti.decl !== undefined).map((kti) => kti.decl), constructors: keytypeinfo.filter((kti) => kti.consf !== undefined).map((kti) => kti.consf), boxing: keytypeinfo.map((kti) => kti.boxf) },
            TUPLE_INFO: { decls: termtupleinfo.map((kti) => kti.decl), constructors: termtupleinfo.map((kti) => kti.consf), boxing: termtupleinfo.map((kti) => kti.boxf) },
            RECORD_INFO: { decls: termrecordinfo.map((kti) => kti.decl), constructors: termrecordinfo.map((kti) => kti.consf), boxing: termrecordinfo.map((kti) => kti.boxf) },
            TYPE_COLLECTION_INTERNAL_INFO: { decls: generalcollectioninternaldecls.map((kti) => kti.decl), constructors: generalcollectioninternaldecls.map((kti) => kti.consf) },
            TYPE_COLLECTION_CONSTS: constcollectiondecls,
            TYPE_INFO: { decls: termtypeinfo.filter((tti) => tti.decl !== undefined).map((tti) => tti.decl), constructors: termtypeinfo.filter((tti) => tti.consf !== undefined).map((tti) => tti.consf), boxing: termtypeinfo.map((tti) => tti.boxf) },
            EPHEMERAL_DECLS: { decls: etypeinfo.map((kti) => kti.decl), constructors: etypeinfo.map((kti) => kti.consf) },
            RESULT_INFO: { decls: rtypeinfo.map((kti) => kti.decl), constructors: rtypeinfo.map((kti) => kti.consf) },
            MASK_INFO: { decls: maskinfo.map((mi) => mi.decl), constructors: maskinfo.map((mi) => mi.consf) },
            GLOBAL_DECLS: gdecls,
            UF_DECLS: ufdecls,
            FUNCTION_DECLS: foutput.reverse(),
            GLOBAL_DEFINITIONS: gdefs,
            ACTION: action
        };
    }
    buildSMT2file(mode, smtruntime) {
        const sfileinfo = this.generateSMT2AssemblyInfo(mode);
        function joinWithIndent(data, indent) {
            if (data.length === 0) {
                return ";;NO DATA;;";
            }
            else {
                return data.map((d, i) => (i === 0 ? "" : indent) + d).join("\n");
            }
        }
        const contents = smtruntime
            .replace(";;TYPE_TAG_DECLS;;", joinWithIndent(sfileinfo.TYPE_TAG_DECLS, "      "))
            .replace(";;ABSTRACT_TYPE_TAG_DECLS;;", joinWithIndent(sfileinfo.ABSTRACT_TYPE_TAG_DECLS, "      "))
            .replace(";;INDEX_TAG_DECLS;;", joinWithIndent(sfileinfo.INDEX_TAG_DECLS, "      "))
            .replace(";;PROPERTY_TAG_DECLS;;", joinWithIndent(sfileinfo.PROPERTY_TAG_DECLS, "      "))
            .replace(";;SUBTYPE_DECLS;;", joinWithIndent(sfileinfo.SUBTYPE_DECLS, ""))
            .replace(";;TUPLE_HAS_INDEX_DECLS;;", joinWithIndent(sfileinfo.TUPLE_HAS_INDEX_DECLS, ""))
            .replace(";;RECORD_HAS_PROPERTY_DECLS;;", joinWithIndent(sfileinfo.RECORD_HAS_PROPERTY_DECLS, ""))
            .replace(";;KEY_TYPE_TAG_RANK;;", joinWithIndent(sfileinfo.KEY_TYPE_TAG_RANK, ""))
            .replace(";;BINTEGRAL_TYPE_ALIAS;;", joinWithIndent(sfileinfo.BINTEGRAL_TYPE_ALIAS, ""))
            .replace(";;BSTRING_TYPE_ALIAS;;", sfileinfo.STRING_TYPE_ALIAS)
            .replace(";;BHASHCODE_TYPE_ALIAS;;", sfileinfo.BHASHCODE_TYPE_ALIAS)
            .replace(";;BINT_CONSTANTS;;", joinWithIndent(sfileinfo.BINTEGRAL_CONSTANTS, ""))
            .replace(";;KEY_TYPE_DECLS;;", joinWithIndent(sfileinfo.KEY_TYPE_INFO.decls, "      "))
            .replace(";;KEY_TYPE_CONSTRUCTORS;;", joinWithIndent(sfileinfo.KEY_TYPE_INFO.constructors, "    "))
            .replace(";;KEY_TYPE_BOXING;;", joinWithIndent(sfileinfo.KEY_TYPE_INFO.boxing, "      "))
            .replace(";;TUPLE_DECLS;;", joinWithIndent(sfileinfo.TUPLE_INFO.decls, "    "))
            .replace(";;RECORD_DECLS;;", joinWithIndent(sfileinfo.RECORD_INFO.decls, "    "))
            .replace(";;TYPE_COLLECTION_INTERNAL_INFO_DECLS;;", joinWithIndent(sfileinfo.TYPE_COLLECTION_INTERNAL_INFO.decls, "    "))
            .replace(";;TYPE_COLLECTION_EMPTY_DECLS;;", joinWithIndent(sfileinfo.TYPE_COLLECTION_CONSTS, ""))
            .replace(";;TYPE_DECLS;;", joinWithIndent(sfileinfo.TYPE_INFO.decls, "    "))
            .replace(";;TUPLE_TYPE_CONSTRUCTORS;;", joinWithIndent(sfileinfo.TUPLE_INFO.constructors, "    "))
            .replace(";;RECORD_TYPE_CONSTRUCTORS;;", joinWithIndent(sfileinfo.RECORD_INFO.constructors, "    "))
            .replace(";;TYPE_COLLECTION_INTERNAL_INFO_CONSTRUCTORS;;", joinWithIndent(sfileinfo.TYPE_COLLECTION_INTERNAL_INFO.constructors, "    "))
            .replace(";;TYPE_CONSTRUCTORS;;", joinWithIndent(sfileinfo.TYPE_INFO.constructors, "    "))
            .replace(";;TUPLE_TYPE_BOXING;;", joinWithIndent(sfileinfo.TUPLE_INFO.boxing, "      "))
            .replace(";;RECORD_TYPE_BOXING;;", joinWithIndent(sfileinfo.RECORD_INFO.boxing, "      "))
            .replace(";;TYPE_BOXING;;", joinWithIndent(sfileinfo.TYPE_INFO.boxing, "      "))
            .replace(";;EPHEMERAL_DECLS;;", joinWithIndent(sfileinfo.EPHEMERAL_DECLS.decls, "      "))
            .replace(";;EPHEMERAL_CONSTRUCTORS;;", joinWithIndent(sfileinfo.EPHEMERAL_DECLS.constructors, "      "))
            .replace(";;RESULT_DECLS;;", joinWithIndent(sfileinfo.RESULT_INFO.decls, "      "))
            .replace(";;MASK_DECLS;;", joinWithIndent(sfileinfo.MASK_INFO.decls, "      "))
            .replace(";;RESULTS;;", joinWithIndent(sfileinfo.RESULT_INFO.constructors, "    "))
            .replace(";;MASKS;;", joinWithIndent(sfileinfo.MASK_INFO.constructors, "    "))
            .replace(";;GLOBAL_DECLS;;", joinWithIndent(sfileinfo.GLOBAL_DECLS, ""))
            .replace(";;UF_DECLS;;", joinWithIndent(sfileinfo.UF_DECLS, "\n"))
            .replace(";;FUNCTION_DECLS;;", joinWithIndent(sfileinfo.FUNCTION_DECLS, "\n"))
            .replace(";;GLOBAL_DEFINITIONS;;", joinWithIndent(sfileinfo.GLOBAL_DEFINITIONS, ""))
            .replace(";;ACTION;;", joinWithIndent(sfileinfo.ACTION, ""));
        return contents;
    }
}
exports.SMTAssembly = SMTAssembly;
//# sourceMappingURL=smt_assembly.js.map