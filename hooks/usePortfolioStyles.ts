import useSWR from "swr";

export interface PortfolioStyle {
  id: string;
  name: string;
  sort_order: number;
  created_at: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function usePortfolioStyles() {
  const { data, error, isLoading, mutate } = useSWR<PortfolioStyle[]>(
    "/api/admin/portfolio-styles",
    fetcher,
    { revalidateOnFocus: false }
  );

  const styles = Array.isArray(data) ? data : [];

  return {
    styles,
    names: styles.map((s) => s.name),
    isLoading,
    isError: !!error,
    mutate,
  };
}
