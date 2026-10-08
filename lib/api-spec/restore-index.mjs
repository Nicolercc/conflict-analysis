// orval rewrites the package index files after generating:
//  - lib/api-zod/src/index.ts gains a re-export of ./generated/types, whose type
//    names collide with the zod schemas of the same name;
//  - lib/api-client-react/src/index.ts gains duplicate generated exports on every run.
// Both are written back here so `pnpm run codegen` is reproducible.
import { writeFileSync } from "node:fs";
import path from "node:path";

const lib = (...parts) => path.resolve(import.meta.dirname, "..", ...parts);

writeFileSync(lib("api-zod", "src", "index.ts"), 'export * from "./generated/api";\n');
writeFileSync(
  lib("api-client-react", "src", "index.ts"),
  [
    'export * from "./generated/api";',
    'export * from "./generated/api.schemas";',
    'export { setBaseUrl, setAuthTokenGetter } from "./custom-fetch";',
    'export type { AuthTokenGetter } from "./custom-fetch";',
    "",
  ].join("\n"),
);
