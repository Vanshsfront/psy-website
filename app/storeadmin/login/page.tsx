"use client";

import { useState } from "react";
import { useAuth } from "@/components/storeadmin/AuthProvider";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
    const { login } = useAuth();
    const router = useRouter();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            await login(username, password);
            router.push("/storeadmin");
        } catch {
            setError("Invalid credentials");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative">
            <div className="glass-panel p-8 w-full max-w-md animate-fadeIn relative">
                {/* Logo */}
                <div className="text-center mb-8">
                    <h1 className="font-display tracking-widest text-4xl text-[var(--foreground)] mb-2">PSY</h1>
                    <p className="text-[var(--muted)] font-medium tracking-[0.15em] uppercase text-xs">Tattoo Studio CRM</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-[var(--muted)] mb-2">
                            Username
                        </label>
                        <input
                            id="login-username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full px-4 py-3 neo-input"
                            placeholder="admin"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[var(--muted)] mb-2">
                            Password
                        </label>
                        <input
                            id="login-password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 neo-input"
                            placeholder="••••••"
                            required
                        />
                    </div>

                    {error && (
                        <div className="text-[var(--danger)] text-sm bg-[var(--danger)]/10 border border-[var(--danger)]/20 px-4 py-2 rounded">
                            {error}
                        </div>
                    )}

                    <button
                        id="login-submit"
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 neo-btn neo-btn-primary font-bold flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                        {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            "Sign In"
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
