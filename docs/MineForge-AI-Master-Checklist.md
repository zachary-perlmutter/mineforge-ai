# MineForge AI - Master Checklist

Check things off as you go. Reference `MineForge-AI-Project-Plan.md` for full context on any decision.

---

## Pre-Build: Environment Setup

### MCP Servers (Claude Code)
- [ ] Install `kubernetes` MCP server — `npx @modelcontextprotocol/mcp-server-kubernetes`
- [ ] Install `terraform` MCP server — `npx @modelcontextprotocol/server-terraform`
- [ ] Install `filesystem` MCP server — `npx @modelcontextprotocol/server-filesystem`
- [ ] Install `docker` MCP server — `docker run -i --rm -v /var/run/docker.sock:/var/run/docker.sock mcp/docker`
- [ ] Install `ansible` MCP server — `pip install ansible-mcp-server`
- [ ] Install `helm` MCP server
- [ ] Install `shell` MCP server — `npx @modelcontextprotocol/server-bash`

### AWS Account Setup
- [x] Create new AWS account for MineForge AI (used existing account 908730890940)
- [x] Create IAM user with appropriate permissions (used Admin user)
- [x] Run `aws configure --profile mineforge` to save credentials
- [x] Set `AWS_PROFILE=mineforge` — using `--profile mineforge` explicitly on every AWS command instead (safer)
- [x] Confirm MCP server targets correct account (not old project)

### Local Dev Environment
- [x] Install AWS CLI
- [x] Install `kubectl` (v1.36.1)
- [x] Install `terraform` (v1.12.1)
- [x] Install `helm` (v4.2.0)
- [x] Install `ansible` (core 2.20.6)
- [x] Install `k3sup` (v0.13.12)
- [x] Install Lens (Kubernetes UI)

---

## Phase 1: Planning & GitHub Setup

- [x] Create GitHub repository (`mineforge-ai`)
- [x] Add MIT license
- [x] Write initial README with project overview
- [x] Create architecture diagram
- [x] Set up branch protection rules on `main`
- [x] Create folder structure: `/terraform`, `/ansible`, `/k8s`, `/app`, `/docs`

---

## Phase 2: K3s Cluster on AWS EC2

- [x] Write Terraform to provision EC2 instances (1–2 x `t3.medium` or `t3.large`)
- [x] Configure VPC, security groups, key pairs via Terraform
- [x] Apply Terraform — verify instances are running
- [x] Run Ansible playbook to install K3s on nodes
- [x] Copy kubeconfig locally — verify `kubectl get nodes` works
- [x] Validate cluster health

---

## Phase 3: Basic Minecraft Deployment

- [x] Write Kubernetes manifest for `itzg/minecraft-server` pod
- [x] Add PersistentVolumeClaim for world data (Longhorn)
- [x] Install Longhorn via Helm for distributed storage
- [x] Expose Minecraft server via NodePort or LoadBalancer (port 25565)
- [x] Connect to server from Minecraft client — confirm it works
- [x] Test world persistence across pod restart

---

## Phase 4: Monitoring & Visuals

- [x] Install `kube-prometheus-stack` via Helm (Prometheus + Grafana + AlertManager)
- [x] Install Loki for log aggregation
- [x] Install Dynmap plugin on Minecraft server
- [x] Expose Dynmap web UI (port 8123)
- [x] Build Grafana dashboard: player count, CPU/RAM, pod health
- [x] Set up basic alerts (pod crash, high memory)

---

## Phase 5: Infrastructure as Code (Terraform)

- [x] Convert all manual AWS resources to Terraform modules
- [x] Set up remote Terraform state (S3 bucket + DynamoDB lock table)
- [ ] Add Terraform module for Kubernetes namespaces and RBAC
- [x] Push all Terraform code to GitHub
- [ ] Verify `terraform destroy` + `terraform apply` recreates everything cleanly

---

## Phase 6: Configuration Management (Ansible)

- [x] Write playbook: K3s node bootstrap (install K3s, Docker, dependencies)
- [x] Write playbook: firewall rules and security hardening
- [x] Write playbook: Longhorn prerequisites
- [x] Write playbook: system tuning for Minecraft (JVM flags, ulimits)
- [x] Test idempotency — run playbooks twice, confirm no changes on second run
- [x] Push all playbooks to GitHub under `/ansible`

---

## Phase 7: GitOps with ArgoCD

- [x] Install ArgoCD via Helm
- [x] Expose ArgoCD UI (port-forward or ingress)
- [x] Move all Kubernetes manifests to `/k8s` in GitHub repo
- [x] Create ArgoCD Application CRDs pointing at GitHub repo
- [x] Verify ArgoCD auto-syncs on git push
- [x] Set up sync policies (auto-heal, prune orphaned resources)

---

## Phase 8: Self-Healing & Automation

- [x] Add liveness probe to Minecraft pod (TCP check on port 25565)
- [x] Add readiness probe
- [x] Configure resource requests and limits per Minecraft pod
- [x] Set up Horizontal Pod Autoscaler (HPA) — maxReplicas: 1 due to RWO PVC; scales independently per server in multi-tenant Phase 10
- [x] Test self-healing: `kubectl delete pod <minecraft>` → watch it recover (recovered in 73s, 0 restarts)
- [x] Set up AlertManager rules to page (or log) on repeated crashes — `MinecraftRepeatedCrash` fires after 5 restarts/hour

---

## Phase 9: AI Layer (Ollama + Agent)

- [x] Deploy Ollama as a Kubernetes Deployment (k8s/ollama/, model: llama3.2:1b)
- [x] Pull a model into Ollama — initContainer pulls llama3.2:1b on first start, cached on Longhorn PVC
- [x] Write AI agent script to read Minecraft logs and call Ollama (app/agent/agent.py)
- [x] Agent action: detect crash patterns → diagnose with Ollama → log structured JSON verdict
- [x] Agent action: auto-apply simple fixes (rollout restart, bump memory limits)
- [x] Connect Prometheus metrics feed to agent for context (restarts/h, memory, CPU)
- [x] Test end-to-end: crash server → agent detects → agent fixes (3 restarts → Ollama diagnosed "plugin error" → rollout restart → recovered in ~65s)

---

## Phase 10: Web Portal

- [x] Build FastAPI backend (app/api/main.py) — no external DB, K8s API is source of truth
- [x] Endpoints: GET /api/servers, POST /api/servers, DELETE /api/servers/{name}, GET /api/servers/{name}
- [x] Backend calls Kubernetes API to spin up/down Minecraft pods (Deployment + Service + PVC per server)
- [x] Build React frontend (app/web/) with "New Server" form, live status table, delete buttons
- [x] Frontend deployed to Vercel (VITE_API_URL + VITE_NODE_IP env vars)
- [x] NodePort range 30065-30074 for servers, 30090 for API — already open in Terraform SG
- [x] Test full flow: click "Create" → pod spins up → connect with Minecraft client

---

## Phase 11: Polish & Chaos Engineering

- [x] Run chaos test: delete Minecraft pod mid-game → verify recovery (script: scripts/chaos-pod.sh)
- [ ] Run chaos test: kill a K3s node → verify workloads reschedule (script: scripts/chaos-node.sh — needs live cluster)
- [x] Set up automated world backups (Longhorn RecurringJob → S3, terraform/backup.tf, k8s/monitoring/longhorn-backup.yaml)
- [x] Add optional Discord OAuth for web portal login (k8s/api/discord-secret.yaml.example)
- [x] Write architecture diagram (final version — updated Mermaid in README.md)
- [x] Write detailed README with setup instructions
- [ ] Record demo video (follow `MineForge-AI-Video-Script.md`)
- [x] Add GitHub Actions CI/CD pipeline (.github/workflows/ci.yaml + deploy-web.yaml)
- [ ] Optional: deploy same stack to Hetzner to show multi-cloud

---

## Pending / Follow-up

- [ ] Check AWS Cost Explorer in 24h — first visit triggered data prep (est. ~$63/mo: t3.large + 40GB EBS)

---

## Nice-to-Haves (Stretch Goals)

- [ ] Cost tracking dashboard in Grafana (AWS Cost Explorer API)
- [ ] Player analytics (join/leave events, playtime graphs)
- [ ] Multi-cloud: deploy same Terraform/Ansible to DigitalOcean or Hetzner
- [ ] Discord bot to create/destroy servers via slash commands
- [ ] Backstage developer portal integration

---

## Launch Checklist

- [ ] All core phases complete
- [ ] Demo video recorded and uploaded
- [ ] GitHub repo is public and polished
- [ ] README has architecture diagram, tech stack, and demo link
- [ ] LinkedIn post written
- [ ] Project added to resume and portfolio site
