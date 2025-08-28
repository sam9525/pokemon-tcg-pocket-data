"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import Image from "next/image";

export default function S3CardsPage() {
  const [packageId, setPackageId] = useState<string>("");
  const [language, setLanguage] = useState<string>("");
  const [s3Cards, setS3Cards] = useState<{ id: string; url: string }[]>([]);

  function searchCards() {
    const toastPromise = new Promise(async (resolve, reject) => {
      const res = await fetch(
        `/api/s3Cards?packageId=${packageId}&language=${language}`
      );

      const data = await res.json();
      setS3Cards(data.files || []);

      if (res.ok) {
        resolve(res);
      } else {
        reject(res);
      }
    });

    toast.promise(toastPromise, {
      loading: "Loading S3 cards...",
      error: "Failed to load S3 cards",
      success: "S3 cards loaded successfully",
    });
  }

  return (
    <>
      <div className="flex flex-row items-center justify-center m-5">
        <select
          value={packageId}
          onChange={(e) => setPackageId(e.target.value)}
          className="dropdown"
        >
          <option value="">Select Package</option>
          <option value="A1_charizard_genetic-apex">A1 - Genetic Apex</option>
          <option value="A1a">A1a - Mythical Island</option>
          <option value="A2">A2 - Space-Time Smackdown</option>
          <option value="A2a">A2a - Triumphant Light</option>
          <option value="A2b">A2b - Shining Rivalry</option>
          <option value="A3">A3 - Celestial Guardians</option>
          <option value="A3a">A3a - Extradimensional Crisis</option>
          <option value="A3b">A3b - Eevee Groove</option>
          <option value="A4">A4 - Wisdom of Sea and Sky</option>
          <option value="A4a">A4a - Secluded Springs</option>
        </select>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="dropdown"
        >
          <option value="">Select Language</option>
          <option value="en_US">English</option>
          <option value="ja_JP">Japanese</option>
          <option value="zh_TW">Mandarin</option>
        </select>
        <button className="put-cards" onClick={searchCards}>
          Search Cards
        </button>
      </div>
      <div className="flex flex-col items-center justify-center">
        <h3 className="text-2xl font-bold mb-5">
          {s3Cards.length} cards found
        </h3>
        <table className="cards-container w-80 m-auto">
          <thead>
            <tr>
              <th>IMAGE</th>
              <th>ID</th>
              <th>IMAGE</th>
              <th>ID</th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              const rows = [];
              for (let i = 0; i < s3Cards.length; i += 2) {
                rows.push(
                  <tr key={s3Cards[i].id + (s3Cards[i + 1]?.id || "")}>
                    <td>
                      <Image
                        src={s3Cards[i].url}
                        alt={s3Cards[i].id}
                        width={50}
                        height={50}
                      />
                    </td>
                    <td>{s3Cards[i].id}</td>
                    {s3Cards[i + 1] ? (
                      <>
                        <td>
                          <Image
                            src={s3Cards[i + 1].url}
                            alt={s3Cards[i + 1].id}
                            width={50}
                            height={50}
                          />
                        </td>
                        <td>{s3Cards[i + 1].id}</td>
                      </>
                    ) : (
                      <>
                        <td></td>
                        <td></td>
                      </>
                    )}
                  </tr>
                );
              }
              return rows;
            })()}
          </tbody>
        </table>
      </div>
    </>
  );
}
