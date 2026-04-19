import { Typography } from '@/components/ui/typography';
import { Plug } from 'lucide-react';

export function WebSocketPanel() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16">
      <div className="w-12 h-12 rounded-full bg-utility-muted flex items-center justify-center">
        <Plug className="w-6 h-6 text-label-muted" />
      </div>
      <Typography variant="heading-small" className="text-label-muted">
        WebSocket — Coming Soon
      </Typography>
      <Typography variant="body-small" className="text-label-muted text-center max-w-sm">
        WebSocket connections are not yet supported in the VS Code extension. This feature is planned for a future release.
      </Typography>
    </div>
  );
}
