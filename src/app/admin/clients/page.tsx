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
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
         <div>
            <h2 className="text-[28px] font-semibold tracking-tight text-white">클라이언트</h2>
            <p className="mt-1 text-sm text-white/40">등록된 언론사 {clients.length}곳</p>
         </div>
         <ClientActions />
       </div>

       <div className="overflow-x-auto rounded-xl border border-white/[0.06] bg-white/[0.02]">
         <table className="min-w-[480px] w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="px-5 py-3.5 text-[11px] uppercase tracking-wider text-white/30 font-medium">이름</th>
              <th className="px-5 py-3.5 text-[11px] uppercase tracking-wider text-white/30 font-medium">상태</th>
              <th className="px-5 py-3.5 text-[11px] uppercase tracking-wider text-white/30 font-medium">등록일</th>
            </tr>
          </thead>
          <tbody>
            {clients.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-5 py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-4xl text-white/10">⊡</span>
                    <p className="text-sm text-white/30">등록된 클라이언트가 없습니다</p>
                    <p className="text-xs text-white/20">위 '새 클라이언트 등록' 버튼으로 등록해 주세요</p>
                  </div>
                </td>
              </tr>
            ) : (
              clients.map((client) => (
                 <tr
                   key={client.id}
                   className="border-b border-white/[0.04] transition-colors hover:bg-white/[0.03]"
                 >
                   <td className="px-5 py-4 text-white/80">{client.name}</td>
                   <td className="px-5 py-4">
                     <span
                       className={`rounded-full px-2 py-0.5 text-xs ${
                         client.is_active
                           ? "bg-emerald-500/10 text-emerald-400/70"
                           : "bg-red-500/10 text-red-400/70"
                       }`}
                     >
                      {client.is_active ? "활성" : "비활성"}
                    </span>
                  </td>
                   <td className="px-5 py-4 text-white/30">
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
