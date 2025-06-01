The example features two canvases: a **Host Canvas** where users can draw, and a **Participant Canvas** that receives and renders the drawing data. In real-time applications, these canvases would be on different devices with events transmitted across the network.

Instead of sending every individual mouse movement, `BufferedEventEmitter` batches drawing events to optimize network traffic and rendering performance, helpful for real-time collaborative applications with drawing or animation scenarios.

- Drawing points are collected and transmitted in batches rather than individually, reducing network overhead
- Different event types use tailored buffer configurations: quick state changes (start/stop drawing) use smaller buffers with shorter timeouts, while drawing points use larger buffers for maximum efficiency
- Batched points are replayed as connected strokes, maintaining drawing quality while improving performance for devices that can't handle high-frequency canvas redrawing without lag

