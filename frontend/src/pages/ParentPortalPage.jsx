import { useState } from "react";
import { Link } from "react-router";
import { Heart, LogOut, Calendar, Image, Bell, MessageSquare, Clock, Apple, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageWithFallback } from "@/components/figma/ImageWithFallback";

export function ParentPortalPage() {
  const [selectedChild] = useState({
    name: "Emma",
    age: 4,
    classroom: "Rainbow Room",
    teacher: "Ms. Sarah",
    avatar: "https://images.unsplash.com/photo-1549737221-bef65e2604a6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  });

  const todayActivities = [
    { time: "9:00 AM", icon: Sun, activity: "Morning Circle Time", description: "Emma participated in show and tell!" },
    { time: "10:30 AM", icon: Apple, activity: "Snack Time", description: "Apple slices and crackers - ate well!" },
    { time: "11:00 AM", icon: Image, activity: "Art & Crafts", description: "Created a beautiful painting" },
    { time: "12:30 PM", icon: Apple, activity: "Lunch", description: "Mac & cheese, carrots, and milk" },
    { time: "1:30 PM", icon: Moon, activity: "Nap Time", description: "Slept for 1 hour" },
  ];

  const recentPhotos = [
    "https://images.unsplash.com/photo-1770648037680-588368f4da49?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
    "https://images.unsplash.com/photo-1761208663763-c4d30657c910?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
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
                <p className="text-sm text-gray-500">Parent Portal</p>
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
        {/* Child Info Card */}
        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-3xl p-8 mb-8 shadow-lg border-none">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-lg">
              <ImageWithFallback
                src={selectedChild.avatar}
                alt={selectedChild.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="text-center md:text-left flex-1">
              <h2 className="text-3xl font-bold text-white mb-2">{selectedChild.name}</h2>
              <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                <Badge className="bg-white/20 text-white border border-white/30 rounded-full px-4 py-1">
                  {selectedChild.age} years old
                </Badge>
                <Badge className="bg-white/20 text-white border border-white/30 rounded-full px-4 py-1">
                  {selectedChild.classroom}
                </Badge>
                <Badge className="bg-white/20 text-white border border-white/30 rounded-full px-4 py-1">
                  Teacher: {selectedChild.teacher}
                </Badge>
              </div>
            </div>
            <div className="flex gap-3">
              <Button className="bg-white text-purple-600 hover:bg-purple-50 rounded-full">
                <MessageSquare className="w-4 h-4 mr-2" />
                Message Teacher
              </Button>
            </div>
          </div>
        </Card>

        {/* Main Content */}
        <Tabs defaultValue="today" className="space-y-6">
          <TabsList className="bg-white rounded-2xl p-1 shadow-sm border border-purple-100">
            <TabsTrigger value="today" className="rounded-xl data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              Today's Updates
            </TabsTrigger>
            <TabsTrigger value="photos" className="rounded-xl data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              Photos & Media
            </TabsTrigger>
            <TabsTrigger value="schedule" className="rounded-xl data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              Schedule
            </TabsTrigger>
            <TabsTrigger value="milestones" className="rounded-xl data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              Milestones
            </TabsTrigger>
          </TabsList>

          <TabsContent value="today">
            <div className="grid md:grid-cols-3 gap-6">
              {/* Timeline */}
              <div className="md:col-span-2">
                <Card className="rounded-3xl p-6 border-purple-100">
                  <h3 className="text-2xl font-semibold text-gray-800 mb-6">Today's Timeline</h3>
                  <div className="space-y-6">
                    {todayActivities.map((item, index) => {
                      const Icon = item.icon;
                      return (
                        <div key={index} className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center">
                              <Icon className="w-6 h-6 text-purple-600" />
                            </div>
                            {index < todayActivities.length - 1 && (
                              <div className="w-0.5 h-full bg-purple-200 my-2"></div>
                            )}
                          </div>
                          <div className="flex-1 pb-6">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm text-purple-600 font-medium">{item.time}</span>
                            </div>
                            <h4 className="font-semibold text-gray-800 mb-1">{item.activity}</h4>
                            <p className="text-gray-600">{item.description}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </div>

              {/* Quick Stats */}
              <div className="space-y-6">
                <Card className="rounded-3xl p-6 border-purple-100 bg-gradient-to-br from-purple-50 to-white">
                  <h3 className="font-semibold text-gray-800 mb-4">Today's Summary</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Mood</span>
                      <span className="text-2xl">😊</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Meals</span>
                      <Badge className="bg-purple-600 text-white rounded-full border-none">3/3</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Nap Time</span>
                      <Badge className="bg-purple-600 text-white rounded-full border-none">1 hour</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Activities</span>
                      <Badge className="bg-purple-600 text-white rounded-full border-none">5</Badge>
                    </div>
                  </div>
                </Card>

                <Card className="rounded-3xl p-6 border-purple-100">
                  <h3 className="font-semibold text-gray-800 mb-4">Upcoming Events</h3>
                  <div className="space-y-3">
                    <div className="p-3 bg-purple-50 rounded-xl">
                      <div className="flex items-start gap-3">
                        <Calendar className="w-5 h-5 text-purple-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-gray-800">Field Trip</p>
                          <p className="text-sm text-gray-600">March 5th - Petting Zoo</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-3 bg-purple-50 rounded-xl">
                      <div className="flex items-start gap-3">
                        <Calendar className="w-5 h-5 text-purple-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-gray-800">Parent Meeting</p>
                          <p className="text-sm text-gray-600">March 10th - 5:00 PM</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="photos">
            <Card className="rounded-3xl p-6 border-purple-100">
              <h3 className="text-2xl font-semibold text-gray-800 mb-6">Recent Photos</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {recentPhotos.map((photo, index) => (
                  <div key={index} className="aspect-square rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-shadow cursor-pointer">
                    <ImageWithFallback
                      src={photo}
                      alt={`Activity photo ${index + 1}`}
                      className="w-full h-full object-cover hover:scale-105 transition-transform"
                    />
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="schedule">
            <Card className="rounded-3xl p-6 border-purple-100">
              <h3 className="text-2xl font-semibold text-gray-800 mb-6">Weekly Schedule</h3>
              <div className="p-4 bg-purple-50 rounded-2xl">
                <h4 className="font-semibold text-purple-800 mb-2">Monday - Friday</h4>
                <div className="grid gap-2 text-gray-600">
                  <div className="flex justify-between">
                    <span>Drop-off</span>
                    <span className="font-medium">7:30 AM - 9:00 AM</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pick-up</span>
                    <span className="font-medium">4:00 PM - 6:00 PM</span>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="milestones">
            <Card className="rounded-3xl p-6 border-purple-100">
              <h3 className="text-2xl font-semibold text-gray-800 mb-6">Recent Milestones</h3>
              <div className="space-y-4">
                <div className="p-4 bg-gradient-to-r from-purple-50 to-white rounded-2xl border border-purple-100">
                  <div className="flex items-start gap-4">
                    <div className="w-3 h-3 bg-purple-600 rounded-full mt-2"></div>
                    <div>
                      <h4 className="font-semibold text-gray-800">Learned to Write Name</h4>
                      <p className="text-gray-600 mt-1">Emma successfully wrote her name independently for the first time!</p>
                      <p className="text-sm text-purple-600 mt-2">February 20, 2026</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-gradient-to-r from-purple-50 to-white rounded-2xl border border-purple-100">
                  <div className="flex items-start gap-4">
                    <div className="w-3 h-3 bg-purple-600 rounded-full mt-2"></div>
                    <div>
                      <h4 className="font-semibold text-gray-800">Social Skills Progress</h4>
                      <p className="text-gray-600 mt-1">Great improvement in sharing and taking turns with friends.</p>
                      <p className="text-sm text-purple-600 mt-2">February 15, 2026</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
