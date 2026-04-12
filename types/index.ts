export type CustomStyle = {
  id: string;
  name: string;
  description: string | null;
  starting_price: number | null;
  example_image_url: string | null;
};

export type Artist = {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  speciality: string | null;
  instagram: string | null;
  profile_photo_url: string | null;
  created_at: string;
};

export type PortfolioItem = {
  id: string;
  image_url: string;
  artist_id: string | null;
  style_tag: string | null;
  description: string | null;
  featured: boolean;
  created_at: string;
};

export type VariantValue = {
  label: string;
  priceOverride: number | null;
  imageUrl?: string | null;
};

export type VariantGroup = {
  group: string;
  values: VariantValue[];
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  description_short: string | null;
  description_full: string | null;
  category: string;
  price: number;
  compare_at_price: number | null;
  material: string | null;
  tags: string[];
  images: string[];
  variants: VariantGroup[];
  stock_status: boolean;
  stock_quantity: number;
  is_featured: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
};

export type CartItem = {
  product_id: string;
  name: string;
  slug: string;
  price: number;
  image_url: string;
  variant: Record<string, unknown> | null;
  variant_id?: string | null;
  quantity: number;
};

export type ProductVariant = {
  id: string;
  product_id: string;
  sku: string | null;
  label: string;
  options: Record<string, string>;
  price_override: number | null;
  stock_quantity: number;
  created_at: string;
  updated_at: string;
};

export type Collection = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
};

export type Discount = {
  id: string;
  code: string;
  type: "percentage" | "fixed";
  value: number;
  min_order_amount: number | null;
  max_uses: number | null;
  used_count: number;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
};

export type ShopCustomer = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  created_at: string;
  updated_at: string;
};

export type CustomerAddress = {
  id: string;
  customer_id: string;
  label: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  is_default: boolean;
  created_at: string;
};

export type ReturnRequest = {
  id: string;
  order_id: string;
  customer_id: string | null;
  reason: string;
  status: "requested" | "approved" | "rejected" | "completed";
  items: Array<{ product_id: string; name: string; quantity: number }>;
  refund_amount: number | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type CommunityPost = {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  type: "event" | "collab" | "announcement";
  image_url: string | null;
  event_date: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

export type GuestSpot = {
  id: string;
  artist_name: string;
  bio: string | null;
  instagram: string | null;
  portfolio_images: string[];
  dates_available: string | null;
  date_start: string | null;
  date_end: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

export type GuestSpotLead = {
  id: string;
  guest_spot_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  message: string | null;
  created_at: string;
};

export type CustomerTestimonial = {
  id: string;
  customer_name: string;
  review_text: string | null;
  rating: number | null;
  image_url: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};
