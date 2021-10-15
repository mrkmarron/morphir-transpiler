"use strict";
//-------------------------------------------------------------------------------------------------------
// Copyright (C) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE.txt file in the project root for full license information.
//-------------------------------------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostfixHasIndex = exports.PostfixAs = exports.PostfixIs = exports.PostfixModifyWithNames = exports.PostfixModifyWithIndecies = exports.PostfixProjectFromNames = exports.PostfixAccessFromName = exports.PostfixProjectFromIndecies = exports.PostfixAccessFromIndex = exports.PostfixOp = exports.PostfixOperation = exports.PostfixOpTag = exports.AsTypeExpression = exports.IsTypeExpression = exports.CallStaticFunctionOrOperatorExpression = exports.CallNamespaceFunctionOrOperatorExpression = exports.SpecialConstructorExpression = exports.ConstructorPCodeExpression = exports.ConstructorEphemeralValueList = exports.ConstructorRecordExpression = exports.ConstructorTupleExpression = exports.ConstructorPrimaryWithFactoryExpression = exports.ConstructorPrimaryExpression = exports.AccessVariableExpression = exports.AccessStaticFieldExpression = exports.AccessNamespaceConstantExpression = exports.LiteralTypedStringConstructorExpression = exports.LiteralTypedPrimitiveConstructorExpression = exports.LiteralTypedStringExpression = exports.LiteralRegexExpression = exports.LiteralStringExpression = exports.LiteralRationalExpression = exports.LiteralFloatPointExpression = exports.LiteralIntegralExpression = exports.LiteralNumberinoExpression = exports.LiteralBoolExpression = exports.LiteralNothingExpression = exports.LiteralNoneExpression = exports.InvalidExpression = exports.ConstantExpressionValue = exports.LiteralExpressionValue = exports.Expression = exports.ExpressionTag = exports.IfElse = exports.CondBranchEntry = exports.TemplateArguments = exports.Arguments = exports.PositionalArgument = exports.NamedArgument = exports.InvokeArgument = void 0;
exports.LiteralSwitchGuard = exports.WildcardSwitchGuard = exports.MatchGuard = exports.SwitchGuard = exports.NakedCallStatement = exports.DebugStatement = exports.ValidateStatement = exports.CheckStatement = exports.AssertStatement = exports.AbortStatement = exports.IfElseStatement = exports.YieldStatement = exports.ReturnStatement = exports.ValueListStructuredAssignment = exports.NominalStructuredAssignment = exports.RecordStructuredAssignment = exports.TupleStructuredAssignment = exports.StructuredVariableAssignmentStatement = exports.VariableAssignmentStructuredAssignment = exports.VariableDeclarationStructuredAssignment = exports.IgnoreTermStructuredAssignment = exports.StructuredAssignementPrimitive = exports.StructuredAssignment = exports.VariablePackAssignmentStatement = exports.VariableAssignmentStatement = exports.VariablePackDeclarationStatement = exports.VariableDeclarationStatement = exports.EmptyStatement = exports.InvalidStatement = exports.Statement = exports.StatementTag = exports.MatchExpression = exports.SwitchExpression = exports.IfExpression = exports.BlockStatementExpression = exports.ExpOrExpression = exports.SelectExpression = exports.MapEntryConstructorExpression = exports.BinLogicExpression = exports.BinKeyExpression = exports.PrefixNotOp = exports.PCodeInvokeExpression = exports.PostfixInvoke = exports.PostfixGetPropertyTry = exports.PostfixGetPropertyOption = exports.PostfixGetPropertyOrNone = exports.PostfixGetIndexTry = exports.PostfixGetIndexOption = exports.PostfixGetIndexOrNone = exports.PostfixHasProperty = void 0;
exports.BodyImplementation = exports.BlockStatement = exports.MatchStatement = exports.SwitchStatement = exports.MatchEntry = exports.SwitchEntry = exports.StructureMatchGuard = exports.TypeMatchGuard = exports.WildcardMatchGuard = void 0;
const type_signature_1 = require("./type_signature");
class InvokeArgument {
    constructor(value, ref) {
        this.value = value;
        this.ref = ref;
    }
}
exports.InvokeArgument = InvokeArgument;
class NamedArgument extends InvokeArgument {
    constructor(ref, name, value) {
        super(value, ref);
        this.name = name;
    }
}
exports.NamedArgument = NamedArgument;
class PositionalArgument extends InvokeArgument {
    constructor(ref, isSpread, value) {
        super(value, ref);
        this.isSpread = isSpread;
    }
}
exports.PositionalArgument = PositionalArgument;
class Arguments {
    constructor(args) {
        this.argList = args;
    }
}
exports.Arguments = Arguments;
class TemplateArguments {
    constructor(targs) {
        this.targs = targs;
    }
}
exports.TemplateArguments = TemplateArguments;
class CondBranchEntry {
    constructor(cond, action) {
        this.cond = cond;
        this.action = action;
    }
}
exports.CondBranchEntry = CondBranchEntry;
class IfElse {
    constructor(conds, elseAction) {
        this.conds = conds;
        this.elseAction = elseAction;
    }
}
exports.IfElse = IfElse;
class SwitchGuard {
}
exports.SwitchGuard = SwitchGuard;
class WildcardSwitchGuard extends SwitchGuard {
}
exports.WildcardSwitchGuard = WildcardSwitchGuard;
class LiteralSwitchGuard extends SwitchGuard {
    constructor(litmatch) {
        super();
        this.litmatch = litmatch;
    }
}
exports.LiteralSwitchGuard = LiteralSwitchGuard;
class SwitchEntry {
    constructor(check, action) {
        this.check = check;
        this.action = action;
    }
}
exports.SwitchEntry = SwitchEntry;
class MatchGuard {
}
exports.MatchGuard = MatchGuard;
class WildcardMatchGuard extends MatchGuard {
}
exports.WildcardMatchGuard = WildcardMatchGuard;
class TypeMatchGuard extends MatchGuard {
    constructor(oftype) {
        super();
        this.oftype = oftype;
    }
}
exports.TypeMatchGuard = TypeMatchGuard;
class StructureMatchGuard extends MatchGuard {
    constructor(match, decls) {
        super();
        this.match = match;
        this.decls = decls;
    }
}
exports.StructureMatchGuard = StructureMatchGuard;
class MatchEntry {
    constructor(check, action) {
        this.check = check;
        this.action = action;
    }
}
exports.MatchEntry = MatchEntry;
var ExpressionTag;
(function (ExpressionTag) {
    ExpressionTag["Clear"] = "[CLEAR]";
    ExpressionTag["InvalidExpresion"] = "[INVALID]";
    ExpressionTag["LiteralNoneExpression"] = "LiteralNoneExpression";
    ExpressionTag["LiteralNothingExpression"] = "LiteralNothingExpression";
    ExpressionTag["LiteralBoolExpression"] = "LiteralBoolExpression";
    ExpressionTag["LiteralNumberinoExpression"] = "LiteralNumberinoExpression";
    ExpressionTag["LiteralIntegralExpression"] = "LiteralIntegralExpression";
    ExpressionTag["LiteralRationalExpression"] = "LiteralRationalExpression";
    ExpressionTag["LiteralFloatPointExpression"] = "LiteralFloatExpression";
    ExpressionTag["LiteralStringExpression"] = "LiteralStringExpression";
    ExpressionTag["LiteralRegexExpression"] = "LiteralRegexExpression";
    ExpressionTag["LiteralTypedStringExpression"] = "LiteralTypedStringExpression";
    ExpressionTag["LiteralTypedPrimitiveConstructorExpression"] = "LiteralTypedPrimitiveConstructorExpression";
    ExpressionTag["LiteralTypedStringConstructorExpression"] = "LiteralTypedStringConstructorExpression";
    ExpressionTag["AccessNamespaceConstantExpression"] = "AccessNamespaceConstantExpression";
    ExpressionTag["AccessStaticFieldExpression"] = " AccessStaticFieldExpression";
    ExpressionTag["AccessVariableExpression"] = "AccessVariableExpression";
    ExpressionTag["ConstructorPrimaryExpression"] = "ConstructorPrimaryExpression";
    ExpressionTag["ConstructorPrimaryWithFactoryExpression"] = "ConstructorPrimaryWithFactoryExpression";
    ExpressionTag["ConstructorTupleExpression"] = "ConstructorTupleExpression";
    ExpressionTag["ConstructorRecordExpression"] = "ConstructorRecordExpression";
    ExpressionTag["ConstructorEphemeralValueList"] = "ConstructorEphemeralValueList";
    ExpressionTag["ConstructorPCodeExpression"] = "ConstructorPCodeExpression";
    ExpressionTag["PCodeInvokeExpression"] = "PCodeInvokeExpression";
    ExpressionTag["SpecialConstructorExpression"] = "SpecialConstructorExpression";
    ExpressionTag["CallNamespaceFunctionOrOperatorExpression"] = "CallNamespaceFunctionOrOperatorExpression";
    ExpressionTag["CallStaticFunctionOrOperatorExpression"] = "CallStaticFunctionOrOperatorExpression";
    ExpressionTag["IsTypeExpression"] = "IsTypeExpression";
    ExpressionTag["AsTypeExpression"] = "AsTypeExpression";
    ExpressionTag["PostfixOpExpression"] = "PostfixOpExpression";
    ExpressionTag["PrefixNotOpExpression"] = "PrefixNotOpExpression";
    ExpressionTag["BinKeyExpression"] = "BinKeyExpression";
    ExpressionTag["BinLogicExpression"] = "BinLogicExpression";
    ExpressionTag["MapEntryConstructorExpression"] = "MapEntryConstructorExpression";
    ExpressionTag["SelectExpression"] = "SelectExpression";
    ExpressionTag["ExpOrExpression"] = "ExpOrExpression";
    ExpressionTag["BlockStatementExpression"] = "BlockStatementExpression";
    ExpressionTag["IfExpression"] = "IfExpression";
    ExpressionTag["SwitchExpression"] = "SwitchExpression";
    ExpressionTag["MatchExpression"] = "MatchExpression";
})(ExpressionTag || (ExpressionTag = {}));
exports.ExpressionTag = ExpressionTag;
class Expression {
    constructor(tag, sinfo) {
        this.tag = tag;
        this.sinfo = sinfo;
    }
    isCompileTimeInlineValue() {
        return false;
    }
    isLiteralValueExpression() {
        return false;
    }
}
exports.Expression = Expression;
//This just holds a constant expression that can be evaluated without any arguments but not a subtype of Expression so we can distinguish as types
class LiteralExpressionValue {
    constructor(exp) {
        this.exp = exp;
    }
}
exports.LiteralExpressionValue = LiteralExpressionValue;
//This just holds a constant expression (for use where we expect and constant -- or restricted constant expression) but not a subtype of Expression so we can distinguish as types
class ConstantExpressionValue {
    constructor(exp, captured) {
        this.exp = exp;
        this.captured = captured;
    }
}
exports.ConstantExpressionValue = ConstantExpressionValue;
class InvalidExpression extends Expression {
    constructor(sinfo) {
        super(ExpressionTag.InvalidExpresion, sinfo);
    }
}
exports.InvalidExpression = InvalidExpression;
class LiteralNoneExpression extends Expression {
    constructor(sinfo) {
        super(ExpressionTag.LiteralNoneExpression, sinfo);
    }
    isCompileTimeInlineValue() {
        return true;
    }
    isLiteralValueExpression() {
        return true;
    }
}
exports.LiteralNoneExpression = LiteralNoneExpression;
class LiteralNothingExpression extends Expression {
    constructor(sinfo) {
        super(ExpressionTag.LiteralNothingExpression, sinfo);
    }
    isCompileTimeInlineValue() {
        return true;
    }
    isLiteralValueExpression() {
        return true;
    }
}
exports.LiteralNothingExpression = LiteralNothingExpression;
class LiteralBoolExpression extends Expression {
    constructor(sinfo, value) {
        super(ExpressionTag.LiteralBoolExpression, sinfo);
        this.value = value;
    }
    isCompileTimeInlineValue() {
        return true;
    }
    isLiteralValueExpression() {
        return true;
    }
}
exports.LiteralBoolExpression = LiteralBoolExpression;
class LiteralNumberinoExpression extends Expression {
    constructor(sinfo, value) {
        super(ExpressionTag.LiteralNumberinoExpression, sinfo);
        this.value = value;
    }
    isCompileTimeInlineValue() {
        return true;
    }
}
exports.LiteralNumberinoExpression = LiteralNumberinoExpression;
class LiteralIntegralExpression extends Expression {
    constructor(sinfo, value, itype) {
        super(ExpressionTag.LiteralIntegralExpression, sinfo);
        this.value = value;
        this.itype = itype;
    }
    isCompileTimeInlineValue() {
        return true;
    }
    isLiteralValueExpression() {
        return true;
    }
}
exports.LiteralIntegralExpression = LiteralIntegralExpression;
class LiteralRationalExpression extends Expression {
    constructor(sinfo, value, rtype) {
        super(ExpressionTag.LiteralRationalExpression, sinfo);
        this.value = value;
        this.rtype = rtype;
    }
    isCompileTimeInlineValue() {
        return true;
    }
}
exports.LiteralRationalExpression = LiteralRationalExpression;
class LiteralFloatPointExpression extends Expression {
    constructor(sinfo, value, fptype) {
        super(ExpressionTag.LiteralFloatPointExpression, sinfo);
        this.value = value;
        this.fptype = fptype;
    }
    isCompileTimeInlineValue() {
        return true;
    }
}
exports.LiteralFloatPointExpression = LiteralFloatPointExpression;
class LiteralStringExpression extends Expression {
    constructor(sinfo, value) {
        super(ExpressionTag.LiteralStringExpression, sinfo);
        this.value = value;
    }
    isCompileTimeInlineValue() {
        return true;
    }
    isLiteralValueExpression() {
        return true;
    }
}
exports.LiteralStringExpression = LiteralStringExpression;
class LiteralRegexExpression extends Expression {
    constructor(sinfo, value) {
        super(ExpressionTag.LiteralRegexExpression, sinfo);
        this.value = value;
    }
}
exports.LiteralRegexExpression = LiteralRegexExpression;
class LiteralTypedStringExpression extends Expression {
    constructor(sinfo, value, stype) {
        super(ExpressionTag.LiteralTypedStringExpression, sinfo);
        this.value = value;
        this.stype = stype;
    }
    isCompileTimeInlineValue() {
        return true;
    }
    isLiteralValueExpression() {
        return true;
    }
}
exports.LiteralTypedStringExpression = LiteralTypedStringExpression;
class LiteralTypedPrimitiveConstructorExpression extends Expression {
    constructor(sinfo, value, oftype, vtype) {
        super(ExpressionTag.LiteralTypedPrimitiveConstructorExpression, sinfo);
        this.value = value;
        this.oftype = oftype;
        this.vtype = vtype;
    }
    isCompileTimeInlineValue() {
        return true;
    }
    isLiteralValueExpression() {
        return true;
    }
}
exports.LiteralTypedPrimitiveConstructorExpression = LiteralTypedPrimitiveConstructorExpression;
class LiteralTypedStringConstructorExpression extends Expression {
    constructor(sinfo, value, stype) {
        super(ExpressionTag.LiteralTypedStringConstructorExpression, sinfo);
        this.value = value;
        this.stype = stype;
    }
}
exports.LiteralTypedStringConstructorExpression = LiteralTypedStringConstructorExpression;
class AccessNamespaceConstantExpression extends Expression {
    constructor(sinfo, ns, name) {
        super(ExpressionTag.AccessNamespaceConstantExpression, sinfo);
        this.ns = ns;
        this.name = name;
    }
}
exports.AccessNamespaceConstantExpression = AccessNamespaceConstantExpression;
class AccessStaticFieldExpression extends Expression {
    constructor(sinfo, stype, name) {
        super(ExpressionTag.AccessStaticFieldExpression, sinfo);
        this.stype = stype;
        this.name = name;
    }
}
exports.AccessStaticFieldExpression = AccessStaticFieldExpression;
class AccessVariableExpression extends Expression {
    constructor(sinfo, name) {
        super(ExpressionTag.AccessVariableExpression, sinfo);
        this.name = name;
    }
}
exports.AccessVariableExpression = AccessVariableExpression;
class ConstructorPrimaryExpression extends Expression {
    constructor(sinfo, ctype, args) {
        super(ExpressionTag.ConstructorPrimaryExpression, sinfo);
        this.ctype = ctype;
        this.args = args;
    }
}
exports.ConstructorPrimaryExpression = ConstructorPrimaryExpression;
class ConstructorPrimaryWithFactoryExpression extends Expression {
    constructor(sinfo, ctype, factory, rec, terms, args) {
        super(ExpressionTag.ConstructorPrimaryWithFactoryExpression, sinfo);
        this.ctype = ctype;
        this.factoryName = factory;
        this.rec = rec;
        this.terms = terms;
        this.args = args;
    }
}
exports.ConstructorPrimaryWithFactoryExpression = ConstructorPrimaryWithFactoryExpression;
class ConstructorTupleExpression extends Expression {
    constructor(sinfo, args) {
        super(ExpressionTag.ConstructorTupleExpression, sinfo);
        this.args = args;
    }
}
exports.ConstructorTupleExpression = ConstructorTupleExpression;
class ConstructorRecordExpression extends Expression {
    constructor(sinfo, args) {
        super(ExpressionTag.ConstructorRecordExpression, sinfo);
        this.args = args;
    }
}
exports.ConstructorRecordExpression = ConstructorRecordExpression;
class ConstructorEphemeralValueList extends Expression {
    constructor(sinfo, args) {
        super(ExpressionTag.ConstructorEphemeralValueList, sinfo);
        this.args = args;
    }
}
exports.ConstructorEphemeralValueList = ConstructorEphemeralValueList;
class ConstructorPCodeExpression extends Expression {
    constructor(sinfo, isAuto, invoke) {
        super(ExpressionTag.ConstructorPCodeExpression, sinfo);
        this.isAuto = isAuto;
        this.invoke = invoke;
    }
}
exports.ConstructorPCodeExpression = ConstructorPCodeExpression;
class PCodeInvokeExpression extends Expression {
    constructor(sinfo, pcode, rec, args) {
        super(ExpressionTag.PCodeInvokeExpression, sinfo);
        this.pcode = pcode;
        this.rec = rec;
        this.args = args;
    }
}
exports.PCodeInvokeExpression = PCodeInvokeExpression;
class SpecialConstructorExpression extends Expression {
    constructor(sinfo, rop, arg) {
        super(ExpressionTag.SpecialConstructorExpression, sinfo);
        this.rop = rop;
        this.arg = arg;
    }
}
exports.SpecialConstructorExpression = SpecialConstructorExpression;
class CallNamespaceFunctionOrOperatorExpression extends Expression {
    constructor(sinfo, ns, name, terms, rec, args, opkind) {
        super(ExpressionTag.CallNamespaceFunctionOrOperatorExpression, sinfo);
        this.ns = ns;
        this.name = name;
        this.rec = rec;
        this.terms = terms;
        this.args = args;
        this.opkind = opkind;
    }
}
exports.CallNamespaceFunctionOrOperatorExpression = CallNamespaceFunctionOrOperatorExpression;
class CallStaticFunctionOrOperatorExpression extends Expression {
    constructor(sinfo, ttype, name, terms, rec, args, opkind) {
        super(ExpressionTag.CallStaticFunctionOrOperatorExpression, sinfo);
        this.ttype = ttype;
        this.name = name;
        this.rec = rec;
        this.terms = terms;
        this.args = args;
        this.opkind = opkind;
    }
}
exports.CallStaticFunctionOrOperatorExpression = CallStaticFunctionOrOperatorExpression;
class IsTypeExpression extends Expression {
    constructor(sinfo, arg, oftype) {
        super(ExpressionTag.IsTypeExpression, sinfo);
        this.arg = arg;
        this.oftype = oftype;
    }
}
exports.IsTypeExpression = IsTypeExpression;
class AsTypeExpression extends Expression {
    constructor(sinfo, arg, oftype) {
        super(ExpressionTag.AsTypeExpression, sinfo);
        this.arg = arg;
        this.oftype = oftype;
    }
}
exports.AsTypeExpression = AsTypeExpression;
var PostfixOpTag;
(function (PostfixOpTag) {
    PostfixOpTag["PostfixAccessFromIndex"] = "PostfixAccessFromIndex";
    PostfixOpTag["PostfixProjectFromIndecies"] = "PostfixProjectFromIndecies";
    PostfixOpTag["PostfixAccessFromName"] = "PostfixAccessFromName";
    PostfixOpTag["PostfixProjectFromNames"] = "PostfixProjectFromNames";
    PostfixOpTag["PostfixModifyWithIndecies"] = "PostfixModifyWithIndecies";
    PostfixOpTag["PostfixModifyWithNames"] = "PostfixModifyWithNames";
    PostfixOpTag["PostfixIs"] = "PostfixIs";
    PostfixOpTag["PostfixAs"] = "PostfixAs";
    PostfixOpTag["PostfixHasIndex"] = "PostfixHasIndex";
    PostfixOpTag["PostfixHasProperty"] = "PostfixHasProperty";
    PostfixOpTag["PostfixGetIndexOrNone"] = "PostfixGetIndexOrNone";
    PostfixOpTag["PostfixGetIndexOption"] = "PostfixGetIndexOption";
    PostfixOpTag["PostfixGetIndexTry"] = "PostfixGetIndexTry";
    PostfixOpTag["PostfixGetPropertyOrNone"] = "PostfixGetPropertyOrNone";
    PostfixOpTag["PostfixGetPropertyOption"] = "PostfixGetPropertyOption";
    PostfixOpTag["PostfixGetPropertyTry"] = "PostfixGetPropertyTry";
    PostfixOpTag["PostfixInvoke"] = "PostfixInvoke";
})(PostfixOpTag || (PostfixOpTag = {}));
exports.PostfixOpTag = PostfixOpTag;
class PostfixOperation {
    constructor(sinfo, op) {
        this.sinfo = sinfo;
        this.op = op;
    }
}
exports.PostfixOperation = PostfixOperation;
class PostfixOp extends Expression {
    constructor(sinfo, root, ops) {
        super(ExpressionTag.PostfixOpExpression, sinfo);
        this.rootExp = root;
        this.ops = ops;
    }
}
exports.PostfixOp = PostfixOp;
class PostfixAccessFromIndex extends PostfixOperation {
    constructor(sinfo, index) {
        super(sinfo, PostfixOpTag.PostfixAccessFromIndex);
        this.index = index;
    }
}
exports.PostfixAccessFromIndex = PostfixAccessFromIndex;
class PostfixProjectFromIndecies extends PostfixOperation {
    constructor(sinfo, isEphemeralListResult, indecies) {
        super(sinfo, PostfixOpTag.PostfixProjectFromIndecies);
        this.isEphemeralListResult = isEphemeralListResult;
        this.indecies = indecies;
    }
}
exports.PostfixProjectFromIndecies = PostfixProjectFromIndecies;
class PostfixAccessFromName extends PostfixOperation {
    constructor(sinfo, name) {
        super(sinfo, PostfixOpTag.PostfixAccessFromName);
        this.name = name;
    }
}
exports.PostfixAccessFromName = PostfixAccessFromName;
class PostfixProjectFromNames extends PostfixOperation {
    constructor(sinfo, isEphemeralListResult, names) {
        super(sinfo, PostfixOpTag.PostfixProjectFromNames);
        this.isEphemeralListResult = isEphemeralListResult;
        this.names = names;
    }
}
exports.PostfixProjectFromNames = PostfixProjectFromNames;
class PostfixModifyWithIndecies extends PostfixOperation {
    constructor(sinfo, isBinder, updates) {
        super(sinfo, PostfixOpTag.PostfixModifyWithIndecies);
        this.isBinder = isBinder;
        this.updates = updates;
    }
}
exports.PostfixModifyWithIndecies = PostfixModifyWithIndecies;
class PostfixModifyWithNames extends PostfixOperation {
    constructor(sinfo, isBinder, updates) {
        super(sinfo, PostfixOpTag.PostfixModifyWithNames);
        this.isBinder = isBinder;
        this.updates = updates;
    }
}
exports.PostfixModifyWithNames = PostfixModifyWithNames;
class PostfixIs extends PostfixOperation {
    constructor(sinfo, istype) {
        super(sinfo, PostfixOpTag.PostfixIs);
        this.istype = istype;
    }
}
exports.PostfixIs = PostfixIs;
class PostfixAs extends PostfixOperation {
    constructor(sinfo, astype) {
        super(sinfo, PostfixOpTag.PostfixAs);
        this.astype = astype;
    }
}
exports.PostfixAs = PostfixAs;
class PostfixHasIndex extends PostfixOperation {
    constructor(sinfo, idx) {
        super(sinfo, PostfixOpTag.PostfixHasIndex);
        this.idx = idx;
    }
}
exports.PostfixHasIndex = PostfixHasIndex;
class PostfixHasProperty extends PostfixOperation {
    constructor(sinfo, pname) {
        super(sinfo, PostfixOpTag.PostfixHasProperty);
        this.pname = pname;
    }
}
exports.PostfixHasProperty = PostfixHasProperty;
class PostfixGetIndexOrNone extends PostfixOperation {
    constructor(sinfo, idx) {
        super(sinfo, PostfixOpTag.PostfixGetIndexOrNone);
        this.idx = idx;
    }
}
exports.PostfixGetIndexOrNone = PostfixGetIndexOrNone;
class PostfixGetIndexOption extends PostfixOperation {
    constructor(sinfo, idx) {
        super(sinfo, PostfixOpTag.PostfixGetIndexOption);
        this.idx = idx;
    }
}
exports.PostfixGetIndexOption = PostfixGetIndexOption;
class PostfixGetIndexTry extends PostfixOperation {
    constructor(sinfo, idx, vname) {
        super(sinfo, PostfixOpTag.PostfixGetIndexTry);
        this.idx = idx;
        this.vname = vname;
    }
}
exports.PostfixGetIndexTry = PostfixGetIndexTry;
class PostfixGetPropertyOrNone extends PostfixOperation {
    constructor(sinfo, pname) {
        super(sinfo, PostfixOpTag.PostfixGetPropertyOrNone);
        this.pname = pname;
    }
}
exports.PostfixGetPropertyOrNone = PostfixGetPropertyOrNone;
class PostfixGetPropertyOption extends PostfixOperation {
    constructor(sinfo, pname) {
        super(sinfo, PostfixOpTag.PostfixGetPropertyOption);
        this.pname = pname;
    }
}
exports.PostfixGetPropertyOption = PostfixGetPropertyOption;
class PostfixGetPropertyTry extends PostfixOperation {
    constructor(sinfo, pname, vname) {
        super(sinfo, PostfixOpTag.PostfixGetPropertyTry);
        this.pname = pname;
        this.vname = vname;
    }
}
exports.PostfixGetPropertyTry = PostfixGetPropertyTry;
class PostfixInvoke extends PostfixOperation {
    constructor(sinfo, isBinder, specificResolve, name, terms, rec, args) {
        super(sinfo, PostfixOpTag.PostfixInvoke);
        this.isBinder = isBinder;
        this.specificResolve = specificResolve;
        this.name = name;
        this.rec = rec;
        this.terms = terms;
        this.args = args;
    }
}
exports.PostfixInvoke = PostfixInvoke;
class PrefixNotOp extends Expression {
    constructor(sinfo, exp) {
        super(ExpressionTag.PrefixNotOpExpression, sinfo);
        this.exp = exp;
    }
}
exports.PrefixNotOp = PrefixNotOp;
class BinKeyExpression extends Expression {
    constructor(sinfo, lhs, op, rhs) {
        super(ExpressionTag.BinKeyExpression, sinfo);
        this.lhs = lhs;
        this.op = op;
        this.rhs = rhs;
    }
}
exports.BinKeyExpression = BinKeyExpression;
class BinLogicExpression extends Expression {
    constructor(sinfo, lhs, op, rhs) {
        super(ExpressionTag.BinLogicExpression, sinfo);
        this.lhs = lhs;
        this.op = op;
        this.rhs = rhs;
    }
}
exports.BinLogicExpression = BinLogicExpression;
class MapEntryConstructorExpression extends Expression {
    constructor(sinfo, kexp, vexp) {
        super(ExpressionTag.MapEntryConstructorExpression, sinfo);
        this.kexp = kexp;
        this.vexp = vexp;
    }
}
exports.MapEntryConstructorExpression = MapEntryConstructorExpression;
class SelectExpression extends Expression {
    constructor(sinfo, test, option1, option2) {
        super(ExpressionTag.SelectExpression, sinfo);
        this.test = test;
        this.option1 = option1;
        this.option2 = option2;
    }
}
exports.SelectExpression = SelectExpression;
class ExpOrExpression extends Expression {
    constructor(sinfo, exp, cond) {
        super(ExpressionTag.ExpOrExpression, sinfo);
        this.exp = exp;
        this.cond = cond;
    }
}
exports.ExpOrExpression = ExpOrExpression;
class BlockStatementExpression extends Expression {
    constructor(sinfo, ops) {
        super(ExpressionTag.BlockStatementExpression, sinfo);
        this.ops = ops;
    }
}
exports.BlockStatementExpression = BlockStatementExpression;
class IfExpression extends Expression {
    constructor(sinfo, flow) {
        super(ExpressionTag.IfExpression, sinfo);
        this.flow = flow;
    }
}
exports.IfExpression = IfExpression;
class SwitchExpression extends Expression {
    constructor(sinfo, sval, flow) {
        super(ExpressionTag.SwitchExpression, sinfo);
        this.sval = sval;
        this.flow = flow;
    }
}
exports.SwitchExpression = SwitchExpression;
class MatchExpression extends Expression {
    constructor(sinfo, sval, flow) {
        super(ExpressionTag.MatchExpression, sinfo);
        this.sval = sval;
        this.flow = flow;
    }
}
exports.MatchExpression = MatchExpression;
var StatementTag;
(function (StatementTag) {
    StatementTag["Clear"] = "[CLEAR]";
    StatementTag["InvalidStatement"] = "[INVALID]";
    StatementTag["EmptyStatement"] = "EmptyStatement";
    StatementTag["VariableDeclarationStatement"] = "VariableDeclarationStatement";
    StatementTag["VariablePackDeclarationStatement"] = "VariablePackDeclarationStatement";
    StatementTag["VariableAssignmentStatement"] = "VariableAssignmentStatement";
    StatementTag["VariablePackAssignmentStatement"] = "VariablePackAssignmentStatement";
    StatementTag["StructuredVariableAssignmentStatement"] = "StructuredVariableAssignmentStatement";
    StatementTag["ReturnStatement"] = "ReturnStatement";
    StatementTag["YieldStatement"] = "YieldStatement";
    StatementTag["IfElseStatement"] = "IfElseStatement";
    StatementTag["SwitchStatement"] = "SwitchStatement";
    StatementTag["MatchStatement"] = "MatchStatement";
    StatementTag["AbortStatement"] = "AbortStatement";
    StatementTag["AssertStatement"] = "AssertStatement";
    StatementTag["CheckStatement"] = "CheckStatement";
    StatementTag["ValidateStatement"] = "ValidateStatement";
    StatementTag["DebugStatement"] = "DebugStatement";
    StatementTag["NakedCallStatement"] = "NakedCallStatement";
    StatementTag["BlockStatement"] = "BlockStatement";
})(StatementTag || (StatementTag = {}));
exports.StatementTag = StatementTag;
class Statement {
    constructor(tag, sinfo) {
        this.tag = tag;
        this.sinfo = sinfo;
    }
}
exports.Statement = Statement;
class InvalidStatement extends Statement {
    constructor(sinfo) {
        super(StatementTag.InvalidStatement, sinfo);
    }
}
exports.InvalidStatement = InvalidStatement;
class EmptyStatement extends Statement {
    constructor(sinfo) {
        super(StatementTag.EmptyStatement, sinfo);
    }
}
exports.EmptyStatement = EmptyStatement;
class VariableDeclarationStatement extends Statement {
    constructor(sinfo, name, isConst, vtype, exp) {
        super(StatementTag.VariableDeclarationStatement, sinfo);
        this.name = name;
        this.isConst = isConst;
        this.vtype = vtype;
        this.exp = exp;
    }
}
exports.VariableDeclarationStatement = VariableDeclarationStatement;
class VariablePackDeclarationStatement extends Statement {
    constructor(sinfo, isConst, vars, exp) {
        super(StatementTag.VariablePackDeclarationStatement, sinfo);
        this.isConst = isConst;
        this.vars = vars;
        this.exp = exp;
    }
}
exports.VariablePackDeclarationStatement = VariablePackDeclarationStatement;
class VariableAssignmentStatement extends Statement {
    constructor(sinfo, name, exp) {
        super(StatementTag.VariableAssignmentStatement, sinfo);
        this.name = name;
        this.exp = exp;
    }
}
exports.VariableAssignmentStatement = VariableAssignmentStatement;
class VariablePackAssignmentStatement extends Statement {
    constructor(sinfo, names, exp) {
        super(StatementTag.VariablePackAssignmentStatement, sinfo);
        this.names = names;
        this.exp = exp;
    }
}
exports.VariablePackAssignmentStatement = VariablePackAssignmentStatement;
class StructuredAssignment {
}
exports.StructuredAssignment = StructuredAssignment;
class StructuredAssignementPrimitive extends StructuredAssignment {
    constructor(assigntype) {
        super();
        this.assigntype = assigntype;
    }
}
exports.StructuredAssignementPrimitive = StructuredAssignementPrimitive;
class IgnoreTermStructuredAssignment extends StructuredAssignementPrimitive {
    constructor(ignoretype) {
        super(ignoretype);
    }
}
exports.IgnoreTermStructuredAssignment = IgnoreTermStructuredAssignment;
class VariableDeclarationStructuredAssignment extends StructuredAssignementPrimitive {
    constructor(vname, vtype) {
        super(vtype);
        this.vname = vname;
    }
}
exports.VariableDeclarationStructuredAssignment = VariableDeclarationStructuredAssignment;
class VariableAssignmentStructuredAssignment extends StructuredAssignementPrimitive {
    constructor(vname) {
        super(new type_signature_1.AutoTypeSignature());
        this.vname = vname;
    }
}
exports.VariableAssignmentStructuredAssignment = VariableAssignmentStructuredAssignment;
class TupleStructuredAssignment extends StructuredAssignment {
    constructor(assigns) {
        super();
        this.assigns = assigns;
    }
}
exports.TupleStructuredAssignment = TupleStructuredAssignment;
class RecordStructuredAssignment extends StructuredAssignment {
    constructor(assigns) {
        super();
        this.assigns = assigns;
    }
}
exports.RecordStructuredAssignment = RecordStructuredAssignment;
class NominalStructuredAssignment extends StructuredAssignment {
    constructor(atype, assigns) {
        super();
        this.atype = atype;
        this.assigns = assigns;
    }
}
exports.NominalStructuredAssignment = NominalStructuredAssignment;
class ValueListStructuredAssignment extends StructuredAssignment {
    constructor(assigns) {
        super();
        this.assigns = assigns;
    }
}
exports.ValueListStructuredAssignment = ValueListStructuredAssignment;
class StructuredVariableAssignmentStatement extends Statement {
    constructor(sinfo, isConst, assign, exp) {
        super(StatementTag.StructuredVariableAssignmentStatement, sinfo);
        this.isConst = isConst;
        this.assign = assign;
        this.exp = exp;
    }
}
exports.StructuredVariableAssignmentStatement = StructuredVariableAssignmentStatement;
class ReturnStatement extends Statement {
    constructor(sinfo, values) {
        super(StatementTag.ReturnStatement, sinfo);
        this.values = values;
    }
}
exports.ReturnStatement = ReturnStatement;
class YieldStatement extends Statement {
    constructor(sinfo, values) {
        super(StatementTag.YieldStatement, sinfo);
        this.values = values;
    }
}
exports.YieldStatement = YieldStatement;
class IfElseStatement extends Statement {
    constructor(sinfo, flow) {
        super(StatementTag.IfElseStatement, sinfo);
        this.flow = flow;
    }
}
exports.IfElseStatement = IfElseStatement;
class SwitchStatement extends Statement {
    constructor(sinfo, sval, flow) {
        super(StatementTag.SwitchStatement, sinfo);
        this.sval = sval;
        this.flow = flow;
    }
}
exports.SwitchStatement = SwitchStatement;
class MatchStatement extends Statement {
    constructor(sinfo, sval, flow) {
        super(StatementTag.MatchStatement, sinfo);
        this.sval = sval;
        this.flow = flow;
    }
}
exports.MatchStatement = MatchStatement;
class AbortStatement extends Statement {
    constructor(sinfo) {
        super(StatementTag.AbortStatement, sinfo);
    }
}
exports.AbortStatement = AbortStatement;
class AssertStatement extends Statement {
    constructor(sinfo, cond, level) {
        super(StatementTag.AssertStatement, sinfo);
        this.cond = cond;
        this.level = level;
    }
}
exports.AssertStatement = AssertStatement;
class CheckStatement extends Statement {
    constructor(sinfo, cond) {
        super(StatementTag.CheckStatement, sinfo);
        this.cond = cond;
    }
}
exports.CheckStatement = CheckStatement;
class ValidateStatement extends Statement {
    constructor(sinfo, cond, err) {
        super(StatementTag.ValidateStatement, sinfo);
        this.cond = cond;
        this.err = err;
    }
}
exports.ValidateStatement = ValidateStatement;
class DebugStatement extends Statement {
    constructor(sinfo, value) {
        super(StatementTag.DebugStatement, sinfo);
        this.value = value;
    }
}
exports.DebugStatement = DebugStatement;
class NakedCallStatement extends Statement {
    constructor(sinfo, call) {
        super(StatementTag.NakedCallStatement, sinfo);
        this.call = call;
    }
}
exports.NakedCallStatement = NakedCallStatement;
class BlockStatement extends Statement {
    constructor(sinfo, statements) {
        super(StatementTag.BlockStatement, sinfo);
        this.statements = statements;
    }
}
exports.BlockStatement = BlockStatement;
class BodyImplementation {
    constructor(bodyid, file, body) {
        this.id = bodyid;
        this.file = file;
        this.body = body;
    }
}
exports.BodyImplementation = BodyImplementation;
//# sourceMappingURL=body.js.map