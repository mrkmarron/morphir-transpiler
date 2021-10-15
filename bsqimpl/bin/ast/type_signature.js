"use strict";
//-------------------------------------------------------------------------------------------------------
// Copyright (C) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE.txt file in the project root for full license information.
//-------------------------------------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnionTypeSignature = exports.AndTypeSignature = exports.PlusTypeSignature = exports.ProjectTypeSignature = exports.FunctionTypeSignature = exports.FunctionParameter = exports.EphemeralListTypeSignature = exports.RecordTypeSignature = exports.TupleTypeSignature = exports.NominalTypeSignature = exports.TemplateTypeSignature = exports.AutoTypeSignature = exports.ParseErrorTypeSignature = exports.TypeSignature = void 0;
class TypeSignature {
}
exports.TypeSignature = TypeSignature;
class ParseErrorTypeSignature extends TypeSignature {
}
exports.ParseErrorTypeSignature = ParseErrorTypeSignature;
class AutoTypeSignature extends TypeSignature {
}
exports.AutoTypeSignature = AutoTypeSignature;
class TemplateTypeSignature extends TypeSignature {
    constructor(name) {
        super();
        this.name = name;
    }
}
exports.TemplateTypeSignature = TemplateTypeSignature;
class NominalTypeSignature extends TypeSignature {
    constructor(ns, tnames, terms) {
        super();
        this.nameSpace = ns;
        this.tnames = tnames;
        this.terms = terms || [];
    }
    computeResolvedName() {
        return this.tnames.join("::");
    }
}
exports.NominalTypeSignature = NominalTypeSignature;
class TupleTypeSignature extends TypeSignature {
    constructor(entries) {
        super();
        this.entries = entries;
    }
}
exports.TupleTypeSignature = TupleTypeSignature;
class RecordTypeSignature extends TypeSignature {
    constructor(entries) {
        super();
        this.entries = entries;
    }
    ;
}
exports.RecordTypeSignature = RecordTypeSignature;
class EphemeralListTypeSignature extends TypeSignature {
    constructor(entries) {
        super();
        this.entries = entries;
    }
}
exports.EphemeralListTypeSignature = EphemeralListTypeSignature;
class FunctionParameter {
    constructor(name, type, isOpt, refKind, defaultexp, litexp) {
        this.name = name;
        this.type = type;
        this.isOptional = isOpt;
        this.refKind = refKind;
        this.defaultexp = defaultexp;
        this.litexp = litexp;
    }
}
exports.FunctionParameter = FunctionParameter;
class FunctionTypeSignature extends TypeSignature {
    constructor(recursive, params, optRestParamName, optRestParamType, resultType, isPred) {
        super();
        this.recursive = recursive;
        this.params = params;
        this.optRestParamName = optRestParamName;
        this.optRestParamType = optRestParamType;
        this.resultType = resultType;
        this.isPred = isPred;
    }
}
exports.FunctionTypeSignature = FunctionTypeSignature;
class ProjectTypeSignature extends TypeSignature {
    constructor(fromtype, oftype) {
        super();
        this.fromtype = fromtype;
        this.oftype = oftype;
    }
}
exports.ProjectTypeSignature = ProjectTypeSignature;
class PlusTypeSignature extends TypeSignature {
    constructor(types) {
        super();
        this.types = types;
    }
}
exports.PlusTypeSignature = PlusTypeSignature;
class AndTypeSignature extends TypeSignature {
    constructor(types) {
        super();
        this.types = types;
    }
}
exports.AndTypeSignature = AndTypeSignature;
class UnionTypeSignature extends TypeSignature {
    constructor(types) {
        super();
        this.types = types;
    }
}
exports.UnionTypeSignature = UnionTypeSignature;
//# sourceMappingURL=type_signature.js.map