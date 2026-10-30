// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier/flat');

module.exports = defineConfig([
  expoConfig,
  // Désactive les règles de style gérées par Prettier.
  prettierConfig,
  {
    ignores: ['dist/*', '.expo/*'],
  },
]);
