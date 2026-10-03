import { assertEquals } from "@std/assert"
import { buildEventFixture, eventIdFixture, publicKeyFixture, relayUrlFixture } from "@innis/nostr-core/testing"
import type { UnsignedEvent } from "@innis/nostr-core"
import { buildGroupChatMessage, groupRelayHintOf, groupTagOf, KIND_GROUP_CHAT, withGroupTag } from "../mod.ts"

const relay = relayUrlFixture("wss://groups.example.com")

Deno.test("groupTagOf returns the h tag with its relay hint", () => {
  const event = buildEventFixture({ kind: KIND_GROUP_CHAT, tags: [["h", "g1", "wss://relay.example.com"]] })
  assertEquals(groupTagOf(event), ["h", "g1", "wss://relay.example.com"])
})

Deno.test("groupTagOf returns the h tag without a hint", () => {
  const event = buildEventFixture({ kind: KIND_GROUP_CHAT, tags: [["h", "g1"]] })
  assertEquals(groupTagOf(event), ["h", "g1"])
})

Deno.test("groupTagOf returns null when there is no h tag", () => {
  const event = buildEventFixture({ kind: 1, tags: [["e", "a".repeat(64)]] })
  assertEquals(groupTagOf(event), null)
})

Deno.test("groupTagOf ignores an empty h tag value", () => {
  const event = buildEventFixture({ kind: KIND_GROUP_CHAT, tags: [["h", ""]] })
  assertEquals(groupTagOf(event), null)
})

Deno.test("groupRelayHintOf returns the normalised relay hint from the h tag", () => {
  const event = buildEventFixture({ kind: KIND_GROUP_CHAT, tags: [["h", "g1", "wss://groups.example.com/"]] })
  assertEquals(groupRelayHintOf(event), relay)
})

Deno.test("groupRelayHintOf returns null when the h tag carries no hint", () => {
  const event = buildEventFixture({ kind: KIND_GROUP_CHAT, tags: [["h", "g1"]] })
  assertEquals(groupRelayHintOf(event), null)
})

Deno.test("groupRelayHintOf returns null when the hint is not a valid relay URL", () => {
  const event = buildEventFixture({ kind: KIND_GROUP_CHAT, tags: [["h", "g1", "not-a-url"]] })
  assertEquals(groupRelayHintOf(event), null)
})

Deno.test("groupRelayHintOf returns null when there is no h tag", () => {
  const event = buildEventFixture({ kind: 1, tags: [] })
  assertEquals(groupRelayHintOf(event), null)
})

const reaction: UnsignedEvent = { kind: 7, created_at: 0, content: "+", tags: [["e", "a".repeat(64)]] }

Deno.test("withGroupTag copies the h tag with the resolved relay as its hint", () => {
  const target = buildEventFixture({ kind: KIND_GROUP_CHAT, tags: [["h", "g1"]] })
  assertEquals(withGroupTag(reaction, target, relay).tags, [["e", "a".repeat(64)], ["h", "g1", relay]])
})

Deno.test("withGroupTag replaces a stale hint with the resolved relay", () => {
  const target = buildEventFixture({ kind: KIND_GROUP_CHAT, tags: [["h", "g1", "wss://stale.example.com"]] })
  assertEquals(withGroupTag(reaction, target, relay).tags, [["e", "a".repeat(64)], ["h", "g1", relay]])
})

Deno.test("withGroupTag keeps the target's own hint when no relay resolves", () => {
  const target = buildEventFixture({ kind: KIND_GROUP_CHAT, tags: [["h", "g1", "wss://groups.example.com"]] })
  assertEquals(withGroupTag(reaction, target, null).tags, [["e", "a".repeat(64)], ["h", "g1", relay]])
})

Deno.test("withGroupTag drops a target hint that is not a relay URL when no relay resolves", () => {
  const target = buildEventFixture({ kind: KIND_GROUP_CHAT, tags: [["h", "g1", "not a relay", "extra"]] })
  assertEquals(withGroupTag(reaction, target, null).tags, [["e", "a".repeat(64)], ["h", "g1"]])
})

Deno.test("withGroupTag leaves the event untouched when the target is not a group message", () => {
  const target = buildEventFixture({ kind: 1, tags: [["t", "nostr"]] })
  assertEquals(withGroupTag(reaction, target, relay), reaction)
})

Deno.test("withGroupTag leaves the event untouched when there is no target", () => {
  assertEquals(withGroupTag(reaction, null, relay), reaction)
})

Deno.test("buildGroupChatMessage builds a kind 9 with the h tag and relay hint", () => {
  const event = buildGroupChatMessage({ groupId: "g1", content: "hello", relayHint: relay })
  assertEquals(event.kind, KIND_GROUP_CHAT)
  assertEquals(event.content, "hello")
  assertEquals(event.tags, [["h", "g1", relay]])
})

Deno.test("buildGroupChatMessage omits the hint when no relay is known", () => {
  const event = buildGroupChatMessage({ groupId: "g1", content: "hi" })
  assertEquals(event.tags, [["h", "g1"]])
})

Deno.test("buildGroupChatMessage adds a q tag quoting the replied-to message", () => {
  const parentId = eventIdFixture("b".repeat(64))
  const parentPubkey = publicKeyFixture("c".repeat(64))
  const event = buildGroupChatMessage({
    groupId: "g1",
    content: "re: hi",
    relayHint: relay,
    replyTo: { id: parentId, pubkey: parentPubkey },
  })
  assertEquals(event.tags, [["h", "g1", relay], ["q", parentId, relay, parentPubkey]])
})

Deno.test("buildGroupChatMessage keeps the quoted author when no relay is known, leaving the relay empty", () => {
  const parentId = eventIdFixture("b".repeat(64))
  const parentPubkey = publicKeyFixture("c".repeat(64))
  const event = buildGroupChatMessage({
    groupId: "g1",
    content: "re: hi",
    replyTo: { id: parentId, pubkey: parentPubkey },
  })
  assertEquals(event.tags, [["h", "g1"], ["q", parentId, "", parentPubkey]])
})

Deno.test("buildGroupChatMessage writes the pinned created_at", () => {
  assertEquals(buildGroupChatMessage({ groupId: "g1", content: "hi", createdAt: 1700000000 }).created_at, 1700000000)
})
