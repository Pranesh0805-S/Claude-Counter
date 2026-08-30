export type Source = "claude-web" | "anthropic-admin" | "manual";

export interface UsagePoint {
  source: Source;
  capturedAt: string;
  windowEndsAt?: string;
  percentUsed?: number;
  inputTokens?: number;
  outputTokens?: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  model?: string;
}

export interface UsageSummary {
  totalTokens: number;
  percentUsed?: number;
  resetAt?: string;
  latestAt?: string;
}

export function totalTokens(point: UsagePoint): number {
  return (point.inputTokens ?? 0) + (point.outputTokens ?? 0) +
    (point.cacheReadTokens ?? 0) + (point.cacheWriteTokens ?? 0);
}

export function summarize(points: UsagePoint[], source?: Source): UsageSummary {
  const chosen = points.filter(p => !source || p.source === source);
  const latest = [...chosen].sort((a, b) => b.capturedAt.localeCompare(a.capturedAt))[0];
  return {
    totalTokens: chosen.reduce((sum, point) => sum + totalTokens(point), 0),
    percentUsed: latest?.percentUsed,
    resetAt: latest?.windowEndsAt,
    latestAt: latest?.capturedAt
  };
}

/** Turns Anthropic's Admin API usage-report payload into normalized usage points. */
export function parseAdminUsage(payload: unknown): UsagePoint[] {
  const buckets = (payload as { data?: unknown[] })?.data;
  if (!Array.isArray(buckets)) return [];
  return buckets.flatMap(bucket => {
    if (!bucket || typeof bucket !== "object") return [];
    const b = bucket as { ending_at?: string; results?: unknown[] };
    if (!Array.isArray(b.results)) return [];
    return b.results.flatMap(row => {
      if (!row || typeof row !== "object") return [];
      const r = row as Record<string, unknown>;
      const cache = r.cache_creation && typeof r.cache_creation === "object" ? r.cache_creation as Record<string, unknown> : {};
      return {
        source: "anthropic-admin" as const,
        capturedAt: b.ending_at ?? new Date().toISOString(),
        inputTokens: number(r.uncached_input_tokens), outputTokens: number(r.output_tokens),
        cacheReadTokens: number(r.cache_read_input_tokens),
        cacheWriteTokens: Object.values(cache).reduce<number>((sum, value) => sum + number(value), 0),
        model: typeof r.model === "string" ? r.model : undefined
      };
    });
  });
}

function number(value: unknown): number { return typeof value === "number" && Number.isFinite(value) ? value : 0; }
