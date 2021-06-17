import * as FS from "fs";
import * as Path from "path";

import * as Commander from "commander";
import chalk from "chalk";

Commander.parse(process.argv);

if (Commander.args.length < 2) {
    process.stdout.write(chalk.red("Error -- Please specify at least one source file and a target file\n"));
    process.exit(1);
}

process.stdout.write(`Reading Morphir source from ${Commander.args[0]}...\n`);

try {
    const source_ir = FS.readFileSync(Commander.args[0]).toString();
    const bsqcode = transpile(JSON.parse(source_ir));

    process.stdout.write(`Writing Bosque source to ${Commander.args[1]}...\n`);
    FS.writeFileSync(xxxx);
}
catch (ex) {
    process.stderr.write(`Failed to transpile --- ${ex}`);
}

process.stdout.write("Done\n");
