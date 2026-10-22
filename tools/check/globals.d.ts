// Globals of the page for the type check (tools/check/tsconfig.json): the app puts its test and debug interface on window, the build injects
// the asset manifests (window.TEXMAN, GEOMAN, …).
interface Window {
  [name: string]: any;
}
