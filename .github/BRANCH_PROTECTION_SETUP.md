# GitHub Branch Protection Setup Guide

Follow these steps to enable branch protection and enforce the PR workflow on your repository.

## Step 1: Navigate to Branch Protection Settings

1. Go to your repository on GitHub: https://github.com/kraitsura/delphi
2. Click on **Settings** (top navigation bar)
3. In the left sidebar, click **Branches** (under "Code and automation")
4. Under "Branch protection rules", click **Add rule** or **Add classic branch protection rule**

## Step 2: Configure Branch Protection for `main`

### Basic Settings

**Branch name pattern:** `main`

### Required Settings to Enable

#### ✅ Require a pull request before merging
- Check this box
- **Required approvals:** Set to `1` (or more if you have a team)
- ☑️ **Dismiss stale pull request approvals when new commits are pushed**
- ☑️ **Require review from Code Owners** (optional, only if you have a CODEOWNERS file)

#### ✅ Require status checks to pass before merging
- Check this box
- ☑️ **Require branches to be up to date before merging**
- **Search for and add these required status checks:**
  - `Lint & Type Check`
  - `Test`
  - `Build`
  - `Check PR Title Format`

> **Note:** Status checks will only appear in the search after you've created at least one PR that triggers these workflows. If you don't see them yet, create a test PR first.

#### ✅ Require conversation resolution before merging
- Check this box
- This ensures all review comments are addressed

#### ✅ Require signed commits (Optional but recommended)
- Check this box if you want to require GPG-signed commits
- See [GitHub's guide on commit signing](https://docs.github.com/en/authentication/managing-commit-signature-verification)

#### ✅ Require linear history (Optional but recommended)
- Check this box to prevent merge commits
- Forces rebasing or squash merging

#### ✅ Do not allow bypassing the above settings
- Check this box
- Even admins will need to follow these rules

#### ✅ Restrict who can push to matching branches (Optional)
- For team environments, you can restrict who can push directly
- Generally, you want to allow no one to push directly to main

### Recommended Configuration Summary

```
✅ Require a pull request before merging
   └─ Required number of approvals: 1
   └─ Dismiss stale pull request approvals when new commits are pushed

✅ Require status checks to pass before merging
   └─ Require branches to be up to date before merging
   └─ Status checks that are required:
      • Lint & Type Check
      • Test
      • Build
      • Check PR Title Format

✅ Require conversation resolution before merging

✅ Require linear history (optional)

✅ Do not allow bypassing the above settings

✅ Restrict who can push to matching branches
   └─ Do not allow anyone to push directly to main
```

## Step 3: Save Changes

Click **Create** or **Save changes** at the bottom of the page.

## Step 4: Test the Setup

1. Create a new branch:
   ```bash
   git checkout -b test/branch-protection
   ```

2. Make a small change (e.g., update README.md)

3. Commit and push:
   ```bash
   git add .
   git commit -m "test: verify branch protection"
   git push origin test/branch-protection
   ```

4. Create a Pull Request on GitHub

5. Verify that:
   - ✅ CI checks run automatically
   - ✅ All status checks must pass before merging
   - ✅ At least one approval is required
   - ❌ You cannot push directly to `main`

## Step 5: Try to Push Directly to Main (Should Fail)

To verify protection is working:

```bash
git checkout main
echo "test" >> README.md
git add .
git commit -m "test: this should fail"
git push origin main
```

You should see an error like:
```
remote: error: GH006: Protected branch update failed for refs/heads/main.
```

This confirms your branch protection is working correctly!

## Additional Optional Steps

### Set up CODEOWNERS (Optional)

Create a file `.github/CODEOWNERS`:

```
# Global owners
* @kraitsura

# Web frontend
/web/ @kraitsura

# Documentation
/docs/ @kraitsura
*.md @kraitsura
```

### Enable Code Scanning (Optional)

1. Go to **Settings** → **Code security and analysis**
2. Enable **Dependency graph**
3. Enable **Dependabot alerts**
4. Enable **Dependabot security updates**
5. Enable **CodeQL analysis** (for advanced security scanning)

### Set up Auto-merge (Optional)

You can enable auto-merge for PRs once all checks pass:

1. Go to **Settings** → **General**
2. Scroll to **Pull Requests**
3. Check **Allow auto-merge**

Then on individual PRs, you can click "Enable auto-merge" and the PR will merge automatically once all checks pass and reviews are approved.

## Troubleshooting

### Status checks don't appear in the list

- Create and push a test PR first
- Wait for the CI workflows to run at least once
- The status check names must match exactly what's in the workflow files

### Can't push to main even after disabling protection

- Pull the latest changes: `git pull origin main`
- Make sure you're not behind the remote branch

### Workflow fails on first run

- Check the Actions tab for error details
- Ensure `bun.lockb` is committed to the repository
- Verify all required scripts exist in `package.json`

## Documentation

- [GitHub Branch Protection Rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [Required Status Checks](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches#require-status-checks-before-merging)
- [GitHub Actions](https://docs.github.com/en/actions)
