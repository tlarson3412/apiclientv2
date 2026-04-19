import { useState, useEffect } from 'react';
import usBankLogo from '@/assets/US-Bank-Logo.png';
import { Typography } from '@/components/ui/typography';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useStore } from '@/store/useStore';
import { Moon, Sun, Keyboard, Terminal, Search, GitCompare, FlaskConical, Settings } from 'lucide-react';
import { ShortcutsModal } from './ShortcutsModal';
import { CurlImportModal } from '@/components/import/CurlImportModal';
import { GlobalSearch } from '@/components/search/GlobalSearch';
import { CompareModal } from '@/components/compare/CompareModal';
import { LoadTestRunner } from '@/components/loadtest/LoadTestRunner';
import { GlobalSettingsModal } from '@/components/settings/GlobalSettingsModal';

export function TopBar() {
  const environments = useStore(s => s.environments);
  const activeEnvironmentId = useStore(s => s.activeEnvironmentId);
  const setActiveEnvironment = useStore(s => s.setActiveEnvironment);
  const [darkMode, setDarkMode] = useState(() => {
    return document.documentElement.classList.contains('dark');
  });
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showCurlImport, setShowCurlImport] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [showLoadTest, setShowLoadTest] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('usb-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    const saved = localStorage.getItem('usb-theme');
    if (saved === 'dark') {
      setDarkMode(true);
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <div className="flex items-center justify-between px-4 py-2 border-b border-utility-subdued bg-surface">
        <div className="flex items-center gap-3">
          <img src={usBankLogo} alt="US Bank" className="h-8" />
          <div className="h-6 w-px bg-utility-subdued" />
          <Typography variant="subheading-large" className="text-standard-subdued">
            USB API Client
          </Typography>

        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSearch(true)}
            className="flex items-center gap-2 h-8 px-3 text-[13px] text-label-muted bg-surface-alternate-muted border border-utility-subdued rounded hover:border-utility-mid transition-colors"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search...</span>
            <kbd className="text-[11px] bg-utility-muted px-1.5 py-0.5 rounded ml-2">Ctrl+K</kbd>
          </button>
          <div className="h-6 w-px bg-utility-subdued" />
          <div className={`w-2.5 h-2.5 rounded-full ${activeEnvironmentId ? 'bg-status-success-mid' : 'bg-utility-mid'}`} />
          <Typography variant="subheading-small">Environment:</Typography>
          <Select
            value={activeEnvironmentId || 'none'}
            onValueChange={(v) => setActiveEnvironment(v === 'none' ? null : v)}
          >
            <SelectTrigger className="w-[200px] h-8 text-sm">
              <SelectValue placeholder="No Environment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Environment</SelectItem>
              {environments.map(env => (
                <SelectItem key={env.id} value={env.id}>{env.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="h-6 w-px bg-utility-subdued" />
          <Button variant="text" size="small" onClick={() => setShowLoadTest(true)} title="Load Test Runner">
            <FlaskConical className="w-4 h-4" />
          </Button>
          <Button variant="text" size="small" onClick={() => setShowCompare(true)} title="Compare Responses">
            <GitCompare className="w-4 h-4" />
          </Button>
          <Button variant="text" size="small" onClick={() => setShowCurlImport(true)} title="Import cURL">
            <Terminal className="w-4 h-4" />
          </Button>
          <Button variant="text" size="small" onClick={() => setShowShortcuts(true)} title="Keyboard Shortcuts">
            <Keyboard className="w-4 h-4" />
          </Button>
          <Button variant="text" size="small" onClick={() => setShowSettings(true)} title="Settings">
            <Settings className="w-4 h-4" />
          </Button>
          <Button variant="text" size="small" onClick={() => setDarkMode(!darkMode)} title={darkMode ? 'Light Mode' : 'Dark Mode'}>
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>

        </div>
      </div>
      <ShortcutsModal open={showShortcuts} onClose={() => setShowShortcuts(false)} />
      <CurlImportModal open={showCurlImport} onClose={() => setShowCurlImport(false)} />
      <GlobalSearch open={showSearch} onClose={() => setShowSearch(false)} />
      <CompareModal open={showCompare} onClose={() => setShowCompare(false)} />
      <LoadTestRunner open={showLoadTest} onClose={() => setShowLoadTest(false)} />
      <GlobalSettingsModal open={showSettings} onClose={() => setShowSettings(false)} />
    </>
  );
}
