/**
 * useLocalStorage
 *
 * Hook para persistência de estado no LocalStorage.
 * Sincroniza automaticamente o estado do React com o LocalStorage.
 */

import { useCallback, useEffect, useState } from 'react'

/**
 * Hook que sincroniza um valor de estado com o LocalStorage.
 *
 * @param key - Chave do LocalStorage
 * @param initialValue - Valor inicial (usado quando a chave não existe)
 * @returns [value, setValue, removeValue]
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  // Lê o valor inicial do LocalStorage (ou usa o padrão)
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item ? (JSON.parse(item) as T) : initialValue
    } catch (error) {
      console.warn(`[useLocalStorage] Erro ao ler chave "${key}":`, error)
      return initialValue
    }
  })

  // Atualiza o LocalStorage quando o estado muda
  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue))
    } catch (error) {
      console.warn(`[useLocalStorage] Erro ao salvar chave "${key}":`, error)
    }
  }, [key, storedValue])

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const newValue = typeof value === 'function' ? (value as (prev: T) => T)(prev) : value
        return newValue
      })
    },
    []
  )

  const removeValue = useCallback(() => {
    try {
      window.localStorage.removeItem(key)
      setStoredValue(initialValue)
    } catch (error) {
      console.warn(`[useLocalStorage] Erro ao remover chave "${key}":`, error)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return [storedValue, setValue, removeValue]
}
