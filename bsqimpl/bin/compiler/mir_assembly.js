"use strict";
//-------------------------------------------------------------------------------------------------------
// Copyright (C) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE.txt file in the project root for full license information.
//-------------------------------------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
exports.MIRAssembly = exports.PackageConfig = exports.MIREphemeralListType = exports.MIRRecordType = exports.MIRTupleType = exports.MIRConceptType = exports.MIRPrimitiveMapEntityTypeDecl = exports.MIRPrimitiveSetEntityTypeDecl = exports.MIRPrimitiveQueueEntityTypeDecl = exports.MIRPrimitiveStackEntityTypeDecl = exports.MIRPrimitiveListEntityTypeDecl = exports.MIRPrimitiveCollectionEntityTypeDecl = exports.MIRConstructableInternalEntityTypeDecl = exports.MIRPrimitiveInternalEntityTypeDecl = exports.MIRInternalEntityTypeDecl = exports.MIREnumEntityTypeDecl = exports.MIRConstructableEntityTypeDecl = exports.MIRObjectEntityTypeDecl = exports.MIREntityType = exports.MIRTypeOption = exports.MIRType = exports.MIREntityTypeDecl = exports.MIRConceptTypeDecl = exports.MIROOTypeDecl = exports.MIRFieldDecl = exports.MIRInvokePrimitiveDecl = exports.MIRInvokeBodyDecl = exports.MIRInvokeDecl = exports.MIRFunctionParameter = exports.MIRConstantDecl = void 0;
const parser_1 = require("../ast/parser");
const mir_ops_1 = require("./mir_ops");
const bsqregex_1 = require("../ast/bsqregex");
const assert = require("assert");
function jemitsinfo(sinfo) {
    return { line: sinfo.line, column: sinfo.column, pos: sinfo.pos, span: sinfo.span };
}
function jparsesinfo(jobj) {
    return new parser_1.SourceInfo(jobj.line, jobj.column, jobj.pos, jobj.span);
}
class MIRFunctionParameter {
    constructor(name, type) {
        this.name = name;
        this.type = type;
    }
    jemit() {
        return { name: this.name, type: this.type };
    }
    static jparse(jobj) {
        return new MIRFunctionParameter(jobj.name, jobj.type);
    }
}
exports.MIRFunctionParameter = MIRFunctionParameter;
class MIRConstantDecl {
    constructor(enclosingDecl, gkey, shortname, attributes, sinfo, srcFile, declaredType, ivalue) {
        this.enclosingDecl = enclosingDecl;
        this.gkey = gkey;
        this.shortname = shortname;
        this.attributes = attributes;
        this.sourceLocation = sinfo;
        this.srcFile = srcFile;
        this.declaredType = declaredType;
        this.ivalue = ivalue;
    }
    jemit() {
        return { enclosingDecl: this.enclosingDecl, gkey: this.gkey, shortname: this.shortname, attributes: this.attributes, sinfo: jemitsinfo(this.sourceLocation), file: this.srcFile, declaredType: this.declaredType, ivalue: this.ivalue };
    }
    static jparse(jobj) {
        return new MIRConstantDecl(jobj.enclosingDecl, jobj.gkey, jobj.shortname, jobj.attributes, jparsesinfo(jobj.sinfo), jobj.file, jobj.declaredType, jobj.ivalue);
    }
}
exports.MIRConstantDecl = MIRConstantDecl;
class MIRInvokeDecl {
    constructor(enclosingDecl, bodyID, ikey, shortname, attributes, recursive, sinfo, srcFile, params, resultType, preconds, postconds) {
        this.enclosingDecl = enclosingDecl;
        this.bodyID = bodyID;
        this.ikey = ikey;
        this.shortname = shortname;
        this.sourceLocation = sinfo;
        this.srcFile = srcFile;
        this.attributes = attributes;
        this.recursive = recursive;
        this.params = params;
        this.resultType = resultType;
        this.preconditions = preconds;
        this.postconditions = postconds;
    }
    static jparse(jobj) {
        if (jobj.body) {
            return new MIRInvokeBodyDecl(jobj.enclosingDecl, jobj.bodyID, jobj.ikey, jobj.shortname, jobj.attributes, jobj.recursive, jparsesinfo(jobj.sinfo), jobj.file, jobj.params.map((p) => MIRFunctionParameter.jparse(p)), jobj.masksize, jobj.resultType, jobj.preconditions || undefined, jobj.postconditions || undefined, mir_ops_1.MIRBody.jparse(jobj.body));
        }
        else {
            let binds = new Map();
            jobj.binds.forEach((bind) => binds.set(bind[0], bind[1]));
            let pcodes = new Map();
            jobj.pcodes.forEach((pc) => pcodes.set(pc[0], pc[1]));
            return new MIRInvokePrimitiveDecl(jobj.enclosingDecl, jobj.bodyID, jobj.ikey, jobj.shortname, jobj.attributes, jobj.recursive, jparsesinfo(jobj.sinfo), jobj.file, binds, jobj.params.map((p) => MIRFunctionParameter.jparse(p)), jobj.resultType, jobj.implkey, pcodes, jobj.scalarslotsinfo, jobj.mixedslotsinfo);
        }
    }
}
exports.MIRInvokeDecl = MIRInvokeDecl;
class MIRInvokeBodyDecl extends MIRInvokeDecl {
    constructor(enclosingDecl, bodyID, ikey, shortname, attributes, recursive, sinfo, srcFile, params, masksize, resultType, preconds, postconds, body) {
        super(enclosingDecl, bodyID, ikey, shortname, attributes, recursive, sinfo, srcFile, params, resultType, preconds, postconds);
        this.body = body;
        this.masksize = masksize;
    }
    jemit() {
        return { enclosingDecl: this.enclosingDecl, bodyID: this.bodyID, ikey: this.ikey, shortname: this.shortname, sinfo: jemitsinfo(this.sourceLocation), file: this.srcFile, attributes: this.attributes, recursive: this.recursive, params: this.params.map((p) => p.jemit()), masksize: this.masksize, resultType: this.resultType, preconditions: this.preconditions, postconditions: this.postconditions, body: this.body.jemit() };
    }
}
exports.MIRInvokeBodyDecl = MIRInvokeBodyDecl;
class MIRInvokePrimitiveDecl extends MIRInvokeDecl {
    constructor(enclosingDecl, bodyID, ikey, shortname, attributes, recursive, sinfo, srcFile, binds, params, resultType, implkey, pcodes, scalarslotsinfo, mixedslotsinfo) {
        super(enclosingDecl, bodyID, ikey, shortname, attributes, recursive, sinfo, srcFile, params, resultType, undefined, undefined);
        this.implkey = implkey;
        this.binds = binds;
        this.pcodes = pcodes;
        this.scalarslotsinfo = scalarslotsinfo;
        this.mixedslotsinfo = mixedslotsinfo;
    }
    jemit() {
        return { enclosingDecl: this.enclosingDecl, bodyID: this.bodyID, ikey: this.ikey, shortname: this.shortname, sinfo: jemitsinfo(this.sourceLocation), file: this.srcFile, attributes: this.attributes, recursive: this.recursive, params: this.params.map((p) => p.jemit()), resultType: this.resultType, implkey: this.implkey, binds: [...this.binds], pcodes: [...this.pcodes], scalarslotsinfo: this.scalarslotsinfo, mixedlotsinfo: this.mixedslotsinfo };
    }
}
exports.MIRInvokePrimitiveDecl = MIRInvokePrimitiveDecl;
class MIRFieldDecl {
    constructor(enclosingDecl, attributes, srcInfo, srcFile, fkey, fname, dtype) {
        this.enclosingDecl = enclosingDecl;
        this.attributes = attributes;
        this.fkey = fkey;
        this.fname = fname;
        this.sourceLocation = srcInfo;
        this.srcFile = srcFile;
        this.declaredType = dtype;
    }
    jemit() {
        return { enclosingDecl: this.enclosingDecl, attributes: this.attributes, fkey: this.fkey, fname: this.fname, sinfo: jemitsinfo(this.sourceLocation), file: this.srcFile, declaredType: this.declaredType };
    }
    static jparse(jobj) {
        return new MIRFieldDecl(jobj.enclosingDecl, jobj.attributes, jparsesinfo(jobj.sinfo), jobj.file, jobj.fkey, jobj.fname, jobj.declaredType);
    }
}
exports.MIRFieldDecl = MIRFieldDecl;
class MIROOTypeDecl {
    constructor(srcInfo, srcFile, tkey, shortname, attributes, ns, name, terms, provides) {
        this.tkey = tkey;
        this.shortname = shortname;
        this.sourceLocation = srcInfo;
        this.srcFile = srcFile;
        this.attributes = attributes;
        this.ns = ns;
        this.name = name;
        this.terms = terms;
        this.provides = provides;
    }
    jemitbase() {
        return { tkey: this.tkey, shortname: this.shortname, sinfo: jemitsinfo(this.sourceLocation), file: this.srcFile, attributes: this.attributes, ns: this.ns, name: this.name, terms: [...this.terms].map((t) => [t[0], t[1].jemit()]), provides: this.provides };
    }
    static jparsebase(jobj) {
        let terms = new Map();
        jobj.terms.forEach((t) => terms.set(t[0], MIRType.jparse(t[1])));
        return [jparsesinfo(jobj.sinfo), jobj.file, jobj.tkey, jobj.shortname, jobj.attributes, jobj.ns, jobj.name, terms, jobj.provides];
    }
    static jparse(jobj) {
        const tag = jobj.tag;
        switch (tag) {
            case "concept":
                return MIRConceptTypeDecl.jparse(jobj);
            case "std":
                return MIRObjectEntityTypeDecl.jparse(jobj);
            case "constructable":
                return MIRConstructableEntityTypeDecl.jparse(jobj);
            case "enum":
                return MIREnumEntityTypeDecl.jparse(jobj);
            case "primitive":
                return MIRPrimitiveInternalEntityTypeDecl.jparse(jobj);
            case "constructableinternal":
                return MIRConstructableInternalEntityTypeDecl.jparse(jobj);
            case "list":
                return MIRPrimitiveListEntityTypeDecl.jparse(jobj);
            case "stack":
                return MIRPrimitiveStackEntityTypeDecl.jparse(jobj);
            case "queue":
                return MIRPrimitiveQueueEntityTypeDecl.jparse(jobj);
            case "set":
                return MIRPrimitiveSetEntityTypeDecl.jparse(jobj);
            default:
                assert(tag === "map");
                return MIRPrimitiveMapEntityTypeDecl.jparse(jobj);
        }
    }
}
exports.MIROOTypeDecl = MIROOTypeDecl;
class MIRConceptTypeDecl extends MIROOTypeDecl {
    constructor(srcInfo, srcFile, tkey, shortname, attributes, ns, name, terms, provides) {
        super(srcInfo, srcFile, tkey, shortname, attributes, ns, name, terms, provides);
    }
    jemit() {
        return { tag: "concept", ...this.jemitbase() };
    }
    static jparse(jobj) {
        return new MIRConceptTypeDecl(...MIROOTypeDecl.jparsebase(jobj));
    }
}
exports.MIRConceptTypeDecl = MIRConceptTypeDecl;
class MIREntityTypeDecl extends MIROOTypeDecl {
    constructor(srcInfo, srcFile, tkey, shortname, attributes, ns, name, terms, provides) {
        super(srcInfo, srcFile, tkey, shortname, attributes, ns, name, terms, provides);
    }
    isStdEntity() {
        return false;
    }
    isPrimitiveEntity() {
        return false;
    }
    isConstructableEntity() {
        return false;
    }
    isCollectionEntity() {
        return false;
    }
}
exports.MIREntityTypeDecl = MIREntityTypeDecl;
class MIRObjectEntityTypeDecl extends MIREntityTypeDecl {
    constructor(srcInfo, srcFile, tkey, shortname, attributes, ns, name, terms, provides, consfunc, consfuncfields, fields) {
        super(srcInfo, srcFile, tkey, shortname, attributes, ns, name, terms, provides);
        this.vcallMap = new Map();
        this.consfunc = consfunc;
        this.consfuncfields = consfuncfields;
        this.fields = fields;
    }
    jemit() {
        return { tag: "std", ...this.jemitbase(), consfunc: this.consfunc, consfuncfields: this.consfuncfields, fields: this.fields.map((f) => f.jemit()), vcallMap: [...this.vcallMap] };
    }
    static jparse(jobj) {
        let entity = new MIRObjectEntityTypeDecl(...MIROOTypeDecl.jparsebase(jobj), jobj.consfunc, jobj.consfuncfields, jobj.fields);
        jobj.vcallMap.forEach((vc) => entity.vcallMap.set(vc[0], vc[1]));
        return entity;
    }
    isStdEntity() {
        return true;
    }
}
exports.MIRObjectEntityTypeDecl = MIRObjectEntityTypeDecl;
class MIRConstructableEntityTypeDecl extends MIREntityTypeDecl {
    //Should have special inject/extract which are the constructors
    constructor(srcInfo, srcFile, tkey, shortname, attributes, ns, name, terms, provides, fromtype, usingcons, binds) {
        super(srcInfo, srcFile, tkey, shortname, attributes, ns, name, terms, provides);
        this.fromtype = fromtype;
        this.usingcons = usingcons;
        this.binds = binds;
    }
    jemit() {
        const fbinds = [...this.binds].sort((a, b) => a[0].localeCompare(b[0])).map((v) => [v[0], v[1].jemit()]);
        return { tag: "constructable", ...this.jemitbase(), fromtype: this.fromtype, usingcons: this.usingcons, binds: fbinds };
    }
    static jparse(jobj) {
        const bbinds = new Map();
        jobj.binds.foreach((v) => {
            bbinds.set(v[0], MIRType.jparse(v[1]));
        });
        return new MIRConstructableEntityTypeDecl(...MIROOTypeDecl.jparsebase(jobj), jobj.fromtype, jobj.usingcons, bbinds);
    }
    isConstructableEntity() {
        return true;
    }
}
exports.MIRConstructableEntityTypeDecl = MIRConstructableEntityTypeDecl;
class MIREnumEntityTypeDecl extends MIREntityTypeDecl {
    constructor(srcInfo, srcFile, tkey, shortname, attributes, ns, name, terms, provides, usingcons, enums) {
        super(srcInfo, srcFile, tkey, shortname, attributes, ns, name, terms, provides);
        this.usingcons = usingcons;
        this.enums = enums;
    }
    jemit() {
        return { tag: "enum", ...this.jemitbase(), usingcons: this.usingcons, enums: this.enums };
    }
    static jparse(jobj) {
        const bbinds = new Map();
        jobj.binds.foreach((v) => {
            bbinds.set(v[0], MIRType.jparse(v[1]));
        });
        return new MIREnumEntityTypeDecl(...MIROOTypeDecl.jparsebase(jobj), jobj.usingcons, jobj.enums);
    }
    isConstructableEntity() {
        return true;
    }
}
exports.MIREnumEntityTypeDecl = MIREnumEntityTypeDecl;
class MIRInternalEntityTypeDecl extends MIREntityTypeDecl {
    constructor(srcInfo, srcFile, tkey, shortname, attributes, ns, name, terms, provides) {
        super(srcInfo, srcFile, tkey, shortname, attributes, ns, name, terms, provides);
    }
}
exports.MIRInternalEntityTypeDecl = MIRInternalEntityTypeDecl;
class MIRPrimitiveInternalEntityTypeDecl extends MIRInternalEntityTypeDecl {
    //Should just be a special implemented value
    constructor(srcInfo, srcFile, tkey, shortname, attributes, ns, name, terms, provides) {
        super(srcInfo, srcFile, tkey, shortname, attributes, ns, name, terms, provides);
    }
    jemit() {
        return { tag: "primitive", ...this.jemitbase() };
    }
    static jparse(jobj) {
        return new MIRPrimitiveInternalEntityTypeDecl(...MIROOTypeDecl.jparsebase(jobj));
    }
    isPrimitiveEntity() {
        return true;
    }
}
exports.MIRPrimitiveInternalEntityTypeDecl = MIRPrimitiveInternalEntityTypeDecl;
class MIRConstructableInternalEntityTypeDecl extends MIRInternalEntityTypeDecl {
    constructor(srcInfo, srcFile, tkey, shortname, attributes, ns, name, terms, provides, fromtype, binds, optaccepts) {
        super(srcInfo, srcFile, tkey, shortname, attributes, ns, name, terms, provides);
        this.fromtype = fromtype;
        this.binds = binds;
        this.optaccepts = optaccepts;
    }
    jemit() {
        const fbinds = [...this.binds].sort((a, b) => a[0].localeCompare(b[0])).map((v) => [v[0], v[1].jemit()]);
        return { tag: "constructableinternal", ...this.jemitbase(), fromtype: this.fromtype, binds: fbinds, optaccepts: this.optaccepts };
    }
    static jparse(jobj) {
        const bbinds = new Map();
        jobj.binds.foreach((v) => {
            bbinds.set(v[0], MIRType.jparse(v[1]));
        });
        return new MIRConstructableInternalEntityTypeDecl(...MIROOTypeDecl.jparsebase(jobj), jobj.fromtype, bbinds, jobj.optaccepts);
    }
    isConstructableEntity() {
        return true;
    }
}
exports.MIRConstructableInternalEntityTypeDecl = MIRConstructableInternalEntityTypeDecl;
class MIRPrimitiveCollectionEntityTypeDecl extends MIRInternalEntityTypeDecl {
    constructor(srcInfo, srcFile, tkey, shortname, attributes, ns, name, terms, provides, oftype, binds) {
        super(srcInfo, srcFile, tkey, shortname, attributes, ns, name, terms, provides);
        this.oftype = oftype;
        this.binds = binds;
    }
    jemitcollection() {
        const fbinds = [...this.binds].sort((a, b) => a[0].localeCompare(b[0])).map((v) => [v[0], v[1].jemit()]);
        return { ...this.jemitbase(), oftype: this.oftype, binds: fbinds };
    }
    static jparsecollection(jobj) {
        const bbinds = new Map();
        jobj.binds.foreach((v) => {
            bbinds.set(v[0], MIRType.jparse(v[1]));
        });
        return [...MIROOTypeDecl.jparsebase(jobj), jobj.oftype, bbinds];
    }
    isCollectionEntity() {
        return true;
    }
}
exports.MIRPrimitiveCollectionEntityTypeDecl = MIRPrimitiveCollectionEntityTypeDecl;
class MIRPrimitiveListEntityTypeDecl extends MIRPrimitiveCollectionEntityTypeDecl {
    constructor(srcInfo, srcFile, tkey, shortname, attributes, ns, name, terms, provides, oftype, binds) {
        super(srcInfo, srcFile, tkey, shortname, attributes, ns, name, terms, provides, oftype, binds);
    }
    jemit() {
        return { tag: "list", ...this.jemitcollection() };
    }
    static jparse(jobj) {
        return new MIRPrimitiveListEntityTypeDecl(...MIRPrimitiveCollectionEntityTypeDecl.jparsecollection(jobj));
    }
}
exports.MIRPrimitiveListEntityTypeDecl = MIRPrimitiveListEntityTypeDecl;
class MIRPrimitiveStackEntityTypeDecl extends MIRPrimitiveCollectionEntityTypeDecl {
    constructor(srcInfo, srcFile, tkey, shortname, attributes, ns, name, terms, provides, oftype, binds, ultype) {
        super(srcInfo, srcFile, tkey, shortname, attributes, ns, name, terms, provides, oftype, binds);
        this.ultype = ultype;
    }
    jemit() {
        return { tag: "stack", ...this.jemitcollection(), ultype: this.ultype };
    }
    static jparse(jobj) {
        return new MIRPrimitiveStackEntityTypeDecl(...MIRPrimitiveCollectionEntityTypeDecl.jparsecollection(jobj), jobj.ultype);
    }
}
exports.MIRPrimitiveStackEntityTypeDecl = MIRPrimitiveStackEntityTypeDecl;
class MIRPrimitiveQueueEntityTypeDecl extends MIRPrimitiveCollectionEntityTypeDecl {
    constructor(srcInfo, srcFile, tkey, shortname, attributes, ns, name, terms, provides, oftype, binds, ultype) {
        super(srcInfo, srcFile, tkey, shortname, attributes, ns, name, terms, provides, oftype, binds);
        this.ultype = ultype;
    }
    jemit() {
        return { tag: "queue", ...this.jemitcollection(), ultype: this.ultype };
    }
    static jparse(jobj) {
        return new MIRPrimitiveQueueEntityTypeDecl(...MIRPrimitiveCollectionEntityTypeDecl.jparsecollection(jobj), jobj.ultype);
    }
}
exports.MIRPrimitiveQueueEntityTypeDecl = MIRPrimitiveQueueEntityTypeDecl;
class MIRPrimitiveSetEntityTypeDecl extends MIRPrimitiveCollectionEntityTypeDecl {
    constructor(srcInfo, srcFile, tkey, shortname, attributes, ns, name, terms, provides, oftype, binds, ultype, unqchkinv, unqconvinv) {
        super(srcInfo, srcFile, tkey, shortname, attributes, ns, name, terms, provides, oftype, binds);
        this.ultype = ultype;
        this.unqchkinv = unqchkinv;
        this.unqconvinv = unqconvinv;
    }
    jemit() {
        return { tag: "set", ...this.jemitcollection(), ultype: this.ultype, unqchkinv: this.unqchkinv, unqconvinv: this.unqconvinv };
    }
    static jparse(jobj) {
        return new MIRPrimitiveSetEntityTypeDecl(...MIRPrimitiveCollectionEntityTypeDecl.jparsecollection(jobj), jobj.ultype, jobj.unqchkinv, jobj.unqconvinv);
    }
}
exports.MIRPrimitiveSetEntityTypeDecl = MIRPrimitiveSetEntityTypeDecl;
class MIRPrimitiveMapEntityTypeDecl extends MIRPrimitiveCollectionEntityTypeDecl {
    constructor(srcInfo, srcFile, tkey, shortname, attributes, ns, name, terms, provides, oftype, binds, ultype, unqchkinv) {
        super(srcInfo, srcFile, tkey, shortname, attributes, ns, name, terms, provides, oftype, binds);
        this.ultype = ultype;
        this.unqchkinv = unqchkinv;
    }
    jemit() {
        return { tag: "set", ...this.jemitcollection(), ultype: this.ultype, unqchkinv: this.unqchkinv };
    }
    static jparse(jobj) {
        return new MIRPrimitiveMapEntityTypeDecl(...MIRPrimitiveCollectionEntityTypeDecl.jparsecollection(jobj), jobj.ultype, jobj.unqchkinv);
    }
}
exports.MIRPrimitiveMapEntityTypeDecl = MIRPrimitiveMapEntityTypeDecl;
class MIRTypeOption {
    constructor(typeID, shortname) {
        this.typeID = typeID;
        this.shortname = shortname;
    }
    static jparse(jobj) {
        switch (jobj.kind) {
            case "entity":
                return MIREntityType.jparse(jobj);
            case "concept":
                return MIRConceptType.jparse(jobj);
            case "tuple":
                return MIRTupleType.jparse(jobj);
            case "record":
                return MIRRecordType.jparse(jobj);
            default:
                assert(jobj.kind === "ephemeral");
                return MIREphemeralListType.jparse(jobj);
        }
    }
}
exports.MIRTypeOption = MIRTypeOption;
class MIREntityType extends MIRTypeOption {
    constructor(typeID, shortname) {
        super(typeID, shortname);
    }
    static create(typeID, shortname) {
        return new MIREntityType(typeID, shortname);
    }
    jemit() {
        return { kind: "entity", typeID: this.typeID, shortname: this.shortname };
    }
    static jparse(jobj) {
        return MIREntityType.create(jobj.typeID, jobj.shortname);
    }
}
exports.MIREntityType = MIREntityType;
class MIRConceptType extends MIRTypeOption {
    constructor(typeID, shortname, ckeys) {
        super(typeID, shortname);
        this.ckeys = ckeys;
    }
    static create(ckeys) {
        const skeys = ckeys.sort((a, b) => a[0].localeCompare(b[0]));
        return new MIRConceptType(skeys.map((v) => v[0]).join(" & "), skeys.map((v) => v[1]).join("&"), skeys.map((v) => v[0]));
    }
    jemit() {
        return { kind: "concept", ckeys: this.ckeys };
    }
    static jparse(jobj) {
        return MIRConceptType.create(jobj.ckeys);
    }
}
exports.MIRConceptType = MIRConceptType;
class MIRTupleType extends MIRTypeOption {
    constructor(typeID, shortname, entries) {
        super(typeID, shortname);
        this.entries = entries;
    }
    static create(entries) {
        let cvalue = entries.map((entry) => entry.typeID).join(", ");
        let shortcvalue = entries.map((entry) => entry.shortname).join(",");
        return new MIRTupleType(`[${cvalue}]`, `[${shortcvalue}]`, [...entries]);
    }
    jemit() {
        return { kind: "tuple", entries: this.entries };
    }
    static jparse(jobj) {
        return MIRTupleType.create(jobj.entries);
    }
}
exports.MIRTupleType = MIRTupleType;
class MIRRecordType extends MIRTypeOption {
    constructor(typeID, shortname, entries) {
        super(typeID, shortname);
        this.entries = entries;
    }
    static create(entries) {
        let simplifiedEntries = [...entries].sort((a, b) => a.pname.localeCompare(b.pname));
        const name = simplifiedEntries.map((entry) => entry.pname + ": " + entry.ptype.typeID).join(", ");
        const shortname = simplifiedEntries.map((entry) => entry.pname + ":" + entry.ptype.shortname).join(",");
        return new MIRRecordType("{" + name + "}", "{" + shortname + "}", simplifiedEntries);
    }
    jemit() {
        return { kind: "record", entries: this.entries };
    }
    static jparse(jobj) {
        return MIRRecordType.create(jobj.entries);
    }
}
exports.MIRRecordType = MIRRecordType;
class MIREphemeralListType extends MIRTypeOption {
    constructor(typeID, shortname, entries) {
        super(typeID, shortname);
        this.entries = entries;
    }
    static create(entries) {
        const name = entries.map((entry) => entry.typeID).join(", ");
        const shortname = entries.map((entry) => entry.shortname).join(",");
        return new MIREphemeralListType("(|" + name + "|)", "(|" + shortname + "|)", entries);
    }
    jemit() {
        return { kind: "ephemeral", entries: this.entries.map((e) => e.jemit()) };
    }
    static jparse(jobj) {
        return MIREphemeralListType.create(jobj.entries.map((e) => MIRType.jparse(e)));
    }
}
exports.MIREphemeralListType = MIREphemeralListType;
class MIRType {
    constructor(typeID, shortname, options) {
        this.typeID = typeID;
        this.shortname = shortname;
        this.options = options;
    }
    static createSingle(option) {
        return new MIRType(option.typeID, option.shortname, [option]);
    }
    static create(options) {
        if (options.length === 1) {
            return MIRType.createSingle(options[0]);
        }
        else {
            const typeid = [...options].sort().map((tk) => tk.typeID).join(" | ");
            const shortname = [...options].sort().map((tk) => tk.shortname).join("|");
            return new MIRType(typeid, shortname, options);
        }
    }
    jemit() {
        return { options: this.options.map((opt) => opt.jemit()) };
    }
    static jparse(jobj) {
        return MIRType.create(jobj.options.map((opt) => MIRTypeOption.jparse(opt)));
    }
    isTupleTargetType() {
        return this.options.every((opt) => opt instanceof MIRTupleType);
    }
    isUniqueTupleTargetType() {
        return this.isTupleTargetType() && this.options.length === 1;
    }
    getUniqueTupleTargetType() {
        return this.options[0];
    }
    isRecordTargetType() {
        return this.options.every((opt) => opt instanceof MIRRecordType);
    }
    isUniqueRecordTargetType() {
        return this.isRecordTargetType() && this.options.length === 1;
    }
    getUniqueRecordTargetType() {
        return this.options[0];
    }
    isUniqueCallTargetType() {
        if (this.options.length !== 1) {
            return false;
        }
        return this.options[0] instanceof MIREntityType;
    }
    getUniqueCallTargetType() {
        return this.options[0];
    }
}
exports.MIRType = MIRType;
class PackageConfig {
    //TODO: package.config data
    jemit() {
        return {};
    }
    static jparse(jobj) {
        return new PackageConfig();
    }
}
exports.PackageConfig = PackageConfig;
class MIRAssembly {
    constructor(pckge, srcFiles, srcHash) {
        this.literalRegexs = [];
        this.validatorRegexs = new Map();
        this.constantDecls = new Map();
        this.fieldDecls = new Map();
        this.invokeDecls = new Map();
        this.primitiveInvokeDecls = new Map();
        this.virtualOperatorDecls = new Map();
        this.conceptDecls = new Map();
        this.entityDecls = new Map();
        this.tupleDecls = new Map();
        this.recordDecls = new Map();
        this.ephemeralListDecls = new Map();
        this.typeMap = new Map();
        this.m_subtypeRelationMemo = new Map();
        this.m_atomSubtypeRelationMemo = new Map();
        this.package = pckge;
        this.srcFiles = srcFiles;
        this.srcHash = srcHash;
    }
    getConceptsProvidedByTuple(tt) {
        let tci = [["NSCore::Some", "Some"]];
        if (tt.entries.every((ttype) => this.subtypeOf(ttype, this.typeMap.get("NSCore::APIType")))) {
            tci.push(["NSCore::APIType", "APIType"]);
        }
        return MIRType.createSingle(MIRConceptType.create(tci));
    }
    getConceptsProvidedByRecord(rr) {
        let tci = [["NSCore::Some", "Some"]];
        if (rr.entries.every((entry) => this.subtypeOf(entry.ptype, this.typeMap.get("NSCore::APIType")))) {
            tci.push(["NSCore::APIType", "APIType"]);
        }
        return MIRType.createSingle(MIRConceptType.create(tci));
    }
    atomSubtypeOf_EntityConcept(t1, t2) {
        const t1e = this.entityDecls.get(t1.typeID);
        const mcc = MIRType.createSingle(t2);
        return t1e.provides.some((provide) => this.subtypeOf(this.typeMap.get(provide), mcc));
    }
    atomSubtypeOf_ConceptConcept(t1, t2) {
        return t2.ckeys.every((c2t) => {
            return t1.ckeys.some((c1t) => {
                const c1 = this.conceptDecls.get(c1t);
                const c2 = this.conceptDecls.get(c2t);
                if (c1.ns === c2.ns && c1.name === c2.name) {
                    return true;
                }
                return c1.provides.some((provide) => this.subtypeOf(this.typeMap.get(provide), this.typeMap.get(c2t)));
            });
        });
    }
    atomSubtypeOf_TupleConcept(t1, t2) {
        const t2type = this.typeMap.get(t2.typeID);
        const tcitype = this.getConceptsProvidedByTuple(t1);
        return this.subtypeOf(tcitype, t2type);
    }
    atomSubtypeOf_RecordConcept(t1, t2) {
        const t2type = this.typeMap.get(t2.typeID);
        const tcitype = this.getConceptsProvidedByRecord(t1);
        return this.subtypeOf(tcitype, t2type);
    }
    atomSubtypeOf(t1, t2) {
        let memores = this.m_atomSubtypeRelationMemo.get(t1.typeID);
        if (memores === undefined) {
            this.m_atomSubtypeRelationMemo.set(t1.typeID, new Map());
            memores = this.m_atomSubtypeRelationMemo.get(t1.typeID);
        }
        let memoval = memores.get(t2.typeID);
        if (memoval !== undefined) {
            return memoval;
        }
        let res = false;
        if (t1.typeID === t2.typeID) {
            res = true;
        }
        else if (t1 instanceof MIRConceptType && t2 instanceof MIRConceptType) {
            res = this.atomSubtypeOf_ConceptConcept(t1, t2);
        }
        else if (t2 instanceof MIRConceptType) {
            if (t1 instanceof MIREntityType) {
                res = this.atomSubtypeOf_EntityConcept(t1, t2);
            }
            else if (t1 instanceof MIRTupleType) {
                res = this.atomSubtypeOf_TupleConcept(t1, t2);
            }
            else if (t1 instanceof MIRRecordType) {
                res = this.atomSubtypeOf_RecordConcept(t1, t2);
            }
            else {
                //fall-through
            }
        }
        else {
            //fall-through
        }
        memores.set(t2.typeID, res);
        return res;
    }
    subtypeOf(t1, t2) {
        let memores = this.m_subtypeRelationMemo.get(t1.typeID);
        if (memores === undefined) {
            this.m_subtypeRelationMemo.set(t1.typeID, new Map());
            memores = this.m_subtypeRelationMemo.get(t1.typeID);
        }
        let memoval = memores.get(t2.typeID);
        if (memoval !== undefined) {
            return memoval;
        }
        const res = (t1.typeID === t2.typeID) || t1.options.every((t1opt) => t2.options.some((t2opt) => this.atomSubtypeOf(t1opt, t2opt)));
        memores.set(t2.typeID, res);
        return res;
    }
    jemit() {
        return {
            package: this.package.jemit(),
            srcFiles: this.srcFiles,
            srcHash: this.srcHash,
            literalRegexs: [...this.literalRegexs].map((lre) => lre.jemit()),
            validatorRegexs: [...this.validatorRegexs].map((vre) => [vre[0], vre[1]]),
            constantDecls: [...this.constantDecls].map((cd) => [cd[0], cd[1].jemit()]),
            fieldDecls: [...this.fieldDecls].map((fd) => [fd[0], fd[1].jemit()]),
            invokeDecls: [...this.invokeDecls].map((id) => [id[0], id[1].jemit()]),
            primitiveInvokeDecls: [...this.primitiveInvokeDecls].map((id) => [id[0], id[1].jemit()]),
            virtualOperatorDecls: [...this.virtualOperatorDecls],
            conceptDecls: [...this.conceptDecls].map((cd) => [cd[0], cd[1].jemit()]),
            entityDecls: [...this.entityDecls].map((ed) => [ed[0], ed[1].jemit()]),
            typeMap: [...this.typeMap].map((t) => [t[0], t[1].jemit()])
        };
    }
    static jparse(jobj) {
        let masm = new MIRAssembly(PackageConfig.jparse(jobj.package), jobj.srcFiles, jobj.srcHash);
        jobj.literalRegexs.forEach((lre) => masm.literalRegexs.push(bsqregex_1.BSQRegex.jparse(lre)));
        jobj.validatorRegexs.forEach((vre) => masm.validatorRegexs.set(vre[0], vre[1]));
        jobj.constantDecls.forEach((cd) => masm.constantDecls.set(cd[0], MIRConstantDecl.jparse(cd[1])));
        jobj.fieldDecls.forEach((fd) => masm.fieldDecls.set(fd[0], MIRFieldDecl.jparse(fd[1])));
        jobj.invokeDecls.forEach((id) => masm.invokeDecls.set(id[0], MIRInvokeDecl.jparse(id[1])));
        jobj.primitiveInvokeDecls.forEach((id) => masm.primitiveInvokeDecls.set(id[0], MIRInvokeDecl.jparse(id[1])));
        jobj.virtualOperatorDecls.forEach((od) => masm.virtualOperatorDecls.set(od[0], od[1]));
        jobj.conceptDecls.forEach((cd) => masm.conceptDecls.set(cd[0], MIROOTypeDecl.jparse(cd[1])));
        jobj.entityDecls.forEach((id) => masm.entityDecls.set(id[0], MIROOTypeDecl.jparse(id[1])));
        jobj.typeMap.forEach((t) => masm.typeMap.set(t[0], MIRType.jparse(t[1])));
        return masm;
    }
}
exports.MIRAssembly = MIRAssembly;
//# sourceMappingURL=mir_assembly.js.map