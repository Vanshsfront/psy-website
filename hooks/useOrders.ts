import useSWR from "swr";

interface Order {
  id: string;
  order_number: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_address: Record<string, string>;
  items: Array<{
    product_id: string;
    name: string;
    slug: string;
    price: number;
    quantity: number;
    image_url: string;
    variant?: Record<string, unknown>;
  }>;
  subtotal: number;
  shipping: number;
  total: number;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  status: string;
  tracking_number: string | null;
  courier_name: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string | null;
}

interface UseOrdersParams {
  status?: string;
  search?: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useOrders(params?: UseOrdersParams) {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set("status", params.status);
  if (params?.search) searchParams.set("search", params.search);

  const query = searchParams.toString();
  const url = `/api/admin/orders${query ? `?${query}` : ""}`;

  const { data, error, isLoading, mutate } = useSWR<Order[]>(url, fetcher, {
    revalidateOnFocus: false,
  });

  return {
    orders: data || [],
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}

export type { Order };
