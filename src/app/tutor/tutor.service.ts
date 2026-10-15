import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  ClasificacionPregunta,
  Diagnostico,
  EvaluacionExplicacion,
  PeticionDiagnostico,
  PeticionExplicacion,
  PeticionPregunta,
  RUTAS,
} from './contrato';

/** Habla con el servidor del tutor. Si Jev no responde, devuelve null y la app sigue sola. */
@Injectable({ providedIn: 'root' })
export class TutorService {
  private readonly http = inject(HttpClient);
  private readonly enCurso = signal(0);

  readonly pensando = computed(() => this.enCurso() > 0);
  /** false cuando el servidor dice que falta la API key o no está levantado. */
  readonly conectado = signal(true);

  diagnosticar(peticion: PeticionDiagnostico): Promise<Diagnostico | null> {
    return this.post<Diagnostico>(RUTAS.diagnostico, peticion);
  }

  clasificarPregunta(peticion: PeticionPregunta): Promise<ClasificacionPregunta | null> {
    return this.post<ClasificacionPregunta>(RUTAS.pregunta, peticion);
  }

  evaluarExplicacion(peticion: PeticionExplicacion): Promise<EvaluacionExplicacion | null> {
    return this.post<EvaluacionExplicacion>(RUTAS.explicacion, peticion);
  }

  private async post<R>(url: string, body: unknown): Promise<R | null> {
    this.enCurso.update((n) => n + 1);
    try {
      const respuesta = await firstValueFrom(this.http.post<R>(url, body));
      this.conectado.set(true);
      return respuesta;
    } catch (error) {
      if (error instanceof HttpErrorResponse && [0, 401, 403, 503, 504].includes(error.status)) {
        this.conectado.set(false);
      }
      return null;
    } finally {
      this.enCurso.update((n) => n - 1);
    }
  }
}
