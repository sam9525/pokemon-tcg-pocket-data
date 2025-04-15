"use client";

import Image from "next/image";
import Link from "next/link";

export default function LoginPage() {
  return (
    <section className="w-125 h-150 flex flex-col items-center justify-center border-2 border-primary rounded-xl mx-auto my-10 bg-foreground">
      <h2 className="text-2xl font-bold">WELCOME</h2>
      <h3 className="text-xl mb-4">Log in</h3>
      <form className="flex flex-col gap-4 w-62">
        <input type="email" placeholder="Email" />
        <input type="password" placeholder="Password" />
        <button type="submit">Log in</button>
      </form>
      <Link href="/forgot-password" className="text-sm hover:underline">
        Forgot password?
      </Link>
      <hr className="text-primary w-62 border-primary border-1 my-4"></hr>
      <button type="button">
        <Image src="/google-icon.svg" alt="Google" width={20} height={20} />
        Log in with Google
      </button>
      <label htmlFor="" className="text-sm my-4">
        Not a member?{" "}
        <Link href="/signup" className="underline">
          Join now
        </Link>
      </label>
    </section>
  );
}
