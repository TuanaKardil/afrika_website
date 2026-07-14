import type { Metadata } from "next";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

export const metadata: Metadata = { title: "Üyeler" };
export const dynamic = "force-dynamic";

interface Member {
  id: string;
  email: string;
  name: string | null;
  providers: string[];
  createdAt: string;
  lastSignInAt: string | null;
  confirmed: boolean;
}

function toMember(u: User): Member {
  const app = (u.app_metadata ?? {}) as { provider?: string; providers?: string[] };
  const meta = (u.user_metadata ?? {}) as { full_name?: string; name?: string };
  const providers = app.providers ?? (app.provider ? [app.provider] : []);
  return {
    id: u.id,
    email: u.email ?? "-",
    name: meta.full_name ?? meta.name ?? null,
    providers,
    createdAt: u.created_at,
    lastSignInAt: u.last_sign_in_at ?? null,
    confirmed: Boolean(u.email_confirmed_at),
  };
}

async function getMembers(): Promise<Member[]> {
  const supabase = createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const perPage = 1000;
  let page = 1;
  const users: User[] = [];
  // Paginate through all auth users (Supabase Admin API caps per page).
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < perPage) break;
    page += 1;
  }

  return users
    .map(toMember)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function formatDate(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const PROVIDER_LABELS: Record<string, string> = {
  email: "E-posta",
  google: "Google",
};

function providerBadgeClass(provider: string): string {
  switch (provider) {
    case "google":
      return "bg-blue-900/50 text-blue-300";
    case "email":
      return "bg-gray-700 text-gray-200";
    default:
      return "bg-gray-700 text-gray-300";
  }
}

export default async function AdminMembers() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user?.email !== process.env.ADMIN_EMAIL) redirect("/");

  const members = await getMembers();
  const thirtyDaysAgo = Date.now() - 30 * 86400000;
  const confirmed = members.filter((m) => m.confirmed).length;
  const active30d = members.filter(
    (m) => m.lastSignInAt && new Date(m.lastSignInAt).getTime() > thirtyDaysAgo
  ).length;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-white">Üyeler</h1>
        <span className="text-sm text-gray-500">Kayıtlı kullanıcılar</span>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-4 mb-10">
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <p className="text-gray-400 text-sm mb-1">Toplam Üye</p>
          <p className="text-4xl font-bold text-white">{members.length.toLocaleString("tr")}</p>
        </div>
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <p className="text-gray-400 text-sm mb-1">E-posta Onaylı</p>
          <p className="text-4xl font-bold text-green-400">{confirmed.toLocaleString("tr")}</p>
        </div>
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <p className="text-gray-400 text-sm mb-1">Son 30 Gün Aktif</p>
          <p className="text-4xl font-bold text-amber">{active30d.toLocaleString("tr")}</p>
        </div>
      </div>

      {/* Members table */}
      <div className="bg-gray-900 rounded-xl border border-gray-800">
        <div className="px-6 py-4 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Üye Listesi</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left px-6 py-3 text-gray-500 font-medium w-8">#</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">E-posta</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">İsim</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Yöntem</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium whitespace-nowrap">Kayıt Tarihi</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium whitespace-nowrap">Son Giriş</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Durum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {members.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-6 text-gray-500 text-center">Henüz kayıtlı üye yok.</td>
                </tr>
              ) : members.map((m, i) => (
                <tr key={m.id} className="hover:bg-gray-800/40">
                  <td className="px-6 py-3 text-gray-600">{i + 1}</td>
                  <td className="px-6 py-3 text-gray-200 whitespace-nowrap">{m.email}</td>
                  <td className="px-6 py-3 text-gray-300">{m.name ?? <span className="text-gray-600">-</span>}</td>
                  <td className="px-6 py-3">
                    <div className="flex flex-wrap gap-1">
                      {m.providers.length === 0 ? (
                        <span className="text-gray-600">-</span>
                      ) : m.providers.map((p) => (
                        <span key={p} className={`px-2 py-0.5 rounded text-xs font-medium ${providerBadgeClass(p)}`}>
                          {PROVIDER_LABELS[p] ?? p}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-3 text-gray-400 whitespace-nowrap">{formatDate(m.createdAt)}</td>
                  <td className="px-6 py-3 text-gray-400 whitespace-nowrap">{formatDate(m.lastSignInAt)}</td>
                  <td className="px-6 py-3">
                    {m.confirmed ? (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-900/60 text-green-300">Onaylı</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-900/50 text-red-300">Beklemede</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
