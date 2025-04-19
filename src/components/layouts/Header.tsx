"use client";

import Link from "next/link";
import HeaderTabs from "./HeaderTabs";
import User from "../icons/user";
import Earth from "../icons/earth";
import Login from "../icons/login";
import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import Logout from "../icons/logout";

export default function Header() {
  const session = useSession();
  const userData = session.data?.user;
  const userName = userData?.name;
  const [showUserMenu, setShowUserMenu] = useState(false);
  const pathname = usePathname();
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Hide user menu when pathname changes (page navigation)
    setShowUserMenu(false);

    // Handle clicks outside the user menu
    const handleClickOutside = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (
        !menuRef.current.contains(event.target as Node) &&
        !buttonRef.current?.contains(event.target as Node)
      ) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [pathname]);

  return (
    <>
      <header className="w-full bg-foreground">
        <div className="max-w-4xl mx-auto px-4 pt-8">
          <div className="flex justify-center mb-8">
            <Link className="text-primary text-3xl font-bold" href={"/"}>
              POKEMON TCG POCKET
            </Link>
            <button
              ref={buttonRef}
              className="w-9 absolute right-13 cursor-pointer"
              onClick={() => setShowUserMenu(!showUserMenu)}
            >
              <User />
            </button>
            {showUserMenu && (
              <div
                ref={menuRef}
                className="w-42 absolute top-20 right-11 border-1 border-primary bg-background rounded-md px-4 py-2 flex flex-col items-start justify-start"
              >
                {session.status === "authenticated" && (
                  <div className="text-sm">Hello, {userName}</div>
                )}
                <div className="flex items-center justify-start mb-2 cursor-pointer">
                  <div className="w-6">
                    <Earth />
                  </div>
                  <span className="ml-2 text-sm">語言：繁體中文</span>
                </div>
                {session.status !== "authenticated" && (
                  <Link
                    className="flex items-center justify-start cursor-pointer"
                    href="/login"
                  >
                    <div className="w-6">
                      <Login />
                    </div>
                    <span className="ml-2 text-sm">登入</span>
                  </Link>
                )}
                {session.status === "authenticated" && (
                  <Link
                    className="flex items-center justify-start cursor-pointer"
                    href="/"
                    onClick={() => signOut()}
                  >
                    <div className="w-6">
                      <Logout />
                    </div>
                    <span className="ml-2 text-sm">登出</span>
                  </Link>
                )}
              </div>
            )}
          </div>
          <hr className="text-primary w-full border-primary border-2"></hr>
          <HeaderTabs />
        </div>
      </header>
    </>
  );
}
