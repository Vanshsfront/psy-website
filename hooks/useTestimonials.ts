import useSWR from "swr";
import { CustomerTestimonial } from "@/types";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useTestimonials() {
  const { data, error, isLoading, mutate } = useSWR<CustomerTestimonial[]>(
    "/api/admin/testimonials",
    fetcher,
    { revalidateOnFocus: false }
  );

  return {
    testimonials: data || [],
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}
