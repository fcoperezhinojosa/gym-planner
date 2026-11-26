package app.gymplanner.android;

import android.content.Context;
import android.content.res.AssetFileDescriptor;
import android.media.AudioAttributes;
import android.media.AudioDeviceInfo;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;
import android.util.Log;

/**
 * Reproduce el sonido de fin de descanso con audio ducking (baja un instante YouTube/Spotify
 * sin pausar el vídeo ni la música) y vibración diferenciada.
 */
public final class RestAudioPlayer {

    private static final String TAG = "RestAudioPlayer";
    private static final Handler MAIN = new Handler(Looper.getMainLooper());

    private MediaPlayer mediaPlayer;
    private AudioManager audioManager;
    private AudioFocusRequest focusRequest;
    private final Runnable cleanupTask = this::stop;

    public void playCompletionAlert(
        Context context,
        boolean soundEnabled,
        boolean vibrateEnabled,
        boolean soundInSilentMode
    ) {
        Context appCtx = context.getApplicationContext();

        if (vibrateEnabled) {
            triggerVibration(appCtx);
        }

        if (!soundEnabled) {
            return;
        }

        AudioManager am = (AudioManager) appCtx.getSystemService(Context.AUDIO_SERVICE);
        if (am == null) {
            return;
        }

        int ringerMode = am.getRingerMode();
        boolean headphonesConnected = hasExternalAudioOutput(am);
        boolean shouldPlaySound =
            ringerMode == AudioManager.RINGER_MODE_NORMAL || soundInSilentMode || headphonesConnected;

        if (!shouldPlaySound) {
            return;
        }

        stop();
        audioManager = am;

        int usage;
        if (soundInSilentMode && ringerMode != AudioManager.RINGER_MODE_NORMAL && !headphonesConnected) {
            usage = AudioAttributes.USAGE_ALARM;
        } else if (headphonesConnected && ringerMode != AudioManager.RINGER_MODE_NORMAL) {
            // En el gimnasio con auriculares y móvil en silencio: suena suavemente por los cascos.
            usage = AudioAttributes.USAGE_ASSISTANCE_SONIFICATION;
        } else {
            usage = AudioAttributes.USAGE_NOTIFICATION_EVENT;
        }

        AudioAttributes attrs = new AudioAttributes.Builder()
            .setUsage(usage)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            focusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
                .setAudioAttributes(attrs)
                .setAcceptsDelayedFocusGain(false)
                .setOnAudioFocusChangeListener(focusChange -> {})
                .build();
            am.requestAudioFocus(focusRequest);
        } else {
            //noinspection deprecation
            am.requestAudioFocus(null, AudioManager.STREAM_NOTIFICATION, AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK);
        }

        AssetFileDescriptor afd = null;
        try {
            afd = appCtx.getResources().openRawResourceFd(R.raw.rest_done);
            if (afd == null) {
                abandonFocus();
                return;
            }
            MediaPlayer mp = new MediaPlayer();
            mp.setAudioAttributes(attrs);
            mp.setDataSource(afd.getFileDescriptor(), afd.getStartOffset(), afd.getLength());
            mp.setLooping(false);
            mp.setOnCompletionListener(player -> stop());
            mp.setOnErrorListener((player, what, extra) -> {
                stop();
                return true;
            });
            mp.prepare();
            mediaPlayer = mp;
            mp.start();
            // Limpieza garantizada aunque el callback no llegue.
            MAIN.postDelayed(cleanupTask, 2500L);
        } catch (Exception ex) {
            Log.w(TAG, "No se pudo reproducir el sonido de descanso", ex);
            stop();
        } finally {
            if (afd != null) {
                try {
                    afd.close();
                } catch (Exception ignored) {
                }
            }
        }
    }

    public void stop() {
        MAIN.removeCallbacks(cleanupTask);
        if (mediaPlayer != null) {
            try {
                if (mediaPlayer.isPlaying()) {
                    mediaPlayer.stop();
                }
            } catch (Exception ignored) {
            }
            try {
                mediaPlayer.release();
            } catch (Exception ignored) {
            }
            mediaPlayer = null;
        }
        abandonFocus();
    }

    private void abandonFocus() {
        if (audioManager == null) return;
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && focusRequest != null) {
                audioManager.abandonAudioFocusRequest(focusRequest);
            }
        } catch (Exception ignored) {
        }
        focusRequest = null;
        audioManager = null;
    }

    private static boolean hasExternalAudioOutput(AudioManager am) {
        try {
            AudioDeviceInfo[] outputs = am.getDevices(AudioManager.GET_DEVICES_OUTPUTS);
            for (AudioDeviceInfo dev : outputs) {
                int type = dev.getType();
                if (
                    type == AudioDeviceInfo.TYPE_BLUETOOTH_A2DP ||
                    type == AudioDeviceInfo.TYPE_BLUETOOTH_SCO ||
                    type == AudioDeviceInfo.TYPE_WIRED_HEADSET ||
                    type == AudioDeviceInfo.TYPE_WIRED_HEADPHONES ||
                    type == AudioDeviceInfo.TYPE_USB_HEADSET ||
                    type == AudioDeviceInfo.TYPE_USB_DEVICE
                ) {
                    return true;
                }
                if (
                    Build.VERSION.SDK_INT >= Build.VERSION_CODES.S &&
                    (type == AudioDeviceInfo.TYPE_BLE_HEADSET || type == AudioDeviceInfo.TYPE_BLE_SPEAKER)
                ) {
                    return true;
                }
            }
        } catch (Exception ignored) {
        }
        return false;
    }

    private static void triggerVibration(Context context) {
        try {
            Vibrator vibrator;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                VibratorManager manager = context.getSystemService(VibratorManager.class);
                vibrator = manager != null ? manager.getDefaultVibrator() : null;
            } else {
                //noinspection deprecation
                vibrator = (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
            }
            if (vibrator == null || !vibrator.hasVibrator()) return;

            long[] pattern = new long[] { 0L, 170L, 90L, 170L, 90L, 240L };
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                int[] amps = new int[] { 0, 220, 0, 220, 0, 255 };
                vibrator.vibrate(VibrationEffect.createWaveform(pattern, amps, -1));
            } else {
                //noinspection deprecation
                vibrator.vibrate(pattern, -1);
            }
        } catch (Exception ex) {
            Log.w(TAG, "No se pudo vibrar al finalizar el descanso", ex);
        }
    }
}
