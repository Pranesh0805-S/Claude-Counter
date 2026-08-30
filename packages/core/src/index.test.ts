import test from "node:test";
import assert from "node:assert/strict";
import { parseAdminUsage, summarize } from "./index.js";

test("parses Admin API report tokens", () => {
  const points = parseAdminUsage({data:[{ending_at:"2026-08-25T01:00:00Z",results:[{uncached_input_tokens:3,output_tokens:4,cache_read_input_tokens:5,cache_creation:{ephemeral_5m_input_tokens:6},model:"m"}]}]});
  assert.equal(summarize(points).totalTokens, 18);
});

test("ignores malformed reports and rows defensively", () => {
  assert.deepEqual(parseAdminUsage(null), []);
  assert.deepEqual(parseAdminUsage({data:[null, {ending_at:"x", results:[null, {model:"safe", uncached_input_tokens:"bad"}]}]}), [{source:"anthropic-admin", capturedAt:"x", inputTokens:0, outputTokens:0, cacheReadTokens:0, cacheWriteTokens:0, model:"safe"}]);
});

test("summary selects the latest point and filters by source", () => {
  const points = parseAdminUsage({data:[{ending_at:"2026-08-01T00:00:00Z",results:[{output_tokens:4}]},{ending_at:"2026-08-02T00:00:00Z",results:[{output_tokens:8}]}]});
  points.push({source:"claude-web", capturedAt:"2026-08-03T00:00:00Z", percentUsed:42});
  assert.equal(summarize(points, "anthropic-admin").totalTokens, 12);
  assert.equal(summarize(points, "claude-web").percentUsed, 42);
});
