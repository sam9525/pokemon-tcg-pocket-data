"Use Client";

import Link from "next/link";

export default function Header() {
  return (
    <>
      <header className="w-full bg-foreground">
        <div className="max-w-4xl mx-auto px-4 pt-8">
          <div className="flex justify-center mb-8">
            <Link className="text-primary text-3xl font-bold" href={"/"}>
              POKEMON TCG POCKET
            </Link>
          </div>
          <hr className="text-primary w-full border-primary border-2"></hr>
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
        </div>
      </header>
    </>
  );
}
