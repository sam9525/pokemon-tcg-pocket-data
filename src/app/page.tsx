import Link from "next/link";

import { Metadata } from "next";
import CardImage from "@/components/CardImage";

export const metadata: Metadata = {
  title: "Card List",
  description: "Browse all available Pokemon TCG Pocket card packages.",
};

export default async function Home() {
  const response = await fetch(`${process.env.AUTH_URL}/api/packages`, {
    cache: "no-cache",
  });

  const { packages } = await response.json();

  return (
    <div className="flex flex-col items-center justify-center m-6 sm:m-10">
      <div className="grid grid-cols-3 gap-6 sm:gap-15">
        {packages.slice(1, -6).map((pkg: { id: string; url: string }) => (
          <Link href={`/cards/${pkg.id}`} key={pkg.id} className="m-auto">
            <CardImage
              src={pkg.url}
              alt={`card ${pkg.id}`}
              variant="card"
              width={150}
              height={200}
            />
          </Link>
        ))}
        {[
          { id: "promo_a_pink", width: 300 },
          { id: "promo_b_pink", width: 150 },
        ].map(({ id, width }) => (
          <Link href={`/cards/${id}`} key={id} className="m-auto">
            <CardImage
              src={`${process.env.S3_URL}Package/${id}.png`}
              alt={`Featured Package ${id}`}
              variant="card"
              width={width}
              height={200}
            />
          </Link>
        ))}
      </div>
    </div>
  );
}
