import { guiaMultiplicacion, guiaResta, guiaTanteo } from './guias';

describe('guías: el alumno hace las cuentas', () => {
  it('tanteo que se pasa: termina al reconocer que se pasa', () => {
    const g = guiaTanteo(5, 4, 17);
    expect(g.preguntas.map((p) => p.respuesta)).toEqual([20, true]);
    expect(g.preguntas.at(-1)).toMatchObject({ tipo: 'si-no', fin: true });
  });

  it('tanteo que funciona: multiplica, compara, resta y comprueba el resto', () => {
    const g = guiaTanteo(4, 4, 17);
    expect(g.preguntas.map((p) => p.respuesta)).toEqual([16, false, 1, true]);
  });

  it('tanteo que se queda corto: el resto no es menor que el divisor', () => {
    const g = guiaTanteo(3, 4, 17);
    expect(g.preguntas.map((p) => p.respuesta)).toEqual([12, false, 5, false]);
  });

  it('ninguna pregunta del tanteo da el resultado en su texto', () => {
    const g = guiaTanteo(4, 4, 17);
    expect(g.preguntas[0].texto).not.toContain('16');
    expect(g.preguntas[2].texto).not.toMatch(/= 1\b/);
  });

  it('resta con préstamo: 52 − 28', () => {
    const g = guiaResta(52, 28);
    expect(g.preguntas.map((p) => p.respuesta)).toEqual([false, 4, 2, 24]);
    expect(g.respuestaDelPaso).toBe(24);
  });

  it('resta sin préstamo: 17 − 16', () => {
    expect(guiaResta(17, 16).preguntas.map((p) => p.respuesta)).toEqual([1, 0, 1]);
  });

  it('multiplicación de una cifra con sumas repetidas: 4 × 6', () => {
    expect(guiaMultiplicacion(4, 6).preguntas.map((p) => p.respuesta)).toEqual([12, 18, 24]);
  });

  it('multiplicación por un divisor de dos cifras llevando: 7 × 23', () => {
    const g = guiaMultiplicacion(7, 23);
    expect(g.preguntas.map((p) => p.respuesta)).toEqual([21, 16, 161]);
    expect(g.respuestaDelPaso).toBe(161);
  });
});
