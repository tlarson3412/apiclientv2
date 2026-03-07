import { useState, useEffect } from 'react';
import usBankLogo from '@/assets/US-Bank-Logo.png';
import { Typography } from '@/components/ui/typography';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useStore } from '@/store/useStore';
import { useAuth } from '@/hooks/use-auth';
import { useWorkspace } from '@/hooks/use-workspace';
import { Moon, Sun, Keyboard, Terminal, Search, GitCompare, FlaskConical, Settings, Eye, FileText, BarChart3, Activity, Server, Timer, Workflow, Copy, Shield, LogOut, User, Users } from 'lucide-react';
import { WorkspaceModal } from '@/components/workspace/WorkspaceModal';
import { ShortcutsModal } from './ShortcutsModal';
import { CurlImportModal } from '@/components/import/CurlImportModal';
import { GlobalSearch } from '@/components/search/GlobalSearch';
import { CompareModal } from '@/components/compare/CompareModal';
import { LoadTestRunner } from '@/components/loadtest/LoadTestRunner';
import { GlobalSettingsModal } from '@/components/settings/GlobalSettingsModal';
import { ApiDocsGenerator } from '@/components/docs/ApiDocsGenerator';
import { MonitoringDashboard } from '@/components/monitoring/MonitoringDashboard';
import { ActivityFeed } from '@/components/activity/ActivityFeed';
import { MockServerPanel } from '@/components/mock/MockServerPanel';
import { MonitorsPanel } from '@/components/monitors/MonitorsPanel';
import { FlowBuilder } from '@/components/flow/FlowBuilder';
import { CopyCollectionModal } from '@/components/collections/CopyCollectionModal';
import { ApprovalRulesManager } from '@/components/approval/ApprovalRulesManager';

export function TopBar() {
  const { user, logoutMutation } = useAuth();
  const { activeWorkspace, workspaces, setActiveWorkspaceId } = useWorkspace();
  const environments = useStore(s => s.environments);
  const activeEnvironmentId = useStore(s => s.activeEnvironmentId);
  const setActiveEnvironment = useStore(s => s.setActiveEnvironment);
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    return document.documentElement.classList.contains('dark');
  });
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showCurlImport, setShowCurlImport] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [showLoadTest, setShowLoadTest] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  const [showMonitoring, setShowMonitoring] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [showMockServer, setShowMockServer] = useState(false);
  const [showMonitors, setShowMonitors] = useState(false);
  const [showFlowBuilder, setShowFlowBuilder] = useState(false);
  const [showCopyCollection, setShowCopyCollection] = useState(false);
  const [showApprovalRules, setShowApprovalRules] = useState(false);

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
          {workspaces.length > 0 && (
            <>
              <div className="h-6 w-px bg-utility-subdued" />
              <Select
                value={String(activeWorkspace?.id || "")}
                onValueChange={(v) => setActiveWorkspaceId(parseInt(v))}
              >
                <SelectTrigger className="w-[180px] h-8 text-sm">
                  <SelectValue placeholder="Select workspace" />
                </SelectTrigger>
                <SelectContent>
                  {workspaces.map(ws => (
                    <SelectItem key={ws.id} value={String(ws.id)}>{ws.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="text" size="small" onClick={() => setShowWorkspaceModal(true)} title="Manage Workspaces">
                <Users className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSearch(true)}
            className="flex items-center gap-2 h-8 px-3 text-[13px] text-label-muted bg-surface-alternate-muted border border-utility-subdued rounded hover:border-utility-mid transition-colors"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search...</span>
            <kbd className="text-[11px] bg-utility-muted px-1.5 py-0.5 rounded ml-2">⌘K</kbd>
          </button>
          <div className="h-6 w-px bg-utility-subdued" />
          <div className={`w-2.5 h-2.5 rounded-full ${activeEnvironmentId ? 'bg-green-500' : 'bg-gray-400'}`} />
          <Eye className="w-4 h-4 text-label-muted" />
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
          <Button variant="text" size="small" onClick={() => setShowMonitoring(true)} title="Monitoring Dashboard">
            <BarChart3 className="w-4 h-4" />
          </Button>
          <Button variant="text" size="small" onClick={() => setShowActivity(true)} title="Activity Feed">
            <Activity className="w-4 h-4" />
          </Button>
          <Button variant="text" size="small" onClick={() => setShowMockServer(true)} title="Mock Server">
            <Server className="w-4 h-4" />
          </Button>
          <Button variant="text" size="small" onClick={() => setShowMonitors(true)} title="Monitors">
            <Timer className="w-4 h-4" />
          </Button>
          <Button variant="text" size="small" onClick={() => setShowFlowBuilder(true)} title="Request Flows">
            <Workflow className="w-4 h-4" />
          </Button>
          <Button variant="text" size="small" onClick={() => setShowCopyCollection(true)} title="Copy Collection">
            <Copy className="w-4 h-4" />
          </Button>
          <Button variant="text" size="small" onClick={() => setShowApprovalRules(true)} title="Approval Rules">
            <Shield className="w-4 h-4" />
          </Button>
          <Button variant="text" size="small" onClick={() => setShowDocs(true)} title="API Documentation">
            <FileText className="w-4 h-4" />
          </Button>
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
          {user && (
            <>
              <div className="h-6 w-px bg-utility-subdued" />
              <div className="flex items-center gap-1.5 text-[13px] text-label-mid">
                <User className="w-3.5 h-3.5" />
                {user.username}
              </div>
              <Button
                variant="text"
                size="small"
                onClick={() => logoutMutation.mutate()}
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </div>
      <ShortcutsModal open={showShortcuts} onClose={() => setShowShortcuts(false)} />
      <CurlImportModal open={showCurlImport} onClose={() => setShowCurlImport(false)} />
      <GlobalSearch open={showSearch} onClose={() => setShowSearch(false)} />
      <CompareModal open={showCompare} onClose={() => setShowCompare(false)} />
      <LoadTestRunner open={showLoadTest} onClose={() => setShowLoadTest(false)} />
      <GlobalSettingsModal open={showSettings} onClose={() => setShowSettings(false)} />
      <ApiDocsGenerator open={showDocs} onClose={() => setShowDocs(false)} />
      <MonitoringDashboard open={showMonitoring} onClose={() => setShowMonitoring(false)} />
      <ActivityFeed open={showActivity} onClose={() => setShowActivity(false)} />
      <MockServerPanel open={showMockServer} onClose={() => setShowMockServer(false)} />
      <MonitorsPanel open={showMonitors} onClose={() => setShowMonitors(false)} />
      <FlowBuilder open={showFlowBuilder} onClose={() => setShowFlowBuilder(false)} />
      <CopyCollectionModal open={showCopyCollection} onClose={() => setShowCopyCollection(false)} />
      <ApprovalRulesManager open={showApprovalRules} onClose={() => setShowApprovalRules(false)} />
      <WorkspaceModal open={showWorkspaceModal} onClose={() => setShowWorkspaceModal(false)} />
    </>
  );
}
