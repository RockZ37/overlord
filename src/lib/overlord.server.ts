import type {
  ExecutionReceipt,
  IntentParseSource,
  ParsedIntent,
  ParsedIntentResult,
  RoutePlan,
  RouteStep,
  RouteStepKind,
} from "./overlord-types";

const SOURCE_CHAIN_KEYWORDS: Array<[string, string]> = [
  ["arbitrum", "Arbitrum"],
  ["optimism", "Optimism"],
  ["ethereum", "Ethereum"],
  ["eth", "Ethereum"],
  ["base", "Base"],
];

const ASSET_KEYWORDS: Array<[string, string]> = [
  ["sol", "SOL"],
  ["bonk", "BONK"],
  ["jup", "JUP"],
  ["usdc", "USDC"],
  ["weth", "WETH"],
  ["eth", "ETH"],
];

const ACTION_KEYWORDS: Array<[string, string]> = [
  ["drift", "Deposit to Drift"],
  ["jupiter", "Swap on Jupiter"],
  ["tensor", "Send to Tensor"],
  ["pump.fun", "Buy on Pump.fun"],
  ["pump fun", "Buy on Pump.fun"],
];

const LIFI_API_BASE_URL = process.env.LIFI_API_BASE_URL ?? "https://li.quest";
const LIFI_FROM_ADDRESS =
  process.env.LIFI_FROM_ADDRESS ?? "0x0000000000000000000000000000000000000001";
const BASE_CHAIN_ID = 8453;
const LEGACY_SOLANA_CHAIN_ID = "1151111081";
const SOLANA_CHAIN_ID = Number(
  process.env.LIFI_SOLANA_CHAIN_ID?.trim() === LEGACY_SOLANA_CHAIN_ID
    ? "1151111081099710"
    : (process.env.LIFI_SOLANA_CHAIN_ID ?? "1151111081099710"),
);
const LIFI_TO_ADDRESS = process.env.LIFI_TO_ADDRESS?.trim() ?? "11111111111111111111111111111111";
const AI_PROVIDER = process.env.AI_PROVIDER?.trim().toLowerCase();
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY?.trim();
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL?.trim() ?? "claude-3-5-sonnet-latest";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY?.trim();
const GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() ?? "gemini-1.5-flash";

const TOKEN_ADDRESSES: Record<string, Record<string, { address: string; decimals: number }>> = {
  Base: {
    USDC: { address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", decimals: 6 },
    ETH: { address: "0x4200000000000000000000000000000000000006", decimals: 18 },
    WETH: { address: "0x4200000000000000000000000000000000000006", decimals: 18 },
  },
  Solana: {
    USDC: { address: "EPjFWdd5AufqSSqeM2qkYJq8J6m7uF8G1tGJx4b4N3", decimals: 6 },
    SOL: { address: "So11111111111111111111111111111111111111112", decimals: 9 },
  },
};

const executionLedger = new Map<string, ExecutionReceipt>();

export async function parseOverlordIntent(text: string): Promise<ParsedIntentResult> {
  const rawText = text.trim();
  if (!rawText) {
    throw new Error("Intent text cannot be empty");
  }

  if (isGreetingOrSmallTalk(rawText)) {
    return buildNonActionableResult(rawText, "heuristic");
  }

  const llmParsed =
    AI_PROVIDER === "gemini" || (!AI_PROVIDER && GEMINI_API_KEY)
      ? await parseIntentWithGemini(rawText)
      : AI_PROVIDER === "anthropic" || (!AI_PROVIDER && ANTHROPIC_API_KEY)
        ? await parseIntentWithAnthropic(rawText)
        : null;
  if (llmParsed) {
    return llmParsed;
  }

  const parsed = parseIntentHeuristically(rawText);
  return {
    ...parsed,
    note: "AI provider unavailable or returned no parse, using fallback parser.",
  };
}

export async function buildRoutePlan(intent: ParsedIntent): Promise<RoutePlan> {
  const planId = `plan_${slug(intent.sourceChain)}_${slug(intent.destinationAsset)}_${intent.amount.toFixed(0)}`;
  const intentId = hashToUint64(
    `${intent.sourceChain}:${intent.sourceAsset}:${intent.destinationChain}:${intent.destinationAsset}:${intent.amount}:${planId}`,
  );
  const lifiQuote = await fetchLifiQuote(intent).catch(() => null);

  if (!lifiQuote) {
    throw new Error("No live LI.FI quote available for this intent right now.");
  }

  const routeRef = readString(lifiQuote, ["id"]) ?? readString(lifiQuote, ["route", "id"]);
  if (!routeRef) {
    throw new Error("Received LI.FI response without a route id.");
  }

  const etaSeconds =
    readNumber(lifiQuote, ["estimate", "executionDuration"]) ??
    readNumber(lifiQuote, ["estimate", "duration"]);
  const estimatedFeesUsd =
    readNumber(lifiQuote, ["estimate", "feeCostsUsd"]) ??
    readNumber(lifiQuote, ["estimate", "feeUsd"]);

  if (etaSeconds == null || estimatedFeesUsd == null) {
    throw new Error("Live quote missing ETA or fee details. Please try again.");
  }

  const bridgeLabel = readString(lifiQuote, ["tool"]) ?? readString(lifiQuote, ["name"]) ?? "LI.FI";

  const stepLabels = extractStepLabels(lifiQuote);
  if (stepLabels.length === 0) {
    throw new Error("Live quote missing executable step details. Please retry.");
  }

  const liveSteps: RouteStep[] = stepLabels.map((label, index) => {
    const kind: RouteStepKind =
      index === 0 ? "approve" : index === 1 ? "bridge" : index === 2 ? "swap" : "deliver";
    return { kind, label };
  });

  return {
    planId,
    intentId,
    provider: "LI.FI",
    routeRef: `lifi://quote/${routeRef}`,
    summary:
      readString(lifiQuote, ["summary"]) ??
      `${intent.sourceChain} ${intent.sourceAsset} → ${intent.destinationChain} ${intent.destinationAsset} via ${bridgeLabel}`,
    etaSeconds,
    estimatedFeesUsd,
    steps: liveSteps,
    intent,
  };
}

export async function startExecution(route: RoutePlan): Promise<ExecutionReceipt> {
  const startedAt = new Date().toISOString();
  const executionRef = `exec_${slug(route.planId)}_${shortId(route.routeRef)}`;
  const stepHashes = route.steps.map(
    (step, index) => `tx_${shortId(`${route.routeRef}:${step.kind}:${index}`)}`,
  );

  const receipt: ExecutionReceipt = {
    executionRef,
    intentId: route.intentId,
    planId: route.planId,
    routeRef: route.routeRef,
    status: "running",
    startedAt,
    stepHashes,
  };

  executionLedger.set(executionRef, receipt);
  return receipt;
}

export async function completeExecution(executionRef: string): Promise<ExecutionReceipt> {
  const existing = executionLedger.get(executionRef);
  if (!existing) {
    throw new Error(`Unknown execution ref: ${executionRef}`);
  }

  const completed: ExecutionReceipt = {
    ...existing,
    status: "completed",
    completedAt: new Date().toISOString(),
  };

  executionLedger.set(executionRef, completed);
  return completed;
}

async function fetchLifiQuote(intent: ParsedIntent): Promise<unknown | null> {
  // Support a fake execution mode for local/dev testing where LI.FI is mocked.
  // Enable by setting environment variable `FAKE_EXECUTION=true` in the server env.
  if (process.env.FAKE_EXECUTION === "true") {
    // Build a lightweight mocked quote with the fields `buildRoutePlan` expects.
    const mockRouteId = `mock_${shortId(`${intent.sourceChain}:${intent.sourceAsset}->${intent.destinationChain}:${intent.destinationAsset}:${intent.amount}`)}`;
    const mock = {
      id: mockRouteId,
      route: { id: mockRouteId },
      estimate: { executionDuration: 45, feeCostsUsd: 1.2 },
      summary: `${intent.sourceChain} ${intent.sourceAsset} → ${intent.destinationChain} ${intent.destinationAsset} via MOCK-LI.FI`,
      routes: [
        {
          steps: [
            { toolDetails: { name: "Approve" }, type: "approve" },
            { toolDetails: { name: "Bridge (mock)" }, type: "bridge" },
            { toolDetails: { name: "Swap (mock)" }, type: "swap" },
            { toolDetails: { name: "Deliver (mock)" }, type: "deliver" },
          ],
        },
      ],
      tool: "MOCK-LI.FI",
    } as const;

    return mock;
  }
  if (intent.sourceChain !== "Base" || intent.destinationChain !== "Solana") {
    return null;
  }

  const sourceToken =
    resolveTokenAddress(intent.sourceChain, intent.sourceAsset) ??
    resolveTokenAddress(intent.sourceChain, "USDC");
  const destinationToken =
    resolveTokenAddress(intent.destinationChain, intent.destinationAsset) ??
    resolveTokenAddress(intent.destinationChain, "USDC");

  if (!sourceToken || !destinationToken) {
    return null;
  }

  const fromAmount = toBaseUnits(intent.amount, sourceToken.decimals);
  const params = new URLSearchParams({
    fromChain: String(BASE_CHAIN_ID),
    toChain: String(SOLANA_CHAIN_ID),
    fromToken: sourceToken.address,
    toToken: destinationToken.address,
    fromAmount,
    fromAddress: LIFI_FROM_ADDRESS,
    toAddress: LIFI_TO_ADDRESS,
  });

  const response = await fetch(`${LIFI_API_BASE_URL}/v1/quote?${params.toString()}`, {
    headers: { accept: "application/json" },
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
}

function pickKeyword(text: string, entries: Array<[string, string]>): string | undefined {
  return entries.find(([needle]) => text.includes(needle))?.[1];
}

function parseIntentHeuristically(text: string): ParsedIntentResult {
  const lower = text.toLowerCase();
  const amountMatch = text.match(/\$?([0-9]+(?:\.[0-9]+)?)/);
  const amount = amountMatch ? Number.parseFloat(amountMatch[1]) : 50;

  const sourceChain = pickKeyword(lower, SOURCE_CHAIN_KEYWORDS) ?? "Base";
  const sourceAsset = pickKeyword(lower, ASSET_KEYWORDS) ?? "USDC";

  let destinationAsset = sourceAsset;
  if (lower.includes(" sol")) destinationAsset = "SOL";
  if (lower.includes(" bonk")) destinationAsset = "BONK";
  if (lower.includes(" jup")) destinationAsset = "JUP";
  if (lower.includes(" usdc")) destinationAsset = "USDC";

  const destinationAction = pickKeyword(lower, ACTION_KEYWORDS);
  const signalScore =
    Number(Boolean(amountMatch)) +
    Number(Boolean(pickKeyword(lower, SOURCE_CHAIN_KEYWORDS))) +
    Number(Boolean(pickKeyword(lower, ASSET_KEYWORDS))) +
    Number(Boolean(destinationAction)) +
    Number(/\b(from|to|into|bridge|swap|send|transfer|buy|fund|deposit)\b/.test(lower));

  if (signalScore < 2) {
    return buildNonActionableResult(text, "heuristic");
  }

  const confidence = destinationAction ? 0.92 : 0.84;

  return {
    intent: {
      rawText: text,
      amount,
      sourceChain,
      sourceAsset,
      destinationChain: "Solana",
      destinationAsset,
      destinationAction,
      confidence,
    },
    provider: "heuristic",
    actionable: true,
  };
}

async function parseIntentWithAnthropic(text: string): Promise<ParsedIntentResult | null> {
  if (!ANTHROPIC_API_KEY) {
    return null;
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "anthropic-version": "2023-06-01",
      "x-api-key": ANTHROPIC_API_KEY,
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 256,
      temperature: 0,
      system: [
        "You are Overlord's intent parser.",
        "Convert the user's natural language into a single JSON object.",
        "Return JSON only. No markdown, no code fences, no extra commentary.",
        "Use these exact fields: rawText, amount, sourceChain, sourceAsset, destinationChain, destinationAsset, destinationAction, confidence.",
        "Use only these chains when possible: Base, Ethereum, Arbitrum, Optimism, Solana.",
        "Use reasonable defaults when the user is vague: sourceChain Base, sourceAsset USDC, destinationChain Solana.",
        "confidence must be a number between 0 and 1.",
      ].join(" "),
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: `Parse this intent into JSON: ${JSON.stringify(text)}` }],
        },
      ],
    }),
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as { content?: Array<{ type?: string; text?: string }> };
  const textBlock = payload.content?.find((item) => item.type === "text")?.text?.trim();
  if (!textBlock) {
    return null;
  }

  const parsed = safeParseJson(textBlock);
  if (!parsed) {
    return null;
  }

  const intent = normalizeParsedIntent(parsed, text);
  if (!intent) {
    return null;
  }

  return {
    intent,
    provider: "anthropic",
    actionable: isLikelyActionableIntent(intent),
    model: ANTHROPIC_MODEL,
    clarification: isLikelyActionableIntent(intent)
      ? undefined
      : "Please describe a concrete transfer, for example: Move $50 USDC from Base to Solana.",
  };
}

async function parseIntentWithGemini(text: string): Promise<ParsedIntentResult | null> {
  if (!GEMINI_API_KEY) {
    return null;
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text: [
                "You are Overlord's intent parser.",
                "Convert the user's natural language into a single JSON object.",
                "Return JSON only. No markdown, no code fences, no extra commentary.",
                "Use these exact fields: rawText, amount, sourceChain, sourceAsset, destinationChain, destinationAsset, destinationAction, confidence.",
                "Use only these chains when possible: Base, Ethereum, Arbitrum, Optimism, Solana.",
                "Use reasonable defaults when the user is vague: sourceChain Base, sourceAsset USDC, destinationChain Solana.",
                "confidence must be a number between 0 and 1.",
              ].join(" "),
            },
          ],
        },
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Parse this intent into JSON: ${JSON.stringify(text)}`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 256,
        },
      }),
    },
  );

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
    }>;
  };

  const textBlock = payload.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim();
  if (!textBlock) {
    return null;
  }

  const parsed = safeParseJson(textBlock);
  if (!parsed) {
    return null;
  }

  const intent = normalizeParsedIntent(parsed, text);
  if (!intent) {
    return null;
  }

  return {
    intent,
    provider: "gemini",
    actionable: isLikelyActionableIntent(intent),
    model: GEMINI_MODEL,
    clarification: isLikelyActionableIntent(intent)
      ? undefined
      : "Please describe a concrete transfer, for example: Move $50 USDC from Base to Solana.",
  };
}

function buildNonActionableResult(text: string, provider: IntentParseSource): ParsedIntentResult {
  return {
    intent: {
      rawText: text,
      amount: 0,
      sourceChain: "Base",
      sourceAsset: "USDC",
      destinationChain: "Solana",
      destinationAsset: "USDC",
      confidence: 0.2,
    },
    provider,
    actionable: false,
    clarification:
      "Tell me the amount, source chain/asset, and destination. Example: Move $50 USDC from Base to Solana.",
  };
}

function isGreetingOrSmallTalk(text: string): boolean {
  const lower = text.trim().toLowerCase();
  const direct = /^(hi|hello|hey|yo|sup|gm|gn|thanks|thank you|ok|okay)$/.test(lower);
  if (direct) return true;

  const hasActionSignal =
    /\b(from|to|into|bridge|swap|send|transfer|buy|fund|deposit|withdraw)\b/.test(lower);
  const hasAmount = /\$?\d/.test(lower);
  const hasAsset = Boolean(pickKeyword(lower, ASSET_KEYWORDS));

  return !hasActionSignal && !hasAmount && !hasAsset && lower.length <= 20;
}

function isLikelyActionableIntent(intent: ParsedIntent): boolean {
  return intent.amount > 0 && intent.confidence >= 0.5;
}

function safeParseJson(value: string): unknown | null {
  try {
    return JSON.parse(value);
  } catch {
    const match = value.match(/\{[\s\S]*\}/);
    if (!match) return null;

    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function normalizeParsedIntent(value: unknown, rawText: string): ParsedIntent | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const amount = Number((value as { amount?: unknown }).amount);
  const sourceChain = stringField(value, "sourceChain");
  const sourceAsset = stringField(value, "sourceAsset");
  const destinationChain = stringField(value, "destinationChain");
  const destinationAsset = stringField(value, "destinationAsset");

  if (
    !Number.isFinite(amount) ||
    amount <= 0 ||
    !sourceChain ||
    !sourceAsset ||
    !destinationChain ||
    !destinationAsset
  ) {
    return null;
  }

  const destinationAction = stringField(value, "destinationAction");
  const confidenceRaw = Number((value as { confidence?: unknown }).confidence);
  const confidence = Number.isFinite(confidenceRaw) ? Math.min(1, Math.max(0, confidenceRaw)) : 0.9;

  return {
    rawText,
    amount,
    sourceChain,
    sourceAsset,
    destinationChain,
    destinationAsset,
    destinationAction,
    confidence,
  };
}

function stringField(value: unknown, key: string): string | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const field = (value as Record<string, unknown>)[key];
  return typeof field === "string" && field.trim().length > 0 ? field.trim() : undefined;
}

function feeBump(intent: ParsedIntent): number {
  if (intent.destinationAction?.toLowerCase().includes("drift")) return 0.18;
  if (intent.destinationAsset === "BONK") return 0.12;
  return 0;
}

function resolveTokenAddress(
  chain: string,
  asset: string,
): { address: string; decimals: number } | undefined {
  return TOKEN_ADDRESSES[chain]?.[asset];
}

function toBaseUnits(amount: number, decimals: number): string {
  return BigInt(Math.round(amount * 10 ** decimals)).toString();
}

function readString(value: unknown, path: Array<string | number>): string | undefined {
  const found = readPath(value, path);
  return typeof found === "string" ? found : undefined;
}

function readNumber(value: unknown, path: Array<string | number>): number | undefined {
  const found = readPath(value, path);
  if (typeof found === "number" && Number.isFinite(found)) return found;
  if (typeof found === "string") {
    const parsed = Number(found);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function readPath(value: unknown, path: Array<string | number>): unknown {
  let current: unknown = value;
  for (const key of path) {
    if (current == null || typeof current !== "object") return undefined;
    current = current[key as keyof typeof current];
  }
  return current;
}

function extractStepLabels(payload: unknown): string[] {
  const routes = readPath(payload, ["routes"]);
  if (!Array.isArray(routes) || routes.length === 0) {
    return [];
  }

  const steps = readPath(routes[0], ["steps"]);
  if (!Array.isArray(steps)) {
    return [];
  }

  return steps
    .map((step) => {
      if (typeof step !== "object" || step == null) return undefined;
      const label =
        readString(step, ["toolDetails", "name"]) ??
        readString(step, ["tool", "name"]) ??
        readString(step, ["action", "fromChain"]) ??
        readString(step, ["action", "name"]) ??
        readString(step, ["estimate", "fromAmount"]) ??
        readString(step, ["type"]);
      return label;
    })
    .filter((label): label is string => Boolean(label));
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function shortId(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index++) {
    hash = Math.imul(31, hash) + value.charCodeAt(index);
  }
  return Math.abs(hash).toString(36).slice(0, 10);
}

function hashToUint64(value: string): string {
  const mask = (1n << 64n) - 1n;
  let hash = 0xcbf29ce484222325n;

  for (let index = 0; index < value.length; index++) {
    hash ^= BigInt(value.charCodeAt(index));
    hash = (hash * 0x100000001b3n) & mask;
  }

  return hash.toString();
}
