import useSWR from "swr";

export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useProductCategories() {
  const { data, error, isLoading, mutate } = useSWR<ProductCategory[]>(
    "/api/admin/product-categories",
    fetcher,
    { revalidateOnFocus: false }
  );

  return {
    categories: data || [],
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}
