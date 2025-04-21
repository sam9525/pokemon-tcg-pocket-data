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
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Image from "next/image";
import Profile from "../icons/profile";

export default function Header() {
  const session = useSession();
  const status = session?.status;
  const userData = session.data?.user;
  const userName = userData?.name;
  const [image, setImage] = useState(userData?.image || "");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const pathname = usePathname();
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();

  useEffect(() => {
    // Fetch user data
    if (status === "authenticated") {
      fetch("/api/profile")
        .then((res) => res.json())
        .then((data) => {
          setImage(data.image);
        });
    }

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
  }, [pathname, status]);

  const handleLogout = async () => {
    try {
      await signOut({ redirect: false });

      toast.success("Logout successful");

      router.push("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

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
                className="w-42 absolute top-20 right-11 border-1 border-primary bg-background rounded-md px-4 py-2 flex flex-col items-start  gap-2"
              >
                {status === "authenticated" && (
                  <>
                    {/* <EditableAvatar link={image} setLink={setImage} /> */}
                    <Image
                      src={image}
                      alt="avatar"
                      width={80}
                      height={80}
                      className="rounded-full mx-auto"
                    />
                    <div className="text-md mx-auto">Hello, {userName}</div>
                    <Link
                      className="w-full flex items-center gap-2 cursor-pointer"
                      href="/profile"
                    >
                      <div className="w-6">
                        <Profile />
                      </div>
                      <span className="text-sm">個人資料</span>
                    </Link>
                  </>
                )}
                <div className="w-full flex items-center gap-2 cursor-pointer">
                  <div className="w-6">
                    <Earth />
                  </div>
                  <span className="text-sm">語言：繁體中文</span>
                </div>
                {status !== "authenticated" && (
                  <Link
                    className="w-full flex items-center gap-2 cursor-pointer"
                    href="/login"
                  >
                    <div className="w-6">
                      <Login />
                    </div>
                    <span className="text-sm">登入</span>
                  </Link>
                )}
                {status === "authenticated" && (
                  <button
                    className="w-full flex items-center gap-2 cursor-pointer"
                    onClick={handleLogout}
                  >
                    <div className="w-6">
                      <Logout />
                    </div>
                    <span className="text-sm">登出</span>
                  </button>
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
