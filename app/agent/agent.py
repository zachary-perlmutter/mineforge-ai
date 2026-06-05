#!/usr/bin/env python3
"""MineForge AI Agent — watches Minecraft pod health and auto-heals via Ollama."""

import datetime
import json
import logging
import os
import time

import requests
from kubernetes import client, config, watch

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
)
log = logging.getLogger("mineforge-agent")

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://ollama.ollama.svc.cluster.local:11434")
MODEL = os.getenv("OLLAMA_MODEL", "llama3.2:1b")
PROMETHEUS_URL = os.getenv(
    "PROMETHEUS_URL",
    "http://kube-prometheus-stack-prometheus.monitoring.svc.cluster.local:9090",
)
NAMESPACE = os.getenv("TARGET_NAMESPACE", "minecraft")
DEPLOYMENT_NAME = os.getenv("TARGET_DEPLOYMENT", "minecraft")
RESTART_THRESHOLD = int(os.getenv("RESTART_THRESHOLD", "3"))
COOLDOWN_SECONDS = int(os.getenv("COOLDOWN_SECONDS", "300"))

_last_action_at: float = 0


def get_pod_logs(pod_name: str, lines: int = 100) -> str:
    v1 = client.CoreV1Api()
    try:
        return v1.read_namespaced_pod_log(pod_name, NAMESPACE, tail_lines=lines)
    except Exception as exc:
        return f"[log unavailable: {exc}]"


def get_prometheus_metrics() -> dict:
    queries = {
        "restarts_1h": (
            f'increase(kube_pod_container_status_restarts_total'
            f'{{namespace="{NAMESPACE}"}}[1h])'
        ),
        "memory_bytes": (
            f'container_memory_working_set_bytes'
            f'{{namespace="{NAMESPACE}",container!=""}}'
        ),
        "cpu_rate": (
            f'rate(container_cpu_usage_seconds_total'
            f'{{namespace="{NAMESPACE}",container!=""}}[5m])'
        ),
    }
    metrics: dict = {}
    for name, query in queries.items():
        try:
            r = requests.get(
                f"{PROMETHEUS_URL}/api/v1/query",
                params={"query": query},
                timeout=10,
            )
            result = r.json().get("data", {}).get("result", [])
            metrics[name] = result[0]["value"][1] if result else "no data"
        except Exception as exc:
            metrics[name] = f"unavailable: {exc}"
    return metrics


def ask_ollama(context: str) -> dict:
    prompt = f"""You are an autonomous Kubernetes operations agent for a Minecraft server cluster.
Analyze the following incident context and return a JSON action plan.

Rules:
- Only recommend 'restart_pod' if logs show a recoverable crash (plugin error, deadlock, NPE).
- Only recommend 'increase_memory' if logs contain OutOfMemoryError or GC overhead limit exceeded.
- Default to 'none' if the situation is unclear or the server appears stable.
- Never recommend restarting if the restart count is still below 3.

Context:
{context}

Respond with valid JSON only — no markdown fences, no extra text:
{{
  "diagnosis": "one sentence describing the root cause",
  "action": "none|restart_pod|increase_memory",
  "reason": "one sentence justifying the chosen action"
}}"""

    try:
        r = requests.post(
            f"{OLLAMA_URL}/api/generate",
            json={"model": MODEL, "prompt": prompt, "stream": False, "format": "json"},
            timeout=120,
        )
        raw = r.json().get("response", "{}")
        return json.loads(raw)
    except Exception as exc:
        log.error("Ollama call failed: %s", exc)
        return {"diagnosis": "Ollama unavailable", "action": "none", "reason": str(exc)}


def rollout_restart():
    apps_v1 = client.AppsV1Api()
    patch = {
        "spec": {
            "template": {
                "metadata": {
                    "annotations": {
                        "kubectl.kubernetes.io/restartedAt": (
                            datetime.datetime.utcnow().isoformat() + "Z"
                        )
                    }
                }
            }
        }
    }
    apps_v1.patch_namespaced_deployment(DEPLOYMENT_NAME, NAMESPACE, patch)
    log.info("Rollout restart applied to deployment/%s", DEPLOYMENT_NAME)


def bump_memory():
    apps_v1 = client.AppsV1Api()
    deployment = apps_v1.read_namespaced_deployment(DEPLOYMENT_NAME, NAMESPACE)
    container = deployment.spec.template.spec.containers[0]
    old_limit = container.resources.limits.get("memory", "?")
    container.resources.limits["memory"] = "2Gi"
    container.resources.requests["memory"] = "1.5Gi"
    apps_v1.replace_namespaced_deployment(DEPLOYMENT_NAME, NAMESPACE, deployment)
    log.info("Memory bumped %s -> 2Gi on deployment/%s", old_limit, DEPLOYMENT_NAME)


def handle_crash(pod_name: str, restart_count: int):
    global _last_action_at
    if time.time() - _last_action_at < COOLDOWN_SECONDS:
        log.info("Cooldown active — skipping analysis for %s", pod_name)
        return

    log.info("Incident detected: pod=%s restarts=%d", pod_name, restart_count)
    logs = get_pod_logs(pod_name)
    metrics = get_prometheus_metrics()

    context = (
        f"Pod: {pod_name}\n"
        f"Namespace: {NAMESPACE}\n"
        f"Restart count: {restart_count}\n\n"
        f"Recent logs (last 100 lines):\n{logs[-4000:]}\n\n"
        f"Prometheus metrics:\n{json.dumps(metrics, indent=2)}"
    )

    result = ask_ollama(context)
    log.info("Diagnosis: %s", result.get("diagnosis", "?"))
    log.info("Action:    %s — %s", result.get("action"), result.get("reason"))

    action = result.get("action", "none")
    if action == "restart_pod":
        rollout_restart()
        _last_action_at = time.time()
    elif action == "increase_memory":
        bump_memory()
        _last_action_at = time.time()
    else:
        log.info("No action taken")


def main():
    try:
        config.load_incluster_config()
        log.info("Running with in-cluster config")
    except config.ConfigException:
        config.load_kube_config()
        log.info("Running with local kubeconfig")

    log.info(
        "MineForge AI Agent ready | namespace=%s deployment=%s model=%s",
        NAMESPACE,
        DEPLOYMENT_NAME,
        MODEL,
    )

    v1 = client.CoreV1Api()
    w = watch.Watch()

    while True:
        try:
            for event in w.stream(
                v1.list_namespaced_pod, namespace=NAMESPACE, timeout_seconds=60
            ):
                pod = event["object"]
                if not pod.status.container_statuses:
                    continue
                for cs in pod.status.container_statuses:
                    if cs.restart_count >= RESTART_THRESHOLD:
                        handle_crash(pod.metadata.name, cs.restart_count)
        except Exception as exc:
            log.error("Watch loop error: %s — restarting in 10s", exc)
            time.sleep(10)


if __name__ == "__main__":
    main()
