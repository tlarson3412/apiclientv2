import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { LocalStorageService } from './localStorageService';
import { executeProxy } from './proxyHandler';
import type { WebviewToExtensionMessage } from './messageProtocol';

let panel: vscode.WebviewPanel | undefined;

export function activate(context: vscode.ExtensionContext) {
  const storagePath = context.globalStorageUri.fsPath;
  const storageService = new LocalStorageService(storagePath);

  const openCommand = vscode.commands.registerCommand('usbx-api-client.open', () => {
    if (panel) {
      panel.reveal(vscode.ViewColumn.One);
      return;
    }

    panel = vscode.window.createWebviewPanel(
      'usbxApiClient',
      'USBX API Client',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.file(path.join(context.extensionPath, 'dist', 'webview')),
        ],
      }
    );

    panel.webview.html = getWebviewContent(panel.webview, context.extensionPath);

    panel.webview.onDidReceiveMessage(
      async (message: WebviewToExtensionMessage) => {
        console.log('[ExtHost] Received message:', message.type, 'requestId:', message.requestId);
        try {
          const result = await handleMessage(message, storageService);
          console.log('[ExtHost] Message handled successfully:', message.type);
          panel?.webview.postMessage({
            type: 'response',
            requestId: message.requestId,
            success: true,
            data: result,
          });
        } catch (err: any) {
          console.error('[ExtHost] Message handling FAILED:', message.type, err.message);
          panel?.webview.postMessage({
            type: 'response',
            requestId: message.requestId,
            success: false,
            error: err.message || 'Unknown error',
          });
        }
      },
      undefined,
      context.subscriptions
    );

    panel.onDidDispose(() => {
      panel = undefined;
    }, null, context.subscriptions);
  });

  context.subscriptions.push(openCommand);
}

export function deactivate() {
  if (panel) {
    panel.dispose();
  }
}

async function handleMessage(
  message: WebviewToExtensionMessage,
  storage: LocalStorageService
): Promise<unknown> {
  switch (message.type) {
    // Collections
    case 'collections:list':
      return await storage.listCollections();

    case 'collections:create':
      return await storage.createCollection(message.data);

    case 'collections:update':
      return await storage.updateCollection(message.collectionId, message.data);

    case 'collections:delete':
      return await storage.deleteCollection(message.collectionId);

    // Folders
    case 'folders:create':
      return await storage.createFolder(message.collectionId, message.data);

    case 'folders:update':
      return await storage.updateFolder(message.folderId, message.data);

    case 'folders:delete':
      return await storage.deleteFolder(message.folderId);

    // Requests
    case 'requests:create':
      return await storage.createRequest(message.collectionId, message.data);

    case 'requests:update':
      return await storage.updateRequest(message.reqId, message.data);

    case 'requests:delete':
      return await storage.deleteRequest(message.reqId);

    // Import / Copy
    case 'collections:import':
      return await storage.importCollections(message.data.collections);

    case 'collections:copy':
      return await storage.copyCollection(message.data.collectionId, message.data.name);

    // HTTP Proxy
    case 'proxy:execute':
      return await executeProxy(message.data);

    // File dialogs
    case 'dialog:open': {
      const filters: Record<string, string[]> = message.data.filters || { 'All Files': ['*'] };
      const encoding = message.data.encoding || 'utf-8';
      const uris = await vscode.window.showOpenDialog({
        canSelectMany: false,
        filters,
      });
      if (uris && uris.length > 0) {
        const content = await vscode.workspace.fs.readFile(uris[0]);
        return {
          path: uris[0].fsPath,
          content: Buffer.from(content).toString(encoding as BufferEncoding),
        };
      }
      return null;
    }

    case 'dialog:save': {
      const saveFilters: Record<string, string[]> = message.data.filters || { 'All Files': ['*'] };
      const uri = await vscode.window.showSaveDialog({
        filters: saveFilters,
        defaultUri: message.data.defaultName
          ? vscode.Uri.file(message.data.defaultName)
          : undefined,
      });
      if (uri && message.data.content) {
        await vscode.workspace.fs.writeFile(uri, Buffer.from(message.data.content, 'utf-8'));
        return { path: uri.fsPath };
      }
      return null;
    }

    default:
      throw new Error(`Unknown message type: ${(message as any).type}`);
  }
}

function getWebviewContent(webview: vscode.Webview, extensionPath: string): string {
  const webviewPath = path.join(extensionPath, 'dist', 'webview');
  const indexPath = path.join(webviewPath, 'index.html');

  // In development, we may not have a built webview yet
  if (!fs.existsSync(indexPath)) {
    return `<!DOCTYPE html>
<html>
<body>
  <h2>USBX API Client</h2>
  <p>Webview assets not found. Run the build first.</p>
</body>
</html>`;
  }

  let html = fs.readFileSync(indexPath, 'utf-8');

  // Rewrite asset paths to use webview URIs
  const webviewUri = webview.asWebviewUri(vscode.Uri.file(webviewPath));

  // Replace relative paths with webview URIs
  html = html.replace(/(href|src)="\/([^"]*?)"/g, (_, attr, filePath) => {
    return `${attr}="${webviewUri}/${filePath}"`;
  });

  // Replace relative paths starting with ./
  html = html.replace(/(href|src)="\.\/([^"]*?)"/g, (_, attr, filePath) => {
    return `${attr}="${webviewUri}/${filePath}"`;
  });

  // Add CSP meta tag and vscode API script
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
    </script>`
  );

  return html;
}
