import type { DailyRatings, ReviewRating, Statistics } from '../../shared/models';
import { ratings } from '../review/ratings';

interface ChartSeries {
  label: string;
  color: string;
  values: (number | null)[];
  dashed?: boolean;
}

export interface ChartData {
  kind: 'line' | 'bar';
  points: { label: string; tick: string; position?: number; note?: string }[];
  series: ChartSeries[];
  percent?: boolean;
  initialIndex?: number;
}

const colors = { known: '#16846a', fuzzy: '#c8790c', forgotten: '#c84158' };
const ratingKeys = Object.keys(colors) as ReviewRating[];
const datePoint = (day: string) => ({ label: day, tick: day.slice(5) });
const ratingSeries = (days: DailyRatings[]) => ratingKeys.map(rating => ({
  label: ratings[rating].label,
  color: colors[rating],
  values: days.map(day => day[rating]),
}));

export function retentionChart({ retention }: Statistics): ChartData {
  return {
    kind: 'line',
    percent: true,
    points: retention.map((point, index) => ({
      label: index ? `间隔大于 ${retention[index - 1].label}，至 ${point.label}` : `间隔 ≤ ${point.label}`,
      tick: point.label,
      position: Math.log(point.elapsed),
      note: `卡片样本 ${point.samples} 次`,
    })),
    initialIndex: retention.findIndex(point => point.samples > 0),
    series: [
      { label: '艾宾浩斯节约率', color: '#7453b5', values: retention.map(point => point.rate), dashed: true },
      { label: '我的卡片保留分', color: '#165dff', values: retention.map(point => point.recall) },
    ],
  };
}

export function activityChart({ activity, forecast, today }: Statistics, range: number): ChartData {
  const days = activity.length ? (range ? activity.slice(-range) : activity) : [
    { day: today, known: 0, fuzzy: 0, forgotten: 0 },
  ];
  return {
    kind: 'bar',
    points: [
      ...days.map(point => datePoint(point.day)),
      ...forecast.map(point => ({ ...datePoint(point.day), note: '预测' })),
    ],
    series: [
      ...ratingSeries(days),
      {
        label: '预计需复习', color: 'rgba(118, 126, 141, 0.38)',
        values: [...days.map(() => null), ...forecast.map(point => point.count)],
      },
    ],
    initialIndex: days.length - 1,
  };
}

export function trendChart({ trend }: Statistics): ChartData {
  return {
    kind: 'line',
    points: trend.map(point => datePoint(point.day)),
    series: [
      { label: '已加入记忆', color: '#165dff', values: trend.map(point => point.selected) },
      ...ratingSeries(trend),
    ],
    initialIndex: trend.length - 1,
  };
}

export function formatValue(value: number | null | undefined, percent?: boolean) {
  if (value == null) return '—';
  return percent ? `${(value * 100).toFixed(1)}%` : `${value} 张`;
}
