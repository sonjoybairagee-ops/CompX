"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { auth, isFirebaseConfigured } from "@/utils/firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";

// Define standard User interface
export interface AuthUser {
  email: string | null;
  uid: string;
  isMock?: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isMockAuth: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const isMockAuth = !isFirebaseConfigured;

  useEffect(() => {
    // 1. Firebase Live Auth Mode
    if (isFirebaseConfigured && auth) {
      const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        if (firebaseUser) {
          setUser({
            email: firebaseUser.email,
            uid: firebaseUser.uid,
            isMock: false,
          });
        } else {
          setUser(null);
        }
        setLoading(false);
      });
      return () => unsubscribe();
    }

    // 2. Mock Placeholder Fallback Mode (using localStorage for persistent demo sessions)
    const checkMockSession = () => {
      try {
        const savedSession = localStorage.getItem("compx_auth_session");
        if (savedSession) {
          setUser(JSON.parse(savedSession));
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Failed to parse mock session:", error);
      } finally {
        setLoading(false);
      }
    };

    checkMockSession();
  }, [isMockAuth]);

  // Handle Login
  const loginWithEmail = async (email: string, password: string) => {
    setLoading(true);
    if (!isMockAuth && auth) {
      try {
        await signInWithEmailAndPassword(auth, email, password);
      } catch (error) {
        setLoading(false);
        throw error;
      }
    } else {
      // Simulate premium network crawler latency for high-fidelity feel
      return new Promise<void>((resolve, reject) => {
        setTimeout(() => {
          if (!email || !password) {
            setLoading(false);
            reject(new Error("Email and password are required."));
            return;
          }
          const mockUser: AuthUser = {
            email,
            uid: `mock-uid-${Math.random().toString(36).substr(2, 9)}`,
            isMock: true,
          };
          localStorage.setItem("compx_auth_session", JSON.stringify(mockUser));
          setUser(mockUser);
          setLoading(false);
          resolve();
        }, 1500);
      });
    }
  };

  // Handle Signup / Register
  const signUpWithEmail = async (email: string, password: string) => {
    setLoading(true);
    if (!isMockAuth && auth) {
      try {
        await createUserWithEmailAndPassword(auth, email, password);
      } catch (error) {
        setLoading(false);
        throw error;
      }
    } else {
      // Simulate premium network crawler latency
      return new Promise<void>((resolve, reject) => {
        setTimeout(() => {
          if (!email || !password) {
            setLoading(false);
            reject(new Error("Email and password are required."));
            return;
          }
          const mockUser: AuthUser = {
            email,
            uid: `mock-uid-${Math.random().toString(36).substr(2, 9)}`,
            isMock: true,
          };
          localStorage.setItem("compx_auth_session", JSON.stringify(mockUser));
          setUser(mockUser);
          setLoading(false);
          resolve();
        }, 1500);
      });
    }
  };

  // Handle Logout
  const logout = async () => {
    setLoading(true);
    if (!isMockAuth && auth) {
      try {
        await signOut(auth);
        setUser(null);
      } catch (error) {
        console.error("Firebase signOut failed:", error);
      } finally {
        setLoading(false);
      }
    } else {
      localStorage.removeItem("compx_auth_session");
      setUser(null);
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        loginWithEmail,
        signUpWithEmail,
        logout,
        isMockAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
