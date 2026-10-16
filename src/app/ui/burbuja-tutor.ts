import { Component, inject, signal } from '@angular/core';
import { Animo, SesionDivision } from '../division/sesion-division';
import { TutorService } from '../tutor/tutor.service';

const CARAS: Record<Animo, string> = {
  celebra: '🥳',
  anima: '💪',
  piensa: '🤔',
  explica: '🦉',
};

@Component({
  selector: 'app-burbuja-tutor',
  template: `
    <section class="tarjeta tutor" aria-live="polite">
      <div class="cabecera">
        <span class="buho" aria-hidden="true">{{ cara() }}</span>
        <strong>Profe Búho</strong>
        @if (tutor.pensando()) {
          <span class="escribiendo">pensando<span>.</span><span>.</span><span>.</span></span>
        }
      </div>

      @if (sesion.burbuja(); as b) {
        <p class="mensaje">{{ b.mensaje }}</p>
        @if (b.porque) {
          <p class="porque"><b>{{ b.titulo ?? '¿Por qué?' }}</b> {{ b.porque }}</p>
        }
        @if (b.pista) {
          <p class="guia">💡 {{ b.pista }}</p>
        }
        @if (b.animacion; as a) {
          <button class="btn animacion" type="button" (click)="sesion.verAnimacion(a)">🎬 Ver animación: {{ a.titulo }}</button>
        }
        @if (b.jev) {
          <p class="jev">🧠 {{ b.jev }}</p>
        }
      }

      @if (sesion.reto(); as reto) {
        <form class="reto" (submit)="$event.preventDefault(); responderReto()">
          <p><b>Ahora tú:</b> {{ reto.pregunta }}</p>
          <textarea
            rows="2"
            maxlength="300"
            placeholder="Explícalo con tus palabras…"
            aria-label="Tu explicación"
            [value]="explicacion()"
            (input)="explicacion.set($any($event.target).value)"
          ></textarea>
          <div class="acciones">
            <button class="btn primario" type="submit" [disabled]="!explicacion().trim()">Explicar</button>
            <button class="btn" type="button" (click)="sesion.saltarReto(); explicacion.set('')">No sé, explícamelo</button>
          </div>
        </form>
      }

      @if (!tutor.conectado()) {
        <p class="aviso">
          Jev (la IA de TypeSafe) no está conectado: revisa la API key en
          <code>src/environments/environment.server.ts</code>. ¡Puedes seguir practicando igual!
        </p>
      }

      <form class="preguntar" (submit)="$event.preventDefault(); preguntar()">
        <input
          type="text"
          maxlength="200"
          placeholder="Pregúntale lo que quieras al profe…"
          aria-label="Pregunta para el profe"
          [value]="texto()"
          (input)="texto.set($any($event.target).value)"
        />
        <button class="btn" type="submit" [disabled]="!texto().trim() || tutor.pensando()">Preguntar</button>
      </form>
    </section>
  `,
})
export class BurbujaTutor {
  protected readonly tutor = inject(TutorService);
  protected readonly sesion = inject(SesionDivision);
  protected readonly texto = signal('');
  protected readonly explicacion = signal('');

  protected cara(): string {
    return CARAS[this.sesion.burbuja()?.animo ?? 'explica'];
  }

  protected preguntar(): void {
    void this.sesion.preguntaLibre(this.texto());
    this.texto.set('');
  }

  protected responderReto(): void {
    void this.sesion.responderReto(this.explicacion());
    this.explicacion.set('');
  }
}
