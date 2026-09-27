import { useEffect, useState } from 'react'

// Re-render whenever the local stak changes, recomputing `select`.
export function useStak(store, select, deps) {
  const [value, setValue] = useState(select)
  useEffect(() => {
    setValue(select())
    return store.subscribe(() => setValue(select()))
  }, [store, ...deps]) // eslint-disable-line react-hooks/exhaustive-deps
  return value
}

// Ticks so "3m" labels stay fresh.
export function useNow(ms = 30000) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(t) }, [ms])
  return now
}
