"use client";

import { UserDocument } from "@/models/User";
import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useLanguage } from "@/components/provider/LanguageProvider";

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
  return (
    <div>
      <table
        className="users-table"
        style={{
          width: "80%",
          borderCollapse: "collapse",
          margin: "30px auto",
        }}
      >
        <thead>
          <tr>
            <th>{currentLanguageLookup.USERS.username}</th>
            <th>{currentLanguageLookup.USERS.email}</th>
            <th>{currentLanguageLookup.USERS.provider}</th>
            <th>{currentLanguageLookup.USERS.createdAt}</th>
            <th>{currentLanguageLookup.USERS.admin}</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user: UserDocument) => (
            <tr key={user.name || user.email}>
              <td>{user.name}</td>
              <td>{user.email}</td>
              <td>{user.provider}</td>
              <td>
                {user.createdAt
                  ? new Date(user.createdAt).toLocaleDateString()
                  : "N/A"}
              </td>
              <td>
                {user.isAdmin ? (
                  <span role="img" aria-label="Admin">
                    ✓
                  </span>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
