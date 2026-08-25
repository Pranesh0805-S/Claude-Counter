import test from "node:test";
import assert from "node:assert/strict";
import { parseAdminUsage, summarize } from "./index.js";

test("parses Admin API report tokens", () => {
  const points = parseAdminUsage({data:[{ending_at:"2026-08-25T01:00:00Z",results:[{uncached_input_tokens:3,output_tokens:4,cache_read_input_tokens:5,cache_creation:{ephemeral_5m_input_tokens:6},model:"m"}]}]});
  assert.equal(summarize(points).totalTokens, 18);
});
