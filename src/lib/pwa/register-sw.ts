// Guarded service worker registration for Lovable.
// - Never registers in dev / Lovable preview / iframes.
// - Supports ?sw=off kill switch.
// - Auto-updates and reloads when a new SW takes control.

const SW_URL = "/sw.js";

function isPreviewHost(host: string): boolean {
  return (
    host.startsWith("id-preview--") ||
    host.startsWith("preview--") ||
    host === "lovableproject.com" ||
    host.endsWith(".lovableproject.com") ||
    host === "lovableproject-dev.com" ||
    host.endsWith(".lovableproject-dev.com") ||
    host === "beta.lovable.dev" ||
    host.endsWith(".beta.lovable.dev")
  );
}

async function unregisterMatching(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      regs
        .filter((r) => {
          const url = r.active?.scriptURL || r.waiting?.scriptURL || r.installing?.scriptURL || "";
          return url.endsWith(SW_URL);
        })
        .map((r) => r.unregister()),
    );
  } catch {
    /* noop */
  }
}

let deferredInstallPrompt: BeforeInstallPromptEvent | null = null;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function getInstallPrompt(): BeforeInstallPromptEvent | null {
  return deferredInstallPrompt;
}

/**
 * Trigger the native install prompt. Returns true if the user accepted.
 * Safe to call from a future "Instalar aplicativo" button.
 */
export async function promptInstall(): Promise<boolean> {
  if (!deferredInstallPrompt) return false;
  await deferredInstallPrompt.prompt();
  const choice = await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  return choice.outcome === "accepted";
}

export function canInstall(): boolean {
  return deferredInstallPrompt !== null;
}

export function registerPwa(): void {
  if (typeof window === "undefined") return;

  // Capture install prompt regardless of SW registration (Android/Chrome).
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredInstallPrompt = e as BeforeInstallPromptEvent;
    window.dispatchEvent(new CustomEvent("pwa:installable"));
  });
  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    window.dispatchEvent(new CustomEvent("pwa:installed"));
  });

  const url = new URL(window.location.href);
  const swOff = url.searchParams.get("sw") === "off";
  const inIframe = window.self !== window.top;
  const host = window.location.hostname;
  const isProd = import.meta.env.PROD;

  if (!isProd || inIframe || isPreviewHost(host) || swOff) {
    void unregisterMatching();
    return;
  }

  if (!("serviceWorker" in navigator)) return;

  // Dynamically import the vite-plugin-pwa virtual module only when we will
  // actually register, to keep dev bundles clean.
  import("virtual:pwa-register")
    .then(({ registerSW }) => {
      const updateSW = registerSW({
        immediate: true,
        onRegisteredSW(_swUrl, registration) {
          if (!registration) return;
          // Periodic update check (every 60 min).
          setInterval(() => {
            registration.update().catch(() => {});
          }, 60 * 60 * 1000);
        },
        onNeedRefresh() {
          // Apply update silently; on next navigation the user gets the new version.
          updateSW(true).catch(() => {});
        },
        onOfflineReady() {
          /* noop */
        },
      });

      // Reload once the new SW takes control so users always run the latest version.
      let reloading = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (reloading) return;
        reloading = true;
        window.location.reload();
      });
    })
    .catch(() => {
      /* noop */
    });
}
