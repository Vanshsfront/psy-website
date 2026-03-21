"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, Info } from "lucide-react";
import { useToastStore, type ToastType } from "@/store/toastStore";

const PSY_EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

const iconMap: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 className="w-5 h-5 text-psy-green shrink-0" />,
  error: <XCircle className="w-5 h-5 text-danger shrink-0" />,
  info: <Info className="w-5 h-5 text-taupe shrink-0" />,
};

const borderColorMap: Record<ToastType, string> = {
  success: "border-l-psy-green",
  error: "border-l-danger",
  info: "border-l-taupe",
};

export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            transition={{ duration: 0.4, ease: PSY_EASE }}
            onClick={() => removeToast(toast.id)}
            className={`pointer-events-auto cursor-pointer flex items-center gap-3 px-4 py-3 min-w-[300px] max-w-[420px] bg-surface border border-taupe/10 border-l-[3px] ${borderColorMap[toast.type]}`}
          >
            {iconMap[toast.type]}
            <p className="text-sm text-bone leading-tight">
              {toast.message}
            </p>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
