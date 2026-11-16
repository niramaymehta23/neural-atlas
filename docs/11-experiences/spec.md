# 11 — Experiences

Source: requirements.md ("Exploration, motivation and sharing"); [architecture.md](../architecture.md).
Owned: REQ-EXP-01..06.

```text
Dependencies: 04, 07, 10
Boundary: experiences
```

## Scope and non-goals

`experiences/` and routes sandbox, journeys, museum, theatre. Online multiplayer is out (no server).

## Acceptance criteria

- **REQ-EXP-01 Sandbox:** a dataset × model and an environment × agent pairing train live.
- **REQ-EXP-02 Journeys and museum:** "How ChatGPT works" plays end-to-end using existing modules, with no copied module code.
- **REQ-EXP-03 Theatre:** runs 30 minutes without memory growth.
- **REQ-EXP-04 Two-player:** race-to-train and break/repair finish a round on one device.
- **REQ-EXP-05 Sound:** no audio context exists until the user enables sound.
- **REQ-EXP-06:** glossary cards open from any caption; compute meter counts real engine multiplications; achievements add stars.

## Testing

Playwright per experience; heap snapshot check for theatre.

## Risks

Journeys depend on stable module ids; they reference the catalog, never module internals.
