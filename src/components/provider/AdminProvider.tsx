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
  const { data: session, status } = useSession();
  const [isAdmin, setIsAdmin] = useState(false);

  // Get isAdmin from session for user
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      setIsAdmin(session.user.isAdmin || false);
    } else {
      setIsAdmin(false);
    }
  }, [status, session]);

  return (
    <AdminContext.Provider value={{ isAdmin }}>
      {children}
    </AdminContext.Provider>
  );
}
