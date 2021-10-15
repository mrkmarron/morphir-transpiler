"use strict";
//-------------------------------------------------------------------------------------------------------
// Copyright (C) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE.txt file in the project root for full license information.
//-------------------------------------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
const FS = require("fs");
const Path = require("path");
const mir_emitter_1 = require("../compiler/mir_emitter");
const mir_assembly_1 = require("../compiler/mir_assembly");
const Commander = require("commander");
function compile(files, functionalize, outfile, dgf) {
    process.stdout.write("Reading app code...\n");
    let bosque_dir = Path.normalize(Path.join(__dirname, "../"));
    let code = [];
    try {
        const coredir = Path.join(bosque_dir, "core/", "verify");
        const corefiles = FS.readdirSync(coredir);
        for (let i = 0; i < corefiles.length; ++i) {
            const cfpath = Path.join(coredir, corefiles[i]);
            code.push({ fpath: cfpath, filepath: corefiles[i], contents: FS.readFileSync(cfpath).toString() });
        }
        for (let i = 0; i < files.length; ++i) {
            const file = { fpath: files[i], filepath: Path.basename(files[i]), contents: FS.readFileSync(files[i]).toString() };
            code.push(file);
        }
    }
    catch (ex) {
        process.stdout.write(`Read failed with exception -- ${ex}\n`);
        process.exit(1);
    }
    process.stdout.write("Compiling assembly...\n");
    const { masm, errors } = mir_emitter_1.MIREmitter.generateMASM(new mir_assembly_1.PackageConfig(), "debug", [], { namespace: "NSMain", names: ["main"] }, functionalize, code);
    if (errors.length !== 0) {
        for (let i = 0; i < errors.length; ++i) {
            process.stdout.write(`Parse error -- ${errors[i]}\n`);
        }
        process.exit(1);
    }
    process.stdout.write(`Writing assembly to ${outfile}.json...\n`);
    FS.writeFileSync(outfile + ".json", JSON.stringify(masm.jemit(), undefined, 4));
    if (dgf !== undefined) {
        const iiv = masm.invokeDecls.get(dgf);
        if (iiv === undefined) {
            process.stdout.write(`Could not find body for ${dgf}...\n`);
        }
        else {
            process.stdout.write(`Writing assembly to ${outfile}.dgml...\n`);
            const sigargs = iiv.params.map((p) => `${p.name}: ${p.type}`);
            if (iiv.masksize !== 0) {
                sigargs.push("@maskparam@");
            }
            const siginfo = `${iiv.ikey}(${sigargs.join(", ")}): ${iiv.resultType}`;
            FS.writeFileSync(outfile + ".dgml", iiv.body.dgmlify(siginfo));
        }
    }
    process.stdout.write(`Done!\n`);
    process.exit(0);
}
Commander
    .usage("[--output file] <file ...>")
    .option("-f --functionalize [boolean]")
    .option("-d --dgml [function]", "Optional function to output in DGML format")
    .option("-o --output [file]", "Optional output file target");
Commander.parse(process.argv);
if (Commander.args.length === 0) {
    process.stdout.write("Error -- Please specify at least one source file as an argument");
    process.exit(1);
}
setImmediate(() => compile(Commander.args, !!Commander.functionalize, Commander.output || "a", Commander.dgml));
//# sourceMappingURL=bcgen.js.map