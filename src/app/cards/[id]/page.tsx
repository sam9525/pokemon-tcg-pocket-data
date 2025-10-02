"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { use } from "react";
import FilteringTabs from "@/components/layouts/FilteringTabs";
import FilteredItems from "@/components/layouts/FilteredItems";
import { useLanguage } from "@/components/provider/LanguageProvider";

export default function PackagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const [files, setFiles] = useState<{ id: string; url: string }[]>([]);
  const [filter, setFilter] = useState<string[]>([]);
  const { language, currentLanguageLookup } = useLanguage();

  useEffect(() => {
    try {
      const toastPromise = new Promise(async (resolve, reject) => {
        const response = await fetch(
          `/api/cards/${resolvedParams.id}?filter=${filter.join(
            ","
          )}&language=${language}`
        );
        const data = await response.json();
        setFiles(data.cards || []);

        if (response.ok) {
          resolve(response);
        } else {
          reject(response);
        }
      });

      toast.promise(toastPromise, {
        loading: currentLanguageLookup.NOTIFICATIONS.loadingCards,
        error: currentLanguageLookup.NOTIFICATIONS.failedToLoadCards,
        success: currentLanguageLookup.NOTIFICATIONS.cardsLoadedSuccessfully,
      });
    } catch (error) {
      console.error(error);
    }
  }, [resolvedParams.id, filter, language, currentLanguageLookup]);

  return (
    <div className="flex flex-col items-center justify-center m-5 sm:m-7 md:m-10">
      <FilteringTabs
        filter={filter}
        setFilter={setFilter}
        currentLanguageLookup={currentLanguageLookup}
      />
      <FilteredItems files={files} />
    </div>
  );
}
