// lib/ai.ts — Claude API for outage classification and alert summarisation
// Model: claude-sonnet-4-20250514
// Always validate JSON output before using it

import Anthropic from '@anthropic-ai/sdk';
import type { OutageClassification } from '@/types/db';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const CLASSIFICATION_SYSTEM_PROMPT = `You are a specialist in subsea cable network operations with 15 years of experience at Tier-1 carriers. You understand how submarine cable consortia (FLAG, SEA-ME-WE, MAREA, JUPITER) communicate outages, what repair ship deployments mean for route restoration timelines, and how latency impacts trading desks.

Your job: classify scraped text as a subsea cable outage, maintenance event, or noise. Be conservative — when in doubt, classify as noise rather than alerting traders on a false positive.

Output ONLY valid JSON, nothing else. No markdown. No explanation. Just the JSON object.`;

const CLASSIFICATION_USER_PROMPT = (rawText: string, sourceUrl: string) => `
Classify this text as a subsea cable event or noise.

Source URL: ${sourceUrl}
Text: "${rawText.slice(0, 1500)}"

Required JSON output:
{
  "is_outage": boolean,
  "severity": "critical" | "high" | "medium" | "low" | "resolved" | "noise",
  "cable_name": string | null,
  "affected_routes": string[],
  "summary": string (max 200 chars, plain English, what happened and which routes),
  "estimated_latency_impact_ms": number | null,
  "confidence": number (0-1)
}

Severity guide:
- critical: Cable cut confirmed, weeks/months to repair, major route affected
- high: Partial capacity loss, 1–7 days to resolve, significant latency impact
- medium: Planned maintenance, known window, predictable impact
- low: Minor degradation, within normal variance, no trading impact
- resolved: Service restored — include this even if the original was critical
- noise: Not about subsea cables, or no actionable signal

Routes to reference: "London-New York", "London-Singapore", "London-Tokyo", "New York-São Paulo", "London-Dubai"
`;

export async function classifyOutage(
  rawText: string,
  sourceUrl: string
): Promise<OutageClassification> {
  let attempt = 0;
  const maxAttempts = 2;

  while (attempt < maxAttempts) {
    attempt++;
    try {
      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 512,
        system: CLASSIFICATION_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: CLASSIFICATION_USER_PROMPT(rawText, sourceUrl),
          },
        ],
      });

      const text = (response.content[0] as { type: 'text'; text: string }).text.trim();

      // Strip any accidental markdown fences
      const jsonStr = text.replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim();
      const parsed = JSON.parse(jsonStr) as OutageClassification;

      // Validate required fields
      if (typeof parsed.is_outage !== 'boolean') throw new Error('Missing is_outage');
      if (!parsed.severity) throw new Error('Missing severity');
      if (typeof parsed.confidence !== 'number') throw new Error('Missing confidence');

      // Low confidence → auto-classify as noise
      if (parsed.confidence < 0.6) {
        parsed.severity = 'noise';
        parsed.is_outage = false;
      }

      return parsed;
    } catch (err) {
      if (attempt >= maxAttempts) {
        console.error(`classifyOutage failed after ${maxAttempts} attempts:`, err);
        // Return safe noise classification rather than throwing
        return {
          is_outage: false,
          severity: 'noise',
          cable_name: null,
          affected_routes: [],
          summary: 'Classification failed — marked as noise',
          estimated_latency_impact_ms: null,
          confidence: 0,
        };
      }
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  throw new Error('classifyOutage: unreachable');
}

// ── Alert summary generation ─────────────────────────────────

export async function generateAlertSummary(
  cableName: string,
  routes: string[],
  rawText: string
): Promise<string> {
  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 150,
      messages: [
        {
          role: 'user',
          content: `Write a 1-sentence alert summary for this subsea cable event. Be specific. Include cable name and affected routes. Max 140 characters.

Cable: ${cableName}
Routes: ${routes.join(', ')}
Source text: "${rawText.slice(0, 500)}"

Output ONLY the summary sentence, nothing else.`,
        },
      ],
    });
    return (response.content[0] as { type: 'text'; text: string }).text.trim();
  } catch {
    return `${cableName} outage detected affecting ${routes.join(', ')}`;
  }
}
