import { createClient } from "@supabase/supabase-js";
import { ClientActions } from "./client-actions";

type ClientRow = {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

async function getClients() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key || url.includes("your-project-ref")) {
    return [] as ClientRow[];
  }

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });

  const { data } = await supabase
    .from("clients")
    .select("id,name,is_active,created_at,updated_at")
    .order("created_at", { ascending: false });

  return (data ?? []) as ClientRow[];
}

export default async function ClientsPage() {
  const clients = await getClients();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">클라이언트</h2>
          <p className="mt-1 text-sm text-zinc-400">등록된 언론사 {clients.length}곳</p>
        </div>
        <ClientActions />
      </div>

      <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="px-4 py-3 text-xs font-medium text-zinc-400">이름</th>
              <th className="px-4 py-3 text-xs font-medium text-zinc-400">상태</th>
              <th className="px-4 py-3 text-xs font-medium text-zinc-400">등록일</th>
            </tr>
          </thead>
          <tbody>
            {clients.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-12 text-center text-zinc-500">
                  등록된 클라이언트가 없습니다
                </td>
              </tr>
            ) : (
              clients.map((client) => (
                <tr
                  key={client.id}
                  className="border-b border-white/5 transition-colors hover:bg-white/5"
                >
                  <td className="px-4 py-3 text-white">{client.name}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        client.is_active
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "bg-red-500/20 text-red-300"
                      }`}
                    >
                      {client.is_active ? "활성" : "비활성"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-400">
                    {new Date(client.created_at).toLocaleDateString("ko-KR")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
