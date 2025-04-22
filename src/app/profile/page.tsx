"use client";

import EditableAvatar from "@/components/layouts/EditableAvatar";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

export default function Profile() {
  const session = useSession();
  const status = session?.status;
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [image, setImage] = useState("");

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/profile")
        .then((res) => res.json())
        .then((data) => {
          setUsername(data.name || "");
          setEmail(data.email || "");
          setImage(data.image || "");
        });
    }
  }, [status]);

  const handleAvatarChange = async (newImage: File | string) => {
    try {
      const formData = new FormData();
      formData.append("file", newImage);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Failed to update image");
      const data = await res.json();
      setImage(data.url);

      const putRes = await fetch("/api/profile", {
        method: "PUT",
        body: JSON.stringify({ image: data.url }),
      });

      if (!putRes.ok) throw new Error("Failed to update image");

      const putData = await putRes.json();
      console.log(putData);
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <div className="flex items-center justify-center gap-10 my-auto mx-auto min-h-150">
      <EditableAvatar link={image} setLink={handleAvatarChange} />
      <div className="border-l-2 border-primary h-110"></div>
      <div className="flex flex-col items-start gap-10">
        <div className="flex items-center justify-center gap-10">
          <div className="profile flex flex-col items-start">
            <label htmlFor="name" className="font-semibold">
              名稱
            </label>
            <input
              type="text"
              id="name"
              value={username || ""}
              onChange={(ev) => setUsername(ev.target.value)}
            />
          </div>
          <button className="profile-button w-30 h-8 rounded-md text-sm">
            變更名稱
          </button>
        </div>
        <div className="profile flex flex-col items-start">
          <label htmlFor="email" className="font-semibold">
            電子郵件
          </label>
          <input type="email" id="email" value={email} />
        </div>
        <div className="flex items-center justify-center gap-10">
          <div className="profile flex flex-col items-start">
            <label htmlFor="password" className="font-semibold">
              密碼
            </label>
            <input type="password" id="password" value={"************"} />
          </div>
          <button className="profile-button w-30 h-8 rounded-md text-sm">
            變更密碼
          </button>
        </div>
      </div>
    </div>
  );
}
