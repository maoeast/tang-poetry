function startOfUtcDay(date: Date) {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function toUtcDayKey(date: Date) {
  return `${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}`;
}

type ShouldCreateViewRecordArgs = {
  existingCreatedAts: Date[];
  targetDate?: Date;
};

export function shouldCreateViewRecord({
  existingCreatedAts,
  targetDate = new Date(),
}: ShouldCreateViewRecordArgs) {
  const targetDay = startOfUtcDay(targetDate);

  if (existingCreatedAts.length === 0) {
    return true;
  }

  return !existingCreatedAts.some(
    (createdAt) =>
      createdAt instanceof Date && startOfUtcDay(createdAt) === targetDay,
  );
}
