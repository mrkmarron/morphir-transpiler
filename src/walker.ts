
class Transpiler {
    processTypeRef(jv: object): string {
        
    }

    processFunctionDef(): string {

    }
}

function loadMainModule(jv: object): object {
    return jv.distribution[3].modules[0];
}

function transpile(jv: object): string {

}

export {
    transpile
};
