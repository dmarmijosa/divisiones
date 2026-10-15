import { crearPasos, crearPlan } from '../division/division-engine';
import { extraerNumero, responderConNumero } from './explicaciones';

describe('preguntas con número', () => {
  // 175 ÷ 4: primera vuelta, ¿cuántas veces cabe el 4 en el 17?
  const plan = crearPlan(175, 4);
  const [, cabe, multiplicar] = crearPasos(plan);

  it('saca el número escrito con cifras o con palabras', () => {
    expect(extraerNumero('si multiplico por 4')).toBe(4);
    expect(extraerNumero('¿y si pongo cinco?')).toBe(5);
    expect(extraerNumero('¿por qué bajo la cifra?')).toBeNull();
  });

  it('hace la cuenta con el número que propone en "¿cuántas veces cabe?"', () => {
    expect(responderConNumero(plan, cabe, 5)).toContain('5 × 4 = 20');
    expect(responderConNumero(plan, cabe, 5)).toContain('se pasa de 17');
    expect(responderConNumero(plan, cabe, 3)).toContain('todavía cabe otra vez');
    expect(responderConNumero(plan, cabe, 4)).toContain('Sí, multiplicamos por el 4');
    expect(responderConNumero(plan, cabe, 4)).toContain('¡Ese número funciona!');
  });

  it('en "multiplicar" explica qué números se multiplican sin dar el resultado', () => {
    const respuesta = responderConNumero(plan, multiplicar, 4)!;
    expect(respuesta).toContain('Multiplicas el 4');
    expect(respuesta).not.toContain('16');
  });
});
