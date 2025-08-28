"use client";

import { UserDocument } from "@/models/User";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

export default function UsersPage() {
  const session = useSession();
  const status = session?.status;
  const [users, setUsers] = useState<UserDocument[]>([]);

  useEffect(() => {
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
        loading: "Loading users...",
        error: "Failed to load users",
        success: "Users loaded successfully",
      });
    }
  }, [status]);
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
            <th>Name</th>
            <th>Email</th>
            <th>Provider</th>
            <th>Created At</th>
            <th>Admin</th>
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
