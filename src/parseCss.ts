import * as css from 'css';
import * as fs from 'fs';
import * as path from 'path';
import * as relative from 'require-relative';

export interface Cache {
  readonly classNames: ReadonlySet<string>;
  readonly filePaths: ReadonlySet<string>;
}

interface MutableCache {
  readonly classNames: Set<string>;
  readonly filePaths: Set<string>;
}

export function parse(cssFilePaths: ReadonlyArray<string>) {
  return parseCssFiles(cssFilePaths, {
    classNames: new Set(),
    filePaths: new Set()
  });
}

const SILENT_PARSER_OPTS: css.ParserOptions = { silent: true };

function parseCssFiles(
  cssFilePaths: ReadonlyArray<string>,
  cache: MutableCache
): Cache {
  if (cssFilePaths.length === 0) {
    return cache;
  }

  let atImportFilePaths: string[] = [];

  for (let i = 0; i < cssFilePaths.length; ++i) {
    const cssFilePath = cssFilePaths[i];
    const cssContent = fs.readFileSync(cssFilePath, 'utf8');
    const stylesheet = css.parse(cssContent, SILENT_PARSER_OPTS);

    if (
      stylesheet.stylesheet &&
      stylesheet.stylesheet.parsingErrors!.length === 0
    ) {
      const rules = stylesheet.stylesheet.rules;

      atImportFilePaths = atImportFilePaths.concat(
        parseCssRules(rules, cssFilePath, [], cache)
      );
    }
  }

  return parseCssFiles(atImportFilePaths, cache);
}

function parseCssRules(
  rules: ReadonlyArray<css.Rule>,
  cssFilePath: string,
  atImportFilePaths: string[],
  cache: MutableCache
): ReadonlyArray<string> {
  if (rules.length === 0) {
    return atImportFilePaths;
  }

  cache.filePaths.add(cssFilePath);

  let mediaRules: css.Rule[] = [];
  const nbOfRules = rules.length;

  for (let i = 0; i < nbOfRules; ++i) {
    const rule = rules[i];

    switch (rule.type) {
      case 'import':
        const ruleImportImport = (rule as css.Import).import || '';
        const importRelativePath = ruleImportImport.slice(1, -1).trim();

        if (importRelativePath.startsWith('~')) {
          const nodeModuleId = importRelativePath.slice(1);
          const importPath = relative.resolve(nodeModuleId);

          atImportFilePaths.push(importPath);
        } else {
          const cssFileDirname = path.dirname(cssFilePath);
          const importPath = path.resolve(cssFileDirname, importRelativePath);

          atImportFilePaths.push(importPath);
        }
        break;

      case 'media':
        const mediaRuleRules = (rule as css.Media).rules || [];
        mediaRules = mediaRules.concat(mediaRuleRules);
        break;

      case 'rule':
        const selectors = (rule as css.Rule).selectors || [];

        for (let j = 0; j < selectors.length; ++j) {
          const selector = selectors[j];
          const classNameRegex = /[\.]([\/\\:\w-]+)/g;

          let match;

          while ((match = classNameRegex.exec(selector))) {
            cache.classNames.add(
              match[1]
                .replace(/([^\\]):.+$/, '$1') // Remove psuedo-classes
                .replace(/[\\]/g, '') // Remove escape sign);
            );
          }
        }
        break;
    }
  }

  return parseCssRules(mediaRules, cssFilePath, atImportFilePaths, cache);
}
