"use strict";
//-------------------------------------------------------------------------------------------------------
// Copyright (C) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE.txt file in the project root for full license information.
//-------------------------------------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
const chalk_1 = require("chalk");
const readline = require("readline");
const path = require("path");
const smt_workflows_1 = require("../tooling/verifier/smt_workflows");
function parseLocation(location) {
    try {
        const errfile = location.slice(0, location.indexOf("@"));
        const errline = Number.parseInt(location.slice(location.indexOf("@") + 1, location.indexOf("#")));
        const errpos = Number.parseInt(location.slice(location.indexOf("#") + 1));
        return { file: errfile, line: errline, pos: errpos };
    }
    catch (ex) {
        return undefined;
    }
}
const mode = process.argv[2];
const args = process.argv.slice(3);
const vopts_unreachable = {
    ISize: 8,
    StringOpt: "ASCII",
    EnableCollection_SmallHavoc: true,
    EnableCollection_LargeHavoc: true,
    EnableCollection_SmallOps: false,
    EnableCollection_LargeOps: true
};
const vopts_smallwitness = {
    ISize: 5,
    StringOpt: "ASCII",
    EnableCollection_SmallHavoc: true,
    EnableCollection_LargeHavoc: false,
    EnableCollection_SmallOps: true,
    EnableCollection_LargeOps: false
};
const vopts_largewitness = {
    ISize: 8,
    StringOpt: "ASCII",
    EnableCollection_SmallHavoc: true,
    EnableCollection_LargeHavoc: true,
    EnableCollection_SmallOps: true,
    EnableCollection_LargeOps: true
};
const vopts_evaluate = {
    ISize: 8,
    StringOpt: "ASCII",
    EnableCollection_SmallHavoc: true,
    EnableCollection_LargeHavoc: true,
    EnableCollection_SmallOps: true,
    EnableCollection_LargeOps: true
};
const error_vopts = {
    ISize: 64,
    StringOpt: "ASCII",
    EnableCollection_SmallHavoc: false,
    EnableCollection_LargeHavoc: true,
    EnableCollection_SmallOps: false,
    EnableCollection_LargeOps: true
};
if (mode === "--output") {
    let smtmode = args[0];
    if (smtmode !== "unreachable" && smtmode !== "smallwitness" && smtmode !== "largewitness" && smtmode !== "evaluate" && smtmode !== "invert") {
        process.stdout.write("Valid mode options are unreachable | witness | evaluate | invert\n");
        process.exit(1);
    }
    const smtonly = args[1] === "--smt";
    const location = (smtmode !== "evaluate") ? parseLocation(args[smtonly ? 2 : 1]) : { file: "[ignore]", line: -1, pos: -1 };
    let files = (smtmode !== "evaluate") ? args.slice(smtonly ? 3 : 2) : args.slice(smtonly ? 2 : 1);
    if (location === undefined) {
        process.stdout.write("Location should be of the form file.bsq@line#pos\n");
        process.exit(1);
    }
    const usercode = smt_workflows_1.workflowLoadUserSrc(files);
    if (usercode === undefined) {
        process.stdout.write("Could not load code files\n");
        process.exit(1);
    }
    const fparse = path.parse(files[0]);
    const into = path.join(fparse.dir, fparse.name + (smtonly ? ".smt2" : ".json"));
    process.stdout.write(`Writing file to ${into}\n`);
    const asmflavor = smtmode === "unreachable" ? smt_workflows_1.AssemblyFlavor.UFOverApproximate : smt_workflows_1.AssemblyFlavor.RecuriveImpl;
    let vopts = vopts_evaluate;
    let mmode = "evaluate";
    if (smtmode === "unreachable") {
        vopts = vopts_unreachable;
        mmode = "unreachable";
    }
    else if (smtmode === "smallwitness") {
        vopts = vopts_smallwitness;
        mmode = "witness";
    }
    else if (smtmode === "largewitness") {
        vopts = vopts_largewitness;
        mmode = "witness";
    }
    else {
        if (smtmode === "invert") {
            mmode = "invert";
        }
    }
    smt_workflows_1.workflowEmitToFile(into, usercode, asmflavor, mmode, smt_workflows_1.DEFAULT_TIMEOUT, vopts, location, "NSMain::main", smtonly);
}
else if (mode === "--unreachable") {
    const location = parseLocation(args[0]);
    if (location === undefined) {
        process.stderr.write("Location should be of the form file.bsq@line#pos\n");
        process.exit(1);
    }
    const files = args.slice(1);
    const usercode = smt_workflows_1.workflowLoadUserSrc(files);
    if (usercode === undefined) {
        process.stdout.write("Could not load code files\n");
        process.exit(1);
    }
    smt_workflows_1.workflowBSQInfeasibleSingle(usercode, vopts_unreachable, smt_workflows_1.DEFAULT_TIMEOUT, location, "NSMain::main", (res) => {
        process.stdout.write(res + "\n");
    });
}
else if (mode === "--smallwitness") {
    const location = parseLocation(args[0]);
    if (location === undefined) {
        process.stderr.write("Location should be of the form file.bsq@line#pos\n");
        process.exit(1);
    }
    const files = args.slice(1);
    const usercode = smt_workflows_1.workflowLoadUserSrc(files);
    if (usercode === undefined) {
        process.stdout.write("Could not load code files\n");
        process.exit(1);
    }
    smt_workflows_1.workflowBSQWitnessSingle(usercode, vopts_smallwitness, smt_workflows_1.DEFAULT_TIMEOUT, location, "NSMain::main", (res) => {
        process.stdout.write(res + "\n");
    });
}
else if (mode === "--largewitness") {
    const location = parseLocation(args[0]);
    if (location === undefined) {
        process.stderr.write("Location should be of the form file.bsq@line#pos\n");
        process.exit(1);
    }
    const files = args.slice(1);
    const usercode = smt_workflows_1.workflowLoadUserSrc(files);
    if (usercode === undefined) {
        process.stdout.write("Could not load code files\n");
        process.exit(1);
    }
    smt_workflows_1.workflowBSQWitnessSingle(usercode, vopts_largewitness, smt_workflows_1.DEFAULT_TIMEOUT, location, "NSMain::main", (res) => {
        process.stdout.write(res + "\n");
    });
}
else if (mode === "--check") {
    const printprocess = (args[0] === "--verbose");
    const quiet = (args[0] === "--quiet");
    const files = args.slice((printprocess || quiet) ? 1 : 0);
    const usercode = smt_workflows_1.workflowLoadUserSrc(files);
    if (usercode === undefined) {
        process.stdout.write("Could not load code files\n");
        process.exit(1);
    }
    const errors = smt_workflows_1.workflowGetErrors(usercode, error_vopts, "NSMain::main");
    if (errors === undefined) {
        process.stdout.write("Failed to load error lines\n");
        process.exit(1);
    }
    if (errors.length === 0) {
        process.stdout.write(chalk_1.default.green("No errors are possible in this program!\n"));
        process.exit(0);
    }
    process.stdout.write(chalk_1.default.bold(`Analyzing ${errors.length} possible error(s) in program...\n`));
    //
    //TODO: we probably want to make this a process parallel process
    //
    let icount = 0;
    let wcount = 0;
    let pcount = 0;
    let ecount = 0;
    let fcount = 0;
    let witnesslist = [];
    for (let i = 0; i < errors.length; ++i) {
        if (!quiet) {
            process.stdout.write(`Checking error ${errors[i].msg} at ${errors[i].file}@${errors[i].line}#${errors[i].pos}...\n`);
        }
        const jres = smt_workflows_1.workflowBSQCheck(usercode, smt_workflows_1.DEFAULT_TIMEOUT, errors[i], "NSMain::main", printprocess);
        if (jres === undefined) {
            if (!quiet) {
                process.stdout.write(chalk_1.default.red(`Failed with internal errors :(\n`));
            }
            fcount++;
        }
        else if (jres.result === "unreachable") {
            if (!quiet) {
                process.stdout.write(chalk_1.default.green(`Proved unreachable in ${jres.time}s!\n`));
            }
            icount++;
        }
        else if (jres.result === "witness") {
            if (!quiet) {
                process.stdout.write(chalk_1.default.magenta(`Generated witness input in ${jres.time}s!\n`));
                //process.stdout.write(`${jres.input}\n`);
            }
            wcount++;
            witnesslist.push({ msg: errors[i].msg, position: `line ${errors[i].line} in ${errors[i].file}`, input: jres.input });
        }
        else if (jres.result === "partial") {
            if (!quiet) {
                process.stdout.write(chalk_1.default.blue(`Proved unreachable on partial space.\n`));
            }
            pcount++;
        }
        else if (jres.result === "nosmall") {
            if (!quiet) {
                process.stdout.write(chalk_1.default.blue(`No errors possible on partial space.\n`));
            }
            pcount++;
        }
        else {
            if (!quiet) {
                process.stdout.write(`Exhausted resource bounds without finding failures.\n`);
            }
            ecount++;
        }
    }
    if (fcount !== 0) {
        process.stdout.write(chalk_1.default.yellow(`Failed on ${fcount} error(s)!\n`));
    }
    if (icount !== 0) {
        process.stdout.write(chalk_1.default.green(`Proved ${icount} error(s) unreachable on all executions!\n`));
    }
    if (wcount !== 0) {
        process.stdout.write(chalk_1.default.red(`Found failing inputs for ${wcount} error(s)!\n`));
        for (let i = 0; i < witnesslist.length; ++i) {
            process.stdout.write(`${witnesslist[i].msg} -- ${witnesslist[i].position}\n`);
            process.stdout.write(JSON.stringify(witnesslist[i].input, undefined, 2) + "\n");
        }
    }
    if (pcount !== 0) {
        process.stdout.write(chalk_1.default.blue(`Proved ${pcount} error(s) unreachable on a subset of excutions (and found no failing inputs)!\n`));
    }
    if (ecount !== 0) {
        process.stdout.write(chalk_1.default.blue(`Exhausted search on ${ecount} error(s) and found no failing inputs.\n`));
    }
}
else if (mode === "--evaluate") {
    const files = args;
    const usercode = smt_workflows_1.workflowLoadUserSrc(files);
    if (usercode === undefined) {
        process.stdout.write("Could not load code files\n");
        process.exit(1);
    }
    let rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    rl.question(">> ", (input) => {
        try {
            const jinput = JSON.parse(input);
            smt_workflows_1.workflowEvaluateSingle(usercode, jinput, vopts_evaluate, smt_workflows_1.DEFAULT_TIMEOUT, "NSMain::main", (res) => {
                try {
                    const jres = JSON.parse(res);
                    if (jres["result"] === "unreachable") {
                        process.stdout.write(`No valid (non error) result exists for this input!\n`);
                    }
                    else if (jres["result"] === "output") {
                        process.stdout.write(`Generated output in ${jres["time"]} millis!\n`);
                        process.stdout.write(JSON.stringify(jres["output"], undefined, 2) + "\n");
                    }
                    else if (jres["result"] === "timeout") {
                        process.stdout.write(`Solver timeout :(\n`);
                    }
                    else {
                        process.stdout.write(`Failed with -- ${JSON.stringify(jres)}`);
                    }
                    process.exit(0);
                }
                catch (ex) {
                    process.stderr.write(`Failure ${ex}\n`);
                    process.exit(1);
                }
            });
        }
        catch (ex) {
            process.stderr.write(`Failure ${ex}\n`);
            process.exit(1);
        }
    });
}
else if (mode === "--invert") {
    const files = args;
    const usercode = smt_workflows_1.workflowLoadUserSrc(files);
    if (usercode === undefined) {
        process.stdout.write("Could not load code files\n");
        process.exit(1);
    }
    let rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    rl.question(">> ", (input) => {
        try {
            const joutput = JSON.parse(input);
            smt_workflows_1.workflowInvertSingle(usercode, joutput, vopts_evaluate, smt_workflows_1.DEFAULT_TIMEOUT, "NSMain::main", (res) => {
                try {
                    const jres = JSON.parse(res);
                    if (jres["result"] === "unreachable") {
                        process.stdout.write(`No valid (non error) input exists for this output!\n`);
                    }
                    else if (jres["result"] === "witness") {
                        process.stdout.write(`Generated candidate input in ${jres["time"]} millis!\n`);
                        process.stdout.write(JSON.stringify(jres["input"], undefined, 2) + "\n");
                    }
                    else if (jres["result"] === "timeout") {
                        process.stdout.write(`Solver timeout :(\n`);
                    }
                    else {
                        process.stdout.write(`Failed with -- ${jres}`);
                    }
                    process.exit(0);
                }
                catch (ex) {
                    process.stderr.write(`Failure ${ex}\n`);
                    process.exit(1);
                }
            });
        }
        catch (ex) {
            process.stderr.write(`Failure ${ex}\n`);
            process.exit(1);
        }
    });
}
else {
    const files = args;
    const usercode = smt_workflows_1.workflowLoadUserSrc(files);
    if (usercode === undefined) {
        process.stdout.write("Could not load code files\n");
        process.exit(1);
    }
    const errors = smt_workflows_1.workflowGetErrors(usercode, error_vopts, "NSMain::main");
    if (errors === undefined) {
        process.stderr.write("Failed to load error lines\n");
        process.exit(1);
    }
    process.stdout.write("Possible Errors:\n");
    process.stdout.write(JSON.stringify(errors, undefined, 2) + "\n");
}
//# sourceMappingURL=bsqcheck.js.map