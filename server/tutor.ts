/**
 * Lógica del tutor: le hace a TypeSafe Jev preguntas tipadas.
 * La usan el servidor local (server/main.ts) y la función de Netlify (netlify/functions/tutor.mts).
 * Jev decide; los textos para el niño los pone la app.
 */
import { APIError, TypeSafeClient, choice, noul, score } from '@typesafe-ai/sdk';
import {
  ERRORES_POR_PASO,
  RUTAS,
  TEMAS,
  TIPOS_ERROR,
  type ClasificacionPregunta,
  type Diagnostico,
  type EvaluacionExplicacion,
  type PeticionDiagnostico,
  type PeticionExplicacion,
  type PeticionPregunta,
  type Tema,
  type TipoError,
} from '../src/app/tutor/contrato.ts';

export interface ConfigTutor {
  apiKey: string | undefined;
  model: string;
}

export interface RespuestaHttp {
  status: number;
  body: unknown;
}

export const MODELO_POR_DEFECTO = 'jev-1.14.0';

export function tieneApiKey(apiKey: string | undefined): apiKey is string {
  return Boolean(apiKey) && !apiKey!.startsWith('PON_AQUI');
}

const ESTUDIANTE = 'Un niño de primaria aprende divisiones largas con números enteros (cociente y residuo).';

/** Pasa un objeto { etiqueta: descripción } a solo las etiquetas pedidas. */
function subconjunto<K extends string>(todas: Record<K, string>, claves: readonly K[]): Record<K, string> {
  return Object.fromEntries(claves.map((k) => [k, todas[k]])) as Record<K, string>;
}

async function diagnosticar(jev: TypeSafeClient, p: PeticionDiagnostico): Promise<Diagnostico> {
  const posibles = ERRORES_POR_PASO[p.contexto.paso];
  const { answers } = await jev.systemOne({
    state: {
      estudiante: ESTUDIANTE,
      ejercicio: `${p.contexto.dividendo} ÷ ${p.contexto.divisor}`,
      preguntaDelPaso: p.contexto.pregunta,
      respuestaCorrecta: p.respuestaCorrecta,
      respuestaDelNino: p.respuestaNino,
      comparacion: p.veredicto === 'se-pasa' ? 'la respuesta del niño es mayor' : 'la respuesta del niño es menor',
      intentosAnterioresEnEstePaso: p.intentosAnteriores,
    },
    questions: {
      error: choice(
        '¿Cuál es la causa más probable del error del niño en este paso?',
        subconjunto<TipoError>(TIPOS_ERROR, posibles),
      ),
      ayuda: score('¿Cuánta ayuda necesita ahora para poder resolver el paso por sí mismo?', [
        'Basta con animarle a revisar',
        'Necesita una pista general',
        'Necesita una pista concreta sobre su error',
        'Necesita que le guíen paso a paso',
      ]),
      frustracion: noul('¿Parece que el niño está adivinando o frustrado (respuestas al azar o repetidas)?'),
    },
  });

  return {
    error: answers.error.choice as TipoError,
    confianza: answers.error.confidence,
    ayuda: Math.min(3, Math.max(0, Math.round(answers.ayuda.score))) as Diagnostico['ayuda'],
    frustracion: answers.frustracion.noul,
  };
}

async function clasificarPregunta(jev: TypeSafeClient, p: PeticionPregunta): Promise<ClasificacionPregunta> {
  const { answers } = await jev.systemOne({
    state: {
      estudiante: ESTUDIANTE,
      ejercicio: `${p.contexto.dividendo} ÷ ${p.contexto.divisor}`,
      pasoEnElQueEsta: p.contexto.pregunta,
      preguntaDelNino: p.texto,
    },
    questions: {
      tema: choice('¿Sobre qué tema pregunta el niño?', TEMAS),
    },
  });
  return { tema: answers.tema.choice as Tema, confianza: answers.tema.confidence };
}

async function evaluarExplicacion(jev: TypeSafeClient, p: PeticionExplicacion): Promise<EvaluacionExplicacion> {
  const { answers } = await jev.systemOne({
    state: {
      estudiante: ESTUDIANTE,
      ejercicio: `${p.contexto.dividendo} ÷ ${p.contexto.divisor}`,
      preguntaQueSeLeHizo: p.pregunta,
      ideaClaveEsperada: p.ideaClave,
      explicacionDelNino: p.explicacion,
    },
    questions: {
      comprension: score(
        '¿Qué tanto demuestra la explicación del niño que entiende la idea clave? Sé comprensivo con la ortografía y las palabras sencillas.',
        [
          'No la entiende o no la menciona',
          'La entiende a medias: algo de razón pero incompleta o confusa',
          'La entiende: expresa la idea clave con sus palabras',
        ],
      ),
      esSeria: noul('¿La respuesta es un intento serio de explicar (no es "no sé", bromas o letras al azar)?'),
    },
  });
  return {
    comprension: Math.min(2, Math.max(0, Math.round(answers.comprension.score))) as EvaluacionExplicacion['comprension'],
    confianza: answers.comprension.confidence,
    esSeria: answers.esSeria.noul,
  };
}

const MANEJADORES: Record<string, (jev: TypeSafeClient, peticion: never) => Promise<unknown>> = {
  [RUTAS.diagnostico]: diagnosticar,
  [RUTAS.pregunta]: clasificarPregunta,
  [RUTAS.explicacion]: evaluarExplicacion,
};

/** Crea el tutor una vez y devuelve una función que atiende cualquier ruta /api/tutor/*. */
export function crearTutor({ apiKey, model }: ConfigTutor) {
  const jev = tieneApiKey(apiKey) ? new TypeSafeClient({ apiKey, defaultModel: model }) : null;

  return async function atender(ruta: string, peticion: unknown): Promise<RespuestaHttp> {
    const manejar = MANEJADORES[ruta];
    if (!manejar) return { status: 404, body: { error: 'Ruta desconocida' } };
    if (!jev) return { status: 503, body: { error: 'Falta la API key de TypeSafe' } };
    if (typeof peticion !== 'object' || peticion === null) return { status: 400, body: { error: 'Petición inválida' } };
    try {
      return { status: 200, body: await manejar(jev, peticion as never) };
    } catch (error) {
      const status = error instanceof APIError && error.status >= 400 && error.status < 600 ? error.status : 500;
      console.error(`Jev falló en ${ruta}:`, error instanceof Error ? error.message : error);
      return { status, body: { error: 'El tutor no pudo decidir' } };
    }
  };
}
