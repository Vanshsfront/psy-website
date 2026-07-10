import useSWR from "swr";

export interface GuestArtistApplication {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  type_of_artist: string | null;
  years_experience: number | null;
  portfolio_link: string | null;
  images: string[];
  status: "pending" | "approved" | "rejected";
  guest_spot_id: string | null;
  created_at: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useGuestArtistApplications() {
  const { data, error, isLoading, mutate } = useSWR<GuestArtistApplication[]>(
    "/api/admin/guest-artist-applications",
    fetcher,
    { revalidateOnFocus: false }
  );

  return {
    applications: Array.isArray(data) ? data : [],
    isLoading,
    isError: !!error,
    mutate,
  };
}
