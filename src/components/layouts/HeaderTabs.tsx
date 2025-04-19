"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

export default function HeaderTabs() {
  const session = useSession();
  const status = session?.status;

  const path = usePathname();
  return (
    <div className="flex justify-center font-bold header-tabs">
      <Link className={path === "/cards" ? "active" : ""} href={"/cards"}>
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
    </div>
  );
}
