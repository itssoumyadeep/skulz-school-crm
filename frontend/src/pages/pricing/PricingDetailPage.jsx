import { useState, useEffect } from "react";
import { Link, useParams, Navigate } from "react-router";
import {
  ArrowLeft,
  Heart,
  Moon,
  Sun,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTheme } from "@/context/ThemeContext";
import { pricingPlans, featureMatrix } from "./pricingData";

export function PricingDetailPage() {
  const { slug } = useParams();
  const { isDark, toggleTheme } = useTheme();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);
  const [yearly, setYearly] = useState(false);

  const plan = pricingPlans.find((p) => p.slug === slug);
  if (!plan) return <Navigate to="/" replace />;

  const monthlyPrice =
    plan.monthlyPerStudent !== null
      ? plan.monthlyPerStudent *
        (yearly && plan.yearlyDiscount ? 1 - plan.yearlyDiscount / 100 : 1)
      : null;

  const isCustom = plan.monthlyPerStudent === null;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col transition-colors duration-200">
      {/* Header */}
      <header className="bg-white dark:bg-gray-950 border-b border-purple-100 dark:border-gray-800 py-3 px-6 sticky top-0 z-50">
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
            <Link to="/#pricing">
              <Button
                variant="ghost"
                className="text-purple-700 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-gray-800 rounded-full"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                All Plans
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section
        className={`py-20 px-6 ${
          plan.popular
            ? "bg-gradient-to-br from-purple-600 to-purple-800 text-white"
            : "bg-gradient-to-br from-purple-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900"
        }`}
      >
        <div className="max-w-4xl mx-auto text-center">
          <div
            className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium mb-4 ${
              plan.popular
                ? "bg-white/20 text-white"
                : "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
            }`}
          >
            <Tag className="w-4 h-4" />
            {plan.target}
          </div>
          <h1
            className={`text-5xl font-bold mb-3 ${plan.popular ? "text-white" : "text-gray-800 dark:text-white"}`}
          >
            {plan.name} Plan
          </h1>
          <p
            className={`text-xl mb-8 ${plan.popular ? "text-purple-100" : "text-gray-500 dark:text-gray-400"}`}
          >
            {plan.tagline}
          </p>

          {/* Billing toggle */}
          {!isCustom && plan.yearlyDiscount && (
            <div className="flex items-center justify-center gap-3 mb-8">
              <span
                className={`text-sm ${plan.popular ? "text-purple-100" : "text-gray-500 dark:text-gray-400"}`}
              >
                Monthly
              </span>
              <button
                onClick={() => setYearly((v) => !v)}
                className={`relative w-12 h-6 rounded-full transition-colors ${yearly ? "bg-green-500" : plan.popular ? "bg-white/30" : "bg-gray-300 dark:bg-gray-600"}`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${yearly ? "left-7" : "left-1"}`}
                />
              </button>
              <span
                className={`text-sm ${plan.popular ? "text-purple-100" : "text-gray-500 dark:text-gray-400"}`}
              >
                Yearly{" "}
                <span className="bg-green-500 text-white text-xs rounded-full px-2 py-0.5 ml-1">
                  Save {plan.yearlyDiscount}%
                </span>
              </span>
            </div>
          )}

          {/* Price display */}
          <div
            className={`text-center mb-8 ${plan.popular ? "text-white" : "text-gray-800 dark:text-white"}`}
          >
            {isCustom ? (
              <div>
                <p className="text-5xl font-bold">Custom</p>
                <p
                  className={`mt-2 text-sm ${plan.popular ? "text-purple-200" : "text-gray-500 dark:text-gray-400"}`}
                >
                  Contact us for a tailored quote
                </p>
              </div>
            ) : plan.monthlyPerStudent === 0 ? (
              <div>
                <p className="text-5xl font-bold">$0</p>
                <p
                  className={`mt-2 text-sm ${plan.popular ? "text-purple-200" : "text-gray-500 dark:text-gray-400"}`}
                >
                  Free forever — no credit card needed
                </p>
              </div>
            ) : (
              <div>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-bold">
                    ${monthlyPrice.toFixed(2)}
                  </span>
                  <span
                    className={`text-lg ${plan.popular ? "text-purple-200" : "text-gray-500 dark:text-gray-400"}`}
                  >
                    / student / month
                  </span>
                </div>
                {yearly && plan.yearlyDiscount && (
                  <p className="mt-2 text-green-400 text-sm font-medium">
                    Billed annually — {plan.yearlyDiscount}% off vs monthly
                  </p>
                )}
                <p
                  className={`mt-1 text-sm ${plan.popular ? "text-purple-200" : "text-gray-500 dark:text-gray-400"}`}
                >
                  {plan.studentLimit}
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {isCustom ? (
              <Link to="/book-demo">
                <Button
                  className={`rounded-full px-8 py-3 text-base font-semibold ${plan.popular ? "bg-white text-purple-700 hover:bg-purple-50" : "bg-purple-600 text-white hover:bg-purple-700"}`}
                >
                  Contact Sales <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            ) : (
              <Link to="/start-free-trial">
                <Button
                  className={`rounded-full px-8 py-3 text-base font-semibold ${plan.popular ? "bg-white text-purple-700 hover:bg-purple-50" : "bg-purple-600 text-white hover:bg-purple-700"}`}
                >
                  {plan.monthlyPerStudent === 0
                    ? "Get Started Free"
                    : "Start Free Trial"}{" "}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            )}
            <Link to="/book-demo">
              <Button
                variant="outline"
                className={`rounded-full px-8 py-3 text-base ${plan.popular ? "border-white text-white hover:bg-purple-500 bg-transparent" : "border-purple-200 dark:border-gray-700 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-gray-800"}`}
              >
                Book a Demo
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Value Adds */}
      <section className="py-20 px-6 bg-white dark:bg-gray-950">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-3">
              Why Choose {plan.name}?
            </h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
              What makes this plan the right choice for your center.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plan.valueAdds.map((item, i) => (
              <Card
                key={i}
                className="p-6 rounded-2xl border-purple-100 dark:border-gray-800 bg-white dark:bg-gray-900 hover:shadow-md transition-shadow"
              >
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-5 h-5 text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-800 dark:text-white mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  {item.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* What's Included */}
      <section className="py-20 px-6 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-3">
              What's Included
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-4 mb-10">
            {plan.features.map((feat, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-4 rounded-xl border border-purple-100 dark:border-gray-800 bg-white dark:bg-gray-950"
              >
                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                <span className="text-gray-800 dark:text-gray-200 text-sm">
                  {feat}
                </span>
              </div>
            ))}
          </div>
          {plan.notIncluded.length > 0 && (
            <>
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4">
                Not included in this plan
              </h3>
              <div className="grid sm:grid-cols-2 gap-3">
                {plan.notIncluded.map((feat, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 opacity-60"
                  >
                    <XCircle className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-gray-500 dark:text-gray-500 text-sm">
                      {feat}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* Full Feature Comparison */}
      <section className="py-20 px-6 bg-white dark:bg-gray-950">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-3">
              Full Plan Comparison
            </h2>
            <p className="text-gray-500 dark:text-gray-400">
              See how all plans stack up side by side.
            </p>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-purple-100 dark:border-gray-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-purple-50 dark:bg-gray-900 border-b border-purple-100 dark:border-gray-800">
                  <th className="text-left px-6 py-4 text-gray-700 dark:text-gray-300 font-semibold w-1/3">
                    Feature
                  </th>
                  {["free", "starter", "professional", "enterprise"].map(
                    (p) => (
                      <th
                        key={p}
                        className={`px-4 py-4 text-center font-semibold capitalize ${p === slug ? "text-purple-600 dark:text-purple-400" : "text-gray-500 dark:text-gray-400"}`}
                      >
                        {p === slug ? (
                          <span className="underline underline-offset-4">
                            {p}
                          </span>
                        ) : (
                          p
                        )}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {featureMatrix.map((category, ci) => (
                  <>
                    <tr
                      key={`cat-${ci}`}
                      className="bg-gray-50 dark:bg-gray-900"
                    >
                      <td
                        colSpan={5}
                        className="px-6 py-2 text-xs font-bold uppercase tracking-widest text-purple-600 dark:text-purple-400"
                      >
                        {category.category}
                      </td>
                    </tr>
                    {category.features.map((feat, fi) => (
                      <tr
                        key={`feat-${ci}-${fi}`}
                        className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
                      >
                        <td className="px-6 py-3 text-gray-700 dark:text-gray-300">
                          {feat.name}
                        </td>
                        {["free", "starter", "professional", "enterprise"].map(
                          (p) => (
                            <td
                              key={p}
                              className={`px-4 py-3 text-center ${p === slug ? "bg-purple-50/50 dark:bg-purple-900/10" : ""}`}
                            >
                              {typeof feat[p] === "boolean" ? (
                                feat[p] ? (
                                  <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-gray-300 dark:text-gray-700 mx-auto" />
                                )
                              ) : (
                                <span className="text-gray-700 dark:text-gray-300 text-xs">
                                  {feat[p]}
                                </span>
                              )}
                            </td>
                          ),
                        )}
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Other Plans */}
      <section className="py-16 px-6 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
              Explore Other Plans
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {pricingPlans
              .filter((p) => p.slug !== slug)
              .map((p, i) => (
                <Link key={i} to={`/pricing/${p.slug}`}>
                  <Card
                    className={`p-5 rounded-2xl border-purple-100 dark:border-gray-800 bg-white dark:bg-gray-950 hover:shadow-md hover:border-purple-300 dark:hover:border-purple-700 transition-all cursor-pointer h-full ${p.popular ? "border-purple-400" : ""}`}
                  >
                    {p.popular && (
                      <div className="text-xs font-semibold text-purple-600 dark:text-purple-400 mb-2">
                        ★ Most Popular
                      </div>
                    )}
                    <h3 className="font-bold text-gray-800 dark:text-white mb-1">
                      {p.name}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                      {p.target}
                    </p>
                    <p className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                      {p.monthlyPerStudent === null
                        ? "Custom"
                        : p.monthlyPerStudent === 0
                          ? "Free"
                          : `$${p.monthlyPerStudent}/student/mo`}
                    </p>
                  </Card>
                </Link>
              ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-purple-600 dark:bg-purple-700">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to get started with {plan.name}?
          </h2>
          <p className="text-purple-100 mb-8">
            Join hundreds of daycare centers already running smarter with The
            Purple Cubby.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {isCustom ? (
              <Link to="/book-demo">
                <Button className="bg-white text-purple-700 hover:bg-purple-50 rounded-full px-8 py-3 text-base font-semibold">
                  Contact Sales
                </Button>
              </Link>
            ) : (
              <Link to="/start-free-trial">
                <Button className="bg-white text-purple-700 hover:bg-purple-50 rounded-full px-8 py-3 text-base font-semibold">
                  {plan.monthlyPerStudent === 0
                    ? "Get Started Free"
                    : "Start Your Free Trial"}
                </Button>
              </Link>
            )}
            <Link to="/book-demo">
              <Button
                variant="outline"
                className="border-white text-white hover:bg-purple-500 rounded-full px-8 py-3 text-base bg-transparent"
              >
                Book a Demo
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 bg-white dark:bg-gray-950 border-t border-purple-100 dark:border-gray-800">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <Link to="/">
            <img
              src="/logo.png"
              alt="The Purple Cubby"
              className="h-14 w-auto"
            />
          </Link>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            © {new Date().getFullYear()} The Purple Cubby. All rights reserved.
          </p>
          <Link
            to="/"
            className="text-sm text-purple-600 hover:underline dark:text-purple-400"
          >
            Back to Home
          </Link>
        </div>
      </footer>
    </div>
  );
}
