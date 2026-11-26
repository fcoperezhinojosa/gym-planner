package app.gymplanner.android;

import android.content.Context;
import android.content.SharedPreferences;
import com.getcapacitor.JSObject;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Estado compartido (hilo-seguro) del temporizador externo de descanso y sus preferencias.
 */
public final class RestTimerState {

    private static final String PREFS_NAME = "gym_planner_rest_timer";
    private static final String KEY_OVERLAY_ENABLED = "overlay_enabled";
    private static final String KEY_SOUND_ENABLED = "sound_enabled";
    private static final String KEY_VIBRATE_ENABLED = "vibrate_enabled";
    private static final String KEY_SOUND_IN_SILENT = "sound_in_silent";
    private static final String KEY_MIN_SECONDS = "min_seconds";
    private static final String KEY_PILL_X = "pill_x";
    private static final String KEY_PILL_Y = "pill_y";

    public interface ActionListener {
        void onTimerAction(String action, long endAtMs, int totalSec, int sessionId);
    }

    public static final class Prefs {
        public final boolean overlayEnabled;
        public final boolean soundEnabled;
        public final boolean vibrateEnabled;
        public final boolean soundInSilentMode;
        public final int minSeconds;

        public Prefs(
            boolean overlayEnabled,
            boolean soundEnabled,
            boolean vibrateEnabled,
            boolean soundInSilentMode,
            int minSeconds
        ) {
            this.overlayEnabled = overlayEnabled;
            this.soundEnabled = soundEnabled;
            this.vibrateEnabled = vibrateEnabled;
            this.soundInSilentMode = soundInSilentMode;
            this.minSeconds = minSeconds;
        }

        public JSObject toJSObject() {
            JSObject obj = new JSObject();
            obj.put("overlayEnabled", overlayEnabled);
            obj.put("soundEnabled", soundEnabled);
            obj.put("vibrateEnabled", vibrateEnabled);
            obj.put("soundInSilentMode", soundInSilentMode);
            obj.put("minSeconds", minSeconds);
            return obj;
        }
    }

    private static final Object LOCK = new Object();
    private static final CopyOnWriteArrayList<ActionListener> LISTENERS = new CopyOnWriteArrayList<>();

    private static boolean active = false;
    private static boolean paused = false;
    private static long endAtMs = 0L;
    private static long pausedLeftMs = 0L;
    private static int totalSec = 0;
    private static String exerciseName = "";
    private static String setLabel = "Descanso";
    private static int sessionId = 0;
    private static String sessionUrl = "/";
    private static boolean forceOverlay = false;
    private static boolean appInForeground = true;
    private static String lastAction = "none";
    private static long lastActionAtMs = 0L;

    private RestTimerState() {}

    public static void addListener(ActionListener listener) {
        if (listener != null) LISTENERS.addIfAbsent(listener);
    }

    public static void removeListener(ActionListener listener) {
        if (listener != null) LISTENERS.remove(listener);
    }

    public static void emitAction(String action, long actionEndAtMs, int actionTotalSec, int actionSessionId) {
        synchronized (LOCK) {
            lastAction = action;
            lastActionAtMs = System.currentTimeMillis();
        }
        for (ActionListener listener : LISTENERS) {
            try {
                listener.onTimerAction(action, actionEndAtMs, actionTotalSec, actionSessionId);
            } catch (Exception ignored) {
                // Evita que un listener roto bloquee al resto.
            }
        }
    }

    public static void start(
        long newEndAtMs,
        int newTotalSec,
        String newExerciseName,
        String newSetLabel,
        int newSessionId,
        String newSessionUrl,
        boolean newForceOverlay
    ) {
        synchronized (LOCK) {
            active = true;
            paused = false;
            endAtMs = newEndAtMs;
            pausedLeftMs = 0L;
            totalSec = Math.max(1, newTotalSec);
            exerciseName = newExerciseName != null ? newExerciseName : "";
            setLabel = (newSetLabel != null && !newSetLabel.isEmpty()) ? newSetLabel : "Descanso";
            sessionId = newSessionId;
            sessionUrl = (newSessionUrl != null && !newSessionUrl.isEmpty()) ? newSessionUrl : "/";
            forceOverlay = newForceOverlay;
            lastAction = "none";
            lastActionAtMs = System.currentTimeMillis();
        }
    }

    public static void updateEnd(long newEndAtMs, int newTotalSec) {
        synchronized (LOCK) {
            if (!active) return;
            paused = false;
            pausedLeftMs = 0L;
            endAtMs = newEndAtMs;
            if (newTotalSec > 0) totalSec = newTotalSec;
        }
    }

    public static void add15Seconds() {
        synchronized (LOCK) {
            long now = System.currentTimeMillis();
            if (!active) {
                // Permite resucitar un descanso recién acabado pulsando +15 s desde la pastilla/notificación.
                active = true;
                paused = false;
                pausedLeftMs = 0L;
                endAtMs = now + 15_000L;
                totalSec = Math.max(totalSec + 15, 15);
            } else if (paused) {
                pausedLeftMs = Math.max(0L, pausedLeftMs) + 15_000L;
                totalSec += 15;
            } else {
                long base = Math.max(endAtMs, now);
                endAtMs = base + 15_000L;
                totalSec += 15;
            }
        }
    }

    public static void pause(long newPausedLeftMs, int newTotalSec) {
        synchronized (LOCK) {
            if (!active) return;
            paused = true;
            pausedLeftMs = Math.max(0L, newPausedLeftMs);
            endAtMs = 0L;
            if (newTotalSec > 0) totalSec = newTotalSec;
        }
    }

    public static void resume(long newEndAtMs, int newTotalSec) {
        synchronized (LOCK) {
            if (!active) return;
            paused = false;
            pausedLeftMs = 0L;
            endAtMs = newEndAtMs;
            if (newTotalSec > 0) totalSec = newTotalSec;
        }
    }

    public static void clear(String action) {
        synchronized (LOCK) {
            active = false;
            paused = false;
            endAtMs = 0L;
            pausedLeftMs = 0L;
            forceOverlay = false;
            if (action != null) {
                lastAction = action;
                lastActionAtMs = System.currentTimeMillis();
            }
        }
    }

    public static boolean isActive() {
        synchronized (LOCK) {
            return active;
        }
    }

    public static boolean isPaused() {
        synchronized (LOCK) {
            return paused;
        }
    }

    public static long getEndAtMs() {
        synchronized (LOCK) {
            return endAtMs;
        }
    }

    public static long getPausedLeftMs() {
        synchronized (LOCK) {
            return pausedLeftMs;
        }
    }

    public static int getTotalSec() {
        synchronized (LOCK) {
            return totalSec;
        }
    }

    public static String getExerciseName() {
        synchronized (LOCK) {
            return exerciseName;
        }
    }

    public static String getSetLabel() {
        synchronized (LOCK) {
            return setLabel;
        }
    }

    public static int getSessionId() {
        synchronized (LOCK) {
            return sessionId;
        }
    }

    public static String getSessionUrl() {
        synchronized (LOCK) {
            return sessionUrl;
        }
    }

    public static boolean isForceOverlay() {
        synchronized (LOCK) {
            return forceOverlay;
        }
    }

    public static boolean isAppInForeground() {
        synchronized (LOCK) {
            return appInForeground;
        }
    }

    public static void setAppInForeground(boolean foreground) {
        synchronized (LOCK) {
            appInForeground = foreground;
        }
    }

    public static long getRemainingMs() {
        synchronized (LOCK) {
            if (!active) return 0L;
            if (paused) return Math.max(0L, pausedLeftMs);
            return Math.max(0L, endAtMs - System.currentTimeMillis());
        }
    }

    public static JSObject toJSObject() {
        synchronized (LOCK) {
            JSObject obj = new JSObject();
            obj.put("active", active);
            obj.put("paused", paused);
            obj.put("endAtMs", endAtMs);
            obj.put("pausedLeftMs", pausedLeftMs);
            obj.put("totalSec", totalSec);
            obj.put("exerciseName", exerciseName);
            obj.put("setLabel", setLabel);
            obj.put("sessionId", sessionId);
            obj.put("lastAction", lastAction);
            obj.put("lastActionAtMs", lastActionAtMs);
            return obj;
        }
    }

    public static String formatClock(long remainingMs) {
        long sec = Math.max(0L, (long) Math.ceil(remainingMs / 1000.0));
        long min = sec / 60L;
        long rem = sec % 60L;
        return min + ":" + (rem < 10 ? "0" + rem : String.valueOf(rem));
    }

    public static Prefs readPrefs(Context context) {
        SharedPreferences sp = context.getApplicationContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        return new Prefs(
            sp.getBoolean(KEY_OVERLAY_ENABLED, true),
            sp.getBoolean(KEY_SOUND_ENABLED, true),
            sp.getBoolean(KEY_VIBRATE_ENABLED, true),
            sp.getBoolean(KEY_SOUND_IN_SILENT, false),
            sp.getInt(KEY_MIN_SECONDS, 0)
        );
    }

    public static Prefs writePrefs(
        Context context,
        Boolean overlayEnabled,
        Boolean soundEnabled,
        Boolean vibrateEnabled,
        Boolean soundInSilentMode,
        Integer minSeconds
    ) {
        SharedPreferences sp = context.getApplicationContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        SharedPreferences.Editor ed = sp.edit();
        if (overlayEnabled != null) ed.putBoolean(KEY_OVERLAY_ENABLED, overlayEnabled);
        if (soundEnabled != null) ed.putBoolean(KEY_SOUND_ENABLED, soundEnabled);
        if (vibrateEnabled != null) ed.putBoolean(KEY_VIBRATE_ENABLED, vibrateEnabled);
        if (soundInSilentMode != null) ed.putBoolean(KEY_SOUND_IN_SILENT, soundInSilentMode);
        if (minSeconds != null) ed.putInt(KEY_MIN_SECONDS, Math.max(0, minSeconds));
        ed.apply();
        return readPrefs(context);
    }

    public static int getPillX(Context context) {
        SharedPreferences sp = context.getApplicationContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        return sp.getInt(KEY_PILL_X, 0);
    }

    public static int getPillY(Context context) {
        SharedPreferences sp = context.getApplicationContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        return sp.getInt(KEY_PILL_Y, -1);
    }

    public static void savePillPosition(Context context, int x, int y) {
        SharedPreferences sp = context.getApplicationContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        sp.edit().putInt(KEY_PILL_X, x).putInt(KEY_PILL_Y, y).apply();
    }

    public static void resetPillPosition(Context context) {
        SharedPreferences sp = context.getApplicationContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        sp.edit().remove(KEY_PILL_X).remove(KEY_PILL_Y).apply();
    }
}
