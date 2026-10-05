CREATE TABLE "events" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"roomId" text NOT NULL,
	"playerId" text NOT NULL,
	"type" text NOT NULL,
	"playerColor" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"payload" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "filtered_patterns" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "filtered_patterns_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"pattern" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "games" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "games_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"roomId" text NOT NULL,
	"seed" integer NOT NULL,
	"variant" integer NOT NULL,
	"lockout" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"revealedAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" text PRIMARY KEY,
	"roomId" text NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT 'red' NOT NULL,
	"spectator" boolean DEFAULT false NOT NULL,
	"online" boolean DEFAULT false NOT NULL,
	"lastSeenAt" timestamp with time zone,
	"overlayKey" text NOT NULL,
	"twitchId" text,
	"twitchLogin" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rooms" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"inviteCode" text NOT NULL,
	"listed" boolean DEFAULT true NOT NULL,
	"twitchOnly" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"hideCard" boolean DEFAULT false NOT NULL,
	"playerCount" integer DEFAULT 0 NOT NULL,
	"currentGameId" integer,
	"lastEventAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_notices" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "site_notices_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"type" text DEFAULT 'notice' NOT NULL,
	"header" text DEFAULT '' NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"visibleToUsers" boolean DEFAULT false NOT NULL,
	"visibleToAdmins" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "squares" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "squares_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"roomId" text NOT NULL,
	"gameId" integer NOT NULL,
	"slot" integer NOT NULL,
	"goal" text NOT NULL,
	"colorMask" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX "events_room_time_idx" ON "events" ("roomId","createdAt");--> statement-breakpoint
CREATE INDEX "events_room_type_idx" ON "events" ("roomId","type");--> statement-breakpoint
CREATE INDEX "games_room_idx" ON "games" ("roomId","createdAt");--> statement-breakpoint
CREATE INDEX "players_room_idx" ON "players" ("roomId");--> statement-breakpoint
CREATE INDEX "players_online_idx" ON "players" ("online");--> statement-breakpoint
CREATE UNIQUE INDEX "rooms_invite_idx" ON "rooms" ("inviteCode");--> statement-breakpoint
CREATE INDEX "rooms_created_players_idx" ON "rooms" ("createdAt","playerCount");--> statement-breakpoint
CREATE UNIQUE INDEX "squares_game_slot_idx" ON "squares" ("gameId","slot");--> statement-breakpoint
CREATE INDEX "squares_room_idx" ON "squares" ("roomId");--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_roomId_rooms_id_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_playerId_players_id_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_roomId_rooms_id_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "players" ADD CONSTRAINT "players_roomId_rooms_id_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "squares" ADD CONSTRAINT "squares_roomId_rooms_id_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "squares" ADD CONSTRAINT "squares_gameId_games_id_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE;