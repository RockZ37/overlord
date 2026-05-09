import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  clusterApiUrl,
} from "@solana/web3.js";
import type { ParsedIntent, RoutePlan } from "./overlord-types";

const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
const DEVNET_CONNECTION = new Connection(clusterApiUrl("devnet"), "confirmed");
const OVERLORD_PROGRAM_ID = getOverlordProgramId();

type PhantomProvider = {
  isPhantom?: boolean;
  publicKey: PublicKey | null;
  connect: () => Promise<{ publicKey: PublicKey }>;
  signTransaction: (transaction: Transaction) => Promise<Transaction>;
  signAndSendTransaction?: (
    transaction: Transaction,
  ) => Promise<{ signature: string; publicKey?: PublicKey }>;
};

declare global {
  interface Window {
    solana?: PhantomProvider;
  }
}

export function getPhantomProvider(): PhantomProvider | undefined {
  if (typeof window === "undefined") return undefined;
  
  const solana = window.solana as any;
  if (!solana) return undefined;
  
  // Check if it's Phantom or allow any Solana provider
  if (solana.isPhantom || solana.isPhantnom) {
    return solana as PhantomProvider;
  }
  
  // Fallback to any solana provider if available
  if (solana.connect && typeof solana.connect === "function") {
    return solana as PhantomProvider;
  }
  
  return undefined;
}

export async function connectPhantomWallet(): Promise<string> {
  // Retry logic to wait for provider injection
  let provider: PhantomProvider | undefined;
  for (let i = 0; i < 10; i++) {
    provider = getPhantomProvider();
    if (provider) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  if (!provider) {
    throw new Error(
      "Phantom wallet not detected. Please install Phantom from https://phantom.app",
    );
  }

  try {
    const response = await provider.connect();
    return response.publicKey.toBase58();
  } catch (error) {
    if (error instanceof Error && error.message.includes("User rejected")) {
      throw new Error("Wallet connection rejected by user");
    }
    throw new Error(`Failed to connect wallet: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function sendExecutionMemo(input: {
  executionRef: string;
  planId: string;
  routeRef: string;
  summary: string;
}): Promise<string> {
  const provider = getPhantomProvider();
  if (!provider?.publicKey) {
    throw new Error("Wallet not connected");
  }

  const memoPayload = JSON.stringify({
    type: "overlord_execution",
    executionRef: input.executionRef,
    planId: input.planId,
    routeRef: input.routeRef,
    summary: input.summary,
    timestamp: new Date().toISOString(),
  });

  const transaction = new Transaction().add(
    new TransactionInstruction({
      programId: MEMO_PROGRAM_ID,
      keys: [],
      data: Buffer.from(memoPayload, "utf8"),
    }),
  );

  transaction.feePayer = provider.publicKey;

  const latestBlockhash = await DEVNET_CONNECTION.getLatestBlockhash("confirmed");
  const { blockhash, lastValidBlockHeight } = latestBlockhash;
  transaction.recentBlockhash = blockhash;

  if (provider.signAndSendTransaction) {
    const { signature } = await provider.signAndSendTransaction(transaction);
    await DEVNET_CONNECTION.confirmTransaction(
      { blockhash, lastValidBlockHeight, signature },
      "confirmed",
    );
    return signature;
  }

  const signed = await provider.signTransaction(transaction);
  const signature = await DEVNET_CONNECTION.sendRawTransaction(signed.serialize());
  await DEVNET_CONNECTION.confirmTransaction(
    { blockhash, lastValidBlockHeight, signature },
    "confirmed",
  );
  return signature;
}

export async function submitRegistryExecution(input: {
  route: RoutePlan;
  executionRef: string;
}): Promise<string> {
  const provider = getPhantomProvider();
  if (!provider?.publicKey) {
    throw new Error("Wallet not connected");
  }

  if (!OVERLORD_PROGRAM_ID) {
    throw new Error("Overlord program ID not configured");
  }

  const authority = provider.publicKey;
  const intentId = BigInt(input.route.intentId);
  const intentRecord = PublicKey.findProgramAddressSync(
    [Buffer.from("intent"), authority.toBuffer(), encodeU64(intentId)],
    OVERLORD_PROGRAM_ID,
  )[0];

  const transaction = new Transaction();
  transaction.add(
    await createRegisterIntentInstruction({
      authority,
      intentRecord,
      intent: input.route.intent,
      intentId,
    }),
  );
  transaction.add(
    await createAttachRouteReferenceInstruction({
      authority,
      intentRecord,
      intentId,
      routeRef: compactRouteRef(input.route.routeRef),
    }),
  );
  transaction.add(
    await createRecordExecutionReferenceInstruction({
      authority,
      intentRecord,
      intentId,
      executionRef: input.executionRef,
    }),
  );
  transaction.add(
    await createUpdateStatusInstruction({
      authority,
      intentRecord,
      intentId,
      status: 3,
    }),
  );

  transaction.feePayer = authority;

  const latestBlockhash = await DEVNET_CONNECTION.getLatestBlockhash("confirmed");
  const { blockhash, lastValidBlockHeight } = latestBlockhash;
  transaction.recentBlockhash = blockhash;

  if (provider.signAndSendTransaction) {
    const { signature } = await provider.signAndSendTransaction(transaction);
    await DEVNET_CONNECTION.confirmTransaction(
      { blockhash, lastValidBlockHeight, signature },
      "confirmed",
    );
    return signature;
  }

  const signed = await provider.signTransaction(transaction);
  const signature = await DEVNET_CONNECTION.sendRawTransaction(signed.serialize());
  await DEVNET_CONNECTION.confirmTransaction(
    { blockhash, lastValidBlockHeight, signature },
    "confirmed",
  );
  return signature;
}

async function createRegisterIntentInstruction(input: {
  authority: PublicKey;
  intentRecord: PublicKey;
  intent: ParsedIntent;
  intentId: bigint;
}): Promise<TransactionInstruction> {
  const data = await encodeAnchorInstruction("register_intent", [
    encodeU64(input.intentId),
    encodeString(input.intent.sourceChain),
    encodeString(input.intent.sourceAsset),
    encodeString(input.intent.destinationChain),
    encodeString(input.intent.destinationAsset),
    encodeString(
      input.intent.destinationAction ?? `Deliver ${input.intent.destinationAsset} to wallet`,
    ),
    encodeU64(BigInt(Math.round(input.intent.amount))),
  ]);

  return new TransactionInstruction({
    programId: OVERLORD_PROGRAM_ID!,
    keys: [
      { pubkey: input.authority, isSigner: true, isWritable: true },
      { pubkey: input.intentRecord, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

async function createAttachRouteReferenceInstruction(input: {
  authority: PublicKey;
  intentRecord: PublicKey;
  intentId: bigint;
  routeRef: string;
}): Promise<TransactionInstruction> {
  const data = await encodeAnchorInstruction("attach_route_reference", [
    encodeU64(input.intentId),
    encodeString(input.routeRef),
  ]);

  return new TransactionInstruction({
    programId: OVERLORD_PROGRAM_ID!,
    keys: [
      { pubkey: input.authority, isSigner: true, isWritable: true },
      { pubkey: input.intentRecord, isSigner: false, isWritable: true },
    ],
    data,
  });
}

async function createRecordExecutionReferenceInstruction(input: {
  authority: PublicKey;
  intentRecord: PublicKey;
  intentId: bigint;
  executionRef: string;
}): Promise<TransactionInstruction> {
  const data = await encodeAnchorInstruction("record_execution_reference", [
    encodeU64(input.intentId),
    encodeString(input.executionRef),
  ]);

  return new TransactionInstruction({
    programId: OVERLORD_PROGRAM_ID!,
    keys: [
      { pubkey: input.authority, isSigner: true, isWritable: true },
      { pubkey: input.intentRecord, isSigner: false, isWritable: true },
    ],
    data,
  });
}

async function createUpdateStatusInstruction(input: {
  authority: PublicKey;
  intentRecord: PublicKey;
  intentId: bigint;
  status: number;
}): Promise<TransactionInstruction> {
  const data = await encodeAnchorInstruction("update_status", [
    encodeU64(input.intentId),
    encodeU8(input.status),
  ]);

  return new TransactionInstruction({
    programId: OVERLORD_PROGRAM_ID!,
    keys: [
      { pubkey: input.authority, isSigner: true, isWritable: true },
      { pubkey: input.intentRecord, isSigner: false, isWritable: true },
    ],
    data,
  });
}

function getOverlordProgramId(): PublicKey | undefined {
  const programId = import.meta.env.VITE_OVERLORD_PROGRAM_ID?.trim();
  if (!programId) {
    return undefined;
  }

  return new PublicKey(programId);
}

function compactRouteRef(routeRef: string): string {
  if (routeRef.length <= 96) {
    return routeRef;
  }

  return `lifi://${shortHash(routeRef)}`;
}

async function encodeAnchorInstruction(methodName: string, parts: Array<Buffer>): Promise<Buffer> {
  const discriminator = await anchorDiscriminator(methodName);
  return Buffer.concat([discriminator, ...parts]);
}

async function anchorDiscriminator(methodName: string): Promise<Buffer> {
  const payload = new TextEncoder().encode(`global:${methodName}`);
  const digest = await crypto.subtle.digest("SHA-256", payload);
  return Buffer.from(digest).subarray(0, 8);
}

function encodeU8(value: number): Buffer {
  return Buffer.from([value & 0xff]);
}

function encodeU64(value: bigint): Buffer {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64LE(value);
  return buffer;
}

function encodeString(value: string): Buffer {
  const bytes = Buffer.from(value, "utf8");
  const length = Buffer.alloc(4);
  length.writeUInt32LE(bytes.length);
  return Buffer.concat([length, bytes]);
}

function shortHash(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index++) {
    hash = Math.imul(31, hash) + value.charCodeAt(index);
  }
  return Math.abs(hash).toString(36).slice(0, 12);
}
