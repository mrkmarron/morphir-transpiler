import * as assert from "assert";

function notImplemented(of: string): string {
    console.log("Not Implemented -- " + of);
    assert(false);

    return "[NOT IMPLEMENTED]";
}

enum EvalMode {
    Exp,
    ExpStmt,
    Stmt
}

type LetStackEntry = string[];

type CurryStackEntry = {
    op: string;
    isinfix: boolean;
    isdot: boolean;
    revargs: boolean;
    args: string[];
};

const FUNCTION_TAG = "[FUNCTION]";

class Transpiler {
    private nameMap: Map<string, string> = new Map<string, string>(); 

    private scopeStack: LetStackEntry[] = [];
    private opCurryStack: CurryStackEntry[] = [];

    private internName(name: string): string {
        if(!this.nameMap.has(name)) {
            const nname = name.replace("::", "__");
            this.nameMap.set(name, nname);
        }

        return this.nameMap.get(name) as string;
    }

    processName(name: string | string[]): string {
        return Array.isArray(name) ? name.join("") : name;
    }

    processPath(path: any[]): string {
        return path.map((n) => this.processName(n)).join("_");
    }
    
    processFQN(fqn: any[]): string {
        return this.processPath(fqn[0]) + "::" + this.processPath(fqn[1]) + "::" + this.processName(fqn[2]);
    }

    processTypeVariable(jv: any[]): string {
       return notImplemented("TypeVariable");
    }

    processTypeReference(jv: any[]): string {
        const atag = jv[1];
        assert(Object.keys(atag).length == 0);

        const tparams = jv[3];

        const fqn = this.processFQN(jv[2]);
        switch(fqn) {
            case "morphir_sdk::basics::bool": 
                return "Bool";
            case "morphir_sdk::basics::int": 
                return "Int";
            case "morphir_sdk::basics::float": 
                return "Float";
            case "morphir_sdk::basics::decimal": 
                return "Decmial";
            case "morphir_sdk::list::list": {
                const oftype = this.processType(tparams[0]);
                return `List<${oftype}>`;
            }
            default:
                return this.internName(fqn);
        }
    }

    processTypeTuple(jv: any[]): string {
        return notImplemented("TypeTuple");
    }

    processTypeRecord(jv: any[]): string {
        const entries = jv[2].map((ee: any) => {
            return `${ee[0]}: ${this.processType(ee[1])}`;
        });

        return "{" + entries.join(", ") + "}";
    }

    processType(jv: any[]): string {
        switch(jv[0]) {
            case "variable":
                return this.processTypeVariable(jv);
            case "reference":
                return this.processTypeReference(jv);
            case "tuple":
                return this.processTypeTuple(jv);
            case "record":
                return this.processTypeRecord(jv);
            default:
                return notImplemented(`processType -- ${jv[0]}`);
        }
    }

    processLiteral(jv: any[]): string {
        const lv = jv[2];
        switch(lv[0]) {
            case "bool_literal":
                return lv[1] ? "true" : "false";
            case "char_literal":
                return `"${lv[1]}"`;
            case "string_literal":
                return `"${lv[1]}"`;
            case "int_literal":
                return `${lv[1]}i`;
            case "float_literal": {
                let fstr = `${lv[1]}`;
                return fstr + (fstr.includes(".") ? "f" : ".0f");
            }
            case "decimal_literal": {
                let fstr = `${lv[1]}`;
                return fstr + (fstr.includes(".") ? "d" : ".0d");
            }
            default:
                return notImplemented(`processLiteral -- ${lv[0]}`);
        }
    }

    processConstructor(jv: any[]): string {
        return notImplemented("processConstructor");
    }

    processTuple(jv: any[]): string {
        return notImplemented("processTuple");
    }

    processRecord(jv: any[]): string {
        return notImplemented("processRecord");
    }

    processVariable(jv: any[]): string {
        return this.processName(jv[2]);
    }

    processReference(jv: any[]): string {
        const rr = this.processFQN(jv[2]);

        if (jv[1][0] !== "function") {
            return this.internName(rr);
        }
        else {
            switch (rr) {
                case "morphir_sdk::basics::negate":
                    this.opCurryStack.push({ op: "-", isinfix: false, isdot: false, revargs: false, "args": [] });
                    break;
                case "morphir_sdk::basics::add":
                    this.opCurryStack.push({ op: "+", isinfix: true, isdot: false, revargs: false, "args": [] });
                    break;
                case "morphir_sdk::basics::sub":
                    this.opCurryStack.push({ op: "-", isinfix: true, isdot: false, revargs: false, "args": [] });
                    break;
                case "morphir_sdk::basics::multiply":
                    this.opCurryStack.push({ op: "*", isinfix: true, isdot: false, revargs: false, "args": [] });
                    break;
                case "morphir_sdk::basics::divide":
                    this.opCurryStack.push({ op: "/", isinfix: true, isdot: false, revargs: false, "args": [] });
                    break;
                case "morphir_sdk::basics::integerdivide":
                    this.opCurryStack.push({ op: "/", isinfix: true, isdot: false, revargs: false, "args": [] });
                    break;
                case "morphir_sdk::basics::equal":
                    this.opCurryStack.push({ op: "==", isinfix: true, isdot: false, revargs: false, "args": [] });
                    break;
                case "morphir_sdk::basics::lessthan":
                    this.opCurryStack.push({ op: "<", isinfix: true, isdot: false, revargs: false, "args": [] });
                    break;
                case "morphir_sdk::basics::greaterthan":
                    this.opCurryStack.push({ op: ">", isinfix: true, isdot: false, revargs: false, "args": [] });
                    break;
                case "morphir_sdk::basics::tofloat":
                    this.opCurryStack.push({ op: "toFloat", isinfix: false, isdot: true, revargs: false, "args": [] });
                    break;
                case "morphir_sdk::list::isempty":
                    this.opCurryStack.push({ op: "empty", isinfix: false, isdot: true, revargs: false, "args": [] });
                    break;
                case "morphir_sdk::list::length":
                    this.opCurryStack.push({ op: "size", isinfix: false, isdot: true, revargs: false, "args": [] });
                    break;
                case "morphir_sdk::list::map":
                    this.opCurryStack.push({ op: "map", isinfix: false, isdot: true, revargs: true, "args": [] });
                    break;
                case "morphir_sdk::list::sum":
                    this.opCurryStack.push({ op: "sum", isinfix: false, isdot: true, revargs: false, "args": [] });
                    break;
                default:
                    this.opCurryStack.push({ op: this.internName(rr), isinfix: false, isdot: false, revargs: false, "args": [] });
                    break;
            }

            return FUNCTION_TAG;
        }
    }

    processField(jv: any[]): string {
        const ee = this.processValue(jv[2], EvalMode.Exp, true);
        const ff = jv[3][0];
        
        return `${ee}.${ff}`;
    }

    processFieldFunction(jv: any[]): string {
        return notImplemented("processFieldFunction");
    }

    processApply(jv: any[], force: boolean): string {
        this.processValue(jv[2], EvalMode.Exp, false);
        const ffunc = this.opCurryStack[this.opCurryStack.length - 1] as CurryStackEntry;

        const vv = this.processValue(jv[3], EvalMode.Exp, true);
        ffunc.args.push(vv);

        if(!force) {
            return FUNCTION_TAG;
        }
        else {
            this.opCurryStack.pop();

            if(ffunc.revargs) {
                ffunc.args = ffunc.args.reverse();
            }

            if(ffunc.isinfix) {
                return `(${ffunc.args[0]} ${ffunc.op} ${ffunc.args[1]})`;
            }
            else if(ffunc.isdot) {
                return `(${ffunc.args[0]}).${ffunc.op}(${ffunc.args.slice(1).join(", ")})`;
            }
            else {
                return `${ffunc.op}(${ffunc.args.join(", ")})`;
            }
        }
    }
    
    processLambda(jv: any[]): string {
        //const rtype = this.processType(jv[1][3]);
        const vvar = jv[2][3];
        const body = this.processValue(jv[3], EvalMode.Exp, true);
        
        return `fn(${vvar}) => ${body}`;
    }

    processLet(jv: any[], mode: EvalMode, indent?: string): string {
        return notImplemented("processLet");

        //get count of current scope (we want to know if this is the first let)

        //get var + value assign
        //check if value assign is function!!

        //push onto current scope list

        //compute in value

        //if this was the first let entry (then we need to make a block structure statment -- either yield or return)
        //otherwise just return the value -- with no indent
    }

    processLetRec(jv: any[], mode: EvalMode, indent?: string): string {
        return notImplemented("processLetRec");
    }
    
    processDestructure(jv: any[], mode: EvalMode, indent?: string): string {
        return notImplemented("processDestructure");
    }
    
    processIfThenElse(jv: any[], mode: EvalMode, indent?: string): string {
        const nindent = indent !== undefined ? (indent + "    ") : undefined;

        const test = this.processValue(jv[2], EvalMode.Exp, true);

        this.scopeStack.push([]);
        const tval = this.processValue(jv[3], mode !== EvalMode.Stmt ? EvalMode.Exp : EvalMode.Stmt, true, nindent);
        this.scopeStack.pop();

        this.scopeStack.push([]);
        const fval = this.processValue(jv[4], mode !== EvalMode.Stmt ? EvalMode.Exp : EvalMode.Stmt, true, nindent);
        this.scopeStack.pop();

        const rindent = (indent || "");
        if(mode === EvalMode.Stmt) {
            return `${rindent}if (${test}) {\n${tval}\n${rindent}}\n${rindent}else {\n${fval}\n${rindent}}`;
        }
        else {
            const sep = indent !== undefined ? "\n" : " ";
            const ee = `${indent}if (${test})${sep}${tval}${sep}else${sep}${fval}`;
            if(mode === EvalMode.Exp) {
                return rindent + ee;
            }
            else {
                return rindent + `yield ${ee};`;
            }
        }
    }

    processPatternMatch(jv: any[], mode: EvalMode, indent?: string): string {
        return notImplemented("processPatternMatch");
    }

    processUpdateRecord(jv: any[]): string {
        return notImplemented("processUpdateRecord");
    }

    processResultActionForValue(mode: EvalMode, value: string, indent?: string): string {
        const idtstr = indent || "";

        if(mode === EvalMode.Stmt) {
            return `${idtstr}return ${value};`;
        }
        else if(mode === EvalMode.ExpStmt) {
            return `${idtstr}yield ${value};`;
        }
        else {
            return `${idtstr}${value}`;
        }
    }

    processValue(v: any[], mode: EvalMode, force: boolean, indent?: string): string {
        switch(v[0]) {
            case "literal":
                return this.processResultActionForValue(mode, this.processLiteral(v), indent);
            case "constructor":
                return this.processResultActionForValue(mode, this.processConstructor(v), indent);
            case "tuple":
                return this.processResultActionForValue(mode, this.processTuple(v), indent);
            case "record":
                return this.processResultActionForValue(mode, this.processRecord(v), indent);
            case "variable":
                return this.processResultActionForValue(mode, this.processVariable(v), indent);
            case "reference":
                return this.processResultActionForValue(mode, this.processReference(v), indent);
            case "field":
                return this.processResultActionForValue(mode, this.processField(v), indent);
            case "field_function":
                return this.processResultActionForValue(mode, this.processFieldFunction(v), indent);
            case "apply":
                return this.processResultActionForValue(mode, this.processApply(v, force), indent);
            case "lambda":
                assert(mode === EvalMode.Exp);
                return this.processLambda(v);
            case "let_definition":
                return this.processLet(v, mode, indent);
            case "let_recursion":
                return this.processLetRec(v, mode, indent);
            case "destructure":
                return this.processDestructure(v, mode, indent);
            case "if_then_else":
                return this.processIfThenElse(v, mode, indent);
            case "pattern_match":
                return this.processPatternMatch(v, mode, indent);
            case "update_record":
                return this.processResultActionForValue(mode, this.processUpdateRecord(v), indent);
            default:
                notImplemented("processValue");
                return "[NOT IMPLEMENTED]"
        }
    }

    processFunctionDef(name: string, jv: any): string {
        const args = jv.inputTypes.map((arg: any) => {
            const vv = arg[0][0];
            const tt = this.processType(arg[1])

            return `${vv}: ${tt}`;
        });

        const result = this.processType(jv.outputType);

        this.scopeStack.push([]);
        const body = this.processValue(jv.body, EvalMode.Stmt, true, "    ");
        this.scopeStack.pop();

        return `function ${name}(${args.join(", ")}): ${result} {\n` 
        + body + "\n"
        + "}";
    }
}

function loadMainModule(jv: any): string {
    const jconv: Transpiler = new Transpiler();

    const decls = jv.distribution[3].modules[0].def[1].values.map((vv: any) => {
        const name = vv[0][0];
        const decl = jconv.processFunctionDef(name, vv[1][1]);

        return decl;
    });

    return "namespace NSMain;\n\n" + decls.join("\n");
}

function transpile(jv: object): string {
    return loadMainModule(jv);
}

export {
    transpile
};
