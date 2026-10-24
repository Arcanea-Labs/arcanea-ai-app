# Arcanea Release Manifest v1

The `arcanea.release_manifest.v1.schema.json` acts as an integration contract for releases, proving portability and verifying fields like identity, rights, approvals, and references.

## Backwards-Compatible Migration Policy

When modifying this schema in the future, adhere to the following rules to ensure backwards compatibility with existing stored manifest versions:

1. **New Fields Must Be Optional:** If introducing a new property to the schema, it must not be added to the `required` array. Existing manifests will continue to pass validation.
2. **Never Remove or Rename Fields:** Existing fields must remain with their original names and expected formats, as old manifests will still rely on these fields. Do not alter data types of existing fields (e.g., from `string` to `array`).
3. **Additive Enum Values Only:** The `enum` allowed values for existing fields (like `canonStatus`) may be expanded, but existing accepted values must not be removed.
4. **Version Bump for Breaking Changes:** If a breaking change is strictly necessary (e.g., changing required fields, changing shapes of nested objects, deprecating fields), a new schema version (e.g., `v2`) must be authored, along with an explicit migration path to migrate old manifests to the new version. Validation scripts must support older versions until all records are migrated.
