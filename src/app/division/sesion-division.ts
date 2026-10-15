import { Injectable, computed, inject, signal } from '@angular/core';
import { ContextoEjercicio, TIPOS_ERROR, Tema } from '../tutor/contrato';
import { POR_ERROR, POR_QUE, POR_TEMA, PISTAS, RESPUESTA_RETO, RETOS } from '../tutor/explicaciones';
import { TutorService } from '../tutor/tutor.service';
import { Paso, PlanDivision, TipoPaso, Veredicto, crearPasos, crearPlan, evaluar } from './division-engine';
import { construirTablero } from './division-tablero';
import { enunciado, retroalimentacion } from './division-textos';

export interface Resultado {
  readonly veredicto: Veredicto;
  readonly texto: string;
}

export type Animo = 'celebra' | 'anima' | 'piensa' | 'explica';

/** Lo que muestra la burbuja del Profe Búho. */
export interface Burbuja {
  readonly animo: Animo;
  readonly mensaje: string;
  readonly porque?: string;
  readonly pista?: string;
  /** Qué decidió Jev, para que se vea que la IA está trabajando. */
  readonly jev?: string;
}

export interface Reto {
  readonly tipo: TipoPaso;
  readonly pregunta: string;
  readonly ideaClave: string;
}

/** Tema general de cada paso (no revela la respuesta, a diferencia de POR_QUE). */
const TEMA_DEL_PASO: Record<TipoPaso, Tema> = {
  'elegir-cifras': 'elegir-cifras',
  cabe: 'cuantas-veces-cabe',
  multiplicar: 'multiplicar',
  restar: 'restar',
  bajar: 'bajar-cifra',
  residuo: 'residuo',
};

const porcentaje = (p: number) => `${Math.round(p * 100)}%`;

/** Estado del ejercicio en curso. */
@Injectable({ providedIn: 'root' })
export class SesionDivision {
  private readonly tutor = inject(TutorService);

  readonly nombre = signal('');
  readonly plan = signal<PlanDivision | null>(null);
  readonly indice = signal(0);
  readonly resultado = signal<Resultado | null>(null);
  readonly burbuja = signal<Burbuja | null>(null);
  readonly reto = signal<Reto | null>(null);
  readonly aciertos = signal(0);

  /** Respuestas equivocadas en el paso actual. */
  private readonly intentos = signal<number[]>([]);
  /** Nivel de la próxima pista (0..3). Jev lo sube si ve que necesita más ayuda. */
  private readonly nivelAyuda = signal(0);
  private readonly retosHechos = new Set<TipoPaso>();

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
    this.resultado.set(null);
    this.reto.set(null);
    this.reiniciarPaso();
    const nombre = this.nombre().trim();
    this.burbuja.set({
      animo: 'explica',
      mensaje: `¡Hola${nombre ? ' ' + nombre : ''}! Vamos a repartir ${dividendo} entre ${divisor}.`,
      porque: POR_TEMA['que-es-dividir'](plan),
    });
  }

  salir(): void {
    this.plan.set(null);
  }

  responder(valor: number): Veredicto | null {
    const plan = this.plan();
    const paso = this.pasoActual();
    if (!plan || !paso || !Number.isInteger(valor)) return null;

    const veredicto = evaluar(plan, paso, valor);
    const texto = retroalimentacion(plan, paso, veredicto);
    this.resultado.set({ veredicto, texto });

    if (veredicto === 'correcto') {
      if (this.intentos().length === 0) this.aciertos.update((a) => a + 1);
      this.burbuja.set({ animo: 'celebra', mensaje: texto, porque: POR_QUE[paso.tipo](plan, paso) });
      this.proponerReto(paso.tipo);
      this.indice.update((i) => i + 1);
      this.reiniciarPaso();
      return veredicto;
    }

    const anteriores = this.intentos();
    this.intentos.update((v) => [...v, valor]);
    this.burbuja.set({ animo: 'anima', mensaje: texto });
    if (paso.tipo !== 'elegir-cifras') void this.diagnosticar(plan, paso, valor, veredicto, anteriores);
    return veredicto;
  }

  pedirPista(): void {
    const plan = this.plan();
    const paso = this.pasoActual();
    if (!plan || !paso) return;
    const nivel = Math.min(3, this.nivelAyuda());
    this.nivelAyuda.set(nivel + 1);
    this.burbuja.set({
      animo: 'piensa',
      mensaje: nivel === 3 ? 'Esta es mi mejor pista:' : `Pista ${nivel + 1}:`,
      pista: PISTAS[paso.tipo][nivel](plan, paso),
    });
  }

  preguntarPorque(): void {
    const plan = this.plan();
    const paso = this.pasoActual();
    if (plan && paso) this.burbuja.set({ animo: 'explica', mensaje: '¿Por qué hacemos este paso?', porque: POR_TEMA[TEMA_DEL_PASO[paso.tipo]](plan) });
  }

  async preguntaLibre(texto: string): Promise<void> {
    const plan = this.plan();
    if (!plan || !texto.trim()) return;
    const clasificacion = await this.tutor.clasificarPregunta({ contexto: this.contexto(plan), texto: texto.trim() });
    if (!clasificacion) {
      this.burbuja.set({
        animo: 'piensa',
        mensaje: 'Ahora mismo no puedo pensar en tu pregunta. Prueba con 💡 o 🤔, ¡esos siempre funcionan!',
      });
      return;
    }
    const tema = clasificacion.confianza >= 0.3 ? clasificacion.tema : 'no-entiendo';
    this.burbuja.set({
      animo: 'explica',
      mensaje: `Preguntaste: "${texto.trim()}"`,
      porque: POR_TEMA[tema](plan),
      jev: `Jev entendió que preguntas sobre: ${tema} (${porcentaje(clasificacion.confianza)})`,
    });
  }

  async responderReto(explicacion: string): Promise<void> {
    const plan = this.plan();
    const reto = this.reto();
    if (!plan || !reto || !explicacion.trim()) return;
    this.reto.set(null);
    const evaluacion = await this.tutor.evaluarExplicacion({
      contexto: this.contexto(plan),
      pregunta: reto.pregunta,
      ideaClave: reto.ideaClave,
      explicacion: explicacion.trim(),
    });
    if (!evaluacion) {
      this.burbuja.set({ animo: 'explica', mensaje: '¡Gracias por explicarlo! Así lo diría yo:', porque: reto.ideaClave });
      return;
    }
    const nivel = evaluacion.esSeria < 0.4 ? 0 : evaluacion.comprension;
    this.burbuja.set({
      animo: nivel === 2 ? 'celebra' : 'explica',
      mensaje: RESPUESTA_RETO[nivel],
      porque: nivel === 2 ? undefined : reto.ideaClave,
      jev: `Jev valoró tu explicación: ${['no la entendió aún', 'la entendió a medias', '¡la entendió!'][nivel]} (${porcentaje(evaluacion.confianza)})`,
    });
  }

  saltarReto(): void {
    const reto = this.reto();
    this.reto.set(null);
    if (reto) this.burbuja.set({ animo: 'explica', mensaje: reto.pregunta, porque: reto.ideaClave });
  }

  private async diagnosticar(plan: PlanDivision, paso: Paso, valor: number, veredicto: Veredicto, anteriores: number[]) {
    if (paso.tipo === 'elegir-cifras') return;
    const indice = this.indice();
    const diagnostico = await this.tutor.diagnosticar({
      contexto: { ...this.contexto(plan), paso: paso.tipo },
      respuestaCorrecta: paso.respuesta,
      respuestaNino: valor,
      veredicto,
      intentosAnteriores: anteriores,
    });
    // Si ya pasó a otro paso o volvió a responder, este diagnóstico llegó tarde.
    if (this.indice() !== indice || this.intentos().at(-1) !== valor) return;
    if (!diagnostico) {
      // Sin Jev: a partir del segundo fallo, damos la siguiente pista nosotros.
      if (this.intentos().length >= 2) this.pedirPista();
      return;
    }

    this.nivelAyuda.update((n) => Math.max(n, diagnostico.ayuda));
    const seguro = diagnostico.confianza >= 0.35;
    const nivel = Math.min(3, diagnostico.ayuda);
    this.burbuja.set({
      animo: diagnostico.frustracion > 0.6 ? 'anima' : 'piensa',
      mensaje: this.resultado()?.texto ?? '',
      porque: seguro ? POR_ERROR[diagnostico.error](plan, paso) : undefined,
      pista: diagnostico.frustracion > 0.6 ? POR_ERROR['al-azar'](plan, paso) : PISTAS[paso.tipo][nivel](plan, paso),
      jev: `Jev cree que: ${TIPOS_ERROR[diagnostico.error].toLowerCase()} (${porcentaje(diagnostico.confianza)})`,
    });
    this.nivelAyuda.set(Math.min(3, nivel + 1));
  }

  private proponerReto(tipo: TipoPaso): void {
    const reto = RETOS[tipo];
    if (!reto || this.retosHechos.has(tipo)) return;
    this.retosHechos.add(tipo);
    this.reto.set({ tipo, ...reto });
  }

  private reiniciarPaso(): void {
    this.intentos.set([]);
    this.nivelAyuda.set(0);
  }

  private contexto(plan: PlanDivision): ContextoEjercicio {
    const paso = this.pasoActual();
    return { dividendo: plan.dividendo, divisor: plan.divisor, paso: paso?.tipo ?? null, pregunta: this.pregunta() };
  }
}
