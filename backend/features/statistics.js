import { rows } from '../db/rows.js';
import { forecastAdjustment, measureRetention } from './retention.js';

const forecastDays = 7;
const ratingCounts = () => ({ known: 0, fuzzy: 0, forgotten: 0 });

function startOfDay(time) {
  const date = new Date(time);
  date.setHours(0, 0, 0, 0);
  return date;
}

function dayKey(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function advanceDay(date) {
  date.setDate(date.getDate() + 1);
  date.setHours(0, 0, 0, 0);
}

function changeSelection(event, selected, counts) {
  if (event.selected === null && !selected.has(event.cardId)) return;
  const prior = selected.get(event.cardId);
  if (prior) counts[prior]--;

  if (event.selected === 0) {
    selected.delete(event.cardId);
    return;
  }
  selected.set(event.cardId, event.rating);
  if (event.rating) counts[event.rating]++;
}

function buildHistory(events, today) {
  const trend = [];
  const activity = [];
  const reviews = [];
  if (!events.length) return { trend, activity, reviews };

  const selected = new Map();
  const counts = ratingCounts();
  let index = 0;
  for (const date = startOfDay(events[0].occurredAt); date <= today;) {
    const day = dayKey(date);
    advanceDay(date);
    const lastRatingByCard = new Map();
    while (index < events.length && events[index].occurredAt < date.getTime()) {
      const event = events[index++];
      if (event.selected === null) {
        reviews.push(event);
        lastRatingByCard.set(event.cardId, event.rating);
      }
      changeSelection(event, selected, counts);
    }
    const dailyCounts = ratingCounts();
    for (const rating of lastRatingByCard.values()) dailyCounts[rating]++;
    activity.push({ day, ...dailyCounts });
    trend.push({ day, selected: selected.size, ...counts });
  }
  return { trend, activity, reviews };
}

function buildForecast(cards, reviews, curve, today) {
  const adjustment = forecastAdjustment(curve);
  const lastReviewByCard = new Map(reviews.map(review => [review.cardId, review.occurredAt]));
  const upcoming = new Map();
  const date = new Date(today);
  for (let offset = 1; offset <= forecastDays; offset++) {
    advanceDay(date);
    upcoming.set(dayKey(date), 0);
  }

  const tomorrow = new Date(today);
  advanceDay(tomorrow);
  let dueToday = 0;
  for (const card of cards) {
    const lastReview = lastReviewByCard.get(card.id);
    const planned = card.reviewState === 'known' && lastReview !== undefined && lastReview < card.dueAt
      ? lastReview + (card.dueAt - lastReview) * adjustment
      : card.dueAt;
    if (planned < tomorrow.getTime()) {
      dueToday++;
      continue;
    }
    const day = dayKey(new Date(planned));
    if (upcoming.has(day)) upcoming.set(day, upcoming.get(day) + 1);
  }
  return { dueToday, forecast: [...upcoming].map(([day, count]) => ({ day, count })) };
}

export function loadStatistics(db, now = Date.now()) {
  const events = rows(db, `
    SELECT cardId, occurredAt, selected, rating FROM study_events
    WHERE occurredAt <= ? ORDER BY occurredAt, id
  `, now);
  const cards = rows(db, `
    SELECT id, dueAt, reviewState FROM cards WHERE studySelected = 1 AND dueAt IS NOT NULL
  `);
  const today = startOfDay(now);
  const { activity, trend, reviews } = buildHistory(events, today);
  const retention = measureRetention(reviews);

  return {
    today: dayKey(today), retention, activity, trend,
    ...buildForecast(cards, reviews, retention, today),
  };
}
