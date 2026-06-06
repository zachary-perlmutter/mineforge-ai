#!/usr/bin/env bash
# Chaos test: stop the EC2 instance running K3s and verify workloads reschedule.
# Single-node cluster: verifies K3s restarts cleanly and pods recover on reboot.
# Multi-node cluster: verifies workloads reschedule to surviving nodes.
#
# Requires: kubectl + aws CLI configured (--profile mineforge)
# Usage: ./chaos-node.sh [instance-id]

set -euo pipefail

INSTANCE_ID="${1:-}"
REGION="us-east-1"
PROFILE="mineforge"
NAMESPACE="minecraft"
WAIT_TIMEOUT=300

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}[chaos] Phase 11 — K3s node chaos test${NC}"
echo ""

# 1. Resolve instance ID if not provided
if [[ -z "$INSTANCE_ID" ]]; then
  INSTANCE_ID=$(aws ec2 describe-instances \
    --profile "$PROFILE" --region "$REGION" \
    --filters "Name=tag:Name,Values=mineforge-ai-server" "Name=instance-state-name,Values=running" \
    --query 'Reservations[0].Instances[0].InstanceId' --output text)
fi

if [[ -z "$INSTANCE_ID" || "$INSTANCE_ID" == "None" ]]; then
  echo -e "${RED}[error] No running mineforge-ai-server instance found${NC}"
  exit 1
fi

PUBLIC_IP=$(aws ec2 describe-instances \
  --profile "$PROFILE" --region "$REGION" \
  --instance-ids "$INSTANCE_ID" \
  --query 'Reservations[0].Instances[0].PublicIpAddress' --output text)

echo "Instance:   $INSTANCE_ID  ($PUBLIC_IP)"
echo "Namespace:  $NAMESPACE"
echo ""

# 2. Snapshot pre-chaos pod state
echo "Pods before chaos:"
kubectl get pods -n "$NAMESPACE" -o wide || true
echo ""

# 3. Stop the instance
STOP_TIME=$(date +%s)
echo -e "${YELLOW}[chaos] Stopping instance $INSTANCE_ID at $(date -u '+%H:%M:%S UTC')...${NC}"
aws ec2 stop-instances --profile "$PROFILE" --region "$REGION" --instance-ids "$INSTANCE_ID" > /dev/null
echo "Stop command issued. Waiting for instance to reach 'stopped' state..."

aws ec2 wait instance-stopped \
  --profile "$PROFILE" --region "$REGION" \
  --instance-ids "$INSTANCE_ID"
echo -e "${GREEN}[chaos] Instance stopped.${NC}"

# 4. Start the instance again
echo -e "${YELLOW}[chaos] Starting instance $INSTANCE_ID...${NC}"
aws ec2 start-instances --profile "$PROFILE" --region "$REGION" --instance-ids "$INSTANCE_ID" > /dev/null
aws ec2 wait instance-running \
  --profile "$PROFILE" --region "$REGION" \
  --instance-ids "$INSTANCE_ID"

NEW_IP=$(aws ec2 describe-instances \
  --profile "$PROFILE" --region "$REGION" \
  --instance-ids "$INSTANCE_ID" \
  --query 'Reservations[0].Instances[0].PublicIpAddress' --output text)

echo -e "${GREEN}[chaos] Instance running again. New IP: $NEW_IP${NC}"

# 5. Wait for K3s API to become reachable
echo -e "${YELLOW}[chaos] Waiting for K3s API server...${NC}"
ELAPSED=0
while ! kubectl get nodes > /dev/null 2>&1; do
  sleep 5
  ELAPSED=$((ELAPSED + 5))
  if [[ $ELAPSED -ge $WAIT_TIMEOUT ]]; then
    echo -e "${RED}[fail] API server not reachable after ${WAIT_TIMEOUT}s${NC}"
    exit 1
  fi
  printf "  %ds elapsed...\r" "$ELAPSED"
done
echo ""

# 6. Wait for Minecraft pods to be ready
echo -e "${YELLOW}[chaos] Waiting for Minecraft pods to recover...${NC}"
kubectl wait pod -n "$NAMESPACE" -l app=minecraft \
  --for=condition=Ready \
  --timeout="${WAIT_TIMEOUT}s"

RECOVER_TIME=$(date +%s)
ELAPSED_TOTAL=$((RECOVER_TIME - STOP_TIME))

echo ""
echo -e "${GREEN}[chaos] Node recovery complete!${NC}"
printf "  Total recovery time (stop→ready): %ds\n" "$ELAPSED_TOTAL"
echo ""
echo "Final cluster state:"
kubectl get nodes -o wide
echo ""
kubectl get pods -n "$NAMESPACE" -o wide
