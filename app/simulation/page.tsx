"use client";

import { useRef, useEffect, useState } from "react";

export default function LogReplayPlayer() {
  const canvasRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [speed, setSpeed] = useState(1);
  const animationRef = useRef(null);
  const startTimeRef = useRef(null);

  // Example log data - in your case, you'd parse this from your log file
  const logData = [
    {
      time: 0,
      objects: [
        { id: 1, x: 100, y: 100 },
        { id: 2, x: 200, y: 150 },
        { id: 3, x: 300, y: 200 },
      ],
    },
    {
      time: 1000,
      objects: [
        { id: 1, x: 150, y: 120 },
        { id: 2, x: 250, y: 180 },
        { id: 3, x: 320, y: 220 },
      ],
    },
    {
      time: 2000,
      objects: [
        { id: 1, x: 200, y: 150 },
        { id: 2, x: 300, y: 200 },
        { id: 3, x: 350, y: 250 },
      ],
    },
    {
      time: 3000,
      objects: [
        { id: 1, x: 250, y: 200 },
        { id: 2, x: 350, y: 250 },
        { id: 3, x: 400, y: 300 },
      ],
    },
    {
      time: 4000,
      objects: [
        { id: 1, x: 300, y: 250 },
        { id: 2, x: 400, y: 300 },
        { id: 3, x: 450, y: 350 },
      ],
    },
    {
      time: 5000,
      objects: [
        { id: 1, x: 350, y: 300 },
        { id: 2, x: 450, y: 350 },
        { id: 3, x: 500, y: 400 },
      ],
    },
  ];

  const maxTime = logData[logData.length - 1].time;

  // Interpolate position between two frames
  const interpolatePosition = (time) => {
    if (time >= maxTime) return logData[logData.length - 1].objects;
    if (time <= 0) return logData[0].objects;

    // Find the two frames to interpolate between
    let beforeFrame = logData[0];
    let afterFrame = logData[1];

    for (let i = 0; i < logData.length - 1; i++) {
      if (logData[i].time <= time && logData[i + 1].time >= time) {
        beforeFrame = logData[i];
        afterFrame = logData[i + 1];
        break;
      }
    }

    // Calculate interpolation factor
    const totalDuration = afterFrame.time - beforeFrame.time;
    const elapsed = time - beforeFrame.time;
    const t = totalDuration > 0 ? elapsed / totalDuration : 0;

    // Interpolate each object's position
    return beforeFrame.objects.map((obj, index) => {
      const afterObj = afterFrame.objects[index];
      return {
        id: obj.id,
        x: obj.x + (afterObj.x - obj.x) * t,
        y: obj.y + (afterObj.y - obj.y) * t,
      };
    });
  };

  // Draw function
  const draw = (ctx, time) => {
    // Clear canvas
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Draw background grid (optional, for reference)
    ctx.strokeStyle = "#e0e0e0";
    ctx.lineWidth = 1;
    for (let i = 0; i < ctx.canvas.width; i += 50) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, ctx.canvas.height);
      ctx.stroke();
    }
    for (let i = 0; i < ctx.canvas.height; i += 50) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(ctx.canvas.width, i);
      ctx.stroke();
    }

    // Get interpolated positions for current time
    const objects = interpolatePosition(time);

    // Draw each object
    objects.forEach((obj, index) => {
      // Draw object (circle)
      ctx.fillStyle = `hsl(${index * 120}, 70%, 50%)`;
      ctx.beginPath();
      ctx.arc(obj.x, obj.y, 15, 0, Math.PI * 2);
      ctx.fill();

      // Draw object border
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw object ID
      ctx.fillStyle = "#fff";
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(obj.id, obj.x, obj.y);

      // Draw trail (previous positions)
      ctx.strokeStyle = `hsla(${index * 120}, 70%, 50%, 0.3)`;
      ctx.lineWidth = 2;
      ctx.beginPath();

      for (let t = Math.max(0, time - 1000); t <= time; t += 50) {
        const trailObjs = interpolatePosition(t);
        const trailObj = trailObjs[index];
        if (t === Math.max(0, time - 1000)) {
          ctx.moveTo(trailObj.x, trailObj.y);
        } else {
          ctx.lineTo(trailObj.x, trailObj.y);
        }
      }
      ctx.stroke();
    });

    // Draw time indicator
    ctx.fillStyle = "#333";
    ctx.font = "16px monospace";
    ctx.textAlign = "left";
    ctx.fillText(`Time: ${Math.round(time)}ms`, 10, 25);
  };

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    const animate = (timestamp) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }

      const elapsed = (timestamp - startTimeRef.current) * speed;
      const newTime = Math.min(elapsed, maxTime);

      setCurrentTime(newTime);
      draw(ctx, newTime);

      if (newTime < maxTime && isPlaying) {
        animationRef.current = requestAnimationFrame(animate);
      } else if (newTime >= maxTime) {
        setIsPlaying(false);
      }
    };

    if (isPlaying) {
      startTimeRef.current = performance.now() - currentTime / speed;
      animationRef.current = requestAnimationFrame(animate);
    } else {
      draw(ctx, currentTime);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, speed]);

  // Initial draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    draw(ctx, 0);
  }, []);

  const handlePlayPause = () => {
    if (currentTime >= maxTime) {
      setCurrentTime(0);
      startTimeRef.current = null;
    }
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    startTimeRef.current = null;
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      draw(ctx, 0);
    }
  };

  const handleSeek = (e) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    startTimeRef.current = null;
    if (!isPlaying) {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        draw(ctx, newTime);
      }
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 p-8 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold text-gray-800">Log Replay Player</h1>

      <canvas
        ref={canvasRef}
        width={600}
        height={500}
        className="border-2 border-gray-300 rounded-lg shadow-lg bg-white"
      />

      <div className="flex flex-col gap-4 w-full max-w-xl bg-white p-6 rounded-lg shadow">
        <div className="flex gap-2">
          <button
            onClick={handlePlayPause}
            className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
          >
            {isPlaying ? "Pause" : currentTime >= maxTime ? "Replay" : "Play"}
          </button>
          <button
            onClick={handleReset}
            className="px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition"
          >
            Reset
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700">
            Seek: {Math.round(currentTime)}ms / {maxTime}ms
          </label>
          <input
            type="range"
            min="0"
            max={maxTime}
            value={currentTime}
            onChange={handleSeek}
            className="w-full"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700">
            Speed: {speed}x
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setSpeed(0.5)}
              className={`px-4 py-1 rounded ${
                speed === 0.5 ? "bg-blue-500 text-white" : "bg-gray-200"
              }`}
            >
              0.5x
            </button>
            <button
              onClick={() => setSpeed(1)}
              className={`px-4 py-1 rounded ${
                speed === 1 ? "bg-blue-500 text-white" : "bg-gray-200"
              }`}
            >
              1x
            </button>
            <button
              onClick={() => setSpeed(2)}
              className={`px-4 py-1 rounded ${
                speed === 2 ? "bg-blue-500 text-white" : "bg-gray-200"
              }`}
            >
              2x
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow w-full max-w-xl">
        <h2 className="font-semibold mb-2">How to use with your log file:</h2>
        <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
          <li>Parse your log file into the format shown in the code</li>
          <li>Replace the example logData with your parsed data</li>
          <li>Adjust canvas size and object rendering as needed</li>
        </ol>
      </div>
    </div>
  );
}
