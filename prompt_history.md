# Prompt History (`prompt_history.md`)

This file records and preserves all user prompts in chronological order.

---

### Prompt 1: Initial App Import
```
This app was imported from GitHub repository mostuf2556/subtitle-sync.
```

---

### Prompt 2: Punctuation Paired Wrapping & TTS In-Between Order
```
1. by default split by punctuations (in case of ".",
,","?", "!" (but wrap together text within start/closing couples of punctuation chars  such as: "\"\" or "("  )
2. should the video be played before or after the tts-play? add another option which is to play the video in between tts-play groups (1 group to play before , one group to play after the video-play)
Apply style changes to the selected element(s).
[AIS_METADATA_SECTION_START]
CSS selector 1: div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(4) > details:nth-of-type(5) > div:nth-of-type(1)
CSS 1: {

}
[AIS_METADATA_SECTION_END]
```

---

### Prompt 3: Migration Verification
```
This app was imported from GitHub repository mostuf2556/subtitle-sync.
```

---

### Prompt 4: Supabase Quarantine, TTS-Ratio Fix, Alternative TTS Services, Place Video in Language Order & Mobile Responsiveness
```
0. AGENTS.md - quarentine any superbase related files and docs (no prompt instruction have been issued regarding db support on this project!). always keep historic prompts to prompt_history.md
1. advance mode - tts-ratio sometimes work, sometimes the tts-play stops without any reported reason
2. currently not working: 
- using google tts service directly (it worked before)
- using https://tts3.lovable.app/api/public/openapi.json
3. there is no in-between order for tts-play. tts-play before-video is not working
4. by design it should be easier to set the place of the video within the order of the languages in order to detemine when to play the video
5. on mobile view - page size should be responsive and adapt to fit the screen size
```

---

### Prompt 5: Validation for Remote TTS Services (Google TTS Directly or TTS3 Service)
```
add validation to tts-remove-service: google-tts-directly or tts3 service
```

---

### Prompt 43: Go On
```
go on
```

---

### Prompt 6: Quarantine Beginner Mode, Debug Mode Menu Toggle, and Language Selection Columns (is-primary and json3)
```
1. go on
2. currently quarentine beginner mode 
3. ensure toggle on top menu to switch to debug mode where experimental views are also presented (such as playground)
4. language selection view:
- add column "is-primary" - the only way to define the tts-ration absolute parent
- add column "json3" which should be updated based upon user's manual toggling of that language on the video player (another indication of direct fetching).
```

---

### Prompt 7: Accordion Stages of Appearance
```
1. go on
2. divide accordion elements to stages-of-appearance to decide when to present each accordion type:

2.1 
stage 1 - 
when? upon sharing a video with the app 
what to present? only the video accordion up untill the subtitles are detected.

in case no subtitles are detected - instruct the user using a floating red-text to turn on the captions (or other instruction). 

like the case of the video-playground screen - the user should be able to turn on and to switch subtitles using the video element

for every new subtitles which detected there should be presented a botton on the bottom of the accordion element "NEXT (<the-number-of-detected-subtitles>)

stage-2 -"learning goals" 
the user should approve the list of favorite languages he wants to learn, and which language from the detected languages from state1 to set as the default langauge (the lang to translate from) 

stage -3 - show the subtitles-table-view accordion.

stage -4 - all other accordion elements will be presented if the user clicks on the settings icon. the user may click that button again to hide these elements.
```

---

### Prompt 8: Test Coverage on GitHub Pages Report Page
```
create test coverage - this should be seen on github-pages report page
```

---

### Prompt 9: Quick Loader Button, Memory Defaults (Debug Button & Version Details), and Remove Raw Video Data
```
1. 1st pointed element: id: quick-subtitles-and-video loader -> use a "quick-loader" button to show it. hide it by default

2. memory.md - defaults: boolean localstorage:boolean 
- by default - set debug button -present-on-start:off , local storage:off

3. version details element - clean view by using a version button - toggle it to show the relevant parent element (present-on-start:off , local storage:off)

4. 2nd pointed element: raw-vide-data -  rm it
Apply style changes to the selected element(s).
[AIS_METADATA_SECTION_START]
CSS selector 1: div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1)
CSS 1: {

}
CSS selector 2: div#root:nth-of-type(1) > div:nth-of-type(1) > header:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > span:nth-of-type(1)
CSS 2: {

}
[AIS_METADATA_SECTION_END]
```

---

### Prompt 10: Redundant Item Removal, Video Folded by Default, and Move Chars Removal & Parser under Settings
```
1. redundunt item - rm it.
2. memory.md - fold video item by default , localstorage:off
3. settings - the settings itself should contain few accordion elements such as  the ,parser, spacifal charecter removal  (so move them under settings)
Apply style changes to the selected element(s).
[AIS_METADATA_SECTION_START]
CSS selector 1: div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1)
CSS 1: {

}
CSS selector 2: div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(5) > details:nth-of-type(1) > div:nth-of-type(1)
CSS 2: {

}
[AIS_METADATA_SECTION_END]
```

---

### Prompt 11: Go On
```

---

### Prompt 43: Go on (Resume Task 291 Chapter 2)
```
go on
```
go on
```

---

### Prompt 12: Go On
```
go on
```

---

### Prompt 13: Remove Annoying Duplications of Favorite Languages in Languages Accordion
```
dont u notice annoying duplications where u show the same list of favotite languages over and over and over ?
Apply style changes to the selected element(s).
[AIS_METADATA_SECTION_START]
CSS selector 1: div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(4) > details:nth-of-type(2) > div:nth-of-type(1)
CSS 1: {

}
[AIS_METADATA_SECTION_END]
```

---

### Prompt 14: Default Language Restricted to Successfully Fetched Subtitles
```
the default language can only be one of those languages their subtitles have been successfully fetched already.
Apply style changes to the selected element(s).
[AIS_METADATA_SECTION_START]
CSS selector 1: div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(4) > details:nth-of-type(2) > div:nth-of-type(1) > div#stage-2-learning-goals-card:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1)
CSS 1: {

}
---

### Prompt 15: Extend List of Favorite Languages in Stage 2 Learning Goals Card
```
there should be a way to extend the list of favorite languages - here and only here is the right place
Apply style changes to the selected element(s).
[AIS_METADATA_SECTION_START]
CSS selector 1: div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(4) > details:nth-of-type(2) > div:nth-of-type(1) > div#stage-2-learning-goals-card:nth-of-type(1)
CSS 1: {

}
---

### Prompt 16: Go On & Single Floating Button of 1 Icon
```
1. go on
2. no need of 2 items. its enough to use 1 floating button of 1 icon
Apply style changes to the selected element(s).
[AIS_METADATA_SECTION_START]
CSS selector 1: div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(6)
CSS 1: {

}
[AIS_METADATA_SECTION_END]
```

---

---

### Prompt 18: TTS3 Docs Compliance, Direct Google TTS Parity, and Full Request/Response External TTS Debugger
```
0. fix it:
this project failed to work with docs: https://tts3.lovable.app/docs

1 direct using of google tts services implemented on https://github.com/bao002/subtitle-sync/tree/main but doesnt correctly implemented in this project

2. using the external tts service - show full request and response in order to help debugging.
```

---

### Prompt 19: Remote Speak API Token Authentication (spk_) & Upstream Provider Key Separation
```
i have generated a token on the remote tts service: spk_452003d7-32c5-4bb7-ac67-f3062c7b5965.o6ANX5Jt699eIiuAdbweAcSYj37juM7stQDlVJKlxz8

request:
curl --url 'https://tts3.lovable.app/api/public/tts' \
  -H 'accept: */*' \
  -H 'accept-language: he-IL,he;q=0.9' \
  -H 'content-type: application/json' \
  -H 'origin: https://ais-dev-g2m5sblwvppcvkwplxs4u3-450223931914.europe-west2.run.app' \
  -H 'priority: u=1, i' \
  -H 'referer: https://ais-dev-g2m5sblwvppcvkwplxs4u3-450223931914.europe-west2.run.app/' \
  -H 'sec-ch-ua: "Not:A-Brand";v="8", "Chromium";v="156", "Brave";v="156"' \
  -H 'sec-ch-ua-mobile: ?0' \
  -H 'sec-ch-ua-platform: "Windows"' \
  -H 'sec-fetch-dest: empty' \
  -H 'sec-fetch-mode: cors' \
  -H 'sec-fetch-site: cross-site' \
  -H 'sec-gpc: 1' \
  -H 'user-agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36' \
  --data-raw '{"text":"Test","lang":"en","format":"json","provider":"lovable","voice":"Kore","api_key":"spk_452003d7-32c5-4bb7-ac67-f3062c7b5965.o6ANX5Jt699eIiuAdbweAcSYj37juM7stQDlVJKlxz8"}'
response:
{
    "error": "lovable request failed (HTTP 401). Lovable AI rejected the API key. Check that the key is current and correctly saved. Provider detail: Invalid API key format. Key must start with 'sk_' prefix."
}
```




---

### Prompt 20: Continue Execution (go on)
```
go on
```


---

### Prompt 21: Utilize Storybook, Clean Reactive TTS Service Controls & GitHub Pages Storybook Hosting
```
1. utilize storybook: currently the new components appears in the application once they are created. it is better to develop it first in clean environment. therefor make use of storybook - should github-pages show the storybook as well.
2. for example: when developing a tts-service and user select direct google tts service - the component shows menus which are not relevant. and there are duplications in the buttons which are appeared non-stop under the selector control.

such cases could be spotted and pointed out regardless the context of the app.

3. first storybook mission:  tts service - plan which control to show and when. (reactive)
Apply style changes to the selected element(s).
[AIS_METADATA_SECTION_START]
CSS selector 1: div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(4) > details:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > details:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(5) > div:nth-of-type(2) > div:nth-of-type(4)
CSS 1: {

}
[AIS_METADATA_SECTION_END]
```

---

### Prompt 22: Continue Execution (go on)
```
1. go on
```

---

### Prompt 23: Application Components in Storybook
```
ensure storybook contains the component of the application
```

---

### Prompt 24: GitHub Actions Storybook Deployment and README Link
```
github actions should deploy the storybook and README should contain its link
```

---

### Prompt 25: Create Next Version From Scratch Architecture Guide
```
create a docs/next_version_from_scratch.md
explain how to create this application in the simplest form by explaining the app design without getting into details. that doc should be used as the how-to build such application but without taking the bad part which are part of this project history.
start from a zoom out explanaiton and give a closer overview in few steps. no need to explain how to build a component only to dscribe each's goal.
```

---

### Prompt 26: Architectural Review of Next Version Design via Yes/No Questions
```
lets review that document. using yes/no question to reveal what is the most important app-level-design decisions.
```

---

### Prompt 27: Persist Yes/No Architectural Decisions into Document
```
did u wrote all to the .md file ?
```

---

### Prompt 28: Write steps.md of creating app with isolated testable/designable modules and minimal integration
```
1. write the steps.md  of creating such app in a way that every module and component can be tested in isolation. can be design in isolation and be able to be part of the app using minimal integration. order the steps by importance (for example)
```

---

---

### Prompt 30: Proxy Server Investigation for Subtitle URL Fetching & Historical Implementation
```
1. which server does it use to proxy the   subtitles url fetch address with/without entire request params ?

2. did u find the old implementation for that feature ?
```

---

### Prompt 31: Verify Full Use of Old Implementation: Random Strategy & Statistics-Driven Promotion
```
does it fully used the old implementation including the random strategy being used and report statistics while using it to choose the best strategy next ?
```

---

### Prompt 32: Persist Stored Default Subtitles, Switchable Default Languages Around Video Component (and Playground), & Different Accordion Background Colors
```
1. fix: the list of default subtitles should be stored correctly - currently when user choose another subtitles from the video's menu the list is reseted. keep the switchable list of default languages (those subtitles which fetched from youtube's api) around the video component (also on the playground). 
2. use different color for each accordion background
```

---

### Prompt 33: Hotfix ReferenceError: initialState is not defined
```
Fix the errors in the app
[APP_BOOT_ERROR] Router rendered ErrorComponent: This page didn't load initialState is not defined
ReferenceError: initialState is not defined at src/routes/index.tsx
```

---

### Prompt 34: Go on (Resume and verify app)
```
go on
```

---

### Prompt 35: Intercept YouTube API Caption Changes (X -> Y -> Z) & Accumulate in Switchable Default Languages Around Video
```
to be clear - i repeat the last sowftware requirement for making sure the app is updated:
assume the default subtitles is X, the user may update the video to show captions of language Y and later chooses Z. then all those subtitles changes should have triggered youtube api requests and all those request should be intercepted. more-over - all those subtitles should be added to the list of default languages and be apeared on a switchable list around the video.
```

---

### Prompt 36: Language Ratios at End of Learning Goals & Named Stored Compositions Dropdown Around Video
```
1. language ratios settings are part of learning goals and should come in the end of that stage

2. the user can setup and store different compositions of languages ration and give it a name and later is able to switch between those options using an easy dropdown list which is located next/around the video
```

---

### Prompt 37: Hotfix Pre-warming Dev Server Process Died & Linter Fix
```
Fix the errors in the app
[AIS_METADATA_SECTION_START]
fix_it_trigger: manual
error 0: Pre-warming failed: dev server process died. > subtitle-sync@2.0.83 dev > vite --host 0.0.0.0 --port 3000 --port 3000 --host 0.0.0.0 VITE v8.1.5  ready in 1507 ms ➜  Local:   http://localhost:3000/ ➜  Network: http://169.254.8.1:3000/ ➜  Network: http://169.254.9.1:3000/ ➜  Network: http://169.254.169.1:3000/
[AIS_METADATA_SECTION_END]
```

---

### Prompt 38: Hotfix ReferenceError: Sliders is not defined
```
Fix the errors in the app
[AIS_METADATA_SECTION_START]
fix_it_trigger: manual
error 0: [APP_BOOT_ERROR] Router rendered ErrorComponent: This page didn't load Sliders is not defined
error 1: [APP_PAGE_ERROR] This page didn't load: Sliders is not defined
error 2: ReferenceError: Sliders is not defined
    at https://ais-dev-o4fswksomoqcbae6o4fp6v-515898758927.europe-west1.run.app/src/routes/index.tsx:9379:52
    at Array.map (<anonymous>)
    at Index (https://ais-dev-o4fswksomoqcbae6o4fp6v-515898758927.europe-west1.run.app/src/routes/index.tsx:6030:9)
    at Object.react_stack_bottom_frame (https://ais-dev-o4fswksomoqcbae6o4fp6v-515898758927.europe-west1.run.app/node_modules/.vite/deps/react-dom_client.js?v=58ceee0f:14140:12)
    at renderWithHooks (https://ais-dev-o4fswksomoqcbae6o4fp6v-515898758927.europe-west1.run.app/node_modules/.vite/deps/react-dom_client.js?v=58ceee0f:4398:19)
    at updateFunctionComponent (https://ais-dev-o4fswksomoqcbae6o4fp6v-515898758927.europe-west1.run.app/node_modules/.vite/deps/react-dom_client.js?v=58ceee0f:5773:16)
    at beginWork (https://ais-dev-o4fswksomoqcbae6o4fp6v-515898758927.europe-west1.run.app/node_modules/.vite/deps/react-dom_client.js?v=58ceee0f:6389:20)
    at runWithFiberInDEV (https://ais-dev-o4fswksomoqcbae6o4fp6v-515898758927.europe-west1.run.app/node_modules/.vite/deps/react-dom_client.js?v=58ceee0f:943:66)
    at performUnitOfWork (https://ais-dev-o4fswksomoqcbae6o4fp6v-515898758927.europe-west1.run.app/node_modules/.vite/deps/react-dom_client.js?v=58ceee0f:9146:92)
    at workLoopSync (https://ais-dev-o4fswksomoqcbae6o4fp6v-515898758927.europe-west1.run.app/node_modules/.vite/deps/react-dom_client.js?v=58ceee0f:9042:37)
error 3: %o

%s

%s ReferenceError: Sliders is not defined
    at https://ais-dev-o4fswksomoqcbae6o4fp6v-515898758927.europe-west1.run.app/src/routes/index.tsx:9379:52
    at Array.map (<anonymous>)
    at Index (https://ais-dev-o4fswksomoqcbae6o4fp6v-515898758927.europe-west1.run.app/src/routes/index.tsx:6030:9)
    at Object.react_stack_bottom_frame (https://ais-dev-o4fswksomoqcbae6o4fp6v-515898758927.europe-west1.run.app/node_modules/.vite/deps/react-dom_client.js?v=58ceee0f:14140:12)
    at renderWithHooks (https://ais-dev-o4fswksomoqcbae6o4fp6v-515898758927.europe-west1.run.app/node_modules/.vite/deps/react-dom_client.js?v=58ceee0f:4398:19)
    at updateFunctionComponent (https://ais-dev-o4fswksomoqcbae6o4fp6v-515898758927.europe-west1.run.app/node_modules/.vite/deps/react-dom_client.js?v=58ceee0f:5773:16)
    at beginWork (https://ais-dev-o4fswksomoqcbae6o4fp6v-515898758927.europe-west1.run.app/node_modules/.vite/deps/react-dom_client.js?v=58ceee0f:6389:20)
[AIS_METADATA_SECTION_END]
```

---

### Prompt 39: Single Place of Truth Versioning & Automated GitHub Actions Sync
```
1. currently the agent  update version for every change. this ofcourse not effective to update many files with the same version. try to find a way to effectivly update a version while relying on a single place of truth. consider moving automated operations to github action and being rely on single config file.
```

---

### Prompt 40: Hotfix Dev Server Pre-warming Failure
```
Fix the errors in the app
[AIS_METADATA_SECTION_START]
fix_it_trigger: manual
error 0: Pre-warming failed: dev server process died. > subtitle-sync@2.0.86 dev > vite --port 3000 --host 0.0.0.0 VITE v8.1.5  ready in 2122 ms ➜  Local:   http://localhost:3000/ ➜  Network: http://169.254.8.1:3000/ ➜  Network: http://169.254.9.1:3000/ ➜  Network: http://169.254.169.1:3000/
[AIS_METADATA_SECTION_END]
```

---

### Prompt 41: TTS Validation, Anonymity, Storybook First Component Policy, Direct Google TTS & Player Fallback Switch
```
0. general for tts service: first show validation button. after validation is ok - show a play button. (any request to tts service - should be visually monitored for farther debugging on the same view)
0.1 allow to choose between using that service regular way or anonymosly.

0.AGENTS.md - any component should first be implemented on storyboard - and only after being approved be used on the application itself.

1. choosing tts service: direct google tts rises lovable error!!! but this should use google tts directly and not via lovable !!!! 

 2. use a switch around the player - to determine the order of fallbacks while using the tts service: i.e: 1. google directly 2. tts3 service 3. native (the user would be able to click to navigate into the tts-service-setup to set tts3 token and choose which provider to use on tts3 - by default use "auto")
Apply style changes to the selected element(s).
[AIS_METADATA_SECTION_START]
CSS selector 1: div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > main:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1)
CSS 1: {

}
[AIS_METADATA_SECTION_END]
```

---

### Prompt 42: Hotfix Dev Server Pre-warming Failure & Lint Formatting
```
Fix the errors in the app
[AIS_METADATA_SECTION_START]
fix_it_trigger: manual
error 0: Pre-warming failed: dev server process died. > subtitle-sync@2.0.87 dev > vite --port 3000 --host 0.0.0.0 VITE v8.1.5  ready in 1828 ms ➜  Local:   http://localhost:3000/ ➜  Network: http://169.254.8.1:3000/ ➜  Network: http://169.254.9.1:3000/ ➜  Network: http://169.254.169.1:3000/
[AIS_METADATA_SECTION_END]
```

---

### Prompt 43: Hotfix Client Pre-transform Parse Error & Prettier Lint Formatting
```
Fix the errors in the app
[AIS_METADATA_SECTION_START]
fix_it_trigger: manual
error 0: 1:04:08 AM [vite] (client) Pre-transform error: Transform failed with 1 error:
error 1: [31m[PARSE_ERROR] [0mExpected a semicolon or an implicit semicolon after a statement, but found none
[AIS_METADATA_SECTION_END]
```

---

### Prompt 44: Go On
```
go on
```

---

### Prompt 45: Default Subtitles Comma-Based Recommendation Icon & Punctuation Statistics
```
add recommendation icon next to the default subtitles which has more "," signs, and expose statistics of punctuation counting for all the default subtitles.
```

---

### Prompt 46: Fix Video Playback Resume After TTS Play & Learning Goals Filters (Max Words Slider & Complete Sentence Filter)
```
0. it happens that the app doesnt resume the video after tts-play is finish playing.

1.
learning goals:

- add slider which allows to limit the number of words a subtitle row contains (then skip any record which have highter number of words)

- add control to skip any record which is not a complete sentence (not ending with a punctuation sign which is "," or "." or  "?" or "!")
```

---

### Prompt 47: Fix Vite Reload and TypeScript Type Errors (Hotfix)
```
Fix the errors in the app
[AIS_METADATA_SECTION_START]
fix_it_trigger: manual
error 0: [vite] Failed to reload /src/routes/index.tsx. This could be due to syntax errors or importing non-existent modules. (see errors above)
error 1: [vite] Failed to reload /src/components/LanguageSubtitleUrlModal.tsx. This could be due to syntax errors or importing non-existent modules. (see errors above)
error 2: [vite] Failed to reload /src/components/WebDemoUrlsInput.tsx. This could be due to syntax errors or importing non-existent modules. (see errors above)
error 3: [vite] Failed to reload /src/components/VideoLibraryPanel.tsx. This could be due to syntax errors or importing non-existent modules. (see errors above)
error 4: [vite] Failed to reload /src/components/ShareStateModal.tsx. This could be due to syntax errors or importing non-existent modules. (see errors above)
error 5: [vite] Failed to reload /src/components/ApkReleasesFooter.tsx. This could be due to syntax errors or importing non-existent modules. (see errors above)
error 6: [vite] Failed to reload /src/components/WinnerPromotionReportModal.tsx. This could be due to syntax errors or importing non-existent modules. (see errors above)
error 7: [vite] Failed to reload /src/styles.css. This could be due to syntax errors or importing non-existent modules. (see errors above)
error 8: [vite] Failed to reload /src/components/LanguageBoxesSelector.tsx. This could be due to syntax errors or importing non-existent modules. (see errors above)
error 9: [vite] Failed to reload /src/components/beginner/BeginnerFlowContainer.tsx. This could be due to syntax errors or importing non-existent modules. (see errors above)
[AIS_METADATA_SECTION_END]
```

---

### Prompt 48: Go On
```
go on
```

---

### Prompt 49: Fix Vite Reload and Missing Module Errors (Hotfix)
```
Fix the errors in the app
[AIS_METADATA_SECTION_START]
fix_it_trigger: manual
error 0: [vite] Failed to reload /src/styles.css. This could be due to syntax errors or importing non-existent modules. (see errors above)
error 1: [vite] Failed to reload /src/components/beginner/BeginnerFavoriteLanguageSelector.tsx. This could be due to syntax errors or importing non-existent modules. (see errors above)
error 2: [vite] Failed to reload /src/components/WebDemoUrlsInput.tsx. This could be due to syntax errors or importing non-existent modules. (see errors above)
error 3: [vite] Failed to reload /src/routes/index.tsx. This could be due to syntax errors or importing non-existent modules. (see errors above)
error 4: [vite] Failed to reload /src/components/ApkReleaseModal.tsx. This could be due to syntax errors or importing non-existent modules. (see errors above)
error 5: [vite] Failed to reload /src/components/FloatingSubtitleRetryIndicator.tsx. This could be due to syntax errors or importing non-existent modules. (see errors above)
error 6: [vite] Failed to reload /src/components/SubtitleRow.tsx. This could be due to syntax errors or importing non-existent modules. (see errors above)
error 7: [vite] Failed to reload /src/components/beginner/PerLanguageTtsPreferences.tsx. This could be due to syntax errors or importing non-existent modules. (see errors above)
error 8: [vite] Failed to reload /src/components/FloatingDraggablePauseButton.tsx. This could be due to syntax errors or importing non-existent modules. (see errors above)
error 9: [vite] Failed to reload /src/components/NewSubtitlesParserBar.tsx. This could be due to syntax errors or importing non-existent modules. (see errors above)
[AIS_METADATA_SECTION_END]
```

---

### Prompt 50: Video-Playing Precedence Bar Movable Among Pointed Table Records
```
in order to decide the video-playing precedence all we need is a bar to move and place among the pointed table records
Apply style changes to the selected element(s).
[AIS_METADATA_SECTION_START]
CSS selector 1: div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(4) > details:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(3) > table:nth-of-type(1) > tbody:nth-of-type(1) > tr:nth-of-type(1) > td:nth-of-type(1)
CSS 1: {

}
CSS selector 2: div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(4) > details:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(3) > table:nth-of-type(1) > tbody:nth-of-type(1) > tr:nth-of-type(2) > td:nth-of-type(1)
CSS 2: {

}
[AIS_METADATA_SECTION_END]
```

---

### Prompt 51: Move Row Criteria to Subtitles Table View & Hide Language Settings on Stage 3
```
row criteria should move to the subtitles-table-view in order to be able to view the change originated from the control dynamicly on the table.

hide language settings on stage 3 because we already have those on stage 2.
Apply style changes to the selected element(s).
[AIS_METADATA_SECTION_START]
CSS selector 1: div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(4) > details:nth-of-type(2) > div:nth-of-type(1) > div#stage-2-learning-goals-card:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div#stage-2-learning-filters-container:nth-of-type(4) > div#learning-goals-filters-panel:nth-of-type(1)
CSS 1: {

}
[AIS_METADATA_SECTION_END]
```

---

### Prompt 52: Hotfix Filter Is Not Defined in index.tsx
```
Fix the errors in the app
[AIS_METADATA_SECTION_START]
fix_it_trigger: manual
error 0: [APP_BOOT_ERROR] Router rendered ErrorComponent: This page didn't load Filter is not defined
error 1: [APP_PAGE_ERROR] This page didn't load: Filter is not defined
error 2: ReferenceError: Filter is not defined
    at https://ais-dev-qr7b7j46r5yv52es5uzhcu-94725394228.europe-west2.run.app/src/routes/index.tsx:9551:52
    at Array.map (<anonymous>)
    at Index (https://ais-dev-qr7b7j46r5yv52es5uzhcu-94725394228.europe-west2.run.app/src/routes/index.tsx:6186:9)
    at Object.react_stack_bottom_frame (https://ais-dev-qr7b7j46r5yv52es5uzhcu-94725394228.europe-west2.run.app/node_modules/.vite/deps/react-dom_client.js?v=6566324c:14140:12)
    at renderWithHooks (https://ais-dev-qr7b7j46r5yv52es5uzhcu-94725394228.europe-west2.run.app/node_modules/.vite/deps/react-dom_client.js?v=6566324c:4398:19)
    at updateFunctionComponent (https://ais-dev-qr7b7j46r5yv52es5uzhcu-94725394228.europe-west2.run.app/node_modules/.vite/deps/react-dom_client.js?v=6566324c:5773:16)
    at beginWork (https://ais-dev-qr7b7j46r5yv52es5uzhcu-94725394228.europe-west2.run.app/node_modules/.vite/deps/react-dom_client.js?v=6566324c:6389:20)
    at runWithFiberInDEV (https://ais-dev-qr7b7j46r5yv52es5uzhcu-94725394228.europe-west2.run.app/node_modules/.vite/deps/react-dom_client.js?v=6566324c:943:66)
    at performUnitOfWork (https://ais-dev-qr7b7j46r5yv52es5uzhcu-94725394228.europe-west2.run.app/node_modules/.vite/deps/react-dom_client.js?v=6566324c:9146:92)
    at workLoopSync (https://ais-dev-qr7b7j46r5yv52es5uzhcu-94725394228.europe-west2.run.app/node_modules/.vite/deps/react-dom_client.js?v=6566324c:9042:37)
error 3: %o

%s

%s ReferenceError: Filter is not defined
    at https://ais-dev-qr7b7j46r5yv52es5uzhcu-94725394228.europe-west2.run.app/src/routes/index.tsx:9551:52
    at Array.map (<anonymous>)
    at Index (https://ais-dev-qr7b7j46r5yv52es5uzhcu-94725394228.europe-west2.run.app/src/routes/index.tsx:6186:9)
    at Object.react_stack_bottom_frame (https://ais-dev-qr7b7j46r5yv52es5uzhcu-94725394228.europe-west2.run.app/node_modules/.vite/deps/react-dom_client.js?v=6566324c:14140:12)
    at renderWithHooks (https://ais-dev-qr7b7j46r5yv52es5uzhcu-94725394228.europe-west2.run.app/node_modules/.vite/deps/react-dom_client.js?v=6566324c:4398:19)
    at updateFunctionComponent (https://ais-dev-qr7b7j46r5yv52es5uzhcu-94725394228.europe-west2.run.app/node_modules/.vite/deps/react-dom_client.js?v=6566324c:5773:16)
    at beginWork (https://ais-dev-qr7b7j46r5yv52es5uzhcu-94725394228.europe-west2.run.app/node_modules/.vite/deps/react-dom_client.js?v=6566324c:6389:20)
    ... [3 frames omitted]
[AIS_METADATA_SECTION_END]
```

---

### Prompt 53: Remove Redundant Sequence Control & TTS Order Column (Superseded by Video Precedence Bar)
```
those items are redundunt now after having the video precedence bar
Apply style changes to the selected element(s).
[AIS_METADATA_SECTION_START]
CSS selector 1: div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(4) > details:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3)
CSS 1: {

}
CSS selector 2: div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(4) > details:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(3) > table:nth-of-type(1) > thead:nth-of-type(1) > tr:nth-of-type(1) > th:nth-of-type(7)
CSS 2: {

}
[AIS_METADATA_SECTION_END]
```

---

### Prompt 54: Subtitles-Table on Stage 3, Auto-Focus/Auto-Scroll Disablement, Learning Goals Stage 1 & Video Final Stage, Video Resume Causes & Fixes
```
1. the demo website doesnt include a subtitles-table-view on stage 3
2. create docs/auto-focus.md - create table of auto-focus /auto-scroll triggers - and disable all of them !
3. the first stage should be learning-goals. the last stage should be the video and the video shouldn't be shown on any other stage
4. list the reasons why the app doesnt resume the video after it pauses docs/stop.md  - and remove all of them.
```

---

### Prompt 55: TTS Blacklist / Whitelist, Up to 1:20 Ratio, localStorage Persistence, and Export/Import Application Settings
```
languages goal - whitelist/blacklist - allow to set languages to be on the black-list of tts-play - in that case even if the default subtitles are X , then X would be skipped for tts-play.
allow tts-ratio to be up to 1:20 ratio.
tts-ration is to be stored using local-storage.
2
add option to export/import application settings
```

---

### Prompt 56: Fix App Errors (getTtsFallbackOrder, isLanguageTtsBlacklisted, SwitchableDefaultSubtitlesBar useState Hook Error)
```
Fix the errors in the app
[AIS_METADATA_SECTION_START]
fix_it_trigger: manual
error 0: [vite] SyntaxError: The requested module '/src/lib/alternative-tts.ts' does not provide an export named 'getTtsFallbackOrder'
error 1: [vite] Failed to reload /src/routes/index.tsx. This could be due to syntax errors or importing non-existent modules. (see errors above)
error 2: [vite] SendBeforeConnectError: send was called before connect
    at Object.send (https://ais-dev-o4fswksomoqcbae6o4fp6v-515898758927.europe-west1.run.app/@vite/client:384:15)
    at HMRClient.send (https://ais-dev-o4fswksomoqcbae6o4fp6v-515898758927.europe-west1.run.app/@vite/client:161:18)
    at HMRContext.send (https://ais-dev-o4fswksomoqcbae6o4fp6v-515898758927.europe-west1.run.app/@vite/client:123:18)
    at HMRContext.invalidate (https://ais-dev-o4fswksomoqcbae6o4fp6v-515898758927.europe-west1.run.app/@vite/client:92:8)
    at https://ais-dev-o4fswksomoqcbae6o4fp6v-515898758927.europe-west1.run.app/src/components/VideoPlayground.tsx:990:46
    at https://ais-dev-o4fswksomoqcbae6o4fp6v-515898758927.europe-west1.run.app/@vite/client:70:95
    at https://ais-dev-o4fswksomoqcbae6o4fp6v-515898758927.europe-west1.run.app/@vite/client:222:52
    at https://ais-dev-o4fswksomoqcbae6o4fp6v-515898758927.europe-west1.run.app/@vite/client:200:55
    at Array.forEach (<anonymous>)
    at HMRClient.queueUpdate (https://ais-dev-o4fswksomoqcbae6o4fp6v-515898758927.europe-west1.run.app/@vite/client:200:33)
error 3: [vite] SyntaxError: The requested module '/src/lib/playback-preferences.ts' does not provide an export named 'isLanguageTtsBlacklisted'
error 4: [vite] Failed to reload /src/components/beginner/PerLanguageTtsPreferences.tsx. This could be due to syntax errors or importing non-existent modules. (see errors above)
error 5: Invalid hook call. Hooks can only be called inside of the body of a function component. This could happen for one of the following reasons:
1. You might have mismatching versions of React and the renderer (such as React DOM)
2. You might be breaking the Rules of Hooks
3. You might have more than one copy of React in the same app
See https://react.dev/link/invalid-hook-call for tips about how to debug and fix this problem.
error 6: [APP_BOOT_ERROR] Router rendered ErrorComponent: This page didn't load Cannot read properties of null (reading 'useState')
error 7: [APP_PAGE_ERROR] This page didn't load: Cannot read properties of null (reading 'useState')
error 8: TypeError: Cannot read properties of null (reading 'useState')
    at exports.useState (https://ais-dev-o4fswksomoqcbae6o4fp6v-515898758927.europe-west1.run.app/node_modules/.vite/deps/react.js?v=8cb0b07d:769:30)
    at SwitchableDefaultSubtitlesBar (https://ais-dev-o4fswksomoqcbae6o4fp6v-515898758927.europe-west1.run.app/src/components/SwitchableDefaultSubtitlesBar.tsx?t=1793742056192:23:36)
    at Object.react_stack_bottom_frame (https://ais-dev-o4fswksomoqcbae6o4fp6v-515898758927.europe-west1.run.app/node_modules/.vite/deps/react-dom_client.js?v=74830f5e:14140:12)
    at renderWithHooks (https://ais-dev-o4fswksomoqcbae6o4fp6v-515898758927.europe-west1.run.app/node_modules/.vite/deps/react-dom_client.js?v=74830f5e:4398:19)
    at updateFunctionComponent (https://ais-dev-o4fswksomoqcbae6o4fp6v-515898758927.europe-west1.run.app/node_modules/.vite/deps/react-dom_client.js?v=74830f5e:5773:16)
    at beginWork (https://ais-dev-o4fswksomoqcbae6o4fp6v-515898758927.europe-west1.run.app/node_modules/.vite/deps/react-dom_client.js?v=74830f5e:6389:20)
    at runWithFiberInDEV (https://ais-dev-o4fswksomoqcbae6o4fp6v-515898758927.europe-west1.run.app/node_modules/.vite/deps/react-dom_client.js?v=74830f5e:943:66)
    at performUnitOfWork (https://ais-dev-o4fswksomoqcbae6o4fp6v-515898758927.europe-west1.run.app/node_modules/.vite/deps/react-dom_client.js?v=74830f5e:9146:92)
    at workLoopSync (https://ais-dev-o4fswksomoqcbae6o4fp6v-515898758927.europe-west1.run.app/node_modules/.vite/dep
    ... [stack truncated]
error 9: %o

%s

%s TypeError: Cannot read properties of null (reading 'useState')
    at exports.useState (https://ais-dev-o4fswksomoqcbae6o4fp6v-515898758927.europe-west1.run.app/node_modules/.vite/deps/react.js?v=8cb0b07d:769:30)
    at SwitchableDefaultSubtitlesBar (https://ais-dev-o4fswksomoqcbae6o4fp6v-515898758927.europe-west1.run.app/src/components/SwitchableDefaultSubtitlesBar.tsx?t=1793742056192:23:36)
    at Object.react_stack_bottom_frame (https://ais-dev-o4fswksomoqcbae6o4fp6v-515898758927.europe-west1.run.app/node_modules/.vite/deps/react-dom_client.js?v=74830f5e:14140:12)
    at renderWithHooks (https://ais-dev-o4fswksomoqcbae6o4fp6v-515898758927.europe-west1.run.app/node_modules/.vite/deps/react-dom_client.js?v=74830f5e:4398:19)
    at updateFunctionComponent (https://ais-dev-o4fswksomoqcbae6o4fp6v-515898758927.europe-west1.run.app/node_modules/.vite/deps/react-dom_client.js?v=74830f5e:5773:16)
    at beginWork (https://ais-dev-o4fswksomoqcbae6o4fp6v-515898758927.europe-west1.run.app/node_modules/.vite/deps/react-dom_client.js?v=74830f5e:6389:20)
    at runWithFiberInDEV (https://ais-dev-o4fswksomoqcbae6o4fp6v-515898758927.europe-west1.run.app/node_modules/.vite/deps/react-dom_client.js?v=74830f5e:943:66)
    ... [3 frames omitted]
[AIS_METADATA_SECTION_END]
```

---

### Prompt 57: Slow / Fast Mode (Hide & Disable Non-Obligatory Elements by Default, docs/disable_and_hide.md, Disable-All/Enable-All in Settings)
```
slow/fast mode - by default dont use&show all elements which are not obligatory for the function of the app. this should be listed on docs/disable_and_hide.md. allow to disable-all/enable-all on the settings.
```

---

### Prompt 58: Fix App Errors (Vite Reload & TypeScript Compiler Errors across index.tsx, settingsBackupManager, SwitchableDefaultSubtitlesBar, StorybookWorkbench)
```
Fix the errors in the app
[AIS_METADATA_SECTION_START]
fix_it_trigger: manual
error 0: [vite] Failed to reload /src/components/LanguageBoxesSelector.tsx. This could be due to syntax errors or importing non-existent modules. (see errors above)
error 1: [vite] Failed to reload /src/components/beginner/BeginnerFlowContainer.tsx. This could be due to syntax errors or importing non-existent modules. (see errors above)
error 2: [vite] Failed to reload /src/styles.css. This could be due to syntax errors or importing non-existent modules. (see errors above)
error 3: [vite] Failed to reload /src/components/SubtitlesTablePanel.tsx. This could be due to syntax errors or importing non-existent modules. (see errors above)
error 4: [vite] Failed to reload /src/routes/index.tsx. This could be due to syntax errors or importing non-existent modules. (see errors above)
error 5: [vite] Failed to reload /src/components/NetworkRequestsInspector.tsx. This could be due to syntax errors or importing non-existent modules. (see errors above)
error 6: [vite] Failed to reload /src/components/AiSubtitlePunctuationTab.tsx. This could be due to syntax errors or importing non-existent modules. (see errors above)
error 7: [vite] Failed to reload /src/components/beginner/tabs/BeginnerPreferencesTab.tsx. This could be due to syntax errors or importing non-existent modules. (see errors above)
error 8: [vite] Failed to reload /src/components/ExternalTtsDebuggerPanel.tsx. This could be due to syntax errors or importing non-existent modules. (see errors above)
error 9: [vite] Failed to reload /src/components/beginner/PerLanguageTtsPreferences.tsx. This could be due to syntax errors or importing non-existent modules. (see errors above)
[AIS_METADATA_SECTION_END]
```

---

### Prompt 59: Hotfix Maximum Update Depth Exceeded & getSnapshot Caching in useSyncExternalStore
```
Fix the errors in the app
[AIS_METADATA_SECTION_START]
fix_it_trigger: manual
error 0: The result of getSnapshot should be cached to avoid an infinite loop
error 1: [APP_BOOT_ERROR] Router rendered ErrorComponent: This page didn't load Maximum update depth exceeded. This can happen when a component repeatedly calls setState inside componentWillUpdate or componentDidUpdate. React limits the number of nested updates to prevent infinite loops.
error 2: [APP_PAGE_ERROR] This page didn't load: Maximum update depth exceeded. This can happen when a component repeatedly calls setState inside componentWillUpdate or componentDidUpdate. React limits the number of nested updates to prevent infinite loops.
error 3: Error: Maximum update depth exceeded. This can happen when a component repeatedly calls setState inside componentWillUpdate or componentDidUpdate. React limits the number of nested updates to prevent infinite loops.
    at getRootForUpdatedFiber (https://ais-dev-ypeejppykfdal26vcakg74-778504381984.europe-west2.run.app/node_modules/.vite/deps/react-dom_client.js?v=c9b35bb5:2784:166)
    at enqueueConcurrentRenderForLane (https://ais-dev-ypeejppykfdal26vcakg74-778504381984.europe-west2.run.app/node_modules/.vite/deps/react-dom_client.js?v=c9b35bb5:2774:11)
    at forceStoreRerender (https://ais-dev-ypeejppykfdal26vcakg74-778504381984.europe-west2.run.app/node_modules/.vite/deps/react-dom_client.js?v=c9b35bb5:4770:15)
    at updateStoreInstance (https://ais-dev-ypeejppykfdal26vcakg74-778504381984.europe-west2.run.app/node_modules/.vite/deps/react-dom_client.js?v=c9b35bb5:4752:36)
    at Object.react_stack_bottom_frame (https://ais-dev-ypeejppykfdal26vcakg74-778504381984.europe-west2.run.app/node_modules/.vite/deps/react-dom_client.js?v=c9b35bb5:14176:13)
    at runWithFiberInDEV (https://ais-dev-ypeejppykfdal26vcakg74-778504381984.europe-west2.run.app/node_modules/.vite/deps/react-dom_client.js?v=c9b35bb5:943:66)
    at commitHookEffectListMount (https://ais-dev-ypeejppykfdal26vcakg74-778504381984.europe-west2.run.app/node_modules/.vite/deps/react-dom_client.js?v=c9b35bb5:6899:153)
    at commitHookPassiveMountEffects (https://ais-dev-ypeejppykfdal26vcakg74-778504381984.europe-w
    ... [stack truncated]
error 4: %o

%s

%s Error: Maximum update depth exceeded. This can happen when a component repeatedly calls setState inside componentWillUpdate or componentDidUpdate. React limits the number of nested updates to prevent infinite loops.
    at getRootForUpdatedFiber (https://ais-dev-ypeejppykfdal26vcakg74-778504381984.europe-west2.run.app/node_modules/.vite/deps/react-dom_client.js?v=c9b35bb5:2784:166)
    at enqueueConcurrentRenderForLane (https://ais-dev-ypeejppykfdal26vcakg74-778504381984.europe-west2.run.app/node_modules/.vite/deps/react-dom_client.js?v=c9b35bb5:2774:11)
    at forceStoreRerender (https://ais-dev-ypeejppykfdal26vcakg74-778504381984.europe-west2.run.app/node_modules/.vite/deps/react-dom_client.js?v=c9b35bb5:4770:15)
    at updateStoreInstance (https://ais-dev-ypeejppykfdal26vcakg74-778504381984.europe-west2.run.app/node_modules/.vite/deps/react-dom_client.js?v=c9b35bb5:4752:36)
    at Object.react_stack_bottom_frame (https://ais-dev-ypeejppykfdal26vcakg74-778504381984.europe-west2.run.app/node_modules/.vite/deps/react-dom_client.js?v=c9b35bb5:14176:13)
    at runWithFiberInDEV (https://ais-dev-ypeejppykfdal26vcakg74-778504381984.europe-west2.run.app/node_modules/.vite/deps/react-dom_client.js?v=c9b35bb5:943:66)
    at commitHookEffectListMount (https://ais-dev-ypeejppykfdal26vcakg74-778504381984.europe-west2.run.app/node_modules/.vite/deps/react-dom_client.js?v=c9b35bb5:6899:153)
    ... [3 frames omitted]
[AIS_METADATA_SECTION_END]
```

---

### Prompt 60: Parallel AI Agent Coordination, Lock Mechanism & chat.md Shared Channel
```
1. AGENTS.md - allow parallel work of AI agent by using a lock mechanism and by sharing a communication channel as chat.md in order to effeciently work in parallel without getting into code conflicts.the whenever an agent finish a job he needs to take off the lock. if a job was stopped before accomplished shoud the agent ask if the jobs priority and what task to continue before starting to work. if agent suspect another agents is working on the same job as he does -he needs to communucate it. the prompt user can can answer if no agent does reply - in this case redirect the question to the user
```

---

### Prompt 61: Parallel Planning Mode in docs/plans/ & Append Continuation Format
```
parallel work - can be simplified by focusing on creating plans without updating the code. therefor if the prompt ask you to plan - do it in saperated directory like docs/plans/timestamp_<desc>.md and dont update any other repo's file. instead of updating a repo file  - create its continue on the same plan file, such as content: prompt:x work:y.
```

---

### Prompt 62: Fetched Subtitles Info & Stats Stage, Move Fetching to Accordion, Quarantine Inner Parser, Log Element
```
0. add another stage which only responsible of showing the fetched subtitles info and statisics. its crusial for the app to cache those fetched subtitles and allow to choose which of the subtitles fetched will be used as based for translation. (by default pick the one with the highest number of sentence punctuations (as it does now). the subtitles-table-view should be reactive to the default subtitles (the source for translation).

1. main issues: mv anything related to fetching subtitles to this elememt (design it as accordion like the rest of the elements on the page)

2. by default - hide/disable/quarentine anything related to subtitles parsing (i have find out that youtube translation is punctuated so it can be used as translation-source/deafult-language instead of trying to split to sentences using app's inner subtitles parser)

3.use such log element:
https://youtube-subtitles-fetcher.base44.app/
Apply style changes to the selected element(s).
[AIS_METADATA_SECTION_START]
CSS selector 1: div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(6) > div:nth-of-type(1) > div:nth-of-type(1)
CSS 1: {

}
CSS selector 2: div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(6) > div:nth-of-type(1) > div:nth-of-type(2)
CSS 2: {

}
[AIS_METADATA_SECTION_END]
```

---

### Prompt 63: Connect All Subtitle Fetch Actions & Quick Loader to Central Log Element
```
pasting: https://www.youtube.com/api/timedtext?v=5-Mid7GNZ1M&ei=mqnqarjvMZfEhcIPl-TJ2AQ&caps=asr&opi=112496729&exp=xpe&xoaf=5&xowf=1&xospf=1&hl=iw&ip=0.0.0.0&ipbits=0&expire=1793788938&sparams=ip,ipbits,expire,v,ei,caps,opi,exp,xoaf&signature=227DA5C056CDB43797F3564B70A8CB3B321A5C6D.48EF7CEC5878106AE78A53E4EA023431BBF30306&key=yt8&kind=asr&lang=it&variant=timing-optimized&fmt=json3&c=WEB&pot=MlLEuGjtveoUoMSD11sGmFsIFJL9ESRQPsPy7sZjMzW3hQ00QcoZHs7ySY1ARis7DODpyyHDzHgOU9wclQyomHNnB2Nviybi6CJv1dfJhkQpsRFn to the quick loader 


and then clicking on some favorite languages and click on fetch button - the log element doesnt show the fetch request
```

---

### Prompt 64: Allow Access to Cached Subtitle File by Clicking Link
```
allow to acces the cached file by clicking this link
Apply style changes to the selected element(s).
[AIS_METADATA_SECTION_START]
CSS selector 1: div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(4) > details:nth-of-type(1) > div:nth-of-type(1) > div#fetched-subtitles-stage-panel:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div:nth-of-type(5) > div:nth-of-type(3) > span:nth-of-type(1) > span:nth-of-type(1)
CSS 1: {

}
[AIS_METADATA_SECTION_END]
```

### Prompt 65: Fix Errors in Dev Server Pre-warming
```
Fix the errors in the app
[AIS_METADATA_SECTION_START]
fix_it_trigger: manual
error 0: Pre-warming failed: dev server process died. > subtitle-sync@2.1.0 dev > vite --port 3000 --host 0.0.0.0
[AIS_METADATA_SECTION_END]
```

### Prompt 66: Settings Controls, Separate Stage, Default Language Sync, Export/Import, Subtitle Logs, TTS Audio Test
```
1. update global features on settings: 
- disable scrolling 
- disable auto-focus

2. settings - should appear only on its own stage

3. there are too many places to set the default language and this parameter is not sync within the app !

4. settings: 
- add option to export/import the setings

5.   Auto-Fetching Subtitles
- the log viewer should show the request/response

6. the tts service network request shows error while the app tts-play "hello world". add button to fetch and play audio - while allowing few options to speak few sentences in few langs based on the configured settings. network request/response to be log on the log viewer
```

---

### Prompt 67: Fix Vite HMR Reload Errors & Module Exports
```
Fix the errors in the app
[AIS_METADATA_SECTION_START]
fix_it_trigger: manual
error 0: [vite] Failed to reload /src/styles.css. This could be due to syntax errors or importing non-existent modules. (see errors above)
error 1: [vite] Failed to reload /src/components/AttemptOrderSettings.tsx. This could be due to syntax errors or importing non-existent modules. (see errors above)
error 2: [vite] SyntaxError: The requested module '/src/utils/appSettings.ts' does not provide an export named 'getDisableAutoFocusSetting'
error 3: [vite] Failed to reload /src/components/beginner/tabs/BeginnerPreferencesTab.tsx. This could be due to syntax errors or importing non-existent modules. (see errors above)
error 4: [vite] SyntaxError: The requested module '/src/utils/subtitleCache.ts' does not provide an export named 'cacheJson3Track'
error 5: [vite] Failed to reload /src/routes/index.tsx. This could be due to syntax errors or importing non-existent modules. (see errors above)
error 6: [vite] Failed to reload /src/storybook/StorybookWorkbench.tsx. This could be due to syntax errors or importing non-existent modules. (see errors above)
error 7: Invalid hook call. Hooks can only be called inside of the body of a function component. This could happen for one of the following reasons:
1. You might have mismatching versions of React and the renderer (such as React DOM)
2. You might be breaking the Rules of Hooks
3. You might have more than one copy of React in the same app
See https://react.dev/link/invalid-hook-call for tips about how to debug and fix this problem.
error 8: [APP_BOOT_ERROR] Router rendered ErrorComponent: This page didn't load Cannot read properties of null (reading 'useState')
error 9: [APP_PAGE_ERROR] This page didn't load: Cannot read properties of null (reading 'useState')
[AIS_METADATA_SECTION_END]
```

---

### Prompt 68: Go On
```
go on
```

---

### Prompt 69: Go On
```
go on
```

---

### Prompt 70: Ensure GitHub Actions Works Correctly & E2E Tests Recognize Application Crash
```
ensure github actions works correctly and e2e test recognize the current application crash
```

---

### Prompt 71: Fix Errors in App (Dev Server Pre-warming Failure)
```
Fix the errors in the app
[AIS_METADATA_SECTION_START]
fix_it_trigger: manual
error 0: Pre-warming failed: dev server process died. > subtitle-sync@2.1.3 dev > vite --port 3000 --host 0.0.0.0
[AIS_METADATA_SECTION_END]
```

---

### Prompt 72: Quarantine Agent Chat in AGENTS.md & Do Not Use For Now
```
AGENTS.md - regarding using agent chat - quarentine and dont use for now
```

---

### Prompt 73: UI/UX Expert - Update the Project Design
```
as a UI/UX expert - update the project design
```

---

### Prompt 74: Design Simplicity Inquiry
```
hi expert, is it the most simple design now ?
```

---

### Prompt 75: TTS3 Lovable Service Authorization Code & POST Request
```
based on:https://tts3.lovable.app/api/public/openapi.json

choosing the tts service: "tts3.lovable.app" should show input field to set the authorization code. then the request should be a POST request. something like this:
curl --url 'https://tts3.lovable.app/api/public/tts' \
  -H 'accept: */*' \
  -H 'accept-language: he-IL,he;q=0.8' \
  -H 'authorization: Bearer spk_7086d2cc-398e-43ba-a116-484e0ee7fbd4.8Dok04uUENzJ0D0XeUMEvd_crmJXDMHDJIIt2kFmu2Y' \
  -H 'content-type: application/json' \
  -b '__dpl=psr2.fdf14dcc-79bc-4a7e-9d6f-8d7859298348.1794446639.TTBfSAibDOF0qNNPycmGUgiPt1bhMHJlegICx82k9Bw; session-id=8a01f5fc-b2b6-4136-8369-76383f9c28a9' \
  -H 'origin: https://tts3.lovable.app' \
  -H 'priority: u=1, i' \
  -H 'referer: https://tts3.lovable.app/docs' \
  -H 'sec-ch-ua: "Not:A-Brand";v="8", "Chromium";v="156", "Brave";v="156"' \
  -H 'sec-ch-ua-mobile: ?0' \
  -H 'sec-ch-ua-platform: "Windows"' \
  -H 'sec-fetch-dest: empty' \
  -H 'sec-fetch-mode: cors' \
  -H 'sec-fetch-site: same-origin' \
  -H 'sec-gpc: 1' \
  -H 'user-agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36' \
  --data-raw $'{\n    "text": "Bonjour, comment allez-vous aujourd\'hui ? La lumière du soir est magnifique.",\n    "lang": "fr",\n    "provider": "auto",\n    "debug": true\n}'
Apply style changes to the selected element(s).
[AIS_METADATA_SECTION_START]
CSS selector 1: div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > details:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > details:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(9) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > select#tts-panel-engine-select:nth-of-type(1)
CSS 1: {

}
[AIS_METADATA_SECTION_END]
```

---

### Prompt 76: Dev Server Pre-warming Failure & Lint Errors Hotfix
```
Fix the errors in the app
[AIS_METADATA_SECTION_START]
fix_it_trigger: manual
error 0: Pre-warming failed: dev server process died. > subtitle-sync@2.1.6 dev > vite --port 3000 --host 0.0.0.0 VITE v8.1.5  ready in 1504 ms ➜  Local:   http://localhost:3000/ ➜  Network: http://169.254.8.1:3000/ ➜  Network: http://169.254.9.1:3000/ ➜  Network: http://169.254.169.1:3000/
[AIS_METADATA_SECTION_END]
```

---

### Prompt 77: Remove Direct Google TTS Client Option Across Entire App
```
update: there is no option of direct request to google tts from the client. therefor rm that option from entire app
```

---

### Prompt 78: Fix Vite Reload and Missing Module Errors (Hotfix)
```
Fix the errors in the app
[AIS_METADATA_SECTION_START]
fix_it_trigger: manual
error 0: [vite] Failed to reload /src/styles.css. This could be due to syntax errors or importing non-existent modules. (see errors above)
error 1: [vite] Failed to reload /src/components/TtsServiceSettingsPanel.tsx. This could be due to syntax errors or importing non-existent modules. (see errors above)
error 2: [vite] Failed to reload /src/components/beginner/BeginnerTtsServiceControl.tsx. This could be due to syntax errors or importing non-existent modules. (see errors above)
error 3: [vite] Failed to reload /src/components/SwitchableDefaultSubtitlesBar.tsx. This could be due to syntax errors or importing non-existent modules. (see errors above)
error 4: [vite] Failed to reload /src/routes/index.tsx. This could be due to syntax errors or importing non-existent modules. (see errors above)
error 5: [vite] Failed to reload /src/components/ExternalTtsDebuggerPanel.tsx. This could be due to syntax errors or importing non-existent modules. (see errors above)
error 6: [vite] Failed to reload /src/components/TtsFallbackOrderSwitch.tsx. This could be due to syntax errors or importing non-existent modules. (see errors above)
error 7: [vite] Failed to reload /src/components/beginner/tabs/BeginnerPreferencesTab.tsx. This could be due to syntax errors or importing non-existent modules. (see errors above)
error 8: [vite] Failed to reload /src/storybook/StorybookWorkbench.tsx. This could be due to syntax errors or importing non-existent modules. (see errors above)
error 9: [vite] Failed to reload /src/components/NetworkRequestsInspector.tsx. This could be due to syntax errors or importing non-existent modules. (see errors above)
[AIS_METADATA_SECTION_END]
```

---

### Prompt 79: Ensure All GitHub Actions Are Passing
```
ensure all github actions are passing
```

---

### Prompt 80: Suppress Passing Voice to the TTS Service
```
suppress passing voice to the tts service
```

---

### Prompt 81: Auto-Fetching Subtitles Server/Client and Session/No-Session Debug Display
```
does auto-fetching use server/client session/no-session to fetch - these experimental stuff are to be shown on the "Auto-Fetching Subtitles" element when debug is enabled
```

---

### Prompt 82: Remove Non-Working Alternating Fetch Plan Technique
```
wrong technic - no need to alternate plan while its not working at all
```

---

### Prompt 83: Auto-Scroll Bug on Speed Change, Floating Button Pause Reaction & Reason, Universal Bottom Log, Hide Non-Debug & Duplicate Controls, Beside-Video Change-All-Speed, State Machine Logs
```
1. changing the speed of a language triggers scroll to video (even though: 1. settings configured not to auto-scroll 2. the video should not apear in any other stage then the video-stage)

2. the video / tts-play sometimes pauses without user to press on stop. the floating button should react : i.e: show paused state if the video is not playing and the reason for why the video was paused must be notified on the floating button too.)

3. the log element should be part of any page and be placed on the bottom.

4. when the debug button is off - many elements and views should be hidden. there are lots of duplicated controls (such as the auto-scroll on the settings - there are 3 controls while 1 is enough)

5. there must be a change-all-speed control beside the video-player 

6. the log view should show any state machine action. the app should use state machine in order to be able to easily debug it and effeciently use the log element to identify issues - add a clear option and a copy to clipboard so that it would be easier to report an issue after removing records which are not relevant)
```

---

### Prompt 84: Remove Elements via Focus Mode Selection
```
rm these elements
Apply style changes to the selected element(s).
[AIS_METADATA_SECTION_START]
CSS selector 1: div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > details:nth-of-type(1) > div:nth-of-type(1) > div#stage-2-learning-goals-card:nth-of-type(1) > div:nth-of-type(2) > div#stage-2-language-ratios-container:nth-of-type(3) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > input:nth-of-type(1)
CSS 1: {

}
CSS selector 2: div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > details:nth-of-type(1) > div:nth-of-type(1) > div#stage-2-learning-goals-card:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div#stage-2-learning-filters-container:nth-of-type(4)
CSS 2: {

}
CSS selector 3: div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > details:nth-of-type(1) > div:nth-of-type(1) > div#stage-2-learning-goals-card:nth-of-type(1) > div:nth-of-type(3)
CSS 3: {

}
CSS selector 4: div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > div#accordion-stages-stepper:nth-of-type(1) > div:nth-of-type(2) > button#toggle-stage4-settings-btn:nth-of-type(1)
CSS 4: {

}
[AIS_METADATA_SECTION_END]
```

---

### Prompt 85: Deprecate Beginner Mode
```
1.deprecate beginner mode
```

---

### Prompt 86: Show/Hide Components, Text Mode Log, Subtitle Retries Limit, Redundant Settings Button Removal
```
1. allow to show hide those components and remember decision on the settings
2. for all those items - the log element can store all info in a text mode and no need to inner design between records
3. retry fetching subtitles - limit up to 3 retries (configurable and memoriable via settings)
4. the settings button is redundant
Apply style changes to the selected element(s).
[AIS_METADATA_SECTION_START]
CSS selector 1: div#root:nth-of-type(1) > div:nth-of-type(1) > footer#bottom-log-viewer:nth-of-type(1) > div:nth-of-type(1)
CSS 1: {

}
CSS selector 2: div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(6) > div:nth-of-type(1) > div:nth-of-type(1)
CSS 2: {

}
CSS selector 3: div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(6) > div:nth-of-type(1) > div:nth-of-type(2)
CSS 3: {

}
CSS selector 4: div#root:nth-of-type(1) > div:nth-of-type(1) > header:nth-of-type(1) > div:nth-of-type(4) > button#header-stage4-settings-button:nth-of-type(3)
CSS 4: {

}
[AIS_METADATA_SECTION_END]
```

---

### Prompt 87: Fix Errors in Dev Server Pre-warming (Hotfix)
```
Fix the errors in the app
[AIS_METADATA_SECTION_START]
fix_it_trigger: manual
error 0: Pre-warming failed: dev server process died. > subtitle-sync@2.1.16 dev > vite --port 3000 --host 0.0.0.0
[AIS_METADATA_SECTION_END]
```

---

### Prompt 88: Language Usage Tracking (Start Date Added & Ratio Last Updated), Hide Deprecated Components, Hide Duplicated Settings Button
```
1.
  remember the following 2 parameters for each language in order to track usage:
- for each langauge - remember the start date that language has been added  (using localstorage), and remember the ratio's last update for that language

2. hide deprecated components 
3. hide pointed duplicated item (settings button)
Apply style changes to the selected element(s).
[AIS_METADATA_SECTION_START]
CSS selector 1: div#root:nth-of-type(1) > div:nth-of-type(1) > header:nth-of-type(1) > div:nth-of-type(4) > button#header-stage4-settings-button:nth-of-type(3)
CSS 1: {

}
[AIS_METADATA_SECTION_END]
```

---

### Prompt 89: Hide "Fetched Subtitles" Stage by Default & Access Info in Settings Stage
```
hide the "Fetched Subtitles" stage by default - allow to access that info on the settings stage
```

---

### Prompt 90: Zero Knowledge in Language Mode (zero_knowledge_in_lang) - Pronounce Word and Translation with Longest/Random Word Strategy
```
some langauges the user doesnt know at - all and in this case it is best to start learning words rather then sentences. therefor define per language a param: zero_knowledge_in_lang:boolean 

for such language type - pronounce the word and its translation.
pick word strategy: choose between longest or random word
```

---

### Prompt 91: Hotfix: Cannot access 'baseLanguage' before initialization ReferenceError in Index route
```
Fix the errors in the app
[AIS_METADATA_SECTION_START]
fix_it_trigger: manual
error 0: [APP_BOOT_ERROR] Router rendered ErrorComponent: This page didn't load Cannot access 'baseLanguage' before initialization
error 1: [APP_PAGE_ERROR] This page didn't load: Cannot access 'baseLanguage' before initialization
error 2: ReferenceError: Cannot access 'baseLanguage' before initialization
    at Index (https://ais-dev-ypeejppykfdal26vcakg74-778504381984.europe-west2.run.app/src/routes/index.tsx:862:3)
```

---

### Prompt 92: Hotfix: Dev server pre-warming process died recovery & health verification
```
Fix the errors in the app
[AIS_METADATA_SECTION_START]
fix_it_trigger: manual
error 0: Pre-warming failed: dev server process died. > subtitle-sync@2.1.23 dev > vite --port 3000 --host 0.0.0.0 VITE v8.1.5  ready in 1040 ms ➜  Local:   http://localhost:3000/ ➜  Network: http://169.254.8.1:3000/ ➜  Network: http://169.254.9.1:3000/ ➜  Network: http://169.254.169.1:3000/
[AIS_METADATA_SECTION_END]
```

---

### Prompt 93: Strict Main Stage Component Isolation (Video on Stage 3 Only, Subtitles Table on Stage 2 Only)
```
any one of the main stage's component - should apear only on his stage. i.e: the video - dont show anywhere else,same for the subtitles table and etc.
```

---

### Prompt 94: TTS Playback Order & In-Between Video Bar in Learning Goals
```
learning goals - is missing the component for set the order of tts-play and the the video bar in between to set to show time for each lang
```

---

### Prompt 95: Remove Redundant Sequence Control Banner in Learning Goals (Focus Mode)
```
redundunt
Apply style changes to the selected element(s).
[AIS_METADATA_SECTION_START]
CSS selector 1: div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(4) > details:nth-of-type(1) > div:nth-of-type(1) > div#stage-2-learning-goals-card:nth-of-type(1) > div:nth-of-type(2) > div#stage-2-language-ratios-container:nth-of-type(3) > div:nth-of-type(2) > div:nth-of-type(1)
CSS 1: {

}
[AIS_METADATA_SECTION_END]
```

---

### Prompt 96: Component Design for Language Goals & UI Split for Ratios, Blacklist, Play Order, and Default Source
```
component design: docs/component_design/language_goals .md
currently we have those elements:
-1. 4. translation source - which language is the default (warning - no need to define a secondary language or to present that tag
)
list of favorite languages and a button of add language
split this element to its types:
order of playing (together with the video-playing precedenece bar)
tts-play ratio (slider control with plus/minus buttons on 2 edges)
blacklisted (a control to choose langauge to be skipped from tts-play-per-sentence but allow tts-play-per-word)
Apply style changes to the selected element(s).
```

---

### Prompt 97: Split Learning Goals Element into 4 Ingredient Types (1 Control Per Ingredient Type)
```
split this element to its ingredient types - 1 control per ingredient type:
1 order of playing (together with the video-playing precedenece bar)
2 tts-play ratio (slider control with plus/minus buttons on 2 edges)
3 blacklisted (a control to choose langauge to be skipped from tts-play-per-sentence but allow tts-play-per-word)
4 sentence or word
Apply style changes to the selected element(s).
[AIS_METADATA_SECTION_START]
CSS selector 1: div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > details:nth-of-type(1) > div:nth-of-type(1) > div#stage-2-learning-goals-card:nth-of-type(1) > div:nth-of-type(2) > div#stage-2-language-ratios-container:nth-of-type(3)
CSS 1: {

}
### Prompt 98: Each Ingredient Type Contains All Languages (Only Order Contains Video Bar)
```
u didnt get it !

each type of sorting will contain all languages (only the order will contain also the video-player bard precedence)
```

---

### Prompt 99: Move Row Criteria Outside subtitles-table-panel (Hidden when Scrolling Subtitles Table View)
```
mv this element outside because it should be hidden when scrolling the subtitles-table-view
Apply style changes to the selected element(s).
Apply style changes to the selected element(s).
[AIS_METADATA_SECTION_START]
CSS selector 1: div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > details:nth-of-type(1) > div:nth-of-type(1) > section:nth-of-type(1) > div#subtitles-table-panel:nth-of-type(1) > div#subtitles-table-row-criteria-container:nth-of-type(2)
CSS 1: {

}
[AIS_METADATA_SECTION_END]
```

---

### Prompt 100: Simplify Design - Use Just Arrow Buttons for Order Controls
```
simplify design - use just arrow buttons
Apply style changes to the selected element(s).
[AIS_METADATA_SECTION_START]
CSS selector 1: div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > details:nth-of-type(1) > div:nth-of-type(1) > div#stage-2-learning-goals-card:nth-of-type(1) > div:nth-of-type(2) > div#stage-2-language-ratios-container:nth-of-type(3) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1)
CSS 1: {

}
[AIS_METADATA_SECTION_END]
```

---

### Prompt 101: Hotfix: Maximum update depth exceeded in useEffect loop
```
Fix the errors in the app
[AIS_METADATA_SECTION_START]
fix_it_trigger: manual
error 0: Maximum update depth exceeded. This can happen when a component calls setState inside useEffect, but useEffect either doesn't have a dependency array, or one of the dependencies changes on every render.
[AIS_METADATA_SECTION_END]
```

---

### Prompt 102: Floating Play/Pause Button State and Click Behavior
```
fix it:

if the video is not playing - show a play  button or else -  show a pause button !
clicking on play should always trigger play 
clicking on pause should always trigger pause
Apply style changes to the selected element(s).
[AIS_METADATA_SECTION_START]
CSS selector 1: div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(5) > button:nth-of-type(1)
CSS 1: {

}
[AIS_METADATA_SECTION_END]
```

---

### Prompt 103: Top Menu Show/Hide Buttons for Log & Accordion + Accordion Folded by Default
```
add show/hide buttons for those elements on the top menu.
the accordion element should be folded by default.
Apply style changes to the selected element(s).
[AIS_METADATA_SECTION_START]
CSS selector 1: div#root:nth-of-type(1) > div:nth-of-type(1) > footer#bottom-log-viewer:nth-of-type(1) > div:nth-of-type(1)
CSS 1: {

}
CSS selector 2: div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(6) > div:nth-of-type(1) > div:nth-of-type(1)
CSS 2: {

}
[AIS_METADATA_SECTION_END]
---

### Prompt 104: Auto-Fetching Subtitles Folded and Hidden by Default, Log View Hidden by Default, and Header Controls
```
on page refresh "Auto-Fetching Subtitles" still not folded and not hidden and the log view is not hidden and there are no 2 control hide/show buttons on the page's header menu
```

---

### Prompt 105: Stage 2 Learning Goals Card List Presentation, Minimal Text & Icons-First
```
prefer list presentation and minimal text . prefer icons then text .
Apply style changes to the selected element(s).
[AIS_METADATA_SECTION_START]
CSS selector 1: div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > details:nth-of-type(1) > div:nth-of-type(1) > div#stage-2-learning-goals-card:nth-of-type(1)
CSS 1: {

}
[AIS_METADATA_SECTION_END]
```

---

### Prompt 106: Redundant Accordion Header Toggle Button Removal
```
it seems that you have mis-understood me - this button use redundunt.
Apply style changes to the selected element(s).
[AIS_METADATA_SECTION_START]
CSS selector 1: div#root:nth-of-type(1) > div:nth-of-type(1) > header:nth-of-type(1) > div:nth-of-type(4) > button#header-toggle-accordion-button:nth-of-type(3)
CSS 1: {

}
---

### Prompt 107: Go On (Continue Active Tasks - Task 318)
```
go on
```

---

### Prompt 108: Ensure README Updated Correctly
```
ensure readme updated correctly
```

---

### Prompt 109: Update TTS Service According to its OpenAPI Specification (openapi.json)
```
update tts service according its openapi.json
```

---

### Prompt 110: Floating Play/Pause Button State & Video Share Learning Goals Persistence
```
1. the floating button should show the state of the (tts-play&video-player) player but clicking on play doent do anything.

2. the learning-goals including  each language settings is doesnt seems to be remember between app init when triggering the app via a video share with the app
```

---

### Prompt 111: Go On (Continue Prompt 110 Implementation)
```
go on
```

---

### Prompt 112: Playback Expectation Scenario & Learning Goals Save Profile Dropdown
```
0. what expected when the user clicks on play? show a quick scenario which will explain what is going to happend based on the language setup selection: 

for example:
play italian on subtitles-record-id:3 - tts play a word
play english on subtitles-record-id:3 - tts play a word
play the video for X seconds
play hebrew language on subtitles-record-id:4 - tts play a word
play russian on subtitles-record-id:6 - tts play a sentence because sentence-section(ending with ",") is lower then 8 words


1. learning goals - save profile.
the user should be able to setup learning profile and then change between them by selecting a profile from a dropdown menu next to the video-player
Apply style changes to the selected element(s).
[AIS_METADATA_SECTION_START]
CSS selector 1: div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > details:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > div#ratio-compositions-selector-container:nth-of-type(2)
CSS 1: {

}
CSS selector 2: div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3)
CSS 2: {

}
[AIS_METADATA_SECTION_END]
```

---

### Prompt 113: Floating Play Button Playtime Tooltip on Hover / Long Press
```
after clicking on the floating play button - mouse hover (or equivilant operation on mobile) should show a tooltip with the play time
```

---

### Prompt 114: Floating Play Button Triggers Video & Video Stage Activation
```
should click on the floating play button trigger the video. currently it works only when the video stage is activated
```

---

### Prompt 115: Subtitles Table Play Trigger, Floating Error Button, Cell Language Colors, Background Diversity Toggle
```
clicking on the subtitles-table should trigger playing. 
show a floating error button in any error rising.
subtitles-table - cell coloring per language.

app design - add toggle button on header to make background more diverse
```

---

### Prompt 116: Learning Goals TTS Speed Per Language, Default External TTS, Header Import/Export, Learning Goals Profiles CRUD
```
0. learning goals - allow to set tts speed rate per language ( it should be effective for both native and external-tts-service)

1. by default use the external tts-service if it is already set and validated (should remember the access token)
2. add import/export buttons to the app's header (it shouldn't reduct any details)
3. allow to CRUD learning goals profiles.
```

---

### Prompt 117: Go On (Execute Tasks 348-351)
```
go on
```

---

### Prompt 118: Go On (CRUD Learning Goals Profiles), Ensure GitHub Actions Creation of README, Ignore Changes on Other Repo's README When Syncing Git
```
1. go on.
2. ensure github action creation of README
3. ignore changes on other repo's README.md when synching git
```

---

### Prompt 119: Floating Alert Button Leads to Log Element, Inspect Error Message & Stack Trace, Copy All Log to Clipboard, Timestamp & State Machine Reproduction
```
clicking on the floating alert button will lead to the log element, to the relevant record where the user would be able to inspect the error message and the stack trace and also to copy all log to clipboard. using timestamp and state machine actions it would be possible to reproduce the error.
```

---

### Prompt 120: Alternative View to Video Player for Current Subtitles, Part Sentence, Part Word & TTS Translation
```
1. add an alternative view to the video-player where the user can view the current subtitles/part sentence/part word and the translation to the current tts-play lang.
```

---

### Prompt 121: Fix Learning Goals View Disappearing Sometimes
```
fix: learning goals - the view might disapear sometimes
```

---

### Prompt 122: Go On (Execute Task 356)
```
go on
```

---

### Prompt 123: Under Video Player Add Button to Switch Full Screen
```
under the video-player add a button to switch full screen.
```

---

### Prompt 124: Go On (Finalize Task 312 & Clear Active Backlog)
```
go on
```

---

### Prompt 125: Learning Goals Profile Name Should Be Set on Top
```
the profile name should be set on top
Apply style changes to the selected element(s).
[AIS_METADATA_SECTION_START]
CSS selector 1: div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > details:nth-of-type(1) > div:nth-of-type(1)
CSS 1: {

}
[AIS_METADATA_SECTION_END]
```

---

### Prompt 126: Dedicated Learning Stage with Punchable Word Balloons Exposing Translation
```
create a stage dedicated to learning where instead of showing the video-player the user whould be able to view the words as a set of baloon and each baloon can be punched and then its expose he translation of that word
```

---

### Prompt 127: Subtitles Table First Column Running Index
```
subtitles-table: the first columns should be the running index
```

---

### Prompt 128: Allow Custom Volume per Translation (Stage 2 Learning Goals Card)
```
allow to set custom volume per translation
Apply style changes to the selected element(s).
[AIS_METADATA_SECTION_START]
CSS selector 1: div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > details:nth-of-type(1) > div:nth-of-type(1) > div#stage-2-learning-goals-card:nth-of-type(1)
CSS 1: {

}
[AIS_METADATA_SECTION_END]
```

---

### Prompt 129: Go On (Execute Task 361 Custom Volume per Translation)
```
go on
```

---

### Prompt 130: Bug Report & Troubleshooting - Native Speech Synthesis Interrupted
```
# Bug Report & Troubleshooting Prompt for AI Developer

## User Complaint / Reported Issue
> [No specific complaint text entered — complete runtime diagnostic state requested]

## Diagnostic Metadata
- **Current URL**: https://ais-dev-yrmij74sdbm5g56jwggc24-93170524797.europe-west2.run.app/?v=L2Ryrr6txwA&target_lang=en&tts=1
- **User Agent**: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36
- **Recorded Log Count**: 20 events (Ring Buffer, max 500)

## 1. Live Application State Snapshot
[State provider not registered]

## 2. Network Activity & TimedText Requests (0 requests)
*No external network requests recorded (using offline/demo fixtures).*

## 2.5 State Machine Actions Sequence for Reproduction (8 actions)
1. [00:29:32.186] (ts: 1794176972186) [Interception] Initializing YouTube Player iframe element | Details: {"videoId":"L2Ryrr6txwA","isInterceptorReady":true}
2. [00:29:32.413] (ts: 1794176972413) [State Machine] PLAYBACK_PAUSE_REQUESTED | Details: {"videoId":"L2Ryrr6txwA","reason":"user"}
3. [00:29:38.563] (ts: 1794176978563) [State Machine] PLAYER_STATE_CHANGED | Details: {"videoId":"L2Ryrr6txwA","playerState":1}
4. [00:29:40.347] (ts: 1794176980347) [State Machine] TTS_SECTION_STARTED | Details: {"videoId":"L2Ryrr6txwA","sectionId":"80:1839","rowIndex":0,"languages":["he","it","es","fr","ru","ar","pt-BR"]}
5. [00:29:40.443] (ts: 1794176980443) [State Machine] PLAYER_STATE_CHANGED | Details: {"videoId":"L2Ryrr6txwA","playerState":2}
6. [00:29:47.545] (ts: 1794176987545) [State Machine] PLAYBACK_PAUSE_REQUESTED | Details: {"videoId":"L2Ryrr6txwA","reason":"speech-active"}
7. [00:29:47.598] (ts: 1794176987598) [State Machine] Native speech synthesis failed | Details: {"lang":"he-IL","row":0,"error":"interrupted"}
8. [00:29:47.696] (ts: 1794176987696) [State Machine] TTS_SECTION_FINISHED | Details: {"videoId":"L2Ryrr6txwA","sectionId":"80:1839","rowIndex":0,"cancelled":true}
```

---

### Prompt 131: Fix the errors in the app
```
Fix the errors in the app
[AIS_METADATA_SECTION_START]
fix_it_trigger: manual
error 0: 11:01:36 PM [vite] (client) hmr update /src/styles.css, /src/routes/index.tsx, /src/components/WebDemoUrlsInput.tsx, /src/components/LanguageBoxesSelector.tsx, /src/components/FetchedSubtitlesStagePanel.tsx, /src/components/ApkReleaseModal.tsx, /src/components/ShareStateModal.tsx, /src/components/FloatingErrorButton.tsx, /src/components/StateMachineActionLogsInspector.tsx, /src/components/BottomLogViewer.tsx, /src/components/CriticalCaptionsAlert.tsx, /src/components/AiSubtitlePunctuationTab.tsx
error 1: 11:01:36 PM [vite] (client) hmr update /src/styles.css, /src/components/FloatingErrorButton.tsx
[AIS_METADATA_SECTION_END]
```

---

### Prompt 132: Fix Stage View Visibility When Clicking on a Stage
```
when clicking on a stage - its view sometimes not visible
```

---

### Prompt 133: Fix the errors in the app
```
Fix the errors in the app
[AIS_METADATA_SECTION_START]
fix_it_trigger: manual
error 0: 11:36:05 PM [vite] (client) hmr update /src/styles.css, /src/routes/index.tsx, /src/components/WebDemoUrlsInput.tsx, /src/components/LanguageBoxesSelector.tsx, /src/components/FetchedSubtitlesStagePanel.tsx, /src/components/ApkReleaseModal.tsx, /src/components/ShareStateModal.tsx, /src/components/FloatingErrorButton.tsx, /src/components/StateMachineActionLogsInspector.tsx, /src/components/BottomLogViewer.tsx, /src/components/CriticalCaptionsAlert.tsx, /src/components/AiSubtitlePunctuationTab.tsx
error 1: 11:36:05 PM [vite] (client) hmr update /src/styles.css, /src/components/FloatingErrorButton.tsx
[AIS_METADATA_SECTION_END]
```

---

### Prompt 134: Auto-Enable Captions Programmatically Before Showing Captions Required Notification
```
1. clicking on default language triggers on the  caption  so better try to trigger it before the fallback of showing the "caption required" notification in order to reduce noise .

 describe how triggering caption is achived without using the native youtube caption icon  on automation_enable_captions.md
```

---

### Prompt 135: Continue Task and Allow Switch Between 1 Table or Multiple Tables
```
1. go on.
2. allow to switch between update using 1 table or multipe tables
```


### Prompt 135: Fix the errors in the app (Dev server pre-warming & duplicate pt-BR key)
```
Fix the errors in the app
[AIS_METADATA_SECTION_START]
fix_it_trigger: manual
error 0: Pre-warming failed: dev server process died. > subtitle-sync@2.1.62 dev > vite --port 3000 --host 0.0.0.0 VITE v8.1.5  ready in 2275 ms ➜  Local:   http://localhost:3000/ ➜  Network: http://169.254.8.1:3000/ ➜  Network: http://169.254.9.1:3000/ ➜  Network: http://169.254.169.1:3000/
error 1: Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. pt-BR
[AIS_METADATA_SECTION_END]
```

---

### Prompt 136: Continue (go on)
```
go on
```

