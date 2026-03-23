import OpenAI from 'openai';

type OpenAIClient = OpenAI;

function buildContext(chunks: { text: string; documentSource: string }[]): string {
  return chunks
    .map((c, i) => `[Source ${i + 1}: ${c.documentSource}]\n${c.text}`)
    .join('\n\n---\n\n');
}

function parseScore(raw: string): number | null {
  try {
    const cleaned = raw
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    const parsed = JSON.parse(cleaned) as { score?: unknown };
    const score = parsed.score;
    if (typeof score === 'number' && score >= 0 && score <= 1) return score;
    return null;
  } catch {
    return null;
  }
}

/**
 * Faithfulness: what fraction of claims in the answer are supported by the retrieved context?
 */
export async function faithfulness(
  answer: string,
  contextChunks: { text: string; documentSource: string }[],
  openai: OpenAIClient,
  model: string
): Promise<number | null> {
  if (contextChunks.length === 0) return 0;
  const context = buildContext(contextChunks);
  try {
    const response = await openai.chat.completions.create({
      model,
      temperature: 0,
      max_tokens: 200,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'You are an evaluation assistant. Respond only with a JSON object.',
        },
        {
          role: 'user',
          content: `Answer: ${answer}\n\nContext:\n---\n${context}\n---\n\nIdentify each factual claim in the answer, then check if it is supported by the context.\nReturn: {"score": <fraction 0.0-1.0 of claims supported>, "supported": <n>, "total": <n>}`,
        },
      ],
    });
    return parseScore(response.choices[0]?.message.content ?? '');
  } catch {
    return null;
  }
}

/**
 * Answer relevancy: how directly and completely does the answer address the question?
 */
export async function answerRelevancy(
  question: string,
  answer: string,
  openai: OpenAIClient,
  model: string
): Promise<number | null> {
  try {
    const response = await openai.chat.completions.create({
      model,
      temperature: 0,
      max_tokens: 150,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'You are an evaluation assistant. Respond only with a JSON object.',
        },
        {
          role: 'user',
          content: `Question: ${question}\n\nAnswer: ${answer}\n\nRate how directly and completely the answer addresses the question (0=not at all, 1=perfectly).\nReturn: {"score": <0.0-1.0>, "reasoning": "<one sentence>"}`,
        },
      ],
    });
    return parseScore(response.choices[0]?.message.content ?? '');
  } catch {
    return null;
  }
}

/**
 * Context recall: what fraction of the information needed to produce the expected answer
 * is present in the retrieved context?
 */
export async function contextRecall(
  expectedAnswer: string,
  contextChunks: { text: string; documentSource: string }[],
  openai: OpenAIClient,
  model: string
): Promise<number | null> {
  if (contextChunks.length === 0) return 0;
  const context = buildContext(contextChunks);
  try {
    const response = await openai.chat.completions.create({
      model,
      temperature: 0,
      max_tokens: 150,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'You are an evaluation assistant. Respond only with a JSON object.',
        },
        {
          role: 'user',
          content: `Expected answer: ${expectedAnswer}\n\nRetrieved context:\n---\n${context}\n---\n\nWhat fraction of the information needed to produce the expected answer is present in the retrieved context? (0=nothing relevant, 1=everything needed)\nReturn: {"score": <0.0-1.0>, "reasoning": "<one sentence>"}`,
        },
      ],
    });
    return parseScore(response.choices[0]?.message.content ?? '');
  } catch {
    return null;
  }
}
