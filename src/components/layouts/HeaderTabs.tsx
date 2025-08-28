"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

export default function HeaderTabs() {
  const session = useSession();
  const status = session?.status;
  const path = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    try {
      // Get user data to check if the user is admin
      fetch("/api/profile")
        .then((response) => response.json())
        .then((data) => {
          setIsAdmin(data.isAdmin);
        });
    } catch (error) {
      console.log(error);
    }
  });

  if (status === "loading") {
    return (
      <div className="flex justify-center font-bold header-tabs">
        <Link
          className={path.includes("/cards") || path === "/" ? "active" : ""}
          href={"/"}
        >
          卡牌
        </Link>
        <Link
          className={path === "/decks-list" ? "active" : ""}
          href={"/decks-list"}
        >
          牌組一欄
        </Link>
        <Link className={path === "/search" ? "active" : ""} href={"/search"}>
          搜尋
        </Link>
      </div>
    );
  }

  return (
    <div className="flex justify-center font-bold header-tabs">
      <Link
        className={path.includes("/cards") || path === "/" ? "active" : ""}
        href={"/"}
      >
        卡牌
      </Link>
      <Link
        className={path === "/decks-list" ? "active" : ""}
        href={"/decks-list"}
      >
        牌組一欄
      </Link>
      <Link className={path === "/search" ? "active" : ""} href={"/search"}>
        搜尋
      </Link>
      {status === "authenticated" && (
        <>
          <Link
            className={path === "/my-decks" ? "active" : ""}
            href={"/my-decks"}
          >
            我的牌組
          </Link>
          <Link
            className={path === "/deck-collection" ? "active" : ""}
            href={"/deck-collection"}
          >
            牌組收藏
          </Link>
          <Link
            className={path === "/deck-builder" ? "active" : ""}
            href={"/deck-builder"}
          >
            組牌
          </Link>
        </>
      )}
      {status === "authenticated" && isAdmin && (
        <>
          <Link
            className={path === "/dashboard/users" ? "active" : ""}
            href={"/dashboard/users"}
          >
            使用者
          </Link>
          <Link
            className={path === "/dashboard/s3Cards" ? "active" : ""}
            href={"/dashboard/s3Cards"}
          >
            S3 卡牌
          </Link>
        </>
      )}
    </div>
  );
}
