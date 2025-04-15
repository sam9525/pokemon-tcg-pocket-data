"use client";

import Image from "next/image";
import Link from "next/link";

export default function Register() {
  return (
    <section className="w-125 h-150 flex flex-col items-center justify-center border-2 border-primary rounded-xl mx-auto my-10 bg-foreground">
      <h2 className="text-2xl font-bold">WELCOME</h2>
      <h3 className="text-xl mb-4">Sign up</h3>
      <form className="flex flex-col gap-4 w-62">
        <input type="text" placeholder="Username" />
        <input type="email" placeholder="Email" />
        <input type="password" placeholder="Password" />
        <input type="password" placeholder="Confirm Password" />
        <button type="submit">Register</button>
      </form>
      <hr className="text-primary w-62 border-primary border-1 my-4"></hr>
      <button type="button">
        <Image src="/google-icon.svg" alt="Google" width={20} height={20} />
        Log in with Google
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
