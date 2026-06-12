import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, LogOut, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth-context";
import { NotificationsBell } from "@/components/notifications-bell";
import { MAIN_NAV_ITEMS, ADMIN_NAV_ITEMS } from "@/components/app-sidebar";

export function MobileHeader() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { profile, isAdmin, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  // Auto-close on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header className="md:hidden sticky top-0 z-40 h-12 bg-card border-b border-border flex items-center justify-between px-2 gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-11 w-11" aria-label="Menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[82%] max-w-[300px] p-0 flex flex-col">
            <SheetHeader className="px-4 py-3 border-b border-border">
              <SheetTitle className="flex items-center gap-2 text-left">
                <div className="h-9 w-9 rounded-lg bg-primary text-primary-foreground grid place-items-center font-bold">
                  S
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold leading-tight truncate">Sublimação</p>
                  <p className="text-[11px] text-muted-foreground leading-tight font-normal">Painel interno</p>
                </div>
              </SheetTitle>
            </SheetHeader>

            <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
              {MAIN_NAV_ITEMS.map((it) => {
                const active = it.exact ? pathname === it.to : pathname.startsWith(it.to);
                return <MobileNavLink key={it.to} {...it} active={active} onClick={() => setOpen(false)} />;
              })}

              {isAdmin && (
                <>
                  <div className="pt-4 pb-1 px-2.5 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <Shield className="h-3 w-3" /> Administração
                  </div>
                  {ADMIN_NAV_ITEMS.map((it) => {
                    const active = pathname.startsWith(it.to);
                    return <MobileNavLink key={it.to} {...it} active={active} onClick={() => setOpen(false)} />;
                  })}
                </>
              )}
            </nav>

            <div className="border-t border-border p-3 space-y-2">
              <div className="px-1">
                <p className="text-sm font-medium truncate">{profile?.name || profile?.username || "—"}</p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {isAdmin ? "Administrador" : "Usuário Comum"}
                </p>
              </div>
              {isAdmin && (
                <div className="flex items-center gap-2 px-1 py-1">
                  <NotificationsBell />
                  <span className="text-xs text-muted-foreground">Notificações</span>
                </div>
              )}
              <Button
                variant="ghost"
                className="w-full justify-start text-destructive hover:text-destructive min-h-[44px]"
                onClick={() => {
                  setOpen(false);
                  signOut();
                }}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        <p className="text-sm font-semibold truncate">Sublimação</p>
      </div>

      {isAdmin && (
        <div className="shrink-0">
          <NotificationsBell />
        </div>
      )}
    </header>
  );
}

function MobileNavLink({
  to,
  label,
  icon: Icon,
  active,
  onClick,
}: {
  to: string;
  label: string;
  icon: any;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center gap-3 px-3 min-h-[44px] rounded-md text-sm transition-colors ${
        active ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted active:bg-muted"
      }`}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span className="truncate">{label}</span>
    </Link>
  );
}
