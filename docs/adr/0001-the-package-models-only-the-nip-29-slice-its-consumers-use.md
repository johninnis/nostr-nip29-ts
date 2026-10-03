# 1. The package models only the NIP-29 slice its consumers use

## Status

Accepted

## Context

NIP-29 is small, but its implementations disagree even on the basics. A survey of six clients (Hubstr, chachi, flotilla, grimoire, nostrord and wisp) found the `h` tag written with and without a relay hint, sometimes by one client on different kinds; chat replies written as a `q` tag with a relay and a pubkey, as a bare `["q", <id>]` beside a `p` tag, or as a quote inside the content; no two clients reading the same subset of the kind 39000 marker tags; and the `livekit` tag implemented by only some. Each client re-derives the edges, and the reasoning stays buried in an application.

The specification itself is much wider than any one consumer: admins, members and roles (kinds 39001–39003), threads (kind 11), the moderation and lifecycle events of kinds 9000–9021, the user's group list (kind 10009) and `supported_kinds`. Modelling all of it from the text alone means designing shapes nothing exercises, and those are the shapes most likely to be wrong.

## Decision

- NIP-29 helpers are their own package, apart from `@innis/nostr-core` and from any application, so the choices they make beyond the written NIP are stated once, tested, and visible to every consumer.
- The package models only what a consumer built against it uses: kind 39000 group metadata (with its `private`, `closed`, `restricted`, `hidden` and `livekit` markers) and kind 9 group chat, including replies. Everything else in NIP-29 is absent until a consumer needs it, and is then added with the same scrutiny.
- Where the package goes beyond the written NIP, the behaviour is recorded as a convention in `nostr-adrs`, never presented as protocol: the `h` tag's relay hint is shared ADR-0101.

## Consequences

- An absent part of NIP-29 is not a gap to fill speculatively. A request for admin or lifecycle helpers waits for a consumer that performs them.
- A consumer reading events from other clients treats every convention the package writes as optional on reading.
