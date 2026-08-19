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
    <div className="min-h-screen bg-background flex flex-col md:flex-row font-sans">
      <AdminSidebar
        userName={user.username}
        signOutAction={signOutAction}
      />

      {/* Main content, offset by sidebar width on desktop */}
      <main className="flex-1 md:ml-60 overflow-x-clip relative">
        <div className="p-6 md:p-10 max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      <ToastContainer />
    </div>
  )
}
