import SwiftUI
import WidgetKit

/// Parses a CSS hex color string (#RRGGBB or #RGB) into a SwiftUI Color.
private func colorFromHex(_ hex: String) -> Color {
    var h = hex.trimmingCharacters(in: .whitespaces)
    if h.hasPrefix("#") { h = String(h.dropFirst()) }
    if h.count == 3 {
        h = h.map { "\($0)\($0)" }.joined()
    }
    guard h.count == 6, let value = UInt64(h, radix: 16) else {
        return Color(red: 0.91, green: 0.39, blue: 0.29) // coral fallback
    }
    let r = Double((value >> 16) & 0xFF) / 255
    let g = Double((value >> 8) & 0xFF) / 255
    let b = Double(value & 0xFF) / 255
    return Color(red: r, green: g, blue: b)
}

struct TappWidgetView: View {
    let entry: TappWidgetEntry

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            Circle()
                .fill(colorFromHex(entry.colorHex))
                .padding(6)
                .overlay(
                    Image(systemName: entry.iconName)
                        .font(.system(size: 26, weight: .medium))
                        .foregroundColor(.white)
                )
        }
        .widgetURL(entry.deepLink)
    }
}
