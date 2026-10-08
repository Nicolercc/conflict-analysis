import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { modelBrief, modelText, resetBriefState, stubRetrieval } from "../test/harness";

const { create } = vi.hoisted(() => ({ create: vi.fn() }));

vi.mock("@workspace/integrations-anthropic-ai", () => ({
  anthropic: { messages: { create } },
}));

import app from "../app";
import { SYSTEM_PROMPT } from "./prompt";

const REFUSED = "12 trucks carrying food were refused access to El Fasher";
const BLOCKED = "aid convoys blocked outside El Fasher as fighting continues";
const brief = () =>
  modelBrief({
    keyFacts: [
      { text: "Agencies say 12 aid trucks were refused access to El Fasher.", evidence: [{ sourceId: "S1", quote: REFUSED }] },
      { text: "Aid convoys were blocked outside El Fasher by the army.", evidence: [{ sourceId: "S2", quote: BLOCKED }] },
    ],
  });

type Verdict = { n: number; verdict: string; why?: string };
/** The writer answers with the brief; the verifier answers with these verdicts (or misbehaves). */
function models(verifier: Verdict[] | (() => unknown)) {
  create.mockImplementation(async (params: { system: string }) => {
    if (params.system === SYSTEM_PROMPT) return modelText(JSON.stringify(brief()));
    if (typeof verifier === "function") return verifier();
    return modelText(JSON.stringify({ claims: verifier }));
  });
}
const explore = () => request(app).post("/api/intelligence/explore").send({ topic: "Sudan El Fasher aid" });
const verifierCall = () => create.mock.calls.find(([p]) => p.system !== SYSTEM_PROMPT)?.[0];

beforeEach(() => {
  process.env["BRIEF_VERIFY"] = "on";
  create.mockReset();
  resetBriefState(app);
  stubRetrieval();
});
afterEach(() => {
  process.env["BRIEF_VERIFY"] = "off";
});

describe("second-model check of claims", () => {
  it("marks claims the verifier finds fully supported as verified", async () => {
    models([{ n: 1, verdict: "supported" }, { n: 2, verdict: "supported" }]);
    const res = await explore();
    expect(res.status).toBe(200);
    expect(res.body.keyFacts.map((k: { support: string }) => k.support)).toEqual(["verified", "verified"]);
    expect(res.body.verification).toEqual({ status: "verified", checked: 2, removed: 0, corrected: 0 });
    expect(create).toHaveBeenCalledTimes(2);
  });

  it("removes a claim that is only partly supported or unsupported", async () => {
    models([{ n: 1, verdict: "supported" }, { n: 2, verdict: "partly", why: "the quote does not say who blocked them" }]);
    const res = await explore();
    expect(res.body.keyFacts.map((k: { text: string }) => k.text)).toEqual(["Agencies say 12 aid trucks were refused access to El Fasher."]);
    expect(res.body.verification).toEqual({ status: "verified", checked: 2, removed: 1, corrected: 0 });

    resetBriefState(app);
    models([{ n: 1, verdict: "unsupported" }, { n: 2, verdict: "unsupported" }]);
    const none = await explore();
    expect(none.body.keyFacts).toEqual([]);
    expect(none.body.verification).toEqual({ status: "verified", checked: 2, removed: 2, corrected: 0 });
  });

  it("cuts an overreaching claim back to its quote, and re-checks the new wording", async () => {
    models([
      { n: 1, verdict: "supported" },
      { n: 2, verdict: "partly", why: "the quote does not say who blocked them", fix: "Aid convoys were blocked outside El Fasher as fighting continued." } as Verdict,
    ]);
    const res = await explore();
    expect(res.body.keyFacts[1]).toMatchObject({
      text: "Aid convoys were blocked outside El Fasher as fighting continued.",
      support: "verified",
      evidence: [{ sourceId: "S2", quote: BLOCKED }],
    });
    expect(res.body.verification).toEqual({ status: "verified", checked: 2, removed: 0, corrected: 1 });
  });

  it("removes the claim when the verifier's rewrite would not pass the quote checks itself", async () => {
    for (const fix of [
      "Aid convoys were blocked outside El Fasher for 40 days.", // a figure the quote does not contain
      "The central bank raised interest rates sharply.", // nothing to do with the quote
      "Aid convoys were blocked outside El Fasher by the army.", // unchanged
      "   ",
    ]) {
      resetBriefState(app);
      models([{ n: 1, verdict: "supported" }, { n: 2, verdict: "partly", fix } as Verdict]);
      const res = await explore();
      expect(res.body.keyFacts).toHaveLength(1);
      expect(res.body.verification).toEqual({ status: "verified", checked: 2, removed: 1, corrected: 0 });
    }
  });

  it("never applies a rewrite to a claim judged unsupported", async () => {
    models([{ n: 1, verdict: "supported" }, { n: 2, verdict: "unsupported", fix: "Aid convoys were blocked outside El Fasher." } as Verdict]);
    const res = await explore();
    expect(res.body.keyFacts).toHaveLength(1);
  });

  it("does not pass a claim the verifier gave no verdict on", async () => {
    models([{ n: 1, verdict: "supported" }]);
    const res = await explore();
    expect(res.body.keyFacts).toHaveLength(1);
    expect(res.body.verification.removed).toBe(1);
  });

  it("shows the verifier each claim with its quote, outlet and date, under a fixed instruction", async () => {
    models([{ n: 1, verdict: "supported" }, { n: 2, verdict: "supported" }]);
    await explore();
    const call = verifierCall();
    expect(call.system).toMatch(/^You check a news brief's claims/);
    const shown: string = call.messages[0].content;
    expect(shown).toContain(`1. CLAIM: Agencies say 12 aid trucks were refused access to El Fasher.`);
    expect(shown).toContain(`Al Jazeera, published 2026-09-11: "${REFUSED}"`);
    // only the quoted words are shown, not the rest of the source
    expect(shown).not.toMatch(/turned back near/);
  });

  it("keeps the brief, with claims marked unverified, when the verifier fails or answers nonsense", async () => {
    for (const misbehave of [
      () => { throw new Error("529 overloaded"); },
      () => modelText("I cannot help with that."),
      () => modelText(JSON.stringify({ verdicts: "all fine" })),
    ]) {
      resetBriefState(app);
      models(misbehave);
      const res = await explore();
      expect(res.status).toBe(200);
      expect(res.body.keyFacts.map((k: { support: string }) => k.support)).toEqual(["unverified", "unverified"]);
      expect(res.body.verification).toEqual({ status: "skipped", checked: 0, removed: 0, corrected: 0 });
    }
  });

  it("makes no verifier call when there is nothing to check", async () => {
    create.mockImplementation(async () => modelText(JSON.stringify(modelBrief({ keyFacts: [] }))));
    const res = await explore();
    expect(res.body.verification).toEqual({ status: "verified", checked: 0, removed: 0, corrected: 0 });
    expect(create).toHaveBeenCalledTimes(1);
  });
});
