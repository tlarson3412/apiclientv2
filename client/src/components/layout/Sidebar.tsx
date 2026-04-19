import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { CollectionsPanel } from '@/components/collections/CollectionsPanel';
import { EnvironmentsPanel } from '@/components/environments/EnvironmentsPanel';
import { HistoryPanel } from '@/components/history/HistoryPanel';
import { TemplatesPanel } from '@/components/templates/TemplatesPanel';
import { CreateNewModal } from './CreateNewModal';
import { Plus, FileUp } from 'lucide-react';
import { vscodeClient } from '@/lib/vscodeApi';
import { importPostmanCollection, importUSBCollection } from '@/utils/importExport';
import { parseOpenApiSpec } from '@/utils/openApiImport';

interface SidebarProps {
  onSwitchToWebSocket?: () => void;
}

export function Sidebar({ onSwitchToWebSocket }: SidebarProps) {
  const sidebarSection = useStore(s => s.sidebarSection);
  const setSidebarSection = useStore(s => s.setSidebarSection);
  const [showCreateNew, setShowCreateNew] = useState(false);

  return (
    <div className="flex flex-col h-full bg-surface-alternate-muted">
      <div className="flex items-center gap-2 px-3 pt-3 pb-1">
        <button
          onClick={() => setShowCreateNew(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-label-vivid hover:bg-utility-muted rounded transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          New
        </button>
        <button
          onClick={async () => {
            try {
              const result = await vscodeClient.openFileDialog({ 'Collection Files': ['json', 'yaml', 'yml'] });
              if (!result || !result.content) return;

              const content = result.content;
              let importResult;

              // Try JSON formats first
              try {
                const parsed = JSON.parse(content);
                if (parsed.info && parsed.item) {
                  importResult = importPostmanCollection(content);
                } else if (parsed.version && parsed.collection) {
                  importResult = importUSBCollection(content);
                } else if (parsed.openapi || parsed.swagger) {
                  importResult = parseOpenApiSpec(content);
                }
              } catch {
                // Not JSON — try as YAML OpenAPI
                importResult = parseOpenApiSpec(content);
              }

              if (importResult) {
                const importCollection = useStore.getState().importCollection;
                importCollection(importResult.collection, importResult.requests);
              }
            } catch (err) {
              console.error('Import error:', err);
            }
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-label-muted hover:text-label-vivid hover:bg-utility-muted rounded transition-colors"
        >
          <FileUp className="w-3.5 h-3.5" />
          Import
        </button>
      </div>

      <Tabs value={sidebarSection} onValueChange={(v: any) => setSidebarSection(v)} className="flex flex-col h-full">
        <div className="px-3 pt-1">
          <TabsList className="w-full flex-wrap">
            <TabsTrigger value="collections" className="text-[12px]">Collections</TabsTrigger>
            <TabsTrigger value="environments" className="text-[12px]">Env</TabsTrigger>
            <TabsTrigger value="history" className="text-[12px]">History</TabsTrigger>
            <TabsTrigger value="templates" className="text-[12px]">Templates</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="collections" className="flex-1 overflow-auto mt-0 px-3 pb-3">
          <CollectionsPanel />
        </TabsContent>
        <TabsContent value="environments" className="flex-1 overflow-auto mt-0 px-3 pb-3">
          <EnvironmentsPanel />
        </TabsContent>
        <TabsContent value="history" className="flex-1 overflow-auto mt-0 px-3 pb-3">
          <HistoryPanel />
        </TabsContent>
        <TabsContent value="templates" className="flex-1 overflow-auto mt-0 px-3 pb-3">
          <TemplatesPanel />
        </TabsContent>
      </Tabs>

      <CreateNewModal
        open={showCreateNew}
        onClose={() => setShowCreateNew(false)}
        onSwitchToWebSocket={onSwitchToWebSocket}
      />
    </div>
  );
}
