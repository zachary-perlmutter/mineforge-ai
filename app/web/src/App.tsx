import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faCircleInfo, faServer, faTriangleExclamation, faXmark } from "@fortawesome/free-solid-svg-icons";
import HowItWorks from "./HowItWorks";

const API = import.meta.env.VITE_API_URL ?? "/api";
const NODE_IP = import.meta.env.VITE_NODE_IP ?? "—";

interface PodStatus { phase: string; restarts: number; ready: boolean; }
interface Server { name: string; port: number | null; replicas: number; pod: PodStatus; created_at: string | null; }

const C = {
  grass:   "#5C8A2A",
  grassL:  "#78B048",
  dirt:    "#8B6343",
  stone:   "#2A2A2A",
  stoneL:  "#3A3A3A",
  stoneLL: "#4A4A4A",
  gold:    "#F0A000",
  diamond: "#4DE8E8",
  red:     "#E03030",
  text:    "#F0F0E8",
  dim:     "#A0A090",
};

function statusInfo(s: Server) {
  if (s.pod.ready)        return { color: C.grassL,  label: "● Online",   glow: C.grassL };
  if (s.replicas > 0)     return { color: C.gold,    label: "◑ Starting", glow: C.gold };
  return                         { color: C.stoneLL, label: "○ Offline",  glow: "transparent" };
}

function ServerCard({ server, onDelete }: { server: Server; onDelete: (n: string) => void }) {
  const [deleting, setDeleting] = useState(false);
  const st = statusInfo(server);

  async function handleDelete() {
    if (!confirm(`Delete "${server.name}"? World data will be lost forever.`)) return;
    setDeleting(true);
    await fetch(`${API}/servers/${server.name}`, { method: "DELETE" });
    onDelete(server.name);
  }

  return (
    <div style={{
      background: C.stoneL,
      border: `3px solid ${C.stoneLL}`,
      borderBottom: `3px solid #1a1a1a`,
      borderRight: `3px solid #1a1a1a`,
      borderRadius: 2,
      padding: "16px 20px",
      display: "flex",
      alignItems: "center",
      gap: 16,
    }}>
      <FontAwesomeIcon icon={faServer} style={{ fontSize: 20, color: C.grassL, flexShrink: 0, width: 24 }} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontWeight: 600, fontSize: 15, color: C.text }}>{server.name}</span>
          <span style={{ fontSize: 12, color: st.color, textShadow: `0 0 8px ${st.glow}` }}>
            {st.label}
          </span>
        </div>
        <div style={{ marginTop: 4, fontSize: 12, color: C.dim, fontFamily: "monospace" }}>
          {server.port ? (
            <span>
              <span style={{ color: C.diamond }}>connect:</span>{" "}
              {NODE_IP}:{server.port}
            </span>
          ) : "—"}
          {server.pod.restarts > 0 && (
            <span style={{ marginLeft: 12, color: C.gold }}>
              <FontAwesomeIcon icon={faTriangleExclamation} style={{ marginRight: 4 }} />
              {server.pod.restarts} restart{server.pod.restarts !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      <button
        onClick={handleDelete}
        disabled={deleting}
        style={{
          background: "none",
          border: `2px solid ${deleting ? C.stoneLL : C.red}`,
          borderBottom: `2px solid ${deleting ? "#1a1a1a" : "#901a1a"}`,
          borderRight: `2px solid ${deleting ? "#1a1a1a" : "#901a1a"}`,
          borderRadius: 2,
          padding: "6px 14px",
          fontSize: 12,
          color: deleting ? C.dim : C.red,
          flexShrink: 0,
        }}
      >
        {deleting ? "Removing…" : "Destroy"}
      </button>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState<"servers" | "how">("servers");
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function fetchServers() {
    try {
      const res = await fetch(`${API}/servers`);
      if (!res.ok) throw new Error();
      setServers(await res.json());
    } catch { /* keep stale data */ } finally {
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
      if (!res.ok) { const b = await res.json(); throw new Error(b.detail ?? "Error"); }
      setNewName("");
      await fetchServers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  const online = servers.filter((s) => s.pod.ready).length;

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "48px 24px" }}>

      {/* Header */}
      <div style={{ marginBottom: 36 }}>
        <h1 style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: 18,
          lineHeight: 1.5,
          color: C.grassL,
          textShadow: `2px 2px 0 #1a3a0a, 0 0 20px rgba(120,176,72,0.4)`,
          letterSpacing: 1,
        }}>
          MineForge AI
        </h1>
        <p style={{ marginTop: 10, color: C.dim, fontSize: 12 }}>
          Self-healing Minecraft infrastructure on Kubernetes
        </p>

        {/* Status bar */}
        <div style={{
          display: "flex", gap: 16, marginTop: 16, flexWrap: "wrap",
          fontSize: 11, fontFamily: "monospace", color: C.dim,
        }}>
          <span style={{ color: online > 0 ? C.grassL : C.dim }}>
            ● {online} server{online !== 1 ? "s" : ""} online
          </span>
          <span>⚙ AI agent watching</span>
          <span>↻ syncs every 5s</span>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 3, background: `linear-gradient(90deg, ${C.grass}, ${C.dirt})`, marginBottom: 24, borderRadius: 1 }} />

      {/* Tab nav */}
      <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
        <button
          onClick={() => setTab("servers")}
          style={{
            padding: "8px 16px",
            background: tab === "servers" ? C.stoneLL : "none",
            border: `2px solid ${tab === "servers" ? C.stoneLL : "transparent"}`,
            borderRadius: 2,
            color: tab === "servers" ? C.text : C.dim,
            fontSize: 12,
            fontWeight: tab === "servers" ? 600 : 400,
            letterSpacing: 0.3,
          }}
        >
          Servers
        </button>
        <button
          onClick={() => setTab("how")}
          style={{
            flex: 1,
            padding: "14px 20px",
            background: tab === "how" ? C.diamond : C.stoneL,
            border: `3px solid`,
            borderColor: tab === "how"
              ? `#1a1a1a #2ab8b8 #2ab8b8 #1a1a1a`
              : `#1a1a1a ${C.stoneLL} ${C.stoneLL} #1a1a1a`,
            borderRadius: 2,
            color: tab === "how" ? "#111" : C.diamond,
            fontSize: 15,
            fontWeight: 700,
            letterSpacing: 0.5,
          }}
        >
          <FontAwesomeIcon icon={faCircleInfo} style={{ marginRight: 8 }} />
          How It Works
        </button>
      </div>

      {tab === "how" && <HowItWorks />}

      {tab === "servers" && <>
      {/* Create form */}
      <form onSubmit={handleCreate} style={{ display: "flex", gap: 10, marginBottom: 28 }}>
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
          placeholder="my-server"
          maxLength={32}
          style={{
            flex: 1,
            background: C.stoneL,
            border: `3px solid ${C.stoneLL}`,
            borderTop: "3px solid #1a1a1a",
            borderLeft: "3px solid #1a1a1a",
            borderRadius: 2,
            padding: "10px 14px",
            fontSize: 14,
            color: C.text,
            outline: "none",
            fontFamily: "monospace",
          }}
        />
        <button
          type="submit"
          disabled={creating || !newName.trim()}
          style={{
            background: creating || !newName.trim() ? C.stoneLL : C.grass,
            border: "3px solid",
            borderColor: creating || !newName.trim()
              ? `#1a1a1a ${C.stoneLL} ${C.stoneLL} #1a1a1a`
              : `#1a1a1a ${C.grassL} ${C.grassL} #1a1a1a`,
            borderRadius: 2,
            padding: "10px 20px",
            fontSize: 13,
            fontWeight: 600,
            color: creating || !newName.trim() ? C.dim : C.text,
            letterSpacing: 0.3,
            whiteSpace: "nowrap",
          }}
        >
          {creating ? "Spawning…" : <><FontAwesomeIcon icon={faPlus} style={{ marginRight: 6 }} />New Server</>}
        </button>
      </form>

      {error && (
        <div style={{
          background: "#3a1010", border: `2px solid ${C.red}`, borderRadius: 2,
          padding: "10px 14px", marginBottom: 16, fontSize: 12, color: C.red,
        }}>
          <FontAwesomeIcon icon={faXmark} style={{ marginRight: 6 }} />{error}
        </div>
      )}

      {/* Server list */}
      {loading ? (
        <p style={{ color: C.dim, fontFamily: "monospace", fontSize: 12 }}>Loading world data…</p>
      ) : servers.length === 0 ? (
        <div style={{
          background: C.stoneL, border: `3px solid ${C.stoneLL}`,
          borderRadius: 2, padding: "32px 24px", textAlign: "center",
        }}>
          <p style={{ color: C.dim, fontSize: 13 }}>No servers yet. Create one above.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {servers.map((s) => (
            <ServerCard key={s.name} server={s} onDelete={(n) => setServers((p) => p.filter((x) => x.name !== n))} />
          ))}
        </div>
      )}

      </>}

      {/* Footer */}
      <div style={{
        marginTop: 48, paddingTop: 16,
        borderTop: `2px solid ${C.stoneLL}`,
        display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8,
        fontSize: 11, color: C.stoneLL, fontFamily: "monospace",
      }}>
        <span>MineForge AI — Phase 10</span>
        <span style={{ color: C.diamond }}>K8s + ArgoCD + Ollama</span>
      </div>
    </div>
  );
}
