/**
 * Process files before / after build
 */
import path from 'path';
import fs from 'fs';
import * as ts from 'typescript';
import { ModuleDeclaration, Node, NodeFlags, SourceFile } from 'typescript';


/* ****************************************************************************************************************** */
// region: Config
/* ****************************************************************************************************************** */

const baseDir = path.resolve(__dirname, '..')
const tsDir = path.join(baseDir, 'TypeScript');
const outPath = path.join(baseDir, 'out');

const manualExports: Record</* filePath */ string, /* Lines */ string[]> = {
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

const postBuildReplacements: [ RegExp, string ][] = [
  [ /((\s+?)|^)const enum /g, '$1enum ' ],
  [ /^\s*?type PerfLogger = .+$/gm, '' ],
  [ /^\s*?export const perfLogger:.+$/gm, '' ],

  // Fixes interfaces that extend from another instance with the same name in a merged ts namespace (ie ts.WatchFactory)
  [ / extends ts\.\S+?(<.+?>)?[\s{]/g, ' ' ]
]

// endregion


/* ****************************************************************************************************************** */
// region: Helpers
/* ****************************************************************************************************************** */

const fixVersion = (tag: string) => {
  const { 1: major, 2: minor, 3: textTag, 4: patch } = tag.match(/^v(\d+?)\.(\d+)([^.]+)?\.?(.+)?/)!;
  return `${major}.${minor}.${patch || 0}${textTag || ''}`;
}


const getRegexForLineBeginsWith = (line:string) => new RegExp(String.raw`^(\s*?)(${line})`, 'gm');
const isNamespace = (node: Node): node is ModuleDeclaration =>
  ts.isModuleDeclaration(node) && !!(node.flags & NodeFlags.Namespace);

/**
 * Transform function to replace "declare namespace ts" with "declare module 'typescript'" + minor cleanup
 * Note: We use this instead of regex, because some exports exists in the form "declare namespace ts.level2.level {}"
 *       In such cases, we want to preserve the level2+ namespaces, wrapping them within our declare module 'typescript'
 *       block.
 */
function transformRootNodes(node: Node): Node {
  if (isNamespace(node) && (node.name.text === 'ts')) {
    const body = node.body && ts.isModuleDeclaration(node.body) ? ts.createModuleBlock([ node.body ]) : node.body;
    return ts.createModuleDeclaration(
      node.decorators,
      [ts.createModifier(ts.SyntaxKind.DeclareKeyword)],
      ts.createStringLiteral("typescript"),
      body,
      ts.NodeFlags.ExportContext | ts.NodeFlags.ContextFlags
    );
  }
  /* Remove useless window and module declarations */
  else if (
    ts.isVariableStatement(node) &&
    node.declarationList.declarations.find(({ name }) => ts.isIdentifier(name) && [ 'window', 'module' ].includes(name.text))
  ) return <any>void 0;
  else return node;
}

const replaceJsonInFile = <T>(filePath: string, replacer: (json: T) => T) => {
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  replacer(data);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// endregion


/* ****************************************************************************************************************** */
// region: Actions
/* ****************************************************************************************************************** */

function preBuild() {
  /* Disable stripInternal setting */
  let cfgPath = path.join(tsDir, 'src/tsconfig-library-base.json');
  if (!fs.existsSync(cfgPath)) cfgPath = path.join(tsDir, 'src/tsconfig-base.json'); // Older TS versions use this
  replaceJsonInFile(cfgPath, (pkg: any) => {
    pkg.compilerOptions.stripInternal = false;
  });

  /* Update manual exports */
  for (const [ fileName, lines ] of Object.entries(manualExports)) {
    const filePath = path.join(tsDir, 'src', fileName);
    if (!fs.existsSync(filePath)) {
      console.warn(`Pre-build manual exports replacer: Could not find file ${filePath}`);
      continue;
    }

    let data = fs.readFileSync(filePath, 'utf8');
    lines.forEach(l => data = data.replace(getRegexForLineBeginsWith(l), '$1export $2'));

    fs.writeFileSync(filePath, data);
  }
}

function postBuild(versionTag: string) {
  const destPath = outPath;
  const definitionsFile = path.resolve(destPath, 'index.d.ts');
  if (!fs.existsSync(definitionsFile)) throw new Error(`Definitions file does not exist: ${definitionsFile}`);

  let data = fs.readFileSync(definitionsFile, 'utf8');

  // Apply regex replacements
  postBuildReplacements.forEach(([ regEx, replacement ]) => data = data.replace(regEx, replacement));

  /* Transform ts namespace declarations to 'typescript' module extensions */
  let sourceFile = ts.createSourceFile(definitionsFile, data, ts.ScriptTarget.Latest);
  sourceFile = ts.visitEachChild(sourceFile, transformRootNodes, (<any>ts).nullTransformationContext) as SourceFile;
  data = ts.createPrinter().printFile(sourceFile);

  fs.writeFileSync(definitionsFile, data);

  /* Copy package file */
  fs.copyFileSync(path.join(baseDir, 'package.json'), path.join(destPath, 'package.json'));
  replaceJsonInFile(path.join(destPath, 'package.json'), (pkg: any) => {
    pkg.version = fixVersion(versionTag);
    pkg.private = false;
  });
}

// endregion


/* ****************************************************************************************************************** */
// region: Implementation
/* ****************************************************************************************************************** */

(function run() {
  const { 2: cmd, 3: versionTag } = process.argv;
  switch(cmd) {
    case 'pre-build': return preBuild();
    case 'post-build': return postBuild(versionTag);
    default:
      throw new Error(`Must supply 'pre-build' or 'post-build' as parameter`);
  }
})();

// endregion
