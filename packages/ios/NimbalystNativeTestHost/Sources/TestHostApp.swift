import SwiftUI

/// UIKit lifecycle for simulator integration tests, without starting the product app.
@main
struct NativeTestHostApp: App {
    var body: some Scene {
        WindowGroup { Color.clear }
    }
}
