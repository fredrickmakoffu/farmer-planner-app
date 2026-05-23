import WidgetKit
import SwiftUI

@main
struct TappWidget: Widget {
    let kind = "TappWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: TappWidgetProvider()) { entry in
            TappWidgetView(entry: entry)
        }
        .configurationDisplayName("Tapp")
        .description("Tap once to log an expense.")
        .supportedFamilies([.systemSmall])
    }
}
