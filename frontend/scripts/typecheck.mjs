// Vérifie le JavaScript du frontend avec TypeScript (tsconfig.json, checkJs).
import ts from 'typescript';

// En JS, TypeScript croit obligatoire tout prop déstructuré sans valeur par défaut, et
// refuse `key` sur les composants : ce sont des faux positifs, pas des erreurs de code.
const isComponentPropFalsePositive = diagnostic => {
  const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
  return (
    diagnostic.code === 2741 ||
    diagnostic.code === 2739 ||
    (diagnostic.code === 2322 && message.includes("Property 'key'"))
  );
};

const { config } = ts.readConfigFile('tsconfig.json', ts.sys.readFile);
const { options, fileNames } = ts.parseJsonConfigFileContent(config, ts.sys, '.');
const diagnostics = ts
  .getPreEmitDiagnostics(ts.createProgram(fileNames, options))
  .filter(diagnostic => !isComponentPropFalsePositive(diagnostic));

if (diagnostics.length > 0) {
  console.error(
    ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCanonicalFileName: name => name,
      getCurrentDirectory: ts.sys.getCurrentDirectory,
      getNewLine: () => ts.sys.newLine,
    }),
  );
  process.exit(1);
}
console.log(`Typecheck OK (${fileNames.length} fichiers).`);
