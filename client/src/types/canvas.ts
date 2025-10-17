// Shared canvas types for networking / serialization
export interface Point {
  x: number
  y: number
  pressure?: number
}

export interface Stroke {
  color: string
  size: number
  points: Point[]
  tool?: 'pen' | 'eraser'
  // optional id if remote side generated one
  id?: string
  createdAt?: number
}
