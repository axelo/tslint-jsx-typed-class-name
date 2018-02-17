import * as ts from 'typescript';
import * as Lint from 'tslint';

export class Rule extends Lint.Rules.AbstractRule {

  static metadata: {
    ruleName: 'jsx-typed-class-name',
    type: 'maintainability',
    description: '',
    optionsDescription: '',
    options: null,
    typescriptOnly: false
  };

  constructor(options: Lint.IOptions) {
    super({ ...options, ruleSeverity: 'warning' });
  }

  public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
    return this.applyWithFunction(sourceFile, walk);
  }

}

const KNOWN_CLASS_NAMES = new Set<string>([
  'text-blue-dark'
]);

function walk(ctx: Lint.WalkContext<void>) {

  const isClassNameJsxAttribute =
    (attrib: ts.JsxAttribute): attrib is ts.JsxAttribute & { initializer: ts.StringLiteral } =>
      attrib.initializer
        ? attrib.initializer.kind === ts.SyntaxKind.StringLiteral && attrib.name.text === 'className'
        : false;

  const checkJsxAttribute = (attrib: ts.JsxAttribute) => {
    if (!isClassNameJsxAttribute(attrib)) {
      return;
    }

    const classNameText = attrib.initializer.text;
    const startPos = attrib.getEnd() - classNameText.length - 1;

    const classNames = classNameText.split(' ');
    const nbOfClassNames = classNames.length;

    for (let i = 0, currentPos = 0; i < nbOfClassNames; ++i) {
      const className = classNames[i];
      const width = className.length;

      if (width && !KNOWN_CLASS_NAMES.has(className)) {
        ctx.addFailureAt(startPos + currentPos, width, `Unknown class "${className}"`);
      }

      currentPos += width + 1;
    }
  };

  const cb = (node: ts.Node): void => {
    if (node.kind === ts.SyntaxKind.JsxAttribute) {
      checkJsxAttribute(node as ts.JsxAttribute);
    }

    return ts.forEachChild(node, cb);
  };

  return ts.forEachChild(ctx.sourceFile, cb);
}
