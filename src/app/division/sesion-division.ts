import { Injectable, computed, inject, signal } from '@angular/core';
import { ContextoEjercicio, TIPOS_ERROR, Tema } from '../tutor/contrato';
import {
  POR_ERROR,
  POR_QUE,
  POR_TEMA,
  PISTAS,
  RESPUESTA_RETO,
  RETOS,
  extraerNumero,
  responderConNumero,
} from '../tutor/explicaciones';
import { Animacion, animacionBajar, animacionRepartir, ejemploBajar, ejemploRepartir } from '../tutor/animaciones';
import { TutorService } from '../tutor/tutor.service';
import { Paso, PlanDivision, TipoPaso, Veredicto, crearPasos, crearPlan, evaluar } from './division-engine';
import { construirTablero } from './division-tablero';
import { enunciado, retroalimentacion } from './division-textos';
import { Guia, guiaMultiplicacion, guiaResta, guiaTanteo } from './guias';

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
  /** Etiqueta del recuadro de explicación (por defecto "¿Por qué?"). */
  readonly titulo?: string;
  readonly pista?: string;
  /** Qué decidió Jev, para que se vea que la IA está trabajando. */
  readonly jev?: string;
  /** Animación de HyperFrames que se puede ver desde la burbuja. */
  readonly animacion?: Animacion;
}

/** Una guía "hazlo tú" en curso. */
export interface EstadoGuia {
  readonly guia: Guia;
  readonly indice: number;
  /** Respuestas de la guía que ya acertó (para ir mostrando su trabajo). */
  readonly hechas: readonly string[];
  readonly mensaje: { readonly bien: boolean; readonly texto: string } | null;
  readonly fallos: number;
  readonly terminada: boolean;
  /** Obligatoria: hasta terminarla no puede volver a responder el paso (evita adivinar). */
  readonly obligatoria: boolean;
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

  readonly plan = signal<PlanDivision | null>(null);
  readonly indice = signal(0);
  readonly resultado = signal<Resultado | null>(null);
  readonly burbuja = signal<Burbuja | null>(null);
  readonly reto = signal<Reto | null>(null);
  readonly aciertos = signal(0);
  readonly guia = signal<EstadoGuia | null>(null);
  readonly animacion = signal<Animacion | null>(null);
  /** Mientras haya una comprobación obligatoria abierta, no se puede responder el paso. */
  readonly bloqueado = computed(() => {
    const g = this.guia();
    return g !== null && g.obligatoria && !g.terminada;
  });

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
    this.burbuja.set({
      animo: 'explica',
      mensaje: `¡Hola, alumno! Vamos a repartir ${dividendo} entre ${divisor}.`,
      porque: POR_TEMA['que-es-dividir'](plan),
      animacion: ejemploRepartir({ n: dividendo, d: divisor }),
    });
  }

  salir(): void {
    this.plan.set(null);
  }

  responder(valor: number): Veredicto | null {
    const plan = this.plan();
    const paso = this.pasoActual();
    if (!plan || !paso || !Number.isInteger(valor) || this.bloqueado()) return null;

    const veredicto = evaluar(plan, paso, valor);
    const texto = retroalimentacion(plan, paso, veredicto);
    this.resultado.set({ veredicto, texto });

    if (veredicto === 'correcto') {
      if (this.intentos().length === 0) this.aciertos.update((a) => a + 1);
      this.burbuja.set({
        animo: 'celebra',
        mensaje: texto,
        porque: POR_QUE[paso.tipo](plan, paso),
        animacion: this.animacionTrasAcertar(plan, paso),
      });
      this.proponerReto(paso.tipo);
      this.indice.update((i) => i + 1);
      this.reiniciarPaso();
      return veredicto;
    }

    const anteriores = this.intentos();
    this.intentos.update((v) => [...v, valor]);
    this.burbuja.set({ animo: 'anima', mensaje: texto });
    // Nada de "te pasaste / te faltó" que permita adivinar: el alumno comprueba haciendo la cuenta.
    if (paso.tipo === 'cabe' && valor >= 0 && valor <= 9) {
      this.tantear(valor, true);
    } else if ((paso.tipo === 'multiplicar' || paso.tipo === 'restar') && this.intentos().length >= 2) {
      this.hacerPorPartes(true);
    }
    if (paso.tipo !== 'elegir-cifras') void this.diagnosticar(plan, paso, valor, veredicto, anteriores);
    return veredicto;
  }

  /** Abre el probador: el alumno comprueba él mismo si `n` cabe. */
  tantear(n: number, obligatoria = false): void {
    const plan = this.plan();
    const paso = this.pasoActual();
    if (!plan || paso?.tipo !== 'cabe' || !Number.isInteger(n) || n < 0 || n > 9) return;
    this.abrirGuia(guiaTanteo(n, plan.divisor, plan.ciclos[paso.ciclo].dividendoParcial), obligatoria);
  }

  /** Abre la cuenta por partes del paso actual (multiplicar o restar). */
  hacerPorPartes(obligatoria = false): void {
    const plan = this.plan();
    const paso = this.pasoActual();
    if (!plan || !paso || !('ciclo' in paso)) return;
    const c = plan.ciclos[paso.ciclo];
    if (paso.tipo === 'multiplicar') this.abrirGuia(guiaMultiplicacion(c.cifraCociente, plan.divisor), obligatoria);
    if (paso.tipo === 'restar') this.abrirGuia(guiaResta(c.dividendoParcial, c.producto), obligatoria);
  }

  responderGuia(valor: number | boolean): void {
    const estado = this.guia();
    if (!estado || estado.terminada) return;
    const pregunta = estado.guia.preguntas[estado.indice];
    if (pregunta.tipo === 'numero' && (typeof valor !== 'number' || !Number.isInteger(valor))) return;

    if (valor !== pregunta.respuesta) {
      const fallos = estado.fallos + 1;
      const ayuda = pregunta.tipo === 'numero' && fallos >= 2 ? pregunta.ayuda : undefined;
      this.guia.set({
        ...estado,
        fallos,
        mensaje: { bien: false, texto: ayuda ? `Mmm, no es eso. 💡 ${ayuda}` : 'Mmm, no es eso. Revísalo con calma.' },
      });
      return;
    }

    const hechas = [...estado.hechas, `${pregunta.texto} → ${pregunta.tipo === 'si-no' ? (valor ? 'Sí' : 'No') : valor}`];
    const terminada = (pregunta.tipo === 'si-no' && pregunta.fin === true) || estado.indice + 1 >= estado.guia.preguntas.length;
    this.guia.set({
      ...estado,
      indice: terminada ? estado.indice : estado.indice + 1,
      hechas,
      fallos: 0,
      terminada,
      mensaje: { bien: true, texto: pregunta.correcto },
    });

    const respuesta = estado.guia.respuestaDelPaso;
    if (terminada && respuesta !== undefined) {
      // La cuenta por partes calculó la respuesta del paso (la escribió él en la última pregunta):
      // se entrega y dejamos la guía abierta con la conclusión hasta que pulse "Seguir".
      const final = this.guia();
      this.responder(respuesta);
      this.guia.set(final);
    }
  }

  cerrarGuia(): void {
    const g = this.guia();
    if (g && g.obligatoria && !g.terminada) return;
    this.guia.set(null);
  }

  verAnimacion(animacion: Animacion | null): void {
    this.animacion.set(animacion);
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
    if (!plan || !paso) return;
    const c = 'ciclo' in paso ? plan.ciclos[paso.ciclo] : null;
    const animacion =
      paso.tipo === 'cabe' || paso.tipo === 'elegir-cifras'
        ? ejemploRepartir({ n: c?.dividendoParcial ?? 0, d: plan.divisor })
        : paso.tipo === 'bajar' && c && c.cifraBajada !== null
          ? ejemploBajar({ resto: c.resto, cifra: c.cifraBajada })
          : undefined;
    this.burbuja.set({ animo: 'explica', mensaje: '¿Por qué hacemos este paso?', porque: POR_TEMA[TEMA_DEL_PASO[paso.tipo]](plan), animacion });
  }

  async preguntaLibre(texto: string): Promise<void> {
    const plan = this.plan();
    const pregunta = texto.trim();
    if (!plan || !pregunta) return;
    const paso = this.pasoActual();
    const numero = extraerNumero(pregunta);
    // Si trae un número, la respuesta es la cuenta con ese número (no hace falta la IA para eso).
    const conNumero = paso && numero !== null ? responderConNumero(plan, paso, numero) : null;

    const clasificacion = await this.tutor.clasificarPregunta({ contexto: this.contexto(plan), texto: pregunta });
    const tema: Tema | null = clasificacion ? (clasificacion.confianza >= 0.3 ? clasificacion.tema : 'no-entiendo') : null;
    const jev = clasificacion
      ? `Jev entendió que preguntas sobre: ${tema} (${porcentaje(clasificacion.confianza)})`
      : undefined;
    const base = { mensaje: `Preguntaste: "${pregunta}"`, titulo: 'Respuesta:', jev } as const;

    if (conNumero && tema !== 'fuera-de-tema') {
      this.burbuja.set({ ...base, animo: 'piensa', porque: conNumero });
      if (paso?.tipo === 'cabe' && numero !== null && !this.bloqueado()) this.tantear(numero);
    } else if (tema === 'pide-respuesta' && paso) {
      const nivel = Math.min(3, this.nivelAyuda());
      this.nivelAyuda.set(Math.min(3, nivel + 1));
      this.burbuja.set({ ...base, animo: 'piensa', porque: POR_TEMA[tema](plan), pista: PISTAS[paso.tipo][nivel](plan, paso) });
    } else if (tema) {
      this.burbuja.set({ ...base, animo: 'explica', porque: POR_TEMA[tema](plan) });
    } else {
      this.burbuja.set({
        animo: 'piensa',
        mensaje: 'Ahora mismo no puedo pensar en tu pregunta. Prueba con 💡 o 🤔, ¡esos siempre funcionan!',
      });
    }
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
    this.guia.set(null);
  }

  private abrirGuia(guia: Guia, obligatoria: boolean): void {
    this.guia.set({ guia, indice: 0, hechas: [], mensaje: null, fallos: 0, terminada: false, obligatoria });
  }

  private animacionTrasAcertar(plan: PlanDivision, paso: Paso): Animacion | undefined {
    if (!('ciclo' in paso)) return undefined;
    const c = plan.ciclos[paso.ciclo];
    if (paso.tipo === 'cabe') return animacionRepartir(c.dividendoParcial, plan.divisor) ?? undefined;
    if (paso.tipo === 'bajar' && c.cifraBajada !== null) return animacionBajar(c.resto, c.cifraBajada);
    return undefined;
  }

  private contexto(plan: PlanDivision): ContextoEjercicio {
    const paso = this.pasoActual();
    return { dividendo: plan.dividendo, divisor: plan.divisor, paso: paso?.tipo ?? null, pregunta: this.pregunta() };
  }
}
