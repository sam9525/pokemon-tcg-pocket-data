"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { use } from "react";
import Image from "next/image";

export default function PackagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const [files, setFiles] = useState<{ id: string; url: string }[]>([]);
  console.log(files);

  useEffect(() => {
    try {
      const toastPromise = new Promise(async (resolve, reject) => {
        const response = await fetch(`/api/packages/${resolvedParams.id}`);
        const data = await response.json();
        setFiles(data.files || []);

        if (response.ok) {
          resolve(response);
        } else {
          reject(response);
        }
      });

      toast.promise(toastPromise, {
        loading: "Loading packages...",
        error: "Failed to load packages",
      });
    } catch (error) {
      console.error(error);
    }
  }, [resolvedParams.id]);

  return (
    <div className="flex flex-col items-center justify-center m-10">
      <div className="grid grid-cols-6 gap-5">
        {files.map((file) => (
          <Image
            key={file.id}
            src={file.url}
            alt={file.id}
            width={150}
            height={200}
          />
        ))}
      </div>
    </div>
  );
}
