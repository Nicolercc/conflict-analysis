/**
 * Snapshot what retrieval returns today for every evaluation topic, so later
 * runs replay the same evidence. Run: pnpm --filter @workspace/api-server eval:record
 * Existing snapshots are kept unless --force is passed: re-recording changes
 * the evidence, which makes scores before and after incomparable.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { searchCoverage } from "../src/brief/retrieval";
import { TOPICS } from "./topics";

const dir = path.resolve(import.meta.dirname, "cases");
const force = process.argv.includes("--force");
// --deepen keeps each case's sources and re-reads their articles in full, so a
// case can gain depth without becoming a different case.
const deepen = process.argv.includes("--deepen");
mkdirSync(dir, { recursive: true });

if (deepen) {
  const { readFullText } = await import("../src/brief/retrieval/full-text");
  const { toRecords } = await import("../src/brief/sources");
  for (const t of TOPICS) {
    const file = path.join(dir, `${t.id}.json`);
    if (!existsSync(file)) continue;
    const recorded = JSON.parse(readFileSync(file, "utf8"));
    // Back to the publisher's summary first, so a re-run does not treat old article text as a summary.
    const candidates = recorded.sources.map(({ id: _id, text: _text, contentHash: _hash, textFrom: _from, retrievedAt: _at, ...rest }: Record<string, unknown>) =>
      rest["kind"] === "news" ? rest : { ...rest, text: String(_text).slice(String(rest["title"]).length + 2) },
    );
    const read = await readFullText(candidates);
    const sources = toRecords(read, new Date(recorded.sources[0]?.retrievedAt ?? Date.now()));
    writeFileSync(file, `${JSON.stringify({ ...recorded, deepenedAt: new Date().toISOString(), sources }, null, 2)}\n`);
    const news = sources.filter((s: { kind: string }) => s.kind === "news");
    console.log(`deepened  ${t.id}: ${news.filter((s: { textFrom: string }) => s.textFrom === "article").length} of ${news.length} articles read in full`);
  }
  process.exit(0);
}

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
