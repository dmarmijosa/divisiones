/**
 * Función de Netlify que atiende /api/tutor/*.
 * La API key se lee de la variable de entorno TYPESAFE_API_KEY configurada en Netlify
 * (Site configuration → Environment variables). Nunca está en el código ni en el navegador.
 */
import { MODELO_POR_DEFECTO, crearTutor } from '../../server/tutor.ts';

const atender = crearTutor({
  apiKey: process.env['TYPESAFE_API_KEY'],
  model: process.env['TYPESAFE_MODEL'] || MODELO_POR_DEFECTO,
});

export default async (request: Request): Promise<Response> => {
  if (request.method !== 'POST') return Response.json({ error: 'Usa POST' }, { status: 405 });
  if (Number(request.headers.get('content-length') ?? 0) > 50_000) {
    return Response.json({ error: 'Petición demasiado grande' }, { status: 413 });
  }

  let peticion: unknown;
  try {
    peticion = await request.json();
  } catch {
    return Response.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const { status, body } = await atender(new URL(request.url).pathname, peticion);
  return Response.json(body, { status });
};

export const config = { path: '/api/tutor/*' };
