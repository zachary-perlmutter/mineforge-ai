import { useEffect, useRef, useState } from "react";

const API = import.meta.env.VITE_API_URL ?? "/api";

interface PodStatus {
  phase: string;
  restarts: number;
  ready: boolean;
}

interface Server {
  name: string;
  port: number | null;
  replicas: number;
  pod: PodStatus;
  created_at: string | null;
}

const NODE_IP = import.meta.env.VITE_NODE_IP ?? "—";

function statusDot(s: Server) {
  if (s.pod.ready) return { color: "#111", label: "Ready" };
  if (s.replicas > 0) return { color: "#888", label: "Starting" };
  return { color: "#ccc", label: "Offline" };
}

function ServerRow({ server, onDelete }: { server: Server; onDelete: (name: string) => void }) {
  const [deleting, setDeleting] = useState(false);
  const dot = statusDot(server);

  async function handleDelete() {
    if (!confirm(`Delete server "${server.name}"? World data will be lost.`)) return;
    setDeleting(true);
    await fetch(`${API}/servers/${server.name}`, { method: "DELETE" });
    onDelete(server.name);
  }

  return (
    <tr style={{ borderBottom: "1px solid #eee" }}>
      <td style={{ padding: "12px 0" }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: dot.color, display: "inline-block", marginRight: 8 }} />
        <strong>{server.name}</strong>
      </td>
      <td style={{ padding: "12px 8px", color: "#555" }}>
        {server.port ? `${NODE_IP}:${server.port}` : "—"}
      </td>
      <td style={{ padding: "12px 8px", color: "#555" }}>{dot.label}</td>
      <td style={{ padding: "12px 8px", color: "#888" }}>{server.pod.restarts} restarts</td>
      <td style={{ padding: "12px 0", textAlign: "right" }}>
        <button
          onClick={handleDelete}
          disabled={deleting}
          style={{
            background: "none",
            border: "1px solid #ddd",
            borderRadius: 4,
            padding: "4px 12px",
            fontSize: 13,
            color: deleting ? "#ccc" : "#111",
          }}
        >
          {deleting ? "Deleting…" : "Delete"}
        </button>
      </td>
    </tr>
  );
}

export default function App() {
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function fetchServers() {
    try {
      const res = await fetch(`${API}/servers`);
      if (!res.ok) throw new Error(await res.text());
      setServers(await res.json());
    } catch {
      // silently keep stale data on poll failures
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchServers();
    intervalRef.current = setInterval(fetchServers, 5000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const name = newName.trim().toLowerCase();
    if (!name) return;
    setCreating(true);
    try {
      const res = await fetch(`${API}/servers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.detail ?? "Unknown error");
      }
      setNewName("");
      await fetchServers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  function handleDelete(name: string) {
    setServers((prev) => prev.filter((s) => s.name !== name));
  }

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "48px 24px" }}>
      <div style={{ marginBottom: 40 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.3px" }}>MineForge AI</h1>
        <p style={{ color: "#888", marginTop: 4 }}>Self-healing Minecraft infrastructure on Kubernetes</p>
      </div>

      <form onSubmit={handleCreate} style={{ display: "flex", gap: 8, marginBottom: 32 }}>
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="server-name"
          pattern="[a-z0-9\-]+"
          title="Lowercase letters, numbers, and hyphens only"
          style={{
            flex: 1,
            border: "1px solid #ddd",
            borderRadius: 4,
            padding: "8px 12px",
            fontSize: 14,
            outline: "none",
          }}
        />
        <button
          type="submit"
          disabled={creating || !newName.trim()}
          style={{
            background: "#111",
            color: "#fff",
            border: "none",
            borderRadius: 4,
            padding: "8px 18px",
            fontSize: 14,
            fontWeight: 500,
            opacity: creating || !newName.trim() ? 0.4 : 1,
          }}
        >
          {creating ? "Creating…" : "New Server"}
        </button>
      </form>

      {error && (
        <p style={{ color: "#c00", marginBottom: 16, fontSize: 13 }}>{error}</p>
      )}

      {loading ? (
        <p style={{ color: "#888" }}>Loading…</p>
      ) : servers.length === 0 ? (
        <p style={{ color: "#888" }}>No servers. Create one above.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #111", textAlign: "left" }}>
              <th style={{ padding: "0 0 8px", fontWeight: 500, color: "#555" }}>Name</th>
              <th style={{ padding: "0 8px 8px", fontWeight: 500, color: "#555" }}>Connect</th>
              <th style={{ padding: "0 8px 8px", fontWeight: 500, color: "#555" }}>Status</th>
              <th style={{ padding: "0 8px 8px", fontWeight: 500, color: "#555" }}>Health</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {servers.map((s) => (
              <ServerRow key={s.name} server={s} onDelete={handleDelete} />
            ))}
          </tbody>
        </table>
      )}

      <p style={{ marginTop: 48, color: "#ccc", fontSize: 12 }}>
        Polls every 5s · AI agent auto-heals crash loops · {servers.length} server{servers.length !== 1 ? "s" : ""}
      </p>
    </div>
  );
}
