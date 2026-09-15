# NO FOLD Project Brief

NO FOLD is a social pressure game.

The real game is the reaction. The web UI should support real-world conversation,
not replace it. The phone acts as dealer, referee, timer, scorekeeper, and
pressure engine.

## Non-Negotiable Rules

- Game rules live outside React UI.
- Content lives as structured data.
- Rive is presentation-only.
- No invented future business systems during prototype development.
- TABLE TEST 001 is the current priority.
- Simplicity is a product requirement.
- Venue/table QR codes should lead to room creation, not one permanent shared room.

## Prototype Boundaries

Do not build realtime multiplayer, Supabase, authentication, restaurant accounts,
subscriptions, payments, analytics dashboards, admin portals, AI content
generation, Rive files, sound, push notifications, venue discovery, profiles,
social feeds, production deployment, or the final content library during M00.

## QR Architecture Note

In production, a restaurant or table QR should launch NO FOLD entry and help a
host create a temporary room. The temporary room owns the live game code and join
QR. A permanent venue QR must never map every scanner into one shared room.
