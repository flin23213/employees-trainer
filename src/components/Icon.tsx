const paths: Record<string, string> = {
  home: 'M3 10 12 3l9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z',
  library: 'M3 6h6l2 3h10l-2 11H3ZM3 6V4h7l2 3h8v2',
  cards: 'm8 3 12 3-3 15-12-3ZM4 5 2 17l3 1',
  games: 'M5 5h5v5H5ZM14 5h5v5h-5ZM5 14h5v5H5ZM14 14h5v5h-5Z',
  chart: 'M4 20h17M7 16V9m5 7V4m5 12v-5',
  plus: 'M12 5v14M5 12h14',
  search: 'M20 20l-5-5M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0',
  arrow: 'M5 12h14m-6-6 6 6-6 6',
  clock: 'M12 8v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
  check: 'm5 12 4 4L19 6',
  close: 'm6 6 12 12M6 18 18 6',
  user: 'M20 21v-2a6 6 0 0 0-6-6h-4a6 6 0 0 0-6 6v2M16 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  settings: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2',
  upload: 'M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5',
  share: 'M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6M6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6M18 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6M9 10l6-4M9 14l6 4',
  logout: 'M9 21H3V3h6m6 4 5 5-5 5M8 12h12',
  moon: 'M20 14a9 9 0 0 1-10-11 9 9 0 1 0 10 11Z',
  sun: 'M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1',
  chevron: 'm9 5 7 7-7 7',
  repeat: 'M20 7V3l-4 4M4 17v4l4-4M5 8a8 8 0 0 1 13-2l2 1M19 16a8 8 0 0 1-13 2l-2-1',
  warning: 'm12 3 10 18H2ZM12 9v5m0 3v1',
  briefcase: 'M3 7h18v13H3ZM8 7V3h8v4M3 12l9 3 9-3M10 14v3h4v-3',
  bolt: 'm13 2-9 12h7l-1 8 10-12h-7Z',
}
export default function Icon({ name }: { name: string }) {
  return <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] ?? paths.cards} /></svg>
}
