"use client";

import Link from "next/link";

export default function HeaderTabs() {
  return (
    <>
      <nav className="flex justify-center font-bold">
        <Link className="text-center text-xl p-6" href={"/cards"}>
          卡牌
        </Link>
        <Link className="text-center text-xl p-6" href={"/decks-list"}>
          牌組一欄
        </Link>
        <Link className="text-center text-xl p-6" href={"/search"}>
          搜尋
        </Link>
      </nav>
    </>
  );
}
