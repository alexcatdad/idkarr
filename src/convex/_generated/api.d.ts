/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as activityLog from "../activityLog.js";
import type * as backup from "../backup.js";
import type * as calendar from "../calendar.js";
import type * as collections from "../collections.js";
import type * as crons from "../crons.js";
import type * as customFormats from "../customFormats.js";
import type * as downloadClients from "../downloadClients.js";
import type * as downloadQueue from "../downloadQueue.js";
import type * as episodes from "../episodes.js";
import type * as indexers from "../indexers.js";
import type * as media from "../media.js";
import type * as mediaFiles from "../mediaFiles.js";
import type * as movies from "../movies.js";
import type * as music from "../music.js";
import type * as naming from "../naming.js";
import type * as qualityDefinitions from "../qualityDefinitions.js";
import type * as qualityProfiles from "../qualityProfiles.js";
import type * as requests from "../requests.js";
import type * as restrictions from "../restrictions.js";
import type * as rootFolders from "../rootFolders.js";
import type * as scheduler from "../scheduler.js";
import type * as seasons from "../seasons.js";
import type * as series from "../series.js";
import type * as settings from "../settings.js";
import type * as systemHealth from "../systemHealth.js";
import type * as tags from "../tags.js";
import type * as tmdb from "../tmdb.js";
import type * as trashGuides from "../trashGuides.js";
import type * as webhooks from "../webhooks.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  activityLog: typeof activityLog;
  backup: typeof backup;
  calendar: typeof calendar;
  collections: typeof collections;
  crons: typeof crons;
  customFormats: typeof customFormats;
  downloadClients: typeof downloadClients;
  downloadQueue: typeof downloadQueue;
  episodes: typeof episodes;
  indexers: typeof indexers;
  media: typeof media;
  mediaFiles: typeof mediaFiles;
  movies: typeof movies;
  music: typeof music;
  naming: typeof naming;
  qualityDefinitions: typeof qualityDefinitions;
  qualityProfiles: typeof qualityProfiles;
  requests: typeof requests;
  restrictions: typeof restrictions;
  rootFolders: typeof rootFolders;
  scheduler: typeof scheduler;
  seasons: typeof seasons;
  series: typeof series;
  settings: typeof settings;
  systemHealth: typeof systemHealth;
  tags: typeof tags;
  tmdb: typeof tmdb;
  trashGuides: typeof trashGuides;
  webhooks: typeof webhooks;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
