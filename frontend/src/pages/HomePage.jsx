import { useState } from "react";
import { Link } from "react-router";
import {
  Clock,
  Shield,
  Zap,
  Star,
  ArrowRight,
  CheckCircle2,
  Moon,
  Sun,
  Menu,
  X,
} from "lucide-react";
import { features } from "./features/featureData";
import { pricingPlans } from "./pricing/pricingData";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/context/ThemeContext";

export function HomePage() {
  const { isDark, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const navItems = [
    { label: "Workflows", href: "#tools" },
    { label: "Pricing", href: "#pricing" },
    { label: "Customers", href: "#customers" },
  ];

  const closeMenu = () => setMenuOpen(false);

  const valueProps = [
    {
      title: "Save 10+ hours per week on admin work",
      description:
        "Automate repetitive tasks and focus on what matters most - the children.",
    },
    {
      title: "All communication with parents in one place",
      description:
        "Messages, photos, updates, and announcements in a unified platform.",
    },
    {
      title: "Automated billing and payments",
      description:
        "Set it and forget it - automatic invoicing and payment collection.",
    },
    {
      title: "Real-time attendance and classroom ratio tracking",
      description:
        "Stay compliant with instant visibility into classroom ratios.",
    },
  ];

  const testimonials = [
    {
      quote:
        "The Purple Cubby has transformed how we run our daycare. We've saved countless hours on paperwork and parents love the daily updates!",
      author: "Sarah Johnson",
      role: "Director, Bright Beginnings Daycare",
      rating: 5,
    },
    {
      quote:
        "Finally, a platform built for daycare operations. The enrollment process is seamless and billing is completely automated.",
      author: "Michael Chen",
      role: "Owner, Little Stars Academy",
      rating: 5,
    },
    {
      quote:
        "Our teachers spend less time on admin and more time with the children. The parent communication features are incredible.",
      author: "Emma Rodriguez",
      role: "Administrator, Rainbow Kids Center",
      rating: 5,
    },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 transition-colors duration-200">
      {/* Header */}
      <header className="bg-white/95 dark:bg-gray-950/95 backdrop-blur-sm border-b border-purple-100 dark:border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <Link to="/" onClick={closeMenu}>
              <img
                src="/logo.png"
                alt="The Purple Cubby"
                className="h-20 w-auto"
                style={{
                  filter: isDark
                    ? "brightness(1) drop-shadow(0 0 0 transparent)"
                    : "none",
                }}
              />
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-6">
              {navItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="text-gray-500 dark:text-gray-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors text-sm font-medium"
                >
                  {item.label}
                </a>
              ))}
            </nav>

            {/* Actions */}
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
              <Link to="/book-demo" className="hidden sm:block">
                <Button
                  variant="outline"
                  className="rounded-xl border-purple-200 dark:border-gray-700 text-purple-700 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-gray-800 dark:bg-transparent text-sm"
                >
                  Book Demo
                </Button>
              </Link>
              <Link to="/start-free-trial" className="hidden sm:block">
                <Button className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm px-4">
                  Free Trial
                </Button>
              </Link>
              {/* Hamburger — mobile only */}
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="md:hidden w-9 h-9 flex items-center justify-center rounded-xl border border-purple-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-purple-50 dark:hover:bg-gray-800 transition-colors"
                aria-label="Toggle menu"
              >
                {menuOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-purple-100 dark:border-gray-800 bg-white dark:bg-gray-950 px-4 py-4 flex flex-col gap-3">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={closeMenu}
                className="text-gray-700 dark:text-gray-300 hover:text-purple-700 dark:hover:text-purple-400 font-medium py-2 border-b border-gray-100 dark:border-gray-800 last:border-0"
              >
                {item.label}
              </a>
            ))}
            <div className="flex gap-3 pt-2">
              <Link to="/book-demo" onClick={closeMenu} className="flex-1">
                <Button
                  variant="outline"
                  className="w-full rounded-xl border-purple-200 dark:border-gray-700 text-purple-700 dark:text-purple-400"
                >
                  Book Demo
                </Button>
              </Link>
              <Link
                to="/start-free-trial"
                onClick={closeMenu}
                className="flex-1"
              >
                <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-xl">
                  Free Trial
                </Button>
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative w-full overflow-hidden">
        {/* Full-width image */}
        <img
          src="/hero-daycare.jpg"
          alt="Teacher playing with children at daycare"
          className="w-full h-[60vh] sm:h-[70vh] lg:h-[80vh] object-cover object-center"
        />
        {/* Overlay — stronger on mobile for readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/50 to-black/10" />
        {/* Text content */}
        <div className="absolute inset-0 flex items-center">
          <div className="w-full px-5 sm:px-8 lg:px-16 xl:px-24">
            <div className="max-w-xs sm:max-w-sm lg:max-w-lg">
              <div className="inline-block mb-3 bg-purple-600/90 text-white rounded-full px-3 py-1 text-xs sm:text-sm font-semibold">
                Trusted by 500+ Daycare Centers
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight">
                Less admin.
                <br />
                More time with the kids.
              </h2>
              <p className="text-sm sm:text-base text-gray-200 mb-6 leading-relaxed">
                The all-in-one platform built for daycares and schools.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link to="/start-free-trial">
                  <Button className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl px-5 py-2.5 text-sm sm:text-base">
                    Start Free Trial
                    <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                </Link>
                <Link to="/book-demo">
                  <Button
                    variant="outline"
                    className="border-white text-white rounded-xl px-5 py-2.5 text-sm sm:text-base hover:bg-white/10 bg-transparent"
                  >
                    Book a Demo
                  </Button>
                </Link>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-purple-400 flex-shrink-0" />
                  <span className="text-xs sm:text-sm text-gray-200">
                    No credit card required
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-purple-400 flex-shrink-0" />
                  <span className="text-xs sm:text-sm text-gray-200">
                    14-day free trial
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Value Proposition */}
      <section id="features" className="bg-gray-50 dark:bg-gray-900 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-800 dark:text-white mb-4">
              Why Daycare Centers Love Us
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Join hundreds of centers already saving time and delighting
              parents
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {valueProps.map((prop, index) => (
              <Card
                key={index}
                className="p-6 border-purple-100 dark:border-gray-800 hover:shadow-lg transition-all rounded-2xl bg-white dark:bg-gray-950"
              >
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/40 rounded-xl flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
                      {prop.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      {prop.description}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features Overview */}
      <section id="tools" className="py-20 bg-white dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-800 dark:text-white mb-4">
              Everything You Need in One Platform
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Comprehensive tools designed specifically for daycare operations
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Link key={index} to={`/features/${feature.slug}`}>
                <Card className="p-6 border-purple-100 dark:border-gray-800 hover:shadow-lg transition-all rounded-2xl bg-white dark:bg-gray-900 group hover:border-purple-300 dark:hover:border-purple-700 cursor-pointer h-full">
                  <div className="w-14 h-14 bg-purple-50 dark:bg-purple-900/30 rounded-xl flex items-center justify-center mb-4 group-hover:bg-purple-100 dark:group-hover:bg-purple-900/50 transition-colors">
                    <feature.icon className="w-7 h-7 text-purple-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                    {feature.name}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    {feature.description}
                  </p>
                  <div className="mt-3 flex items-center gap-1 text-purple-600 dark:text-purple-400 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    Learn more <ArrowRight className="w-3 h-3" />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="customers" className="py-20 bg-white dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-800 dark:text-white mb-4">
              Loved by Daycare Professionals
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              See what our customers have to say about their experience
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <Card
                key={index}
                className="p-6 border-purple-100 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-900"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-5 h-5 text-yellow-500 fill-yellow-500"
                    />
                  ))}
                </div>
                <p className="text-gray-700 dark:text-gray-300 mb-6 italic">
                  "{testimonial.quote}"
                </p>
                <div>
                  <p className="font-semibold text-gray-800 dark:text-white">
                    {testimonial.author}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {testimonial.role}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-gray-50 dark:bg-gray-900 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-800 dark:text-white mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Pay per student. No flat fees. Scale up or down as your center
              grows.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {pricingPlans.map((plan, index) => (
              <Card
                key={index}
                className={`p-7 rounded-2xl relative flex flex-col ${
                  plan.popular
                    ? "border-purple-500 border-2 shadow-xl bg-purple-600 text-white"
                    : "border-purple-100 dark:border-gray-800 bg-white dark:bg-gray-950"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white text-purple-700 rounded-full px-4 py-0.5 text-xs font-bold shadow">
                    Most Popular
                  </div>
                )}
                <h3
                  className={`text-xl font-bold mb-1 ${plan.popular ? "text-white" : "text-gray-800 dark:text-white"}`}
                >
                  {plan.name}
                </h3>
                <p
                  className={`text-xs mb-4 ${plan.popular ? "text-purple-200" : "text-gray-500 dark:text-gray-400"}`}
                >
                  {plan.target}
                </p>
                <div className="mb-5">
                  {plan.monthlyPerStudent === null ? (
                    <p
                      className={`text-3xl font-bold ${plan.popular ? "text-white" : "text-gray-800 dark:text-white"}`}
                    >
                      Custom
                    </p>
                  ) : plan.monthlyPerStudent === 0 ? (
                    <p
                      className={`text-3xl font-bold ${plan.popular ? "text-white" : "text-gray-800 dark:text-white"}`}
                    >
                      Free
                    </p>
                  ) : (
                    <div>
                      <span
                        className={`text-3xl font-bold ${plan.popular ? "text-white" : "text-gray-800 dark:text-white"}`}
                      >
                        ${plan.monthlyPerStudent}
                      </span>
                      <span
                        className={`text-xs ml-1 ${plan.popular ? "text-purple-200" : "text-gray-500 dark:text-gray-400"}`}
                      >
                        /student/mo
                      </span>
                      {plan.yearlyDiscount && (
                        <p className="text-xs text-green-400 mt-1">
                          {plan.yearlyDiscount}% off with annual plan
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <ul
                  className={`space-y-2 mb-6 flex-1 text-sm ${
                    plan.popular
                      ? "text-purple-100"
                      : "text-gray-600 dark:text-gray-400"
                  }`}
                >
                  {plan.features.slice(0, 5).map((feature, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2
                        className={`w-4 h-4 mt-0.5 flex-shrink-0 ${plan.popular ? "text-white" : "text-purple-600"}`}
                      />
                      <span>{feature}</span>
                    </li>
                  ))}
                  {plan.features.length > 5 && (
                    <li
                      className={`text-xs ${plan.popular ? "text-purple-200" : "text-gray-400 dark:text-gray-500"}`}
                    >
                      +{plan.features.length - 5} more features
                    </li>
                  )}
                </ul>
                <Link to={`/pricing/${plan.slug}`}>
                  <Button
                    className={`w-full rounded-xl ${
                      plan.popular
                        ? "bg-white text-purple-700 hover:bg-purple-50"
                        : "bg-purple-600 hover:bg-purple-700 text-white"
                    }`}
                  >
                    {plan.monthlyPerStudent === null
                      ? "Contact Sales"
                      : plan.monthlyPerStudent === 0
                        ? "Get Started Free"
                        : "Start Free Trial"}
                  </Button>
                </Link>
              </Card>
            ))}
          </div>
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-8">
            All paid plans include a 14-day free trial. No credit card required
            for Free plan.
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="bg-purple-600 rounded-3xl p-12 text-center shadow-2xl border-none">
            <h2 className="text-4xl lg:text-5xl font-bold text-white mb-4">
              Ready to simplify daycare management?
            </h2>
            <p className="text-purple-100 text-xl mb-8 max-w-2xl mx-auto">
              Join hundreds of daycare centers already using The Purple Cubby to
              save time and improve operations.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link to="/start-free-trial">
                <Button
                  size="lg"
                  className="bg-white text-purple-600 hover:bg-purple-50 rounded-xl px-8 py-6 text-lg"
                >
                  Start Free Trial
                </Button>
              </Link>
              <Link to="/book-demo">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white/10 rounded-xl px-8 py-6 text-lg bg-transparent"
                >
                  Book a Demo
                </Button>
              </Link>
            </div>
            <div className="mt-6 flex items-center justify-center gap-6 text-purple-200">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                <span className="text-sm">Setup in minutes</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                <span className="text-sm">Secure & compliant</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                <span className="text-sm">No credit card needed</span>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer
        id="contact"
        className="bg-gray-50 dark:bg-gray-900 border-t border-purple-100 dark:border-gray-800 py-12"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="mb-4">
                <img
                  src="/logo.png"
                  alt="The Purple Cubby"
                  className="h-16 w-auto"
                />
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                The complete daycare management platform for modern childcare
                centers.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-800 dark:text-white mb-4">
                Product
              </h4>
              <ul className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                <li>
                  <a
                    href="#features"
                    className="hover:text-gray-800 dark:hover:text-white"
                  >
                    Features
                  </a>
                </li>
                <li>
                  <a
                    href="#workflows"
                    className="hover:text-gray-800 dark:hover:text-white"
                  >
                    Workflows
                  </a>
                </li>
                <li>
                  <a
                    href="#pricing"
                    className="hover:text-gray-800 dark:hover:text-white"
                  >
                    Pricing
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-800 dark:text-white mb-4">
                Company
              </h4>
              <ul className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                <li>
                  <a
                    href="#"
                    className="hover:text-gray-800 dark:hover:text-white"
                  >
                    About
                  </a>
                </li>
                <li>
                  <a
                    href="#customers"
                    className="hover:text-gray-800 dark:hover:text-white"
                  >
                    Customers
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-gray-800 dark:hover:text-white"
                  >
                    Contact
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-800 dark:text-white mb-4">
                Support
              </h4>
              <ul className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                <li>
                  <a
                    href="#"
                    className="hover:text-gray-800 dark:hover:text-white"
                  >
                    Help Center
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-gray-800 dark:hover:text-white"
                  >
                    Documentation
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-gray-800 dark:hover:text-white"
                  >
                    Privacy Policy
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-purple-100 dark:border-gray-800 pt-8 text-center text-gray-500 dark:text-gray-400 text-sm">
            <p>
              © 2026 The Purple Cubby. All rights reserved. Built with ❤️ for
              daycare professionals.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
