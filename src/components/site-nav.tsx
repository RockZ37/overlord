import { Link, useLocation } from "@tanstack/react-router";
import overlordLogo from "../../logo/overlord 1.jpeg";

export function SiteNav() {
  const { pathname } = useLocation();
  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/60 border-b border-border/40">
      <div className="mx-auto max-w-7xl flex items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2 group">
          <img src={overlordLogo} alt="Overlord" className="h-8 w-8 rounded-lg shadow-neon" />
          <div className="flex flex-col leading-none">
            <span className="font-bold text-lg tracking-tight">Overlord</span>
          </div>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
          <a href="/#how" className="hover:text-foreground transition">How it works</a>
          <a href="/#flows" className="hover:text-foreground transition">Flows</a>
          <a href="/#stack" className="hover:text-foreground transition">Stack</a>
        </nav>
        <Link
          to="/app"
          className={`group relative inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition ${
            pathname === "/app"
              ? "bg-primary text-primary-foreground shadow-neon"
              : "bg-foreground/5 text-foreground hover:bg-foreground/10 border border-border"
          }`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-glow" />
          Launch app
        </Link>
      </div>
    </header>
  );
}