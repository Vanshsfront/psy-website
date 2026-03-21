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
  quantity: number;
};
