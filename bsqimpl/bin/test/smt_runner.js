"use strict";
//-------------------------------------------------------------------------------------------------------
// Copyright (C) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE.txt file in the project root for full license information.
//-------------------------------------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
exports.enqueueSMTTestEvaluate = exports.enqueueSMTTestWitness = exports.enqueueSMTTestRefute = void 0;
const smt_workflows_1 = require("../tooling/verifier/smt_workflows");
const vopts_refute = {
    ISize: 8,
    StringOpt: "ASCII",
    EnableCollection_SmallHavoc: true,
    EnableCollection_LargeHavoc: true,
    EnableCollection_SmallOps: false,
    EnableCollection_LargeOps: true
};
const vopts_witnesssmall = {
    ISize: 5,
    StringOpt: "ASCII",
    EnableCollection_SmallHavoc: true,
    EnableCollection_LargeHavoc: false,
    EnableCollection_SmallOps: true,
    EnableCollection_LargeOps: false
};
const vopts_witnesslarge = {
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
const vopts_err = {
    ISize: 64,
    StringOpt: "ASCII",
    EnableCollection_SmallHavoc: false,
    EnableCollection_LargeHavoc: true,
    EnableCollection_SmallOps: false,
    EnableCollection_LargeOps: true
};
function enqueueSMTTestRefute(testsrc, trgtline, cb) {
    const start = new Date();
    const codeinfo = [{ fpath: "test.bsq", filepath: "test.bsq", contents: testsrc }];
    const allerrors = smt_workflows_1.workflowGetErrors(codeinfo, vopts_err, "NSMain::main");
    const errlocation = allerrors !== undefined ? allerrors.find((ee) => ee.file === "test.bsq" && ee.line === trgtline) : undefined;
    if (errlocation === undefined) {
        cb("error", start, new Date(), "Invalid trgt line");
    }
    else {
        smt_workflows_1.workflowBSQInfeasibleSingle(codeinfo, vopts_refute, smt_workflows_1.DEFAULT_TIMEOUT, errlocation, "NSMain::main", (result) => {
            const end = new Date();
            try {
                const jres = JSON.parse(result);
                const rkind = jres["result"];
                if (rkind === "error") {
                    cb("error", start, end, result);
                }
                else if (rkind === "timeout") {
                    cb("unknown/timeout", start, end, result);
                }
                else if (rkind === "possible") {
                    cb("fail", start, end, result);
                }
                else {
                    cb("pass", start, end);
                }
            }
            catch (ex) {
                cb("error", start, end, `${ex}`);
            }
        });
    }
}
exports.enqueueSMTTestRefute = enqueueSMTTestRefute;
function enqueueSMTTestWitness(testsrc, trgtline, dosmall, cb) {
    const start = new Date();
    const codeinfo = [{ fpath: "test.bsq", filepath: "test.bsq", contents: testsrc }];
    const allerrors = smt_workflows_1.workflowGetErrors(codeinfo, vopts_err, "NSMain::main");
    const errlocation = allerrors !== undefined ? allerrors.find((ee) => ee.file === "test.bsq" && ee.line === trgtline) : undefined;
    if (errlocation === undefined) {
        cb("error", start, new Date(), "Invalid trgt line");
    }
    else {
        smt_workflows_1.workflowBSQWitnessSingle(codeinfo, dosmall ? vopts_witnesssmall : vopts_witnesslarge, smt_workflows_1.DEFAULT_TIMEOUT, errlocation, "NSMain::main", (result) => {
            const end = new Date();
            try {
                const jres = JSON.parse(result);
                const rkind = jres["result"];
                if (rkind === "error") {
                    cb("error", start, end, result);
                }
                else if (rkind === "timeout") {
                    cb("unknown/timeout", start, end, result);
                }
                else if (rkind === "unreachable") {
                    cb("fail", start, end, result);
                }
                else {
                    cb("pass", start, end, result);
                }
            }
            catch (ex) {
                cb("error", start, end, `${ex}`);
            }
        });
    }
}
exports.enqueueSMTTestWitness = enqueueSMTTestWitness;
function enqueueSMTTestEvaluate(testsrc, jin, expected, cb) {
    const start = new Date();
    const codeinfo = [{ fpath: "test.bsq", filepath: "test.bsq", contents: testsrc }];
    smt_workflows_1.workflowEvaluateSingle(codeinfo, jin, vopts_evaluate, smt_workflows_1.DEFAULT_TIMEOUT, "NSMain::main", (result) => {
        const end = new Date();
        try {
            const jres = JSON.parse(result);
            const rkind = jres["result"];
            if (rkind === "error") {
                cb("error", start, end, result);
            }
            else if (rkind === "timeout") {
                cb("unknown/timeout", start, end, result);
            }
            else if (rkind === "unreachable") {
                if (expected === undefined) {
                    cb("pass", start, end);
                }
                else {
                    cb("fail", start, end, result);
                }
            }
            else {
                const routput = JSON.stringify(jres["output"]);
                const eoutput = JSON.stringify(expected);
                if (routput === eoutput) {
                    cb("pass", start, end, result);
                }
                else {
                    cb("fail", start, end, `Expected: ${eoutput} -- Result: ${routput}`);
                }
            }
        }
        catch (ex) {
            cb("error", start, end, `${ex}`);
        }
    });
}
exports.enqueueSMTTestEvaluate = enqueueSMTTestEvaluate;
//# sourceMappingURL=smt_runner.js.map