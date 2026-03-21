import { createSSRClient } from "@/lib/supabase-server"
import Link from "next/link"
import { Eye } from "lucide-react"
import { Button } from "@/components/ui/button"

export const revalidate = 0

export default async function AdminBookingsPage() {
  const supabase = await createSSRClient()
  const { data: bookings } = await supabase
    .from("bookings")
    .select("*")
    .order("created_at", { ascending: false })

  return (
    <div>
      <div className="flex justify-between items-center mb-8 pb-4 border-b border-borderDark">
        <h1 className="font-display text-3xl font-bold">Booking Requests</h1>
      </div>

      <div className="bg-surface border border-borderDark rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surfaceLighter border-b border-borderDark text-xs uppercase tracking-wider text-mutedText font-mono">
                <th className="p-4 font-medium">Date Rcvd</th>
                <th className="p-4 font-medium">Client</th>
                <th className="p-4 font-medium">Style</th>
                <th className="p-4 font-medium">Date Pref</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borderDark text-sm">
              {bookings && bookings.length > 0 ? (
                bookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-surfaceLighter/50 transition-colors">
                    <td className="p-4 font-mono text-mutedText text-xs">
                      {new Date(booking.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <p className="font-medium text-primaryText">{booking.name}</p>
                      <p className="text-xs text-mutedText">{booking.email}</p>
                    </td>
                    <td className="p-4 font-mono text-xs">{booking.style}</td>
                    <td className="p-4 font-mono text-xs">{booking.preferred_date || 'Flexible'}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 text-[10px] uppercase font-bold rounded ${
                         booking.status === 'confirmed' ? 'bg-neon-green/20 text-neon-green border border-neon-green/50' :
                         booking.status === 'completed' ? 'bg-mutedText text-black border border-mutedText' :
                         booking.status === 'pending' ? 'bg-danger/20 text-danger border border-danger/50' :
                         'bg-borderDark text-white'
                      }`}>
                        {booking.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <Link href={`/admin/bookings/${booking.id}`}>
                        <Button variant="ghost" size="icon" className="hover:text-neon-purple">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-mutedText">
                    No booking requests found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
