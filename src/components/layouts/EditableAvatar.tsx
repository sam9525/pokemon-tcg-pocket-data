import Image from "next/image";

export default function EditableAvatar({ link }: { link: string }) {
  return (
    <>
      {link && (
        <div className="flex flex-col items-center gap-8">
          <Image
            src={link}
            alt="avatar"
            width={120}
            height={120}
            className="rounded-full mx-auto"
          />
          <button className="profile-button w-30 h-12.5">變更頭像</button>
        </div>
      )}
      {!link && (
        <div className="text-center bg-gray-200 p-4 text-gray-500 rounded-full">
          No image
        </div>
      )}
    </>
  );
}
