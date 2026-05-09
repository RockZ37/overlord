export type ParsedIntent = {
  rawText: string;
  amount: number;
  sourceChain: string;
  sourceAsset: string;
  destinationChain: string;
  destinationAsset: string;
  destinationAction?: string;
  confidence: number;
};

export type RouteStepKind = "approve" | "bridge" | "swap" | "deliver";

export type RouteStep = {
  kind: RouteStepKind;
  label: string;
};

export type RoutePlan = {
  planId: string;
  intentId: string;
  provider: "LI.FI";
  routeRef: string;
  summary: string;
  etaSeconds: number;
  estimatedFeesUsd: number;
  steps: RouteStep[];
  intent: ParsedIntent;
};

export type ExecutionStatus = "queued" | "running" | "completed" | "failed";

export type ExecutionReceipt = {
  executionRef: string;
  intentId: string;
  planId: string;
  routeRef: string;
  status: ExecutionStatus;
  startedAt: string;
  completedAt?: string;
  stepHashes: string[];
};
