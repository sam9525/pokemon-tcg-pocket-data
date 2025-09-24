"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Image from "next/image";
import { scheduleCacheClear } from "@/utils/cardLookup";
import { useLanguage } from "@/components/provider/LanguageProvider";

const useWebWorkerPreprocessing = () => {
  const [preprocessingWorker, setPreprocessingWorker] = useState<Worker | null>(
    null
  );

  useEffect(() => {
    // Create Web Worker for preprocessing
    const preprocessingWorkerInstance = new Worker(
      new URL("../../../worker/card-preprocessor.tsx", import.meta.url)
    );

    setPreprocessingWorker(preprocessingWorkerInstance);

    return () => {
      preprocessingWorkerInstance.terminate();
    };
  }, []);

  const preprocessWithWorker = (
    cards: { id: string; url: string }[],
    packageId: string,
    language: string
  ) => {
    return new Promise((resolve, reject) => {
      if (!preprocessingWorker) {
        reject(new Error("Preprocessing worker not available"));
        return;
      }

      preprocessingWorker.onmessage = (event) => {
        resolve(event.data);
      };

      preprocessingWorker.onerror = (error) => {
        reject(error);
      };

      // Send data to preprocessing worker
      preprocessingWorker.postMessage({ cards, packageId, language });
    });
  };

  return { preprocessWithWorker };
};

export default function S3CardsPage() {
  const [packageId, setPackageId] = useState<string>("");
  const [language, setLanguage] = useState<string>("");
  const [s3Cards, setS3Cards] = useState<{ id: string; url: string }[]>([]);
  const [packageInDB, setPackageInDB] = useState<boolean>(false);
  const { preprocessWithWorker } = useWebWorkerPreprocessing();
  const { currentLanguageLookup } = useLanguage();

  const searchCards = () => {
    const toastPromise = new Promise(async (resolve, reject) => {
      const res = await fetch(
        `/api/s3Cards?packageId=${packageId}&language=${language}`
      );

      const data = await res.json();
      setS3Cards(data.files || []);

      const resInDB = await fetch(
        `/api/packageInDB?code=${packageId?.split("_")[0]}&language=${language}`
      );
      const dataInDB = await resInDB.json();
      setPackageInDB(dataInDB.packageInDB);

      if (res.ok && resInDB) {
        resolve(res);
        resolve(resInDB);
      } else {
        reject(res);
        reject(resInDB);
      }
    });

    toast.promise(toastPromise, {
      loading: currentLanguageLookup.NOTIFICATIONS.loadingS3Cards,
      error: currentLanguageLookup.NOTIFICATIONS.failedToLoadS3Cards,
      success: currentLanguageLookup.NOTIFICATIONS.s3CardsLoadedSuccessfully,
    });
  };

  const putCards = async () => {
    try {
      if (s3Cards.length > 0) {
        try {
          // POST to the database
          const toastPromise = new Promise(async (resolve, reject) => {
            // Use Web Worker for preprocessing
            const preprocessedCards = await preprocessWithWorker(
              s3Cards,
              packageId,
              language
            );

            const res = await fetch(`/api/s3Cards`, {
              method: "POST",
              body: JSON.stringify({
                preprocessedCards,
              }),
              headers: {
                "Content-Type": "application/json",
              },
            });

            const resInDB = await fetch(
              `/api/packageInDB?code=${
                packageId?.split("_")[0]
              }&language=${language}`,
              {
                method: "POST",
                body: JSON.stringify({
                  packageInDB: true,
                }),
                headers: {
                  "Content-Type": "application/json",
                },
              }
            );
            const dataInDB = await resInDB.json();
            setPackageInDB(dataInDB.packageInDB);

            if (res.ok && resInDB) {
              resolve(res);
              resolve(resInDB);

              // Clear the card lookup cache
              scheduleCacheClear(packageId?.split("_")[0]);
            } else {
              reject(res);
              reject(resInDB);
            }
          });

          toast.promise(toastPromise, {
            loading: currentLanguageLookup.NOTIFICATIONS.savingCards,
            error: currentLanguageLookup.NOTIFICATIONS.failedToSaveCards,
            success: currentLanguageLookup.NOTIFICATIONS.cardsSavedSuccessfully,
          });
        } catch (error) {
          console.error(error);
          toast.error("An error occurred while preprocessing cards");
        } finally {
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <>
      <div className="flex flex-row items-center justify-center m-5">
        <select
          value={packageId}
          onChange={(e) => setPackageId(e.target.value)}
          className="dropdown"
        >
          <option value="">
            {currentLanguageLookup.S3_CARDS.selectPackage}
          </option>
          <option value="A1_charizard_genetic-apex">
            {currentLanguageLookup.PACKAGES.A1}
          </option>
          <option value="A1a_mythical-island">
            {currentLanguageLookup.PACKAGES.A1a}
          </option>
          <option value="A2_space-time-smackdown">
            {currentLanguageLookup.PACKAGES.A2}
          </option>
          <option value="A2a_triumphant-light">
            {currentLanguageLookup.PACKAGES.A2a}
          </option>
          <option value="A2b_shining-rivalry">
            {currentLanguageLookup.PACKAGES.A2b}
          </option>
          <option value="A3_celestial-guardians">
            {currentLanguageLookup.PACKAGES.A3}
          </option>
          <option value="A3a_extradimensional-crisis">
            {currentLanguageLookup.PACKAGES.A3a}
          </option>
          <option value="A3b_eevee-groove">
            {currentLanguageLookup.PACKAGES.A3b}
          </option>
          <option value="A4_wisdom-of-sea-and-sky">
            {currentLanguageLookup.PACKAGES.A4}
          </option>
          <option value="A4a_secluded-springs ">
            {currentLanguageLookup.PACKAGES.A4a}
          </option>
        </select>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="dropdown"
        >
          <option value="">
            {currentLanguageLookup.S3_CARDS.selectLanguage}
          </option>
          <option value="zh_TW">繁體中文</option>
          <option value="ja_JP">日本語</option>
          <option value="en_US">English</option>
        </select>
        <button className="put-cards mr-5" onClick={searchCards}>
          {currentLanguageLookup.S3_CARDS.searchCards}
        </button>
        {!packageInDB && (
          <button className="put-cards" onClick={putCards}>
            {currentLanguageLookup.S3_CARDS.putCards}
          </button>
        )}
        {packageInDB && (
          <div className="put-cards">
            {currentLanguageLookup.S3_CARDS.cardsInDB}
          </div>
        )}
      </div>
      <div className="flex flex-col items-center justify-center">
        <h3 className="text-2xl font-bold mb-5">
          {s3Cards.length} {currentLanguageLookup.S3_CARDS.cardsFound}
        </h3>
        <table className="cards-container m-auto">
          <thead>
            <tr>
              <th>{currentLanguageLookup.S3_CARDS.image}</th>
              <th>{currentLanguageLookup.S3_CARDS.id}</th>
              <th>{currentLanguageLookup.S3_CARDS.image}</th>
              <th>{currentLanguageLookup.S3_CARDS.id}</th>
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
