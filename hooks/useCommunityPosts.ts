import useSWR from "swr";
import { CommunityPost } from "@/types";

interface UseCommunityPostsParams {
  type?: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useCommunityPosts(params?: UseCommunityPostsParams) {
  const searchParams = new URLSearchParams();
  if (params?.type) searchParams.set("type", params.type);

  const query = searchParams.toString();
  const url = `/api/admin/community${query ? `?${query}` : ""}`;

  const { data, error, isLoading, mutate } = useSWR<CommunityPost[]>(
    url,
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
