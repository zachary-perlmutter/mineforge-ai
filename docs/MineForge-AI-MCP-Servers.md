# MineForge AI - MCP Servers Guide

A map of every MCP server you'll need to build MineForge AI using AI as much as possible, organized by project phase.

---

## Already Available (Active in Claude Code)

These are already wired up and ready to use now:

| MCP Server | What It Does for This Project |
|---|---|
| `awslabs-aws-api-mcp-server` | Interact with AWS APIs directly — EC2, IAM, VPC, S3, etc. |
| `awslabs-aws-iac-mcp-server` | CDK/CloudFormation docs, validation, and compliance checks |
| `github` | Create/manage the `mineforge-ai` repo, push files, open issues, manage PRs |
| `supabase` | Backend database for the web portal (server records, user data, logs) |
| `vercel` | Deploy the frontend web portal (if you go the Next.js/React route) |

---

## Need to Install

These are MCP servers you'll need to add to your Claude Code config. Install instructions are in the next section.

### Core Infrastructure

| MCP Server | Phase | Purpose |
|---|---|---|
| `docker` | Phase 3, 9 | Build and manage Docker images (Minecraft server, Ollama, web app) |
| `kubernetes` | Phases 2–10 | The most important one — run kubectl, manage pods/deployments/services/PVCs |
| `terraform` | Phase 5 | Run `terraform plan`, `apply`, and manage state directly from Claude |
| `ansible` | Phase 6 | Generate and run Ansible playbooks for node config and setup |
| `filesystem` | All phases | Read/write local config files, kubeconfigs, manifests, logs |

### Supporting Tools

| MCP Server | Phase | Purpose |
|---|---|---|
| `helm` | Phases 4, 7, 8 | Install Prometheus, Grafana, ArgoCD, Longhorn via Helm charts |
| `prometheus` | Phase 4 | Query metrics directly — great for AI-powered health checks |
| `git` | All phases | Local git operations (commit, branch, push) without leaving Claude |
| `shell` / `bash` | All phases | Run arbitrary shell commands when no specific MCP exists |

---

## MCP Server → Project Phase Mapping

### Phase 1: Planning & GitHub Setup
- `github` → Create repo, initialize with README, set up branch protection
- `filesystem` → Scaffold local directory structure

### Phase 2: Kubernetes Cluster (K3s on AWS EC2)
- `awslabs-aws-api-mcp-server` → Provision EC2 instances, security groups, key pairs, VPC
- `terraform` → Write and apply Terraform to provision the EC2 nodes
- `kubernetes` → Validate cluster is up, apply initial namespaces and RBAC
- `ansible` → Configure EC2 nodes (install K3s, Docker, dependencies)

### Phase 3: Basic Minecraft Deployment
- `kubernetes` → Deploy `itzg/minecraft-server` pod, PVC for world data, NodePort service
- `docker` → Pull and verify the Minecraft image locally if needed
- `helm` → If using a community Minecraft Helm chart

### Phase 4: Monitoring & Visuals
- `helm` → Install `kube-prometheus-stack` (Prometheus + Grafana + AlertManager)
- `kubernetes` → Deploy Loki, configure ServiceMonitors for Minecraft
- `prometheus` → Query metrics to verify dashboards are working
- `github` → Push Grafana dashboard JSON configs to repo

### Phase 5: Terraform IaC
- `terraform` → Full Terraform modules for EC2, networking, K3s bootstrap
- `awslabs-aws-iac-mcp-server` → Validate templates, check compliance
- `github` → Push Terraform modules, set up remote state in S3

### Phase 6: Ansible Configuration Management
- `ansible` → Playbooks for K3s install, Longhorn setup, firewall rules, system tuning
- `filesystem` → Read/write inventory files and role configs
- `git` → Commit playbooks to repo

### Phase 7: GitOps with ArgoCD
- `helm` → Install ArgoCD into the cluster
- `kubernetes` → Configure ArgoCD Application CRDs, sync policies
- `github` → Push all manifests to Git so ArgoCD can watch them

### Phase 8: Self-Healing & Automation
- `kubernetes` → Add liveness/readiness probes, configure HPA, set resource limits
- `prometheus` → Set up alerting rules for pod crashes and resource spikes
- `github` → Push runbook docs and alert configs

### Phase 9: AI Layer (Ollama + Agent)
- `docker` → Deploy Ollama container (local or on EC2)
- `kubernetes` → Run Ollama as a Deployment, expose internally to the agent
- `prometheus` → Feed metrics to the AI agent for analysis
- `filesystem` → Read Minecraft server logs for AI to analyze
- `shell` → Let the AI agent trigger `kubectl rollout restart` or patch resources

### Phase 10: Web Portal
- `supabase` → Store server records, user sessions, audit logs
- `vercel` → Deploy the frontend if self-hosting isn't desired
- `kubernetes` → Deploy the Flask/FastAPI backend as a pod
- `github` → CI/CD pipeline for auto-deploy on push

### Phase 11: Polish & Chaos Engineering
- `kubernetes` → `kubectl delete pod` to simulate failures, verify self-healing
- `prometheus` → Confirm metrics recover after chaos events
- `github` → Finalize README, architecture diagrams, demo docs

---

## How to Install the Key MCP Servers

### Kubernetes MCP
```bash
# Option 1: Official mcp-server-kubernetes
npx @modelcontextprotocol/mcp-server-kubernetes

# Option 2: kubectl-mcp-tool (popular community option)
pip install kubectl-mcp-tool
```

Add to `~/.claude/settings.json`:
```json
{
  "mcpServers": {
    "kubernetes": {
      "command": "npx",
      "args": ["@modelcontextprotocol/mcp-server-kubernetes"]
    }
  }
}
```

### Terraform MCP
```bash
# HashiCorp / community Terraform MCP
npx @modelcontextprotocol/server-terraform
```

### Docker MCP
```bash
# Docker's official MCP server
docker run -i --rm -v /var/run/docker.sock:/var/run/docker.sock mcp/docker
```

Add to settings:
```json
{
  "mcpServers": {
    "docker": {
      "command": "docker",
      "args": ["run", "-i", "--rm", "-v", "/var/run/docker.sock:/var/run/docker.sock", "mcp/docker"]
    }
  }
}
```

### Filesystem MCP
```bash
npx @modelcontextprotocol/server-filesystem /path/to/mineforge-ai
```

### Ansible MCP
```bash
pip install ansible-mcp-server
```

### Shell/Bash MCP (for arbitrary commands)
```bash
npx @modelcontextprotocol/server-bash
```

---

## Priority Order (Install These First)

1. `kubernetes` — you'll use this constantly from Phase 2 onward
2. `terraform` — needed for all AWS provisioning
3. `filesystem` — essential for reading kubeconfigs, logs, manifests
4. `docker` — needed for image management and Ollama
5. `ansible` — needed for node configuration
6. `helm` — needed for monitoring and ArgoCD installs
7. `shell` — fallback for anything not covered by specific servers

---

## Tips for AI-Assisted Building

- **Give Claude the kubeconfig** via `filesystem` MCP so it can run `kubectl` commands directly
- **Share your Terraform state** so Claude can see current infra and suggest changes safely
- **Pipe Minecraft logs** through `filesystem` or `shell` MCP so the AI agent can analyze crashes in real-time
- **Use `prometheus` MCP** to let Claude query live metrics and recommend resource adjustments
- **Keep all manifests in Git** so `github` MCP lets Claude open PRs for every infrastructure change instead of applying directly

---

**Note:** MCP server availability and names evolve quickly. Always check the [MCP server registry](https://github.com/modelcontextprotocol/servers) for the latest official and community options before installing.
