import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { StateManager } from './stateManager';

/**
 * WebviewViewProvider for the USBX API Client sidebar.
 * Renders the sidebar React app (Collections, Environments, History, Templates)
 * inside VS Code's native sidebar panel.
 */
export class SidebarProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'usbx-api-client.sidebar';

  private view?: vscode.WebviewView;
  private webviewId = 'sidebar-main';

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly extensionPath: string,
    private readonly stateManager: StateManager,
    private readonly onOpenRequest: (requestId: string, data?: any) => void,
    private readonly onOpenCollection: (collectionId: string, data?: any) => void,
    private readonly onOpenFolder: (collectionId: string, folderId: string, data?: any) => void,
    private readonly onOpenSettings: () => void,
  ) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): void {
    this.view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.file(path.join(this.extensionPath, 'dist', 'sidebar')),
        vscode.Uri.file(path.join(this.extensionPath, 'dist', 'webview')),
      ],
    };

    webviewView.webview.html = this.getWebviewContent(webviewView.webview);

    // Register with state manager
    this.stateManager.registerWebview(this.webviewId, webviewView.webview, 'sidebar');

    // Handle messages from the sidebar webview
    webviewView.webview.onDidReceiveMessage(async (message) => {
      if (!message.type || !message.requestId) return;

      try {
        const result = await this.stateManager.handleMessage(message, this.webviewId);

        // Handle UI actions that need extension-level coordination
        if (result && typeof result === 'object' && 'action' in result) {
          const action = result as any;
          switch (action.action) {
            case 'openRequest':
              this.onOpenRequest(action.requestId, action.data);
              break;
            case 'openCollection':
              this.onOpenCollection(action.collectionId, action.data);
              break;
            case 'openFolder':
              this.onOpenFolder(action.collectionId, action.folderId, action.data);
              break;
            case 'openSettings':
              this.onOpenSettings();
              break;
          }
          // Still send success response back to sidebar
          webviewView.webview.postMessage({
            type: 'response',
            requestId: message.requestId,
            success: true,
            data: result,
          });
          return;
        }

        webviewView.webview.postMessage({
          type: 'response',
          requestId: message.requestId,
          success: true,
          data: result,
        });
      } catch (err: any) {
        webviewView.webview.postMessage({
          type: 'response',
          requestId: message.requestId,
          success: false,
          error: err.message || 'Unknown error',
        });
      }
    });

    webviewView.onDidDispose(() => {
      this.stateManager.unregisterWebview(this.webviewId);
      this.view = undefined;
    });
  }

  private getWebviewContent(webview: vscode.Webview): string {
    const webviewPath = path.join(this.extensionPath, 'dist', 'sidebar');
    const indexPath = path.join(webviewPath, 'sidebar.html');

    if (!fs.existsSync(indexPath)) {
      // Fallback: use main webview build if sidebar build doesn't exist yet
      return this.getFallbackContent(webview);
    }

    let html = fs.readFileSync(indexPath, 'utf-8');
    const webviewUri = webview.asWebviewUri(vscode.Uri.file(webviewPath));

    // Rewrite asset paths
    html = html.replace(/(href|src)="\/([^"]*?)"/g, (_, attr, filePath) => {
      return `${attr}="${webviewUri}/${filePath}"`;
    });
    html = html.replace(/(href|src)="\.\/([^"]*?)"/g, (_, attr, filePath) => {
      return `${attr}="${webviewUri}/${filePath}"`;
    });

    // Inject CSP and VS Code API
    const csp = [
      `default-src 'none'`,
      `style-src ${webview.cspSource} 'unsafe-inline' https://fonts.googleapis.com`,
      `script-src ${webview.cspSource} 'unsafe-inline'`,
      `font-src ${webview.cspSource} https://fonts.gstatic.com`,
      `img-src ${webview.cspSource} data: https:`,
      `connect-src ${webview.cspSource}`,
    ].join('; ');

    html = html.replace(
      '<head>',
      `<head>
    <meta http-equiv="Content-Security-Policy" content="${csp}">
    <script>
      const vscode = acquireVsCodeApi();
      window.__vscode = vscode;
      window.__webviewType = 'sidebar';
    </script>`,
    );

    return html;
  }

  private getFallbackContent(webview: vscode.Webview): string {
    const csp = [
      `default-src 'none'`,
      `style-src 'unsafe-inline'`,
      `script-src 'unsafe-inline'`,
    ].join('; ');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="${csp}">
  <style>
    body {
      padding: 12px;
      font-family: var(--vscode-font-family);
      color: var(--vscode-foreground);
      background: var(--vscode-sideBar-background);
    }
    .loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 200px;
      gap: 12px;
    }
    .spinner {
      width: 24px;
      height: 24px;
      border: 2px solid var(--vscode-foreground);
      border-top-color: transparent;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    p { margin: 4px 0; font-size: 12px; opacity: 0.7; }
  </style>
</head>
<body>
  <div class="loading">
    <div class="spinner"></div>
    <p>Building sidebar...</p>
    <p>Run <code>npm run build</code> first.</p>
  </div>
</body>
</html>`;
  }
}
