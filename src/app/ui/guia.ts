import { Component, ElementRef, Injector, afterNextRender, computed, effect, inject, signal, viewChild } from '@angular/core';
import { SesionDivision } from '../division/sesion-division';

/** La guía "hazlo tú": una pregunta pequeña cada vez, y el alumno hace la cuenta. */
@Component({
  selector: 'app-guia',
  template: `
    @if (sesion.guia(); as g) {
      <section class="guia" [class.obligatoria]="g.obligatoria && !g.terminada" aria-live="polite">
        <div class="guia-cabecera">
          <strong>{{ g.guia.titulo }}</strong>
          <span class="puntos" aria-hidden="true">
            @for (p of g.guia.preguntas; track $index) {
              <span class="punto" [class.hecho]="$index < g.indice || g.terminada" [class.actual]="$index === g.indice && !g.terminada"></span>
            }
          </span>
        </div>

        @if (g.guia.cuenta) {
          <div class="cuenta-vertical" aria-hidden="true">
            @for (fila of g.guia.cuenta; track $index) {
              <span>{{ fila }}</span>
            }
          </div>
        }

        @if (g.hechas.length) {
          <ul class="hechas">
            @for (h of g.hechas; track $index) {
              <li>✔ {{ h }}</li>
            }
          </ul>
        }

        @if (g.mensaje; as m) {
          <p class="guia-mensaje" [class.bien]="m.bien" [class.mal]="!m.bien">{{ m.texto }}</p>
        }

        @if (!g.terminada && pregunta(); as p) {
          <p class="guia-pregunta">{{ p.texto }}</p>
          @if (p.tipo === 'numero') {
            <form class="respuesta" (submit)="$event.preventDefault(); enviarNumero()">
              <input
                #entrada
                class="numero"
                type="number"
                inputmode="numeric"
                step="1"
                aria-label="Tu respuesta a la guía"
                [value]="valor()"
                (input)="valor.set($any($event.target).value)"
              />
              <button class="btn primario" type="submit" [disabled]="valor() === ''">Comprobar</button>
            </form>
          } @else {
            <div class="acciones">
              <button class="btn primario" type="button" (click)="sesion.responderGuia(true)">Sí</button>
              <button class="btn primario" type="button" (click)="sesion.responderGuia(false)">No</button>
            </div>
          }
        } @else if (g.terminada) {
          <button class="btn" type="button" (click)="sesion.cerrarGuia()">Seguir ➜</button>
        }

        @if (g.obligatoria && !g.terminada) {
          <p class="ayuda">Termina de comprobar tu número para volver a responder arriba.</p>
        } @else if (!g.terminada) {
          <button class="btn pequeno" type="button" (click)="sesion.cerrarGuia()">Cerrar</button>
        }
      </section>
    }
  `,
})
export class GuiaComponent {
  protected readonly sesion = inject(SesionDivision);
  protected readonly valor = signal('');
  private readonly entrada = viewChild<ElementRef<HTMLInputElement>>('entrada');
  private readonly injector = inject(Injector);

  protected readonly pregunta = computed(() => {
    const g = this.sesion.guia();
    return g ? g.guia.preguntas[g.indice] : null;
  });

  constructor() {
    // Nueva pregunta: limpiar y enfocar.
    effect(() => {
      this.pregunta();
      this.valor.set('');
      afterNextRender(() => this.entrada()?.nativeElement.focus(), { injector: this.injector });
    });
  }

  protected enviarNumero(): void {
    if (this.valor() === '') return;
    this.sesion.responderGuia(Number(this.valor()));
    this.entrada()?.nativeElement.select();
  }
}
