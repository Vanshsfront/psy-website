import useSWR from "swr";
import { GuestSpot } from "@/types";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useGuestSpots() {
  const { data, error, isLoading, mutate } = useSWR<GuestSpot[]>(
    "/api/admin/guest-spots",
    fetcher,
    { revalidateOnFocus: false }
  );

  return {
    guestSpots: data || [],
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}
