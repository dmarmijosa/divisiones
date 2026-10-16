import { ErrorEjercicio, Paso, PlanDivision, Veredicto } from './division-engine';

/** Pregunta que ve el niño en cada paso. */
export function enunciado(plan: PlanDivision, paso: Paso): string {
  const d = plan.divisor;
  switch (paso.tipo) {
    case 'elegir-cifras':
      return `Toca las cifras del ${plan.dividendo} de izquierda a derecha: ¿cuántas necesitas para que el ${d} quepa al menos una vez?`;
    case 'cabe': {
      const c = plan.ciclos[paso.ciclo];
      return `¿Cuántas veces cabe el ${d} en el ${c.dividendoParcial}?`;
    }
    case 'multiplicar': {
      const c = plan.ciclos[paso.ciclo];
      return `Multiplica: ${c.cifraCociente} × ${d} = ?`;
    }
    case 'restar': {
      const c = plan.ciclos[paso.ciclo];
      return `Resta: ${c.dividendoParcial} − ${c.producto} = ?`;
    }
    case 'bajar': {
      const c = plan.ciclos[paso.ciclo];
      return `Baja la siguiente cifra (${c.cifraBajada}) al lado del ${c.resto}. ¿Qué número se forma?`;
    }
    case 'residuo':
      return `¡Ya no quedan cifras por bajar! El cociente es ${plan.cociente}. ¿Cuál es el residuo?`;
  }
}

/** Respuesta inmediata (sin IA) para que la app funcione aunque el tutor tarde o falle. */
export function retroalimentacion(plan: PlanDivision, paso: Paso, veredicto: Veredicto): string {
  if (veredicto === 'correcto') {
    switch (paso.tipo) {
      case 'elegir-cifras':
        return `¡Bien! Empezamos con el ${plan.ciclos[0].dividendoParcial}.`;
      case 'cabe':
        return `¡Exacto! Escribimos ${paso.respuesta} en el cociente.`;
      case 'multiplicar':
        return '¡Multiplicación correcta!';
      case 'restar':
        return `¡Muy bien! Y el ${paso.respuesta} es menor que el ${plan.divisor}, así que vamos bien.`;
      case 'bajar':
        return '¡Eso es! Ya tenemos el número para la siguiente vuelta.';
      case 'residuo':
        return `¡Terminaste! ${plan.dividendo} ÷ ${plan.divisor} = ${plan.cociente} y sobran ${plan.residuo}.`;
    }
  }
  switch (veredicto) {
    case 'pocas-cifras':
      return `Con esas cifras el número es menor que ${plan.divisor}: ¡todavía no cabe! Toma una cifra más.`;
    case 'demasiadas-cifras':
      return 'Funciona, pero podemos empezar con menos cifras. Busca el número más pequeño donde ya quepa.';
  }
  // Sin decir si se pasó o le faltó: así no se puede adivinar probando números.
  switch (paso.tipo) {
    case 'cabe':
      return 'No es ese. ¡Vamos a comprobar tu número haciendo tú la cuenta! 🧪';
    case 'multiplicar':
    case 'restar':
      return 'No es ese. Revisa la cuenta con calma o pulsa 🧩 para hacerla por partes.';
    default:
      return 'Mmm, no es ese. Mira bien la casita y vuelve a intentarlo.';
  }
}

export const mensajesError: Record<ErrorEjercicio, string> = {
  'no-es-entero': 'Usa solo números enteros (sin comas ni decimales) y mayores que cero.',
  'divisor-cero': '¡No se puede dividir entre 0! Si repartes algo entre 0 personas… ¿a quién se lo das?',
  'dividendo-menor':
    'El dividendo es más pequeño que el divisor: el cociente sería 0 y todo sobraría. Prueba con un dividendo más grande.',
  'muy-grande': 'Ese número es muy grande para practicar. Usa un dividendo de hasta 9 cifras y un divisor de hasta 4.',
};
