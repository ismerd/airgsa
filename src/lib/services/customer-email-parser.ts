export type CustomerEmailExtraction = {
  customer: string;
  contactName: string;
  contactEmail: string;
  origin: string;
  destination: string;
  commodity: string;
  product: string;
  chargeableWeightKg: number;
  pieces: number;
  dimensions: string;
  volumeCbm?: number;
  readyDate: string;
  routingPreference: string;
  transitRequirement: string;
  dangerousGoods: boolean;
  unNumber?: string;
  dgClass?: string;
  packingInstruction?: string;
  temperatureRange?: string;
  handlingNotes: string[];
  requestedConfirmations: string[];
  priority: "standard" | "priority" | "urgent";
  summary: string;
};

export type CustomerEmailParseResult = {
  provider: "openai" | "rules";
  confidence: number;
  extracted: CustomerEmailExtraction;
};

type OpenAiResponse = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      text?: string;
    }>;
  }>;
  error?: {
    message?: string;
  };
};

const IATA_PAIR = /\(([A-Z]{3})\)|\b([A-Z]{3})\b/g;

export async function extractCustomerQuoteEmail(emailText: string): Promise<CustomerEmailParseResult> {
  const trimmed = emailText.trim();
  if (!trimmed) throw new Error("Email text is required");

  const openAiKey = process.env.OPENAI_API_KEY;
  if (openAiKey) {
    try {
      return {
        provider: "openai",
        confidence: 0.92,
        extracted: normalizeExtraction(await extractWithOpenAi(trimmed, openAiKey), trimmed),
      };
    } catch {
      return {
        provider: "rules",
        confidence: 0.72,
        extracted: normalizeExtraction(extractWithRules(trimmed), trimmed),
      };
    }
  }

  return {
    provider: "rules",
    confidence: 0.72,
    extracted: normalizeExtraction(extractWithRules(trimmed), trimmed),
  };
}

async function extractWithOpenAi(emailText: string, apiKey: string): Promise<Partial<CustomerEmailExtraction>> {
  const model = process.env.OPENAI_QUOTE_EXTRACTION_MODEL || "gpt-4.1-mini";
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "system",
          content:
            "Extract air cargo RFQ data from customer emails. Return JSON only. Keep airport codes, DG information, temperature requirements, weights, pieces, dimensions, dates, and customer names exactly when present. Do not invent rates.",
        },
        { role: "user", content: emailText },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "air_cargo_rfq",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: [
              "customer",
              "contactName",
              "contactEmail",
              "origin",
              "destination",
              "commodity",
              "product",
              "chargeableWeightKg",
              "pieces",
              "dimensions",
              "volumeCbm",
              "readyDate",
              "routingPreference",
              "transitRequirement",
              "dangerousGoods",
              "unNumber",
              "dgClass",
              "packingInstruction",
              "temperatureRange",
              "handlingNotes",
              "requestedConfirmations",
              "priority",
              "summary",
            ],
            properties: {
              customer: { type: "string" },
              contactName: { type: "string" },
              contactEmail: { type: "string" },
              origin: { type: "string" },
              destination: { type: "string" },
              commodity: { type: "string" },
              product: { type: "string" },
              chargeableWeightKg: { type: "number" },
              pieces: { type: "integer" },
              dimensions: { type: "string" },
              volumeCbm: { type: "number" },
              readyDate: { type: "string" },
              routingPreference: { type: "string" },
              transitRequirement: { type: "string" },
              dangerousGoods: { type: "boolean" },
              unNumber: { type: "string" },
              dgClass: { type: "string" },
              packingInstruction: { type: "string" },
              temperatureRange: { type: "string" },
              handlingNotes: { type: "array", items: { type: "string" } },
              requestedConfirmations: { type: "array", items: { type: "string" } },
              priority: { type: "string", enum: ["standard", "priority", "urgent"] },
              summary: { type: "string" },
            },
          },
        },
      },
      max_output_tokens: 900,
    }),
  });

  const data = (await response.json()) as OpenAiResponse;
  if (!response.ok) throw new Error(data.error?.message || "OpenAI extraction failed");

  const outputText = data.output_text || data.output?.flatMap((item) => item.content ?? []).map((item) => item.text ?? "").join("").trim();
  if (!outputText) throw new Error("OpenAI returned no extraction text");
  return JSON.parse(outputText) as Partial<CustomerEmailExtraction>;
}

function extractWithRules(emailText: string): Partial<CustomerEmailExtraction> {
  const sender = matchLast(emailText, /Best regards,\s*([^\n\r]+)/i) || "Customer";
  const airports = Array.from(emailText.matchAll(IATA_PAIR))
    .map((match) => (match[1] || match[2] || "").trim())
    .filter((code, index, all) => code.length === 3 && all.indexOf(code) === index);
  const origin = matchLineValue(emailText, "Origin")?.match(/\b[A-Z]{3}\b/)?.[0] || airports[0] || "";
  const destination = matchLineValue(emailText, "Destination")?.match(/\b[A-Z]{3}\b/)?.[0] || airports.find((code) => code !== origin) || "";
  const commodity = matchLineValue(emailText, "Commodity") || "General Cargo";
  const product = matchLineValue(emailText, "Product") || inferProduct(emailText, commodity);
  const dimensions = matchLineValue(emailText, "Pieces / Dimensions") || matchLineValue(emailText, "Dimensions") || "";
  const handlingNotes = collectLinesAfterHeading(emailText, "Handling");
  const requestedConfirmations = [
    ...collectLinesAfterHeading(emailText, "Kindly advise"),
    ...collectLinesAfterHeading(emailText, "Kindly confirm"),
    ...collectLinesAfterHeading(emailText, "Kindly provide"),
  ];

  return {
    customer: sender,
    contactName: sender,
    contactEmail: "",
    origin,
    destination,
    commodity,
    product,
    chargeableWeightKg: parseNumber(matchLineValue(emailText, "Chargeable Weight")),
    pieces: parseNumber(matchLineValue(emailText, "Pieces / Dimensions") || matchLineValue(emailText, "Pieces")),
    dimensions,
    volumeCbm: parseNumber(matchLineValue(emailText, "Volume")),
    readyDate: matchLineValue(emailText, "Ready Date") || "",
    routingPreference: matchLineValue(emailText, "Routing") || inferRouting(emailText),
    transitRequirement: matchLineValue(emailText, "Transit Time") || inferTransit(emailText),
    dangerousGoods: /DG|dangerous goods|UN\d{4}|lithium/i.test(emailText),
    unNumber: matchLineValue(emailText, "UN Number") || emailText.match(/\bUN\d{4}\b/i)?.[0],
    dgClass: matchLineValue(emailText, "Class"),
    packingInstruction: matchLineValue(emailText, "Packing Instruction"),
    temperatureRange: emailText.match(/[+-]?\d+\s*(?:to|-)\s*[+-]?\d+\s*(?:Â°|°)?C/i)?.[0],
    handlingNotes,
    requestedConfirmations,
    priority: /urgent|high priority|priority|immediate/i.test(emailText) ? "urgent" : "standard",
    summary: `${origin || "Origin"}-${destination || "Destination"} ${commodity}`,
  };
}

function normalizeExtraction(input: Partial<CustomerEmailExtraction>, emailText: string): CustomerEmailExtraction {
  const origin = cleanAirport(input.origin);
  const destination = cleanAirport(input.destination);
  const commodity = input.commodity?.trim() || "General Cargo";
  const product = input.product?.trim() || inferProduct(emailText, commodity);
  const customer = input.customer?.trim() || matchLast(emailText, /Best regards,\s*([^\n\r]+)/i) || "Customer";

  return {
    customer,
    contactName: input.contactName?.trim() || customer,
    contactEmail: input.contactEmail?.trim() || "",
    origin,
    destination,
    commodity,
    product,
    chargeableWeightKg: positiveNumber(input.chargeableWeightKg),
    pieces: Math.max(1, Math.round(positiveNumber(input.pieces))),
    dimensions: input.dimensions?.trim() || "",
    volumeCbm: positiveNumber(input.volumeCbm) || undefined,
    readyDate: input.readyDate?.trim() || "",
    routingPreference: input.routingPreference?.trim() || inferRouting(emailText),
    transitRequirement: input.transitRequirement?.trim() || inferTransit(emailText),
    dangerousGoods: Boolean(input.dangerousGoods || /DG|dangerous goods|UN\d{4}|lithium/i.test(emailText)),
    unNumber: input.unNumber?.trim() || undefined,
    dgClass: input.dgClass?.trim() || undefined,
    packingInstruction: input.packingInstruction?.trim() || undefined,
    temperatureRange: input.temperatureRange?.trim() || undefined,
    handlingNotes: normalizeStringArray(input.handlingNotes),
    requestedConfirmations: normalizeStringArray(input.requestedConfirmations),
    priority: input.priority === "urgent" || input.priority === "priority" ? input.priority : "standard",
    summary: input.summary?.trim() || `${origin || "Origin"}-${destination || "Destination"} ${commodity}`,
  };
}

function matchLineValue(text: string, label: string) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = text.match(new RegExp(`-\\s*${escaped}\\s*:\\s*([^\\n\\r]+)`, "i"));
  return match?.[1]?.trim();
}

function matchLast(text: string, pattern: RegExp) {
  const matches = Array.from(text.matchAll(new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`)));
  return matches.at(-1)?.[1]?.trim();
}

function collectLinesAfterHeading(text: string, heading: string) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = text.match(new RegExp(`${escaped}\\s*:?\\s*([\\s\\S]*?)(?:\\n\\s*\\n|Best regards|Looking forward|$)`, "i"));
  if (!match) return [];
  return match[1]
    .split(/\r?\n/)
    .map((line) => line.replace(/^-\s*/, "").trim())
    .filter(Boolean);
}

function parseNumber(value?: string) {
  if (!value) return 0;
  const match = value.replace(/,/g, "").match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

function positiveNumber(value: unknown) {
  const number = typeof value === "number" ? value : parseNumber(String(value ?? ""));
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function cleanAirport(value?: string) {
  return value?.toUpperCase().match(/\b[A-Z]{3}\b/)?.[0] ?? "";
}

function normalizeStringArray(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : [];
}

function inferProduct(text: string, commodity: string) {
  if (/temp|pharma|\+2|CEIV|QEP/i.test(text)) return "Temp Control";
  if (/DG|dangerous goods|UN\d{4}|lithium/i.test(text)) return "DG";
  if (/GCR/i.test(text)) return "GCR";
  return commodity;
}

function inferRouting(text: string) {
  if (/direct|fastest/i.test(text)) return "Prefer direct or fastest connection";
  if (/minimal transit/i.test(text)) return "Prefer direct flight or minimal transit exposure";
  return "Best available routing";
}

function inferTransit(text: string) {
  if (/urgent|priority|time\/temperature|high priority/i.test(text)) return "Priority";
  return "Standard";
}
