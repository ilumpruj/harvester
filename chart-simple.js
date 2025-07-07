// Simple chart implementation for Chrome extension
class SimpleChart {
  constructor(ctx, options) {
    this.ctx = ctx;
    this.canvas = ctx.canvas;
    this.data = options.data;
    this.options = options.options || {};
    this.padding = 40;
    this.drawn = false;
  }

  update() {
    this.draw();
  }

  draw() {
    const ctx = this.ctx;
    const canvas = this.canvas;
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Get data
    const dataset = this.data.datasets[0];
    const labels = this.data.labels;
    const values = dataset.data;
    
    if (!values || values.length === 0) {
      ctx.fillStyle = '#999';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('No data yet', width / 2, height / 2);
      return;
    }
    
    // Calculate scales
    const maxValue = Math.max(...values) || 10;
    const minValue = 0;
    const valueRange = maxValue - minValue;
    
    const chartWidth = width - this.padding * 2;
    const chartHeight = height - this.padding * 2;
    const barWidth = chartWidth / values.length;
    
    // Draw axes
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.padding, this.padding);
    ctx.lineTo(this.padding, height - this.padding);
    ctx.lineTo(width - this.padding, height - this.padding);
    ctx.stroke();
    
    // Draw bars or line
    if (this.options.type === 'bar') {
      ctx.fillStyle = dataset.backgroundColor || '#4CAF50';
      values.forEach((value, index) => {
        const barHeight = (value / maxValue) * chartHeight;
        const x = this.padding + index * barWidth + barWidth * 0.1;
        const y = height - this.padding - barHeight;
        const w = barWidth * 0.8;
        const h = barHeight;
        
        ctx.fillRect(x, y, w, h);
      });
    } else {
      // Line chart
      ctx.strokeStyle = dataset.borderColor || '#4CAF50';
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      values.forEach((value, index) => {
        const x = this.padding + index * barWidth + barWidth / 2;
        const y = height - this.padding - (value / maxValue) * chartHeight;
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      
      ctx.stroke();
      
      // Draw points
      ctx.fillStyle = dataset.borderColor || '#4CAF50';
      values.forEach((value, index) => {
        const x = this.padding + index * barWidth + barWidth / 2;
        const y = height - this.padding - (value / maxValue) * chartHeight;
        
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    
    // Draw labels
    ctx.fillStyle = '#666';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    
    // X-axis labels (show every few labels if too many)
    const labelStep = Math.ceil(labels.length / 10);
    labels.forEach((label, index) => {
      if (index % labelStep === 0) {
        const x = this.padding + index * barWidth + barWidth / 2;
        const y = height - this.padding + 20;
        ctx.fillText(label, x, y);
      }
    });
    
    // Y-axis labels
    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
      const value = (maxValue / 5) * i;
      const y = height - this.padding - (i / 5) * chartHeight;
      ctx.fillText(Math.round(value), this.padding - 10, y + 4);
    }
    
    // Title
    if (this.options.plugins && this.options.plugins.title && this.options.plugins.title.text) {
      ctx.fillStyle = '#333';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(this.options.plugins.title.text, width / 2, 20);
    }
  }
}

// Make it available globally like Chart.js
window.Chart = SimpleChart;