import {
  type ConfigPlugin,
  withAndroidManifest,
  withDangerousMod,
  withPlugins,
} from "@expo/config-plugins"
import * as fs from "fs"
import * as path from "path"
import withTappWidgetIos from "./withTappWidgetIos"

const UPDATE_ACTION = "android.appwidget.action.APPWIDGET_UPDATE"

/**
 * Generates a fully-qualified receiver class name from the app package.
 * e.g. "com.tapitappreactnative" → "com.tapitappreactnative.widget.TappWidgetProvider"
 */
function providerClass(appPackage: string) {
  return `${appPackage}.widget.TappWidgetProvider`
}

// ─── Kotlin template ────────────────────────────────────────────────────────
// Written verbatim into the app's source tree so it compiles with the app's
// own R class. The token __APP_PACKAGE__ is replaced at write time.
const KOTLIN_TEMPLATE = `
package __APP_PACKAGE__.widget

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
import __APP_PACKAGE__.R
import java.util.Calendar

private const val TAG = "TappWidget"
private const val PREFS_NAME = "TappWidgetPrefs"
private const val PREFS_LAST_TAP = "last_tapped_at"

/** Broadcast action fired when the user taps the widget. */
const val ACTION_WIDGET_TAP = "__APP_PACKAGE__.widget.ACTION_TAP"

private const val FEEDBACK_MS = 2500L
private const val DEBOUNCE_MS = 3000L
private const val DEFAULT_COLOR = "#E8634A"

/**
 * Tapp 1x1 home-screen widget.
 *
 * Tap flow (no app launch):
 *  1. Circle tap fires ACTION_WIDGET_TAP broadcast.
 *  2. onReceive debounces, calls goAsync(), shows category color + checkmark.
 *  3. Background thread writes directly to the app's SQLite DB, then sleeps
 *     FEEDBACK_MS before reverting to the predicted-category color + emoji.
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

        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val now = System.currentTimeMillis()
        if (now - prefs.getLong(PREFS_LAST_TAP, 0L) < DEBOUNCE_MS) return
        prefs.edit().putLong(PREFS_LAST_TAP, now).apply()

        val pendingResult = goAsync()
        val manager = AppWidgetManager.getInstance(context)

        showTappedState(context, manager, widgetId)

        Thread {
            try { logExpense(context) } catch (e: Exception) { Log.e(TAG, "logExpense failed", e) }
            try { Thread.sleep(FEEDBACK_MS) } catch (_: InterruptedException) {}
            updateWidget(context, manager, widgetId)
            pendingResult.finish()
        }.start()
    }

    companion object {

        /** Public: called by TappWidgetModule to force an immediate redraw. */
        fun updateWidget(context: Context, manager: AppWidgetManager, appWidgetId: Int) {
            val views = buildNormalViews(context)
            attachTapIntent(context, views, appWidgetId)
            manager.updateAppWidget(appWidgetId, views)
        }

        // ── Visual states ────────────────────────────────────────────────────

        private fun showTappedState(context: Context, manager: AppWidgetManager, id: Int) {
            val predicted = predictFromDb(context)
            val color = runCatching { Color.parseColor(predicted?.colorHex ?: DEFAULT_COLOR) }
                .getOrDefault(Color.parseColor(DEFAULT_COLOR))

            val views = RemoteViews(context.packageName, R.layout.tapp_widget)
            views.setInt(R.id.widget_circle, "setColorFilter", color)
            views.setImageViewResource(R.id.widget_icon_image, drawableResForIcon(predicted?.icon ?: ""))
            views.setOnClickPendingIntent(R.id.widget_root, null)
            manager.updateAppWidget(id, views)
        }

        private fun buildNormalViews(context: Context): RemoteViews {
            val views = RemoteViews(context.packageName, R.layout.tapp_widget)
            val predicted = predictFromDb(context)
            val color = runCatching { Color.parseColor(predicted?.colorHex ?: DEFAULT_COLOR) }
                .getOrDefault(Color.parseColor(DEFAULT_COLOR))

            views.setInt(R.id.widget_circle, "setColorFilter", color)
            views.setImageViewResource(R.id.widget_icon_image, drawableResForIcon(predicted?.icon ?: ""))
            return views
        }

        private fun attachTapIntent(context: Context, views: RemoteViews, appWidgetId: Int) {
            val intent = Intent(context, TappWidgetProvider::class.java).apply {
                action = ACTION_WIDGET_TAP
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
            }
            val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M)
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            else PendingIntent.FLAG_UPDATE_CURRENT
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

        // ── SQLite ───────────────────────────────────────────────────────────

        private data class Prediction(
            val categoryName: String,
            val colorHex: String,
            val icon: String,
            val defaultAmount: Int,
        )

        private fun predictFromDb(context: Context): Prediction? {
            val dbFile = context.getDatabasePath("tapp.db")
            if (!dbFile.exists()) return null
            return try {
                SQLiteDatabase.openDatabase(
                    dbFile.path, null, SQLiteDatabase.OPEN_READONLY
                ).use { db ->
                    val categoryId = predictCategory(db) ?: return null
                    db.rawQuery(
                        "SELECT name, color_hex, icon, default_amount FROM categories WHERE id = ? LIMIT 1",
                        arrayOf(categoryId.toString()),
                    ).use { c ->
                        if (!c.moveToFirst()) null
                        else Prediction(
                            c.getString(0) ?: "Tap",
                            c.getString(1) ?: DEFAULT_COLOR,
                            c.getString(2) ?: "",
                            if (c.isNull(3)) 0 else c.getInt(3),
                        )
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "predictFromDb failed", e)
                null
            }
        }

        private fun logExpense(context: Context) {
            val dbFile = context.getDatabasePath("tapp.db")
            if (!dbFile.exists()) { Log.w(TAG, "tapp.db not found"); return }
            SQLiteDatabase.openDatabase(
                dbFile.path, null, SQLiteDatabase.OPEN_READWRITE
            ).use { db ->
                val categoryId = predictCategory(db)
                val amount = if (categoryId != null) getDefaultAmount(db, categoryId) else 100
                val now = System.currentTimeMillis()
                db.insert("expense_events", null, ContentValues().apply {
                    put("amount", amount)
                    if (categoryId != null) put("category_id", categoryId)
                    put("created_at", now)
                })
                db.insert("outbox", null, ContentValues().apply {
                    val cat = if (categoryId != null) ""","category_id":${'$'}categoryId""" else ""
                    put("payload", """{"type":"expense_event","amount":${'$'}amount${'$'}cat,"created_at":${'$'}now}""")
                    put("created_at", now)
                })
            }
        }

        private fun predictCategory(db: SQLiteDatabase): Int? {
            val cal = Calendar.getInstance()
            val minutes = cal.get(Calendar.HOUR_OF_DAY) * 60 + cal.get(Calendar.MINUTE)
            val dayBit = 1 shl (cal.get(Calendar.DAY_OF_WEEK) - 1)

            db.rawQuery(
                """SELECT category_id FROM routines
                   WHERE (days_of_week & ?) != 0
                     AND time_start <= ? AND time_end > ?
                     AND category_id IS NOT NULL LIMIT 1""",
                arrayOf(dayBit.toString(), minutes.toString(), minutes.toString()),
            ).use { c -> if (c.moveToFirst()) return c.getInt(0) }

            db.rawQuery(
                """SELECT category_id, COUNT(*) as cnt FROM expense_events
                   WHERE category_id IS NOT NULL
                     AND ((CAST(created_at / 60000 AS INTEGER) % 1440) BETWEEN ? AND ?)
                   GROUP BY category_id ORDER BY cnt DESC LIMIT 1""",
                arrayOf((minutes - 90).coerceAtLeast(0).toString(),
                        (minutes + 90).coerceAtMost(1439).toString()),
            ).use { c -> if (c.moveToFirst()) return c.getInt(0) }

            return null
        }

        private fun getDefaultAmount(db: SQLiteDatabase, categoryId: Int): Int {
            db.rawQuery(
                "SELECT default_amount FROM categories WHERE id = ? LIMIT 1",
                arrayOf(categoryId.toString()),
            ).use { c ->
                if (c.moveToFirst() && !c.isNull(0)) return c.getInt(0)
            }
            return 100
        }
    }
}
`.trimStart()

// ─── AppWidgetProviderInfo XML (inline — no copy needed) ────────────────────
const WIDGET_INFO_XML = `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="40dp"
    android:minHeight="40dp"
    android:targetCellWidth="1"
    android:targetCellHeight="1"
    android:updatePeriodMillis="1800000"
    android:initialLayout="@layout/tapp_widget"
    android:widgetCategory="home_screen"
    android:description="@string/widget_description"
    android:previewLayout="@layout/tapp_widget" />
`

// ─── Plugin ──────────────────────────────────────────────────────────────────

const withTappWidget: ConfigPlugin = (config) => {
  const appPackage = config.android?.package ?? "com.tapitappreactnative"
  const receiverClass = providerClass(appPackage)

  // 1. AndroidManifest.xml — <receiver> entry for TappWidgetProvider
  config = withAndroidManifest(config, (cfg) => {
    const app = cfg.modResults.manifest.application?.[0]
    if (!app) return cfg

    const receivers: any[] = app.receiver ?? []
    const alreadyAdded = receivers.some((r) => r.$?.["android:name"] === receiverClass)

    if (!alreadyAdded) {
      receivers.push({
        $: { "android:name": receiverClass, "android:exported": "true" },
        "intent-filter": [{ action: [{ $: { "android:name": UPDATE_ACTION } }] }],
        "meta-data": [{
          $: {
            "android:name": "android.appwidget.provider",
            "android:resource": "@xml/tapp_widget_info",
          },
        }],
      })
      app.receiver = receivers
    }

    return cfg
  })

  // 2. Write Kotlin + resources into the Android app source tree
  config = withDangerousMod(config, [
    "android",
    (cfg) => {
      const root = cfg.modRequest.projectRoot

      // 2a. Write TappWidgetProvider.kt into the app's own package directory
      const packageDir = appPackage.replace(/\./g, "/")
      const kotlinDir = path.join(root, "android", "app", "src", "main", "java", packageDir, "widget")
      fs.mkdirSync(kotlinDir, { recursive: true })
      fs.writeFileSync(
        path.join(kotlinDir, "TappWidgetProvider.kt"),
        KOTLIN_TEMPLATE.replace(/__APP_PACKAGE__/g, appPackage),
        "utf8",
      )

      // 2b. Copy / write widget resources
      const androidResDir = path.join(root, "android", "app", "src", "main", "res")
      const moduleResDir  = path.join(__dirname, "..", "android", "src", "main", "res")

      copyDirSync(path.join(moduleResDir, "layout"),   path.join(androidResDir, "layout"))
      copyDirSync(path.join(moduleResDir, "drawable"), path.join(androidResDir, "drawable"))

      // Write tapp_widget_info.xml directly (inline, so updatePeriodMillis is guaranteed correct)
      const xmlDir = path.join(androidResDir, "xml")
      fs.mkdirSync(xmlDir, { recursive: true })
      fs.writeFileSync(path.join(xmlDir, "tapp_widget_info.xml"), WIDGET_INFO_XML, "utf8")

      // Strings
      const srcStrings  = path.join(moduleResDir, "values", "strings.xml")
      const destStrings = path.join(androidResDir, "values", "tapp_widget_strings.xml")
      if (fs.existsSync(srcStrings)) {
        fs.mkdirSync(path.dirname(destStrings), { recursive: true })
        fs.copyFileSync(srcStrings, destStrings)
      }

      return cfg
    },
  ])

  // 3. iOS config plugin
  config = withPlugins(config, [withTappWidgetIos])

  return config
}

function copyDirSync(src: string, dest: string) {
  if (!fs.existsSync(src)) return
  fs.mkdirSync(dest, { recursive: true })
  for (const file of fs.readdirSync(src)) {
    const srcFile  = path.join(src, file)
    const destFile = path.join(dest, file)
    if (fs.statSync(srcFile).isFile()) fs.copyFileSync(srcFile, destFile)
  }
}

export default withTappWidget
