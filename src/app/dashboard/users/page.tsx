"use client";

import { UserDocument } from "@/models/User";
import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useLanguage } from "@/components/provider/LanguageProvider";
import { List } from "react-window";
import GoogleIcon from "@/components/icons/google";

export default function UsersPage() {
  const hasLoaded = useRef(false);
  const session = useSession();
  const status = session?.status;
  const [users, setUsers] = useState<UserDocument[]>([]);
  const { currentLanguageLookup } = useLanguage();

  useEffect(() => {
    if (hasLoaded.current) return;
    hasLoaded.current = true;

    if (status === "authenticated") {
      const toastPromise = new Promise(async (resolve, reject) => {
        fetch("/api/users")
          .then((res) => {
            res.json().then((data) => {
              setUsers(data.users);
              resolve(res);
            });
          })
          .catch((err) => {
            reject(err);
          });
      });

      toast.promise(toastPromise, {
        loading: currentLanguageLookup.NOTIFICATIONS.loadingUsers,
        error: currentLanguageLookup.NOTIFICATIONS.failedToLoadUsers,
        success: currentLanguageLookup.NOTIFICATIONS.usersLoadedSuccessfully,
      });
    }
  }, [status, currentLanguageLookup]);

  interface UserRowProps {
    index: number;
    users: UserDocument[];
  }
  const UserRow = ({ index, users }: UserRowProps) => {
    const user = users[index];
    if (!user) return null;

    return (
      <div className="flex flex-row items-center gap-2 px-2 text-center p-2 border-b-1">
        <div className="flex-1 border-r-1">{user.name}</div>
        <div className="flex-2 border-r-1">{user.email}</div>
        <div className="flex-1 border-r-1 flex justify-center">
          {user.provider === "google" ? (
            <div className="w-7 h-7">
              <GoogleIcon />
            </div>
          ) : (
            user.provider
          )}
        </div>
        <div className="flex-1 border-r-1">
          {user.createdAt
            ? new Date(user.createdAt).toLocaleDateString()
            : "N/A"}
        </div>
        <div className="flex-1 flex justify-center">
          {user.isAdmin ? (
            <div className="w-10 text-sm font-semibold">
              <span role="img" aria-label="Admin">
                ✓
              </span>
            </div>
          ) : null}
        </div>
      </div>
    );
  };
  return (
    <>
      <div className="w-[80%] my-[30px] mx-auto border-collapse border-1">
        <div className="flex flex-row items-center gap-2 px-2 text-center p-2 border-b bg-primary text-foreground font-semibold">
          <div className="flex-1">{currentLanguageLookup.USERS.username}</div>
          <div className="flex-2">{currentLanguageLookup.USERS.email}</div>
          <div className="flex-1">{currentLanguageLookup.USERS.provider}</div>
          <div className="flex-1">{currentLanguageLookup.USERS.createdAt}</div>
          <div className="flex-1">{currentLanguageLookup.USERS.admin}</div>
        </div>
        <List
          rowCount={users.length}
          rowHeight={0}
          rowComponent={({ index }) => <UserRow index={index} users={users} />}
          rowProps={{}}
          className="scrollbar"
        />
      </div>
    </>
  );
}
