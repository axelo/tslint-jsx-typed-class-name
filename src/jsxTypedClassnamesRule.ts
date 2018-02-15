import * as ts from 'typescript';
import * as Lint from 'tslint';


export class Rule extends Lint.Rules.AbstractRule {
  public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
    return this.applyWithWalker(new TypedClassNamesWalker(sourceFile, this.getOptions()));
  }
}

// https://github.com/reworkcss/css
// https://github.com/zignd/HTML-CSS-Class-Completion/blob/b8f80901b25950375a90efdde67b18b281201777/src/parse-engines/common/css-class-extractor.ts

const KNOWN_CLASS_NAMES = new Set<string>([
  'text-blue-dark'
]);

class TypedClassNamesWalker extends Lint.RuleWalker {

  public visitJsxAttribute(node: ts.JsxAttribute) {
    if (node.initializer
      && node.initializer.kind === ts.SyntaxKind.StringLiteral
      && node.name.text === 'className') {

      const classNames = node.initializer.getText().slice(1, -1).split(' ');
      const nbOfClassNames = classNames.length;

      let startPos = node.initializer.getStart() + 1;

      for (let i = 0; i < nbOfClassNames; ++i) {
        const className = classNames[i];
        const width = className.length;

        if (width && !KNOWN_CLASS_NAMES.has(className)) {
          this.addFailureAt(startPos, width, `Unknown class name ${className}`);
        }

        startPos += width + 1;
      }

    }

    super.visitJsxAttribute(node);
  }
}
