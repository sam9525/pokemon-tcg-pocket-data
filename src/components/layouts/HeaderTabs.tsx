"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useLanguage } from "@/components/provider/LanguageProvider";

export default function HeaderTabs({
  variant = "default",
}: {
  variant?: "default" | "mobile";
}) {
  const session = useSession();
  const status = session?.status;
  const path = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  const { currentLanguageLookup } = useLanguage();

  const containerClass =
    variant === "mobile"
      ? "bg-foreground px-4 py-2 flex flex-col items-center gap-5 text-xl text-bold"
      : "flex justify-center font-bold header-tabs items-center";

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
      <div className={containerClass}>
        <Link
          className={path.includes("/cards") || path === "/" ? "active" : ""}
          href={"/"}
        >
          {currentLanguageLookup.HEADER_TABS.cards}
        </Link>
        <Link
          className={path === "/decks-list" ? "active" : ""}
          href={"/decks-list"}
        >
          {currentLanguageLookup.HEADER_TABS.decksList}
        </Link>
        <Link className={path === "/search" ? "active" : ""} href={"/search"}>
          {currentLanguageLookup.HEADER_TABS.search}
        </Link>
      </div>
    );
  }

  return (
    <div className={containerClass}>
      <Link
        className={path.includes("/cards") || path === "/" ? "active" : ""}
        href={"/"}
      >
        {currentLanguageLookup.HEADER_TABS.cards}
      </Link>
      <Link
        className={path === "/decks-list" ? "active" : ""}
        href={"/decks-list"}
      >
        {currentLanguageLookup.HEADER_TABS.decksList}
      </Link>
      <Link className={path === "/search" ? "active" : ""} href={"/search"}>
        {currentLanguageLookup.HEADER_TABS.search}
      </Link>
      {status === "authenticated" && (
        <>
          <Link
            className={path === "/my-decks" ? "active" : ""}
            href={"/my-decks"}
          >
            {currentLanguageLookup.HEADER_TABS.myDecks}
          </Link>
          <Link
            className={path === "/deck-collection" ? "active" : ""}
            href={"/deck-collection"}
          >
            {currentLanguageLookup.HEADER_TABS.deckCollection}
          </Link>
          <Link
            className={path === "/deck-builder" ? "active" : ""}
            href={"/deck-builder"}
          >
            {currentLanguageLookup.HEADER_TABS.deckBuilder}
          </Link>
        </>
      )}
      {status === "authenticated" && isAdmin && (
        <>
          <Link
            className={path === "/dashboard/users" ? "active" : ""}
            href={"/dashboard/users"}
          >
            {currentLanguageLookup.HEADER_TABS.users}
          </Link>
          <Link
            className={path === "/dashboard/s3Cards" ? "active" : ""}
            href={"/dashboard/s3Cards"}
          >
            {currentLanguageLookup.HEADER_TABS.s3Cards}
          </Link>
        </>
      )}
    </div>
  );
}
