import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteNav } from "@/components/site-nav";
import {
  ArrowRight,
  Brain,
  Wallet,
  Route as RouteIcon,
  Zap,
  ShieldCheck,
  MessageSquare,
  Layers,
  Sparkles,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "Project Overlord — AI Cross-Chain Onboarding for Solana" },
      {
        name: "description",
        content:
          "Move liquidity from Base, Arbitrum or Ethereum into Solana apps with a single sentence. AI-powered intent execution.",
      },
      { property: "og:title", content: "Project Overlord — AI Onboarding for Solana" },
      {
        property: "og:description",
        content: "Type your intent. The AI bridges, swaps, and lands you on Solana.",
      },
    ],
  }),
});

function Landing() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />
      <main className="flex-1">
        <Hero />
        <LogoStrip />
        <HowItWorks />
        <ChatPreview />
        <Flows />
        <Stack />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 grid-bg pointer-events-none" />
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[800px] bg-gradient-hero opacity-30 blur-3xl rounded-full" />
      <div className="relative mx-auto max-w-7xl px-6 pt-20 pb-32 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/50 backdrop-blur px-4 py-1.5 text-xs font-mono uppercase tracking-widest text-muted-foreground mb-8">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-glow" />
          Solana × LI.FI × AI Agents
        </div>
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[0.95] mb-8">
          One sentence to <br />
          <span className="text-gradient">any Solana app.</span>
        </h1>
        <p className="mx-auto max-w-2xl text-lg md:text-xl text-muted-foreground mb-10">
          Project Overlord is an AI-powered intent execution layer. Tell it what you
          want — it bridges, swaps, and lands liquidity from any EVM chain into
          Solana. No bridges to learn. No tokens to chase.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <Link
            to="/app?fake=1"
            className="group inline-flex items-center gap-2 rounded-full bg-gradient-hero px-7 py-3.5 font-semibold text-background shadow-glow hover:scale-[1.02] transition"
          >
            Try the demo
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition" />
          </Link>
          <a
            href="#how"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card/50 backdrop-blur px-7 py-3.5 font-medium hover:bg-card transition"
          >
            See how it works
          </a>
        </div>
        <PromptPreview />
      </div>
    </section>
  );
}

function PromptPreview() {
  return (
    <div className="mx-auto max-w-3xl relative animate-float">
      <div className="absolute -inset-1 bg-gradient-hero opacity-40 blur-2xl rounded-3xl" />
      <div className="relative rounded-3xl border border-border bg-gradient-card backdrop-blur-xl shadow-card p-2">
        <div className="rounded-2xl bg-background/60 p-6 text-left">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-2.5 w-2.5 rounded-full bg-magenta/70" />
            <div className="h-2.5 w-2.5 rounded-full bg-accent/70" />
            <div className="h-2.5 w-2.5 rounded-full bg-primary/70" />
            <span className="ml-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              overlord.intent
            </span>
          </div>
          <div className="font-mono text-sm space-y-3">
            <div className="flex gap-3">
              <span className="text-magenta">user&gt;</span>
              <span className="text-foreground">put $50 from my Base wallet into SOL</span>
            </div>
            <div className="flex gap-3">
              <span className="text-primary">overlord&gt;</span>
              <div className="text-muted-foreground">
                Found best route via{" "}
                <span className="text-cyan">LI.FI</span> · ETA{" "}
                <span className="text-foreground">~45s</span> · fees{" "}
                <span className="text-foreground">~$1.20</span>
                <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-primary/15 border border-primary/30 px-3 py-1 text-primary text-xs">
                  <ShieldCheck className="h-3 w-3" /> Confirm transaction
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LogoStrip() {
  const items = ["BASE", "ARBITRUM", "ETHEREUM", "OPTIMISM", "SOLANA", "LI.FI", "PHANTOM"];
  return (
    <section className="border-y border-border/50 bg-background/40 backdrop-blur">
      <div className="mx-auto max-w-7xl px-6 py-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-xs font-mono uppercase tracking-[0.3em] text-muted-foreground">
        <span className="text-foreground/40">Routes liquidity across</span>
        {items.map((i) => (
          <span key={i}>{i}</span>
        ))}
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      icon: MessageSquare,
      title: "Speak your intent",
      desc: "Plain English. No bridge picker, no token selector, no chain dropdown.",
    },
    {
      icon: Brain,
      title: "AI extracts the plan",
      desc: "An LLM parses source chain, asset, amount, and destination action.",
    },
    {
      icon: RouteIcon,
      title: "LI.FI finds the route",
      desc: "Cheapest path across bridges and aggregators is fetched in real time.",
    },
    {
      icon: Zap,
      title: "One signature, done",
      desc: "Approve, bridge, swap and land — orchestrated and tracked end-to-end.",
    },
  ];
  return (
    <section id="how" className="py-32">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeader
          eyebrow="How it works"
          title={<>From sentence to <span className="text-gradient">Solana</span> in seconds.</>}
          desc="Four steps, fully automated. The user only sees a chat and a single confirmation."
        />
        <div className="mt-16 grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {steps.map((s, i) => (
            <div
              key={s.title}
              className="group relative rounded-2xl border border-border bg-gradient-card backdrop-blur p-6 hover:border-primary/40 transition"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="h-11 w-11 rounded-xl bg-foreground/5 border border-border flex items-center justify-center group-hover:bg-primary/10 group-hover:border-primary/40 transition">
                  <s.icon className="h-5 w-5 text-primary" />
                </div>
                <span className="font-mono text-xs text-muted-foreground">
                  0{i + 1}
                </span>
              </div>
              <h3 className="font-semibold text-lg mb-2">{s.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ChatPreview() {
  return (
    <section className="py-32 relative overflow-hidden">
      <div className="absolute -right-40 top-1/2 -translate-y-1/2 h-[500px] w-[500px] bg-magenta/20 blur-3xl rounded-full" />
      <div className="mx-auto max-w-7xl px-6 grid lg:grid-cols-2 gap-16 items-center relative">
        <div>
          <span className="inline-block font-mono text-xs uppercase tracking-[0.3em] text-primary mb-4">
            // Chat-first UX
          </span>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight mb-6">
            No dashboards. <br />
            <span className="text-gradient">No DeFi PhD required.</span>
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed mb-8">
            We replaced the entire bridge-swap-onramp dance with a single
            conversation. The AI explains what it's doing, asks for one
            confirmation, then ships it.
          </p>
          <ul className="space-y-3">
            {[
              "Phantom-only — one wallet for EVM and Solana",
              "Real-time progress: approve → bridge → swap → land",
              "Direct funding into Drift, Jupiter, Tensor, Pump.fun",
            ].map((t) => (
              <li key={t} className="flex items-start gap-3">
                <div className="mt-1 h-5 w-5 rounded-full bg-primary/15 border border-primary/40 flex items-center justify-center shrink-0">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                </div>
                <span className="text-sm">{t}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="relative">
          <div className="absolute -inset-4 bg-gradient-hero opacity-30 blur-3xl rounded-[2rem]" />
          <div className="relative rounded-3xl border border-border bg-gradient-card backdrop-blur-xl shadow-card p-6 space-y-3">
            <ChatBubble role="user" text="Fund my Drift account with $100 from Base USDC" />
            <ChatBubble
              role="ai"
              text="Found a route via LI.FI: Base USDC → Solana USDC → Drift deposit. ETA 52s, fees $1.40."
            />
            <ChatBubble role="user" text="Go." />
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 font-mono text-xs space-y-2">
              <ProgressLine label="Approving USDC on Base" status="done" />
              <ProgressLine label="Bridging to Solana" status="done" />
              <ProgressLine label="Depositing to Drift" status="loading" />
              <ProgressLine label="Confirmation" status="idle" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ChatBubble({ role, text }: { role: "user" | "ai"; text: string }) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
          isUser
            ? "bg-foreground text-background rounded-br-sm"
            : "bg-muted/60 border border-border rounded-bl-sm"
        }`}
      >
        {!isUser && (
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-primary font-mono mb-1">
            <Sparkles className="h-2.5 w-2.5" /> overlord
          </div>
        )}
        {text}
      </div>
    </div>
  );
}

function ProgressLine({
  label,
  status,
}: {
  label: string;
  status: "done" | "loading" | "idle";
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`h-2 w-2 rounded-full ${
          status === "done"
            ? "bg-primary"
            : status === "loading"
            ? "bg-cyan animate-pulse-glow"
            : "bg-muted-foreground/30"
        }`}
      />
      <span className={status === "idle" ? "text-muted-foreground/50" : ""}>
        {label}
      </span>
      {status === "done" && <span className="ml-auto text-primary">✓</span>}
    </div>
  );
}

function Flows() {
  const flows = [
    {
      tag: "Flow A",
      title: "Basic bridge",
      prompt: "“Move $50 to Solana.”",
      desc: "Convert Base USDC into SOL and deliver to your Solana wallet.",
    },
    {
      tag: "Flow B",
      title: "Solana app funding",
      prompt: "“Fund my Drift account.”",
      desc: "Bridge, swap, and deposit directly into your Drift perp account.",
    },
    {
      tag: "Flow C",
      title: "Token purchase",
      prompt: "“Buy BONK with my Base USDC.”",
      desc: "Routes liquidity to Jupiter and lands you in BONK on Solana.",
    },
  ];
  return (
    <section id="flows" className="py-32 border-t border-border/50">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeader
          eyebrow="Supported flows"
          title={<>Three sentences. <span className="text-gradient">Endless utility.</span></>}
          desc="Start with these on day one. Add more by simply teaching the agent new actions."
        />
        <div className="mt-16 grid md:grid-cols-3 gap-5">
          {flows.map((f) => (
            <div
              key={f.tag}
              className="group rounded-2xl border border-border bg-gradient-card backdrop-blur p-6 hover:shadow-neon hover:border-primary/40 transition"
            >
              <div className="flex items-center justify-between mb-6">
                <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-primary">
                  {f.tag}
                </span>
                <Layers className="h-4 w-4 text-muted-foreground group-hover:text-primary transition" />
              </div>
              <p className="font-mono text-sm text-foreground/90 mb-4 leading-relaxed">
                {f.prompt}
              </p>
              <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Stack() {
  const groups = [
    {
      label: "Frontend",
      items: ["Next.js", "Tailwind", "shadcn/ui", "Phantom Wallet"],
    },
    {
      label: "AI layer",
      items: ["Vercel AI SDK", "Claude / OpenAI", "Intent parser"],
    },
    {
      label: "Cross-chain",
      items: ["LI.FI SDK", "LI.FI REST API", "Route optimizer"],
    },
    {
      label: "Solana",
      items: ["Anchor + Rust", "@solana/web3.js", "Intent registry program"],
    },
  ];
  return (
    <section id="stack" className="py-32">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeader
          eyebrow="Built on"
          title={<>A <span className="text-gradient">lean</span> stack, on purpose.</>}
          desc="Hackathons reward polish, not infrastructure. Every layer is best-in-class and battle-tested."
        />
        <div className="mt-16 grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {groups.map((g) => (
            <div
              key={g.label}
              className="rounded-2xl border border-border bg-gradient-card p-6"
            >
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-4">
                {g.label}
              </div>
              <ul className="space-y-2.5">
                {g.items.map((i) => (
                  <li key={i} className="text-sm flex items-center gap-2">
                    <span className="h-1 w-1 rounded-full bg-primary" />
                    {i}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="py-32">
      <div className="mx-auto max-w-5xl px-6">
        <div className="relative rounded-3xl overflow-hidden border border-border p-12 md:p-16 text-center bg-gradient-card backdrop-blur-xl">
          <div className="absolute inset-0 bg-gradient-hero opacity-20" />
          <div className="absolute inset-0 grid-bg opacity-50" />
          <div className="relative">
            <Wallet className="h-10 w-10 mx-auto mb-6 text-primary" />
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
              Skip the bridge tutorial.
            </h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
              Connect Phantom. Type one sentence. Land on Solana.
            </p>
            <Link
              to="/app"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-hero px-8 py-4 font-semibold text-background shadow-glow hover:scale-[1.02] transition"
            >
              Open Overlord <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function SectionHeader({
  eyebrow,
  title,
  desc,
}: {
  eyebrow: string;
  title: React.ReactNode;
  desc: string;
}) {
  return (
    <div className="max-w-3xl">
      <span className="inline-block font-mono text-xs uppercase tracking-[0.3em] text-primary mb-4">
        // {eyebrow}
      </span>
      <h2 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight mb-4">
        {title}
      </h2>
      <p className="text-muted-foreground text-lg">{desc}</p>
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border/50 py-10">
      <div className="mx-auto max-w-7xl px-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-md bg-gradient-hero" />
          <span className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Project Overlord · v0.1
          </span>
        </div>
        <div className="font-mono text-xs text-muted-foreground">
          AI · LI.FI · Solana — built for the hackathon.
        </div>
      </div>
    </footer>
  );
}
