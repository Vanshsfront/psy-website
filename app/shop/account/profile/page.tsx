"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCustomerStore } from "@/store/customerStore";
import { Button } from "@/components/ui/button";
import { User, Mail, Phone, Calendar, LogOut } from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const { customer, isLoggedIn, logout } = useCustomerStore();

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/shop/account/login");
    }
  }, [isLoggedIn, router]);

  if (!customer) return null;

  const memberSince = new Date(customer.created_at).toLocaleDateString(
    "en-IN",
    { year: "numeric", month: "long", day: "numeric" }
  );

  function handleLogout() {
    logout();
    router.push("/shop");
  }

  return (
    <div className="animate-fade-in-up">
      <h1 className="font-display text-display-lg text-bone mb-8">Profile</h1>

      <div className="bg-surface border border-taupe/10 p-6 mb-6">
        <h2 className="font-sans text-micro uppercase tracking-widest text-taupe mb-6">
          Personal Information
        </h2>
        <div className="space-y-6">
          <div className="flex items-start gap-4">
            <User className="w-4 h-4 text-taupe mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-sans text-micro uppercase tracking-widest text-taupe mb-1">
                Name
              </p>
              <p className="font-sans text-body text-bone">{customer.name}</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <Mail className="w-4 h-4 text-taupe mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-sans text-micro uppercase tracking-widest text-taupe mb-1">
                Email
              </p>
              <p className="font-sans text-body text-bone">{customer.email}</p>
            </div>
          </div>
          {customer.phone && (
            <div className="flex items-start gap-4">
              <Phone className="w-4 h-4 text-taupe mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-sans text-micro uppercase tracking-widest text-taupe mb-1">
                  Phone
                </p>
                <p className="font-sans text-body text-bone">
                  {customer.phone}
                </p>
              </div>
            </div>
          )}
          <div className="flex items-start gap-4">
            <Calendar className="w-4 h-4 text-taupe mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-sans text-micro uppercase tracking-widest text-taupe mb-1">
                Member Since
              </p>
              <p className="font-sans text-body text-bone">{memberSince}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-surface border border-taupe/10 p-6 mb-6">
        <p className="font-sans text-caption text-taupe">
          To update your email address or make other account changes, please
          contact our support team at{" "}
          <a
            href="mailto:support@psytattoos.com"
            className="text-psy-green hover:text-bone transition-colors duration-300"
          >
            support@psytattoos.com
          </a>
        </p>
      </div>

      <div className="pt-4">
        <Button variant="ghost" onClick={handleLogout}>
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </div>
    </div>
  );
}
