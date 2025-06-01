const hostCanvas = document.getElementById("hostCanvas");
const participantCanvas = document.getElementById("participantCanvas");
const hostCtx = hostCanvas.getContext("2d");
const participantCtx = participantCanvas.getContext("2d");

// Participant only drawing state
let participantState = {
  lastPoint: null,
  isDrawingActive: false,
};

// Host-only drawing state
let isDrawing = false;
let lastHostPoint = null;

const drawingEventEmitter = new BufferedEventEmitter();

drawingEventEmitter.on(
  "drawingState",
  (stateBatches) => {
    console.log(`🔄 [PARTICIPANT] Received ${stateBatches.length} state updates`);

    stateBatches.forEach((state, index) => {
      console.log(`  📊 State ${index + 1}: ${state.type} - ${state.action}`);

      if (state.type === "drawing" && state.action === "start") {
        participantState.isDrawingActive = true;
        participantState.lastPoint = null; // Reset for new stroke
        console.log("  ✏️ [PARTICIPANT] Drawing session started");
      } else if (state.type === "drawing" && state.action === "end") {
        participantState.isDrawingActive = false;
        participantState.lastPoint = null;
        console.log("  🛑 [PARTICIPANT] Drawing session ended");
      } else if (state.type === "canvas" && state.action === "clear") {
        participantCtx.clearRect(0, 0, participantCanvas.width, participantCanvas.height);
        participantState.lastPoint = null;
        participantState.isDrawingActive = false;
        console.log("  🗑️ [PARTICIPANT] Canvas cleared via state event");
      }
    });
  },
  {
    buffered: true,
    bufferCapacity: 5, // State changes need smaller buffer
    bufferInactivityTimeout: 50, // Quick state updates
  }
);

drawingEventEmitter.on(
  "drawPoints",
  (pointBatches) => {
    console.log(`🎯 [PARTICIPANT] Received batch of ${pointBatches.length} drawing points`);

    if (pointBatches.length === 0) {
      console.log("📝 [PARTICIPANT] Empty batch received");
      return;
    }

    // Replay the drawing sequence on participant canvas
    participantCtx.beginPath();

    // Start from last point or first point in batch
    const startPoint = participantState.lastPoint || pointBatches[0];
    participantCtx.moveTo(startPoint.x, startPoint.y);

    // Draw lines connecting all points in the batch
    pointBatches.forEach((point, index) => {
      participantCtx.lineTo(point.x, point.y);
      console.log(`  📍 Point ${index + 1}: (${point.x.toFixed(1)}, ${point.y.toFixed(1)})`);
    });

    participantCtx.strokeStyle = "#28a745"; // Green color for participant
    participantCtx.lineWidth = 2;
    participantCtx.lineCap = "round";
    participantCtx.lineJoin = "round";
    participantCtx.stroke();

    // Update last participant point
    participantState.lastPoint = pointBatches[pointBatches.length - 1];

    console.log(`✅ [PARTICIPANT] Successfully drew ${pointBatches.length} connected points`);
  },
  {
    buffered: true,
    bufferCapacity: 10, // Collect up to 10 points before flushing
    bufferInactivityTimeout: 100, // Or flush after 100ms of inactivity
  }
);

// Get mouse position relative to canvas
function getCanvasMousePosition(canvas, event) {
  const rect = canvas.getBoundingClientRect();
  const clientX = event.clientX || (event.touches && event.touches[0].clientX);
  const clientY = event.clientY || (event.touches && event.touches[0].clientY);

  return {
    x: clientX - rect.left,
    y: clientY - rect.top,
    timestamp: Date.now(),
  };
}

// Host canvas drawing event listeners
hostCanvas.addEventListener("mousedown", (e) => {
  isDrawing = true;
  lastHostPoint = getCanvasMousePosition(hostCanvas, e);
  drawingEventEmitter.emit("drawingState", {
    type: "drawing",
    action: "start",
    timestamp: Date.now(),
    position: lastHostPoint,
  });
  console.log("🖱️ [HOST] Started drawing at:", lastHostPoint);
});

hostCanvas.addEventListener("mousemove", (e) => {
  if (!isDrawing) return;

  const currentPoint = getCanvasMousePosition(hostCanvas, e);

  // Draw immediately on host canvas
  hostCtx.beginPath();
  if (lastHostPoint) {
    hostCtx.moveTo(lastHostPoint.x, lastHostPoint.y);
  }
  hostCtx.lineTo(currentPoint.x, currentPoint.y);
  hostCtx.strokeStyle = "#007bff"; // Blue color for host
  hostCtx.lineWidth = 2;
  hostCtx.lineCap = "round";
  hostCtx.lineJoin = "round";
  hostCtx.stroke();

  // Emit point for batched transmission to participant
  drawingEventEmitter.emit("drawPoints", currentPoint);

  lastHostPoint = currentPoint;
});

const stopDrawing = () => {
  if (!isDrawing) return;

  isDrawing = false;

  drawingEventEmitter.emit("drawingState", {
    type: "drawing",
    action: "end",
    timestamp: Date.now(),
  });
  console.log("🛑 [HOST] Stopped drawing, flushing remaining buffer...");

  // Flush any remaining points in the buffer
  drawingEventEmitter.flush("drawPoints");
  drawingEventEmitter.flush("drawingState");

  lastHostPoint = null;

  console.log("💾 [HOST] Drawing session completed");
};

hostCanvas.addEventListener("mouseup", stopDrawing);
hostCanvas.addEventListener("mouseout", stopDrawing);

hostCanvas.addEventListener("touchstart", (e) => {
  e.preventDefault();
  const touch = e.touches[0];
  const mouseEvent = new MouseEvent("mousedown", {
    clientX: touch.clientX,
    clientY: touch.clientY,
  });
  hostCanvas.dispatchEvent(mouseEvent);
});

hostCanvas.addEventListener("touchmove", (e) => {
  e.preventDefault();
  const touch = e.touches[0];
  const mouseEvent = new MouseEvent("mousemove", {
    clientX: touch.clientX,
    clientY: touch.clientY,
  });
  hostCanvas.dispatchEvent(mouseEvent);
});

hostCanvas.addEventListener("touchend", (e) => {
  e.preventDefault();
  const mouseEvent = new MouseEvent("mouseup", {});
  hostCanvas.dispatchEvent(mouseEvent);
});

// Prevent participant canvas interactions
participantCanvas.addEventListener("mousedown", (e) => {
  e.preventDefault();
  console.log("⚠️ [PARTICIPANT] Drawing disabled - Host only mode");
});

participantCanvas.addEventListener("touchstart", (e) => {
  e.preventDefault();
  console.log("⚠️ [PARTICIPANT] Touch drawing disabled - Host only mode");
});

const clearButton = document.getElementById("clearButton");
clearButton.addEventListener("click", () => {
  hostCtx.clearRect(0, 0, hostCanvas.width, hostCanvas.height);
  participantCtx.clearRect(0, 0, participantCanvas.width, participantCanvas.height);

  // Reset drawing state
  lastHostPoint = null;
  isDrawing = false;
  // Emit clear state event for participant
  drawingEventEmitter.emit("drawingState", {
    type: "canvas",
    action: "clear",
    timestamp: Date.now(),
  });

  drawingEventEmitter.flush("drawingState");

  console.log("🗑️ [SYSTEM] Both canvases cleared");
  console.log("📊 [SYSTEM] Drawing state reset");
});

console.log("🚀 [SYSTEM] Buffered Canvas Drawing Demo initialized");
console.log("📋 [CONFIG] Buffer capacity: 10");
console.log("⏱️ [CONFIG] Inactivity timeout: 100ms");
console.log("🎨 [READY] Start drawing on the host canvas!");
