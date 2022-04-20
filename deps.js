const execSync = require('child_process').execSync;

execSync("git clone https://github.com/microsoft/BosqueLanguage.git bsqdep");
//execSync("git checkout unreachable", {cwd: "./bsqdep/impl"});
execSync("npm install && npm run-script build", {cwd: "./bsqdep/impl"});
