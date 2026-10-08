/**
 * Snapshot what retrieval returns today for every evaluation topic, so later
 * runs replay the same evidence. Run: pnpm --filter @workspace/api-server eval:record
 * Existing snapshots are kept unless --force is passed: re-recording changes
 * the evidence, which makes scores before and after incomparable.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { searchCoverage } from "../src/brief/retrieval";
import { TOPICS } from "./topics";

const dir = path.resolve(import.meta.dirname, "cases");
const force = process.argv.includes("--force");
mkdirSync(dir, { recursive: true });

for (const t of TOPICS) {
  const file = path.join(dir, `${t.id}.json`);
  if (existsSync(file) && !force) {
    console.log(`kept      ${t.id}`);
    continue;
  }
  const coverage = await searchCoverage(t.topic);
  writeFileSync(file, `${JSON.stringify({ id: t.id, topic: t.topic, recordedAt: new Date().toISOString(), ...coverage }, null, 2)}\n`);
  console.log(`recorded  ${t.id}: ${coverage.sources.length} sources`);
}
