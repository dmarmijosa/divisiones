/**
 * Servidor local del tutor (para `npm start`). En Netlify se usa netlify/functions/tutor.mts.
 * La API key sale de la variable de entorno TYPESAFE_API_KEY o, si no está,
 * de src/environments/environment.server.ts (que no se sube a git).
 */
import express from 'express';
import { MODELO_POR_DEFECTO, crearTutor, tieneApiKey } from './tutor.ts';

interface EnvironmentServer {
  typesafeApiKey?: string;
  typesafeModel?: string;
  port?: number;
}

async function leerEnvironment(): Promise<EnvironmentServer> {
  try {
    // Ruta en variable: el archivo es opcional (no está en git ni en CI).
    const ruta = '../src/environments/environment.server.ts';
    const modulo = await import(ruta);
    return modulo.environmentServer as EnvironmentServer;
  } catch {
    return {};
  }
}

const archivo = await leerEnvironment();
const apiKey = process.env['TYPESAFE_API_KEY'] || archivo.typesafeApiKey;
const model = process.env['TYPESAFE_MODEL'] || archivo.typesafeModel || MODELO_POR_DEFECTO;
const port = Number(process.env['TUTOR_PORT'] || archivo.port || 3000);

if (!tieneApiKey(apiKey)) {
  console.warn('⚠️  Falta la API key (TYPESAFE_API_KEY o environment.server.ts) — el tutor usará solo sus textos.');
}

const atender = crearTutor({ apiKey, model });
const app = express();
app.use(express.json({ limit: '50kb' }));

app.post('/api/tutor/:accion', async (req, res) => {
  const { status, body } = await atender(req.path, req.body);
  res.status(status).json(body);
});

app.listen(port, () => console.log(`🦉 Tutor (TypeSafe ${model}) en http://localhost:${port}`));
