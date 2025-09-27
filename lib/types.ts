export interface RobotAttributes {
  autonomy: number
  speed: number
}

export interface Robot {
  uid: string
  name: string
  type: 'rover' | 'drone'
  attributes: RobotAttributes
}


