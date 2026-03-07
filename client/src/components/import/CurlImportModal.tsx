import { useState } from 'react';
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Typography } from '@/components/ui/typography';
import { useStore } from '@/store/useStore';
import { parseCurl } from '@/utils/curlParser';
import { Terminal, AlertCircle } from 'lucide-react';

interface CurlImportModalProps {
  open: boolean;
  onClose: () => void;
}

export function CurlImportModal({ open, onClose }: CurlImportModalProps) {
  const [curlInput, setCurlInput] = useState('');
  const [error, setError] = useState('');
  const addTab = useStore(s => s.addTab);
  const requests = useStore(s => s.requests);
  const updateRequest = useStore(s => s.updateRequest);

  const handleImport = () => {
    if (!curlInput.trim()) {
      setError('Please paste a cURL command');
      return;
    }

    try {
      const parsed = parseCurl(curlInput.trim());

      if (!parsed.url) {
        setError('Could not extract a URL from the cURL command');
        return;
      }

      let urlName = 'Imported Request';
      try {
        const urlObj = new URL(parsed.url);
        urlName = urlObj.pathname.split('/').filter(Boolean).pop() || urlObj.hostname || 'Imported Request';
      } catch {
        urlName = parsed.url.split('/').filter(Boolean).pop() || 'Imported Request';
      }

      addTab();

      const state = useStore.getState();
      const latestTab = state.tabs[state.tabs.length - 1];
      if (latestTab) {
        updateRequest(latestTab.requestId, {
          name: urlName,
          method: parsed.method,
          url: parsed.url,
          headers: parsed.headers,
          body: parsed.body,
          bodyType: parsed.bodyType,
          auth: parsed.auth,
        });
      }

      setCurlInput('');
      setError('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to parse cURL command');
    }
  };

  return (
    <Modal open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <ModalContent className="max-w-[600px]">
        <ModalHeader>
          <ModalTitle>Import cURL</ModalTitle>
          <ModalDescription>Paste a cURL command to create a new request</ModalDescription>
        </ModalHeader>

        <div className="flex flex-col gap-3">
          <textarea
            value={curlInput}
            onChange={(e) => { setCurlInput(e.target.value); setError(''); }}
            placeholder={`curl -X POST 'https://api.example.com/data' \\\n  -H 'Content-Type: application/json' \\\n  -d '{"key": "value"}'`}
            className="w-full h-[200px] px-3 py-2 rounded-md border border-utility-mid bg-surface text-[13px] text-label-vivid placeholder:text-label-muted focus:outline-none focus:ring-2 focus:ring-standard-subdued font-mono resize-none"
          />

          {error && (
            <div className="flex items-center gap-2 text-status-danger-mid">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <Typography variant="caption">{error}</Typography>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleImport}>
            <Terminal className="w-4 h-4" />
            Import
          </Button>
        </div>
      </ModalContent>
    </Modal>
  );
}
