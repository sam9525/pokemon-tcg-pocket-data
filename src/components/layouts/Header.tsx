"use client";

import Link from "next/link";
import HeaderTabs from "./HeaderTabs";
import User from "../icons/user";

export default function Header() {
  return (
    <>
      <header className="w-full bg-foreground">
        <div className="max-w-4xl mx-auto px-4 pt-8">
          <div className="flex justify-center mb-8">
            <Link className="text-primary text-3xl font-bold" href={"/"}>
              POKEMON TCG POCKET
            </Link>
            <button className="w-9 absolute right-13 cursor-pointer">
              <User />
            </button>
          </div>
          <hr className="text-primary w-full border-primary border-2"></hr>
          <HeaderTabs />
        </div>
      </header>
    </>
  );
}
