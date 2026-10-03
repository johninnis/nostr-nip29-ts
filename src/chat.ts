import type { EventId, PublicKey, RelayUrl, Rumour, Tag, UnsignedEvent } from "@innis/nostr-core"
import { now, parseRelayUrl } from "@innis/nostr-core"
import { KIND_GROUP_CHAT } from "./group.ts"

const groupTag = (groupId: string, relay: RelayUrl | null): Tag =>
  relay === null ? ["h", groupId] : ["h", groupId, relay]

/**
 * The event's NIP-29 group `h` tag, `["h", <group-id>]` or `["h", <group-id>, <relay-hint>]`, or `null` when it carries
 * none with a non-empty group id. The relay hint is optional on reading (shared ADR-0101).
 */
export const groupTagOf = (event: Rumour): Tag | null => event.tags.find((tag) => tag[0] === "h" && !!tag[1]) ?? null

/**
 * The relay hint on the event's group `h` tag as a canonical relay URL, or `null` when the event has no group tag, the
 * tag has no hint, or the hint is not a relay URL (shared ADR-0101).
 */
export const groupRelayHintOf = (event: Rumour): RelayUrl | null => parseRelayUrl(groupTagOf(event)?.[2])

/**
 * Add `target`'s NIP-29 group `h` tag to an outgoing event (reaction, repost, zap request) so the group's relay accepts
 * it and it routes back to the group. The tag's relay hint is `groupRelay`, the group's resolved hosting relay, or
 * otherwise the target's own hint when it is a relay URL (shared ADR-0101). The event is returned unchanged when
 * `target` is `null` or carries no group tag.
 */
export const withGroupTag = (
  event: UnsignedEvent,
  target: Rumour | null,
  groupRelay: RelayUrl | null,
): UnsignedEvent => {
  const groupId = target === null ? undefined : groupTagOf(target)?.[1]
  if (target === null || groupId === undefined) return event
  return { ...event, tags: [...event.tags, groupTag(groupId, groupRelay ?? groupRelayHintOf(target))] }
}

/** The kind 9 message a group chat reply quotes. */
export interface GroupChatReply {
  readonly id: EventId
  readonly pubkey: PublicKey
}

/** The fields needed to build a kind 9 group chat message. */
export interface GroupChatInput {
  readonly groupId: string
  readonly content: string
  /** The group's hosting relay, written as the relay of the `h` tag (shared ADR-0101) and of a reply's `q` tag. */
  readonly relayHint?: RelayUrl | null
  readonly replyTo?: GroupChatReply | null
  /** Pins the `created_at`, which defaults to the system clock ({@link now}). */
  readonly createdAt?: number
}

/**
 * Build an unsigned kind 9 group chat message carrying the group's `h` tag, with the relay hint when known. A reply
 * quotes its parent with a NIP-C7 `q` tag in the NIP-18 shape `["q", <event-id>, <relay-url>, <pubkey>]`, the relay
 * left empty when unknown.
 */
export const buildGroupChatMessage = (input: GroupChatInput): UnsignedEvent => {
  const relay = input.relayHint ?? null
  const reply = input.replyTo ?? null
  const quote: ReadonlyArray<Tag> = reply === null ? [] : [["q", reply.id, relay ?? "", reply.pubkey]]
  return {
    kind: KIND_GROUP_CHAT,
    created_at: input.createdAt ?? now(),
    tags: [groupTag(input.groupId, relay), ...quote],
    content: input.content,
  }
}
