import { auth } from "@/auth"
import AdminSidebar from "@/components/admin/AdminSidebar"
import ToastContainer from "@/components/ui/ToastContainer"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  if (!session?.user) {
    return <>{children}</>
  }

  const signOutAction = async () => {
    "use server"
    const { signOut } = await import("@/auth")
    await signOut()
  }

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row font-sans">
      <AdminSidebar
        userName={session.user.name || "Admin"}
        signOutAction={signOutAction}
      />

      {/* Main content — offset by sidebar width on desktop */}
      <main className="flex-1 md:ml-60 overflow-x-hidden relative">
        <div className="p-6 md:p-10 max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      <ToastContainer />
    </div>
  )
}
