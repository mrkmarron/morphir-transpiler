"use strict";
//-------------------------------------------------------------------------------------------------------
// Copyright (C) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE.txt file in the project root for full license information.
//-------------------------------------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
exports.Assembly = exports.OOMemberLookupInfo = exports.NamespaceDeclaration = exports.NamespaceUsing = exports.NamespaceTypedef = exports.NamespaceOperatorDecl = exports.NamespaceFunctionDecl = exports.NamespaceConstDecl = exports.EntityTypeDecl = exports.ConceptTypeDecl = exports.OOPTypeDecl = exports.MemberMethodDecl = exports.MemberFieldDecl = exports.StaticOperatorDecl = exports.StaticFunctionDecl = exports.StaticMemberDecl = exports.InvariantDecl = exports.InvokeDecl = exports.PostConditionDecl = exports.PreConditionDecl = exports.TypeConditionRestriction = exports.TemplateTypeRestriction = exports.TemplateTermDecl = exports.isBuildLevelEnabled = void 0;
const resolved_type_1 = require("./resolved_type");
const type_signature_1 = require("./type_signature");
const body_1 = require("./body");
const assert = require("assert");
function isBuildLevelEnabled(check, enabled) {
    if (enabled === "spec") {
        return true;
    }
    else if (enabled === "debug") {
        return check === "debug" || check === "test" || check === "release";
    }
    else if (enabled === "test") {
        return check === "test" || check === "release";
    }
    else {
        return check === "release";
    }
}
exports.isBuildLevelEnabled = isBuildLevelEnabled;
class TemplateTermDecl {
    constructor(name, isunique, isgrounded, tconstraint, isinfer, defaulttype) {
        this.name = name;
        this.isunique = isunique;
        this.isgrounded = isgrounded;
        this.tconstraint = tconstraint;
        this.isInfer = isinfer;
        this.defaultType = defaulttype;
    }
}
exports.TemplateTermDecl = TemplateTermDecl;
class TemplateTypeRestriction {
    constructor(t, isunique, isgrounded, tconstraint) {
        this.t = t;
        this.isunique = isunique;
        this.isgrounded = isgrounded;
        this.tconstraint = tconstraint;
    }
}
exports.TemplateTypeRestriction = TemplateTypeRestriction;
class TypeConditionRestriction {
    constructor(constraints) {
        this.constraints = constraints;
    }
}
exports.TypeConditionRestriction = TypeConditionRestriction;
class PreConditionDecl {
    constructor(sinfo, isvalidate, level, exp, err) {
        this.sinfo = sinfo;
        this.isvalidate = isvalidate;
        this.level = level;
        this.exp = exp;
        this.err = err;
    }
}
exports.PreConditionDecl = PreConditionDecl;
class PostConditionDecl {
    constructor(sinfo, level, exp) {
        this.sinfo = sinfo;
        this.level = level;
        this.exp = exp;
    }
}
exports.PostConditionDecl = PostConditionDecl;
class InvariantDecl {
    constructor(sinfo, level, exp) {
        this.sinfo = sinfo;
        this.level = level;
        this.exp = exp;
    }
}
exports.InvariantDecl = InvariantDecl;
class InvokeDecl {
    constructor(sinfo, bodyID, srcFile, attributes, recursive, terms, termRestrictions, params, optRestName, optRestType, resultType, preconds, postconds, isPCodeFn, isPCodePred, captureSet, body, optscalarslots, optmixedslots) {
        this.sourceLocation = sinfo;
        this.srcFile = srcFile;
        this.bodyID = bodyID;
        this.attributes = attributes;
        this.recursive = recursive;
        this.terms = terms;
        this.termRestrictions = termRestrictions;
        this.params = params;
        this.optRestName = optRestName;
        this.optRestType = optRestType;
        this.resultType = resultType;
        this.preconditions = preconds;
        this.postconditions = postconds;
        this.isPCodeFn = isPCodeFn;
        this.isPCodePred = isPCodePred;
        this.captureSet = captureSet;
        this.body = body;
        this.optscalarslots = optscalarslots;
        this.optmixedslots = optmixedslots;
    }
    generateSig() {
        return new type_signature_1.FunctionTypeSignature(this.recursive, [...this.params], this.optRestName, this.optRestType, this.resultType, this.isPCodePred);
    }
    static createPCodeInvokeDecl(sinfo, bodyID, srcFile, attributes, recursive, params, optRestName, optRestType, resultInfo, captureSet, body, isPCodeFn, isPCodePred) {
        return new InvokeDecl(sinfo, bodyID, srcFile, attributes, recursive, [], undefined, params, optRestName, optRestType, resultInfo, [], [], isPCodeFn, isPCodePred, captureSet, body, [], []);
    }
    static createStandardInvokeDecl(sinfo, bodyID, srcFile, attributes, recursive, terms, termRestrictions, params, optRestName, optRestType, resultInfo, preconds, postconds, body, optscalarslots, optmixedslots) {
        return new InvokeDecl(sinfo, bodyID, srcFile, attributes, recursive, terms, termRestrictions, params, optRestName, optRestType, resultInfo, preconds, postconds, false, false, new Set(), body, optscalarslots, optmixedslots);
    }
}
exports.InvokeDecl = InvokeDecl;
class StaticMemberDecl {
    constructor(srcInfo, srcFile, attributes, name, dtype, value) {
        this.sourceLocation = srcInfo;
        this.srcFile = srcFile;
        this.attributes = attributes;
        this.name = name;
        this.declaredType = dtype;
        this.value = value;
    }
    getName() {
        return this.name;
    }
}
exports.StaticMemberDecl = StaticMemberDecl;
class StaticFunctionDecl {
    constructor(sinfo, srcFile, name, invoke) {
        this.sourceLocation = sinfo;
        this.srcFile = srcFile;
        this.name = name;
        this.invoke = invoke;
    }
    getName() {
        return this.name;
    }
}
exports.StaticFunctionDecl = StaticFunctionDecl;
class StaticOperatorDecl {
    constructor(sinfo, srcFile, name, invoke) {
        this.sourceLocation = sinfo;
        this.srcFile = srcFile;
        this.isPrefix = invoke.attributes.includes("prefix");
        this.isInfix = invoke.attributes.includes("infix");
        this.isDynamic = invoke.attributes.includes("dynamic");
        this.name = name;
        this.invoke = invoke;
    }
    getName() {
        return this.name;
    }
    doesKindTagMatch(tag) {
        return (tag === "prefix" && this.isPrefix) || (tag === "infix" && this.isInfix) || (tag === "std" && !this.isPrefix && !this.isInfix);
    }
}
exports.StaticOperatorDecl = StaticOperatorDecl;
class MemberFieldDecl {
    constructor(srcInfo, srcFile, attributes, name, dtype, value) {
        this.sourceLocation = srcInfo;
        this.srcFile = srcFile;
        this.attributes = attributes;
        this.name = name;
        this.declaredType = dtype;
        this.value = value;
    }
    getName() {
        return this.name;
    }
}
exports.MemberFieldDecl = MemberFieldDecl;
class MemberMethodDecl {
    constructor(sinfo, srcFile, name, refrcvr, invoke) {
        this.sourceLocation = sinfo;
        this.srcFile = srcFile;
        this.refRcvr = refrcvr;
        this.name = name;
        this.invoke = invoke;
    }
    getName() {
        return this.name;
    }
}
exports.MemberMethodDecl = MemberMethodDecl;
class OOPTypeDecl {
    constructor(sourceLocation, srcFile, attributes, ns, name, terms, provides, invariants, staticMembers, staticFunctions, staticOperators, memberFields, memberMethods, nestedEntityDecls) {
        this.sourceLocation = sourceLocation;
        this.srcFile = srcFile;
        this.attributes = attributes;
        this.ns = ns;
        this.name = name;
        this.terms = terms;
        this.provides = provides;
        this.invariants = invariants;
        this.staticMembers = staticMembers;
        this.staticFunctions = staticFunctions;
        this.staticOperators = staticOperators;
        this.memberFields = memberFields;
        this.memberMethods = memberMethods;
        this.nestedEntityDecls = nestedEntityDecls;
    }
    isTypeAnExpandoableCollection() {
        return ["__list_type", "__stack_type", "__queue_type", "__set_type", "__map_type"].some((otype) => OOPTypeDecl.attributeSetContains(otype, this.attributes));
    }
    isListType() {
        return OOPTypeDecl.attributeSetContains("__list_type", this.attributes);
    }
    isStackType() {
        return OOPTypeDecl.attributeSetContains("__stack_type", this.attributes);
    }
    isQueueType() {
        return OOPTypeDecl.attributeSetContains("__queue_type", this.attributes);
    }
    isSetType() {
        return OOPTypeDecl.attributeSetContains("__set_type", this.attributes);
    }
    isMapType() {
        return OOPTypeDecl.attributeSetContains("__map_type", this.attributes);
    }
    isInternalType() {
        return this.attributes.includes("__internal");
    }
    isUniversalConceptType() {
        return this.attributes.includes("__universal");
    }
    isUsableAsTypeDeclBase() {
        return this.attributes.includes("__typedeclable");
    }
    isSpecialConstructableEntity() {
        return this.attributes.includes("__constructable");
    }
    static attributeSetContains(attr, attrSet) {
        return attrSet.indexOf(attr) !== -1;
    }
}
exports.OOPTypeDecl = OOPTypeDecl;
class ConceptTypeDecl extends OOPTypeDecl {
    constructor(sourceLocation, srcFile, attributes, ns, name, terms, provides, invariants, staticMembers, staticFunctions, staticOperators, memberFields, memberMethods, nestedEntityDecls) {
        super(sourceLocation, srcFile, attributes, ns, name, terms, provides, invariants, staticMembers, staticFunctions, staticOperators, memberFields, memberMethods, nestedEntityDecls);
    }
}
exports.ConceptTypeDecl = ConceptTypeDecl;
class EntityTypeDecl extends OOPTypeDecl {
    constructor(sourceLocation, srcFile, attributes, ns, name, terms, provides, invariants, staticMembers, staticFunctions, staticOperators, memberFields, memberMethods, nestedEntityDecls) {
        super(sourceLocation, srcFile, attributes, ns, name, terms, provides, invariants, staticMembers, staticFunctions, staticOperators, memberFields, memberMethods, nestedEntityDecls);
    }
}
exports.EntityTypeDecl = EntityTypeDecl;
class NamespaceConstDecl {
    constructor(srcInfo, srcFile, attributes, ns, name, dtype, value) {
        this.sourceLocation = srcInfo;
        this.srcFile = srcFile;
        this.attributes = attributes;
        this.ns = ns;
        this.name = name;
        this.declaredType = dtype;
        this.value = value;
    }
}
exports.NamespaceConstDecl = NamespaceConstDecl;
class NamespaceFunctionDecl {
    constructor(sinfo, srcFile, ns, name, invoke) {
        this.sourceLocation = sinfo;
        this.srcFile = srcFile;
        this.ns = ns;
        this.name = name;
        this.invoke = invoke;
    }
}
exports.NamespaceFunctionDecl = NamespaceFunctionDecl;
class NamespaceOperatorDecl {
    constructor(sinfo, srcFile, ns, name, invoke, level) {
        this.sourceLocation = sinfo;
        this.srcFile = srcFile;
        this.isPrefix = invoke.attributes.includes("prefix");
        this.isInfix = invoke.attributes.includes("infix");
        this.isDynamic = invoke.attributes.includes("dynamic");
        this.level = level;
        this.ns = ns;
        this.name = name;
        this.invoke = invoke;
    }
    doesKindTagMatch(tag) {
        return (tag === "prefix" && this.isPrefix) || (tag === "infix" && this.isInfix) || (tag === "std" && !this.isPrefix && !this.isInfix);
    }
}
exports.NamespaceOperatorDecl = NamespaceOperatorDecl;
class NamespaceTypedef {
    constructor(ns, name, terms, btype) {
        this.ns = ns;
        this.name = name;
        this.terms = terms;
        this.boundType = btype;
    }
}
exports.NamespaceTypedef = NamespaceTypedef;
class NamespaceUsing {
    constructor(from, names) {
        this.fromNamespace = from;
        this.names = names;
    }
}
exports.NamespaceUsing = NamespaceUsing;
class NamespaceDeclaration {
    constructor(ns) {
        this.ns = ns;
        this.usings = [];
        this.declaredNames = new Set();
        this.typeDefs = new Map();
        this.consts = new Map();
        this.functions = new Map();
        this.operators = new Map();
        this.concepts = new Map();
        this.objects = new Map();
    }
    checkUsingNameClash(names) {
        return names.some((name) => this.usings.some((usedecl) => usedecl.names.indexOf(name) !== -1));
    }
    checkDeclNameClash(ns, name) {
        const rname = ns + "::" + name;
        return this.typeDefs.has(rname) || this.consts.has(rname) || this.functions.has(rname) || this.concepts.has(rname) || this.objects.has(rname) || this.usings.some((usedecl) => usedecl.names.indexOf(name) !== -1);
    }
}
exports.NamespaceDeclaration = NamespaceDeclaration;
class OOMemberLookupInfo {
    constructor(contiainingType, decl, binds) {
        this.contiainingType = contiainingType;
        this.decl = decl;
        this.binds = binds;
    }
}
exports.OOMemberLookupInfo = OOMemberLookupInfo;
class Assembly {
    constructor() {
        this.m_specialTypeMap = new Map();
        this.m_namespaceMap = new Map();
        this.m_conceptMap = new Map();
        this.m_objectMap = new Map();
        this.m_literalRegexs = [];
        this.m_validatorRegexs = new Map();
        this.m_subtypeRelationMemo = new Map();
        this.m_atomSubtypeRelationMemo = new Map();
    }
    resolveTemplateBinds(declterms, giventerms, binds) {
        let fullbinds = new Map();
        for (let i = 0; i < declterms.length; ++i) {
            if (giventerms.length <= i) {
                if (declterms[i].defaultType !== undefined) {
                    fullbinds.set(declterms[i].name, this.normalizeTypeOnly(declterms[i].defaultType, new Map()));
                }
                else {
                    return undefined;
                }
            }
            else {
                fullbinds.set(declterms[i].name, this.normalizeTypeOnly(giventerms[i], binds));
            }
        }
        if ([...fullbinds].some((bb) => bb[1].isEmptyType())) {
            return undefined;
        }
        else {
            return fullbinds;
        }
    }
    processNumberinoExpressionIntoTypedExpression(exp, infertype) {
        //We will do bounds checking later so just make sure general format is ok here
        const isfpnum = exp.value.includes(".");
        if (infertype.isSameType(this.getSpecialIntType())) {
            return !isfpnum ? new body_1.LiteralIntegralExpression(exp.sinfo, exp.value + "i", this.getSpecialIntType()) : undefined;
        }
        else if (infertype.isSameType(this.getSpecialNatType())) {
            return !isfpnum ? new body_1.LiteralIntegralExpression(exp.sinfo, exp.value + "n", this.getSpecialNatType()) : undefined;
        }
        else if (infertype.isSameType(this.getSpecialBigIntType())) {
            return !isfpnum ? new body_1.LiteralIntegralExpression(exp.sinfo, exp.value + "I", this.getSpecialBigIntType()) : undefined;
        }
        else if (infertype.isSameType(this.getSpecialBigNatType())) {
            return !isfpnum ? new body_1.LiteralIntegralExpression(exp.sinfo, exp.value + "N", this.getSpecialBigNatType()) : undefined;
        }
        else if (infertype.isSameType(this.getSpecialFloatType())) {
            return new body_1.LiteralFloatPointExpression(exp.sinfo, exp.value + "f", this.getSpecialFloatType());
        }
        else if (infertype.isSameType(this.getSpecialDecimalType())) {
            return new body_1.LiteralFloatPointExpression(exp.sinfo, exp.value + "d", this.getSpecialDecimalType());
        }
        else if (infertype.isSameType(this.getSpecialRationalType())) {
            return new body_1.LiteralRationalExpression(exp.sinfo, exp.value + "/1R", this.getSpecialRationalType());
        }
        else {
            if (!infertype.isUniqueCallTargetType() || !infertype.getUniqueCallTargetType().object.attributes.includes("__typedprimitive")) {
                return undefined;
            }
            const tt = infertype.getUniqueCallTargetType().object.memberMethods.find((mmf) => mmf.name === "value").invoke.resultType;
            const rtt = this.normalizeTypeOnly(tt, new Map());
            const le = this.processNumberinoExpressionIntoTypedExpression(exp, rtt);
            if (le === undefined) {
                return undefined;
            }
            if (le instanceof body_1.LiteralIntegralExpression) {
                return new body_1.LiteralTypedPrimitiveConstructorExpression(exp.sinfo, le.value, le.itype, infertype);
            }
            else if (le instanceof body_1.LiteralFloatPointExpression) {
                return new body_1.LiteralTypedPrimitiveConstructorExpression(exp.sinfo, le.value, le.fptype, infertype);
            }
            else {
                const re = le;
                return new body_1.LiteralTypedPrimitiveConstructorExpression(exp.sinfo, re.value, re.rtype, infertype);
            }
        }
    }
    compileTimeReduceConstantExpression(exp, binds, infertype) {
        if (exp.isCompileTimeInlineValue()) {
            if (exp instanceof body_1.LiteralNumberinoExpression && infertype !== undefined) {
                return this.processNumberinoExpressionIntoTypedExpression(exp, infertype);
            }
            else {
                if (exp instanceof body_1.LiteralTypedStringExpression) {
                    const oftype = this.normalizeTypeOnly(exp.stype, binds);
                    if (oftype.isUniqueCallTargetType() && oftype.getUniqueCallTargetType().object.attributes.includes("__validator_type")) {
                        return exp;
                    }
                    else {
                        return undefined;
                    }
                }
                else {
                    return exp;
                }
            }
        }
        else if (exp instanceof body_1.AccessNamespaceConstantExpression) {
            if (!this.hasNamespace(exp.ns)) {
                return undefined;
            }
            const nsdecl = this.getNamespace(exp.ns);
            if (!nsdecl.consts.has(exp.name)) {
                return undefined;
            }
            const cdecl = nsdecl.consts.get(exp.name);
            return this.compileTimeReduceConstantExpression(cdecl.value.exp, binds, this.normalizeTypeOnly(cdecl.declaredType, new Map()));
        }
        else if (exp instanceof body_1.AccessStaticFieldExpression) {
            const oftype = this.normalizeTypeOnly(exp.stype, binds);
            const cdecltry = this.tryGetConstMemberUniqueDeclFromType(oftype, exp.name);
            if (cdecltry === undefined) {
                return undefined;
            }
            const cdecl = cdecltry;
            if (cdecl.contiainingType.attributes.includes("__enum_type")) {
                return exp;
            }
            else {
                return cdecl.decl.value !== undefined ? this.compileTimeReduceConstantExpression(cdecl.decl.value.exp, cdecl.binds, this.normalizeTypeOnly(cdecl.decl.declaredType, cdecl.binds)) : undefined;
            }
        }
        else {
            return undefined;
        }
    }
    reduceLiteralValueToCanonicalForm(exp, binds, infertype) {
        const cexp = this.compileTimeReduceConstantExpression(exp, binds, infertype);
        if (cexp === undefined) {
            return undefined;
        }
        if (cexp instanceof body_1.AccessStaticFieldExpression) {
            const stype = this.normalizeTypeOnly(cexp.stype, new Map());
            return [cexp, stype, `${stype.typeID}::${cexp.name}`];
        }
        else {
            assert(cexp.isLiteralValueExpression());
            if (cexp instanceof body_1.LiteralNoneExpression) {
                return [cexp, this.getSpecialNoneType(), "none"];
            }
            else if (cexp instanceof body_1.LiteralNothingExpression) {
                return [cexp, this.getSpecialNothingType(), "nothing"];
            }
            else if (cexp instanceof body_1.LiteralBoolExpression) {
                return [cexp, this.getSpecialBoolType(), `${cexp.value}`];
            }
            else if (cexp instanceof body_1.LiteralIntegralExpression) {
                const itype = this.normalizeTypeOnly(cexp.itype, new Map());
                return [cexp, itype, cexp.value];
            }
            else if (cexp instanceof body_1.LiteralStringExpression) {
                return [cexp, this.getSpecialStringType(), cexp.value];
            }
            else if (cexp instanceof body_1.LiteralTypedStringExpression) {
                const oftype = this.normalizeTypeOnly(cexp.stype, binds);
                return [cexp, oftype, `${cexp.value}#${oftype.typeID}`];
            }
            else {
                assert(cexp instanceof body_1.LiteralTypedPrimitiveConstructorExpression);
                const lexp = cexp;
                const vtype = this.normalizeTypeOnly(lexp.vtype, binds);
                const vv = (/.*[inINfdR]$/.test(lexp.value)) ? lexp.value.slice(0, lexp.value.length - 1) : lexp.value;
                return [lexp, vtype, `${vv}#${vtype.typeID}`];
            }
        }
    }
    splitConceptTypes(ofc, withc) {
        if (ofc.typeID === "NSCore::Any" && withc.typeID === "NSCore::Some") {
            return { tp: withc, fp: this.getSpecialNoneType() };
        }
        else if (ofc.typeID.startsWith("NSCore::Option<") && withc.typeID === "NSCore::ISomething") {
            const somthingres = resolved_type_1.ResolvedEntityAtomType.create(this.tryGetObjectTypeForFullyResolvedName("NSCore::Something"), ofc.conceptTypes[0].binds);
            return { tp: somthingres, fp: this.getSpecialNothingType() };
        }
        else if (ofc.typeID === "NSCore::IOption" && withc.typeID === "NSCore::ISomething") {
            return { tp: withc, fp: this.getSpecialNothingType() };
        }
        else {
            return { tp: withc, fp: ofc };
        }
    }
    splitConceptEntityTypes(ofc, withe) {
        const somethingdecl = this.tryGetObjectTypeForFullyResolvedName("NSCore::Something");
        const okdecl = this.tryGetObjectTypeForFullyResolvedName("NSCore::Result::Ok");
        const errdecl = this.tryGetObjectTypeForFullyResolvedName("NSCore::Result::Err");
        //
        //TODO: we may want to handle some ISomething, Something, Option, Nothing situations more precisely if they can arise
        //
        if (ofc.typeID === "NSCore::Any" && withe.typeID === "NSCore::None") {
            return { tp: withe, fp: this.getSpecialSomeConceptType() };
        }
        else if (ofc.typeID.startsWith("NSCore::Option<") && withe.typeID === "NSCore::Nothing") {
            return { tp: withe, fp: resolved_type_1.ResolvedEntityAtomType.create(somethingdecl, ofc.conceptTypes[0].binds) };
        }
        else if (ofc.typeID.startsWith("NSCore::Option<") && withe.typeID === "NSCore::Something<") {
            return { tp: withe, fp: this.getSpecialNothingType() };
        }
        else if (ofc.typeID.startsWith("NSCore::Result<") && withe.typeID.startsWith("NSCore::Result::Ok<")) {
            return { tp: withe, fp: resolved_type_1.ResolvedEntityAtomType.create(errdecl, ofc.conceptTypes[0].binds) };
        }
        else if (ofc.typeID.startsWith("NSCore::Result<") && withe.typeID.startsWith("NSCore::Result::Err<")) {
            return { tp: withe, fp: resolved_type_1.ResolvedEntityAtomType.create(okdecl, ofc.conceptTypes[0].binds) };
        }
        else if (this.atomSubtypeOf(withe, ofc)) {
            return { tp: withe, fp: ofc };
        }
        else {
            return { tp: undefined, fp: ofc };
        }
    }
    getConceptsProvidedByTuple(tt) {
        let tci = [...this.getSpecialTupleConceptType().options[0].conceptTypes];
        if (tt.types.every((ttype) => this.subtypeOf(ttype, this.getSpecialAPITypeConceptType()))) {
            tci.push(...this.getSpecialAPITypeConceptType().options[0].conceptTypes);
        }
        return resolved_type_1.ResolvedConceptAtomType.create(tci);
    }
    getConceptsProvidedByRecord(rr) {
        let tci = [...this.getSpecialSomeConceptType().options[0].conceptTypes];
        if (rr.entries.every((entry) => this.subtypeOf(entry.ptype, this.getSpecialAPITypeConceptType()))) {
            tci.push(...this.getSpecialAPITypeConceptType().options[0].conceptTypes);
        }
        return resolved_type_1.ResolvedConceptAtomType.create(tci);
    }
    splitConceptTuple(ofc, witht) {
        const withc = this.getConceptsProvidedByTuple(witht);
        if (this.atomSubtypeOf(withc, ofc)) {
            return { tp: witht, fp: ofc };
        }
        else {
            return { tp: undefined, fp: ofc };
        }
    }
    splitConceptRecord(ofc, withr) {
        const withc = this.getConceptsProvidedByRecord(withr);
        if (this.atomSubtypeOf(withc, ofc)) {
            return { tp: withr, fp: ofc };
        }
        else {
            return { tp: undefined, fp: ofc };
        }
    }
    splitAtomTypes(ofa, witha) {
        if (this.atomSubtypeOf(ofa, witha)) {
            return { tp: ofa, fp: undefined };
        }
        if (ofa instanceof resolved_type_1.ResolvedConceptAtomType) {
            if (witha instanceof resolved_type_1.ResolvedEntityAtomType) {
                return this.splitConceptEntityTypes(ofa, witha);
            }
            else if (witha instanceof resolved_type_1.ResolvedConceptAtomType) {
                return this.splitConceptTypes(ofa, witha);
            }
            else if (witha instanceof resolved_type_1.ResolvedTupleAtomType) {
                return this.splitConceptTuple(ofa, witha);
            }
            else if (witha instanceof resolved_type_1.ResolvedRecordAtomType) {
                return this.splitConceptRecord(ofa, witha);
            }
            else {
                return { tp: undefined, fp: ofa };
            }
        }
        else if (ofa instanceof resolved_type_1.ResolvedTupleAtomType) {
            if (witha instanceof resolved_type_1.ResolvedTupleAtomType) {
                if (ofa.typeID === witha.typeID) {
                    return { tp: witha, fp: undefined };
                }
                else {
                    return { tp: undefined, fp: ofa };
                }
            }
            else {
                return { tp: undefined, fp: ofa };
            }
        }
        else if (ofa instanceof resolved_type_1.ResolvedRecordAtomType) {
            if (witha instanceof resolved_type_1.ResolvedRecordAtomType) {
                if (ofa.typeID === witha.typeID) {
                    return { tp: witha, fp: undefined };
                }
                else {
                    return { tp: undefined, fp: ofa };
                }
            }
            else {
                return { tp: undefined, fp: ofa };
            }
        }
        else {
            return { tp: undefined, fp: ofa };
        }
    }
    splitAtomWithType(ofa, witht) {
        let tp = [];
        let fp = [];
        witht.options
            .map((opt) => this.splitAtomTypes(ofa, opt))
            .forEach((rr) => {
            if (rr.tp !== undefined) {
                tp.push(resolved_type_1.ResolvedType.createSingle(rr.tp));
            }
            if (rr.fp !== undefined) {
                fp.push(resolved_type_1.ResolvedType.createSingle(rr.fp));
            }
        });
        return { tp: tp, fp: fp };
    }
    splitTypes(oft, witht) {
        if (oft.isEmptyType() || witht.isEmptyType()) {
            return { tp: resolved_type_1.ResolvedType.createEmpty(), fp: resolved_type_1.ResolvedType.createEmpty() };
        }
        if (oft.typeID === witht.typeID) {
            return { tp: oft, fp: resolved_type_1.ResolvedType.createEmpty() };
        }
        const paths = oft.options.map((opt) => this.splitAtomWithType(opt, witht));
        let tp = [].concat(...paths.map((pp) => pp.tp));
        let fp = [].concat(...paths.map((pp) => pp.fp));
        return { tp: this.typeUpperBound(tp), fp: this.typeUpperBound(fp) };
    }
    splitIndex(oft, idx) {
        if (oft.isEmptyType()) {
            return { tp: resolved_type_1.ResolvedType.createEmpty(), fp: resolved_type_1.ResolvedType.createEmpty() };
        }
        let tpp = [];
        let fpp = [];
        for (let i = 0; i < oft.options.length; ++i) {
            const opt = oft.options[i];
            if (idx < opt.types.length) {
                tpp.push(opt);
            }
            else {
                fpp.push(opt);
            }
        }
        return { tp: resolved_type_1.ResolvedType.create(tpp), fp: resolved_type_1.ResolvedType.create(fpp) };
    }
    splitProperty(oft, pname) {
        if (oft.isEmptyType()) {
            return { tp: resolved_type_1.ResolvedType.createEmpty(), fp: resolved_type_1.ResolvedType.createEmpty() };
        }
        let tpp = [];
        let fpp = [];
        for (let i = 0; i < oft.options.length; ++i) {
            const opt = oft.options[i];
            const entry = opt.entries.find((ee) => ee.pname === pname);
            if (entry !== undefined) {
                tpp.push(opt);
            }
            else {
                fpp.push(opt);
            }
        }
        return { tp: resolved_type_1.ResolvedType.create(tpp), fp: resolved_type_1.ResolvedType.create(fpp) };
    }
    getDerivedTypeProjection(fromtype, oftype) {
        if (oftype.typeID === "Some") {
            return this.splitTypes(fromtype, this.getSpecialNoneType()).fp;
        }
        else if (oftype.typeID === "NSCore::IOptionT") {
            if (oftype.options.length === 1 && oftype.typeID.startsWith("NSCore::Option<")) {
                return oftype.options[0].conceptTypes[0].binds.get("T");
            }
            else {
                return resolved_type_1.ResolvedType.createEmpty();
            }
        }
        else {
            return resolved_type_1.ResolvedType.createEmpty();
        }
    }
    normalizeType_Template(t, binds) {
        return binds.has(t.name) ? binds.get(t.name) : resolved_type_1.ResolvedType.createEmpty();
    }
    normalizeType_Nominal(t, binds) {
        const [aliasResolvedType, aliasResolvedBinds] = this.lookupTypeDef(t, binds);
        if (aliasResolvedType === undefined) {
            return resolved_type_1.ResolvedType.createEmpty();
        }
        else if (!(aliasResolvedType instanceof type_signature_1.NominalTypeSignature)) {
            return this.normalizeTypeGeneral(aliasResolvedType, aliasResolvedBinds);
        }
        else {
            const fconcept = this.tryGetConceptTypeForFullyResolvedName(aliasResolvedType.nameSpace + "::" + aliasResolvedType.computeResolvedName());
            if (fconcept !== undefined) {
                if (fconcept.terms.length !== aliasResolvedType.terms.length) {
                    return resolved_type_1.ResolvedType.createEmpty();
                }
                const cta = this.createConceptTypeAtom(fconcept, aliasResolvedType, aliasResolvedBinds);
                return cta !== undefined ? resolved_type_1.ResolvedType.createSingle(cta) : resolved_type_1.ResolvedType.createEmpty();
            }
            const fobject = this.tryGetObjectTypeForFullyResolvedName(aliasResolvedType.nameSpace + "::" + aliasResolvedType.computeResolvedName());
            if (fobject !== undefined) {
                if (fobject.terms.length !== aliasResolvedType.terms.length) {
                    return resolved_type_1.ResolvedType.createEmpty();
                }
                const ota = this.createObjectTypeAtom(fobject, aliasResolvedType, aliasResolvedBinds);
                return ota !== undefined ? resolved_type_1.ResolvedType.createSingle(ota) : resolved_type_1.ResolvedType.createEmpty();
            }
            return resolved_type_1.ResolvedType.createEmpty();
        }
    }
    normalizeType_Tuple(t, binds) {
        const entries = t.entries.map((entry) => this.normalizeTypeOnly(entry, binds));
        if (entries.some((e) => e.isEmptyType())) {
            return resolved_type_1.ResolvedType.createEmpty();
        }
        return resolved_type_1.ResolvedType.createSingle(resolved_type_1.ResolvedTupleAtomType.create(entries));
    }
    normalizeType_Record(t, binds) {
        let seenNames = new Set();
        let entries = [];
        for (let i = 0; i < t.entries.length; ++i) {
            if (seenNames.has(t.entries[i][0])) {
                return resolved_type_1.ResolvedType.createEmpty();
            }
            entries.push({ pname: t.entries[i][0], ptype: this.normalizeTypeOnly(t.entries[i][1], binds) });
        }
        if (entries.some((e) => e.ptype.isEmptyType())) {
            return resolved_type_1.ResolvedType.createEmpty();
        }
        return resolved_type_1.ResolvedType.createSingle(resolved_type_1.ResolvedRecordAtomType.create(entries));
    }
    normalizeType_EphemeralList(t, binds) {
        const entries = t.entries.map((entry) => this.normalizeTypeOnly(entry, binds));
        if (entries.some((e) => e.isEmptyType())) {
            return resolved_type_1.ResolvedType.createEmpty();
        }
        return resolved_type_1.ResolvedType.createSingle(resolved_type_1.ResolvedEphemeralListType.create(entries));
    }
    normalizeType_Projection(t, binds) {
        const fromt = this.normalizeTypeOnly(t.fromtype, binds);
        const oft = this.normalizeTypeOnly(t.oftype, binds);
        if (fromt.isEmptyType() || oft.isEmptyType()) {
            return resolved_type_1.ResolvedType.createEmpty();
        }
        return this.getDerivedTypeProjection(fromt, oft);
    }
    normalizeType_Plus(t, binds) {
        const ccs = t.types.map((tt) => this.normalizeTypeOnly(tt, binds));
        assert(ccs.length !== 0);
        if (ccs.some((tt) => tt.isEmptyType)) {
            return resolved_type_1.ResolvedType.createEmpty();
        }
        if (ccs.every((tt) => tt.isUniqueTupleTargetType())) {
            let tte = [];
            for (let i = 0; i < ccs.length; ++i) {
                const rte = ccs[i].options[0];
                tte.push(rte.types);
            }
            const fte = [].concat(...tte);
            return resolved_type_1.ResolvedType.createSingle(resolved_type_1.ResolvedTupleAtomType.create(fte));
        }
        else if (ccs.every((tt) => tt.isRecordTargetType())) {
            let tte = [];
            let names = new Set();
            for (let i = 0; i < ccs.length; ++i) {
                const rre = ccs[i].options[0];
                const allnamegroups = rre.entries.map((entry) => entry.pname);
                const allnames = [...new Set([].concat(...allnamegroups))].sort();
                if (allnames.some((pname) => names.has(pname))) {
                    return resolved_type_1.ResolvedType.createEmpty();
                }
                tte.push(rre.entries);
            }
            const fte = [].concat(...tte);
            return resolved_type_1.ResolvedType.createSingle(resolved_type_1.ResolvedRecordAtomType.create(fte));
        }
        else {
            return resolved_type_1.ResolvedType.createEmpty();
        }
    }
    normalizeType_And(t, binds) {
        if (t.types.some((opt) => this.normalizeTypeOnly(opt, binds).isEmptyType())) {
            return resolved_type_1.ResolvedType.createEmpty();
        }
        const ntypes = t.types.map((opt) => this.normalizeTypeOnly(opt, binds).options);
        const flattened = [].concat(...ntypes);
        if (flattened.some((ttype) => !(ttype instanceof resolved_type_1.ResolvedConceptAtomType))) {
            return resolved_type_1.ResolvedType.createEmpty();
        }
        const ctypes = flattened.map((arg) => arg.conceptTypes);
        const itypes = ([].concat(...ctypes)).sort((cte1, cte2) => cte1.typeID.localeCompare(cte2.typeID));
        //do a simplification based on A & B when A \Subtypeeq B is A
        let simplifiedTypes = [];
        for (let i = 0; i < itypes.length; ++i) {
            let docopy = true;
            for (let j = 0; j < itypes.length; ++j) {
                if (i === j) {
                    continue; //ignore check on same element
                }
                //if \exists a Tj s.t. Ti \Subtypeeq Tj then we discard Tj
                if (this.atomSubtypeOf(resolved_type_1.ResolvedConceptAtomType.create([itypes[j]]), resolved_type_1.ResolvedConceptAtomType.create([itypes[i]]))) {
                    docopy = (itypes[i].typeID === itypes[j].typeID) && i < j; //if same type only keep one copy
                    break;
                }
            }
            if (docopy) {
                simplifiedTypes.push(itypes[i]);
            }
        }
        if (simplifiedTypes.length === 0) {
            return resolved_type_1.ResolvedType.createEmpty();
        }
        return resolved_type_1.ResolvedType.createSingle(resolved_type_1.ResolvedConceptAtomType.create(simplifiedTypes));
    }
    normalizeType_Union(t, binds) {
        if (t.types.some((opt) => this.normalizeTypeOnly(opt, binds).isEmptyType())) {
            return resolved_type_1.ResolvedType.createEmpty();
        }
        const utypes = t.types.map((opt) => this.normalizeTypeOnly(opt, binds));
        return this.normalizeUnionList(utypes);
    }
    normalizeEphemerals(ephemerals) {
        const lidx = Math.max(...ephemerals.map((tt) => tt.types.length));
        const uidx = Math.min(...ephemerals.map((tt) => tt.types.length));
        if (lidx !== uidx) {
            return undefined; //can't have different lengths!!!
        }
        let nte = [];
        for (let i = 0; i < lidx; ++i) {
            const ttypes = ephemerals.map((tt) => tt.types[i]);
            const ttype = this.typeUpperBound(ttypes);
            if (ephemerals.some((tt) => !tt.types[i].isSameType(ttype))) {
                return undefined; //can't have different types
            }
            nte.push(ttype);
        }
        return resolved_type_1.ResolvedEphemeralListType.create(nte);
    }
    normalizeUnionList(types) {
        //flatten any union types
        const ntypes = types.map((opt) => opt.options);
        let flattened = [].concat(...ntypes);
        //check for Some | None and add Any if needed
        if (flattened.some((atom) => atom.typeID === "NSCore::None") && flattened.some((atom) => atom.typeID === "NSCore::Some")) {
            flattened.push(this.getSpecialAnyConceptType().options[0]);
        }
        //check for Option<T> | Nothing and add Result<T> if needed
        if (flattened.some((atom) => atom.typeID === "NSCore::Nothing") && flattened.some((atom) => atom.typeID.startsWith("NSCore::Something<"))) {
            const copt = this.m_conceptMap.get("NSCore::Option");
            const nopts = flattened
                .filter((atom) => atom.typeID.startsWith("NSCore::Something<"))
                .map((atom) => resolved_type_1.ResolvedConceptAtomType.create([resolved_type_1.ResolvedConceptAtomTypeEntry.create(copt, atom.binds)]));
            flattened.push(...nopts);
        }
        //check for Option<T> | Nothing and add Result<T> if needed
        if (flattened.some((atom) => atom.typeID.startsWith("NSCore::Result::Ok<")) && flattened.some((atom) => atom.typeID.startsWith("NSCore::Result::Err<"))) {
            const ropt = this.m_conceptMap.get("NSCore::Result");
            const okopts = flattened.filter((atom) => atom.typeID.startsWith("NSCore::Result::Ok<"));
            const erropts = flattened.filter((atom) => atom.typeID.startsWith("NSCore::Result::Err<"));
            const bothopts = okopts.filter((okatom) => erropts.some((erratom) => {
                const okbinds = okatom.binds;
                const errbinds = erratom.binds;
                return okbinds.get("T").typeID === errbinds.get("T").typeID && okbinds.get("E").typeID === errbinds.get("E").typeID;
            }));
            const nopts = bothopts.map((atom) => resolved_type_1.ResolvedConceptAtomType.create([resolved_type_1.ResolvedConceptAtomTypeEntry.create(ropt, atom.binds)]));
            flattened.push(...nopts);
        }
        const teph = flattened.filter((tt) => tt instanceof resolved_type_1.ResolvedEphemeralListType);
        let merged = flattened.filter((tt) => !(tt instanceof resolved_type_1.ResolvedEphemeralListType));
        if (teph.length !== 0) {
            const eet = this.normalizeEphemerals(teph);
            if (eet === undefined || merged.length !== 0) {
                return resolved_type_1.ResolvedType.createEmpty();
            }
            else {
                merged.push(eet);
            }
        }
        const utypes = merged.sort((cte1, cte2) => cte1.typeID.localeCompare(cte2.typeID));
        //do a simplification based on A | B when A \Subtypeeq B is B
        let simplifiedTypes = [];
        for (let i = 0; i < utypes.length; ++i) {
            let docopy = true;
            for (let j = 0; j < utypes.length; ++j) {
                if (i === j) {
                    continue; //ignore check on same element
                }
                //if \exists a Tj s.t. Ti \Subtypeeq Tj then we discard Ti
                if (this.atomSubtypeOf(utypes[i], utypes[j])) {
                    docopy = (utypes[i].typeID === utypes[j].typeID) && i < j; //if same type only keep one copy
                    break;
                }
            }
            if (docopy) {
                simplifiedTypes.push(utypes[i]);
            }
        }
        return resolved_type_1.ResolvedType.create(simplifiedTypes);
    }
    normalizeType_Function(t, binds) {
        const params = t.params.map((param) => {
            let ttl = this.normalizeTypeGeneral(param.type, binds);
            let llpv = undefined;
            if (param.litexp !== undefined) {
                const lei = this.reduceLiteralValueToCanonicalForm(param.litexp.exp, binds, ttl);
                if (lei === undefined) {
                    ttl = resolved_type_1.ResolvedType.createEmpty();
                }
                else {
                    llpv = lei[2];
                }
            }
            return new resolved_type_1.ResolvedFunctionTypeParam(param.name, ttl, param.isOptional, param.refKind, llpv);
        });
        const optRestParamType = (t.optRestParamType !== undefined) ? this.normalizeTypeOnly(t.optRestParamType, binds) : undefined;
        const rtype = this.normalizeTypeOnly(t.resultType, binds);
        if (params.some((p) => p.type instanceof resolved_type_1.ResolvedType && p.type.isEmptyType()) || params.some((p) => p.isOptional && (p.refKind !== undefined)) || (optRestParamType !== undefined && optRestParamType.isEmptyType()) || rtype.isEmptyType()) {
            return undefined;
        }
        if (t.isPred && rtype.typeID !== "NSCore::Bool") {
            return undefined; //pred must have Bool result type
        }
        return resolved_type_1.ResolvedFunctionType.create(t.recursive, params, t.optRestParamName, optRestParamType, rtype, t.isPred);
    }
    atomSubtypeOf_EntityConcept(t1, t2) {
        if (t1.object.attributes.includes("__nothing_type") && t2.conceptTypes.some((cpt) => cpt.concept.attributes.includes("__option_type"))) {
            return true;
        }
        else {
            const t2type = resolved_type_1.ResolvedType.createSingle(t2);
            return this.resolveProvides(t1.object, t1.binds).some((provide) => {
                const tt = this.normalizeTypeOnly(provide, t1.binds);
                return !tt.isEmptyType() && this.subtypeOf(tt, t2type);
            });
        }
    }
    atomSubtypeOf_TupleConcept(t1, t2) {
        const tt = this.getConceptsProvidedByTuple(t1);
        return this.subtypeOf(resolved_type_1.ResolvedType.createSingle(tt), resolved_type_1.ResolvedType.createSingle(t2));
    }
    atomSubtypeOf_RecordConcept(t1, t2) {
        const tr = this.getConceptsProvidedByRecord(t1);
        return this.subtypeOf(resolved_type_1.ResolvedType.createSingle(tr), resolved_type_1.ResolvedType.createSingle(t2));
    }
    atomSubtypeOf_ConceptConcept(t1, t2) {
        return t2.conceptTypes.every((c2t) => {
            return t1.conceptTypes.some((c1t) => {
                if (c1t.concept.ns === c2t.concept.ns && c1t.concept.name === c2t.concept.name) {
                    let allBindsOk = true;
                    c1t.binds.forEach((v, k) => (allBindsOk = allBindsOk && v.typeID === c2t.binds.get(k).typeID));
                    return allBindsOk;
                }
                const t2type = resolved_type_1.ResolvedType.createSingle(resolved_type_1.ResolvedConceptAtomType.create([c2t]));
                return this.resolveProvides(c1t.concept, c1t.binds).some((provide) => {
                    const tt = this.normalizeTypeOnly(provide, c1t.binds);
                    return !tt.isEmptyType() && this.subtypeOf(tt, t2type);
                });
            });
        });
    }
    unifyResolvedEntityAtomType(witht, atom, umap) {
        if (witht.object.ns !== atom.object.ns || witht.object.name !== atom.object.name) {
            return;
        }
        if (witht.binds.size !== atom.binds.size) {
            return;
        }
        witht.binds.forEach((v, k) => {
            this.typeUnify(v, atom.binds.get(k), umap);
        });
    }
    unifyResolvedConceptAtomType(witht, atom, umap) {
        if (witht.conceptTypes.length !== atom.conceptTypes.length) {
            return;
        }
        for (let i = 0; i < witht.conceptTypes.length; ++i) {
            const withcc = witht.conceptTypes[i];
            const atomcc = atom.conceptTypes[i];
            if (withcc.concept.ns !== atomcc.concept.ns || withcc.concept.name !== atomcc.concept.name) {
                return;
            }
            if (withcc.binds.size !== atomcc.binds.size) {
                return;
            }
            withcc.binds.forEach((v, k) => {
                this.typeUnify(v, atomcc.binds.get(k), umap);
            });
        }
    }
    unifyResolvedTupleAtomType(witht, atom, umap) {
        if (witht.types.length !== atom.types.length) {
            return;
        }
        for (let i = 0; i < witht.types.length; ++i) {
            this.typeUnify(witht.types[i], atom.types[i], umap);
        }
    }
    unifyResolvedRecordAtomType(witht, atom, umap) {
        if (witht.entries.length !== atom.entries.length) {
            return;
        }
        for (let i = 0; i < witht.entries.length; ++i) {
            const withe = witht.entries[i];
            const atome = atom.entries[i];
            if (withe.pname !== atome.pname) {
                return;
            }
            this.typeUnify(withe.ptype, atome.ptype, umap);
        }
    }
    internSpecialConceptType(names, terms, binds) {
        if (this.m_specialTypeMap.has("NSCore::" + names.join("::"))) {
            return this.m_specialTypeMap.get("NSCore::" + names.join("::"));
        }
        const rsig = new type_signature_1.NominalTypeSignature("NSCore", names, terms || []);
        const tconcept = this.createConceptTypeAtom(this.tryGetConceptTypeForFullyResolvedName("NSCore::" + names.join("::")), rsig, binds || new Map());
        const rtype = resolved_type_1.ResolvedType.createSingle(tconcept);
        this.m_specialTypeMap.set("NSCore::" + names.join("::"), rtype);
        return rtype;
    }
    internSpecialObjectType(names, terms, binds) {
        if (this.m_specialTypeMap.has("NSCore::" + names.join("::"))) {
            return this.m_specialTypeMap.get("NSCore::" + names.join("::"));
        }
        const rsig = new type_signature_1.NominalTypeSignature("NSCore", names, terms || []);
        const tobject = this.createObjectTypeAtom(this.tryGetObjectTypeForFullyResolvedName("NSCore::" + names.join("::")), rsig, binds || new Map());
        const rtype = resolved_type_1.ResolvedType.createSingle(tobject);
        this.m_specialTypeMap.set("NSCore::" + names.join("::"), rtype);
        return rtype;
    }
    getSpecialNoneType() { return this.internSpecialObjectType(["None"]); }
    getSpecialBoolType() { return this.internSpecialObjectType(["Bool"]); }
    getSpecialIntType() { return this.internSpecialObjectType(["Int"]); }
    getSpecialNatType() { return this.internSpecialObjectType(["Nat"]); }
    getSpecialBigIntType() { return this.internSpecialObjectType(["BigInt"]); }
    getSpecialBigNatType() { return this.internSpecialObjectType(["BigNat"]); }
    getSpecialRationalType() { return this.internSpecialObjectType(["Rational"]); }
    getSpecialFloatType() { return this.internSpecialObjectType(["Float"]); }
    getSpecialDecimalType() { return this.internSpecialObjectType(["Decimal"]); }
    getSpecialStringPosType() { return this.internSpecialObjectType(["StringPos"]); }
    getSpecialStringType() { return this.internSpecialObjectType(["String"]); }
    getSpecialBufferFormatType() { return this.internSpecialObjectType(["BufferFormat"]); }
    getSpecialBufferCompressionType() { return this.internSpecialObjectType(["BufferCompression"]); }
    getSpecialByteBufferType() { return this.internSpecialObjectType(["ByteBuffer"]); }
    getSpecialISOTimeType() { return this.internSpecialObjectType(["ISOTime"]); }
    getSpecialLogicalTimeType() { return this.internSpecialObjectType(["LogicalTime"]); }
    getSpecialUUIDType() { return this.internSpecialObjectType(["UUID"]); }
    getSpecialContentHashType() { return this.internSpecialObjectType(["ContentHash"]); }
    getSpecialRegexType() { return this.internSpecialObjectType(["Regex"]); }
    getSpecialNothingType() { return this.internSpecialObjectType(["Nothing"]); }
    getSpecialHavocType() { return this.internSpecialObjectType(["HavocSequence"]); }
    getSpecialAnyConceptType() { return this.internSpecialConceptType(["Any"]); }
    getSpecialSomeConceptType() { return this.internSpecialConceptType(["Some"]); }
    getSpecialKeyTypeConceptType() { return this.internSpecialConceptType(["KeyType"]); }
    getSpecialValidatorConceptType() { return this.internSpecialConceptType(["Validator"]); }
    getSpecialParsableConceptType() { return this.internSpecialConceptType(["Parsable"]); }
    getSpecialAPITypeConceptType() { return this.internSpecialConceptType(["APIType"]); }
    getSpecialAlgebraicConceptType() { return this.internSpecialConceptType(["Algebraic"]); }
    getSpecialOrderableConceptType() { return this.internSpecialConceptType(["Orderable"]); }
    getSpecialTupleConceptType() { return this.internSpecialConceptType(["Tuple"]); }
    getSpecialRecordConceptType() { return this.internSpecialConceptType(["Record"]); }
    getSpecialISomethingConceptType() { return this.internSpecialConceptType(["ISomething"]); }
    getSpecialIOptionConceptType() { return this.internSpecialConceptType(["IOption"]); }
    getSpecialIOptionTConceptType() { return this.internSpecialConceptType(["IOptionT"]); }
    getSpecialObjectConceptType() { return this.internSpecialConceptType(["Object"]); }
    getStringOfType(t) { return resolved_type_1.ResolvedType.createSingle(resolved_type_1.ResolvedEntityAtomType.create(this.m_objectMap.get("NSCore::StringOf"), new Map().set("T", t))); }
    getDataStringType(t) { return resolved_type_1.ResolvedType.createSingle(resolved_type_1.ResolvedEntityAtomType.create(this.m_objectMap.get("NSCore::DataString"), new Map().set("T", t))); }
    getBufferOfType(t) { return resolved_type_1.ResolvedType.createSingle(resolved_type_1.ResolvedEntityAtomType.create(this.m_objectMap.get("NSCore::BufferOf"), new Map().set("T", t))); }
    getDataBufferType(t) { return resolved_type_1.ResolvedType.createSingle(resolved_type_1.ResolvedEntityAtomType.create(this.m_objectMap.get("NSCore::DataBuffer"), new Map().set("T", t))); }
    getSomethingType(t) { return resolved_type_1.ResolvedType.createSingle(resolved_type_1.ResolvedEntityAtomType.create(this.m_objectMap.get("NSCore::Something"), new Map().set("T", t))); }
    getOkType(t, e) { return resolved_type_1.ResolvedType.createSingle(resolved_type_1.ResolvedEntityAtomType.create(this.m_objectMap.get("NSCore::Result::Ok"), new Map().set("T", t).set("E", e))); }
    getErrType(t, e) { return resolved_type_1.ResolvedType.createSingle(resolved_type_1.ResolvedEntityAtomType.create(this.m_objectMap.get("NSCore::Result::Err"), new Map().set("T", t).set("E", e))); }
    getListType(t) { return resolved_type_1.ResolvedType.createSingle(resolved_type_1.ResolvedEntityAtomType.create(this.m_objectMap.get("NSCore::List"), new Map().set("T", t))); }
    getStackType(t) { return resolved_type_1.ResolvedType.createSingle(resolved_type_1.ResolvedEntityAtomType.create(this.m_objectMap.get("NSCore::Stack"), new Map().set("T", t))); }
    getQueueType(t) { return resolved_type_1.ResolvedType.createSingle(resolved_type_1.ResolvedEntityAtomType.create(this.m_objectMap.get("NSCore::Queue"), new Map().set("T", t))); }
    getSetType(t) { return resolved_type_1.ResolvedType.createSingle(resolved_type_1.ResolvedEntityAtomType.create(this.m_objectMap.get("NSCore::Set"), new Map().set("T", t))); }
    getMapType(k, v) { return resolved_type_1.ResolvedType.createSingle(resolved_type_1.ResolvedEntityAtomType.create(this.m_objectMap.get("NSCore::Map"), new Map().set("K", k).set("V", v))); }
    getOptionConceptType(t) { return resolved_type_1.ResolvedType.createSingle(resolved_type_1.ResolvedConceptAtomType.create([resolved_type_1.ResolvedConceptAtomTypeEntry.create(this.m_conceptMap.get("NSCore::Option"), new Map().set("T", t))])); }
    getResultConceptType(t, e) { return resolved_type_1.ResolvedType.createSingle(resolved_type_1.ResolvedConceptAtomType.create([resolved_type_1.ResolvedConceptAtomTypeEntry.create(this.m_conceptMap.get("NSCore::Result"), new Map().set("T", t).set("E", e))])); }
    isExpandoableType(ty) { return ty.typeID.startsWith("NSCore::Expandoable<"); }
    ensureNominalRepresentation(t) {
        const opts = t.options.map((opt) => {
            if (opt instanceof resolved_type_1.ResolvedTupleAtomType) {
                return this.getSpecialTupleConceptType();
            }
            else if (opt instanceof resolved_type_1.ResolvedRecordAtomType) {
                return this.getSpecialRecordConceptType();
            }
            else {
                return resolved_type_1.ResolvedType.createSingle(opt);
            }
        });
        return this.typeUpperBound(opts);
    }
    tryGetConceptTypeForFullyResolvedName(name) {
        return this.m_conceptMap.get(name);
    }
    tryGetObjectTypeForFullyResolvedName(name) {
        return this.m_objectMap.get(name);
    }
    tryGetValidatorForFullyResolvedName(name) {
        return this.m_validatorRegexs.get(name);
    }
    hasNamespace(ns) {
        return this.m_namespaceMap.has(ns);
    }
    getNamespace(ns) {
        return this.m_namespaceMap.get(ns);
    }
    ensureNamespace(ns) {
        if (!this.hasNamespace(ns)) {
            this.m_namespaceMap.set(ns, new NamespaceDeclaration(ns));
        }
        return this.getNamespace(ns);
    }
    getNamespaces() {
        let decls = [];
        this.m_namespaceMap.forEach((v, k) => {
            decls.push(v);
        });
        return decls;
    }
    addConceptDecl(resolvedName, concept) {
        this.m_conceptMap.set(resolvedName, concept);
    }
    addObjectDecl(resolvedName, object) {
        this.m_objectMap.set(resolvedName, object);
    }
    addValidatorRegex(resolvedName, validator) {
        let ere = this.m_literalRegexs.findIndex((lre) => lre.restr === validator.restr);
        if (ere === -1) {
            ere = this.m_literalRegexs.length;
            this.m_literalRegexs.push(validator);
        }
        this.m_validatorRegexs.set(resolvedName, this.m_literalRegexs[ere]);
    }
    addLiteralRegex(re) {
        const ere = this.m_literalRegexs.findIndex((lre) => lre.restr === re.restr);
        if (ere !== -1) {
            this.m_literalRegexs.push(re);
        }
    }
    getAllLiteralRegexs() {
        return this.m_literalRegexs;
    }
    getAllValidators() {
        return [...this.m_validatorRegexs].map((vre) => {
            const ve = resolved_type_1.ResolvedEntityAtomType.create(this.m_objectMap.get(vre[0]), new Map());
            return [ve, vre[1]];
        });
    }
    ////
    //Type representation, normalization, and operations
    lookupTypeDef(t, binds) {
        if (!this.hasNamespace(t.nameSpace)) {
            return [undefined, new Map()];
        }
        const lname = t.nameSpace + "::" + t.tnames.join("::");
        const nsd = this.getNamespace(t.nameSpace);
        if (!nsd.typeDefs.has(lname)) {
            return [t, new Map(binds)];
        }
        //compute the bindings to use when resolving the RHS of the typedef alias
        const typealias = nsd.typeDefs.get(lname);
        const updatedbinds = this.resolveTemplateBinds(typealias.terms, t.terms, binds);
        if (updatedbinds === undefined) {
            return [undefined, new Map()];
        }
        if (typealias.boundType instanceof type_signature_1.NominalTypeSignature) {
            return this.lookupTypeDef(typealias.boundType, updatedbinds);
        }
        else {
            return [typealias.boundType, updatedbinds];
        }
    }
    createConceptTypeAtom(concept, t, binds) {
        const fullbinds = this.resolveTemplateBinds(concept.terms, t.terms, binds);
        if (fullbinds === undefined) {
            return undefined;
        }
        return resolved_type_1.ResolvedConceptAtomType.create([resolved_type_1.ResolvedConceptAtomTypeEntry.create(concept, fullbinds)]);
    }
    createObjectTypeAtom(object, t, binds) {
        const fullbinds = this.resolveTemplateBinds(object.terms, t.terms, binds);
        if (fullbinds === undefined) {
            return undefined;
        }
        return resolved_type_1.ResolvedEntityAtomType.create(object, fullbinds);
    }
    getAllOOFieldsConstructors(ooptype, binds, fmap) {
        assert(!ooptype.isSpecialConstructableEntity(), "Needs to be handled as special case");
        let declfields = fmap || { req: new Map(), opt: new Map() };
        //Important to do traversal in Left->Right Topmost traversal order
        this.resolveProvides(ooptype, binds).forEach((provide) => {
            const tt = this.normalizeTypeOnly(provide, binds);
            tt.options[0].conceptTypes.forEach((concept) => {
                declfields = this.getAllOOFieldsConstructors(concept.concept, concept.binds, declfields);
            });
        });
        ooptype.memberFields.forEach((mf) => {
            if (mf.value === undefined) {
                if (!declfields.req.has(mf.name)) {
                    declfields.req.set(mf.name, [ooptype, mf, binds]);
                }
            }
            else {
                if (!declfields.opt.has(mf.name) && !OOPTypeDecl.attributeSetContains("derived", mf.attributes)) {
                    declfields.opt.set(mf.name, [ooptype, mf, binds]);
                }
            }
        });
        return declfields;
    }
    getAllOOFieldsLayout(ooptype, binds, fmap) {
        assert(!ooptype.isSpecialConstructableEntity(), "Needs to be handled as special case");
        let declfields = fmap || new Map();
        //Important to do traversal in Left->Right Topmost traversal order
        this.resolveProvides(ooptype, binds).forEach((provide) => {
            const tt = this.normalizeTypeOnly(provide, binds);
            tt.options[0].conceptTypes.forEach((concept) => {
                declfields = this.getAllOOFieldsLayout(concept.concept, concept.binds, declfields);
            });
        });
        ooptype.memberFields.forEach((mf) => {
            if (!declfields.has(mf.name)) {
                declfields.set(mf.name, [ooptype, mf, binds]);
            }
        });
        return declfields;
    }
    getExpandoProvides(ooptype, binds) {
        if (ooptype.ns === "NSCore" && ooptype.name === "Expandoable") {
            return resolved_type_1.ResolvedType.createSingle(resolved_type_1.ResolvedConceptAtomType.create([resolved_type_1.ResolvedConceptAtomTypeEntry.create(ooptype, binds)]));
        }
        const rtypes = this.resolveProvides(ooptype, binds);
        for (let i = 0; i < rtypes.length; ++i) {
            const tt = this.normalizeTypeOnly(rtypes[i], binds);
            const ct = tt.options[0].conceptTypes[0];
            const ep = this.getExpandoProvides(ct.concept, ct.binds);
            if (ep !== undefined) {
                return ep;
            }
        }
        return undefined;
    }
    getAllInvariantProvidingTypes(ooptype, binds, invprovs) {
        let declinvs = [...(invprovs || [])];
        this.resolveProvides(ooptype, binds).forEach((provide) => {
            const tt = this.normalizeTypeOnly(provide, binds);
            tt.options[0].conceptTypes.forEach((concept) => {
                declinvs = this.getAllInvariantProvidingTypes(concept.concept, concept.binds, declinvs);
            });
        });
        const ttype = resolved_type_1.ResolvedType.createSingle(ooptype instanceof EntityTypeDecl ? resolved_type_1.ResolvedEntityAtomType.create(ooptype, binds) : resolved_type_1.ResolvedConceptAtomType.create([resolved_type_1.ResolvedConceptAtomTypeEntry.create(ooptype, binds)]));
        if (declinvs.find((dd) => dd[0].typeID === ttype.typeID)) {
            return declinvs;
        }
        else {
            if (ooptype.invariants.length !== 0) {
                declinvs.push([ttype, ooptype, binds]);
            }
            return declinvs;
        }
    }
    hasInvariants(ooptype, binds) {
        return this.getAllInvariantProvidingTypes(ooptype, binds).length !== 0;
    }
    getAbstractPrePostConds(fname, ooptype, oobinds, callbinds) {
        const rprovides = this.resolveProvides(ooptype, oobinds);
        for (let i = 0; i < rprovides.length; ++i) {
            const provide = rprovides[i];
            const tt = this.normalizeTypeOnly(provide, oobinds);
            for (let j = 0; j < tt.options[0].conceptTypes.length; ++j) {
                const concept = tt.options[0].conceptTypes[j];
                const pc = this.getAbstractPrePostConds(fname, concept.concept, concept.binds, callbinds);
                if (pc !== undefined) {
                    return pc;
                }
            }
        }
        const mmdecl = ooptype.memberMethods.find((mmd) => mmd.name === fname);
        if (mmdecl !== undefined && (mmdecl.invoke.attributes.includes("abstract") || mmdecl.invoke.attributes.includes("virtual"))) {
            let newbinds = new Map();
            oobinds.forEach((v, k) => newbinds.set(k, v));
            mmdecl.invoke.terms.forEach((term) => newbinds.set(term.name, callbinds.get(term.name)));
            return { pre: [mmdecl.invoke.preconditions, newbinds], post: [mmdecl.invoke.postconditions, newbinds] };
        }
        const sfdecl = ooptype.staticFunctions.find((sfd) => sfd.name === fname);
        if (sfdecl !== undefined && !(sfdecl.invoke.attributes.includes("abstract") || sfdecl.invoke.attributes.includes("virtual"))) {
            let newbinds = new Map();
            oobinds.forEach((v, k) => newbinds.set(k, v));
            sfdecl.invoke.terms.forEach((term) => newbinds.set(term.name, callbinds.get(term.name)));
            return { pre: [sfdecl.invoke.preconditions, newbinds], post: [sfdecl.invoke.postconditions, newbinds] };
        }
        return undefined;
    }
    tryGetMemberConstDecl(ooptype, binds, name) {
        const sdecl = ooptype.staticMembers.find((sm) => sm.name === name);
        if (sdecl === undefined) {
            return undefined;
        }
        return new OOMemberLookupInfo(ooptype, sdecl, binds);
    }
    tryGetMemberConstDeclParent(ooptype, binds, name) {
        const rprovides = this.resolveProvides(ooptype, binds);
        for (let i = 0; i < rprovides.length; ++i) {
            const tt = this.normalizeTypeOnly(rprovides[i], binds).options[0].conceptTypes[0];
            const res = this.tryGetMemberConstDecl(tt.concept, tt.binds, name) || this.tryGetMemberConstDeclParent(tt.concept, tt.binds, name);
            if (res !== undefined) {
                return res;
            }
        }
        return undefined;
    }
    tryGetMemberFunctionDecl(ooptype, binds, name) {
        const sfdecl = ooptype.staticFunctions.find((sfd) => sfd.name === name);
        if (sfdecl === undefined) {
            return undefined;
        }
        return new OOMemberLookupInfo(ooptype, sfdecl, binds);
    }
    tryGetMemberFunctionDeclParent(ooptype, binds, name) {
        const rprovides = this.resolveProvides(ooptype, binds);
        for (let i = 0; i < rprovides.length; ++i) {
            const tt = this.normalizeTypeOnly(rprovides[i], binds).options[0].conceptTypes[0];
            const res = this.tryGetMemberFunctionDecl(tt.concept, tt.binds, name) || this.tryGetMemberFunctionDeclParent(tt.concept, tt.binds, name);
            if (res !== undefined) {
                return res;
            }
        }
        return undefined;
    }
    tryGetMemberOperatorDecl(ooptype, binds, name) {
        const sodecl = ooptype.staticOperators.filter((so) => so.name === name);
        if (sodecl.length === 0) {
            return undefined;
        }
        return new OOMemberLookupInfo(ooptype, sodecl, binds);
    }
    tryGetMemberOperatorDeclParent(ooptype, binds, name) {
        const rprovides = this.resolveProvides(ooptype, binds);
        for (let i = 0; i < rprovides.length; ++i) {
            const tprovide = this.normalizeTypeOnly(rprovides[i], binds).options[0];
            const tt = tprovide.conceptTypes[0];
            const res = this.tryGetMemberOperatorDecl(tt.concept, tt.binds, name) || this.tryGetMemberOperatorDeclParent(tt.concept, tt.binds, name);
            if (res !== undefined) {
                return res;
            }
        }
        return undefined;
    }
    tryGetMemberFieldDecl(ooptype, binds, name) {
        const mfdecl = ooptype.memberFields.find((mf) => mf.name === name);
        if (mfdecl === undefined) {
            return undefined;
        }
        return new OOMemberLookupInfo(ooptype, mfdecl, binds);
    }
    tryGetMemberFieldDeclParent(ooptype, binds, name) {
        const rprovides = this.resolveProvides(ooptype, binds);
        for (let i = 0; i < rprovides.length; ++i) {
            const tt = this.normalizeTypeOnly(rprovides[i], binds).options[0].conceptTypes[0];
            const res = this.tryGetMemberFieldDecl(tt.concept, tt.binds, name) || this.tryGetMemberFieldDeclParent(tt.concept, tt.binds, name);
            if (res !== undefined) {
                return res;
            }
        }
        return undefined;
    }
    tryGetMemberMethodDecl(ooptype, binds, name, skipoverride) {
        const mmdecls = ooptype.memberMethods.filter((mm) => {
            if (skipoverride && OOPTypeDecl.attributeSetContains("override", mm.invoke.attributes)) {
                return false;
            }
            return mm.name === name;
        });
        if (mmdecls.length === 0) {
            return undefined;
        }
        return new OOMemberLookupInfo(ooptype, mmdecls, binds);
    }
    tryGetMemberMethodDeclParent(ooptype, binds, name, skipoverride) {
        const rprovides = this.resolveProvides(ooptype, binds);
        for (let i = 0; i < rprovides.length; ++i) {
            const tt = this.normalizeTypeOnly(rprovides[i], binds).options[0].conceptTypes[0];
            const res = this.tryGetMemberMethodDecl(tt.concept, tt.binds, name, skipoverride) || this.tryGetMemberMethodDeclParent(tt.concept, tt.binds, name, skipoverride);
            if (res !== undefined) {
                return res;
            }
        }
        return undefined;
    }
    tryGetNestedEntityDecl(ooptype, binds, name) {
        if (!ooptype.nestedEntityDecls.has(name)) {
            return undefined;
        }
        return new OOMemberLookupInfo(ooptype, ooptype.nestedEntityDecls.get(name), binds);
    }
    ensureSingleDecl_Helper(opts) {
        if (opts.length === 0) {
            return undefined;
        }
        else if (opts.length === 1) {
            return opts[0];
        }
        else {
            const opt1 = opts[0];
            const allSame = opts.every((opt) => {
                if (opt1.contiainingType.ns !== opt.contiainingType.ns || opt1.contiainingType.name !== opt.contiainingType.name) {
                    return false;
                }
                if (opt1.binds.size !== opt.binds.size) {
                    return false;
                }
                let bindsok = true;
                opt1.binds.forEach((v, k) => {
                    bindsok = bindsok && opt.binds.has(k) && v.typeID === opt.binds.get(k).typeID;
                });
                return bindsok;
            });
            return allSame ? opt1 : undefined;
        }
    }
    tryGetConstMemberUniqueDeclFromType(tt, fname) {
        const ntype = this.ensureNominalRepresentation(tt);
        const ttopts = ntype.options.map((ttopt) => {
            if (ttopt instanceof resolved_type_1.ResolvedEntityAtomType) {
                return this.tryGetMemberConstDecl(ttopt.object, ttopt.binds, fname) || this.tryGetMemberConstDeclParent(ttopt.object, ttopt.binds, fname);
            }
            else {
                const copts = ttopt.conceptTypes.map((ccopt) => {
                    return this.tryGetMemberConstDecl(ccopt.concept, ccopt.binds, fname) || this.tryGetMemberConstDeclParent(ccopt.concept, ccopt.binds, fname);
                });
                return this.ensureSingleDecl_Helper(copts.filter((ccopt) => ccopt !== undefined));
            }
        });
        if (ttopts.some((topt) => topt === undefined)) {
            return undefined;
        }
        else {
            return this.ensureSingleDecl_Helper(ttopts);
        }
    }
    tryGetFunctionUniqueDeclFromType(tt, fname) {
        const ntype = this.ensureNominalRepresentation(tt);
        const ttopts = ntype.options.map((ttopt) => {
            if (ttopt instanceof resolved_type_1.ResolvedEntityAtomType) {
                return this.tryGetMemberFunctionDecl(ttopt.object, ttopt.binds, fname) || this.tryGetMemberFunctionDeclParent(ttopt.object, ttopt.binds, fname);
            }
            else {
                const copts = ttopt.conceptTypes.map((ccopt) => {
                    return this.tryGetMemberFunctionDecl(ccopt.concept, ccopt.binds, fname) || this.tryGetMemberFunctionDeclParent(ccopt.concept, ccopt.binds, fname);
                });
                return this.ensureSingleDecl_Helper(copts.filter((ccopt) => ccopt !== undefined));
            }
        });
        if (ttopts.some((topt) => topt === undefined)) {
            return undefined;
        }
        else {
            return this.ensureSingleDecl_Helper(ttopts);
        }
    }
    tryGetOperatorUniqueDeclFromType(tt, fname) {
        const ntype = this.ensureNominalRepresentation(tt);
        const ttopts = ntype.options.map((ttopt) => {
            if (ttopt instanceof resolved_type_1.ResolvedEntityAtomType) {
                return this.tryGetMemberOperatorDecl(ttopt.object, ttopt.binds, fname) || this.tryGetMemberOperatorDeclParent(ttopt.object, ttopt.binds, fname);
            }
            else {
                const copts = ttopt.conceptTypes.map((ccopt) => {
                    return this.tryGetMemberOperatorDecl(ccopt.concept, ccopt.binds, fname) || this.tryGetMemberOperatorDeclParent(ccopt.concept, ccopt.binds, fname);
                });
                return this.ensureSingleDecl_Helper(copts.filter((ccopt) => ccopt !== undefined));
            }
        });
        if (ttopts.some((topt) => topt === undefined)) {
            return undefined;
        }
        else {
            return this.ensureSingleDecl_Helper(ttopts);
        }
    }
    tryGetFieldUniqueDeclFromType(tt, fname) {
        const ntype = this.ensureNominalRepresentation(tt);
        const ttopts = ntype.options.map((ttopt) => {
            if (ttopt instanceof resolved_type_1.ResolvedEntityAtomType) {
                assert(!ttopt.object.isSpecialConstructableEntity(), "Needs to be handled as special case");
                return this.tryGetMemberFieldDecl(ttopt.object, ttopt.binds, fname) || this.tryGetMemberFieldDeclParent(ttopt.object, ttopt.binds, fname);
            }
            else {
                const copts = ttopt.conceptTypes.map((ccopt) => {
                    return this.tryGetMemberFieldDecl(ccopt.concept, ccopt.binds, fname) || this.tryGetMemberFieldDeclParent(ccopt.concept, ccopt.binds, fname);
                });
                return this.ensureSingleDecl_Helper(copts.filter((ccopt) => ccopt !== undefined));
            }
        });
        if (ttopts.some((topt) => topt === undefined)) {
            return undefined;
        }
        else {
            return this.ensureSingleDecl_Helper(ttopts);
        }
    }
    //Given a type find, if possible, the single static method that every possibility resolves to -- if not then this needs to be a virtual call
    tryGetMethodUniqueConcreteDeclFromType(tt, fname) {
        const ntype = this.ensureNominalRepresentation(tt);
        const ttopts = ntype.options.map((ttopt) => {
            if (ttopt instanceof resolved_type_1.ResolvedEntityAtomType) {
                return this.tryGetMemberMethodDecl(ttopt.object, ttopt.binds, fname, false) || this.tryGetMemberMethodDeclParent(ttopt.object, ttopt.binds, fname, false);
            }
            else {
                const copts = ttopt.conceptTypes.map((ccopt) => {
                    return this.tryGetMemberMethodDecl(ccopt.concept, ccopt.binds, fname, false) || this.tryGetMemberMethodDeclParent(ccopt.concept, ccopt.binds, fname, false);
                });
                return this.ensureSingleDecl_Helper(copts.filter((ccopt) => ccopt !== undefined));
            }
        });
        if (ttopts.some((topt) => topt === undefined)) {
            return undefined;
        }
        else {
            const sdecl = this.ensureSingleDecl_Helper(ttopts);
            if (sdecl === undefined) {
                return undefined;
            }
            if (tt.isUniqueCallTargetType()) {
                const isundef = sdecl.decl.some((sd) => OOPTypeDecl.attributeSetContains("abstract", sd.invoke.attributes));
                if (isundef) {
                    return undefined;
                }
                else {
                    return sdecl;
                }
            }
            else {
                const isoveridable = sdecl.decl.some((sd) => OOPTypeDecl.attributeSetContains("override", sd.invoke.attributes) || OOPTypeDecl.attributeSetContains("virtual", sd.invoke.attributes) || OOPTypeDecl.attributeSetContains("abstract", sd.invoke.attributes));
                if (isoveridable) {
                    return undefined;
                }
                else {
                    return sdecl;
                }
            }
        }
    }
    //Given a type find the single virtual method root decl that every possible resoltions derives from -- should exist or it is an error
    tryGetMethodUniqueRootDeclFromType(tt, fname) {
        const ntype = this.ensureNominalRepresentation(tt);
        const ttopts = ntype.options.map((ttopt) => {
            if (ttopt instanceof resolved_type_1.ResolvedEntityAtomType) {
                return this.tryGetMemberMethodDecl(ttopt.object, ttopt.binds, fname, true) || this.tryGetMemberMethodDeclParent(ttopt.object, ttopt.binds, fname, true);
            }
            else {
                const copts = ttopt.conceptTypes.map((ccopt) => {
                    return this.tryGetMemberMethodDecl(ccopt.concept, ccopt.binds, fname, true) || this.tryGetMemberMethodDeclParent(ccopt.concept, ccopt.binds, fname, true);
                });
                return this.ensureSingleDecl_Helper(copts.filter((ccopt) => ccopt !== undefined));
            }
        });
        if (ttopts.some((topt) => topt === undefined)) {
            return undefined;
        }
        else {
            return this.ensureSingleDecl_Helper(ttopts);
        }
    }
    tryGetUniqueStaticOperatorResolve(args, opsig) {
        const ppairs = opsig.map((sig, idx) => { return { sig: sig, idx: idx }; }).filter((spp) => {
            let j = 0;
            for (let i = 0; i < args.length; ++i) {
                while (spp.sig.params[j].type instanceof resolved_type_1.ResolvedFunctionType) {
                    j++;
                }
                if (!this.subtypeOf(args[i], spp.sig.params[j].type)) {
                    return false;
                }
                j++;
            }
            return true;
        });
        const rrsigs = [];
        for (let i = 0; i < ppairs.length; ++i) {
            const isig = ppairs[i].sig;
            let nomorespecific = true;
            for (let j = 0; j < ppairs.length; ++j) {
                if (i == j) {
                    continue;
                }
                const jsig = ppairs[j].sig;
                let morespecific = false;
                for (let k = 0; k < isig.params.length; ++k) {
                    if (isig.params[k] instanceof resolved_type_1.ResolvedFunctionType) {
                        continue;
                    }
                    if (this.subtypeOf(jsig.params[k].type, isig.params[k].type)) {
                        morespecific = true;
                        break;
                    }
                }
                if (morespecific) {
                    nomorespecific = false;
                    break;
                }
            }
            if (nomorespecific) {
                rrsigs.push(ppairs[i]);
            }
        }
        if (rrsigs.length !== 1) {
            return -1;
        }
        else {
            return rrsigs[0].idx;
        }
    }
    resolveBindsForCallComplete(declterms, giventerms, implicitBinds, callBinds, inferBinds) {
        let fullbinds = new Map();
        implicitBinds.forEach((v, k) => {
            fullbinds.set(k, v);
        });
        for (let i = 0; i < declterms.length; ++i) {
            if (giventerms.length <= i) {
                if (declterms[i].defaultType !== undefined) {
                    fullbinds.set(declterms[i].name, this.normalizeTypeOnly(declterms[i].defaultType, implicitBinds));
                }
                else if (declterms[i].isInfer) {
                    if (!inferBinds.has(declterms[i].name)) {
                        return undefined;
                    }
                    else {
                        fullbinds.set(declterms[i].name, inferBinds.get(declterms[i].name));
                    }
                }
                else {
                    return undefined;
                }
            }
            else {
                fullbinds.set(declterms[i].name, this.normalizeTypeOnly(giventerms[i], callBinds));
            }
        }
        return fullbinds;
    }
    resolveBindsForCallWithInfer(declterms, giventerms, implicitBinds, callBinds) {
        let fullbinds = new Map();
        let inferbinds = [];
        implicitBinds.forEach((v, k) => {
            fullbinds.set(k, v);
        });
        for (let i = 0; i < declterms.length; ++i) {
            if (giventerms.length <= i) {
                if (declterms[i].defaultType !== undefined) {
                    fullbinds.set(declterms[i].name, this.normalizeTypeOnly(declterms[i].defaultType, implicitBinds));
                }
                else if (declterms[i].isInfer) {
                    inferbinds.push(declterms[i].name);
                    fullbinds.set(declterms[i].name, resolved_type_1.ResolvedType.createSingle(resolved_type_1.ResolvedTemplateUnifyType.create(declterms[i].name)));
                }
                else {
                    return [undefined, inferbinds];
                }
            }
            else {
                fullbinds.set(declterms[i].name, this.normalizeTypeOnly(giventerms[i], callBinds));
            }
        }
        return [fullbinds, inferbinds];
    }
    normalizeTypeOnly(t, binds) {
        const res = this.normalizeTypeGeneral(t, binds);
        if (res instanceof resolved_type_1.ResolvedFunctionType) {
            return resolved_type_1.ResolvedType.createEmpty();
        }
        else {
            return res;
        }
    }
    normalizeTypeFunction(t, binds) {
        if (t instanceof type_signature_1.ParseErrorTypeSignature || t instanceof type_signature_1.AutoTypeSignature) {
            return undefined;
        }
        else {
            return this.normalizeType_Function(t, binds);
        }
    }
    normalizeTypeGeneral(t, binds) {
        if (t instanceof type_signature_1.ParseErrorTypeSignature || t instanceof type_signature_1.AutoTypeSignature) {
            return resolved_type_1.ResolvedType.createEmpty();
        }
        else if (t instanceof type_signature_1.FunctionTypeSignature) {
            return this.normalizeTypeFunction(t, binds) || resolved_type_1.ResolvedType.createEmpty();
        }
        else if (t instanceof type_signature_1.TemplateTypeSignature) {
            return this.normalizeType_Template(t, binds);
        }
        else if (t instanceof type_signature_1.NominalTypeSignature) {
            return this.normalizeType_Nominal(t, binds);
        }
        else if (t instanceof type_signature_1.TupleTypeSignature) {
            return this.normalizeType_Tuple(t, binds);
        }
        else if (t instanceof type_signature_1.RecordTypeSignature) {
            return this.normalizeType_Record(t, binds);
        }
        else if (t instanceof type_signature_1.EphemeralListTypeSignature) {
            return this.normalizeType_EphemeralList(t, binds);
        }
        else if (t instanceof type_signature_1.ProjectTypeSignature) {
            return this.normalizeType_Projection(t, binds);
        }
        else if (t instanceof type_signature_1.PlusTypeSignature) {
            return this.normalizeType_Plus(t, binds);
        }
        else if (t instanceof type_signature_1.AndTypeSignature) {
            return this.normalizeType_And(t, binds);
        }
        else {
            return this.normalizeType_Union(t, binds);
        }
    }
    normalizeToNominalRepresentation(t) {
        if (t instanceof resolved_type_1.ResolvedTupleAtomType) {
            return this.getSpecialTupleConceptType();
        }
        else if (t instanceof resolved_type_1.ResolvedRecordAtomType) {
            return this.getSpecialRecordConceptType();
        }
        else {
            return t;
        }
    }
    restrictNone(from) {
        return this.splitTypes(from, this.getSpecialNoneType());
    }
    restrictSome(from) {
        return this.splitTypes(from, this.getSpecialSomeConceptType());
    }
    restrictNothing(from) {
        return this.splitTypes(from, this.getSpecialNothingType());
    }
    restrictSomething(from) {
        return this.splitTypes(from, this.getSpecialISomethingConceptType());
    }
    restrictT(from, t) {
        return this.splitTypes(from, t);
    }
    typeUpperBound(types) {
        if (types.length === 0) {
            return resolved_type_1.ResolvedType.createEmpty();
        }
        else {
            return this.normalizeUnionList(types);
        }
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
        else if (t1 instanceof resolved_type_1.ResolvedConceptAtomType && t2 instanceof resolved_type_1.ResolvedConceptAtomType) {
            res = this.atomSubtypeOf_ConceptConcept(t1, t2);
        }
        else if (t2 instanceof resolved_type_1.ResolvedConceptAtomType) {
            if (t1 instanceof resolved_type_1.ResolvedEntityAtomType) {
                res = this.atomSubtypeOf_EntityConcept(t1, t2);
            }
            else if (t1 instanceof resolved_type_1.ResolvedTupleAtomType) {
                res = this.atomSubtypeOf_TupleConcept(t1, t2);
            }
            else if (t1 instanceof resolved_type_1.ResolvedRecordAtomType) {
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
    atomUnify(t1, t2, umap) {
        if (t1 instanceof resolved_type_1.ResolvedTemplateUnifyType) {
            if (umap.has(t1.typeID)) {
                if (umap.get(t1.typeID) === undefined || umap.get(t1.typeID).typeID === t2.typeID) {
                    //leave it
                }
                else {
                    umap.set(t1.typeID, undefined);
                }
            }
            else {
                umap.set(t1.typeID, resolved_type_1.ResolvedType.createSingle(t2));
            }
        }
        else if (t1 instanceof resolved_type_1.ResolvedEntityAtomType && t2 instanceof resolved_type_1.ResolvedEntityAtomType) {
            this.unifyResolvedEntityAtomType(t1, t2, umap);
        }
        else if (t1 instanceof resolved_type_1.ResolvedConceptAtomType && t2 instanceof resolved_type_1.ResolvedConceptAtomType) {
            this.unifyResolvedConceptAtomType(t1, t2, umap);
        }
        else if (t1 instanceof resolved_type_1.ResolvedTupleAtomType && t2 instanceof resolved_type_1.ResolvedTupleAtomType) {
            this.unifyResolvedTupleAtomType(t1, t2, umap);
        }
        else if (t1 instanceof resolved_type_1.ResolvedRecordAtomType && t2 instanceof resolved_type_1.ResolvedRecordAtomType) {
            this.unifyResolvedRecordAtomType(t1, t2, umap);
        }
        else {
            //nothing -- types might mismatch but we don't care as typecheck will catch this later
        }
    }
    typeUnify(t1, t2, umap) {
        //TODO: we may want to try and strip matching types in any options -- T | None ~~ Int | None should unify T -> Int
        if (t1.options.length === 1 && t1.options[0] instanceof resolved_type_1.ResolvedTemplateUnifyType) {
            if (umap.has(t1.typeID)) {
                if (umap.get(t1.typeID) === undefined || umap.get(t1.typeID).typeID === t2.typeID) {
                    //leave it
                }
                else {
                    umap.set(t1.typeID, undefined);
                }
            }
            else {
                if (t2.options.length !== 1) {
                    //if multiple options unify with the | 
                    umap.set(t1.typeID, t2);
                }
                else {
                    //otherwise expand and try unifying with the individual type
                    this.atomUnify(t1.options[0], t2.options[0], umap);
                }
            }
        }
        //otherwise we do nothing and will fail subtype check later 
    }
    resolveProvides(tt, binds) {
        let oktypes = [];
        for (let i = 0; i < tt.provides.length; ++i) {
            const psig = tt.provides[i][0];
            const pcond = tt.provides[i][1];
            if (pcond === undefined) {
                oktypes.push(psig);
            }
            else {
                const allok = pcond.constraints.every((consinfo) => {
                    const constype = this.normalizeTypeOnly(consinfo.t, binds);
                    return this.subtypeOf(constype, this.normalizeTypeOnly(consinfo.tconstraint, binds));
                });
                if (allok) {
                    oktypes.push(psig);
                }
            }
        }
        return oktypes;
    }
    functionSubtypeOf_helper(t1, t2) {
        if (t2.isPred !== t1.isPred) {
            return false; //need to have same pred spec
        }
        if (t2.params.length !== t1.params.length) {
            return false; //need to have the same number of parameters
        }
        if ((t2.optRestParamType !== undefined) !== (t1.optRestParamType !== undefined)) {
            return false; //should both have rest or not
        }
        if (t2.optRestParamType !== undefined && t2.optRestParamType.typeID !== t1.optRestParamType.typeID) {
            return false; //variance
        }
        for (let i = 0; i < t2.params.length; ++i) {
            const t2p = t2.params[i];
            const t1p = t1.params[i];
            if ((t2p.isOptional !== t1p.isOptional) || (t2p.refKind !== t1p.refKind)) {
                return false;
            }
            if (t2p.litexp !== undefined && t2p.litexp !== t1p.litexp) {
                return false;
            }
            //We want the argument types to be the same for all cases -- no clear reason to overload to more general types
            if (t2p.type instanceof resolved_type_1.ResolvedFunctionType && t1p.type instanceof resolved_type_1.ResolvedFunctionType) {
                if (t2p.type.typeID !== t1p.type.typeID) {
                    return false;
                }
            }
            else if (t2p.type instanceof resolved_type_1.ResolvedType && t1p.type instanceof resolved_type_1.ResolvedType) {
                if (t2p.type.typeID !== t1p.type.typeID) {
                    return false;
                }
            }
            else {
                return false;
            }
            //check that if t2p is named then t1p has the same name
            if (t2.params[i].name !== "_") {
                if (t2.params[i].name !== t1.params[i].name) {
                    return false;
                }
            }
        }
        if (t1.resultType.typeID !== t2.resultType.typeID) {
            return false;
        }
        return true;
    }
    //Only used for pcode checking
    functionSubtypeOf(t1, t2) {
        let memores = this.m_subtypeRelationMemo.get(t1.typeID);
        if (memores === undefined) {
            this.m_subtypeRelationMemo.set(t1.typeID, new Map());
            memores = this.m_subtypeRelationMemo.get(t1.typeID);
        }
        let memoval = memores.get(t2.typeID);
        if (memoval !== undefined) {
            return memoval;
        }
        const res = this.functionSubtypeOf_helper(t1, t2);
        memores.set(t2.typeID, res);
        return res;
    }
}
exports.Assembly = Assembly;
//# sourceMappingURL=assembly.js.map