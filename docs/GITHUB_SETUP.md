# GitHub setup for maintainers

Files in `.github/` (workflows, issue and PR templates, Dependabot) take effect when they are pushed. Repository **settings** and **rulesets** live on GitHub, so they have to be applied once. Nothing here is applied automatically.

Replace `OWNER/REPO` with your repository (the README assumes `Rothenhall/things`). You need admin rights and the [GitHub CLI](https://cli.github.com/) (`gh auth login`).

## 1. Repository settings

```bash
gh repo edit OWNER/REPO \
  --description "3D plush character editor and a self-hostable chat assistant that finds your content gaps and tracks AI traffic" \
  --enable-issues --enable-discussions \
  --enable-squash-merge --enable-merge-commit=false --enable-rebase-merge=false \
  --delete-branch-on-merge \
  --add-topic threejs --add-topic nextjs --add-topic self-hosted --add-topic chatbot \
  --add-topic aeo --add-topic llms-txt --add-topic open-source
```

## 2. Security features (free for public repositories)

```bash
# private vulnerability reporting (SECURITY.md points to it)
gh api -X PUT repos/OWNER/REPO/private-vulnerability-reporting

# dependency alerts and automated security updates
gh api -X PUT repos/OWNER/REPO/vulnerability-alerts
gh api -X PUT repos/OWNER/REPO/automated-security-fixes

# secret scanning + push protection
gh api -X PATCH repos/OWNER/REPO \
  -f 'security_and_analysis[secret_scanning][status]=enabled' \
  -f 'security_and_analysis[secret_scanning_push_protection][status]=enabled'
```

Code scanning runs from `.github/workflows/codeql.yml` once the workflow is on the default branch.

## 3. Rulesets

Two importable rulesets are in `.github/rulesets/`:

| File | Protects | Rules |
|---|---|---|
| `main.json` | the default branch | no deletion, no force-push, linear history, pull request required (1 approval, stale approvals dismissed, conversations resolved, squash merge only), the `build` CI check must pass and be up to date |
| `release-tags.json` | tags `v*` | cannot be deleted, moved or force-pushed |

Apply them:

```bash
gh api repos/OWNER/REPO/rulesets --method POST --input .github/rulesets/main.json
gh api repos/OWNER/REPO/rulesets --method POST --input .github/rulesets/release-tags.json
```

Or in the web UI: Settings, Rules, Rulesets, New ruleset, Import a ruleset.

**Solo maintainer note.** `main.json` lets repository admins bypass the rules **through a pull request only** (`bypass_mode: pull_request`), so you can merge your own PRs without a second reviewer but still cannot push straight to `main`. If a team maintains the repo, remove the `bypass_actors` entry.

The required check is named `build`, the job in `.github/workflows/ci.yml`. If you rename that job, update the ruleset. GitHub only lets you require a check after it has run at least once, so open a first PR before applying the ruleset.

## 4. Ownership

`CODEOWNERS` is not included because it needs a real GitHub user or team handle, and an invalid one silently disables review requests. When you have a team, add `.github/CODEOWNERS`:

```
* @OWNER/maintainers
```

## 5. Releasing

1. Update `CHANGELOG.md` and the version in `package.json`.
2. `git tag v1.1.0 && git push origin v1.1.0`
3. `.github/workflows/release-image.yml` publishes `ghcr.io/OWNER/REPO:1.1.0` and `:latest`.
4. In Settings, Packages, set the package visibility to public so anyone can pull it.
5. Create the GitHub Release from the tag and paste the changelog section.

## 6. Keeping it free

- The license is MIT: anyone may use, modify, host and sell their own copy.
- There are no paid tiers, license checks or phone-home calls in the code. Keep it that way: pull requests that add them should be declined.
- Sponsorship, if you ever want it, is separate from the code: GitHub Sponsors needs a `.github/FUNDING.yml`, which this repo deliberately does not include.
