import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Determine which build target to produce
const buildTarget = process.env.BUILD_TARGET || 'all';

function getConfig(target: string) {
  const baseConfig = {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "client", "src"),
        "@shared": path.resolve(import.meta.dirname, "shared"),
        "@assets": path.resolve(import.meta.dirname, "attached_assets"),
      },
    },
    base: './',
  };

  switch (target) {
    case 'sidebar':
      return {
        ...baseConfig,
        root: path.resolve(import.meta.dirname, "client"),
        build: {
          outDir: path.resolve(import.meta.dirname, "dist/sidebar"),
          emptyOutDir: true,
          rollupOptions: {
            input: path.resolve(import.meta.dirname, "client/sidebar.html"),
          },
        },
      };

    case 'editor':
      return {
        ...baseConfig,
        root: path.resolve(import.meta.dirname, "client"),
        build: {
          outDir: path.resolve(import.meta.dirname, "dist/editor"),
          emptyOutDir: true,
          rollupOptions: {
            input: path.resolve(import.meta.dirname, "client/editor.html"),
          },
        },
      };

    case 'webview':
    default:
      return {
        ...baseConfig,
        root: path.resolve(import.meta.dirname, "client"),
        build: {
          outDir: path.resolve(import.meta.dirname, "dist/webview"),
          emptyOutDir: true,
        },
      };
  }
}

export default defineConfig(getConfig(buildTarget));

