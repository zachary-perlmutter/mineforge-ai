# MineForge AI - Project Plan

**Project Name:** MineForge AI  
**Tagline:** Self-Healing Minecraft Servers Powered by Kubernetes + AI + DevOps

A visually impressive DevOps portfolio project that demonstrates Terraform, Ansible, Kubernetes, GitOps, Observability, and AI-driven automation.

---

## Project Overview

MineForge AI is a dynamic platform that automatically provisions, monitors, and self-heals Minecraft servers using modern DevOps practices. The goal is to create a "wow" factor project that recruiters and DevOps engineers will remember.

### Core Features
- Dynamic Minecraft server provisioning
- Self-healing infrastructure (auto-restart on failure)
- Real-time monitoring + live map (Dynmap)
- Beautiful Grafana dashboards
- AI-powered insights and automation
- GitOps workflow
- IaC with Terraform + Ansible

---

## Recommended Build Order

1. **Planning & Setup**
   - Create GitHub repository
   - Define project scope and decisions
   - Create architecture diagram
   - Set up local development environment

2. **Local Kubernetes Cluster**
   - Set up Minikube / kind / K3s
   - Basic cluster validation

3. **Basic Minecraft Deployment**
   - Deploy first Minecraft server using `itzg/minecraft-server` image
   - Add persistent storage for world data
   - Make server accessible from Minecraft client

4. **Monitoring & Visuals**
   - Deploy Prometheus + Grafana
   - Install Dynmap for live Minecraft map
   - Create initial dashboards

5. **Infrastructure as Code (Terraform)**
   - Provision Kubernetes cluster/resources with Terraform
   - (Local first → later cloud)

6. **Configuration Management (Ansible)**
   - Write playbooks for configuration
   - Node setup and tool installation

7. **GitOps Setup**
   - Install and configure ArgoCD
   - Move all manifests to Git

8. **Self-Healing & Automation**
   - Liveness/readiness probes
   - Horizontal Pod Autoscaler
   - Automated recovery logic

9. **AI Layer**
   - Integrate Ollama or lightweight AI agents
   - Log/metrics analysis and auto-remediation

10. **Web Portal / Frontend**
    - Simple UI to spin up / manage servers
    - (Optional: Backstage integration)

11. **Polish & Documentation**
    - Chaos engineering demos
    - Architecture documentation
    - Demo video recording
    - README enhancements

---

## Scope & Architecture Decisions

Here are the recommended choices for a solo portfolio project. These strike a good balance between impressive, achievable, and recruiter-friendly.

### Scope Decisions

1. **Single-server vs Multi-tenant?**  
   **Recommended: Start with Multi-tenant (but keep it simple)**  
   *Reasoning*: Multi-tenant looks much more impressive. You can have a system where users can spin up multiple named servers (e.g., "Survival-1", "Creative-2"). It better demonstrates dynamic provisioning and resource management. You can limit it to 3–5 concurrent servers for practicality.

2. **Local only or Cloud?**  
   **Recommended: AWS (K3s on EC2) — see AWS section below**  
   *Reasoning*: Since you have real AWS experience, deploying on AWS is more impressive and directly relevant to $140k+ roles. See the detailed breakdown below.

3. **On-demand server creation via Web UI?**  
   **Recommended: Yes (Simple UI)**  
   *Reasoning*: This is the biggest "wow" factor. A clean web page where you click "Create New Server" → it spins up a new Minecraft pod. Makes the demo interactive and memorable.

4. **How advanced should AI be?**  
   **Recommended: Medium**  
   *Reasoning*: Use Ollama + a simple agent that can:
   - Analyze logs when a server crashes
   - Suggest fixes
   - Auto-apply simple fixes (e.g., restart pod, adjust resources)  
   This is impressive without becoming overly complex.

### Technical Choices

5. **Local Kubernetes distro?**  
   **Recommended: K3s**  
   *Reasoning*: Lightweight, fast, production-like, and easier than Minikube for multi-node testing. Great for self-hosted setups.

6. **Storage solution?**  
   **Recommended: Longhorn**  
   *Reasoning*: Excellent open-source distributed storage for Kubernetes. Perfect for persisting Minecraft worlds across pod restarts/deletions. Looks professional.

7. **Authentication?**  
   **Recommended: Simple + Optional Discord OAuth**  
   *Reasoning*: Start with no auth (open access) for ease. Later add Discord login so only friends or demo users can create servers. Keeps it simple but extensible.

8. **Frontend?**  
   **Recommended: Simple custom frontend (Flask/FastAPI + basic HTML/React)**  
   *Reasoning*: Easier and faster than Backstage for a solo project. You can make a clean dashboard quickly. Backstage is great but heavier for this use case.

9. **Chaos testing?**  
   **Recommended: Moderate**  
   *Reasoning*: Use `chaos-mesh` or simple `kubectl delete pod` demos. Show "I killed the Minecraft pod" → it automatically recovers. Very visual and powerful in interviews.

### Nice-to-Haves (Do These Later)

10. **Multi-cloud?** → Yes, but only in Phase 2 (after core is working)  
11. **Cost tracking?** → Nice addition if using cloud  
12. **Player analytics?** → Good stretch goal  
13. **Automated backups?** → Highly recommended (use Velero or simple cron job)

---

## AWS Recommendation (Based on Real AWS Experience)

Since you already have real AWS experience, AWS is the better choice over a generic VPS provider.

### Use AWS (specifically EKS or a lighter option) — but be smart about costs.

**Why AWS is the better choice for you:**

- You can leverage your real experience in the project and in interviews. Saying "I deployed this on EKS using Terraform, just like I did at my previous role…" is much stronger than "I used Hetzner for this demo."
- Recruiters and hiring managers for $140k+ roles value cloud-specific depth. AWS is still the most requested cloud in DevOps jobs.
- It makes the project feel more "enterprise-grade" instead of just a hobby project.

### Cost-Effective Ways to Run It on AWS

| Option | Estimated Monthly Cost | Pros | Cons | Recommendation |
|---|---|---|---|---|
| Self-managed K3s on EC2 | $15 – $40 | Very cheap, full control, great for portfolio | You manage more | **Best for this project** |
| EKS with small nodes | $120 – $200+ | Real managed Kubernetes experience | Control plane fee (~$73/mo) | Good if you want to show EKS specifically |
| AWS Lightsail | $20 – $50 | Simple & cheaper than EKS | Less flexible | Decent middle ground |
| Hetzner / DigitalOcean | $10 – $35 | Cheapest | Less impressive for AWS-experienced candidates | Use only for extra testing |

### Top Pick

→ **Run K3s on EC2 instances (1–2 small instances).**  
This keeps costs low (~$20–40/month) while still letting you show Terraform + Ansible + Kubernetes on AWS.

### Final Advice

- **Primary deployment**: AWS (K3s on EC2 or small EKS)
- **Secondary (optional)**: Deploy the same code to Hetzner later — this shows multi-cloud skills (huge bonus in interviews).

This way you get the best of both worlds:
- Real AWS experience highlighted
- Low costs
- Impressive visuals and features

---

## Overall Recommendation Summary

- **MVP Goal**: A working multi-tenant Minecraft platform on K3s with monitoring, Dynmap, self-healing, and a simple web UI.
- **Portfolio Focus**: Show end-to-end DevOps skills + modern AI usage.
- **Scope Control**: Get basic server + monitoring working **first**, then layer on the fancy stuff.

---

## Tech Stack (Core)

- **IaC**: Terraform
- **Config Management**: Ansible
- **Orchestration**: Kubernetes + Helm
- **GitOps**: ArgoCD
- **Monitoring**: Prometheus + Grafana + Loki
- **Minecraft**: itzg/minecraft-server + Dynmap
- **AI**: Ollama + LangChain / CrewAI (local)
- **Visualization**: KubeView / Lens + custom dashboards

---

## Next Steps

1. Review the scope decisions above and confirm choices.
2. Start with Phase 1 (Repo + Planning).
3. Begin building Phase 2–3 to get a working Minecraft server quickly.

---

**Repository Suggestion:** `mineforge-ai`

**License:** MIT (recommended for portfolio)
