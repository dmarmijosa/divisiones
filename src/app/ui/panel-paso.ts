import { Component, ElementRef, Injector, afterNextRender, computed, effect, inject, signal, viewChild } from '@angular/core';
import { TipoPaso } from '../division/division-engine';
import { SesionDivision } from '../division/sesion-division';

const NOMBRES: Record<TipoPaso, string> = {
  'elegir-cifras': '1 · Elegir cifras',
  cabe: '2 · ¿Cuántas veces cabe?',
  multiplicar: '3 · Multiplicar',
  restar: '4 · Restar',
  bajar: '5 · Bajar la cifra',
  residuo: '6 · El residuo',
};

@Component({
  selector: 'app-panel-paso',
  template: `
    @if (sesion.pasoActual(); as paso) {
      <section class="tarjeta panel">
        <div class="etapas" aria-label="Pasos del procedimiento">
          @for (e of etapas; track e) {
            <span class="etapa" [class.activa]="e === paso.tipo">{{ nombres[e] }}</span>
          }
        </div>

        <p class="pregunta">{{ sesion.pregunta() }}</p>

        @if (paso.tipo !== 'elegir-cifras') {
          <form class="respuesta" (submit)="$event.preventDefault(); enviar()">
            <input
              #entrada
              class="numero"
              type="number"
              inputmode="numeric"
              step="1"
              min="0"
              aria-label="Tu respuesta"
              [value]="valor()"
              (input)="valor.set($any($event.target).value)"
            />
            <button class="btn primario" type="submit" [disabled]="valor() === ''">Comprobar</button>
          </form>
        }

        @if (sesion.resultado(); as r) {
          <p class="resultado" [class.bien]="r.veredicto === 'correcto'" [class.mal]="r.veredicto !== 'correcto'">
            {{ r.veredicto === 'correcto' ? '✅' : '🔁' }} {{ r.texto }}
          </p>
        }

        @if (paso.tipo === 'cabe') {
          <details class="probador">
            <summary>🧪 Probador: tantea con la tabla del {{ divisor() }}</summary>
            <div class="probar">
              <span>Si pruebo con</span>
              <input
                class="numero mini"
                type="number"
                min="0"
                max="9"
                aria-label="Número a probar"
                [value]="prueba()"
                (input)="prueba.set($any($event.target).value)"
              />
              @if (tanteo(); as t) {
                <span>
                  → {{ t.n }} × {{ divisor() }} = <b>{{ t.producto }}</b>
                  @if (t.producto > t.parcial) {
                    · ¡se pasa de {{ t.parcial }}! 🚫
                  } @else {
                    · sobran {{ t.parcial - t.producto }}
                    {{ t.parcial - t.producto >= divisor() ? '(¿cabe otra vez? 🤔)' : '✔' }}
                  }
                </span>
              }
            </div>
          </details>
        }

        <div class="acciones">
          <button class="btn" type="button" (click)="sesion.pedirPista()">💡 Dame una pista</button>
          <button class="btn" type="button" (click)="sesion.preguntarPorque()">🤔 ¿Por qué hacemos esto?</button>
        </div>
      </section>
    }
  `,
})
export class PanelPaso {
  protected readonly sesion = inject(SesionDivision);
  protected readonly nombres = NOMBRES;
  protected readonly etapas = Object.keys(NOMBRES) as TipoPaso[];
  protected readonly valor = signal('');
  protected readonly prueba = signal('');
  private readonly entrada = viewChild<ElementRef<HTMLInputElement>>('entrada');
  private readonly injector = inject(Injector);

  protected readonly divisor = computed(() => this.sesion.plan()?.divisor ?? 1);
  protected readonly tanteo = computed(() => {
    const paso = this.sesion.pasoActual();
    const plan = this.sesion.plan();
    const n = Number(this.prueba());
    if (!plan || paso?.tipo !== 'cabe' || this.prueba() === '' || !Number.isInteger(n) || n < 0) return null;
    return { n, producto: n * plan.divisor, parcial: plan.ciclos[paso.ciclo].dividendoParcial };
  });

  constructor() {
    // Al cambiar de paso: limpiar y poner el cursor en la respuesta.
    effect(() => {
      this.sesion.indice();
      this.valor.set('');
      this.prueba.set('');
      afterNextRender(() => this.entrada()?.nativeElement.focus(), { injector: this.injector });
    });
  }

  protected enviar(): void {
    if (this.valor() === '') return;
    const veredicto = this.sesion.responder(Number(this.valor()));
    if (veredicto && veredicto !== 'correcto') this.entrada()?.nativeElement.select();
  }
}
