"use client";

import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { api } from "@/lib/storeadmin/api";

export type UserRole = "admin" | "finance";

interface AuthContextType {
    isAuthenticated: boolean;
    username: string | null;
    role: UserRole | null;
    login: (username: string, password: string) => Promise<void>;
    logout: () => void;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
    isAuthenticated: false,
    username: null,
    role: null,
    login: async () => { },
    logout: () => { },
    loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [username, setUsername] = useState<string | null>(null);
    const [role, setRole] = useState<UserRole | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem("psyshot_token");
        if (token) {
            api.me()
                .then((data) => {
                    setIsAuthenticated(true);
                    setUsername(data.username);
                    setRole((data.role as UserRole) || "admin");
                })
                .catch(() => {
                    localStorage.removeItem("psyshot_token");
                })
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    const login = async (user: string, pass: string) => {
        const data = await api.login(user, pass);
        localStorage.setItem("psyshot_token", data.token);
        setIsAuthenticated(true);
        setUsername(data.username);
        setRole((data.role as UserRole) || "admin");
    };

    const logout = () => {
        localStorage.removeItem("psyshot_token");
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
