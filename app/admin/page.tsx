import { createServiceClient } from "@/lib/supabase-server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, ShoppingCart, Calendar, IndianRupee } from "lucide-react"
import Link from "next/link"

export const revalidate = 0 // Never cache the admin dashboard stats

export default async function AdminDashboard() {
  const supabase = createServiceClient()

  // Wait for all aggregations
  const [
    { count: productsCount },
    { count: ordersCount, data: orders },
    { count: bookingsCount, data: bookings },
    { count: artistsCount }
  ] = await Promise.all([
    supabase.from('products').select('*', { count: 'exact', head: true }).eq('is_deleted', false),
    supabase.from('orders').select('*', { count: 'exact' }),
    supabase.from('bookings').select('*', { count: 'exact' }),
    supabase.from('artists').select('*', { count: 'exact', head: true })
  ])

  const totalRevenue = orders?.filter(o => o.status === 'paid' || o.status === 'delivered')
    .reduce((sum, order) => sum + (Number(order.total) || 0), 0) || 0
    
  const pendingBookings = bookings?.filter(b => b.status === 'pending').length || 0

  return (
    <>
      <h1 className="font-display text-4xl font-bold mb-8">System Overview</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <Card className="bg-surfaceLighter">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-mutedText">Total Revenue</CardTitle>
            <IndianRupee className="w-4 h-4 text-neon-cyan" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">₹{totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-mutedText mt-1">From confirmed orders</p>
          </CardContent>
        </Card>

        <Card className="bg-surfaceLighter">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-mutedText">Total Orders</CardTitle>
            <ShoppingCart className="w-4 h-4 text-neon-purple" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{ordersCount || 0}</div>
            <p className="text-xs text-mutedText mt-1">All time orders</p>
          </CardContent>
        </Card>

        <Card className="bg-surfaceLighter">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-mutedText">Pending Bookings</CardTitle>
            <Calendar className="w-4 h-4 text-danger" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{pendingBookings}</div>
            <p className="text-xs text-mutedText mt-1">out of {bookingsCount || 0} total requests</p>
          </CardContent>
        </Card>

        <Card className="bg-surfaceLighter">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-mutedText">Active Products</CardTitle>
            <Package className="w-4 h-4 text-neon-green" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{productsCount || 0}</div>
            <p className="text-xs text-mutedText mt-1">In store catalog</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Recent Orders */}
        <div className="bg-surface border border-borderDark rounded overflow-hidden">
          <div className="p-6 border-b border-borderDark flex justify-between items-center">
            <h2 className="font-display font-bold text-xl">Recent Orders</h2>
            <Link href="/admin/orders" className="text-neon-cyan text-sm">View All</Link>
          </div>
          <div className="divide-y divide-borderDark">
            {orders?.slice(0, 5).map(order => (
              <div key={order.id} className="p-6 flex justify-between items-center hover:bg-surfaceLighter transition-colors">
                <div>
                  <p className="font-medium text-sm text-primaryText mb-1">{order.customer_name}</p>
                  <p className="text-xs font-mono text-mutedText">ID: {order.id.slice(0,8)}</p>
                </div>
                <div className="text-right">
                  <span className={`inline-block px-2 py-1 text-[10px] uppercase font-bold rounded mb-2 ${
                    order.status === 'paid' ? 'bg-neon-green text-black' :
                    order.status === 'pending' ? 'bg-warning/20 text-warning' :
                    'bg-borderDark text-white'
                  }`}>
                    {order.status}
                  </span>
                  <p className="text-sm font-mono text-primaryText">₹{order.total}</p>
                </div>
              </div>
            ))}
            {(!orders || orders.length === 0) && (
             <div className="p-6 text-center text-mutedText text-sm">No recent orders.</div>
            )}
          </div>
        </div>

        {/* Recent Bookings */}
        <div className="bg-surface border border-borderDark rounded overflow-hidden">
          <div className="p-6 border-b border-borderDark flex justify-between items-center">
            <h2 className="font-display font-bold text-xl">Recent Booking Requests</h2>
            <Link href="/admin/bookings" className="text-neon-cyan text-sm">View All</Link>
          </div>
          <div className="divide-y divide-borderDark">
            {bookings?.slice(0, 5).map(booking => (
              <div key={booking.id} className="p-6 hover:bg-surfaceLighter transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <p className="font-medium text-sm text-primaryText">{booking.name}</p>
                  <span className={`inline-block px-2 py-1 text-[10px] uppercase font-bold rounded ${
                    booking.status === 'pending' ? 'bg-danger/20 text-danger border border-danger/50' :
                    'bg-borderDark text-mutedText'
                  }`}>
                    {booking.status}
                  </span>
                </div>
                <p className="text-xs text-mutedText mb-3">"{booking.style}" preferred</p>
                <div className="text-xs text-mutedText line-clamp-2 italic border-l-2 border-borderDark pl-3">
                  {booking.description}
                </div>
              </div>
            ))}
            {(!bookings || bookings.length === 0) && (
             <div className="p-6 text-center text-mutedText text-sm">No recent booking requests.</div>
            )}
          </div>
        </div>

      </div>
    </>
  )
}
