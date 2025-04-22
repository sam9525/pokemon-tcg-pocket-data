"use client";

import EditableAvatar from "@/components/layouts/EditableAvatar";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

// Types
interface ProfileData {
  name: string;
  email: string;
  image: string;
}

// API service
const profileService = {
  async getProfile(): Promise<ProfileData> {
    const res = await fetch("/api/profile");
    if (!res.ok) throw new Error("Failed to fetch profile");
    return res.json();
  },

  async updateProfile(data: Partial<ProfileData>): Promise<ProfileData> {
    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update profile");
    return res.json();
  },

  async deleteImage(url: string): Promise<void> {
    const res = await fetch("/api/profile", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    if (!res.ok) throw new Error("Failed to delete image");
  },

  async uploadImage(file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error("Failed to upload image");
    return res.json();
  },
};
export default function Profile() {
  const session = useSession();
  const status = session?.status;
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [image, setImage] = useState("");
  const router = useRouter();
  const [profileFetched, setProfileFetched] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/profile")
        .then((res) => res.json())
        .then((data) => {
          setUsername(data.name || "");
          setEmail(data.email || "");
          setImage(data.image || "");
          setProfileFetched(true);
        });
    }
  }, [status]);

  const handleAvatarChange = async (file: File) => {
    try {
      // delete old image
      if (image) {
        await profileService.deleteImage(image);
      }

      // upload new image
      const { url } = await profileService.uploadImage(file);
      setImage(url);

      // update profile
      await profileService.updateProfile({ image: url });
    } catch (error) {
      console.error("Error uploading avatar:", error);
    }
  };

  const handleNameChange = async (newName: string) => {
    try {
      const putPromise = new Promise(async (resolve, reject) => {
        const res = await fetch("/api/profile", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: newName }),
        });

        const data = await res.json();
        if (data && data.name) {
          setUsername(data.name);
        } else {
          setUsername(newName);
        }

        if (!res.ok) {
          reject(data);
        } else {
          resolve(data);
        }
      });

      await toast.promise(putPromise, {
        loading: "Updating name...",
        success: "Name updated successfully",
        error: "Failed to update name",
      });
    } catch (err) {
      console.log(err);
    }
  };

  if (status === "loading" || !profileFetched) {
    toast.loading("Loading...", { id: "loading-toast" });
  }
  if (status === "unauthenticated") {
    toast.error("Please login to continue", { id: "loading-toast" });
    router.push("/login");
  }
  if (status === "authenticated") {
    toast.dismiss("loading-toast");
  }

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
              onChange={(ev: React.ChangeEvent<HTMLInputElement>) =>
                setUsername(ev.target.value)
              }
            />
          </div>
          <button
            className="profile-button w-30 h-8 rounded-md text-sm"
            onClick={() => handleNameChange(username)}
          >
            變更名稱
          </button>
        </div>
        <div className="profile flex flex-col items-start">
          <label htmlFor="email" className="font-semibold">
            電子郵件
          </label>
          <input type="email" id="email" value={email} readOnly />
        </div>
        <div className="flex items-center justify-center gap-10">
          <div className="profile flex flex-col items-start">
            <label htmlFor="password" className="font-semibold">
              密碼
            </label>
            <input
              type="password"
              id="password"
              value={"************"}
              readOnly
            />
          </div>
          <button className="profile-button w-30 h-8 rounded-md text-sm">
            變更密碼
          </button>
        </div>
      </div>
    </div>
  );
}
