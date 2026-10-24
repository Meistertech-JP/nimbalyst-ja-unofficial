import XCTest
@testable import NimbalystNative

@MainActor
private final class FakeFlushBridge: ConsoleFlushing {
    var calls: [Int] = []
    /// nil result = no bridge; a never-resolving flush is modelled by `hang`.
    var result: ConsoleFlushResult? = ConsoleFlushResult(status: .acknowledged)
    var hang = false

    func flushPending(timeoutMs: Int) async -> ConsoleFlushResult? {
        calls.append(timeoutMs)
        if hang { try? await Task.sleep(for: .seconds(30)) }
        return result
    }
}

@MainActor
private final class SuspendedUnsyncedEdits: PagesUnsyncedEdits {
    let unsynced = true
    private(set) var calls: [Int] = []
    private(set) var discards = 0
    private var continuation: CheckedContinuation<ConsoleFlushResult?, Never>?
    private var released = false

    func flushPending(timeoutMs: Int) async -> ConsoleFlushResult? {
        calls.append(timeoutMs)
        if released { return ConsoleFlushResult(status: .timedOut) }
        return await withCheckedContinuation { continuation = $0 }
    }

    func discardUnsynced() async -> Int? {
        discards += 1
        return 1
    }

    func release() {
        released = true
        let pending = continuation
        continuation = nil
        pending?.resume(returning: ConsoleFlushResult(status: .timedOut))
    }
}

@MainActor
private final class FakeBackgroundTasks: BackgroundTaskScheduling {
    var begun: [Int] = []
    var ended: [Int] = []
    var expirations: [@MainActor () -> Void] = []

    func begin(name: String, expiration: @escaping @MainActor () -> Void) -> Int? {
        let id = begun.count + 1
        begun.append(id)
        expirations.append(expiration)
        return id
    }

    func end(_ id: Int) { ended.append(id) }
}

@MainActor
final class PagesFlushCoordinatorTests: XCTestCase {
    private func makeDefaults() -> UserDefaults { UserDefaults(suiteName: UUID().uuidString)! }

    func testLeaveGuardDoesNotWaitForeverWhenTheBridgeNeverAnswers() async {
        let edits = SuspendedUnsyncedEdits()
        let guardUnderTest = PagesLeaveGuard(flushTimeoutMs: 20)
        let completed = expectation(description: "Leave guard rejects an unanswered flush")
        var permissionBeforeRelease: Bool?
        let request = Task { @MainActor in
            let permission = await guardUnderTest.mayProceed(edits: edits)
            permissionBeforeRelease = permission
            completed.fulfill()
            return permission
        }

        await fulfillment(of: [completed], timeout: 3)
        XCTAssertEqual(permissionBeforeRelease, false, "An unanswered bridge must finish without permission to leave")
        XCTAssertEqual(edits.calls, [20])
        XCTAssertEqual(edits.discards, 0, "Timeout must not discard unacknowledged edits")

        // Release even after a failed expectation so the old implementation
        // records a finite RED rather than leaving a suspended task in CI.
        edits.release()
        let permissionAfterCleanup = await request.value
        XCTAssertFalse(permissionAfterCleanup, "Cleanup cannot acknowledge an unanswered flush")
        XCTAssertEqual(edits.discards, 0)
    }

    func testBackgroundFlushesOnceAndEndsTheTaskOnAck() async {
        let tasks = FakeBackgroundTasks()
        let bridge = FakeFlushBridge()
        let coordinator = PagesFlushCoordinator(defaults: makeDefaults(), backgroundTasks: tasks)
        coordinator.bridge = bridge

        let outcome = await coordinator.sceneDidEnterBackground()
        XCTAssertEqual(outcome, .acknowledged)
        XCTAssertEqual(bridge.calls, [PagesFlushCoordinator.flushTimeoutMs])
        XCTAssertEqual(tasks.begun, [1])
        XCTAssertEqual(tasks.ended, [1])
        XCTAssertEqual(coordinator.recordedFailures, 0)
    }

    func testFailureAndConsoleTimeoutAreRecorded() async {
        let tasks = FakeBackgroundTasks()
        let bridge = FakeFlushBridge()
        let coordinator = PagesFlushCoordinator(defaults: makeDefaults(), backgroundTasks: tasks)
        coordinator.bridge = bridge

        bridge.result = ConsoleFlushResult(status: .failed, detail: "rejected")
        let failed = await coordinator.sceneDidEnterBackground()
        XCTAssertEqual(failed, .failed("rejected"))
        bridge.result = ConsoleFlushResult(status: .timedOut)
        let timedOut = await coordinator.sceneDidEnterBackground()
        XCTAssertEqual(timedOut, .timedOut)
        XCTAssertEqual(tasks.ended, [1, 2], "the task ends on every outcome")
        XCTAssertEqual(coordinator.recordedFailures, 2)
        XCTAssertEqual(coordinator.lastOutcome, .timedOut)
    }

    func testNativeTimeoutEndsTheTaskWhenTheConsoleNeverAnswers() async {
        let tasks = FakeBackgroundTasks()
        let bridge = FakeFlushBridge()
        bridge.hang = true
        let coordinator = PagesFlushCoordinator(defaults: makeDefaults(), backgroundTasks: tasks, nativeTimeout: .milliseconds(50))
        coordinator.bridge = bridge

        let outcome = await coordinator.sceneDidEnterBackground()
        XCTAssertEqual(outcome, .timedOut)
        XCTAssertEqual(tasks.ended, [1])
        XCTAssertEqual(coordinator.recordedFailures, 1)
    }

    func testExpirationEndsTheTaskExactlyOnce() async {
        let tasks = FakeBackgroundTasks()
        let bridge = FakeFlushBridge()
        bridge.hang = true
        let coordinator = PagesFlushCoordinator(defaults: makeDefaults(), backgroundTasks: tasks, nativeTimeout: .seconds(30))
        coordinator.bridge = bridge

        async let outcome = coordinator.sceneDidEnterBackground()
        while tasks.expirations.isEmpty { await Task.yield() }
        tasks.expirations[0]()
        tasks.expirations[0]()
        let settled = await outcome
        XCTAssertEqual(settled, .expired)
        XCTAssertEqual(tasks.ended, [1])
    }

    func testNoBridgeStartsNoTask() async {
        let tasks = FakeBackgroundTasks()
        let coordinator = PagesFlushCoordinator(defaults: makeDefaults(), backgroundTasks: tasks)
        let outcome = await coordinator.sceneDidEnterBackground()
        XCTAssertEqual(outcome, .noBridge)
        XCTAssertTrue(tasks.begun.isEmpty)
    }

    func testProcessKillWithUnsyncedEditsShowsTheNoticeOnce() {
        let defaults = makeDefaults()
        // Web content process killed in this app run.
        let coordinator = PagesFlushCoordinator(defaults: defaults, backgroundTasks: FakeBackgroundTasks())
        coordinator.editStateChanged(editing: true, unsynced: true)
        coordinator.contentProcessTerminated()
        XCTAssertTrue(coordinator.consumeLostEditsNotice())
        XCTAssertFalse(coordinator.consumeLostEditsNotice())

        // A kill with everything synced says nothing.
        coordinator.editStateChanged(editing: true, unsynced: false)
        coordinator.contentProcessTerminated()
        XCTAssertFalse(coordinator.consumeLostEditsNotice())
    }

    func testAppKillWithUnsyncedEditsShowsTheNoticeOnNextLaunch() {
        let defaults = makeDefaults()
        let before = PagesFlushCoordinator(defaults: defaults, backgroundTasks: FakeBackgroundTasks())
        before.editStateChanged(editing: true, unsynced: true)
        // The process dies here. Next launch:
        let after = PagesFlushCoordinator(defaults: defaults, backgroundTasks: FakeBackgroundTasks())
        XCTAssertTrue(after.consumeLostEditsNotice())
        let third = PagesFlushCoordinator(defaults: defaults, backgroundTasks: FakeBackgroundTasks())
        XCTAssertFalse(third.consumeLostEditsNotice(), "shown once, not on every launch")

        // Edits that reached the server clear the marker.
        let synced = PagesFlushCoordinator(defaults: defaults, backgroundTasks: FakeBackgroundTasks())
        synced.editStateChanged(editing: true, unsynced: true)
        synced.editStateChanged(editing: true, unsynced: false)
        XCTAssertFalse(PagesFlushCoordinator(defaults: defaults, backgroundTasks: FakeBackgroundTasks()).consumeLostEditsNotice())
    }
}
