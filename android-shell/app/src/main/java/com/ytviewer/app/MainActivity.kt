package com.ytviewer.app

import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Base64
import android.util.Log
import android.webkit.ConsoleMessage
import android.webkit.CookieManager
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.webkit.WebViewAssetLoader
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.io.ByteArrayInputStream
import java.io.File
import java.io.FileOutputStream
import java.nio.charset.StandardCharsets
import java.util.Locale

/**
 * Android Native Shell Activity
 * Intercepts YouTube caption HTTP requests (youtube.com/api/timedtext)
 * via WebViewClient.shouldInterceptRequest, reads raw XML/JSON3 bytes,
 * saves to local disk, bridges raw data back into the web view,
 * and provides native Android TextToSpeech (TTS) capabilities.
 */
class MainActivity : AppCompatActivity(), TextToSpeech.OnInitListener {

    private lateinit var webView: WebView
    private val okHttpClient = OkHttpClient.Builder().build()
    private val mainHandler = Handler(Looper.getMainLooper())
    private var textToSpeech: TextToSpeech? = null
    private var isTtsReady: Boolean = false
    @Volatile
    private var observedTimedTextRequest: TimedTextReplay? = null

    companion object {
        private const val TAG = "YT_CAPTION_INTERCEPTOR"
        private const val LOCAL_ASSET_DOMAIN = "appassets.androidplatform.net"
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        webView = WebView(this)
        setContentView(webView)

        // Dark background prevents white flash during page transitions
        webView.setBackgroundColor(Color.parseColor("#0f0f12"))

        // Enable remote debugging via chrome://inspect
        WebView.setWebContentsDebuggingEnabled(true)

        // Configure WebView settings for YouTube video playback and JS execution
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            mediaPlaybackRequiresUserGesture = false
            allowFileAccess = true
            allowContentAccess = true
            useWideViewPort = true
            loadWithOverviewMode = true
            mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            userAgentString = userAgentString.replace("; wv", "") // optimize for web video
        }

        // Setup AssetLoader for bundled local web assets
        val assetLoader = WebViewAssetLoader.Builder()
            .setDomain("appassets.androidplatform.net")
            .addPathHandler("/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        // Initialize Android TextToSpeech engine
        try {
            textToSpeech = TextToSpeech(this, this)
        } catch (e: Exception) {
            Log.e(TAG, "Error creating TextToSpeech: ${e.message}", e)
        }

        // Add JavaScript Interface for bidirectional communication
        webView.addJavascriptInterface(AndroidNativeBridge(this), "AndroidNativeShell")

        webView.webChromeClient = object : WebChromeClient() {
            override fun onConsoleMessage(consoleMessage: ConsoleMessage?): Boolean {
                Log.d("WebViewConsole", "${consoleMessage?.message()} [${consoleMessage?.sourceId()}:${consoleMessage?.lineNumber()}]")
                return true
            }
        }

        webView.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(
                view: WebView?,
                request: WebResourceRequest?
            ): WebResourceResponse? {
                val url = request?.url.toString()
                val host = request?.url?.host
                val path = request?.url?.path ?: ""

                // 1. Intercept YouTube caption endpoint
                if (TimedTextReplay.isCaptionUrl(url) && request?.method == "GET") {
                    Log.i(TAG, "=== INTERCEPTED YOUTUBE CAPTION REQUEST ===")
                    Log.i(TAG, "URL: $url")
                    Log.i(TAG, "Method: ${request?.method}")

                    // Retain observed timedtext request URL and headers for native translation repetition
                    val headers = request.requestHeaders.toMutableMap()
                    if (headers.keys.none { it.equals("cookie", true) }) {
                        CookieManager.getInstance().getCookie(url)?.takeIf { it.isNotBlank() }
                            ?.let { headers["Cookie"] = it }
                    }
                    if (headers.keys.none { it.equals("user-agent", true) }) {
                        headers["User-Agent"] = view?.settings?.userAgentString ?: webView.settings.userAgentString
                    }
                    val capturedRequest = TimedTextReplay(url, headers)
                    // A translated player request must not replace the source request.
                    val isDefaultRequest =
                        TimedTextReplay.isDefault(url, observedTimedTextRequest?.url)
                    if (isDefaultRequest) observedTimedTextRequest = capturedRequest

                    try {
                        // Replicate the request with original headers
                        val requestBuilder = Request.Builder().url(url)
                        capturedRequest.decodedRequestHeaders().forEach { (key, value) ->
                            requestBuilder.addHeader(key, value)
                        }

                        okHttpClient.newCall(requestBuilder.build()).execute().use { response ->
                        val rawBodyBytes = response.body?.bytes() ?: ByteArray(0)
                        val rawBodyString = String(rawBodyBytes, StandardCharsets.UTF_8)
                        val contentType = response.header("Content-Type", "text/xml; charset=utf-8") ?: "text/xml"
                        val requestKind = if (isDefaultRequest) "default" else "translated"

                        Log.i(TAG, "Received ${rawBodyBytes.size} bytes of raw caption data.")
                        Log.i(TAG, "SUBTITLE_FETCH kind=$requestKind http=${response.code} bytes=${rawBodyBytes.size} cues=${countCaptionCues(rawBodyString)}")

                        // 1. Save raw caption to device storage
                        saveCaptionToFile(url, rawBodyBytes)

                        // 2. Dispatch captured data back into the WebView JavaScript runtime
                        dispatchToJavaScript(url, rawBodyString, contentType, response.code)

                        // 3. Return response stream to WebView so YouTube player displays it smoothly
                        return WebResourceResponse(
                            contentType.split(";")[0].trim(),
                            "UTF-8",
                            response.code,
                            response.message.ifBlank { "Caption response" },
                            response.headers.toMultimap().filterKeys {
                                !it.equals("content-encoding", true) && !it.equals("content-length", true)
                            }.mapValues { it.value.joinToString(", ") },
                            ByteArrayInputStream(rawBodyBytes)
                        )
                        }
                    } catch (e: Exception) {
                        Log.e(TAG, "Failed to intercept/fetch caption request: ${e.message}", e)
                    }
                }

                // 2. Intercept bundled web assets for offline local hosting
                if (host == LOCAL_ASSET_DOMAIN) {
                    var cleanPath = path.trim()
                    while (cleanPath.startsWith("/") || cleanPath.startsWith("./")) {
                        cleanPath = cleanPath.removePrefix("/").removePrefix("./")
                    }
                    val assetPath = if (cleanPath.isEmpty() || cleanPath == "index.html") "index.html" else cleanPath
                    try {
                        val inputStream = assets.open(assetPath)
                        val mimeType = when {
                            assetPath.endsWith(".html") -> "text/html"
                            assetPath.endsWith(".js") || assetPath.endsWith(".mjs") -> "application/javascript"
                            assetPath.endsWith(".css") -> "text/css"
                            assetPath.endsWith(".json") || assetPath.endsWith(".webmanifest") -> "application/json"
                            assetPath.endsWith(".svg") -> "image/svg+xml"
                            assetPath.endsWith(".png") -> "image/png"
                            assetPath.endsWith(".ico") -> "image/x-icon"
                            assetPath.endsWith(".woff2") -> "font/woff2"
                            else -> "application/octet-stream"
                        }
                        val headers = mapOf(
                            "Access-Control-Allow-Origin" to "*",
                            "Access-Control-Allow-Methods" to "GET, OPTIONS",
                            "Cache-Control" to "no-cache"
                        )
                        return WebResourceResponse(mimeType, "UTF-8", 200, "OK", headers, inputStream)
                    } catch (e: Exception) {
                        Log.w(TAG, "Asset not found ($assetPath): ${e.message}")
                        // Fallback 1: if it's an extensionless SPA route or starts with app/, serve index.html
                        if (!assetPath.contains(".") || assetPath.startsWith("app/")) {
                            try {
                                val indexStream = assets.open("index.html")
                                return WebResourceResponse("text/html", "UTF-8", 200, "OK", mapOf("Access-Control-Allow-Origin" to "*"), indexStream)
                            } catch (_: Exception) {}
                        }
                        val loaderResponse = assetLoader.shouldInterceptRequest(request!!.url)
                        if (loaderResponse != null) return loaderResponse

                        // If assets are completely missing from the build, show an authentic local offline error
                        val offlineHtml = """
                            <!DOCTYPE html>
                            <html>
                            <head><meta charset="utf-8"><title>Offline Asset Error</title><meta name="viewport" content="width=device-width, initial-scale=1"></head>
                            <body style="background:#0f0f12;color:#ffffff;font-family:sans-serif;padding:24px;text-align:center;">
                                <h2>Local Web Assets Not Found</h2>
                                <p style="color:#aaa;">The application was launched without bundled web assets. Please rebuild the APK with bundled assets.</p>
                            </body>
                            </html>
                        """.trimIndent()
                        return WebResourceResponse("text/html", "UTF-8", ByteArrayInputStream(offlineHtml.toByteArray(Charsets.UTF_8)))
                    }
                }

                return super.shouldInterceptRequest(view, request)
            }

            override fun shouldOverrideUrlLoading(
                view: WebView?,
                request: WebResourceRequest?
            ): Boolean {
                val uri = request?.url ?: return false
                val host = uri.host ?: ""
                // Keep internal local app assets in WebView
                if (host == LOCAL_ASSET_DOMAIN) {
                    return false
                }
                // Allow YouTube player domains to load embedded inside WebView
                if (host.contains("youtube.com") || host.contains("googlevideo.com") || host.contains("ytimg.com")) {
                    return false
                }
                // For other links, open external browser
                return try {
                    val browserIntent = Intent(Intent.ACTION_VIEW, uri)
                    startActivity(browserIntent)
                    true
                } catch (e: Exception) {
                    false
                }
            }

            override fun onReceivedError(
                view: WebView?,
                request: WebResourceRequest?,
                error: WebResourceError?
            ) {
                Log.e(TAG, "WebView error loading ${request?.url}: ${error?.description} (${error?.errorCode})")
                super.onReceivedError(view, request, error)
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                Log.i(TAG, "Page finished loading: $url")
                // Prevent YouTube player from pausing when app is moved to background or screen turns off
                val backgroundPlaybackScript = """
                    (function() {
                        try {
                            Object.defineProperty(document, 'hidden', { get: () => false, configurable: true });
                            Object.defineProperty(document, 'visibilityState', { get: () => 'visible', configurable: true });
                            window.addEventListener('visibilitychange', function(e) {
                                e.stopImmediatePropagation();
                            }, true);
                        } catch (e) {}
                    })();
                """.trimIndent()
                view?.evaluateJavascript(backgroundPlaybackScript, null)
                super.onPageFinished(view, url)
            }
        }

        // Extract shared link/deep link text from intent to pass directly as a query parameter
        val sharedText = extractSharedText(intent)
        val querySuffix = buildQuerySuffix(sharedText)

        // Load the application exclusively from local bundled web assets
        Log.i(TAG, "Loading local offline web assets from https://$LOCAL_ASSET_DOMAIN/index.html$querySuffix")
        webView.loadUrl("https://$LOCAL_ASSET_DOMAIN/index.html$querySuffix")

        // Handle any shared intent that opened the app
        handleSharedIntent(intent)

        // Handle Android hardware/gesture back navigation
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                val jsCheck = """
                    (function() {
                        if (window.__handleAndroidBack && window.__handleAndroidBack()) {
                            return "handled";
                        }
                        return "unhandled";
                    })();
                """.trimIndent()
                webView.evaluateJavascript(jsCheck) { result ->
                    val cleanResult = result?.replace("\"", "")?.trim()
                    if (cleanResult == "handled") {
                        Log.i(TAG, "Back event handled by web application")
                    } else if (webView.canGoBack()) {
                        Log.i(TAG, "Navigating back in WebView history")
                        webView.goBack()
                    } else {
                        Log.i(TAG, "No WebView back history, closing activity")
                        isEnabled = false
                        onBackPressedDispatcher.onBackPressed()
                        isEnabled = true
                    }
                }
            }
        })
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        val jsCheck = """
            (function() {
                if (window.__handleAndroidBack && window.__handleAndroidBack()) {
                    return "handled";
                }
                return "unhandled";
            })();
        """.trimIndent()
        webView.evaluateJavascript(jsCheck) { result ->
            val cleanResult = result?.replace("\"", "")?.trim()
            if (cleanResult != "handled") {
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    super.onBackPressed()
                }
            }
        }
    }

    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleSharedIntent(intent)
        
        // If app is already active, immediately navigate the WebView to the incoming video URL
        val sharedText = extractSharedText(intent)
        if (!sharedText.isNullOrBlank()) {
            val querySuffix = buildQuerySuffix(sharedText)
            Log.i(TAG, "Navigating to shared URL via local asset domain: https://$LOCAL_ASSET_DOMAIN/index.html$querySuffix")
            val target = extractYouTubeVideoId(sharedText) ?: sharedText
            val jsCode = """
                (function() {
                    var link = ${JSONObject.quote(target)};
                    if (window.onNativeSharedLinkReceived) {
                        window.onNativeSharedLinkReceived(link);
                    } else {
                        window.__pendingSharedLink = link;
                        window.location.href = "https://$LOCAL_ASSET_DOMAIN/index.html$querySuffix";
                    }
                })();
            """.trimIndent()
            webView.evaluateJavascript(jsCode) { res ->
                if (res == null || res == "null") {
                    webView.loadUrl("https://$LOCAL_ASSET_DOMAIN/index.html$querySuffix")
                }
            }
        }
    }

    private fun extractSharedText(intent: Intent?): String? {
        if (intent == null) return null
        val extraText = intent.getStringExtra(Intent.EXTRA_TEXT)
            ?: intent.getCharSequenceExtra(Intent.EXTRA_TEXT)?.toString()
            ?: intent.getStringExtra(Intent.EXTRA_SUBJECT)
        if (!extraText.isNullOrBlank()) return extraText.trim()

        val clipData = intent.clipData
        if (clipData != null && clipData.itemCount > 0) {
            val item = clipData.getItemAt(0)
            val clipText = item.text?.toString() ?: item.uri?.toString()
            if (!clipText.isNullOrBlank()) return clipText.trim()
        }

        val dataString = intent.dataString ?: intent.data?.toString()
        if (!dataString.isNullOrBlank()) return dataString.trim()

        return null
    }

    private fun extractYouTubeVideoId(input: String?): String? {
        if (input.isNullOrBlank()) return null
        val trimmed = input.trim()
        if (trimmed.matches(Regex("^[a-zA-Z0-9_-]{11}$"))) {
            return trimmed
        }
        val youtuBeMatch = Regex("(?:youtu\\.be|y2u\\.be)/([a-zA-Z0-9_-]{11})").find(trimmed)
        if (youtuBeMatch != null) return youtuBeMatch.groupValues[1]

        val watchMatch = Regex("[?&]v=([a-zA-Z0-9_-]{11})").find(trimmed)
        if (watchMatch != null) return watchMatch.groupValues[1]

        val pathMatch = Regex("/(?:shorts|embed|live|v)/([a-zA-Z0-9_-]{11})").find(trimmed)
        if (pathMatch != null) return pathMatch.groupValues[1]

        return null
    }

    private fun buildQuerySuffix(rawText: String?): String {
        if (rawText.isNullOrBlank()) return ""
        val videoId = extractYouTubeVideoId(rawText)
        return when {
            !videoId.isNullOrBlank() -> "?v=$videoId&url=" + android.net.Uri.encode(rawText)
            else -> "?url=" + android.net.Uri.encode(rawText)
        }
    }

    private fun handleSharedIntent(intent: Intent?) {
        val sharedText = extractSharedText(intent) ?: return
        val extractedId = extractYouTubeVideoId(sharedText)
        val target = extractedId ?: sharedText
        Log.i(TAG, "Received shared link from Android intent: $sharedText (target: $target)")

        mainHandler.postDelayed({
            val jsCode = """
                (function() {
                    var link = ${JSONObject.quote(target)};
                    if (window.onNativeSharedLinkReceived) {
                        window.onNativeSharedLinkReceived(link);
                    } else {
                        window.__pendingSharedLink = link;
                    }
                })();
            """.trimIndent()
            webView.evaluateJavascript(jsCode, null)
        }, 300)
    }

    private fun saveCaptionToFile(url: String, data: ByteArray) {
        try {
            val dir = File(getExternalFilesDir(null), "youtube_captions")
            if (!dir.exists()) dir.mkdirs()
            val filename = "caption_${System.currentTimeMillis()}.xml"
            val file = File(dir, filename)
            FileOutputStream(file).use { it.write(data) }
            Log.i(TAG, "Saved raw caption to: ${file.absolutePath}")
        } catch (e: Exception) {
            Log.e(TAG, "Error saving file: ${e.message}")
        }
    }

    private fun countCaptionCues(rawData: String): Int {
        try {
            val events = JSONObject(rawData).optJSONArray("events")
            if (events != null) {
                return (0 until events.length()).count { eventIndex ->
                    val segments = events.optJSONObject(eventIndex)?.optJSONArray("segs") ?: return@count false
                    (0 until segments.length()).any { segmentIndex ->
                        !segments.optJSONObject(segmentIndex)?.optString("utf8").isNullOrBlank()
                    }
                }
            }
        } catch (_: Exception) {
        }
        return Regex("<text\\b[^>]*>(.*?)</text>", RegexOption.DOT_MATCHES_ALL)
            .findAll(rawData)
            .count { it.groupValues[1].replace(Regex("<[^>]*>"), "").isNotBlank() }
    }

    private fun dispatchToJavaScript(url: String, rawData: String, contentType: String, status: Int) {
        mainHandler.post {
            try {
                // Pass as JSON object to window.onCaptionsIntercepted
                val payload = JSONObject().apply {
                    put("url", url)
                    put("status", status)
                    put("contentType", contentType)
                    put("rawData", rawData)
                    put("timestamp", System.currentTimeMillis())
                    put("bytes", rawData.toByteArray(StandardCharsets.UTF_8).size)
                    put("source", "native_webview_interceptor")
                }

                val base64Payload = Base64.encodeToString(
                    payload.toString().toByteArray(StandardCharsets.UTF_8),
                    Base64.NO_WRAP
                )

                // Execute in WebView
                val script = "if (window.onNativeCaptionsInterceptedBase64) { window.onNativeCaptionsInterceptedBase64('$base64Payload'); }"
                webView.evaluateJavascript(script, null)
            } catch (e: Exception) {
                Log.e(TAG, "Error evaluating JS bridge: ${e.message}")
            }
        }
    }

    override fun onInit(status: Int) {
        if (status == TextToSpeech.SUCCESS) {
            isTtsReady = true
            textToSpeech?.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
                override fun onStart(utteranceId: String?) {
                    Log.d(TAG, "Native TTS started utterance: $utteranceId")
                }

                override fun onDone(utteranceId: String?) {
                    Log.d(TAG, "Native TTS finished utterance: $utteranceId")
                    if (utteranceId != null) {
                        mainHandler.post {
                            webView.evaluateJavascript("if (window.onNativeTTSDone) { window.onNativeTTSDone('$utteranceId'); }", null)
                        }
                    }
                }

                @Deprecated("Deprecated in Java")
                override fun onError(utteranceId: String?) {
                    Log.e(TAG, "Native TTS error on utterance: $utteranceId")
                    if (utteranceId != null) {
                        mainHandler.post {
                            webView.evaluateJavascript("if (window.onNativeTTSError) { window.onNativeTTSError('$utteranceId', 'TTS execution error'); }", null)
                        }
                    }
                }

                override fun onError(utteranceId: String?, errorCode: Int) {
                    Log.e(TAG, "Native TTS error on utterance: $utteranceId (code: $errorCode)")
                    if (utteranceId != null) {
                        mainHandler.post {
                            webView.evaluateJavascript("if (window.onNativeTTSError) { window.onNativeTTSError('$utteranceId', 'Error code: $errorCode'); }", null)
                        }
                    }
                }
            })
            Log.i(TAG, "Android TextToSpeech engine initialized successfully")
        } else {
            Log.e(TAG, "Failed to initialize Android TextToSpeech, status=$status")
            isTtsReady = false
        }
    }

    override fun onPause() {
        super.onPause()
        // Do not pause the WebView or freeze timers
        // Keeping WebView active in onPause/onStop ensures continuous background audio playback
        // and background subtitle synthesis when the app is minimized or backgrounded.
        Log.d(TAG, "onPause: maintaining webView active for background playback")
    }

    override fun onStop() {
        super.onStop()
        // Maintain webView active in onStop for background audio and TTS
        Log.d(TAG, "onStop: maintaining webView active for background playback")
    }

    override fun onResume() {
        super.onResume()
        try {
            webView.onResume()
            webView.resumeTimers()
        } catch (e: Exception) {
            Log.w(TAG, "onResume error: ${e.message}")
        }
    }

    override fun onDestroy() {
        try {
            textToSpeech?.stop()
            textToSpeech?.shutdown()
        } catch (e: Exception) {
            Log.e(TAG, "Error shutting down TTS: ${e.message}")
        }
        super.onDestroy()
    }

    /**
     * JS Interface exposed to window.AndroidNativeShell
     */
    inner class AndroidNativeBridge(private val context: Context) {
        @JavascriptInterface
        fun isNativeShell(): Boolean = true

        @JavascriptInterface
        fun showToast(message: String) {
            mainHandler.post {
                Toast.makeText(context, message, Toast.LENGTH_SHORT).show()
            }
        }

        @JavascriptInterface
        fun speak(text: String, lang: String, rate: Float, utteranceId: String): Boolean {
            if (!isTtsReady || textToSpeech == null) {
                Log.w(TAG, "TTS requested but engine is not ready (isTtsReady=$isTtsReady)")
                return false
            }

            mainHandler.post {
                try {
                    val locale = when (lang.lowercase()) {
                        "en" -> Locale.ENGLISH
                        "es" -> Locale("es", "ES")
                        "fr" -> Locale.FRENCH
                        "de" -> Locale.GERMAN
                        "it" -> Locale.ITALIAN
                        "pt" -> Locale("pt", "PT")
                        "ru" -> Locale("ru", "RU")
                        "ja" -> Locale.JAPANESE
                        "ko" -> Locale.KOREAN
                        "zh", "zh-cn" -> Locale.SIMPLIFIED_CHINESE
                        "zh-tw" -> Locale.TRADITIONAL_CHINESE
                        "ar" -> Locale("ar")
                        "he" -> Locale("he")
                        "hi" -> Locale("hi", "IN")
                        "tr" -> Locale("tr", "TR")
                        "nl" -> Locale("nl", "NL")
                        "pl" -> Locale("pl", "PL")
                        "sv" -> Locale("sv", "SE")
                        "vi" -> Locale("vi", "VN")
                        "th" -> Locale("th", "TH")
                        "el" -> Locale("el", "GR")
                        "uk" -> Locale("uk", "UA")
                        else -> Locale(lang)
                    }

                    textToSpeech?.language = locale
                    textToSpeech?.setSpeechRate(rate)
                    val params = Bundle()
                    textToSpeech?.speak(text, TextToSpeech.QUEUE_FLUSH, params, utteranceId)
                } catch (e: Exception) {
                    Log.e(TAG, "Error speaking text with native TTS: ${e.message}", e)
                }
            }
            return true
        }

        @JavascriptInterface
        fun stopSpeaking() {
            mainHandler.post {
                try {
                    textToSpeech?.stop()
                } catch (e: Exception) {
                    Log.e(TAG, "Error stopping native TTS: ${e.message}", e)
                }
            }
        }

        @JavascriptInterface
        fun isSpeaking(): Boolean {
            return textToSpeech?.isSpeaking ?: false
        }

        @JavascriptInterface
        fun getLastObservedTimedTextUrl(): String {
            return observedTimedTextRequest?.url ?: ""
        }

        @JavascriptInterface
        fun setLastObservedTimedTextUrl(url: String) {
            // A JS-provided URL has no associated browser headers/cookies. Only
            // interception may replace the request snapshot.
            if (url != observedTimedTextRequest?.url) Log.w(TAG, "Ignoring uncaptured caption URL")
        }

        @JavascriptInterface
        fun fetchTranslatedCaptions(targetLang: String, format: String): String {
            val base = observedTimedTextRequest?.url ?: return ""
            return executeTimedTextRepetition(base, targetLang, format)
        }

        @JavascriptInterface
        fun fetchTranslatedCaptionsWithUrl(customUrl: String, targetLang: String, format: String): String {
            val base = if (customUrl.isNotEmpty()) customUrl else (observedTimedTextRequest?.url ?: "")
            if (base.isEmpty()) return ""
            return executeTimedTextRepetition(base, targetLang, format)
        }

        private fun executeTimedTextRepetition(base: String, targetLang: String, format: String): String {
            return try {
                val captured = observedTimedTextRequest ?: return ""
                if (!captured.matchesVideo(base)) {
                    Log.w(TAG, "No matching captured request for translated captions")
                    return ""
                }
                // Keep fmt and every signed/player parameter unchanged. The web parser
                // supports JSON3 and XML, so changing fmt is unnecessary.
                val targetUrl = captured.translatedUrl(targetLang)
                Log.i(TAG, "Native Shell repeating observed timedtext request for targetLang=$targetLang, fmt=$format: $targetUrl")
                val reqBuilder = Request.Builder().url(targetUrl)

                captured.decodedRequestHeaders().forEach { (k, v) ->
                    reqBuilder.addHeader(k, v)
                }

                okHttpClient.newCall(reqBuilder.build()).execute().use { resp ->
                if (resp.isSuccessful) {
                    val bodyString = resp.body?.string() ?: ""
                    Log.i(TAG, "SUBTITLE_FETCH kind=translated lang=$targetLang http=${resp.code} bytes=${bodyString.toByteArray(StandardCharsets.UTF_8).size} cues=${countCaptionCues(bodyString)}")
                    bodyString
                } else {
                    Log.w(TAG, "SUBTITLE_FETCH kind=translated lang=$targetLang http=${resp.code} bytes=0 cues=0")
                    ""
                }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error fetching native translated captions: ${e.message}", e)
                ""
            }
        }
    }
}
