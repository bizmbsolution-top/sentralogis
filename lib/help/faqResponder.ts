import { helpTopics, getTopicsByRole, HelpTopic } from "./helpData";

function normalize(text?: string) {
  return (text || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ");
}

export function findBestTopic(query: string, role?: string): HelpTopic | null {
  const q = normalize(query);
  if (!q.trim()) return null;

  // Filter topics by role first if role is given
  const candidateTopics = role ? getTopicsByRole(role) : helpTopics;

  // Score topics by tag matches and word overlap
  const words = new Set(q.split(/\s+/).filter(Boolean));

  let best: { topic: HelpTopic; score: number } | null = null;

  for (const t of candidateTopics) {
    let score = 0;

    // tags exact match
    for (const tag of t.tags || []) {
      if (q.includes(tag.toLowerCase())) score += 10;
    }

    // title/description matches
    const title = normalize(t.title);
    const desc = normalize(t.description);
    for (const w of words) {
      if (title.includes(w)) score += 3;
      if (desc.includes(w)) score += 2;
    }

    // keyword overlap with answer text
    const ans = normalize(t.answer);
    for (const w of words) if (ans.includes(w)) score += 1;

    if (!best || score > best.score) best = { topic: t, score };
  }

  // threshold to avoid weak matches
  if (best && best.score >= 6) return best.topic;
  return null;
}

export default findBestTopic;

export function findTopTopics(query: string, limit = 3, role?: string): HelpTopic[] {
  const q = normalize(query);
  if (!q.trim()) return [];

  const candidateTopics = role ? getTopicsByRole(role) : helpTopics;
  const words = new Set(q.split(/\s+/).filter(Boolean));
  const scored: { topic: HelpTopic; score: number }[] = [];

  for (const t of candidateTopics) {
    let score = 0;
    for (const tag of t.tags || []) {
      if (q.includes(tag.toLowerCase())) score += 10;
    }
    const title = normalize(t.title);
    const desc = normalize(t.description);
    for (const w of words) {
      if (title.includes(w)) score += 3;
      if (desc.includes(w)) score += 2;
    }
    const ans = normalize(t.answer);
    for (const w of words) if (ans.includes(w)) score += 1;

    scored.push({ topic: t, score });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored
    .filter((s) => s.score >= 3)
    .slice(0, limit)
    .map((s) => s.topic);
}
