"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { useSession } from "next-auth/react";

interface AdminContextType {
  isAdmin: boolean;
}

const AdminContext = createContext<AdminContextType>({
  isAdmin: false,
});

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error("useAdmin must be used within an AdminProvider");
  }
  return context;
};

interface AdminProviderProps {
  children: ReactNode;
}

export default function AdminProvider({ children }: AdminProviderProps) {
  const { status } = useSession();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const fetchAdminStatus = async () => {
      if (status === "authenticated") {
        try {
          const response = await fetch("/api/profile");
          const data = await response.json();
          setIsAdmin(data.isAdmin || false);
        } catch (error) {
          console.error("Failed to fetch admin status:", error);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
    };

    fetchAdminStatus();
  }, [status]);

  return (
    <AdminContext.Provider value={{ isAdmin }}>
      {children}
    </AdminContext.Provider>
  );
}
