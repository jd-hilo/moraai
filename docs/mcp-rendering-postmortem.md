# Claude MCP App rendering incident postmortem

**Status:** Resolved and documented  
**Incident window:** July 20–21, 2026  
**Affected surface:** Mora simulation results rendered as an interactive MCP App inside Claude  
**Unaffected core behavior:** Mora authentication, simulation execution, persistence, MCP tool semantics, and the web dashboard backend

## Executive summary

The incident looked like a backend outage because Claude displayed **“Unable to reach Mora”** or **“There was a problem displaying content from Mora.”** In reality, Mora usually completed the simulation and returned healthy MCP responses. The failure occurred later, when Claude tried to mount the interactive simulation resource in its nested iframe.

Several changes were initially blamed because they happened close together:

- the real Mora logo was embedded;
- Recoleta typography was embedded;
- the simulation layout was widened;
- the MCP resource URI was versioned repeatedly;
- the HTML structure and client boot script were changed;
- production was manually promoted and rolled back while `main` continued moving.

The incident did not have one simple cause. It was the interaction of four problems:

1. **PR #28 made the single-file MCP App dramatically heavier.** The generated resource grew from 408,973 bytes raw / 99,208 bytes gzip to 1,400,288 bytes raw / about 291 KB gzip, primarily because a large Recoleta font and logo were embedded into the HTML bundle.
2. **Claude cached the installed connector's tool and interactive-resource registration.** Deploying different bytes or changing the `ui://` resource URI did not reliably refresh that installed registration. The server could return 200/202 while Claude continued attempting to mount stale resource state.
3. **Too many variables changed in the same PRs.** Logo, typography, resource URI, layout width, DOM structure, client script, CTA behavior, and metadata moved together. When the iframe failed, there was no clean way to attribute the failure to one change.
4. **The validation process treated tool success and UI success as the same thing.** A simulation could run successfully while the MCP App still failed to display. Existing Claude conversations also retained stale state, so retesting them was not equivalent to a fresh connector render.

The decisive recovery step was not another code rollback. It was:

> **Claude → Customize → Connectors → Mora → More → Refresh tools list**

After that refresh, the production-proven resource mounted again. A lightweight CSS-only Unreal treatment then passed repeated fresh-conversation tests. This established that width, typography style, gradients, and branding were not inherently incompatible with Claude. The dangerous parts were resource weight, asset delivery, stale connector state, and insufficiently isolated releases.

## User-visible symptoms

The failure presented in several misleading ways:

- Claude ran `simulate_future`, but the Mora result card never appeared.
- Claude displayed **“Unable to reach Mora.”**
- Claude displayed **“There was a problem displaying content from Mora.”**
- Reopening an existing failed conversation continued to show the error after production had been rolled back.
- The server logs showed healthy `/mcp` traffic, which made the failure look intermittent or impossible to reproduce.
- A prior design could look correct in one conversation and fail after later connector/resource changes.

The user-provided reference screenshot captured the desired pre-incident design: the canonical stacked-gradient Mora logo and wordmark, a clean editorial simulation header, a restrained path selector, and a readable result card. That design target was valid. The incident was not evidence that the logo or the aesthetic itself was bad.

## What was actually working

During the display failures, the following systems continued to work:

- Clerk OAuth and the authenticated connector handshake;
- Mora's `/mcp` route;
- simulation creation and execution;
- database reads and writes associated with the simulation;
- MCP tool discovery and tool invocation;
- the structured simulation payload returned to Claude;
- the Mora web dashboard;
- production HTTP responses, commonly in the sequence `200 → 202 → 200 → 200`.

This distinction matters: **the tool call and the interactive resource are two separate stages.** The tool result can be valid even when Claude cannot boot the resource iframe that visualizes it.

## What was failing

The failing stage was the host-side interactive-resource lifecycle:

1. Claude invoked Mora's simulation tool.
2. Mora returned structured content and MCP App metadata.
3. Claude resolved the registered `ui://mora/simulation-results-*.html` resource.
4. Claude attempted to create and boot a nested iframe.
5. The iframe did not mount or did not complete its boot contract.
6. Claude replaced the result with a generic Mora reachability/display error.

Because the error message named Mora, it suggested that step 1 or 2 failed. Vercel logs showed that the requests reached Mora and succeeded, local builds completed, and Clerk remained healthy. The missing Mora iframe showed that the failure was at steps 3–5.

## Evidence that narrowed the cause

### Production logs

Failed Claude renders repeatedly correlated with healthy Vercel responses:

- `/mcp` returned 200 and 202 responses;
- there were no corresponding 4xx or 5xx responses;
- OAuth discovery and Clerk remained healthy;
- Claude often completed the simulation before displaying the iframe error.

This ruled out a conventional Mora outage.

### Bundle measurements

| Resource | Raw bytes | Gzip bytes | Notes |
| --- | ---: | ---: | --- |
| PR #27 / commit `66d1d01` | 408,973 | 99,208 | Proven pre-branding baseline |
| PR #28 branded resource | 1,400,288 | ~291,000 | Embedded Recoleta and logo; about 3.4× raw and 2.9× gzip |
| PR #45 / commit `4216e73` | 409,150 | 99,264 | Lightweight Unreal styling; no external or embedded font/image assets |

The PR #28 increase was a real regression risk and justified a permanent bundle guard. It was not, by itself, the full explanation: later lightweight resources also failed until Claude's connector registration was refreshed.

### Controlled resource experiments

The investigation intentionally varied individual parts of the MCP App:

- exact known-good document on a new resource key;
- known-good DOM with a different script path;
- known-good script with different HTML post-processing;
- sanitizer-safe fallback markup;
- stable v3 resource URI versus fresh versioned URIs;
- narrow layout versus wider layout;
- CSS-only warm tokens versus gradients and editorial type;
- exact known-good bytes deployed from current `main`.

These experiments disproved several early assumptions:

- **Width was not the root cause.** Narrow candidates failed before the connector refresh, and 720 px layouts passed afterward.
- **Gradients were not the root cause.** CSS-only gradients passed after the refresh.
- **Editorial typography was not the root cause.** A system-serif hierarchy passed after the refresh. The risky part was embedding a large font file, not using a serif aesthetic.
- **The resource URI alone was not the cache boundary.** Fresh URI versions failed when the installed connector registration remained stale.
- **The authored DOM alone was not the root cause.** The exact known-good body could still fail before refresh.
- **The client script alone was not the root cause.** Restoring the proven script did not independently recover the host.

### Decisive connector-refresh experiment

With production on the proven deployment, a fresh Claude conversation still failed. The Mora connector was then refreshed through **Refresh tools list** without disconnecting or deleting it. After the refresh:

- fresh simulations mounted a Mora iframe;
- two repeated simulations completed without display errors;
- status and recall completed;
- iframe width measured approximately 720 px with no horizontal overflow;
- `/mcp` continued to return 200/202;
- the same deployment that failed before refresh now worked.

This is the strongest evidence that stale installed-connector state was the primary reason failures persisted across otherwise-valid deployments.

## Timeline and PR history

| PR | Change | Outcome / lesson |
| --- | --- | --- |
| [#27](https://github.com/jd-hilo/moraai/pull/27) | Known-good simulation and MCP baseline, commit `66d1d01` | Proven recovery deployment |
| [#28](https://github.com/jd-hilo/moraai/pull/28) | Canonical logo, Recoleta, CTA, major visual redesign, resource v6 | Looked good and was observed working before later changes, but resource weight jumped to 1.4 MB raw and created a dangerous compatibility boundary |
| [#30](https://github.com/jd-hilo/moraai/pull/30) | Wider layout, branding adjustments, resource v7 | Failure became visible after this change, so width was initially blamed |
| [#31](https://github.com/jd-hilo/moraai/pull/31) | Rolled back PR #30 while retaining setup-scroll improvement | Did not recover the iframe; proved that widening alone was not the complete cause |
| [#32](https://github.com/jd-hilo/moraai/pull/32) | Draft rollback of PR #28 | Closed rather than merged blindly |
| [#33](https://github.com/jd-hilo/moraai/pull/33) | Unreal dashboard styling and lighter MCP branding | Web dashboard direction was valid; MCP host remained sensitive |
| [#34](https://github.com/jd-hilo/moraai/pull/34) | Authenticated dashboard overflow fix | Web-only containment fix |
| [#35](https://github.com/jd-hilo/moraai/pull/35) | Simulation canvas containment | Web-only containment fix |
| [#36](https://github.com/jd-hilo/moraai/pull/36) | Compact MCP resource and bundle ceiling | Added useful size protection but did not solve stale host state |
| [#37](https://github.com/jd-hilo/moraai/pull/37) | Restored proven document contract | Narrowed hypotheses; iframe still failed |
| [#38](https://github.com/jd-hilo/moraai/pull/38) | Restored proven script path | Script path alone was not sufficient |
| [#39](https://github.com/jd-hilo/moraai/pull/39) | Removed HTML post-processing | Post-processing alone was not sufficient |
| [#40](https://github.com/jd-hilo/moraai/pull/40) | Sanitizer-safe fallback | Fallback markup alone was not sufficient |
| [#41](https://github.com/jd-hilo/moraai/pull/41) | Exact known-good document on a fresh resource key | A new URI did not automatically refresh Claude's installed resource state |
| [#42](https://github.com/jd-hilo/moraai/pull/42) | Returned to stable v3 resource key | Corrected URI churn but still needed connector refresh |
| [#43](https://github.com/jd-hilo/moraai/pull/43) | Narrow boot contract and minimal warm CSS candidates | Both failed before connector refresh; PR was closed and not merged |
| [#44](https://github.com/jd-hilo/moraai/pull/44) | Froze known-good artifact bytes and body hash | Added deterministic safety guards; exact bytes still failed in stale connector state |
| [#45](https://github.com/jd-hilo/moraai/pull/45) | Lightweight Unreal palette, gradient, and system-serif hierarchy | Passed after tools-list refresh, then passed repeated pre-merge and post-merge production tests |

## Root causes

### 1. Stale Claude connector registration

Claude retained tool and resource information for the installed Mora connector. Server deployments and `ui://` version changes did not reliably invalidate that state. Existing failed conversations retained additional stale state.

**Why this caused confusion:** every server-side signal looked healthy, while the host still rendered an old or invalid interactive resource.

**Permanent mitigation:** every intentional MCP HTML or resource-metadata release must include **Refresh tools list** in the test account before fresh-conversation validation.

### 2. Excessive single-file resource weight

The MCP App is generated as one HTML resource. Embedding Recoleta and the logo converted those assets into large inline payloads. The raw resource increased by nearly 1 MB.

**Why this mattered:** even when not the only root cause, it increased parse, transfer, sanitizer, and iframe-boot risk inside a third-party host. It also made every cache experiment slower and less reliable.

**Permanent mitigation:** exact raw/SHA verification, gzip budget, forbidden embedded assets, and no large font or image data URLs.

### 3. Non-isolated UI releases

The initial branding and width PRs combined many unrelated changes. When the UI failed, each rollback changed several variables again.

**Why this mattered:** temporal correlation made the most visible change—width—look causal. Controlled tests later disproved that.

**Permanent mitigation:** one host-visible variable per PR. Logo, typography, width, controls, and resource metadata must ship separately.

### 4. Incomplete end-to-end acceptance criteria

Build success, unit tests, and healthy `/mcp` responses were treated as strong evidence that the UI worked. They were necessary but insufficient.

**Permanent mitigation:** a release is not green until Claude mounts the iframe in fresh conversations, twice, after a tools-list refresh, with runtime logs correlated to the exact deployment.

### 5. Production and repository drift

At several points, the production alias was manually pinned to a known-good deployment while remote `main` contained a different MCP resource.

**Why this mattered:** GitHub history, Vercel production, and what Claude had cached could all represent different versions at the same time.

**Permanent mitigation:** record the exact commit, deployment ID, resource hash, and connector-refresh state for every test. After merge, verify that the automatic `main` deployment is Ready and Current, then repeat the live test.

## False leads and what they taught us

### “The wide UI broke it”

Widening coincided with the first obvious failure, but narrow resources also failed before refresh. Width should still be tested responsively, but it was not the core incident cause.

### “Typography broke it”

Embedding a large Recoleta file was dangerous. A serif visual hierarchy was not. The production-safe implementation uses system fonts and remains within the original gzip envelope.

### “The logo broke it”

The canonical logo was embedded in the same PR as the large font, new DOM, new controls, and new resource URI. That made it impossible to isolate. The next release must test the logo alone. The logo should be optimized for its rendered size instead of embedding a 56–77 KB source PNG unchanged.

### “A new resource URI will bust the cache”

Fresh URI versions did not reliably recover the installed connector. The host-level tools-list refresh is the dependable invalidation step observed in testing.

### “200/202 means the connector UI works”

Those statuses prove that Claude reached Mora and that the MCP stream worked. They do not prove that Claude mounted the interactive result resource.

## Current safe baseline

As of commit `4216e73` / PR #45:

- production is Vercel Ready and Current;
- the MCP resource URI remains `ui://mora/simulation-results-v3.html`;
- the generated artifact is 409,150 raw bytes / 99,264 gzip bytes;
- artifact SHA-256 is `77bac8148ed1b46f4292c039e5cf2c8b3fda75731f1a2c82e65ed0927b30401f`;
- the authored `<body>` retains its production-proven boot structure;
- no font or image data URL is embedded;
- Google font hosts, Recoleta files, and large logo assets are forbidden by the build guard;
- loading, error, results, path list, path detail, metadata, and text fallback contracts are tested;
- responsive behavior is tested and the live iframe has no horizontal overflow;
- repeated fresh simulations and status/recall pass after tools-list refresh.

## Mandatory release protocol for future MCP UI changes

1. **Start from the current green `main`.** Record its commit, Vercel deployment, artifact metrics, and SHA.
2. **Change exactly one visual variable.** Do not combine logo, typography, width, CTA, or metadata work.
3. **Do not change auth or behavior.** No Clerk, OAuth, MCP tool semantics, simulation logic, provider, database, or persistence changes in a UI PR.
4. **Keep the v3 resource URI unless an isolated test proves a version change is required.** URI churn is not a substitute for refreshing the installed connector.
5. **Build and verify the MCP artifact.** Run the full unit suite, typecheck, changed-file lint, production build, and exact raw/gzip/SHA measurement.
6. **Reject heavy assets.** Do not inline source-resolution fonts or images. Optimize any approved logo for its actual rendered size and enforce a small delta budget.
7. **Deploy the exact PR commit with production environment settings.** Keep the last green deployment available for immediate rollback.
8. **Refresh Claude's tools list.** Use **Customize → Connectors → Mora → More → Refresh tools list**.
9. **Use fresh conversations.** Existing failed conversations are not valid recovery tests.
10. **Run status/recall, then at least two fresh simulations.** Confirm that each iframe mounts, becomes visible, completes, and contains meaningful text fallback.
11. **Inspect the nested iframe, not only Claude's surrounding card.** Measure width, overflow, computed styles, and booted DOM.
12. **Correlate Vercel runtime logs.** Expect the normal 200/202 sequence and zero 4xx/5xx responses.
13. **Do not merge on partial evidence.** A good screenshot, a green build, or a successful tool call alone is insufficient.
14. **After merge, monitor the automatic `main` deployment.** It must be Ready and Current, and one final fresh simulation must pass.
15. **Rollback immediately on a host error.** Restore the last green deployment before continuing the investigation.

## Next PR: canonical Mora logo only

The next implementation PR must have one scope: replace the current synthetic CSS circle in the MCP App brand line with the canonical Mora logo visible in the reference screenshot and Unreal repository.

### Required scope

- Locate and verify the canonical logo source in `jd-hilo/unreal`.
- Compare it with Mora's existing `public/mora-logo.png`; do not assume filenames prove identity.
- Render the actual stacked-gradient icon and “mora” wordmark in both loading and results brand lines.
- Preserve the adjacent `simulation` label.
- Optimize the logo for its rendered dimensions before bundling it.
- Update the deterministic bundle metrics and the smallest necessary logo/boot tests.
- Follow the complete release protocol above.

### Explicit non-scope

- no typography changes;
- no font files;
- no width or layout changes;
- no path selector changes;
- no CTA changes;
- no resource URI change;
- no main script behavior change unless strictly required to boot the image;
- no auth, tool, simulation, database, provider, or backend changes;
- no unrelated cleanup.

### Acceptance criteria

- The logo visually matches the canonical Unreal/Mora asset and the provided reference image.
- The only user-visible change is the logo/wordmark.
- The iframe renders successfully in at least two fresh Claude conversations after **Refresh tools list**.
- The production artifact remains within an explicitly reviewed small size delta.
- Vercel logs show only expected `/mcp` 200/202 responses.
- The PR remains unmerged until live Claude verification and user visual approval are complete.

## Remaining unrelated observations

These appeared in logs during the incident but were not causes of the MCP UI failure and must remain separate work:

- Anthropic authentication can fail and fall back to OpenAI during simulation generation.
- PostgreSQL emits an SSL-mode compatibility warning.
- Historical Prisma `P2028` transaction errors have been observed elsewhere.
- Pre-existing full-repository React purity/lint findings exist outside the MCP UI files.

Mixing these issues into a logo or rendering PR would recreate the same attribution problem that prolonged this incident.

