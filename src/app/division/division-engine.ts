/**
 * Motor de la división larga con números enteros (cociente + residuo).
 *
 * Todo es determinista: aquí se decide si una respuesta es correcta.
 * La IA solo explica el porqué y da pistas; nunca corrige.
 */

/** Una vuelta del procedimiento: ¿cuánto cabe? → multiplico → resto → bajo. */
export interface Ciclo {
  readonly indice: number;
  /** Número con el que trabajamos en esta vuelta (ej. 17 en 175 ÷ 4). */
  readonly dividendoParcial: number;
  /** Columna (posición de la cifra en el dividendo) donde termina el dividendo parcial. */
  readonly columnaFinal: number;
  /** Cifra del cociente: cuántas veces cabe el divisor. */
  readonly cifraCociente: number;
  /** cifraCociente × divisor. */
  readonly producto: number;
  /** dividendoParcial − producto. Siempre menor que el divisor. */
  readonly resto: number;
  /** Cifra del dividendo que se baja al terminar la vuelta (null en la última). */
  readonly cifraBajada: number | null;
}

export interface PlanDivision {
  readonly dividendo: number;
  readonly divisor: number;
  readonly cifras: readonly number[];
  /** Cuántas cifras hay que tomar al principio para que el divisor quepa. */
  readonly cifrasIniciales: number;
  readonly ciclos: readonly Ciclo[];
  readonly cociente: number;
  readonly residuo: number;
}

export type Paso =
  | { readonly tipo: 'elegir-cifras'; readonly respuesta: number }
  | { readonly tipo: 'cabe'; readonly ciclo: number; readonly respuesta: number }
  | { readonly tipo: 'multiplicar'; readonly ciclo: number; readonly respuesta: number }
  | { readonly tipo: 'restar'; readonly ciclo: number; readonly respuesta: number }
  | { readonly tipo: 'bajar'; readonly ciclo: number; readonly respuesta: number }
  | { readonly tipo: 'residuo'; readonly respuesta: number };

export type TipoPaso = Paso['tipo'];

export type Veredicto =
  | 'correcto'
  /** El número es demasiado grande (ej. el divisor "no cabe" tantas veces). */
  | 'se-pasa'
  /** El número es demasiado pequeño (ej. todavía cabe una vez más). */
  | 'queda-corto'
  /** Elegiste cifras con las que el divisor todavía no cabe. */
  | 'pocas-cifras'
  /** Funciona, pero se puede con menos cifras. */
  | 'demasiadas-cifras'
  | 'incorrecto';

export type ErrorEjercicio =
  | 'no-es-entero'
  | 'divisor-cero'
  | 'dividendo-menor'
  | 'muy-grande';

export const LIMITES = { dividendoMax: 999_999_999, divisorMax: 9_999 } as const;

export function validarEjercicio(dividendo: number, divisor: number): ErrorEjercicio | null {
  if (!Number.isInteger(dividendo) || !Number.isInteger(divisor) || dividendo < 1 || divisor < 0) {
    return 'no-es-entero';
  }
  if (divisor === 0) return 'divisor-cero';
  if (dividendo > LIMITES.dividendoMax || divisor > LIMITES.divisorMax) return 'muy-grande';
  if (dividendo < divisor) return 'dividendo-menor';
  return null;
}

export function crearPlan(dividendo: number, divisor: number): PlanDivision {
  const error = validarEjercicio(dividendo, divisor);
  if (error) throw new Error(`Ejercicio inválido: ${error}`);

  const cifras = String(dividendo).split('').map(Number);

  let cifrasIniciales = 1;
  while (valorPrefijo(cifras, cifrasIniciales) < divisor) cifrasIniciales++;

  const ciclos: Ciclo[] = [];
  let actual = valorPrefijo(cifras, cifrasIniciales);
  for (let columna = cifrasIniciales - 1; columna < cifras.length; columna++) {
    const cifraCociente = Math.floor(actual / divisor);
    const producto = cifraCociente * divisor;
    const resto = actual - producto;
    const cifraBajada = columna + 1 < cifras.length ? cifras[columna + 1] : null;
    ciclos.push({
      indice: ciclos.length,
      dividendoParcial: actual,
      columnaFinal: columna,
      cifraCociente,
      producto,
      resto,
      cifraBajada,
    });
    if (cifraBajada !== null) actual = resto * 10 + cifraBajada;
  }

  return {
    dividendo,
    divisor,
    cifras,
    cifrasIniciales,
    ciclos,
    cociente: Math.floor(dividendo / divisor),
    residuo: dividendo % divisor,
  };
}

export function crearPasos(plan: PlanDivision): Paso[] {
  const pasos: Paso[] = [{ tipo: 'elegir-cifras', respuesta: plan.cifrasIniciales }];
  for (const c of plan.ciclos) {
    pasos.push({ tipo: 'cabe', ciclo: c.indice, respuesta: c.cifraCociente });
    pasos.push({ tipo: 'multiplicar', ciclo: c.indice, respuesta: c.producto });
    pasos.push({ tipo: 'restar', ciclo: c.indice, respuesta: c.resto });
    if (c.cifraBajada !== null) {
      pasos.push({ tipo: 'bajar', ciclo: c.indice, respuesta: c.resto * 10 + c.cifraBajada });
    }
  }
  pasos.push({ tipo: 'residuo', respuesta: plan.residuo });
  return pasos;
}

export function evaluar(plan: PlanDivision, paso: Paso, valor: number): Veredicto {
  if (valor === paso.respuesta) return 'correcto';

  switch (paso.tipo) {
    case 'elegir-cifras':
      return valorPrefijo(plan.cifras, valor) < plan.divisor ? 'pocas-cifras' : 'demasiadas-cifras';
    case 'cabe': {
      const n = plan.ciclos[paso.ciclo].dividendoParcial;
      if (valor * plan.divisor > n) return 'se-pasa';
      if (n - valor * plan.divisor >= plan.divisor) return 'queda-corto';
      return 'incorrecto';
    }
    default:
      return valor > paso.respuesta ? 'se-pasa' : 'queda-corto';
  }
}

export function valorPrefijo(cifras: readonly number[], cuantas: number): number {
  return Number(cifras.slice(0, cuantas).join('') || '0');
}

export type Nivel = 'facil' | 'medio' | 'dificil';

/** Inventa un ejercicio con residuo (casi siempre distinto de cero). */
export function inventarEjercicio(nivel: Nivel): { dividendo: number; divisor: number } {
  const azar = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));
  const rangos: Record<Nivel, { dividendo: [number, number]; divisor: [number, number] }> = {
    facil: { dividendo: [10, 99], divisor: [2, 9] },
    medio: { dividendo: [100, 999], divisor: [2, 9] },
    dificil: { dividendo: [1000, 9999], divisor: [11, 49] },
  };
  const r = rangos[nivel];
  for (let i = 0; i < 20; i++) {
    const divisor = azar(...r.divisor);
    const dividendo = azar(...r.dividendo);
    if (dividendo % divisor !== 0) return { dividendo, divisor };
  }
  return { dividendo: azar(...r.dividendo), divisor: azar(...r.divisor) };
}
