import { formatDistanceToNowStrict } from 'date-fns';

export function formatNumber(num: number | undefined | null): string {
  if (num === undefined || num === null) return '0';
  
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  }
  return num.toString();
}

export function formatTimeAgo(dateString: string): string {
  return formatDistanceToNowStrict(new Date(dateString), { addSuffix: true })
    .replace(' seconds', 's')
    .replace(' minutes', 'm')
    .replace(' hours', 'h')
    .replace(' days', 'd')
    .replace(' weeks', 'w')
    .replace(' months', 'mo')
    .replace(' years', 'y');
}