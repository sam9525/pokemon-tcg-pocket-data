"use client";

import { useEffect, useState } from "react";
import { use } from "react";

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
      const fetchFiles = async () => {
        const response = await fetch(`/api/packages/${resolvedParams.id}`);
        const data = await response.json();
        setFiles(data.files || []);
      };
      fetchFiles();
    } catch (error) {
      console.error(error);
    }
  }, [resolvedParams.id]);

  return <div>Package {resolvedParams.id}</div>;
}
