"use strict";
//-------------------------------------------------------------------------------------------------------
// Copyright (C) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE.txt file in the project root for full license information.
//-------------------------------------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
exports.MIREntityProjectToEphemeral = exports.MIRRecordProjectToEphemeral = exports.MIRTupleProjectToEphemeral = exports.MIRLoadField = exports.MIRRegisterAssign = exports.MIRLoadRecordPropertySetGuard = exports.MIRLoadRecordProperty = exports.MIRLoadTupleIndexSetGuard = exports.MIRLoadTupleIndex = exports.MIRRecordHasProperty = exports.MIRTupleHasIndex = exports.MIRLoadConst = exports.MIRExtract = exports.MIRGuardedOptionInject = exports.MIRInject = exports.MIRConvertValue = exports.MIRSetConstantGuardFlag = exports.MIRDeclareGuardFlagLocation = exports.MIRLoadUnintVariableValue = exports.MIRDebug = exports.MIRAssertCheck = exports.MIRAbort = exports.MIRDeadFlow = exports.MIRNop = exports.MIROp = exports.MIROpTag = exports.MIRConstantTypedNumber = exports.MIRConstantDataString = exports.MIRConstantStringOf = exports.MIRConstantRegex = exports.MIRConstantString = exports.MIRConstantDecimal = exports.MIRConstantFloat = exports.MIRConstantRational = exports.MIRConstantBigNat = exports.MIRConstantBigInt = exports.MIRConstantNat = exports.MIRConstantInt = exports.MIRConstantFalse = exports.MIRConstantTrue = exports.MIRConstantNothing = exports.MIRConstantNone = exports.MIRConstantArgument = exports.MIRGlobalVariable = exports.MIRRegisterArgument = exports.MIRArgument = exports.MIRStatmentGuard = exports.MIRArgGuard = exports.MIRMaskGuard = exports.MIRGuard = void 0;
exports.MIRBody = exports.MIRBasicBlock = exports.MIRPhi = exports.MIRVarLifetimeEnd = exports.MIRVarLifetimeStart = exports.MIRReturnAssignOfCons = exports.MIRReturnAssign = exports.MIRJumpNone = exports.MIRJumpCond = exports.MIRJump = exports.MIRIsTypeOf = exports.MIRPrefixNotOp = exports.MIRBinKeyLess = exports.MIRBinKeyEq = exports.MIRConstructorPrimaryCollectionMixed = exports.MIRConstructorPrimaryCollectionCopies = exports.MIRConstructorPrimaryCollectionSingletons = exports.MIRConstructorPrimaryCollectionEmpty = exports.MIREphemeralListExtend = exports.MIRConstructorEphemeralList = exports.MIRStructuredJoinRecord = exports.MIRStructuredAppendTuple = exports.MIRConstructorRecordFromEphemeralList = exports.MIRConstructorRecord = exports.MIRConstructorTupleFromEphemeralList = exports.MIRConstructorTuple = exports.MIRInvokeVirtualOperator = exports.MIRInvokeVirtualFunction = exports.MIRInvokeFixedFunction = exports.MIRSliceEpehmeralList = exports.MIRMultiLoadFromEpehmeralList = exports.MIRLoadFromEpehmeralList = exports.MIREntityUpdate = exports.MIRRecordUpdate = exports.MIRTupleUpdate = void 0;
const parser_1 = require("../ast/parser");
const mir_info_1 = require("./mir_info");
const assert = require("assert");
//
//Probably want to declare a MIRSourceInfo class
//
function jemitsinfo(sinfo) {
    return { line: sinfo.line, column: sinfo.column, pos: sinfo.pos, span: sinfo.span };
}
function jparsesinfo(jobj) {
    return new parser_1.SourceInfo(jobj.line, jobj.column, jobj.pos, jobj.span);
}
class MIRGuard {
    static jparse(gg) {
        if (gg.kind === "ArgGuard") {
            return MIRArgGuard.jparse(gg);
        }
        else {
            return MIRMaskGuard.jparse(gg);
        }
    }
}
exports.MIRGuard = MIRGuard;
class MIRArgGuard extends MIRGuard {
    constructor(greg) {
        super();
        this.greg = greg;
    }
    tryGetGuardVars() {
        return this.greg instanceof MIRRegisterArgument ? this.greg : undefined;
    }
    stringify() {
        return this.greg.stringify();
    }
    jemit() {
        return { kind: "ArgGuard", greg: this.greg.jemit() };
    }
    static jparse(gg) {
        return new MIRArgGuard(MIRArgument.jparse(gg.greg));
    }
}
exports.MIRArgGuard = MIRArgGuard;
class MIRMaskGuard extends MIRGuard {
    constructor(gmask, gindex, gsize) {
        super();
        this.gmask = gmask;
        this.gindex = gindex;
        this.gsize = gsize;
    }
    tryGetGuardVars() {
        return undefined;
    }
    stringify() {
        return `${this.gmask}[${this.gindex}]`;
    }
    jemit() {
        return { kind: "MaskGuard", gmask: this.gmask, gindex: this.gindex, gsize: this.gsize };
    }
    static jparse(gg) {
        return new MIRMaskGuard(gg.gmask, gg.gindex, gg.gsize);
    }
}
exports.MIRMaskGuard = MIRMaskGuard;
class MIRStatmentGuard {
    constructor(guard, usedefault, defaultvar) {
        this.guard = guard;
        this.usedefault = usedefault;
        this.defaultvar = defaultvar;
    }
    getUsedVars() {
        let uvs = [];
        if (this.guard.tryGetGuardVars() !== undefined) {
            uvs.push(this.guard.tryGetGuardVars());
        }
        if (this.defaultvar !== undefined && this.defaultvar instanceof MIRRegisterArgument) {
            uvs.push(this.defaultvar);
        }
        return uvs;
    }
    stringify() {
        return `${this.guard.stringify()} ${this.usedefault} ${this.defaultvar !== undefined ? this.defaultvar.stringify() : "UNINIT"}`;
    }
    jemit() {
        return { guard: this.guard.jemit(), usedefault: this.usedefault, origvar: this.defaultvar !== undefined ? this.defaultvar.jemit() : undefined };
    }
    static jparse(gg) {
        return new MIRStatmentGuard(MIRGuard.jparse(gg.guard), gg.usedefault, gg.defaultvar !== undefined ? MIRArgument.jparse(gg.defaultvar) : undefined);
    }
}
exports.MIRStatmentGuard = MIRStatmentGuard;
class MIRArgument {
    constructor(nameID) {
        this.nameID = nameID;
    }
    static jparse(jobj) {
        if (jobj === null) {
            return new MIRConstantNone();
        }
        else if (Array.isArray(jobj) && jobj.length === 0) {
            return new MIRConstantNothing();
        }
        else if (typeof (jobj) === "boolean") {
            return jobj ? new MIRConstantTrue() : new MIRConstantFalse();
        }
        else if (typeof (jobj) === "string") {
            return new MIRConstantString(jobj);
        }
        else {
            const ckind = jobj.constkind;
            switch (ckind) {
                case "int":
                    return new MIRConstantInt(jobj.value);
                case "nat":
                    return new MIRConstantNat(jobj.value);
                case "bigint":
                    return new MIRConstantBigInt(jobj.value);
                case "bignat":
                    return new MIRConstantBigNat(jobj.value);
                case "rational":
                    return new MIRConstantRational(jobj.value);
                case "float":
                    return new MIRConstantFloat(jobj.value);
                case "decimal":
                    return new MIRConstantDecimal(jobj.value);
                case "stringof":
                    return new MIRConstantStringOf(jobj.value, jobj.oftype);
                case "datastring":
                    return new MIRConstantDataString(jobj.value, jobj.oftype);
                case "typednumber":
                    return new MIRConstantTypedNumber(MIRArgument.jparse(jobj.value), jobj.oftype);
                default:
                    return new MIRConstantRegex(jobj.value);
            }
        }
    }
}
exports.MIRArgument = MIRArgument;
class MIRRegisterArgument extends MIRArgument {
    constructor(nameID, origname) {
        super(nameID);
        this.origname = origname || nameID;
    }
    stringify() {
        return this.nameID;
    }
    jemit() {
        return { tag: "register", nameID: this.nameID };
    }
    static jparse(jobj) {
        return new MIRRegisterArgument(jobj.nameID);
    }
}
exports.MIRRegisterArgument = MIRRegisterArgument;
class MIRGlobalVariable extends MIRArgument {
    constructor(gkey, shortname) {
        super(gkey);
        this.gkey = gkey;
        this.shortname = shortname;
    }
    stringify() {
        return this.shortname;
    }
    jemit() {
        return { tag: "global", gkey: this.nameID, shortname: this.shortname };
    }
    static jparse(jobj) {
        return new MIRGlobalVariable(jobj.gkey, jobj.shortname);
    }
}
exports.MIRGlobalVariable = MIRGlobalVariable;
class MIRConstantArgument extends MIRArgument {
    constructor(name) {
        super(name);
    }
}
exports.MIRConstantArgument = MIRConstantArgument;
class MIRConstantNone extends MIRConstantArgument {
    constructor() {
        super("=none=");
    }
    constantSize() {
        return 0n;
    }
    stringify() {
        return "none";
    }
    jemit() {
        return null;
    }
}
exports.MIRConstantNone = MIRConstantNone;
class MIRConstantNothing extends MIRConstantArgument {
    constructor() {
        super("=nothing=");
    }
    constantSize() {
        return 0n;
    }
    stringify() {
        return "nothing";
    }
    jemit() {
        return [];
    }
}
exports.MIRConstantNothing = MIRConstantNothing;
class MIRConstantTrue extends MIRConstantArgument {
    constructor() {
        super("=true=");
    }
    constantSize() {
        return 0n;
    }
    stringify() {
        return "true";
    }
    jemit() {
        return true;
    }
}
exports.MIRConstantTrue = MIRConstantTrue;
class MIRConstantFalse extends MIRConstantArgument {
    constructor() {
        super("=false=");
    }
    constantSize() {
        return 0n;
    }
    stringify() {
        return "false";
    }
    jemit() {
        return false;
    }
}
exports.MIRConstantFalse = MIRConstantFalse;
class MIRConstantInt extends MIRConstantArgument {
    constructor(value) {
        super(`=int=${value}`);
        this.value = value;
    }
    constantSize() {
        return BigInt(this.value.slice(0, this.value.length - 1));
    }
    stringify() {
        return this.value;
    }
    jemit() {
        return { constkind: "int", value: this.value };
    }
}
exports.MIRConstantInt = MIRConstantInt;
class MIRConstantNat extends MIRConstantArgument {
    constructor(value) {
        super(`=nat=${value}`);
        this.value = value;
    }
    constantSize() {
        return BigInt(this.value.slice(0, this.value.length - 1));
    }
    stringify() {
        return this.value;
    }
    jemit() {
        return { constkind: "nat", value: this.value };
    }
}
exports.MIRConstantNat = MIRConstantNat;
class MIRConstantBigInt extends MIRConstantArgument {
    constructor(value) {
        super(`=bigint=${value}`);
        this.value = value;
    }
    constantSize() {
        return BigInt(this.value.slice(0, this.value.length - 1));
    }
    stringify() {
        return this.value;
    }
    jemit() {
        return { constkind: "bigint", value: this.value };
    }
}
exports.MIRConstantBigInt = MIRConstantBigInt;
class MIRConstantBigNat extends MIRConstantArgument {
    constructor(value) {
        super(`=bignat=${value}`);
        this.value = value;
    }
    constantSize() {
        return BigInt(this.value.slice(0, this.value.length - 1));
    }
    stringify() {
        return this.value;
    }
    jemit() {
        return { constkind: "bignat", value: this.value };
    }
}
exports.MIRConstantBigNat = MIRConstantBigNat;
class MIRConstantRational extends MIRConstantArgument {
    constructor(value) {
        super(`=rational=${value}`);
        this.value = value;
    }
    constantSize() {
        return 0n;
    }
    stringify() {
        return this.value;
    }
    jemit() {
        return { constkind: "rational", value: this.value };
    }
}
exports.MIRConstantRational = MIRConstantRational;
class MIRConstantFloat extends MIRConstantArgument {
    constructor(value) {
        super(`=float=${value}`);
        this.value = value;
    }
    constantSize() {
        return 0n;
    }
    stringify() {
        return this.value;
    }
    jemit() {
        return { constkind: "float", value: this.value };
    }
}
exports.MIRConstantFloat = MIRConstantFloat;
class MIRConstantDecimal extends MIRConstantArgument {
    constructor(value) {
        super(`=decimal=${value}`);
        this.value = value;
    }
    constantSize() {
        return 0n;
    }
    stringify() {
        return this.value;
    }
    jemit() {
        return { constkind: "decimal", value: this.value };
    }
}
exports.MIRConstantDecimal = MIRConstantDecimal;
class MIRConstantString extends MIRConstantArgument {
    constructor(value) {
        super(`=string=${value}`);
        this.value = value;
    }
    constantSize() {
        return BigInt(this.value.length);
    }
    stringify() {
        return this.value;
    }
    jemit() {
        return this.value;
    }
}
exports.MIRConstantString = MIRConstantString;
class MIRConstantRegex extends MIRConstantArgument {
    constructor(value) {
        super(`=regex=${value.restr}`);
        this.value = value;
    }
    constantSize() {
        return 0n;
    }
    stringify() {
        return this.value.restr;
    }
    jemit() {
        return { constkind: "regex", value: this.value.jemit() };
    }
}
exports.MIRConstantRegex = MIRConstantRegex;
class MIRConstantStringOf extends MIRConstantArgument {
    constructor(value, tskey) {
        super(`=stringof=${tskey} of ${value}`);
        this.value = value;
        this.tskey = tskey;
    }
    constantSize() {
        return BigInt(this.value.length);
    }
    stringify() {
        return `${this.tskey} of ${this.value}`;
    }
    jemit() {
        return { constkind: "stringof", value: this.value, oftype: this.tskey };
    }
}
exports.MIRConstantStringOf = MIRConstantStringOf;
class MIRConstantDataString extends MIRConstantArgument {
    constructor(value, tskey) {
        super(`=datastring=${tskey} of ${value}`);
        this.value = value;
        this.tskey = tskey;
    }
    constantSize() {
        return BigInt(this.value.length);
    }
    stringify() {
        return `${this.tskey} of ${this.value}`;
    }
    jemit() {
        return { constkind: "datastring", value: this.value, oftype: this.tskey };
    }
}
exports.MIRConstantDataString = MIRConstantDataString;
class MIRConstantTypedNumber extends MIRConstantArgument {
    constructor(value, tnkey) {
        super(`=typednumber=${tnkey} of ${value.stringify()}`);
        this.value = value;
        this.tnkey = tnkey;
    }
    constantSize() {
        return this.value.constantSize();
    }
    stringify() {
        return `${this.tnkey} of ${this.value}`;
    }
    jemit() {
        return { constkind: "typednumber", value: this.value.jemit(), oftype: this.tnkey };
    }
}
exports.MIRConstantTypedNumber = MIRConstantTypedNumber;
var MIROpTag;
(function (MIROpTag) {
    MIROpTag["MIRNop"] = "MIRNop";
    MIROpTag["MIRDeadFlow"] = "MIRDeadFlow";
    MIROpTag["MIRAbort"] = "MIRAbort";
    MIROpTag["MIRAssertCheck"] = "MIRAssertCheck";
    MIROpTag["MIRDebug"] = "MIRDebug";
    MIROpTag["MIRLoadUnintVariableValue"] = "MIRLoadUnintVariableValue";
    MIROpTag["MIRDeclareGuardFlagLocation"] = "MIRDeclareGuardFlagLocation";
    MIROpTag["MIRSetConstantGuardFlag"] = "MIRSetConstantGuardFlag";
    MIROpTag["MIRConvertValue"] = "MIRConvertValue";
    MIROpTag["MIRInject"] = "MIRInject";
    MIROpTag["MIRGuardedOptionInject"] = "MIRGuardedOptionInject";
    MIROpTag["MIRExtract"] = "MIRExtract";
    MIROpTag["MIRLoadConst"] = "MIRLoadConst";
    MIROpTag["MIRTupleHasIndex"] = "MIRTupleHasIndex";
    MIROpTag["MIRRecordHasProperty"] = "MIRRecordHasProperty";
    MIROpTag["MIRLoadTupleIndex"] = "MIRLoadTupleIndex";
    MIROpTag["MIRLoadTupleIndexSetGuard"] = "MIRLoadTupleIndexSetGuard";
    MIROpTag["MIRLoadRecordProperty"] = "MIRLoadRecordProperty";
    MIROpTag["MIRLoadRecordPropertySetGuard"] = "MIRLoadRecordPropertySetGuard";
    MIROpTag["MIRLoadField"] = "MIRLoadField";
    MIROpTag["MIRTupleProjectToEphemeral"] = "MIRTupleProjectToEphemeral";
    MIROpTag["MIRRecordProjectToEphemeral"] = "MIRRecordProjectToEphemeral";
    MIROpTag["MIREntityProjectToEphemeral"] = "MIREntityProjectToEphemeral";
    MIROpTag["MIRTupleUpdate"] = "MIRTupleUpdate";
    MIROpTag["MIRRecordUpdate"] = "MIRRecordUpdate";
    MIROpTag["MIREntityUpdate"] = "MIREntityUpdate";
    MIROpTag["MIRLoadFromEpehmeralList"] = "MIRLoadFromEpehmeralList";
    MIROpTag["MIRMultiLoadFromEpehmeralList"] = "MIRMultiLoadFromEpehmeralList";
    MIROpTag["MIRSliceEpehmeralList"] = "MIRSliceEpehmeralList";
    MIROpTag["MIRInvokeFixedFunction"] = "MIRInvokeFixedFunction";
    MIROpTag["MIRInvokeVirtualFunction"] = "MIRInvokeVirtualFunction";
    MIROpTag["MIRInvokeVirtualOperator"] = "MIRInvokeVirtualOperator";
    MIROpTag["MIRConstructorTuple"] = "MIRConstructorTuple";
    MIROpTag["MIRConstructorTupleFromEphemeralList"] = "MIRConstructorTupleFromEphemeralList";
    MIROpTag["MIRConstructorRecord"] = "MIRConstructorRecord";
    MIROpTag["MIRConstructorRecordFromEphemeralList"] = "MIRConstructorRecordFromEphemeralList";
    MIROpTag["MIRStructuredAppendTuple"] = "MIRStructuredAppendTuple";
    MIROpTag["MIRStructuredJoinRecord"] = "MIRStructuredJoinRecord";
    MIROpTag["MIRConstructorEphemeralList"] = "MIRConstructorEphemeralList";
    MIROpTag["MIREphemeralListExtend"] = "MIREphemeralListExtend";
    MIROpTag["MIRConstructorPrimaryCollectionEmpty"] = "MIRConstructorPrimaryCollectionEmpty";
    MIROpTag["MIRConstructorPrimaryCollectionSingletons"] = "MIRConstructorPrimaryCollectionSingletons";
    MIROpTag["MIRConstructorPrimaryCollectionCopies"] = "MIRConstructorPrimaryCollectionCopies";
    MIROpTag["MIRConstructorPrimaryCollectionMixed"] = "MIRConstructorPrimaryCollectionMixed";
    MIROpTag["MIRBinKeyEq"] = "MIRBinKeyEq";
    MIROpTag["MIRBinKeyLess"] = "MIRBinKeyLess";
    MIROpTag["MIRPrefixNotOp"] = "MIRPrefixNotOp";
    MIROpTag["MIRIsTypeOf"] = "MIRIsTypeOf";
    MIROpTag["MIRJump"] = "MIRJump";
    MIROpTag["MIRJumpCond"] = "MIRJumpCond";
    MIROpTag["MIRJumpNone"] = "MIRJumpNone";
    MIROpTag["MIRRegisterAssign"] = "MIRRegisterAssign";
    MIROpTag["MIRReturnAssign"] = "MIRReturnAssign";
    MIROpTag["MIRReturnAssignOfCons"] = "MIRReturnAssignOfCons";
    MIROpTag["MIRVarLifetimeStart"] = "MIRVarLifetimeStart";
    MIROpTag["MIRVarLifetimeEnd"] = "MIRVarLifetimeEnd";
    MIROpTag["MIRPhi"] = "MIRPhi";
})(MIROpTag || (MIROpTag = {}));
exports.MIROpTag = MIROpTag;
function varsOnlyHelper(args) {
    return args.filter((arg) => arg instanceof MIRRegisterArgument);
}
class MIROp {
    constructor(tag, sinfo) {
        this.tag = tag;
        this.sinfo = sinfo;
    }
    canRaise(implicitAssumesEnabled) {
        return false;
    }
    jbemit() {
        return { tag: this.tag, sinfo: jemitsinfo(this.sinfo) };
    }
    static jparse(jobj) {
        switch (jobj.tag) {
            case MIROpTag.MIRNop:
                return MIRNop.jparse(jobj);
            case MIROpTag.MIRDeadFlow:
                return MIRDeadFlow.jparse(jobj);
            case MIROpTag.MIRAbort:
                return MIRAbort.jparse(jobj);
            case MIROpTag.MIRAssertCheck:
                return MIRAssertCheck.jparse(jobj);
            case MIROpTag.MIRDebug:
                return MIRDebug.jparse(jobj);
            case MIROpTag.MIRLoadUnintVariableValue:
                return MIRLoadUnintVariableValue.jparse(jobj);
            case MIROpTag.MIRDeclareGuardFlagLocation:
                return MIRDeclareGuardFlagLocation.jparse(jobj);
            case MIROpTag.MIRSetConstantGuardFlag:
                return MIRSetConstantGuardFlag.jparse(jobj);
            case MIROpTag.MIRConvertValue:
                return MIRConvertValue.jparse(jobj);
            case MIROpTag.MIRInject:
                return MIRInject.jparse(jobj);
            case MIROpTag.MIRGuardedOptionInject:
                return MIRGuardedOptionInject.jparse(jobj);
            case MIROpTag.MIRExtract:
                return MIRExtract.jparse(jobj);
            case MIROpTag.MIRLoadConst:
                return MIRLoadConst.jparse(jobj);
            case MIROpTag.MIRTupleHasIndex:
                return MIRTupleHasIndex.jparse(jobj);
            case MIROpTag.MIRRecordHasProperty:
                return MIRRecordHasProperty.jparse(jobj);
            case MIROpTag.MIRLoadTupleIndex:
                return MIRLoadTupleIndex.jparse(jobj);
            case MIROpTag.MIRLoadTupleIndexSetGuard:
                return MIRLoadTupleIndexSetGuard.jparse(jobj);
            case MIROpTag.MIRLoadRecordProperty:
                return MIRLoadRecordProperty.jparse(jobj);
            case MIROpTag.MIRLoadRecordPropertySetGuard:
                return MIRLoadRecordPropertySetGuard.jparse(jobj);
            case MIROpTag.MIRLoadField:
                return MIRLoadField.jparse(jobj);
            case MIROpTag.MIRTupleProjectToEphemeral:
                return MIRTupleProjectToEphemeral.jparse(jobj);
            case MIROpTag.MIRRecordProjectToEphemeral:
                return MIRRecordProjectToEphemeral.jparse(jobj);
            case MIROpTag.MIREntityProjectToEphemeral:
                return MIREntityProjectToEphemeral.jparse(jobj);
            case MIROpTag.MIRTupleUpdate:
                return MIRTupleUpdate.jparse(jobj);
            case MIROpTag.MIRRecordUpdate:
                return MIRRecordUpdate.jparse(jobj);
            case MIROpTag.MIREntityUpdate:
                return MIREntityUpdate.jparse(jobj);
            case MIROpTag.MIRLoadFromEpehmeralList:
                return MIRLoadFromEpehmeralList.jparse(jobj);
            case MIROpTag.MIRMultiLoadFromEpehmeralList:
                return MIRMultiLoadFromEpehmeralList.jparse(jobj);
            case MIROpTag.MIRSliceEpehmeralList:
                return MIRSliceEpehmeralList.jparse(jobj);
            case MIROpTag.MIRInvokeFixedFunction:
                return MIRInvokeFixedFunction.jparse(jobj);
            case MIROpTag.MIRInvokeVirtualFunction:
                return MIRInvokeVirtualFunction.jparse(jobj);
            case MIROpTag.MIRInvokeVirtualOperator:
                return MIRInvokeVirtualOperator.jparse(jobj);
            case MIROpTag.MIRConstructorTuple:
                return MIRConstructorTuple.jparse(jobj);
            case MIROpTag.MIRConstructorTupleFromEphemeralList:
                return MIRConstructorTupleFromEphemeralList.jparse(jobj);
            case MIROpTag.MIRConstructorRecord:
                return MIRConstructorRecord.jparse(jobj);
            case MIROpTag.MIRConstructorRecordFromEphemeralList:
                return MIRConstructorRecordFromEphemeralList.jparse(jobj);
            case MIROpTag.MIRStructuredAppendTuple:
                return MIRStructuredAppendTuple.jparse(jobj);
            case MIROpTag.MIRStructuredJoinRecord:
                return MIRStructuredJoinRecord.jparse(jobj);
            case MIROpTag.MIRConstructorEphemeralList:
                return MIRConstructorEphemeralList.jparse(jobj);
            case MIROpTag.MIREphemeralListExtend:
                return MIREphemeralListExtend.jparse(jobj);
            case MIROpTag.MIRConstructorPrimaryCollectionEmpty:
                return MIRConstructorPrimaryCollectionEmpty.jparse(jobj);
            case MIROpTag.MIRConstructorPrimaryCollectionSingletons:
                return MIRConstructorPrimaryCollectionSingletons.jparse(jobj);
            case MIROpTag.MIRConstructorPrimaryCollectionCopies:
                return MIRConstructorPrimaryCollectionCopies.jparse(jobj);
            case MIROpTag.MIRConstructorPrimaryCollectionMixed:
                return MIRConstructorPrimaryCollectionMixed.jparse(jobj);
            case MIROpTag.MIRBinKeyEq:
                return MIRBinKeyEq.jparse(jobj);
            case MIROpTag.MIRBinKeyLess:
                return MIRBinKeyLess.jparse(jobj);
            case MIROpTag.MIRPrefixNotOp:
                return MIRPrefixNotOp.jparse(jobj);
            case MIROpTag.MIRIsTypeOf:
                return MIRIsTypeOf.jparse(jobj);
            case MIROpTag.MIRJump:
                return MIRJump.jparse(jobj);
            case MIROpTag.MIRJumpCond:
                return MIRJumpCond.jparse(jobj);
            case MIROpTag.MIRJumpNone:
                return MIRJumpNone.jparse(jobj);
            case MIROpTag.MIRRegisterAssign:
                return MIRRegisterAssign.jparse(jobj);
            case MIROpTag.MIRReturnAssign:
                return MIRReturnAssign.jparse(jobj);
            case MIROpTag.MIRReturnAssignOfCons:
                return MIRReturnAssignOfCons.jparse(jobj);
            case MIROpTag.MIRVarLifetimeStart:
                return MIRVarLifetimeStart.jparse(jobj);
            case MIROpTag.MIRVarLifetimeEnd:
                return MIRVarLifetimeEnd.jparse(jobj);
            default:
                assert(jobj.tag === MIROpTag.MIRPhi);
                return MIRPhi.jparse(jobj);
        }
    }
}
exports.MIROp = MIROp;
class MIRNop extends MIROp {
    constructor(sinfo) {
        super(MIROpTag.MIRNop, sinfo);
    }
    getUsedVars() { return []; }
    getModVars() { return []; }
    stringify() {
        return `nop`;
    }
    jemit() {
        return { ...this.jbemit() };
    }
    static jparse(jobj) {
        return new MIRNop(jparsesinfo(jobj.sinfo));
    }
}
exports.MIRNop = MIRNop;
class MIRDeadFlow extends MIROp {
    constructor(sinfo) {
        super(MIROpTag.MIRDeadFlow, sinfo);
    }
    getUsedVars() { return []; }
    getModVars() { return []; }
    stringify() {
        return `dead-flow`;
    }
    jemit() {
        return { ...this.jbemit() };
    }
    static jparse(jobj) {
        return new MIRNop(jparsesinfo(jobj.sinfo));
    }
}
exports.MIRDeadFlow = MIRDeadFlow;
class MIRAbort extends MIROp {
    constructor(sinfo, info) {
        super(MIROpTag.MIRAbort, sinfo);
        this.info = info;
    }
    getUsedVars() { return []; }
    getModVars() { return []; }
    stringify() {
        return `abort -- ${this.info}`;
    }
    canRaise(implicitAssumesEnabled) {
        return true;
    }
    jemit() {
        return { ...this.jbemit(), info: this.info };
    }
    static jparse(jobj) {
        return new MIRAbort(jparsesinfo(jobj.sinfo), jobj.info);
    }
}
exports.MIRAbort = MIRAbort;
class MIRAssertCheck extends MIROp {
    constructor(sinfo, info, arg) {
        super(MIROpTag.MIRAssertCheck, sinfo);
        this.info = info;
        this.arg = arg;
    }
    getUsedVars() { return varsOnlyHelper([this.arg]); }
    getModVars() { return []; }
    stringify() {
        return `assert ${this.arg.stringify()} -- ${this.info}`;
    }
    canRaise(implicitAssumesEnabled) {
        return true;
    }
    jemit() {
        return { ...this.jbemit(), info: this.info, arg: this.arg.jemit() };
    }
    static jparse(jobj) {
        return new MIRAssertCheck(jparsesinfo(jobj.sinfo), jobj.info, MIRArgument.jparse(jobj.arg));
    }
}
exports.MIRAssertCheck = MIRAssertCheck;
class MIRDebug extends MIROp {
    constructor(sinfo, value) {
        super(MIROpTag.MIRDebug, sinfo);
        this.value = value;
    }
    getUsedVars() { return this.value !== undefined ? varsOnlyHelper([this.value]) : []; }
    getModVars() { return []; }
    stringify() {
        if (this.value === undefined) {
            return "_debug break";
        }
        else {
            return `_debug ${this.value.stringify()}`;
        }
    }
    jemit() {
        return { ...this.jbemit(), value: this.value ? [this.value.jemit()] : null };
    }
    static jparse(jobj) {
        return new MIRDebug(jparsesinfo(jobj.sinfo), jobj.value ? MIRArgument.jparse(jobj.value[0]) : undefined);
    }
}
exports.MIRDebug = MIRDebug;
class MIRLoadUnintVariableValue extends MIROp {
    constructor(sinfo, trgt, oftype) {
        super(MIROpTag.MIRLoadUnintVariableValue, sinfo);
        this.trgt = trgt;
        this.oftype = oftype;
    }
    getUsedVars() { return []; }
    getModVars() { return [this.trgt]; }
    stringify() {
        return `${this.trgt.stringify()} = ${this.oftype}(*)`;
    }
    jemit() {
        return { ...this.jbemit(), trgt: this.trgt, oftype: this.oftype };
    }
    static jparse(jobj) {
        return new MIRLoadUnintVariableValue(jparsesinfo(jobj.sinfo), MIRRegisterArgument.jparse(jobj.trgt), jobj.oftype);
    }
}
exports.MIRLoadUnintVariableValue = MIRLoadUnintVariableValue;
class MIRDeclareGuardFlagLocation extends MIROp {
    constructor(sinfo, name, count) {
        super(MIROpTag.MIRDeclareGuardFlagLocation, sinfo);
        this.name = name;
        this.count = count;
    }
    getUsedVars() { return []; }
    getModVars() { return []; }
    stringify() {
        return `${this.name}[[${this.count}]]`;
    }
    jemit() {
        return { ...this.jbemit(), name: this.name, count: this.count };
    }
    static jparse(jobj) {
        return new MIRDeclareGuardFlagLocation(jparsesinfo(jobj.sinfo), jobj.name, jobj.count);
    }
}
exports.MIRDeclareGuardFlagLocation = MIRDeclareGuardFlagLocation;
class MIRSetConstantGuardFlag extends MIROp {
    constructor(sinfo, name, position, flag) {
        super(MIROpTag.MIRSetConstantGuardFlag, sinfo);
        this.name = name;
        this.position = position;
        this.flag = flag;
    }
    getUsedVars() { return []; }
    getModVars() { return []; }
    stringify() {
        return `${this.name}[[${this.position}]] = ${this.flag}`;
    }
    jemit() {
        return { ...this.jbemit(), name: this.name, position: this.position, flag: this.flag };
    }
    static jparse(jobj) {
        return new MIRSetConstantGuardFlag(jparsesinfo(jobj.sinfo), jobj.name, jobj.position, jobj.flag);
    }
}
exports.MIRSetConstantGuardFlag = MIRSetConstantGuardFlag;
class MIRConvertValue extends MIROp {
    constructor(sinfo, srctypelayout, srctypeflow, intotype, src, trgt, sguard) {
        super(MIROpTag.MIRConvertValue, sinfo);
        this.trgt = trgt;
        this.srctypelayout = srctypelayout;
        this.srctypeflow = srctypeflow;
        this.intotype = intotype;
        this.src = src;
        this.sguard = sguard;
    }
    getUsedVars() { return this.sguard !== undefined ? varsOnlyHelper([...this.sguard.getUsedVars(), this.src]) : varsOnlyHelper([this.src]); }
    getModVars() { return [this.trgt]; }
    stringify() {
        const gstring = this.sguard !== undefined ? ` | ${this.sguard.stringify()}` : "";
        return `${this.trgt.stringify()} = ${this.src} convert ${this.intotype}${gstring}`;
    }
    jemit() {
        return { ...this.jbemit(), trgt: this.trgt.jemit(), srctypelayout: this.srctypelayout, srctypeflow: this.srctypeflow, intotype: this.intotype, src: this.src.jemit(), sguard: this.sguard !== undefined ? this.sguard.jemit() : undefined };
    }
    static jparse(jobj) {
        return new MIRConvertValue(jparsesinfo(jobj.sinfo), jobj.srctypelayout, jobj.srctypeflow, jobj.intotype, MIRArgument.jparse(jobj.src), MIRRegisterArgument.jparse(jobj.trgt), jobj.sguard !== undefined ? MIRStatmentGuard.jparse(jobj.sguard) : undefined);
    }
}
exports.MIRConvertValue = MIRConvertValue;
class MIRInject extends MIROp {
    constructor(sinfo, srctype, intotype, src, trgt) {
        super(MIROpTag.MIRInject, sinfo);
        this.trgt = trgt;
        this.srctype = srctype;
        this.intotype = intotype;
        this.src = src;
    }
    getUsedVars() { return varsOnlyHelper([this.src]); }
    getModVars() { return [this.trgt]; }
    stringify() {
        return `${this.trgt.stringify()} = ${this.src} inject ${this.intotype}`;
    }
    jemit() {
        return { ...this.jbemit(), trgt: this.trgt.jemit(), srctype: this.srctype, intotype: this.intotype, src: this.src.jemit() };
    }
    static jparse(jobj) {
        return new MIRInject(jparsesinfo(jobj.sinfo), jobj.srctype, jobj.intotype, MIRArgument.jparse(jobj.src), MIRRegisterArgument.jparse(jobj.trgt));
    }
}
exports.MIRInject = MIRInject;
class MIRGuardedOptionInject extends MIROp {
    constructor(sinfo, srctype, somethingtype, optiontype, src, trgt, sguard) {
        super(MIROpTag.MIRInject, sinfo);
        this.trgt = trgt;
        this.srctype = srctype;
        this.somethingtype = somethingtype;
        this.optiontype = optiontype;
        this.src = src;
        this.sguard = sguard;
    }
    getUsedVars() { return this.sguard !== undefined ? varsOnlyHelper([...this.sguard.getUsedVars(), this.src]) : varsOnlyHelper([this.src]); }
    getModVars() { return [this.trgt]; }
    stringify() {
        const gstring = this.sguard !== undefined ? ` | ${this.sguard.stringify()}` : "";
        return `${this.trgt.stringify()} = ${this.src} option inject ${this.optiontype}${gstring}`;
    }
    jemit() {
        return { ...this.jbemit(), trgt: this.trgt.jemit(), srctype: this.srctype, somethingtype: this.somethingtype, optiontype: this.optiontype, src: this.src.jemit(), sguard: this.sguard !== undefined ? this.sguard.jemit() : undefined };
    }
    static jparse(jobj) {
        return new MIRConvertValue(jparsesinfo(jobj.sinfo), jobj.srctype, jobj.somethingtype, jobj.optiontype, MIRArgument.jparse(jobj.src), MIRRegisterArgument.jparse(jobj.trgt), jobj.sguard !== undefined ? MIRStatmentGuard.jparse(jobj.sguard) : undefined);
    }
}
exports.MIRGuardedOptionInject = MIRGuardedOptionInject;
class MIRExtract extends MIROp {
    constructor(sinfo, srctype, intotype, src, trgt) {
        super(MIROpTag.MIRExtract, sinfo);
        this.trgt = trgt;
        this.srctype = srctype;
        this.intotype = intotype;
        this.src = src;
    }
    getUsedVars() { return varsOnlyHelper([this.src]); }
    getModVars() { return [this.trgt]; }
    stringify() {
        return `${this.trgt.stringify()} = ${this.src} inject ${this.intotype}`;
    }
    jemit() {
        return { ...this.jbemit(), trgt: this.trgt.jemit(), srctype: this.srctype, intotype: this.intotype, src: this.src.jemit() };
    }
    static jparse(jobj) {
        return new MIRExtract(jparsesinfo(jobj.sinfo), jobj.srctype, jobj.intotype, MIRArgument.jparse(jobj.src), MIRRegisterArgument.jparse(jobj.trgt));
    }
}
exports.MIRExtract = MIRExtract;
class MIRLoadConst extends MIROp {
    constructor(sinfo, src, consttype, trgt) {
        super(MIROpTag.MIRLoadConst, sinfo);
        this.trgt = trgt;
        this.src = src;
        this.consttype = consttype;
    }
    getUsedVars() { return []; }
    getModVars() { return [this.trgt]; }
    stringify() {
        return `${this.trgt.stringify()} = ${this.src.stringify()}`;
    }
    jemit() {
        return { ...this.jbemit(), trgt: this.trgt.jemit(), consttype: this.consttype, src: this.src.jemit() };
    }
    static jparse(jobj) {
        return new MIRLoadConst(jparsesinfo(jobj.sinfo), MIRArgument.jparse(jobj.src), jobj.consttype, MIRRegisterArgument.jparse(jobj.trgt));
    }
}
exports.MIRLoadConst = MIRLoadConst;
class MIRTupleHasIndex extends MIROp {
    constructor(sinfo, arg, arglayouttype, argflowtype, idx, trgt) {
        super(MIROpTag.MIRTupleHasIndex, sinfo);
        this.trgt = trgt;
        this.arg = arg;
        this.arglayouttype = arglayouttype;
        this.argflowtype = argflowtype;
        this.idx = idx;
    }
    getUsedVars() { return varsOnlyHelper([this.arg]); }
    getModVars() { return [this.trgt]; }
    stringify() {
        return `${this.trgt.stringify()} = ${this.arg.stringify()}.hasIndex<${this.idx}>()`;
    }
    jemit() {
        return { ...this.jbemit(), trgt: this.trgt.jemit(), arg: this.arg.jemit(), arglayouttype: this.arglayouttype, argflowtype: this.argflowtype, idx: this.idx };
    }
    static jparse(jobj) {
        return new MIRTupleHasIndex(jparsesinfo(jobj.sinfo), MIRArgument.jparse(jobj.arg), jobj.arglayouttype, jobj.argflowtype, jobj.idx, MIRRegisterArgument.jparse(jobj.trgt));
    }
}
exports.MIRTupleHasIndex = MIRTupleHasIndex;
class MIRRecordHasProperty extends MIROp {
    constructor(sinfo, arg, arglayouttype, argflowtype, pname, trgt) {
        super(MIROpTag.MIRRecordHasProperty, sinfo);
        this.trgt = trgt;
        this.arg = arg;
        this.arglayouttype = arglayouttype;
        this.argflowtype = argflowtype;
        this.pname = pname;
    }
    getUsedVars() { return varsOnlyHelper([this.arg]); }
    getModVars() { return [this.trgt]; }
    stringify() {
        return `${this.trgt.stringify()} = ${this.arg.stringify()}.hasProperty<${this.pname}>()`;
    }
    jemit() {
        return { ...this.jbemit(), trgt: this.trgt.jemit(), arg: this.arg.jemit(), arglayouttype: this.arglayouttype, argflowtype: this.argflowtype, pname: this.pname };
    }
    static jparse(jobj) {
        return new MIRRecordHasProperty(jparsesinfo(jobj.sinfo), MIRArgument.jparse(jobj.arg), jobj.arglayouttype, jobj.argflowtype, jobj.pname, MIRRegisterArgument.jparse(jobj.trgt));
    }
}
exports.MIRRecordHasProperty = MIRRecordHasProperty;
class MIRLoadTupleIndex extends MIROp {
    constructor(sinfo, arg, arglayouttype, argflowtype, idx, isvirtual, resulttype, trgt) {
        super(MIROpTag.MIRLoadTupleIndex, sinfo);
        this.trgt = trgt;
        this.arg = arg;
        this.arglayouttype = arglayouttype;
        this.argflowtype = argflowtype;
        this.idx = idx;
        this.isvirtual = isvirtual;
        this.resulttype = resulttype;
    }
    getUsedVars() { return varsOnlyHelper([this.arg]); }
    getModVars() { return [this.trgt]; }
    stringify() {
        return `${this.trgt.stringify()} = ${this.arg.stringify()}.${this.idx}`;
    }
    jemit() {
        return { ...this.jbemit(), trgt: this.trgt.jemit(), arg: this.arg.jemit(), arglayouttype: this.arglayouttype, argflowtype: this.argflowtype, idx: this.idx, isvirtual: this.isvirtual, resulttype: this.resulttype };
    }
    static jparse(jobj) {
        return new MIRLoadTupleIndex(jparsesinfo(jobj.sinfo), MIRArgument.jparse(jobj.arg), jobj.arglayouttype, jobj.argflowtype, jobj.idx, jobj.isvirtual, jobj.resulttype, MIRRegisterArgument.jparse(jobj.trgt));
    }
}
exports.MIRLoadTupleIndex = MIRLoadTupleIndex;
class MIRLoadTupleIndexSetGuard extends MIROp {
    constructor(sinfo, arg, arglayouttype, argflowtype, idx, isvirtual, resulttype, trgt, guard) {
        super(MIROpTag.MIRLoadTupleIndexSetGuard, sinfo);
        this.trgt = trgt;
        this.arg = arg;
        this.arglayouttype = arglayouttype;
        this.argflowtype = argflowtype;
        this.idx = idx;
        this.isvirtual = isvirtual;
        this.resulttype = resulttype;
        this.guard = guard;
    }
    getUsedVars() { return varsOnlyHelper([this.arg]); }
    getModVars() { return varsOnlyHelper(this.guard.tryGetGuardVars() !== undefined ? [this.trgt, this.guard.tryGetGuardVars()] : [this.trgt]); }
    stringify() {
        return `${this.trgt.stringify()} = ${this.arg.stringify()}.${this.idx} | ${this.guard.stringify()}]`;
    }
    jemit() {
        return { ...this.jbemit(), trgt: this.trgt.jemit(), arg: this.arg.jemit(), arglayouttype: this.arglayouttype, argflowtype: this.argflowtype, idx: this.idx, isvirtual: this.isvirtual, resulttype: this.resulttype, guard: this.guard.jemit() };
    }
    static jparse(jobj) {
        return new MIRLoadTupleIndexSetGuard(jparsesinfo(jobj.sinfo), MIRArgument.jparse(jobj.arg), jobj.arglayouttype, jobj.argflowtype, jobj.idx, jobj.isvirtual, jobj.resulttype, MIRRegisterArgument.jparse(jobj.trgt), MIRGuard.jparse(jobj.guard));
    }
}
exports.MIRLoadTupleIndexSetGuard = MIRLoadTupleIndexSetGuard;
class MIRLoadRecordProperty extends MIROp {
    constructor(sinfo, arg, arglayouttype, argflowtype, pname, isvirtual, resulttype, trgt) {
        super(MIROpTag.MIRLoadRecordProperty, sinfo);
        this.trgt = trgt;
        this.arg = arg;
        this.arglayouttype = arglayouttype;
        this.argflowtype = argflowtype;
        this.pname = pname;
        this.isvirtual = isvirtual;
        this.resulttype = resulttype;
    }
    getUsedVars() { return varsOnlyHelper([this.arg]); }
    getModVars() { return [this.trgt]; }
    stringify() {
        return `${this.trgt.stringify()} = ${this.arg.stringify()}.${this.pname}`;
    }
    jemit() {
        return { ...this.jbemit(), trgt: this.trgt.jemit(), arg: this.arg.jemit(), arglayouttype: this.arglayouttype, argflowtype: this.argflowtype, pname: this.pname, isvirtual: this.isvirtual, resulttype: this.resulttype };
    }
    static jparse(jobj) {
        return new MIRLoadRecordProperty(jparsesinfo(jobj.sinfo), MIRArgument.jparse(jobj.arg), jobj.arglayouttype, jobj.argflowtype, jobj.pname, jobj.isvirtual, jobj.resulttype, MIRRegisterArgument.jparse(jobj.trgt));
    }
}
exports.MIRLoadRecordProperty = MIRLoadRecordProperty;
class MIRLoadRecordPropertySetGuard extends MIROp {
    constructor(sinfo, arg, arglayouttype, argflowtype, pname, isvirtual, resulttype, trgt, guard) {
        super(MIROpTag.MIRLoadRecordPropertySetGuard, sinfo);
        this.trgt = trgt;
        this.arg = arg;
        this.arglayouttype = arglayouttype;
        this.argflowtype = argflowtype;
        this.pname = pname;
        this.isvirtual = isvirtual;
        this.resulttype = resulttype;
        this.guard = guard;
    }
    getUsedVars() { return varsOnlyHelper([this.arg]); }
    getModVars() { return varsOnlyHelper(this.guard.tryGetGuardVars() !== undefined ? [this.trgt, this.guard.tryGetGuardVars()] : [this.trgt]); }
    stringify() {
        return `${this.trgt.stringify()} = ${this.arg.stringify()}.${this.pname} | ${this.guard.stringify()}]`;
    }
    jemit() {
        return { ...this.jbemit(), trgt: this.trgt.jemit(), arg: this.arg.jemit(), arglayouttype: this.arglayouttype, argflowtype: this.argflowtype, pname: this.pname, isvirtual: this.isvirtual, resulttype: this.resulttype, guard: this.guard.jemit() };
    }
    static jparse(jobj) {
        return new MIRLoadRecordPropertySetGuard(jparsesinfo(jobj.sinfo), MIRArgument.jparse(jobj.arg), jobj.arglayouttype, jobj.argflowtype, jobj.pname, jobj.isvirtual, jobj.resulttype, MIRRegisterArgument.jparse(jobj.trgt), MIRGuard.jparse(jobj.guard));
    }
}
exports.MIRLoadRecordPropertySetGuard = MIRLoadRecordPropertySetGuard;
class MIRLoadField extends MIROp {
    constructor(sinfo, arg, arglayouttype, argflowtype, field, isvirtual, resulttype, trgt) {
        super(MIROpTag.MIRLoadField, sinfo);
        this.trgt = trgt;
        this.arg = arg;
        this.arglayouttype = arglayouttype;
        this.argflowtype = argflowtype;
        this.field = field;
        this.isvirtual = isvirtual;
        this.resulttype = resulttype;
    }
    getUsedVars() { return varsOnlyHelper([this.arg]); }
    getModVars() { return [this.trgt]; }
    stringify() {
        return `${this.trgt.stringify()} = ${this.arg.stringify()}.${this.field}`;
    }
    jemit() {
        return { ...this.jbemit(), trgt: this.trgt.jemit(), arg: this.arg.jemit(), arglayouttype: this.arglayouttype, argflowtype: this.argflowtype, field: this.field, isvirtual: this.isvirtual, resulttype: this.resulttype };
    }
    static jparse(jobj) {
        return new MIRLoadField(jparsesinfo(jobj.sinfo), MIRArgument.jparse(jobj.arg), jobj.arglayouttype, jobj.argflowtype, jobj.field, jobj.isvirtual, jobj.resulttype, MIRRegisterArgument.jparse(jobj.trgt));
    }
}
exports.MIRLoadField = MIRLoadField;
class MIRTupleProjectToEphemeral extends MIROp {
    constructor(sinfo, arg, arglayouttype, argflowtype, indecies, isvirtual, epht, trgt) {
        super(MIROpTag.MIRTupleProjectToEphemeral, sinfo);
        this.trgt = trgt;
        this.arg = arg;
        this.arglayouttype = arglayouttype;
        this.argflowtype = argflowtype;
        this.indecies = indecies;
        this.isvirtual = isvirtual;
        this.epht = epht;
    }
    getUsedVars() { return varsOnlyHelper([this.arg]); }
    getModVars() { return [this.trgt]; }
    stringify() {
        const idx = this.indecies.map((i) => `${i}`);
        return `${this.trgt.stringify()} = ${this.arg.stringify()}.(|${idx.join(", ")}|)`;
    }
    jemit() {
        return { ...this.jbemit(), trgt: this.trgt.jemit(), arg: this.arg.jemit(), arglayouttype: this.arglayouttype, argflowtype: this.argflowtype, indecies: this.indecies, isvirtual: this.isvirtual, epht: this.epht };
    }
    static jparse(jobj) {
        return new MIRTupleProjectToEphemeral(jparsesinfo(jobj.sinfo), MIRArgument.jparse(jobj.arg), jobj.arglayouttype, jobj.argflowtype, jobj.indecies, jobj.isvirtual, jobj.epht, MIRRegisterArgument.jparse(jobj.trgt));
    }
}
exports.MIRTupleProjectToEphemeral = MIRTupleProjectToEphemeral;
class MIRRecordProjectToEphemeral extends MIROp {
    constructor(sinfo, arg, arglayouttype, argflowtype, properties, isvirtual, epht, trgt) {
        super(MIROpTag.MIRRecordProjectToEphemeral, sinfo);
        this.trgt = trgt;
        this.arg = arg;
        this.arglayouttype = arglayouttype;
        this.argflowtype = argflowtype;
        this.properties = properties;
        this.isvirtual = isvirtual;
        this.epht = epht;
    }
    getUsedVars() { return varsOnlyHelper([this.arg]); }
    getModVars() { return [this.trgt]; }
    stringify() {
        return `${this.trgt.stringify()} = ${this.arg.stringify()}.(|${this.properties.join(", ")}|)`;
    }
    jemit() {
        return { ...this.jbemit(), trgt: this.trgt.jemit(), arg: this.arg.jemit(), arglayouttype: this.arglayouttype, argflowtype: this.argflowtype, properties: this.properties, isvirtual: this.isvirtual, epht: this.epht };
    }
    static jparse(jobj) {
        return new MIRRecordProjectToEphemeral(jparsesinfo(jobj.sinfo), MIRArgument.jparse(jobj.arg), jobj.arglayouttype, jobj.argflowtype, jobj.properties, jobj.isvirtual, jobj.epht, MIRRegisterArgument.jparse(jobj.trgt));
    }
}
exports.MIRRecordProjectToEphemeral = MIRRecordProjectToEphemeral;
class MIREntityProjectToEphemeral extends MIROp {
    constructor(sinfo, arg, arglayouttype, argflowtype, fields, isvirtual, epht, trgt) {
        super(MIROpTag.MIREntityProjectToEphemeral, sinfo);
        this.trgt = trgt;
        this.arg = arg;
        this.arglayouttype = arglayouttype;
        this.argflowtype = argflowtype;
        this.fields = fields;
        this.isvirtual = isvirtual;
        this.epht = epht;
    }
    getUsedVars() { return varsOnlyHelper([this.arg]); }
    getModVars() { return [this.trgt]; }
    stringify() {
        return `${this.trgt.stringify()} = ${this.arg.stringify()}.(|${this.fields.join(", ")}|)`;
    }
    jemit() {
        return { ...this.jbemit(), trgt: this.trgt.jemit(), arg: this.arg.jemit(), arglayouttype: this.arglayouttype, argflowtype: this.argflowtype, fields: this.fields, isvirtual: this.isvirtual, epht: this.epht };
    }
    static jparse(jobj) {
        return new MIREntityProjectToEphemeral(jparsesinfo(jobj.sinfo), MIRArgument.jparse(jobj.arg), jobj.arglayouttype, jobj.argflowtype, jobj.fields, jobj.isvirtual, jobj.epht, MIRRegisterArgument.jparse(jobj.trgt));
    }
}
exports.MIREntityProjectToEphemeral = MIREntityProjectToEphemeral;
class MIRTupleUpdate extends MIROp {
    constructor(sinfo, arg, arglayouttype, argflowtype, updates, isvirtual, trgt) {
        super(MIROpTag.MIRTupleUpdate, sinfo);
        this.trgt = trgt;
        this.arg = arg;
        this.arglayouttype = arglayouttype;
        this.argflowtype = argflowtype;
        this.updates = updates;
        this.isvirtual = isvirtual;
    }
    getUsedVars() { return varsOnlyHelper([this.arg, ...this.updates.map((upd) => upd[1])]); }
    getModVars() { return [this.trgt]; }
    stringify() {
        const upds = this.updates.map((upd) => `${upd[0]}=${upd[1].stringify()}`);
        return `${this.trgt.stringify()} = ${this.arg.stringify()}.[${upds.join(", ")}]`;
    }
    jemit() {
        const upds = this.updates.map((upd) => [upd[0], upd[1].jemit(), upd[2]]);
        return { ...this.jbemit(), trgt: this.trgt.jemit(), arg: this.arg.jemit(), arglayouttype: this.arglayouttype, argflowtype: this.argflowtype, updates: upds, isvirtual: this.isvirtual };
    }
    static jparse(jobj) {
        const upds = jobj.updates.map((upd) => [upd[0], MIRArgument.jparse(upd[1]), upd[2]]);
        return new MIRTupleUpdate(jparsesinfo(jobj.sinfo), MIRArgument.jparse(jobj.arg), jobj.arglayouttype, jobj.argflowtype, upds, jobj.isvirtual, MIRRegisterArgument.jparse(jobj.trgt));
    }
}
exports.MIRTupleUpdate = MIRTupleUpdate;
class MIRRecordUpdate extends MIROp {
    constructor(sinfo, arg, arglayouttype, argflowtype, updates, isvirtual, trgt) {
        super(MIROpTag.MIRRecordUpdate, sinfo);
        this.trgt = trgt;
        this.arg = arg;
        this.arglayouttype = arglayouttype;
        this.argflowtype = argflowtype;
        this.updates = updates;
        this.isvirtual = isvirtual;
    }
    getUsedVars() { return varsOnlyHelper([this.arg, ...this.updates.map((upd) => upd[1])]); }
    getModVars() { return [this.trgt]; }
    stringify() {
        const upds = this.updates.map((upd) => `${upd[0]}=${upd[1].stringify()}`);
        return `${this.trgt.stringify()} = ${this.arg.stringify()}.{${upds.join(", ")}}`;
    }
    jemit() {
        const upds = this.updates.map((upd) => [upd[0], upd[1].jemit(), upd[2]]);
        return { ...this.jbemit(), trgt: this.trgt.jemit(), arg: this.arg.jemit(), arglayouttype: this.arglayouttype, argflowtype: this.argflowtype, updates: upds, isvirtual: this.isvirtual };
    }
    static jparse(jobj) {
        const upds = jobj.updates.map((upd) => [upd[0], MIRArgument.jparse(upd[1]), upd[2]]);
        return new MIRRecordUpdate(jparsesinfo(jobj.sinfo), MIRArgument.jparse(jobj.arg), jobj.arglayouttype, jobj.argflowtype, upds, jobj.isvirtual, MIRRegisterArgument.jparse(jobj.trgt));
    }
}
exports.MIRRecordUpdate = MIRRecordUpdate;
class MIREntityUpdate extends MIROp {
    constructor(sinfo, arg, arglayouttype, argflowtype, updates, isvirtual, trgt) {
        super(MIROpTag.MIREntityUpdate, sinfo);
        this.trgt = trgt;
        this.arg = arg;
        this.arglayouttype = arglayouttype;
        this.argflowtype = argflowtype;
        this.updates = updates;
        this.isvirtual = isvirtual;
    }
    getUsedVars() { return varsOnlyHelper([this.arg, ...this.updates.map((upd) => upd[1])]); }
    getModVars() { return [this.trgt]; }
    stringify() {
        const upds = this.updates.map((upd) => `${upd[0]}=${upd[1].stringify()}`);
        return `${this.trgt.stringify()} = ${this.arg.stringify()}.{${upds.join(", ")}}`;
    }
    jemit() {
        const upds = this.updates.map((upd) => [upd[0], upd[1].jemit(), upd[2]]);
        return { ...this.jbemit(), trgt: this.trgt.jemit(), arg: this.arg.jemit(), arglayouttype: this.arglayouttype, argflowtype: this.argflowtype, updates: upds, isvirtual: this.isvirtual };
    }
    static jparse(jobj) {
        const upds = jobj.updates.map((upd) => [upd[0], MIRArgument.jparse(upd[1]), upd[2]]);
        return new MIREntityUpdate(jparsesinfo(jobj.sinfo), MIRArgument.jparse(jobj.arg), jobj.arglayouttype, jobj.argflowtype, upds, jobj.isvirtual, MIRRegisterArgument.jparse(jobj.trgt));
    }
}
exports.MIREntityUpdate = MIREntityUpdate;
class MIRLoadFromEpehmeralList extends MIROp {
    constructor(sinfo, arg, argtype, idx, resulttype, trgt) {
        super(MIROpTag.MIRLoadFromEpehmeralList, sinfo);
        this.trgt = trgt;
        this.arg = arg;
        this.argtype = argtype;
        this.idx = idx;
        this.resulttype = resulttype;
    }
    getUsedVars() { return varsOnlyHelper([this.arg]); }
    getModVars() { return [this.trgt]; }
    stringify() {
        return `${this.trgt.stringify()} = ${this.arg.stringify()}(|${this.idx}|)`;
    }
    jemit() {
        return { ...this.jbemit(), trgt: this.trgt.jemit(), arg: this.arg.jemit(), argtype: this.argtype, idx: this.idx, resulttype: this.resulttype };
    }
    static jparse(jobj) {
        return new MIRLoadFromEpehmeralList(jparsesinfo(jobj.sinfo), MIRArgument.jparse(jobj.arg), jobj.argtype, jobj.idx, jobj.resulttype, MIRRegisterArgument.jparse(jobj.trgt));
    }
}
exports.MIRLoadFromEpehmeralList = MIRLoadFromEpehmeralList;
class MIRMultiLoadFromEpehmeralList extends MIROp {
    constructor(sinfo, arg, argtype, trgts) {
        super(MIROpTag.MIRMultiLoadFromEpehmeralList, sinfo);
        this.trgts = trgts;
        this.arg = arg;
        this.argtype = argtype;
    }
    getUsedVars() { return varsOnlyHelper([this.arg]); }
    getModVars() { return this.trgts.map((trgt) => trgt.into); }
    stringify() {
        const lhs = this.trgts.map((trgt) => trgt.into.stringify());
        const ops = this.trgts.map((trgt) => trgt.pos);
        return `${lhs.join(", ")} = ${this.arg.stringify()}(|${ops.join(", ")}|)`;
    }
    jemit() {
        const etrgts = this.trgts.map((trgt) => {
            return { pos: trgt.pos, into: trgt.into.jemit(), oftype: trgt.oftype };
        });
        return { ...this.jbemit(), trgts: etrgts, arg: this.arg.jemit(), argtype: this.argtype };
    }
    static jparse(jobj) {
        const etrgts = jobj.etrgts.map((trgt) => {
            return { pos: trgt.pos, into: MIRRegisterArgument.jparse(trgt.into), oftype: trgt.oftype };
        });
        return new MIRMultiLoadFromEpehmeralList(jparsesinfo(jobj.sinfo), MIRArgument.jparse(jobj.arg), jobj.argtype, etrgts);
    }
}
exports.MIRMultiLoadFromEpehmeralList = MIRMultiLoadFromEpehmeralList;
class MIRSliceEpehmeralList extends MIROp {
    constructor(sinfo, arg, argtype, sltype, trgt) {
        super(MIROpTag.MIRSliceEpehmeralList, sinfo);
        this.trgt = trgt;
        this.arg = arg;
        this.argtype = argtype;
        this.sltype = sltype;
    }
    getUsedVars() { return varsOnlyHelper([this.arg]); }
    getModVars() { return [this.trgt]; }
    stringify() {
        return `${this.trgt.stringify()} = ${this.arg.stringify()}(|${this.sltype}|)`;
    }
    jemit() {
        return { ...this.jbemit(), arg: this.arg.jemit(), argtype: this.argtype, sltype: this.sltype, trgt: this.trgt.jemit() };
    }
    static jparse(jobj) {
        return new MIRSliceEpehmeralList(jparsesinfo(jobj.sinfo), MIRArgument.jparse(jobj.src), jobj.argtype, jobj.sltype, MIRRegisterArgument.jparse(jobj.trgt));
    }
}
exports.MIRSliceEpehmeralList = MIRSliceEpehmeralList;
class MIRInvokeFixedFunction extends MIROp {
    constructor(sinfo, resultType, mkey, args, optmask, trgt, sguard) {
        super(MIROpTag.MIRInvokeFixedFunction, sinfo);
        this.trgt = trgt;
        this.resultType = resultType;
        this.mkey = mkey;
        this.args = args;
        this.optmask = optmask;
        this.sguard = sguard;
    }
    getUsedVars() { return varsOnlyHelper(this.sguard !== undefined ? [...this.sguard.getUsedVars(), ...this.args] : [...this.args]); }
    getModVars() { return [this.trgt]; }
    stringify() {
        const gstring = this.sguard !== undefined ? ` | ${this.sguard.stringify()}` : "";
        const oinfo = this.optmask !== undefined ? `, ${this.optmask}` : "";
        return `${this.trgt.stringify()} = ${this.mkey}::(${this.args.map((arg) => arg.stringify()).join(", ")}${oinfo})${gstring}`;
    }
    jemit() {
        return { ...this.jbemit(), trgt: this.trgt.jemit(), resultType: this.resultType, mkey: this.mkey, args: this.args.map((arg) => arg.jemit()), optmask: this.optmask, sguard: this.sguard !== undefined ? this.sguard.jemit() : undefined };
    }
    static jparse(jobj) {
        return new MIRInvokeFixedFunction(jparsesinfo(jobj.sinfo), jobj.resultType, jobj.mkey, jobj.args.map((arg) => MIRArgument.jparse(arg)), jobj.optmask, MIRRegisterArgument.jparse(jobj.trgt), jobj.sguard !== undefined ? MIRStatmentGuard.jparse(jobj.sguard) : undefined);
    }
}
exports.MIRInvokeFixedFunction = MIRInvokeFixedFunction;
class MIRInvokeVirtualFunction extends MIROp {
    constructor(sinfo, resultType, vresolve, shortname, rcvrlayouttype, rcvrflowtype, args, optmask, trgt) {
        super(MIROpTag.MIRInvokeVirtualFunction, sinfo);
        this.trgt = trgt;
        this.resultType = resultType;
        this.vresolve = vresolve;
        this.shortname = shortname;
        this.rcvrlayouttype = rcvrlayouttype;
        this.rcvrflowtype = rcvrflowtype;
        this.args = args;
        this.optmask = optmask;
    }
    getUsedVars() { return varsOnlyHelper([...this.args]); }
    getModVars() { return [this.trgt]; }
    stringify() {
        return `${this.trgt.stringify()} = ${this.args[0].stringify()}.${this.vresolve}(${[...this.args].slice(1).map((arg) => arg.stringify()).join(", ")})`;
    }
    jemit() {
        return { ...this.jbemit(), trgt: this.trgt.jemit(), resultType: this.resultType, vresolve: this.vresolve, shortname: this.shortname, rcvrlayouttype: this.rcvrlayouttype, rcvrflowtype: this.rcvrflowtype, args: this.args.map((arg) => arg.jemit()), optmask: this.optmask };
    }
    static jparse(jobj) {
        return new MIRInvokeVirtualFunction(jparsesinfo(jobj.sinfo), jobj.resultType, jobj.vresolve, jobj.shortname, jobj.rcvrlayouttype, jobj.rcvrflowtype, jobj.args.map((arg) => MIRArgument.jparse(arg)), jobj.optmask, MIRRegisterArgument.jparse(jobj.trgt));
    }
}
exports.MIRInvokeVirtualFunction = MIRInvokeVirtualFunction;
class MIRInvokeVirtualOperator extends MIROp {
    constructor(sinfo, resultType, vresolve, shortname, args, trgt) {
        super(MIROpTag.MIRInvokeVirtualOperator, sinfo);
        this.trgt = trgt;
        this.resultType = resultType;
        this.vresolve = vresolve;
        this.shortname = shortname;
        this.args = args;
    }
    getUsedVars() { return varsOnlyHelper([...this.args.map((arg) => arg.arg)]); }
    getModVars() { return [this.trgt]; }
    stringify() {
        return `${this.trgt.stringify()} = ${this.vresolve}(${this.args.map((arg) => arg.arg.stringify()).join(", ")})`;
    }
    jemit() {
        const eargs = this.args.map((arg) => {
            return { arglayouttype: arg.arglayouttype, argflowtype: arg.argflowtype, arg: arg.arg.jemit() };
        });
        return { ...this.jbemit(), trgt: this.trgt.jemit(), resultType: this.resultType, vresolve: this.vresolve, shortname: this.shortname, args: eargs };
    }
    static jparse(jobj) {
        const eargs = jobj.args.map((arg) => {
            return { arglayouttype: arg.arglayouttype, argflowtype: arg.argflowtype, arg: MIRArgument.jparse(arg.arg) };
        });
        return new MIRInvokeVirtualOperator(jparsesinfo(jobj.sinfo), jobj.resultType, jobj.vresolve, jobj.shortname, eargs, MIRRegisterArgument.jparse(jobj.trgt));
    }
}
exports.MIRInvokeVirtualOperator = MIRInvokeVirtualOperator;
class MIRConstructorTuple extends MIROp {
    constructor(sinfo, resultTupleType, args, trgt) {
        super(MIROpTag.MIRConstructorTuple, sinfo);
        this.trgt = trgt;
        this.resultTupleType = resultTupleType;
        this.args = args;
    }
    getUsedVars() { return varsOnlyHelper([...this.args]); }
    getModVars() { return [this.trgt]; }
    stringify() {
        return `${this.trgt.stringify()} = [${this.args.map((arg) => arg.stringify()).join(", ")}]`;
    }
    jemit() {
        return { ...this.jbemit(), trgt: this.trgt.jemit(), resultTupleType: this.resultTupleType, args: this.args.map((arg) => arg.jemit()) };
    }
    static jparse(jobj) {
        return new MIRConstructorTuple(jparsesinfo(jobj.sinfo), jobj.resultTupleType, jobj.args.map((jarg) => MIRArgument.jparse(jarg)), MIRRegisterArgument.jparse(jobj.trgt));
    }
}
exports.MIRConstructorTuple = MIRConstructorTuple;
class MIRConstructorTupleFromEphemeralList extends MIROp {
    constructor(sinfo, resultTupleType, arg, elistType, trgt) {
        super(MIROpTag.MIRConstructorTupleFromEphemeralList, sinfo);
        this.trgt = trgt;
        this.resultTupleType = resultTupleType;
        this.arg = arg;
        this.elistType = elistType;
    }
    getUsedVars() { return varsOnlyHelper([this.arg]); }
    getModVars() { return [this.trgt]; }
    stringify() {
        return `${this.trgt.stringify()} = [...${this.arg.stringify()}]`;
    }
    jemit() {
        return { ...this.jbemit(), trgt: this.trgt.jemit(), resultTupleType: this.resultTupleType, arg: this.arg.jemit(), elistType: this.elistType };
    }
    static jparse(jobj) {
        return new MIRConstructorTupleFromEphemeralList(jparsesinfo(jobj.sinfo), jobj.resultTupleType, MIRArgument.jparse(jobj.arg), jobj.elistType, MIRRegisterArgument.jparse(jobj.trgt));
    }
}
exports.MIRConstructorTupleFromEphemeralList = MIRConstructorTupleFromEphemeralList;
class MIRConstructorRecord extends MIROp {
    constructor(sinfo, resultRecordType, args, trgt) {
        super(MIROpTag.MIRConstructorRecord, sinfo);
        this.trgt = trgt;
        this.resultRecordType = resultRecordType;
        this.args = args;
    }
    getUsedVars() { return varsOnlyHelper(this.args.map((tv) => tv[1])); }
    getModVars() { return [this.trgt]; }
    stringify() {
        return `${this.trgt.stringify()} = {${this.args.map((arg) => `${arg[0]}=${arg[1].stringify()}`).join(", ")}}`;
    }
    jemit() {
        return { ...this.jbemit(), trgt: this.trgt, resultRecordType: this.resultRecordType, args: this.args.map((arg) => [arg[0], arg[1].jemit()]) };
    }
    static jparse(jobj) {
        return new MIRConstructorRecord(jparsesinfo(jobj.sinfo), jobj.resultRecordType, jobj.args.map((jarg) => [jarg[0], MIRArgument.jparse(jarg[1])]), MIRRegisterArgument.jparse(jobj.trgt));
    }
}
exports.MIRConstructorRecord = MIRConstructorRecord;
class MIRConstructorRecordFromEphemeralList extends MIROp {
    constructor(sinfo, resultRecordType, arg, elistType, propertyPositions, trgt) {
        super(MIROpTag.MIRConstructorRecordFromEphemeralList, sinfo);
        this.trgt = trgt;
        this.resultRecordType = resultRecordType;
        this.arg = arg;
        this.elistType = elistType;
        this.propertyPositions = propertyPositions;
    }
    getUsedVars() { return varsOnlyHelper([this.arg]); }
    getModVars() { return [this.trgt]; }
    stringify() {
        return `${this.trgt.stringify()} = {...${this.arg.stringify()}}`;
    }
    jemit() {
        return { ...this.jbemit(), trgt: this.trgt, resultRecordType: this.resultRecordType, arg: this.arg.jemit(), elistType: this.elistType, propertyPositions: this.propertyPositions };
    }
    static jparse(jobj) {
        return new MIRConstructorRecordFromEphemeralList(jparsesinfo(jobj.sinfo), jobj.resultRecordType, MIRArgument.jparse(jobj.arg), jobj.elistType, jobj.propertyPositions, MIRRegisterArgument.jparse(jobj.trgt));
    }
}
exports.MIRConstructorRecordFromEphemeralList = MIRConstructorRecordFromEphemeralList;
class MIRStructuredAppendTuple extends MIROp {
    constructor(sinfo, resultTupleType, args, ttypes, trgt) {
        super(MIROpTag.MIRStructuredAppendTuple, sinfo);
        this.trgt = trgt;
        this.resultTupleType = resultTupleType;
        this.args = args;
        this.ttypes = ttypes;
    }
    getUsedVars() { return varsOnlyHelper(this.args); }
    getModVars() { return [this.trgt]; }
    stringify() {
        return `${this.trgt.stringify()} = [${this.args.map((arg) => "..." + arg.stringify()).join(", ")}]`;
    }
    jemit() {
        return { ...this.jbemit(), trgt: this.trgt, resultTupleType: this.resultTupleType, args: this.args.map((arg) => arg.jemit()), ttypes: this.ttypes };
    }
    static jparse(jobj) {
        return new MIRStructuredAppendTuple(jparsesinfo(jobj.sinfo), jobj.resultTupleType, jobj.args.map((jarg) => MIRArgument.jparse(jarg)), jobj.ttypes, MIRRegisterArgument.jparse(jobj.trgt));
    }
}
exports.MIRStructuredAppendTuple = MIRStructuredAppendTuple;
class MIRStructuredJoinRecord extends MIROp {
    constructor(sinfo, resultRecordType, args, ttypes, trgt) {
        super(MIROpTag.MIRStructuredJoinRecord, sinfo);
        this.trgt = trgt;
        this.resultRecordType = resultRecordType;
        this.args = args;
        this.ttypes = ttypes;
    }
    getUsedVars() { return varsOnlyHelper(this.args); }
    getModVars() { return [this.trgt]; }
    stringify() {
        return `${this.trgt.stringify()} = [${this.args.map((arg) => "..." + arg.stringify()).join(", ")}]`;
    }
    jemit() {
        return { ...this.jbemit(), trgt: this.trgt, resultRecordType: this.resultRecordType, args: this.args.map((arg) => arg.jemit()), ttypes: this.ttypes };
    }
    static jparse(jobj) {
        return new MIRStructuredJoinRecord(jparsesinfo(jobj.sinfo), jobj.resultRecordType, jobj.args.map((jarg) => MIRArgument.jparse(jarg)), jobj.ttypes, MIRRegisterArgument.jparse(jobj.trgt));
    }
}
exports.MIRStructuredJoinRecord = MIRStructuredJoinRecord;
class MIRConstructorEphemeralList extends MIROp {
    constructor(sinfo, resultEphemeralListType, args, trgt) {
        super(MIROpTag.MIRConstructorEphemeralList, sinfo);
        this.trgt = trgt;
        this.resultEphemeralListType = resultEphemeralListType;
        this.args = args;
    }
    getUsedVars() { return varsOnlyHelper([...this.args]); }
    getModVars() { return [this.trgt]; }
    stringify() {
        return `${this.trgt.stringify()} = [${this.args.map((arg) => arg.stringify()).join(", ")}]`;
    }
    jemit() {
        return { ...this.jbemit(), trgt: this.trgt.jemit(), resultEphemeralListType: this.resultEphemeralListType, args: this.args.map((arg) => arg.jemit()) };
    }
    static jparse(jobj) {
        return new MIRConstructorEphemeralList(jparsesinfo(jobj.sinfo), jobj.resultEphemeralListType, jobj.args.map((jarg) => MIRArgument.jparse(jarg)), MIRRegisterArgument.jparse(jobj.trgt));
    }
}
exports.MIRConstructorEphemeralList = MIRConstructorEphemeralList;
class MIREphemeralListExtend extends MIROp {
    constructor(sinfo, arg, argtype, ext, resultType, trgt) {
        super(MIROpTag.MIREphemeralListExtend, sinfo);
        this.trgt = trgt;
        this.arg = arg;
        this.argtype = argtype;
        this.ext = ext;
        this.resultType = resultType;
    }
    getUsedVars() { return varsOnlyHelper([this.arg, ...this.ext]); }
    getModVars() { return [this.trgt]; }
    stringify() {
        return `${this.trgt.stringify()} = ${this.resultType}@(|...${this.arg.stringify()}, ${this.ext.map((e) => e.stringify()).join(", ")}|)`;
    }
    jemit() {
        return { ...this.jbemit(), trgt: this.trgt.jemit(), arg: this.arg.jemit(), argtype: this.argtype, ext: this.ext.map((e) => e.jemit()), resultType: this.resultType };
    }
    static jparse(jobj) {
        return new MIREphemeralListExtend(jparsesinfo(jobj.sinfo), MIRArgument.jparse(jobj.arg), jobj.argtype, jobj.ext.map((e) => MIRArgument.jparse(e)), jobj.resultType, MIRRegisterArgument.jparse(jobj.trgt));
    }
}
exports.MIREphemeralListExtend = MIREphemeralListExtend;
class MIRConstructorPrimaryCollectionEmpty extends MIROp {
    constructor(sinfo, tkey, trgt) {
        super(MIROpTag.MIRConstructorPrimaryCollectionEmpty, sinfo);
        this.trgt = trgt;
        this.tkey = tkey;
    }
    getUsedVars() { return []; }
    getModVars() { return [this.trgt]; }
    stringify() {
        return `${this.trgt.stringify()} = ${this.tkey}{}`;
    }
    jemit() {
        return { ...this.jbemit(), trgt: this.trgt.jemit(), tkey: this.tkey };
    }
    static jparse(jobj) {
        return new MIRConstructorPrimaryCollectionEmpty(jparsesinfo(jobj.sinfo), jobj.tkey, MIRRegisterArgument.jparse(jobj.trgt));
    }
}
exports.MIRConstructorPrimaryCollectionEmpty = MIRConstructorPrimaryCollectionEmpty;
class MIRConstructorPrimaryCollectionSingletons extends MIROp {
    constructor(sinfo, tkey, args, trgt) {
        super(MIROpTag.MIRConstructorPrimaryCollectionSingletons, sinfo);
        this.trgt = trgt;
        this.tkey = tkey;
        this.args = args;
    }
    getUsedVars() { return varsOnlyHelper([...this.args.map((arg) => arg[1])]); }
    getModVars() { return [this.trgt]; }
    stringify() {
        return `${this.trgt.stringify()} = ${this.tkey}{${this.args.map((arg) => arg[1].stringify()).join(", ")}}`;
    }
    jemit() {
        return { ...this.jbemit(), trgt: this.trgt.jemit(), tkey: this.tkey, args: this.args.map((arg) => [arg[0], arg[1].jemit()]) };
    }
    static jparse(jobj) {
        return new MIRConstructorPrimaryCollectionSingletons(jparsesinfo(jobj.sinfo), jobj.tkey, jobj.args.map((jarg) => [jarg[0], MIRArgument.jparse(jarg[1])]), MIRRegisterArgument.jparse(jobj.trgt));
    }
}
exports.MIRConstructorPrimaryCollectionSingletons = MIRConstructorPrimaryCollectionSingletons;
class MIRConstructorPrimaryCollectionCopies extends MIROp {
    constructor(sinfo, tkey, args, trgt) {
        super(MIROpTag.MIRConstructorPrimaryCollectionCopies, sinfo);
        this.trgt = trgt;
        this.tkey = tkey;
        this.args = args;
    }
    getUsedVars() { return varsOnlyHelper([...this.args.map((arg) => arg[1])]); }
    getModVars() { return [this.trgt]; }
    canRaise(implicitAssumesEnabled) {
        //on map we fail on duplicate keys
        return true;
    }
    stringify() {
        return `${this.trgt.stringify()} = ${this.tkey}{${this.args.map((arg) => `expand(${arg[1].stringify()})`).join(", ")}`;
    }
    jemit() {
        return { ...this.jbemit(), trgt: this.trgt.jemit(), tkey: this.tkey, args: this.args.map((arg) => [arg[0], arg[1].jemit()]) };
    }
    static jparse(jobj) {
        return new MIRConstructorPrimaryCollectionCopies(jparsesinfo(jobj.sinfo), jobj.tkey, jobj.args.map((jarg) => [jarg[0], MIRArgument.jparse(jarg[1])]), MIRRegisterArgument.jparse(jobj.trgt));
    }
}
exports.MIRConstructorPrimaryCollectionCopies = MIRConstructorPrimaryCollectionCopies;
class MIRConstructorPrimaryCollectionMixed extends MIROp {
    constructor(sinfo, tkey, args, trgt) {
        super(MIROpTag.MIRConstructorPrimaryCollectionMixed, sinfo);
        this.trgt = trgt;
        this.tkey = tkey;
        this.args = args;
    }
    getUsedVars() { return varsOnlyHelper(this.args.map((tv) => tv[2])); }
    getModVars() { return [this.trgt]; }
    stringify() {
        return `${this.trgt.stringify()} = ${this.tkey}{${this.args.map((arg) => arg[0] ? `expand(${arg[2].stringify()})` : arg[2].stringify()).join(", ")}`;
    }
    canRaise(implicitAssumesEnabled) {
        //on map we fail on duplicate keys
        return true;
    }
    jemit() {
        return { ...this.jbemit(), trgt: this.trgt.jemit(), tkey: this.tkey, args: this.args.map((arg) => [arg[0], arg[1], arg[2].jemit()]) };
    }
    static jparse(jobj) {
        return new MIRConstructorPrimaryCollectionMixed(jparsesinfo(jobj.sinfo), jobj.tkey, jobj.args.map((jarg) => [jarg[0], jarg[1], MIRArgument.jparse(jarg[2])]), MIRRegisterArgument.jparse(jobj.trgt));
    }
}
exports.MIRConstructorPrimaryCollectionMixed = MIRConstructorPrimaryCollectionMixed;
class MIRBinKeyEq extends MIROp {
    constructor(sinfo, lhslayouttype, lhs, rhslayouttype, rhs, cmptype, trgt, sguard, lhsflowtype, rhsflowtype) {
        super(MIROpTag.MIRBinKeyEq, sinfo);
        this.trgt = trgt;
        this.cmptype = cmptype;
        this.lhslayouttype = lhslayouttype;
        this.lhs = lhs;
        this.rhslayouttype = rhslayouttype;
        this.rhs = rhs;
        this.sguard = sguard;
        this.lhsflowtype = lhsflowtype;
        this.rhsflowtype = rhsflowtype;
    }
    getUsedVars() { return varsOnlyHelper(this.sguard !== undefined ? [this.lhs, this.rhs, ...this.sguard.getUsedVars()] : [this.lhs, this.rhs]); }
    getModVars() { return [this.trgt]; }
    stringify() {
        const gstring = this.sguard !== undefined ? ` | ${this.sguard.stringify()}` : "";
        return `${this.trgt.stringify()} = ${this.lhs.stringify()} Key== ${this.rhs.stringify()}${gstring}`;
    }
    jemit() {
        return { ...this.jbemit(), trgt: this.trgt.jemit(), cmptype: this.cmptype, lhslayouttype: this.lhslayouttype, lhs: this.lhs.jemit(), rhslayouttype: this.rhslayouttype, rhs: this.rhs.jemit(), sguard: this.sguard !== undefined ? this.sguard.jemit() : undefined, lhsflowtype: this.lhsflowtype, rhsflowtype: this.rhsflowtype };
    }
    static jparse(jobj) {
        return new MIRBinKeyEq(jparsesinfo(jobj.sinfo), jobj.lhslayouttype, MIRArgument.jparse(jobj.lhs), jobj.rhslayouttype, MIRArgument.jparse(jobj.rhs), jobj.cmptype, MIRRegisterArgument.jparse(jobj.trgt), jobj.sguard !== undefined ? MIRStatmentGuard.jparse(jobj.sguard) : undefined, jobj.lhsflowtype, jobj.rhsflowtype);
    }
}
exports.MIRBinKeyEq = MIRBinKeyEq;
class MIRBinKeyLess extends MIROp {
    constructor(sinfo, lhslayouttype, lhs, rhslayouttype, rhs, cmptype, trgt, sguard, lhsflowtype, rhsflowtype) {
        super(MIROpTag.MIRBinKeyLess, sinfo);
        this.trgt = trgt;
        this.cmptype = cmptype;
        this.lhslayouttype = lhslayouttype;
        this.lhs = lhs;
        this.rhslayouttype = rhslayouttype;
        this.rhs = rhs;
        this.sguard = sguard;
        this.lhsflowtype = lhsflowtype;
        this.rhsflowtype = rhsflowtype;
    }
    getUsedVars() { return varsOnlyHelper(this.sguard !== undefined ? [this.lhs, this.rhs, ...this.sguard.getUsedVars()] : [this.lhs, this.rhs]); }
    getModVars() { return [this.trgt]; }
    stringify() {
        const gstring = this.sguard !== undefined ? ` | ${this.sguard.stringify()}` : "";
        return `${this.trgt.stringify()} = ${this.lhs.stringify()} Key< ${this.rhs.stringify()}${gstring}`;
    }
    jemit() {
        return { ...this.jbemit(), trgt: this.trgt.jemit(), cmptype: this.cmptype, lhslayouttype: this.lhslayouttype, lhs: this.lhs.jemit(), rhslayouttype: this.rhslayouttype, rhs: this.rhs.jemit(), sguard: this.sguard !== undefined ? this.sguard.jemit() : undefined, lhsflowtype: this.lhsflowtype, rhsflowtype: this.rhsflowtype };
    }
    static jparse(jobj) {
        return new MIRBinKeyLess(jparsesinfo(jobj.sinfo), jobj.lhslayouttype, MIRArgument.jparse(jobj.lhs), jobj.rhslayouttype, MIRArgument.jparse(jobj.rhs), jobj.cmptype, MIRRegisterArgument.jparse(jobj.trgt), jobj.sguard !== undefined ? MIRStatmentGuard.jparse(jobj.sguard) : undefined, jobj.lhsflowtype, jobj.rhsflowtype);
    }
}
exports.MIRBinKeyLess = MIRBinKeyLess;
class MIRPrefixNotOp extends MIROp {
    constructor(sinfo, arg, trgt) {
        super(MIROpTag.MIRPrefixNotOp, sinfo);
        this.trgt = trgt;
        this.arg = arg;
    }
    getUsedVars() { return varsOnlyHelper([this.arg]); }
    getModVars() { return [this.trgt]; }
    stringify() {
        return `${this.trgt.stringify()} = !${this.arg.stringify()}`;
    }
    jemit() {
        return { ...this.jbemit(), trgt: this.trgt.jemit(), arg: this.arg.jemit() };
    }
    static jparse(jobj) {
        return new MIRPrefixNotOp(jparsesinfo(jobj.sinfo), MIRArgument.jparse(jobj.arg), MIRRegisterArgument.jparse(jobj.trgt));
    }
}
exports.MIRPrefixNotOp = MIRPrefixNotOp;
class MIRIsTypeOf extends MIROp {
    constructor(sinfo, trgt, chktype, src, srclayouttype, srcflowtype, sguard) {
        super(MIROpTag.MIRIsTypeOf, sinfo);
        this.trgt = trgt;
        this.chktype = chktype;
        this.arg = src;
        this.srclayouttype = srclayouttype;
        this.srcflowtype = srcflowtype;
        this.sguard = sguard;
    }
    getUsedVars() { return varsOnlyHelper(this.sguard !== undefined ? [this.arg, ...this.sguard.getUsedVars()] : [this.arg]); }
    getModVars() { return [this.trgt]; }
    stringify() {
        const gstring = this.sguard !== undefined ? ` | ${this.sguard.stringify()}` : "";
        return `${this.trgt.stringify()} = $isTypeOf(${this.arg.stringify()}, ${this.chktype})${gstring}`;
    }
    jemit() {
        return { ...this.jbemit(), trgt: this.trgt.jemit(), chktype: this.chktype, arg: this.arg.jemit(), srclayouttype: this.srclayouttype, srcflowtype: this.srcflowtype, sguard: this.sguard !== undefined ? this.sguard.jemit() : undefined };
    }
    static jparse(jobj) {
        return new MIRIsTypeOf(jparsesinfo(jobj.sinfo), MIRRegisterArgument.jparse(jobj.trgt), jobj.chktype, MIRArgument.jparse(jobj.arg), jobj.srclayouttype, jobj.srcflowtype, jobj.sguard !== undefined ? MIRStatmentGuard.jparse(jobj.sguard) : undefined);
    }
}
exports.MIRIsTypeOf = MIRIsTypeOf;
class MIRRegisterAssign extends MIROp {
    constructor(sinfo, src, trgt, layouttype, sguard) {
        super(MIROpTag.MIRRegisterAssign, sinfo);
        this.trgt = trgt;
        this.src = src;
        this.layouttype = layouttype;
        this.sguard = sguard;
    }
    getUsedVars() { return varsOnlyHelper(this.sguard !== undefined ? [this.src, ...this.sguard.getUsedVars()] : [this.src]); }
    getModVars() { return [this.trgt]; }
    stringify() {
        const gstring = this.sguard !== undefined ? ` | ${this.sguard.stringify()}` : "";
        return `${this.trgt.stringify()} = ${this.src.stringify()}${gstring}`;
    }
    jemit() {
        return { ...this.jbemit(), src: this.src.jemit(), layouttype: this.layouttype, trgt: this.trgt.jemit(), sguard: this.sguard !== undefined ? this.sguard.jemit() : undefined };
    }
    static jparse(jobj) {
        return new MIRRegisterAssign(jparsesinfo(jobj.sinfo), MIRArgument.jparse(jobj.src), MIRRegisterArgument.jparse(jobj.trgt), jobj.layouttype, jobj.sguard !== undefined ? MIRStatmentGuard.jparse(jobj.sguard) : undefined);
    }
}
exports.MIRRegisterAssign = MIRRegisterAssign;
class MIRJump extends MIROp {
    constructor(sinfo, blck) {
        super(MIROpTag.MIRJump, sinfo);
        this.trgtblock = blck;
    }
    getUsedVars() { return []; }
    getModVars() { return []; }
    stringify() {
        return `jump ${this.trgtblock}`;
    }
    jemit() {
        return { ...this.jbemit(), trgtblock: this.trgtblock };
    }
    static jparse(jobj) {
        return new MIRJump(jparsesinfo(jobj.sinfo), jobj.trgtblock);
    }
}
exports.MIRJump = MIRJump;
class MIRJumpCond extends MIROp {
    constructor(sinfo, arg, trueblck, falseblck) {
        super(MIROpTag.MIRJumpCond, sinfo);
        this.arg = arg;
        this.trueblock = trueblck;
        this.falseblock = falseblck;
    }
    getUsedVars() { return varsOnlyHelper([this.arg]); }
    getModVars() { return []; }
    stringify() {
        return `cjump ${this.arg.stringify()} ${this.trueblock} ${this.falseblock}`;
    }
    jemit() {
        return { ...this.jbemit(), arg: this.arg.jemit(), trueblock: this.trueblock, falseblock: this.falseblock };
    }
    static jparse(jobj) {
        return new MIRJumpCond(jparsesinfo(jobj.sinfo), MIRArgument.jparse(jobj.arg), jobj.trueblock, jobj.falseblock);
    }
}
exports.MIRJumpCond = MIRJumpCond;
class MIRJumpNone extends MIROp {
    constructor(sinfo, arg, arglayouttype, noneblck, someblck) {
        super(MIROpTag.MIRJumpNone, sinfo);
        this.arg = arg;
        this.arglayouttype = arglayouttype;
        this.noneblock = noneblck;
        this.someblock = someblck;
    }
    getUsedVars() { return varsOnlyHelper([this.arg]); }
    getModVars() { return []; }
    stringify() {
        return `njump ${this.arg.stringify()} ${this.noneblock} ${this.someblock}`;
    }
    jemit() {
        return { ...this.jbemit(), arg: this.arg.jemit(), arglayouttype: this.arglayouttype, noneblock: this.noneblock, someblock: this.someblock };
    }
    static jparse(jobj) {
        return new MIRJumpNone(jparsesinfo(jobj.sinfo), MIRArgument.jparse(jobj.arg), jobj.arglayouttype, jobj.noneblock, jobj.someblock);
    }
}
exports.MIRJumpNone = MIRJumpNone;
class MIRReturnAssign extends MIROp {
    constructor(sinfo, src, oftype, name) {
        super(MIROpTag.MIRReturnAssign, sinfo);
        this.src = src;
        this.name = name || new MIRRegisterArgument("$__ir_ret__");
        this.oftype = oftype;
    }
    getUsedVars() { return varsOnlyHelper([this.src]); }
    getModVars() { return [this.name]; }
    stringify() {
        return `${this.name.stringify()} = ${this.src.stringify()}`;
    }
    jemit() {
        return { ...this.jbemit(), src: this.src.jemit(), oftype: this.oftype, name: this.name.jemit() };
    }
    static jparse(jobj) {
        return new MIRReturnAssign(jparsesinfo(jobj.sinfo), MIRArgument.jparse(jobj.src), jobj.oftype, MIRRegisterArgument.jparse(jobj.name));
    }
}
exports.MIRReturnAssign = MIRReturnAssign;
class MIRReturnAssignOfCons extends MIROp {
    constructor(sinfo, oftype, args, name) {
        super(MIROpTag.MIRReturnAssignOfCons, sinfo);
        this.oftype = oftype;
        this.args = args;
        this.name = name || new MIRRegisterArgument("$__ir_ret__");
    }
    getUsedVars() { return varsOnlyHelper(this.args); }
    getModVars() { return [this.name]; }
    stringify() {
        return `${this.name.stringify()} = ${this.oftype}(${this.args.map((arg) => arg.stringify()).join(", ")})`;
    }
    jemit() {
        return { ...this.jbemit(), oftype: this.oftype, args: this.args.map((arg) => arg.jemit()), name: this.name.jemit() };
    }
    static jparse(jobj) {
        return new MIRReturnAssignOfCons(jparsesinfo(jobj.sinfo), jobj.oftype, jobj.args.map((jarg) => MIRArgument.jparse(jarg)), MIRRegisterArgument.jparse(jobj.name));
    }
}
exports.MIRReturnAssignOfCons = MIRReturnAssignOfCons;
class MIRVarLifetimeStart extends MIROp {
    constructor(sinfo, name, rtype) {
        super(MIROpTag.MIRVarLifetimeStart, sinfo);
        this.name = name;
        this.rtype = rtype;
    }
    getUsedVars() { return []; }
    getModVars() { return []; }
    stringify() {
        return `v-begin ${this.name}`;
    }
    jemit() {
        return { ...this.jbemit(), name: this.name, rtype: this.rtype };
    }
    static jparse(jobj) {
        return new MIRVarLifetimeStart(jparsesinfo(jobj.sinfo), jobj.name, jobj.rtype);
    }
}
exports.MIRVarLifetimeStart = MIRVarLifetimeStart;
class MIRVarLifetimeEnd extends MIROp {
    constructor(sinfo, name) {
        super(MIROpTag.MIRVarLifetimeEnd, sinfo);
        this.name = name;
    }
    getUsedVars() { return []; }
    getModVars() { return []; }
    stringify() {
        return `v-end ${this.name}`;
    }
    jemit() {
        return { ...this.jbemit(), name: this.name };
    }
    static jparse(jobj) {
        return new MIRVarLifetimeEnd(jparsesinfo(jobj.sinfo), jobj.name);
    }
}
exports.MIRVarLifetimeEnd = MIRVarLifetimeEnd;
class MIRPhi extends MIROp {
    constructor(sinfo, src, layouttype, trgt) {
        super(MIROpTag.MIRPhi, sinfo);
        this.src = src;
        this.trgt = trgt;
        this.layouttype = layouttype;
    }
    getUsedVars() {
        let phis = [];
        this.src.forEach((v) => phis.push(v));
        return phis;
    }
    getModVars() { return [this.trgt]; }
    stringify() {
        let phis = [];
        this.src.forEach((v, k) => phis.push(`${v.stringify()} -- ${k}`));
        phis.sort();
        return `${this.trgt.stringify()} = (${phis.join(", ")})`;
    }
    jemit() {
        const phis = [...this.src].map((phi) => [phi[0], phi[1].jemit()]);
        return { ...this.jbemit(), src: phis, layouttype: this.layouttype, trgt: this.trgt.jemit() };
    }
    static jparse(jobj) {
        let phis = new Map();
        jobj.src.forEach((phi) => phis.set(phi[0], MIRRegisterArgument.jparse(phi[1])));
        return new MIRPhi(jparsesinfo(jobj.sinfo), phis, jobj.layouttype, MIRRegisterArgument.jparse(jobj.trgt));
    }
}
exports.MIRPhi = MIRPhi;
class MIRBasicBlock {
    constructor(label, ops) {
        this.label = label;
        this.ops = ops;
    }
    jsonify() {
        const jblck = {
            label: this.label,
            line: (this.ops.length !== 0) ? this.ops[0].sinfo.line : -1,
            ops: this.ops.map((op) => op.stringify())
        };
        return jblck;
    }
    jemit() {
        return { label: this.label, ops: this.ops.map((op) => op.jemit()) };
    }
    static jparse(jobj) {
        return new MIRBasicBlock(jobj.label, jobj.ops.map((op) => MIROp.jparse(op)));
    }
}
exports.MIRBasicBlock = MIRBasicBlock;
class MIRBody {
    constructor(file, sinfo, body) {
        this.file = file;
        this.sinfo = sinfo;
        this.body = body;
    }
    jsonify() {
        let blocks = [];
        mir_info_1.topologicalOrder(this.body).forEach((v, k) => blocks.push(v.jsonify()));
        return blocks;
    }
    dgmlify(siginfo) {
        const blocks = mir_info_1.topologicalOrder(this.body);
        const flow = mir_info_1.computeBlockLinks(this.body);
        const xmlescape = (str) => {
            return str.replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&apos;");
        };
        let nodes = [`<Node Id="fdecl" Label="${siginfo}"/>`];
        let links = [`<Link Source="fdecl" Target="entry"/>`];
        blocks.forEach((b) => {
            const ndata = b.jsonify();
            const dstring = `L: ${ndata.label} &#10;  ` + ndata.ops.map((op) => xmlescape(op)).join("&#10;  ");
            nodes.push(`<Node Id="${ndata.label}" Label="${dstring}"/>`);
            flow.get(ndata.label).succs.forEach((succ) => {
                links.push(`<Link Source="${ndata.label}" Target="${succ}"/>`);
            });
        });
        return `<?xml version="1.0" encoding="utf-8"?>
        <DirectedGraph Title="CFG" xmlns="http://schemas.microsoft.com/vs/2009/dgml">
           <Nodes>
                ${nodes.join("\n")}
           </Nodes>
           <Links>
                ${links.join("\n")}
           </Links>
        </DirectedGraph>`;
    }
    jemit() {
        const blocks = mir_info_1.topologicalOrder(this.body).map((blck) => blck.jemit());
        return { file: this.file, sinfo: jemitsinfo(this.sinfo), blocks: blocks };
    }
    static jparse(jobj) {
        let body = new Map();
        jobj.blocks.map((blck) => MIRBasicBlock.jparse(blck)).forEach((blck) => body.set(blck.label, blck));
        return new MIRBody(jobj.file, jparsesinfo(jobj.sinfo), body);
    }
}
exports.MIRBody = MIRBody;
//# sourceMappingURL=mir_ops.js.map