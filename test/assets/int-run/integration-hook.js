const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');


/* ****************************************************************************************************************** */
// region: Locals
/* ****************************************************************************************************************** */

let buildNumber = 0;
let currentVersion = '';

// endregion


/* ****************************************************************************************************************** */
// region: Config
/* ****************************************************************************************************************** */

const versions = process.env.TS_VERSIONS.split(',').map(v => v.trim());
const rootDir = process.cwd();
const tsDir = path.join(rootDir, 'build');
const builtLocalDir = path.join(tsDir, 'built', 'local');
const logFilePath = path.join(rootDir, 'log.txt');

// endregion


/* ****************************************************************************************************************** */
// region: Helpers
/* ****************************************************************************************************************** */

function copyRecursive(filePath, destPath) {
  const stats = fs.statSync(filePath);
  if (stats.isDirectory()) {
    if (!fs.existsSync(destPath)) fs.mkdirSync(destPath, { recursive: true });
    fs.readdirSync(filePath).forEach((item) => {
      copyRecursive(path.join(filePath, item), path.join(destPath, item));
    });
  } else {
    fs.copyFileSync(filePath, destPath);
  }
}

function writeLog(msg) {
  fs.appendFileSync(logFilePath, msg + '\n');
}

function fixupVersionTag(tag) {
  // Fixup tags like v5.1-beta
  if (/^v\d+\.\d+-[a-zA-Z_0-9]+$/.test(tag)) {
    const versionSplit = tag.split('-');
    tag = versionSplit[0] + '.0-' + versionSplit[1];
  }

  return tag;
}

// endregion


/* ****************************************************************************************************************** */
// region: Entry
/* ****************************************************************************************************************** */

fs.writeFileSync(logFilePath, '');

// noinspection JSValidateTypes
childProcess.execSync = (command, opt) => {
  let res = Buffer.from(`cmd >> ${command}`);
  let isValidCmd = false;

  if (command.startsWith('git')) {
    isValidCmd = true;

    if (command.startsWith('git ls-remote --tags')) {
      writeLog(`\nSending Versions:\n`);
      res = Buffer.from(versions.map(v => `0 refs/tags/${v}`).join('\n'));
    }
    else if (command.startsWith('git clone')) {
      currentVersion = '';
      writeLog('\n' + '-'.repeat(25) + '\n');

      const fixedTag = fixupVersionTag(command.split(' ')[5]);
      const version = fixedTag.replace(/^v/, '');
      currentVersion = version;
      fs.writeFileSync(path.join(tsDir, 'package.json'), JSON.stringify({ version }));
    }
    else if (command.startsWith('git rev-parse HEAD')) {
      res = Buffer.from((++buildNumber).toString());
    }
  }

  else if (command.startsWith('npm')) {
    isValidCmd = true;

    if (command.startsWith('npm publish')) {
      const srcDir = path.resolve(opt.cwd || '');
      if (!srcDir || !currentVersion) throw new Error('Invalid publish command');

      const destDir = path.resolve(rootDir, 'dist', currentVersion);
      if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

      copyRecursive(srcDir, destDir);
    }
  }

  else if (command.startsWith('npx hereby dts')) {
    isValidCmd = true;
    if (!fs.existsSync(builtLocalDir)) fs.mkdirSync(builtLocalDir, { recursive: true });
    fs.copyFileSync(
      path.join(process.cwd(), 'dummy-typescript.internal.d.ts'),
      path.join(builtLocalDir, 'typescript.internal.d.ts')
    );
    writeLog(`\nCopied dummy-typescript.internal.d.ts to ${builtLocalDir}\n`);
  }

  writeLog(res.toString('utf8'));

  if (!isValidCmd) {
    process.stderr.write(`Unexpected execSync command: ${command}\n`);
    process.exit(-1);
  }

  return res;
};


// endregion
