# Current task

## Task 5: Run browser tests in a reproducible Docker environment

Provide a Docker/Compose runner modeled on the repository's existing lifecycle-manager pattern so Playwright runs with a fixed browser image and locked dependencies.

## Done looks like

- `./docker/manage.sh build` builds the test image.
- `./docker/manage.sh e2e web` runs the web suite in Docker.
- `./docker/manage.sh e2e all` runs all Playwright projects in Docker.
- Test output is collected under `docker/artifacts/`.