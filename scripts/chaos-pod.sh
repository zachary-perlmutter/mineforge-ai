#!/usr/bin/env bash
# Chaos test: delete the Minecraft pod and verify self-healing recovery.
# Demonstrates K8s liveness probes + Deployment restart policy.
# Run from a machine with kubectl configured against the MineForge cluster.

set -euo pipefail

NAMESPACE="minecraft"
LABEL="app=minecraft"
TARGET_POD="${1:-}"   # optional: pass a specific pod name, else we pick the first

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}[chaos] Phase 11 — Pod deletion chaos test${NC}"
echo "Namespace: $NAMESPACE | Label: $LABEL"
echo ""

# 1. Find pod
if [[ -z "$TARGET_POD" ]]; then
  TARGET_POD=$(kubectl get pod -n "$NAMESPACE" -l "$LABEL" \
    --field-selector=status.phase=Running \
    -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || true)
fi

if [[ -z "$TARGET_POD" ]]; then
  echo -e "${RED}[error] No running Minecraft pod found. Is the server up?${NC}"
  exit 1
fi

echo -e "Target pod: ${RED}$TARGET_POD${NC}"
echo ""

# 2. Record pre-delete state
RESTARTS_BEFORE=$(kubectl get pod -n "$NAMESPACE" "$TARGET_POD" \
  -o jsonpath='{.status.containerStatuses[0].restartCount}' 2>/dev/null || echo "0")
echo "Restarts before: $RESTARTS_BEFORE"

# 3. Record timestamp and delete
DELETE_TIME=$(date +%s)
echo -e "\n${YELLOW}[chaos] Deleting pod $TARGET_POD at $(date -u '+%H:%M:%S UTC')...${NC}"
kubectl delete pod -n "$NAMESPACE" "$TARGET_POD" --grace-period=0

# 4. Wait for a new pod to appear
echo -e "${YELLOW}[chaos] Waiting for replacement pod to appear...${NC}"
TIMEOUT=180
ELAPSED=0
NEW_POD=""
while [[ -z "$NEW_POD" && $ELAPSED -lt $TIMEOUT ]]; do
  sleep 2
  ELAPSED=$((ELAPSED + 2))
  NEW_POD=$(kubectl get pod -n "$NAMESPACE" -l "$LABEL" \
    --field-selector=status.phase!=Terminating \
    -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || true)
  [[ "$NEW_POD" == "$TARGET_POD" ]] && NEW_POD=""  # still terminating
done

if [[ -z "$NEW_POD" ]]; then
  echo -e "${RED}[fail] No replacement pod appeared within ${TIMEOUT}s${NC}"
  exit 1
fi
echo -e "${GREEN}[chaos] New pod: $NEW_POD${NC}"

# 5. Wait for Ready
echo -e "${YELLOW}[chaos] Waiting for pod to become Ready...${NC}"
kubectl wait pod -n "$NAMESPACE" "$NEW_POD" \
  --for=condition=Ready \
  --timeout="${TIMEOUT}s"

RECOVER_TIME=$(date +%s)
ELAPSED_TOTAL=$((RECOVER_TIME - DELETE_TIME))

echo ""
echo -e "${GREEN}[chaos] Recovery complete!${NC}"
echo "  Pod:            $NEW_POD"
printf "  Recovery time:  %ds\n" "$ELAPSED_TOTAL"
kubectl get pod -n "$NAMESPACE" -l "$LABEL"
