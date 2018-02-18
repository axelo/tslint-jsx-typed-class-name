tslint-jsx-typed-class-name
---------------------------

[TSLint](https://github.com/palantir/tslint/) rule that lints all class names found in the jsx attribute `className` against parsed class selectors from a list of css files.

### Usage

tslint-jsx-typed-class-name has peer dependencies on TSLint and TypeScript.

To use this rule, add `"jsx-typed-class-name"` to the `rulesDirectory`.

Here's a sample configuration where `tslint.json` lives adjacent to your `node_modules` folder and with an existing css file `styles/index.css`:

```js
{
  "extends": ["tslint:latest"],
  "rulesDirectory": [
      "jsx-typed-class-name"
  ],
  "rules": {
    // Configure jsx-typed-class-name here
    "jsx-typed-class-name": {
        "severity": "warning",
        "options": [
            "styles/index.css"
        ]
    }
  }
}
```

### Css parsing

All listed css files are parsed for [class selectors](https://developer.mozilla.org/en-US/docs/Web/CSS/Class_selectors).

`@import` rules are automatically followed. If an import path starts with `~` the import is treated as a node module relative to current working directory.

All parsed css files are watched for file changes. When a change is detected the parsing is redone. Useful when in development watch mode.
