import { useState } from "react";
import { Link } from "react-router";
import { ArrowLeft, CheckCircle2, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTheme } from "@/context/ThemeContext";

const inputCls =
  "w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400";
const labelCls =
  "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

export function BookDemoPage() {
  const { isDark, toggleTheme } = useTheme();
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    centerName: "",
    phone: "",
    centerSize: "",
    message: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-950 dark:to-gray-950 flex flex-col transition-colors duration-200">
      {/* Header */}
      <header className="bg-white dark:bg-gray-950 border-b border-purple-100 dark:border-gray-800 py-4 px-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link to="/">
            <img
              src="/logo.png"
              alt="The Purple Cubby"
              className="h-16 w-auto"
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
        <div className="w-full max-w-2xl">
          {submitted ? (
            <Card className="p-10 rounded-3xl shadow-xl border-purple-100 dark:border-gray-800 bg-white dark:bg-gray-900 text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
                Request Received!
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Thank you, <strong>{form.name}</strong>. Our team will reach out
                within 1 business day to schedule your demo.
              </p>
              <Link to="/">
                <Button className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl px-8">
                  Back to Home
                </Button>
              </Link>
            </Card>
          ) : (
            <Card className="p-10 rounded-3xl shadow-xl border-purple-100 dark:border-gray-800 bg-white dark:bg-gray-900">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
                  Book a Demo
                </h1>
                <p className="text-gray-500 dark:text-gray-400">
                  See how The Purple Cubby can transform your daycare
                  operations.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Your Name *</label>
                    <input
                      type="text"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      required
                      placeholder="Jane Smith"
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
                      placeholder="jane@daycare.com"
                      className={inputCls}
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
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
                    <label className={labelCls}>Phone Number</label>
                    <input
                      type="tel"
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                      placeholder="+1 (555) 000-0000"
                      className={inputCls}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelCls}>
                    Number of Children Enrolled
                  </label>
                  <select
                    name="centerSize"
                    value={form.centerSize}
                    onChange={handleChange}
                    className={inputCls}
                  >
                    <option value="">Select range</option>
                    <option value="1-25">1 – 25</option>
                    <option value="26-50">26 – 50</option>
                    <option value="51-100">51 – 100</option>
                    <option value="100+">100+</option>
                  </select>
                </div>

                <div>
                  <label className={labelCls}>
                    Anything you'd like us to know?
                  </label>
                  <textarea
                    name="message"
                    value={form.message}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Tell us about your current challenges..."
                    className={`${inputCls} resize-none`}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-xl py-3 text-base"
                >
                  Request Demo
                </Button>
              </form>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
