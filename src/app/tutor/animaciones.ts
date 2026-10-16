/**
 * Animaciones hechas con HyperFrames (public/animaciones/*.html).
 * Cada composición lee sus números de la URL, así una misma animación sirve para cualquier ejercicio.
 */
export interface Animacion {
  readonly titulo: string;
  readonly src: string;
}

/** Límites para que se vea bien en pantalla (caramelos y platos). */
const MAX_CARAMELOS = 40;
const MAX_AMIGOS = 6;

export function animacionRepartir(dividendo: number, divisor: number): Animacion | null {
  if (dividendo < 1 || dividendo > MAX_CARAMELOS || divisor < 1 || divisor > MAX_AMIGOS) return null;
  return {
    titulo: `Repartir ${dividendo} caramelos entre ${divisor}`,
    src: `animaciones/repartir.html?dividendo=${dividendo}&divisor=${divisor}`,
  };
}

export function animacionBajar(resto: number, cifra: number): Animacion {
  return {
    titulo: `Bajar el ${cifra} junto al ${resto}`,
    src: `animaciones/bajar.html?resto=${resto}&cifra=${cifra}`,
  };
}

/** Ejemplo que no coincide con los números del ejercicio, para no revelar la respuesta. */
export function ejemploRepartir(evitar: { n: number; d: number }): Animacion {
  const ejemplo = evitar.n === 14 && evitar.d === 4 ? { n: 13, d: 3 } : { n: 14, d: 4 };
  return animacionRepartir(ejemplo.n, ejemplo.d)!;
}

export function ejemploBajar(evitar: { resto: number; cifra: number }): Animacion {
  return evitar.resto === 2 && evitar.cifra === 5 ? animacionBajar(3, 1) : animacionBajar(2, 5);
}
