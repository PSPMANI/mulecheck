import { redirect } from "next/navigation";
import { currentAdmin } from "@/lib/auth";
import { PasswordForm } from "./PasswordForm";

export const dynamic = "force-dynamic";

export default async function PasswordPage({ searchParams }: PageProps<"/admin/password">) {
  const me = await currentAdmin();
  if (!me) redirect("/admin/login");
  const sp = await searchParams;
  return (
    <div className="max-w-sm mx-auto mt-12">
      <h1 className="text-2xl font-bold">Change your password</h1>
      <p className="text-sm text-muted mt-1">
        {sp.first ? "This is your first login. Set a password only you know before continuing." : `Signed in as ${me.username}.`}
      </p>
      <PasswordForm />
    </div>
  );
}
