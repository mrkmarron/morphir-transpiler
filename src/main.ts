import * as FS from "fs";
import * as Path from "path";

import { transpile } from "./walker";
import { exec } from "child_process";
import { remapOutput } from "./src_remap";

const BSQ_ROOT = Path.join(__dirname, "../bsqdep/impl");
const BSQ_CHECK_CMD = `node ${BSQ_ROOT}/bin/runtimes/bsqcheck.js --check `;

function bosque_check_ir(ir: object, cb: (err: any, result: object) => void): void {
    const dstfile = Path.join(BSQ_ROOT, "transpile.bsq");   
    const cmd = BSQ_CHECK_CMD + dstfile;

    try {
        let [bsqcode, sourcelocs] = transpile(ir);
        FS.writeFileSync(dstfile, bsqcode);

        exec(cmd, (err, out) => {
            if (err) {
                cb(err, {});
            }
            else {
                if (sourcelocs.size === 0) {
                    const res = {
                        sourcelines: false,
                        output: out,
                        bsqcode: bsqcode
                    };

                    cb(null, res)
                }
                else {
                    const remap = remapOutput(out, bsqcode, sourcelocs);
                    const res = {
                        sourcelines: true,
                        output: remap,
                        bsqcode: bsqcode
                    };
                    
                    cb(null, res);
                }
            }
        });
    }
    catch (ex) {
        cb(ex, {});
    }
}

export {
    bosque_check_ir
}
