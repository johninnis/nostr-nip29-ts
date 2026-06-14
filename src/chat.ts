import type { EventId, PublicKey, RelayUrl, RenderableEvent, Tag, UnsignedEvent } from "@innis/nostr-core"
import { normaliseRelayUrl, now } from "@innis/nostr-core"
import { KIND_GROUP_CHAT } from "./group.ts"

/**
 * The event's NIP-29 group `h` tag — `["h", <group-id>]` — or `null` if it carries none. The tag may
 * also carry a relay-hint third element (`["h", <group-id>, <relay-hint>]`); NIP-29 documents only the
 * group id, but that hint is a de-facto convention emitted by some clients (chachi, Hubstr) and
 * omitted by others (flotilla, grimoire).
 */
export const groupTagOf = (event: RenderableEvent): Tag | null =>
  event.tags.find((tag) => tag[0] === "h" && !!tag[1]) ?? null

/**
 * The relay hint carried on the event's group `h` tag, normalised — `null` when absent or invalid.
 * The hint is a de-facto convention (emitted by chachi, Hubstr) rather than written NIP-29, so events
 * from clients that omit it (flotilla, grimoire) will have none.
 */
export const groupRelayHintOf = (event: RenderableEvent): RelayUrl | null => {
  const hint = groupTagOf(event)?.[2]
  return hint === undefined ? null : normaliseRelayUrl(hint)
}

/**
 * Copy `target`'s NIP-29 group `h` tag onto an outgoing event (reaction, repost, zap request) so
 * group relays accept it and it routes back to the group. `groupRelay` — the group's resolved
 * hosting relay — is written as the tag's relay hint (a de-facto convention, not written NIP-29, but
 * also emitted by chachi); when `null` the tag is copied verbatim. No-op when `target` is `null` or
 * carries no group tag.
 */
export const withGroupTag = (
  event: UnsignedEvent,
  target: RenderableEvent | null,
  groupRelay: RelayUrl | null,
): UnsignedEvent => {
  const groupTag = target ? groupTagOf(target) : null
  const groupId = groupTag?.[1]
  if (!groupTag || !groupId) return event
  const tag: Tag = groupRelay ? ["h", groupId, groupRelay] : groupTag
  return { ...event, tags: [...event.tags, tag] }
}

/** The message a group chat reply quotes. */
export interface GroupChatReply {
  readonly id: EventId
  readonly pubkey: PublicKey
}

/** The fields needed to build a NIP-29 kind 9 group chat message. */
export interface GroupChatInput {
  readonly groupId: string
  readonly content: string
  /**
   * The group's relay, recorded as the `h` (and reply `q`) tag relay hint so others can resolve it.
   * The `h` relay hint is a de-facto convention (chachi, Hubstr), not written into NIP-29.
   */
  readonly relayHint?: RelayUrl | null
  readonly replyTo?: GroupChatReply | null
}

/**
 * Build an unsigned NIP-29 kind 9 chat message for a group. Carries the group `h` tag (with the relay
 * hint when known). NIP-29 defines no chat-reply structure, so a reply is expressed with a `q` quote
 * tag — the convention grimoire and wisp also use; other clients differ (nostrord uses a barer
 * `["q", id]`, flotilla quotes in content).
 */
export const buildGroupChatMessage = (input: GroupChatInput): UnsignedEvent => {
  const hint = input.relayHint ?? null
  const tags: Array<Tag> = [hint ? ["h", input.groupId, hint] : ["h", input.groupId]]
  if (input.replyTo) {
    tags.push(hint ? ["q", input.replyTo.id, hint, input.replyTo.pubkey] : ["q", input.replyTo.id])
  }
  return { kind: KIND_GROUP_CHAT, created_at: now(), tags, content: input.content }
}
