"use client";

import Link from "next/link";
import HeaderTabs from "./HeaderTabs";
import User from "../icons/user";
import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import Menu from "../icons/menu";
import HeaderTabsMenu from "./HeaderTabsMenu";
import ProfileMenu from "./ProfileMenu";

export default function Header() {
  const session = useSession();
  const status = session?.status;
  const userData = session.data?.user;
  const userName = userData?.name || "";
  const [image, setImage] = useState(userData?.image || "");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const pathname = usePathname();
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [showHeaderTabs, setShowHeaderTabs] = useState(false);
  const [showHeaderTabsMenu, setShowHeaderTabsMenu] = useState(false);

  useEffect(() => {
    // Fetch user data
    if (status === "authenticated") {
      fetch("/api/profile")
        .then((res) => res.json())
        .then((data) => {
          setImage(data?.image || "");
        });
    }

    // Hide user menu and header tabs menu when pathname changes
    setShowUserMenu(false);
    setShowHeaderTabsMenu(false);

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
  }, [pathname, status]);

  // Check the screen size and update on resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 870) {
        setShowHeaderTabs(true);
      } else {
        setShowHeaderTabs(false);
      }
    };

    handleResize(); // Run once on mount

    window.addEventListener("resize", handleResize);

    // Clean up the event listener on unmount
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-foreground">
        <div className="mx-auto px-4 pt-8">
          <div className="flex justify-center mb-8">
            <Link
              className="text-primary text-2xl sm:text-3xl font-bold"
              href={"/"}
            >
              POKEMON TCG POCKET
            </Link>
            <div className="flex items-center gap-2 absolute right-5 sm:right-13">
              {showHeaderTabs && (
                <>
                  <button
                    ref={buttonRef}
                    className="w-7 sm:w-9 cursor-pointer"
                    onClick={() => setShowUserMenu(!showUserMenu)}
                  >
                    <User />
                  </button>
                </>
              )}
              {!showHeaderTabs && (
                <button
                  ref={buttonRef}
                  className="w-7 sm:w-9 cursor-pointer"
                  onClick={() => setShowHeaderTabsMenu((prev) => !prev)}
                >
                  <Menu />
                </button>
              )}
            </div>
            {showUserMenu && (
              <div
                ref={menuRef}
                className="z-200 absolute top-20 right-11 border-1 border-primary bg-background rounded-md px-4 py-2 flex flex-col items-start  gap-2"
              >
                <ProfileMenu
                  image={image}
                  userName={userName}
                  variant="default"
                />
              </div>
            )}
          </div>
          <hr className="border-0"></hr>
          {showHeaderTabs && (
            <>
              <hr className="max-w-6xl mx-auto text-primary w-full border-primary border-2"></hr>
              <HeaderTabs variant="default" />
            </>
          )}
        </div>
      </header>
      {showHeaderTabsMenu && (
        <HeaderTabsMenu
          image={image}
          userName={userName}
          setShowHeaderTabsMenu={setShowHeaderTabsMenu}
        />
      )}
    </>
  );
}
