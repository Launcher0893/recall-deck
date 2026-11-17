import type { ChartData } from './charts';

export const chartMargins = { left: 48, right: 28, top: 15, bottom: 30 };

export function xPosition(data: ChartData, index: number, width: number) {
  const { points, kind } = data;
  const available = width - chartMargins.left - chartMargins.right;
  if (kind === 'bar') return chartMargins.left + available * ((index + 0.5) / points.length);
  if (points.length === 1) return chartMargins.left + available / 2;
  const first = points[0].position ?? 0;
  const last = points.at(-1)?.position ?? points.length - 1;
  return chartMargins.left + available * (((points[index].position ?? index) - first) / (last - first));
}

function axisMaximum(data: ChartData) {
  if (data.percent) return 1;
  let maximum = 0;
  for (let index = 0; index < data.points.length; index++) {
    const values = data.series.map(series => series.values[index] ?? 0);
    const height = data.kind === 'bar' ? values.reduce((sum, value) => sum + value, 0) : Math.max(...values);
    maximum = Math.max(maximum, height);
  }
  const magnitude = 10 ** Math.floor(Math.log10(Math.max(1, maximum / 4)));
  const step = [1, 2, 2.5, 5, 10].map(factor => Math.ceil(factor * magnitude))
    .find(value => value >= maximum / 4) ?? 1;
  return step * 4;
}

export function drawChart(
  context: CanvasRenderingContext2D, data: ChartData, width: number, height: number, active: number,
) {
  const { left, right, top, bottom } = chartMargins;
  const floor = height - bottom;
  const maximum = axisMaximum(data);
  const x = (index: number) => xPosition(data, index, width);
  const y = (value: number) => floor - (floor - top) * value / maximum;

  context.clearRect(0, 0, width, height);
  context.font = '12px "Microsoft YaHei UI", sans-serif';
  context.textBaseline = 'middle';
  context.textAlign = 'right';
  context.fillStyle = '#637089';
  for (let tick = 0; tick <= 4; tick++) {
    const value = maximum * tick / 4;
    const row = y(value);
    context.strokeStyle = tick ? '#e9edf4' : '#c9d2e1';
    context.beginPath();
    context.moveTo(left, row);
    context.lineTo(width - right, row);
    context.stroke();
    context.fillText(data.percent ? `${Math.round(value * 100)}%` : String(value), left - 8, row);
  }

  context.textAlign = 'center';
  let lastLabel = -Infinity;
  const lastIndex = data.points.length - 1;
  const minimumGap = data.percent ? 56 : 54;
  for (const [index, point] of data.points.entries()) {
    const column = x(index);
    if (index !== lastIndex && (column - lastLabel < minimumGap || x(lastIndex) - column < minimumGap)) continue;
    lastLabel = column;
    context.fillText(point.tick, column, floor + 16);
  }

  if (active >= 0) {
    context.strokeStyle = '#a8b9d9';
    context.setLineDash([3, 4]);
    context.beginPath();
    context.moveTo(x(active), top);
    context.lineTo(x(active), floor);
    context.stroke();
    context.setLineDash([]);
  }

  if (data.kind === 'bar') {
    const barWidth = Math.min(36, (width - left - right) * 0.72 / data.points.length);
    for (let index = 0; index < data.points.length; index++) {
      let base = 0;
      for (const series of data.series) {
        const value = series.values[index];
        if (!value) continue;
        context.fillStyle = series.color;
        context.fillRect(x(index) - barWidth / 2, y(base + value), barWidth, y(base) - y(base + value));
        base += value;
      }
    }
    return;
  }

  for (const series of data.series) {
    context.strokeStyle = series.color;
    context.lineWidth = 2.3;
    context.lineJoin = 'round';
    context.setLineDash(series.dashed ? [6, 5] : []);
    context.beginPath();
    let started = false;
    for (const [index, value] of series.values.entries()) {
      if (value === null) continue;
      if (started) context.lineTo(x(index), y(value));
      else context.moveTo(x(index), y(value));
      started = true;
    }
    context.stroke();
    context.setLineDash([]);
    context.lineWidth = 1;

    context.fillStyle = series.color;
    for (const [index, value] of series.values.entries()) {
      if (value === null || (series.values.length > 12 && index !== active)) continue;
      context.beginPath();
      context.arc(x(index), y(value), index === active ? 4 : 2.6, 0, 2 * Math.PI);
      context.fill();
    }
  }
}
