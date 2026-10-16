/**
 * Todo lo que "dice" el Profe Búho. Jev elige qué decir; aquí está cómo decirlo.
 * Regla: ninguna pista de nivel 1–2 revela la respuesta del paso.
 */
import { Paso, PlanDivision, TipoPaso } from '../division/division-engine';
import { Tema, TipoError } from './contrato';

type Texto = (plan: PlanDivision, paso: Paso) => string;

const ciclo = (plan: PlanDivision, paso: Paso) => plan.ciclos['ciclo' in paso ? paso.ciclo : 0];

/** El porqué de cada paso, para cuando lo acaba de hacer bien. */
export const POR_QUE: Record<TipoPaso, Texto> = {
  'elegir-cifras': (plan) =>
    plan.cifrasIniciales === 1
      ? `El ${plan.divisor} ya cabe en el ${plan.cifras[0]}, así que empezamos con una sola cifra. Siempre repartimos primero lo que vale más, de izquierda a derecha.`
      : `En el ${plan.cifras.slice(0, plan.cifrasIniciales - 1).join('')} el ${plan.divisor} no cabe, así que juntamos cifras hasta tener un número donde sí quepa. Siempre repartimos primero lo que vale más, de izquierda a derecha.`,
  cabe: (plan, paso) => {
    const c = ciclo(plan, paso);
    return c.cifraCociente === 0
      ? `El ${plan.divisor} no cabe en el ${c.dividendoParcial}, por eso ponemos 0 en el cociente: ¡ese 0 guarda el lugar para que el número no quede corto!`
      : `Buscamos el número MÁS GRANDE que multiplicado por ${plan.divisor} no se pase de ${c.dividendoParcial}. Es como repartir ${c.dividendoParcial} caramelos entre ${plan.divisor} amigos: a cada uno le tocan ${c.cifraCociente}.`;
  },
  multiplicar: (plan, paso) => {
    const c = ciclo(plan, paso);
    return `Multiplicamos para saber cuánto repartimos en total: ${c.cifraCociente} para cada uno de los ${plan.divisor} amigos son ${c.producto}.`;
  },
  restar: (plan, paso) => {
    const c = ciclo(plan, paso);
    return `Restamos para saber cuánto nos sobra después de repartir. Si lo que sobra (${c.resto}) fuera ${plan.divisor} o más, ¡podríamos haber repartido otra vez! Por eso siempre debe ser menor que el divisor.`;
  },
  bajar: (plan, paso) => {
    const c = ciclo(plan, paso);
    return `Lo que sobró (${c.resto}) se junta con la siguiente cifra (${c.cifraBajada}), igual que juntar las decenas que sobraron con las unidades. ¡No se suma, se pone al lado!`;
  },
  residuo: (plan) =>
    `Cuando ya no hay más cifras que bajar, lo último que sobró es el residuo: lo que no se pudo repartir. Comprobación: ${plan.divisor} × ${plan.cociente} + ${plan.residuo} = ${plan.dividendo}.`,
};

/** Pistas de menos a más ayuda (índice = nivel de ayuda 0..3). */
export const PISTAS: Record<TipoPaso, readonly Texto[]> = {
  'elegir-cifras': [
    (plan) => `Mira la primera cifra: ¿el ${plan.divisor} cabe en ella?`,
    (plan) => `Si el número es más pequeño que ${plan.divisor}, todavía no cabe. Toma una cifra más.`,
    (plan) => `Prueba con ${plan.cifras.slice(0, 2).join('')}: ¿es mayor o igual que ${plan.divisor}?`,
    (plan) => `Toca cifras hasta formar un número igual o más grande que ${plan.divisor}.`,
  ],
  cabe: [
    (plan, paso) => `Piensa en la tabla del ${plan.divisor}. ¿Qué resultado se acerca a ${ciclo(plan, paso).dividendoParcial} sin pasarse?`,
    (plan, paso) => `Usa el 🧪 Probador: elige un número y haz tú la multiplicación por ${plan.divisor}. ¿Se pasa de ${ciclo(plan, paso).dividendoParcial}?`,
    (plan, paso) => {
      const c = ciclo(plan, paso);
      return `Escribe en un papel la tabla del ${plan.divisor}: ${plan.divisor} × 1, ${plan.divisor} × 2, ${plan.divisor} × 3… Calcula cada una y para cuando una se pase de ${c.dividendoParcial}.`;
    },
    (plan, paso) => {
      const c = ciclo(plan, paso);
      const base = Math.max(0, c.cifraCociente - 1);
      return `Prueba con ${base} × ${plan.divisor} y con ${base + 2} × ${plan.divisor}. ¿Cuál se pasa de ${c.dividendoParcial}? La respuesta está cerca.`;
    },
  ],
  multiplicar: [
    () => 'Revisa la tabla de multiplicar con calma.',
    (plan, paso) => `Es ${ciclo(plan, paso).cifraCociente} veces el ${plan.divisor}. Puedes sumarlo: ${plan.divisor} + ${plan.divisor} + …`,
    () => 'Pulsa 🧩 "Hazlo por partes" y la hacemos juntos, paso a paso.',
    () => 'Pulsa 🧩 "Hazlo por partes": tú calculas cada parte y yo te digo si va bien.',
  ],
  restar: [
    () => 'Resta columna por columna empezando por la derecha.',
    () => 'Si arriba hay un número más pequeño que abajo, pide prestado 1 a la cifra de la izquierda.',
    (plan, paso) => `Puedes contar hacia arriba: desde ${ciclo(plan, paso).producto}, ¿cuánto falta para llegar a ${ciclo(plan, paso).dividendoParcial}?`,
    () => 'Pulsa 🧩 "Hazlo por partes" para restar columna por columna.',
  ],
  bajar: [
    () => 'La cifra que bajas se escribe al lado, no se suma.',
    (plan, paso) => `Escribe el ${ciclo(plan, paso).resto} y a su derecha el ${ciclo(plan, paso).cifraBajada}.`,
    (plan, paso) => `Si te sobraron ${ciclo(plan, paso).resto} decenas y bajas ${ciclo(plan, paso).cifraBajada} unidades, ¿qué número tienes?`,
    (plan, paso) =>
      ciclo(plan, paso).resto === 0
        ? `Si no sobró nada (0), el número es solo la cifra que bajas.`
        : `Junta las cifras como si escribieras un número de dos partes: primero ${ciclo(plan, paso).resto}, luego ${ciclo(plan, paso).cifraBajada}.`,
  ],
  residuo: [
    () => 'El residuo es lo que sobró en la última resta.',
    () => 'Mira la última fila de la casita: ese número ya no se pudo repartir.',
    (plan) => `Tiene que ser un número menor que ${plan.divisor}.`,
    () => 'Busca el último resultado de restar, abajo del todo.',
  ],
};

/** Explicación según el error que diagnosticó Jev. */
export const POR_ERROR: Record<TipoError, Texto> = {
  tabla: (plan) => `Creo que se te cruzó la tabla del ${plan.divisor}. Recítala despacito o usa el probador 🧪.`,
  estimacion: (plan, paso) =>
    `Para saber cuántas veces cabe, piensa: ¿qué número por ${plan.divisor} se acerca más a ${ciclo(plan, paso).dividendoParcial} sin pasarse?`,
  llevada: () => 'Parece que se te olvidó llevar. Cuando un resultado tiene dos cifras, escribes una y llevas la otra.',
  prestar: () => 'Ojo con pedir prestado: si arriba es más pequeño, la cifra de la izquierda presta 1 y arriba sumas 10.',
  'resta-al-reves': () =>
    'Cuidado: en la resta siempre es el número de ARRIBA menos el de ABAJO, aunque el de arriba sea más pequeño (para eso pedimos prestado).',
  'cifra-equivocada': () => 'Esa no es la cifra que toca. Baja siempre la siguiente cifra del dividendo, de una en una, de izquierda a derecha.',
  'sumo-en-vez-de-juntar': () => '¡Casi! La cifra que bajas no se suma: se escribe al lado, a la derecha.',
  'confundio-cociente': () => 'El cociente está debajo del divisor. El residuo es lo que sobró abajo del todo, en la casita.',
  'confundio-numeros': () => 'Parece que usaste otro número del ejercicio. Mira bien qué números están en amarillo en la casita.',
  'al-azar': () => 'Tranquilo, no hay prisa. Respira, mira la casita y piensa paso a paso. ¡Tú puedes! 💪',
};

/** Respuestas a las preguntas libres, según el tema que eligió Jev. */
export const POR_TEMA: Record<Tema, (plan: PlanDivision) => string> = {
  'que-es-dividir': (plan) =>
    `Dividir es repartir en partes iguales. ${plan.dividendo} ÷ ${plan.divisor} es repartir ${plan.dividendo} cosas entre ${plan.divisor}: el cociente es cuánto le toca a cada uno y el residuo lo que sobra.`,
  'elegir-cifras': (plan) =>
    `Empezamos por la izquierda porque ahí están las cifras que valen más. Tomamos las necesarias para que el ${plan.divisor} quepa al menos una vez.`,
  'cuantas-veces-cabe': (plan) =>
    `Usa la tabla del ${plan.divisor}: busca el resultado más grande que no se pase del número. Si te pasas, prueba uno menos.`,
  multiplicar: () => 'Multiplicamos para saber cuánto repartimos en total, y así poder restarlo y ver qué sobra.',
  restar: () => 'Restamos para saber lo que sobró después de repartir.',
  'resto-menor': (plan) =>
    `Si sobra ${plan.divisor} o más, ¡todavía se puede repartir una vez más! Por eso lo que sobra siempre es menor que el divisor.`,
  'bajar-cifra': () =>
    'Lo que sobró se junta con la siguiente cifra para seguir repartiendo. Se escribe al lado, como cambiar decenas sobrantes por unidades.',
  'cero-en-cociente': (plan) =>
    `Si el ${plan.divisor} no cabe, a cada uno le tocan 0 en ese lugar: escribimos 0 en el cociente y bajamos la siguiente cifra.`,
  residuo: () => 'El residuo es lo que sobra al final, lo que ya no se puede repartir en partes iguales.',
  comprobar: () => 'Multiplica el divisor por el cociente y súmale el residuo. Si te da el dividendo, ¡está perfecta!',
  'no-entiendo': () =>
    'No pasa nada, vamos despacio. Mira solo lo que está en amarillo en la casita y pulsa 💡 si necesitas una pista.',
  'fuera-de-tema': () => '¡Buena pregunta! Pero ahora estamos con la división. ¿Seguimos? 😊',
  'probar-numero': (plan) =>
    `Escribe el número que quieres probar, por ejemplo "¿y si pongo 3?", y te digo qué pasa al multiplicarlo por ${plan.divisor}.`,
  'pide-respuesta': () => 'No te la voy a decir 😉 ¡pero te ayudo a encontrarla! Pulsa 💡 para una pista.',
};

/** Preguntas del porqué que se le hacen al niño (una por tipo de paso, la primera vez). */
export const RETOS: Partial<Record<TipoPaso, { pregunta: string; ideaClave: string }>> = {
  cabe: {
    pregunta: '¿Por qué no podemos poner un número más grande en el cociente?',
    ideaClave: 'Porque al multiplicarlo por el divisor se pasaría del número; el producto no puede ser mayor.',
  },
  restar: {
    pregunta: '¿Por qué lo que sobra tiene que ser más pequeño que el divisor?',
    ideaClave: 'Porque si sobra igual o más que el divisor, todavía se podría repartir una vez más.',
  },
  bajar: {
    pregunta: '¿Para qué bajamos la siguiente cifra?',
    ideaClave: 'Para juntar lo que sobró con la cifra siguiente y seguir repartiendo.',
  },
  residuo: {
    pregunta: '¿Qué significa el residuo?',
    ideaClave: 'Es lo que sobra y no se puede repartir en partes iguales.',
  },
};

export const RESPUESTA_RETO: Record<0 | 1 | 2, string> = {
  2: '¡Exacto! Lo explicaste muy bien. 🌟',
  1: '¡Vas por buen camino! Te lo completo:',
  0: 'Casi. Mira, la idea es esta:',
};

const PALABRAS_NUMERO: Record<string, number> = {
  cero: 0, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5,
  seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10,
};

/** Primer número que aparece en la pregunta del niño ("si multiplico por 4", "¿y con cinco?"). */
export function extraerNumero(texto: string): number | null {
  const cifra = texto.match(/\d+/);
  if (cifra) return Number(cifra[0]);
  const palabra = texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[^a-zñ]+/)
    .find((p) => p in PALABRAS_NUMERO);
  return palabra === undefined ? null : PALABRAS_NUMERO[palabra];
}

/**
 * Contesta a una pregunta con un número concreto haciendo la cuenta con ese número,
 * igual que el probador: el niño ve qué pasa y decide él. Devuelve null si no aplica.
 */
export function responderConNumero(plan: PlanDivision, paso: Paso, n: number): string | null {
  const d = plan.divisor;
  switch (paso.tipo) {
    case 'cabe': {
      const c = ciclo(plan, paso);
      const N = c.dividendoParcial;
      if (n > 9 && n !== d) {
        return `En el cociente va una sola cifra, del 0 al 9. Busca cuál, multiplicada por ${d}, se acerca a ${N} sin pasarse.`;
      }
      if (n === d && n > 9) {
        return `Sí, multiplicamos por el ${d}, que es el divisor. Ahora elige un número del 0 al 9 y compruébalo en el 🧪 probador.`;
      }
      const intro = n === d ? `Sí, multiplicamos por el ${d}, que es el divisor. ` : '';
      return `${intro}¡Buena idea probar con el ${n}! No te digo el resultado: compruébalo tú en el 🧪 probador. Primero, ¿cuánto es ${n} × ${d}?`;
    }
    case 'multiplicar': {
      const c = ciclo(plan, paso);
      return n === d || n === c.cifraCociente
        ? `¡Sí! Multiplicas el ${c.cifraCociente} que pusiste en el cociente por el ${d}, que es el divisor. ¿Cuánto da?`
        : `En este paso multiplicas el ${c.cifraCociente} que pusiste en el cociente por el ${d}, que es el divisor (no por el ${n}).`;
    }
    case 'restar': {
      const c = ciclo(plan, paso);
      return `Para comprobar si sobra ${n}, haz la cuenta al revés: ${c.producto} + ${n} tiene que dar ${c.dividendoParcial}. Y además ${n} tiene que ser menor que ${d}.`;
    }
    case 'bajar': {
      const c = ciclo(plan, paso);
      return `Mira la casita: sobró ${c.resto} y bajas el ${c.cifraBajada}. Escribe el ${c.cifraBajada} a la derecha del ${c.resto}. ¿Te da ${n}?`;
    }
    case 'residuo':
      return `El residuo es lo último que sobró, abajo del todo en la casita. ¿Es ${n}? Recuerda que tiene que ser menor que ${d}.`;
    case 'elegir-cifras':
      return null;
  }
}
