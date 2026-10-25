# `@rinspacehq/cline-embed`

Browser-only Cline Agent runtime and selected host-adaptable Agent UI.

The package accepts a host-provided `AgentModel`, tools, persistence and theme.
It deliberately does not expose Cline provider credentials, Node filesystem or
shell tools, SQLite, Hub, MCP, teams, sub-agents, or Cline Cloud accounts.

Tools are denied by default. A host must register each tool and explicitly set
its named policy to `{ enabled: true, autoApprove: true | false }`. The wildcard
policy is owned by the package and cannot be overridden.

Import `@rinspacehq/cline-embed/styles.css` and set the `--rinspace-agent-*`
custom properties on a `.rinspace-cline-embed` host element. The package does
not load fonts or define a product palette.

The release archive also carries a self-contained TypeScript host contract;
consumers do not need unpublished `@cline/*` workspace declarations.

`examples/minimal.ts` is built for a real browser and exercised in headless
Chromium by the protected package workflow. The smoke test also rejects every
request outside its local test origin.
