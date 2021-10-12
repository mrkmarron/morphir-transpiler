import * as FS from "fs";
import * as Path from "path";

import { transpile } from "./walker";
import { exec, execSync } from "child_process";
import { remapOutput } from "./src_remap";

const BSQ_ROOT = Path.join(__dirname, "../../BosqueLanguage/impl");

const MORPHIR_ELM_IR_CMD = "morphir-elm make";
const BSQ_CHECK_CMD = `node ${BSQ_ROOT}/bin/runtimes/bsqcheck.js --check `;

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
const dstfile = Path.join(Path.parse(srcfile).dir, "transpile.bsq");

process.stdout.write(`Transpiling MorphirIR in ${srcfile}...\n`);
let bsqcode = ""
let sourcelocs = new Map<string, object>();
try {
    const source_ir = FS.readFileSync(srcfile).toString();
    [bsqcode, sourcelocs] = transpile(JSON.parse(source_ir));

    process.stdout.write(`Writing Bosque source to ${dstfile}...\n`);
    FS.writeFileSync(dstfile, bsqcode);
}
catch (ex) {
    process.stderr.write(`Failed to transpile --- ${ex}`);
}

if(args[0] === "--convert") {
    process.stdout.write("Done\n");
    process.exit(0);
}

process.stdout.write(`Running Bosque checker...\n`);

const cmd = BSQ_CHECK_CMD + dstfile;
exec(cmd, (err, out) => {
    if(err) {
        process.stderr.write(`${err}`);
        process.exit(1);
    }
    else {
        if(sourcelocs.size === 0) {
            process.stdout.write(`${out}\n`);
        }
        else {
            const remap = remapOutput(out, bsqcode, sourcelocs);
            process.stdout.write(`${JSON.stringify(remap, undefined, 4)}\n`);
        }

        process.stdout.write(`Done!\n`);
        process.exit(0);
    }
});


