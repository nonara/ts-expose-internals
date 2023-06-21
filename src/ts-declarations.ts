import * as ts from 'typescript';
import fs from 'fs';
import path from 'path';
import { execCmd } from './utils/exec';


/* ****************************************************************************************************************** */
// region: Helpers
/* ****************************************************************************************************************** */

function transformDts(context: ts.TransformationContext) {
  const { factory } = context;

  return (sourceFile: ts.SourceFile) => {
    const finalStatements = ts.visitNodes(sourceFile.statements, rootVisitor).filter(Boolean)!;

    return factory.updateSourceFile(sourceFile, finalStatements as unknown as ts.Statement[]);

    function rootVisitor(node: ts.Statement): ts.VisitResult<ts.Node | undefined> {
      /* Transform namespace ts to module declaration */
      if (ts.isModuleDeclaration(node) && !!(node.flags & ts.NodeFlags.Namespace)) {
        return factory.createModuleDeclaration(
          node.modifiers,
          ts.factory.createStringLiteral('typescript'),
          ts.visitEachChild(node.body as ts.ModuleBlock, childVisitor, context),
          ts.NodeFlags.ExportContext | ts.NodeFlags.ContextFlags
        );
      }
      /* Elide export = ts */
      else if (ts.isExportAssignment(node) && node.isExportEquals) {
        return undefined;
      }
      return node;
    }

    function childVisitor(node: ts.Node): ts.Node {
      // return node;
      /* Drop leading "ts." from qualified names */
      if (ts.isQualifiedName(node) && ts.isIdentifier(node.left) && node.left.text === 'ts') {
        return factory.createIdentifier(node.right.text);
      }

      return ts.visitEachChild(node, childVisitor, context);
    }
  }
}


// endregion


/* ****************************************************************************************************************** */
// region: Utils
/* ****************************************************************************************************************** */

export function buildTsDeclarations(tsRepoUrl: string, versionTag: string, tsDir: string, fixup?: boolean):
  { dtsContent: string, tsVersion: string }
{
  console.log(`[${versionTag}] Building declarations...`);

  /* Prepare */
  execCmd('npx -y rimraf --no-follow ./* ./.*', { cwd: tsDir }); // wipe current directory
  execCmd(`git clone --depth 1 --branch ${versionTag} --no-tags ${tsRepoUrl} .`, { cwd: tsDir });

  /* Build DTS */
  execCmd('npm install --no-audit', { cwd: tsDir });
  execCmd('npx hereby dts', { cwd: tsDir });

  /* Get internal DTS file */
  let dtsContent = fs.readFileSync(path.join(tsDir, `built/local/typescript.internal.d.ts`), 'utf8');
  if (fixup) dtsContent = module.exports.fixupTsDeclarations(versionTag, dtsContent);

  /* Get TS version */
  const tsVersion = JSON
    .parse(fs.readFileSync(path.join(tsDir, 'package.json'), 'utf8'))
    .version;

  const res = {
    dtsContent,
    tsVersion
  };

  return res;
}

export function fixupTsDeclarations(versionTag: string, dtsContent: string): string {
  console.log(`[${versionTag}] Transforming & verifying declarations...`);

  /* Parse the source file */
  const sourceFile = ts.createSourceFile('typescript.d.ts', dtsContent, ts.ScriptTarget.ES2018, true);

  /* Transform */
  const result = ts.transform(sourceFile, [ transformDts ]);

  /* Print the transformed output */
  const printer = ts.createPrinter();
  const output = printer.printNode(ts.EmitHint.Unspecified, result.transformed[0], sourceFile);

  /* Create new Program w/ transformed */
  const newSourceFile = ts.createSourceFile('typescript.d.ts', output, ts.ScriptTarget.ES2018, true);
  const options = {
    ...ts.getDefaultCompilerOptions(),
    target: ts.ScriptTarget.ES2018,
    lib: [ 'lib.es2018.d.ts' ]
  };
  const host = ts.createCompilerHost(options);

  const originalGetSourceFile = host.getSourceFile;
  host.getSourceFile = (fileName, languageVersion, onError, shouldCreateNewSourceFile) => {
    if (fileName === 'typescript.d.ts') return newSourceFile;
    return originalGetSourceFile.call(host, fileName, languageVersion, onError, shouldCreateNewSourceFile);
  };

  const program = ts.createProgram([ 'typescript.d.ts' ], options, host);

  /* Verify no diagnostic errors */
  const diagnostics = ts.getPreEmitDiagnostics(program, newSourceFile);

  if (diagnostics.length > 0) {
    throw new Error('Transformed file has diagnostics errors:\n\n' + diagnostics.map(d => d.messageText).join('\n'));
  }

  return output;
}

// endregion
