package app.gymplanner.android;

import android.annotation.SuppressLint;
import android.content.Context;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.text.TextUtils;
import android.util.DisplayMetrics;
import android.util.Log;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewConfiguration;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;

/**
 * Pastilla flotante superior (estilo Dynamic Island / Live Alert) visible encima de YouTube y Google.
 * - Modo compacto: punto de estado + cuenta atrás tabular + etiqueta de serie + barra de progreso.
 * - Toque corto: despliega acciones (+15 s, Saltar, Abrir) y se vuelve a compactar a los 6 s.
 * - Arrastrable a cualquier posición y recuerda dónde la dejaste.
 */
public final class RestOverlayController {

    private static final String TAG = "RestOverlayController";
    private static final int FINAL_COUNTDOWN_SEC = 5;
    private static final long AUTO_COLLAPSE_MS = 6000L;

    // Paleta de Gym Planner (a juego con RestTimerCard.tsx)
    private static final int COLOR_NAVY_BG = 0xF2101A3D;
    private static final int COLOR_BORDER_DEFAULT = 0x55A9BAFF;
    private static final int COLOR_BORDER_FINAL = 0x994ADE80;
    private static final int COLOR_BORDER_PAUSED = 0x88F59E0B;
    private static final int COLOR_ACCENT = 0xFF2F55F4;
    private static final int COLOR_FINAL = 0xFF4ADE80;
    private static final int COLOR_PAUSED = 0xFFF59E0B;
    private static final int COLOR_PERIWINKLE = 0xFFA9BAFF;
    private static final int COLOR_WHITE = 0xFFFFFFFF;
    private static final int COLOR_TRACK = 0x26FFFFFF;

    public interface Callbacks {
        void onAdd15();
        void onSkip();
        void onOpenApp();
    }

    private final Context context;
    private final WindowManager windowManager;
    private final Callbacks callbacks;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final int touchSlop;

    private WindowManager.LayoutParams layoutParams;
    private LinearLayout rootCard;
    private GradientDrawable cardBg;

    // Vistas compactas / comunes
    private View statusDot;
    private GradientDrawable dotBg;
    private TextView timeView;
    private TextView subtitleView;
    private TextView chevronView;
    private FrameLayout progressTrack;
    private View progressFill;
    private GradientDrawable progressFillBg;

    // Sección desplegada
    private LinearLayout expandedSection;
    private TextView exerciseDetailView;
    private TextView btnAdd15;
    private TextView btnSkip;
    private TextView btnOpen;

    private boolean attached = false;
    private boolean expanded = false;
    private boolean finishedMode = false;

    private final Runnable autoCollapseTask = () -> {
        if (attached && expanded && !finishedMode) {
            setExpanded(false);
        }
    };

    public RestOverlayController(Context context, Callbacks callbacks) {
        this.context = context.getApplicationContext();
        this.windowManager = (WindowManager) this.context.getSystemService(Context.WINDOW_SERVICE);
        this.callbacks = callbacks;
        this.touchSlop = ViewConfiguration.get(this.context).getScaledTouchSlop();
    }

    public boolean isAttached() {
        return attached;
    }

    public void show() {
        mainHandler.post(() -> {
            if (windowManager == null) return;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(context)) {
                return;
            }
            if (attached) {
                return;
            }
            buildViewsIfNeeded();
            layoutParams = createLayoutParams();
            try {
                windowManager.addView(rootCard, layoutParams);
                attached = true;
            } catch (Exception ex) {
                Log.w(TAG, "No se pudo adjuntar la pastilla flotante", ex);
                attached = false;
            }
        });
    }

    public void hide() {
        mainHandler.post(() -> {
            mainHandler.removeCallbacks(autoCollapseTask);
            expanded = false;
            finishedMode = false;
            if (!attached || rootCard == null || windowManager == null) {
                attached = false;
                return;
            }
            try {
                windowManager.removeView(rootCard);
            } catch (Exception ignored) {
            }
            attached = false;
        });
    }

    public void resetPosition() {
        mainHandler.post(() -> {
            RestTimerState.resetPillPosition(context);
            if (!attached || layoutParams == null || rootCard == null || windowManager == null) return;
            layoutParams.x = 0;
            layoutParams.y = defaultTopY();
            try {
                windowManager.updateViewLayout(rootCard, layoutParams);
            } catch (Exception ignored) {
            }
        });
    }

    public void renderRunning(
        long remainingMs,
        int totalSec,
        boolean paused,
        String exerciseName,
        String setLabel
    ) {
        mainHandler.post(() -> {
            if (!attached || rootCard == null) return;
            finishedMode = false;

            long secLeft = Math.max(0L, (long) Math.ceil(remainingMs / 1000.0));
            boolean finalMode = !paused && secLeft <= FINAL_COUNTDOWN_SEC;

            timeView.setText(RestTimerState.formatClock(remainingMs));
            timeView.setTextColor(finalMode ? COLOR_FINAL : COLOR_WHITE);

            String compactSub;
            if (paused) {
                compactSub = "En pausa";
            } else if (finalMode) {
                compactSub = "¡Ya casi!";
            } else {
                compactSub = compactSetLabel(setLabel);
            }
            subtitleView.setText(compactSub);
            subtitleView.setTextColor(finalMode ? COLOR_FINAL : COLOR_PERIWINKLE);

            String detail = buildDetailLine(exerciseName, setLabel, paused);
            exerciseDetailView.setText(detail);

            btnSkip.setText("Saltar");
            btnSkip.setVisibility(View.VISIBLE);
            btnOpen.setText("Abrir ↗");

            int accentColor = paused ? COLOR_PAUSED : (finalMode ? COLOR_FINAL : COLOR_ACCENT);
            int borderColor = paused ? COLOR_BORDER_PAUSED : (finalMode ? COLOR_BORDER_FINAL : COLOR_BORDER_DEFAULT);

            dotBg.setColor(accentColor);
            cardBg.setStroke(dp(1.2f), borderColor);
            progressFillBg.setColor(accentColor);

            float ratio = totalSec > 0 ? Math.max(0f, Math.min(1f, (float) remainingMs / (totalSec * 1000f))) : 0f;
            updateProgressBar(ratio);
        });
    }

    public void renderFinished(String exerciseName, String setLabel) {
        mainHandler.post(() -> {
            if (!attached || rootCard == null) return;
            finishedMode = true;
            mainHandler.removeCallbacks(autoCollapseTask);

            timeView.setText("¡A la barra!");
            timeView.setTextColor(COLOR_FINAL);

            subtitleView.setText("Descanso listo");
            subtitleView.setTextColor(COLOR_WHITE);

            String detail = buildDetailLine(exerciseName, setLabel, false);
            exerciseDetailView.setText(detail.isEmpty() ? "¡Vamos con la siguiente serie!" : detail);

            btnSkip.setVisibility(View.GONE);
            btnOpen.setText("Ir al entreno ↗");

            dotBg.setColor(COLOR_FINAL);
            cardBg.setStroke(dp(1.5f), COLOR_BORDER_FINAL);
            progressFillBg.setColor(COLOR_FINAL);
            updateProgressBar(1f);

            setExpandedInternal(true, false);
        });
    }

    private void setExpanded(boolean nextExpanded) {
        setExpandedInternal(nextExpanded, true);
    }

    private void setExpandedInternal(boolean nextExpanded, boolean scheduleCollapse) {
        expanded = nextExpanded;
        if (expandedSection != null) {
            expandedSection.setVisibility(expanded ? View.VISIBLE : View.GONE);
        }
        if (chevronView != null) {
            chevronView.setText(expanded ? "▴" : "▾");
        }
        if (cardBg != null) {
            cardBg.setCornerRadius(dp(expanded ? 22f : 999f));
        }
        mainHandler.removeCallbacks(autoCollapseTask);
        if (expanded && scheduleCollapse && !finishedMode) {
            mainHandler.postDelayed(autoCollapseTask, AUTO_COLLAPSE_MS);
        }
        if (attached && rootCard != null && layoutParams != null && windowManager != null) {
            try {
                windowManager.updateViewLayout(rootCard, layoutParams);
            } catch (Exception ignored) {
            }
        }
    }

    private void updateProgressBar(float ratio) {
        if (progressTrack == null || progressFill == null) return;
        int trackWidth = progressTrack.getWidth();
        if (trackWidth <= 0) {
            progressTrack.post(() -> updateProgressBar(ratio));
            return;
        }
        ViewGroup.LayoutParams lp = progressFill.getLayoutParams();
        int targetWidth = Math.max(0, Math.round(trackWidth * ratio));
        if (lp.width != targetWidth) {
            lp.width = targetWidth;
            progressFill.setLayoutParams(lp);
        }
    }

    @SuppressLint("ClickableViewAccessibility")
    private void buildViewsIfNeeded() {
        if (rootCard != null) return;

        rootCard = new LinearLayout(context);
        rootCard.setOrientation(LinearLayout.VERTICAL);
        rootCard.setPadding(dp(13f), dp(8f), dp(13f), dp(8f));
        rootCard.setElevation(dp(10f));

        cardBg = new GradientDrawable();
        cardBg.setColor(COLOR_NAVY_BG);
        cardBg.setCornerRadius(dp(999f));
        cardBg.setStroke(dp(1.2f), COLOR_BORDER_DEFAULT);
        rootCard.setBackground(cardBg);

        // Fila superior compacta (siempre visible)
        LinearLayout topRow = new LinearLayout(context);
        topRow.setOrientation(LinearLayout.HORIZONTAL);
        topRow.setGravity(Gravity.CENTER_VERTICAL);

        statusDot = new View(context);
        dotBg = new GradientDrawable();
        dotBg.setShape(GradientDrawable.OVAL);
        dotBg.setColor(COLOR_ACCENT);
        statusDot.setBackground(dotBg);
        LinearLayout.LayoutParams dotLp = new LinearLayout.LayoutParams(dp(9f), dp(9f));
        dotLp.setMarginEnd(dp(8f));
        topRow.addView(statusDot, dotLp);

        timeView = new TextView(context);
        timeView.setText("0:00");
        timeView.setTextColor(COLOR_WHITE);
        timeView.setTextSize(TypedValue.COMPLEX_UNIT_SP, 16f);
        timeView.setTypeface(Typeface.DEFAULT_BOLD);
        timeView.setFontFeatureSettings("tnum");
        timeView.setSingleLine(true);
        topRow.addView(timeView);

        subtitleView = new TextView(context);
        subtitleView.setText("Descanso");
        subtitleView.setTextColor(COLOR_PERIWINKLE);
        subtitleView.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12f);
        subtitleView.setSingleLine(true);
        subtitleView.setEllipsize(TextUtils.TruncateAt.END);
        subtitleView.setMaxWidth(dp(116f));
        LinearLayout.LayoutParams subLp = new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        );
        subLp.setMarginStart(dp(8f));
        topRow.addView(subtitleView, subLp);

        chevronView = new TextView(context);
        chevronView.setText("▾");
        chevronView.setTextColor(COLOR_PERIWINKLE);
        chevronView.setTextSize(TypedValue.COMPLEX_UNIT_SP, 13f);
        LinearLayout.LayoutParams chevLp = new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        );
        chevLp.setMarginStart(dp(8f));
        topRow.addView(chevronView, chevLp);

        rootCard.addView(topRow);

        // Barra de progreso fina
        progressTrack = new FrameLayout(context);
        GradientDrawable trackBg = new GradientDrawable();
        trackBg.setColor(COLOR_TRACK);
        trackBg.setCornerRadius(dp(999f));
        progressTrack.setBackground(trackBg);
        LinearLayout.LayoutParams trackLp = new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            dp(3.5f)
        );
        trackLp.topMargin = dp(6f);

        progressFill = new View(context);
        progressFillBg = new GradientDrawable();
        progressFillBg.setColor(COLOR_ACCENT);
        progressFillBg.setCornerRadius(dp(999f));
        progressFill.setBackground(progressFillBg);
        progressTrack.addView(progressFill, new FrameLayout.LayoutParams(0, ViewGroup.LayoutParams.MATCH_PARENT));
        rootCard.addView(progressTrack, trackLp);

        // Sección desplegada: ejercicio + botones (+15 s, Saltar, Abrir)
        expandedSection = new LinearLayout(context);
        expandedSection.setOrientation(LinearLayout.VERTICAL);
        expandedSection.setVisibility(View.GONE);
        LinearLayout.LayoutParams expLp = new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        );
        expLp.topMargin = dp(8f);

        exerciseDetailView = new TextView(context);
        exerciseDetailView.setTextColor(COLOR_PERIWINKLE);
        exerciseDetailView.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12f);
        exerciseDetailView.setSingleLine(true);
        exerciseDetailView.setEllipsize(TextUtils.TruncateAt.END);
        exerciseDetailView.setMaxWidth(dp(250f));
        expandedSection.addView(exerciseDetailView);

        LinearLayout btnRow = new LinearLayout(context);
        btnRow.setOrientation(LinearLayout.HORIZONTAL);
        btnRow.setGravity(Gravity.CENTER_VERTICAL);
        LinearLayout.LayoutParams rowLp = new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        );
        rowLp.topMargin = dp(8f);

        btnAdd15 = createPillButton("+15 s", 0x22FFFFFF, 0x55FFFFFF, COLOR_WHITE);
        btnAdd15.setOnClickListener(v -> {
            if (callbacks != null) callbacks.onAdd15();
            if (!finishedMode) {
                mainHandler.removeCallbacks(autoCollapseTask);
                mainHandler.postDelayed(autoCollapseTask, AUTO_COLLAPSE_MS);
            }
        });
        btnRow.addView(btnAdd15);

        btnSkip = createPillButton("Saltar", 0x1AFFFFFF, 0x33FFFFFF, COLOR_PERIWINKLE);
        btnSkip.setOnClickListener(v -> {
            if (callbacks != null) callbacks.onSkip();
        });
        LinearLayout.LayoutParams skipLp = new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        );
        skipLp.setMarginStart(dp(6f));
        btnRow.addView(btnSkip, skipLp);

        btnOpen = createPillButton("Abrir ↗", COLOR_WHITE, COLOR_WHITE, 0xFF101A3D);
        btnOpen.setOnClickListener(v -> {
            if (callbacks != null) callbacks.onOpenApp();
        });
        LinearLayout.LayoutParams openLp = new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        );
        openLp.setMarginStart(dp(6f));
        btnRow.addView(btnOpen, openLp);

        expandedSection.addView(btnRow, rowLp);
        rootCard.addView(expandedSection, expLp);

        // Arrastre suave + toque corto para expandir/contraer
        rootCard.setOnTouchListener(new View.OnTouchListener() {
            private float downRawX;
            private float downRawY;
            private int startX;
            private int startY;
            private boolean dragging;

            @Override
            public boolean onTouch(View v, MotionEvent event) {
                if (layoutParams == null || windowManager == null) return false;
                switch (event.getActionMasked()) {
                    case MotionEvent.ACTION_DOWN:
                        downRawX = event.getRawX();
                        downRawY = event.getRawY();
                        startX = layoutParams.x;
                        startY = layoutParams.y;
                        dragging = false;
                        return true;

                    case MotionEvent.ACTION_MOVE:
                        float dx = event.getRawX() - downRawX;
                        float dy = event.getRawY() - downRawY;
                        if (!dragging && (Math.abs(dx) > touchSlop || Math.abs(dy) > touchSlop)) {
                            dragging = true;
                        }
                        if (dragging) {
                            DisplayMetrics dm = context.getResources().getDisplayMetrics();
                            int maxHalfX = Math.max(0, (dm.widthPixels - rootCard.getWidth()) / 2 - dp(6f));
                            int minY = Math.max(dp(8f), getStatusBarHeight() / 2);
                            int maxY = Math.max(minY, dm.heightPixels - rootCard.getHeight() - dp(36f));

                            layoutParams.x = clamp(startX + Math.round(dx), -maxHalfX, maxHalfX);
                            layoutParams.y = clamp(startY + Math.round(dy), minY, maxY);
                            try {
                                windowManager.updateViewLayout(rootCard, layoutParams);
                            } catch (Exception ignored) {
                            }
                        }
                        return true;

                    case MotionEvent.ACTION_UP:
                        if (dragging) {
                            RestTimerState.savePillPosition(context, layoutParams.x, layoutParams.y);
                        } else if (finishedMode) {
                            if (callbacks != null) callbacks.onOpenApp();
                        } else {
                            setExpanded(!expanded);
                        }
                        return true;

                    default:
                        return false;
                }
            }
        });
    }

    private TextView createPillButton(String text, int bgColor, int strokeColor, int textColor) {
        TextView tv = new TextView(context);
        tv.setText(text);
        tv.setTextColor(textColor);
        tv.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12.5f);
        tv.setTypeface(Typeface.DEFAULT_BOLD);
        tv.setPadding(dp(12f), dp(7f), dp(12f), dp(7f));
        tv.setSingleLine(true);

        GradientDrawable bg = new GradientDrawable();
        bg.setColor(bgColor);
        bg.setCornerRadius(dp(999f));
        bg.setStroke(dp(1f), strokeColor);
        tv.setBackground(bg);
        return tv;
    }

    private WindowManager.LayoutParams createLayoutParams() {
        int type = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            : WindowManager.LayoutParams.TYPE_PHONE;

        int flags =
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE |
            WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN |
            WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL;

        WindowManager.LayoutParams lp = new WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            type,
            flags,
            PixelFormat.TRANSLUCENT
        );
        lp.gravity = Gravity.TOP | Gravity.CENTER_HORIZONTAL;
        lp.x = RestTimerState.getPillX(context);
        int savedY = RestTimerState.getPillY(context);
        lp.y = savedY >= 0 ? savedY : defaultTopY();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            lp.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
        }
        return lp;
    }

    private int defaultTopY() {
        // Justo debajo de la barra de estado y de la cámara frontal centrada (OnePlus 13R).
        return getStatusBarHeight() + dp(8f);
    }

    private int getStatusBarHeight() {
        int resId = context.getResources().getIdentifier("status_bar_height", "dimen", "android");
        if (resId > 0) {
            return context.getResources().getDimensionPixelSize(resId);
        }
        return dp(32f);
    }

    private int dp(float value) {
        return Math.round(TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, value, context.getResources().getDisplayMetrics()));
    }

    private static int clamp(int value, int min, int max) {
        return Math.max(min, Math.min(max, value));
    }

    private static String compactSetLabel(String setLabel) {
        if (setLabel == null || setLabel.trim().isEmpty()) return "Descanso";
        return setLabel.trim();
    }

    private static String buildDetailLine(String exerciseName, String setLabel, boolean paused) {
        String ex = exerciseName != null ? exerciseName.trim() : "";
        String sl = setLabel != null ? setLabel.trim() : "";
        StringBuilder sb = new StringBuilder();
        if (!ex.isEmpty()) sb.append(ex);
        if (!sl.isEmpty()) {
            if (sb.length() > 0) sb.append(" · ");
            sb.append(sl);
        }
        if (paused) {
            if (sb.length() > 0) sb.append(" · ");
            sb.append("En pausa");
        }
        return sb.toString();
    }
}
