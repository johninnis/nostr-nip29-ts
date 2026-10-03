/**
 * NIP-29 relay-based groups — pure domain helpers.
 *
 * Parses the relay-generated kind 39000 group-metadata events into {@link Group} value objects, and
 * builds/reads kind 9 group chat messages and replies. All relay I/O (querying, rendering) lives in the
 * consuming application.
 *
 * Only the slice of NIP-29 its consumers use is modelled (ADR-0001).
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
