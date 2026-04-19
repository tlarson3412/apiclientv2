import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Notifications } from "@/components/ui/notifications";
import { AppLayout } from "@/components/layout/AppLayout";
import { CollectionSync } from "@/components/workspace/CollectionSync";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <CollectionSync />
      <Notifications />
      <AppLayout />
    </QueryClientProvider>
  );
}

export default App;
