import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { CollectionsPanel } from '@/components/collections/CollectionsPanel';
import { EnvironmentsPanel } from '@/components/environments/EnvironmentsPanel';
import { HistoryPanel } from '@/components/history/HistoryPanel';
import { TemplatesPanel } from '@/components/templates/TemplatesPanel';
import { CreateNewModal } from './CreateNewModal';
import { Plus, FileUp } from 'lucide-react';

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
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json,.yaml,.yml';
            input.onchange = (e) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (file) {
                const event = new CustomEvent('import-file', { detail: file });
                window.dispatchEvent(event);
              }
            };
            input.click();
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
