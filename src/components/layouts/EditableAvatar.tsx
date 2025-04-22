import Image from "next/image";
import { useRef } from "react";

export default function EditableAvatar({
  link,
  setLink,
}: {
  link: string | File;
  setLink: (link: File) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLink(file);
    }
  };

  return (
    <>
      {link && (
        <div className="flex flex-col items-center gap-8">
          <Image
            src={typeof link === "string" ? link : URL.createObjectURL(link)}
            alt="avatar"
            width={120}
            height={120}
            className="rounded-full mx-auto"
          />
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
          <button
            className="profile-button w-30 h-12.5"
            onClick={() => fileInputRef.current?.click()}
          >
            變更頭像
          </button>
        </div>
      )}
    </>
  );
}
