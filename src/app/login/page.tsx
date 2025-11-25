import LoginForm from "@/components/auth/LoginForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login",
  description: "Login to Pokemon TCG Pocket",
};

export default function LoginPage() {
  return <LoginForm />;
}
