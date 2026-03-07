import { Link } from "react-router";
import { Heart, LogOut, Bell, Building2, Users, Settings, ShieldCheck, Database, Activity, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function AdministratorPortalPage() {
  const systemStats = [
    { label: "Active Schools", value: "28", icon: Building2, color: "bg-purple-100 text-purple-600", trend: "+3 this month" },
    { label: "Total Users", value: "1,247", icon: Users, color: "bg-blue-100 text-blue-600", trend: "+156 this month" },
    { label: "System Uptime", value: "99.9%", icon: Activity, color: "bg-green-100 text-green-600", trend: "Last 30 days" },
    { label: "Active Tickets", value: "12", icon: AlertTriangle, color: "bg-orange-100 text-orange-600", trend: "3 urgent" },
  ];

  const schools = [
    { name: "Bright Beginnings Daycare", location: "New York, NY", students: 124, status: "active", lastLogin: "2 hours ago" },
    { name: "Little Stars Academy", location: "Los Angeles, CA", students: 98, status: "active", lastLogin: "5 hours ago" },
    { name: "Rainbow Kids Center", location: "Chicago, IL", students: 156, status: "active", lastLogin: "1 day ago" },
    { name: "Sunshine Childcare", location: "Houston, TX", students: 87, status: "inactive", lastLogin: "3 days ago" },
  ];

  const recentActivities = [
    { time: "5 min ago", activity: "New school registration: Happy Hearts Daycare", type: "new" },
    { time: "1 hour ago", activity: "System backup completed successfully", type: "system" },
    { time: "2 hours ago", activity: "User role updated: Sarah Johnson → School Admin", type: "user" },
    { time: "4 hours ago", activity: "Security patch deployed to all tenants", type: "security" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
      {/* Header */}
      <header className="bg-white border-b border-purple-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center">
                <Heart className="w-6 h-6 text-white" fill="white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Purple Cubbies</h1>
                <p className="text-sm text-gray-500">System Administrator Portal</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" className="text-gray-600 hover:text-purple-600 rounded-full">
                <Bell className="w-5 h-5" />
              </Button>
              <Link to="/">
                <Button variant="outline" className="border-purple-300 text-purple-700 rounded-full hover:bg-purple-50">
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Card */}
        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-3xl p-8 mb-8 shadow-lg border-none">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">System Administration Dashboard</h2>
              <p className="text-purple-100">Manage all tenants, users, and system configurations.</p>
            </div>
            <div className="flex gap-3">
              <Button className="bg-white text-purple-600 hover:bg-purple-50 rounded-full">
                <ShieldCheck className="w-4 h-4 mr-2" />
                Security Settings
              </Button>
              <Button className="bg-white/20 text-white border border-white/30 hover:bg-white/30 rounded-full">
                <Settings className="w-4 h-4 mr-2" />
                System Config
              </Button>
            </div>
          </div>
        </Card>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          {systemStats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="rounded-3xl p-6 border-purple-100">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${stat.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-800 mb-1">{stat.value}</p>
                <p className="text-gray-600 mb-1">{stat.label}</p>
                <p className="text-sm text-purple-600">{stat.trend}</p>
              </Card>
            );
          })}
        </div>

        {/* Main Content */}
        <Tabs defaultValue="schools" className="space-y-6">
          <TabsList className="bg-white rounded-2xl p-1 shadow-sm border border-purple-100">
            <TabsTrigger value="schools" className="rounded-xl data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              Schools
            </TabsTrigger>
            <TabsTrigger value="users" className="rounded-xl data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              User Management
            </TabsTrigger>
            <TabsTrigger value="system" className="rounded-xl data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              System Health
            </TabsTrigger>
            <TabsTrigger value="security" className="rounded-xl data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              Security
            </TabsTrigger>
          </TabsList>

          <TabsContent value="schools">
            <Card className="rounded-3xl p-6 border-purple-100">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-semibold text-gray-800">Registered Schools</h3>
                <Button className="bg-purple-600 hover:bg-purple-700 text-white rounded-full">
                  <Building2 className="w-4 h-4 mr-2" />
                  Add New School
                </Button>
              </div>
              <div className="space-y-4">
                {schools.map((school, index) => (
                  <div key={index} className="p-4 bg-gradient-to-r from-purple-50 to-white rounded-2xl border border-purple-100">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold text-gray-800 text-lg">{school.name}</h4>
                          <Badge className={`rounded-full border-none ${school.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>
                            {school.status}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                          <span>📍 {school.location}</span>
                          <span>👥 {school.students} students</span>
                          <span>🕐 Last login: {school.lastLogin}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" className="border-purple-300 text-purple-700 rounded-full hover:bg-purple-50">
                          View Details
                        </Button>
                        <Button variant="ghost" className="text-gray-600 hover:text-purple-600 rounded-full">
                          <Settings className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card className="rounded-3xl p-6 border-purple-100">
              <h3 className="text-2xl font-semibold text-gray-800 mb-6">User Management</h3>
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-purple-50 rounded-2xl">
                  <p className="text-sm text-purple-700 mb-1">Total Users</p>
                  <p className="text-2xl font-bold text-purple-800">1,247</p>
                  <p className="text-sm text-gray-600 mt-1">Across all schools</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-2xl">
                  <p className="text-sm text-blue-700 mb-1">Active This Month</p>
                  <p className="text-2xl font-bold text-blue-800">1,124</p>
                  <p className="text-sm text-gray-600 mt-1">90% activity rate</p>
                </div>
              </div>
              <div className="text-center p-6">
                <Users className="w-12 h-12 text-purple-600 mx-auto mb-3" />
                <Button className="bg-purple-600 hover:bg-purple-700 text-white rounded-full">
                  Manage User Roles
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="system">
            <Card className="rounded-3xl p-6 border-purple-100">
              <h3 className="text-2xl font-semibold text-gray-800 mb-6">System Health</h3>
              <div className="space-y-4">
                <div className="p-4 bg-green-50 rounded-2xl flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <div>
                      <p className="font-semibold text-gray-800">Database Status</p>
                      <p className="text-sm text-gray-600">All systems operational</p>
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-700 rounded-full border-none">Healthy</Badge>
                </div>
                <div className="p-4 bg-green-50 rounded-2xl flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <div>
                      <p className="font-semibold text-gray-800">API Services</p>
                      <p className="text-sm text-gray-600">Response time: 45ms avg</p>
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-700 rounded-full border-none">Healthy</Badge>
                </div>
                <div className="p-4 bg-yellow-50 rounded-2xl flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <div>
                      <p className="font-semibold text-gray-800">Storage Usage</p>
                      <p className="text-sm text-gray-600">78% of allocated space</p>
                    </div>
                  </div>
                  <Badge className="bg-yellow-100 text-yellow-700 rounded-full border-none">Warning</Badge>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card className="rounded-3xl p-6 border-purple-100">
              <h3 className="text-2xl font-semibold text-gray-800 mb-6">Security Overview</h3>
              <div className="space-y-4">
                <div className="p-4 bg-green-50 rounded-2xl">
                  <div className="flex items-center gap-3 mb-2">
                    <ShieldCheck className="w-6 h-6 text-green-600" />
                    <h4 className="font-semibold text-gray-800">SSL Certificates</h4>
                  </div>
                  <p className="text-sm text-gray-600">All certificates valid and up to date</p>
                </div>
                <div className="p-4 bg-green-50 rounded-2xl">
                  <div className="flex items-center gap-3 mb-2">
                    <Database className="w-6 h-6 text-green-600" />
                    <h4 className="font-semibold text-gray-800">Data Encryption</h4>
                  </div>
                  <p className="text-sm text-gray-600">AES-256 encryption active on all data</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-2xl">
                  <div className="flex items-center gap-3 mb-2">
                    <Activity className="w-6 h-6 text-purple-600" />
                    <h4 className="font-semibold text-gray-800">Last Security Audit</h4>
                  </div>
                  <p className="text-sm text-gray-600">February 15, 2026 - No issues found</p>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Recent Activity */}
        <Card className="rounded-3xl p-6 border-purple-100 mt-6">
          <h3 className="text-2xl font-semibold text-gray-800 mb-6">System Activity Log</h3>
          <div className="space-y-3">
            {recentActivities.map((activity, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-xl flex justify-between items-center">
                <div>
                  <p className="text-gray-800">{activity.activity}</p>
                  <p className="text-sm text-gray-500">{activity.time}</p>
                </div>
                <Badge className="bg-purple-100 text-purple-700 rounded-full border-none">{activity.type}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
