import RegisterForm from "@/components/auth/RegisterForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Register",
  description: "Register for Pokemon TCG Pocket",
};

export default function RegisterPage() {
  return <RegisterForm />;
}
