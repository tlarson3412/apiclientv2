import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { StateManager } from './stateManager';

/**
 * Manages WebviewPanel instances for request editing.
 * Each request gets its own editor tab in VS Code's native tab system.
 */
export class EditorManager {
  private panels = new Map<string, vscode.WebviewPanel>();
  private panelIdCounter = 0;

  constructor(
    private readonly extensionPath: string,
    private readonly stateManager: StateManager,
    private readonly subscriptions: vscode.Disposable[],
  ) {}

  /**
   * Open or reveal a request editor panel.
   */
  openRequest(requestId: string, data?: any): void {
    // Check if panel already exists for this request
    if (this.panels.has(requestId)) {
      this.panels.get(requestId)!.reveal(vscode.ViewColumn.One);
      return;
    }

    const panelId = `editor-${++this.panelIdCounter}`;
    const title = data?.name || data?.method
      ? `${(data.method || 'GET').toUpperCase()} ${data.name || data.url || 'Untitled'}`
      : 'New Request';

    const panel = vscode.window.createWebviewPanel(
      'usbxRequestEditor',
      title,
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.file(path.join(this.extensionPath, 'dist', 'editor')),
          vscode.Uri.file(path.join(this.extensionPath, 'dist', 'webview')),
        ],
      },
    );

    // Set HTTP method icon color in tab
    this.updatePanelIcon(panel, data?.method || 'GET');

    panel.webview.html = this.getEditorContent(panel.webview, requestId, data);

    // Register with state manager
    this.stateManager.registerWebview(panelId, panel.webview, 'editor', requestId);
    this.panels.set(requestId, panel);

    // Handle messages from the editor webview
    panel.webview.onDidReceiveMessage(
      async (message) => {
        if (!message.type || !message.requestId) return;

        try {
          const result = await this.stateManager.handleMessage(message, panelId);

          // If request was updated, update the panel title
          if (message.type === 'requests:update' && message.data) {
            const updates = message.data as any;
            if (updates.name || updates.method) {
              const method = updates.method || data?.method || 'GET';
              const name = updates.name || data?.name || 'Untitled';
              panel.title = `${method.toUpperCase()} ${name}`;
              this.updatePanelIcon(panel, method);
            }
          }

          panel.webview.postMessage({
            type: 'response',
            requestId: message.requestId,
            success: true,
            data: result,
          });
        } catch (err: any) {
          panel.webview.postMessage({
            type: 'response',
            requestId: message.requestId,
            success: false,
            error: err.message || 'Unknown error',
          });
        }
      },
      undefined,
      this.subscriptions,
    );

    panel.onDidDispose(
      () => {
        this.stateManager.unregisterWebview(panelId);
        this.panels.delete(requestId);
      },
      null,
      this.subscriptions,
    );
  }

  /**
   * Open a collection view panel.
   */
  openCollection(collectionId: string, data?: any): void {
    const key = `collection-${collectionId}`;
    if (this.panels.has(key)) {
      this.panels.get(key)!.reveal(vscode.ViewColumn.One);
      return;
    }

    const panelId = `editor-${++this.panelIdCounter}`;
    const title = data?.name || 'Collection';

    const panel = vscode.window.createWebviewPanel(
      'usbxCollectionEditor',
      title,
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.file(path.join(this.extensionPath, 'dist', 'editor')),
          vscode.Uri.file(path.join(this.extensionPath, 'dist', 'webview')),
        ],
      },
    );

    panel.webview.html = this.getEditorContent(panel.webview, undefined, {
      ...data,
      viewType: 'collection',
      collectionId,
    });

    this.stateManager.registerWebview(panelId, panel.webview, 'editor');
    this.panels.set(key, panel);

    panel.webview.onDidReceiveMessage(
      async (message) => {
        if (!message.type || !message.requestId) return;
        try {
          const result = await this.stateManager.handleMessage(message, panelId);
          panel.webview.postMessage({
            type: 'response',
            requestId: message.requestId,
            success: true,
            data: result,
          });
        } catch (err: any) {
          panel.webview.postMessage({
            type: 'response',
            requestId: message.requestId,
            success: false,
            error: err.message || 'Unknown error',
          });
        }
      },
      undefined,
      this.subscriptions,
    );

    panel.onDidDispose(() => {
      this.stateManager.unregisterWebview(panelId);
      this.panels.delete(key);
    }, null, this.subscriptions);
  }

  /**
   * Open a folder view panel.
   */
  openFolder(collectionId: string, folderId: string, data?: any): void {
    const key = `folder-${folderId}`;
    if (this.panels.has(key)) {
      this.panels.get(key)!.reveal(vscode.ViewColumn.One);
      return;
    }

    const panelId = `editor-${++this.panelIdCounter}`;
    const title = data?.name || 'Folder';

    const panel = vscode.window.createWebviewPanel(
      'usbxFolderEditor',
      title,
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.file(path.join(this.extensionPath, 'dist', 'editor')),
          vscode.Uri.file(path.join(this.extensionPath, 'dist', 'webview')),
        ],
      },
    );

    panel.webview.html = this.getEditorContent(panel.webview, undefined, {
      ...data,
      viewType: 'folder',
      collectionId,
      folderId,
    });

    this.stateManager.registerWebview(panelId, panel.webview, 'editor');
    this.panels.set(key, panel);

    panel.webview.onDidReceiveMessage(
      async (message) => {
        if (!message.type || !message.requestId) return;
        try {
          const result = await this.stateManager.handleMessage(message, panelId);
          panel.webview.postMessage({
            type: 'response',
            requestId: message.requestId,
            success: true,
            data: result,
          });
        } catch (err: any) {
          panel.webview.postMessage({
            type: 'response',
            requestId: message.requestId,
            success: false,
            error: err.message || 'Unknown error',
          });
        }
      },
      undefined,
      this.subscriptions,
    );

    panel.onDidDispose(() => {
      this.stateManager.unregisterWebview(panelId);
      this.panels.delete(key);
    }, null, this.subscriptions);
  }

  /**
   * Open the settings panel as a VS Code editor tab.
   */
  openSettings(): void {
    const key = '__settings__';
    if (this.panels.has(key)) {
      this.panels.get(key)!.reveal(vscode.ViewColumn.One);
      return;
    }

    const panelId = `editor-${++this.panelIdCounter}`;

    const panel = vscode.window.createWebviewPanel(
      'usbxSettings',
      'USBX Settings',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.file(path.join(this.extensionPath, 'dist', 'editor')),
          vscode.Uri.file(path.join(this.extensionPath, 'dist', 'webview')),
        ],
      },
    );

    panel.iconPath = new vscode.ThemeIcon('settings-gear');

    panel.webview.html = this.getEditorContent(panel.webview, undefined, {
      viewType: 'settings',
    });

    this.stateManager.registerWebview(panelId, panel.webview, 'editor');
    this.panels.set(key, panel);

    panel.webview.onDidReceiveMessage(
      async (message) => {
        if (!message.type || !message.requestId) return;
        try {
          const result = await this.stateManager.handleMessage(message, panelId);
          panel.webview.postMessage({
            type: 'response',
            requestId: message.requestId,
            success: true,
            data: result,
          });
        } catch (err: any) {
          panel.webview.postMessage({
            type: 'response',
            requestId: message.requestId,
            success: false,
            error: err.message || 'Unknown error',
          });
        }
      },
      undefined,
      this.subscriptions,
    );

    panel.onDidDispose(() => {
      this.stateManager.unregisterWebview(panelId);
      this.panels.delete(key);
    }, null, this.subscriptions);
  }

  private updatePanelIcon(panel: vscode.WebviewPanel, method: string): void {
    // VS Code panel icons must be ThemeIcon or Uri
    // We use codicons for a native look
    const iconMap: Record<string, string> = {
      GET: 'arrow-down',
      POST: 'arrow-up',
      PUT: 'arrow-swap',
      PATCH: 'edit',
      DELETE: 'trash',
      HEAD: 'eye',
      OPTIONS: 'settings-gear',
    };
    const iconName = iconMap[method.toUpperCase()] || 'globe';
    panel.iconPath = new vscode.ThemeIcon(iconName);
  }

  private getEditorContent(webview: vscode.Webview, requestId?: string, initData?: any): string {
    const webviewPath = path.join(this.extensionPath, 'dist', 'editor');
    const indexPath = path.join(webviewPath, 'editor.html');

    if (!fs.existsSync(indexPath)) {
      // Fall back to main webview build
      return this.getFallbackContent(webview, requestId, initData);
    }

    let html = fs.readFileSync(indexPath, 'utf-8');
    const webviewUri = webview.asWebviewUri(vscode.Uri.file(webviewPath));

    html = html.replace(/(href|src)="\/([^"]*?)"/g, (_, attr, filePath) => {
      return `${attr}="${webviewUri}/${filePath}"`;
    });
    html = html.replace(/(href|src)="\.\/([^"]*?)"/g, (_, attr, filePath) => {
      return `${attr}="${webviewUri}/${filePath}"`;
    });

    const csp = [
      `default-src 'none'`,
      `style-src ${webview.cspSource} 'unsafe-inline' https://fonts.googleapis.com`,
      `script-src ${webview.cspSource} 'unsafe-inline'`,
      `font-src ${webview.cspSource} https://fonts.gstatic.com`,
      `img-src ${webview.cspSource} data: https:`,
      `connect-src ${webview.cspSource}`,
    ].join('; ');

    const initScript = `
      const vscode = acquireVsCodeApi();
      window.__vscode = vscode;
      window.__webviewType = 'editor';
      window.__initData = ${JSON.stringify(initData || {})};
      window.__requestId = ${JSON.stringify(requestId || null)};
    `;

    html = html.replace(
      '<head>',
      `<head>
    <meta http-equiv="Content-Security-Policy" content="${csp}">
    <script>${initScript}</script>`,
    );

    return html;
  }

  private getFallbackContent(webview: vscode.Webview, requestId?: string, initData?: any): string {
    // Use the main webview build as a fallback for the editor
    const mainWebviewPath = path.join(this.extensionPath, 'dist', 'webview');
    const indexPath = path.join(mainWebviewPath, 'index.html');

    if (!fs.existsSync(indexPath)) {
      return `<!DOCTYPE html><html><body>
        <h2>USBX API Client</h2>
        <p>Editor assets not found. Run <code>npm run build</code> first.</p>
      </body></html>`;
    }

    let html = fs.readFileSync(indexPath, 'utf-8');
    const webviewUri = webview.asWebviewUri(vscode.Uri.file(mainWebviewPath));

    html = html.replace(/(href|src)="\/([^"]*?)"/g, (_, attr, filePath) => {
      return `${attr}="${webviewUri}/${filePath}"`;
    });
    html = html.replace(/(href|src)="\.\/([^"]*?)"/g, (_, attr, filePath) => {
      return `${attr}="${webviewUri}/${filePath}"`;
    });

    const csp = [
      `default-src 'none'`,
      `style-src ${webview.cspSource} 'unsafe-inline' https://fonts.googleapis.com`,
      `script-src ${webview.cspSource} 'unsafe-inline'`,
      `font-src ${webview.cspSource} https://fonts.gstatic.com`,
      `img-src ${webview.cspSource} data: https:`,
      `connect-src ${webview.cspSource}`,
    ].join('; ');

    const initScript = `
      const vscode = acquireVsCodeApi();
      window.__vscode = vscode;
      window.__webviewType = 'editor';
      window.__initData = ${JSON.stringify(initData || {})};
      window.__requestId = ${JSON.stringify(requestId || null)};
    `;

    html = html.replace(
      '<head>',
      `<head>
    <meta http-equiv="Content-Security-Policy" content="${csp}">
    <script>${initScript}</script>`,
    );

    return html;
  }

  disposeAll(): void {
    this.panels.forEach(panel => {
      panel.dispose();
    });
    this.panels.clear();
  }
}
