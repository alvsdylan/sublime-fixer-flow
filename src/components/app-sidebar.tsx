import { Link, useRouterState } from "@tanstack/react-router";
import { Wrench, Factory } from "lucide-react";

const items = [
  { to: "/", label: "Controle de Consertos", icon: Wrench },
  { to: "/producao", label: "Controle de Produção", icon: Factory },
];

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside className="hidden sm:flex flex-col w-[60px] lg:w-[220px] bg-card border-r border-border shrink-0">
      <div className="px-3 py-3 border-b border-border flex items-center gap-2">
        <div className="h-9 w-9 rounded-lg bg-primary text-primary-foreground grid place-items-center font-bold shrink-0">
          S
        </div>
        <div className="hidden lg:block">
          <p className="text-sm font-bold leading-tight">Sublimação</p>
          <p className="text-[11px] text-muted-foreground leading-tight">Painel interno</p>
        </div>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {items.map((it) => {
          const active = pathname === it.to;
          const Icon = it.icon;
          return (
            <Link
              key={it.to}
              to={it.to}
              className={`flex items-center gap-3 px-2.5 py-2 rounded-md text-sm transition-colors ${
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-muted"
              }`}
              title={it.label}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="hidden lg:inline truncate">{it.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
