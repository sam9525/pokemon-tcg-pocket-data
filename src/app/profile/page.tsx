"use client";

import { useSession } from "next-auth/react";
import Image from "next/image";
import { useEffect, useState } from "react";

export default function Profile() {
  const session = useSession();
  const status = session?.status;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [image, setImage] = useState("");

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/profile")
        .then((res) => res.json())
        .then((data) => {
          setName(data.name);
          setEmail(data.email);
          setImage(data.image);
        });
    }
  }, [status]);
  return (
    <div className="flex items-center justify-center gap-10 my-auto mx-auto min-h-150">
      <div className="flex flex-col items-center gap-10">
        <Image
          src={image}
          alt="avatar"
          width={120}
          height={120}
          className="rounded-full mx-auto"
        />
        <button className="profile-button w-30 h-12.5">變更頭像</button>
      </div>
      <div className="border-l-2 border-primary h-110"></div>
      <div className="flex flex-col items-start gap-10">
        <div className="flex items-center justify-center gap-10">
          <div className="profile flex flex-col items-start">
            <label htmlFor="name" className="font-semibold">
              名稱
            </label>
            <input type="text" id="name" value={name} />
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
