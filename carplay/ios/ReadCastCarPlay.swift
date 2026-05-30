import Foundation
import React

/// RN bridge module that mirrors the JS listen queue / now-playing into a shared
/// store, and emits an event back to JS when the user selects an article in
/// CarPlay. The CarPlay scene (see CarPlaySceneDelegate.swift) reads this store.
@objc(ReadCastCarPlay)
class ReadCastCarPlay: RCTEventEmitter {

  struct QueueItem {
    let articleId: String
    let title: String
    let siteName: String
  }

  // Shared state the CarPlay scene observes.
  static let shared = State()
  final class State {
    private(set) var queue: [QueueItem] = []
    private(set) var nowPlayingTitle: String = ""
    private(set) var nowPlayingSubtitle: String = ""
    var onQueueChanged: (() -> Void)?

    func setQueue(_ items: [QueueItem]) {
      queue = items
      onQueueChanged?()
    }
    func setNowPlaying(title: String, subtitle: String) {
      nowPlayingTitle = title
      nowPlayingSubtitle = subtitle
    }
  }

  private var hasListeners = false

  override static func requiresMainQueueSetup() -> Bool { true }

  override func supportedEvents() -> [String]! {
    ["carplay:selectArticle"]
  }

  override func startObserving() { hasListeners = true }
  override func stopObserving() { hasListeners = false }

  /// Called from JS: getCarPlay().setQueue(items)
  @objc(setQueue:)
  func setQueue(_ items: [[String: Any]]) {
    let mapped = items.map {
      QueueItem(
        articleId: $0["articleId"] as? String ?? "",
        title: $0["title"] as? String ?? "",
        siteName: $0["siteName"] as? String ?? ""
      )
    }
    DispatchQueue.main.async {
      ReadCastCarPlay.shared.setQueue(mapped)
    }
  }

  /// Called from JS: getCarPlay().setNowPlaying(info)
  @objc(setNowPlaying:)
  func setNowPlaying(_ info: [String: Any]?) {
    let title = info?["title"] as? String ?? ""
    let subtitle = info?["siteName"] as? String ?? ""
    DispatchQueue.main.async {
      ReadCastCarPlay.shared.setNowPlaying(title: title, subtitle: subtitle)
    }
  }

  /// Called by the CarPlay scene when the user taps a list item.
  func emitSelect(articleId: String) {
    guard hasListeners else { return }
    sendEvent(withName: "carplay:selectArticle", body: ["articleId": articleId])
  }
}
