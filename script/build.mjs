import * as esbuild from 'esbuild';
import { execSync } from 'child_process';

const watch = process.argv.includes('--watch');

// Build extension host (Node.js, CJS)
const extensionBuildOptions = {
  entryPoints: ['src/extension.ts'],
  bundle: true,
  outfile: 'dist/extension.js',
  external: ['vscode'],
  format: 'cjs',
  platform: 'node',
  target: 'node18',
  sourcemap: true,
  minify: !watch,
};

async function build() {
  // 1. Build the extension host
  if (watch) {
    const ctx = await esbuild.context(extensionBuildOptions);
    await ctx.watch();
    console.log('Watching extension host...');
  } else {
    await esbuild.build(extensionBuildOptions);
    console.log('Extension host built.');
  }

  // 2. Build all webview targets (Vite)
  if (!watch) {
    // Build the legacy full webview
    console.log('Building webview (legacy)...');
    execSync('npx vite build', {
      stdio: 'inherit',
      env: { ...process.env, BUILD_TARGET: 'webview' },
    });
    console.log('Webview built.');

    // Build the sidebar webview
    console.log('Building sidebar...');
    execSync('npx vite build', {
      stdio: 'inherit',
      env: { ...process.env, BUILD_TARGET: 'sidebar' },
    });
    console.log('Sidebar built.');

    // Build the editor webview
    console.log('Building editor...');
    execSync('npx vite build', {
      stdio: 'inherit',
      env: { ...process.env, BUILD_TARGET: 'editor' },
    });
    console.log('Editor built.');
  }
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
