import { Component, computed, input, output, signal } from '@angular/core';
import { Tablero } from '../division/division-tablero';

/** La "casita" de la división. */
@Component({
  selector: 'app-tablero',
  template: `
    @let t = tablero();
    <div class="casita" [style.--columnas]="t.dividendo.length">
      <div class="trabajo">
        <div class="fila">
          <span class="signo"></span>
          @for (c of t.dividendo; track $index) {
            @if (elegible()) {
              <button
                type="button"
                class="cifra elegible"
                [class.marcada]="$index < marcadas()"
                [attr.aria-label]="'Tomar ' + ($index + 1) + ' cifras'"
                (mouseenter)="hover.set($index + 1)"
                (mouseleave)="hover.set(0)"
                (focus)="hover.set($index + 1)"
                (blur)="hover.set(0)"
                (click)="elegir.emit($index + 1)"
              >
                {{ c.texto }}
              </button>
            } @else {
              <span class="cifra" [class]="c.estado">
                {{ c.texto }}
                @if (t.columnaBajando === $index) {
                  <span class="flecha" aria-hidden="true">⬇</span>
                }
              </span>
            }
          }
        </div>

        @for (f of t.filas; track $index) {
          <div class="fila" [class.subrayado]="f.subrayado">
            <span class="signo">{{ f.signo }}</span>
            @for (c of f.celdas; track $index) {
              <span class="cifra" [class]="c?.estado ?? 'hueco'">{{ c?.texto }}</span>
            }
          </div>
        }
      </div>

      <div class="caja-divisor">
        <span class="divisor cifra" [class]="t.divisor.estado">{{ t.divisor.texto }}</span>
        <div class="cociente">
          @for (c of t.cociente; track $index) {
            <span class="cifra" [class]="c.estado">{{ c.texto }}</span>
          } @empty {
            <span class="cifra hueco">?</span>
          }
        </div>
      </div>
    </div>
    @if (elegible()) {
      <p class="pista-elegir">
        @if (marcadas()) {
          Tomarías el <b>{{ numeroMarcado() }}</b>
        } @else {
          Pasa el dedo o el ratón por las cifras 👆
        }
      </p>
    }
  `,
})
export class TableroComponent {
  readonly tablero = input.required<Tablero>();
  readonly elegible = input(false);
  readonly elegir = output<number>();

  protected readonly hover = signal(0);
  protected readonly marcadas = computed(() => (this.elegible() ? this.hover() : 0));
  protected readonly numeroMarcado = computed(() =>
    this.tablero()
      .dividendo.slice(0, this.marcadas())
      .map((c) => c.texto)
      .join(''),
  );
}
