// orval rewrites lib/api-zod/src/index.ts to also re-export ./generated/types,
// whose type names collide with the zod schemas of the same name. Keep the
// index exporting schemas only so `pnpm run codegen` is reproducible.
import { writeFileSync } from "node:fs";
import path from "node:path";

const index = path.resolve(import.meta.dirname, "..", "api-zod", "src", "index.ts");
writeFileSync(index, 'export * from "./generated/api";\n');
