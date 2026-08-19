"use client";

import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { api, probeSession, setCacheIdentity } from "@/lib/storeadmin/api";
import type { UserRole } from "@/lib/auth/permissions";

// Re-exported from the permission map so existing importers keep working while
// the union itself is declared in exactly one place.
export type { UserRole };

interface AuthContextType {
    isAuthenticated: boolean;
    username: string | null;
    role: UserRole | null;
    login: (username: string, password: string) => Promise<{ username: string; role: UserRole }>;
    logout: () => Promise<void>;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
    isAuthenticated: false,
    username: null,
    role: null,
    login: async () => ({ username: "", role: "admin" as UserRole }),
    logout: async () => { },
    loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [username, setUsername] = useState<string | null>(null);
    const [role, setRole] = useState<UserRole | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Probed unconditionally rather than only when a localStorage token
        // exists, because the session may now be an httpOnly cookie that this
        // code cannot see. probeSession is used instead of api.me so that a
        // logged-out visitor does not get hard-redirected to the login page
        // from the login page, which reloads forever.
        probeSession()
            .then((data) => {
                if (!data) {
                    localStorage.removeItem("psyshot_token");
                    setCacheIdentity(null);
                    return;
                }
                setIsAuthenticated(true);
                setUsername(data.username);
                setRole((data.role as UserRole) || "admin");
                setCacheIdentity(data.username);
            })
            .finally(() => setLoading(false));
    }, []);

    const login = async (user: string, pass: string) => {
        const data = await api.login(user, pass);
        localStorage.setItem("psyshot_token", data.token);
        // Namespace any cached responses to this user before a single request
        // goes out, so nothing from the previous session can be served.
        setCacheIdentity(data.username);
        const resolved = (data.role as UserRole) || "admin";
        setIsAuthenticated(true);
        setUsername(data.username);
        setRole(resolved);
        // Returned so the caller can route on the role immediately, without
        // waiting for this state to land on the next render.
        return { username: data.username, role: resolved };
    };

    const logout = async () => {
        // The cookie is httpOnly, so only the server can clear it. Failing to
        // reach the server must still sign you out locally, hence the catch.
        try {
            await api.logout();
        } catch {
            // ignore
        }
        localStorage.removeItem("psyshot_token");
        setCacheIdentity(null);
        setIsAuthenticated(false);
        setUsername(null);
        setRole(null);
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, username, role, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
