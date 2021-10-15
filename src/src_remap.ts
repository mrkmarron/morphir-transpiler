
function remapOutput(output: string, src: string, srclocs: Map<string, object>): object[] {
    if(!output.includes("-- line ")) {
        return [];
    }
    else {
        let lines = output.split("\n");
        const idx = lines.findIndex((ll) => ll.includes("-- line "));

        lines = lines.slice(idx);

        const emend = lines[0].indexOf(" -- line ");
        const error = lines[0].slice(0, emend);

        const linestart = emend + " -- line ".length;
        const lineend = lines[0].indexOf(" in ");
        const llnum = Number.parseInt(lines[0].slice(linestart, lineend));

        const slines = src.split("\n");
        const eline = slines[llnum - 1].trim();
        const ssidx = eline.indexOf("*/");
        const slookup = eline.slice(0, ssidx + "*/".length);
        const sloc = srclocs.get(slookup) as object;

        return [
            {
                msg: error,
                witness: JSON.parse(lines.slice(1).join("\n")),
                srclocation: sloc,
                bosque: src
            }
        ]
    }
}

export {
    remapOutput
};
