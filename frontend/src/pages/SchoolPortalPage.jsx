import { Link } from "react-router";
import { Heart, LogOut, Bell, Users, Calendar, DollarSign, TrendingUp, Baby, Clock, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function SchoolPortalPage() {
  const stats = [
    { label: "Total Enrolled", value: "124", icon: Baby, color: "bg-purple-100 text-purple-600" },
    { label: "Staff Members", value: "18", icon: Users, color: "bg-blue-100 text-blue-600" },
    { label: "Revenue (MTD)", value: "$45,230", icon: DollarSign, color: "bg-green-100 text-green-600" },
    { label: "Attendance Rate", value: "96%", icon: TrendingUp, color: "bg-orange-100 text-orange-600" },
  ];

  const classrooms = [
    { name: "Rainbow Room", teacher: "Ms. Sarah", capacity: 15, enrolled: 14, ageGroup: "3-4 years" },
    { name: "Sunshine Room", teacher: "Mr. James", capacity: 15, enrolled: 15, ageGroup: "4-5 years" },
    { name: "Stars Room", teacher: "Ms. Emily", capacity: 12, enrolled: 11, ageGroup: "2-3 years" },
    { name: "Ocean Room", teacher: "Ms. Maria", capacity: 15, enrolled: 13, ageGroup: "5-6 years" },
  ];

  const recentActivities = [
    { time: "10 min ago", activity: "New enrollment: Emma Johnson", type: "enrollment" },
    { time: "1 hour ago", activity: "Payment received: $850 from Smith family", type: "payment" },
    { time: "2 hours ago", activity: "Staff update: New teaching assistant hired", type: "staff" },
    { time: "3 hours ago", activity: "Inventory alert: Art supplies running low", type: "alert" },
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
                <p className="text-sm text-gray-500">School Management Portal</p>
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
              <h2 className="text-3xl font-bold text-white mb-2">Bright Beginnings Daycare</h2>
              <p className="text-purple-100">Welcome back! Here's what's happening today.</p>
            </div>
            <div className="flex gap-3">
              <Button className="bg-white text-purple-600 hover:bg-purple-50 rounded-full">
                <Users className="w-4 h-4 mr-2" />
                Manage Staff
              </Button>
              <Button className="bg-white/20 text-white border border-white/30 hover:bg-white/30 rounded-full">
                <Calendar className="w-4 h-4 mr-2" />
                View Calendar
              </Button>
            </div>
          </div>
        </Card>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="rounded-3xl p-6 border-purple-100">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${stat.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-800 mb-1">{stat.value}</p>
                <p className="text-gray-600">{stat.label}</p>
              </Card>
            );
          })}
        </div>

        {/* Main Content */}
        <Tabs defaultValue="classrooms" className="space-y-6">
          <TabsList className="bg-white rounded-2xl p-1 shadow-sm border border-purple-100">
            <TabsTrigger value="classrooms" className="rounded-xl data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              Classrooms
            </TabsTrigger>
            <TabsTrigger value="enrollment" className="rounded-xl data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              Enrollment
            </TabsTrigger>
            <TabsTrigger value="billing" className="rounded-xl data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              Billing
            </TabsTrigger>
            <TabsTrigger value="reports" className="rounded-xl data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              Reports
            </TabsTrigger>
          </TabsList>

          <TabsContent value="classrooms">
            <Card className="rounded-3xl p-6 border-purple-100">
              <h3 className="text-2xl font-semibold text-gray-800 mb-6">Classroom Overview</h3>
              <div className="space-y-4">
                {classrooms.map((classroom, index) => (
                  <div key={index} className="p-4 bg-gradient-to-r from-purple-50 to-white rounded-2xl border border-purple-100">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-800 text-lg mb-1">{classroom.name}</h4>
                        <div className="flex flex-wrap gap-3 mt-2">
                          <Badge className="bg-purple-100 text-purple-700 rounded-full border-none">
                            {classroom.teacher}
                          </Badge>
                          <Badge className="bg-gray-100 text-gray-700 rounded-full border-none">
                            {classroom.ageGroup}
                          </Badge>
                          <Badge className={`rounded-full border-none ${classroom.enrolled >= classroom.capacity ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                            {classroom.enrolled}/{classroom.capacity} enrolled
                          </Badge>
                        </div>
                      </div>
                      <Button variant="outline" className="border-purple-300 text-purple-700 rounded-full hover:bg-purple-50">
                        <MessageSquare className="w-4 h-4 mr-2" />
                        View Details
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="enrollment">
            <Card className="rounded-3xl p-6 border-purple-100">
              <h3 className="text-2xl font-semibold text-gray-800 mb-6">Enrollment Management</h3>
              <div className="p-6 bg-purple-50 rounded-2xl text-center">
                <Users className="w-12 h-12 text-purple-600 mx-auto mb-3" />
                <h4 className="font-semibold text-gray-800 mb-2">Manage Enrollments</h4>
                <p className="text-gray-600 mb-4">Add new students, manage waitlists, and process applications.</p>
                <Button className="bg-purple-600 hover:bg-purple-700 text-white rounded-full">
                  New Enrollment
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="billing">
            <Card className="rounded-3xl p-6 border-purple-100">
              <h3 className="text-2xl font-semibold text-gray-800 mb-6">Billing & Payments</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-4 bg-green-50 rounded-2xl">
                  <p className="text-sm text-green-700 mb-1">Collected This Month</p>
                  <p className="text-2xl font-bold text-green-800">$45,230</p>
                </div>
                <div className="p-4 bg-orange-50 rounded-2xl">
                  <p className="text-sm text-orange-700 mb-1">Outstanding</p>
                  <p className="text-2xl font-bold text-orange-800">$8,450</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-2xl">
                  <p className="text-sm text-blue-700 mb-1">Expected Revenue</p>
                  <p className="text-2xl font-bold text-blue-800">$62,000</p>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="reports">
            <Card className="rounded-3xl p-6 border-purple-100">
              <h3 className="text-2xl font-semibold text-gray-800 mb-6">Reports & Analytics</h3>
              <div className="p-6 bg-purple-50 rounded-2xl text-center">
                <TrendingUp className="w-12 h-12 text-purple-600 mx-auto mb-3" />
                <h4 className="font-semibold text-gray-800 mb-2">Generate Reports</h4>
                <p className="text-gray-600 mb-4">Access attendance, revenue, and operational reports.</p>
                <Button className="bg-purple-600 hover:bg-purple-700 text-white rounded-full">
                  View Reports
                </Button>
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Recent Activity */}
        <Card className="rounded-3xl p-6 border-purple-100 mt-6">
          <h3 className="text-2xl font-semibold text-gray-800 mb-6">Recent Activity</h3>
          <div className="space-y-3">
            {recentActivities.map((activity, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-xl flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-gray-800">{activity.activity}</p>
                    <p className="text-sm text-gray-500">{activity.time}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
