package com.ytviewer.app

import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.os.Environment
import android.os.Handler
import android.os.Looper
import android.util.Base64
import android.util.Log
import android.view.View
import android.webkit.ConsoleMessage
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.webkit.CookieManager
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
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

/**
 * Custom WebView that prevents Chromium from suspending or pausing media playback
 * when the app moves to the background or screen turns off.
 * Overriding onWindowVisibilityChanged to always supply View.VISIBLE keeps the internal
 * media engine, timers, and playback pipeline continuously active.
 */
open class BackgroundPlayableWebView(context: Context) : WebView(context) {
    override fun onWindowVisibilityChanged(visibility: Int) {
        super.onWindowVisibilityChanged(View.VISIBLE)
    }
}

/**
 * Android Native Shell Activity
 * Intercepts YouTube caption HTTP requests (youtube.com/api/timedtext)
 * via WebViewClient.shouldInterceptRequest, reads raw XML/JSON3 bytes,
 * saves to local disk, bridges raw data back into the web view,
 * and provides native Android TextToSpeech (TTS) capabilities.
 */
class MainActivity : AppCompatActivity(), TextToSpeech.OnInitListener {

    private lateinit var webView: BackgroundPlayableWebView
    private val okHttpClient = OkHttpClient.Builder()
        .connectTimeout(5, TimeUnit.SECONDS)
        .readTimeout(7, TimeUnit.SECONDS)
        .writeTimeout(5, TimeUnit.SECONDS)
        .callTimeout(10, TimeUnit.SECONDS)
        .build()
    // Link-only client: no cookie jar, no captured headers (like pasting the URL in a browser)
    private val anonHttpClient = OkHttpClient.Builder()
        .connectTimeout(5, TimeUnit.SECONDS)
        .readTimeout(7, TimeUnit.SECONDS)
        .writeTimeout(5, TimeUnit.SECONDS)
        .callTimeout(10, TimeUnit.SECONDS)
        .build()
    private val ioExecutor = Executors.newSingleThreadExecutor()
    private val networkExecutor = Executors.newFixedThreadPool(2)
    private val anonUserAgent = "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36"
    private val mainHandler = Handler(Looper.getMainLooper())
    private var textToSpeech: TextToSpeech? = null
    @Volatile
    private var isTtsReady: Boolean = false
    @Volatile
    private var isTtsInitializing: Boolean = false
    private data class PendingSpeakRequest(
        val text: String,
        val lang: String,
        val rate: Float,
        val utteranceId: String,
    )
    @Volatile
    private var pendingSpeakRequest: PendingSpeakRequest? = null
    @Volatile
    private var isBackgroundAudioEnabled: Boolean = false
    @Volatile
    private var lastObservedTimedTextUrl: String? = null
    private val lastObservedHeaders = java.util.concurrent.ConcurrentHashMap<String, String>()

    private fun getSanitizedBrowserUserAgent(targetUrl: String? = null): String {
        return try {
            val ua = webView.settings.userAgentString
            if (!ua.isNullOrBlank()) {
                // Strip '; wv' and 'Version/X.X' so Google does not classify it as an embedded webview
                ua.replace("; wv", "").replace(Regex("Version/\\d+\\.\\d+\\s*"), "")
            } else {
                buildFallbackBrowserUserAgent(targetUrl)
            }
        } catch (e: Exception) {
            buildFallbackBrowserUserAgent(targetUrl)
        }
    }

    private fun buildFallbackBrowserUserAgent(targetUrl: String? = null): String {
        val model = android.os.Build.MODEL ?: "Pixel 8"
        val osVer = android.os.Build.VERSION.RELEASE ?: "14"
        return "Mozilla/5.0 (Linux; Android $osVer; $model) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Mobile Safari/537.36"
    }

    companion object {
        private const val TAG = "YT_CAPTION_INTERCEPTOR"
        private const val LOCAL_ASSET_DOMAIN = "appassets.androidplatform.net"
        private const val PREFS_LOCAL_STORAGE_BACKUP = "yt_viewer_localstorage_backup"
        private const val KEY_LOCAL_STORAGE_SNAPSHOT = "local_storage_snapshot_v1"
        private const val LOCAL_STORAGE_BACKUP_FILENAME = "localstorage_backup.json"

        @Volatile
        var instance: MainActivity? = null
            private set
    }

    private fun getInternalLocalStorageBackupFile(): File {
        return File(filesDir, LOCAL_STORAGE_BACKUP_FILENAME)
    }

    private fun getExternalLocalStorageBackupFile(): File? {
        return try {
            val docsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOCUMENTS)
            if (docsDir != null) {
                File(File(docsDir, "YouTubeViewer"), LOCAL_STORAGE_BACKUP_FILENAME)
            } else {
                null
            }
        } catch (ignored: Exception) {
            null
        }
    }

    private fun extractSnapshotUpdatedAt(rawJson: String): Long {
        return try {
            JSONObject(rawJson).optLong("updatedAt", 0L)
        } catch (ignored: Exception) {
            0L
        }
    }

    private fun isValidSnapshotJson(raw: String?): Boolean {
        if (raw.isNullOrBlank()) return false
        val trimmed = raw.trim()
        if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) return false
        return try {
            val obj = JSONObject(trimmed)
            val entries = obj.optJSONObject("entries")
            (entries != null && entries.length() > 0) || obj.length() > 0
        } catch (ignored: Exception) {
            false
        }
    }

    fun persistLocalStorageSnapshot(snapshotJson: String): Boolean {
        if (!isValidSnapshotJson(snapshotJson)) return false
        var savedAny = false
        try {
            val prefs = getSharedPreferences(PREFS_LOCAL_STORAGE_BACKUP, Context.MODE_PRIVATE)
            if (prefs.edit().putString(KEY_LOCAL_STORAGE_SNAPSHOT, snapshotJson).commit()) {
                savedAny = true
            }
        } catch (e: Exception) {
            Log.w(TAG, "Failed saving localStorage snapshot to SharedPreferences: ${e.message}")
        }
        try {
            val internalFile = getInternalLocalStorageBackupFile()
            val tempFile = File(filesDir, "$LOCAL_STORAGE_BACKUP_FILENAME.tmp")
            tempFile.writeText(snapshotJson, StandardCharsets.UTF_8)
            if (internalFile.exists()) internalFile.delete()
            if (tempFile.renameTo(internalFile) || internalFile.apply { writeText(snapshotJson, StandardCharsets.UTF_8) }.exists()) {
                savedAny = true
            }
        } catch (e: Exception) {
            Log.w(TAG, "Failed saving localStorage snapshot to filesDir: ${e.message}")
        }
        try {
            val extFile = getExternalLocalStorageBackupFile()
            if (extFile != null) {
                extFile.parentFile?.mkdirs()
                extFile.writeText(snapshotJson, StandardCharsets.UTF_8)
            }
        } catch (ignored: Exception) {
            // Best-effort external Documents mirror for Android <= 10 or permitted devices
        }
        return savedAny
    }

    fun loadBestLocalStorageSnapshot(): String {
        val candidates = mutableListOf<String>()
        try {
            val internalFile = getInternalLocalStorageBackupFile()
            if (internalFile.exists() && internalFile.canRead()) {
                val content = internalFile.readText(StandardCharsets.UTF_8)
                if (isValidSnapshotJson(content)) candidates.add(content)
            }
        } catch (e: Exception) {
            Log.w(TAG, "Failed reading internal localStorage backup file: ${e.message}")
        }
        try {
            val prefs = getSharedPreferences(PREFS_LOCAL_STORAGE_BACKUP, Context.MODE_PRIVATE)
            val prefVal = prefs.getString(KEY_LOCAL_STORAGE_SNAPSHOT, null)
            if (isValidSnapshotJson(prefVal)) candidates.add(prefVal!!)
        } catch (e: Exception) {
            Log.w(TAG, "Failed reading localStorage backup from SharedPreferences: ${e.message}")
        }
        try {
            val extFile = getExternalLocalStorageBackupFile()
            if (extFile != null && extFile.exists() && extFile.canRead()) {
                val content = extFile.readText(StandardCharsets.UTF_8)
                if (isValidSnapshotJson(content)) candidates.add(content)
            }
        } catch (ignored: Exception) {
            // External Documents mirror unreadable on scoped storage after UID change
        }
        if (candidates.isEmpty()) return ""
        val best = candidates.maxByOrNull { extractSnapshotUpdatedAt(it) } ?: candidates.first()
        persistLocalStorageSnapshot(best)
        return best
    }

    private fun clearOtaCacheOnApkUpgrade() {
        try {
            val prefs = getSharedPreferences("app_version_tracking", Context.MODE_PRIVATE)
            val lastRunVersionCode = prefs.getLong("last_run_version_code", -1L)
            val pInfo = packageManager.getPackageInfo(packageName, 0)
            val currentVersionCode = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.P) {
                pInfo.longVersionCode
            } else {
                @Suppress("DEPRECATION")
                pInfo.versionCode.toLong()
            }

            if (currentVersionCode > lastRunVersionCode) {
                Log.i(TAG, "Native APK upgraded ($lastRunVersionCode -> $currentVersionCode). Invalidating stale OTA cache.")
                val otaDir = java.io.File(filesDir, "app_updates")
                if (otaDir.exists()) {
                    val deleted = otaDir.deleteRecursively()
                    Log.i(TAG, "Successfully purged stale OTA cache directory: ${otaDir.absolutePath} (result=$deleted)")
                }
                prefs.edit().putLong("last_run_version_code", currentVersionCode).apply()
            }
        } catch (e: Exception) {
            Log.w(TAG, "Error checking or clearing OTA cache on upgrade: ${e.message}")
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        instance = this

        // Automatic OTA cache invalidation on native upgrade
        clearOtaCacheOnApkUpgrade()

        webView = BackgroundPlayableWebView(this)
        setContentView(webView)

        // Ensure BackgroundAudioService is initialized for continuous background playback, notification, and wake lock
        try {
            BackgroundAudioService.startService(this)
        } catch (e: Exception) {
            Log.w(TAG, "Could not auto-start BackgroundAudioService in onCreate: ${e.message}")
        }

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
            isTtsInitializing = true
            textToSpeech = TextToSpeech(this, this)
        } catch (e: Exception) {
            isTtsInitializing = false
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
                if (url.contains("youtube.com/api/timedtext") || url.contains("/timedtext?")) {
                    Log.i(TAG, "=== INTERCEPTED YOUTUBE CAPTION REQUEST ===")
                    Log.i(TAG, "URL: $url")
                    Log.i(TAG, "Method: ${request?.method}")

                    // Retain observed timedtext request URL and headers for native translation repetition
                    lastObservedTimedTextUrl = url
                    request?.requestHeaders?.let { h ->
                        lastObservedHeaders.clear()
                        lastObservedHeaders.putAll(h)
                    }

                    try {
                        // Replicate the request with original headers
                        val requestBuilder = Request.Builder().url(url)
                        request?.requestHeaders?.forEach { (key, value) ->
                            requestBuilder.addHeader(key, value)
                        }

                        val response = okHttpClient.newCall(requestBuilder.build()).execute()
                        val rawBodyBytes = response.body?.bytes() ?: ByteArray(0)
                        val rawBodyString = String(rawBodyBytes, StandardCharsets.UTF_8)
                        val contentType = response.header("Content-Type", "text/xml; charset=utf-8") ?: "text/xml"
                        val requestKind = if (android.net.Uri.parse(url).getQueryParameter("tlang").isNullOrBlank()) "default" else "translated"
                        val targetLang = android.net.Uri.parse(url).getQueryParameter("tlang") ?: android.net.Uri.parse(url).getQueryParameter("lang")
                        val langSuffix = if (requestKind == "translated" && !targetLang.isNullOrBlank()) " lang=$targetLang" else ""

                        Log.i(TAG, "Received ${rawBodyBytes.size} bytes of raw caption data.")
                        Log.i(TAG, "SUBTITLE_FETCH kind=$requestKind$langSuffix http=${response.code} bytes=${rawBodyBytes.size} cues=${countCaptionCues(rawBodyString)}")

                        // 1. Save raw caption to device storage and dispatch to JS
                        if (response.isSuccessful && isValidJsonSubtitle(rawBodyString)) {
                            saveCaptionToFile(url, rawBodyBytes)
                            dispatchToJavaScript(url, rawBodyString, contentType, response.code)
                        } else if (response.isSuccessful) {
                            Log.i(TAG, "Intercepted non-JSON3 caption (${contentType}). Fetching json3 format automatically for URL: $url")
                            val uri = android.net.Uri.parse(url)
                            val lang = uri.getQueryParameter("lang")?.takeIf { it.isNotBlank() } ?: "en"
                            val json3Body = this@MainActivity.executeTimedTextRepetition(url, lang, "json3")
                            if (json3Body.isNotBlank() && isValidJsonSubtitle(json3Body)) {
                                val json3Url = if (url.contains("fmt=")) url.replace(Regex("fmt=[^&]+"), "fmt=json3") else "$url&fmt=json3"
                                saveCaptionToFile(json3Url, json3Body.toByteArray(StandardCharsets.UTF_8))
                                dispatchToJavaScript(json3Url, json3Body, "application/json; charset=utf-8", 200)
                                Log.i(TAG, "Successfully fetched and dispatched json3 default subtitles to JS (bytes=${json3Body.length}).")
                            } else {
                                Log.w(TAG, "Automatic json3 repetition did not yield valid subtitles for $url")
                            }
                        } else {
                            Log.w(TAG, "Skipping cache and JS dispatch for caption request because response is invalid or HTTP error (code=${response.code}, url=$url)")
                        }

                        // 2. Return response stream to WebView so YouTube player displays it smoothly
                        return WebResourceResponse(
                            contentType.split(";")[0].trim(),
                            "UTF-8",
                            ByteArrayInputStream(rawBodyBytes)
                        )
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
                            "Cache-Control" to "no-cache, no-store, must-revalidate",
                            "Pragma" to "no-cache",
                            "Expires" to "0"
                        )
                        return WebResourceResponse(mimeType, "UTF-8", 200, "OK", headers, inputStream)
                    } catch (e: Exception) {
                        // Fallback 1: if it's an extensionless SPA route or starts with app/, serve index.html
                        if (!assetPath.contains(".") || assetPath.startsWith("app/")) {
                            try {
                                val indexStream = assets.open("index.html")
                                return WebResourceResponse("text/html", "UTF-8", 200, "OK", mapOf("Access-Control-Allow-Origin" to "*"), indexStream)
                            } catch (ignored: Exception) {}
                        }
                        val loaderResponse = assetLoader.shouldInterceptRequest(request!!.url)
                        if (loaderResponse != null) return loaderResponse

                        Log.w(TAG, "Local asset unavailable ($assetPath): ${e.message}")

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
        val querySuffix = buildQuerySuffix(sharedText).ifEmpty { "?v=vBURridJXZ0&android=true" }
        val initialVideoId = extractYouTubeVideoId(sharedText) ?: "vBURridJXZ0"

        // Load the application exclusively from local bundled web assets
        Log.i(TAG, "Loading local offline web assets from https://$LOCAL_ASSET_DOMAIN/index.html$querySuffix")
        webView.loadUrl("https://$LOCAL_ASSET_DOMAIN/index.html$querySuffix")

        // Handle any shared intent that opened the app
        handleSharedIntent(intent)

        // Proactively detect and present subtitles in realtime for the target video
        proactiveDetectSubtitles(initialVideoId)

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

        val sharedText = extractSharedText(intent)
        if (!sharedText.isNullOrBlank()) {
            val querySuffix = buildQuerySuffix(sharedText)
            Log.i(TAG, "Navigating to shared URL via local asset domain: https://$LOCAL_ASSET_DOMAIN/index.html$querySuffix")
            val sharedDemoUri = extractDemoShareUri(sharedText)
            if (sharedDemoUri != null) {
                val targetVideoId = extractYouTubeVideoId(sharedText) ?: "vBURridJXZ0"
                lastObservedTimedTextUrl = null
                lastObservedHeaders.clear()
                webView.loadUrl("https://$LOCAL_ASSET_DOMAIN/index.html$querySuffix")
                proactiveDetectSubtitles(targetVideoId)
                return
            }
            val target = extractYouTubeVideoId(sharedText) ?: sharedText
            val targetVideoId = extractYouTubeVideoId(sharedText) ?: "vBURridJXZ0"
            lastObservedTimedTextUrl = null
            lastObservedHeaders.clear()
            proactiveDetectSubtitles(targetVideoId)
            val jsCode = """
                (function() {
                    var link = ${JSONObject.quote(target)};
                    if (typeof window.onNativeSharedLinkReceived === 'function') {
                        window.onNativeSharedLinkReceived(link);
                        return "handled";
                    } else {
                        window.__pendingSharedLink = link;
                        return "pending";
                    }
                })();
            """.trimIndent()
            webView.evaluateJavascript(jsCode) { result ->
                val cleanResult = result?.replace("\"", "")?.trim()
                Log.i(TAG, "Shared link dispatch result: $cleanResult (target: $target)")
            }
        }
    }

    private fun extractSharedText(intent: Intent?): String? {
        if (intent == null) return null
        val candidates = mutableListOf<String>()
        try {
            intent.getCharSequenceExtra(Intent.EXTRA_TEXT)?.toString()?.let(candidates::add)
            intent.getStringExtra(Intent.EXTRA_SUBJECT)?.let(candidates::add)
        } catch (e: Exception) {
            Log.w(TAG, "Unable to read shared text extras: ${e.message}")
        }

        val clipData = intent.clipData
        if (clipData != null && clipData.itemCount > 0) {
            for (index in 0 until clipData.itemCount) {
                val item = clipData.getItemAt(index)
                item.text?.toString()?.let(candidates::add)
                item.uri?.toString()?.let(candidates::add)
            }
        }

        val dataString = intent.dataString ?: intent.data?.toString()
        dataString?.let(candidates::add)

        return candidates.firstOrNull { extractDemoShareUri(it) != null }?.trim()
            ?: candidates.firstOrNull { it.isNotBlank() }?.trim()
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
        if (rawText.isNullOrBlank() || rawText.trim() == "null" || rawText.trim() == "undefined") {
            return ""
        }
        val sharedDemoUri = extractDemoShareUri(rawText)
        if (sharedDemoUri != null) {
            val query = sharedDemoUri.encodedQuery.orEmpty()
            val completeQuery = when {
                query.isEmpty() -> "android=true"
                sharedDemoUri.getQueryParameterNames().contains("android") -> query
                else -> "$query&android=true"
            }
            return "?$completeQuery"
        }
        val videoId = extractYouTubeVideoId(rawText)
        return when {
            !videoId.isNullOrBlank() -> "?v=$videoId&android=true"
            else -> "?url=" + android.net.Uri.encode(rawText) + "&android=true"
        }
    }

    private fun extractDemoShareUri(rawText: String?): android.net.Uri? {
        if (rawText.isNullOrBlank()) return null
        return Regex("https?://[^\\s<>]+", RegexOption.IGNORE_CASE)
            .findAll(rawText)
            .mapNotNull { match ->
                android.net.Uri.parse(match.value.trimEnd('.', ',', ';', ':', ')', ']', '}'))
            }
            .firstOrNull { uri ->
                uri.host.equals("mostuf2556.github.io", ignoreCase = true) &&
                    uri.path?.trimEnd('/') == "/subtitle-sync"
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

    private fun isValidJsonSubtitle(body: String): Boolean {
        if (body.isBlank()) return false
        val trimmed = body.trim()
        if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) return false
        return try {
            val obj = JSONObject(trimmed)
            val events = obj.optJSONArray("events") ?: return false
            if (events.length() == 0) return false
            (0 until events.length()).any { i ->
                val event = events.optJSONObject(i) ?: return@any false
                val segs = event.optJSONArray("segs")
                if (segs != null && segs.length() > 0) {
                    (0 until segs.length()).any { s ->
                        !segs.optJSONObject(s)?.optString("utf8").isNullOrBlank()
                    }
                } else {
                    false
                }
            }
        } catch (ignored: Exception) {
            false
        }
    }

    private fun saveCaptionToFile(url: String, data: ByteArray) {
        val bodyString = String(data, StandardCharsets.UTF_8)
        if (!isValidJsonSubtitle(bodyString)) {
            Log.w(TAG, "Not caching caption because response is not valid JSON with subtitle cues: $url")
            return
        }
        try {
            val targetBaseDir = getExternalFilesDir(null) ?: filesDir
            val dir = File(targetBaseDir, "youtube_captions")
            if (!dir.exists()) dir.mkdirs()
            val filename = "caption_${System.currentTimeMillis()}.json"
            val file = File(dir, filename)
            FileOutputStream(file).use { it.write(data) }
            Log.i(TAG, "Saved valid JSON caption to: ${file.absolutePath}")
        } catch (e: Exception) {
            Log.e(TAG, "Error saving file: ${e.message}")
        }
    }

    private fun countCaptionCues(rawData: String): Int {
        if (rawData.isBlank()) return 0
        val trimmed = rawData.trim()
        if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) return 0
        return try {
            val events = JSONObject(trimmed).optJSONArray("events") ?: return 0
            (0 until events.length()).count { eventIndex ->
                val segments = events.optJSONObject(eventIndex)?.optJSONArray("segs") ?: return@count false
                (0 until segments.length()).any { segmentIndex ->
                    !segments.optJSONObject(segmentIndex)?.optString("utf8").isNullOrBlank()
                }
            }
        } catch (ignored: Exception) {
            0
        }
    }

    private fun extractCaptionSampleText(rawData: String, maxCues: Int = 10): String {
        if (rawData.isBlank()) return ""
        val trimmed = rawData.trim()
        if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) return ""
        return try {
            val events = JSONObject(trimmed).optJSONArray("events") ?: return ""
            val texts = mutableListOf<String>()
            for (i in 0 until events.length()) {
                val segs = events.optJSONObject(i)?.optJSONArray("segs") ?: continue
                val cueText = StringBuilder()
                for (j in 0 until segs.length()) {
                    val s = segs.optJSONObject(j)?.optString("utf8") ?: ""
                    cueText.append(s)
                }
                val line = cueText.toString().trim()
                if (line.isNotBlank() && line != "\n") {
                    texts.add(line.replace("\n", " "))
                    if (texts.size >= maxCues) break
                }
            }
            texts.joinToString(" | ")
        } catch (ignored: Exception) {
            ""
        }
    }

    private fun dispatchToJavaScript(url: String, rawData: String, contentType: String, status: Int) {
        val uri = try { android.net.Uri.parse(url) } catch (exception: Exception) { null }
        val lang = uri?.getQueryParameter("tlang") ?: uri?.getQueryParameter("lang") ?: "unknown"
        val cuesCount = countCaptionCues(rawData)
        val sampleText = extractCaptionSampleText(rawData)
        if (cuesCount > 0 && sampleText.isNotBlank()) {
            Log.i(TAG, "AUTHENTIC_CAPTIONS_EXPOSED lang=$lang cues=$cuesCount sample=\"$sampleText\"")
            try {
                val targetBaseDir = getExternalFilesDir(null) ?: filesDir
                val textFile = File(targetBaseDir, "authentic_captions_exposed.txt")
                textFile.writeText("lang=$lang\ncues=$cuesCount\ntext=$sampleText\n")
            } catch (ignored: Exception) {}
        }
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

                // Execute in WebView with fallback early buffering
                val script = """
                    (function() {
                        if (typeof window.onNativeCaptionsInterceptedBase64 === 'function') {
                            window.onNativeCaptionsInterceptedBase64('$base64Payload');
                        } else {
                            window.__earlyInterceptedCaptions = window.__earlyInterceptedCaptions || [];
                            window.__earlyInterceptedCaptions.push('$base64Payload');
                            console.log('[CaptionInterceptor] Early caption buffered for delayed processing');
                        }
                    })();
                """.trimIndent()
                webView.evaluateJavascript(script, null)
            } catch (e: Exception) {
                Log.e(TAG, "Error evaluating JS bridge: ${e.message}")
            }
        }
    }

    private fun proactiveDetectSubtitles(videoId: String) {
        if (videoId.isBlank()) return
        Thread {
            try {
                Thread.sleep(1200)
                if (lastObservedTimedTextUrl != null) return@Thread

                val testUrls = listOf(
                    "https://www.youtube.com/api/timedtext?v=$videoId&fmt=json3",
                    "https://www.youtube.com/api/timedtext?v=$videoId&lang=en&fmt=json3",
                    "https://www.youtube.com/api/timedtext?v=$videoId&lang=es&fmt=json3"
                )

                for (url in testUrls) {
                    try {
                        val req = Request.Builder()
                            .url(url)
                            .header("User-Agent", "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 Chrome/125.0.0.0 Mobile Safari/537.36")
                            .header("Referer", "https://www.youtube.com/")
                            .header("Origin", "https://www.youtube.com")
                            .build()
                        val resp = okHttpClient.newCall(req).execute()
                        if (resp.isSuccessful) {
                            val body = resp.body?.string() ?: ""
                            if (isValidJsonSubtitle(body)) {
                                val bytes = body.toByteArray(StandardCharsets.UTF_8)
                                lastObservedTimedTextUrl = url
                                Log.i(TAG, "SUBTITLE_FETCH kind=default http=200 bytes=${bytes.size} cues=${countCaptionCues(body)}")
                                saveCaptionToFile(url, bytes)
                                dispatchToJavaScript(url, body, "application/json", 200)
                                break
                            } else {
                                Log.w(TAG, "Proactive detect response for $url was non-JSON3 or bad response (bytes=${body.length})")
                            }
                        }
                    } catch (ignored: Exception) {}
                }
            } catch (e: Exception) {
                Log.w(TAG, "proactiveDetectSubtitles failed: ${e.message}")
            }
        }.start()
    }

    private fun resolveTtsLocale(lang: String): Locale {
        val cleanLang = lang.trim().replace("_", "-")
        return when {
            cleanLang.equals("en", ignoreCase = true) -> Locale.ENGLISH
            cleanLang.equals("es", ignoreCase = true) -> Locale("es", "ES")
            cleanLang.equals("fr", ignoreCase = true) -> Locale.FRENCH
            cleanLang.equals("de", ignoreCase = true) -> Locale.GERMAN
            cleanLang.equals("it", ignoreCase = true) -> Locale.ITALIAN
            cleanLang.equals("pt", ignoreCase = true) || cleanLang.equals("pt-br", ignoreCase = true) -> Locale("pt", "BR")
            cleanLang.equals("ru", ignoreCase = true) -> Locale("ru", "RU")
            cleanLang.equals("ja", ignoreCase = true) -> Locale.JAPANESE
            cleanLang.equals("ko", ignoreCase = true) -> Locale.KOREAN
            cleanLang.equals("zh", ignoreCase = true) || cleanLang.equals("zh-cn", ignoreCase = true) -> Locale.SIMPLIFIED_CHINESE
            cleanLang.equals("zh-tw", ignoreCase = true) -> Locale.TRADITIONAL_CHINESE
            cleanLang.equals("ar", ignoreCase = true) -> Locale("ar")
            cleanLang.equals("he", ignoreCase = true) || cleanLang.equals("iw", ignoreCase = true) -> Locale("iw", "IL")
            cleanLang.equals("hi", ignoreCase = true) -> Locale("hi", "IN")
            cleanLang.equals("tr", ignoreCase = true) -> Locale("tr", "TR")
            cleanLang.equals("nl", ignoreCase = true) -> Locale("nl", "NL")
            cleanLang.equals("pl", ignoreCase = true) -> Locale("pl", "PL")
            cleanLang.equals("sv", ignoreCase = true) -> Locale("sv", "SE")
            cleanLang.equals("vi", ignoreCase = true) -> Locale("vi", "VN")
            cleanLang.equals("th", ignoreCase = true) -> Locale("th", "TH")
            cleanLang.equals("el", ignoreCase = true) -> Locale("el", "GR")
            cleanLang.equals("uk", ignoreCase = true) -> Locale("uk", "UA")
            cleanLang.contains("-") -> Locale.forLanguageTag(cleanLang)
            else -> Locale(cleanLang)
        }
    }

    private fun dispatchNativeTtsError(utteranceId: String, message: String) {
        val uidLiteral = JSONObject.quote(utteranceId)
        val msgLiteral = JSONObject.quote(message)
        mainHandler.post {
            webView.evaluateJavascript("if (window.onNativeTTSError) { window.onNativeTTSError($uidLiteral, $msgLiteral); }", null)
        }
    }

    private fun executeNativeSpeak(text: String, lang: String, rate: Float, utteranceId: String) {
        mainHandler.post {
            try {
                val tts = textToSpeech
                if (tts == null || !isTtsReady) {
                    dispatchNativeTtsError(utteranceId, "TTS engine not ready")
                    return@post
                }
                val cleanLang = lang.trim().replace("_", "-")
                val locale = resolveTtsLocale(lang)

                var res = tts.setLanguage(locale)
                if (res == TextToSpeech.LANG_MISSING_DATA || res == TextToSpeech.LANG_NOT_SUPPORTED) {
                    if (cleanLang.lowercase().startsWith("he") || cleanLang.lowercase().startsWith("iw")) {
                        res = tts.setLanguage(Locale("iw", "IL"))
                        if (res == TextToSpeech.LANG_MISSING_DATA || res == TextToSpeech.LANG_NOT_SUPPORTED) {
                            res = tts.setLanguage(Locale("he"))
                        }
                    } else if (cleanLang.lowercase().startsWith("id") || cleanLang.lowercase().startsWith("in")) {
                        res = tts.setLanguage(Locale("in", "ID"))
                    } else if (cleanLang.contains("-")) {
                        val baseCode = cleanLang.split("-")[0]
                        res = tts.setLanguage(Locale(baseCode))
                    }
                }

                tts.setSpeechRate(rate)
                val params = Bundle()
                val speakResult = tts.speak(text, TextToSpeech.QUEUE_FLUSH, params, utteranceId)
                if (speakResult != TextToSpeech.SUCCESS) {
                    Log.w(TAG, "textToSpeech.speak failed with code $speakResult, notifying error")
                    dispatchNativeTtsError(utteranceId, "Speak code: $speakResult")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error speaking text with native TTS: ${e.message}", e)
                dispatchNativeTtsError(utteranceId, e.message ?: "Native TTS speak exception")
            }
        }
    }

    override fun onInit(status: Int) {
        isTtsInitializing = false
        if (status == TextToSpeech.SUCCESS) {
            isTtsReady = true
            try {
                val audioAttributes = android.media.AudioAttributes.Builder()
                    .setUsage(android.media.AudioAttributes.USAGE_MEDIA)
                    .setContentType(android.media.AudioAttributes.CONTENT_TYPE_SPEECH)
                    .build()
                textToSpeech?.setAudioAttributes(audioAttributes)
            } catch (e: Exception) {
                Log.w(TAG, "Could not set audio attributes for TextToSpeech: ${e.message}")
            }
            textToSpeech?.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
                override fun onStart(utteranceId: String?) {
                    Log.d(TAG, "Native TTS started utterance: $utteranceId")
                    if (utteranceId != null) {
                        val uidLiteral = JSONObject.quote(utteranceId)
                        mainHandler.post {
                            webView.evaluateJavascript("if (window.onNativeTTSStart) { window.onNativeTTSStart($uidLiteral); }", null)
                        }
                    }
                }

                override fun onDone(utteranceId: String?) {
                    Log.d(TAG, "Native TTS finished utterance: $utteranceId")
                    if (utteranceId != null) {
                        val uidLiteral = JSONObject.quote(utteranceId)
                        mainHandler.post {
                            webView.evaluateJavascript("if (window.onNativeTTSDone) { window.onNativeTTSDone($uidLiteral); }", null)
                        }
                    }
                }

                @Deprecated("Deprecated in Java")
                override fun onError(utteranceId: String?) {
                    Log.e(TAG, "Native TTS error on utterance: $utteranceId")
                    if (utteranceId != null) {
                        dispatchNativeTtsError(utteranceId, "TTS execution error")
                    }
                }

                override fun onError(utteranceId: String?, errorCode: Int) {
                    Log.e(TAG, "Native TTS error on utterance: $utteranceId (code: $errorCode)")
                    if (utteranceId != null) {
                        dispatchNativeTtsError(utteranceId, "Error code: $errorCode")
                    }
                }
            })
            Log.i(TAG, "Android TextToSpeech engine initialized successfully")
            val pending = pendingSpeakRequest
            pendingSpeakRequest = null
            if (pending != null) {
                Log.i(TAG, "Flushing queued native TTS utterance after cold init: ${pending.utteranceId}")
                executeNativeSpeak(pending.text, pending.lang, pending.rate, pending.utteranceId)
            }
        } else {
            Log.e(TAG, "Failed to initialize Android TextToSpeech, status=$status")
            isTtsReady = false
            val pending = pendingSpeakRequest
            pendingSpeakRequest = null
            if (pending != null) {
                dispatchNativeTtsError(pending.utteranceId, "TTS init failed: $status")
            }
        }
    }

    fun stopNativeTTS() {
        pendingSpeakRequest = null
        mainHandler.post {
            try {
                textToSpeech?.stop()
            } catch (e: Exception) {
                Log.e(TAG, "Error stopping native TTS: ${e.message}", e)
            }
        }
    }

    override fun onPause() {
        super.onPause()
        if (!isBackgroundAudioEnabled) {
            // When background audio is disabled, pausing the application pauses both video and TTS-play
            dispatchMediaCommand("pause", 0L)
            stopNativeTTS()
        }
        try {
            val flushScript = """
                (function() {
                    try {
                        if (window.AndroidNativeShell && window.AndroidNativeShell.saveLocalStorageBackup && window.localStorage && window.localStorage.length > 0) {
                            var entries = {};
                            for (var i = 0; i < window.localStorage.length; i++) {
                                var k = window.localStorage.key(i);
                                if (k) entries[k] = window.localStorage.getItem(k);
                            }
                            window.AndroidNativeShell.saveLocalStorageBackup(JSON.stringify({ version: 1, updatedAt: Date.now(), entries: entries }));
                        }
                    } catch (e) {}
                })();
            """.trimIndent()
            webView.evaluateJavascript(flushScript, null)
        } catch (ignored: Exception) {}
        Log.d(TAG, "onPause: maintaining webView active for background playback, bgEnabled=$isBackgroundAudioEnabled")
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
        if (instance == this) {
            instance = null
        }
        try {
            textToSpeech?.stop()
            textToSpeech?.shutdown()
        } catch (e: Exception) {
            Log.e(TAG, "Error shutting down TTS: ${e.message}")
        }
        super.onDestroy()
    }

    fun dispatchMediaCommand(action: String, data: Long = 0L) {
        if (action == "pause" || action == "stop") {
            stopNativeTTS()
        }
        mainHandler.post {
            val js = "if (typeof window !== 'undefined' && window.onNativeMediaCommand) { window.onNativeMediaCommand('$action', $data); }"
            webView.evaluateJavascript(js, null)
        }
    }

    /**
     * JS Interface exposed to window.AndroidNativeShell
     */
    inner class AndroidNativeBridge(private val context: Context) {
        @JavascriptInterface
        fun isNativeShell(): Boolean = true

        @JavascriptInterface
        fun setBackgroundAudioEnabled(enabled: Boolean): Boolean {
            isBackgroundAudioEnabled = enabled
            mainHandler.post {
                if (enabled) {
                    BackgroundAudioService.startService(this@MainActivity)
                } else {
                    BackgroundAudioService.stopService(this@MainActivity)
                }
            }
            return true
        }

        @JavascriptInterface
        fun saveLocalStorageBackup(snapshotJson: String): Boolean {
            if (snapshotJson.isBlank()) return false
            ioExecutor.execute {
                this@MainActivity.persistLocalStorageSnapshot(snapshotJson)
            }
            return true
        }

        @JavascriptInterface
        fun readLocalStorageBackup(): String {
            return this@MainActivity.loadBestLocalStorageSnapshot()
        }

        @JavascriptInterface
        fun updateMediaMetadata(title: String, artist: String, isPlaying: Boolean, positionMs: Long, durationMs: Long): Boolean {
            mainHandler.post {
                val service = BackgroundAudioService.currentService
                if (service != null) {
                    service.updateState(title, artist, isPlaying, positionMs, durationMs)
                } else if (isPlaying) {
                    val intent = Intent(this@MainActivity, BackgroundAudioService::class.java).apply {
                        action = BackgroundAudioService.ACTION_UPDATE_STATE
                        putExtra("title", title)
                        putExtra("artist", artist)
                        putExtra("isPlaying", isPlaying)
                        putExtra("positionMs", positionMs)
                        putExtra("durationMs", durationMs)
                    }
                    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                        startForegroundService(intent)
                    } else {
                        startService(intent)
                    }
                }
            }
            return true
        }

        @JavascriptInterface
        fun getAppVersionName(): String {
            return try {
                val pInfo = context.packageManager.getPackageInfo(context.packageName, 0)
                pInfo.versionName ?: ""
            } catch (e: Exception) {
                ""
            }
        }

        @JavascriptInterface
        fun getAppVersionCode(): Long {
            return try {
                val pInfo = context.packageManager.getPackageInfo(context.packageName, 0)
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.P) {
                    pInfo.longVersionCode
                } else {
                    @Suppress("DEPRECATION")
                    pInfo.versionCode.toLong()
                }
            } catch (e: Exception) {
                0L
            }
        }

        @JavascriptInterface
        fun getInstalledAppInfo(): String {
            return try {
                val pInfo = context.packageManager.getPackageInfo(context.packageName, 0)
                val vCode = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.P) {
                    pInfo.longVersionCode
                } else {
                    @Suppress("DEPRECATION")
                    pInfo.versionCode.toLong()
                }
                val obj = org.json.JSONObject()
                obj.put("packageName", context.packageName)
                obj.put("versionName", pInfo.versionName ?: "")
                obj.put("versionCode", vCode)
                obj.toString()
            } catch (e: Exception) {
                "{}"
            }
        }

        @JavascriptInterface
        fun clearOtaCache(): Boolean {
            return try {
                val otaDir = java.io.File(context.filesDir, "app_updates")
                if (otaDir.exists()) {
                    val deleted = otaDir.deleteRecursively()
                    Log.i(TAG, "Manual OTA cache clear requested via bridge: success=$deleted")
                    deleted
                } else {
                    true
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error clearing OTA cache via bridge: ${e.message}", e)
                false
            }
        }

        @JavascriptInterface
        fun showToast(message: String) {
            mainHandler.post {
                Toast.makeText(context, message, Toast.LENGTH_SHORT).show()
            }
        }

        @JavascriptInterface
        fun isTtsReady(): Boolean {
            return isTtsReady && textToSpeech != null
        }

        @JavascriptInterface
        fun speak(text: String, lang: String, rate: Float, utteranceId: String): Boolean {
            if (textToSpeech == null && !isTtsInitializing) {
                try {
                    isTtsInitializing = true
                    textToSpeech = TextToSpeech(context, this@MainActivity)
                } catch (e: Exception) {
                    isTtsInitializing = false
                    Log.e(TAG, "Error creating TextToSpeech on demand: ${e.message}", e)
                }
            }

            if (!isTtsReady || textToSpeech == null) {
                if (isTtsInitializing || textToSpeech != null) {
                    Log.i(TAG, "TTS still initializing; queuing utterance $utteranceId until onInit")
                    pendingSpeakRequest = PendingSpeakRequest(text, lang, rate, utteranceId)
                    return true
                }
                Log.w(TAG, "TTS requested but engine failed to initialize (isTtsReady=$isTtsReady)")
                return false
            }

            executeNativeSpeak(text, lang, rate, utteranceId)
            return true
        }

        @JavascriptInterface
        fun stopSpeaking() {
            pendingSpeakRequest = null
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
            return lastObservedTimedTextUrl ?: ""
        }

        @JavascriptInterface
        fun setLastObservedTimedTextUrl(url: String) {
            if (url.isNotEmpty()) {
                lastObservedTimedTextUrl = url
            }
        }

        @JavascriptInterface
        fun fetchTranslatedCaptions(targetLang: String, format: String): String {
            val base = lastObservedTimedTextUrl ?: return ""
            return this@MainActivity.executeTimedTextRepetition(base, targetLang, format)
        }

        /**
         * Non-blocking async variant of fetchTimedTextExact so WebView JS & menus never freeze.
         * Posts result JSON to window.__onNativeFetchTimedTextResult(requestId, resultJson).
         */
        @JavascriptInterface
        fun fetchTimedTextExactAsync(requestId: String, url: String, withSession: Boolean): Boolean {
            networkExecutor.execute {
                val resultJson = fetchTimedTextExact(url, withSession)
                val quotedId = JSONObject.quote(requestId)
                val quotedPayload = JSONObject.quote(resultJson)
                mainHandler.post {
                    try {
                        webView.evaluateJavascript(
                            "if (window.__onNativeFetchTimedTextResult) { window.__onNativeFetchTimedTextResult($quotedId, $quotedPayload); }",
                            null
                        )
                    } catch (e: Exception) {
                        Log.w(TAG, "Failed to post async timedtext result: ${e.message}")
                    }
                }
            }
            return true
        }

        /**
         * Sends exactly one timedtext URL (no rebuilding, no internal fallback loop).
         * withSession=true mirrors captured player headers/cookies; false sends the bare URL.
         * Returns JSON: {status, body, sentUrl, send, error}.
         */
        @JavascriptInterface
        fun fetchTimedTextExact(url: String, withSession: Boolean): String {
            val send = if (withSession) "session" else "anon"
            val out = org.json.JSONObject()
            out.put("sentUrl", url)
            out.put("send", send)
            try {
                val reqBuilder = Request.Builder().url(url)
                val browserUa = getSanitizedBrowserUserAgent(url)

                if (withSession) {
                    lastObservedHeaders.forEach { (k, v) ->
                        if (!k.equals("accept-encoding", ignoreCase = true)) reqBuilder.addHeader(k, v)
                    }
                    // Ensure cookies are attached if missing from intercepted request headers
                    try {
                        val hasCookieHeader = lastObservedHeaders.keys.any { it.equals("cookie", ignoreCase = true) }
                        if (!hasCookieHeader) {
                            val cookies = CookieManager.getInstance().getCookie("https://www.youtube.com")
                                ?: CookieManager.getInstance().getCookie(url)
                            if (!cookies.isNullOrBlank()) {
                                reqBuilder.header("Cookie", cookies)
                            }
                        }
                    } catch (ignored: Exception) {}
                    // Strip WebView flags from session User-Agent if present
                    val sessionUa = lastObservedHeaders["user-agent"] ?: lastObservedHeaders["User-Agent"]
                    if (sessionUa != null && (sessionUa.contains("; wv") || sessionUa.contains("Version/"))) {
                        reqBuilder.header("User-Agent", sessionUa.replace("; wv", "").replace(Regex("Version/\\d+\\.\\d+\\s*"), ""))
                    }
                } else {
                    // Link-only anon mode: replicate real Chrome mobile navigation profile & client hints
                    reqBuilder.header("User-Agent", browserUa)
                    reqBuilder.header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7")
                    reqBuilder.header("Accept-Language", Locale.getDefault().toLanguageTag() + ",en;q=0.9")
                    reqBuilder.header("Sec-Fetch-Dest", "document")
                    reqBuilder.header("Sec-Fetch-Mode", "navigate")
                    reqBuilder.header("Sec-Fetch-Site", "none")
                    reqBuilder.header("Sec-Fetch-User", "?1")
                    reqBuilder.header("Upgrade-Insecure-Requests", "1")

                    val chromeMajorMatch = Regex("Chrome/(\\d+)").find(browserUa)
                    val chromeMajor = chromeMajorMatch?.groupValues?.get(1) ?: "133"
                    reqBuilder.header("sec-ch-ua", "\"Chromium\";v=\"$chromeMajor\", \"Google Chrome\";v=\"$chromeMajor\", \"Not=A?Brand\";v=\"24\"")
                    reqBuilder.header("sec-ch-ua-mobile", "?1")
                    reqBuilder.header("sec-ch-ua-platform", "\"Android\"")
                    val model = android.os.Build.MODEL
                    if (!model.isNullOrBlank()) {
                        reqBuilder.header("sec-ch-ua-model", "\"$model\"")
                    }
                }

                val client = if (withSession) okHttpClient else anonHttpClient
                client.newCall(reqBuilder.build()).execute().use { resp ->
                    val body = resp.body?.string() ?: ""
                    out.put("status", resp.code)
                    out.put("body", body)
                    if (resp.code == 429) {
                        out.put("error", "HTTP 429 (Too Many Requests / Bot Detection)")
                    } else if (resp.code !in 200..299) {
                        out.put("error", "HTTP ${resp.code}")
                    }
                    val lang = android.net.Uri.parse(url).getQueryParameter("tlang") ?: android.net.Uri.parse(url).getQueryParameter("lang")
                    val mode = if (android.net.Uri.parse(url).getQueryParameter("tlang").isNullOrBlank()) "lang" else "tlang"
                    Log.i(TAG, "SUBTITLE_FETCH kind=exact lang=$lang mode=$mode send=$send http=${resp.code} bytes=${body.toByteArray(StandardCharsets.UTF_8).size} cues=${countCaptionCues(body)}")
                }
            } catch (e: Exception) {
                out.put("status", 0)
                out.put("body", "")
                out.put("error", e.message ?: "network error")
                Log.w(TAG, "SUBTITLE_FETCH kind=exact send=$send http=0 error=${e.message}")
            }
            return out.toString()
        }

        @JavascriptInterface
        fun openInBrowser(url: String): Boolean {
            return try {
                val intent = Intent(Intent.ACTION_VIEW, android.net.Uri.parse(url))
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                context.startActivity(intent)
                true
            } catch (e: Exception) {
                Log.e(TAG, "Failed to open external browser: ${e.message}")
                false
            }
        }

        @JavascriptInterface
        fun shareText(text: String, title: String = "Share Subtitles Link"): Boolean {
            return try {
                val sendIntent = Intent().apply {
                    action = Intent.ACTION_SEND
                    putExtra(Intent.EXTRA_TEXT, text)
                    type = "text/plain"
                }
                val shareIntent = Intent.createChooser(sendIntent, title)
                shareIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                context.startActivity(shareIntent)
                Log.i(TAG, "Triggered native Android share intent for subtitles text/link: $text")
                true
            } catch (e: Exception) {
                Log.e(TAG, "Failed to share text via Android native bridge: ${e.message}", e)
                false
            }
        }

        @JavascriptInterface
        fun shareSubtitlesUrl(url: String, title: String = "Share Subtitles Link"): Boolean {
            return shareText(url, title)
        }

        @JavascriptInterface
        fun fetchTranslatedCaptionsWithUrl(customUrl: String, targetLang: String, format: String): String {
            val base = if (customUrl.isNotEmpty()) customUrl else (lastObservedTimedTextUrl ?: "")
            if (base.isEmpty()) return ""
            return this@MainActivity.executeTimedTextRepetition(base, targetLang, format)
        }
    }

    fun executeTimedTextRepetition(base: String, targetLang: String, format: String): String {
        return try {
            val uri = android.net.Uri.parse(base)
            val originalLang = uri.getQueryParameter("lang")?.takeIf { it.isNotBlank() } ?: "en"
            val baseHasTlang = uri.getQueryParameter("tlang")?.isNotBlank() == true
            val baseHasReplacedLang = !baseHasTlang && uri.getQueryParameter("lang")?.equals(targetLang, ignoreCase = true) == true

            fun buildRepetitionUrl(mode: String): String {
                val queryParamNames = uri.queryParameterNames
                val builder = uri.buildUpon().clearQuery()
                for (name in queryParamNames) {
                    val isLang = name.equals("lang", ignoreCase = true)
                    val isTlang = name.equals("tlang", ignoreCase = true)
                    val isFmt = name.equals("fmt", ignoreCase = true) && format.isNotEmpty()
                    if (!isLang && !isTlang && !isFmt) {
                        for (value in uri.getQueryParameters(name)) {
                            builder.appendQueryParameter(name, value)
                        }
                    }
                }
                if (mode == "lang") {
                    builder.appendQueryParameter("lang", targetLang)
                } else {
                    builder.appendQueryParameter("lang", originalLang)
                    if (!originalLang.equals(targetLang, ignoreCase = true)) {
                        builder.appendQueryParameter("tlang", targetLang)
                    }
                }
                if (format.isNotEmpty()) {
                    builder.appendQueryParameter("fmt", format)
                }
                return builder.build().toString()
            }

            // Determine primary mode: if incoming URL replaced lang without tlang, try lang first, else tlang first
            val modes = if (baseHasReplacedLang) {
                listOf("lang", "tlang")
            } else {
                listOf("tlang", "lang")
            }

            for (mode in modes) {
                val targetUrl = buildRepetitionUrl(mode)
                Log.i(TAG, "Native Shell timedtext request ($mode) for targetLang=$targetLang, fmt=$format: $targetUrl")
                val reqBuilder = Request.Builder().url(targetUrl)
                lastObservedHeaders.forEach { (k, v) ->
                    // Exclude Accept-Encoding so OkHttp handles transparent decompression
                    if (!k.equals("accept-encoding", ignoreCase = true)) {
                        reqBuilder.addHeader(k, v)
                    }
                }
                try {
                    val resp = okHttpClient.newCall(reqBuilder.build()).execute()
                    if (resp.isSuccessful) {
                        val bodyString = resp.body?.string() ?: ""
                        if (isValidJsonSubtitle(bodyString)) {
                            Log.i(TAG, "SUBTITLE_FETCH kind=translated lang=$targetLang mode=$mode http=${resp.code} bytes=${bodyString.toByteArray(StandardCharsets.UTF_8).size} cues=${countCaptionCues(bodyString)}")
                            return bodyString
                        } else {
                            Log.w(TAG, "Timedtext response for mode=$mode was invalid JSON (bytes=${bodyString.length}). Falling back to alternative option...")
                        }
                    } else {
                        Log.w(TAG, "Timedtext request for mode=$mode failed with http=${resp.code}. Falling back to alternative option...")
                    }
                } catch (netErr: Exception) {
                    Log.w(TAG, "Timedtext request error for mode=$mode: ${netErr.message}. Falling back...")
                }
            }
            ""
        } catch (e: Exception) {
            Log.e(TAG, "Error fetching native translated captions: ${e.message}", e)
            ""
        }
    }
}
