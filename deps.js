const execSync = require('child_process').execSync;

execSync("git clone bsqdep https://github.com/microsoft/BosqueLanguage.git");
execSync("npm install && npm run-script build", {cwd: "./bsqdep"});
