#!/usr/bin/env bash

set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/compose.yml"
COMPOSE=(docker compose --project-directory "$PROJECT_ROOT" -f "$COMPOSE_FILE")

usage() {
  cat <<'EOF'
Usage:
  ./docker/manage.sh [--no-cache] build
  ./docker/manage.sh [--no-cache] e2e [web|emulation|app|all] [Playwright arguments...]
  ./docker/manage.sh shell
  ./docker/manage.sh clean

Examples:
  ./docker/manage.sh build
  ./docker/manage.sh e2e web
  ./docker/manage.sh e2e all --grep "subtitle"
  PLAYWRIGHT_BASE_URL=https://example.com/app/ ./docker/manage.sh e2e web
EOF
}

require_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    echo "Docker is required but was not found in PATH." >&2
    exit 1
  fi

  if ! docker info >/dev/null 2>&1; then
    echo "Docker is installed but the Docker daemon is not available." >&2
    exit 1
  fi
}

prepare_artifacts() {
  mkdir -p "$SCRIPT_DIR/artifacts/test-results" "$SCRIPT_DIR/artifacts/playwright-report"
}

build_image() {
  local cache_flag=()
  if [[ "${NO_CACHE:-false}" == "true" ]]; then
    cache_flag+=(--no-cache)
  fi

  "${COMPOSE[@]}" build "${cache_flag[@]}" e2e
}

run_e2e() {
  local suite="${1:-web}"
  shift || true

  local npm_script
  case "$suite" in
    web)
      npm_script="test:e2e:web"
      ;;
    emulation)
      npm_script="test:e2e:emulation"
      ;;
    app)
      npm_script="test:e2e"
      ;;
    all)
      npm_script="test:e2e:all"
      ;;
    *)
      echo "Unknown E2E suite: $suite" >&2
      usage >&2
      exit 2
      ;;
  esac

  prepare_artifacts
  "${COMPOSE[@]}" run --rm e2e npm run "$npm_script" -- "$@"
}

main() {
  local command="${1:-}"
  if [[ "$command" == "--no-cache" ]]; then
    NO_CACHE=true
    shift
    command="${1:-}"
  fi

  case "$command" in
    build)
      require_docker
      build_image
      ;;
    e2e)
      require_docker
      build_image
      shift
      run_e2e "$@"
      ;;
    shell)
      require_docker
      build_image
      prepare_artifacts
      "${COMPOSE[@]}" run --rm --entrypoint bash e2e
      ;;
    clean)
      require_docker
      "${COMPOSE[@]}" down --volumes --remove-orphans
      rm -rf "$SCRIPT_DIR/artifacts"
      ;;
    help|--help|-h|"")
      usage
      ;;
    *)
      echo "Unknown command: $command" >&2
      usage >&2
      exit 2
      ;;
  esac
}

main "$@"