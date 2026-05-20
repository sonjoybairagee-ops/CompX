"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { auth, db, isFirebaseConfigured } from "@/utils/firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, getDoc, setDoc, onSnapshot, collection, query, where, getDocs } from "firebase/firestore";
import { getOrCreateDeviceFingerprint } from "@/utils/device";

// Define standard User interface including SaaS plan credentials
export interface AuthUser {
  email: string | null;
  uid: string;
  isMock?: boolean;
  plan: string;
  leadsUsed: number;
  leadLimit: number;
  getIdToken?: (forceRefresh?: boolean) => Promise<string>;
}


interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isMockAuth: boolean;
  updateUserLeads: (newLeadsUsed: number) => Promise<void>;
  upgradeToPro: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const isMockAuth = !isFirebaseConfigured;

  // Retrieve user document from Firestore or mock local storage
  const fetchOrCreateProfile = async (uid: string, email: string | null): Promise<{ plan: string; leadsUsed: number; leadLimit: number }> => {
    const defaultPlan = "free";
    const getLimitForPlan = (planName: string) => planName === "pro" ? 10000 : 100;

    const defaultProfile = {
      plan: defaultPlan,
      leadsUsed: 0,
      leadLimit: getLimitForPlan(defaultPlan),
    };

    if (isFirebaseConfigured && db) {
      try {
        const userDocRef = doc(db, "users", uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          const plan = data.plan || defaultProfile.plan;
          return {
            plan: plan,
            leadsUsed: typeof data.leadsUsed === "number" ? data.leadsUsed : defaultProfile.leadsUsed,
            leadLimit: typeof data.leadLimit === "number" ? data.leadLimit : getLimitForPlan(plan),
          };
        } else {
          // Document does not exist, let's create it with defaults
          const deviceId = getOrCreateDeviceFingerprint();
          const newDoc = {
            email: email,
            plan: defaultProfile.plan,
            leadsUsed: defaultProfile.leadsUsed,
            leadLimit: defaultProfile.leadLimit,
            deviceId: deviceId,
            createdAt: new Date().toISOString(),
          };
          await setDoc(userDocRef, newDoc);
          return defaultProfile;
        }
      } catch (err) {
        console.error("Error fetching or creating Firestore user profile:", err);
        return defaultProfile;
      }
    } else {
      // Mock Fallback using localStorage
      try {
        const localKey = `compx_user_profile_${uid}`;
        const savedProfile = localStorage.getItem(localKey);
        if (savedProfile) {
          const parsed = JSON.parse(savedProfile);
          const plan = parsed.plan || defaultProfile.plan;
          return {
            plan: plan,
            leadsUsed: typeof parsed.leadsUsed === "number" ? parsed.leadsUsed : defaultProfile.leadsUsed,
            leadLimit: typeof parsed.leadLimit === "number" ? parsed.leadLimit : getLimitForPlan(plan),
          };
        } else {
          const deviceId = getOrCreateDeviceFingerprint();
          const newProfile = {
            email: email,
            deviceId: deviceId,
            ...defaultProfile,
          };
          localStorage.setItem(localKey, JSON.stringify(newProfile));
          return defaultProfile;
        }
      } catch (err) {
        console.error("Local storage mock profile error:", err);
        return defaultProfile;
      }
    }
  };

  useEffect(() => {
    let unsubscribeDoc: (() => void) | undefined = undefined;

    // 1. Firebase Live Auth Mode
    if (isFirebaseConfigured && auth && db) {
      const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
        // Clean up previous document listener if any
        if (unsubscribeDoc) {
          unsubscribeDoc();
          unsubscribeDoc = undefined;
        }

        if (firebaseUser) {
          // Fetch or create profile first to ensure document exists
          const profile = await fetchOrCreateProfile(firebaseUser.uid, firebaseUser.email);
          
          setUser({
            email: firebaseUser.email,
            uid: firebaseUser.uid,
            isMock: false,
            ...profile,
          });

          // Subscribe to real-time updates for plan, leadsUsed, leadLimit
          try {
            const userDocRef = doc(db, "users", firebaseUser.uid);
            unsubscribeDoc = onSnapshot(userDocRef, (docSnap) => {
              if (docSnap.exists()) {
                const data = docSnap.data();
                setUser((prevUser) => {
                  if (!prevUser) return null;
                  // Avoid unnecessary state changes if values are identical
                  if (
                    prevUser.plan === data.plan &&
                    prevUser.leadsUsed === data.leadsUsed &&
                    prevUser.leadLimit === data.leadLimit
                  ) {
                    return prevUser;
                  }
                  return {
                    ...prevUser,
                    plan: data.plan || prevUser.plan,
                    leadsUsed: typeof data.leadsUsed === "number" ? data.leadsUsed : prevUser.leadsUsed,
                    leadLimit: typeof data.leadLimit === "number" ? data.leadLimit : prevUser.leadLimit,
                  };
                });
              }
            });
          } catch (err) {
            console.error("Failed to set up real-time user document listener:", err);
          }
        } else {
          setUser(null);
        }
        setLoading(false);
      });

      return () => {
        unsubscribeAuth();
        if (unsubscribeDoc) {
          unsubscribeDoc();
        }
      };
    }

    // 2. Mock Placeholder Fallback Mode (using localStorage for persistent demo sessions)
    const checkMockSession = async () => {
      try {
        const savedSession = localStorage.getItem("compx_auth_session");
        if (savedSession) {
          const parsedUser = JSON.parse(savedSession);
          const profile = await fetchOrCreateProfile(parsedUser.uid, parsedUser.email);
          setUser({
            ...parsedUser,
            ...profile,
          });
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
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const firebaseUser = userCredential.user;
        const profile = await fetchOrCreateProfile(firebaseUser.uid, firebaseUser.email);
        setUser({
          email: firebaseUser.email,
          uid: firebaseUser.uid,
          isMock: false,
          ...profile,
        });
        setLoading(false);
      } catch (error) {
        setLoading(false);
        throw error;
      }
    } else {
      // Simulate premium network crawler latency for high-fidelity feel
      return new Promise<void>((resolve, reject) => {
        setTimeout(async () => {
          if (!email || !password) {
            setLoading(false);
            reject(new Error("Email and password are required."));
            return;
          }
          const uid = `mock-uid-${Math.random().toString(36).substr(2, 9)}`;
          const profile = await fetchOrCreateProfile(uid, email);
          const mockUser: AuthUser = {
            email,
            uid,
            isMock: true,
            ...profile,
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
    const deviceId = getOrCreateDeviceFingerprint();

    if (!isMockAuth && auth && db) {
      try {
        // 1. Live Device Fingerprint Anti-Abuse Check in Firestore
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("deviceId", "==", deviceId), where("plan", "==", "free"));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          throw new Error("This device has already claimed a free trial. Please log in to your original account or upgrade to PRO.");
        }

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const firebaseUser = userCredential.user;
        const profile = await fetchOrCreateProfile(firebaseUser.uid, firebaseUser.email);
        setUser({
          email: firebaseUser.email,
          uid: firebaseUser.uid,
          isMock: false,
          ...profile,
        });
        setLoading(false);
      } catch (error) {
        setLoading(false);
        throw error;
      }
    } else {
      // 2. Mock Device Fingerprint Anti-Abuse Check in Local Storage
      return new Promise<void>((resolve, reject) => {
        setTimeout(async () => {
          if (!email || !password) {
            setLoading(false);
            reject(new Error("Email and password are required."));
            return;
          }

          try {
            const fingerprintKey = "compx_claimed_mock_fingerprints";
            const claimedStr = localStorage.getItem(fingerprintKey);
            const claimedDevices: string[] = claimedStr ? JSON.parse(claimedStr) : [];

            if (claimedDevices.includes(deviceId)) {
              setLoading(false);
              reject(new Error("This device has already claimed a free trial. Please log in to your original account or upgrade to PRO."));
              return;
            }

            const uid = `mock-uid-${Math.random().toString(36).substr(2, 9)}`;
            const profile = await fetchOrCreateProfile(uid, email);
            const mockUser: AuthUser = {
              email,
              uid,
              isMock: true,
              ...profile,
            };

            // Register this device fingerprint as claimed
            claimedDevices.push(deviceId);
            localStorage.setItem(fingerprintKey, JSON.stringify(claimedDevices));

            localStorage.setItem("compx_auth_session", JSON.stringify(mockUser));
            setUser(mockUser);
            setLoading(false);
            resolve();
          } catch (mockErr: any) {
            setLoading(false);
            reject(mockErr);
          }
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

  // Direct mutations to leads stats
  const updateUserLeads = async (newLeadsUsed: number) => {
    if (!user) return;

    const updatedUser = {
      ...user,
      leadsUsed: newLeadsUsed,
    };

    setUser(updatedUser);

    if (isFirebaseConfigured && db) {
      try {
        const userDocRef = doc(db, "users", user.uid);
        await setDoc(userDocRef, { leadsUsed: newLeadsUsed }, { merge: true });
      } catch (err) {
        console.error("Failed to update leads in Firestore:", err);
      }
    } else {
      try {
        const localKey = `compx_user_profile_${user.uid}`;
        const savedProfileStr = localStorage.getItem(localKey);
        if (savedProfileStr) {
          const profile = JSON.parse(savedProfileStr);
          profile.leadsUsed = newLeadsUsed;
          localStorage.setItem(localKey, JSON.stringify(profile));
        }

        // Sync auth session state
        const savedSession = localStorage.getItem("compx_auth_session");
        if (savedSession) {
          const parsed = JSON.parse(savedSession);
          parsed.leadsUsed = newLeadsUsed;
          localStorage.setItem("compx_auth_session", JSON.stringify(parsed));
        }
      } catch (err) {
        console.error("Failed to update leads in localStorage mock:", err);
      }
    }
  };

  // Direct mutations to upgrade plan to PRO
  const upgradeToPro = async () => {
    if (!user) return;

    const updatedUser = {
      ...user,
      plan: "pro",
      leadLimit: 10000,
    };

    setUser(updatedUser);

    if (isFirebaseConfigured && db) {
      try {
        const userDocRef = doc(db, "users", user.uid);
        await setDoc(userDocRef, { plan: "pro", leadLimit: 10000 }, { merge: true });
      } catch (err) {
        console.error("Failed to upgrade plan in Firestore:", err);
      }
    } else {
      try {
        const localKey = `compx_user_profile_${user.uid}`;
        const savedProfileStr = localStorage.getItem(localKey);
        if (savedProfileStr) {
          const profile = JSON.parse(savedProfileStr);
          profile.plan = "pro";
          profile.leadLimit = 10000;
          localStorage.setItem(localKey, JSON.stringify(profile));
        }

        // Sync auth session state
        const savedSession = localStorage.getItem("compx_auth_session");
        if (savedSession) {
          const parsed = JSON.parse(savedSession);
          parsed.plan = "pro";
          parsed.leadLimit = 10000;
          localStorage.setItem("compx_auth_session", JSON.stringify(parsed));
        }
      } catch (err) {
        console.error("Failed to upgrade plan in localStorage mock:", err);
      }
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
        updateUserLeads,
        upgradeToPro,
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
