import { Pipe, PipeTransform } from '@angular/core';
import * as _ from 'lodash';

@Pipe({
  name: 'numberToArray'
})
export class NumberToArrayPipe implements PipeTransform {
  transform(value: any, args: any[]): any {
    let res = [];
    for (let i = 0; i < value; i++) {
        res.push(i);
    }

    return res;
  }
}
