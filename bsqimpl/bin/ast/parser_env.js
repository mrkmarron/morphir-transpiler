"use strict";
//-------------------------------------------------------------------------------------------------------
// Copyright (C) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE.txt file in the project root for full license information.
//-------------------------------------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParserEnvironment = exports.FunctionScope = void 0;
const type_signature_1 = require("./type_signature");
class FunctionScope {
    constructor(args, rtype, ispcode) {
        this.m_rtype = rtype;
        this.m_captured = new Set();
        this.m_ispcode = ispcode;
        this.m_args = args;
        this.m_locals = [];
    }
    pushLocalScope() {
        this.m_locals.push([]);
    }
    popLocalScope() {
        this.m_locals.pop();
    }
    isPCodeEnv() {
        return this.m_ispcode;
    }
    isVarNameDefined(name) {
        return this.m_args.has(name) || this.m_locals.some((frame) => frame.some((fr) => fr.name === name));
    }
    getScopedVarName(name) {
        for (let i = this.m_locals.length - 1; i >= 0; --i) {
            const vinfo = this.m_locals[i].find((fr) => fr.name === name);
            if (vinfo !== undefined) {
                return vinfo.scopedname;
            }
        }
        return name;
    }
    defineLocalVar(name, scopedname, isbinder) {
        this.m_locals[this.m_locals.length - 1].push({ name: name, scopedname: scopedname, isbinder: isbinder });
    }
    getCaptureVars() {
        return this.m_captured;
    }
    getReturnType() {
        return this.m_rtype;
    }
}
exports.FunctionScope = FunctionScope;
class ParserEnvironment {
    constructor(assembly) {
        this.m_currentFile = undefined;
        this.m_currentNamespace = undefined;
        this.assembly = assembly;
        this.m_functionScopes = [];
        this.SpecialAnySignature = new type_signature_1.NominalTypeSignature("NSCore", ["Any"], []);
        this.SpecialSomeSignature = new type_signature_1.NominalTypeSignature("NSCore", ["Some"], []);
        this.SpecialNoneSignature = new type_signature_1.NominalTypeSignature("NSCore", ["None"], []);
        this.SpecialBoolSignature = new type_signature_1.NominalTypeSignature("NSCore", ["Bool"], []);
        this.SpecialIntSignature = new type_signature_1.NominalTypeSignature("NSCore", ["Int"], []);
        this.SpecialNatSignature = new type_signature_1.NominalTypeSignature("NSCore", ["Nat"], []);
        this.SpecialFloatSignature = new type_signature_1.NominalTypeSignature("NSCore", ["Float"], []);
        this.SpecialDecimalSignature = new type_signature_1.NominalTypeSignature("NSCore", ["Decimal"], []);
        this.SpecialBigIntSignature = new type_signature_1.NominalTypeSignature("NSCore", ["BigInt"], []);
        this.SpecialBigNatSignature = new type_signature_1.NominalTypeSignature("NSCore", ["BigNat"], []);
        this.SpecialRationalSignature = new type_signature_1.NominalTypeSignature("NSCore", ["Rational"], []);
        this.SpecialStringSignature = new type_signature_1.NominalTypeSignature("NSCore", ["String"], []);
        this.SpecialAutoSignature = new type_signature_1.AutoTypeSignature();
    }
    getCurrentFunctionScope() {
        return this.m_functionScopes[this.m_functionScopes.length - 1];
    }
    pushFunctionScope(scope) {
        this.m_functionScopes.push(scope);
    }
    popFunctionScope() {
        return this.m_functionScopes.pop();
    }
    setNamespaceAndFile(ns, file) {
        this.m_currentFile = file;
        this.m_currentNamespace = ns;
    }
    getCurrentFile() {
        return this.m_currentFile;
    }
    getCurrentNamespace() {
        return this.m_currentNamespace;
    }
    isVarDefinedInAnyScope(name) {
        return this.m_functionScopes.some((sc) => sc.isVarNameDefined(name));
    }
    useLocalVar(name) {
        const cscope = this.getCurrentFunctionScope();
        if (name.startsWith("$")) {
            for (let i = this.m_functionScopes.length - 1; i >= 0; --i) {
                if (this.m_functionScopes[i].isVarNameDefined(name)) {
                    name = this.m_functionScopes[i].getScopedVarName(name);
                    break;
                }
            }
        }
        if (!cscope.isVarNameDefined(name) && cscope.isPCodeEnv()) {
            cscope.getCaptureVars().add(name);
        }
        return name;
    }
    tryResolveNamespace(ns, typename) {
        if (ns !== undefined) {
            return ns;
        }
        const coredecl = this.assembly.getNamespace("NSCore");
        if (coredecl.declaredNames.has("NSCore::" + typename)) {
            return "NSCore";
        }
        else {
            const nsdecl = this.assembly.getNamespace(this.m_currentNamespace);
            if (nsdecl.declaredNames.has(this.m_currentNamespace + "::" + typename)) {
                return this.m_currentNamespace;
            }
            else {
                const fromns = nsdecl.usings.find((nsuse) => nsuse.names.indexOf(typename) !== -1);
                return fromns !== undefined ? fromns.fromNamespace : undefined;
            }
        }
    }
    tryResolveAsPrefixUnaryOperator(opname, level) {
        const nsdecl = this.assembly.getNamespace(this.m_currentNamespace);
        if (nsdecl.declaredNames.has(this.m_currentNamespace + "::" + opname) && nsdecl.operators.get(opname) !== undefined) {
            const opdecls = nsdecl.operators.get(opname);
            return opdecls.some((opdecl) => (opdecl.isPrefix && opdecl.level === level)) ? this.m_currentNamespace : undefined;
        }
        const nsmaindecl = this.assembly.getNamespace("NSCore");
        if (nsmaindecl.declaredNames.has("NSCore::" + opname) && nsmaindecl.operators.get(opname) !== undefined) {
            const opdecls = nsmaindecl.operators.get(opname);
            return opdecls.some((opdecl) => (opdecl.isPrefix && opdecl.level === level)) ? "NSCore" : undefined;
        }
        const fromns = nsdecl.usings.find((nsuse) => nsuse.names.indexOf(opname) !== -1);
        return fromns !== undefined ? fromns.fromNamespace : undefined;
    }
    tryResolveAsInfixBinaryOperator(opname, level) {
        const nsdecl = this.assembly.getNamespace(this.m_currentNamespace);
        if (nsdecl.declaredNames.has(this.m_currentNamespace + "::" + opname) && nsdecl.operators.get(opname) !== undefined) {
            const opdecls = nsdecl.operators.get(opname);
            return opdecls.some((opdecl) => (opdecl.isInfix && opdecl.level === level)) ? this.m_currentNamespace : undefined;
        }
        const nsmaindecl = this.assembly.getNamespace("NSCore");
        if (nsmaindecl.declaredNames.has("NSCore::" + opname) && nsmaindecl.operators.get(opname) !== undefined) {
            const opdecls = nsmaindecl.operators.get(opname);
            return opdecls.some((opdecl) => (opdecl.isInfix && opdecl.level === level)) ? "NSCore" : undefined;
        }
        const fromns = nsdecl.usings.find((nsuse) => nsuse.names.indexOf(opname) !== -1);
        return fromns !== undefined ? fromns.fromNamespace : undefined;
    }
}
exports.ParserEnvironment = ParserEnvironment;
//# sourceMappingURL=parser_env.js.map