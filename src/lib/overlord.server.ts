import type { ExecutionReceipt, ParsedIntent, RoutePlan } from "./overlord-types";

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
const SOLANA_CHAIN_ID = Number(process.env.LIFI_SOLANA_CHAIN_ID ?? "1151111081");

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

export function parseOverlordIntent(text: string): ParsedIntent {
  const rawText = text.trim();
  const lower = rawText.toLowerCase();
  const amountMatch = rawText.match(/\$?([0-9]+(?:\.[0-9]+)?)/);
  const amount = amountMatch ? Number.parseFloat(amountMatch[1]) : 50;

  const sourceChain = pickKeyword(lower, SOURCE_CHAIN_KEYWORDS) ?? "Base";
  const sourceAsset = pickKeyword(lower, ASSET_KEYWORDS) ?? "USDC";

  let destinationAsset = sourceAsset;
  if (lower.includes(" sol")) destinationAsset = "SOL";
  if (lower.includes(" bonk")) destinationAsset = "BONK";
  if (lower.includes(" jup")) destinationAsset = "JUP";
  if (lower.includes(" usdc")) destinationAsset = "USDC";

  const destinationAction = pickKeyword(lower, ACTION_KEYWORDS);
  const confidence = destinationAction ? 0.92 : 0.84;

  return {
    rawText,
    amount,
    sourceChain,
    sourceAsset,
    destinationChain: "Solana",
    destinationAsset,
    destinationAction,
    confidence,
  };
}

export async function buildRoutePlan(intent: ParsedIntent): Promise<RoutePlan> {
  const planId = `plan_${slug(intent.sourceChain)}_${slug(intent.destinationAsset)}_${intent.amount.toFixed(0)}`;
  const intentId = hashToUint64(
    `${intent.sourceChain}:${intent.sourceAsset}:${intent.destinationChain}:${intent.destinationAsset}:${intent.amount}:${planId}`,
  );
  const fallback = buildFallbackRoutePlan(intent, planId, intentId);
  const lifiQuote = await fetchLifiQuote(intent).catch(() => null);

  if (!lifiQuote) {
    return { ...fallback, intentId };
  }

  const routeRef =
    readString(lifiQuote, ["id"]) ?? readString(lifiQuote, ["route", "id"]) ?? fallback.routeRef;
  const etaSeconds =
    readNumber(lifiQuote, ["estimate", "executionDuration"]) ??
    readNumber(lifiQuote, ["estimate", "duration"]) ??
    fallback.etaSeconds;
  const estimatedFeesUsd =
    readNumber(lifiQuote, ["estimate", "feeCostsUsd"]) ??
    readNumber(lifiQuote, ["estimate", "feeUsd"]) ??
    fallback.estimatedFeesUsd;

  const bridgeLabel = readString(lifiQuote, ["tool"]) ?? readString(lifiQuote, ["name"]) ?? "LI.FI";

  const stepLabels = extractStepLabels(lifiQuote);

  return {
    ...fallback,
    intentId,
    provider: "LI.FI",
    routeRef: `lifi://quote/${routeRef}`,
    summary:
      readString(lifiQuote, ["summary"]) ??
      `${intent.sourceChain} ${intent.sourceAsset} → ${intent.destinationChain} ${intent.destinationAsset} via ${bridgeLabel}`,
    etaSeconds,
    estimatedFeesUsd,
    steps:
      stepLabels.length > 0
        ? stepLabels.map((label, index) => ({
            kind:
              fallback.steps[index]?.kind ??
              (index === 0 ? "approve" : index === 1 ? "bridge" : index === 2 ? "swap" : "deliver"),
            label,
          }))
        : fallback.steps,
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

function buildFallbackRoutePlan(intent: ParsedIntent, planId: string, intentId: string): RoutePlan {
  const routeRef = `lifi://quote/${planId}`;
  const estimatedFeesUsd = Number(
    (Math.max(0.95, intent.amount * 0.011) + feeBump(intent)).toFixed(2),
  );
  const etaSeconds = Math.max(35, Math.round(28 + intent.amount * 0.42 + feeBump(intent) * 18));

  return {
    planId,
    intentId,
    provider: "LI.FI",
    routeRef,
    summary: `${intent.sourceChain} ${intent.sourceAsset} → ${intent.destinationChain} ${intent.destinationAsset}`,
    etaSeconds,
    estimatedFeesUsd,
    steps: [
      { kind: "approve", label: `Approve ${intent.sourceAsset} on ${intent.sourceChain}` },
      { kind: "bridge", label: `Bridge to ${intent.destinationChain} via LI.FI` },
      { kind: "swap", label: `Swap into ${intent.destinationAsset}` },
      {
        kind: "deliver",
        label: intent.destinationAction ?? `Deliver ${intent.destinationAsset} to wallet`,
      },
    ],
    intent,
  };
}

async function fetchLifiQuote(intent: ParsedIntent): Promise<unknown | null> {
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
