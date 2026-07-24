# NEXUS AI Acceptance Gates

## Universal gate

Every phase must satisfy:

- Scope matches the requested phase.
- Existing unrelated behaviour is preserved.
- No secrets are committed.
- Relevant types and tests exist.
- Typecheck passes.
- Lint passes.
- Tests pass.
- Production build passes.
- Progress is updated.
- Known limitations are reported.

## UI phase gate

- The screen has a clear purpose and dominant focal point.
- Populated, loading, empty, stale, error, offline, and permission states exist where relevant.
- Desktop and narrow-width layouts were visually inspected.
- No accidental horizontal overflow.
- Keyboard navigation and focus states work.
- Reduced-motion behaviour exists.
- Components use design tokens.
- The screen is not an equal-weight card grid.
- Source, confidence, freshness, and authority are visible when relevant.
- Console contains no unexplained errors.
- UI rubric categories score at least 4/5 or a documented limitation exists.

## Integration gate

- OAuth scope is minimal.
- Token handling is server-side and encrypted.
- Initial sync works.
- Incremental sync or bounded polling works.
- Webhooks are verified.
- Duplicate events are handled.
- Subscription renewal exists where required.
- Rate limits and retries are bounded.
- Disconnect and revoke work.
- UI shows health and last sync.
- Source-derived deletion behaviour is tested.

## Public API gate

- Key and billing restrictions are configured.
- Timeouts and rate limits exist.
- Cached data carries freshness.
- Failure has a useful fallback.
- User input and provider payload are validated.
- Cost is measurable.

## RAG gate

- Ingestion preserves metadata and permissions.
- Chunking matches source structure.
- Hybrid retrieval is evaluated.
- Results cite permitted sources.
- Deleted/revoked sources leave the index.
- Prompt injection in retrieved content is tested.
- Retrieval quality is evaluated independently from prose quality.

## Agent gate

- Responsibility is narrow.
- Input and output are typed.
- Tool allowlist is explicit.
- Time and cost budgets exist.
- Evidence and confidence are returned.
- Permission is not chosen by the model.
- Missing data produces honest limitations.
- Scenario tests include failure and adversarial cases.

## Action gate

- Proposed side effects are previewable.
- Required authority is explicit.
- Execution is idempotent.
- Result comes from the tool, not the model.
- Audit record is created.
- Failure is recoverable or clearly final.
- Reversible actions provide reversal where feasible.
- High-risk action receives fresh confirmation.
- Kill switch prevents execution.

## Android gate

- Secure session storage
- Correct runtime permission flow
- Background behaviour tested against OS restrictions
- Battery impact measured
- Offline state works
- Notification deep links work
- Location is purpose-limited
- Health data uses separate consent
- Desktop and mobile state reconcile safely

## Pilot gate

- Threat model reviewed
- Data export works
- Account deletion works
- Provider revocation works
- Incident and kill-switch procedures exist
- High-risk automatic actions disabled
- Evaluation dashboard exists
- Notification annoyance is measured
- Pilot users understand data sources and authority

## Final release gate

- Security review complete
- Backups and recovery tested
- Queue and webhook capacity tested
- Model and provider costs bounded
- Accessibility audit complete
- Performance budgets met
- Privacy controls verified
- Agent and action scenario suite passes
- Production monitoring and incident ownership established
