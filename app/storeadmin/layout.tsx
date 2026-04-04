import type { Metadata } from "next";
import { AuthProvider } from "@/components/storeadmin/AuthProvider";
import "./storeadmin.css";

export const metadata: Metadata = {
  title: "PsyShot — Store Admin",
  robots: { index: false, follow: false },
};

export default function StoreAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="storeadmin-scope">
      <AuthProvider>
        {children}
      </AuthProvider>
    </div>
  );
}
