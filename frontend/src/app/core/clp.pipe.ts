import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'clp',
  standalone: true,
})
export class ClpPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    const num = Math.round(value ?? 0);
    return '$' + num.toLocaleString('es-CL');
  }
}
