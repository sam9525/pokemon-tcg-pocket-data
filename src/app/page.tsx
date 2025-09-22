"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useLanguage } from "@/components/provider/LanguageProvider";

export default function Home() {
  const hasLoaded = useRef(false);
  const [packages, setPackages] = useState<{ id: string; url: string }[]>([]);
  const { currentLanguageLookup } = useLanguage();

  useEffect(() => {
    if (hasLoaded.current) return;
    hasLoaded.current = true;

    try {
      const toastPromise = new Promise(async (resolve, reject) => {
        const response = await fetch("/api/packages");
        const data = await response.json();
        setPackages(data.packages || []);

        if (response.ok) {
          resolve(response);
        } else {
          reject(response);
        }
      });

      toast.promise(toastPromise, {
        loading: currentLanguageLookup.NOTIFICATIONS.loadingPackages,
        error: currentLanguageLookup.NOTIFICATIONS.failedToLoadPackages,
        success: currentLanguageLookup.NOTIFICATIONS.packagesLoaded,
      });
    } catch (error) {
      console.error(error);
    }
  }, [currentLanguageLookup]);
  return (
    <div className="flex flex-col items-center justify-center m-10">
      <div className="grid grid-cols-3 gap-15">
        {packages.slice(1, -3).map((pkg) => (
          <Link href={`/cards/${pkg.id}`} key={pkg.id} className="m-auto">
            <Image
              src={pkg.url}
              alt={`card ${pkg.id}`}
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
