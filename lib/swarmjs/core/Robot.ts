// SwarmJS Robot Class
// Adapted from SwarmJS for AgriOS with external engine support

import Matter from 'matter-js';
import { Point, getDistance } from '../utils/geometry';

export interface RobotConfig {
  id: string;
  position: Point;
  angle?: number;
  radius?: number;
  velocityScale?: number;
  color?: string;
}

export class Robot {
  id: string;
  body: Matter.Body;
  radius: number;
  velocityScale: number;
  goal: Point | null;
  externalControl: boolean;

  constructor(config: RobotConfig, externalEngine: boolean = false) {
    this.id = config.id;
    this.radius = config.radius || 10;
    this.velocityScale = config.velocityScale || 1;
    this.goal = null;
    this.externalControl = externalEngine;

    // Create Matter.js body
    this.body = Matter.Bodies.circle(
      config.position.x,
      config.position.y,
      this.radius,
      {
        restitution: 0.5,
        friction: 0.1,
        frictionAir: 0.01,
        density: 0.001,
        label: `robot-${config.id}`
      }
    );

    if (config.angle !== undefined) {
      Matter.Body.setAngle(this.body, config.angle);
    }
  }

  get position(): Point {
    return {
      x: this.body.position.x,
      y: this.body.position.y
    };
  }

  get angle(): number {
    return this.body.angle;
  }

  setPosition(position: Point): void {
    Matter.Body.setPosition(this.body, position);
  }

  setAngle(angle: number): void {
    Matter.Body.setAngle(this.body, angle);
  }

  setGoal(goal: Point): void {
    this.goal = goal;
  }

  distanceToGoal(): number | null {
    if (!this.goal) return null;
    return getDistance(this.position, this.goal);
  }

  update(_deltaTime: number): void {
    if (this.externalControl) {
      // External engine controls position
      return;
    }

    // Simple goal-seeking behavior when not externally controlled
    if (this.goal) {
      const dx = this.goal.x - this.position.x;
      const dy = this.goal.y - this.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 1) {
        const force = {
          x: (dx / distance) * 0.001 * this.velocityScale,
          y: (dy / distance) * 0.001 * this.velocityScale
        };
        Matter.Body.applyForce(this.body, this.position, force);

        // Orient towards goal
        const targetAngle = Math.atan2(dy, dx);
        Matter.Body.setAngle(this.body, targetAngle);
      }
    }
  }
}

