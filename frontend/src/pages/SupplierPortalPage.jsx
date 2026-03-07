import { Link } from "react-router";
import { Heart, LogOut, Bell, Package, TrendingUp, DollarSign, ShoppingCart, Truck, CheckCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function getStatusBadge(status) {
  const statusConfig = {
    pending: { bg: "bg-yellow-100", text: "text-yellow-700", icon: Clock },
    processing: { bg: "bg-blue-100", text: "text-blue-700", icon: Package },
    shipped: { bg: "bg-purple-100", text: "text-purple-700", icon: Truck },
    delivered: { bg: "bg-green-100", text: "text-green-700", icon: CheckCircle },
  };
  const config = statusConfig[status] || statusConfig.pending;
  const Icon = config.icon;
  return (
    <Badge className={`${config.bg} ${config.text} rounded-full border-none flex items-center gap-1`}>
      <Icon className="w-3 h-3" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

export function SupplierPortalPage() {
  const stats = [
    { label: "Active Orders", value: "24", icon: ShoppingCart, color: "bg-purple-100 text-purple-600", trend: "8 pending" },
    { label: "Revenue (MTD)", value: "$18,450", icon: DollarSign, color: "bg-green-100 text-green-600", trend: "+15% vs last month" },
    { label: "Products Listed", value: "142", icon: Package, color: "bg-blue-100 text-blue-600", trend: "12 new this month" },
    { label: "Schools Served", value: "18", icon: TrendingUp, color: "bg-orange-100 text-orange-600", trend: "+3 this month" },
  ];

  const orders = [
    { id: "ORD-2024-156", school: "Bright Beginnings Daycare", items: "Art Supplies Bundle", quantity: 5, total: "$245.00", status: "pending", date: "Feb 28, 2026" },
    { id: "ORD-2024-155", school: "Little Stars Academy", items: "Educational Toys Set", quantity: 3, total: "$389.00", status: "processing", date: "Feb 27, 2026" },
    { id: "ORD-2024-154", school: "Rainbow Kids Center", items: "Cleaning Supplies", quantity: 10, total: "$567.00", status: "shipped", date: "Feb 26, 2026" },
    { id: "ORD-2024-153", school: "Sunshine Childcare", items: "Outdoor Play Equipment", quantity: 2, total: "$1,250.00", status: "delivered", date: "Feb 25, 2026" },
  ];

  const products = [
    { name: "Art Supplies Bundle", category: "Creative", stock: 45, price: "$49.00", sales: 28 },
    { name: "Educational Toys Set", category: "Learning", stock: 23, price: "$129.00", sales: 15 },
    { name: "Cleaning Supplies Kit", category: "Hygiene", stock: 67, price: "$56.70", sales: 42 },
    { name: "Outdoor Play Equipment", category: "Recreation", stock: 8, price: "$625.00", sales: 6 },
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
                <p className="text-sm text-gray-500">Supplier Portal</p>
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
              <h2 className="text-3xl font-bold text-white mb-2">ABC Supply Company</h2>
              <p className="text-purple-100">Manage your orders, inventory, and customer relationships.</p>
            </div>
            <div className="flex gap-3">
              <Button className="bg-white text-purple-600 hover:bg-purple-50 rounded-full">
                <Package className="w-4 h-4 mr-2" />
                Add Product
              </Button>
              <Button className="bg-white/20 text-white border border-white/30 hover:bg-white/30 rounded-full">
                <TrendingUp className="w-4 h-4 mr-2" />
                View Analytics
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
                <p className="text-gray-600 mb-1">{stat.label}</p>
                <p className="text-sm text-purple-600">{stat.trend}</p>
              </Card>
            );
          })}
        </div>

        {/* Main Content */}
        <Tabs defaultValue="orders" className="space-y-6">
          <TabsList className="bg-white rounded-2xl p-1 shadow-sm border border-purple-100">
            <TabsTrigger value="orders" className="rounded-xl data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              Orders
            </TabsTrigger>
            <TabsTrigger value="products" className="rounded-xl data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              Products
            </TabsTrigger>
            <TabsTrigger value="customers" className="rounded-xl data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              Customers
            </TabsTrigger>
            <TabsTrigger value="analytics" className="rounded-xl data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders">
            <Card className="rounded-3xl p-6 border-purple-100">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-semibold text-gray-800">Recent Orders</h3>
                <Button variant="outline" className="border-purple-300 text-purple-700 rounded-full hover:bg-purple-50">
                  View All Orders
                </Button>
              </div>
              <div className="space-y-4">
                {orders.map((order, index) => (
                  <div key={index} className="p-4 bg-gradient-to-r from-purple-50 to-white rounded-2xl border border-purple-100">
                    <div className="flex flex-col md:flex-row justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold text-gray-800">{order.id}</h4>
                          {getStatusBadge(order.status)}
                        </div>
                        <div className="space-y-1 text-sm text-gray-600">
                          <p>🏫 {order.school}</p>
                          <p>📦 {order.items} (Qty: {order.quantity})</p>
                          <p>📅 {order.date}</p>
                        </div>
                      </div>
                      <div className="flex flex-col justify-between items-end">
                        <p className="text-2xl font-bold text-purple-600">{order.total}</p>
                        <Button variant="outline" className="border-purple-300 text-purple-700 rounded-full hover:bg-purple-50 mt-2">
                          View Details
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="products">
            <Card className="rounded-3xl p-6 border-purple-100">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-semibold text-gray-800">Product Catalog</h3>
                <Button className="bg-purple-600 hover:bg-purple-700 text-white rounded-full">
                  <Package className="w-4 h-4 mr-2" />
                  Add New Product
                </Button>
              </div>
              <div className="space-y-4">
                {products.map((product, index) => (
                  <div key={index} className="p-4 bg-gradient-to-r from-purple-50 to-white rounded-2xl border border-purple-100">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-800 text-lg mb-2">{product.name}</h4>
                        <div className="flex flex-wrap gap-3">
                          <Badge className="bg-purple-100 text-purple-700 rounded-full border-none">{product.category}</Badge>
                          <Badge className={`rounded-full border-none ${product.stock < 15 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                            Stock: {product.stock}
                          </Badge>
                          <Badge className="bg-blue-100 text-blue-700 rounded-full border-none">Sales: {product.sales}</Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="text-xl font-bold text-purple-600">{product.price}</p>
                        <Button variant="outline" className="border-purple-300 text-purple-700 rounded-full hover:bg-purple-50">
                          Edit
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="customers">
            <Card className="rounded-3xl p-6 border-purple-100">
              <h3 className="text-2xl font-semibold text-gray-800 mb-6">Customer Management</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-4 bg-purple-50 rounded-2xl">
                  <p className="text-sm text-purple-700 mb-1">Total Customers</p>
                  <p className="text-2xl font-bold text-purple-800">18</p>
                  <p className="text-sm text-gray-600 mt-1">Active schools</p>
                </div>
                <div className="p-4 bg-green-50 rounded-2xl">
                  <p className="text-sm text-green-700 mb-1">Repeat Customers</p>
                  <p className="text-2xl font-bold text-green-800">15</p>
                  <p className="text-sm text-gray-600 mt-1">83% retention rate</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-2xl">
                  <p className="text-sm text-blue-700 mb-1">New This Month</p>
                  <p className="text-2xl font-bold text-blue-800">3</p>
                  <p className="text-sm text-gray-600 mt-1">Growing network</p>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <Card className="rounded-3xl p-6 border-purple-100">
              <h3 className="text-2xl font-semibold text-gray-800 mb-6">Sales Analytics</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="p-6 bg-gradient-to-br from-purple-50 to-white rounded-2xl border border-purple-100">
                  <h4 className="font-semibold text-gray-800 mb-4">Top Selling Categories</h4>
                  <div className="space-y-3">
                    {[{ label: "Hygiene", pct: "87%", w: "w-[87%]" }, { label: "Creative", pct: "75%", w: "w-[75%]" }, { label: "Learning", pct: "62%", w: "w-[62%]" }].map((cat) => (
                      <div key={cat.label} className="flex justify-between items-center">
                        <span className="text-gray-600">{cat.label}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-32 h-2 bg-purple-100 rounded-full">
                            <div className={`${cat.w} h-2 bg-purple-600 rounded-full`}></div>
                          </div>
                          <span className="text-sm font-medium">{cat.pct}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-6 bg-gradient-to-br from-green-50 to-white rounded-2xl border border-green-100">
                  <h4 className="font-semibold text-gray-800 mb-4">Revenue Growth</h4>
                  <div className="text-center">
                    <p className="text-4xl font-bold text-green-600 mb-2">+15%</p>
                    <p className="text-gray-600">Month over month growth</p>
                    <div className="mt-4 p-3 bg-green-50 rounded-xl">
                      <p className="text-sm text-green-700">Revenue this month: <span className="font-bold">$18,450</span></p>
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
