/**
 * Scores the task suggester on the labelled cases in ./cases.ts.
 *
 *   npx tsx scripts/eval/run-eval.ts          # rules only (free)
 *   npx tsx scripts/eval/run-eval.ts --ai     # rules + AI via the deployed suggest-task function (costs API usage)
 *
 * Reports type and priority accuracy, and P0 recall: missing a real P0 is the costly error.
 * The AI column is the final app behaviour (AI combined with the P0 safety floor).
 */
import { combineSuggestions, type Suggestion, suggestFromText } from '@/domain/intake';

import { CASES } from './cases';

const useAi = process.argv.includes('--ai');
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

type Row = { text: string; expected: string; rules: string; ai?: string; latencyMs?: number; aiError?: string };

async function askAi(text: string): Promise<{ suggestion?: Suggestion; latencyMs?: number; error?: string }> {
  const response = await fetch(`${url}/functions/v1/suggest-task`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: key! },
    body: JSON.stringify({ text }),
  });
  const body = await response.json();
  if (!response.ok) return { error: body.error ?? String(response.status), latencyMs: body.latencyMs };
  const s = body.suggestion;
  return {
    suggestion: { type: s.type, priority: s.priority, reason: s.reason, source: 'ai', confident: s.understood },
    latencyMs: body.latencyMs,
  };
}

type Score = { type: number; priority: number; p0Hits: number; p0Misses: string[]; overP0: number };
const empty = (): Score => ({ type: 0, priority: 0, p0Hits: 0, p0Misses: [], overP0: 0 });

function score(s: Score, text: string, expected: { type: string; priority: string }, got?: Suggestion) {
  if (!got) return;
  if (got.type === expected.type) s.type += 1;
  if (got.priority === expected.priority) s.priority += 1;
  if (expected.priority === 'P0') {
    if (got.priority === 'P0') s.p0Hits += 1;
    else s.p0Misses.push(text);
  } else if (got.priority === 'P0') {
    s.overP0 += 1;
  }
}

async function main() {
  if (useAi && (!url || !key)) throw new Error('Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY');

  const rulesScore = empty();
  const aiScore = empty();
  const rows: Row[] = [];
  const latencies: number[] = [];
  let aiFailures = 0;

  for (const c of CASES) {
    const rules = suggestFromText(c.text);
    score(rulesScore, c.text, c, rules);
    const row: Row = {
      text: c.text,
      expected: `${c.priority} ${c.type}`,
      rules: rules ? `${rules.priority} ${rules.type}` : '-',
    };

    if (useAi) {
      const ai = await askAi(c.text);
      if (ai.latencyMs !== undefined) latencies.push(ai.latencyMs);
      // Same combination the app uses; failures fall back to rules, as in the app.
      const final = combineSuggestions(rules, ai.suggestion);
      if (!ai.suggestion) aiFailures += 1;
      score(aiScore, c.text, c, final);
      row.ai = final ? `${final.priority} ${final.type}${ai.suggestion ? '' : ' (rules)'}` : '-';
      row.latencyMs = ai.latencyMs;
      row.aiError = ai.error;
    }
    rows.push(row);
  }

  console.table(rows.map(({ aiError, ...r }) => (aiError ? { ...r, aiError } : r)));

  const n = CASES.length;
  const p0Total = CASES.filter((c) => c.priority === 'P0').length;
  const pct = (x: number, of = n) => `${Math.round((x / of) * 100)}%`;
  const summary = (label: string, s: Score) =>
    `${label.padEnd(6)} type ${pct(s.type)} · priority ${pct(s.priority)} · P0 recall ${pct(s.p0Hits, p0Total)} (${s.p0Hits}/${p0Total}) · false P0 ${s.overP0}`;

  console.log(`\n${n} cases, ${p0Total} of them P0`);
  console.log(summary('Rules', rulesScore));
  if (useAi) {
    const sorted = [...latencies].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
    const p90 = sorted[Math.floor(sorted.length * 0.9)] ?? 0;
    console.log(summary('AI', aiScore));
    console.log(`AI latency median ${median} ms · p90 ${p90} ms · failures (fell back to rules) ${aiFailures}`);
    if (aiScore.p0Misses.length) console.log('AI P0 misses:', aiScore.p0Misses);
  }
  if (rulesScore.p0Misses.length) console.log('Rules P0 misses:', rulesScore.p0Misses);
}

void main();
