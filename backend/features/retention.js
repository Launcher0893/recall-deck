const minute = 60_000;
const hour = 60 * minute;
const day = 24 * hour;

// Ebbinghaus's relearning savings, as reproduced in Murre & Dros (2015), Table 3.
export const referenceCurve = [
  { elapsed: 20 * minute, label: '20 分钟', rate: 0.582 },
  { elapsed: hour, label: '1 小时', rate: 0.442 },
  { elapsed: 9 * hour, label: '9 小时', rate: 0.358 },
  { elapsed: day, label: '1 天', rate: 0.337 },
  { elapsed: 2 * day, label: '2 天', rate: 0.278 },
  { elapsed: 6 * day, label: '6 天', rate: 0.254 },
  { elapsed: 31 * day, label: '31 天', rate: 0.211 },
];
const recallScore = { known: 1, fuzzy: 0.5, forgotten: 0 };
const minimumSamples = 5;
const recallThreshold = 0.7;

export function measureRetention(reviews) {
  const previous = new Map();
  const buckets = referenceCurve.map(point => ({ ...point, samples: 0, score: 0 }));
  for (const { cardId, occurredAt, rating } of reviews) {
    const prior = previous.get(cardId);
    previous.set(cardId, { occurredAt, rating });
    if (prior?.rating !== 'known') continue;
    const elapsed = occurredAt - prior.occurredAt;
    if (elapsed <= 0) continue;
    const bucket = buckets.find(point => elapsed <= point.elapsed);
    if (!bucket) continue;
    bucket.samples++;
    bucket.score += recallScore[rating];
  }
  return buckets.map(({ score, samples, ...point }) => ({
    ...point, samples, recall: samples ? score / samples : null,
  }));
}

function thresholdTime(points) {
  let prior = { elapsed: 0, rate: 1 };
  for (const point of points) {
    if (point.rate <= recallThreshold) {
      const fraction = (prior.rate - recallThreshold) / (prior.rate - point.rate);
      return prior.elapsed + fraction * (point.elapsed - prior.elapsed);
    }
    prior = point;
  }
  return null;
}

export function forecastAdjustment(curve) {
  const measured = curve.filter(point => point.samples >= minimumSamples)
    .map(({ elapsed, recall }) => ({ elapsed, rate: recall }));
  const observed = thresholdTime(measured);
  // Shorten the existing card-specific interval if the measured drop is faster.
  // The app's scheduled date is always the latest possible forecast date.
  return measured.length >= 2 && observed !== null
    ? Math.min(1, observed / thresholdTime(referenceCurve))
    : 1;
}
