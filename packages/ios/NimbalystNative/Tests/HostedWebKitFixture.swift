#if os(iOS)
import XCTest
import UIKit
import WebKit

/// Establish the simulator's WebKit environment before timing bridge behavior.
/// This is not a product cold-start performance test. A failed bootstrap is
/// retained as a failure for the suite, never retried by another test case.
@MainActor
final class HostedWebKitFixture: NSObject, WKNavigationDelegate {
    static let shared = HostedWebKitFixture()

    private var attempted = false
    private var prepared = false
    private var window: UIWindow?
    private var bootstrapView: WKWebView?
    private var navigationExpectation: XCTestExpectation?
    private var navigationSucceeded = false
    private var scriptSucceeded = false
    private var navigationError: Error?

    func prepare(for testCase: XCTestCase) async throws {
        if attempted {
            _ = try XCTUnwrap(prepared ? window : nil, "WebKit environment bootstrap previously failed; no retry")
            return
        }
        attempted = true
        _ = try XCTUnwrap(UIApplication.shared.delegate, "Run simulator tests with NimbalystNativeHostedTests")
        let scene = try XCTUnwrap(
            UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
                .first { $0.activationState == .foregroundActive },
            "WebKit integration tests require a foreground-active application scene"
        )
        let hostWindow = UIWindow(windowScene: scene)
        hostWindow.frame = scene.coordinateSpace.bounds
        let container = UIViewController()
        hostWindow.rootViewController = container
        hostWindow.makeKeyAndVisible()
        hostWindow.layoutIfNeeded()
        window = hostWindow

        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .nonPersistent()
        let bootstrap = WKWebView(frame: container.view.bounds, configuration: configuration)
        bootstrap.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        bootstrap.navigationDelegate = self
        container.view.addSubview(bootstrap)
        container.view.layoutIfNeeded()
        bootstrapView = bootstrap
        let navigation = testCase.expectation(description: "WebKit environment bootstrap navigation")
        navigationExpectation = navigation
        bootstrap.loadHTMLString("""
            <!doctype html><html><head><title>WebKit fixture bootstrap</title></head>
            <body><script>window.__fixtureBootstrap = 'ready';</script></body></html>
            """, baseURL: nil)
        // Environment startup has its own gate. The Pages fixture's existing
        // ten-second bridge deadline starts only after this gate succeeds.
        await testCase.fulfillment(of: [navigation], timeout: 60)
        bootstrap.navigationDelegate = nil
        navigationExpectation = nil
        if let navigationError { throw navigationError }
        _ = try XCTUnwrap(navigationSucceeded ? bootstrap : nil, "WebKit environment bootstrap did not finish")
        _ = try XCTUnwrap(scriptSucceeded ? bootstrap : nil, "WebKit environment bootstrap JavaScript failed")
        _ = try XCTUnwrap(bootstrap.window === hostWindow && bootstrap.bounds.width > 0 && bootstrap.bounds.height > 0 ? hostWindow : nil,
                          "WebKit environment bootstrap requires a visible, nonzero window")
        prepared = true
    }

    func attach(_ webView: WKWebView) throws {
        let hostWindow = try XCTUnwrap(prepared ? window : nil, "Prepare the WebKit environment before attaching a fixture")
        let container = try XCTUnwrap(hostWindow.rootViewController?.view)
        webView.frame = container.bounds
        webView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        container.addSubview(webView)
        container.layoutIfNeeded()
        _ = try XCTUnwrap(webView.window === hostWindow && !hostWindow.isHidden && webView.bounds.width > 0 && webView.bounds.height > 0 ? webView : nil,
                          "The Pages fixture must be attached to its visible host window")
    }

    private func completeNavigation(error: Error? = nil) {
        guard let expectation = navigationExpectation else { return }
        navigationExpectation = nil
        navigationError = error
        navigationSucceeded = error == nil
        expectation.fulfill()
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        Task { @MainActor [weak self] in
            guard let self, self.navigationExpectation != nil else { return }
            do {
                let result = try await webView.evaluateJavaScript("window.__fixtureBootstrap") as? String
                self.scriptSucceeded = result == "ready"
                self.completeNavigation()
            } catch {
                self.completeNavigation(error: error)
            }
        }
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        completeNavigation(error: error)
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        completeNavigation(error: error)
    }
}
#endif
