type GeminiPart = {
  text?: string;
};

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: GeminiPart[];
    };
  }>;
  error?: {
    message?: string;
  };
};

export type RewriteTextInput = {
  text: string;
  fieldLabel?: string;
  context?: string;
};

const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta";

export async function rewriteTextWithGemini({ text, fieldLabel, context }: RewriteTextInput) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API key is not configured");
  }

  const model = (process.env.GEMINI_MODEL || "gemini-2.5-flash-lite").replace(/^models\//, "");
  const hasExistingText = text.trim().length > 0;
  const prompt = [
    `Field: ${fieldLabel || "business text"}`,
    context ? `Context: ${context}` : "",
    hasExistingText
      ? "Rewrite the text below into clear, professional AirGSA business language."
      : "Generate a professional starter text for this AirGSA field.",
    hasExistingText
      ? "Keep all facts, numbers, airport codes, company names, deadlines, and commercial terms unchanged."
      : "Use the field label and context to infer what belongs here. If facts are unknown, stay generic and do not invent company-specific claims, exact numbers, certifications, deadlines, airport codes, or commercial terms.",
    hasExistingText
      ? "Do not invent new claims. Do not add markdown. Return only the improved text."
      : "Do not add markdown. Return only the generated field text.",
    "",
    hasExistingText ? text : "No existing text was provided.",
  ]
    .filter(Boolean)
    .join("\n");

  const response = await fetch(`${GEMINI_ENDPOINT}/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: {
        parts: {
          text: "You are an aviation cargo tender writing assistant. You improve user-provided text without adding new information.",
        },
      },
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.35,
        maxOutputTokens: 700,
      },
    }),
  });

  const data = (await response.json()) as GeminiResponse;
  if (!response.ok) {
    throw new Error(data.error?.message || "Gemini request failed");
  }

  const rewritten = data.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim();

  if (!rewritten) {
    throw new Error("Gemini returned an empty response");
  }

  return rewritten;
}
