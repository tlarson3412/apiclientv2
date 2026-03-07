import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <div className="w-full max-w-md mx-4 rounded-xl border bg-popover p-6 shadow-sm">
        <div className="flex mb-4 gap-2">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <h1 className="text-2xl font-bold" data-testid="text-404-title">404 Page Not Found</h1>
        </div>

        <p className="mt-4 text-sm text-muted-foreground" data-testid="text-404-message">
          Did you forget to add the page to the router?
        </p>
      </div>
    </div>
  );
}
