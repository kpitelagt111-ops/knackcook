"use client";

import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { type FormEvent, Suspense, useState } from "react";
import { Button, Card, CardBody, Input } from "@/components/ui";

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/admin";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl,
      });
      if (!result || result.error) {
        setError("Invalid email or password.");
        return;
      }
      window.location.assign(result.url ?? callbackUrl);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  function handleGoogle() {
    setError(null);
    void signIn("google", { callbackUrl });
  }

  return (
    <div className="bg-paper grain relative flex min-h-screen items-center justify-center px-4 py-12">
      <div className="relative z-10 w-full max-w-md">
        <Card variant="default" className="shadow-lift">
          <CardBody className="p-8 sm:p-10">
            <header className="mb-8 flex flex-col items-center gap-3 text-center">
              <span
                aria-hidden="true"
                className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ember-500 font-display text-3xl leading-none text-primary-foreground shadow-soft"
              >
                K
              </span>
              <span className="inline-flex items-center gap-2 text-[0.7rem] font-medium uppercase tracking-[0.22em] text-ember-600">
                <span className="rule-ember" /> KnackCook
              </span>
              <h1 className="font-display text-3xl font-medium tracking-tight text-foreground">
                Welcome back
              </h1>
              <p className="max-w-xs text-sm text-muted text-pretty">
                Sign in to the editorial back-office.
              </p>
            </header>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label
                  htmlFor="email"
                  className="block text-[0.7rem] font-medium uppercase tracking-[0.18em] text-muted"
                >
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1.5"
                  placeholder="you@knackcook.com"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-[0.7rem] font-medium uppercase tracking-[0.18em] text-muted"
                >
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1.5"
                  placeholder="••••••••"
                />
              </div>

              {error ? (
                <p
                  role="alert"
                  className="rounded-xl border border-danger-600/30 bg-danger-50 px-3 py-2 text-xs font-medium text-danger-600 dark:border-danger-600/40 dark:bg-danger-600/15 dark:text-danger-50"
                >
                  {error}
                </p>
              ) : null}

              <Button type="submit" disabled={pending} size="lg" className="w-full">
                {pending ? "Signing in…" : "Sign in"}
              </Button>
            </form>

            <div className="my-6 flex items-center gap-3 text-[0.65rem] uppercase tracking-[0.2em] text-subtle">
              <div className="h-px flex-1 bg-border" />
              or
              <div className="h-px flex-1 bg-border" />
            </div>

            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={handleGoogle}
              className="w-full"
            >
              <svg
                viewBox="0 0 18 18"
                width="16"
                height="16"
                aria-hidden="true"
                className="shrink-0"
              >
                <path
                  fill="#EA4335"
                  d="M9 3.6c1.3 0 2.5.5 3.4 1.3l2.5-2.5C13.5 1 11.4 0 9 0 5.5 0 2.5 2 1 5l3 2.3C4.7 5.2 6.7 3.6 9 3.6Z"
                />
                <path
                  fill="#4285F4"
                  d="M17.6 9.2c0-.6-.1-1.2-.2-1.8H9v3.4h4.8a4 4 0 0 1-1.8 2.7l2.9 2.3c1.7-1.6 2.7-3.9 2.7-6.6Z"
                />
                <path
                  fill="#FBBC05"
                  d="M4 10.7a5.4 5.4 0 0 1 0-3.4L1 5A9 9 0 0 0 0 9c0 1.5.3 2.8 1 4l3-2.3Z"
                />
                <path
                  fill="#34A853"
                  d="M9 18c2.4 0 4.5-.8 6-2.2l-2.9-2.3a5.4 5.4 0 0 1-8.1-2.8L1 13A9 9 0 0 0 9 18Z"
                />
              </svg>
              Sign in with Google
            </Button>
          </CardBody>
        </Card>

        <p className="mt-6 text-center text-xs text-subtle">
          Protected area · authorized editors and admins only.
        </p>
      </div>
    </div>
  );
}
