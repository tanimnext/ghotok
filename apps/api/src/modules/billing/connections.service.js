import { User } from '../auth/user.model.js';
import { Ledger } from './billing.models.js';
import { badRequest, notFound } from '../../core/http.js';

/**
 * Atomically change a user's connection balance and append a ledger entry.
 * The balance can never go below zero: a debit larger than the balance fails
 * with INSUFFICIENT_CONNECTIONS and changes nothing. See docs/adr/0003.
 */
export async function adjustConnections(userId, delta, type, { ref, refModel, note, actor } = {}) {
  if (!Number.isInteger(delta) || delta === 0) throw badRequest('BAD_REQUEST');
  const filter = { _id: userId };
  if (delta < 0) filter.connections = { $gte: -delta };
  const user = await User.findOneAndUpdate(filter, { $inc: { connections: delta } }, { new: true });
  if (!user) {
    if (!(await User.exists({ _id: userId }))) throw notFound();
    throw badRequest('INSUFFICIENT_CONNECTIONS');
  }
  await Ledger.create({ user: userId, delta, balanceAfter: user.connections, type, ref, refModel, note, actor });
  return user.connections;
}
