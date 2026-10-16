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

  it('en "¿cuántas veces cabe?" invita a hacer la cuenta, sin darla hecha', () => {
    const respuesta = responderConNumero(plan, cabe, 5)!;
    expect(respuesta).toContain('¿cuánto es 5 × 4?');
    expect(respuesta).not.toContain('20');
    expect(responderConNumero(plan, cabe, 4)).toContain('Sí, multiplicamos por el 4');
    expect(responderConNumero(plan, cabe, 4)).not.toContain('16');
  });

  it('en "multiplicar" explica qué números se multiplican sin dar el resultado', () => {
    const respuesta = responderConNumero(plan, multiplicar, 4)!;
    expect(respuesta).toContain('Multiplicas el 4');
    expect(respuesta).not.toContain('16');
  });
});
