interface DeviceOrientationEventiOS extends DeviceOrientationEvent {
  requestPermission?: () => Promise<'granted' | 'denied'>
}

interface DeviceOrientationEventStatic extends EventTarget {
  requestPermission?: () => Promise<'granted' | 'denied'>
}

interface Window {
  DeviceOrientationEvent: DeviceOrientationEventStatic & {
    new(type: string, eventInitDict?: DeviceOrientationEventInit): DeviceOrientationEventiOS;
    prototype: DeviceOrientationEventiOS;
  }
}
