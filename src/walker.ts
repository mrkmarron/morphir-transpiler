import * as assert from "assert";

function notImplemented(of: string): string {
    console.log("Not Implemented -- " + of);
    assert(false);

    return "[NOT IMPLEMENTED]";
}

enum VKind {
    Exp,
    Stmt,
    Lambda
}

type LetStackEntry = string[];

type CurryStackEntry = {
    op: string;
    isinfix: boolean;
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
        assert((tparams as any[]).length === 0);

        const fqn = this.processFQN(jv[2]);
        switch(fqn) {
            case "morphir_sdk::basics::bool": 
                return "Bool";
            case "morphir_sdk::basics::int": 
                return "Int";
            default:
                return this.internName(fqn);
        }
    }

    processTypeTuple(jv: any[]): string {
        return notImplemented("TypeTuple");
    }

    processTypeRecord(jv: any[]): string {
        return notImplemented("TypeRecord");
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
            case "float_literal":
                return `${lv[1]}f`;
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
                case "morphir_sdk::basics::add":
                    this.opCurryStack.push({ op: "+", isinfix: true, "args": [] });
                    break;
                case "morphir_sdk::basics::sub":
                    this.opCurryStack.push({ op: "-", isinfix: true, "args": [] });
                    break;
                case "morphir_sdk::basics::mult":
                    this.opCurryStack.push({ op: "*", isinfix: true, "args": [] });
                    break;
                case "morphir_sdk::basics::div":
                    this.opCurryStack.push({ op: "/", isinfix: true, "args": [] });
                    break;
                case "morphir_sdk::basics::greaterthan":
                    this.opCurryStack.push({ op: ">", isinfix: true, "args": [] });
                    break;
                default:
                    this.opCurryStack.push({ op: this.internName(rr), isinfix: true, "args": [] });
                    break;
            }

            return FUNCTION_TAG;
        }
    }

    processField(jv: any[]): string {
        return notImplemented("processField");
    }

    processFieldFunction(jv: any[]): string {
        return notImplemented("processFieldFunction");
    }

    processApply(jv: any[], force: boolean): string {
        this.processValue(jv[2], false, false);
        const ffunc = this.opCurryStack[this.opCurryStack.length - 1] as CurryStackEntry;

        const vv = this.processValue(jv[3], false, true);
        ffunc.args.push(vv[1]);

        if(!force) {
            return FUNCTION_TAG;
        }
        else {
            this.opCurryStack.pop();

            if(ffunc.isinfix) {
                return `(${ffunc.args[0]} ${ffunc.op} ${ffunc.args[1]})`;
            }
            else {
                return `${ffunc.op}(${ffunc.args.join(", ")})`;
            }
        }
    }
    
    processLambda(jv: any[]): string {
        return notImplemented("processLambda");
    }

    processLet(jv: any[], stmtresult: boolean, indent?: string): string {
        return notImplemented("processLet");

        //get count of current scope (we want to know if this is the first let)

        //get var + value assign
        //check if value assign is function!!

        //push onto current scope list

        //compute in value

        //if this was the first let entry (then we need to make a block structure statment -- either yield or return)
        //otherwise just return the value -- with no indent
    }

    processLetRec(jv: any[]): string {
        return notImplemented("processLetRec");
    }
    
    processDestructure(jv: any[]): string {
        return notImplemented("processDestructure");
    }
    
    processIfThenElse(jv: any[], stmtresult: boolean, indent?: string): string {
        const nindent = indent !== undefined ? (indent + "  ") : undefined;

        const test = this.processValue(jv[2], false, true);

        this.scopeStack.push([]);
        const tval = this.processValue(jv[3], stmtresult, true, nindent);
        this.scopeStack.pop();

        this.scopeStack.push([]);
        const fval = this.processValue(jv[4], stmtresult, true, nindent);
        this.scopeStack.pop();

        const sep = indent !== undefined ? ("\n" + indent) : " ";
        if(!stmtresult) {
            return `if (${test[1]})${sep}${tval[1]}${sep}else${sep}${fval[1]}`;
        }
        else {
            const tstmt = tval[0] === VKind.Exp ? `{\n${indent + "  "}return ${tval[1].trim()};\n${indent}}` : tval;
            const fstmt = fval[0] === VKind.Exp ? `{\n${indent + "  "}return ${fval[1].trim()};\n${indent}}` : fval;

            return `if (${test[1]})${sep}${tstmt}${sep}else${sep}${fstmt}`;
        }
    }

    processPatternMatch(jv: any[]): string {
        return notImplemented("processPatternMatch");
    }

    processUpdateRecord(jv: any[]): string {
        return notImplemented("processUpdateRecord");
    }

    processValue(v: any[], stmtresult: boolean, force: boolean, indent?: string): [VKind, string] {
        let res = [VKind.Exp, ""];
        switch(v[0]) {
            case "literal":
                res = [VKind.Exp, this.processLiteral(v)];
                break;
            case "constructor":
                res = [VKind.Exp, this.processConstructor(v)];
                break;
            case "tuple":
                res = [VKind.Exp, this.processTuple(v)];
                break;
            case "record":
                res = [VKind.Exp, this.processRecord(v)];
                break;
            case "variable":
                res = [VKind.Exp, this.processVariable(v)];
                break;
            case "reference":
                res = [VKind.Exp, this.processReference(v)];
                break;
            case "field":
                res = [VKind.Exp, this.processField(v)];
                break;
            case "field_function":
                res = [VKind.Exp, this.processFieldFunction(v)];
                break;
            case "apply":
                res = [VKind.Exp, this.processApply(v, force)];
                break;
            case "lambda":
                res = [VKind.Lambda, this.processLambda(v)];
                break;
            case "let_definition":
                res = [stmtresult ? VKind.Stmt : VKind.Exp, this.processLet(v, stmtresult, indent)];
                break;
            case "let_recursion":
                res = [stmtresult ? VKind.Stmt : VKind.Exp, this.processLetRec(v)];
                break;
            case "destructure":
                res = [VKind.Exp, this.processDestructure(v)];
                break;
            case "if_then_else":
                res = [stmtresult ? VKind.Stmt : VKind.Exp, this.processIfThenElse(v, stmtresult, indent)];
                break;
            case "pattern_match":
                res = [VKind.Exp, this.processPatternMatch(v)];
                break;
            case "update_record":
                res = [VKind.Exp, this.processUpdateRecord(v)];
                break;
            default:
                notImplemented("processValue");
                break;
        }

        if(indent === undefined) {
            return res as [VKind, string];
        }
        else {
            return [res[0] as VKind, indent + res[1] as string];
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
        const body = this.processValue(jv.body, true, true, "  ")[1];
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

    return "namespace Main;\n\n" + decls.join("\n");
}

function transpile(jv: object): string {
    return loadMainModule(jv);
}

export {
    transpile
};
