package app.gymplanner.android;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.AlarmManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

/**
 * Puente Capacitor (window.Capacitor.Plugins.RestTimer) entre la web Next.js y Android.
 */
@CapacitorPlugin(
    name = "RestTimer",
    permissions = {
        @Permission(alias = "notifications", strings = { Manifest.permission.POST_NOTIFICATIONS })
    }
)
public class RestTimerPlugin extends Plugin {

    private final RestTimerState.ActionListener actionListener = (action, endAtMs, totalSec, sessionId) -> {
        JSObject data = new JSObject();
        data.put("action", action);
        data.put("endAtMs", endAtMs);
        data.put("totalSec", totalSec);
        data.put("sessionId", sessionId);
        notifyListeners("timerAction", data);
    };

    @Override
    public void load() {
        super.load();
        RestTimerService.ensureChannels(getContext());
        RestTimerState.addListener(actionListener);
    }

    @Override
    protected void handleOnDestroy() {
        RestTimerState.removeListener(actionListener);
        super.handleOnDestroy();
    }

    @PluginMethod
    public void start(PluginCall call) {
        long now = System.currentTimeMillis();
        int totalSec = Math.max(1, optInt(call, "totalSec", 60));
        long endAtMs = optLong(call, "endAtMs", now + totalSec * 1000L);
        String exerciseName = call.getString("exerciseName", "");
        String setLabel = call.getString("setLabel", "Descanso");
        int sessionId = optInt(call, "sessionId", 0);
        String sessionUrl = call.getString("sessionUrl", "/");
        boolean forceOverlay = Boolean.TRUE.equals(call.getBoolean("forceOverlay", false));

        RestTimerState.Prefs prefs = RestTimerState.readPrefs(getContext());
        if (!forceOverlay && totalSec < prefs.minSeconds) {
            // Si el descanso es más corto que el umbral elegido, aseguramos que no quede uno anterior vivo.
            stopTimerService(false);
            JSObject res = new JSObject();
            res.put("started", false);
            res.put("reason", "below_min_seconds");
            call.resolve(res);
            return;
        }

        Intent intent = new Intent(getContext(), RestTimerService.class);
        intent.setAction(RestTimerService.ACTION_START);
        intent.putExtra(RestTimerService.EXTRA_FROM_FGS, true);
        intent.putExtra(RestTimerService.EXTRA_END_AT_MS, endAtMs);
        intent.putExtra(RestTimerService.EXTRA_TOTAL_SEC, totalSec);
        intent.putExtra(RestTimerService.EXTRA_EXERCISE_NAME, exerciseName);
        intent.putExtra(RestTimerService.EXTRA_SET_LABEL, setLabel);
        intent.putExtra(RestTimerService.EXTRA_SESSION_ID, sessionId);
        intent.putExtra(RestTimerService.EXTRA_SESSION_URL, sessionUrl);
        intent.putExtra(RestTimerService.EXTRA_FORCE_OVERLAY, forceOverlay);
        ContextCompat.startForegroundService(getContext(), intent);

        JSObject res = new JSObject();
        res.put("started", true);
        call.resolve(res);
    }

    @PluginMethod
    public void update(PluginCall call) {
        if (!RestTimerState.isActive()) {
            call.resolve();
            return;
        }
        long endAtMs = optLong(call, "endAtMs", RestTimerState.getEndAtMs());
        int totalSec = optInt(call, "totalSec", RestTimerState.getTotalSec());

        Intent intent = new Intent(getContext(), RestTimerService.class);
        intent.setAction(RestTimerService.ACTION_UPDATE);
        intent.putExtra(RestTimerService.EXTRA_END_AT_MS, endAtMs);
        intent.putExtra(RestTimerService.EXTRA_TOTAL_SEC, totalSec);
        getContext().startService(intent);
        call.resolve();
    }

    @PluginMethod
    public void pause(PluginCall call) {
        if (!RestTimerState.isActive()) {
            call.resolve();
            return;
        }
        long pausedLeftMs = optLong(call, "pausedLeftMs", RestTimerState.getRemainingMs());
        int totalSec = optInt(call, "totalSec", RestTimerState.getTotalSec());

        Intent intent = new Intent(getContext(), RestTimerService.class);
        intent.setAction(RestTimerService.ACTION_PAUSE);
        intent.putExtra(RestTimerService.EXTRA_PAUSED_LEFT_MS, pausedLeftMs);
        intent.putExtra(RestTimerService.EXTRA_TOTAL_SEC, totalSec);
        getContext().startService(intent);
        call.resolve();
    }

    @PluginMethod
    public void resume(PluginCall call) {
        if (!RestTimerState.isActive()) {
            call.resolve();
            return;
        }
        long endAtMs = optLong(call, "endAtMs", System.currentTimeMillis() + RestTimerState.getPausedLeftMs());
        int totalSec = optInt(call, "totalSec", RestTimerState.getTotalSec());

        Intent intent = new Intent(getContext(), RestTimerService.class);
        intent.setAction(RestTimerService.ACTION_RESUME);
        intent.putExtra(RestTimerService.EXTRA_END_AT_MS, endAtMs);
        intent.putExtra(RestTimerService.EXTRA_TOTAL_SEC, totalSec);
        getContext().startService(intent);
        call.resolve();
    }

    @PluginMethod
    public void stop(PluginCall call) {
        stopTimerService(false);
        call.resolve();
    }

    @PluginMethod
    public void getState(PluginCall call) {
        call.resolve(RestTimerState.toJSObject());
    }

    @PluginMethod
    public void getPermissions(PluginCall call) {
        call.resolve(buildPermissionsObject());
    }

    @PluginMethod
    public void requestOverlayPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(getContext())) {
            Intent intent = new Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:" + getContext().getPackageName())
            );
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
        }
        call.resolve(buildPermissionsObject());
    }

    @PluginMethod
    public void requestNotificationPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (hasNotificationPermission()) {
                call.resolve(buildPermissionsObject());
                return;
            }
            requestPermissionForAlias("notifications", call, "notificationsPermsCallback");
        } else {
            call.resolve(buildPermissionsObject());
        }
    }

    @PermissionCallback
    private void notificationsPermsCallback(PluginCall call) {
        if (!hasNotificationPermission() && getActivity() != null) {
            // Si el usuario las denegó antes de forma permanente, abrimos la pantalla de ajustes de la app.
            boolean canAskAgain = Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
                getActivity().shouldShowRequestPermissionRationale(Manifest.permission.POST_NOTIFICATIONS);
            if (!canAskAgain) {
                Intent intent = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS);
                intent.putExtra(Settings.EXTRA_APP_PACKAGE, getContext().getPackageName());
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);
            }
        }
        call.resolve(buildPermissionsObject());
    }

    @SuppressLint("BatteryLife")
    @PluginMethod
    public void requestBatteryOptimization(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !isIgnoringBatteryOptimizations()) {
            try {
                Intent intent = new Intent(
                    Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
                    Uri.parse("package:" + getContext().getPackageName())
                );
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);
            } catch (Exception ex) {
                Intent fallback = new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
                fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(fallback);
            }
        }
        call.resolve(buildPermissionsObject());
    }

    @PluginMethod
    public void getPreferences(PluginCall call) {
        call.resolve(RestTimerState.readPrefs(getContext()).toJSObject());
    }

    @PluginMethod
    public void setPreferences(PluginCall call) {
        Boolean overlayEnabled = call.hasOption("overlayEnabled") ? call.getBoolean("overlayEnabled") : null;
        Boolean soundEnabled = call.hasOption("soundEnabled") ? call.getBoolean("soundEnabled") : null;
        Boolean vibrateEnabled = call.hasOption("vibrateEnabled") ? call.getBoolean("vibrateEnabled") : null;
        Boolean soundInSilentMode = call.hasOption("soundInSilentMode") ? call.getBoolean("soundInSilentMode") : null;
        Integer minSeconds = call.hasOption("minSeconds") ? optInt(call, "minSeconds", 0) : null;

        RestTimerState.Prefs updated = RestTimerState.writePrefs(
            getContext(),
            overlayEnabled,
            soundEnabled,
            vibrateEnabled,
            soundInSilentMode,
            minSeconds
        );
        if (RestTimerState.isActive()) {
            Intent intent = new Intent(getContext(), RestTimerService.class);
            intent.setAction(RestTimerService.ACTION_APP_VISIBILITY);
            intent.putExtra(RestTimerService.EXTRA_FOREGROUND, RestTimerState.isAppInForeground());
            getContext().startService(intent);
        }
        call.resolve(updated.toJSObject());
    }

    private static int optInt(PluginCall call, String key, int fallback) {
        Object value = call.getData().opt(key);
        return value instanceof Number ? ((Number) value).intValue() : fallback;
    }

    private static long optLong(PluginCall call, String key, long fallback) {
        Object value = call.getData().opt(key);
        return value instanceof Number ? ((Number) value).longValue() : fallback;
    }

    @PluginMethod
    public void resetPillPosition(PluginCall call) {
        RestTimerState.resetPillPosition(getContext());
        if (RestTimerState.isActive()) {
            Intent intent = new Intent(getContext(), RestTimerService.class);
            intent.setAction(RestTimerService.ACTION_RESET_PILL_POS);
            getContext().startService(intent);
        }
        call.resolve();
    }

    private void stopTimerService(boolean emitSkip) {
        if (!RestTimerState.isActive()) {
            RestTimerService.cancelDoneNotification(getContext());
            return;
        }
        Intent intent = new Intent(getContext(), RestTimerService.class);
        intent.setAction(emitSkip ? RestTimerService.ACTION_SKIP : RestTimerService.ACTION_STOP);
        getContext().startService(intent);
    }

    private JSObject buildPermissionsObject() {
        JSObject obj = new JSObject();
        boolean overlayOk = Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(getContext());
        boolean notifOk = hasNotificationPermission();
        boolean batteryOk = isIgnoringBatteryOptimizations();
        boolean exactAlarmOk = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            AlarmManager am = (AlarmManager) getContext().getSystemService(Context.ALARM_SERVICE);
            exactAlarmOk = am == null || am.canScheduleExactAlarms();
        }
        obj.put("overlay", overlayOk);
        obj.put("notifications", notifOk);
        obj.put("batteryUnrestricted", batteryOk);
        obj.put("exactAlarm", exactAlarmOk);
        obj.put("sdkInt", Build.VERSION.SDK_INT);
        return obj;
    }

    private boolean hasNotificationPermission() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return true;
        return ContextCompat.checkSelfPermission(getContext(), Manifest.permission.POST_NOTIFICATIONS) ==
        PackageManager.PERMISSION_GRANTED;
    }

    private boolean isIgnoringBatteryOptimizations() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return true;
        PowerManager pm = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
        return pm == null || pm.isIgnoringBatteryOptimizations(getContext().getPackageName());
    }
}
