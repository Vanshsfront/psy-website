import {
  LayoutDashboard,
  Users,
  PlusCircle,
  Send,
  DollarSign,
  ClipboardList,
  Palette,
  Wallet,
  ShieldCheck,
  CalendarDays,
  Scale,
  Package,
  Image as ImageIcon,
  ShoppingBag,
  Calendar,
  Megaphone,
  BookOpen,
  UserPlus,
  Inbox,
  Star,
  Warehouse,
  FolderOpen,
  Layers,
  Tag,
  Contact,
  RotateCcw,
  Settings,
  Receipt,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

/**
 * The admin navigation, in the two sections Yogesh asked for.
 *
 * From For PSY.pdf, 2026-08-19: "Break store admin into two parts and add D2C
 * to store admin itself". Studio is the tattoo business, Shop is the D2C
 * jewellery side. Both used to be separate panels with separate logins.
 *
 * Access is NOT declared here. It comes from SCREEN_ACCESS in
 * lib/auth/permissions.ts, the same map the API gate reads, so a visible link
 * always matches a reachable endpoint.
 *
 * URLs are unchanged on purpose. Consolidating /admin/* and /storeadmin/* under
 * one prefix is a mechanical move worth doing once, after the open questions are
 * settled, rather than twice.
 *
 * There is a third section, Admin, holding the management screens: Both
 * Businesses, Analytics, Balance Sheet, Salary Slips, Logins and My Earnings.
 *
 * They were briefly taken out of the nav entirely, which was wrong: Yogesh
 * asked "Bro where can i access them now" and could not reach them at all.
 * Taking them off the operational lists was the point; making them unreachable
 * was not. They now sit in their own section, which is also what his original
 * spec described, an "Admin (one login only)" group alongside Studio and Shop.
 *
 * The section is filtered by the same access rules as everything else, so it
 * only appears to somebody who can open at least one screen inside it. For a
 * Manager that is Analytics; for an Executive it is their own earnings.
 */

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface NavSection {
  /** Shown as the group heading. */
  title: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    title: "Studio",
    items: [
      { label: "Dashboard", href: "/storeadmin", icon: LayoutDashboard },
      { label: "Customers", href: "/storeadmin/customers", icon: Users },
      { label: "Appointments", href: "/storeadmin/appointments", icon: CalendarDays },
      { label: "Orders", href: "/storeadmin/orders", icon: ClipboardList },
      { label: "New Order", href: "/storeadmin/orders/new", icon: PlusCircle },
      { label: "Campaigns", href: "/storeadmin/campaigns", icon: Send },
      { label: "Expenses", href: "/storeadmin/expenses", icon: Wallet },
      { label: "Finance", href: "/storeadmin/finance", icon: DollarSign },
      { label: "Artists", href: "/storeadmin/artists", icon: Palette },
      { label: "Portfolio", href: "/admin/portfolio", icon: ImageIcon },
      { label: "Blog", href: "/admin/blog", icon: BookOpen },
      { label: "Bookings", href: "/admin/bookings", icon: Calendar },
      { label: "Community", href: "/admin/community", icon: Megaphone },
      // The four that were sitting in the shop panel. The doc files all of them
      // under Studio and no open question touches them.
      { label: "Guest Spots", href: "/admin/guest-spots", icon: UserPlus },
      { label: "Guest Artists", href: "/admin/guest-artists", icon: Inbox },
      { label: "Testimonials", href: "/admin/testimonials", icon: Star },
      { label: "Site Settings", href: "/admin/site-settings", icon: Settings },
    ],
  },
  {
    // Money, oversight and account management. Kept apart from the two
    // operational sections rather than mixed into them.
    title: "Admin",
    items: [
      { label: "Both Businesses", href: "/storeadmin/overview", icon: Scale },
      { label: "Analytics", href: "/storeadmin/analytics", icon: TrendingUp },
      { label: "Balance Sheet", href: "/storeadmin/balance-sheet", icon: Scale },
      { label: "Salary Slips", href: "/storeadmin/salary", icon: Receipt },
      { label: "My Earnings", href: "/storeadmin/my-earnings", icon: Wallet },
      { label: "Logins", href: "/storeadmin/users", icon: ShieldCheck },
    ],
  },
  {
    title: "Shop",
    items: [
      { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
      { label: "Products", href: "/admin/products", icon: Package },
      { label: "Orders", href: "/admin/orders", icon: ShoppingBag },
      { label: "Inventory", href: "/admin/inventory", icon: Warehouse },
      { label: "Collections", href: "/admin/collections", icon: FolderOpen },
      { label: "Categories", href: "/admin/categories", icon: Layers },
      { label: "Discounts", href: "/admin/discounts", icon: Tag },
      { label: "Customers", href: "/admin/customers", icon: Contact },
      { label: "Returns", href: "/admin/returns", icon: RotateCcw },
    ],
  },
];
