import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { session, loading, profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !session) {
      navigate({ to: "/auth", replace: true });
    }
  }, [loading, session, navigate]);

  if (loading || !session) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (profile && !profile.active) {
    return (
      <div className="min-h-screen grid place-items-center p-6 text-center">
        <div>
          <h2 className="text-lg font-semibold">Conta desativada</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Contate um administrador.
          </p>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
