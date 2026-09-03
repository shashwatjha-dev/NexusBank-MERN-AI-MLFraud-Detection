import Device from "../models/Device.js";

/**
 * Device fingerprint upserts. Called at every authenticated action that we
 * want to track for the security center (login, transfer, beneficiary add).
 *
 * `isNew` is `true` iff the (user, deviceIdentifier) pair was created by this
 * call — that is exactly the signal the fraud rule engine uses for the
 * NEW_DEVICE rule.
 */

export async function upsertDevice({
  userId,
  deviceIdentifier,
  browser = null,
  operatingSystem = null,
}) {
  if (!userId || !deviceIdentifier) {
    return { device: null, isNew: false };
  }

  const now = new Date();
  const filter = { user: userId, deviceIdentifier };
  const set = { lastSeenAt: now };
  if (browser) set.browser = browser;
  if (operatingSystem) set.operatingSystem = operatingSystem;

  const setOnInsert = { firstSeenAt: now, trusted: false };

  // Two-step upsert lets us tell whether we inserted or matched an existing row.
  const before = await Device.findOne(filter).lean();

  const device = await Device.findOneAndUpdate(
    filter,
    { $set: set, $setOnInsert: setOnInsert },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();

  return { device, isNew: !before };
}

export async function markDeviceTrusted({ userId, deviceIdentifier }) {
  return Device.findOneAndUpdate(
    { user: userId, deviceIdentifier },
    { $set: { trusted: true, lastSeenAt: new Date() } },
    { new: true }
  ).lean();
}

export async function listUserDevices(userId) {
  return Device.find({ user: userId }).sort({ lastSeenAt: -1 }).lean();
}