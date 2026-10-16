import { Component, ElementRef, Injector, afterNextRender, computed, effect, inject, signal, viewChild } from '@angular/core';
import { TipoPaso } from '../division/division-engine';
import { SesionDivision } from '../division/sesion-division';
import { GuiaComponent } from './guia';

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
  imports: [GuiaComponent],
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
              [disabled]="sesion.bloqueado()"
              (input)="valor.set($any($event.target).value)"
            />
            <button class="btn primario" type="submit" [disabled]="valor() === '' || sesion.bloqueado()">Comprobar</button>
          </form>
        }

        @if (sesion.resultado(); as r) {
          <p class="resultado" [class.bien]="r.veredicto === 'correcto'" [class.mal]="r.veredicto !== 'correcto'">
            {{ r.veredicto === 'correcto' ? '✅' : '🔁' }} {{ r.texto }}
          </p>
        }

        @if (paso.tipo === 'cabe' && !sesion.guia()) {
          <form class="probador" (submit)="$event.preventDefault(); probar()">
            <span>🧪 Probador: ¿y si pruebo con</span>
            <input
              class="numero mini"
              type="number"
              min="0"
              max="9"
              aria-label="Número a probar"
              [value]="prueba()"
              (input)="prueba.set($any($event.target).value)"
            />
            <button class="btn pequeno" type="submit" [disabled]="!pruebaValida()">Comprobarlo yo</button>
          </form>
        }

        <app-guia />

        <div class="acciones">
          <button class="btn" type="button" (click)="sesion.pedirPista()">💡 Dame una pista</button>
          <button class="btn" type="button" (click)="sesion.preguntarPorque()">🤔 ¿Por qué hacemos esto?</button>
          @if ((paso.tipo === 'multiplicar' || paso.tipo === 'restar') && !sesion.guia()) {
            <button class="btn" type="button" (click)="sesion.hacerPorPartes()">🧩 Hazlo por partes</button>
          }
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

  protected readonly pruebaValida = computed(() => {
    const n = Number(this.prueba());
    return this.prueba() !== '' && Number.isInteger(n) && n >= 0 && n <= 9;
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

  protected probar(): void {
    if (!this.pruebaValida()) return;
    this.sesion.tantear(Number(this.prueba()));
    this.prueba.set('');
  }

  protected enviar(): void {
    if (this.valor() === '') return;
    const veredicto = this.sesion.responder(Number(this.valor()));
    if (veredicto && veredicto !== 'correcto') this.entrada()?.nativeElement.select();
  }
}
