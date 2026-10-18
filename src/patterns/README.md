# Design Patterns (Implemented from Scratch)

* **`factory/` — Simple Factory Pattern** (`docs/design-simple-factory.md`)
  `ApplianceFactory.createAppliance(category, data)` instantiates the concrete appliance product (`Refrigerator`, `WashingMachine`, `Dryer`, `Microwave`, `Oven`, `Dishwasher`, `AirConditioner`, `OtherAppliance`) so controllers operate purely against the abstract `Appliance` interface without calling `new` on concrete classes.
* **`observer/` — Observer Pattern** (`docs/design-observer.md`)
  Controllers publish domain events via `marketplaceEvents.publish(type, data)`. The `MarketplaceEventSubject` notifies all attached `Observer` implementations (`NotificationObserver`, `FavoriteWatcherObserver`, `ActivityLogObserver`), which pull the updated event state via `getState()` and execute their respective handlers.
