import { crearPasos, crearPlan, evaluar, validarEjercicio } from './division-engine';

describe('division-engine', () => {
  it('resuelve 175 ÷ 4 = 43 residuo 3', () => {
    const plan = crearPlan(175, 4);
    expect(plan.cifrasIniciales).toBe(2);
    expect(plan.cociente).toBe(43);
    expect(plan.residuo).toBe(3);
    expect(plan.ciclos.map((c) => c.dividendoParcial)).toEqual([17, 15]);
    expect(plan.ciclos.map((c) => c.cifraCociente)).toEqual([4, 3]);
    expect(plan.ciclos.map((c) => c.resto)).toEqual([1, 3]);
  });

  it('pone un 0 en el cociente cuando no cabe al bajar', () => {
    const plan = crearPlan(1015, 5);
    expect(plan.ciclos.map((c) => c.cifraCociente).join('')).toBe('203');
    expect(plan.residuo).toBe(0);
  });

  it('los pasos terminan en el residuo y no hay "bajar" en la última vuelta', () => {
    const pasos = crearPasos(crearPlan(175, 4));
    expect(pasos.map((p) => p.tipo)).toEqual([
      'elegir-cifras',
      'cabe', 'multiplicar', 'restar', 'bajar',
      'cabe', 'multiplicar', 'restar',
      'residuo',
    ]);
  });

  it('distingue si el número del cociente se pasa o se queda corto', () => {
    const plan = crearPlan(175, 4);
    const cabe = { tipo: 'cabe', ciclo: 0, respuesta: 4 } as const;
    expect(evaluar(plan, cabe, 5)).toBe('se-pasa');
    expect(evaluar(plan, cabe, 3)).toBe('queda-corto');
    expect(evaluar(plan, cabe, 4)).toBe('correcto');
    const elegir = { tipo: 'elegir-cifras', respuesta: 2 } as const;
    expect(evaluar(plan, elegir, 1)).toBe('pocas-cifras');
    expect(evaluar(plan, elegir, 3)).toBe('demasiadas-cifras');
  });

  it('valida el ejercicio', () => {
    expect(validarEjercicio(10, 0)).toBe('divisor-cero');
    expect(validarEjercicio(3, 7)).toBe('dividendo-menor');
    expect(validarEjercicio(2.5, 2)).toBe('no-es-entero');
    expect(validarEjercicio(20, 3)).toBeNull();
  });
});
