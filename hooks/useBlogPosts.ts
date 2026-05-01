import useSWR from "swr";
import type { BlogPost } from "@/types";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useBlogPosts() {
  const { data, error, isLoading, mutate } = useSWR<BlogPost[]>(
    "/api/admin/blog-posts",
    fetcher,
    { revalidateOnFocus: false }
  );

  return {
    posts: data || [],
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}
