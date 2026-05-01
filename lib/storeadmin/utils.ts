import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

export function formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = String(d.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
}

export function formatRelativeDate(dateStr: string | null | undefined): string {
    if (!dateStr) return "Never";
    const d = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
}

export function getSourceColor(source: string | null): string {
    switch (source?.toLowerCase()) {
        case "instagram": return "text-[#3BA37C] bg-[#3BA37C]/10";
        case "walk-in": return "text-[#C6A96B] bg-[#C6A96B]/10";
        case "referral": return "text-[#C0654A] bg-[#C0654A]/10";
        case "google": return "text-[#B8ADA4] bg-[#B8ADA4]/10";
        default: return "text-gray-400 bg-gray-400/10";
    }
}

export function getPaymentColor(mode: string | null): string {
    switch (mode?.toLowerCase()) {
        case "cash": return "text-[#3BA37C] font-medium";
        case "upi": return "text-[#8B7CFF] font-medium";
        case "card": return "text-[#E0D4C4] font-medium";
        case "bank_transfer": return "text-[#C6A96B] font-medium";
        default: return "text-gray-400";
    }
}

export function getConfidenceColor(confidence: number): string {
    if (confidence >= 80) return "text-[#3BA37C] bg-[#3BA37C]/10 border-[#3BA37C]/30";
    if (confidence >= 60) return "text-[#C6A96B] bg-[#C6A96B]/10 border-[#C6A96B]/30";
    return "text-[#ff3c3c] bg-[#ff3c3c]/10 border-[#ff3c3c]/30";
}

export function capitalizeWords(str: string): string {
    return str.replace(/\b\w/g, (char) => char.toUpperCase());
}

export function stripAtSign(handle: string): string {
    return handle.replace(/^@+/, "");
}
