# @innis/nostr-nip29

[![CI](https://github.com/johninnis/nostr-nip29-ts/actions/workflows/ci.yml/badge.svg)](https://github.com/johninnis/nostr-nip29-ts/actions/workflows/ci.yml)

Pure domain helpers for [NIP-29](https://github.com/nostr-protocol/nips/blob/master/29.md) relay-based groups.

A NIP-29 group is owned by the relay that hosts it. The relay publishes an addressable **kind 39000** metadata event describing each group (name, picture, about, visibility, access). This package turns those events into `Group` value objects. It performs **no I/O** — querying relays and rendering live in the consumer.

## Install

```bash
deno add jsr:@innis/nostr-nip29
```

## API

```ts
import { type Group, groupMetadataFilter, KIND_GROUP_METADATA, parseGroupMetadata } from "@innis/nostr-nip29"

// Filter every group on a relay:
queryEvents(groupMetadataFilter(), { relays: [relay], exactRelays: true })

// Parse each arriving event:
const group: Group | null = parseGroupMetadata(event, relay)
```

`parseGroupMetadata(event, relay)` returns `null` when the event is not a kind 39000 or its `d` tag (the required group id) is absent, empty or disagreeing. NIP-29 has the relay sign group metadata with its NIP-11 `self` key: pass that key as a third argument, `parseGroupMetadata(event, relay, relayPubkey)`, and metadata signed by any other key is also `null`. NIP-11 makes `self` optional, so without it the signer is not checked. Read access and join policy default to public/open unless the relay tags the group `private` (only members can read) / `closed` (join requests ignored). `isRestricted` (only members can write) and `isHidden` (relays hide metadata from non-members) default `false` unless their tags are present. `isLiveAvSpace` reflects the spec `livekit` tag, marking a group that supports live audio/video chat via a LiveKit server (NIP-29 "Live AV spaces").

## Chat

```ts
import { buildGroupChatMessage, groupChatFilter } from "@innis/nostr-nip29"

// Filter a group's live chat — every kind 9 message carrying the group's `h` tag:
queryEvents(groupChatFilter(groupId), { relays: [groupRelay], exactRelays: true })

// Build a message to post into the group:
const message = buildGroupChatMessage({ groupId, content: "gm", relayHint: groupRelay })
```

`groupChatFilter(groupId)` builds the filter for a group's chat feed — every **kind 9** (`KIND_GROUP_CHAT`) message tagged to that group via `h`. `buildGroupChatMessage(input)` builds an unsigned kind 9 chat message carrying the group `h` tag (with the relay hint when known) and, for a reply, a `q` tag quoting the parent message. `withGroupTag(event, target, groupRelay)` adds a target message's `h` tag to an outgoing event (reaction, repost, zap request) so group relays accept it and it routes back to the group; its hint is `groupRelay`, or else the target's own hint when that is a valid relay URL. `groupTagOf(event)` / `groupRelayHintOf(event)` read the `h` tag and its normalised relay hint back off an event.

## Scope and conventions

This package covers the slice of NIP-29 these helpers need — kind 39000 group metadata and kind 9 group chat. From the metadata it reads the `private` / `closed` / `restricted` / `hidden` / `livekit` markers; it does not model admins/members/roles (kind 39001–39003), threads and forum posts (kind 11), group lifecycle and moderation events (create/delete/edit/invite/join/leave and the rest of the kind 9000–9021 range), the user's group list (kind 10009), or the `supported_kinds` tag.

Admin and group-lifecycle helpers are added when a consumer needs them ([ADR-0001](docs/adr/0001-the-package-models-only-the-nip-29-slice-its-consumers-use.md)).

Two behaviours deserve a note when reading events from other clients:

- **Relay hint on the `h` tag** — `["h", <group-id>, <relay-hint>]`. NIP-29 documents the group id alone; the third element names the group's hosting relay so an event can be routed back to it. The helpers write it when the relay is known and read the tag with or without it, so treat it as optional (shared ADR-0101).
- **Chat replies** — `buildGroupChatMessage` writes a reply as a `q` tag quoting the parent, `["q", <id>, <relay>, <pubkey>]` with the relay left empty when unknown: the shape [NIP-C7](https://github.com/nostr-protocol/nips/blob/master/C7.md) gives kind 9 chat replies and [NIP-18](https://github.com/nostr-protocol/nips/blob/master/18.md) gives a quote. Other clients still quote the parent in the message content or pair a bare `["q", <id>]` with a `p` tag.

## Architecture decisions

Design rationale lives in [`docs/adr/`](docs/adr/); a protocol convention shared with the other `nostr-*` libraries is cited as "shared ADR-NNNN". Read them before changing the code.
