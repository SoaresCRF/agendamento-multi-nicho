import { describe, it, expect } from 'vitest'
import { centerCropSquare } from './image-crop'

describe('centerCropSquare', () => {
  it('crops a landscape image to a centered square using the shorter side', () => {
    expect(centerCropSquare(400, 200)).toEqual({ sx: 100, sy: 0, size: 200 })
  })

  it('crops a portrait image to a centered square using the shorter side', () => {
    expect(centerCropSquare(200, 400)).toEqual({ sx: 0, sy: 100, size: 200 })
  })

  it('leaves an already-square image untouched', () => {
    expect(centerCropSquare(300, 300)).toEqual({ sx: 0, sy: 0, size: 300 })
  })
})
