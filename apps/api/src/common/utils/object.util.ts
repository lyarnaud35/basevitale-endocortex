/**
 * Object Utilities
 * 
 * Utilitaires pour manipuler les objets
 */

/**
 * Vérifier si un objet est vide
 */
export function isEmpty(obj: Record<string, any>): boolean {
  return Object.keys(obj).length === 0;
}

/**
 * Obtenir les clés d'un objet
 */
export function keys<T extends Record<string, any>>(obj: T): Array<keyof T> {
  return Object.keys(obj) as Array<keyof T>;
}

/**
 * Obtenir les valeurs d'un objet
 */
export function values<T extends Record<string, any>>(obj: T): T[keyof T][] {
  return Object.values(obj);
}

/**
 * Inverser les clés et valeurs d'un objet
 */
export function invert<T extends Record<string, string | number>>(
  obj: T,
): Record<string, keyof T> {
  const result: any = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      result[String(obj[key])] = key;
    }
  }
  return result;
}

/**
 * Créer un objet depuis des paires clé-valeur
 */
export function fromEntries<T>(
  entries: Array<[string, T]>,
): Record<string, T> {
  return entries.reduce((obj, [key, value]) => {
    obj[key] = value;
    return obj;
  }, {} as Record<string, T>);
}
