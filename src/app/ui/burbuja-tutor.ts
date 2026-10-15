import { Component, inject, signal } from '@angular/core';
import { SesionDivision } from '../division/sesion-division';
import { RespuestaTutor, TutorService } from '../tutor/tutor.service';

const CARAS: Record<RespuestaTutor['animo'], string> = {
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

      @if (tutor.respuesta(); as r) {
        @if (r.mensaje) {
          <p class="mensaje">{{ r.mensaje }}</p>
        }
        @if (r.porque) {
          <p class="porque"><b>¿Por qué?</b> {{ r.porque }}</p>
        }
        @if (r.preguntaGuia) {
          <p class="guia">❓ {{ r.preguntaGuia }}</p>
        }
      } @else if (tutor.error()) {
        <p class="aviso">
          No pude conectarme con el Profe Búho. Revisa la API key en
          <code>src/environments/environment.server.mts</code>. ¡Puedes seguir practicando igual!
        </p>
      } @else if (!tutor.pensando()) {
        <p class="mensaje">¡Aquí te iré explicando cada paso!</p>
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
  private readonly sesion = inject(SesionDivision);
  protected readonly texto = signal('');

  protected cara(): string {
    const animo = this.tutor.respuesta()?.animo;
    return animo ? CARAS[animo] : '🦉';
  }

  protected preguntar(): void {
    this.sesion.preguntaLibre(this.texto());
    this.texto.set('');
  }
}
