# Agent notes

## Markdown

Do not insert line breaks within paragraphs; let editors handle visual line wrapping.

## Dependencies and sandbox access

- Use Node.js 24 for development. Keep `@types/vscode` aligned with the minimum `engines.vscode` version; updating it to the latest release can introduce APIs unavailable to supported editors. `globals` is imported by the ESLint configuration and must remain a direct development dependency.
- Registry requests (`npm outdated`, `npm audit`, and installs) failed inside the restricted sandbox with `EAI_AGAIN` for `registry.npmjs.org`. The same requests succeeded with approved network access. If this recurs, use the tool's approval mechanism to retry the affected command outside the sandbox; do not treat it as a dependency failure.
- Use `--cache /tmp/conjin-vscode-npm-cache` when a writable npm cache is needed. `--fetch-retries=0 --fetch-timeout=20000` avoids prolonged retries during network checks.
- An existing `node_modules` directory does not imply a complete npm cache. `npm ci --offline` failed with `ENOTCACHED` after an incremental install; a network-enabled `npm ci` succeeded. A failed clean install may leave dependencies missing, so complete installation before testing.

## Verification

- `npm run test:unit` includes lint and works inside the sandbox. `npm test` also runs the VS Code integration suite.
- On Linux, `npm run test:integration` requires `code` (or `VSCODE_EXECUTABLE_PATH`), `xvfb-run`, and `xauth`. It creates an isolated temporary editor profile and workspace and uses a virtual display by default. Reserve `--show-window` for intentional interactive debugging.
- Integration tests failed inside the sandbox with the generic `VS Code tests failed (1)` launch error even though the prerequisites were installed. The same command passed outside the sandbox through the approval mechanism. Check the prerequisites, then request that retry if the launch failure recurs; the error alone does not show an extension regression.
- Keep the runner's `.integration-tests-passed` marker check: a successful launcher exit does not guarantee that the editor ran the tests.
- The snippet picker still needs the manual check described in README.md; the automated suite does not exercise that UI.

## Release checks

- Keep the version in `package.json` and both root version entries in `package-lock.json` synchronized. Verify a clean `npm ci`, audit, lint, unit tests, and editor integration tests after dependency changes.
- VSIX contents can be inspected without publishing using `npm exec --yes --package=@vscode/vsce@4.0.0 --cache /tmp/conjin-vscode-npm-cache -- vsce ls --no-dependencies`. Version 4.0.0 was verified in this workspace. Use `vsce package --no-dependencies --out /tmp/conjin-vscode-<version>.vsix` through the same npm command to check packaging.
- Successful packaging does not establish Marketplace readiness: an earlier check succeeded without a publisher ID and only warned about a missing license file. Verify the publisher and license declarations and the packaged license file before publication. The owner has selected publisher `lucques` and the MIT license.

## Shared Conjin infrastructure

Local Conjin deployments share the persistent reverse proxy managed by `vendor/bin/depl proxy`. Leave it running. Never run `vendor/bin/depl proxy down`, stop or remove `nginx-proxy`, or shut down the shared proxy during verification or cleanup. Stop only the project-specific deployment started for the task.
