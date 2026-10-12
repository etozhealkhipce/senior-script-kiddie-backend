// Ambient type declarations for packages that ship no TypeScript types.

declare module "@editorjs/marker" {
  // biome-ignore lint/suspicious/noExplicitAny: third-party editor tool has no typings
  const Marker: any;
  export default Marker;
}
