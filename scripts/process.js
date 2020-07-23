/**
 * Process files before / after build
 */
const path = require('path');
const fs = require('path');


/* ****************************************************************************************************************** */
// region: Config
/* ****************************************************************************************************************** */

const tsDir =  path.resolve(__dirname, '../TypeScript');
const outPath = path.resolve(__dirname, 'out');

const manualExports = {
  './services/refactors/extractSymbol.ts': [
    'const enum Usage',
    'type RangeToExtract',
    'interface TargetRange',
    'enum RangeFacts'
  ],
  './services/formatting/rulesMap.ts': [ 'enum RulesPosition' ],
  './services/codefixes/annotateWithTypeFromJSDoc.ts': [ 'type DeclarationWithType' ],
  './services/codefixes/importFixes.ts': [ 'const enum ImportKind' ],
  './services/symbolDisplay.ts': [ 'interface SymbolDisplayPartsDocumentationAndSymbolKind'],
  './compiler/watchUtilities.ts': [ 'interface FileAndDirectoryExistence' ],
  './compiler/parser.ts': [ 'type PragmaDiagnosticReporter' ],
  './compiler/types.ts': [
    'interface PragmaArgumentSpecification',
    'type ConcretePragmaSpecs',
    'type PragmaArgumentType',
    'type PragmaArgTypeOptional',
    'type PragmaArgTypeMaybeCapture',
  ]
}

const postBuildReplacements = [
  [ /^\s+?declare namespace ts {/, 'declare module "typescript" {'],
  [ /(\s+?)const enum /g, '$1enum ' ],
  [ /^\s+?type PerfLogger = .+$/, '' ],
  [ /^\s+?export const perfLogger:.+$/, '' ]
]

// endregion


/* ****************************************************************************************************************** */
// region: Helpers
/* ****************************************************************************************************************** */

const getRegexForLineBeginsWith = (line) => new RegExp(`^(\s+?)(${line})`);

// endregion


/* ****************************************************************************************************************** */
// region: Actions
/* ****************************************************************************************************************** */

export function preBuild() {
  /* Disable stripInternal setting */
  const configPath = path.join(tsDir, 'src/tsconfig-library-base.json');
  const tsConfigLibBase = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  tsConfigLibBase.compilerOptions.stripInternal = false;
  fs.writeFileSync(configPath, JSON.stringify(tsConfigLibBase));

  /* Update manual exports */
  for (const [ fileName, lines ] of Object.entries(manualExports)) {
    let data = fs.readFileSync(path.join(tsDir, 'src', fileName), 'utf8');

    lines.forEach(l => data = data.replace(getRegexForLineBeginsWith(l), '$1export $2'));
  }
}

export function postBuild(outFile) {
  if (!version) throw new Error(`Must supply output file param ie: post-build typescript-v3.9.6.d.ts`);

  const filePath = path.join(outPath, outFile);
  let data = fs.readFileSync(filePath, 'utf8');

  /* Apply post-build replacements */
  postBuildReplacements.forEach(replaceParams => data = data.replace(...replaceParams));
}

// endregion


/* ****************************************************************************************************************** */
// region: Implementation
/* ****************************************************************************************************************** */

(function run() {
  const { 2: cmd, 3: outFile } = process.argv;
  switch(cmd) {
    case 'pre-build': return preBuild();
    case 'post-build': return postBuild(outFile);
    default:
      throw new Error(`Must supply 'pre-build' or 'post-build' as parameter`);
  }
})();

// endregion
