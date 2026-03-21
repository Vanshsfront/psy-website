import useSWR from "swr";
import { PortfolioItem } from "@/types";

interface UsePortfolioParams {
  artist?: string;
  style?: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function usePortfolio(params?: UsePortfolioParams) {
  const searchParams = new URLSearchParams();
  if (params?.artist) searchParams.set("artist", params.artist);
  if (params?.style) searchParams.set("style", params.style);

  const query = searchParams.toString();
  const url = `/api/admin/portfolio${query ? `?${query}` : ""}`;

  const { data, error, isLoading, mutate } = useSWR<PortfolioItem[]>(
    url,
    fetcher,
    { revalidateOnFocus: false }
  );

  return {
    items: data || [],
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}
