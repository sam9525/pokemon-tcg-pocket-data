"use client";

import { signIn } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import toast from "react-hot-toast";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const image =
    "https://pokemon-tcg-pocket-data.s3.ap-southeast-2.amazonaws.com/Avatar/avatar.jpg";
  const [confirmPassword, setConfirmPassword] = useState("");
  const [creatingUser, setCreatingUser] = useState(false);

  async function handleFormSubmit(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    setCreatingUser(true);

    try {
      const registerPromise = new Promise(async (resolve, reject) => {
        const response = await fetch("/api/register", {
          method: "POST",
          credentials: "include",
          body: JSON.stringify({
            name,
            email,
            password,
            confirmPassword,
            image,
          }),
          headers: {
            "Content-Type": "application/json",
          },
        });

        const data = await response.json();

        if (!response.ok) {
          setCreatingUser(false);
          reject(data);
        }

        resolve(data);
      });

      await toast.promise(registerPromise, {
        loading: "Registering",
        success: "Registration successful",
        error: (err) => {
          if (err.details) {
            return err.details[0]?.message;
          }

          if (err.error) {
            return err.error;
          }

          return "Registration failed";
        },
      });

      const signInResult = await signIn("credentials", {
        email,
        password,
        callbackUrl: "/",
      });

      if (signInResult?.error) {
        toast.error(signInResult.error);
        setCreatingUser(false);
      }
    } catch (error) {
      console.error("Registration error:", error);
      setCreatingUser(false);
    }
  }

  return (
    <section className="w-125 h-150 flex flex-col items-center justify-center border-2 border-primary rounded-xl mx-auto my-10 bg-foreground">
      <h2 className="text-2xl font-bold">WELCOME</h2>
      <h3 className="text-xl mb-4">Sign up</h3>
      <form
        className="register flex flex-col gap-4 w-62"
        onSubmit={handleFormSubmit}
      >
        <input
          type="text"
          placeholder="Username"
          value={name}
          onChange={(ev) => setName(ev.target.value)}
          disabled={creatingUser}
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(ev) => setEmail(ev.target.value)}
          disabled={creatingUser}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(ev) => setPassword(ev.target.value)}
          disabled={creatingUser}
        />
        <input
          type="password"
          placeholder="Confirm Password"
          value={confirmPassword}
          onChange={(ev) => setConfirmPassword(ev.target.value)}
          disabled={creatingUser}
        />
        <button type="submit">Register</button>
      </form>
      <hr className="text-primary w-62 border-primary border-1 my-4"></hr>
      <button
        type="button"
        onClick={() => signIn("google", { callbackUrl: "/" })}
        disabled={creatingUser}
      >
        <Image src="/google-icon.svg" alt="Google" width={20} height={20} />
        Sign up with Google
      </button>
      <label htmlFor="" className="text-sm my-4">
        Already have an account?{" "}
        <Link href="/login" className="underline">
          Log in
        </Link>
      </label>
    </section>
  );
}
