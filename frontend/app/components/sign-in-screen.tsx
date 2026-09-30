"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loginWithPassword, signupWithPassword } from "@/app/lib/api";

type SignInScreenProps = {
  deniedReason?: string;
};

const roleRoutes: Record<string, string> = {
  admin: "/admin",
  principal: "/principal",
  vice_principal: "/vice-principal",
  teacher: "/teacher",
  caregiver: "/caregiver",
  parent: "/parent",
  vendor: "/vendor",
  owner: "/governance/owner",
  board: "/governance/board",
  trustee: "/governance/trustee",
  staff: "/staff",
};

function errorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error) {
    return String(error.message);
  }
  return "Something went wrong. Please try again.";
}

export function SignInScreen({ deniedReason }: SignInScreenProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [tenant, setTenant] = useState("demo-school");
  const [identity, setIdentity] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  const signIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("");
    setBusy(true);
    try {
      const result = await loginWithPassword({
        username: identity.trim(),
        password,
        tenant: tenant.trim(),
      });
      const route = roleRoutes[result.data.role];
      if (!route) {
        setStatus("Your account does not have an available portal.");
        return;
      }
      document.cookie = `pc_session=${encodeURIComponent(result.data.access_token)}; Path=/; Max-Age=${result.data.expires_in}; SameSite=Lax`;
      router.push(route);
    } catch (error: unknown) {
      setStatus(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const signUp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("");
    if (password !== confirmPassword) {
      setStatus("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const result = await signupWithPassword({
        full_name: fullName.trim(),
        email: email.trim(),
        password,
        tenant: tenant.trim(),
      });
      setIdentity(result.data.email);
      setPassword("");
      setConfirmPassword("");
      setMode("signin");
      setStatus(
        "Your request was sent. Your school administrator must activate your account before you can sign in.",
      );
    } catch (error: unknown) {
      setStatus(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="grid min-h-screen bg-background p-3 text-foreground sm:p-6 lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative flex min-h-64 flex-col justify-between overflow-hidden rounded-lg bg-primary p-7 text-primary-foreground sm:min-h-80 sm:p-10 lg:min-h-[calc(100vh-3rem)] lg:p-14">
        <div className="relative flex items-center gap-3">
          <Image
            src="/favicon.ico"
            alt="The Purple Cubby logo"
            width={50}
            height={50}
            unoptimized
            className="size-[50px] object-contain"
          />
          <span className="font-semibold">The Purple Cubby</span>
        </div>
        <div className="relative max-w-xl py-10 lg:py-0">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary-foreground/70">
            School workspace
          </p>
          <h1 className="max-w-lg text-4xl font-semibold leading-tight sm:text-5xl">
            School life, together.
          </h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-primary-foreground/80 sm:text-base">
            Everything your school needs, in one place.
          </p>
        </div>
        <p className="relative text-xs text-primary-foreground/75">
          Made with love for classrooms
        </p>
      </section>

      <section className="flex items-center justify-center px-2 py-8 sm:px-8 lg:px-12">
        <div className="w-full max-w-md">
          <div className="mb-7">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              {mode === "signin" ? "Welcome back" : "Join your school"}
            </p>
            <h2 className="mt-2 text-3xl font-semibold">
              {mode === "signin" ? "Sign in" : "Create your account"}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {mode === "signin"
                ? "Use your school account to continue."
                : "Create a parent account for your school."}
            </p>
          </div>

          <div
            className="mb-7 grid grid-cols-2 border-b border-border"
            role="tablist"
            aria-label="Account access"
          >
            <Button
              type="button"
              role="tab"
              aria-selected={mode === "signin"}
              variant="ghost"
              className={`h-11 rounded-none border-b-2 ${mode === "signin" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}
              onClick={() => {
                setMode("signin");
                setStatus("");
              }}
            >
              Sign In
            </Button>
            <Button
              type="button"
              role="tab"
              aria-selected={mode === "signup"}
              variant="ghost"
              className={`h-11 rounded-none border-b-2 ${mode === "signup" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}
              onClick={() => {
                setMode("signup");
                setStatus("");
              }}
            >
              Sign Up
            </Button>
          </div>

          {deniedReason && (
            <p
              className="mb-5 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm"
              role="alert"
            >
              Access was blocked: {deniedReason.replaceAll("-", " ")}.
            </p>
          )}

          <label className="mb-5 block space-y-2 text-sm font-medium">
            <span>School code</span>
            <Input
              value={tenant}
              onChange={(event) => setTenant(event.target.value)}
              autoComplete="organization"
              required
            />
          </label>

          {mode === "signin" ? (
            <form className="space-y-5" onSubmit={signIn}>
              <label className="block space-y-2 text-sm font-medium">
                <span>Email or username</span>
                <Input
                  value={identity}
                  onChange={(event) => setIdentity(event.target.value)}
                  autoComplete="username"
                  required
                />
              </label>
              <label className="block space-y-2 text-sm font-medium">
                <span>Password</span>
                <Input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                />
              </label>
              <Button className="w-full" type="submit" disabled={busy}>
                {busy ? "Signing in…" : "Sign In"}
              </Button>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={signUp}>
              <label className="block space-y-2 text-sm font-medium">
                <span>Full name</span>
                <Input
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  autoComplete="name"
                  required
                />
              </label>
              <label className="block space-y-2 text-sm font-medium">
                <span>School email</span>
                <Input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  required
                />
              </label>
              <label className="block space-y-2 text-sm font-medium">
                <span>Password</span>
                <Input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                  minLength={10}
                  required
                />
              </label>
              <label className="block space-y-2 text-sm font-medium">
                <span>Confirm password</span>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  minLength={10}
                  required
                />
              </label>
              <Button className="w-full" type="submit" disabled={busy}>
                {busy ? "Creating account…" : "Create parent account"}
              </Button>
            </form>
          )}

          {status && (
            <p
              className="mt-5 rounded-md border border-border bg-surface2 p-3 text-sm"
              role="status"
              aria-live="polite"
            >
              {status}
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
