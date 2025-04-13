"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
export default function HeaderTabs() {
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
    </div>
  );
}
