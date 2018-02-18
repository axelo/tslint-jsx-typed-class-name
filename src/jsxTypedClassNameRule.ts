import * as ts from 'typescript';
import * as Lint from 'tslint';
import * as chokidar from 'chokidar';
import { parse, Cache } from './parseCss';

export class Rule extends Lint.Rules.AbstractRule {

  static metadata: {
    ruleName: 'jsx-typed-class-name',
    type: 'maintainability',
    description: 'Lints all class names found in jsx attribute className against found class selectors in list of css files.',
    optionsDescription: 'List of css files to parse for class selectors, @import-rules are followed.',
    options: {
      'type': 'array',
      'items': {
        'type': 'string'
      }
    },
    typescriptOnly: false
  };

  static CLASS_NAME_CACHE: Cache | null = null;
  static FS_WATCHER: chokidar.FSWatcher | null = null;

  static setClassNameCache(cssFilePaths: ReadonlyArray<string>) {
    Rule.CLASS_NAME_CACHE = parse(cssFilePaths);

    if (!Rule.FS_WATCHER) {
      Rule.FS_WATCHER = chokidar.watch(Array.from(Rule.CLASS_NAME_CACHE.filePaths), {
        ignorePermissionErrors: true,
        persistent: false
      });

      Rule.FS_WATCHER.on('change', () => {
        Rule.setClassNameCache(cssFilePaths);
      });
    }

    return Rule.CLASS_NAME_CACHE;
  }

  getCache(): Cache {
    return Rule.CLASS_NAME_CACHE || Rule.setClassNameCache(this.ruleArguments.map(String));
  }

  public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
    return this.applyWithFunction(sourceFile, walk, this.getCache());
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

  const validClassNames = ctx.options.classNames;

  const checkClassName = (attrib: ts.JsxAttribute & InitializerStringLiteral) => {
    const classNameText = attrib.initializer.text;
    const classNames = classNameText.split(' ');
    const nbOfClassNames = classNames.length;

    const startPos = attrib.getEnd() - classNameText.length - 1;

    for (let i = 0, currentPos = 0; i < nbOfClassNames; ++i) {
      const className = classNames[i];
      const width = className.length;

      if (width && !validClassNames.has(className)) {
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
