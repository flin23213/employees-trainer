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
}
export default function Icon({ name }: { name: string }) {
  return <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] ?? paths.cards} /></svg>
}
