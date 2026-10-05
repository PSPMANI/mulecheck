import { redirect } from "next/navigation";
import { login, createAdminSession, isAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function doLogin(fd: FormData) {
  "use server";
  const username = fd.get("username")?.toString() ?? "";
  const password = fd.get("password")?.toString() ?? "";
  const res = await login(username, password);
  if (res.locked) redirect("/admin/login?error=locked");
  if (!res.ok || !res.userId) redirect("/admin/login?error=1");
  await createAdminSession(res.userId);
  redirect(res.mustChangePw ? "/admin/password?first=1" : "/admin");
}

export default async function Login({ searchParams }: PageProps<"/admin/login">) {
  if (await isAdmin()) redirect("/admin");
  const sp = await searchParams;
  return (
    <div className="max-w-sm mx-auto mt-12">
      <div className="text-xs uppercase tracking-widest text-muted">Staff only</div>
      <h1 className="text-2xl font-bold mt-1">Moderator login</h1>
      <form action={doLogin} className="card p-6 mt-4 space-y-4">
        <label className="block">
          <span className="text-xs text-muted">User ID</span>
          <input name="username" required autoComplete="username" className="input mt-1" autoFocus />
        </label>
        <label className="block">
          <span className="text-xs text-muted">Password</span>
          <input name="password" type="password" required autoComplete="current-password" className="input mt-1" />
        </label>
        {sp.error === "locked" ? (
          <div className="text-sm text-danger">Too many failed attempts. Try again in 15 minutes.</div>
        ) : sp.error ? (
          <div className="text-sm text-danger">Wrong user ID or password.</div>
        ) : null}
        <button className="btn btn-danger w-full justify-center">Sign in</button>
        <p className="text-xs text-muted">Accounts are created by the site owner. Sessions expire after 12 hours.</p>
      </form>
    </div>
  );
}
