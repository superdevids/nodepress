# RFC Process

RFC (Request for Comments) is the process for proposing significant changes to NodePress.

## When to Write an RFC

Write an RFC when you want to propose:

- A new major feature
- A significant change to existing architecture
- A change to the plugin API or SDK
- A change to the database schema
- A change that affects multiple packages
- A new package or application

Small bugs and incremental improvements do not need an RFC — just open an issue or PR.

## RFC Lifecycle

1. **Draft** — Write the RFC using the template
2. **Proposed** — Submit the RFC as a PR with label `rfc`
3. **Discussion** — Community and maintainers review and discuss
4. **Accepted** — Maintainers approve the RFC
5. **Implementation** — The RFC is implemented in code
6. **Rejected** — The RFC is not accepted (with explanation)

## How to Submit an RFC

1. Copy `rfcs/template.md` to `rfcs/0000-my-feature.md`
2. Fill out the template
3. Submit as a PR with the `rfc` label
4. Engage in discussion

## RFC Statuses

- **Draft** — Work in progress, not yet ready for review
- **Proposed** — Submitted for review and discussion
- **Accepted** — Approved and awaiting implementation
- **Implemented** — Changes have been merged
- **Rejected** — Not accepted
- **Withdrawn** — Withdrawn by author
