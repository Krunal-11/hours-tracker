import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
}

export function calculateHours(startTime: string, endTime: string): number {
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  const diff = (endH * 60 + endM - (startH * 60 + startM)) / 60;
  return Math.round(diff * 100) / 100;
}

export function getWeekRange(date: Date): { start: Date; end: Date } {
  const day = date.getDay();
  const currentHour = date.getHours();
  
  // Find the most recent Monday at 9am
  let diff = date.getDate() - day + (day === 0 ? -6 : 1); // Monday of current week
  const start = new Date(date);
  start.setDate(diff);
  start.setHours(9, 0, 0, 0);
  
  // If current time is before Monday 9am, go back one week
  if (date < start) {
    start.setDate(start.getDate() - 7);
  }
  
  // End is exactly 7 days later (next Monday 9am minus 1ms)
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  end.setMilliseconds(-1);
  
  return { start, end };
}

export function getMonthRange(date: Date): { start: Date; end: Date } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}
