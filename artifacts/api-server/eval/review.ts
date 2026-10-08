/**
 * Review the evaluation's expected facts, one case at a time.
 * Run: pnpm --filter @workspace/api-server eval:review [-- --all]
 *
 * For each case it shows the recorded sources and the facts a brief on them is
 * expected to carry. Approving a case records who checked it and when, in
 * eval/reviews.json; the report then counts it as reviewed by a person. A case
 * is shown again if its sources or its expected facts have changed since.
 */
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { EXPECTATIONS } from "./expectations";
import { TOPICS } from "./topics";

const here = import.meta.dirname;
const file = path.join(here, "reviews.json");
type Review = { by: string; at: string; fingerprint: string };
const reviews = JSON.parse(readFileSync(file, "utf8")) as Record<string, Review>;

/** Changes whenever the case's evidence or its expected facts change. */
function fingerprint(id: string): string {
  const recorded = readFileSync(path.join(here, "cases", `${id}.json`), "utf8");
  const facts = (EXPECTATIONS[id]?.facts ?? []).map((f) => `${f.fact}|${f.evidence}`).join("\n");
  return createHash("sha256").update(recorded).update(facts).digest("hex").slice(0, 16);
}

const all = process.argv.includes("--all");
const reviewer = (() => {
  try {
    return execSync("git config user.name", { encoding: "utf8" }).trim() || "unknown";
  } catch {
    return "unknown";
  }
})();

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
let approved = 0;
for (const topic of TOPICS.filter((t) => EXPECTATIONS[t.id])) {
  const current = fingerprint(topic.id);
  if (!all && reviews[topic.id]?.fingerprint === current) continue;

  const recorded = JSON.parse(readFileSync(path.join(here, "cases", `${topic.id}.json`), "utf8")) as {
    sources: Array<{ id: string; publisher: string; publishedAt: string | null; title: string; text: string }>;
  };
  console.log(`\n${"═".repeat(78)}\n${topic.id} — "${topic.topic}"\n${"═".repeat(78)}\nSOURCES`);
  for (const s of recorded.sources) {
    console.log(`  ${s.id.padEnd(4)}${s.publisher} · ${s.publishedAt?.slice(0, 10) ?? "undated"}\n      ${s.text.slice(0, 260)}`);
  }
  console.log("\nEXPECTED FACTS — a good brief on these sources should say:");
  for (const [i, f] of EXPECTATIONS[topic.id]!.facts.entries()) {
    const source = recorded.sources.find((s) => f.evidence.test(`${s.title}. ${s.text}`));
    console.log(`  ${i + 1}. ${f.fact}\n      resting on ${source ? `${source.id} (${source.publisher})` : "NO SOURCE — this expectation is stale"}`);
  }
  const answer = (await rl.question("\nAre these facts stated by the sources, and are they the important ones? [y = approve, n = skip, q = quit] ")).trim().toLowerCase();
  if (answer === "q") break;
  if (answer === "y") {
    reviews[topic.id] = { by: reviewer, at: new Date().toISOString(), fingerprint: current };
    writeFileSync(file, `${JSON.stringify(reviews, null, 2)}\n`);
    approved += 1;
    console.log(`  approved by ${reviewer}`);
  } else {
    console.log("  skipped — edit eval/expectations.ts, then run this again");
  }
}
rl.close();
console.log(`\n${approved} case(s) approved this session. ${Object.keys(reviews).length} of ${Object.keys(EXPECTATIONS).length} cases are reviewed.`);
