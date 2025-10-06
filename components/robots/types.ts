export interface RobotAttributes {
  autonomy: number;
  speed: number;
}

// Configuration for form fields based on RobotAttributes
export interface AttributeFieldConfig {
  label: string;
  placeholder: string;
  unit: string;
  step?: string;
  min?: string;
}

export const ATTRIBUTE_FIELDS: Record<
  keyof RobotAttributes,
  AttributeFieldConfig
> = {
  autonomy: {
    label: "Autonomy",
    placeholder: "Enter autonomy in meters",
    unit: "m",
    step: "0.1",
    min: "0",
  },
  speed: {
    label: "Speed",
    placeholder: "Enter speed in m/s",
    unit: "m/s",
    step: "0.1",
    min: "0",
  },
};

// Define the robot types as a const array - add new types here
export const ROBOT_TYPES = ["rover", "drone"] as const;

// Derive the type from the array
export type RobotType = (typeof ROBOT_TYPES)[number];

export interface Robot {
  uid: string;
  name: string;
  type: RobotType;
  attributes: RobotAttributes;
}
