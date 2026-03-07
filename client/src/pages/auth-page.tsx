import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/text-input";
import { Typography } from "@/components/ui/typography";
import { Redirect } from "wouter";
import { Loader2 } from "lucide-react";
import usBankLogo from "@/assets/US-Bank-Logo.png";

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  if (user) {
    return <Redirect to="/" />;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password.trim()) {
      setError("Username and password are required");
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!isLogin && password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    const onError = (err: Error) => {
      setError(err.message.replace(/^\d+:\s*/, ""));
    };

    if (isLogin) {
      loginMutation.mutate({ username: username.trim(), password }, { onError });
    } else {
      registerMutation.mutate({ username: username.trim(), password }, { onError });
    }
  };

  const isLoading = loginMutation.isPending || registerMutation.isPending;

  return (
    <div className="min-h-screen flex bg-surface">
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-[400px]">
          <div className="mb-8">
            <img src={usBankLogo} alt="US Bank" className="h-10 mb-6" />
            <Typography variant="heading-large">
              {isLogin ? "Sign in" : "Create account"}
            </Typography>
            <Typography variant="body-medium" className="mt-2">
              {isLogin
                ? "Sign in to access your API workspaces"
                : "Create an account to start testing APIs"}
            </Typography>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <TextInput
              label="Username"
              value={username}
              onValueChange={setUsername}
              errorState={error && !username.trim() ? "Required" : ""}
            />

            <TextInput
              label="Password"
              type="password"
              value={password}
              onValueChange={setPassword}
              errorState={error && !password.trim() ? "Required" : ""}
            />

            {!isLogin && (
              <TextInput
                label="Confirm password"
                type="password"
                value={confirmPassword}
                onValueChange={setConfirmPassword}
                errorState={
                  error && password !== confirmPassword
                    ? "Passwords do not match"
                    : ""
                }
              />
            )}

            {error && (
              <p className="text-[13px] text-status-danger-mid">{error}</p>
            )}

            <Button
              type="submit"
              variant="primary"
              size="large"
              disabled={isLoading}
              className="w-full mt-2"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isLogin ? "Sign in" : "Create account"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError("");
              }}
              className="text-[14px] text-standard-subdued hover:underline"
            >
              {isLogin
                ? "Don't have an account? Create one"
                : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
      </div>

      <div className="hidden lg:flex flex-1 bg-standard-subdued items-center justify-center p-12">
        <div className="max-w-[480px] text-center">
          <Typography variant="display-small" className="text-white mb-4">
            USB API Client
          </Typography>
          <Typography variant="body-large" className="text-white/80">
            Test, document, and share APIs with your team. Build collections,
            run automated tests, and collaborate in shared workspaces.
          </Typography>
          <div className="mt-10 grid grid-cols-2 gap-4 text-left">
            {[
              "Shared workspaces",
              "Collection templates",
              "Environment variables",
              "Load testing",
              "Mock servers",
              "Request chaining",
            ].map((feature) => (
              <div
                key={feature}
                className="flex items-center gap-2 text-white/70 text-[14px]"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-white/50" />
                {feature}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
