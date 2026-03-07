import { Link } from "react-router";
import { Heart, Users, Calendar, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ImageWithFallback } from "@/components/figma/ImageWithFallback";

export function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-purple-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center">
                <Heart className="w-6 h-6 text-white" fill="white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-800">Purple Cubbies</h1>
            </div>
            <Link to="/login">
              <Button className="bg-purple-600 hover:bg-purple-700 text-white rounded-full px-6">
                Login
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-5xl font-bold text-gray-800 mb-6">
              Complete Daycare Management System
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              A comprehensive system connecting schools, parents, administrators, and suppliers.
              Streamline operations and enhance communication across your entire daycare ecosystem.
            </p>
            <div className="flex gap-4">
              <Link to="/login">
                <Button className="bg-purple-600 hover:bg-purple-700 text-white rounded-full px-8 py-6 text-lg">
                  Get Started
                </Button>
              </Link>
              <Button variant="outline" className="border-purple-300 text-purple-700 rounded-full px-8 py-6 text-lg hover:bg-purple-50">
                Learn More
              </Button>
            </div>
          </div>
          <div className="relative">
            <div className="rounded-3xl overflow-hidden shadow-2xl">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1761208663763-c4d30657c910?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080"
                alt="Happy children playing at daycare"
                className="w-full h-auto"
              />
            </div>
            <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-purple-200 rounded-full blur-3xl opacity-50"></div>
            <div className="absolute -top-6 -left-6 w-32 h-32 bg-purple-300 rounded-full blur-3xl opacity-50"></div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-4xl font-bold text-center text-gray-800 mb-4">
          Why Choose Purple Cubbies?
        </h2>
        <p className="text-xl text-gray-600 text-center mb-12">
          A complete solution for every stakeholder in your daycare community
        </p>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <Card className="p-6 border-purple-100 hover:shadow-lg transition-shadow bg-white rounded-3xl">
            <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Multi-Tenant Access</h3>
            <p className="text-gray-600">
              Dedicated portals for schools, parents, administrators, and suppliers with role-based permissions.
            </p>
          </Card>

          <Card className="p-6 border-purple-100 hover:shadow-lg transition-shadow bg-white rounded-3xl">
            <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center mb-4">
              <Calendar className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Centralized Dashboard</h3>
            <p className="text-gray-600">
              Manage enrollment, scheduling, billing, and inventory all in one powerful platform.
            </p>
          </Card>

          <Card className="p-6 border-purple-100 hover:shadow-lg transition-shadow bg-white rounded-3xl">
            <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center mb-4">
              <Heart className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Enhanced Communication</h3>
            <p className="text-gray-600">
              Real-time updates and messaging between all stakeholders keeps everyone connected.
            </p>
          </Card>

          <Card className="p-6 border-purple-100 hover:shadow-lg transition-shadow bg-white rounded-3xl">
            <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center mb-4">
              <Shield className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Enterprise Security</h3>
            <p className="text-gray-600">
              Bank-level encryption and security protocols protect sensitive data across all tenants.
            </p>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-3xl p-12 text-center shadow-xl border-none">
          <h2 className="text-4xl font-bold text-white mb-4">
            Ready to Streamline Your Operations?
          </h2>
          <p className="text-purple-100 text-xl mb-8">
            Join hundreds of daycare facilities using Purple Cubbies to manage their entire ecosystem.
          </p>
          <Link to="/login">
            <Button className="bg-white text-purple-600 hover:bg-purple-50 rounded-full px-8 py-6 text-lg">
              Get Started Now
            </Button>
          </Link>
        </Card>
      </section>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-purple-100 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-600">
            <p>© 2026 Purple Cubbies. Complete daycare management for the modern age.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
