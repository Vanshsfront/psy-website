import { useToastStore } from "@/store/toastStore";

export function useToast() {
  const addToast = useToastStore((s) => s.addToast);

  return {
    toast: {
      success: (message: string) => addToast("success", message),
      error: (message: string) => addToast("error", message),
      info: (message: string) => addToast("info", message),
    },
  };
}
