"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
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
      });
      const route = roleRoutes[result.data.role];
      if (!route) {
        setStatus("Your account does not have an available portal.");
        return;
      }
      const cookie = `pc_session=${encodeURIComponent(result.data.access_token)}; Path=/; Max-Age=${result.data.expires_in}; SameSite=Lax`;
      if (process.env.NODE_ENV === "production") {
        const tenantCode = result.data.tenant_code;
        const baseDomain = (
          process.env.NEXT_PUBLIC_TENANT_BASE_DOMAIN ?? "purplecubby.com"
        )
          .replace(/^\.+/, "")
          .toLowerCase();
        if (
          !/^[a-z0-9-]+$/i.test(tenantCode) ||
          !/^[a-z0-9.-]+$/.test(baseDomain)
        ) {
          setStatus("This school does not have a valid portal address.");
          return;
        }
        document.cookie = `${cookie}; Domain=.${baseDomain}; Secure`;
        window.location.assign(
          `https://${tenantCode.toLowerCase()}.${baseDomain}${route}`,
        );
        return;
      }
      document.cookie = cookie;
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
        tenant: tenant.trim() || "demo-school",
      });
      setIdentity(result.data.username);
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
    <>
      <main className="shell" aria-label="The Purple Cubby sign-in screen">
        <section className="brand-panel" aria-label="The Purple Cubby brand">
          <div className="brand">
            <Image
              className="brand-logo"
              src="/favicon.ico"
              alt="The Purple Cubby logo"
              width={50}
              height={50}
              unoptimized
            />
            The Purple Cubby
          </div>
          <div className="brand-copy">
            <h1>School life, together.</h1>
            <p>Everything your school needs, in one place.</p>
          </div>
          <div className="label">School workspace</div>
        </section>

        <section className="form-panel" aria-label="Account access">
          <div className="form-wrap">
            <input
              className="tab-radio"
              type="radio"
              name="access"
              id="access-sign-in"
              checked={mode === "signin"}
              onChange={() => setMode("signin")}
              aria-controls="sign-in-panel"
            />
            <input
              className="tab-radio"
              type="radio"
              name="access"
              id="access-sign-up"
              checked={mode === "signup"}
              onChange={() => setMode("signup")}
              aria-controls="sign-up-panel"
            />

            <nav className="tabs" aria-label="Account access options">
              <label className="tab" htmlFor="access-sign-in">
                Sign In
              </label>
              <label className="tab" htmlFor="access-sign-up">
                Sign Up
              </label>
            </nav>

            <div className="tab-panels">
              <section
                className="tab-panel sign-in-panel"
                id="sign-in-panel"
                role="tabpanel"
              >
                <p className="eyebrow">Welcome back</p>
                <h2>Sign in</h2>
                <p className="intro">
                  Enter your account details to continue to your school
                  workspace.
                </p>

                <form onSubmit={signIn}>
                  <label className="field">
                    <span>Username with school code</span>
                    <input
                      type="text"
                      name="identity"
                      autoComplete="username"
                      placeholder="rq201_SC003433Q"
                      value={identity}
                      onChange={(event) => setIdentity(event.target.value)}
                      required
                    />
                  </label>
                  <label className="field">
                    <span>Password</span>
                    <input
                      type="password"
                      name="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      required
                    />
                  </label>
                  <div className="form-row">
                    <label className="remember">
                      <input type="checkbox" name="remember" />
                      Remember me
                    </label>
                    <a href="#forgot-password">Forgot password?</a>
                  </div>
                  <button className="primary" type="submit" disabled={busy}>
                    {busy ? "Signing in…" : "Sign In"}
                  </button>
                </form>

                <p className="signup-note">
                  New to The Purple Cubby?{" "}
                  <label htmlFor="access-sign-up">Create an account</label>
                </p>
              </section>

              <section
                className="tab-panel sign-up-panel"
                id="sign-up-panel"
                role="tabpanel"
              >
                <p className="eyebrow">Join your school</p>
                <h2>Create account</h2>
                <p className="intro">Set up your Purple Cubby account.</p>

                <form onSubmit={signUp}>
                  <label className="field">
                    <span>Full name</span>
                    <input
                      type="text"
                      name="full-name"
                      autoComplete="name"
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      required
                    />
                  </label>
                  <label className="field">
                    <span>Work or school email</span>
                    <input
                      type="email"
                      name="email"
                      autoComplete="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      required
                    />
                  </label>
                  <label className="field">
                    <span>School or invitation code</span>
                    <input
                      type="text"
                      name="school-code"
                      autoComplete="off"
                      value={tenant}
                      onChange={(event) => setTenant(event.target.value)}
                    />
                  </label>
                  <label className="field">
                    <span>Create password</span>
                    <input
                      type="password"
                      name="new-password"
                      autoComplete="new-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      minLength={10}
                      required
                    />
                  </label>
                  <label className="field">
                    <span>Confirm password</span>
                    <input
                      type="password"
                      name="confirm-password"
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(event) =>
                        setConfirmPassword(event.target.value)
                      }
                      minLength={10}
                      required
                    />
                  </label>
                  <button className="primary" type="submit" disabled={busy}>
                    {busy ? "Creating account…" : "Create account"}
                  </button>
                </form>

                <p className="signup-note">
                  Already have an account?{" "}
                  <label htmlFor="access-sign-in">Sign in</label>
                </p>
              </section>
            </div>

            {deniedReason && (
              <p className="notice" role="alert">
                Access was blocked: {deniedReason.replaceAll("-", " ")}.
              </p>
            )}

            {status && (
              <p className="status" role="status" aria-live="polite">
                {status}
              </p>
            )}

            <p className="fine-print">
              Made with love for classrooms · The Purple Cubby
            </p>
          </div>
        </section>
      </main>

      <style jsx>{`
        :global(body) {
          margin: 0;
          min-width: 320px;
          min-height: 100vh;
          color: #273044;
          background:
            radial-gradient(circle at 10% 8%, #f0eaff 0, transparent 32%),
            #f7f5fb;
          font-family: Georgia, "Times New Roman", serif;
        }

        * {
          box-sizing: border-box;
        }

        button,
        input {
          font: inherit;
        }

        .shell {
          display: grid;
          grid-template-columns: minmax(0, 1.05fr) minmax(390px, 0.95fr);
          width: min(1160px, calc(100% - 48px));
          min-height: min(700px, calc(100vh - 48px));
          margin: 24px auto;
          overflow: hidden;
          border: 1px solid #e8e3f0;
          border-radius: 28px;
          background: rgba(255, 253, 250, 0.9);
          box-shadow: 0 28px 80px rgba(56, 42, 95, 0.16);
        }

        .brand-panel {
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: clamp(32px, 6vw, 76px);
          overflow: hidden;
          background: #49318e;
          color: #fff;
        }

        .brand-panel::before,
        .brand-panel::after {
          position: absolute;
          border-radius: 50%;
          content: "";
        }

        .brand-panel::before {
          width: 280px;
          height: 280px;
          top: -110px;
          right: -90px;
          background: #f7d87a;
        }

        .brand-panel::after {
          width: 190px;
          height: 190px;
          bottom: -80px;
          left: -50px;
          background: #947de0;
          opacity: 0.52;
        }

        .brand,
        .brand-copy,
        .label {
          position: relative;
          z-index: 1;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
          font-family: Arial, sans-serif;
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .brand-logo {
          display: block;
          width: 50px;
          height: 50px;
          border-radius: 11px;
          object-fit: contain;
        }

        h1 {
          max-width: 520px;
          margin: 0;
          font-size: clamp(42px, 6vw, 76px);
          font-weight: 400;
          line-height: 0.98;
          letter-spacing: -0.04em;
        }

        .brand-copy p {
          max-width: 390px;
          margin: 24px 0 0;
          color: #d9d1f5;
          font-size: 18px;
          line-height: 1.55;
        }

        .label {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          color: #f8eecb;
          font-family: Arial, sans-serif;
          font-size: 12px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .label::before {
          width: 34px;
          height: 1px;
          background: #f8eecb;
          content: "";
        }

        .form-panel {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: clamp(28px, 6vw, 72px);
          background: #fffdfa;
        }

        .form-wrap {
          width: min(100%, 390px);
        }

        .eyebrow {
          margin: 0 0 12px;
          color: #6848c7;
          font-family: Arial, sans-serif;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        h2 {
          margin: 0;
          font-size: 42px;
          font-weight: 400;
          letter-spacing: -0.035em;
        }

        .intro {
          margin: 12px 0 28px;
          color: #68738a;
          font-family: Arial, sans-serif;
          font-size: 14px;
          line-height: 1.55;
        }

        .tabs {
          display: grid;
          grid-template-columns: 1fr 1fr;
          margin-bottom: 28px;
          border-bottom: 1px solid #e3e5ee;
        }

        .tab {
          display: block;
          padding: 12px 8px 14px;
          border-bottom: 2px solid transparent;
          color: #68738a;
          cursor: pointer;
          font-family: Arial, sans-serif;
          font-size: 13px;
          font-weight: 700;
          text-align: center;
        }

        .tab-radio {
          position: absolute;
          width: 1px;
          height: 1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          clip-path: inset(50%);
        }

        .tab-radio:focus-visible + .tabs .tab,
        .tab-radio:focus-visible ~ .tabs .tab {
          outline: 2px solid #6848c7;
          outline-offset: 3px;
        }

        #access-sign-in:checked ~ .tabs label[for="access-sign-in"],
        #access-sign-up:checked ~ .tabs label[for="access-sign-up"] {
          border-color: #6848c7;
          color: #49318e;
        }

        .tab-panel {
          display: none;
        }

        #access-sign-in:checked ~ .tab-panels .sign-in-panel,
        #access-sign-up:checked ~ .tab-panels .sign-up-panel {
          display: block;
        }

        .field {
          display: block;
          margin-bottom: 18px;
        }

        .field span {
          display: block;
          margin-bottom: 8px;
          color: #273044;
          font-family: Arial, sans-serif;
          font-size: 12px;
          font-weight: 700;
        }

        input[type="text"],
        input[type="password"],
        input[type="email"] {
          width: 100%;
          padding: 14px 15px;
          border: 1px solid #e3e5ee;
          border-radius: 10px;
          outline: 0;
          background: #fff;
          color: #273044;
          font-family: Arial, sans-serif;
          font-size: 14px;
        }

        input:focus {
          border-color: #6848c7;
          box-shadow: 0 0 0 3px #f0edff;
        }

        .form-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin: 4px 0 24px;
          font-family: Arial, sans-serif;
          font-size: 12px;
        }

        .remember {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #68738a;
        }

        .remember input {
          width: 15px;
          height: 15px;
          accent-color: #6848c7;
        }

        a {
          color: #6848c7;
          text-decoration: none;
        }

        a:hover {
          text-decoration: underline;
        }

        .primary {
          width: 100%;
          padding: 15px 18px;
          border: 0;
          border-radius: 10px;
          background: #6848c7;
          color: #fff;
          cursor: pointer;
          font-family: Arial, sans-serif;
          font-size: 13px;
          font-weight: 700;
        }

        .primary:hover {
          background: #49318e;
        }

        .primary:disabled {
          cursor: progress;
          opacity: 0.8;
        }

        .signup-note {
          margin: 25px 0 0;
          color: #68738a;
          font-family: Arial, sans-serif;
          font-size: 13px;
          text-align: center;
        }

        .signup-note a,
        .signup-note label {
          color: #6848c7;
          cursor: pointer;
          font-weight: 700;
        }

        .fine-print {
          margin: 30px 0 0;
          color: #9a9eac;
          font-family: Arial, sans-serif;
          font-size: 11px;
          line-height: 1.5;
          text-align: center;
        }

        .status,
        .notice {
          margin-top: 18px;
          border: 1px solid #e3e5ee;
          border-radius: 10px;
          background: #fffdfa;
          padding: 12px 14px;
          color: #273044;
          font-family: Arial, sans-serif;
          font-size: 13px;
          line-height: 1.5;
        }

        .notice {
          border-color: rgba(104, 72, 199, 0.25);
          background: rgba(104, 72, 199, 0.05);
        }

        @media (max-width: 820px) {
          .shell {
            grid-template-columns: 1fr;
            width: min(100% - 24px, 560px);
            margin: 12px auto;
          }

          .brand-panel {
            min-height: 310px;
            padding: 32px;
          }

          h1 {
            font-size: 48px;
          }

          .label {
            margin-top: 38px;
          }

          .form-panel {
            padding: 36px 28px 44px;
          }
        }
      `}</style>
    </>
  );
}
