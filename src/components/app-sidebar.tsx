import { Link, useRouterState } from "@tanstack/react-router";
import { Wrench, Factory, Users, History, LogOut, Shield, BarChart3 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { NotificationsBell } from "@/components/notifications-bell";

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { profile, isAdmin, signOut } = useAuth();

  const mainItems = [
    { to: "/", label: "Controle de Consertos", icon: Wrench, exact: true },
    { to: "/producao", label: "Controle de Produção", icon: Factory, exact: true },
  ];

  const adminItems = [
    { to: "/admin/relatorios-consertos", label: "Relatórios de Consertos", icon: BarChart3 },
    { to: "/admin/historico", label: "Histórico do Sistema", icon: History },
    { to: "/admin/usuarios", label: "Usuários", icon: Users },
  ];

  return (
    <aside className="hidden sm:flex flex-col w-[60px] lg:w-[230px] bg-card border-r border-border shrink-0">
      <div className="px-3 py-3 border-b border-border flex items-center gap-2">
        <div className="h-9 w-9 rounded-lg bg-primary text-primary-foreground grid place-items-center font-bold shrink-0">
          S
        </div>
        <div className="hidden lg:block min-w-0">
          <p className="text-sm font-bold leading-tight truncate">Sublimação</p>
          <p className="text-[11px] text-muted-foreground leading-tight">Painel interno</p>
        </div>
      </div>

      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {mainItems.map((it) => {
          const active = it.exact ? pathname === it.to : pathname.startsWith(it.to);
          return <NavLink key={it.to} {...it} active={active} />;
        })}

        {isAdmin && (
          <>
            <div className="pt-3 pb-1 px-2.5 hidden lg:flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
              <Shield className="h-3 w-3" /> Administração
            </div>
            <div className="lg:hidden border-t border-border my-2" />
            {adminItems.map((it) => {
              const active = pathname.startsWith(it.to);
              return <NavLink key={it.to} {...it} active={active} />;
            })}
          </>
        )}
      </nav>

      <div className="border-t border-border p-2 space-y-1">
        {isAdmin && (
          <div className="flex items-center gap-2 px-1 lg:px-2.5 py-1">
            <NotificationsBell />
            <span className="hidden lg:inline text-xs text-muted-foreground truncate">Notificações</span>
          </div>
        )}
        <div className="hidden lg:block px-2.5 py-1">
          <p className="text-xs font-medium truncate">{profile?.name || profile?.username || "—"}</p>
          <p className="text-[10px] text-muted-foreground truncate">
            {isAdmin ? "Administrador" : "Usuário Comum"}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-destructive hover:text-destructive h-9 px-2.5"
          onClick={() => signOut()}
          title="Sair"
        >
          <LogOut className="h-4 w-4 lg:mr-2" />
          <span className="hidden lg:inline">Sair</span>
        </Button>
      </div>
    </aside>
  );
}

function NavLink({
  to,
  label,
  icon: Icon,
  active,
}: {
  to: string;
  label: string;
  icon: any;
  active: boolean;
}) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-3 px-2.5 py-2 rounded-md text-sm transition-colors ${
        active
          ? "bg-primary text-primary-foreground"
          : "text-foreground hover:bg-muted"
      }`}
      title={label}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="hidden lg:inline truncate">{label}</span>
    </Link>
  );
}
