/**
 * Which tab each studio Tabs shows, by Tabs id (doc 272 rule 10). The active tab is the Tabs renderer's own state, but
 * a palette click with the Tabs selected must land in it, so the renderer records it here for `appendTarget`.
 * Studio-local and in memory: nothing about it is authored.
 */
const active = new Map<string, string>();

export function setActiveTab(tabsId: string, tabId: string): void {
  active.set(tabsId, tabId);
}

export function activeTabOf(tabsId: string): string | undefined {
  return active.get(tabsId);
}
