CREATE TABLE `events` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`roomId` text NOT NULL,
	`playerId` text NOT NULL,
	`type` text NOT NULL,
	`playerColor` text NOT NULL,
	`createdAt` integer NOT NULL,
	`payload` text NOT NULL,
	CONSTRAINT `fk_events_roomId_rooms_id_fk` FOREIGN KEY (`roomId`) REFERENCES `rooms`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_events_playerId_players_id_fk` FOREIGN KEY (`playerId`) REFERENCES `players`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `filtered_patterns` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`pattern` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `games` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`roomId` text NOT NULL,
	`seed` integer NOT NULL,
	`variant` integer NOT NULL,
	`lockout` integer DEFAULT false NOT NULL,
	`createdAt` integer NOT NULL,
	`revealedAt` integer,
	CONSTRAINT `fk_games_roomId_rooms_id_fk` FOREIGN KEY (`roomId`) REFERENCES `rooms`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `players` (
	`id` text PRIMARY KEY,
	`roomId` text NOT NULL,
	`name` text NOT NULL,
	`color` text DEFAULT 'red' NOT NULL,
	`spectator` integer DEFAULT false NOT NULL,
	`overlayKey` text NOT NULL,
	`twitchId` text,
	`twitchLogin` text,
	`createdAt` integer NOT NULL,
	CONSTRAINT `fk_players_roomId_rooms_id_fk` FOREIGN KEY (`roomId`) REFERENCES `rooms`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `rooms` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`inviteCode` text NOT NULL,
	`listed` integer DEFAULT true NOT NULL,
	`twitchOnly` integer DEFAULT false NOT NULL,
	`createdAt` integer NOT NULL,
	`active` integer DEFAULT false NOT NULL,
	`hideCard` integer DEFAULT false NOT NULL,
	`playerCount` integer DEFAULT 0 NOT NULL,
	`currentGameId` integer,
	`lastEventAt` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `site_notices` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`type` text DEFAULT 'notice' NOT NULL,
	`header` text DEFAULT '' NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	`visibleToUsers` integer DEFAULT false NOT NULL,
	`visibleToAdmins` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `squares` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`gameId` integer NOT NULL,
	`slot` integer NOT NULL,
	`goal` text NOT NULL,
	`colorMask` integer DEFAULT 0 NOT NULL,
	CONSTRAINT `fk_squares_gameId_games_id_fk` FOREIGN KEY (`gameId`) REFERENCES `games`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX `events_room_time_idx` ON `events` (`roomId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `events_room_type_idx` ON `events` (`roomId`,`type`);--> statement-breakpoint
CREATE INDEX `games_room_idx` ON `games` (`roomId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `players_room_idx` ON `players` (`roomId`);--> statement-breakpoint
CREATE UNIQUE INDEX `rooms_invite_idx` ON `rooms` (`inviteCode`);--> statement-breakpoint
CREATE INDEX `rooms_active_idx` ON `rooms` (`active`);--> statement-breakpoint
CREATE INDEX `rooms_created_players_idx` ON `rooms` (`createdAt`,`playerCount`);--> statement-breakpoint
CREATE UNIQUE INDEX `squares_game_slot_idx` ON `squares` (`gameId`,`slot`);