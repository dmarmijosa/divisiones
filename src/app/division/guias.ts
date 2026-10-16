/**
 * Guías "hazlo tú": convierten una comprobación o una cuenta en preguntas pequeñas
 * que el alumno resuelve. La app nunca da la cuenta hecha: solo verifica lo que él calcula.
 */

export interface PreguntaNumero {
  readonly tipo: 'numero';
  readonly texto: string;
  readonly respuesta: number;
  /** Lo que se le dice al acertar (puede repetir su resultado: ya lo calculó él). */
  readonly correcto: string;
  /** Ayuda tras fallar dos veces la misma pregunta (sin dar el resultado). */
  readonly ayuda?: string;
}

export interface PreguntaSiNo {
  readonly tipo: 'si-no';
  readonly texto: string;
  readonly respuesta: boolean;
  readonly correcto: string;
  /** Si al acertar esta pregunta ya se sabe la conclusión, la guía termina aquí. */
  readonly fin?: boolean;
}

export type PreguntaGuia = PreguntaNumero | PreguntaSiNo;

export interface Guia {
  readonly tipo: 'tanteo' | 'resta' | 'multiplicacion';
  readonly titulo: string;
  /** La cuenta en vertical que se dibuja encima (filas de texto alineadas a la derecha). */
  readonly cuenta?: readonly string[];
  readonly preguntas: readonly PreguntaGuia[];
  /** Si la guía termina calculando la respuesta del paso, se entrega al terminar. */
  readonly respuestaDelPaso?: number;
}

const COLUMNAS = ['unidades', 'decenas', 'centenas', 'unidades de mil', 'decenas de mil', 'centenas de mil'];

/** ¿Cabe `n` veces el divisor en `parcial`? El alumno multiplica, compara y resta. */
export function guiaTanteo(n: number, divisor: number, parcial: number): Guia {
  const producto = n * divisor;
  const sobra = parcial - producto;
  const preguntas: PreguntaGuia[] = [
    {
      tipo: 'numero',
      texto: `¿Cuánto es ${n} × ${divisor}?`,
      respuesta: producto,
      correcto: `¡Bien! ${n} × ${divisor} = ${producto}.`,
      ayuda: `Recita la tabla del ${divisor} hasta llegar a ${n} veces, o suma el ${divisor} ${n} veces.`,
    },
    {
      tipo: 'si-no',
      texto: `¿El ${producto} es más grande que el ${parcial}? (¿se pasa?)`,
      respuesta: producto > parcial,
      correcto:
        producto > parcial
          ? `¡Exacto, se pasa! El ${n} es demasiado: prueba con un número más pequeño.`
          : `Correcto, no se pasa. Ahora veamos cuánto sobra.`,
      fin: producto > parcial,
    },
  ];
  if (producto <= parcial) {
    preguntas.push(
      {
        tipo: 'numero',
        texto: `¿Cuánto sobra? ${parcial} − ${producto} = ?`,
        respuesta: sobra,
        correcto: `¡Bien! Sobran ${sobra}.`,
        ayuda: `Cuenta hacia arriba: desde ${producto}, ¿cuánto falta para llegar a ${parcial}?`,
      },
      {
        tipo: 'si-no',
        texto: `¿El ${sobra} es menor que el ${divisor}?`,
        respuesta: sobra < divisor,
        correcto:
          sobra < divisor
            ? `¡Sí! Entonces el ${n} funciona. Escríbelo arriba como respuesta.`
            : `¡Bien visto! Sobra ${divisor} o más, así que todavía cabe otra vez: prueba con un número más grande.`,
        fin: true,
      },
    );
  }
  return {
    tipo: 'tanteo',
    titulo: `🧪 Comprobemos el ${n} (¿cabe en el ${parcial}?)`,
    preguntas,
  };
}

/** Resta columna por columna, de derecha a izquierda, pidiendo prestado cuando hace falta. */
export function guiaResta(minuendo: number, sustraendo: number): Guia {
  const arriba = String(minuendo).split('').map(Number).reverse();
  const abajo = String(sustraendo).split('').map(Number).reverse();
  const preguntas: PreguntaGuia[] = [];
  let prestado = 0;

  for (let i = 0; i < arriba.length; i++) {
    const columna = COLUMNAS[i] ?? `columna ${i + 1}`;
    const original = arriba[i];
    const de = original - prestado;
    const quita = abajo[i] ?? 0;
    const textoPrestado = prestado ? ` (el ${original} prestó 1, ahora es ${de})` : '';

    if (de < quita) {
      preguntas.push({
        tipo: 'si-no',
        texto: `Columna de las ${columna}${textoPrestado}: ¿puedes quitarle ${quita} al ${de}?`,
        respuesta: false,
        correcto: `¡Exacto, no alcanza! Pedimos prestado 1 a la columna de la izquierda: el ${de} se convierte en ${de + 10}.`,
      });
      preguntas.push({
        tipo: 'numero',
        texto: `¿Cuánto es ${de + 10} − ${quita}?`,
        respuesta: de + 10 - quita,
        correcto: `¡Bien! Escribimos ${de + 10 - quita} en las ${columna}.`,
        ayuda: `Cuenta hacia arriba desde ${quita} hasta ${de + 10}.`,
      });
      prestado = 1;
    } else {
      preguntas.push({
        tipo: 'numero',
        texto: `Columna de las ${columna}${textoPrestado}: ¿cuánto es ${de} − ${quita}?`,
        respuesta: de - quita,
        correcto: `¡Bien! Escribimos ${de - quita} en las ${columna}.`,
        ayuda: `Cuenta hacia arriba desde ${quita} hasta ${de}.`,
      });
      prestado = 0;
    }
  }

  const resultado = minuendo - sustraendo;
  preguntas.push({
    tipo: 'numero',
    texto: 'Junta las cifras que escribiste, de izquierda a derecha (sin ceros delante). ¿Qué número te dio la resta?',
    respuesta: resultado,
    correcto: `¡Muy bien! ${minuendo} − ${sustraendo} = ${resultado}.`,
  });

  return {
    tipo: 'resta',
    titulo: '🧩 La resta por partes',
    cuenta: [String(minuendo), `− ${sustraendo}`],
    preguntas,
    respuestaDelPaso: resultado,
  };
}

/** Multiplicación por partes: sumando el divisor (si es de una cifra) o cifra por cifra llevando. */
export function guiaMultiplicacion(cifra: number, divisor: number): Guia {
  const resultado = cifra * divisor;
  const preguntas: PreguntaGuia[] = [];

  if (cifra <= 1) {
    preguntas.push({
      tipo: 'numero',
      texto:
        cifra === 0
          ? `Si repartes 0 veces el ${divisor}, ¿cuánto repartes en total?`
          : `Si repartes 1 vez el ${divisor}, ¿cuánto repartes en total?`,
      respuesta: resultado,
      correcto: `¡Eso es! ${cifra} × ${divisor} = ${resultado}.`,
    });
  } else if (divisor < 10) {
    // Sumas repetidas: el alumno calcula cada suma.
    let acumulado = divisor;
    for (let vez = 2; vez <= cifra; vez++) {
      preguntas.push({
        tipo: 'numero',
        texto: `${vez} veces el ${divisor}: ${acumulado} + ${divisor} = ?`,
        respuesta: acumulado + divisor,
        correcto: `¡Bien! ${vez} × ${divisor} = ${acumulado + divisor}.`,
        ayuda: `Cuenta ${divisor} más a partir de ${acumulado}, con los dedos si quieres.`,
      });
      acumulado += divisor;
    }
  } else {
    // Cifra por cifra, de derecha a izquierda, llevando.
    const cifras = String(divisor).split('').map(Number).reverse();
    let llevo = 0;
    cifras.forEach((c, i) => {
      const valor = cifra * c + llevo;
      const ultima = i === cifras.length - 1;
      preguntas.push({
        tipo: 'numero',
        texto: `${cifra} × ${c}${llevo ? ` y súmale el ${llevo} que llevabas` : ''}: ¿cuánto da?`,
        respuesta: valor,
        correcto:
          valor >= 10 && !ultima
            ? `¡Bien! Da ${valor}: escribes el ${valor % 10} en las ${COLUMNAS[i]} y llevas ${Math.floor(valor / 10)}.`
            : `¡Bien! Escribes el ${valor} ${ultima ? 'delante' : `en las ${COLUMNAS[i]}`}.`,
        ayuda: `Usa la tabla del ${cifra}${llevo ? ` y después suma ${llevo}` : ''}.`,
      });
      llevo = Math.floor(valor / 10);
    });
    preguntas.push({
      tipo: 'numero',
      texto: 'Junta lo que escribiste, de izquierda a derecha. ¿Cuánto da la multiplicación?',
      respuesta: resultado,
      correcto: `¡Muy bien! ${cifra} × ${divisor} = ${resultado}.`,
    });
  }

  return {
    tipo: 'multiplicacion',
    titulo: '🧩 La multiplicación por partes',
    cuenta: [String(divisor), `× ${cifra}`],
    preguntas,
    respuestaDelPaso: resultado,
  };
}
