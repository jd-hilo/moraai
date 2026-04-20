import type { ParsedConversation } from "@/lib/vault/types";

export function buildExtractionPrompt(conversations: ParsedConversation[]): string {
  const conversationTexts = conversations
    .map((conv, i) => {
      const messages = conv.messages
        .map((m) => `${m.role}: ${m.content}`)
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
