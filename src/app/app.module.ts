import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { PieComponent } from './charts/pie/pie.component';
import { BarComponent } from './charts/bar/bar.component';
import { LineComponent } from './charts/line/line.component';
import { MapComponent } from './charts/map/map.component';
import { VennComponent } from './charts/venn/venn.component';

@NgModule({
  declarations: [
    AppComponent,
    PieComponent,
    BarComponent,
    LineComponent,
    MapComponent,
    VennComponent
  ],
  imports: [
    BrowserModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
