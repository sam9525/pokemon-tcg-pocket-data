import { use } from "react";

export default function UploadCardsButtons({
  files,
  params,
}: {
  files: { id: string; url: string }[];
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);

  const handlePutCards = (language: string) => {
    try {
      // POST request to the server
      const saveCards = async () => {
        try {
          const response = await fetch(`/api/cards/${resolvedParams.id}`, {
            method: "POST",
            headers: {
              language: language,
            },
          });
          const result = await response.json();
          if (!response.ok) {
            console.error(`Failed to save cards:`, result);
          }
        } catch (error) {
          console.error(`Error saving card ${files[0].id}:`, error);
        }
      };

      saveCards();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="flex flex-row items-center justify-center mb-10 gap-5">
      <button className="put-cards" onClick={() => handlePutCards("zh_TW")}>
        Mandarin
      </button>
      <button className="put-cards" onClick={() => handlePutCards("en_US")}>
        English
      </button>
      <button className="put-cards" onClick={() => handlePutCards("ja_JP")}>
        Japanese
      </button>
    </div>
  );
}
