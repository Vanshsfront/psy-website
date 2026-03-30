import useSWR from "swr";
import type { Artist } from "@/types";

interface UseArtistsParams {
  search?: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useArtists(params?: UseArtistsParams) {
  const searchParams = new URLSearchParams();
  if (params?.search) searchParams.set("search", params.search);

  const query = searchParams.toString();
  const url = `/api/admin/artists${query ? `?${query}` : ""}`;

  const { data, error, isLoading, mutate } = useSWR<Artist[]>(url, fetcher, {
    revalidateOnFocus: false,
  });

  return {
    artists: data || [],
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}
