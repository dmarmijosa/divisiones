import { Injectable, computed, inject, signal } from '@angular/core';
import { TutorService } from '../tutor/tutor.service';
import { PlanDivision, Veredicto, crearPasos, crearPlan, evaluar } from './division-engine';
import { construirTablero } from './division-tablero';
import { enunciado, retroalimentacion } from './division-textos';

export interface Resultado {
  readonly veredicto: Veredicto;
  readonly texto: string;
}

/** Estado del ejercicio en curso. */
@Injectable({ providedIn: 'root' })
export class SesionDivision {
  private readonly tutor = inject(TutorService);

  readonly nombre = signal('');
  readonly plan = signal<PlanDivision | null>(null);
  readonly indice = signal(0);
  readonly intentosFallidos = signal(0);
  readonly resultado = signal<Resultado | null>(null);
  readonly aciertos = signal(0);

  readonly pasos = computed(() => {
    const plan = this.plan();
    return plan ? crearPasos(plan) : [];
  });
  readonly pasoActual = computed(() => this.pasos()[this.indice()] ?? null);
  readonly terminado = computed(() => this.plan() !== null && this.indice() >= this.pasos().length);
  readonly progreso = computed(() => (this.pasos().length ? this.indice() / this.pasos().length : 0));
  readonly pregunta = computed(() => {
    const plan = this.plan();
    const paso = this.pasoActual();
    return plan && paso ? enunciado(plan, paso) : '';
  });
  readonly tablero = computed(() => {
    const plan = this.plan();
    return plan ? construirTablero(plan, this.pasos(), this.indice()) : null;
  });

  empezar(dividendo: number, divisor: number): void {
    const plan = crearPlan(dividendo, divisor);
    this.plan.set(plan);
    this.indice.set(0);
    this.intentosFallidos.set(0);
    this.resultado.set(null);
    this.tutor.nuevoEjercicio(plan, this.nombre());
  }

  salir(): void {
    this.plan.set(null);
  }

  responder(valor: number): Veredicto | null {
    const plan = this.plan();
    const paso = this.pasoActual();
    if (!plan || !paso || !Number.isInteger(valor)) return null;

    const veredicto = evaluar(plan, paso, valor);
    const intento = this.intentosFallidos() + 1;
    this.resultado.set({ veredicto, texto: retroalimentacion(plan, paso, veredicto) });
    this.tutor.contar({ tipo: 'respuesta', paso, valor, veredicto, intento });

    if (veredicto === 'correcto') {
      if (this.intentosFallidos() === 0) this.aciertos.update((a) => a + 1);
      this.intentosFallidos.set(0);
      this.indice.update((i) => i + 1);
    } else {
      this.intentosFallidos.update((n) => n + 1);
    }
    return veredicto;
  }

  pedirPista(): void {
    const paso = this.pasoActual();
    if (paso) this.tutor.contar({ tipo: 'pista', paso, intentosFallidos: this.intentosFallidos() });
  }

  preguntarPorque(): void {
    const paso = this.pasoActual();
    if (paso) this.tutor.contar({ tipo: 'porque', paso });
  }

  preguntaLibre(texto: string): void {
    if (texto.trim()) this.tutor.contar({ tipo: 'pregunta-libre', paso: this.pasoActual(), texto: texto.trim() });
  }
}
