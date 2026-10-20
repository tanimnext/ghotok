import { User } from '../models/User.js';
import { Ledger } from '../models/commerce.js';
import { badRequest, notFound } from '../utils/http.js';

/**
 * Atomically change a user's connection balance and write a ledger entry.
 * A negative delta fails (402-style 400) when the balance is too low; the
 * balance can never go below zero.
 */
export async function adjustConnections(userId, delta, type, { ref, refModel, note, actor } = {}) {
  if (!Number.isInteger(delta) || delta === 0) throw badRequest('Invalid connection amount');
  const filter = { _id: userId };
  if (delta < 0) filter.connections = { $gte: -delta };
  const user = await User.findOneAndUpdate(filter, { $inc: { connections: delta } }, { new: true });
  if (!user) {
    const exists = await User.exists({ _id: userId });
    if (!exists) throw notFound('User not found');
    const err = badRequest('Not enough connections');
    err.code = 'INSUFFICIENT_CONNECTIONS';
    throw err;
  }
  await Ledger.create({ user: userId, delta, balanceAfter: user.connections, type, ref, refModel, note, actor });
  return user.connections;
}
