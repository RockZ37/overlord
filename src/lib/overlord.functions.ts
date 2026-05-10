import type {
  ExecutionReceipt,
  ParsedIntent,
  ParsedIntentResult,
  RoutePlan,
} from "./overlord-types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ?? "";

async function requestJson<TResponse, TBody>(path: string, body: TBody): Promise<TResponse> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || `Request failed with status ${response.status}`);
  }

  return (await response.json()) as TResponse;
}

export function parseIntentFn(input: { data: string }): Promise<ParsedIntentResult> {
  return requestJson<ParsedIntentResult, { data: string }>("/api/parse-intent", input);
}

export function planRouteFn(input: { data: ParsedIntent }): Promise<RoutePlan> {
  return requestJson<RoutePlan, { data: ParsedIntent }>("/api/plan-route", input);
}

export function startExecutionFn(input: { data: RoutePlan }): Promise<ExecutionReceipt> {
  return requestJson<ExecutionReceipt, { data: RoutePlan }>("/api/start-execution", input);
}

export function completeExecutionFn(input: { data: string }): Promise<ExecutionReceipt> {
  return requestJson<ExecutionReceipt, { data: string }>("/api/complete-execution", input);
}
