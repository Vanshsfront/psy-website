import useSWR from "swr";

interface Booking {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  artist_id: string | null;
  inquiry_type: string | null;
  style: string | null;
  description: string | null;
  preferred_date: string | null;
  reference_image_url: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  artists?: { name: string } | null;
}

interface UseBookingsParams {
  status?: string;
  search?: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useBookings(params?: UseBookingsParams) {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set("status", params.status);
  if (params?.search) searchParams.set("search", params.search);

  const query = searchParams.toString();
  const url = `/api/admin/bookings${query ? `?${query}` : ""}`;

  const { data, error, isLoading, mutate } = useSWR<Booking[]>(url, fetcher, {
    revalidateOnFocus: false,
  });

  return {
    bookings: data || [],
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}

export type { Booking };
