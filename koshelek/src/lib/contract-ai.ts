export type ExtractedField = { field: string; value: string; requiresAttention: boolean };

export async function extractTextFromDocument(buffer: Buffer, mimeType: string, filename: string): Promise<string> {
  const lowerName = filename.toLowerCase();
  try {
    if (mimeType === "application/pdf" || lowerName.endsWith(".pdf")) {
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: new Uint8Array(buffer) });
      const result = await parser.getText();
      return result.text || "";
    }
    if (
      mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      lowerName.endsWith(".docx")
    ) {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      return result.value || "";
    }
    if (mimeType.startsWith("text/") || lowerName.endsWith(".txt") || lowerName.endsWith(".csv")) {
      return buffer.toString("utf8");
    }
  } catch (err) {
    console.error("extractTextFromDocument failed", err);
    return "";
  }
  return ""; // unsupported binary format (e.g. legacy .doc) — user can still enter data manually
}

const SUM_RE = /(\d[\d\s]{2,}(?:[.,]\d{1,2})?)\s*(?:₸|тенге|тг\.?|KZT)/gi;
const DATE_RE = /\b(\d{1,2})[.\/](\d{1,2})[.\/](\d{4})\b/g;

function findSentenceAround(text: string, index: number): string {
  const start = Math.max(0, text.lastIndexOf(".", index) + 1);
  const end = text.indexOf(".", index);
  return text.slice(start, end === -1 ? text.length : end + 1).trim().slice(0, 400);
}

const KEYWORD_FIELDS: { keyword: RegExp; field: string; attention: boolean }[] = [
  { keyword: /аванс[а-я]*/i, field: "Условия аванса", attention: false },
  { keyword: /неустойк[а-я]*/i, field: "Неустойка", attention: true },
  { keyword: /(?:^|\s)пен[яию][а-я]*/i, field: "Пеня", attention: true },
  { keyword: /штраф[а-я]*/i, field: "Штрафные санкции", attention: true },
  { keyword: /гарантийн[а-я]* (?:срок|период|обязательств)/i, field: "Гарантийные обязательства", attention: true },
  { keyword: /расторжени[а-я]*/i, field: "Условия расторжения", attention: true },
  { keyword: /акт[а-я]* (?:приём|выполненных|оказанных)/i, field: "Порядок оформления актов", attention: false },
  { keyword: /срок[а-я]* поставк[а-я]*/i, field: "Срок поставки", attention: false },
  { keyword: /гарантийн[а-я]* обязательств/i, field: "Гарантия", attention: true },
  { keyword: /этап[а-я]*/i, field: "Этапы исполнения", attention: false },
  { keyword: /услови[а-я]* оплат[а-я]*/i, field: "Условия оплаты", attention: false },
  { keyword: /измен[её]ни[а-я]* услови[а-я]*/i, field: "Условия изменения договора", attention: true },
];

/**
 * Deterministic, keyword + pattern based extraction. Always available (no
 * external API needed) — used as the baseline, and as the fallback when no
 * LLM key is configured or the LLM call fails.
 */
export function heuristicExtract(text: string): ExtractedField[] {
  const results: ExtractedField[] = [];
  if (!text.trim()) return results;

  const sums = [...text.matchAll(SUM_RE)].map((m) => m[0]);
  if (sums.length > 0) {
    results.push({ field: "Суммы, упомянутые в тексте", value: [...new Set(sums)].slice(0, 5).join("; "), requiresAttention: false });
  }

  const dates = [...text.matchAll(DATE_RE)].map((m) => m[0]);
  if (dates.length > 0) {
    results.push({ field: "Даты, упомянутые в тексте", value: [...new Set(dates)].slice(0, 8).join("; "), requiresAttention: false });
  }

  for (const { keyword, field, attention } of KEYWORD_FIELDS) {
    const match = keyword.exec(text);
    if (match && match.index !== undefined) {
      results.push({ field, value: findSentenceAround(text, match.index), requiresAttention: attention });
    }
  }

  const partiesMatch = text.match(/(?:именуем[а-я]+ в дальнейшем|заказчик|поставщик|исполнитель)[^.]{0,200}/gi);
  if (partiesMatch) {
    results.push({ field: "Стороны договора", value: partiesMatch.slice(0, 2).join(" / ").slice(0, 400), requiresAttention: false });
  }

  return results;
}

/**
 * When ANTHROPIC_API_KEY is set, asks Claude to extract structured contract
 * terms. Falls back to the deterministic heuristic extractor on any error or
 * when no key is configured, so this feature always returns something useful.
 */
export async function analyzeContractText(text: string): Promise<{ fields: ExtractedField[]; usedAi: boolean }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || !text.trim()) {
    return { fields: heuristicExtract(text), usedAi: false };
  }

  try {
    const prompt = `Ты помощник, который читает текст договора/тендера на русском языке и извлекает ключевые условия.
Верни СТРОГО валидный JSON-массив объектов вида {"field": string, "value": string, "requiresAttention": boolean}.
Извлеки (если присутствует в тексте): стороны, предмет договора, сумма, дата начала, дата окончания, срок исполнения,
условия оплаты, аванс, этапы, требования к поставке, необходимые документы, порядок актов, гарантийные обязательства,
штрафы, пени, неустойка, условия изменения договора, условия расторжения, прочие существенные обязательства.
requiresAttention=true для штрафов, пени, неустойки, коротких/жёстких сроков, условий расторжения и других рискованных пунктов.
Не придумывай данные, которых нет в тексте. Верни только JSON, без пояснений.

Текст договора:
"""
${text.slice(0, 15000)}
"""`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) throw new Error(`Anthropic API ${res.status}`);
    const data = await res.json();
    const content = data.content?.[0]?.text ?? "";
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("no JSON in response");
    const parsed = JSON.parse(jsonMatch[0]) as ExtractedField[];
    if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("empty extraction");
    return { fields: parsed, usedAi: true };
  } catch (err) {
    console.error("AI contract analysis failed, falling back to heuristic:", err);
    return { fields: heuristicExtract(text), usedAi: false };
  }
}
