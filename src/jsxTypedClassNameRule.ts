import * as ts from 'typescript';
import * as Lint from 'tslint';
import { parse, Cache } from './parseCss';

export class Rule extends Lint.Rules.AbstractRule {

  static metadata: {
    ruleName: 'jsx-typed-class-name',
    type: 'maintainability',
    description: '',
    optionsDescription: '',
    options: {
      'type': 'array',
      'items': {
        'type': 'string'
      }
    },
    typescriptOnly: false
  };

  static CLASS_NAME_CACHE: Cache | null = null;

  public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
    const cache = Rule.CLASS_NAME_CACHE =
      Rule.CLASS_NAME_CACHE || parse(this.ruleArguments.map(String))

    return this.applyWithFunction(sourceFile, walk, cache);
  }

}

interface InitializerStringLiteral {
  readonly initializer: ts.StringLiteral;
}

const isJsxAttribute = (node: ts.Node): node is ts.JsxAttribute =>
  node.kind === ts.SyntaxKind.JsxAttribute;

const isClassName = (attrib: ts.JsxAttribute): attrib is ts.JsxAttribute & InitializerStringLiteral =>
  attrib.initializer
    ? attrib.initializer.kind === ts.SyntaxKind.StringLiteral && attrib.name.text === 'className'
    : false;

function walk(ctx: Lint.WalkContext<Cache>) {

  const checkClassName = (attrib: ts.JsxAttribute & InitializerStringLiteral) => {
    const classNameText = attrib.initializer.text;
    const classNames = classNameText.split(' ');
    const nbOfClassNames = classNames.length;

    const startPos = attrib.getEnd() - classNameText.length - 1;

    for (let i = 0, currentPos = 0; i < nbOfClassNames; ++i) {
      const className = classNames[i];
      const width = className.length;

      if (width && !ctx.options.classNames.has(className)) {
        ctx.addFailureAt(startPos + currentPos, width, `Unknown class '${className}'`);
      }

      currentPos += width + 1;
    }
  };

  const cb = (node: ts.Node): void => {
    if (isJsxAttribute(node) && isClassName(node)) {
      checkClassName(node);
    }

    return ts.forEachChild(node, cb);
  };

  return ts.forEachChild(ctx.sourceFile, cb);
}
