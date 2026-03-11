import { Link, useParams, Navigate } from "react-router";
import { ArrowLeft, Moon, Sun, CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTheme } from "@/context/ThemeContext";
import { features } from "./featureData";

export function FeatureDetailPage() {
  const { slug } = useParams();
  const { isDark, toggleTheme } = useTheme();

  const feature = features.find((f) => f.slug === slug);
  if (!feature) return <Navigate to="/" replace />;

  const Icon = feature.icon;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col transition-colors duration-200">
      {/* Header */}
      <header className="bg-white dark:bg-gray-950 border-b border-purple-100 dark:border-gray-800 py-4 px-6 sticky top-0 z-10">
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

      {/* Hero */}
      <section className="bg-gradient-to-br from-purple-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900 py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="w-20 h-20 bg-purple-100 dark:bg-purple-900/40 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Icon className="w-10 h-10 text-purple-600" />
          </div>
          <div className="inline-flex items-center gap-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full px-4 py-1.5 text-sm font-medium mb-4">
            Feature Overview
          </div>
          <h1 className="text-4xl lg:text-6xl font-bold text-gray-800 dark:text-white mb-4">
            {feature.name}
          </h1>
          <p className="text-xl lg:text-2xl text-purple-600 dark:text-purple-400 font-medium mb-6">
            {feature.tagline}
          </p>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
            {feature.longDescription}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
            <Link to="/start-free-trial">
              <Button className="bg-purple-600 hover:bg-purple-700 text-white rounded-full px-8 py-3 text-base">
                Start Free Trial
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link to="/book-demo">
              <Button
                variant="outline"
                className="border-purple-200 dark:border-gray-700 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-gray-800 rounded-full px-8 py-3 text-base"
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
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-800 dark:text-white mb-4">
              Why It Matters
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Here's how {feature.name} makes a real difference for your center
              every day.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {feature.valueAdds.map((item, index) => (
              <Card
                key={index}
                className="p-6 rounded-2xl border-purple-100 dark:border-gray-800 bg-white dark:bg-gray-900 hover:shadow-md transition-shadow"
              >
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-5 h-5 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                  {item.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                  {item.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section className="py-20 px-6 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-800 dark:text-white mb-4">
              How It Works
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              A step-by-step look at the {feature.name} workflow in The Purple
              Cubby.
            </p>
          </div>
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-purple-200 dark:bg-gray-700 hidden md:block" />
            <div className="space-y-8">
              {feature.workflow.map((step, index) => (
                <div key={index} className="flex gap-6">
                  {/* Step number circle */}
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-purple-600 text-white font-bold text-sm flex items-center justify-center z-10 relative shadow-md">
                      {step.step}
                    </div>
                  </div>
                  {/* Step content */}
                  <Card className="flex-1 p-5 rounded-2xl border-purple-100 dark:border-gray-800 bg-white dark:bg-gray-950 mb-0">
                    <h3 className="text-base font-semibold text-gray-800 dark:text-white mb-1">
                      {step.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                      {step.description}
                    </p>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Key Features */}
      <section className="py-20 px-6 bg-white dark:bg-gray-950">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-800 dark:text-white mb-4">
              Key Capabilities
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Everything included in {feature.name}.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {feature.keyFeatures.map((feat, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-4 rounded-xl border border-purple-100 dark:border-gray-800 bg-purple-50 dark:bg-gray-900"
              >
                <CheckCircle2 className="w-5 h-5 text-purple-600 flex-shrink-0" />
                <span className="text-gray-800 dark:text-gray-200 text-sm font-medium">
                  {feat}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Other Features */}
      <section className="py-16 px-6 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
              Explore Other Features
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Discover more tools in The Purple Cubby platform.
            </p>
          </div>
          <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
            {features
              .filter((f) => f.slug !== slug)
              .slice(0, 8)
              .map((f, index) => {
                const OtherIcon = f.icon;
                return (
                  <Link key={index} to={`/features/${f.slug}`}>
                    <Card className="p-4 rounded-xl border-purple-100 dark:border-gray-800 bg-white dark:bg-gray-950 hover:shadow-md hover:border-purple-300 dark:hover:border-purple-700 transition-all group cursor-pointer">
                      <div className="w-9 h-9 bg-purple-50 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mb-3 group-hover:bg-purple-100 dark:group-hover:bg-purple-900/50 transition-colors">
                        <OtherIcon className="w-5 h-5 text-purple-600" />
                      </div>
                      <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-1">
                        {f.name}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {f.description}
                      </p>
                    </Card>
                  </Link>
                );
              })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-purple-600 dark:bg-purple-700">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
            Ready to use {feature.name}?
          </h2>
          <p className="text-purple-100 text-lg mb-8">
            Join hundreds of daycare centers already running smarter with The
            Purple Cubby.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/start-free-trial">
              <Button className="bg-white text-purple-700 hover:bg-purple-50 rounded-full px-8 py-3 text-base font-semibold">
                Start Your Free Trial
              </Button>
            </Link>
            <Link to="/book-demo">
              <Button
                variant="outline"
                className="border-white text-white hover:bg-purple-500 dark:hover:bg-purple-600 rounded-full px-8 py-3 text-base"
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
