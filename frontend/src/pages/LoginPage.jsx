import { useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  Heart,
  ArrowLeft,
  Building2,
  Users,
  ShieldCheck,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState(null);
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    if (email && password && selectedRole) {
      navigate(`/portal/${selectedRole}`);
    }
  };

  const roles = [
    {
      id: "parent",
      label: "Parent",
      icon: Users,
      description: "Access your child's updates",
    },
    {
      id: "school",
      label: "School",
      icon: Building2,
      description: "Manage your facility",
    },
    {
      id: "administrator",
      label: "Administrator",
      icon: ShieldCheck,
      description: "System administration",
    },
    {
      id: "supplier",
      label: "Supplier",
      icon: Package,
      description: "Manage supplies & orders",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="absolute top-6 left-6">
        <Link to="/">
          <Button
            variant="ghost"
            className="text-purple-700 hover:text-purple-800 hover:bg-purple-50 rounded-full"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </Link>
      </div>

      <Card className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl p-8 border-purple-100">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-3xl flex items-center justify-center mb-4">
            <Heart className="w-10 h-10 text-white" fill="white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800">
            Welcome to Purple Cubbies
          </h1>
          <p className="text-gray-600 mt-2 text-center">
            Select your role and login to access your portal
          </p>
        </div>

        {!selectedRole ? (
          <div className="space-y-4">
            <h3 className="text-center text-gray-700 font-medium mb-6">
              I am a...
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              {roles.map((role) => {
                const Icon = role.icon;
                return (
                  <button
                    key={role.id}
                    onClick={() => setSelectedRole(role.id)}
                    className="p-6 border-2 border-purple-100 rounded-2xl hover:border-purple-400 hover:bg-purple-50 transition-all text-left group"
                  >
                    <Icon className="w-10 h-10 text-purple-600 mb-3 group-hover:scale-110 transition-transform" />
                    <h4 className="font-semibold text-gray-800 mb-1">
                      {role.label}
                    </h4>
                    <p className="text-sm text-gray-600">{role.description}</p>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="flex items-center justify-between mb-6 p-4 bg-purple-50 rounded-2xl">
              <div className="flex items-center gap-3">
                {(() => {
                  const role = roles.find((r) => r.id === selectedRole);
                  const Icon = role?.icon || Users;
                  return (
                    <>
                      <Icon className="w-6 h-6 text-purple-600" />
                      <span className="font-medium text-gray-800">
                        Logging in as {role?.label}
                      </span>
                    </>
                  );
                })()}
              </div>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setSelectedRole(null)}
                className="text-purple-600 hover:text-purple-700 text-sm"
              >
                Change
              </Button>
            </div>

            <div>
              <Label htmlFor="email" className="text-gray-700">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 rounded-xl border-gray-200 focus:border-purple-400 focus:ring-purple-400"
                required
              />
            </div>

            <div>
              <Label htmlFor="password" className="text-gray-700">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 rounded-xl border-gray-200 focus:border-purple-400 focus:ring-purple-400"
                required
              />
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center text-gray-600">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 mr-2"
                />
                Remember me
              </label>
              <a href="#" className="text-purple-600 hover:text-purple-700">
                Forgot password?
              </a>
            </div>

            <Button
              type="submit"
              className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-xl py-6"
            >
              Sign In
            </Button>
          </form>
        )}

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Need access?{" "}
            <a
              href="#"
              className="text-purple-600 hover:text-purple-700 font-medium"
            >
              Contact your administrator
            </a>
          </p>
        </div>

        <div className="mt-8 pt-6 border-t border-purple-100">
          <p className="text-sm text-gray-500 text-center">
            Secure multi-tenant access with enterprise-grade encryption
          </p>
        </div>
      </Card>

      {/* Decorative Elements */}
      <div className="fixed top-20 right-20 w-64 h-64 bg-purple-200 rounded-full blur-3xl opacity-30 pointer-events-none"></div>
      <div className="fixed bottom-20 left-20 w-64 h-64 bg-purple-300 rounded-full blur-3xl opacity-30 pointer-events-none"></div>
    </div>
  );
}
