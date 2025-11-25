"use client";

import Image from "next/image";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useState } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/provider/LanguageProvider";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginInProgress, setLoginInProgress] = useState(false);
  const router = useRouter();
  const { currentLanguageLookup } = useLanguage();

  async function handleFormSubmit(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    setLoginInProgress(true);

    try {
      const loginPromise = new Promise(async (resolve, reject) => {
        const signInResult = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });

        if (signInResult?.error) {
          reject(signInResult.error);
        } else {
          resolve(true);
        }
      });

      await toast.promise(loginPromise, {
        loading: currentLanguageLookup.NOTIFICATIONS.loggingIn,
        success: currentLanguageLookup.NOTIFICATIONS.loginSuccessful,
        error: (err) => {
          if (err.details) {
            return err.details[0]?.message;
          }

          if (err.error) {
            return err.error;
          }

          return currentLanguageLookup.NOTIFICATIONS.loginFailed;
        },
      });

      router.push("/");
    } catch (error) {
      console.error("Login error:", error);
    } finally {
      setLoginInProgress(false);
    }
  }

  const handleGoogleSignIn = async () => {
    const toastId = toast.loading(
      currentLanguageLookup.NOTIFICATIONS.connectingToGoogle
    );
    try {
      const result = await signIn("google", { callbackUrl: "/" });
      if (result?.error) {
        toast.error(
          currentLanguageLookup.NOTIFICATIONS.failedToLoginWithGoogle,
          { id: toastId }
        );
      } else {
        toast.success(
          currentLanguageLookup.NOTIFICATIONS.googleLoginSuccessful,
          { id: toastId }
        );
      }
    } catch (error) {
      console.error("Google login error:", error);
      toast.error(currentLanguageLookup.NOTIFICATIONS.failedToLoginWithGoogle, {
        id: toastId,
      });
    }
  };

  return (
    <section className="max-w-125 h-150 flex flex-col items-center justify-center border-2 border-primary rounded-xl mx-5 sm:mx-auto my-10 bg-foreground">
      <h2 className="text-2xl font-bold">WELCOME BACK</h2>
      <h3 className="text-xl mb-4">{currentLanguageLookup.LOGIN.login}</h3>
      <form
        className="login flex flex-col gap-4 w-62"
        onSubmit={handleFormSubmit}
      >
        <input
          type="email"
          placeholder={currentLanguageLookup.LOGIN.email}
          value={email}
          onChange={(ev) => setEmail(ev.target.value)}
          disabled={loginInProgress}
        />
        <input
          type="password"
          placeholder={currentLanguageLookup.LOGIN.password}
          value={password}
          onChange={(ev) => setPassword(ev.target.value)}
          disabled={loginInProgress}
        />
        <button type="submit">{currentLanguageLookup.LOGIN.login}</button>
      </form>
      <Link href="/forgot-password" className="text-sm hover:underline">
        {currentLanguageLookup.LOGIN.forgotPassword}
      </Link>
      <hr className="text-primary w-62 border-primary border-1 my-4"></hr>
      <button type="button" onClick={handleGoogleSignIn}>
        <Image src="/google-icon.svg" alt="Google" width={20} height={20} />
        {currentLanguageLookup.LOGIN.loginWithGoogle}
      </button>
      <label htmlFor="" className="text-sm my-4">
        {currentLanguageLookup.LOGIN.notAMember}
        <Link href="/register" className="underline">
          {currentLanguageLookup.LOGIN.joinNow}
        </Link>
      </label>
    </section>
  );
}
