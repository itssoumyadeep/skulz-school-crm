import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Heart, ArrowLeft, CheckCircle2, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTheme } from "@/context/ThemeContext";

const inputCls =
  "w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400";
const labelCls =
  "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

export function StartFreeTrialPage() {
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    centerName: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "",
  });
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!form.role) {
      setError("Please select your role.");
      return;
    }
    navigate("/login");
  };

  const roles = [
    { value: "administrator", label: "Administrator" },
    { value: "school", label: "School Manager" },
    { value: "parent", label: "Parent" },
    { value: "supplier", label: "Supplier" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-950 dark:to-gray-950 flex flex-col transition-colors duration-200">
      {/* Header */}
      <header className="bg-white dark:bg-gray-950 border-b border-purple-100 dark:border-gray-800 py-4 px-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link to="/">
            <img
              src="/logo.png"
              alt="The Purple Cubby"
              className="h-12 w-auto"
            />
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-purple-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-purple-50 dark:hover:bg-gray-800 transition-colors"
              aria-label="Toggle theme"
            >
              {isDark ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>
            <Link to="/">
              <Button
                variant="ghost"
                className="text-purple-700 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-gray-800 rounded-full"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-6 py-12">
        <div className="w-full max-w-lg">
          <Card className="p-10 rounded-3xl shadow-xl border-purple-100 dark:border-gray-800 bg-white dark:bg-gray-900">
            <div className="text-center mb-8">
              <div className="w-14 h-14 bg-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Heart className="w-8 h-8 text-white" fill="white" />
              </div>
              <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
                Start Your Free Trial
              </h1>
              <p className="text-gray-500 dark:text-gray-400">
                14 days free. No credit card required.
              </p>
            </div>

            {error && (
              <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className={labelCls}>Daycare Center Name *</label>
                <input
                  type="text"
                  name="centerName"
                  value={form.centerName}
                  onChange={handleChange}
                  required
                  placeholder="Sunshine Daycare"
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>Email Address *</label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  placeholder="you@daycare.com"
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>Your Role *</label>
                <select
                  name="role"
                  value={form.role}
                  onChange={handleChange}
                  className={inputCls}
                >
                  <option value="">Select your role</option>
                  {roles.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelCls}>Password *</label>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  required
                  placeholder="Create a password"
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>Confirm Password *</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  required
                  placeholder="Repeat your password"
                  className={inputCls}
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-xl py-3 text-base mt-2"
              >
                Create Account & Start Trial
              </Button>
            </form>

            <div className="mt-6 text-center">
              <div className="flex justify-center gap-6 text-sm text-gray-500 dark:text-gray-400 mb-4">
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 text-purple-600" />
                  No credit card
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 text-purple-600" />
                  Cancel anytime
                </div>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="text-purple-600 hover:underline font-medium"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
