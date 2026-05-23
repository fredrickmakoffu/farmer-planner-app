package com.tapp.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.database.sqlite.SQLiteDatabase
import android.graphics.Color
import android.os.Build
import android.util.Log
import android.widget.RemoteViews
import com.tapp.widget.R
import org.json.JSONObject
import java.io.File
import java.util.Calendar

private const val TAG = "TappWidget"

/** Custom broadcast action fired when the user taps the widget circle. */
const val ACTION_WIDGET_TAP = "com.tapp.widget.ACTION_TAP"

private const val FEEDBACK_DURATION_MS = 2500L

/** Ignore subsequent taps within this window to prevent double-logging. */
private const val DEBOUNCE_MS = 3000L
private const val PREFS_LAST_TAP_KEY = "last_tapped_at"

/** Coral brand color shown when there is no predicted category yet. */
private const val DEFAULT_COLOR = "#E8634A"

/**
 * Home-screen widget for Tapp.
 *
 * Tap flow (no app launch):
 *  1. Widget circle tap fires ACTION_WIDGET_TAP broadcast back to this receiver.
 *  2. onReceive debounces the tap and calls goAsync() to keep the process alive.
 *  3. The tapped state is shown immediately: category color + category emoji.
 *  4. A background thread opens the app's SQLite DB directly, predicts the
 *     category from the routines table, and inserts a new expense_events row
 *     plus an outbox row for later sync.
 *  5. After FEEDBACK_DURATION_MS the widget reverts to the predicted-category state.
 */
class TappWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        manager: AppWidgetManager,
        appWidgetIds: IntArray,
    ) {
        for (id in appWidgetIds) updateWidget(context, manager, id)
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action != ACTION_WIDGET_TAP) return

        val widgetId = intent.getIntExtra(
            AppWidgetManager.EXTRA_APPWIDGET_ID,
            AppWidgetManager.INVALID_APPWIDGET_ID,
        )
        if (widgetId == AppWidgetManager.INVALID_APPWIDGET_ID) return

        val prefs = TappWidgetModule.getPrefs(context)
        val lastTap = prefs.getLong(PREFS_LAST_TAP_KEY, 0L)
        val now = System.currentTimeMillis()
        if (now - lastTap < DEBOUNCE_MS) {
            Log.d(TAG, "Tap debounced (${now - lastTap}ms since last tap)")
            return
        }
        prefs.edit().putLong(PREFS_LAST_TAP_KEY, now).apply()

        val pendingResult = goAsync()
        val manager = AppWidgetManager.getInstance(context)

        // Show the predicted category color + icon immediately as feedback
        showTappedState(context, manager, widgetId)

        Thread {
            try {
                logExpense(context)
            } catch (e: Exception) {
                Log.e(TAG, "Failed to log expense from widget", e)
            }
            try {
                Thread.sleep(FEEDBACK_DURATION_MS)
            } catch (_: InterruptedException) {}
            updateWidget(context, manager, widgetId)
            pendingResult.finish()
        }.start()
    }

    companion object {

        /** Draws the widget in its normal predicted-category state. */
        fun updateWidget(
            context: Context,
            manager: AppWidgetManager,
            appWidgetId: Int,
        ) {
            val views = buildNormalViews(context)
            attachTapIntent(context, views, appWidgetId)
            manager.updateAppWidget(appWidgetId, views)
        }

        // ── Visual states ────────────────────────────────────────────────────

        /**
         * Shows the predicted category color + emoji immediately on tap.
         * Reading from SharedPreferences is safe here because setWidgetData()
         * was called by the JS side the last time the app foregrounded, so the
         * prediction matches what we are about to log.
         */
        private fun showTappedState(
            context: Context,
            manager: AppWidgetManager,
            appWidgetId: Int,
        ) {
            val json = TappWidgetModule.readWidgetData(context)
            val state = json?.let { runCatching { JSONObject(it) }.getOrNull() }

            val colorHex = state?.optString("colorHex", DEFAULT_COLOR) ?: DEFAULT_COLOR
            val color = runCatching { Color.parseColor(colorHex) }
                .getOrDefault(Color.parseColor(DEFAULT_COLOR))

            val icon = state?.optString("icon", "") ?: ""
            val iconRes = drawableResForIcon(icon)

            val views = RemoteViews(context.packageName, R.layout.tapp_widget)
            views.setInt(R.id.widget_circle, "setColorFilter", color)
            views.setImageViewResource(R.id.widget_icon_image, iconRes)

            // Disable tap during the feedback window (debounce is the second line of defence)
            views.setOnClickPendingIntent(R.id.widget_root, null)
            manager.updateAppWidget(appWidgetId, views)
        }

        private fun buildNormalViews(context: Context): RemoteViews {
            val views = RemoteViews(context.packageName, R.layout.tapp_widget)
            val json = TappWidgetModule.readWidgetData(context)
            val state = json?.let { runCatching { JSONObject(it) }.getOrNull() }

            val colorHex = state?.optString("colorHex", DEFAULT_COLOR) ?: DEFAULT_COLOR
            val icon = state?.optString("icon", "") ?: ""

            val color = runCatching { Color.parseColor(colorHex) }
                .getOrDefault(Color.parseColor(DEFAULT_COLOR))

            views.setInt(R.id.widget_circle, "setColorFilter", color)
            views.setImageViewResource(R.id.widget_icon_image, drawableResForIcon(icon))

            return views
        }

        private fun attachTapIntent(context: Context, views: RemoteViews, appWidgetId: Int) {
            val intent = Intent(context, TappWidgetProvider::class.java).apply {
                action = ACTION_WIDGET_TAP
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
            }
            val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M)
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            else
                PendingIntent.FLAG_UPDATE_CURRENT

            val pending = PendingIntent.getBroadcast(context, appWidgetId, intent, flags)
            views.setOnClickPendingIntent(R.id.widget_root, pending)
        }

        // ── Icon mapping ─────────────────────────────────────────────────────

        /** Maps a MaterialCommunityIcons name to its widget Material icon drawable resource. */
        private fun drawableResForIcon(icon: String): Int = when (icon) {
            "silverware-fork-knife" -> R.drawable.widget_ic_food
            "bus"                   -> R.drawable.widget_ic_bus
            "cart"                  -> R.drawable.widget_ic_cart
            "lightning-bolt"        -> R.drawable.widget_ic_bolt
            "movie-open"            -> R.drawable.widget_ic_movie
            "medical-bag"           -> R.drawable.widget_ic_medical
            "shopping"              -> R.drawable.widget_ic_shopping
            "dots-horizontal"       -> R.drawable.widget_ic_more
            else                    -> R.drawable.widget_ic_tap
        }

        // ── Database write ───────────────────────────────────────────────────

        private fun logExpense(context: Context) {
            val dbFile = File(context.filesDir, "SQLite/tapp.db")
            if (!dbFile.exists()) {
                Log.w(TAG, "tapp.db not found — open the app at least once before using the widget")
                return
            }
            SQLiteDatabase.openDatabase(
                dbFile.path, null, SQLiteDatabase.OPEN_READWRITE,
            ).use { db ->
                val categoryId = predictCategory(db)
                val amount = if (categoryId != null) getDefaultAmount(db, categoryId) else 100
                val createdAt = System.currentTimeMillis()

                db.insert("expense_events", null, ContentValues().apply {
                    put("amount", amount)
                    if (categoryId != null) put("category_id", categoryId)
                    put("created_at", createdAt)
                })

                db.insert("outbox", null, ContentValues().apply {
                    put("payload", outboxJson(categoryId, amount, createdAt))
                    put("created_at", createdAt)
                })

                Log.d(TAG, "Logged expense: categoryId=$categoryId amount=$amount")
            }
        }

        /**
         * Mirrors the JS predictCategory() routine-window logic:
         * finds the first routine whose time window contains the current time
         * on the current day-of-week, then returns its category_id.
         */
        private fun predictCategory(db: SQLiteDatabase): Int? {
            val cal = Calendar.getInstance()
            val minutes = cal.get(Calendar.HOUR_OF_DAY) * 60 + cal.get(Calendar.MINUTE)
            // Calendar.DAY_OF_WEEK: Sunday=1 … Saturday=7 → bit 0 … bit 6
            val dayBit = 1 shl (cal.get(Calendar.DAY_OF_WEEK) - 1)

            db.rawQuery(
                """SELECT category_id FROM routines
                   WHERE (days_of_week & ?) != 0
                     AND time_start <= ? AND time_end > ?
                     AND category_id IS NOT NULL
                   LIMIT 1""",
                arrayOf(dayBit.toString(), minutes.toString(), minutes.toString()),
            ).use { cursor ->
                if (cursor.moveToFirst()) return cursor.getInt(0)
            }

            // Historical fallback: most common category used in a ±90-min window
            val windowStart = minutes - 90
            val windowEnd = minutes + 90
            db.rawQuery(
                """SELECT category_id, COUNT(*) as cnt
                   FROM expense_events
                   WHERE category_id IS NOT NULL
                     AND ((CAST(created_at / 60000 AS INTEGER) % 1440) BETWEEN ? AND ?)
                   GROUP BY category_id ORDER BY cnt DESC LIMIT 1""",
                arrayOf(windowStart.coerceAtLeast(0).toString(), windowEnd.coerceAtMost(1439).toString()),
            ).use { cursor ->
                if (cursor.moveToFirst()) return cursor.getInt(0)
            }

            return null
        }

        private fun getDefaultAmount(db: SQLiteDatabase, categoryId: Int): Int {
            db.rawQuery(
                "SELECT default_amount FROM categories WHERE id = ? LIMIT 1",
                arrayOf(categoryId.toString()),
            ).use { cursor ->
                if (cursor.moveToFirst() && !cursor.isNull(0)) return cursor.getInt(0)
            }
            return 100
        }

        private fun outboxJson(categoryId: Int?, amount: Int, createdAt: Long): String {
            val cat = if (categoryId != null) ""","category_id":$categoryId""" else ""
            return """{"type":"expense_event","amount":$amount$cat,"created_at":$createdAt}"""
        }
    }
}
