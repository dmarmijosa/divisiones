import { Component, computed, inject } from '@angular/core';
import { SesionDivision } from './division/sesion-division';
import { BurbujaTutor } from './ui/burbuja-tutor';
import { Inicio } from './ui/inicio';
import { PanelPaso } from './ui/panel-paso';
import { TableroComponent } from './ui/tablero';
import { VisorAnimacion } from './ui/visor-animacion';

@Component({
  selector: 'app-root',
  imports: [Inicio, TableroComponent, PanelPaso, BurbujaTutor, VisorAnimacion],
  template: `
    <header class="barra">
      <span class="logo">🦉 Divisiones con el Profe Búho</span>
      @if (sesion.plan()) {
        <span class="estrellas" title="Pasos acertados a la primera">⭐ {{ sesion.aciertos() }}</span>
        <button class="btn pequeno" type="button" (click)="sesion.salir()">Otra división</button>
      }
    </header>

    @if (sesion.plan(); as plan) {
      <div class="progreso" role="progressbar" [attr.aria-valuenow]="porcentaje()" aria-valuemin="0" aria-valuemax="100">
        <div class="relleno" [style.width.%]="porcentaje()"></div>
      </div>

      <main class="juego">
        <section class="tarjeta pizarra">
          <h2>{{ plan.dividendo }} ÷ {{ plan.divisor }}</h2>
          @if (sesion.tablero(); as t) {
            <app-tablero
              [tablero]="t"
              [elegible]="sesion.pasoActual()?.tipo === 'elegir-cifras'"
              (elegir)="sesion.responder($event)"
            />
          }
        </section>

        <div class="lateral">
          @if (sesion.terminado()) {
            <section class="tarjeta final">
              <div class="buho grande" aria-hidden="true">🏆</div>
              <h2>¡Lo lograste, alumno!</h2>
              <p class="grande">
                {{ plan.dividendo }} ÷ {{ plan.divisor }} = <b>{{ plan.cociente }}</b>
                y residuo <b>{{ plan.residuo }}</b>
              </p>
              <div class="comprobacion">
                <p><b>Comprobemos:</b> divisor × cociente + residuo = dividendo</p>
                <p class="cuenta">
                  {{ plan.divisor }} × {{ plan.cociente }} + {{ plan.residuo }} =
                  {{ plan.divisor * plan.cociente }} + {{ plan.residuo }} = <b>{{ plan.dividendo }}</b> ✅
                </p>
                <p class="ayuda">
                  Si repartimos {{ plan.dividendo }} entre {{ plan.divisor }}, a cada uno le tocan
                  {{ plan.cociente }} y sobran {{ plan.residuo }}{{ plan.residuo === 0 ? ': ¡división exacta!' : '.' }}
                </p>
              </div>
              <button class="btn primario" type="button" (click)="sesion.salir()">Hacer otra división</button>
            </section>
          } @else {
            <app-panel-paso />
          }
          <app-burbuja-tutor />
        </div>
      </main>
    } @else {
      <main class="centro"><app-inicio /></main>
    }
    <app-visor-animacion />
  `,
})
export class App {
  protected readonly sesion = inject(SesionDivision);
  protected readonly porcentaje = computed(() => Math.round(this.sesion.progreso() * 100));
}
