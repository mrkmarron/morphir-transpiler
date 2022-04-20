import * as FS from "fs";
import * as Path from "path";

import { transpile } from "./walker";
import { exec, execSync } from "child_process";

const BSQ_ROOT = Path.join(__dirname, "../bsqdep/impl");

const MORPHIR_ELM_IR_CMD = "morphir-elm make";
const BSQ_CHECK_CMD = `node ${BSQ_ROOT}/bin/cmd/bosque.js apptest`;

const args = process.argv.slice(2);

if(args.length === 0 || (args[0].startsWith("--") && args.length !== 2)) {
    process.stdout.write("Usage:\n");
    process.stdout.write("mchk mir.json\n")
    process.stdout.write("mchk --elm src_dir\n");
    process.stdout.write("mchk --convert mir.json\n");
    process.exit(1);
}

let mir_src = args[0] == "--convert" ? args[1] : args[0];

if(args[0] == "--elm") {
    const src_dir = Path.normalize(args[1]);
    mir_src = Path.join(src_dir, "morphir-ir.json");

    process.stdout.write(`Converting Elm source in ${src_dir}...\n`);

    try {
        execSync(MORPHIR_ELM_IR_CMD, {cwd: src_dir});
    }
    catch(ex) {
        process.stderr.write(`Failed to convert Elm source to MorphirIR -- ${ex}\n`);
        process.exit(1);
    }
}

const srcfile = Path.normalize(mir_src);
const dstdir = Path.join(Path.parse(srcfile).dir, "bsqproj");
const dstsrc = Path.join(dstdir, "app.bsqapi");
const dstpckg = Path.join(dstdir, "package.json");

process.stdout.write(`Transpiling MorphirIR in ${srcfile}...\n`);
let bsqcode = ""
try {
    const source_ir = FS.readFileSync(srcfile).toString();
    bsqcode = transpile(JSON.parse(source_ir));

    process.stdout.write(`Writing Bosque source to ${dstdir}...\n`);
    if(!FS.existsSync(dstdir)) {
        FS.mkdirSync(dstdir);
    }

    FS.writeFileSync(dstsrc, bsqcode);
    
    FS.writeFileSync(dstpckg, JSON.stringify(
        {
            "name": `transpiled-${Path.basename(srcfile, ".json")}`,
            "version": "0.0.0.0",
            "description": "Transpiled code for testing/analysis",
            "license": "MIT",
            "src": {
                "bsqsource": [
                ],
                "entrypoints": [
                    `./app.bsqapi`
                ],
                "testfiles": [
                ]
            }
        },
        undefined, 2
    ));

}
catch (ex) {
    process.stderr.write(`Failed to transpile --- ${ex}`);
}

if(args[0] === "--convert") {
    process.stdout.write("Done\n");
    process.exit(0);
}

process.stdout.write(`Running Bosque checker...\n`);

const cmd = BSQ_CHECK_CMD  + " " + dstpckg;
console.log(cmd);
exec(cmd, (err, out) => {
    if(err) {
        process.stderr.write(`${out}`);
        process.exit(1);
    }
    else {
        process.stdout.write(`${out}\n`);
        process.exit(0);
    }
});


