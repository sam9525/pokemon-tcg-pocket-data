"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function Home() {
  const [packages, setPackages] = useState<{ id: string; url: string }[]>([]);

  useEffect(() => {
    fetch("/api/packages").then((res) => {
      res.json().then((data) => {
        setPackages(data.packages || []);
      });
    });
  }, []);
  return (
    <div className="flex flex-col items-center justify-center m-10">
      <div className="grid grid-cols-3 gap-15">
        {packages.slice(1, -3).map((pkg) => (
          <Link href={`/package/${pkg.id}`} key={pkg.id} className="m-auto">
            <Image
              src={pkg.url}
              alt={`Package ${pkg.id}`}
              width={150}
              height={200}
            />
          </Link>
        ))}
        {packages.length > 0 && (
          <Link
            href={`/package/${packages[packages.length - 1]?.id}`}
            className="m-auto"
          >
            <Image
              src={packages[packages.length - 1]?.url}
              alt={`Featured Package ${packages[packages.length - 1]?.id}`}
              width={300}
              height={200}
            />
          </Link>
        )}
      </div>
    </div>
  );
}
