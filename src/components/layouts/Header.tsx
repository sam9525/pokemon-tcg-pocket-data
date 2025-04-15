"use client";

import Link from "next/link";
import HeaderTabs from "./HeaderTabs";
import User from "../icons/user";
import Earth from "../icons/earth";
import Login from "../icons/login";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

export default function Header() {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const pathname = usePathname();

  // Hide user menu when pathname changes (page navigation)
  useEffect(() => {
    setShowUserMenu(false);
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
              className="w-9 absolute right-13 cursor-pointer"
              onClick={() => setShowUserMenu(!showUserMenu)}
            >
              <User />
            </button>
            {showUserMenu && (
              <div className="w-42 absolute top-20 right-11 border-1 border-primary bg-background rounded-md px-4 py-2 flex flex-col items-start justify-start">
                <div className="flex items-center justify-start mb-2 cursor-pointer">
                  <div className="w-6">
                    <Earth />
                  </div>
                  <span className="ml-2 text-sm">語言：繁體中文</span>
                </div>
                <Link
                  className="flex items-center justify-start cursor-pointer"
                  href="/login"
                >
                  <div className="w-6">
                    <Login />
                  </div>
                  <span className="ml-2 text-sm">登入</span>
                </Link>
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
