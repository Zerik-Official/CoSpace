/**
 * Joins conditional class names, dropping falsy entries.
 *
 * @param classNames - Class names or falsy expressions.
 * @returns A single space separated class string.
 */
export function cn(...classNames: Array<string | false | null | undefined>): string {
  return classNames.filter((className): className is string => Boolean(className)).join(" ");
}
