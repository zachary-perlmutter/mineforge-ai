import { useState } from "react";

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

interface Section {
  icon: string;
  title: string;
  simple: string;
  technical: string;
  badges?: string[];
}

const sections: Section[] = [
  {
    icon: "🖥",
    title: "The Server",
    simple:
      "Everything runs on a single powerful virtual machine in Amazon's cloud. Think of it like a dedicated gaming PC that never turns off, hosted remotely.",
    technical:
      "AWS EC2 t3.large (2 vCPU, 8 GB RAM) running Ubuntu 22.04. K3s — a lightweight Kubernetes distribution — is installed on it, turning the VM into a single-node cluster. Terraform provisions all AWS infrastructure (VPC, security groups, EBS volumes, S3, CloudFront). Ansible handles the OS-level bootstrap: K3s install, firewall rules, JVM tuning, Longhorn prerequisites.",
    badges: ["AWS EC2", "K3s", "Terraform", "Ansible"],
  },
  {
    icon: "📦",
    title: "Minecraft Servers",
    simple:
      "Each Minecraft server runs in its own isolated container. You can spin up as many as you want from the web portal, and each one gets its own saved world that persists even if the server restarts.",
    technical:
      "Each server is a Kubernetes Deployment using the itzg/minecraft-server image with EULA=TRUE and ONLINE_MODE=FALSE. A PersistentVolumeClaim (local-path storageClass, 5 Gi) is created per server to hold world data. Each server gets a NodePort Service in the range 30065–30074. Resource limits are 2 Gi memory and 1500m CPU per server. A liveness probe (TCP on 25565) and readiness probe ensure K8s can detect and restart unhealthy pods.",
    badges: ["itzg/minecraft-server", "PVC", "NodePort", "Probes"],
  },
  {
    icon: "🔄",
    title: "GitOps Deployment",
    simple:
      "All configuration lives in GitHub. Whenever we push a change, ArgoCD — a deployment robot — automatically applies it to the cluster. No manual steps, no \"it works on my machine.\"",
    technical:
      "ArgoCD watches the GitHub repo (zachary-perlmutter/mineforge-ai) and auto-syncs every k8s/ subdirectory. Each subsystem has its own ArgoCD Application CRD with automated sync + self-heal + prune enabled. This means git is the single source of truth — if something drifts, ArgoCD corrects it within 3 minutes.",
    badges: ["ArgoCD", "GitHub", "Auto-sync"],
  },
  {
    icon: "📊",
    title: "Monitoring",
    simple:
      "We have a live dashboard showing CPU usage, memory, and server health. If something looks wrong, the system sends an alert before it becomes a real problem.",
    technical:
      "kube-prometheus-stack (Prometheus + Grafana + AlertManager) deployed via Helm. Loki handles log aggregation. Custom AlertManager rule MinecraftRepeatedCrash fires when kube_pod_container_status_restarts_total increases by 5+ in one hour. Grafana dashboard shows player count, pod CPU/RAM, restart count, and Dynmap web map (port 8123). The AI agent also queries Prometheus directly for real-time context before calling Ollama.",
    badges: ["Prometheus", "Grafana", "Loki", "AlertManager"],
  },
  {
    icon: "🤖",
    title: "AI Self-Healing",
    simple:
      "An AI watches the servers constantly. If one crashes multiple times, it reads the server logs, figures out what went wrong, and fixes it automatically — no human needed. It uses a local AI model so nothing leaves the cluster.",
    technical:
      "A Python agent runs as a K8s Deployment. It uses watch.Watch().stream() on the K8s API to observe pod events. When restart_count >= 3, it: (1) fetches the last 100 log lines, (2) queries Prometheus for restarts_1h + memory + CPU, (3) sends a structured JSON prompt to Ollama (llama3.2:1b, running in-cluster at ollama.ollama.svc.cluster.local:11434), (4) parses the verdict. Actions: rollout_restart patches the Deployment annotation, bump_memory patches container resource limits to 2 Gi. A 300s cooldown prevents thrashing. End-to-end tested: 3 crashes detected → Ollama diagnosed 'plugin error' → rollout restart applied → pod recovered in 65 seconds.",
    badges: ["Ollama", "llama3.2:1b", "Python", "K8s Watch API"],
  },
  {
    icon: "🌐",
    title: "Web Portal",
    simple:
      "This website. You click a button, a Minecraft server appears. The portal talks to a backend API which tells Kubernetes what to do. The whole thing is hosted on AWS so it's fast and always available.",
    technical:
      "FastAPI backend deployed as a K8s Deployment, exposed on NodePort 30090. It uses the kubernetes Python client with in-cluster config — no database, K8s is the source of truth. Each POST /api/servers creates a Deployment + Service + PVC atomically. The React + Vite + TypeScript frontend is built and deployed to S3 (mineforge-ai-web-908730890940). CloudFront (PriceClass_100) serves the SPA from S3 and proxies /api/* to EC2:30090 via a custom origin — this keeps all traffic HTTPS and avoids mixed-content issues. A CloudFront Function strips cache headers on .html responses to ensure fresh deploys are picked up immediately.",
    badges: ["FastAPI", "React", "S3", "CloudFront"],
  },
];

function Badge({ label }: { label: string }) {
  return (
    <span style={{
      display: "inline-block",
      padding: "2px 8px",
      background: C.stone,
      border: `1px solid ${C.stoneLL}`,
      borderRadius: 2,
      fontSize: 10,
      color: C.diamond,
      fontFamily: "monospace",
      marginRight: 4,
      marginTop: 4,
    }}>
      {label}
    </span>
  );
}

export default function HowItWorks() {
  const [mode, setMode] = useState<"simple" | "technical">("simple");

  return (
    <div>
      {/* Toggle */}
      <div style={{ display: "flex", gap: 0, marginBottom: 28 }}>
        {(["simple", "technical"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            style={{
              flex: 1,
              padding: "10px 0",
              background: mode === m ? C.grassL : C.stoneL,
              border: `2px solid ${C.stoneLL}`,
              borderRadius: m === "simple" ? "2px 0 0 2px" : "0 2px 2px 0",
              color: mode === m ? "#111" : C.dim,
              fontSize: 12,
              fontWeight: mode === m ? 600 : 400,
              letterSpacing: 0.5,
            }}
          >
            {m === "simple" ? "🌱 Plain English" : "⚙ Technical"}
          </button>
        ))}
      </div>

      {mode === "simple" && (
        <div style={{
          background: C.stoneL,
          border: `2px solid ${C.stoneLL}`,
          borderRadius: 2,
          padding: "14px 18px",
          marginBottom: 20,
          fontSize: 13,
          color: C.dim,
          lineHeight: 1.6,
        }}>
          MineForge AI is a self-healing Minecraft server platform. It runs on real cloud infrastructure, manages servers as containers, and uses an AI to automatically detect and fix crashes. Everything is automated from code to deployment.
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {sections.map((s) => (
          <div key={s.title} style={{
            background: C.stoneL,
            border: `2px solid ${C.stoneLL}`,
            borderRadius: 2,
            padding: "16px 18px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 18 }}>{s.icon}</span>
              <span style={{ fontWeight: 600, fontSize: 14, color: C.text }}>{s.title}</span>
            </div>
            <p style={{ fontSize: 13, color: C.dim, lineHeight: 1.65, margin: 0 }}>
              {mode === "simple" ? s.simple : s.technical}
            </p>
            {mode === "technical" && s.badges && (
              <div style={{ marginTop: 10 }}>
                {s.badges.map((b) => <Badge key={b} label={b} />)}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Stack summary (technical only) */}
      {mode === "technical" && (
        <div style={{
          marginTop: 20,
          background: C.stone,
          border: `2px solid ${C.stoneLL}`,
          borderRadius: 2,
          padding: "16px 18px",
        }}>
          <div style={{ fontWeight: 600, fontSize: 12, color: C.gold, marginBottom: 12, fontFamily: "monospace" }}>
            FULL STACK
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 24px", fontSize: 12, fontFamily: "monospace" }}>
            {[
              ["Infra", "AWS EC2 t3.large, Terraform, Ansible"],
              ["Cluster", "K3s 1-node, Longhorn + local-path storage"],
              ["GitOps", "ArgoCD auto-sync from GitHub"],
              ["Monitoring", "Prometheus, Grafana, Loki, AlertManager"],
              ["AI", "Ollama llama3.2:1b (in-cluster)"],
              ["Agent", "Python + kubernetes client + 5min cooldown"],
              ["Backend", "FastAPI, NodePort 30090"],
              ["Frontend", "React + Vite + TypeScript"],
              ["Hosting", "S3 + CloudFront (PriceClass_100)"],
              ["Est. cost", "~$63/mo (t3.large + 40 GB EBS)"],
            ].map(([k, v]) => (
              <div key={k}>
                <span style={{ color: C.diamond }}>{k}: </span>
                <span style={{ color: C.dim }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
