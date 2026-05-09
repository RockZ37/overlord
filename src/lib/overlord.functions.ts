import { createServerFn } from "@tanstack/react-start";

import {
  buildRoutePlan,
  completeExecution,
  parseOverlordIntent,
  startExecution,
} from "./overlord.server";
import type {
  ExecutionReceipt,
  ParsedIntent,
  ParsedIntentResult,
  RoutePlan,
} from "./overlord-types";

export const parseIntentFn = createServerFn({ method: "POST" })
  .inputValidator((data: string) => data)
  .handler(async ({ data }): Promise<ParsedIntentResult> => parseOverlordIntent(data));

export const planRouteFn = createServerFn({ method: "POST" })
  .inputValidator((data: ParsedIntent) => data)
  .handler(async ({ data }): Promise<RoutePlan> => buildRoutePlan(data));

export const startExecutionFn = createServerFn({ method: "POST" })
  .inputValidator((data: RoutePlan) => data)
  .handler(async ({ data }): Promise<ExecutionReceipt> => startExecution(data));

export const completeExecutionFn = createServerFn({ method: "POST" })
  .inputValidator((data: string) => data)
  .handler(async ({ data }): Promise<ExecutionReceipt> => completeExecution(data));
