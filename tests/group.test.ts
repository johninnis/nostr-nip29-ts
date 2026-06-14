import { assertEquals } from "@std/assert"
import { buildEventFixture } from "@innis/nostr-core/testing"
import { parseRelayUrl } from "@innis/nostr-core"
import {
  groupChatFilter,
  groupMetadataFilter,
  KIND_GROUP_CHAT,
  KIND_GROUP_METADATA,
  parseGroupMetadata,
} from "../mod.ts"

const relay = parseRelayUrl("wss://groups.example.com")

Deno.test("groupMetadataFilter matches every group when no id is given", () => {
  assertEquals(groupMetadataFilter(), { kinds: [KIND_GROUP_METADATA] })
})

Deno.test("groupMetadataFilter scopes to one group by d tag when given an id", () => {
  assertEquals(groupMetadataFilter("abcdef"), { kinds: [KIND_GROUP_METADATA], "#d": ["abcdef"] })
})

Deno.test("groupChatFilter matches kind 9 messages by h tag", () => {
  assertEquals(groupChatFilter("abcdef"), { kinds: [KIND_GROUP_CHAT], "#h": ["abcdef"] })
})

Deno.test("parseGroupMetadata derives a group from a full kind 39000 event", () => {
  const event = buildEventFixture({
    kind: KIND_GROUP_METADATA,
    tags: [
      ["d", "abcdef"],
      ["name", "Cool Group"],
      ["about", "A place to chat"],
      ["picture", "https://example.com/pic.png"],
      ["private"],
      ["closed"],
      ["restricted"],
      ["hidden"],
    ],
  })

  assertEquals(parseGroupMetadata(event, relay), {
    id: "abcdef",
    relay,
    name: "Cool Group",
    about: "A place to chat",
    picture: "https://example.com/pic.png",
    isPublic: false,
    isOpen: false,
    isRestricted: true,
    isHidden: true,
    isLiveAvSpace: false,
  })
})

Deno.test("parseGroupMetadata flags a livekit-tagged group as a live AV space", () => {
  const event = buildEventFixture({ kind: KIND_GROUP_METADATA, tags: [["d", "g1"], ["name", "Voices"], ["livekit"]] })
  assertEquals(parseGroupMetadata(event, relay)?.isLiveAvSpace, true)
})

Deno.test("parseGroupMetadata leaves isLiveAvSpace false without a livekit tag", () => {
  const event = buildEventFixture({ kind: KIND_GROUP_METADATA, tags: [["d", "g1"]] })
  assertEquals(parseGroupMetadata(event, relay)?.isLiveAvSpace, false)
})

Deno.test("parseGroupMetadata defaults to public and open without markers", () => {
  const event = buildEventFixture({ kind: KIND_GROUP_METADATA, tags: [["d", "g1"]] })
  const group = parseGroupMetadata(event, relay)
  assertEquals(group?.isPublic, true)
  assertEquals(group?.isOpen, true)
})

Deno.test("parseGroupMetadata leaves isRestricted and isHidden false without their markers", () => {
  const event = buildEventFixture({ kind: KIND_GROUP_METADATA, tags: [["d", "g1"]] })
  const group = parseGroupMetadata(event, relay)
  assertEquals(group?.isRestricted, false)
  assertEquals(group?.isHidden, false)
})

Deno.test("parseGroupMetadata honours explicit public and open markers", () => {
  const event = buildEventFixture({ kind: KIND_GROUP_METADATA, tags: [["d", "g1"], ["public"], ["open"]] })
  const group = parseGroupMetadata(event, relay)
  assertEquals(group?.isPublic, true)
  assertEquals(group?.isOpen, true)
})

Deno.test("parseGroupMetadata falls back to the id when no name tag is present", () => {
  const event = buildEventFixture({ kind: KIND_GROUP_METADATA, tags: [["d", "noname"]] })
  assertEquals(parseGroupMetadata(event, relay)?.name, "noname")
})

Deno.test("parseGroupMetadata trims surrounding whitespace from text fields", () => {
  const event = buildEventFixture({
    kind: KIND_GROUP_METADATA,
    tags: [["d", "g1"], ["name", " voices, test room"], ["about", "just another test room "], ["picture", " "]],
  })
  const group = parseGroupMetadata(event, relay)
  assertEquals(group?.name, "voices, test room")
  assertEquals(group?.about, "just another test room")
  assertEquals(group?.picture, null)
})

Deno.test("parseGroupMetadata returns null without a d tag", () => {
  const event = buildEventFixture({ kind: KIND_GROUP_METADATA, tags: [["name", "Orphan"]] })
  assertEquals(parseGroupMetadata(event, relay), null)
})

Deno.test("parseGroupMetadata returns null for the wrong kind", () => {
  const event = buildEventFixture({ kind: 1, tags: [["d", "g1"]] })
  assertEquals(parseGroupMetadata(event, relay), null)
})
