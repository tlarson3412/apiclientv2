import { useEffect } from 'react';
import { useStore } from '@/store/useStore';

interface UseKeyboardShortcutsProps {
  sendRequest: () => void;
  onToggleShortcutsModal?: () => void;
}

export function useKeyboardShortcuts({
  sendRequest,
  onToggleShortcutsModal,
}: UseKeyboardShortcutsProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Mac (Cmd) or Windows/Linux (Ctrl)
      const isModifierPressed = e.ctrlKey || e.metaKey;

      // Ctrl/Cmd+Enter: Send request
      if (isModifierPressed && e.key === 'Enter') {
        e.preventDefault();
        sendRequest();
        return;
      }

      // Ctrl/Cmd+N: New tab
      if (isModifierPressed && e.key === 'n') {
        e.preventDefault();
        useStore.getState().addTab();
        return;
      }

      // Ctrl/Cmd+W: Close active tab
      if (isModifierPressed && e.key === 'w') {
        e.preventDefault();
        const { activeTabId } = useStore.getState();
        if (activeTabId) {
          useStore.getState().removeTab(activeTabId);
        }
        return;
      }

      // Ctrl+Shift+S: Save request to collection
      if (isModifierPressed && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        console.log('Save request to collection - feature coming soon');
        return;
      }

      // Ctrl/Cmd+/: Toggle shortcuts modal
      if (isModifierPressed && e.key === '/') {
        e.preventDefault();
        if (onToggleShortcutsModal) {
          onToggleShortcutsModal();
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [sendRequest, onToggleShortcutsModal]);
}
