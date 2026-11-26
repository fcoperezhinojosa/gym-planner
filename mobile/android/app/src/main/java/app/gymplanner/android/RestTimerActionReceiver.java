package app.gymplanner.android;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import androidx.core.content.ContextCompat;

/**
 * Recibe eventos de la alarma exacta y de los botones (+15 s / Saltar) de la notificación.
 */
public final class RestTimerActionReceiver extends BroadcastReceiver {

    public static final String ACTION_ALARM_FIRED = "app.gymplanner.android.ALARM_FIRED";
    public static final String ACTION_NOTIF_ADD_15 = "app.gymplanner.android.NOTIF_ADD_15";
    public static final String ACTION_NOTIF_SKIP = "app.gymplanner.android.NOTIF_SKIP";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || intent.getAction() == null) return;
        String action = intent.getAction();

        Intent serviceIntent = new Intent(context, RestTimerService.class);
        serviceIntent.putExtra(RestTimerService.EXTRA_FROM_FGS, true);

        switch (action) {
            case ACTION_ALARM_FIRED:
                serviceIntent.setAction(RestTimerService.ACTION_COMPLETE);
                ContextCompat.startForegroundService(context, serviceIntent);
                break;

            case ACTION_NOTIF_ADD_15:
                RestTimerService.cancelDoneNotification(context);
                serviceIntent.setAction(RestTimerService.ACTION_ADD_15);
                ContextCompat.startForegroundService(context, serviceIntent);
                break;

            case ACTION_NOTIF_SKIP:
                RestTimerService.cancelDoneNotification(context);
                serviceIntent.setAction(RestTimerService.ACTION_SKIP);
                ContextCompat.startForegroundService(context, serviceIntent);
                break;

            default:
                break;
        }
    }
}
