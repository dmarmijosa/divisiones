/**
 * Contrato tipado entre la app y el servidor del tutor (TypeSafe Jev).
 * Lo importan los dos lados, así que solo contiene tipos y constantes.
 *
 * Jev no escribe texto: toma decisiones tipadas (choice / noul / score).
 * Los textos que ve el niño están en explicaciones.ts y se eligen según esas decisiones.
 */
import type { TipoPaso, Veredicto } from '../division/division-engine';

/** Qué pudo pasar cuando el niño se equivoca. */
export const TIPOS_ERROR = {
  tabla: 'Recordó mal un resultado de la tabla de multiplicar',
  estimacion: 'Estimó mal cuántas veces cabe el divisor (el número de tanteo no era el adecuado)',
  llevada: 'Olvidó llevar (acarrear) al multiplicar',
  prestar: 'Se equivocó al pedir prestado en la resta',
  'resta-al-reves': 'En alguna columna restó el número pequeño del grande aunque estaba abajo',
  'cifra-equivocada': 'Bajó o usó una cifra que no tocaba',
  'sumo-en-vez-de-juntar': 'Sumó el resto y la cifra bajada en lugar de ponerla al lado',
  'confundio-cociente': 'Escribió el cociente en lugar del residuo (o al revés)',
  'confundio-numeros': 'Usó otro número del ejercicio (el dividendo completo, el divisor, etc.)',
  'al-azar': 'La respuesta no parece tener relación con la cuenta: pudo adivinar o distraerse',
} as const;
export type TipoError = keyof typeof TIPOS_ERROR;

/** Errores que tiene sentido diagnosticar en cada paso. */
export const ERRORES_POR_PASO: Record<Exclude<TipoPaso, 'elegir-cifras'>, readonly TipoError[]> = {
  cabe: ['tabla', 'estimacion', 'confundio-numeros', 'al-azar'],
  multiplicar: ['tabla', 'llevada', 'confundio-numeros', 'al-azar'],
  restar: ['prestar', 'resta-al-reves', 'confundio-numeros', 'al-azar'],
  bajar: ['cifra-equivocada', 'sumo-en-vez-de-juntar', 'confundio-numeros', 'al-azar'],
  residuo: ['confundio-cociente', 'confundio-numeros', 'al-azar'],
};

/** Temas sobre los que el niño puede preguntar con sus palabras. */
export const TEMAS = {
  'que-es-dividir': 'Qué significa dividir o repartir',
  'elegir-cifras': 'Por qué tomamos cifras del dividendo / con cuántas empezar',
  'cuantas-veces-cabe': 'Cómo saber cuántas veces cabe un número en otro',
  multiplicar: 'Por qué se multiplica la cifra del cociente por el divisor',
  restar: 'Por qué se resta',
  'resto-menor': 'Por qué lo que sobra tiene que ser menor que el divisor',
  'bajar-cifra': 'Por qué y cómo se baja la siguiente cifra',
  'cero-en-cociente': 'Qué hacer cuando el divisor no cabe (poner 0)',
  residuo: 'Qué es el residuo o lo que sobra',
  comprobar: 'Cómo comprobar que la división está bien',
  'probar-numero':
    'Propone un número concreto para probar o pregunta qué pasa si usa, multiplica o pone cierto número (ej. "¿y si pongo 4?", "si multiplico por 4")',
  'pide-respuesta': 'Pide directamente que le digan la respuesta del paso',
  'no-entiendo': 'Está confundido o dice que no entiende, sin un tema concreto',
  'fuera-de-tema': 'No tiene que ver con la división',
} as const;
export type Tema = keyof typeof TEMAS;

export interface ContextoEjercicio {
  dividendo: number;
  divisor: number;
  paso: TipoPaso | null;
  pregunta: string;
}

/* ---------- Peticiones ---------- */

export interface PeticionDiagnostico {
  contexto: ContextoEjercicio & { paso: Exclude<TipoPaso, 'elegir-cifras'> };
  respuestaCorrecta: number;
  respuestaNino: number;
  veredicto: Veredicto;
  intentosAnteriores: number[];
}

export interface PeticionPregunta {
  contexto: ContextoEjercicio;
  texto: string;
}

export interface PeticionExplicacion {
  contexto: ContextoEjercicio;
  /** La pregunta del porqué que se le hizo al niño. */
  pregunta: string;
  /** Lo que un niño debería mencionar para demostrar que entendió. */
  ideaClave: string;
  explicacion: string;
}

/* ---------- Respuestas (decisiones de Jev) ---------- */

export interface Diagnostico {
  error: TipoError;
  confianza: number;
  /** 0 = basta con un empujoncito … 3 = necesita que le guíen casi todo. */
  ayuda: 0 | 1 | 2 | 3;
  /** Probabilidad de que el niño esté frustrado o adivinando. */
  frustracion: number;
}

export interface ClasificacionPregunta {
  tema: Tema;
  confianza: number;
}

export interface EvaluacionExplicacion {
  /** 0 = no lo entendió, 1 = lo entendió a medias, 2 = lo entendió. */
  comprension: 0 | 1 | 2;
  confianza: number;
  /** Probabilidad de que la respuesta sea un intento serio. */
  esSeria: number;
}

export const RUTAS = {
  diagnostico: '/api/tutor/diagnostico',
  pregunta: '/api/tutor/pregunta',
  explicacion: '/api/tutor/explicacion',
} as const;
