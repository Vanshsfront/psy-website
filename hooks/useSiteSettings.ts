import useSWR from "swr";

interface SiteSetting {
  key: string;
  value: Record<string, string>;
  updated_at: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useSiteSettings() {
  const { data, error, isLoading, mutate } = useSWR<SiteSetting[]>(
    "/api/admin/site-settings",
    fetcher,
    { revalidateOnFocus: false }
  );

  const getSettingValue = (key: string) => {
    const setting = data?.find((s) => s.key === key);
    return setting?.value || {};
  };

  const updateSetting = async (key: string, value: Record<string, string>) => {
    const res = await fetch("/api/admin/site-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
    if (!res.ok) throw new Error("Failed to update setting");
    mutate();
  };

  return {
    settings: data || [],
    isLoading,
    isError: !!error,
    error,
    mutate,
    getSettingValue,
    updateSetting,
  };
}
