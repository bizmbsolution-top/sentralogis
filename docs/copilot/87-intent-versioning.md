# 87. Intent Versioning

The architecture natively supports Versioning via the `version` attribute in `IntentKnowledge`.

As semantics shift (e.g., adding a new entity requirement for an old intent), a new version can be registered without deprecating the old one immediately. This enables seamless, backward-compatible upgrades to Copilot intelligence over time without breaking existing clients.
