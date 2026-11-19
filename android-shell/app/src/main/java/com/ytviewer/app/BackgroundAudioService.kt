package com.ytviewer.app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.support.v4.media.MediaMetadataCompat
import android.support.v4.media.session.MediaSessionCompat
import android.support.v4.media.session.PlaybackStateCompat
import androidx.core.app.NotificationCompat
import androidx.media.app.NotificationCompat.MediaStyle

class BackgroundAudioService : Service() {

    companion object {
        const val CHANNEL_ID = "media_playback_channel"
        const val NOTIFICATION_ID = 1001

        const val ACTION_PLAY = "com.ytviewer.app.ACTION_PLAY"
        const val ACTION_PAUSE = "com.ytviewer.app.ACTION_PAUSE"
        const val ACTION_NEXT = "com.ytviewer.app.ACTION_NEXT"
        const val ACTION_PREV = "com.ytviewer.app.ACTION_PREV"
        const val ACTION_STOP = "com.ytviewer.app.ACTION_STOP"
        const val ACTION_UPDATE_STATE = "com.ytviewer.app.ACTION_UPDATE_STATE"

        var currentService: BackgroundAudioService? = null
            private set

        fun startService(context: Context) {
            val intent = Intent(context, BackgroundAudioService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun stopService(context: Context) {
            val intent = Intent(context, BackgroundAudioService::class.java)
            context.stopService(intent)
        }
    }

    private var mediaSession: MediaSessionCompat? = null
    private var wakeLock: PowerManager.WakeLock? = null
    private var isPlaying = false
    private var mediaTitle = "YouTube Parallel Subtitles"
    private var mediaArtist = "Audio Track Playback"
    private var currentPositionMs = 0L
    private var totalDurationMs = 0L

    private var audioManager: AudioManager? = null
    private var audioFocusRequest: AudioFocusRequest? = null

    private val audioFocusChangeListener = AudioManager.OnAudioFocusChangeListener { focusChange ->
        when (focusChange) {
            AudioManager.AUDIOFOCUS_LOSS,
            AudioManager.AUDIOFOCUS_LOSS_TRANSIENT,
            AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK -> {
                // Do not call handlePause() here: WebView Chromium's internal AudioFocusDelegate
                // and Android TextToSpeech share this process and reclaim focus whenever video
                // or TTS playback starts/resumes, which previously caused self-eviction pauses
                // ("Paused via system media controls"). Explicit pauses use ACTION_PAUSE / MediaSession.
            }
            AudioManager.AUDIOFOCUS_GAIN -> {
                // Maintain current playback state without re-triggering spurious transport commands
            }
        }
    }

    private fun requestAudioFocus(): Boolean {
        audioManager = getSystemService(Context.AUDIO_SERVICE) as? AudioManager
        val am = audioManager ?: return false

        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val playbackAttributes = AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_MEDIA)
                .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH or AudioAttributes.CONTENT_TYPE_MUSIC)
                .build()

            val focusRequest = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
                .setAudioAttributes(playbackAttributes)
                .setAcceptsDelayedFocusGain(true)
                .setOnAudioFocusChangeListener(audioFocusChangeListener)
                .build()

            audioFocusRequest = focusRequest
            am.requestAudioFocus(focusRequest) == AudioManager.AUDIOFOCUS_REQUEST_GRANTED
        } else {
            @Suppress("DEPRECATION")
            am.requestAudioFocus(
                audioFocusChangeListener,
                AudioManager.STREAM_MUSIC,
                AudioManager.AUDIOFOCUS_GAIN
            ) == AudioManager.AUDIOFOCUS_REQUEST_GRANTED
        }
    }

    private fun abandonAudioFocus() {
        val am = audioManager ?: return
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                audioFocusRequest?.let { am.abandonAudioFocusRequest(it) }
            } else {
                @Suppress("DEPRECATION")
                am.abandonAudioFocus(audioFocusChangeListener)
            }
        } catch (_: Exception) {}
    }

    override fun onCreate() {
        super.onCreate()
        currentService = this

        val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "YouTubeViewer:MediaWakeLock")
        wakeLock?.acquire(24 * 60 * 60 * 1000L) // 24 hours max safety timeout

        createNotificationChannel()
        initMediaSession()
        requestAudioFocus()

        val notification = buildNotification()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK)
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_PLAY -> handlePlay()
            ACTION_PAUSE -> handlePause()
            ACTION_NEXT -> handleNext()
            ACTION_PREV -> handlePrev()
            ACTION_STOP -> handleStop()
            ACTION_UPDATE_STATE -> {
                val title = intent.getStringExtra("title")
                val artist = intent.getStringExtra("artist")
                val playing = intent.getBooleanExtra("isPlaying", isPlaying)
                val pos = intent.getLongExtra("positionMs", currentPositionMs)
                val dur = intent.getLongExtra("durationMs", totalDurationMs)
                updateState(title, artist, playing, pos, dur)
            }
        }
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        super.onDestroy()
        currentService = null
        abandonAudioFocus()
        try {
            if (wakeLock?.isHeld == true) {
                wakeLock?.release()
            }
        } catch (_: Exception) {}

        mediaSession?.isActive = false
        mediaSession?.release()
        mediaSession = null
        stopForeground(STOP_FOREGROUND_REMOVE)
    }

    private fun initMediaSession() {
        mediaSession = MediaSessionCompat(this, "BackgroundAudioService").apply {
            setFlags(MediaSessionCompat.FLAG_HANDLES_MEDIA_BUTTONS or MediaSessionCompat.FLAG_HANDLES_TRANSPORT_CONTROLS)
            setCallback(object : MediaSessionCompat.Callback() {
                override fun onPlay() {
                    handlePlay()
                }

                override fun onPause() {
                    handlePause()
                }

                override fun onSkipToNext() {
                    handleNext()
                }

                override fun onSkipToPrevious() {
                    handlePrev()
                }

                override fun onStop() {
                    handleStop()
                }

                override fun onSeekTo(pos: Long) {
                    MainActivity.instance?.dispatchMediaCommand("seek", pos)
                }
            })
            isActive = true
        }
    }

    fun updateState(title: String?, artist: String?, playing: Boolean, pos: Long, dur: Long) {
        if (!title.isNullOrBlank()) mediaTitle = title
        if (!artist.isNullOrBlank()) mediaArtist = artist
        isPlaying = playing
        currentPositionMs = pos
        totalDurationMs = dur

        // Update MediaSession Metadata
        val metadata = MediaMetadataCompat.Builder()
            .putString(MediaMetadataCompat.METADATA_KEY_TITLE, mediaTitle)
            .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, mediaArtist)
            .putLong(MediaMetadataCompat.METADATA_KEY_DURATION, totalDurationMs)
            .build()
        mediaSession?.setMetadata(metadata)

        // Update Playback State
        val stateActions = PlaybackStateCompat.ACTION_PLAY or
                PlaybackStateCompat.ACTION_PAUSE or
                PlaybackStateCompat.ACTION_PLAY_PAUSE or
                PlaybackStateCompat.ACTION_SKIP_TO_NEXT or
                PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS or
                PlaybackStateCompat.ACTION_SEEK_TO

        val playbackState = PlaybackStateCompat.Builder()
            .setActions(stateActions)
            .setState(
                if (isPlaying) PlaybackStateCompat.STATE_PLAYING else PlaybackStateCompat.STATE_PAUSED,
                currentPositionMs,
                1.0f
            )
            .build()
        mediaSession?.setPlaybackState(playbackState)

        // Refresh Notification
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(NOTIFICATION_ID, buildNotification())
    }

    private fun handlePlay() {
        requestAudioFocus()
        isPlaying = true
        MainActivity.instance?.dispatchMediaCommand("play", 0L)
        updateState(mediaTitle, mediaArtist, true, currentPositionMs, totalDurationMs)
    }

    private fun handlePause() {
        isPlaying = false
        MainActivity.instance?.stopNativeTTS()
        MainActivity.instance?.dispatchMediaCommand("pause", 0L)
        updateState(mediaTitle, mediaArtist, false, currentPositionMs, totalDurationMs)
    }

    private fun handleNext() {
        MainActivity.instance?.dispatchMediaCommand("next_section", 0L)
    }

    private fun handlePrev() {
        MainActivity.instance?.dispatchMediaCommand("prev_section", 0L)
    }

    private fun handleStop() {
        MainActivity.instance?.stopNativeTTS()
        MainActivity.instance?.dispatchMediaCommand("stop", 0L)
        stopSelf()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Media Playback",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Background audio streaming and lockscreen transport controls"
                setShowBadge(false)
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
            }
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }

    private fun buildNotification(): Notification {
        val contentIntent = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
            },
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val prevIntent = PendingIntent.getService(
            this,
            1,
            Intent(this, BackgroundAudioService::class.java).apply { action = ACTION_PREV },
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val playPauseIntent = PendingIntent.getService(
            this,
            2,
            Intent(this, BackgroundAudioService::class.java).apply {
                action = if (isPlaying) ACTION_PAUSE else ACTION_PLAY
            },
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val nextIntent = PendingIntent.getService(
            this,
            3,
            Intent(this, BackgroundAudioService::class.java).apply { action = ACTION_NEXT },
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val stopIntent = PendingIntent.getService(
            this,
            4,
            Intent(this, BackgroundAudioService::class.java).apply { action = ACTION_STOP },
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val playPauseIcon = if (isPlaying) {
            android.R.drawable.ic_media_pause
        } else {
            android.R.drawable.ic_media_play
        }

        val playPauseTitle = if (isPlaying) "Pause" else "Play"

        val style = MediaStyle()
            .setMediaSession(mediaSession?.sessionToken)
            .setShowActionsInCompactView(0, 1, 2)

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(mediaTitle)
            .setContentText(mediaArtist)
            .setSubText("Parallel Subtitles")
            .setSmallIcon(android.R.drawable.ic_media_play)
            .setContentIntent(contentIntent)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOngoing(isPlaying)
            .addAction(android.R.drawable.ic_media_previous, "Previous", prevIntent)
            .addAction(playPauseIcon, playPauseTitle, playPauseIntent)
            .addAction(android.R.drawable.ic_media_next, "Next", nextIntent)
            .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Close", stopIntent)
            .setStyle(style)
            .build()
    }
}
