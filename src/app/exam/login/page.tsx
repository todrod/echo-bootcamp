import { getCurrentUser } from "@/lib/auth";
import { AuthForm } from "@/components/AuthForm";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/exam");
  return <AuthForm />;
}
