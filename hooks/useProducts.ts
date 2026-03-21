import useSWR from "swr";
import { Product } from "@/types";

interface UseProductsParams {
  category?: string;
  status?: string; // "published" | "draft" | ""
  search?: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useProducts(params?: UseProductsParams) {
  const searchParams = new URLSearchParams();
  if (params?.category) searchParams.set("category", params.category);
  if (params?.status) searchParams.set("status", params.status);
  if (params?.search) searchParams.set("search", params.search);

  const query = searchParams.toString();
  const url = `/api/admin/products${query ? `?${query}` : ""}`;

  const { data, error, isLoading, mutate } = useSWR<Product[]>(url, fetcher, {
    revalidateOnFocus: false,
  });

  return {
    products: data || [],
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}
