export function withItem<T>(set: Set<T>, item: T): Set<T> {
  return new Set(set).add(item);
}

export function withoutItem<T>(set: Set<T>, item: T): Set<T> {
  const next = new Set(set);
  next.delete(item);
  return next;
}
