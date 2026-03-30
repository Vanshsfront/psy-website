import { createSSRClient } from "@/lib/supabase-server"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { revalidatePath } from "next/cache"

export const revalidate = 0

export default async function AdminBookingDetail({ params }: { params: { id: string } }) {
  const supabase = await createSSRClient()
  const { data: booking, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", params.id)
    .single()

  if (error || !booking) {
    notFound()
  }

  // Server Action to update status
  async function updateBooking(formData: FormData) {
    "use server"
    const newStatus = formData.get("status") as string
    const adminNotes = formData.get("admin_notes") as string
    const sbp = await createSSRClient()
    await sbp.from("bookings").update({
      status: newStatus,
      admin_notes: adminNotes || null,
    }).eq("id", params.id)
    revalidatePath(`/admin/bookings/${params.id}`)
    revalidatePath(`/admin/bookings`)
  }

  return (
    <div>
      <div className="mb-8 flex items-center gap-4">
        <Link href="/admin/bookings" className="text-mutedText hover:text-white transition-colors">
          ← Back to Bookings
        </Link>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        
        {/* Left Col - Details */}
        <div className="flex-1 space-y-8">
          
          <div className="bg-surface border border-borderDark p-6 rounded">
            <h2 className="font-display text-xl font-bold mb-6 flex justify-between">
              Booking Request
              <span className={`px-2 py-1 text-[10px] uppercase font-bold rounded ${
                 booking.status === 'confirmed' ? 'bg-neon-green/20 text-neon-green border border-neon-green/50' :
                 booking.status === 'completed' ? 'bg-mutedText text-black border border-mutedText' :
                 booking.status === 'pending' ? 'bg-danger/20 text-danger border border-danger/50' :
                 'bg-borderDark text-white'
              }`}>
                {booking.status}
              </span>
            </h2>

            <div className="grid grid-cols-2 gap-y-6 gap-x-4">
              <div>
                <p className="text-xs text-mutedText uppercase tracking-wider mb-1">Style</p>
                <p className="font-mono text-primaryText">{booking.style}</p>
              </div>
              <div>
                <p className="text-xs text-mutedText uppercase tracking-wider mb-1">Placement</p>
                <p className="font-mono text-primaryText">{booking.placement}</p>
              </div>
              <div>
                <p className="text-xs text-mutedText uppercase tracking-wider mb-1">Size Estimate</p>
                <p className="font-mono text-primaryText">{booking.size_estimate}</p>
              </div>
              <div>
                <p className="text-xs text-mutedText uppercase tracking-wider mb-1">Budget</p>
                <p className="font-mono text-primaryText">{booking.budget}</p>
              </div>
              <div>
                <p className="text-xs text-mutedText uppercase tracking-wider mb-1">Preferred Date</p>
                <p className="font-mono text-primaryText">{booking.preferred_date || 'Flexible'}</p>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-borderDark">
              <p className="text-xs text-mutedText uppercase tracking-wider mb-3">Tattoo Description / Idea</p>
              <p className="text-sm leading-relaxed text-primaryText">{booking.description}</p>
            </div>

            {booking.reference_images && booking.reference_images.length > 0 && (
              <div className="mt-6 pt-6 border-t border-borderDark">
                <p className="text-xs text-mutedText uppercase tracking-wider mb-3">Reference Images</p>
                <div className="flex flex-wrap gap-4">
                  {booking.reference_images.map((img: string, i: number) => (
                    <a key={i} href={img} target="_blank" rel="noreferrer" className="w-24 h-24 rounded border border-borderDark overflow-hidden hover:border-neon-cyan transition-colors block">
                      <img src={img} alt="Ref" className="w-full h-full object-cover" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Right Col - Client & Actions */}
        <div className="w-full md:w-80 space-y-8">
          
          <div className="bg-surface border border-borderDark p-6 rounded space-y-6">
            <h2 className="font-display text-xl font-bold">Client Contact</h2>
            <div>
              <p className="font-bold text-primaryText">{booking.name}</p>
              <p className="text-sm text-mutedText mt-2 font-mono">
                <a href={`mailto:${booking.email}`} className="text-neon-cyan hover:underline">{booking.email}</a>
              </p>
              <p className="text-sm text-mutedText mt-1 font-mono">{booking.phone}</p>
            </div>
            {booking.instagram_handle && (
              <div className="pt-4 border-t border-borderDark">
                <h3 className="text-xs font-medium uppercase tracking-wider text-mutedText mb-2">Instagram</h3>
                <a href={`https://instagram.com/${booking.instagram_handle.replace('@', '')}`} target="_blank" rel="noreferrer" className="text-sm font-bold text-neon-purple hover:underline">
                  {booking.instagram_handle}
                </a>
              </div>
            )}
          </div>

          <div className="bg-surface border border-borderDark p-6 rounded space-y-6">
            <h2 className="font-display text-xl font-bold">Manage Request</h2>
            <form action={updateBooking} className="flex flex-col gap-4">
              <div>
                <label className="text-xs text-mutedText uppercase tracking-wider mb-1 block">Status</label>
                <select name="status" defaultValue={booking.status} className="w-full h-10 rounded border border-borderDark bg-background px-3 text-sm focus-visible:ring-neon-purple">
                  <option value="pending">Pending Review</option>
                  <option value="contacted">Client Contacted</option>
                  <option value="confirmed">Session Confirmed</option>
                  <option value="completed">Tattoo Completed</option>
                  <option value="cancelled">Cancelled / Rejected</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-mutedText uppercase tracking-wider mb-1 block">Admin Notes</label>
                <textarea
                  name="admin_notes"
                  defaultValue={booking.admin_notes || ""}
                  placeholder="Internal notes (deposit received, session length, etc.)"
                  className="w-full h-24 rounded border border-borderDark bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-neon-purple outline-none resize-none"
                />
              </div>
              <Button type="submit" variant="neon" className="w-full">Save Changes</Button>
            </form>
            <p className="text-xs text-mutedText mt-4 text-center">Note: Updating status does not automatically email the client. Please contact them manually.</p>
          </div>

        </div>

      </div>
    </div>
  )
}
