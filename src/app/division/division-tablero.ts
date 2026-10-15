import { Paso, PlanDivision, TipoPaso } from './division-engine';

/** Cómo se pinta una cifra en la casita. */
export type EstadoCelda = 'normal' | 'foco' | 'nuevo' | 'usado' | 'tenue';

export interface Celda {
  readonly texto: string;
  readonly estado: EstadoCelda;
}

export interface FilaTrabajo {
  readonly signo: '−' | '';
  /** Una celda por columna del dividendo; null = hueco. */
  readonly celdas: readonly (Celda | null)[];
  readonly subrayado: boolean;
}

export interface Tablero {
  readonly dividendo: readonly Celda[];
  readonly divisor: Celda;
  readonly cociente: readonly Celda[];
  readonly filas: readonly FilaTrabajo[];
  /** Columna de la cifra que hay que bajar ahora (para dibujar la flecha). */
  readonly columnaBajando: number | null;
}

/**
 * Construye lo que se ve en la casita según cuántos pasos ya se resolvieron.
 * Solo se muestra lo que el niño ya hizo: nada se adelanta.
 */
export function construirTablero(plan: PlanDivision, pasos: readonly Paso[], indice: number): Tablero {
  const actual: Paso | undefined = pasos[indice];
  const hecho = (tipo: TipoPaso, ciclo?: number) => {
    const i = pasos.findIndex((p) => p.tipo === tipo && (ciclo === undefined || ('ciclo' in p && p.ciclo === ciclo)));
    return i >= 0 && i < indice;
  };
  const es = (tipo: TipoPaso, ciclo?: number) =>
    actual?.tipo === tipo && (ciclo === undefined || ('ciclo' in actual && actual.ciclo === ciclo));

  const n = plan.cifras.length;
  const enCicloActual = actual && 'ciclo' in actual ? plan.ciclos[actual.ciclo] : null;
  const cicloBajando = actual?.tipo === 'bajar' ? plan.ciclos[actual.ciclo] : null;

  // ¿Qué cifras del dividendo ya se usaron?
  let ultimaUsada = -1;
  if (hecho('elegir-cifras')) ultimaUsada = plan.cifrasIniciales - 1;
  for (const c of plan.ciclos) if (hecho('bajar', c.indice)) ultimaUsada = c.columnaFinal + 1;

  // El número con el que trabajamos en el primer ciclo está en la fila del dividendo.
  const focoPrimerCiclo =
    enCicloActual?.indice === 0 && (es('cabe', 0) || es('restar', 0)) ? plan.cifrasIniciales : 0;

  const dividendo: Celda[] = plan.cifras.map((cifra, col) => ({
    texto: String(cifra),
    estado:
      col < focoPrimerCiclo
        ? 'foco'
        : cicloBajando && col === cicloBajando.columnaFinal + 1
          ? 'nuevo'
          : col <= ultimaUsada
            ? 'usado'
            : 'normal',
  }));

  const filas: FilaTrabajo[] = [];
  for (const c of plan.ciclos) {
    if (!hecho('multiplicar', c.indice)) break;
    filas.push({
      signo: '−',
      celdas: alinear(String(c.producto), c.columnaFinal, n, es('restar', c.indice) ? 'foco' : 'normal'),
      subrayado: true,
    });

    if (!hecho('restar', c.indice)) break;
    const siguiente = plan.ciclos[c.indice + 1];
    const restoEnFoco =
      es('bajar', c.indice) ||
      (es('residuo') && c.indice === plan.ciclos.length - 1) ||
      (siguiente && (es('cabe', siguiente.indice) || es('restar', siguiente.indice)));
    const celdas = alinear(String(c.resto), c.columnaFinal, n, restoEnFoco ? 'foco' : 'normal');
    if (hecho('bajar', c.indice) && c.cifraBajada !== null) {
      celdas[c.columnaFinal + 1] = { texto: String(c.cifraBajada), estado: restoEnFoco ? 'foco' : 'nuevo' };
    }
    filas.push({ signo: '', celdas, subrayado: false });
  }

  const cociente: Celda[] = plan.ciclos
    .filter((c) => hecho('cabe', c.indice))
    .map((c) => ({
      texto: String(c.cifraCociente),
      estado: es('multiplicar', c.indice) ? 'foco' : 'normal',
    }));

  return {
    dividendo,
    divisor: {
      texto: String(plan.divisor),
      estado: es('cabe') || es('multiplicar') ? 'foco' : 'normal',
    },
    cociente,
    filas,
    columnaBajando: cicloBajando ? cicloBajando.columnaFinal + 1 : null,
  };
}

/** Coloca las cifras de un número terminando en la columna indicada. */
function alinear(texto: string, columnaFinal: number, columnas: number, estado: EstadoCelda): (Celda | null)[] {
  const celdas: (Celda | null)[] = Array.from({ length: columnas }, () => null);
  const inicio = columnaFinal - texto.length + 1;
  for (let i = 0; i < texto.length; i++) {
    if (inicio + i >= 0) celdas[inicio + i] = { texto: texto[i], estado };
  }
  return celdas;
}
