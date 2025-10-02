import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { useLanguage } from "../provider/LanguageProvider";
import Image from "next/image";
import Profile from "../icons/profile";
import Earth from "../icons/earth";
import Login from "../icons/login";
import Logout from "../icons/logout";
import { toast } from "react-hot-toast";
import router from "next/router";

export default function ProfileMenu({
  image,
  userName,
  variant = "default",
}: {
  image: string;
  userName: string;
  variant?: "default" | "mobile";
}) {
  const { language, setLanguage, currentLanguageLookup } = useLanguage();
  const { status } = useSession();

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
  };

  const handleLogout = async () => {
    try {
      await signOut({ redirect: false });

      toast.success("Logout successful");

      router.push("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // Style classes based on variant
  const containerClass =
    variant === "mobile"
      ? "flex flex-col items-center gap-4 text-xl text-bold"
      : "flex flex-col items-start gap-2";

  const textSize = variant === "mobile" ? "text-xl" : "text-md";
  const linkClass =
    variant === "mobile"
      ? "flex items-center gap-2 cursor-pointer"
      : "w-full flex items-center gap-2 cursor-pointer";
  const iconSize = variant === "mobile" ? "w-8" : "w-6";
  const spanSize = variant === "mobile" ? "text-xl text-bold" : "text-sm";
  const bgColor = variant === "mobile" ? "bg-foreground" : "bg-background";

  return (
    <div className={containerClass}>
      {status === "authenticated" && (
        <>
          {variant === "default" && (
            <>
              <Image
                src={image}
                alt="avatar"
                width={120}
                height={120}
                className="rounded-full mx-auto"
              />
              <div className={`${textSize} mx-auto`}>Hello, {userName}</div>
            </>
          )}
          <Link className={linkClass} href="/profile">
            <div className={iconSize}>
              <Profile />
            </div>
            <span className={spanSize}>
              {currentLanguageLookup.PROFILES.profile}
            </span>
          </Link>
        </>
      )}
      <div className={linkClass}>
        <div className={iconSize}>
          <Earth />
        </div>
        <span className={spanSize}>
          {currentLanguageLookup.PROFILES.language}:
        </span>
        <select
          className={`language-dropdown ${bgColor}`}
          onChange={(e) => {
            handleLanguageChange(e.target.value as string);
          }}
          value={language}
        >
          <option value="zh_TW">繁體中文</option>
          <option value="en_US">English</option>
          <option value="ja_JP">Japanese</option>
        </select>
      </div>
      {status !== "authenticated" && (
        <Link className={linkClass} href="/login">
          <div className={iconSize}>
            <Login />
          </div>
          <span className={spanSize}>{currentLanguageLookup.LOGIN.login}</span>
        </Link>
      )}
      {status === "authenticated" && (
        <button className={linkClass} onClick={handleLogout}>
          <div className={iconSize}>
            <Logout />
          </div>
          <span className={spanSize}>
            {currentLanguageLookup.PROFILES.logout}
          </span>
        </button>
      )}
    </div>
  );
}
