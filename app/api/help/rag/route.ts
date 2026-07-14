import { NextResponse } from "next/server";
import { helpTopics } from "@/lib/help/helpData";

function normalize(text?: string) {
  return (text || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ");
}

function scoreTopic(query: string, topic: (typeof helpTopics)[number]) {
  const q = normalize(query);
  const words = new Set(q.split(/\s+/).filter(Boolean));
  let score = 0;

  for (const tag of topic.tags || []) {
    if (q.includes(tag.toLowerCase())) score += 12;
  }

  const title = normalize(topic.title);
  const desc = normalize(topic.description);
  const ans = normalize(topic.answer);

  for (const w of words) {
    if (title.includes(w)) score += 4;
    if (desc.includes(w)) score += 2;
    if (ans.includes(w)) score += 1;
  }

  return score;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { query } = body || {};
    if (!query) {
      return NextResponse.json({ error: "query is required" }, { status: 400 });
    }

    const scored = helpTopics
      .map((topic) => ({ topic, score: scoreTopic(query, topic) }))
      .sort((a, b) => b.score - a.score);

    const top = scored[0];
    if (!top || top.score < 5) {
      const fallback = scored.slice(0, 3).map((item) => ({
        id: item.topic.id,
        title: item.topic.title,
        description: item.topic.description,
      }));

      return NextResponse.json({
        answer:
          "Maaf, saya belum menemukan jawaban spesifik. Berikut topik terkait yang bisa membantu:",
        topics: fallback,
      });
    }

    return NextResponse.json({
      answer: top.topic.answer,
      topic: {
        id: top.topic.id,
        title: top.topic.title,
        description: top.topic.description,
        href: top.topic.href,
      },
    });
  } catch (e) {
    console.error("[rag] unexpected", e);
    return NextResponse.json({ error: "unexpected" }, { status: 500 });
  }
}
