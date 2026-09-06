// Project-local PostCSS config.
//
// REQUIRED — do not delete. This project lives at C:\Users\fredr\larsson-web,
// directly below the user's home directory, which contains a stray
// `postcss.config.js` referencing @tailwindcss/postcss. PostCSS searches
// upward from the project root and would otherwise load that file and fail
// the build with "Cannot find module '@tailwindcss/postcss'".
//
// This project uses plain CSS and needs no PostCSS plugins. An empty plugin
// list here stops the upward search.
module.exports = { plugins: {} };
