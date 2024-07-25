// CustomChartLibrary.js

class CustomChart {
  constructor(containerId, data, options = {}) {
    this.container = document.getElementById(containerId);
    this.data = data;
    this.options = Object.assign({
      width: this.container.clientWidth,
      height: 400,
      margins: { top: 40, right: 40, bottom: 40, left: 60 },
      colors: ['#ff6384', '#36a2eb', '#ffce56', '#4bc0c0', '#9966ff', '#ff9f40'],
      lineWidth: 2,
      dotRadius: 4,
      gridColor: '#e0e0e0',
      tooltipBgColor: 'rgba(0,0,0,0.7)',
      tooltipTextColor: '#ffffff'
    }, options);

    this.svg = null;
    this.xScale = null;
    this.yScale = null;
    this.activeDataSeries = Object.keys(this.data);

    this.init();
  }

  init() {
    this.createSVG();
    this.createScales();
    this.createAxes();
    this.createGrid();
    this.createLines();
    this.createDots();
    this.createLegend();
    this.createTooltip();
  }

  createSVG() {
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('width', this.options.width);
    this.svg.setAttribute('height', this.options.height);
    this.container.appendChild(this.svg);
  }

  createScales() {
    const xExtent = [
      Math.min(...Object.values(this.data).flatMap(series => series.map(d => d.x))),
      Math.max(...Object.values(this.data).flatMap(series => series.map(d => d.x)))
    ];
    const yExtent = [
      Math.min(...Object.values(this.data).flatMap(series => series.map(d => d.y))),
      Math.max(...Object.values(this.data).flatMap(series => series.map(d => d.y)))
    ];

    this.xScale = (x) => {
      return (x - xExtent[0]) / (xExtent[1] - xExtent[0]) * (this.options.width - this.options.margins.left - this.options.margins.right) + this.options.margins.left;
    };

    this.yScale = (y) => {
      return this.options.height - this.options.margins.bottom - (y - yExtent[0]) / (yExtent[1] - yExtent[0]) * (this.options.height - this.options.margins.top - this.options.margins.bottom);
    };

    this.xExtent = xExtent;
    this.yExtent = yExtent;
  }

  createAxes() {
    // X-axis
    const xAxis = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    xAxis.setAttribute('transform', `translate(0,${this.options.height - this.options.margins.bottom})`);
    
    const xLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    xLine.setAttribute('x1', this.options.margins.left);
    xLine.setAttribute('x2', this.options.width - this.options.margins.right);
    xLine.setAttribute('stroke', 'black');
    xAxis.appendChild(xLine);

    // X-axis labels
    const xLabels = 7; // Number of labels on x-axis
    for (let i = 0; i <= xLabels; i++) {
      const x = this.xScale(this.xExtent[0] + (this.xExtent[1] - this.xExtent[0]) * (i / xLabels));
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('x', x);
      label.setAttribute('y', this.options.height - this.options.margins.bottom + 20);
      label.setAttribute('text-anchor', 'middle');
      label.textContent = new Date(this.xExtent[0] + (this.xExtent[1] - this.xExtent[0]) * (i / xLabels)).toLocaleDateString();
      xAxis.appendChild(label);
    }

    this.svg.appendChild(xAxis);

    // Y-axis
    const yAxis = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    yAxis.setAttribute('transform', `translate(${this.options.margins.left},0)`);
    
    const yLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    yLine.setAttribute('y1', this.options.margins.top);
    yLine.setAttribute('y2', this.options.height - this.options.margins.bottom);
    yLine.setAttribute('stroke', 'black');
    yAxis.appendChild(yLine);

    // Y-axis labels
    const yLabels = 5; // Number of labels on y-axis
    for (let i = 0; i <= yLabels; i++) {
      const y = this.yScale(this.yExtent[0] + (this.yExtent[1] - this.yExtent[0]) * (i / yLabels));
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('x', this.options.margins.left - 10);
      label.setAttribute('y', y);
      label.setAttribute('text-anchor', 'end');
      label.setAttribute('dominant-baseline', 'middle');
      label.textContent = Math.round(this.yExtent[0] + (this.yExtent[1] - this.yExtent[0]) * (i / yLabels));
      yAxis.appendChild(label);
    }

    this.svg.appendChild(yAxis);
  }

  createGrid() {
    const grid = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    
    // Vertical grid lines
    const xLabels = 7;
    for (let i = 1; i < xLabels; i++) {
      const x = this.xScale(this.xExtent[0] + (this.xExtent[1] - this.xExtent[0]) * (i / xLabels));
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', x);
      line.setAttribute('x2', x);
      line.setAttribute('y1', this.options.margins.top);
      line.setAttribute('y2', this.options.height - this.options.margins.bottom);
      line.setAttribute('stroke', this.options.gridColor);
      line.setAttribute('stroke-dasharray', '4,4');
      grid.appendChild(line);
    }

    // Horizontal grid lines
    const yLabels = 5;
    for (let i = 1; i < yLabels; i++) {
      const y = this.yScale(this.yExtent[0] + (this.yExtent[1] - this.yExtent[0]) * (i / yLabels));
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', this.options.margins.left);
      line.setAttribute('x2', this.options.width - this.options.margins.right);
      line.setAttribute('y1', y);
      line.setAttribute('y2', y);
      line.setAttribute('stroke', this.options.gridColor);
      line.setAttribute('stroke-dasharray', '4,4');
      grid.appendChild(line);
    }

    this.svg.appendChild(grid);
  }

  createLines() {
    const linesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');

    Object.entries(this.data).forEach(([key, series], index) => {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const d = series.map((point, i) => 
        `${i === 0 ? 'M' : 'L'} ${this.xScale(point.x)} ${this.yScale(point.y)}`
      ).join(' ');
      
      line.setAttribute('d', d);
      line.setAttribute('fill', 'none');
      line.setAttribute('stroke', this.options.colors[index % this.options.colors.length]);
      line.setAttribute('stroke-width', this.options.lineWidth);
      line.setAttribute('data-series', key);
      linesGroup.appendChild(line);
    });

    this.svg.appendChild(linesGroup);
  }

  createDots() {
    const dotsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');

    Object.entries(this.data).forEach(([key, series], index) => {
      series.forEach(point => {
        const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        dot.setAttribute('cx', this.xScale(point.x));
        dot.setAttribute('cy', this.yScale(point.y));
        dot.setAttribute('r', this.options.dotRadius);
        dot.setAttribute('fill', this.options.colors[index % this.options.colors.length]);
        dot.setAttribute('data-series', key);
        dot.setAttribute('data-x', point.x);
        dot.setAttribute('data-y', point.y);
        dotsGroup.appendChild(dot);
      });
    });

    this.svg.appendChild(dotsGroup);
  }

  createLegend() {
    const legendGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    legendGroup.setAttribute('transform', `translate(${this.options.margins.left}, 20)`);

    Object.keys(this.data).forEach((key, index) => {
      const legendItem = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      legendItem.setAttribute('transform', `translate(${index * 100}, 0)`);
      legendItem.setAttribute('data-series', key);
      legendItem.style.cursor = 'pointer';

      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('width', 20);
      rect.setAttribute('height', 10);
      rect.setAttribute('fill', this.options.colors[index % this.options.colors.length]);

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', 25);
      text.setAttribute('y', 9);
      text.textContent = key;

      legendItem.appendChild(rect);
      legendItem.appendChild(text);
      legendGroup.appendChild(legendItem);

      legendItem.addEventListener('click', () => this.toggleSeries(key));
    });

    this.svg.appendChild(legendGroup);
  }

  createTooltip() {
    const tooltip = document.createElement('div');
    tooltip.style.position = 'absolute';
    tooltip.style.display = 'none';
    tooltip.style.backgroundColor = this.options.tooltipBgColor;
    tooltip.style.color = this.options.tooltipTextColor;
    tooltip.style.padding = '5px';
    tooltip.style.borderRadius = '3px';
    tooltip.style.pointerEvents = 'none';
    this.container.appendChild(tooltip);

    this.svg.addEventListener('mousemove', (event) => {
      const target = event.target;
      if (target.tagName === 'circle') {
        const series = target.getAttribute('data-series');
        const x = new Date(parseInt(target.getAttribute('data-x'))).toLocaleDateString();
        const y = target.getAttribute('data-y');

        tooltip.style.display = 'block';
        tooltip.style.left = `${event.pageX + 10}px`;
        tooltip.style.top = `${event.pageY + 10}px`;
        tooltip.textContent = `${series}: ${x}, ${y}`;
      } else {
        tooltip.style.display = 'none';
      }
    });
  }

  toggleSeries(seriesKey) {
    const index = this.activeDataSeries.indexOf(seriesKey);
    if (index > -1) {
      this.activeDataSeries.splice(index, 1);
    } else {
      this.activeDataSeries.push(seriesKey);
    }

    this.svg.querySelectorAll(`[data-series="${seriesKey}"]`).forEach(element => {
      if (element.tagName === 'g') { // Legend item
        element.style.opacity = this.activeDataSeries.includes(seriesKey) ? 1 : 0.5;
      } else { // Lines and dots
        element.style.display = this.activeDataSeries.includes(seriesKey) ? '' : 'none';
      }
    });
  }
}
