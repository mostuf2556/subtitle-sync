import { LibraryVideoItem } from '../types';
import { L2RYRR6TXWA_LANGUAGE_JSON3_TRACKS } from '../../test/fixtures/defaultSubtitles';
import { EILFKSGNKDA_LANGUAGE_TRACKS } from '../../test/fixtures/eilfksgnkda';

/**
 * Global Application Configuration & Default Settings
 */

export const DEFAULT_VIDEO_ID = 'n9qwEOsqsoo';
export const DEFAULT_VIDEO_URL = `https://www.youtube.com/watch?v=${DEFAULT_VIDEO_ID}`;

export const JSON3_DEMO_VIDEO_ID = 'L2Ryrr6txwA';
export const JSON3_DEMO_VIDEO_URL = `https://www.youtube.com/watch?v=${JSON3_DEMO_VIDEO_ID}`;

export const ANDROID_TEST_VIDEO_ID = 'HGEyIt2bMiE';
export const ANDROID_TEST_VIDEO_URL = `https://www.youtube.com/watch?v=${ANDROID_TEST_VIDEO_ID}`;

export const ME_AT_THE_ZOO_ID = 'jNQXAC9IVRw';
export const ME_AT_THE_ZOO_URL = `https://www.youtube.com/watch?v=${ME_AT_THE_ZOO_ID}`;

export const TUTORIAL_TEST_VIDEO_ID = 'c0pUbsq9FLk';
export const TUTORIAL_TEST_VIDEO_URL = `https://www.youtube.com/watch?v=${TUTORIAL_TEST_VIDEO_ID}`;

export const EILFKSGNKDA_VIDEO_ID = 'EILFkSGNkdA';
export const EILFKSGNKDA_VIDEO_URL = `https://www.youtube.com/watch?v=${EILFKSGNKDA_VIDEO_ID}`;

// Storage Keys
export const STORAGE_KEYS = {
  SUBTITLE_CACHE_PREFIX: 'yt_subtitles_',
  LIBRARY_STORAGE_KEY: 'yt_video_library_v2',
  LAST_ACTIVE_VIDEO_KEY: 'yt_last_active_video_v1',
  TIMEDTEXT_URL_PREFIX: 'yt_observed_timedtext_',
  SETTINGS_STORAGE_KEY: 'yt_app_settings_v4',
  VIDEO_SETTINGS_PREFIX: 'yt_vsettings_',
} as const;

// Default Library Items (with Authentic Multilingual Tracks)
export const DEFAULT_LIBRARY_ITEMS: LibraryVideoItem[] = [
  {
    id: DEFAULT_VIDEO_ID,
    originalUrl: DEFAULT_VIDEO_URL,
    title: 'YouTube Default Video · n9qwEOsqsoo',
    cues: [],
    timestamp: Date.now(),
  },
  {
    id: JSON3_DEMO_VIDEO_ID,
    originalUrl: JSON3_DEMO_VIDEO_URL,
    title: 'Guitar Lesson · JSON3 TimedText (JustinGuitar)',
    cues: L2RYRR6TXWA_LANGUAGE_JSON3_TRACKS.en,
    timestamp: Date.now() + 1,
  },
  {
    id: ME_AT_THE_ZOO_ID,
    originalUrl: ME_AT_THE_ZOO_URL,
    title: 'Me at the zoo',
    cues: [
      { id: 'cue-1', start: 1.2, duration: 3.2, text: 'All right, so here we are in front of the elephants.' },
      { id: 'cue-2', start: 4.5, duration: 3.0, text: 'The cool thing about these guys is that...' },
      { id: 'cue-3', start: 7.6, duration: 3.5, text: '...they have really, really, really long trunks.' },
      { id: 'cue-4', start: 11.2, duration: 2.8, text: 'And that is cool.' },
      { id: 'cue-5', start: 14.1, duration: 4.2, text: 'And that is pretty much all there is to say.' },
    ],
    timestamp: Date.now() + 2,
  },
  {
    id: EILFKSGNKDA_VIDEO_ID,
    originalUrl: EILFKSGNKDA_VIDEO_URL,
    title: 'JSON3 Subtitle Demo (English + Hebrew)',
    cues: EILFKSGNKDA_LANGUAGE_TRACKS.en,
    timestamp: Date.now() + 3,
  },
];
