import type { ParsedIntent, RoutePlan, RouteStep } from "./overlord-types";

function shortIdSeed(value: string): string {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (Math.imul(31, h) + value.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36).slice(0, 8);
}

export function buildMockRoute(intent: ParsedIntent): RoutePlan {
  const planId = `mock_${intent.sourceChain.toLowerCase()}_${intent.destinationAsset.toLowerCase()}_${Math.round(
    intent.amount,
  )}`;
  const intentId = shortIdSeed(`${intent.sourceChain}:${intent.sourceAsset}:${intent.destinationChain}:${intent.destinationAsset}:${intent.amount}:${planId}`);

  const steps: RouteStep[] = [
    { kind: "approve", label: "Approve token" },
    { kind: "bridge", label: "Bridge to Solana (mock)" },
    { kind: "swap", label: "Swap on Solana (mock)" },
    { kind: "deliver", label: "Deliver to wallet" },
  ];

  return {
    planId,
    intentId,
    provider: "MOCK-LI.FI",
    routeRef: `lifi://mock/${shortIdSeed(planId)}`,
    summary: `${intent.sourceChain} ${intent.sourceAsset} → ${intent.destinationChain} ${intent.destinationAsset} (mock)`,
    etaSeconds: 45,
    estimatedFeesUsd: 1.2,
    steps,
    intent,
  } as RoutePlan;
}
