import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteNav } from "@/components/site-nav";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Send,
  Sparkles,
  Wallet,
  Zap,
  ShieldCheck,
  Loader2,
  Check,
  ExternalLink,
} from "lucide-react";

export const Route = createFileRoute("/app")({
  component: AppPage,
  head: () => ({
    meta: [
      { title: "Overlord — Intent Console" },
      {
        name: "description",
        content:
          "The Overlord intent console. Type a cross-chain action and watch the AI route, bridge, and land it on Solana.",
      },
      { property: "og:title", content: "Overlord Intent Console" },
      {
        property: "og:description",
        content: "Talk to the AI. Move liquidity to Solana in one sentence.",
      },
    ],
  }),
});

type Intent = {
  fromChain: string;
  fromAsset: string;
  toChain: string;
  toAsset: string;
  amount: number;
  destinationAction?: string;
};

type Step = {
  label: string;
  status: "idle" | "loading" | "done";
  hash?: string;
};

type Message =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "ai"; text: string }
  | { id: string; role: "intent"; intent: Intent }
  | { id: string; role: "route"; intent: Intent; confirmed: boolean }
  | { id: string; role: "execution"; steps: Step[]; intent: Intent };

const sampleIntents = [
  "Put $50 from my Base wallet into SOL",
  "Fund my Drift account with $100 from Base USDC",
  "Buy BONK with $25 from my Base ETH",
];

function AppPage() {
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "ai",
      text:
        "Welcome to Overlord. Tell me what you want to do across chains and I'll handle the bridging, swapping, and delivery. Try one of the prompts below.",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 9e9, behavior: "smooth" });
  }, [messages]);

  function parseIntent(text: string): Intent {
    const amountMatch = text.match(/\$?(\d+(?:\.\d+)?)/);
    const amount = amountMatch ? parseFloat(amountMatch[1]) : 50;
    const lower = text.toLowerCase();
    let toAsset = "SOL";
    let destinationAction: string | undefined;
    if (lower.includes("bonk")) toAsset = "BONK";
    else if (lower.includes("jup")) toAsset = "JUP";
    else if (lower.includes("usdc")) toAsset = "USDC";
    if (lower.includes("drift")) destinationAction = "Deposit to Drift";
    else if (lower.includes("jupiter")) destinationAction = "Swap on Jupiter";
    else if (lower.includes("tensor")) destinationAction = "Tensor wallet";
    let fromAsset = "USDC";
    if (lower.includes("eth")) fromAsset = "ETH";
    return {
      fromChain: "Base",
      fromAsset,
      toChain: "Solana",
      toAsset,
      amount,
      destinationAction,
    };
  }

  async function sendIntent(text: string) {
    if (!text.trim() || busy) return;
    if (!connected) {
      setConnected(true);
    }
    setBusy(true);
    const userId = crypto.randomUUID();
    setMessages((m) => [...m, { id: userId, role: "user", text }]);
    setInput("");

    await wait(450);
    const intent = parseIntent(text);
    setMessages((m) => [
      ...m,
      {
        id: crypto.randomUUID(),
        role: "ai",
        text: "Got it. Extracting intent…",
      },
      { id: crypto.randomUUID(), role: "intent", intent },
    ]);

    await wait(700);
    setMessages((m) => [
      ...m,
      {
        id: crypto.randomUUID(),
        role: "ai",
        text: `Querying LI.FI for the best route from ${intent.fromChain} ${intent.fromAsset} → ${intent.toChain} ${intent.toAsset}…`,
      },
    ]);
    await wait(900);
    const routeId = crypto.randomUUID();
    setMessages((m) => [
      ...m,
      { id: routeId, role: "route", intent, confirmed: false },
    ]);
    setBusy(false);
  }

  async function confirmRoute(routeId: string) {
    setMessages((m) =>
      m.map((msg) =>
        msg.id === routeId && msg.role === "route"
          ? { ...msg, confirmed: true }
          : msg,
      ),
    );
    const routeMsg = messages.find((m) => m.id === routeId);
    if (!routeMsg || routeMsg.role !== "route") return;
    const intent = routeMsg.intent;
    const baseSteps: Step[] = [
      { label: `Approve ${intent.fromAsset} on ${intent.fromChain}`, status: "idle" },
      { label: `Bridge to ${intent.toChain} via LI.FI`, status: "idle" },
      { label: `Swap into ${intent.toAsset}`, status: "idle" },
      {
        label: intent.destinationAction
          ? intent.destinationAction
          : `Deliver ${intent.toAsset} to wallet`,
        status: "idle",
      },
    ];
    const execId = crypto.randomUUID();
    setMessages((m) => [
      ...m,
      { id: execId, role: "execution", steps: baseSteps, intent },
    ]);
    setBusy(true);

    for (let i = 0; i < baseSteps.length; i++) {
      await wait(700);
      setMessages((m) =>
        m.map((msg) =>
          msg.id === execId && msg.role === "execution"
            ? {
                ...msg,
                steps: msg.steps.map((s, idx) =>
                  idx === i ? { ...s, status: "loading" } : s,
                ),
              }
            : msg,
        ),
      );
      await wait(1200 + Math.random() * 600);
      setMessages((m) =>
        m.map((msg) =>
          msg.id === execId && msg.role === "execution"
            ? {
                ...msg,
                steps: msg.steps.map((s, idx) =>
                  idx === i
                    ? {
                        ...s,
                        status: "done",
                        hash: fakeHash(),
                      }
                    : s,
                ),
              }
            : msg,
        ),
      );
    }

    await wait(400);
    setMessages((m) => [
      ...m,
      {
        id: crypto.randomUUID(),
        role: "ai",
        text: `Done. ${
          intent.destinationAction ?? `${intent.amount} ${intent.toAsset}`
        } is on Solana. Anything else?`,
      },
    ]);
    setBusy(false);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />
      <div className="flex-1 mx-auto w-full max-w-6xl px-4 md:px-6 py-6 grid lg:grid-cols-[260px_1fr] gap-6">
        <Sidebar
          connected={connected}
          onConnect={() => setConnected(true)}
          onPick={(p) => sendIntent(p)}
        />
        <div className="relative flex flex-col rounded-3xl border border-border bg-gradient-card backdrop-blur-xl shadow-card overflow-hidden">
          <ChatHeader />
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 md:px-8 py-8 space-y-6">
            {messages.map((m) => (
              <MessageView key={m.id} message={m} onConfirm={confirmRoute} />
            ))}
            {busy && <TypingDots />}
          </div>
          <InputBar
            value={input}
            onChange={setInput}
            onSend={() => sendIntent(input)}
            disabled={busy}
          />
        </div>
      </div>
    </div>
  );
}

function ChatHeader() {
  return (
    <div className="flex items-center justify-between border-b border-border/60 px-6 py-4 bg-background/40">
      <div className="flex items-center gap-3">
        <div className="relative h-9 w-9 rounded-xl bg-gradient-hero flex items-center justify-center shadow-neon">
          <Sparkles className="h-4 w-4 text-background" />
        </div>
        <div>
          <div className="font-semibold leading-none">Overlord Agent</div>
          <div className="text-xs text-muted-foreground font-mono mt-1">
            online · gpt-routed · LI.FI live
          </div>
        </div>
      </div>
      <div className="hidden md:flex items-center gap-2 text-xs font-mono text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-glow" />
        DEVNET
      </div>
    </div>
  );
}

function Sidebar({
  connected,
  onConnect,
  onPick,
}: {
  connected: boolean;
  onConnect: () => void;
  onPick: (p: string) => void;
}) {
  return (
    <aside className="space-y-4">
      <div className="rounded-2xl border border-border bg-gradient-card p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-foreground/5 border border-border flex items-center justify-center">
            <Wallet className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
              Wallet
            </div>
            <div className="font-semibold">Phantom</div>
          </div>
        </div>
        {connected ? (
          <div className="space-y-3">
            <div className="rounded-lg bg-background/40 border border-border px-3 py-2 font-mono text-xs">
              <div className="text-muted-foreground">Solana</div>
              <div>4xKp…h7Qz</div>
            </div>
            <div className="rounded-lg bg-background/40 border border-border px-3 py-2 font-mono text-xs">
              <div className="text-muted-foreground">Base</div>
              <div>0x9c2…aF31</div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="rounded-lg bg-background/40 border border-border py-2">
                <div className="text-[10px] font-mono uppercase text-muted-foreground">
                  Base USDC
                </div>
                <div className="font-semibold">$248.10</div>
              </div>
              <div className="rounded-lg bg-background/40 border border-border py-2">
                <div className="text-[10px] font-mono uppercase text-muted-foreground">
                  SOL
                </div>
                <div className="font-semibold">1.42</div>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={onConnect}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-hero px-4 py-2.5 text-sm font-semibold text-background shadow-neon hover:scale-[1.01] transition"
          >
            Connect Phantom <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-gradient-card p-5">
        <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3">
          Quick intents
        </div>
        <div className="space-y-2">
          {sampleIntents.map((p) => (
            <button
              key={p}
              onClick={() => onPick(p)}
              className="w-full text-left text-sm rounded-lg border border-border bg-background/40 hover:border-primary/50 hover:text-primary px-3 py-2 transition"
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <Link
        to="/"
        className="block text-center text-xs font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground transition py-2"
      >
        ← back to landing
      </Link>
    </aside>
  );
}

function MessageView({
  message,
  onConfirm,
}: {
  message: Message;
  onConfirm: (id: string) => void;
}) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-foreground text-background px-4 py-2.5 text-sm">
          {message.text}
        </div>
      </div>
    );
  }
  if (message.role === "ai") {
    return (
      <div className="flex gap-3">
        <AiAvatar />
        <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-muted/60 border border-border px-4 py-2.5 text-sm">
          {message.text}
        </div>
      </div>
    );
  }
  if (message.role === "intent") {
    const i = message.intent;
    return (
      <div className="flex gap-3">
        <AiAvatar />
        <div className="rounded-2xl border border-border bg-background/40 p-4 font-mono text-xs space-y-1">
          <div className="text-muted-foreground mb-1">// extracted_intent</div>
          <Kv k="from_chain" v={i.fromChain} />
          <Kv k="from_asset" v={i.fromAsset} />
          <Kv k="amount" v={`$${i.amount}`} />
          <Kv k="to_chain" v={i.toChain} />
          <Kv k="to_asset" v={i.toAsset} />
          {i.destinationAction && <Kv k="action" v={i.destinationAction} />}
        </div>
      </div>
    );
  }
  if (message.role === "route") {
    const i = message.intent;
    return (
      <div className="flex gap-3">
        <AiAvatar />
        <div className="w-full max-w-xl rounded-2xl border border-primary/30 bg-primary/5 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-4 w-4 text-primary" />
            <span className="font-semibold">Best route via LI.FI</span>
          </div>
          <div className="grid grid-cols-3 items-center gap-2 mb-5">
            <RouteNode label={i.fromChain} sub={i.fromAsset} />
            <div className="flex flex-col items-center text-muted-foreground">
              <div className="font-mono text-[10px] uppercase tracking-widest">bridge</div>
              <ArrowRight className="h-4 w-4" />
            </div>
            <RouteNode label={i.toChain} sub={i.toAsset} highlight />
          </div>
          <div className="grid grid-cols-3 gap-3 text-xs font-mono mb-5">
            <Stat label="ETA" value="~45s" />
            <Stat label="Fees" value="$1.20" />
            <Stat label="Slippage" value="0.5%" />
          </div>
          <button
            disabled={message.confirmed}
            onClick={() => onConfirm(message.id)}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-hero px-4 py-3 text-sm font-semibold text-background shadow-neon disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01] transition"
          >
            <ShieldCheck className="h-4 w-4" />
            {message.confirmed ? "Confirmed" : "Confirm transaction"}
          </button>
        </div>
      </div>
    );
  }
  if (message.role === "execution") {
    return (
      <div className="flex gap-3">
        <AiAvatar />
        <div className="w-full max-w-xl rounded-2xl border border-border bg-background/40 p-5 space-y-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            execution
          </div>
          {message.steps.map((s, idx) => (
            <ExecutionStep key={idx} step={s} />
          ))}
        </div>
      </div>
    );
  }
  return null;
}

function ExecutionStep({ step }: { step: Step }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <div className="h-6 w-6 rounded-full flex items-center justify-center border border-border shrink-0">
        {step.status === "done" ? (
          <Check className="h-3.5 w-3.5 text-primary" />
        ) : step.status === "loading" ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan" />
        ) : (
          <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
        )}
      </div>
      <div className="flex-1">
        <div
          className={
            step.status === "idle" ? "text-muted-foreground/60" : "text-foreground"
          }
        >
          {step.label}
        </div>
        {step.hash && (
          <a
            href="#"
            className="font-mono text-[10px] text-muted-foreground hover:text-primary inline-flex items-center gap-1"
          >
            {step.hash} <ExternalLink className="h-2.5 w-2.5" />
          </a>
        )}
      </div>
    </div>
  );
}

function RouteNode({
  label,
  sub,
  highlight,
}: {
  label: string;
  sub: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-3 text-center ${
        highlight ? "border-primary/50 bg-primary/10" : "border-border bg-background/50"
      }`}
    >
      <div className="font-semibold text-sm">{label}</div>
      <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
        {sub}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-background/60 border border-border px-3 py-2">
      <div className="text-muted-foreground text-[10px] uppercase tracking-widest">
        {label}
      </div>
      <div className="text-foreground">{value}</div>
    </div>
  );
}

function Kv({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-3">
      <span className="text-muted-foreground">{k}:</span>
      <span className="text-primary">"{v}"</span>
    </div>
  );
}

function AiAvatar() {
  return (
    <div className="h-8 w-8 rounded-xl bg-gradient-hero flex items-center justify-center shadow-neon shrink-0">
      <Sparkles className="h-3.5 w-3.5 text-background" />
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex gap-3">
      <AiAvatar />
      <div className="rounded-2xl rounded-bl-sm bg-muted/60 border border-border px-4 py-3 flex items-center gap-1">
        <Dot delay={0} />
        <Dot delay={150} />
        <Dot delay={300} />
      </div>
    </div>
  );
}

function Dot({ delay }: { delay: number }) {
  return (
    <span
      className="h-1.5 w-1.5 rounded-full bg-foreground/60 animate-pulse-glow"
      style={{ animationDelay: `${delay}ms` }}
    />
  );
}

function InputBar({
  value,
  onChange,
  onSend,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  disabled: boolean;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSend();
      }}
      className="border-t border-border/60 bg-background/40 p-4"
    >
      <div className="flex items-center gap-2 rounded-2xl border border-border bg-background/60 px-4 py-2 focus-within:border-primary/50 transition">
        <span className="font-mono text-primary text-sm">&gt;</span>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Tell Overlord what to do — e.g. put $50 from Base into SOL"
          className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground/60 py-2"
        />
        <button
          type="submit"
          disabled={disabled || !value.trim()}
          className="inline-flex items-center justify-center h-9 w-9 rounded-xl bg-gradient-hero text-background disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.05] transition"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </form>
  );
}

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function fakeHash() {
  const chars = "abcdef0123456789";
  let s = "0x";
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s + "…" + chars[0] + chars[5];
}
