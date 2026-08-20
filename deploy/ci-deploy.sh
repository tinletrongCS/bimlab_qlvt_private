#!/bin/sh
# CD deploy CODE-ONLY cho app BIMLab (multi-service) trên host prod.
# Chạy trong helper (docker CLI + compose plugin + rsync) mount /opt/bimlab + docker.sock + workspace.
# GIỮ NGUYÊN compose + .env + *.bak + .hotfix-backup trên host (cấu hình prod hand-tuned:
# externalize DB, SSO...). Chỉ đồng bộ CODE ứng dụng, rồi `docker compose up -d --build` dùng
# compose/.env sẵn của host, health-gate TẤT CẢ service + rollback toàn bộ image nếu có service hỏng.
#
# Usage: sh deploy/ci-deploy.sh <dest-dir> <source-dir>
set -eu
DEST="${1:?usage: ci-deploy.sh <dest-dir> <source-dir>}"
SRC="${2:?usage: ci-deploy.sh <dest-dir> <source-dir>}"
HEALTH_TRIES=72; HEALTH_SLEEP=5   # tối đa 6 phút chờ healthy
log(){ echo "[ci-deploy] $(date +%H:%M:%S) $*"; }

[ -d "$DEST" ] || { log "FATAL: $DEST không tồn tại"; exit 2; }
[ -f "$DEST/.env" ] || { log "FATAL: thiếu $DEST/.env (giữ trên host)"; exit 2; }
[ -f "$SRC/deploy/ci-deploy.sh" ] || true
cd "$DEST"
dc(){ docker compose "$@"; }   # auto-load docker-compose.yml[+override] + .env của host
dc config --services >/dev/null 2>&1 || { log "FATAL: 'docker compose config' lỗi ở $DEST"; exit 2; }
APP=$(basename "$DEST")

# api-gateway (stack platform) cache IP container theo lần resolve đầu; service stack app
# vừa recreate là đổi IP -> gateway trỏ IP chết -> 503 (dính sau deploy HRM 2026-07-14).
# Gọi sau MỌI lần recreate container (deploy ok lẫn rollback). Best-effort: lỗi chỉ log.
restart_gateway(){
  PLATFORM_DIR="$(dirname "$DEST")/platform"
  [ "$DEST" = "$PLATFORM_DIR" ] && return 0            # platform tự recreate gateway của nó
  [ -f "$PLATFORM_DIR/docker-compose.yml" ] || [ -f "$PLATFORM_DIR/compose.yml" ] || return 0
  log "restart api-gateway (platform) để resolve IP container mới"
  if ( cd "$PLATFORM_DIR" && docker compose restart api-gateway ); then
    log "api-gateway đã restart"
  else
    log "!! không restart được api-gateway — chạy tay: cd $PLATFORM_DIR && docker compose restart api-gateway"
  fi
}

dump_failed_logs(){
  dc ps -a || true
  for cid in $(dc ps -aq 2>/dev/null); do
    nm=$(docker inspect -f '{{.Name}}' "$cid" 2>/dev/null | sed 's#^/##' || echo '?')
    log "log $nm (120 dòng cuối)"
    docker logs --tail 120 "$cid" 2>&1 || true
  done
}

rollback_images(){
  while read ref iid; do
    [ -n "$ref" ] && [ -n "$iid" ] && docker image tag "$iid" "$ref" 2>/dev/null && log "  khôi phục $ref"
  done < "$SNAP"
  dc up -d --no-build || true
  restart_gateway
}

# 1) Snapshot image của các service đang chạy để rollback (image ref + image id)
SNAP="/tmp/ci-rollback-$APP.txt"; : > "$SNAP"
for cid in $(dc ps -q 2>/dev/null); do
  [ -n "$cid" ] || continue
  ref=$(docker inspect -f '{{.Config.Image}}' "$cid" 2>/dev/null || echo "")
  iid=$(docker inspect -f '{{.Image}}' "$cid" 2>/dev/null || echo "")
  [ -n "$ref" ] && [ -n "$iid" ] && printf '%s %s\n' "$ref" "$iid" >> "$SNAP"
done
log "snapshot $(wc -l < "$SNAP" | tr -d ' ') image để rollback"

# 2) Đồng bộ CODE (LOẠI TRỪ compose/.env/backup của host)
log "rsync CODE $SRC -> $DEST (giữ compose/.env/backup của host)"
rsync -a --delete --no-owner --no-group \
  --exclude='.git' \
  --exclude='.env' --exclude='.env.*' \
  --exclude='docker-compose*.yml' --exclude='docker-compose*.yaml' \
  --exclude='compose.yml' --exclude='compose.yaml' --exclude='compose.*.yml' \
  --exclude='*.bak' --exclude='*.bak-*' --exclude='.hotfix-backup-*' \
  --exclude='.bimlab-releases' --exclude='ci-artifacts' \
  "$SRC"/ "$DEST"/

# 3) Build + up (dùng compose/.env host). Build lỗi -> compose KHÔNG recreate -> giữ container cũ.
log "docker compose up -d --build"
if ! dc up -d --build; then
  log "!! BUILD/UP LỖI — in log và rollback image cũ"
  dump_failed_logs
  rollback_images
  exit 1
fi

# 4) Chờ TẤT CẢ service healthy (hoặc running nếu service không có healthcheck)
log "chờ tất cả service healthy..."
ok=0; i=0
while [ "$i" -lt "$HEALTH_TRIES" ]; do
  i=$((i+1)); allgood=1; bad=""
  for cid in $(dc ps -q 2>/dev/null); do
    [ -n "$cid" ] || continue
    hs=$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}nohc{{end}}' "$cid" 2>/dev/null || echo gone)
    run=$(docker inspect -f '{{.State.Running}}' "$cid" 2>/dev/null || echo false)
    nm=$(docker inspect -f '{{.Name}}' "$cid" 2>/dev/null | sed 's#^/##' || echo '?')
    if [ "$hs" = healthy ] || { [ "$hs" = nohc ] && [ "$run" = true ]; }; then continue; fi
    allgood=0; bad="$bad $nm=$hs"
  done
  [ "$allgood" = 1 ] && { ok=1; break; }
  log "  t=$((i*HEALTH_SLEEP))s chờ:$bad"
  sleep "$HEALTH_SLEEP"
done

# 5) Rollback toàn bộ nếu có service không healthy
if [ "$ok" != 1 ]; then
  log "!! CÓ SERVICE KHÔNG HEALTHY -> ROLLBACK toàn bộ image cũ"
  dump_failed_logs
  rollback_images
  log "đã rollback về image cũ (kiểm tra lại thủ công nếu cần)"
  exit 1
fi
restart_gateway
log "DEPLOY OK — tất cả service của $APP healthy"
