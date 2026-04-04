import useSWR from "swr";
import { GuestSpotLead } from "@/types";

interface UseGuestSpotLeadsParams {
  guestSpotId?: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useGuestSpotLeads(params?: UseGuestSpotLeadsParams) {
  const searchParams = new URLSearchParams();
  if (params?.guestSpotId)
    searchParams.set("guest_spot_id", params.guestSpotId);

  const query = searchParams.toString();
  const url = `/api/admin/guest-spot-leads${query ? `?${query}` : ""}`;

  const { data, error, isLoading, mutate } = useSWR<
    (GuestSpotLead & { guest_spots?: { artist_name: string } | null })[]
  >(url, fetcher, { revalidateOnFocus: false });

  return {
    leads: data || [],
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}
