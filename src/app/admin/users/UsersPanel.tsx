"use client";

import { useActionState } from "react";
import type { AdminUser } from "@prisma/client";
import { createUser, resetUserPassword, setUserActive, setUserRole, deleteUser, type UserState } from "./actions";
import { fmtDateTime } from "@/lib/format";

export function UsersPanel({ users, meId }: { users: AdminUser[]; meId: string }) {
  const [state, action, pending] = useActionState<UserState, FormData>(createUser, {});
  return (
    <div className="space-y-4">
      <div className="card p-4 text-sm text-muted">
        <strong className="text-fg">Roles.</strong> Owner can do everything including Settings, Site text and this page. Moderator can review reports, answer
        guidance, moderate the community and export case files, but cannot change settings or manage users. Every action is logged with the user ID.
      </div>

      <form action={action} className="card p-5 grid sm:grid-cols-5 gap-3 items-end">
        <label className="block">
          <span className="text-xs text-muted">User ID *</span>
          <input name="username" required pattern="[a-z0-9._-]{3,30}" className="input mt-1" placeholder="ravi.m" />
        </label>
        <label className="block">
          <span className="text-xs text-muted">Display name</span>
          <input name="displayName" className="input mt-1" placeholder="Ravi" />
        </label>
        <label className="block">
          <span className="text-xs text-muted">Role</span>
          <select name="role" className="input mt-1" defaultValue="MODERATOR">
            <option value="MODERATOR">Moderator</option>
            <option value="OWNER">Owner</option>
          </select>
        </label>
        <label className="block">
          <span className="text-xs text-muted">Password (blank = generate)</span>
          <input name="password" type="text" autoComplete="off" className="input mt-1" placeholder="auto" />
        </label>
        <button disabled={pending} className="btn btn-danger justify-center">
          {pending ? "Creating..." : "Add user"}
        </button>
        {state.error && <div className="sm:col-span-5 text-sm text-danger">{state.error}</div>}
        {state.ok && (
          <div className="sm:col-span-5 text-sm rounded-lg border border-ok/40 bg-ok/10 p-3">
            Created <strong>{state.username}</strong>.
            {state.tempPassword && (
              <>
                {" "}
                Temporary password: <code className="mono text-base">{state.tempPassword}</code>. Share it privately. They must change it at first login.
              </>
            )}
          </div>
        )}
      </form>

      <div className="card overflow-x-auto">
        <table className="data">
          <thead>
            <tr>
              <th>User ID</th>
              <th>Name</th>
              <th>Role</th>
              <th>Status</th>
              <th>Last login</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className={u.active ? "" : "opacity-60"}>
                <td className="mono font-semibold">
                  {u.username}
                  {u.id === meId && <span className="badge badge-blue ml-2">you</span>}
                  {u.mustChangePw && <span className="badge badge-amber ml-2">must change password</span>}
                </td>
                <td>{u.displayName}</td>
                <td>
                  {u.id === meId ? (
                    <span className="badge badge-gray">{u.role}</span>
                  ) : (
                    <form action={setUserRole} className="flex gap-1">
                      <input type="hidden" name="id" value={u.id} />
                      <select name="role" defaultValue={u.role} className="input !py-1 !px-2 text-xs w-32">
                        <option value="MODERATOR">Moderator</option>
                        <option value="OWNER">Owner</option>
                      </select>
                      <button className="btn btn-sm">Set</button>
                    </form>
                  )}
                </td>
                <td>
                  <span className={`badge ${u.active ? "badge-green" : "badge-gray"}`}>{u.active ? "active" : "disabled"}</span>
                </td>
                <td className="text-xs text-muted whitespace-nowrap">{u.lastLoginAt ? fmtDateTime(u.lastLoginAt) : "never"}</td>
                <td>
                  {u.id !== meId && (
                    <div className="flex flex-wrap gap-1">
                      <form action={setUserActive}>
                        <input type="hidden" name="id" value={u.id} />
                        <input type="hidden" name="active" value={u.active ? "0" : "1"} />
                        <button className="btn btn-sm">{u.active ? "Disable" : "Enable"}</button>
                      </form>
                      <ResetButton id={u.id} />
                      <form action={deleteUser}>
                        <input type="hidden" name="id" value={u.id} />
                        <button className="btn btn-sm text-danger">Delete</button>
                      </form>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ResetButton({ id }: { id: string }) {
  const [state, action, pending] = useActionState<UserState, FormData>(resetUserPassword, {});
  return (
    <form action={action} className="inline-flex flex-col gap-1">
      <input type="hidden" name="id" value={id} />
      <button disabled={pending} className="btn btn-sm">
        {pending ? "..." : "Reset password"}
      </button>
      {state.tempPassword && (
        <span className="text-xs">
          New: <code className="mono">{state.tempPassword}</code>
        </span>
      )}
    </form>
  );
}
