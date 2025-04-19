"use client";

import Image from "next/image";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginInProgress, setLoginInProgress] = useState(false);

  async function handleFormSubmit(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    setLoginInProgress(true);
    await signIn("credentials", { email, password, callbackUrl: "/" });
    setLoginInProgress(false);
  }

  return (
    <section className="w-125 h-150 flex flex-col items-center justify-center border-2 border-primary rounded-xl mx-auto my-10 bg-foreground">
      <h2 className="text-2xl font-bold">WELCOME BACK</h2>
      <h3 className="text-xl mb-4">Log in</h3>
      <form className="flex flex-col gap-4 w-62" onSubmit={handleFormSubmit}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(ev) => setEmail(ev.target.value)}
          disabled={loginInProgress}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(ev) => setPassword(ev.target.value)}
          disabled={loginInProgress}
        />
        <button type="submit">Log in</button>
      </form>
      <Link href="/forgot-password" className="text-sm hover:underline">
        Forgot password?
      </Link>
      <hr className="text-primary w-62 border-primary border-1 my-4"></hr>
      <button
        type="button"
        onClick={() => signIn("google", { callbackUrl: "/" })}
      >
        <Image src="/google-icon.svg" alt="Google" width={20} height={20} />
        Log in with Google
      </button>
      <label htmlFor="" className="text-sm my-4">
        Not a member?{" "}
        <Link href="/register" className="underline">
          Join now
        </Link>
      </label>
    </section>
  );
}
