import { Pipe, PipeTransform } from '@angular/core';

const fmt = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const fmtCents = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 });

@Pipe({ name: 'price', standalone: true })
export class PricePipe implements PipeTransform {
  transform(value: number | null | undefined, cents = false): string {
    if (value == null) return '';
    return (cents ? fmtCents : fmt).format(value);
  }
}
