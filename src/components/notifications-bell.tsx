import { useEffect, useState, useRef, useCallback } from "react";
import { Bell, Check, CheckCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

interface Notification {
  id: string;
  card_id: string | null;
  client_name: string;
  order_number: string;
  attendant_name: string | null;
  read_at: string | null;
  created_at: string;
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function NotificationsBell() {
  const { isAdmin, user } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const permissionAsked = useRef(false);

  const unread = items.filter((n) => !n.read_at).length;

  const load = useCallback(async () => {
    if (!isAdmin || !user) return;
    const { data } = await supabase
      .from("notifications")
      .select("id,card_id,client_name,order_number,attendant_name,read_at,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);
    setItems((data ?? []) as Notification[]);
  }, [isAdmin, user]);

  useEffect(() => {
    load();
  }, [load]);

  // Ask permission once for admins
  useEffect(() => {
    if (!isAdmin) return;
    if (permissionAsked.current) return;
    permissionAsked.current = true;
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission().catch(() => {});
      }
    }
  }, [isAdmin]);

  // Realtime
  useEffect(() => {
    if (!isAdmin || !user) return;
    const ch = supabase
      .channel(`notifications_rt_${user.id}_${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const n = payload.new as Notification;
          setItems((prev) => [n, ...prev]);

          // Toast
          toast.info("🔔 Novo Conserto Registrado", {
            description: `${n.client_name} • Pedido ${n.order_number}`,
          });

          // Browser notification
          if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
            try {
              const notif = new Notification("🔔 Novo Conserto Registrado", {
                body: `Cliente: ${n.client_name}\nPedido: ${n.order_number}\nConferente: ${n.attendant_name ?? "—"}\n${formatDateTime(n.created_at)}`,
                tag: n.id,
              });
              notif.onclick = () => {
                window.focus();
                notif.close();
              };
            } catch {}
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [isAdmin, user]);

  async function markRead(id: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)));
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
  }

  async function markAll() {
    const ids = items.filter((n) => !n.read_at).map((n) => n.id);
    if (!ids.length) return;
    setItems((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: new Date().toISOString() })));
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).in("id", ids);
  }

  async function removeOne(id: string) {
    setItems((prev) => prev.filter((n) => n.id !== id));
    await supabase.from("notifications").delete().eq("id", id);
  }

  if (!isAdmin) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9" title="Notificações">
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold grid place-items-center">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] p-0">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <div>
            <p className="text-sm font-semibold">Notificações</p>
            <p className="text-[11px] text-muted-foreground">
              {unread} não lida{unread === 1 ? "" : "s"}
            </p>
          </div>
          {unread > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={markAll}>
              <CheckCheck className="h-3 w-3 mr-1" /> Marcar todas
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-[400px]">
          {items.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Sem notificações.</div>
          ) : (
            <ul className="divide-y">
              {items.map((n) => (
                <li
                  key={n.id}
                  className={`p-3 text-sm ${n.read_at ? "opacity-70" : "bg-muted/30"}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium leading-tight">🔔 Novo Conserto Registrado</p>
                      <p className="text-xs mt-1"><span className="text-muted-foreground">Cliente:</span> {n.client_name}</p>
                      <p className="text-xs"><span className="text-muted-foreground">Pedido:</span> {n.order_number}</p>
                      <p className="text-xs"><span className="text-muted-foreground">Conferente:</span> {n.attendant_name ?? "—"}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">{formatDateTime(n.created_at)}</p>
                    </div>
                    <div className="flex flex-col gap-1">
                      {!n.read_at && (
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => markRead(n.id)} title="Marcar como lida">
                          <Check className="h-3 w-3" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeOne(n.id)} title="Remover">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
