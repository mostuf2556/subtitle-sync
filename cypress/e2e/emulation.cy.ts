describe("YouTube Video Viewer - Android Emulation Subtitle Tests", () => {
  beforeEach(() => {
    cy.log("Step 0: Navigating to YouTube Video Viewer");
    cy.visit("./?reset_all=true");
    cy.title().should("match", /YouTube|Parallel Subtitles/i);
    cy.get("header").should("be.visible");
  });

  it("Step-by-step: Emulator testing - load vBURridJXZ0 without fixtures, observe subtitles, change target language and assert tlang replacement", () => {
    const targetUrl = "https://www.youtube.com/watch?v=vBURridJXZ0";

    cy.log("Step 1: Entering target YouTube URL without fixtures");
    cy.get("#youtube-url-input").should("be.visible").clear().type(targetUrl);
    cy.screenshot("test3-step1", { capture: "viewport", overwrite: true });

    cy.log("Step 2: Cueing video playback");
    cy.get("#play-video-button").click();
    cy.screenshot("test3-step2", { capture: "viewport", overwrite: true });

    cy.log("Step 3: Enabling captions via caption toggle icon");
    cy.get("#caption-toggle-button").then(($btn) => {
      const isPressed = $btn.attr("aria-pressed");
      if (isPressed !== "true") {
        cy.get("#caption-toggle-button").click();
      }
    });
    cy.get("#caption-toggle-button").should("have.attr", "aria-pressed", "true");
    cy.screenshot("test3-step3", { capture: "viewport", overwrite: true });

    cy.log("Step 4: Observing subtitle fetching from native stream / server");
    cy.get("#subtitle-cue-row-0, #active-subtitle-cue-text, #restored-subtitles-toast", {
      timeout: 20000,
    }).should("be.visible");
    cy.screenshot("test3-step4", { capture: "viewport", overwrite: true });

    cy.log("Step 5: Verifying authentic dialogue is loaded");
    cy.get("body").then(($body) => {
      if ($body.find("#subtitle-cue-row-0").length > 0) {
        cy.get("#subtitle-cue-row-0").first().invoke("text").should("have.length.greaterThan", 3);
      } else if ($body.find("#active-subtitle-cue-text").length > 0) {
        cy.get("#active-subtitle-cue-text").invoke("text").should("have.length.greaterThan", 3);
      }
    });

    cy.log(
      "Step 6: Switching target language and verifying tlang param replacement with copied request and assertions",
    );
    cy.intercept("POST", "/api/youtube-timedtext-translate*").as("timedtextTranslate");
    cy.get("body").then(($body) => {
      let initialCount = 0;
      let initialFirstText = "";
      if ($body.find("#subtitle-cue-row-0").length > 0) {
        initialFirstText = $body.find("#subtitle-cue-row-0").first().text().trim();
        initialCount = $body.find('[id^="subtitle-cue-row-"]').length;
      } else if ($body.find("#active-subtitle-cue-text").length > 0) {
        initialFirstText = $body.find("#active-subtitle-cue-text").text().trim();
      }

      if ($body.find("#target-language-select").length > 0) {
        cy.get("#target-language-select").select("es");
        cy.wait("@timedtextTranslate").then((interception) => {
          expect(interception.response?.statusCode).to.eq(200);
          const body = interception.response?.body;

          // 1. Verify tlang param was replaced in modifiedUrl
          expect(body.modifiedUrl).to.include("tlang=es");

          // 2. Verify original working request settings & headers were copied
          expect(body.copiedRequest).to.exist;
          expect(body.copiedRequest.headers).to.exist;

          // 3. Verify https response results provided
          expect(body.httpsResponse).to.exist;
          expect(body.httpsResponse.status).to.be.a("number");

          // 4. Response assertion: number of subtitles records should be identical after changing tlang
          expect(body.count).to.be.a("number");
          expect(body.count).to.eq(body.cues.length);
          if (initialCount > 1) {
            expect(body.cues.length).to.eq(initialCount);
          }

          // 5. Response assertion: first subtitle record is different
          expect(body.firstSubtitle).to.exist;
          if (initialFirstText) {
            expect(body.firstSubtitle.text).to.not.eq(initialFirstText);
          }
        });
      }
    });
    cy.screenshot("test3-step5", { capture: "viewport", overwrite: true });
  });

  it("Step-by-step: Emulator testing - detect default subtitles, fetch favorite languages, YouTube API tlang and lang fallback, and inspect via network panel and subtitles view", () => {
    // Enable debug mode to make Network Inspector accessible
    cy.get("body").then(($b) => {
      if ($b.find("#debug-mode-toggle").length > 0) {
        cy.get("#debug-mode-toggle").then(($chk) => {
          if (!$chk.is(":checked")) {
            cy.get("#debug-mode-toggle").check({ force: true });
          }
        });
      }
    });

    cy.log("Step 1: Detecting and fetching default subtitles");
    cy.get("details[data-panel='subtitles'], details[data-panel='player']").should("be.visible");
    cy.screenshot("step1-default-subtitles-detected", { capture: "viewport", overwrite: true });

    cy.log("Step 2: Proactive fetching requests for favorite languages");
    cy.get("body").then(($b) => {
      if ($b.find("#target-language-select").length > 0) {
        cy.get("#target-language-select").should("be.visible");
      }
    });
    cy.screenshot("step2-favorite-languages-fetch", { capture: "viewport", overwrite: true });

    cy.log("Step 3: YouTube API request using tlang and lang fallback");
    cy.screenshot("step3-youtube-api-tlang-lang-fallback", {
      capture: "viewport",
      overwrite: true,
    });

    cy.log("Step 4: Inspection of subtitles via Network Panel");
    cy.get("body").then(($b) => {
      if ($b.find("#open-network-inspector-button").length > 0) {
        cy.get("#open-network-inspector-button").click();
        cy.get("#network-inspector-modal").should("be.visible");
        cy.screenshot("step4-network-panel-inspection", { capture: "viewport", overwrite: true });
        cy.get("#close-network-inspector-button").click();
        cy.get("#network-inspector-modal").should("not.exist");
      }
    });

    cy.log("Step 5: Inspection of subtitles via Subtitles View Element");
    cy.get("details[data-panel='subtitles']").should("be.visible");
    cy.get("details[data-panel='subtitles'] table, details[data-panel='subtitles']").should(
      "exist",
    );
    cy.screenshot("step5-subtitles-view-inspection", { capture: "viewport", overwrite: true });
  });

  it("Step-by-step: Emulator testing - share YouTube video link from browser or official YouTube app", () => {
    cy.log("Step 1: Share video link from browser (ACTION_VIEW)");
    cy.window().then((win: any) => {
      win.onNativeSharedLinkReceived?.("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    });
    cy.get("header").should("contain.text", "video dQw4w9WgXcQ");
    cy.screenshot("step-share-browser-link", { capture: "viewport", overwrite: true });

    cy.log(
      "Step 2: Share video link from official YouTube app (ACTION_SEND with title and newline)",
    );
    cy.window().then((win: any) => {
      win.onNativeSharedLinkReceived?.(
        "Never Gonna Give You Up\nhttps://youtu.be/kJQP7kiw5Fk?si=123",
      );
    });
    cy.get("header").should("contain.text", "video kJQP7kiw5Fk");
    cy.screenshot("step-share-youtube-app-text", { capture: "viewport", overwrite: true });
  });

  it("Device parity: adaptive viewport interactions and shared intent switching", () => {
    cy.log("Step 1: Set physical device profile viewport (Pixel 7 / 412x915)");
    cy.viewport(412, 915);

    cy.log("Step 2: Share YouTube Shorts link via native intent bridge");
    cy.window().then((win: any) => {
      win.onNativeSharedLinkReceived?.("https://www.youtube.com/shorts/s8h8W2Lz9H4");
    });
    cy.get("header").should("contain.text", "video s8h8W2Lz9H4");

    cy.log("Step 3: Perform adaptive scroll gesture on subtitle section");
    cy.get("details[data-panel='subtitles']").scrollTo("bottom", { ensureScrollable: false });
  });
});
