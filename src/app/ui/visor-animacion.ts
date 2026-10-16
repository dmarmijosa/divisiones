import { CUSTOM_ELEMENTS_SCHEMA, Component, inject } from '@angular/core';
import '@hyperframes/player';
import { SesionDivision } from '../division/sesion-division';

/** Ventana con el reproductor de HyperFrames (<hyperframes-player>). */
@Component({
  selector: 'app-visor-animacion',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  host: { '(document:keydown.escape)': 'cerrar()' },
  template: `
    @if (sesion.animacion(); as a) {
      <div class="visor-fondo" (click)="cerrar()">
        <section class="visor" role="dialog" aria-modal="true" [attr.aria-label]="a.titulo" (click)="$event.stopPropagation()">
          <header>
            <strong>🎬 {{ a.titulo }}</strong>
            <button class="btn pequeno" type="button" (click)="cerrar()" aria-label="Cerrar animación">✕</button>
          </header>
          <hyperframes-player [attr.src]="a.src" controls autoplay></hyperframes-player>
        </section>
      </div>
    }
  `,
})
export class VisorAnimacion {
  protected readonly sesion = inject(SesionDivision);

  protected cerrar(): void {
    this.sesion.verAnimacion(null);
  }
}
