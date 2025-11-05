import { ScriptOnce } from "@tanstack/react-router"

/**
 * FunctionOnce - Executes JavaScript code once during SSR hydration
 *
 * This utility component uses TanStack Router's ScriptOnce to run code
 * before React hydration, preventing visual flashes (FOUC) when applying
 * themes or other UI state from storage.
 *
 * @example
 * ```tsx
 * <FunctionOnce param="theme-key">
 *   {(storageKey) => {
 *     const theme = localStorage.getItem(storageKey)
 *     if (theme === 'dark') {
 *       document.documentElement.classList.add('dark')
 *     }
 *   }}
 * </FunctionOnce>
 * ```
 */
export function FunctionOnce<T = unknown>({
  children,
  param
}: {
  children: (param: T) => unknown
  param?: T
}) {
  return (
    <ScriptOnce>
      {`(${children.toString()})(${JSON.stringify(param)})`}
    </ScriptOnce>
  )
}
