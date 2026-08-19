import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import AdminSidebar from "@/components/admin/AdminSidebar"
import ToastContainer from "@/components/ui/ToastContainer"
import { requirePageSession } from "@/lib/auth/session"
import { STAFF } from "@/lib/auth/permissions"
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/storeadmin/server/auth"

/**
 * Guarded here rather than by the middleware matcher alone.
 *
 * Every page under this layout used to have no check of its own, so the only
 * thing standing between them and the open internet was one negative lookahead
 * in middleware.ts. Five of them read with the service-role key, which bypasses
 * RLS, so a mistake in that regex would have exposed the customer list. The
 * guard now lives in code that cannot be edited out by accident.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageSession(STAFF)

  const signOutAction = async () => {
    "use server"
    cookies().set(SESSION_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 })
    redirect("/storeadmin/login")
  }

  return (
    <div className="min-h-screen bg-background font-sans">
      <AdminSidebar
        userName={user.username}
        role={user.role}
        signOutAction={signOutAction}
      />

      {/* Main content, offset by sidebar width on desktop */}
      {/* The sidebar is fixed at every width now, so the content is offset on
          desktop and full-bleed on mobile with room for the menu button. */}
      <main className="md:ml-60 overflow-x-clip relative">
        <div className="p-4 md:p-10 pt-16 md:pt-10 max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      <ToastContainer />
    </div>
  )
}
