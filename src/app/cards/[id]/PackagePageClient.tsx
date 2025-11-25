"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import FilteringTabs from "@/components/layouts/FilteringTabs";
import FilteredItems from "@/components/layouts/FilteredItems";
import { useLanguage } from "@/components/provider/LanguageProvider";

export default function PackagePageClient({
  packageId,
  initialCards,
  focusedCardId,
}: {
  packageId: string;
  initialCards: { id: string; url: string }[];
  focusedCardId?: string;
}) {
  const [files, setFiles] = useState(initialCards);
  const [filter, setFilter] = useState<string[]>([]);
  const { language, currentLanguageLookup } = useLanguage();

  useEffect(() => {
    try {
      if (language !== "en_US" || filter.length > 0) {
        const toastPromise = new Promise(async (resolve, reject) => {
          const response = await fetch(
            `/api/cards/${packageId}?filter=${filter.join(
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
      }
    } catch (error) {
      console.error(error);
    }
  }, [packageId, filter, language, currentLanguageLookup]);

  return (
    <div className="flex flex-col items-center justify-center m-5 sm:m-7 md:m-10">
      <FilteringTabs
        filter={filter}
        setFilter={setFilter}
        currentLanguageLookup={currentLanguageLookup}
      />
      <FilteredItems
        files={files}
        packageId={packageId}
        focusedCardId={focusedCardId}
      />
    </div>
  );
}
