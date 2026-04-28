import type { ParsedConversation } from "@/lib/vault/types";

// Real ChatGPT conversations can be 50+ messages long. The first few
// messages set up what's being discussed; the last few capture decisions
// and conclusions. The middle is mostly redundant reasoning. Trimming
// here cuts input tokens 40–60% with little signal loss.
const HEAD_MSGS = 4;
const TAIL_MSGS = 4;
const MAX_MSG_CHARS = 1500;

function trimMessage(content: string): string {
  if (content.length <= MAX_MSG_CHARS) return content;
  return content.slice(0, MAX_MSG_CHARS) + "…";
}

function condenseMessages(messages: { role: string; content: string }[]): { role: string; content: string }[] {
  if (messages.length <= HEAD_MSGS + TAIL_MSGS) return messages;
  return [
    ...messages.slice(0, HEAD_MSGS),
    { role: "system", content: `[…${messages.length - HEAD_MSGS - TAIL_MSGS} messages omitted…]` },
    ...messages.slice(-TAIL_MSGS),
  ];
}

export function buildExtractionPrompt(conversations: ParsedConversation[]): string {
  const conversationTexts = conversations
    .map((conv, i) => {
      const messages = condenseMessages(conv.messages)
        .map((m) => `${m.role}: ${trimMessage(m.content)}`)
        .join("\n");
      return `=== Conversation ${i + 1}: ${conv.title} (${conv.date}) ===\n${messages}`;
    })
    .join("\n\n");

  return `You are an expert knowledge extractor. Analyze the following conversations and extract structured entities about the user.

Extract entities in these categories:
- **identity**: Core facts about who the user is (personality traits, values, beliefs, self-description)
- **people**: Important people in the user's life (family, friends, colleagues, partners)
- **goals**: Things the user wants to achieve, dreams, aspirations, projects
- **patterns**: Recurring behaviors, habits, preferences, routines
- **life**: Life events, experiences, places, jobs, education
- **decisions**: Major decisions the user is facing or has made

For each entity, provide:
- type: one of [identity, people, goals, patterns, life, decisions]
- slug: a kebab-case identifier (e.g., "career-transition", "sister-maria")
- title: a human-readable title
- content: a detailed paragraph summarizing what you know (write as if documenting facts about someone)
- links: slugs of other entities this relates to
- tags: relevant tags for categorization

IMPORTANT:
- Write content in third person ("The user..." or use their name if known)
- Be specific and factual — only extract what is clearly stated or strongly implied
- Merge information about the same topic from multiple conversations
- Links should reference other entity slugs you're creating

Return ONLY a JSON array of entities. No other text.

${conversationTexts}`;
}
