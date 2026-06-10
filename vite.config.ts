import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Removido o server entry customizado — deixa o Nitro/Vercel gerenciar
  },
  vite: {
    // @ts-ignore
    nitro: {
      preset: "vercel",
    },
  },
});
