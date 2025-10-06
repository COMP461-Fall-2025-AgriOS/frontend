export interface RobotAttributes {
  autonomy: number
  speed: number
}

// Define the robot types as a const array - add new types here
export const ROBOT_TYPES = ['rover', 'drone'] as const

// Derive the type from the array
export type RobotType = typeof ROBOT_TYPES[number]

export interface Robot {
  uid: string
  name: string
  type: RobotType
  attributes: RobotAttributes
}