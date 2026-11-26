package app.gymplanner.android;

import android.content.Intent;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(RestTimerPlugin.class);
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onStart() {
        super.onStart();
        RestTimerState.setAppInForeground(true);
        notifyServiceVisibility(true);
    }

    @Override
    public void onResume() {
        super.onResume();
        RestTimerService.cancelDoneNotification(this);
    }

    @Override
    public void onStop() {
        super.onStop();
        RestTimerState.setAppInForeground(false);
        notifyServiceVisibility(false);
    }

    private void notifyServiceVisibility(boolean foreground) {
        if (!RestTimerState.isActive()) return;
        Intent intent = new Intent(this, RestTimerService.class);
        intent.setAction(RestTimerService.ACTION_APP_VISIBILITY);
        intent.putExtra(RestTimerService.EXTRA_FOREGROUND, foreground);
        try {
            startService(intent);
        } catch (Exception ignored) {
            // Si Android bloquea startService en transición, el propio servicio comprueba isAppInForeground.
        }
    }
}
