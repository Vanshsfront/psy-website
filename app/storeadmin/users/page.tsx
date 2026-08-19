"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/storeadmin/AuthProvider";
import Sidebar from "@/components/storeadmin/Sidebar";
import { api, clearApiCache } from "@/lib/storeadmin/api";
import type { StoreUser, Artist } from "@/types/storeadmin";
import { Loader2, Plus, Trash2, ShieldCheck, UserCog, Palette, KeyRound } from "lucide-react";
import { can, ROLE_LABELS, ROLE_NAMES, type UserRole } from "@/lib/auth/permissions";


const ROLE_ICON: Record<string, typeof ShieldCheck> = {
    superadmin: ShieldCheck,
    admin: UserCog,
    artist: Palette,
};

export default function UsersPage() {
    const { isAuthenticated, loading: authLoading, role, username } = useAuth();
    const router = useRouter();

    const [users, setUsers] = useState<StoreUser[]>([]);
    const [artists, setArtists] = useState<Artist[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);

    // Which row is having its password set, and to what. Kept per-row so the
    // owner can reset someone without a modal stealing the whole screen.
    const [pwTarget, setPwTarget] = useState<string | null>(null);
    const [pwValue, setPwValue] = useState("");
    const [showNew, setShowNew] = useState(false);
    const [form, setForm] = useState({ username: "", password: "", role: "artist", artist_id: "" });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!authLoading && !isAuthenticated) router.push("/storeadmin/login");
        // Managers must not see this screen at all; the API refuses them anyway,
        // but bouncing here avoids rendering an empty page they cannot use.
        if (!authLoading && isAuthenticated && role && !can(role, "logins.manage")) {
            router.push("/storeadmin");
        }
    }, [authLoading, isAuthenticated, role, router]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            clearApiCache();
            const [u, a] = await Promise.all([api.getUsers(), api.getArtists()]);
            setUsers(u.users);
            setArtists(a.artists);
            setError(null);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to load logins");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isAuthenticated && can(role, "logins.manage")) load();
    }, [isAuthenticated, role, load]);

    const create = async () => {
        setSaving(true);
        setError(null);
        try {
            await api.createUser({
                username: form.username,
                password: form.password,
                role: form.role,
                artist_id: form.role === "artist" ? form.artist_id || null : null,
            });
            setNotice(`Created ${form.username}. Give them the password you just set — it cannot be read back.`);
            setForm({ username: "", password: "", role: "artist", artist_id: "" });
            setShowNew(false);
            await load();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Could not create the login");
        } finally {
            setSaving(false);
        }
    };

    const toggleActive = async (u: StoreUser) => {
        setError(null);
        try {
            await api.updateUser(u.id, { is_active: !u.is_active });
            await load();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Could not update the login");
        }
    };

    const setPassword = async (u: StoreUser) => {
        setError(null);
        try {
            await api.updateUser(u.id, { password: pwValue });
            setNotice(
                `Password updated for ${u.username}. Give it to them directly — it cannot be read back from here.`
            );
            setPwTarget(null);
            setPwValue("");
        } catch (e) {
            setError(e instanceof Error ? e.message : "Could not set the password");
        }
    };

    const suggest = () => {
        // Three short words plus digits: long enough to be safe, still possible
        // to read down the phone to an artist.
        const words = ["ink", "needle", "studio", "linework", "shade", "stencil", "onyx", "amber", "cobalt", "ember"];
        const pick = () => words[Math.floor(Math.random() * words.length)];
        setPwValue(`${pick()}-${pick()}-${Math.floor(1000 + Math.random() * 9000)}`);
    };

    const remove = async (u: StoreUser) => {
        setError(null);
        try {
            await api.deleteUser(u.id);
            setNotice(`Removed ${u.username}.`);
            await load();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Could not remove the login");
        }
    };

    if (authLoading || !isAuthenticated || !can(role, "logins.manage")) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
            </div>
        );
    }

    const activeArtists = artists.filter((a) => a.is_active);
    const linkedArtistIds = new Set(users.filter((u) => u.artist_id).map((u) => u.artist_id));

    return (
        <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 ml-0 md:ml-60 p-4 md:p-10 pt-16 md:pt-10">
                <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
                    <div>
                        <h1 className="font-display text-4xl font-bold">Logins</h1>
                        <p className="text-sm text-[var(--muted)] mt-1">
                            {users.length} account{users.length === 1 ? "" : "s"} · only you can see this screen
                        </p>
                    </div>
                    <button
                        onClick={() => setShowNew((v) => !v)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded neo-btn text-sm"
                    >
                        <Plus className="w-4 h-4" />
                        New login
                    </button>
                </div>

                {error && (
                    <div className="mb-4 px-4 py-3 rounded border border-[var(--danger)] text-[var(--danger)] text-sm">
                        {error}
                    </div>
                )}
                {notice && (
                    <div className="mb-4 px-4 py-3 rounded border border-[var(--accent)] text-[var(--accent)] text-sm flex justify-between gap-4">
                        <span>{notice}</span>
                        <button onClick={() => setNotice(null)} className="shrink-0">dismiss</button>
                    </div>
                )}

                {showNew && (
                    <div className="mb-8 p-5 rounded border border-[var(--border-color)] bg-[var(--surface)]">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] uppercase tracking-wider text-[var(--muted)] mb-1 block">Username</label>
                                <input
                                    value={form.username}
                                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                                    placeholder="e.g. kshipra"
                                    className="w-full px-3 py-2 neo-input text-sm"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] uppercase tracking-wider text-[var(--muted)] mb-1 block">Password (min 8)</label>
                                <input
                                    type="text"
                                    value={form.password}
                                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                                    placeholder="they can't recover this — write it down"
                                    className="w-full px-3 py-2 neo-input text-sm"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] uppercase tracking-wider text-[var(--muted)] mb-1 block">Access level</label>
                                <select
                                    value={form.role}
                                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                                    className="w-full px-3 py-2 neo-input text-sm"
                                >
                                    <option value="artist">{ROLE_NAMES.artist}</option>
                                    <option value="admin">{ROLE_NAMES.admin}</option>
                                    <option value="superadmin">{ROLE_NAMES.superadmin}</option>
                                </select>
                                <p className="text-[11px] text-[var(--muted)] mt-1">{ROLE_LABELS[form.role as UserRole]}</p>
                            </div>
                            {form.role === "artist" && (
                                <div>
                                    <label className="text-[10px] uppercase tracking-wider text-[var(--muted)] mb-1 block">Which artist</label>
                                    <select
                                        value={form.artist_id}
                                        onChange={(e) => setForm({ ...form, artist_id: e.target.value })}
                                        className="w-full px-3 py-2 neo-input text-sm"
                                    >
                                        <option value="">Select…</option>
                                        {activeArtists.map((a) => (
                                            <option key={a.id} value={a.id} disabled={linkedArtistIds.has(a.id)}>
                                                {a.name}{linkedArtistIds.has(a.id) ? " (already has a login)" : ""}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                        <div className="flex gap-2 mt-4">
                            <button
                                onClick={create}
                                disabled={saving || !form.username || form.password.length < 8 || (form.role === "artist" && !form.artist_id)}
                                className="px-4 py-2 rounded neo-btn text-sm disabled:opacity-40"
                            >
                                {saving ? "Creating…" : "Create login"}
                            </button>
                            <button onClick={() => setShowNew(false)} className="px-4 py-2 text-sm text-[var(--muted)]">
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {loading ? (
                    <Loader2 className="w-6 h-6 animate-spin text-[var(--primary)]" />
                ) : (
                    <div className="rounded border border-[var(--border-color)] overflow-hidden">
                        {users.map((u) => {
                            const Icon = ROLE_ICON[u.role] ?? UserCog;
                            const isMe = u.username === username;
                            return (
                                <div key={u.id} className="border-b border-[var(--border-color)] last:border-0">
                                <div
                                    className="flex items-center gap-4 px-5 py-4 flex-wrap"
                                >
                                    <Icon className="w-5 h-5 text-[var(--muted)] shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">{u.username}</span>
                                            {isMe && <span className="text-[10px] uppercase tracking-wider text-[var(--muted)]">you</span>}
                                            {!u.is_active && (
                                                <span className="text-[10px] uppercase tracking-wider text-[var(--danger)]">disabled</span>
                                            )}
                                        </div>
                                        <p className="text-xs text-[var(--muted)]">
                                            {ROLE_LABELS[u.role as UserRole]}
                                            {u.artists?.name ? ` · ${u.artists.name}` : ""}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => { setPwTarget(pwTarget === u.id ? null : u.id); setPwValue(""); }}
                                        className="px-3 py-1.5 text-xs neo-btn rounded"
                                    >
                                        <KeyRound className="w-3.5 h-3.5 inline mr-1" />
                                        Password
                                    </button>
                                    {!isMe && (
                                        <>
                                            <button
                                                onClick={() => toggleActive(u)}
                                                className="px-3 py-1.5 text-xs neo-btn rounded"
                                            >
                                                {u.is_active ? "Disable" : "Enable"}
                                            </button>
                                            <button
                                                onClick={() => remove(u)}
                                                className="p-1.5 text-[var(--danger)]"
                                                title="Remove this login"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </>
                                    )}
                                </div>

                                {pwTarget === u.id && (
                                    <div className="px-5 pb-4 flex flex-wrap items-center gap-2">
                                        <input
                                            autoFocus
                                            value={pwValue}
                                            onChange={(e) => setPwValue(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" && pwValue.length >= 8) setPassword(u);
                                                if (e.key === "Escape") setPwTarget(null);
                                            }}
                                            placeholder="New password (min 8 characters)"
                                            className="flex-1 min-w-[220px] px-3 py-2 neo-input text-sm"
                                        />
                                        <button onClick={suggest} className="px-3 py-2 text-xs neo-btn rounded">
                                            Suggest
                                        </button>
                                        <button
                                            onClick={() => setPassword(u)}
                                            disabled={pwValue.length < 8}
                                            className="px-3 py-2 text-xs neo-btn rounded disabled:opacity-40"
                                        >
                                            Set password
                                        </button>
                                        <button
                                            onClick={() => setPwTarget(null)}
                                            className="px-3 py-2 text-xs text-[var(--muted)]"
                                        >
                                            Cancel
                                        </button>
                                        {isMe && (
                                            <span className="w-full text-[11px] text-[var(--muted)]">
                                                Changing your own password will not sign you out of this session.
                                            </span>
                                        )}
                                    </div>
                                )}
                                </div>
                            );
                        })}
                    </div>
                )}

                <p className="text-xs text-[var(--muted)] mt-6 max-w-2xl">
                    Disabling a login takes effect immediately — roles are checked against the
                    database on every request rather than read from the sign-in token, so nobody
                    keeps access until their session expires.
                </p>
            </main>
        </div>
    );
}
