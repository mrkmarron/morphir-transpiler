"use strict";
//-------------------------------------------------------------------------------------------------------
// Copyright (C) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE.txt file in the project root for full license information.
//-------------------------------------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const FS = require("fs");
const Path = require("path");
const Commander = require("commander");
const chalk_1 = require("chalk");
const smt_runner_1 = require("./smt_runner");
const compile_runner_1 = require("./compile_runner");
const icpp_runner_1 = require("./icpp_runner");
const testroot = Path.normalize(Path.join(__dirname, "tests"));
class IndividualTestInfo {
    constructor(name, fullname, code, extraSrc) {
        this.name = name;
        this.fullname = fullname;
        this.code = code;
        this.extraSrc = extraSrc;
    }
    generateTestPlan(restriction, tests) {
        if (restriction === "compile") {
            if (this instanceof IndividualCompileWarnTest) {
                tests.push(this);
            }
        }
        else if (restriction === "check") {
            if ((this instanceof IndividualInfeasibleTestInfo) || (this instanceof IndividualWitnessTestInfo)) {
                tests.push(this);
            }
        }
        else if (restriction === "evaluate") {
            if ((this instanceof IndividualEvaluateTestInfo)) {
                tests.push(this);
            }
        }
        else if (restriction === "smt") {
            if ((this instanceof IndividualInfeasibleTestInfo) || (this instanceof IndividualWitnessTestInfo) || (this instanceof IndividualEvaluateTestInfo)) {
                tests.push(this);
            }
        }
        else if (restriction === "execute") {
            if (this instanceof IndividualICPPTestInfo) {
                tests.push(this);
            }
        }
        else {
            if (restriction === "*" || this.fullname.startsWith(restriction)) {
                tests.push(this);
            }
        }
    }
}
class IndividualCompileWarnTest extends IndividualTestInfo {
    constructor(name, fullname, code, extraSrc) {
        super(name, fullname, code, extraSrc);
    }
    static create(name, fullname, sig, action, code, extraSrc) {
        const rcode = IndividualCompileWarnTest.ctemplate
            .replace("%%SIG%%", sig)
            .replace("%%ACTION%%", action)
            .replace("%%CODE%%", code);
        return new IndividualCompileWarnTest(name, fullname, rcode, extraSrc);
    }
}
IndividualCompileWarnTest.ctemplate = "namespace NSMain;\n\
\n\
%%SIG%% {\n\
    return %%ACTION%%;\n\
}\n\
\n\
%%CODE%%\n\
";
class IndividualInfeasibleTestInfo extends IndividualTestInfo {
    constructor(name, fullname, code, line, extraSrc) {
        super(name, fullname, code, extraSrc);
        this.line = line;
    }
    static create(name, fullname, sig, action, check, code, extraSrc) {
        const rcode = IndividualInfeasibleTestInfo.ctemplate
            .replace("%%SIG%%", sig)
            .replace("%%ACTION%%", action)
            .replace("%%CHECK%%", check)
            .replace("%%CODE%%", code);
        return new IndividualInfeasibleTestInfo(name, fullname, rcode, 5, extraSrc);
    }
}
IndividualInfeasibleTestInfo.ctemplate = "namespace NSMain;\n\
\n\
%%SIG%% {\n\
    let res = %%ACTION%%;\n\
    assert %%CHECK%%;\n\
    return res;\n\
}\n\
\n\
%%CODE%%\n\
";
class IndividualWitnessTestInfo extends IndividualTestInfo {
    constructor(name, fullname, code, line, dosmall, extraSrc) {
        super(name, fullname, code, extraSrc);
        this.line = line;
        this.dosmall = dosmall;
    }
    static create(name, dosmall, fullname, sig, action, check, code, extraSrc) {
        const rcode = IndividualWitnessTestInfo.ctemplate
            .replace("%%SIG%%", sig)
            .replace("%%ACTION%%", action)
            .replace("%%CHECK%%", check)
            .replace("%%CODE%%", code);
        return new IndividualWitnessTestInfo(name, fullname, rcode, 5, dosmall, extraSrc);
    }
}
IndividualWitnessTestInfo.ctemplate = "namespace NSMain;\n\
\n\
%%SIG%% {\n\
    let res = %%ACTION%%;\n\
    assert %%CHECK%%;\n\
    return res;\n\
}\n\
\n\
%%CODE%%\n\
";
class IndividualEvaluateTestInfo extends IndividualTestInfo {
    constructor(name, fullname, code, jargs, expected, extraSrc) {
        super(name, fullname, code, extraSrc);
        this.jargs = jargs;
        this.expected = expected;
    }
    static create(name, fullname, sig, action, code, jargs, expected, extraSrc) {
        const rcode = IndividualEvaluateTestInfo.ctemplate
            .replace("%%SIG%%", sig)
            .replace("%%ACTION%%", action)
            .replace("%%CODE%%", code);
        return new IndividualEvaluateTestInfo(name, fullname, rcode, jargs, expected, extraSrc);
    }
}
IndividualEvaluateTestInfo.ctemplate = "namespace NSMain;\n\
\n\
%%SIG%% {\n\
    return %%ACTION%%;\n\
}\n\
\n\
%%CODE%%\n\
";
class IndividualICPPTestInfo extends IndividualTestInfo {
    constructor(name, fullname, code, jargs, expected, extraSrc) {
        super(name, fullname, code, extraSrc);
        this.jargs = jargs;
        this.expected = expected;
    }
    static create(name, fullname, sig, action, code, jargs, expected, extraSrc) {
        const rcode = IndividualICPPTestInfo.ctemplate
            .replace("%%SIG%%", sig)
            .replace("%%ACTION%%", action)
            .replace("%%CODE%%", code);
        return new IndividualICPPTestInfo(name, fullname, rcode, jargs, expected, extraSrc);
    }
}
IndividualICPPTestInfo.ctemplate = "namespace NSMain;\n\
\n\
%%SIG%% {\n\
    return %%ACTION%%;\n\
}\n\
\n\
%%CODE%%\n\
";
class APITestGroup {
    constructor(groupname, tests) {
        this.groupname = groupname;
        this.tests = tests;
    }
    static create(scopename, spec) {
        const groupname = `${scopename}.${spec.test}`;
        const compiles = (spec.typechk || []).map((tt, i) => IndividualCompileWarnTest.create(`compiler#${i}`, `${groupname}.compiler#${i}`, spec.sig, tt, spec.code, spec.src || undefined));
        const infeasible = (spec.infeasible || []).map((tt, i) => IndividualInfeasibleTestInfo.create(`infeasible#${i}`, `${groupname}.infeasible#${i}`, spec.sig, tt.action, tt.check, spec.code, spec.src || undefined));
        const witness = (spec.witness || []).map((tt, i) => IndividualWitnessTestInfo.create(`witness#${i}`, tt.dosmall || false, `${groupname}.witness#${i}`, spec.sig, tt.action, tt.check, spec.code, spec.src || undefined));
        const evaluate = (spec.evaluates || []).map((tt, i) => IndividualEvaluateTestInfo.create(`evaluate#${i}`, `${groupname}.evaluate#${i}`, spec.sig, tt.action, spec.code, tt.args, tt.result, spec.src || undefined));
        //
        //TODO: ICPP TESTS
        //
        //const icpp = (spec.icpp || []).map((tt, i) => IndividualICPPTestInfo.create(`icpp#${i}`, `${groupname}.icpp#${i}`, spec.sig, tt.action, spec.code, tt.args, tt.result, spec.src || undefined));
        const icpp = [];
        return new APITestGroup(groupname, [...compiles, ...infeasible, ...witness, ...evaluate, ...icpp]);
    }
    generateTestPlan(restriction, tests) {
        this.tests.forEach((tt) => tt.generateTestPlan(restriction, tests));
    }
}
class CategoryTestGroup {
    constructor(categoryname, apitests) {
        this.categoryname = categoryname;
        this.apitests = apitests;
    }
    static create(scopename, spec) {
        const categoryname = `${scopename}.${spec.suite}`;
        const apitests = spec.tests.map((tt) => APITestGroup.create(categoryname, tt));
        return new CategoryTestGroup(categoryname, apitests);
    }
    generateTestPlan(restriction, tests) {
        this.apitests.forEach((tt) => tt.generateTestPlan(restriction, tests));
    }
}
class TestFolder {
    constructor(path, testname, tests) {
        this.path = path;
        this.testname = testname;
        this.tests = tests;
    }
    generateTestPlan(restriction, tests) {
        this.tests.forEach((tt) => tt.generateTestPlan(restriction, tests));
    }
}
class TestSuite {
    constructor(tests) {
        this.tests = tests;
    }
    generateTestPlan(restriction) {
        let tests = [];
        this.tests.forEach((tt) => tt.generateTestPlan(restriction, tests));
        return new TestPlan(this, tests);
    }
}
class TestPlan {
    constructor(suite, tests) {
        this.suite = suite;
        this.tests = tests;
    }
}
class TestResult {
    constructor(test, start, end, status, info) {
        this.test = test;
        this.start = start;
        this.end = end;
        this.status = status;
        this.info = info;
    }
}
class TestRunResults {
    constructor(suite) {
        this.start = new Date(0);
        this.end = new Date(0);
        this.passed = [];
        this.failed = [];
        this.errors = [];
        this.suite = suite;
    }
    getOverallResults() {
        return {
            total: this.passed.length + this.failed.length + this.errors.length,
            elapsed: (this.end.getTime() - this.start.getTime()) / 1000,
            passed: this.passed.length,
            failed: this.failed.length,
            errors: this.errors.length
        };
    }
}
function loadTestSuite() {
    const tdirs = FS.readdirSync(testroot, { withFileTypes: true }).filter((de) => de.isDirectory());
    let tfa = [];
    for (let i = 0; i < tdirs.length; ++i) {
        const dpath = Path.join(testroot, tdirs[i].name);
        const tfiles = FS.readdirSync(dpath).filter((fp) => fp.endsWith(".json"));
        let ctgs = [];
        for (let j = 0; j < tfiles.length; ++j) {
            const fpath = Path.join(dpath, tfiles[j]);
            const fcontents = JSON.parse(FS.readFileSync(fpath, "utf8"));
            ctgs.push(CategoryTestGroup.create(`${tdirs[i].name}.${tfiles[j].replace(".json", "")}`, fcontents));
        }
        tfa.push(new TestFolder(dpath, tdirs[i].name, ctgs));
    }
    return new TestSuite(tfa);
}
function loadSMTTestAssets(suite) {
    let extras = new Map();
    for (let i = 0; i < suite.tests.length; ++i) {
        const tf = suite.tests[i];
        for (let j = 0; j < tf.tests.length; ++j) {
            const ctg = tf.tests[j];
            for (let k = 0; k < ctg.apitests.length; ++k) {
                const stg = ctg.apitests[k];
                stg.tests.filter((iti) => iti.extraSrc !== undefined).forEach((iti) => {
                    const cc = Path.join(testroot, iti.extraSrc);
                    const contents = FS.readFileSync(cc, "utf8");
                    extras.set(iti.extraSrc, contents);
                });
            }
        }
    }
    return {
        extras: extras
    };
}
function loadICPPTestAssets(suite) {
    let extras = new Map();
    for (let i = 0; i < suite.tests.length; ++i) {
        const tf = suite.tests[i];
        for (let j = 0; j < tf.tests.length; ++j) {
            const ctg = tf.tests[j];
            for (let k = 0; k < ctg.apitests.length; ++k) {
                const stg = ctg.apitests[k];
                stg.tests.filter((iti) => iti.extraSrc !== undefined).forEach((iti) => {
                    const cc = Path.join(testroot, iti.extraSrc);
                    const contents = FS.readFileSync(cc, "utf8");
                    extras.set(iti.extraSrc, contents);
                });
            }
        }
    }
    return {
        extras: extras
    };
}
class TestRunner {
    constructor(suite, smtassets, icppassets, plan, maxpar) {
        this.ppos = 0;
        this.inccb = (m) => { ; };
        this.done = (r) => { ; };
        this.suite = suite;
        this.plan = plan;
        this.smt_assets = smtassets;
        this.icpp_assets = icppassets;
        this.pending = [...this.plan.tests];
        this.queued = [];
        this.results = new TestRunResults(suite);
        this.maxpar = maxpar || 8;
    }
    testCompleteActionProcess(test, result, start, end, info) {
        if (result === "pass") {
            this.results.passed.push(new TestResult(test, start, end, "pass", undefined));
            this.inccb(test.fullname + ": " + chalk_1.default.green("pass") + "\n");
        }
        else if (result === "fail" || result === "error") {
            this.results.failed.push(new TestResult(test, start, end, "fail", info));
            const failinfo = info !== undefined ? ` with: \n${info.slice(0, 80)}${info.length > 80 ? "..." : ""}` : "";
            this.inccb(test.fullname + ": " + chalk_1.default.red("fail") + failinfo + "\n");
        }
        else {
            this.results.errors.push(new TestResult(test, start, end, "error", info));
            const errinfo = info !== undefined ? ` with ${info.slice(0, 80)}${info.length > 80 ? "..." : ""}` : "";
            this.inccb(test.fullname + ": " + chalk_1.default.magenta("error") + errinfo + "\n");
        }
    }
    testCompleteActionQueued(test, result, start, end, info) {
        const qidx = this.queued.findIndex((vv) => vv === test.fullname);
        assert(qidx !== -1);
        this.queued.splice(qidx, 1);
        this.testCompleteActionProcess(test, result, start, end, info);
    }
    testCompleteActionInline(test, result, start, end, info) {
        this.testCompleteActionProcess(test, result, start, end, info);
    }
    generateTestResultCallback(test) {
        return (result, start, end, info) => {
            this.testCompleteActionQueued(test, result, start, end, info);
            this.checkAndEnqueueTests();
            if (this.ppos === this.pending.length && this.queued.length === 0) {
                this.done(this.results);
            }
        };
    }
    checkAndEnqueueTests() {
        while (this.queued.length < this.maxpar && this.ppos < this.pending.length) {
            const tt = this.pending[this.ppos++];
            if (tt instanceof IndividualCompileWarnTest) {
                let code = tt.code;
                if (tt.extraSrc !== undefined) {
                    code = code + "\n\n" + this.smt_assets.extras.get(tt.extraSrc);
                }
                const tinfo = compile_runner_1.runCompilerTest(code);
                this.testCompleteActionInline(tt, tinfo.result, tinfo.start, tinfo.end, tinfo.info);
            }
            else if (tt instanceof IndividualInfeasibleTestInfo) {
                let code = tt.code;
                if (tt.extraSrc !== undefined) {
                    code = code + "\n\n" + this.smt_assets.extras.get(tt.extraSrc);
                }
                const handler = this.generateTestResultCallback(tt);
                this.queued.push(tt.fullname);
                try {
                    smt_runner_1.enqueueSMTTestRefute(code, tt.line, handler);
                }
                catch (ex) {
                    handler("error", new Date(), new Date(), `${ex}`);
                }
            }
            else if (tt instanceof IndividualWitnessTestInfo) {
                let code = tt.code;
                if (tt.extraSrc !== undefined) {
                    code = code + "\n\n" + this.smt_assets.extras.get(tt.extraSrc);
                }
                const handler = this.generateTestResultCallback(tt);
                this.queued.push(tt.fullname);
                try {
                    smt_runner_1.enqueueSMTTestWitness(code, tt.line, tt.dosmall, handler);
                }
                catch (ex) {
                    handler("error", new Date(), new Date(), `${ex}`);
                }
            }
            else if (tt instanceof IndividualEvaluateTestInfo) {
                let code = tt.code;
                if (tt.extraSrc !== undefined) {
                    code = code + "\n\n" + this.smt_assets.extras.get(tt.extraSrc);
                }
                const handler = this.generateTestResultCallback(tt);
                this.queued.push(tt.fullname);
                try {
                    smt_runner_1.enqueueSMTTestEvaluate(code, tt.jargs, tt.expected, handler);
                }
                catch (ex) {
                    handler("error", new Date(), new Date(), `${ex}`);
                }
            }
            else if (tt instanceof IndividualICPPTestInfo) {
                let code = tt.code;
                if (tt.extraSrc !== undefined) {
                    code = code + "\n\n" + this.icpp_assets.extras.get(tt.extraSrc);
                }
                const handler = this.generateTestResultCallback(tt);
                this.queued.push(tt.fullname);
                try {
                    icpp_runner_1.enqueueICPPTest(code, tt.jargs, tt.expected, handler);
                }
                catch (ex) {
                    handler("error", new Date(), new Date(), `${ex}`);
                }
            }
            else {
                assert(false);
                break;
            }
        }
    }
    run(inccb, oncomplete) {
        this.results.start = new Date();
        this.inccb = inccb;
        this.done = oncomplete;
        this.checkAndEnqueueTests();
    }
}
////
//Application
let paralleldefault = 4;
if (process.platform === "win32") {
    //
    //TODO: see a super weird EPIPE error if we run in parallel on win32 -- so just run serial as a workaround for now
    //
    paralleldefault = 1;
}
Commander
    .option("-m --parallel [parallel]", "Number of parallel tests to run simultaniously", paralleldefault)
    .option("-r --restriction [spec]", "Limit the test run to a specific set of tests", "*");
Commander.parse(process.argv);
const suite = loadTestSuite();
const plan = suite.generateTestPlan(Commander.restriction);
const smt_assets = loadSMTTestAssets(suite);
const icpp_assets = loadICPPTestAssets(suite);
const runner = new TestRunner(suite, smt_assets, icpp_assets, plan, Commander.parallel);
runner.run((msg) => process.stdout.write(msg), (results) => {
    const gresults = results.getOverallResults();
    process.stdout.write(`Completed ${gresults.total} tests...\n`);
    if (gresults.failed === 0) {
        process.stdout.write(chalk_1.default.bold(`${gresults.passed}`) + " " + chalk_1.default.green("ok") + "\n");
        if (gresults.errors !== 0) {
            process.stdout.write(chalk_1.default.bold(`${gresults.errors}`) + " " + chalk_1.default.magenta("errors") + "\n");
        }
        process.exit(0);
    }
    else {
        process.stdout.write(chalk_1.default.bold(`${gresults.failed}`) + " " + chalk_1.default.red("failures") + "\n");
        process.stdout.write(chalk_1.default.bold(`${gresults.errors}`) + " " + chalk_1.default.magenta("errors") + "\n");
        process.exit(1);
    }
});
//# sourceMappingURL=test_runner.js.map