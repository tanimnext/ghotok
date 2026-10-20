import mongoose from 'mongoose';

const counterSchema = new mongoose.Schema({ _id: String, seq: { type: Number, default: 0 } });
export const Counter = mongoose.model('Counter', counterSchema);

/** Atomically return the next number of a named sequence (first value = start + 1). */
export async function nextSeq(name, start = 1000) {
  const c = await Counter.findOneAndUpdate(
    { _id: name },
    [{ $set: { seq: { $add: [{ $ifNull: ['$seq', start] }, 1] } } }],
    { new: true, upsert: true }
  );
  return c.seq;
}
