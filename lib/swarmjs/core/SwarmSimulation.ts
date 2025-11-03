// SwarmJS Simulation Engine
// Core simulation loop with external engine support

import Matter from 'matter-js';
import { Robot, RobotConfig } from './Robot';
import { Point } from '../utils/geometry';

export interface SimulationConfig {
  width: number;
  height: number;
  externalEngine?: {
    enabled: boolean;
    url?: string;
  };
}

export class SwarmSimulation {
  engine: Matter.Engine;
  world: Matter.World;
  robots: Map<string, Robot>;
  config: SimulationConfig;
  isRunning: boolean;
  private lastUpdate: number;

  constructor(config: SimulationConfig) {
    this.config = config;
    this.robots = new Map();
    this.isRunning = false;
    this.lastUpdate = Date.now();

    // Create Matter.js engine
    this.engine = Matter.Engine.create({
      gravity: { x: 0, y: 0, scale: 0 }, // No gravity for 2D robots
      enableSleeping: false
    });
    this.world = this.engine.world;

    // Add environment boundaries
    this.addBoundaries();
  }

  private addBoundaries(): void {
    const { width, height } = this.config;
    const walls = [
      // Top
      Matter.Bodies.rectangle(width / 2, -10, width, 20, { isStatic: true }),
      // Bottom
      Matter.Bodies.rectangle(width / 2, height + 10, width, 20, { isStatic: true }),
      // Left
      Matter.Bodies.rectangle(-10, height / 2, 20, height, { isStatic: true }),
      // Right
      Matter.Bodies.rectangle(width + 10, height / 2, 20, height, { isStatic: true })
    ];
    Matter.World.add(this.world, walls);
  }

  addRobot(config: RobotConfig): Robot {
    const useExternalEngine = this.config.externalEngine?.enabled || false;
    const robot = new Robot(config, useExternalEngine);
    this.robots.set(robot.id, robot);
    Matter.World.add(this.world, robot.body);
    return robot;
  }

  removeRobot(id: string): void {
    const robot = this.robots.get(id);
    if (robot) {
      Matter.World.remove(this.world, robot.body);
      this.robots.delete(id);
    }
  }

  getRobot(id: string): Robot | undefined {
    return this.robots.get(id);
  }

  updateRobotFromExternal(id: string, position: Point, angle: number): void {
    const robot = this.robots.get(id);
    if (robot && robot.externalControl) {
      robot.setPosition(position);
      robot.setAngle(angle);
      // Reset velocity to prevent physics interference
      Matter.Body.setVelocity(robot.body, { x: 0, y: 0 });
      Matter.Body.setAngularVelocity(robot.body, 0);
    }
  }

  update(): void {
    const now = Date.now();
    const deltaTime = now - this.lastUpdate;
    this.lastUpdate = now;

    // Update Matter.js engine (only if not using external control)
    if (!this.config.externalEngine?.enabled) {
      Matter.Engine.update(this.engine, deltaTime);
    }

    // Update robots
    this.robots.forEach(robot => {
      if (!robot.externalControl) {
        robot.update(deltaTime);
      }
    });
  }

  start(): void {
    this.isRunning = true;
    this.lastUpdate = Date.now();
  }

  stop(): void {
    this.isRunning = false;
  }

  clear(): void {
    this.robots.forEach(robot => {
      Matter.World.remove(this.world, robot.body);
    });
    this.robots.clear();
  }
}

