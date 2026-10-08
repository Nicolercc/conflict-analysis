/**
 * Imported before anything that reads the environment. The evaluation should
 * spend from its own key, with its own spending limit, so that a run can never
 * exhaust the credit the live site depends on: set EVAL_ANTHROPIC_API_KEY and
 * it is used in place of the server's key for this process only.
 */
if (process.env["EVAL_ANTHROPIC_API_KEY"]) {
  process.env["ANTHROPIC_API_KEY"] = process.env["EVAL_ANTHROPIC_API_KEY"];
  delete process.env["AI_INTEGRATIONS_ANTHROPIC_API_KEY"];
} else {
  console.warn(
    "Note: EVAL_ANTHROPIC_API_KEY is not set, so this run spends from the server's own key. " +
      "A full run makes about 40 model calls; give the evaluation its own key and spending limit.",
  );
}
