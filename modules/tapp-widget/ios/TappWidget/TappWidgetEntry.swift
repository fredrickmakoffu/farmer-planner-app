import WidgetKit

/// Timeline entry carrying the predicted category data for one widget render.
struct TappWidgetEntry: TimelineEntry {
    let date: Date
    let categoryName: String
    let colorHex: String
    /// MaterialCommunityIcons name from the DB, mapped to an SF Symbol in TappWidgetView.
    let iconName: String
    let deepLink: URL
}
