"use strict";
//-------------------------------------------------------------------------------------------------------
// Copyright (C) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE.txt file in the project root for full license information.
//-------------------------------------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
exports.SMTTypeEmitter = void 0;
const mir_assembly_1 = require("../../compiler/mir_assembly");
const smt_exp_1 = require("./smt_exp");
const assert = require("assert");
var APIEmitTypeTag;
(function (APIEmitTypeTag) {
    APIEmitTypeTag[APIEmitTypeTag["NoneTag"] = 0] = "NoneTag";
    APIEmitTypeTag[APIEmitTypeTag["NothingTag"] = 1] = "NothingTag";
    APIEmitTypeTag[APIEmitTypeTag["BoolTag"] = 2] = "BoolTag";
    APIEmitTypeTag[APIEmitTypeTag["NatTag"] = 3] = "NatTag";
    APIEmitTypeTag[APIEmitTypeTag["IntTag"] = 4] = "IntTag";
    APIEmitTypeTag[APIEmitTypeTag["BigNatTag"] = 5] = "BigNatTag";
    APIEmitTypeTag[APIEmitTypeTag["BigIntTag"] = 6] = "BigIntTag";
    APIEmitTypeTag[APIEmitTypeTag["RationalTag"] = 7] = "RationalTag";
    APIEmitTypeTag[APIEmitTypeTag["FloatTag"] = 8] = "FloatTag";
    APIEmitTypeTag[APIEmitTypeTag["DecimalTag"] = 9] = "DecimalTag";
    APIEmitTypeTag[APIEmitTypeTag["StringTag"] = 10] = "StringTag";
    APIEmitTypeTag[APIEmitTypeTag["StringOfTag"] = 11] = "StringOfTag";
    APIEmitTypeTag[APIEmitTypeTag["PrimitiveOfTag"] = 12] = "PrimitiveOfTag";
    APIEmitTypeTag[APIEmitTypeTag["DataStringTag"] = 13] = "DataStringTag";
    APIEmitTypeTag[APIEmitTypeTag["ByteBufferTag"] = 14] = "ByteBufferTag";
    APIEmitTypeTag[APIEmitTypeTag["BufferOfTag"] = 15] = "BufferOfTag";
    APIEmitTypeTag[APIEmitTypeTag["DataBufferTag"] = 16] = "DataBufferTag";
    APIEmitTypeTag[APIEmitTypeTag["ISOTag"] = 17] = "ISOTag";
    APIEmitTypeTag[APIEmitTypeTag["LogicalTag"] = 18] = "LogicalTag";
    APIEmitTypeTag[APIEmitTypeTag["UUIDTag"] = 19] = "UUIDTag";
    APIEmitTypeTag[APIEmitTypeTag["ContentHashTag"] = 20] = "ContentHashTag";
    APIEmitTypeTag[APIEmitTypeTag["TupleTag"] = 21] = "TupleTag";
    APIEmitTypeTag[APIEmitTypeTag["RecordTag"] = 22] = "RecordTag";
    APIEmitTypeTag[APIEmitTypeTag["SomethingTag"] = 23] = "SomethingTag";
    APIEmitTypeTag[APIEmitTypeTag["OkTag"] = 24] = "OkTag";
    APIEmitTypeTag[APIEmitTypeTag["ErrTag"] = 25] = "ErrTag";
    APIEmitTypeTag[APIEmitTypeTag["ListTag"] = 26] = "ListTag";
    APIEmitTypeTag[APIEmitTypeTag["StackTag"] = 27] = "StackTag";
    APIEmitTypeTag[APIEmitTypeTag["QueueTag"] = 28] = "QueueTag";
    APIEmitTypeTag[APIEmitTypeTag["SetTag"] = 29] = "SetTag";
    APIEmitTypeTag[APIEmitTypeTag["MapTag"] = 30] = "MapTag";
    APIEmitTypeTag[APIEmitTypeTag["EnumTag"] = 31] = "EnumTag";
    APIEmitTypeTag[APIEmitTypeTag["EntityTag"] = 32] = "EntityTag";
    APIEmitTypeTag[APIEmitTypeTag["UnionTag"] = 33] = "UnionTag";
    APIEmitTypeTag[APIEmitTypeTag["ConceptTag"] = 34] = "ConceptTag";
})(APIEmitTypeTag || (APIEmitTypeTag = {}));
;
class SMTTypeEmitter {
    constructor(assembly, vopts, namectr, mangledTypeNameMap, mangledFunctionNameMap, mangledGlobalNameMap) {
        this.namectr = 0;
        this.allshortnames = new Set();
        this.mangledTypeNameMap = new Map();
        this.mangledFunctionNameMap = new Map();
        this.mangledGlobalNameMap = new Map();
        this.assembly = assembly;
        this.vopts = vopts;
        this.namectr = namectr || 0;
        this.mangledTypeNameMap = mangledTypeNameMap || new Map();
        this.mangledFunctionNameMap = mangledFunctionNameMap || new Map();
        this.mangledGlobalNameMap = mangledGlobalNameMap || new Map();
        this.allshortnames = new Set();
        this.mangledTypeNameMap.forEach((sn) => this.allshortnames.add(sn));
        this.mangledFunctionNameMap.forEach((sn) => this.allshortnames.add(sn));
        this.mangledGlobalNameMap.forEach((sn) => this.allshortnames.add(sn));
    }
    internTypeName(keyid, shortname) {
        if (!this.mangledTypeNameMap.has(keyid)) {
            let cleanname = shortname.replace(/:/g, ".").replace(/[<>, \[\]\{\}\(\)\\\/\#\=\|]/g, "_");
            if (this.allshortnames.has(cleanname)) {
                cleanname = cleanname + "$" + this.namectr++;
            }
            this.mangledTypeNameMap.set(keyid, cleanname);
            this.allshortnames.add(cleanname);
        }
    }
    lookupTypeName(keyid) {
        assert(this.mangledTypeNameMap.has(keyid));
        return this.mangledTypeNameMap.get(keyid);
    }
    internFunctionName(keyid, shortname) {
        if (!this.mangledFunctionNameMap.has(keyid)) {
            let cleanname = shortname.replace(/:/g, ".").replace(/[<>, \[\]\{\}\(\)\\\/\#\=\|]/g, "_");
            if (this.allshortnames.has(cleanname)) {
                cleanname = cleanname + "$" + this.namectr++;
            }
            this.mangledFunctionNameMap.set(keyid, cleanname);
            this.allshortnames.add(cleanname);
        }
    }
    lookupFunctionName(keyid) {
        assert(this.mangledFunctionNameMap.has(keyid), `Missing -- ${keyid}`);
        return this.mangledFunctionNameMap.get(keyid);
    }
    internGlobalName(keyid, shortname) {
        if (!this.mangledGlobalNameMap.has(keyid)) {
            let cleanname = shortname.replace(/:/g, ".").replace(/[<>, \[\]\{\}\(\)\\\/\#\=\|]/g, "_");
            if (this.allshortnames.has(cleanname)) {
                cleanname = cleanname + "$" + this.namectr++;
            }
            this.mangledGlobalNameMap.set(keyid, cleanname);
            this.allshortnames.add(cleanname);
        }
    }
    lookupGlobalName(keyid) {
        assert(this.mangledGlobalNameMap.has(keyid));
        return this.mangledGlobalNameMap.get(keyid);
    }
    getMIRType(tkey) {
        return this.assembly.typeMap.get(tkey);
    }
    isType(tt, tkey) {
        return tt.typeID === tkey;
    }
    isUniqueTupleType(tt) {
        return tt.options.length === 1 && (tt.options[0] instanceof mir_assembly_1.MIRTupleType);
    }
    isUniqueRecordType(tt) {
        return tt.options.length === 1 && (tt.options[0] instanceof mir_assembly_1.MIRRecordType);
    }
    isUniqueEntityType(tt) {
        return tt.options.length === 1 && (tt.options[0] instanceof mir_assembly_1.MIREntityType);
    }
    isUniqueEphemeralType(tt) {
        return tt.options.length === 1 && (tt.options[0] instanceof mir_assembly_1.MIREphemeralListType);
    }
    isUniqueType(tt) {
        return this.isUniqueTupleType(tt) || this.isUniqueRecordType(tt) || this.isUniqueEntityType(tt) || this.isUniqueEphemeralType(tt);
    }
    getSMTTypeForEntity(tt, entity) {
        if (entity instanceof mir_assembly_1.MIRInternalEntityTypeDecl) {
            if (entity instanceof mir_assembly_1.MIRPrimitiveInternalEntityTypeDecl) {
                if (this.isType(tt, "NSCore::None")) {
                    return new smt_exp_1.SMTType("bsq_none", "TypeTag_None", entity.tkey);
                }
                else if (this.isType(tt, "NSCore::Nothing")) {
                    return new smt_exp_1.SMTType("bsq_nothing", "TypeTag_Nothing", entity.tkey);
                }
                else if (this.isType(tt, "NSCore::Bool")) {
                    return new smt_exp_1.SMTType("Bool", "TypeTag_Bool", entity.tkey);
                }
                else if (this.isType(tt, "NSCore::Int")) {
                    return new smt_exp_1.SMTType("BInt", "TypeTag_Int", entity.tkey);
                }
                else if (this.isType(tt, "NSCore::Nat")) {
                    return new smt_exp_1.SMTType("BNat", "TypeTag_Nat", entity.tkey);
                }
                else if (this.isType(tt, "NSCore::BigInt")) {
                    return new smt_exp_1.SMTType("BBigInt", "TypeTag_BigInt", entity.tkey);
                }
                else if (this.isType(tt, "NSCore::BigNat")) {
                    return new smt_exp_1.SMTType("BBigNat", "TypeTag_BigInt", entity.tkey);
                }
                else if (this.isType(tt, "NSCore::Float")) {
                    return new smt_exp_1.SMTType("BFloat", "TypeTag_Float", entity.tkey);
                }
                else if (this.isType(tt, "NSCore::Decimal")) {
                    return new smt_exp_1.SMTType("BDecimal", "TypeTag_Decimal", entity.tkey);
                }
                else if (this.isType(tt, "NSCore::Rational")) {
                    return new smt_exp_1.SMTType("BRational", "TypeTag_Rational", entity.tkey);
                }
                else if (this.isType(tt, "NSCore::StringPos")) {
                    return new smt_exp_1.SMTType("BStringPos", "TypeTag_StringPos", entity.tkey);
                }
                else if (this.isType(tt, "NSCore::String")) {
                    return new smt_exp_1.SMTType("BString", "TypeTag_String", entity.tkey);
                }
                else if (tt.typeID.startsWith("NSCore::ByteBuffer")) {
                    return new smt_exp_1.SMTType("BByteBuffer", "TypeTag_ByteBuffer", entity.tkey);
                }
                else if (this.isType(tt, "NSCore::ISOTime")) {
                    return new smt_exp_1.SMTType("BISOTime", "TypeTag_ISOTime", entity.tkey);
                }
                else if (this.isType(tt, "NSCore::LogicalTime")) {
                    return new smt_exp_1.SMTType("BLogicalTime", "TypeTag_LogicalTime", entity.tkey);
                }
                else if (this.isType(tt, "NSCore::UUID")) {
                    return new smt_exp_1.SMTType("BUUID", "TypeTag_UUID", entity.tkey);
                }
                else if (this.isType(tt, "NSCore::ContentHash")) {
                    return new smt_exp_1.SMTType("BHash", "TypeTag_ContentHash", entity.tkey);
                }
                else if (this.isType(tt, "NSCore::Regex")) {
                    return new smt_exp_1.SMTType("bsq_regex", "TypeTag_Regex", entity.tkey);
                }
                else if (this.isType(tt, "NSCore::ISequence")) {
                    return new smt_exp_1.SMTType("ISequence", "TypeTag_ISequence", entity.tkey);
                }
                else if (this.isType(tt, "NSCore::JSequence")) {
                    return new smt_exp_1.SMTType("JSequence", "TypeTag_JSequence", entity.tkey);
                }
                else if (this.isType(tt, "NSCore::SSequence")) {
                    return new smt_exp_1.SMTType("SSequence", "TypeTag_SSequence", entity.tkey);
                }
                else if (this.isType(tt, "NSCore::HavocSequence")) {
                    return new smt_exp_1.SMTType("HavocSequence", "TypeTag_HavocSequence", entity.tkey);
                }
                else {
                    if (this.isType(tt, "NSCore::NumericOps")) {
                        return new smt_exp_1.SMTType("NumericOps", "TypeTag_NumericOps", entity.tkey);
                    }
                    else if (this.isType(tt, "NSCore::ListFlatOps")) {
                        return new smt_exp_1.SMTType("ListFlatOps", "TypeTag_ListFlatOps", entity.tkey);
                    }
                    else if (this.isType(tt, "NSCore::ListConcatOps")) {
                        return new smt_exp_1.SMTType("ListConcatOps", "TypeTag_ListConcatOps", entity.tkey);
                    }
                    else if (this.isType(tt, "NSCore::ListOps")) {
                        return new smt_exp_1.SMTType("ListOps", "ListOps", entity.tkey);
                    }
                    else {
                        assert(false, "Unknown primitive internal entity");
                        return new smt_exp_1.SMTType("[UNKNOWN MIRPrimitiveInternalEntityTypeDecl]", "[UNKNOWN]", entity.tkey);
                    }
                }
            }
            else if (entity instanceof mir_assembly_1.MIRConstructableInternalEntityTypeDecl) {
                if (tt.typeID.startsWith("NSCore::StringOf")) {
                    return new smt_exp_1.SMTType("BString", `TypeTag_${this.lookupTypeName(entity.tkey)}`, entity.tkey);
                }
                else if (tt.typeID.startsWith("NSCore::DataString")) {
                    return new smt_exp_1.SMTType("BString", `TypeTag_${this.lookupTypeName(entity.tkey)}`, entity.tkey);
                }
                else if (tt.typeID.startsWith("NSCore::BufferOf")) {
                    return new smt_exp_1.SMTType("BByteBuffer", `TypeTag_${this.lookupTypeName(entity.tkey)}`, entity.tkey);
                }
                else if (tt.typeID.startsWith("NSCore::DataBuffer")) {
                    return new smt_exp_1.SMTType("BByteBuffer", `TypeTag_${this.lookupTypeName(entity.tkey)}`, entity.tkey);
                }
                else if (tt.typeID.startsWith("NSCore::Something")) {
                    const sof = this.getSMTTypeFor(this.getMIRType(entity.fromtype));
                    return new smt_exp_1.SMTType(sof.name, `TypeTag_${this.lookupTypeName(entity.tkey)}`, entity.tkey);
                }
                else if (tt.typeID.startsWith("NSCore::Result::Ok")) {
                    const sof = this.getSMTTypeFor(this.getMIRType(entity.fromtype));
                    return new smt_exp_1.SMTType(sof.name, `TypeTag_${this.lookupTypeName(entity.tkey)}`, entity.tkey);
                }
                else {
                    assert(tt.typeID.startsWith("NSCore::Result::Err"));
                    const sof = this.getSMTTypeFor(this.getMIRType(entity.fromtype));
                    return new smt_exp_1.SMTType(sof.name, `TypeTag_${this.lookupTypeName(entity.tkey)}`, entity.tkey);
                }
            }
            else {
                assert(entity instanceof mir_assembly_1.MIRPrimitiveCollectionEntityTypeDecl);
                return new smt_exp_1.SMTType(this.lookupTypeName(entity.tkey), `TypeTag_${this.lookupTypeName(entity.tkey)}`, entity.tkey);
            }
        }
        else if (entity instanceof mir_assembly_1.MIRConstructableEntityTypeDecl) {
            const sof = this.getSMTTypeFor(this.getMIRType(entity.fromtype));
            return new smt_exp_1.SMTType(sof.name, `TypeTag_${this.lookupTypeName(entity.tkey)}`, entity.tkey);
        }
        else if (entity instanceof mir_assembly_1.MIREnumEntityTypeDecl) {
            const sof = this.getSMTTypeFor(this.getMIRType("NSCore::Nat"));
            return new smt_exp_1.SMTType(sof.name, `TypeTag_${this.lookupTypeName(entity.tkey)}`, entity.tkey);
        }
        else {
            return new smt_exp_1.SMTType(this.lookupTypeName(entity.tkey), `TypeTag_${this.lookupTypeName(entity.tkey)}`, entity.tkey);
        }
    }
    getSMTTypeFor(tt) {
        this.internTypeName(tt.typeID, tt.shortname);
        if (this.isUniqueTupleType(tt)) {
            return new smt_exp_1.SMTType(this.lookupTypeName(tt.typeID), `TypeTag_${this.lookupTypeName(tt.typeID)}`, tt.typeID);
        }
        else if (this.isUniqueRecordType(tt)) {
            return new smt_exp_1.SMTType(this.lookupTypeName(tt.typeID), `TypeTag_${this.lookupTypeName(tt.typeID)}`, tt.typeID);
        }
        else if (this.isUniqueEntityType(tt)) {
            return this.getSMTTypeForEntity(tt, this.assembly.entityDecls.get(tt.typeID));
        }
        else if (this.isUniqueEphemeralType(tt)) {
            return new smt_exp_1.SMTType(this.lookupTypeName(tt.typeID), `TypeTag_${this.lookupTypeName(tt.typeID)}`, tt.typeID);
        }
        else if (this.assembly.subtypeOf(tt, this.getMIRType("NSCore::KeyType"))) {
            return new smt_exp_1.SMTType("BKey", "[BKEY]", tt.typeID);
        }
        else {
            return new smt_exp_1.SMTType("BTerm", "[BTERM]", tt.typeID);
        }
    }
    getSMTConstructorName(tt) {
        assert(tt.options.length === 1);
        this.internTypeName(tt.typeID, tt.shortname);
        const kfix = this.assembly.subtypeOf(tt, this.getMIRType("NSCore::KeyType")) ? "bsqkey_" : "bsqobject_";
        if (this.isUniqueTupleType(tt)) {
            return { cons: `${this.lookupTypeName(tt.typeID)}@cons`, box: `${this.lookupTypeName(tt.typeID)}@box`, bfield: `${kfix}${this.lookupTypeName(tt.typeID)}_value` };
        }
        else if (this.isUniqueRecordType(tt)) {
            return { cons: `${this.lookupTypeName(tt.typeID)}@cons`, box: `${this.lookupTypeName(tt.typeID)}@box`, bfield: `${kfix}${this.lookupTypeName(tt.typeID)}_value` };
        }
        else if (this.isUniqueEntityType(tt)) {
            return { cons: `${this.lookupTypeName(tt.typeID)}@cons`, box: `${this.lookupTypeName(tt.typeID)}@box`, bfield: `${kfix}${this.lookupTypeName(tt.typeID)}_value` };
        }
        else {
            assert(this.isUniqueEphemeralType(tt), "should not be other options");
            return { cons: `${this.lookupTypeName(tt.typeID)}@cons`, box: "[UNDEF_EPHEMERAL_BOX]", bfield: "[UNDEF_EPHEMERAL_BOX]" };
        }
    }
    coerceFromAtomicToKey(exp, from) {
        assert(this.assembly.subtypeOf(from, this.getMIRType("NSCore::KeyType")));
        if (from.typeID === "NSCore::None") {
            return new smt_exp_1.SMTConst("BKey@none");
        }
        else if (from.typeID === "NSCore::Nothing") {
            return new smt_exp_1.SMTConst("BKey@nothing");
        }
        else {
            const smtfrom = this.getSMTTypeFor(from);
            let objval = undefined;
            if (this.isType(from, "NSCore::Bool")) {
                objval = new smt_exp_1.SMTCallSimple("bsqkey_bool@box", [exp]);
            }
            else if (this.isType(from, "NSCore::Int")) {
                objval = new smt_exp_1.SMTCallSimple("bsqkey_int@box", [exp]);
            }
            else if (this.isType(from, "NSCore::Nat")) {
                objval = new smt_exp_1.SMTCallSimple("bsqkey_nat@box", [exp]);
            }
            else if (this.isType(from, "NSCore::BigInt")) {
                objval = new smt_exp_1.SMTCallSimple("bsqkey_bigint@box", [exp]);
            }
            else if (this.isType(from, "NSCore::BigNat")) {
                objval = new smt_exp_1.SMTCallSimple("bsqkey_bignat@box", [exp]);
            }
            else if (this.isType(from, "NSCore::String")) {
                objval = new smt_exp_1.SMTCallSimple("bsqkey_string@box", [exp]);
            }
            else if (this.isType(from, "NSCore::LogicalTime")) {
                objval = new smt_exp_1.SMTCallSimple("bsqkey_logicaltime@box", [exp]);
            }
            else if (this.isType(from, "NSCore::UUID")) {
                objval = new smt_exp_1.SMTCallSimple("bsqkey_uuid@box", [exp]);
            }
            else if (this.isType(from, "NSCore::ContentHash")) {
                objval = new smt_exp_1.SMTCallSimple("bsqkey_contenthash@box", [exp]);
            }
            else {
                assert(this.isUniqueEntityType(from));
                objval = new smt_exp_1.SMTCallSimple(this.getSMTConstructorName(from).box, [exp]);
            }
            return new smt_exp_1.SMTCallSimple("BKey@box", [new smt_exp_1.SMTConst(smtfrom.smttypetag), objval]);
        }
    }
    coerceFromAtomicToTerm(exp, from) {
        if (from.typeID === "NSCore::None") {
            return new smt_exp_1.SMTConst(`BTerm@none`);
        }
        else if (from.typeID === "NSCore::Nothing") {
            return new smt_exp_1.SMTConst(`BTerm@nothing`);
        }
        else {
            if (this.assembly.subtypeOf(from, this.getMIRType("NSCore::KeyType"))) {
                return new smt_exp_1.SMTCallSimple("BTerm@keybox", [this.coerceFromAtomicToKey(exp, from)]);
            }
            else {
                const smtfrom = this.getSMTTypeFor(from);
                let objval = undefined;
                if (this.isType(from, "NSCore::Float")) {
                    objval = new smt_exp_1.SMTCallSimple("bsq_float@box", [exp]);
                }
                else if (this.isType(from, "NSCore::Decimal")) {
                    objval = new smt_exp_1.SMTCallSimple("bsq_decimal@box", [exp]);
                }
                else if (this.isType(from, "NSCore::Rational")) {
                    objval = new smt_exp_1.SMTCallSimple("bsq_rational@box", [exp]);
                }
                else if (this.isType(from, "NSCore::StringPos")) {
                    objval = new smt_exp_1.SMTCallSimple("bsq_stringpos@box", [exp]);
                }
                else if (this.isType(from, "NSCore::ByteBuffer")) {
                    objval = new smt_exp_1.SMTCallSimple("bsq_bytebuffer@box", [exp]);
                }
                else if (this.isType(from, "NSCore::ISOTime")) {
                    objval = new smt_exp_1.SMTCallSimple("bsq_isotime@box", [exp]);
                }
                else if (this.isType(from, "NSCore::Regex")) {
                    objval = new smt_exp_1.SMTCallSimple("bsq_regex@box", [exp]);
                }
                else if (this.isUniqueTupleType(from)) {
                    objval = new smt_exp_1.SMTCallSimple(this.getSMTConstructorName(from).box, [exp]);
                }
                else if (this.isUniqueRecordType(from)) {
                    objval = new smt_exp_1.SMTCallSimple(this.getSMTConstructorName(from).box, [exp]);
                }
                else {
                    assert(this.isUniqueEntityType(from));
                    objval = new smt_exp_1.SMTCallSimple(this.getSMTConstructorName(from).box, [exp]);
                }
                return new smt_exp_1.SMTCallSimple("BTerm@termbox", [new smt_exp_1.SMTConst(smtfrom.smttypetag), objval]);
            }
        }
    }
    coerceKeyIntoAtomic(exp, into) {
        if (this.isType(into, "NSCore::None")) {
            return new smt_exp_1.SMTConst("bsq_none@literal");
        }
        else {
            const oexp = new smt_exp_1.SMTCallSimple("BKey_value", [exp]);
            if (this.isType(into, "NSCore::Bool")) {
                return new smt_exp_1.SMTCallSimple("bsqkey_bool_value", [oexp]);
            }
            else if (this.isType(into, "NSCore::Int")) {
                return new smt_exp_1.SMTCallSimple("bsqkey_int_value", [oexp]);
            }
            else if (this.isType(into, "NSCore::Nat")) {
                return new smt_exp_1.SMTCallSimple("bsqkey_nat_value", [oexp]);
            }
            else if (this.isType(into, "NSCore::BigInt")) {
                return new smt_exp_1.SMTCallSimple("bsqkey_bigint_value", [oexp]);
            }
            else if (this.isType(into, "NSCore::BigNat")) {
                return new smt_exp_1.SMTCallSimple("bsqkey_bignat_value", [oexp]);
            }
            else if (this.isType(into, "NSCore::String")) {
                return new smt_exp_1.SMTCallSimple("bsqkey_string_value", [oexp]);
            }
            else if (this.isType(into, "NSCore::LogicalTime")) {
                return new smt_exp_1.SMTCallSimple("bsqkey_logicaltime_value", [oexp]);
            }
            else if (this.isType(into, "NSCore::UUID")) {
                return new smt_exp_1.SMTCallSimple("bsqkey_uuid_value", [oexp]);
            }
            else if (this.isType(into, "NSCore::ContentHash")) {
                return new smt_exp_1.SMTCallSimple("bsqkey_contenthash_value", [oexp]);
            }
            else if (this.isUniqueTupleType(into)) {
                return new smt_exp_1.SMTCallSimple(this.getSMTConstructorName(into).bfield, [oexp]);
            }
            else if (this.isUniqueRecordType(into)) {
                return new smt_exp_1.SMTCallSimple(this.getSMTConstructorName(into).bfield, [oexp]);
            }
            else {
                assert(this.isUniqueEntityType(into));
                return new smt_exp_1.SMTCallSimple(this.getSMTConstructorName(into).bfield, [oexp]);
            }
        }
    }
    coerceTermIntoAtomic(exp, into) {
        if (this.isType(into, "NSCore::None")) {
            return new smt_exp_1.SMTConst("bsq_none@literal");
        }
        else if (this.isType(into, "NSCore::Nothing")) {
            return new smt_exp_1.SMTConst("bsq_nothing@literal");
        }
        else {
            if (this.assembly.subtypeOf(into, this.getMIRType("NSCore::KeyType"))) {
                return this.coerceKeyIntoAtomic(new smt_exp_1.SMTCallSimple("BTerm_keyvalue", [exp]), into);
            }
            else {
                const oexp = new smt_exp_1.SMTCallSimple("BTerm_termvalue", [exp]);
                if (this.isType(into, "NSCore::Float")) {
                    return new smt_exp_1.SMTCallSimple("bsqobject_float_value", [oexp]);
                }
                else if (this.isType(into, "NSCore::Decimal")) {
                    return new smt_exp_1.SMTCallSimple("bsqobject_decimal_value", [oexp]);
                }
                else if (this.isType(into, "NSCore::Rational")) {
                    return new smt_exp_1.SMTCallSimple("bsqobject_rational_value", [oexp]);
                }
                else if (this.isType(into, "NSCore::StringPos")) {
                    return new smt_exp_1.SMTCallSimple("bsqobject_stringpos_value", [oexp]);
                }
                else if (this.isType(into, "NSCore::ByteBuffer")) {
                    return new smt_exp_1.SMTCallSimple("bsqobject_bytebuffer_value", [oexp]);
                }
                else if (this.isType(into, "NSCore::ISOTime")) {
                    return new smt_exp_1.SMTCallSimple("bsqobject_isotime_value", [oexp]);
                }
                else if (this.isType(into, "NSCore::Regex")) {
                    return new smt_exp_1.SMTCallSimple("bsqobject_regex_value", [oexp]);
                }
                else if (this.isUniqueTupleType(into)) {
                    return new smt_exp_1.SMTCallSimple(this.getSMTConstructorName(into).bfield, [oexp]);
                }
                else if (this.isUniqueRecordType(into)) {
                    return new smt_exp_1.SMTCallSimple(this.getSMTConstructorName(into).bfield, [oexp]);
                }
                else {
                    assert(this.isUniqueEntityType(into));
                    return new smt_exp_1.SMTCallSimple(this.getSMTConstructorName(into).bfield, [oexp]);
                }
            }
        }
    }
    coerce(exp, from, into) {
        const smtfrom = this.getSMTTypeFor(from);
        const smtinto = this.getSMTTypeFor(into);
        if (smtfrom.name === smtinto.name) {
            return exp;
        }
        else if (smtinto.name === "BKey") {
            if (smtfrom.name === "BTerm") {
                return new smt_exp_1.SMTCallSimple("BTerm_keyvalue", [exp]);
            }
            else {
                return this.coerceFromAtomicToKey(exp, from);
            }
        }
        else if (smtinto.name === "BTerm") {
            if (smtfrom.name === "BKey") {
                return new smt_exp_1.SMTCallSimple("BTerm@keybox", [exp]);
            }
            else {
                return this.coerceFromAtomicToTerm(exp, from);
            }
        }
        else {
            if (smtfrom.name === "BKey") {
                return this.coerceKeyIntoAtomic(exp, into);
            }
            else {
                assert(smtfrom.name === "BTerm");
                return this.coerceTermIntoAtomic(exp, into);
            }
        }
    }
    coerceToKey(exp, from) {
        const smtfrom = this.getSMTTypeFor(from);
        if (smtfrom.name === "BKey") {
            return exp;
        }
        else {
            if (smtfrom.name === "BTerm") {
                return new smt_exp_1.SMTCallSimple("BTerm_keyvalue", [exp]);
            }
            else {
                return this.coerceFromAtomicToKey(exp, from);
            }
        }
    }
    generateTupleIndexGetFunction(tt, idx) {
        this.internTypeName(tt.typeID, tt.shortname);
        return `${this.lookupTypeName(tt.typeID)}@_${idx}`;
    }
    generateRecordPropertyGetFunction(tt, pname) {
        this.internTypeName(tt.typeID, tt.shortname);
        return `${this.lookupTypeName(tt.typeID)}@_${pname}`;
    }
    generateEntityFieldGetFunction(tt, field) {
        this.internTypeName(tt.tkey, tt.shortname);
        return `${this.lookupTypeName(tt.tkey)}@_${field.fname}`;
    }
    generateEphemeralListGetFunction(tt, idx) {
        this.internTypeName(tt.typeID, tt.shortname);
        return `${this.lookupTypeName(tt.typeID)}@_${idx}`;
    }
    generateResultType(ttype) {
        return new smt_exp_1.SMTType(`$Result_${this.getSMTTypeFor(ttype).name}`, "[INTERNAL RESULT]", "[INTERNAL RESULT]");
    }
    generateResultTypeConstructorSuccess(ttype, val) {
        return new smt_exp_1.SMTCallSimple(`$Result_${this.getSMTTypeFor(ttype).name}@success`, [val]);
    }
    generateResultTypeConstructorError(ttype, err) {
        return new smt_exp_1.SMTCallSimple(`$Result_${this.getSMTTypeFor(ttype).name}@error`, [err]);
    }
    generateErrorResultAssert(rtype) {
        return this.generateResultTypeConstructorError(rtype, new smt_exp_1.SMTConst("ErrorID_AssumeCheck"));
    }
    generateResultIsSuccessTest(ttype, exp) {
        return new smt_exp_1.SMTCallSimple(`(_ is $Result_${this.getSMTTypeFor(ttype).name}@success)`, [exp]);
    }
    generateResultIsErrorTest(ttype, exp) {
        return new smt_exp_1.SMTCallSimple(`(_ is $Result_${this.getSMTTypeFor(ttype).name}@error)`, [exp]);
    }
    generateResultGetSuccess(ttype, exp) {
        return new smt_exp_1.SMTCallSimple(`$Result_${this.getSMTTypeFor(ttype).name}@success_value`, [exp]);
    }
    generateResultGetError(ttype, exp) {
        return new smt_exp_1.SMTCallSimple(`$Result_${this.getSMTTypeFor(ttype).name}@error_value`, [exp]);
    }
    generateAccessWithSetGuardResultType(ttype) {
        return new smt_exp_1.SMTType(`$GuardResult_${this.getSMTTypeFor(ttype).name}`, "[INTERNAL GUARD RESULT]", "[INTERNAL GUARD RESULT]");
    }
    generateAccessWithSetGuardResultTypeConstructorLoad(ttype, value, flag) {
        return new smt_exp_1.SMTCallSimple(`$GuardResult_${this.getSMTTypeFor(ttype).name}@cons`, [value, new smt_exp_1.SMTConst(flag ? "true" : "false")]);
    }
    generateAccessWithSetGuardResultGetValue(ttype, exp) {
        return new smt_exp_1.SMTCallSimple(`$GuardResult_${this.getSMTTypeFor(ttype).name}@result`, [exp]);
    }
    generateAccessWithSetGuardResultGetFlag(ttype, exp) {
        return new smt_exp_1.SMTCallSimple(`$GuardResult_${this.getSMTTypeFor(ttype).name}@flag`, [exp]);
    }
    havocTypeInfoGen(tt) {
        if (this.isType(tt, "NSCore::None")) {
            return ["BNone@UFCons_API", false];
        }
        else if (this.isType(tt, "NSCore::Nothing")) {
            return ["BNothing@UFCons_API", false];
        }
        else if (this.isType(tt, "NSCore::Bool")) {
            return ["BBool@UFCons_API", false];
        }
        else if (this.isType(tt, "NSCore::Int")) {
            return ["BInt@UFCons_API", false];
        }
        else if (this.isType(tt, "NSCore::Nat")) {
            return ["BNat@UFCons_API", false];
        }
        else if (this.isType(tt, "NSCore::BigInt")) {
            return ["BBigInt@UFCons_API", false];
        }
        else if (this.isType(tt, "NSCore::Float")) {
            return ["BFloat@UFCons_API", false];
        }
        else if (this.isType(tt, "NSCore::Decimal")) {
            return ["BDecimal@UFCons_API", false];
        }
        else if (this.isType(tt, "NSCore::ContentHash")) {
            return ["BContentHash@UFCons_API", false];
        }
        else {
            return [`_@@cons_${this.lookupTypeName(tt.typeID)}_entrypoint`, true];
        }
    }
    isKnownSafeHavocConstructorType(tt) {
        return !this.havocTypeInfoGen(tt)[1];
    }
    generateHavocConstructorName(tt) {
        return this.havocTypeInfoGen(tt)[0];
    }
    generateHavocConstructorPathExtend(path, step) {
        return new smt_exp_1.SMTCallSimple("seq.++", [path, new smt_exp_1.SMTCallSimple("seq.unit", [step])]);
    }
    generateHavocConstructorCall(tt, path, step) {
        if (this.isKnownSafeHavocConstructorType(tt)) {
            return this.generateResultTypeConstructorSuccess(tt, new smt_exp_1.SMTCallSimple(this.generateHavocConstructorName(tt), [this.generateHavocConstructorPathExtend(path, step)]));
        }
        else {
            return new smt_exp_1.SMTCallGeneral(this.generateHavocConstructorName(tt), [this.generateHavocConstructorPathExtend(path, step)]);
        }
    }
    getAPITypeForEntity(tt, entity) {
        if (entity instanceof mir_assembly_1.MIRInternalEntityTypeDecl) {
            if (entity instanceof mir_assembly_1.MIRPrimitiveInternalEntityTypeDecl) {
                if (this.isType(tt, "NSCore::None")) {
                    return { tag: APIEmitTypeTag.NoneTag, name: tt.typeID };
                }
                else if (this.isType(tt, "NSCore::Nothing")) {
                    return { tag: APIEmitTypeTag.NothingTag, name: tt.typeID };
                }
                else if (this.isType(tt, "NSCore::Bool")) {
                    return { tag: APIEmitTypeTag.BoolTag, name: tt.typeID };
                }
                else if (this.isType(tt, "NSCore::Int")) {
                    return { tag: APIEmitTypeTag.IntTag, name: tt.typeID };
                }
                else if (this.isType(tt, "NSCore::Nat")) {
                    return { tag: APIEmitTypeTag.NatTag, name: tt.typeID };
                }
                else if (this.isType(tt, "NSCore::BigInt")) {
                    return { tag: APIEmitTypeTag.BigIntTag, name: tt.typeID };
                }
                else if (this.isType(tt, "NSCore::BigNat")) {
                    return { tag: APIEmitTypeTag.BigNatTag, name: tt.typeID };
                }
                else if (this.isType(tt, "NSCore::Float")) {
                    return { tag: APIEmitTypeTag.FloatTag, name: tt.typeID };
                }
                else if (this.isType(tt, "NSCore::Decimal")) {
                    return { tag: APIEmitTypeTag.DecimalTag, name: tt.typeID };
                }
                else if (this.isType(tt, "NSCore::Rational")) {
                    return { tag: APIEmitTypeTag.RationalTag, name: tt.typeID };
                }
                else if (this.isType(tt, "NSCore::String")) {
                    return { tag: APIEmitTypeTag.StringTag, name: tt.typeID };
                }
                else if (this.isType(tt, "NSCore::ByteBuffer")) {
                    return { tag: APIEmitTypeTag.ByteBufferTag, name: tt.typeID };
                }
                else if (this.isType(tt, "NSCore::ISOTime")) {
                    return { tag: APIEmitTypeTag.ISOTag, name: tt.typeID };
                }
                else if (this.isType(tt, "NSCore::LogicalTime")) {
                    return { tag: APIEmitTypeTag.LogicalTag, name: tt.typeID };
                }
                else if (this.isType(tt, "NSCore::UUID")) {
                    return { tag: APIEmitTypeTag.UUIDTag, name: tt.typeID };
                }
                else if (this.isType(tt, "NSCore::ContentHash")) {
                    return { tag: APIEmitTypeTag.ContentHashTag, name: tt.typeID };
                }
                else {
                    assert(false);
                    return { tag: APIEmitTypeTag.NoneTag, name: "[UNKNOWN API TYPE]" };
                }
            }
            else if (entity instanceof mir_assembly_1.MIRConstructableInternalEntityTypeDecl) {
                if (tt.typeID.startsWith("NSCore::StringOf")) {
                    return { tag: APIEmitTypeTag.StringOfTag, name: tt.typeID, validator: entity.fromtype };
                }
                else if (tt.typeID.startsWith("NSCore::DataString")) {
                    return { tag: APIEmitTypeTag.DataStringTag, name: tt.typeID, oftype: entity.fromtype };
                }
                else if (tt.typeID.startsWith("NSCore::BufferOf")) {
                    return { tag: APIEmitTypeTag.BufferOfTag, name: tt.typeID, oftype: entity.fromtype };
                }
                else if (tt.typeID.startsWith("NSCore::DataBuffer")) {
                    return { tag: APIEmitTypeTag.DataBufferTag, name: tt.typeID, oftype: entity.fromtype };
                }
                else if (tt.typeID.startsWith("NSCore::Something")) {
                    return { tag: APIEmitTypeTag.SomethingTag, name: tt.typeID, oftype: entity.fromtype };
                }
                else if (tt.typeID.startsWith("NSCore::Result::Ok")) {
                    return { tag: APIEmitTypeTag.OkTag, name: tt.typeID, oftype: entity.fromtype };
                }
                else {
                    assert(tt.typeID.startsWith("NSCore::Result::Err"));
                    return { tag: APIEmitTypeTag.ErrTag, name: tt.typeID, oftype: entity.fromtype };
                }
            }
            else {
                assert(entity instanceof mir_assembly_1.MIRPrimitiveCollectionEntityTypeDecl);
                if (entity instanceof mir_assembly_1.MIRPrimitiveListEntityTypeDecl) {
                    return { tag: APIEmitTypeTag.ListTag, name: tt.typeID, oftype: entity.oftype };
                }
                else if (entity instanceof mir_assembly_1.MIRPrimitiveStackEntityTypeDecl) {
                    return { tag: APIEmitTypeTag.StackTag, name: tt.typeID, oftype: entity.oftype, ultype: entity.ultype };
                }
                else if (entity instanceof mir_assembly_1.MIRPrimitiveQueueEntityTypeDecl) {
                    return { tag: APIEmitTypeTag.QueueTag, name: tt.typeID, oftype: entity.oftype, ultype: entity.ultype };
                }
                else if (entity instanceof mir_assembly_1.MIRPrimitiveSetEntityTypeDecl) {
                    return { tag: APIEmitTypeTag.SetTag, name: tt.typeID, oftype: entity.oftype, ultype: entity.ultype, unqchkinv: entity.unqchkinv, unqconvinv: entity.unqconvinv };
                }
                else {
                    const mentity = entity;
                    return { tag: APIEmitTypeTag.MapTag, name: tt.typeID, oftype: mentity.oftype, ultype: mentity.ultype, unqchkinv: mentity.unqchkinv };
                }
            }
        }
        else if (entity instanceof mir_assembly_1.MIRConstructableEntityTypeDecl) {
            return { tag: APIEmitTypeTag.PrimitiveOfTag, name: tt.typeID, oftype: entity.fromtype, usinginv: entity.usingcons || "[NO CONSTRUCTOR]" };
        }
        else if (entity instanceof mir_assembly_1.MIREnumEntityTypeDecl) {
            return { tag: APIEmitTypeTag.EnumTag, name: tt.typeID, usinginv: entity.usingcons, enums: entity.enums };
        }
        else {
            const oentity = entity;
            let fields = [];
            let ttypes = [];
            for (let i = 0; i < oentity.consfuncfields.length; ++i) {
                const ff = oentity.consfuncfields[i];
                const mirff = this.assembly.fieldDecls.get(ff);
                fields.push(mirff.fname);
                ttypes.push(mirff.declaredType);
            }
            return { tag: APIEmitTypeTag.EntityTag, name: tt.typeID, fields: fields, ttypes: ttypes };
        }
    }
    getAPITypeFor(tt) {
        this.internTypeName(tt.typeID, tt.shortname);
        if (this.isUniqueTupleType(tt)) {
            const tdecl = this.assembly.tupleDecls.get(tt.typeID);
            let ttypes = [];
            for (let i = 0; i < tdecl.entries.length; ++i) {
                const mirtt = tdecl.entries[i];
                ttypes.push(mirtt.typeID);
            }
            return { tag: APIEmitTypeTag.TupleTag, name: tt.typeID, ttypes: ttypes };
        }
        else if (this.isUniqueRecordType(tt)) {
            const rdecl = this.assembly.recordDecls.get(tt.typeID);
            let props = [];
            let ttypes = [];
            for (let i = 0; i < rdecl.entries.length; ++i) {
                const prop = rdecl.entries[i].pname;
                const mirtt = rdecl.entries[i].ptype;
                props.push(prop);
                ttypes.push(mirtt.typeID);
            }
            return { tag: APIEmitTypeTag.RecordTag, name: tt.typeID, props: props, ttypes: ttypes };
        }
        else if (this.isUniqueEntityType(tt)) {
            return this.getAPITypeForEntity(tt, this.assembly.entityDecls.get(tt.typeID));
        }
        else if (tt instanceof mir_assembly_1.MIRConceptType) {
            const etypes = [...this.assembly.entityDecls].filter((edi) => this.assembly.subtypeOf(this.getMIRType(edi[1].tkey), this.getMIRType(tt.typeID)));
            const opts = etypes.map((opt) => opt[1].tkey);
            return { tag: APIEmitTypeTag.ConceptTag, name: tt.typeID, opts: opts };
        }
        else {
            const opts = tt.options.map((opt) => opt.typeID);
            return { tag: APIEmitTypeTag.UnionTag, name: tt.typeID, opts: opts };
        }
    }
}
exports.SMTTypeEmitter = SMTTypeEmitter;
//# sourceMappingURL=smttype_emitter.js.map