# @innis/nostr-nip29

[![CI](https://github.com/johninnis/nostr-nip29-ts/actions/workflows/ci.yml/badge.svg)](https://github.com/johninnis/nostr-nip29-ts/actions/workflows/ci.yml)

Pure domain helpers for [NIP-29](https://github.com/nostr-protocol/nips/blob/master/29.md)
relay-based groups.

A NIP-29 group is owned by the relay that hosts it. The relay publishes an addressable **kind 39000**
metadata event describing each group (name, picture, about, visibility, access). This package turns
those events into `Group` value objects. It performs **no I/O** — querying relays and rendering live in
the consumer.

## Install

```bash
deno add jsr:@innis/nostr-nip29
```

## Why a separate library?

NIP-29 is small, but its implementations are not consistent — even on the basics. Surveying six
clients (this one, chachi, flotilla, grimoire, nostrord and wisp) turns up real divergence:

- **The `h` group tag.** The spec defines `["h", <group-id>]`. chachi, nostrord, wisp and this library
  also write a relay hint as a third element (`["h", <group-id>, <relay>]`); flotilla and grimoire do
  not. Some clients are not even consistent with themselves, emitting the hint on some event kinds and
  omitting it on others.
- **Chat replies (kind 9).** The spec says nothing, so everyone improvised. This library, grimoire and
  wisp use a `q` quote tag (`["q", <id>, <relay>, <pubkey>]`); nostrord uses `q` too, in a barer
  `["q", <id>]` plus a `p` tag; flotilla quotes the parent inside the message content. Several
  conventions, none written down.
- **Metadata coverage.** No two clients model the same subset of the kind 39000 marker tags — e.g. wisp
  reads `restricted`/`hidden` but not `livekit`; others do the reverse.
- **Live AV spaces.** The `livekit` tag *is* spec, but only some clients implement it.

So even a "tiny" NIP carries enough ambiguity that every client re-derives the edges differently. This
package is one small, spec-faithful, fully-tested take on the common core, with every place it steps
beyond the written spec flagged as a *convention* rather than passed off as protocol (see
[Scope and conventions](#scope-and-conventions)). It is published on its own in the hope of nudging a
little consistency — and so the reasoning behind these choices lives somewhere legible, rather than
buried in an app.

## API

```ts
import { type Group, groupMetadataFilter, KIND_GROUP_METADATA, parseGroupMetadata } from "@innis/nostr-nip29"

// Filter every group on a relay:
queryEvents(groupMetadataFilter(), { relays: [relay], exactRelays: true })

// Parse each arriving event:
const group: Group | null = parseGroupMetadata(event, relay)
```

`parseGroupMetadata(event, relay)` returns `null` when the event is not a kind 39000 or carries no `d`
tag (the required group id). Read access and join policy default to public/open unless the relay tags
the group `private` (only members can read) / `closed` (join requests ignored). `isRestricted` (only
members can write) and `isHidden` (relays hide metadata from non-members) default `false` unless their
tags are present. `isLiveAvSpace` reflects the spec `livekit` tag, marking a group that supports live
audio/video chat via a LiveKit server (NIP-29 "Live AV spaces").

## Chat

```ts
import { buildGroupChatMessage, groupChatFilter } from "@innis/nostr-nip29"

// Filter a group's live chat — every kind 9 message carrying the group's `h` tag:
queryEvents(groupChatFilter(groupId), { relays: [groupRelay], exactRelays: true })

// Build a message to post into the group:
const message = buildGroupChatMessage({ groupId, content: "gm", relayHint: groupRelay })
```

`groupChatFilter(groupId)` builds the filter for a group's chat feed — every **kind 9**
(`KIND_GROUP_CHAT`) message tagged to that group via `h`.
`buildGroupChatMessage(input)` builds an unsigned kind 9 chat message carrying the group `h` tag
(with the relay hint when known) and, for a reply, a `q` tag quoting the parent message.
`withGroupTag(event, target, groupRelay)` copies a target message's `h` tag onto an outgoing event
(reaction, repost, zap request) so group relays accept it and it routes back to the group.
`groupTagOf(event)` / `groupRelayHintOf(event)` read the `h` tag and its normalised relay hint back off
an event.

## Scope and conventions

This package covers the slice of NIP-29 these helpers need — kind 39000 group metadata and kind 9 group
chat. From the metadata it reads the `private` / `closed` / `restricted` / `hidden` / `livekit` markers;
it does not model admins/members/roles (kind 39001–39003), threads and forum posts (kind 11),
group lifecycle and moderation events (create/delete/edit/invite/join/leave and the rest of the
kind 9000–9021 range), the user's group list (kind 10009), or the `supported_kinds` tag.

That is deliberate, not a gap waiting to be filled. This is a support library, grown **consumer-first** —
it models the parts of NIP-29 the apps built against it actually use, and only those. Group metadata,
chat and replies are here, and each was worked out carefully and checked against the implementations
surveyed above. Admin and group-lifecycle operations are not — for the honest reason that nothing built
against this library performs them yet: no admin tooling has been written, so the work of sitting down
and figuring out the right shapes simply hasn't been done. They'll be added with the same scrutiny the
existing surface got, the day a consumer actually needs them — not modelled speculatively from the spec.

Two behaviours are **not written into NIP-29** but are accepted conventions the ecosystem has diverged
on — a consumer reading events from other clients should treat both as optional:

- **Relay hint on the `h` tag** — `["h", <group-id>, <relay-hint>]`. NIP-29 documents the group id
  alone, but the relay-hint third element lets an event be routed back to its group's hosting relay.
  It is emitted by **chachi**, **nostrord**, **wisp** and Hubstr, and omitted by **flotilla** and
  **grimoire** (which send `["h", <group-id>]`).
- **Chat replies** — NIP-29 defines no reply structure for kind 9. `buildGroupChatMessage` expresses a
  reply as a `q` quote tag (`["q", <id>, <relay>, <pubkey>]`), the same shape **grimoire** and **wisp**
  use. Other clients differ: **nostrord** uses a barer `["q", <id>]` plus a `p` tag, and **flotilla**
  quotes the parent in the message content.
