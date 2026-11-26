package app.gymplanner.android;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.SystemClock;
import android.provider.Settings;
import android.util.Log;
import androidx.core.app.NotificationCompat;
import androidx.core.app.ServiceCompat;

/**
 * Servicio en primer plano que coordina:
 * 1) La pastilla flotante superior cuando sales a Google o YouTube.
 * 2) La notificación en curso con cronómetro nativo en cuenta atrás (+15 s / Saltar).
 * 3) La alarma exacta y el aviso sonoro (con audio ducking) al llegar a 0:00.
 */
public final class RestTimerService extends Service {

    private static final String TAG = "RestTimerService";

    public static final int NOTIF_ONGOING_ID = 4101;
    public static final int NOTIF_DONE_ID = 4102;
    private static final int ALARM_REQUEST_CODE = 4103;

    public static final String CHANNEL_ONGOING = "gym_rest_timer_ongoing";
    public static final String CHANNEL_DONE = "gym_rest_timer_done";

    public static final String ACTION_START = "app.gymplanner.android.REST_START";
    public static final String ACTION_UPDATE = "app.gymplanner.android.REST_UPDATE";
    public static final String ACTION_ADD_15 = "app.gymplanner.android.REST_ADD_15";
    public static final String ACTION_PAUSE = "app.gymplanner.android.REST_PAUSE";
    public static final String ACTION_RESUME = "app.gymplanner.android.REST_RESUME";
    public static final String ACTION_SKIP = "app.gymplanner.android.REST_SKIP";
    public static final String ACTION_STOP = "app.gymplanner.android.REST_STOP";
    public static final String ACTION_APP_VISIBILITY = "app.gymplanner.android.REST_APP_VISIBILITY";
    public static final String ACTION_COMPLETE = "app.gymplanner.android.REST_COMPLETE";
    public static final String ACTION_RESET_PILL_POS = "app.gymplanner.android.REST_RESET_PILL_POS";

    public static final String EXTRA_END_AT_MS = "end_at_ms";
    public static final String EXTRA_PAUSED_LEFT_MS = "paused_left_ms";
    public static final String EXTRA_TOTAL_SEC = "total_sec";
    public static final String EXTRA_EXERCISE_NAME = "exercise_name";
    public static final String EXTRA_SET_LABEL = "set_label";
    public static final String EXTRA_SESSION_ID = "session_id";
    public static final String EXTRA_SESSION_URL = "session_url";
    public static final String EXTRA_FORCE_OVERLAY = "force_overlay";
    public static final String EXTRA_FOREGROUND = "foreground";
    public static final String EXTRA_FROM_FGS = "from_fgs";

    private static final long TICK_MS = 250L;
    private static final long FINISHED_FLASH_MS = 6000L;

    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private RestOverlayController overlay;
    private RestAudioPlayer audioPlayer;
    private boolean foregroundStarted = false;
    private boolean completionHandled = false;

    private final Runnable tickRunnable = new Runnable() {
        @Override
        public void run() {
            if (!RestTimerState.isActive()) {
                return;
            }
            if (RestTimerState.isPaused()) {
                syncOverlayVisibility();
                return;
            }
            long remainingMs = RestTimerState.getRemainingMs();
            if (remainingMs <= 0L) {
                handleComplete();
                return;
            }
            syncOverlayVisibility();
            mainHandler.postDelayed(this, TICK_MS);
        }
    };

    private final Runnable finishDismissRunnable = () -> {
        if (!RestTimerState.isActive()) {
            if (overlay != null) overlay.hide();
            stopServiceCleanly();
        }
    };

    @Override
    public void onCreate() {
        super.onCreate();
        ensureChannels(this);
        audioPlayer = new RestAudioPlayer();
        overlay = new RestOverlayController(
            this,
            new RestOverlayController.Callbacks() {
                @Override
                public void onAdd15() {
                    handleAdd15(true);
                }

                @Override
                public void onSkip() {
                    handleStop(true);
                }

                @Override
                public void onOpenApp() {
                    openMainApp(RestTimerService.this);
                    if (!RestTimerState.isActive()) {
                        mainHandler.removeCallbacks(finishDismissRunnable);
                        if (overlay != null) overlay.hide();
                        stopServiceCleanly();
                    }
                }
            }
        );
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent != null ? intent.getAction() : null;
        boolean startedAsFgs = intent != null && intent.getBooleanExtra(EXTRA_FROM_FGS, false);

        if (startedAsFgs && !foregroundStarted) {
            promoteToForeground(buildOngoingNotification());
        }

        if (action == null) {
            if (!RestTimerState.isActive()) {
                stopServiceCleanly();
            }
            return START_NOT_STICKY;
        }

        switch (action) {
            case ACTION_START: {
                long endAtMs = intent.getLongExtra(EXTRA_END_AT_MS, System.currentTimeMillis() + 60_000L);
                int totalSec = intent.getIntExtra(EXTRA_TOTAL_SEC, 60);
                String exercise = intent.getStringExtra(EXTRA_EXERCISE_NAME);
                String setLabel = intent.getStringExtra(EXTRA_SET_LABEL);
                int sessionId = intent.getIntExtra(EXTRA_SESSION_ID, 0);
                String sessionUrl = intent.getStringExtra(EXTRA_SESSION_URL);
                boolean forceOverlay = intent.getBooleanExtra(EXTRA_FORCE_OVERLAY, false);

                mainHandler.removeCallbacks(finishDismissRunnable);
                completionHandled = false;
                cancelDoneNotification(this);

                RestTimerState.start(endAtMs, totalSec, exercise, setLabel, sessionId, sessionUrl, forceOverlay);
                promoteToForeground(buildOngoingNotification());
                scheduleExactAlarm(RestTimerState.getRemainingMs());
                syncOverlayVisibility();
                restartTicker();
                break;
            }

            case ACTION_UPDATE: {
                if (!RestTimerState.isActive()) {
                    stopServiceCleanly();
                    break;
                }
                long endAtMs = intent.getLongExtra(EXTRA_END_AT_MS, RestTimerState.getEndAtMs());
                int totalSec = intent.getIntExtra(EXTRA_TOTAL_SEC, RestTimerState.getTotalSec());
                mainHandler.removeCallbacks(finishDismissRunnable);
                completionHandled = false;
                RestTimerState.updateEnd(endAtMs, totalSec);
                updateOngoingNotification();
                scheduleExactAlarm(RestTimerState.getRemainingMs());
                syncOverlayVisibility();
                restartTicker();
                break;
            }

            case ACTION_ADD_15: {
                handleAdd15(true);
                break;
            }

            case ACTION_PAUSE: {
                if (!RestTimerState.isActive()) {
                    stopServiceCleanly();
                    break;
                }
                long pausedLeftMs = intent.getLongExtra(EXTRA_PAUSED_LEFT_MS, RestTimerState.getRemainingMs());
                int totalSec = intent.getIntExtra(EXTRA_TOTAL_SEC, RestTimerState.getTotalSec());
                RestTimerState.pause(pausedLeftMs, totalSec);
                cancelExactAlarm();
                mainHandler.removeCallbacks(tickRunnable);
                updateOngoingNotification();
                syncOverlayVisibility();
                break;
            }

            case ACTION_RESUME: {
                if (!RestTimerState.isActive()) {
                    stopServiceCleanly();
                    break;
                }
                long endAtMs = intent.getLongExtra(EXTRA_END_AT_MS, System.currentTimeMillis() + RestTimerState.getPausedLeftMs());
                int totalSec = intent.getIntExtra(EXTRA_TOTAL_SEC, RestTimerState.getTotalSec());
                completionHandled = false;
                RestTimerState.resume(endAtMs, totalSec);
                updateOngoingNotification();
                scheduleExactAlarm(RestTimerState.getRemainingMs());
                syncOverlayVisibility();
                restartTicker();
                break;
            }

            case ACTION_SKIP: {
                handleStop(true);
                break;
            }

            case ACTION_STOP: {
                handleStop(false);
                break;
            }

            case ACTION_APP_VISIBILITY: {
                boolean fg = intent.getBooleanExtra(EXTRA_FOREGROUND, true);
                RestTimerState.setAppInForeground(fg);
                if (RestTimerState.isActive()) {
                    syncOverlayVisibility();
                } else if (fg) {
                    mainHandler.removeCallbacks(finishDismissRunnable);
                    if (overlay != null) overlay.hide();
                    stopServiceCleanly();
                }
                break;
            }

            case ACTION_COMPLETE: {
                handleComplete();
                break;
            }

            case ACTION_RESET_PILL_POS: {
                if (overlay != null) overlay.resetPosition();
                if (!RestTimerState.isActive()) {
                    stopServiceCleanly();
                }
                break;
            }

            default:
                break;
        }

        return START_NOT_STICKY;
    }

    @Override
    public void onDestroy() {
        mainHandler.removeCallbacks(tickRunnable);
        mainHandler.removeCallbacks(finishDismissRunnable);
        cancelExactAlarm();
        if (overlay != null) overlay.hide();
        if (audioPlayer != null) audioPlayer.stop();
        foregroundStarted = false;
        super.onDestroy();
    }

    private void handleAdd15(boolean notifyWeb) {
        mainHandler.removeCallbacks(finishDismissRunnable);
        completionHandled = false;
        cancelDoneNotification(this);

        RestTimerState.add15Seconds();
        promoteToForeground(buildOngoingNotification());

        if (!RestTimerState.isPaused()) {
            scheduleExactAlarm(RestTimerState.getRemainingMs());
            restartTicker();
        }
        syncOverlayVisibility();

        if (notifyWeb) {
            RestTimerState.emitAction(
                "add15",
                RestTimerState.getEndAtMs(),
                RestTimerState.getTotalSec(),
                RestTimerState.getSessionId()
            );
        }
    }

    private void handleStop(boolean emitSkip) {
        int sid = RestTimerState.getSessionId();
        int total = RestTimerState.getTotalSec();
        mainHandler.removeCallbacks(tickRunnable);
        mainHandler.removeCallbacks(finishDismissRunnable);
        cancelExactAlarm();
        cancelDoneNotification(this);
        if (audioPlayer != null) audioPlayer.stop();
        if (overlay != null) overlay.hide();

        RestTimerState.clear(emitSkip ? "skip" : null);
        if (emitSkip) {
            RestTimerState.emitAction("skip", 0L, total, sid);
        }
        stopServiceCleanly();
    }

    private void handleComplete() {
        if (completionHandled) return;
        if (!RestTimerState.isActive()) {
            stopServiceCleanly();
            return;
        }
        if (RestTimerState.isPaused()) {
            return;
        }

        completionHandled = true;
        mainHandler.removeCallbacks(tickRunnable);
        cancelExactAlarm();

        String exercise = RestTimerState.getExerciseName();
        String setLabel = RestTimerState.getSetLabel();
        int sessionId = RestTimerState.getSessionId();
        int totalSec = RestTimerState.getTotalSec();
        boolean wasForceOverlay = RestTimerState.isForceOverlay();
        boolean appInFg = RestTimerState.isAppInForeground();

        RestTimerState.clear("finished");
        RestTimerState.emitAction("finished", 0L, totalSec, sessionId);

        RestTimerState.Prefs prefs = RestTimerState.readPrefs(this);
        if (audioPlayer != null) {
            audioPlayer.playCompletionAlert(
                this,
                prefs.soundEnabled,
                prefs.vibrateEnabled,
                prefs.soundInSilentMode
            );
        }

        // Quita la notificación en curso y muestra el aviso de descanso terminado si estás fuera de la app.
        stopForegroundOnly();
        if (!appInFg || wasForceOverlay) {
            postDoneNotification(exercise, setLabel);
        }

        boolean canOverlay =
            prefs.overlayEnabled &&
            (Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(this));
        if (overlay != null && (overlay.isAttached() || ((!appInFg || wasForceOverlay) && canOverlay))) {
            overlay.show();
            overlay.renderFinished(exercise, setLabel);
            mainHandler.removeCallbacks(finishDismissRunnable);
            mainHandler.postDelayed(finishDismissRunnable, FINISHED_FLASH_MS);
        } else {
            if (overlay != null) overlay.hide();
            stopServiceCleanly();
        }
    }

    private void restartTicker() {
        mainHandler.removeCallbacks(tickRunnable);
        mainHandler.post(tickRunnable);
    }

    private void syncOverlayVisibility() {
        if (overlay == null) return;
        RestTimerState.Prefs prefs = RestTimerState.readPrefs(this);
        boolean canOverlay =
            Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(this);
        boolean shouldShow =
            RestTimerState.isActive() &&
            prefs.overlayEnabled &&
            canOverlay &&
            (!RestTimerState.isAppInForeground() || RestTimerState.isForceOverlay());

        if (shouldShow) {
            overlay.show();
            renderOverlayIfNeeded();
        } else {
            overlay.hide();
        }
    }

    private void renderOverlayIfNeeded() {
        if (overlay == null || !overlay.isAttached() || !RestTimerState.isActive()) return;
        overlay.renderRunning(
            RestTimerState.getRemainingMs(),
            RestTimerState.getTotalSec(),
            RestTimerState.isPaused(),
            RestTimerState.getExerciseName(),
            RestTimerState.getSetLabel()
        );
    }

    private void promoteToForeground(Notification notification) {
        try {
            int fgsType = Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE
                ? ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE
                : 0;
            ServiceCompat.startForeground(this, NOTIF_ONGOING_ID, notification, fgsType);
            foregroundStarted = true;
        } catch (Exception ex) {
            Log.e(TAG, "Error iniciando Foreground Service", ex);
        }
    }

    private void updateOngoingNotification() {
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        if (foregroundStarted) {
            nm.notify(NOTIF_ONGOING_ID, buildOngoingNotification());
        } else {
            promoteToForeground(buildOngoingNotification());
        }
    }

    private void stopForegroundOnly() {
        if (!foregroundStarted) return;
        try {
            ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE);
        } catch (Exception ignored) {
        }
        foregroundStarted = false;
    }

    private void stopServiceCleanly() {
        stopForegroundOnly();
        stopSelf();
    }

    private Notification buildOngoingNotification() {
        boolean paused = RestTimerState.isPaused();
        long endAtMs = RestTimerState.getEndAtMs();
        String exercise = RestTimerState.getExerciseName();
        String setLabel = RestTimerState.getSetLabel();

        String title = paused
            ? "Descanso en pausa (" + RestTimerState.formatClock(RestTimerState.getPausedLeftMs()) + ")"
            : (setLabel.isEmpty() ? "Descanso en curso" : "Descanso · " + setLabel);
        String text = exercise.isEmpty() ? "Toca para volver al entrenamiento" : exercise;

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ONGOING)
            .setSmallIcon(R.drawable.ic_stat_timer)
            .setColor(0xFF2F55F4)
            .setContentTitle(title)
            .setContentText(text)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setSilent(true)
            .setCategory(NotificationCompat.CATEGORY_PROGRESS)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setContentIntent(createOpenAppPendingIntent(this, 4200))
            .addAction(0, "+15 s", createReceiverPendingIntent(this, RestTimerActionReceiver.ACTION_NOTIF_ADD_15, 4201))
            .addAction(0, "Saltar", createReceiverPendingIntent(this, RestTimerActionReceiver.ACTION_NOTIF_SKIP, 4202));

        if (!paused && endAtMs > System.currentTimeMillis()) {
            builder
                .setWhen(endAtMs)
                .setShowWhen(true)
                .setUsesChronometer(true)
                .setChronometerCountDown(true);
        } else {
            builder.setShowWhen(false).setUsesChronometer(false);
        }

        return builder.build();
    }

    private void postDoneNotification(String exercise, String setLabel) {
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;

        String body;
        if (!exercise.isEmpty() && !setLabel.isEmpty()) {
            body = exercise + " · " + setLabel;
        } else if (!exercise.isEmpty()) {
            body = exercise;
        } else {
            body = "¡Toca volver a la siguiente serie!";
        }

        Notification notif = new NotificationCompat.Builder(this, CHANNEL_DONE)
            .setSmallIcon(R.drawable.ic_stat_timer)
            .setColor(0xFF16A34A)
            .setContentTitle("¡Descanso terminado!")
            .setContentText(body)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setSilent(true) // El sonido con audio ducking y vibración los gestiona RestAudioPlayer.
            .setTimeoutAfter(25_000L)
            .setContentIntent(createOpenAppPendingIntent(this, 4210))
            .addAction(0, "Volver", createOpenAppPendingIntent(this, 4211))
            .addAction(0, "+15 s", createReceiverPendingIntent(this, RestTimerActionReceiver.ACTION_NOTIF_ADD_15, 4212))
            .build();

        try {
            nm.notify(NOTIF_DONE_ID, notif);
        } catch (SecurityException ex) {
            Log.w(TAG, "Sin permiso POST_NOTIFICATIONS para mostrar aviso de fin", ex);
        }
    }

    private void scheduleExactAlarm(long delayMs) {
        AlarmManager am = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        long triggerAt = SystemClock.elapsedRealtime() + Math.max(500L, delayMs);
        PendingIntent pi = createAlarmPendingIntent(this);
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (am.canScheduleExactAlarms()) {
                    am.setExactAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAt, pi);
                } else {
                    am.setAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAt, pi);
                }
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                am.setExactAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAt, pi);
            } else {
                am.setExact(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAt, pi);
            }
        } catch (SecurityException ex) {
            am.setAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAt, pi);
        }
    }

    private void cancelExactAlarm() {
        AlarmManager am = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        am.cancel(createAlarmPendingIntent(this));
    }

    public static void cancelDoneNotification(Context context) {
        NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) {
            nm.cancel(NOTIF_DONE_ID);
        }
    }

    public static void ensureChannels(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;

        NotificationChannel ongoing = new NotificationChannel(
            CHANNEL_ONGOING,
            "Temporizador de descanso",
            NotificationManager.IMPORTANCE_LOW
        );
        ongoing.setDescription("Cuenta atrás activa entre series");
        ongoing.setShowBadge(false);
        ongoing.setSound(null, null);
        ongoing.enableVibration(false);
        nm.createNotificationChannel(ongoing);

        NotificationChannel done = new NotificationChannel(
            CHANNEL_DONE,
            "Fin de descanso",
            NotificationManager.IMPORTANCE_HIGH
        );
        done.setDescription("Aviso cuando termina el descanso de una serie");
        done.setSound(null, null);
        done.enableVibration(false);
        nm.createNotificationChannel(done);
    }

    public static void openMainApp(Context context) {
        cancelDoneNotification(context);
        Intent launch = new Intent(context, MainActivity.class);
        launch.addFlags(
            Intent.FLAG_ACTIVITY_NEW_TASK |
            Intent.FLAG_ACTIVITY_SINGLE_TOP |
            Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
        );
        context.startActivity(launch);
    }

    private static PendingIntent createAlarmPendingIntent(Context context) {
        Intent i = new Intent(context, RestTimerActionReceiver.class);
        i.setAction(RestTimerActionReceiver.ACTION_ALARM_FIRED);
        return PendingIntent.getBroadcast(
            context,
            ALARM_REQUEST_CODE,
            i,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    private static PendingIntent createReceiverPendingIntent(Context context, String action, int requestCode) {
        Intent i = new Intent(context, RestTimerActionReceiver.class);
        i.setAction(action);
        return PendingIntent.getBroadcast(
            context,
            requestCode,
            i,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    private static PendingIntent createOpenAppPendingIntent(Context context, int requestCode) {
        Intent i = new Intent(context, MainActivity.class);
        i.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
        return PendingIntent.getActivity(
            context,
            requestCode,
            i,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }
}
