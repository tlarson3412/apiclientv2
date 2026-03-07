import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { AuthProvider } from "@/hooks/use-auth";
import { WorkspaceProvider } from "@/hooks/use-workspace";
import { ProtectedRoute } from "@/lib/protected-route";
import { Notifications } from "@/components/ui/notifications";
import { AppLayout } from "@/components/layout/AppLayout";
import { CollectionSync } from "@/components/workspace/CollectionSync";
import { LocalStorageMigration } from "@/components/workspace/LocalStorageMigration";
import AuthPage from "@/pages/auth-page";

function HomePage() {
  return (
    <WorkspaceProvider>
      <CollectionSync />
      <LocalStorageMigration />
      <Notifications />
      <AppLayout />
    </WorkspaceProvider>
  );
}

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={HomePage} />
      <Route path="/auth" component={AuthPage} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
