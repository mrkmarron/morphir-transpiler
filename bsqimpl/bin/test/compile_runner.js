"use strict";
//-------------------------------------------------------------------------------------------------------
// Copyright (C) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE.txt file in the project root for full license information.
//-------------------------------------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
exports.runCompilerTest = void 0;
const FS = require("fs");
const Path = require("path");
const mir_assembly_1 = require("../compiler/mir_assembly");
const mir_emitter_1 = require("../compiler/mir_emitter");
const bosque_dir = Path.normalize(Path.join(__dirname, "../../"));
function workflowLoadCoreSrc() {
    try {
        let code = [];
        const coredir = Path.join(bosque_dir, "bin/core/verify");
        const corefiles = FS.readdirSync(coredir);
        for (let i = 0; i < corefiles.length; ++i) {
            const cfpath = Path.join(coredir, corefiles[i]);
            code.push({ fpath: cfpath, filepath: corefiles[i], contents: FS.readFileSync(cfpath).toString() });
        }
        return code;
    }
    catch (ex) {
        return undefined;
    }
}
function generateMASM(usercode, entrypoint) {
    const corecode = workflowLoadCoreSrc();
    const code = [...corecode, ...usercode];
    let namespace = "NSMain";
    let entryfunc = "main";
    const cpos = entrypoint.indexOf("::");
    if (cpos === -1) {
        entryfunc = entrypoint;
    }
    else {
        namespace = entrypoint.slice(0, cpos);
        entryfunc = entrypoint.slice(cpos + 2);
    }
    return mir_emitter_1.MIREmitter.generateMASM(new mir_assembly_1.PackageConfig(), "debug", [], { namespace: namespace, names: [entryfunc] }, true, code);
}
function runCompilerTest(testsrc) {
    const start = new Date();
    const codeinfo = [{ fpath: "test.bsq", filepath: "test.bsq", contents: testsrc }];
    try {
        const { masm, errors } = generateMASM(codeinfo, "NSMain::main");
        return {
            result: masm === undefined ? "pass" : "fail",
            start: start,
            end: new Date(),
            info: errors.join("\n")
        };
    }
    catch (ex) {
        return {
            result: "error",
            start: start,
            end: new Date,
            info: `${ex}`
        };
    }
}
exports.runCompilerTest = runCompilerTest;
//# sourceMappingURL=compile_runner.js.map