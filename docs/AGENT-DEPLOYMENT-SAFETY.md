# Protecting Deployments from AI Agents

This document outlines best practices for preventing AI coding agents (Cursor, Copilot, etc.) from accidentally breaking production deployments, URLs, or infrastructure configuration.

## The Problem

AI agents with terminal access can run commands that modify cloud infrastructure settings. A single `vercel deploy --prod` or `vercel alias` command can:

- Override production deployment settings
- Change domain/alias configurations  
- Break automatic deployment pipelines
- Cause downtime on production URLs

## What Happened (December 2024)

A Cursor Conductor agent ran Vercel CLI commands that:
1. Created a deployment with overridden settings
2. Changed the production alias from `warframeclox.vercel.app` to a unique deployment URL
3. Broke the automatic domain assignment for new deployments

**Result:** Production URL returned 404 until manually fixed via CLI.

## Prevention Strategies

### 1. Use `.cursorignore`

Add deployment configuration files to `.cursorignore` to prevent agents from reading or modifying them:

```
# Deployment configuration - do not let agents touch
.vercel/
vercel.json
netlify.toml
fly.toml
railway.json
render.yaml

# Environment files
.env*
*.env

# CI/CD configuration
.github/workflows/deploy*.yml
```

### 2. Revoke Local CLI Authentication

If you don't need local deployment capabilities, log out of cloud CLIs:

```bash
# Vercel
vercel logout
rm -rf .vercel/

# Netlify
netlify logout

# Fly.io
fly auth logout

# AWS
rm ~/.aws/credentials
```

### 3. Git Branch Protection

Configure GitHub branch protection rules for `main`:

1. Go to **Settings → Branches → Add rule**
2. Branch name pattern: `main`
3. Enable:
   - ✅ Require pull request before merging
   - ✅ Require approvals (1+)
   - ✅ Dismiss stale approvals when new commits are pushed
   - ✅ Require conversation resolution before merging

This prevents agents from pushing directly to production branches.

### 4. Recognize Dangerous Commands

**STOP any agent that attempts these commands:**

| Provider | Dangerous Commands |
|----------|-------------------|
| Vercel | `vercel deploy`, `vercel --prod`, `vercel alias`, `vercel domains`, `vercel link`, `vercel env` |
| Netlify | `netlify deploy`, `netlify link`, `netlify env` |
| Fly.io | `fly deploy`, `fly secrets`, `fly scale` |
| AWS | `aws deploy`, `aws cloudformation`, `aws ecs` |
| Docker | `docker push`, `docker-compose up -d` (on prod) |

### 5. Separate Development from Deployment

**Agents should:**
- ✅ Write and modify code
- ✅ Run tests locally
- ✅ Commit and push to feature branches
- ✅ Create pull requests

**Agents should NOT:**
- ❌ Deploy to production
- ❌ Modify cloud provider settings
- ❌ Change domain/DNS configuration
- ❌ Manage secrets or environment variables
- ❌ Run infrastructure-as-code commands

### 6. Use GitHub Integration for Deployments

Let your cloud provider's GitHub integration handle deployments:

- **Vercel:** Automatic deployments on push to `main`
- **Netlify:** Automatic deployments on push to `main`
- **Railway:** Automatic deployments on push to `main`

This ensures deployments go through git history and can be audited/reverted.

## Recovery Checklist

If an agent breaks your deployment:

1. **Check git history** for recent commits from agent sessions
   ```bash
   git log --oneline --since="today" --all
   ```

2. **Check cloud provider activity logs** for CLI/API calls

3. **List current aliases/domains**
   ```bash
   vercel alias list
   vercel domains ls
   ```

4. **Restore domain configuration**
   ```bash
   # Remove bad aliases
   vercel alias rm broken-alias.vercel.app --yes
   
   # Re-add correct domain
   vercel domains add your-project.vercel.app
   ```

5. **Promote a known-good deployment**
   - Go to Deployments tab in dashboard
   - Find a deployment from before the incident
   - Click ⋮ → "Promote to Production"

## Summary

| Protection | Effort | Effectiveness |
|------------|--------|---------------|
| `.cursorignore` | Low | Medium |
| Logout from CLIs | Low | High |
| Branch protection | Medium | High |
| Recognize dangerous commands | Ongoing | High |
| GitHub-only deployments | Low | Very High |

**The golden rule:** Agents write code. Humans deploy code.

