const minute = 60_000;
const hour = 60 * minute;
const day = 24 * hour;
const intervals = [20 * minute, hour, 9 * hour, day, 2 * day, 6 * day, 31 * day];

export function nextSchedule(card, rating, now) {
  let reviewStep = card.reviewStep;
  let dueAt = card.dueAt;

  switch (rating) {
    case 'known':
      if (dueAt === null || dueAt <= now) {
        dueAt = now + intervals[reviewStep];
        reviewStep = Math.min(reviewStep + 1, intervals.length - 1);
      }
      break;
    case 'fuzzy': {
      const target = now + Math.min(hour, intervals[reviewStep]);
      dueAt = dueAt !== null && dueAt > now ? Math.min(dueAt, target) : target;
      break;
    }
    case 'forgotten':
      reviewStep = 0;
      dueAt = now + intervals[0];
      break;
  }

  return { reviewState: rating, reviewStep, dueAt };
}
