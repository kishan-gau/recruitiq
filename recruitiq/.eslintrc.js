module.exports = {
  root: true,
  env: { browser: true, es2021: true },
  extends: [ 'eslint:recommended', 'plugin:react/recommended' ],
  parserOptions: { ecmaVersion: 12, sourceType: 'module', ecmaFeatures: { jsx: true } },
  plugins: [ 'react' ],
  rules: {
    // Ban inline <svg> elements in JSX; prefer the icon system
    'no-restricted-syntax': [ 'error', {
      selector: "JSXOpeningElement[name.name='svg']",
      message: 'Do not use inline <svg> in JSX. Use the central Icon component (src/components/icons) instead.'
    }]
  }
}
