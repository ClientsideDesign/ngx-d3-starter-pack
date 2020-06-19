import { Component, ViewChild, AfterViewInit, OnDestroy, Input } from '@angular/core';
import { WindowResizeService } from '../../services/window-resize.service';
import { select } from 'd3-selection';
import { max } from 'd3-array';
import { schemeTableau10 } from 'd3-scale-chromatic';
import { VennDiagram, sortAreas } from 'venn.js';
// @types/venn must be renamed @types/venn.js
import { Subscription } from 'rxjs';
import { VennDiagramSet } from '../chart-interfaces';

@Component({
  selector: 'app-venn',
  templateUrl: './venn.component.html',
  styleUrls: ['./venn.component.css']
})
export class VennComponent implements AfterViewInit, OnDestroy {
  @ViewChild('chart') chart;
  windowResizeSub: Subscription;
  parentWidth = 0;
  windowWidth = 0;
  @Input() data: VennDiagramSet[];
  @Input() widthHeightRatio: number;

  constructor(private windowResizeService: WindowResizeService) { }

  ngAfterViewInit() {
    this.windowResizeSub = this.windowResizeService.windowSize$.subscribe(resize => {
      if (this.chart && this.chart.nativeElement && this.chart.nativeElement.offsetWidth > 0) {
        if (resize.width !== this.windowWidth) {
          this.windowWidth = resize.width;
          select(this.chart.nativeElement).select('*').remove();
          const checkEmptyInterval = setInterval(() => {
            // Makes sure chart element has been removed before redrawing
            if (this.chart.nativeElement.children.length === 0) {
              this.drawChart(this.chart.nativeElement.offsetWidth, this.chart.nativeElement.offsetWidth * this.widthHeightRatio,
                this.chart.nativeElement as HTMLElement, this.data);
              clearInterval(checkEmptyInterval);
            }
          }, 20);
        }
      }
    });
  }

  ngOnDestroy() {
    if (this.windowResizeSub) {
      this.windowResizeSub.unsubscribe();
    }
  }

  drawChart(width: number, height: number, chartWrapper: HTMLElement, setData: VennDiagramSet[]) {
    const color = schemeTableau10;

    const svg = select(chartWrapper)
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    svg.append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', 'none')
      .attr('pointer-events', 'all')
      .on('mouseover', () => {
        this.removeTooltips(chartWrapper, setData);
      });

    const chart = VennDiagram().width(width).height(height);
    svg.datum(setData).call(chart);

    select(chartWrapper)
      .selectAll('.venn-circle path')
      .style('fill-opacity', 0.8)
      .style('fill', (d, i) => color[i + 1])
      .style('mix-blend-mode', 'multiply');

    select(chartWrapper).selectAll('g.venn-intersection')
      .on('mouseover', (d, i, paths) => {
        if (!select('#tooltip_' + i).node()) {
          const label = select(paths[i]).select('.label');
          this.addTooltip(chartWrapper, svg, setData, d, i, select(paths[i]), label.attr('x'), label.attr('y'));
        }
      });

    select(chartWrapper).selectAll('g.venn-circle')
      .on('mouseover', () => {
        this.removeTooltips(chartWrapper, setData);
      });

    select(chartWrapper)
      .selectAll('.venn-area')
      .each((d: VennDiagramSet, i, areas) => {
        const valueLabel = select(areas[i]).select('text');
        valueLabel.text('test')
          .attr('font-size', d.label ? '10px' : '12px')
          .attr('font-weight', d.label ? 'bold' : 'normal')
          .text(d.label ? d.label : d.size)
          .style('fill', d.label ? '#000000' : '#ffffff');
        if (d.label) {
          const valueLabelBBox = (valueLabel.node() as SVGGraphicsElement).getBBox();
          select(areas[i]).append('text')
            .text(d.size)
            .attr('x', valueLabel.attr('x'))
            .attr('dy', valueLabel.attr('dy'))
            .attr('y', parseInt(valueLabel.attr('y'), 10) + valueLabelBBox.height)
            .attr('text-anchor', 'middle')
            .attr('font-size', '12px')
            .attr('font-weight', 'normal');
        }
      });
  }

  addTooltip(chartWrapper, svg, setData, d, i, area, x, y) {

    // Make sure any old tooltips / styling has been removed first
    this.removeTooltips(chartWrapper, setData);

    sortAreas(select(chartWrapper), d);

    area.select('path').style('stroke-opacity', 1)
      .style('stroke-width', 2)
      .style('stroke', '#ffffff')
      .style('mix-blend-mode', 'normal');

    const tooltipBackground = svg.append('rect').attr('class', 'tooltip_background').attr('id', 'tooltip_' + i);
    const tooltipLabel = svg.append('text').attr('class', 'tooltip_label');
    const tooltipValue = svg.append('text').attr('class', 'tooltip_value');
    const tooltipPadding = 12;

    const parentSets = setData.filter(setDatum => setDatum.sets.length === 1 && d.sets.indexOf(setDatum.sets[0]) !== -1)
      .sort((a, b) => {
        return b.size - a.size;
      });

    const leadSet = parentSets.shift();
    const otherSets = parentSets.map(parentSet => parentSet.label);

    tooltipLabel
      .style('text-anchor', 'middle')
      .style('fill', '#ffffff')
      .attr('font-family', '"Open Sans", sans-serif')
      .attr('font-size', '10px')
      .text(() => Math.round(d.size / leadSet.size * 100) + '% of ' + leadSet.label + ' are also ')
      .attr('transform', 'translate(' + x + ',' + y + ')');

    const labelBBox = tooltipLabel.node().getBBox();

    tooltipValue
      .style('text-anchor', 'middle')
      .style('fill', '#ffffff')
      .attr('font-family', '"Open Sans", sans-serif')
      .attr('font-size', '10px')
      .text(otherSets.join(' and '))
      .attr('transform', 'translate(' + x + ',' + y + ')')
      .attr('y', labelBBox.height);

    const valueBBox = tooltipValue.node().getBBox();

    const tooltipDimensions = {
      width: max([labelBBox.width, valueBBox.width]) + tooltipPadding,
      height: labelBBox.height + valueBBox.height + tooltipPadding * 0.6
    };

    tooltipBackground
      .attr('width', tooltipDimensions.width)
      .attr('height', tooltipDimensions.height)
      .attr('transform', 'translate(' + x + ',' + y + ')')
      .attr('fill', 'rgb(78, 121, 167)')
      .attr('opacity', 0.9)
      .attr('stroke', '#ffffff')
      .style('stroke-width', '1px')
      .attr('x', tooltipDimensions.width * -0.5)
      .attr('y', (tooltipDimensions.height * -0.5) + (tooltipPadding * 0.3));
  }

  removeTooltips(chartWrapper, setData) {
    sortAreas(select(chartWrapper), setData[setData.length - 1]); // Reset order
    select(chartWrapper)
      .selectAll('g.venn-area')
      .select('path')
      .style('stroke', null)
      .style('stroke-width', null)
      .style('stroke-opacity', null)
      .style('mix-blend-mode', (d: VennDiagramSet) => {
        return d.label ? 'multiply' : 'normal';
      });
    select(chartWrapper).selectAll('.tooltip_value').remove();
    select(chartWrapper).selectAll('.tooltip_label').remove();
    select(chartWrapper).selectAll('.tooltip_background').remove();
  }

}
