export function nativeDropZoneFrom(element: Element | null): string | null {
  return element?.closest<HTMLElement>("[data-native-drop-zone]")?.dataset.nativeDropZone ?? null;
}
