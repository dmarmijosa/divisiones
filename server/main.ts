/**
 * Servidor del tutor: guarda la API key y le hace a TypeSafe Jev preguntas tipadas.
 * Jev decide; los textos para el niño los pone la app.
 */
import { APIError, TypeSafeClient, choice, noul, score } from '@typesafe-ai/sdk';
import express, { type Request, type Response } from 'express';
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
import { environmentServer } from '../src/environments/environment.server.ts';

const { typesafeApiKey, typesafeModel, port } = environmentServer;
const tieneKey = Boolean(typesafeApiKey) && !typesafeApiKey.startsWith('PON_AQUI');

if (!tieneKey) {
  console.warn('⚠️  Falta la API key en src/environments/environment.server.ts — el tutor usará solo sus textos.');
}

const jev = new TypeSafeClient({ apiKey: typesafeApiKey || 'sin-key', defaultModel: typesafeModel });

const ESTUDIANTE = 'Un niño de primaria aprende divisiones largas con números enteros (cociente y residuo).';

/** Pasa un objeto { etiqueta: descripción } a solo las etiquetas pedidas. */
function subconjunto<K extends string>(todas: Record<K, string>, claves: readonly K[]): Record<K, string> {
  return Object.fromEntries(claves.map((k) => [k, todas[k]])) as Record<K, string>;
}

async function diagnosticar(p: PeticionDiagnostico): Promise<Diagnostico> {
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

async function clasificarPregunta(p: PeticionPregunta): Promise<ClasificacionPregunta> {
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

async function evaluarExplicacion(p: PeticionExplicacion): Promise<EvaluacionExplicacion> {
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

const app = express();
app.use(express.json({ limit: '50kb' }));

function ruta<P, R>(path: string, manejar: (peticion: P) => Promise<R>) {
  app.post(path, async (req: Request, res: Response) => {
    if (!tieneKey) {
      res.status(503).json({ error: 'Falta la API key de TypeSafe' });
      return;
    }
    try {
      res.json(await manejar(req.body as P));
    } catch (error) {
      const status = error instanceof APIError ? error.status : 500;
      console.error(`Jev falló en ${path}:`, error instanceof Error ? error.message : error);
      res.status(status >= 400 && status < 600 ? status : 500).json({ error: 'El tutor no pudo decidir' });
    }
  });
}

ruta(RUTAS.diagnostico, diagnosticar);
ruta(RUTAS.pregunta, clasificarPregunta);
ruta(RUTAS.explicacion, evaluarExplicacion);

app.listen(port, () => console.log(`🦉 Tutor (TypeSafe ${typesafeModel}) en http://localhost:${port}`));
