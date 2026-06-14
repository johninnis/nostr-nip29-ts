/**
 * NIP-29 relay-based groups — pure domain helpers.
 *
 * Parses the relay-generated kind 39000 group-metadata events into {@link Group} value objects, and
 * builds/reads kind 9 group chat messages and replies. All relay I/O (querying, rendering) lives in the
 * consuming application.
 *
 * Scope is consumer-first: the package models the parts of NIP-29 the apps built against it actually
 * use — group metadata, chat and replies — and only those. Admins/members/roles (kind 39001–39003) and
 * the group-lifecycle/moderation kinds (create/delete/edit/invite/join/leave and the rest of 9000–9021)
 * are not modelled, because nothing built against this library performs those operations yet, so their
 * shapes have not been worked out. They will be added — with the same cross-client checking the existing
 * surface got — when a consumer needs them, not modelled speculatively from the spec.
 *
 * @module
 */
export {
  groupChatFilter,
  groupMetadataFilter,
  KIND_GROUP_CHAT,
  KIND_GROUP_METADATA,
  parseGroupMetadata,
} from "./src/group.ts"
export type { Group } from "./src/group.ts"
export { buildGroupChatMessage, groupRelayHintOf, groupTagOf, withGroupTag } from "./src/chat.ts"
export type { GroupChatInput, GroupChatReply } from "./src/chat.ts"
