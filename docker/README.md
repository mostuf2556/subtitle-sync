# Docker test runner

The Docker runner keeps the test environment consistent with CI and with the
deployed-site E2E workflow. It uses the official Playwright image, installs
the repository's locked dependencies in the image, and writes test reports to
`docker/artifacts/`.

From the project root:

```bash
./docker/manage.sh build
./docker/manage.sh e2e web
./docker/manage.sh e2e all
```

To run the web suite against a deployed site instead of the container's local
Vite server:

```bash
PLAYWRIGHT_BASE_URL=https://example.com/app/ ./docker/manage.sh e2e web
```

The `shell` command opens a shell in the test image. `clean` removes Compose
resources and local Docker test artifacts.