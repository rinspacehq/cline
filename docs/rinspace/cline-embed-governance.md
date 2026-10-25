# Rinspace Cline embed governance

## Repository identity

- Canonical fork: `https://github.com/rinspacehq/cline`
- Fetch/push remote: `origin`
- Read-only upstream: `https://github.com/cline/cline` as `upstream`
- Upstream baseline: `c718573538d76310f464541617ab665108a6c999`
- Upstream tag: `sdk/agents/v0.0.95`
- Product branch: `rinspace-sdk`
- Development changes: named branches and ordinary pull requests into
  `rinspace-sdk`
- Default branch: `main`, retained as an upstream synchronization reference

The `upstream` push URL must remain disabled in Rinspace worktrees. Upstream
updates enter `rinspace-sdk` only through a separately reviewed pull request.

## Required review and checks

The protected `rinspace-sdk` branch requires an up-to-date pull request and the
following checks:

- `cline-embed`: focused type, unit, browser bundle and package checks;
- `DCO`: every non-merge commit carries a `Signed-off-by` trailer;
- `secret-scan`: tracked-source credential and private-input scan.

Force pushes and deletion are disabled. Protection applies to administrators;
there is no routine administrator bypass. Emergency repository-owner access
must not be used to merge a failing or missing required check.

## Source and release boundary

`@rinspacehq/cline-embed` is the only Rinspace product artifact built by this
fork. It accepts a host-provided model and an explicit tool policy. The package
must not contain Cline Core, Node built-ins, filesystem or shell tools, SQLite,
Hub, MCP, teams/sub-agents, vendor credentials, Cline Cloud authentication, or
undeclared network clients.

Releases are immutable GitHub Releases from a reviewed `rinspace-sdk` commit.
Consumers pin the tag, commit, package SHA-256 and manifest; they do not consume
`main`, `rinspace-sdk`, `latest`, or a repository worktree.
