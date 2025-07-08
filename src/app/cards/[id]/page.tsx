"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { use } from "react";
import FilteringTabs from "@/components/layouts/FilteringTabs";
import FilteredItems from "@/components/layouts/FilteredItems";

export default function PackagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const [files, setFiles] = useState<{ id: string; url: string }[]>([]);
  const [filter, setFilter] = useState<string[]>([]);

  useEffect(() => {
    try {
      const toastPromise = new Promise(async (resolve, reject) => {
        const response = await fetch(
          `/api/cards/${resolvedParams.id}?filter=${filter.join(",")}`
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
        loading: "Loading cards...",
        error: "Failed to load cards",
      });
    } catch (error) {
      console.error(error);
    }
  }, [resolvedParams.id, filter]);

  return (
    <div className="flex flex-col items-center justify-center m-10">
      <FilteringTabs filter={filter} setFilter={setFilter} />
      <FilteredItems files={files} />
    </div>
  );
}
