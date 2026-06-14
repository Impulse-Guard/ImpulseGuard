export interface StorageData {
  moneySaved: number;
  weeklySaved: number;
  blockedPurchases: number;
  totalImpulses: number;
  impulsesResisted: number;
  blockedItems: Record<string, number>; // itemId -> timestamp when blocked
  count: number;
}

export const BLOCK_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

const DEFAULT_STORAGE: StorageData = {
  moneySaved: 0,
  weeklySaved: 0,
  blockedPurchases: 0,
  totalImpulses: 0,
  impulsesResisted: 0,
  blockedItems: {},
  count: 0,
};

export async function getStorageData(): Promise<StorageData> {
  const result = await chrome.storage.local.get(Object.keys(DEFAULT_STORAGE));
  const data = { ...DEFAULT_STORAGE, ...result } as StorageData;

  // Migrate old array format to timestamp map
  if (Array.isArray(data.blockedItems)) {
    data.blockedItems = {};
    await chrome.storage.local.set({ blockedItems: {} });
  }

  return data;
}

export async function updateStorage(updates: Partial<StorageData>): Promise<void> {
  await chrome.storage.local.set(updates);
}

export interface BlockResult {
  isNewBlock: boolean;
  blockedAt: number;
}

export async function trackBlockedPurchase(
  itemPrice: number,
  itemId: string
): Promise<BlockResult> {
  const data = await getStorageData();
  const now = Date.now();

  const blockedAt = data.blockedItems[itemId];
  const isStillBlocked = blockedAt !== undefined && now - blockedAt < BLOCK_DURATION_MS;

  if (isStillBlocked) {
    console.log("⚠️ Impulse Guard: Item still within 24h block - not counting again");
    await updateStorage({ totalImpulses: data.totalImpulses + 1 });
    return { isNewBlock: false, blockedAt };
  }

  // New block or expired block — reset the timer
  const newBlockedItems = { ...data.blockedItems, [itemId]: now };
  await updateStorage({
    moneySaved: data.moneySaved + itemPrice,
    weeklySaved: data.weeklySaved + itemPrice,
    blockedPurchases: data.blockedPurchases + 1,
    totalImpulses: data.totalImpulses + 1,
    impulsesResisted: data.impulsesResisted + 1,
    blockedItems: newBlockedItems,
  });

  console.log(`💰 Impulse Guard: Blocked NEW purchase - Saved $${itemPrice.toFixed(2)}`);
  console.log(
    `📊 Stats - Total: $${(data.moneySaved + itemPrice).toFixed(2)}, Blocked: ${data.blockedPurchases + 1}, Success: ${Math.round(((data.blockedPurchases + 1) / (data.totalImpulses + 1)) * 100)}%`
  );

  return { isNewBlock: true, blockedAt: now };
}
