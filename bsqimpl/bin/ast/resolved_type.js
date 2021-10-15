"use strict";
//-------------------------------------------------------------------------------------------------------
// Copyright (C) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE.txt file in the project root for full license information.
//-------------------------------------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResolvedFunctionType = exports.ResolvedFunctionTypeParam = exports.ResolvedType = exports.ResolvedEphemeralListType = exports.ResolvedRecordAtomType = exports.ResolvedTupleAtomType = exports.ResolvedEntityAtomType = exports.ResolvedConceptAtomType = exports.ResolvedConceptAtomTypeEntry = exports.ResolvedTemplateUnifyType = exports.ResolvedAtomType = void 0;
const assert = require("assert");
class ResolvedAtomType {
    constructor(typeID, shortID) {
        this.typeID = typeID;
        this.shortID = shortID;
    }
}
exports.ResolvedAtomType = ResolvedAtomType;
class ResolvedTemplateUnifyType extends ResolvedAtomType {
    constructor(typeID) {
        super(typeID, typeID);
    }
    static create(name) {
        return new ResolvedTemplateUnifyType(name);
    }
    hasTemplateType() {
        return true;
    }
}
exports.ResolvedTemplateUnifyType = ResolvedTemplateUnifyType;
class ResolvedEntityAtomType extends ResolvedAtomType {
    constructor(typeID, shortID, object, binds) {
        super(typeID, shortID);
        this.object = object;
        this.binds = binds;
    }
    static create(object, binds) {
        let name = object.ns + "::" + object.name;
        if (object.terms.length !== 0) {
            name += "<" + object.terms.map((arg) => binds.get(arg.name).typeID).join(", ") + ">";
        }
        let shortname = object.name;
        if (object.terms.length !== 0) {
            shortname += "<" + object.terms.map((arg) => binds.get(arg.name).shortID).join(", ") + ">";
        }
        return new ResolvedEntityAtomType(name, shortname, object, binds);
    }
    hasTemplateType() {
        return false;
    }
}
exports.ResolvedEntityAtomType = ResolvedEntityAtomType;
class ResolvedConceptAtomTypeEntry {
    constructor(typeID, shortID, concept, binds) {
        this.typeID = typeID;
        this.shortID = shortID;
        this.concept = concept;
        this.binds = binds;
    }
    static create(concept, binds) {
        let name = concept.ns + "::" + concept.name;
        if (concept.terms.length !== 0) {
            name += "<" + concept.terms.map((arg) => binds.get(arg.name).typeID).join(", ") + ">";
        }
        let shortname = concept.name;
        if (concept.terms.length !== 0) {
            shortname += "<" + concept.terms.map((arg) => binds.get(arg.name).shortID).join(", ") + ">";
        }
        return new ResolvedConceptAtomTypeEntry(name, shortname, concept, binds);
    }
}
exports.ResolvedConceptAtomTypeEntry = ResolvedConceptAtomTypeEntry;
class ResolvedConceptAtomType extends ResolvedAtomType {
    constructor(typeID, shortID, concepts) {
        super(typeID, shortID);
        this.conceptTypes = concepts;
    }
    static create(concepts) {
        const sortedConcepts = concepts.sort((a, b) => a.typeID.localeCompare(b.typeID));
        const name = sortedConcepts.map((cpt) => cpt.typeID).join("&");
        const shortname = sortedConcepts.map((cpt) => cpt.shortID).join("&");
        return new ResolvedConceptAtomType(name, shortname, sortedConcepts);
    }
    hasTemplateType() {
        return false;
    }
}
exports.ResolvedConceptAtomType = ResolvedConceptAtomType;
class ResolvedTupleAtomType extends ResolvedAtomType {
    constructor(typeID, shortID, types) {
        super(typeID, shortID);
        this.types = types;
    }
    static create(types) {
        const name = types.map((entry) => entry.typeID).join(", ");
        const shortname = types.map((entry) => entry.typeID).join(",");
        return new ResolvedTupleAtomType("[" + name + "]", "[" + shortname + "]", types);
    }
    hasTemplateType() {
        return this.types.some((entry) => entry.hasTemplateType());
    }
}
exports.ResolvedTupleAtomType = ResolvedTupleAtomType;
class ResolvedRecordAtomType extends ResolvedAtomType {
    constructor(typeID, shortID, entries) {
        super(typeID, shortID);
        this.entries = entries;
    }
    static create(entries) {
        let simplifiedEntries = [...entries].sort((a, b) => a.pname.localeCompare(b.pname));
        const name = simplifiedEntries.map((entry) => entry.pname + ": " + entry.ptype.typeID).join(", ");
        const shortname = simplifiedEntries.map((entry) => entry.pname + ":" + entry.ptype.shortID).join(",");
        return new ResolvedRecordAtomType("{" + name + "}", "{" + shortname + "}", simplifiedEntries);
    }
    hasTemplateType() {
        return this.entries.some((entry) => entry.ptype.hasTemplateType());
    }
}
exports.ResolvedRecordAtomType = ResolvedRecordAtomType;
class ResolvedEphemeralListType extends ResolvedAtomType {
    constructor(typeID, shortID, types) {
        super(typeID, shortID);
        this.types = types;
    }
    static create(entries) {
        const name = entries.map((entry) => entry.typeID).join(", ");
        const shortname = entries.map((entry) => entry.shortID).join(",");
        return new ResolvedEphemeralListType("(|" + name + "|)", "(|" + shortname + "|)", entries);
    }
    hasTemplateType() {
        return this.types.some((type) => type.hasTemplateType());
    }
}
exports.ResolvedEphemeralListType = ResolvedEphemeralListType;
class ResolvedType {
    constructor(typeID, shortID, options) {
        this.typeID = typeID;
        this.shortID = shortID;
        this.options = options;
    }
    static createEmpty() {
        return new ResolvedType("", "", []);
    }
    static createSingle(type) {
        return new ResolvedType(type.typeID, type.shortID, [type]);
    }
    static create(types) {
        if (types.length === 0) {
            return ResolvedType.createEmpty();
        }
        else if (types.length === 1) {
            return ResolvedType.createSingle(types[0]);
        }
        else {
            const atoms = types.sort((a, b) => a.typeID.localeCompare(b.typeID));
            const name = atoms.map((arg) => arg.typeID).join("|");
            const shortname = atoms.map((arg) => arg.shortID).join("|");
            return new ResolvedType(name, shortname, atoms);
        }
    }
    static tryGetOOTypeInfo(t) {
        if (t.options.length !== 1) {
            return undefined;
        }
        if (t.options[0] instanceof ResolvedEntityAtomType) {
            return t.options[0];
        }
        else if (t.options[0] instanceof ResolvedConceptAtomType) {
            return t.options[0];
        }
        else {
            return undefined;
        }
    }
    isEmptyType() {
        return this.options.length === 0;
    }
    hasTemplateType() {
        return this.options.some((opt) => opt.hasTemplateType());
    }
    isTupleTargetType() {
        return this.options.every((opt) => opt instanceof ResolvedTupleAtomType);
    }
    getTupleTargetTypeIndexRange() {
        assert(this.isTupleTargetType());
        const req = Math.min(...this.options.map((tup) => tup.types.length));
        const opt = Math.max(...this.options.map((tup) => tup.types.length));
        return { req: req, opt: opt };
    }
    isUniqueTupleTargetType() {
        return this.isTupleTargetType() && this.options.length === 1;
    }
    getUniqueTupleTargetType() {
        return this.options[0];
    }
    tryGetInferrableTupleConstructorType() {
        const tcopts = this.options.filter((opt) => opt instanceof ResolvedTupleAtomType);
        if (tcopts.length !== 1) {
            return undefined;
        }
        return tcopts[0];
    }
    isRecordTargetType() {
        return this.options.every((opt) => opt instanceof ResolvedRecordAtomType);
    }
    getRecordTargetTypePropertySets() {
        let allopts = new Set();
        this.options.forEach((opt) => {
            opt.entries.forEach((entry) => allopts.add(entry.pname));
        });
        let req = new Set();
        allopts.forEach((oname) => {
            if (this.options.every((opt) => opt.entries.findIndex((entry) => entry.pname === oname) !== -1)) {
                req.add(oname);
            }
        });
        return { req: req, opt: allopts };
    }
    isUniqueRecordTargetType() {
        return this.isRecordTargetType() && this.options.length === 1;
    }
    getUniqueRecordTargetType() {
        return this.options[0];
    }
    tryGetInferrableRecordConstructorType() {
        const rcopts = this.options.filter((opt) => opt instanceof ResolvedRecordAtomType);
        if (rcopts.length !== 1) {
            return undefined;
        }
        return rcopts[0];
    }
    isUniqueCallTargetType() {
        if (this.options.length !== 1) {
            return false;
        }
        return this.options[0] instanceof ResolvedEntityAtomType;
    }
    getUniqueCallTargetType() {
        return this.options[0];
    }
    getCollectionContentsType() {
        const oodecl = this.getUniqueCallTargetType().object;
        const oobinds = this.getUniqueCallTargetType().binds;
        const etype = oodecl.attributes.includes("__map_type")
            ? ResolvedType.createSingle(ResolvedTupleAtomType.create([oobinds.get("K"), oobinds.get("V")]))
            : oobinds.get("T");
        return etype;
    }
    isGroundedType() {
        return this.options.every((opt) => {
            if (opt instanceof ResolvedConceptAtomType) {
                return opt.conceptTypes.every((cpt) => !cpt.concept.attributes.includes("__universal"));
            }
            else if (opt instanceof ResolvedTupleAtomType) {
                return opt.types.every((tt) => tt.isGroundedType());
            }
            else if (opt instanceof ResolvedRecordAtomType) {
                return opt.entries.every((entry) => entry.ptype.isGroundedType());
            }
            else {
                return true;
            }
        });
    }
    tryGetInferrableValueListConstructorType() {
        const vlopts = this.options.filter((opt) => opt instanceof ResolvedEphemeralListType);
        if (vlopts.length !== 1) {
            return undefined;
        }
        return vlopts[0];
    }
    isSameType(otype) {
        return this.typeID === otype.typeID;
    }
    isNoneType() {
        return this.typeID === "NSCore::None";
    }
    isSomeType() {
        return this.typeID === "NSCore::Some";
    }
    isAnyType() {
        return this.typeID === "NSCore::Any";
    }
    isNothingType() {
        return this.typeID === "NSCore::Nothing";
    }
    isSomethingType() {
        if (!this.isUniqueCallTargetType()) {
            return false;
        }
        const oodecl = this.getUniqueCallTargetType().object;
        return oodecl.attributes.includes("__something_type");
    }
    isOptionType() {
        if (this.options.length !== 1 || !(this.options[0] instanceof ResolvedConceptAtomType)) {
            return false;
        }
        const ccpt = this.options[0];
        return ccpt.conceptTypes.length === 1 && ccpt.conceptTypes[0].concept.attributes.includes("__option_type");
    }
    isOkType() {
        return this.typeID === "NSCore::Nothing";
    }
    isErrType() {
        if (!this.isUniqueCallTargetType()) {
            return false;
        }
        const oodecl = this.getUniqueCallTargetType().object;
        return oodecl.attributes.includes("__something_type");
    }
    isResultType() {
        if (this.options.length !== 1 || !(this.options[0] instanceof ResolvedConceptAtomType)) {
            return false;
        }
        const ccpt = this.options[0];
        return ccpt.conceptTypes.length === 1 && ccpt.conceptTypes[0].concept.attributes.includes("__option_type");
    }
    isUniqueType() {
        if (this.options.length !== 1) {
            return false;
        }
        return !(this.options[0] instanceof ResolvedConceptAtomType);
    }
}
exports.ResolvedType = ResolvedType;
class ResolvedFunctionTypeParam {
    constructor(name, type, isOpt, refKind, litexp) {
        this.name = name;
        this.type = type;
        this.isOptional = isOpt;
        this.refKind = refKind;
        this.litexp = litexp;
    }
}
exports.ResolvedFunctionTypeParam = ResolvedFunctionTypeParam;
class ResolvedFunctionType {
    constructor(typeID, shortID, recursive, params, optRestParamName, optRestParamType, resultType, isPred) {
        this.typeID = typeID;
        this.shortID = shortID;
        this.recursive = recursive;
        this.params = params;
        this.optRestParamName = optRestParamName;
        this.optRestParamType = optRestParamType;
        this.resultType = resultType;
        this.isPred = isPred;
        this.allParamNames = new Set();
    }
    static create(recursive, params, optRestParamName, optRestParamType, resultType, isPred) {
        const cvalues = params.map((param) => (param.refKind !== undefined ? param.refKind : "") + param.name + (param.isOptional ? "?: " : ": ") + param.type.typeID + (param.litexp !== undefined ? ("==" + param.litexp) : ""));
        let cvalue = cvalues.join(", ");
        const shortcvalues = params.map((param) => (param.refKind !== undefined ? param.refKind : "") + param.name + (param.isOptional ? "?: " : ": ") + param.type.shortID + (param.litexp !== undefined ? ("==" + param.litexp) : ""));
        let shortcvalue = shortcvalues.join(", ");
        if (optRestParamName !== undefined && optRestParamType !== undefined) {
            cvalue += ((cvalues.length !== 0 ? ", " : "") + ("..." + optRestParamName + ": " + optRestParamType.typeID));
            shortcvalue += ((cvalues.length !== 0 ? ", " : "") + ("..." + optRestParamName + ": " + optRestParamType.shortID));
        }
        const lstr = isPred ? "pred" : "fn";
        const name = lstr + "(" + cvalue + ") -> " + resultType.typeID;
        const shortname = lstr + "(" + shortcvalue + ") -> " + resultType.shortID;
        return new ResolvedFunctionType(name, shortname, recursive, params, optRestParamName, optRestParamType, resultType, isPred);
    }
}
exports.ResolvedFunctionType = ResolvedFunctionType;
//# sourceMappingURL=resolved_type.js.map