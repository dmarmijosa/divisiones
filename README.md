# Divisiones con el Profe Búho 🦉

App en Angular para aprender divisiones largas con números enteros (cociente y residuo), paso a paso:
elegir cifras → ¿cuántas veces cabe? → multiplicar → restar → bajar la cifra → residuo → comprobación.

## Puesta en marcha

1. Pon tu API key de TypeSafe en `src/environments/environment.server.ts`
   (si no existe, cópialo de `environment.server.example.ts`). El modelo está en el mismo archivo: `jev-1.14.0`.
2. Arranca la app y el servidor del tutor a la vez:

```bash
npm start
```

3. Abre http://localhost:4200

La key solo la lee el servidor Express (`server/main.ts`); nunca llega al navegador, y el archivo está en `.gitignore`.
Sin key la app funciona igual, con las pistas y explicaciones propias.

## Cómo se reparte el trabajo

| Parte | Quién decide |
| --- | --- |
| Si una respuesta es correcta, la casita, los pasos | `division-engine.ts` (código determinista y probado) |
| Textos del porqué, pistas y explicaciones para el niño | `tutor/explicaciones.ts` |
| Qué error cometió, cuánta ayuda necesita, de qué trata su pregunta, si entendió el porqué | **TypeSafe Jev** (`server/main.ts`), con respuestas tipadas (`choice`, `score`, `noul`) |

El contrato tipado entre la app y el servidor está en `src/app/tutor/contrato.ts`.

## Scripts

- `npm start` — app + tutor
- `npm test` — tests del motor de división
- `npm run typecheck:server` — tipos del servidor
