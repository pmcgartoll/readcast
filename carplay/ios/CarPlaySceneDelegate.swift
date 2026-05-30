import CarPlay
import Foundation

/// CarPlay audio-app scene. Builds a "Listen Queue" list from the shared store
/// and shows the Now Playing template. Selecting an item notifies JS via the
/// ReadCastCarPlay bridge, which loads and plays it through the same player.
class CarPlaySceneDelegate: UIResponder, CPTemplateApplicationSceneDelegate {

  var interfaceController: CPInterfaceController?

  func templateApplicationScene(
    _ scene: CPTemplateApplicationScene,
    didConnect interfaceController: CPInterfaceController
  ) {
    self.interfaceController = interfaceController

    ReadCastCarPlay.shared.onQueueChanged = { [weak self] in
      self?.updateRootTemplate()
    }
    updateRootTemplate()
  }

  func templateApplicationScene(
    _ scene: CPTemplateApplicationScene,
    didDisconnect interfaceController: CPInterfaceController
  ) {
    self.interfaceController = nil
    ReadCastCarPlay.shared.onQueueChanged = nil
  }

  private func updateRootTemplate() {
    let items = ReadCastCarPlay.shared.queue.map { item -> CPListItem in
      let listItem = CPListItem(text: item.title, detailText: item.siteName)
      listItem.handler = { [weak self] _, completion in
        self?.bridgeModule()?.emitSelect(articleId: item.articleId)
        completion()
      }
      return listItem
    }

    let section = CPListSection(items: items)
    let listTemplate = CPListTemplate(title: "Listen Queue", sections: [section])

    interfaceController?.setRootTemplate(listTemplate, animated: true, completion: nil)
  }

  /// Resolves the live bridge module instance from the React bridge.
  private func bridgeModule() -> ReadCastCarPlay? {
    // In your AppDelegate, expose the RCTBridge so it can be reached here, e.g.
    // (UIApplication.shared.delegate as? AppDelegate)?.bridge?.module(for: ReadCastCarPlay.self)
    return nil
  }
}
