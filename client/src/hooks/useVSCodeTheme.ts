import { useEffect } from 'react';

/**
 * Converts a CSS color string (hex, rgb, rgba) to "H S% L%" for use in
 * Tailwind's hsl() wrapper pattern.  Returns null if parsing fails.
 */
function colorToHSL(color: string): string | null {
  if (!color) return null;

  let r: number, g: number, b: number;

  // #rrggbb or #rgb
  const hexMatch = color.match(/^#([0-9a-f]{3,8})$/i);
  if (hexMatch) {
    let hex = hexMatch[1];
    if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
    r = parseInt(hex.slice(0, 2), 16) / 255;
    g = parseInt(hex.slice(2, 4), 16) / 255;
    b = parseInt(hex.slice(4, 6), 16) / 255;
  } else {
    // rgb(r, g, b) or rgba(r, g, b, a)
    const rgbMatch = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (!rgbMatch) return null;
    r = parseInt(rgbMatch[1]) / 255;
    g = parseInt(rgbMatch[2]) / 255;
    b = parseInt(rgbMatch[3]) / 255;
  }

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/**
 * VS Code variable → app CSS variable mapping.
 * Each entry maps a --vscode-* var to the app's --vsc-* bridge variable.
 */
const VSCODE_VAR_MAP: Record<string, string> = {
  '--vscode-editor-background':         '--vsc-background',
  '--vscode-foreground':                 '--vsc-foreground',
  '--vscode-sideBar-background':         '--vsc-sidebar-bg',
  '--vscode-sideBar-foreground':         '--vsc-sidebar-fg',
  '--vscode-sideBar-border':             '--vsc-sidebar-border',
  '--vscode-input-background':           '--vsc-input',
  '--vscode-panel-border':               '--vsc-border',
  '--vscode-editorWidget-background':    '--vsc-widget-bg',
  '--vscode-focusBorder':                '--vsc-ring',
  '--vscode-button-background':          '--vsc-primary',
  '--vscode-descriptionForeground':      '--vsc-description-fg',
  '--vscode-disabledForeground':         '--vsc-disabled-fg',
  '--vscode-list-hoverBackground':       '--vsc-hover-bg',
  '--vscode-list-activeSelectionBackground': '--vsc-selection-bg',
  '--vscode-errorForeground':            '--vsc-error-fg',
  '--vscode-textBlockQuote-background':  '--vsc-muted-bg',
  '--vscode-tab-activeBackground':       '--vsc-tab-active-bg',
};

/**
 * Reads VS Code's injected --vscode-* CSS variables, converts them to HSL,
 * and sets --vsc-* bridge variables on :root so the .dark CSS block can
 * reference them with var(--vsc-*, fallback).
 */
function bridgeVSCodeVariables() {
  const style = getComputedStyle(document.body);
  const root = document.documentElement;

  for (const [vscodeVar, bridgeVar] of Object.entries(VSCODE_VAR_MAP)) {
    const raw = style.getPropertyValue(vscodeVar).trim();
    if (raw) {
      const hsl = colorToHSL(raw);
      if (hsl) {
        root.style.setProperty(bridgeVar, hsl);
      }
    }
  }
}

/**
 * Detects VS Code's current theme (light/dark/high-contrast) and applies
 * the appropriate 'dark' class on <html> so Tailwind dark mode works.
 * Also bridges VS Code's --vscode-* CSS variables into --vsc-* HSL variables
 * so the app's dark mode inherits the user's actual VS Code theme colors.
 */
export function useVSCodeTheme() {
  useEffect(() => {
    function applyTheme() {
      const themeKind = document.body.dataset.vscodeThemeKind;
      if (!themeKind) return;

      const isDark = themeKind === 'vscode-dark' || themeKind === 'vscode-high-contrast';

      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }

      // Bridge VS Code CSS variables to app variables
      bridgeVSCodeVariables();
    }

    // Apply immediately
    applyTheme();

    // Watch for VS Code theme changes (body attribute mutation)
    const observer = new MutationObserver(() => {
      applyTheme();
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['data-vscode-theme-kind'],
    });

    // Also watch for VS Code style injection changes (theme color updates)
    const styleObserver = new MutationObserver(() => {
      bridgeVSCodeVariables();
    });
    styleObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ['style'],
    });

    return () => {
      observer.disconnect();
      styleObserver.disconnect();
    };
  }, []);
}
