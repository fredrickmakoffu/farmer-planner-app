import WidgetKit
import SwiftUI

/// App group identifier — must match the entitlement configured by the config plugin.
private let appGroupId = "group.com.tapitappreactnative.widget"
private let userDefaultsKey = "tapp_widget_data"
private let deepLinkURL = URL(string: "tapp://expenses/tap?auto=true")!

/// Maps a MaterialCommunityIcons name (stored in the categories DB table) to the
/// closest SF Symbol name available on iOS 14+.
func sfSymbol(for icon: String) -> String {
    switch icon {
    case "silverware-fork-knife": return "fork.knife"
    case "bus":                   return "bus.fill"
    case "cart":                  return "cart.fill"
    case "lightning-bolt":        return "bolt.fill"
    case "movie-open":            return "film.fill"
    case "medical-bag":           return "cross.case.fill"
    case "shopping":              return "bag.fill"
    case "dots-horizontal":       return "ellipsis"
    default:                      return "hand.tap.fill"
    }
}

private func readWidgetState() -> (categoryName: String, colorHex: String, iconName: String) {
    guard
        let defaults = UserDefaults(suiteName: appGroupId),
        let json = defaults.string(forKey: userDefaultsKey),
        let data = json.data(using: .utf8),
        let dict = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
    else {
        return ("Tap", "#E8634A", "hand.tap.fill")
    }
    let name  = dict["categoryName"] as? String ?? "Tap"
    let color = dict["colorHex"]     as? String ?? "#E8634A"
    let icon  = dict["icon"]         as? String ?? ""
    return (name, color, sfSymbol(for: icon))
}

struct TappWidgetProvider: TimelineProvider {
    func placeholder(in context: Context) -> TappWidgetEntry {
        TappWidgetEntry(
            date: Date(),
            categoryName: "Food",
            colorHex: "#C97A4A",
            iconName: "fork.knife",
            deepLink: deepLinkURL
        )
    }

    func getSnapshot(in context: Context, completion: @escaping (TappWidgetEntry) -> Void) {
        let state = readWidgetState()
        completion(TappWidgetEntry(
            date: Date(),
            categoryName: state.categoryName,
            colorHex: state.colorHex,
            iconName: state.iconName,
            deepLink: deepLinkURL
        ))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<TappWidgetEntry>) -> Void) {
        let state = readWidgetState()
        let entry = TappWidgetEntry(
            date: Date(),
            categoryName: state.categoryName,
            colorHex: state.colorHex,
            iconName: state.iconName,
            deepLink: deepLinkURL
        )
        // Refresh every 30 minutes so the predicted category stays current.
        // The app also calls WidgetCenter.reloadTimelines on foreground and after routine changes.
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 30, to: Date())!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }
}
