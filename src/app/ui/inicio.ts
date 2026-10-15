import { Component, inject, signal } from '@angular/core';
import { Nivel, inventarEjercicio, validarEjercicio } from '../division/division-engine';
import { mensajesError } from '../division/division-textos';
import { SesionDivision } from '../division/sesion-division';

@Component({
  selector: 'app-inicio',
  template: `
    <section class="tarjeta inicio">
      <div class="buho grande" aria-hidden="true">🦉</div>
      <h1>¡Hola! Soy el Profe Búho</h1>
      <p class="sub">Vamos a aprender a dividir paso a paso, con cociente y residuo.</p>

      <label class="campo">
        <span>¿Cómo te llamas?</span>
        <input
          type="text"
          maxlength="20"
          placeholder="Tu nombre"
          [value]="sesion.nombre()"
          (input)="sesion.nombre.set($any($event.target).value)"
        />
      </label>

      <h2>¿Qué división quieres hacer?</h2>
      <form class="division-form" (submit)="$event.preventDefault(); empezar()">
        <input
          class="numero"
          type="number"
          inputmode="numeric"
          min="1"
          step="1"
          placeholder="175"
          aria-label="Dividendo"
          [value]="dividendo()"
          (input)="dividendo.set($any($event.target).value)"
        />
        <span class="op">÷</span>
        <input
          class="numero corto"
          type="number"
          inputmode="numeric"
          min="1"
          step="1"
          placeholder="4"
          aria-label="Divisor"
          [value]="divisor()"
          (input)="divisor.set($any($event.target).value)"
        />
        <button class="btn primario" type="submit">¡Empezar!</button>
      </form>
      <p class="ayuda">El <b>dividendo</b> es lo que repartimos; el <b>divisor</b>, entre cuántos lo repartimos.</p>

      @if (error()) {
        <p class="aviso" role="alert">{{ error() }}</p>
      }

      <div class="inventar">
        <span>¿No se te ocurre ninguna? Inventa una:</span>
        <div class="niveles">
          @for (n of niveles; track n.valor) {
            <button class="btn" type="button" (click)="inventar(n.valor)">{{ n.etiqueta }}</button>
          }
        </div>
      </div>
    </section>
  `,
})
export class Inicio {
  protected readonly sesion = inject(SesionDivision);
  protected readonly dividendo = signal('');
  protected readonly divisor = signal('');
  protected readonly error = signal('');
  protected readonly niveles: { valor: Nivel; etiqueta: string }[] = [
    { valor: 'facil', etiqueta: '🐣 Fácil' },
    { valor: 'medio', etiqueta: '🐥 Medio' },
    { valor: 'dificil', etiqueta: '🦅 Difícil' },
  ];

  protected empezar(): void {
    const dividendo = Number(this.dividendo());
    const divisor = Number(this.divisor());
    if (this.dividendo() === '' || this.divisor() === '') {
      this.error.set('Escribe los dos números para empezar.');
      return;
    }
    const error = validarEjercicio(dividendo, divisor);
    if (error) {
      this.error.set(mensajesError[error]);
      return;
    }
    this.error.set('');
    this.sesion.empezar(dividendo, divisor);
  }

  protected inventar(nivel: Nivel): void {
    const { dividendo, divisor } = inventarEjercicio(nivel);
    this.dividendo.set(String(dividendo));
    this.divisor.set(String(divisor));
    this.error.set('');
  }
}
