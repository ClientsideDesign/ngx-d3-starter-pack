import { Injectable } from '@angular/core';
import { Observable, fromEvent } from 'rxjs';
import { map, debounceTime, startWith } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class WindowResizeService {
  windowSize$: Observable<WindowDimensions>;
  windowInit$: Observable<Event>;

  constructor() {
    this.windowSize$ = fromEvent(window, 'resize').pipe(debounceTime(100),
      map(event => {
        return { width: (event.target as Window).innerWidth, height: (event.target as Window).innerHeight };
      }),
      startWith({ width: (window as Window).innerWidth, height: (window as Window).innerHeight }),
    );
  }

}

export interface WindowDimensions { width: number; height: number; }
